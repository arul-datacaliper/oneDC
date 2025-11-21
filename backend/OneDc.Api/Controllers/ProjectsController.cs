using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
using OneDc.Services.DTOs;
using System.Net;
using Npgsql;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : BaseController
{
    private readonly IProjectService _svc;
    private readonly ILogger<ProjectsController> _logger;
    private readonly OneDcDbContext _db;
    
    public ProjectsController(IProjectService svc, ILogger<ProjectsController> logger, OneDcDbContext db)
    {
        _svc = svc;
        _logger = logger;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // For Admin users, return all projects
        if (IsAdmin())
        {
            var allItems = await _svc.GetAllAsync();
            return Ok(allItems);
        }
        
        // For Approver users, return projects they manage OR where they are team members OR have allocations
        if (IsApprover())
        {
            var currentUserId = GetCurrentUserId();
            
            _logger.LogInformation("ProjectsController.GetAll - Approver filtering for user: {UserId}", currentUserId);
            
            // Get ACTIVE projects where approver is DefaultApprover or ProjectMember
            var activeApproverProjectIds = await _db.Projects
                .Where(p => p.Status == "ACTIVE" && !p.IsDeleted &&
                           (p.DefaultApprover == currentUserId || 
                            _db.Set<ProjectMember>().Any(pm => pm.ProjectId == p.ProjectId && pm.UserId == currentUserId)))
                .Select(p => p.ProjectId)
                .ToListAsync();
            
            // Get NON-DELETED projects where approver has active allocations (regardless of project status)
            var allocationProjectIds = await _db.WeeklyAllocations
                .Where(wa => wa.UserId == currentUserId)
                .Join(_db.Projects.Where(p => !p.IsDeleted), 
                     wa => wa.ProjectId, 
                     p => p.ProjectId, 
                     (wa, p) => wa.ProjectId)
                .Distinct()
                .ToListAsync();
            
            _logger.LogInformation("ProjectsController.GetAll - Found {ActiveCount} active managed projects and {AllocationCount} allocated projects", 
                activeApproverProjectIds.Count, allocationProjectIds.Count);
            
            // Combine both lists
            var allProjectIds = activeApproverProjectIds.Union(allocationProjectIds).ToList();
            
            var approverProjects = await _db.Projects
                .Include(p => p.Client)
                .Where(p => allProjectIds.Contains(p.ProjectId))
                .Distinct()
                .AsNoTracking()
                .ToListAsync();
            
            _logger.LogInformation("ProjectsController.GetAll - Returning {Count} projects for approver", approverProjects.Count);
            return Ok(approverProjects);
        }
        
        // For Employee users, return ACTIVE projects they have tasks assigned to OR projects they have allocations for
        var userId = GetCurrentUserId();
        
        _logger.LogInformation("ProjectsController.GetAll - Employee filtering for user: {UserId}", userId);
        
        // Get ACTIVE projects with assigned tasks
        var activeTaskProjectIds = await _db.Projects
            .Where(p => p.Status == "ACTIVE" && !p.IsDeleted &&
                       _db.ProjectTasks.Any(t => t.ProjectId == p.ProjectId && t.AssignedUserId == userId))
            .Select(p => p.ProjectId)
            .ToListAsync();
        
        // Get NON-DELETED projects where employee has allocations (regardless of project status)
        var employeeAllocationProjectIds = await _db.WeeklyAllocations
            .Where(wa => wa.UserId == userId)
            .Join(_db.Projects.Where(p => !p.IsDeleted), 
                 wa => wa.ProjectId, 
                 p => p.ProjectId, 
                 (wa, p) => wa.ProjectId)
            .Distinct()
            .ToListAsync();
        
        _logger.LogInformation("ProjectsController.GetAll - Found {ActiveTaskCount} active task projects and {AllocationCount} allocated projects", 
            activeTaskProjectIds.Count, employeeAllocationProjectIds.Count);
        
        // Combine both lists
        var employeeProjectIds = activeTaskProjectIds.Union(employeeAllocationProjectIds).ToList();
        
        var employeeProjects = await _db.Projects
            .Include(p => p.Client)
            .Where(p => employeeProjectIds.Contains(p.ProjectId))
            .Distinct()
            .AsNoTracking()
            .ToListAsync();
        
        _logger.LogInformation("ProjectsController.GetAll - Returning {Count} projects for employee", employeeProjects.Count);
        return Ok(employeeProjects);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Project project)
    {
        try
        {
            _logger.LogInformation("Attempting to create project with code: {ProjectCode}", project.Code);
            
            var created = await _svc.CreateAsync(project);
            
            _logger.LogInformation("Project created successfully: {ProjectId}", created.ProjectId);
            return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning(ex, "Duplicate project code: {ProjectCode}", project.Code);
            return Conflict(new
            {
                title = "Duplicate Project Code",
                detail = ex.Message,
                status = 409
            });
        }
        catch (DbUpdateException ex) when (ex.InnerException is NpgsqlException npgsqlEx && 
                                           (npgsqlEx.SqlState == "23505" || npgsqlEx.Message.Contains("unique")))
        {
            _logger.LogWarning(ex, "Unique constraint violation for project: {ProjectCode}", project.Code);
            return Conflict(new
            {
                title = "Duplicate Project Code",
                detail = $"A project with code '{project.Code}' already exists.",
                status = 409
            });
        }
        catch (TimeoutException ex)
        {
            _logger.LogError(ex, "Timeout occurred while creating project: {ProjectCode}", project.Code);
            return StatusCode((int)HttpStatusCode.RequestTimeout, new
            {
                title = "Database Timeout",
                detail = "The request timed out while creating the project. Please try again.",
                status = 408
            });
        }
        catch (NpgsqlException ex) when (ex.Message.Contains("timeout") || ex.Message.Contains("Timeout"))
        {
            _logger.LogError(ex, "Database timeout while creating project: {ProjectCode}", project.Code);
            return StatusCode((int)HttpStatusCode.RequestTimeout, new
            {
                title = "Database Connection Timeout",
                detail = "The database operation timed out. Please try again in a moment.",
                status = 408
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating project: {ProjectCode}", project.Code);
            return StatusCode((int)HttpStatusCode.InternalServerError, new
            {
                title = "Internal Server Error",
                detail = "An unexpected error occurred while creating the project.",
                status = 500
            });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Project project)
    {
        // Debug logging to see what data is received
        Console.WriteLine($"Update Project - ID: {id}");
        Console.WriteLine($"Project Data - Code: {project.Code}, Name: {project.Name}");
        Console.WriteLine($"Project Data - StartDate: {project.StartDate}, EndDate: {project.EndDate}");
        Console.WriteLine($"Project Data - PlannedReleaseDate: {project.PlannedReleaseDate}");
        
        project.ProjectId = id; // Ensure the ID matches the route
        var updated = await _svc.UpdateAsync(project);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("{id:guid}/delete-validation")]
    public async Task<IActionResult> ValidateProjectDeletion(Guid id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.ProjectId == id);
        if (project is null) return NotFound();

        // Check for allocations
        var allocationCount = await _db.Set<ProjectAllocation>().CountAsync(pa => pa.ProjectId == id);
        var weeklyAllocationCount = await _db.Set<WeeklyAllocation>().CountAsync(wa => wa.ProjectId == id);
        
        // Check for timesheet entries
        var timesheetCount = await _db.Set<TimesheetEntry>().CountAsync(te => te.ProjectId == id);
        
        // Get sample data for display (limit to 5 entries each)
        var allocations = allocationCount > 0 ? await _db.Set<ProjectAllocation>()
            .Where(pa => pa.ProjectId == id)
            .Join(_db.AppUsers, pa => pa.UserId, u => u.UserId, (pa, u) => new { 
                pa.AllocationId, 
                EmployeeName = u.FirstName + " " + u.LastName,
                pa.StartDate, 
                pa.EndDate, 
                pa.AllocationPct 
            })
            .Take(5)
            .ToListAsync() : null;

        var timesheets = timesheetCount > 0 ? await _db.Set<TimesheetEntry>()
            .Where(te => te.ProjectId == id)
            .Join(_db.AppUsers, te => te.UserId, u => u.UserId, (te, u) => new { 
                te.EntryId, 
                EmployeeName = u.FirstName + " " + u.LastName,
                te.WorkDate, 
                te.Hours,
                te.Status 
            })
            .Take(5)
            .ToListAsync() : null;

        var totalDependencies = allocationCount + weeklyAllocationCount + timesheetCount;
        
        return Ok(new
        {
            canDelete = totalDependencies == 0,
            dependencies = new
            {
                allocationCount = allocationCount,
                weeklyAllocationCount = weeklyAllocationCount,
                timesheetCount = timesheetCount,
                totalCount = totalDependencies,
                allocations = allocations,
                timesheets = timesheets
            },
            message = totalDependencies > 0 
                ? $"Cannot delete project. It has {allocationCount} allocation(s), {weeklyAllocationCount} weekly allocation(s), and {timesheetCount} timesheet entry(ies)."
                : "Project can be safely deleted."
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.ProjectId == id);
        if (project is null) return NotFound();

        // Check for dependencies
        var hasAllocations = await _db.Set<ProjectAllocation>().AnyAsync(pa => pa.ProjectId == id);
        var hasWeeklyAllocations = await _db.Set<WeeklyAllocation>().AnyAsync(wa => wa.ProjectId == id);
        var hasTimesheets = await _db.Set<TimesheetEntry>().AnyAsync(te => te.ProjectId == id);
        
        // If project has dependencies, always use soft delete
        if (hasAllocations || hasWeeklyAllocations || hasTimesheets)
        {
            var currentUserId = GetCurrentUserId();
            var success = await _svc.SoftDeleteAsync(id, currentUserId);
            if (success)
            {
                return Ok(new { 
                    message = "Project has been soft deleted due to existing dependencies. You can restore it from the deleted projects view if needed.",
                    isSoftDeleted = true 
                });
            }
            return NotFound();
        }

        // For projects without dependencies, check status for soft delete preference
        if (project.Status == "CLOSED")
        {
            var currentUserId = GetCurrentUserId();
            var success = await _svc.SoftDeleteAsync(id, currentUserId);
            if (success)
            {
                return Ok(new { 
                    message = "Project has been soft deleted because it was closed. You can restore it from the deleted projects view if needed.",
                    isSoftDeleted = true 
                });
            }
            return NotFound();
        }

        // For active projects without dependencies, do hard delete
        try
        {
            var success = await _svc.DeleteAsync(id);
            return success ? NoContent() : NotFound();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("foreign key constraint") == true)
        {
            // Fallback to soft delete if there are unexpected constraints
            var currentUserId = GetCurrentUserId();
            var softDeleteSuccess = await _svc.SoftDeleteAsync(id, currentUserId);
            if (softDeleteSuccess)
            {
                return Ok(new { 
                    message = "Project has been soft deleted due to database constraints. You can restore it from the deleted projects view if needed.",
                    isSoftDeleted = true 
                });
            }
            
            return BadRequest(new { 
                message = "Cannot delete project due to existing dependencies.",
                errorCode = "FOREIGN_KEY_CONSTRAINT",
                details = ex.InnerException.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting project with ID: {ProjectId}", id);
            return StatusCode(500, new { 
                message = "An error occurred while deleting the project.",
                details = ex.Message 
            });
        }
    }

    [HttpGet("deleted")]
    public async Task<IActionResult> GetDeletedProjects()
    {
        try
        {
            var deletedProjects = await _svc.GetDeletedProjectsAsync();
            return Ok(deletedProjects);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving deleted projects");
            return StatusCode(500, new { 
                message = "An error occurred while retrieving deleted projects.",
                details = ex.Message 
            });
        }
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreProject(Guid id)
    {
        try
        {
            var success = await _svc.RestoreAsync(id);
            if (success)
            {
                return Ok(new { message = "Project restored successfully." });
            }
            return NotFound(new { message = "Project not found or is not deleted." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring project with ID: {ProjectId}", id);
            return StatusCode(500, new { 
                message = "An error occurred while restoring the project.",
                details = ex.Message 
            });
        }
    }

    // New endpoints for project members
    [HttpGet("with-members")]
    public async Task<IActionResult> GetAllWithMembers()
    {
        try
        {
            // For Admin users, return all projects with members
            if (IsAdmin())
            {
                var allItems = await _svc.GetAllWithMembersAsync();
                return Ok(allItems);
            }
            
            // For Approver users, return projects they manage OR where they are team members OR have allocations with members
            if (IsApprover())
            {
                var currentUserId = GetCurrentUserId();
                
                // Get projects where approver is DefaultApprover or ProjectMember
                var approverProjectIds = await _db.Projects
                    .Where(p => p.DefaultApprover == currentUserId || 
                               _db.Set<ProjectMember>().Any(pm => pm.ProjectId == p.ProjectId && pm.UserId == currentUserId))
                    .Select(p => p.ProjectId)
                    .ToListAsync();
                
                // Get projects where approver has allocations
                var allocationProjectIds = await _db.WeeklyAllocations
                    .Where(wa => wa.UserId == currentUserId)
                    .Select(wa => wa.ProjectId)
                    .Distinct()
                    .ToListAsync();
                
                // Combine both lists
                var allProjectIds = approverProjectIds.Union(allocationProjectIds).ToList();
                
                var managedProjects = await _db.Projects
                    .Include(p => p.Client)
                    .Include(p => p.ProjectMembers)
                        .ThenInclude(pm => pm.User)
                    .Where(p => allProjectIds.Contains(p.ProjectId))
                    .Distinct()
                    .AsNoTracking()
                    .Select(project => new ProjectResponseDto
                    {
                        ProjectId = project.ProjectId,
                        ClientId = project.ClientId,
                        Code = project.Code,
                        Name = project.Name,
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
                            FirstName = pm.User!.FirstName,
                            LastName = pm.User!.LastName,
                            Email = pm.User!.Email,
                            Role = pm.User!.Role,
                            JobTitle = pm.User!.JobTitle,
                            Department = pm.User!.Department
                        }).ToList()
                    })
                    .ToListAsync();
                return Ok(managedProjects);
            }
            
            // For Employee users, return projects they have tasks assigned to with members
            var userId = GetCurrentUserId();
            var projectsWithAssignedTasks = await _db.Projects
                .Include(p => p.Client)
                .Include(p => p.ProjectMembers)
                    .ThenInclude(pm => pm.User)
                .Where(p => _db.ProjectTasks.Any(t => t.ProjectId == p.ProjectId && t.AssignedUserId == userId))
                .Distinct()
                .AsNoTracking()
                .Select(project => new ProjectResponseDto
                {
                    ProjectId = project.ProjectId,
                    ClientId = project.ClientId,
                    Code = project.Code,
                    Name = project.Name,
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
                        FirstName = pm.User!.FirstName,
                        LastName = pm.User!.LastName,
                        Email = pm.User!.Email,
                        Role = pm.User!.Role,
                        JobTitle = pm.User!.JobTitle,
                        Department = pm.User!.Department
                    }).ToList()
                })
                .ToListAsync();
            
            return Ok(projectsWithAssignedTasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving projects with members");
            return StatusCode(500, new { message = "An error occurred while retrieving projects with members." });
        }
    }

    [HttpGet("{id:guid}/with-members")]
    public async Task<IActionResult> GetByIdWithMembers(Guid id)
    {
        var item = await _svc.GetByIdWithMembersAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("with-members")]
    public async Task<IActionResult> CreateWithMembers([FromBody] ProjectCreateDto projectDto)
    {
        try
        {
            _logger.LogInformation("Attempting to create project with members: {ProjectCode}", projectDto.Code);
            
            var created = await _svc.CreateWithMembersAsync(projectDto);
            
            _logger.LogInformation("Project with members created successfully: {ProjectId}", created.ProjectId);
            return CreatedAtAction(nameof(GetByIdWithMembers), new { id = created.ProjectId }, created);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning(ex, "Duplicate project code: {ProjectCode}", projectDto.Code);
            return Conflict(new
            {
                title = "Duplicate Project Code",
                detail = ex.Message,
                status = 409
            });
        }
        catch (DbUpdateException ex) when (ex.InnerException is NpgsqlException npgsqlEx && 
                                           (npgsqlEx.SqlState == "23505" || npgsqlEx.Message.Contains("unique")))
        {
            _logger.LogWarning(ex, "Unique constraint violation for project: {ProjectCode}", projectDto.Code);
            return Conflict(new
            {
                title = "Duplicate Project Code",
                detail = $"A project with code '{projectDto.Code}' already exists.",
                status = 409
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating project with members: {ProjectCode}", projectDto.Code);
            return StatusCode((int)HttpStatusCode.InternalServerError, new
            {
                title = "Internal Server Error",
                detail = "An unexpected error occurred while creating the project.",
                status = 500
            });
        }
    }

    [HttpPut("{id:guid}/with-members")]
    public async Task<IActionResult> UpdateWithMembers(Guid id, [FromBody] ProjectUpdateDto projectDto)
    {
        try
        {
            // Add validation logging
            _logger.LogInformation("UpdateWithMembers - ID: {ProjectId}, ClientId: {ClientId}, Code: {Code}", 
                id, projectDto.ClientId, projectDto.Code);
            
            // Validate required fields
            if (projectDto.ClientId == Guid.Empty)
            {
                _logger.LogWarning("ClientId is missing or empty for project update: {ProjectId}", id);
                return BadRequest(new { message = "ClientId is required." });
            }
            
            if (string.IsNullOrWhiteSpace(projectDto.Code))
            {
                _logger.LogWarning("Project code is missing for project update: {ProjectId}", id);
                return BadRequest(new { message = "Project code is required." });
            }
            
            if (string.IsNullOrWhiteSpace(projectDto.Name))
            {
                _logger.LogWarning("Project name is missing for project update: {ProjectId}", id);
                return BadRequest(new { message = "Project name is required." });
            }

            projectDto.ProjectId = id; // Ensure the ID matches the route
            var updated = await _svc.UpdateWithMembersAsync(projectDto);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating project with members: {ProjectId}. DTO: {@ProjectDto}", id, projectDto);
            return StatusCode(500, new { message = "An error occurred while updating the project with members.", detail = ex.Message });
        }
    }

    // GET: api/projects/{id}/has-usage
    [HttpGet("{id:guid}/has-usage")]
    public async Task<IActionResult> CheckProjectHasUsage(Guid id)
    {
        try
        {
            // Check if project has any timesheets
            var hasTimesheets = await _db.TimesheetEntries
                .AnyAsync(t => t.ProjectId == id);
            
            // Check if project has any allocations
            var hasAllocations = await _db.WeeklyAllocations
                .AnyAsync(wa => wa.ProjectId == id);

            var result = new
            {
                hasTimesheets,
                hasAllocations,
                hasUsage = hasTimesheets || hasAllocations,
                canChangeClient = !hasTimesheets && !hasAllocations
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking project usage: {ProjectId}", id);
            return StatusCode(500, new { message = "An error occurred while checking project usage." });
        }
    }
}
