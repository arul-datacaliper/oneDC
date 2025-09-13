using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IUnlockRepository
{
    Task<int> CountLockedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId);
    Task<int> UnlockLockedAsync(DateOnly from, DateOnly to, Guid? projectId, Guid? userId);
    Task AddAuditAsync(AuditLog log);
    Task SaveChangesAsync();
}
