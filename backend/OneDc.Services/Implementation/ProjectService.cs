using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;

namespace OneDc.Services.Implementation;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repo;
    public ProjectService(IProjectRepository repo) => _repo = repo;

    public Task<IEnumerable<Project>> GetAllAsync() => _repo.GetAllAsync();

    public Task<Project?> GetByIdAsync(Guid id) => _repo.GetByIdAsync(id);

    public async Task<Project> CreateAsync(Project project)
    {
        project.ProjectId = Guid.NewGuid();
        project.CreatedAt = DateTimeOffset.UtcNow;
        await _repo.AddAsync(project);
        await _repo.SaveChangesAsync();
        return project;
    }
}
