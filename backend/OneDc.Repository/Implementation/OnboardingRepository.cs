using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class OnboardingRepository : IOnboardingRepository
{
    private readonly OneDcDbContext _context;

    public OnboardingRepository(OneDcDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfile?> GetUserProfileAsync(Guid userId)
    {
        return await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task<UserProfile> CreateUserProfileAsync(UserProfile profile)
    {
        _context.UserProfiles.Add(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    public async Task<UserProfile> UpdateUserProfileAsync(UserProfile profile)
    {
        profile.UpdatedAt = DateTimeOffset.UtcNow;
        _context.UserProfiles.Update(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    public async Task DeleteUserProfileAsync(Guid userId)
    {
        var profile = await GetUserProfileAsync(userId);
        if (profile != null)
        {
            _context.UserProfiles.Remove(profile);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<UserSkill>> GetUserSkillsAsync(Guid userId)
    {
        return await _context.UserSkills
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.IsPrimary)
            .ThenBy(s => s.SkillName)
            .ToListAsync();
    }

    public async Task<UserSkill> CreateUserSkillAsync(UserSkill skill)
    {
        _context.UserSkills.Add(skill);
        await _context.SaveChangesAsync();
        return skill;
    }

    public async Task<UserSkill> UpdateUserSkillAsync(UserSkill skill)
    {
        _context.UserSkills.Update(skill);
        await _context.SaveChangesAsync();
        return skill;
    }

    public async Task DeleteUserSkillAsync(Guid skillId)
    {
        var skill = await _context.UserSkills.FindAsync(skillId);
        if (skill != null)
        {
            _context.UserSkills.Remove(skill);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<UserSkill?> GetUserSkillAsync(Guid userId, Guid skillId)
    {
        return await _context.UserSkills
            .FirstOrDefaultAsync(s => s.UserId == userId && s.UserSkillId == skillId);
    }

    public async Task<bool> SkillExistsForUserAsync(Guid userId, string skillName)
    {
        return await _context.UserSkills
            .AnyAsync(s => s.UserId == userId && 
                          s.SkillName.ToLower() == skillName.ToLower());
    }

    public async Task<bool> UserExistsAsync(Guid userId)
    {
        return await _context.AppUsers
            .AnyAsync(u => u.UserId == userId && u.IsActive);
    }

    public async Task<IEnumerable<(Guid UserId, string Email, string FirstName, string LastName, bool HasProfile, bool HasSkills)>> GetAllUsersOnboardingDataAsync()
    {
        var usersData = await _context.AppUsers
            .Where(u => u.IsActive)
            .GroupJoin(_context.UserProfiles,
                user => user.UserId,
                profile => profile.UserId,
                (user, profiles) => new { User = user, HasProfile = profiles.Any() })
            .GroupJoin(_context.UserSkills,
                userProfile => userProfile.User.UserId,
                skill => skill.UserId,
                (userProfile, skills) => new
                {
                    userProfile.User.UserId,
                    userProfile.User.Email,
                    userProfile.User.FirstName,
                    userProfile.User.LastName,
                    userProfile.HasProfile,
                    HasSkills = skills.Any()
                })
            .ToListAsync();

        return usersData.Select(u => (u.UserId, u.Email, u.FirstName, u.LastName, u.HasProfile, u.HasSkills));
    }
}
