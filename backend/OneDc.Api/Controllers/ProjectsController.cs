using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
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
        
        // For Approver users, return only projects they manage
        if (IsApprover())
        {
            var currentUserId = GetCurrentUserId();
            var managedProjects = await _db.Projects
                .Include(p => p.Client)
                .Where(p => p.DefaultApprover == currentUserId)
                .AsNoTracking()
                .ToListAsync();
            return Ok(managedProjects);
        }
        
        // For Employee users, return projects they have tasks assigned to
        var userId = GetCurrentUserId();
        var projectsWithAssignedTasks = await _db.Projects
            .Include(p => p.Client)
            .Where(p => _db.ProjectTasks.Any(t => t.ProjectId == p.ProjectId && t.AssignedUserId == userId))
            .Distinct()
            .AsNoTracking()
            .ToListAsync();
        
        return Ok(projectsWithAssignedTasks);
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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _svc.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
