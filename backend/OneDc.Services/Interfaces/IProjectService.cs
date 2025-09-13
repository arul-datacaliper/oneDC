using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public interface IProjectService
{
    Task<IEnumerable<Project>> GetAllAsync();
    Task<Project?> GetByIdAsync(Guid id);
    Task<Project> CreateAsync(Project project);
}
