using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class TimesheetRepository : ITimesheetRepository
{
    private readonly OneDcDbContext _db;
    public TimesheetRepository(OneDcDbContext db) => _db = db;

    public async Task<IEnumerable<TimesheetEntry>> GetByUserAndRangeAsync(Guid userId, DateOnly from, DateOnly to)
    {
        return await _db.TimesheetEntries
            .Where(t => t.UserId == userId && t.WorkDate >= from && t.WorkDate <= to)
            .OrderBy(t => t.WorkDate).ThenBy(t => t.ProjectId)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<TimesheetEntry?> GetByIdAsync(Guid entryId) =>
        _db.TimesheetEntries.FirstOrDefaultAsync(t => t.EntryId == entryId);

    public async Task AddAsync(TimesheetEntry entry) =>
        await _db.TimesheetEntries.AddAsync(entry);

    public async Task DeleteAsync(Guid entryId)
    {
        var entry = await _db.TimesheetEntries.FirstOrDefaultAsync(t => t.EntryId == entryId);
        if (entry != null)
        {
            _db.TimesheetEntries.Remove(entry);
        }
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
