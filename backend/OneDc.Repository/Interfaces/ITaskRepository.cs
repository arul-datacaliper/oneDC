using OneDc.Domain.Entities;

namespace OneDc.Domain.Interfaces;

public interface ITaskRepository
{
    Task<IEnumerable<ProjectTask>> GetTasksByUserIdAsync(Guid userId);
    Task<ProjectTask?> GetByIdAsync(Guid taskId);
    Task<IEnumerable<ProjectTask>> GetAllAsync();
}
