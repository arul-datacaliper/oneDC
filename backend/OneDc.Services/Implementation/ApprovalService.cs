using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;

namespace OneDc.Services.Implementation;

public class ApprovalService : IApprovalService
{
    private readonly IApprovalRepository _repo;
    private readonly IProjectRepository _projects; // to verify approver owns the project

    public ApprovalService(IApprovalRepository repo, IProjectRepository projects)
    {
        _repo = repo;
        _projects = projects;
    }

    public Task<IEnumerable<TimesheetEntry>> GetPendingAsync(Guid approverId, DateOnly from, DateOnly to, Guid? projectId = null, Guid? userId = null)
        => _repo.GetPendingForApproverAsync(approverId, from, to, projectId, userId);

    public Task<IEnumerable<TimesheetEntry>> GetAllPendingAsync(DateOnly from, DateOnly to, Guid? projectId = null, Guid? userId = null)
        => _repo.GetAllPendingAsync(from, to, projectId, userId);

    public async Task<TimesheetEntry> ApproveAsync(Guid approverId, Guid entryId)
    {
        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.Status != TimesheetStatus.SUBMITTED) throw new InvalidOperationException("Only SUBMITTED entries can be approved.");

        // Check if approver has permission to approve this entry
        if (!await CanApproveEntryAsync(approverId, entry))
            throw new UnauthorizedAccessException("Not authorized to approve this timesheet entry.");

        entry.Status = TimesheetStatus.APPROVED;
        entry.ApprovedAt = DateTimeOffset.UtcNow;
        entry.ApprovedBy = approverId;
        entry.UpdatedAt = DateTimeOffset.UtcNow;

        await _repo.SaveChangesAsync();
        return entry;
    }

    public async Task<TimesheetEntry> RejectAsync(Guid approverId, Guid entryId, string comment)
    {
        if (string.IsNullOrWhiteSpace(comment)) throw new ArgumentException("Rejection comment is required.", nameof(comment));

        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.Status != TimesheetStatus.SUBMITTED) throw new InvalidOperationException("Only SUBMITTED entries can be rejected.");

        // Check if approver has permission to reject this entry
        if (!await CanApproveEntryAsync(approverId, entry))
            throw new UnauthorizedAccessException("Not authorized to reject this timesheet entry.");

        entry.Status = TimesheetStatus.REJECTED;
        entry.ApproverComment = comment;
        entry.ApprovedAt = null;
        entry.ApprovedBy = null;
        entry.UpdatedAt = DateTimeOffset.UtcNow;

        await _repo.SaveChangesAsync();
        return entry;
    }

    private async Task<bool> CanApproveEntryAsync(Guid approverId, TimesheetEntry entry)
    {
        // Get approver details including role
        var approver = await _repo.GetApproverAsync(approverId);
        if (approver == null) return false;

        // Admins can approve any timesheet
        if (approver.Role == Domain.Entities.UserRole.ADMIN)
            return true;

        // Approvers can approve timesheets if:
        if (approver.Role == Domain.Entities.UserRole.APPROVER)
        {
            // 1. They are the default approver for the project
            var project = await _projects.GetByIdAsync(entry.ProjectId);
            if (project?.DefaultApprover == approverId)
                return true;

            // 2. The user reports to them directly
            var user = await _repo.GetUserAsync(entry.UserId);
            if (user?.ManagerId == approverId)
                return true;

            // 3. The user reports to someone who reports to them
            if (user?.ManagerId != null)
            {
                var manager = await _repo.GetUserAsync(user.ManagerId.Value);
                if (manager?.ManagerId == approverId)
                    return true;
            }
        }

        return false;
    }
}
