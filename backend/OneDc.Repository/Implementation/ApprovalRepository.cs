using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class ApprovalRepository : IApprovalRepository
{
    private readonly OneDcDbContext _db;
    public ApprovalRepository(OneDcDbContext db) => _db = db;

    public async Task<IEnumerable<TimesheetEntry>> GetPendingForApproverAsync(Guid approverId, DateOnly from, DateOnly to, Guid? projectId = null, Guid? userId = null)
    {
        var query = _db.TimesheetEntries
            .Include(t => t.User)
            .Include(t => t.Project)
            .Include(t => t.Task) // include task for title
            .Where(t => (t.Status == TimesheetStatus.SUBMITTED || t.Status == TimesheetStatus.REJECTED)
                     && t.WorkDate >= from && t.WorkDate <= to);

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId.Value);
        if (userId.HasValue)
            query = query.Where(t => t.UserId == userId.Value);

        // ensure approver owns project
        query = query.Join(_db.Projects,
                  t => t.ProjectId,
                  p => p.ProjectId,
                  (t, p) => new { t, p })
            .Where(x => x.p.DefaultApprover == approverId)
            .Select(x => x.t);

        return await query
            .OrderBy(t => t.WorkDate).ThenBy(t => t.UserId).ThenBy(t => t.ProjectId)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<TimesheetEntry?> GetByIdAsync(Guid entryId) =>
        _db.TimesheetEntries.FirstOrDefaultAsync(t => t.EntryId == entryId);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
