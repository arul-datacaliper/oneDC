using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface ILockRepository
{
    Task<int> CountApprovedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId);
    Task<int> LockApprovedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId);
    Task AddAuditAsync(AuditLog log);
    Task SaveChangesAsync();
}
