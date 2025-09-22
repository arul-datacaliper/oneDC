using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class ComplianceRepository : IComplianceRepository
{
    private readonly OneDcDbContext _db;
    public ComplianceRepository(OneDcDbContext db) => _db = db;

    // User management methods
    public Task<List<AppUser>> GetActiveUsersAsync() =>
        _db.AppUsers.Where(u => u.IsActive).AsNoTracking().ToListAsync();

    public Task<List<AppUser>> GetAllUsersAsync() =>
        _db.AppUsers.AsNoTracking().ToListAsync();

    public Task<AppUser?> GetUserByIdAsync(Guid userId) =>
        _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);

    public Task<List<AppUser>> GetUsersByRoleAsync(UserRole role) =>
        _db.AppUsers.Where(u => u.Role == role).AsNoTracking().ToListAsync();

    public async Task<AppUser> CreateUserAsync(AppUser user)
    {
        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task<AppUser> UpdateUserAsync(AppUser user)
    {
        _db.AppUsers.Update(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public Task<List<Holiday>> GetHolidaysAsync(DateOnly from, DateOnly to, string? region = null)
    {
        var q = _db.Holidays.Where(h => h.HolidayDate >= from && h.HolidayDate <= to);
        if (!string.IsNullOrWhiteSpace(region)) q = q.Where(h => h.Region == region);
        return q.AsNoTracking().ToListAsync();
    }

    public async Task<List<(Guid userId, DateOnly day, decimal hours)>> GetDailyTotalsAsync(DateOnly from, DateOnly to)
    {
        // Sum ALL statuses for missing-timesheets view? We only need presence (>=0) to know "has entry".
        // For overtime, policy usually counts ANY hours (draft/submitted/approved); adjust if you want approved only.
        var rows = await _db.TimesheetEntries
            .Where(t => t.WorkDate >= from && t.WorkDate <= to)
            .GroupBy(t => new { t.UserId, t.WorkDate })
            .Select(g => new { g.Key.UserId, Day = g.Key.WorkDate, Hours = g.Sum(x => x.Hours) })
            .ToListAsync();

        return rows.Select(r => (r.UserId, r.Day, r.Hours)).ToList();
    }

    // Holiday management methods
    public async Task AddHolidayAsync(Holiday holiday)
    {
        _db.Holidays.Add(holiday);
        await _db.SaveChangesAsync();
    }

    public async Task<bool> UpdateHolidayAsync(Holiday holiday)
    {
        var existing = await _db.Holidays.FindAsync(holiday.HolidayDate);
        if (existing == null)
        {
            return false;
        }

        existing.Name = holiday.Name;
        existing.Region = holiday.Region;
        
        _db.Holidays.Update(existing);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteHolidayAsync(DateOnly date, string? region = null)
    {
        var holiday = await _db.Holidays
            .Where(h => h.HolidayDate == date && (region == null || h.Region == region))
            .FirstOrDefaultAsync();
            
        if (holiday == null)
        {
            return false;
        }

        _db.Holidays.Remove(holiday);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BulkAddHolidaysAsync(List<Holiday> holidays)
    {
        // Remove duplicates and existing holidays
        var existingDates = await _db.Holidays
            .Where(h => holidays.Select(hol => hol.HolidayDate).Contains(h.HolidayDate))
            .Select(h => h.HolidayDate)
            .ToListAsync();

        var newHolidays = holidays.Where(h => !existingDates.Contains(h.HolidayDate)).ToList();
        
        if (newHolidays.Count > 0)
        {
            _db.Holidays.AddRange(newHolidays);
            await _db.SaveChangesAsync();
        }

        return newHolidays.Count;
    }
}
