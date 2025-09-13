using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class ComplianceRepository : IComplianceRepository
{
    private readonly OneDcDbContext _db;
    public ComplianceRepository(OneDcDbContext db) => _db = db;

    public Task<List<AppUser>> GetActiveUsersAsync() =>
        _db.AppUsers.Where(u => u.IsActive).AsNoTracking().ToListAsync();

    public Task<List<Holiday>> GetHolidaysAsync(DateOnly from, DateOnly to, string? region = null)
    {
        var q = _db.Holidays.Where(h => h.HolidayDate >= from && h.HolidayDate <= to);
        if (!string.IsNullOrWhiteSpace(region)) q = q.Where(h => h.Region == region);
        return q.AsNoTracking().ToListAsync();
    }

    public async Task<List<(Guid userId, DateOnly day, decimal hours)>> GetDailyTotalsAsync(DateOnly from, DateOnly to)
    {
        // Sum ALL statuses for missing-timesheets view? We only need presence (>=0) to know “has entry”.
        // For overtime, policy usually counts ANY hours (draft/submitted/approved); adjust if you want approved only.
        var rows = await _db.TimesheetEntries
            .Where(t => t.WorkDate >= from && t.WorkDate <= to)
            .GroupBy(t => new { t.UserId, t.WorkDate })
            .Select(g => new { g.Key.UserId, Day = g.Key.WorkDate, Hours = g.Sum(x => x.Hours) })
            .ToListAsync();

        return rows.Select(r => (r.UserId, r.Day, r.Hours)).ToList();
    }
}
