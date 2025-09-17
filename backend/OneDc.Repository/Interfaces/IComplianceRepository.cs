using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IComplianceRepository
{
    // User management methods
    Task<List<AppUser>> GetActiveUsersAsync();
    Task<List<AppUser>> GetAllUsersAsync();
    Task<AppUser?> GetUserByIdAsync(Guid userId);
    Task<List<AppUser>> GetUsersByRoleAsync(UserRole role);
    Task<AppUser> CreateUserAsync(AppUser user);
    Task<AppUser> UpdateUserAsync(AppUser user);
    
    // Holiday and compliance methods
    Task<List<Holiday>> GetHolidaysAsync(DateOnly from, DateOnly to, string? region = null);
    Task<List<(Guid userId, DateOnly day, decimal hours)>> GetDailyTotalsAsync(DateOnly from, DateOnly to);
}
