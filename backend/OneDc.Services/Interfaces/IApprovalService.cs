using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public interface IApprovalService
{
    Task<IEnumerable<TimesheetEntry>> GetPendingAsync(Guid approverId, DateOnly from, DateOnly to, Guid? projectId = null, Guid? userId = null);
    Task<TimesheetEntry> ApproveAsync(Guid approverId, Guid entryId);
    Task<TimesheetEntry> RejectAsync(Guid approverId, Guid entryId, string comment);
}
