using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;
using OneDc.Domain.Entities;

namespace OneDc.Repository.Implementation;

public class ReportsRepository : IReportsRepository
{
    private readonly OneDcDbContext _db;
    public ReportsRepository(OneDcDbContext db) => _db = db;

    public async Task<IEnumerable<(Guid userId, Guid projectId, bool billable, decimal hours)>> GetApprovedHoursAsync(DateOnly from, DateOnly to)
    {
        // APPROVED + LOCKED entries only (filter out entries with null ProjectId)
        var rows = await _db.TimesheetEntries
            .Where(t => (t.Status == Domain.Entities.TimesheetStatus.APPROVED
                      || t.Status == Domain.Entities.TimesheetStatus.LOCKED)
                     && t.WorkDate >= from && t.WorkDate <= to
                     && t.ProjectId.HasValue)
            .Join(_db.Projects,
                  t => t.ProjectId,
                  p => p.ProjectId,
                  (t, p) => new { t.UserId, t.ProjectId, p.Billable, t.Hours })
            .ToListAsync();
        
        // ProjectId is guaranteed to have value due to Where filter above
        return rows.Select(x => (x.UserId, x.ProjectId!.Value, x.Billable, x.Hours));
    }

    public async Task<Dictionary<Guid,(string code,string name,bool billable,decimal? budgetHours)>> GetProjectsMetaAsync(IEnumerable<Guid> projectIds)
    {
        var ids = projectIds.Distinct().ToList();
        var rows = await _db.Projects.Where(p => ids.Contains(p.ProjectId))
            .Select(p => new { p.ProjectId, p.Code, p.Name, p.Billable, p.BudgetHours })
            .ToListAsync();
        return rows.ToDictionary(x => x.ProjectId, x => (x.Code, x.Name, x.Billable, x.BudgetHours));
    }

    public async Task<Dictionary<Guid,(string email,string first,string last)>> GetUsersMetaAsync(IEnumerable<Guid> userIds)
    {
        var ids = userIds.Distinct().ToList();
        var rows = await _db.AppUsers.Where(u => ids.Contains(u.UserId))
            .Select(u => new { u.UserId, u.Email, u.FirstName, u.LastName })
            .ToListAsync();
        return rows.ToDictionary(x => x.UserId, x => (x.Email, x.FirstName, x.LastName));
    }

    public async Task<IEnumerable<(DateOnly date, decimal hours)>> GetProjectHoursByDateAsync(Guid projectId, DateOnly from, DateOnly to)
    {
        // Get APPROVED + LOCKED entries only for the specific project, grouped by date
        var rows = await _db.TimesheetEntries
            .Where(t => t.ProjectId == projectId 
                     && (t.Status == Domain.Entities.TimesheetStatus.APPROVED
                      || t.Status == Domain.Entities.TimesheetStatus.LOCKED)
                     && t.WorkDate >= from && t.WorkDate <= to)
            .GroupBy(t => t.WorkDate)
            .Select(g => new { WorkDate = g.Key, TotalHours = g.Sum(t => t.Hours) })
            .OrderBy(x => x.WorkDate)
            .ToListAsync();

        return rows.Select(x => (x.WorkDate, x.TotalHours));
    }

    public async Task<(string code, string name, decimal? budgetHours, DateOnly? startDate, DateOnly? endDate)> GetProjectDetailsAsync(Guid projectId)
    {
        var project = await _db.Projects
            .Where(p => p.ProjectId == projectId)
            .Select(p => new { p.Code, p.Name, p.BudgetHours, p.StartDate, p.EndDate })
            .FirstOrDefaultAsync();

        if (project == null)
            throw new ArgumentException($"Project with ID {projectId} not found");

        return (project.Code, project.Name, project.BudgetHours, project.StartDate, project.EndDate);
    }

    public async Task<Dictionary<Guid,(string email,string first,string last)>> GetAllActiveUsersAsync()
    {
        var activeUsers = await _db.AppUsers
            .Where(u => u.IsActive) // Assuming there's an IsActive field, adjust as needed
            .Select(u => new { u.UserId, u.Email, u.FirstName, u.LastName })
            .ToListAsync();
        
        return activeUsers.ToDictionary(x => x.UserId, x => (x.Email, x.FirstName, x.LastName));
    }

    public async Task<IEnumerable<TimesheetEntry>> GetTimesheetEntriesAsync(DateOnly from, DateOnly to, Guid? userId = null)
    {
        var query = _db.TimesheetEntries
            .Where(t => t.WorkDate >= from && t.WorkDate <= to);
        
        if (userId.HasValue)
        {
            query = query.Where(t => t.UserId == userId.Value);
        }
        
        return await query.ToListAsync();
    }
}
