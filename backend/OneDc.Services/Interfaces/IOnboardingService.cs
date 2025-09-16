using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

// DTOs for API responses
public record UserProfileDto(
    Guid UserProfileId,
    Guid UserId,
    string? ProfilePhotoUrl,
    string? Bio,
    string? Department,
    string? JobTitle,
    string? PhoneNumber,
    string? Location,
    string? DateOfJoining, // YYYY-MM-DD
    string? EmployeeId,
    string? ReportingManager,
    int? TotalExperienceYears,
    string? EducationBackground,
    string? Certifications,
    string? LinkedInProfile,
    string? GitHubProfile,
    bool IsOnboardingComplete,
    string? OnboardingCompletedAt);

public record UserSkillDto(
    Guid UserSkillId,
    Guid UserId,
    string SkillName,
    SkillLevel Level,
    int YearsOfExperience,
    string? Description,
    bool IsPrimary);

public record CreateUserProfileRequest(
    string? Bio,
    string? Department,
    string? JobTitle,
    string? PhoneNumber,
    string? Location,
    string? DateOfJoining, // YYYY-MM-DD
    string? EmployeeId,
    string? ReportingManager,
    int? TotalExperienceYears,
    string? EducationBackground,
    string? Certifications,
    string? LinkedInProfile,
    string? GitHubProfile);

public record UpdateUserProfileRequest(
    string? Bio,
    string? Department,
    string? JobTitle,
    string? PhoneNumber,
    string? Location,
    string? DateOfJoining, // YYYY-MM-DD
    string? EmployeeId,
    string? ReportingManager,
    int? TotalExperienceYears,
    string? EducationBackground,
    string? Certifications,
    string? LinkedInProfile,
    string? GitHubProfile);

public record CreateUserSkillRequest(
    string SkillName,
    SkillLevel Level,
    int YearsOfExperience,
    string? Description,
    bool IsPrimary = false);

public record UpdateUserSkillRequest(
    string SkillName,
    SkillLevel Level,
    int YearsOfExperience,
    string? Description,
    bool IsPrimary = false);

public record OnboardingStatusDto(
    Guid UserId,
    bool HasProfile,
    bool HasSkills,
    bool HasPhoto,
    bool IsComplete,
    int CompletionPercentage,
    string[] MissingSteps);

public interface IOnboardingService
{
    // Profile management
    Task<UserProfileDto?> GetUserProfileAsync(Guid userId);
    Task<UserProfileDto> CreateUserProfileAsync(Guid userId, CreateUserProfileRequest request);
    Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UpdateUserProfileRequest request);
    Task DeleteUserProfileAsync(Guid userId);
    
    // Photo management
    Task<string> UploadProfilePhotoAsync(Guid userId, Stream photoStream, string fileName, string contentType);
    Task DeleteProfilePhotoAsync(Guid userId);
    
    // Skills management
    Task<IEnumerable<UserSkillDto>> GetUserSkillsAsync(Guid userId);
    Task<UserSkillDto> CreateUserSkillAsync(Guid userId, CreateUserSkillRequest request);
    Task<UserSkillDto> UpdateUserSkillAsync(Guid userId, Guid skillId, UpdateUserSkillRequest request);
    Task DeleteUserSkillAsync(Guid userId, Guid skillId);
    
    // Onboarding status
    Task<OnboardingStatusDto> GetOnboardingStatusAsync(Guid userId);
    Task<bool> CompleteOnboardingAsync(Guid userId);
    
    // Admin functions
    Task<IEnumerable<OnboardingStatusDto>> GetAllUsersOnboardingStatusAsync();
}
