using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;
using OneDc.Services.DTOs;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;

namespace OneDc.Services.Implementation;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _repo;
    private readonly ILogger<ProjectService> _logger;
    private readonly OneDcDbContext _dbContext;
    
    public ProjectService(IProjectRepository repo, ILogger<ProjectService> logger, OneDcDbContext dbContext)
    {
        _repo = repo;
        _logger = logger;
        _dbContext = dbContext;
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

    public async Task<ProjectResponseDto> CreateWithMembersAsync(ProjectCreateDto projectDto)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Creating project with members: {ProjectCode}", projectDto.Code);
                
                // Check if project code already exists
                var exists = await _repo.ExistsByCodeAsync(projectDto.Code);
                if (exists)
                {
                    _logger.LogWarning("Project code already exists: {ProjectCode}", projectDto.Code);
                    throw new InvalidOperationException($"A project with code '{projectDto.Code}' already exists.");
                }
                
                // Create the project
                var project = new Project
                {
                    ProjectId = Guid.NewGuid(),
                    ClientId = projectDto.ClientId,
                    Code = projectDto.Code,
                    Name = projectDto.Name,
                    Description = projectDto.Description, // Add description
                    Status = projectDto.Status,
                    Billable = projectDto.Billable,
                    DefaultApprover = projectDto.DefaultApprover,
                    StartDate = projectDto.StartDate,
                    EndDate = projectDto.EndDate,
                    PlannedReleaseDate = projectDto.PlannedReleaseDate,
                    BudgetHours = projectDto.BudgetHours,
                    BudgetCost = projectDto.BudgetCost,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                
                await _repo.AddAsync(project);
                await _repo.SaveChangesAsync();
                
                // Add project members
                foreach (var memberDto in projectDto.ProjectMembers)
                {
                    var projectMember = new ProjectMember
                    {
                        ProjectId = project.ProjectId,
                        UserId = memberDto.UserId,
                        ProjectRole = memberDto.ProjectRole,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    
                    _dbContext.ProjectMembers.Add(projectMember);
                }
                
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                
                _logger.LogInformation("Project with members created successfully: {ProjectId}", project.ProjectId);
                
                // Return the created project with members
                return await GetByIdWithMembersAsync(project.ProjectId) 
                    ?? throw new InvalidOperationException("Failed to retrieve created project");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to create project with members: {ProjectCode}", projectDto.Code);
                throw;
            }
        });
    }

    public async Task<ProjectResponseDto?> UpdateWithMembersAsync(ProjectUpdateDto projectDto)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Updating project with members: {ProjectId}", projectDto.ProjectId);
                
                var existing = await _repo.GetByIdAsync(projectDto.ProjectId);
                if (existing == null) return null;

                // Update project properties
                existing.Code = projectDto.Code;
                existing.Name = projectDto.Name;
                existing.Description = projectDto.Description; // Add description
                existing.ClientId = projectDto.ClientId;
                existing.Status = projectDto.Status;
                existing.Billable = projectDto.Billable;
                existing.DefaultApprover = projectDto.DefaultApprover;
                existing.StartDate = projectDto.StartDate;
                existing.EndDate = projectDto.EndDate;
                existing.PlannedReleaseDate = projectDto.PlannedReleaseDate;
                existing.BudgetHours = projectDto.BudgetHours;
                existing.BudgetCost = projectDto.BudgetCost;

                await _repo.UpdateAsync(existing);
                await _repo.SaveChangesAsync();
                
                // Update project members - remove existing and add new ones
                var existingMembers = await _dbContext.ProjectMembers
                    .Where(pm => pm.ProjectId == projectDto.ProjectId)
                    .ToListAsync();
                
                _dbContext.ProjectMembers.RemoveRange(existingMembers);
                
                foreach (var memberDto in projectDto.ProjectMembers)
                {
                    var projectMember = new ProjectMember
                    {
                        ProjectId = projectDto.ProjectId,
                        UserId = memberDto.UserId,
                        ProjectRole = memberDto.ProjectRole,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    
                    _dbContext.ProjectMembers.Add(projectMember);
                }
                
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                
                _logger.LogInformation("Project with members updated successfully: {ProjectId}", projectDto.ProjectId);
                
                return await GetByIdWithMembersAsync(projectDto.ProjectId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to update project with members: {ProjectId}", projectDto.ProjectId);
                throw;
            }
        });
    }

    public async Task<ProjectResponseDto?> GetByIdWithMembersAsync(Guid id)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectMembers)
                .ThenInclude(pm => pm.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.ProjectId == id);
            
        if (project == null) return null;
        
        return new ProjectResponseDto
        {
            ProjectId = project.ProjectId,
            ClientId = project.ClientId,
            Code = project.Code,
            Name = project.Name,
            Description = project.Description, // Add description
            Status = project.Status,
            Billable = project.Billable,
            DefaultApprover = project.DefaultApprover,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            PlannedReleaseDate = project.PlannedReleaseDate,
            BudgetHours = project.BudgetHours,
            BudgetCost = project.BudgetCost,
            CreatedAt = project.CreatedAt,
            Client = project.Client,
            ProjectMembers = project.ProjectMembers.Select(pm => new ProjectMemberResponseDto
            {
                UserId = pm.UserId,
                ProjectRole = pm.ProjectRole,
                CreatedAt = pm.CreatedAt,
                FirstName = pm.User?.FirstName ?? "",
                LastName = pm.User?.LastName ?? "",
                Email = pm.User?.Email ?? "",
                Role = pm.User?.Role ?? UserRole.EMPLOYEE,
                JobTitle = pm.User?.JobTitle,
                Department = pm.User?.Department
            }).ToList()
        };
    }

    public async Task<IEnumerable<ProjectResponseDto>> GetAllWithMembersAsync()
    {
        var projects = await _dbContext.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectMembers)
                .ThenInclude(pm => pm.User)
            .AsNoTracking()
            .ToListAsync();
            
        return projects.Select(project => new ProjectResponseDto
        {
            ProjectId = project.ProjectId,
            ClientId = project.ClientId,
            Code = project.Code,
            Name = project.Name,
            Description = project.Description, // Add description
            Status = project.Status,
            Billable = project.Billable,
            DefaultApprover = project.DefaultApprover,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            PlannedReleaseDate = project.PlannedReleaseDate,
            BudgetHours = project.BudgetHours,
            BudgetCost = project.BudgetCost,
            CreatedAt = project.CreatedAt,
            Client = project.Client,
            ProjectMembers = project.ProjectMembers.Select(pm => new ProjectMemberResponseDto
            {
                UserId = pm.UserId,
                ProjectRole = pm.ProjectRole,
                CreatedAt = pm.CreatedAt,
                FirstName = pm.User?.FirstName ?? "",
                LastName = pm.User?.LastName ?? "",
                Email = pm.User?.Email ?? "",
                Role = pm.User?.Role ?? UserRole.EMPLOYEE,
                JobTitle = pm.User?.JobTitle,
                Department = pm.User?.Department
            }).ToList()
        }).ToList();
    }
}
