using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IComplianceRepository
{
    Task<List<AppUser>> GetActiveUsersAsync();
    Task<List<Holiday>> GetHolidaysAsync(DateOnly from, DateOnly to, string? region = null);
    Task<List<(Guid userId, DateOnly day, decimal hours)>> GetDailyTotalsAsync(DateOnly from, DateOnly to);
}
