using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class LockRepository : ILockRepository
{
    private readonly OneDcDbContext _db;
    public LockRepository(OneDcDbContext db) => _db = db;

    private IQueryable<TimesheetEntry> BaseQuery(DateOnly from, DateOnly to, Guid? projectId, Guid? userId)
    {
        var q = _db.TimesheetEntries
            .Where(t => t.WorkDate >= from && t.WorkDate <= to &&
                        t.Status == TimesheetStatus.APPROVED);
        if (projectId.HasValue) q = q.Where(t => t.ProjectId == projectId.Value);
        if (userId.HasValue)    q = q.Where(t => t.UserId == userId.Value);
        return q;
    }

    public Task<int> CountApprovedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId)
        => BaseQuery(from, to, projectId, userId).CountAsync();

    public async Task<int> LockApprovedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId)
    {
        // Efficient set-based update (EF Core 7+)
        var affected = await BaseQuery(from, to, projectId, userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.Status, TimesheetStatus.LOCKED)
                .SetProperty(t => t.UpdatedAt, _ => DateTimeOffset.UtcNow));

        return affected;
    }

    public Task AddAuditAsync(AuditLog log)
    {
        _db.AuditLogs.Add(log);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
