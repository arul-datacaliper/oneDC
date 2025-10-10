using Microsoft.Extensions.Configuration;
using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;

namespace OneDc.Services.Implementation;

public class OnboardingService : IOnboardingService
{
    private readonly IOnboardingRepository _repository;
    private readonly IFileStorageService _fileStorageService;
    private readonly string _photoUploadPath;

    public OnboardingService(IOnboardingRepository repository, IFileStorageService fileStorageService, IConfiguration configuration)
    {
        _repository = repository;
        _fileStorageService = fileStorageService;
        _photoUploadPath = configuration["FileStorage:ProfilePhotosPath"] ?? "uploads/profile-photos";
    }

    public async Task<UserProfileDto?> GetUserProfileAsync(Guid userId)
    {
        var profile = await _repository.GetUserProfileAsync(userId);
        var appUser = await _repository.GetAppUserAsync(userId);
        
        if (profile == null && appUser == null)
            return null;
            
        // Get manager name if available
        var managerName = await _repository.GetManagerNameAsync(appUser?.ManagerId);
            
        // If no user profile exists, create a default one with admin data
        if (profile == null && appUser != null)
        {
            var defaultProfile = new UserProfile
            {
                UserProfileId = Guid.NewGuid(),
                UserId = userId,
                // Populate admin-managed fields from AppUser
                EmployeeId = appUser.EmployeeId,
                JobTitle = appUser.JobTitle,
                Department = appUser.Department,
                DateOfJoining = appUser.DateOfJoining,
                ReportingManager = managerName,
                // Leave user-editable fields empty for now
                Bio = null,
                PhoneNumber = null,
                Location = null,
                TotalExperienceYears = null,
                EducationBackground = null,
                Certifications = null,
                LinkedInProfile = null,
                GitHubProfile = null,
                IsOnboardingComplete = false
            };
            
            return defaultProfile.ToDto();
        }
        
        // If profile exists, override admin-managed fields with current AppUser data
        if (profile != null && appUser != null)
        {
            profile.EmployeeId = appUser.EmployeeId;
            profile.JobTitle = appUser.JobTitle;
            profile.Department = appUser.Department;
            profile.DateOfJoining = appUser.DateOfJoining;
            profile.ReportingManager = managerName;
            // Note: We don't save these changes to keep the profile table clean of admin data
        }
        
        return profile?.ToDto();
    }

    public async Task<UserProfileDto> CreateUserProfileAsync(Guid userId, CreateUserProfileRequest request)
    {
        if (!await _repository.UserExistsAsync(userId))
            throw new ArgumentException("User not found");

        var existingProfile = await _repository.GetUserProfileAsync(userId);
        if (existingProfile != null)
            throw new InvalidOperationException("User profile already exists");

        // Get admin-managed data from AppUser
        var appUser = await _repository.GetAppUserAsync(userId);
        if (appUser == null)
            throw new ArgumentException("Employee data not found");

        // Get manager name
        var managerName = await _repository.GetManagerNameAsync(appUser.ManagerId);

        var profile = new UserProfile
        {
            UserProfileId = Guid.NewGuid(),
            UserId = userId,
            // Admin-managed fields - these come from AppUser, not from request
            EmployeeId = appUser.EmployeeId,
            JobTitle = appUser.JobTitle,
            Department = appUser.Department,
            DateOfJoining = appUser.DateOfJoining,
            ReportingManager = managerName,
            // User-editable fields from request
            Bio = request.Bio,
            PhoneNumber = request.PhoneNumber,
            Location = request.Location,
            TotalExperienceYears = request.TotalExperienceYears,
            EducationBackground = request.EducationBackground,
            Certifications = request.Certifications,
            LinkedInProfile = request.LinkedInProfile,
            GitHubProfile = request.GitHubProfile
        };

        var createdProfile = await _repository.CreateUserProfileAsync(profile);
        return createdProfile.ToDto();
    }

    public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UpdateUserProfileRequest request)
    {
        var profile = await _repository.GetUserProfileAsync(userId);
        if (profile == null)
            throw new ArgumentException("User profile not found");

        // Get current admin-managed data from AppUser
        var appUser = await _repository.GetAppUserAsync(userId);
        if (appUser == null)
            throw new ArgumentException("Employee data not found");

        // Get manager name
        var managerName = await _repository.GetManagerNameAsync(appUser.ManagerId);

        // Update only user-editable fields
        profile.Bio = request.Bio;
        profile.PhoneNumber = request.PhoneNumber;
        profile.Location = request.Location;
        profile.TotalExperienceYears = request.TotalExperienceYears;
        profile.EducationBackground = request.EducationBackground;
        profile.Certifications = request.Certifications;
        profile.LinkedInProfile = request.LinkedInProfile;
        profile.GitHubProfile = request.GitHubProfile;

        // Ensure admin-managed fields remain from AppUser (don't update from request)
        profile.EmployeeId = appUser.EmployeeId;
        profile.JobTitle = appUser.JobTitle;
        profile.Department = appUser.Department;
        profile.DateOfJoining = appUser.DateOfJoining;
        profile.ReportingManager = managerName;

        var updatedProfile = await _repository.UpdateUserProfileAsync(profile);
        return updatedProfile.ToDto();
    }

    public async Task DeleteUserProfileAsync(Guid userId)
    {
        await _repository.DeleteUserProfileAsync(userId);
    }

    public async Task<string> UploadProfilePhotoAsync(Guid userId, Stream photoStream, string fileName, string contentType)
    {
        var profile = await _repository.GetUserProfileAsync(userId);
        if (profile == null)
            throw new ArgumentException("User profile not found");

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
        if (!allowedTypes.Contains(contentType.ToLower()))
            throw new ArgumentException("Invalid file type. Only JPEG, PNG, and GIF are allowed.");

        // Delete old photo if exists
        if (!string.IsNullOrEmpty(profile.ProfilePhotoUrl))
        {
            await _fileStorageService.DeleteFileAsync(profile.ProfilePhotoUrl, "profile-photos");
        }

        // Upload new photo using the file storage service
        var uploadResult = await _fileStorageService.UploadFileAsync(photoStream, fileName, contentType, "profile-photos");

        // Update profile with new photo URL
        profile.ProfilePhotoUrl = uploadResult.FileUrl;
        await _repository.UpdateUserProfileAsync(profile);

        return profile.ProfilePhotoUrl;
    }

    public async Task DeleteProfilePhotoAsync(Guid userId)
    {
        var profile = await _repository.GetUserProfileAsync(userId);
        if (profile?.ProfilePhotoUrl != null)
        {
            await _fileStorageService.DeleteFileAsync(profile.ProfilePhotoUrl, "profile-photos");

            profile.ProfilePhotoUrl = null;
            await _repository.UpdateUserProfileAsync(profile);
        }
    }

    public async Task<IEnumerable<UserSkillDto>> GetUserSkillsAsync(Guid userId)
    {
        var skills = await _repository.GetUserSkillsAsync(userId);
        return skills.Select(s => s.ToDto());
    }

    public async Task<UserSkillDto> CreateUserSkillAsync(Guid userId, CreateUserSkillRequest request)
    {
        if (!await _repository.UserExistsAsync(userId))
            throw new ArgumentException("User not found");

        if (await _repository.SkillExistsForUserAsync(userId, request.SkillName))
            throw new InvalidOperationException("Skill already exists for this user");

        var skill = new UserSkill
        {
            UserSkillId = Guid.NewGuid(),
            UserId = userId,
            SkillName = request.SkillName,
            Level = request.Level,
            YearsOfExperience = request.YearsOfExperience,
            Description = request.Description,
            IsPrimary = request.IsPrimary
        };

        var createdSkill = await _repository.CreateUserSkillAsync(skill);
        return createdSkill.ToDto();
    }

    public async Task<UserSkillDto> UpdateUserSkillAsync(Guid userId, Guid skillId, UpdateUserSkillRequest request)
    {
        var skill = await _repository.GetUserSkillAsync(userId, skillId);
        if (skill == null)
            throw new ArgumentException("Skill not found");

        // Check if skill name already exists for another skill of the same user
        if (skill.SkillName != request.SkillName && 
            await _repository.SkillExistsForUserAsync(userId, request.SkillName))
        {
            throw new InvalidOperationException("Skill with this name already exists for this user");
        }

        skill.SkillName = request.SkillName;
        skill.Level = request.Level;
        skill.YearsOfExperience = request.YearsOfExperience;
        skill.Description = request.Description;
        skill.IsPrimary = request.IsPrimary;

        var updatedSkill = await _repository.UpdateUserSkillAsync(skill);
        return updatedSkill.ToDto();
    }

    public async Task DeleteUserSkillAsync(Guid userId, Guid skillId)
    {
        var skill = await _repository.GetUserSkillAsync(userId, skillId);
        if (skill == null)
            throw new ArgumentException("Skill not found");

        await _repository.DeleteUserSkillAsync(skillId);
    }

    public async Task<OnboardingStatusDto> GetOnboardingStatusAsync(Guid userId)
    {
        var profile = await _repository.GetUserProfileAsync(userId);
        var skills = await _repository.GetUserSkillsAsync(userId);

        var hasProfile = profile != null;
        var hasSkills = skills.Any();
        var hasPhoto = !string.IsNullOrEmpty(profile?.ProfilePhotoUrl);

        var missingSteps = new List<string>();
        if (!hasProfile) missingSteps.Add("Create profile");
        if (!hasSkills) missingSteps.Add("Add skills");
        if (!hasPhoto) missingSteps.Add("Upload photo");

        var completionPercentage = ((hasProfile ? 40 : 0) + (hasSkills ? 40 : 0) + (hasPhoto ? 20 : 0));
        var isComplete = completionPercentage == 100;

        // Update completion status if complete and not already marked
        if (isComplete && profile != null && !profile.IsOnboardingComplete)
        {
            profile.IsOnboardingComplete = true;
            profile.OnboardingCompletedAt = DateTimeOffset.UtcNow;
            await _repository.UpdateUserProfileAsync(profile);
        }

        return new OnboardingStatusDto(
            UserId: userId,
            HasProfile: hasProfile,
            HasSkills: hasSkills,
            HasPhoto: hasPhoto,
            IsComplete: isComplete,
            CompletionPercentage: completionPercentage,
            MissingSteps: missingSteps.ToArray()
        );
    }

    public async Task<bool> CompleteOnboardingAsync(Guid userId)
    {
        var status = await GetOnboardingStatusAsync(userId);
        if (!status.IsComplete)
            return false;

        var profile = await _repository.GetUserProfileAsync(userId);
        if (profile != null && !profile.IsOnboardingComplete)
        {
            profile.IsOnboardingComplete = true;
            profile.OnboardingCompletedAt = DateTimeOffset.UtcNow;
            await _repository.UpdateUserProfileAsync(profile);
        }

        return true;
    }

    public async Task<IEnumerable<OnboardingStatusDto>> GetAllUsersOnboardingStatusAsync()
    {
        var usersData = await _repository.GetAllUsersOnboardingDataAsync();
        var statusList = new List<OnboardingStatusDto>();

        foreach (var userData in usersData)
        {
            var missingSteps = new List<string>();
            if (!userData.HasProfile) missingSteps.Add("Create profile");
            if (!userData.HasSkills) missingSteps.Add("Add skills");

            // We can't check for photo without loading the profile, so we'll do a simple calculation
            var completionPercentage = ((userData.HasProfile ? 60 : 0) + (userData.HasSkills ? 40 : 0));
            var isComplete = completionPercentage >= 100;

            statusList.Add(new OnboardingStatusDto(
                UserId: userData.UserId,
                HasProfile: userData.HasProfile,
                HasSkills: userData.HasSkills,
                HasPhoto: false, // We'd need to check this separately for performance
                IsComplete: isComplete,
                CompletionPercentage: completionPercentage,
                MissingSteps: missingSteps.ToArray()
            ));
        }

        return statusList;
    }
}

// Extension methods for mapping
public static class OnboardingExtensions
{
    public static UserProfileDto ToDto(this UserProfile profile)
    {
        return new UserProfileDto(
            UserProfileId: profile.UserProfileId,
            UserId: profile.UserId,
            ProfilePhotoUrl: profile.ProfilePhotoUrl,
            Bio: profile.Bio,
            Department: profile.Department,
            JobTitle: profile.JobTitle,
            PhoneNumber: profile.PhoneNumber,
            Location: profile.Location,
            DateOfJoining: profile.DateOfJoining?.ToString("yyyy-MM-dd"),
            EmployeeId: profile.EmployeeId,
            ReportingManager: profile.ReportingManager,
            TotalExperienceYears: profile.TotalExperienceYears,
            EducationBackground: profile.EducationBackground,
            Certifications: profile.Certifications,
            LinkedInProfile: profile.LinkedInProfile,
            GitHubProfile: profile.GitHubProfile,
            IsOnboardingComplete: profile.IsOnboardingComplete,
            OnboardingCompletedAt: profile.OnboardingCompletedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ")
        );
    }

    public static UserSkillDto ToDto(this UserSkill skill)
    {
        return new UserSkillDto(
            UserSkillId: skill.UserSkillId,
            UserId: skill.UserId,
            SkillName: skill.SkillName,
            Level: skill.Level,
            YearsOfExperience: skill.YearsOfExperience,
            Description: skill.Description,
            IsPrimary: skill.IsPrimary
        );
    }
}
