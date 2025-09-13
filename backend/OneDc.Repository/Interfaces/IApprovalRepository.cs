using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IApprovalRepository
{
    Task<IEnumerable<TimesheetEntry>> GetPendingForApproverAsync(Guid approverId, DateOnly from, DateOnly to);
    Task<TimesheetEntry?> GetByIdAsync(Guid entryId);
    Task SaveChangesAsync();
}
