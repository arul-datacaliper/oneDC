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
        // First, get the approver's role to determine access level
        var approver = await _db.AppUsers.FirstOrDefaultAsync(u => u.UserId == approverId);
        if (approver == null)
            throw new UnauthorizedAccessException("Approver not found.");

        var query = _db.TimesheetEntries
            .Include(t => t.User)
            .Include(t => t.Project)
            .Include(t => t.Task)
            .Where(t => (t.Status == TimesheetStatus.SUBMITTED || t.Status == TimesheetStatus.REJECTED)
                     && t.WorkDate >= from && t.WorkDate <= to);

        // Apply role-based filtering
        if (approver.Role == UserRole.ADMIN)
        {
            // Admins can see ALL timesheets - no additional filtering needed
        }
        else if (approver.Role == UserRole.APPROVER)
        {
            // Approvers can see timesheets from:
            // 1. Projects they manage (DefaultApprover)
            // 2. Users who report to them (managerId hierarchy)
            query = query.Where(t => 
                // Projects where they are the default approver
                _db.Projects.Any(p => p.ProjectId == t.ProjectId && p.DefaultApprover == approverId) ||
                // Users who report directly to them
                (t.User != null && t.User.ManagerId == approverId) ||
                // Users who report to someone who reports to them (one level down)
                _db.AppUsers.Any(manager => manager.ManagerId == approverId && 
                                          t.User != null && t.User.ManagerId == manager.UserId)
            );
        }
        else
        {
            // Employees cannot approve timesheets
            throw new UnauthorizedAccessException("User does not have approval permissions.");
        }

        // Apply optional filters
        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId.Value);
        if (userId.HasValue)
            query = query.Where(t => t.UserId == userId.Value);

        return await query
            .OrderBy(t => t.WorkDate).ThenBy(t => t.UserId).ThenBy(t => t.ProjectId)
            .AsNoTracking()
            .ToListAsync();
    }

    public Task<TimesheetEntry?> GetByIdAsync(Guid entryId) =>
        _db.TimesheetEntries.FirstOrDefaultAsync(t => t.EntryId == entryId);

    public async Task SaveChangesAsync()
    {
        await _db.SaveChangesAsync();
    }

    public async Task<AppUser?> GetApproverAsync(Guid approverId)
    {
        return await _db.AppUsers
            .Where(u => u.UserId == approverId)
            .FirstOrDefaultAsync();
    }

    public async Task<AppUser?> GetUserAsync(Guid userId)
    {
        return await _db.AppUsers
            .Where(u => u.UserId == userId)
            .FirstOrDefaultAsync();
    }
}
