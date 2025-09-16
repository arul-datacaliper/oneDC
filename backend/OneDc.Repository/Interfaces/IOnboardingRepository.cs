using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IOnboardingRepository
{
    // User Profile operations
    Task<UserProfile?> GetUserProfileAsync(Guid userId);
    Task<UserProfile> CreateUserProfileAsync(UserProfile profile);
    Task<UserProfile> UpdateUserProfileAsync(UserProfile profile);
    Task DeleteUserProfileAsync(Guid userId);
    
    // User Skills operations
    Task<IEnumerable<UserSkill>> GetUserSkillsAsync(Guid userId);
    Task<UserSkill> CreateUserSkillAsync(UserSkill skill);
    Task<UserSkill> UpdateUserSkillAsync(UserSkill skill);
    Task DeleteUserSkillAsync(Guid skillId);
    Task<UserSkill?> GetUserSkillAsync(Guid userId, Guid skillId);
    Task<bool> SkillExistsForUserAsync(Guid userId, string skillName);
    
    // User existence check
    Task<bool> UserExistsAsync(Guid userId);
    
    // Bulk operations for admin
    Task<IEnumerable<(Guid UserId, string Email, string FirstName, string LastName, bool HasProfile, bool HasSkills)>> GetAllUsersOnboardingDataAsync();
}
