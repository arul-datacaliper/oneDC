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

    public async Task<TimesheetEntry> ApproveAsync(Guid approverId, Guid entryId)
    {
        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.Status != TimesheetStatus.SUBMITTED) throw new InvalidOperationException("Only SUBMITTED entries can be approved.");

        // verify approver owns the project
        var project = await _projects.GetByIdAsync(entry.ProjectId) ?? throw new InvalidOperationException("Project not found.");
        if (project.DefaultApprover != approverId) throw new UnauthorizedAccessException("Not an approver for this project.");

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

        var project = await _projects.GetByIdAsync(entry.ProjectId) ?? throw new InvalidOperationException("Project not found.");
        if (project.DefaultApprover != approverId) throw new UnauthorizedAccessException("Not an approver for this project.");

        entry.Status = TimesheetStatus.REJECTED;
        entry.ApproverComment = comment;
        entry.ApprovedAt = null;
        entry.ApprovedBy = null;
        entry.UpdatedAt = DateTimeOffset.UtcNow;

        await _repo.SaveChangesAsync();
        return entry;
    }
}
