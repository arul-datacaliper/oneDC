using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IApprovalRepository
{
    Task<IEnumerable<TimesheetEntry>> GetPendingForApproverAsync(Guid approverId, DateOnly from, DateOnly to, Guid? projectId = null, Guid? userId = null);
    Task<TimesheetEntry?> GetByIdAsync(Guid entryId);
    Task SaveChangesAsync();
}
