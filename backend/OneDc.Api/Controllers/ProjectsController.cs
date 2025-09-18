using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _svc;
    public ProjectsController(IProjectService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _svc.GetAllAsync();
        return Ok(items);
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
        var created = await _svc.CreateAsync(project);
        return CreatedAtAction(nameof(GetById), new { id = created.ProjectId }, created);
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
