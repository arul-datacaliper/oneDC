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

    public async Task<Project?> UpdateAsync(Project project)
    {
        var existing = await _repo.GetByIdAsync(project.ProjectId);
        if (existing == null) return null;

        // Update properties
        existing.Code = project.Code;
        existing.Name = project.Name;
        existing.ClientId = project.ClientId;
        existing.Status = project.Status;
        existing.Billable = project.Billable;
        existing.DefaultApprover = project.DefaultApprover;
        existing.StartDate = project.StartDate;
        existing.EndDate = project.EndDate;
        existing.BudgetHours = project.BudgetHours;
        existing.BudgetCost = project.BudgetCost;

        await _repo.UpdateAsync(existing);
        await _repo.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var project = await _repo.GetByIdAsync(id);
        if (project == null) return false;

        await _repo.DeleteAsync(project);
        await _repo.SaveChangesAsync();
        return true;
    }
}
