using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface ITimesheetRepository
{
    Task<IEnumerable<TimesheetEntry>> GetByUserAndRangeAsync(Guid userId, DateOnly from, DateOnly to);
    Task<TimesheetEntry?> GetByIdAsync(Guid entryId);
    Task AddAsync(TimesheetEntry entry);
    Task DeleteAsync(Guid entryId);
    Task SaveChangesAsync();
}
