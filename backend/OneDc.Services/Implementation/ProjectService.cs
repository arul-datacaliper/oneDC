using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace OneDc.Services.Implementation;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repo;
    private readonly ILogger<ProjectService> _logger;
    
    public ProjectService(IProjectRepository repo, ILogger<ProjectService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public Task<IEnumerable<Project>> GetAllAsync() => _repo.GetAllAsync();

    public Task<Project?> GetByIdAsync(Guid id) => _repo.GetByIdAsync(id);

    public async Task<Project> CreateAsync(Project project)
    {
        try
        {
            _logger.LogInformation("Creating project with code: {ProjectCode}", project.Code);
            
            // Check if project code already exists
            var exists = await _repo.ExistsByCodeAsync(project.Code);
            if (exists)
            {
                _logger.LogWarning("Project code already exists: {ProjectCode}", project.Code);
                throw new InvalidOperationException($"A project with code '{project.Code}' already exists.");
            }
            
            project.ProjectId = Guid.NewGuid();
            project.CreatedAt = DateTimeOffset.UtcNow;
            
            await _repo.AddAsync(project);
            
            _logger.LogInformation("Saving project to database...");
            await _repo.SaveChangesAsync();
            
            _logger.LogInformation("Project created successfully with ID: {ProjectId}", project.ProjectId);
            return project;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create project with code: {ProjectCode}. Error: {ErrorMessage}", 
                project.Code, ex.Message);
            throw;
        }
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
        existing.PlannedReleaseDate = project.PlannedReleaseDate;
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
