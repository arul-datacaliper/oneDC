using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class ReportsRepository : IReportsRepository
{
    private readonly OneDcDbContext _db;
    public ReportsRepository(OneDcDbContext db) => _db = db;

    public async Task<IEnumerable<(Guid userId, Guid projectId, bool billable, decimal hours)>> GetApprovedHoursAsync(DateOnly from, DateOnly to)
    {
        // APPROVED + LOCKED entries only
        var rows = await _db.TimesheetEntries
            .Where(t => (t.Status == Domain.Entities.TimesheetStatus.APPROVED
                      || t.Status == Domain.Entities.TimesheetStatus.LOCKED)
                     && t.WorkDate >= from && t.WorkDate <= to)
            .Join(_db.Projects,
                  t => t.ProjectId,
                  p => p.ProjectId,
                  (t, p) => new { t.UserId, t.ProjectId, p.Billable, t.Hours })
            .ToListAsync();

        return rows.Select(x => (x.UserId, x.ProjectId, x.Billable, x.Hours));
    }

    public async Task<Dictionary<Guid,(string code,string name,bool billable)>> GetProjectsMetaAsync(IEnumerable<Guid> projectIds)
    {
        var ids = projectIds.Distinct().ToList();
        var rows = await _db.Projects.Where(p => ids.Contains(p.ProjectId))
            .Select(p => new { p.ProjectId, p.Code, p.Name, p.Billable })
            .ToListAsync();
        return rows.ToDictionary(x => x.ProjectId, x => (x.Code, x.Name, x.Billable));
    }

    public async Task<Dictionary<Guid,(string email,string first,string last)>> GetUsersMetaAsync(IEnumerable<Guid> userIds)
    {
        var ids = userIds.Distinct().ToList();
        var rows = await _db.AppUsers.Where(u => ids.Contains(u.UserId))
            .Select(u => new { u.UserId, u.Email, u.FirstName, u.LastName })
            .ToListAsync();
        return rows.ToDictionary(x => x.UserId, x => (x.Email, x.FirstName, x.LastName));
    }
}
