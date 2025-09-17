using OneDc.Domain.Entities;

namespace OneDc.Domain.Interfaces;

public interface ITaskRepository
{
    Task<IEnumerable<Domain.Entities.Task>> GetTasksByUserIdAsync(Guid userId);
    Task<Domain.Entities.Task?> GetByIdAsync(Guid taskId);
    Task<IEnumerable<Domain.Entities.Task>> GetAllAsync();
}
