using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly OneDcDbContext _db;
    public TasksController(OneDcDbContext db) => _db = db;

    // GET /api/projects/{projectId}/tasks
    [HttpGet("projects/{projectId:guid}/tasks")] 
    public async Task<ActionResult<IEnumerable<TaskDto>>> List(Guid projectId, [FromQuery] Guid? assignedUserId, [FromQuery] OneDc.Domain.Entities.TaskStatus? status)
    {
        var q = _db.ProjectTasks.AsNoTracking().Where(t => t.ProjectId == projectId);
        if (assignedUserId.HasValue) q = q.Where(t => t.AssignedUserId == assignedUserId);
        if (status.HasValue) q = q.Where(t => t.Status == status);

        var rows = await q.OrderByDescending(t => t.CreatedAt)
            .Select(t => new TaskDto {
                TaskId = t.TaskId,
                ProjectId = t.ProjectId,
                AssignedUserId = t.AssignedUserId,
                Title = t.Title,
                Description = t.Description,
                Label = t.Label,
                EstimatedHours = t.EstimatedHours,
                StartDate = t.StartDate,
                EndDate = t.EndDate,
                Status = t.Status,
                AssignedUserName = t.AssignedUser != null ? t.AssignedUser.FirstName + " " + t.AssignedUser.LastName : null
            })
            .ToListAsync();
        return Ok(rows);
    }

    // GET /api/tasks/{taskId}
    [HttpGet("tasks/{taskId:guid}")]
    public async Task<ActionResult<TaskDto>> Get(Guid taskId)
    {
        var t = await _db.ProjectTasks.AsNoTracking()
            .Include(x => x.AssignedUser)
            .FirstOrDefaultAsync(x => x.TaskId == taskId);
        if (t == null) return NotFound();
        return new TaskDto {
            TaskId = t.TaskId,
            ProjectId = t.ProjectId,
            AssignedUserId = t.AssignedUserId,
            Title = t.Title,
            Description = t.Description,
            Label = t.Label,
            EstimatedHours = t.EstimatedHours,
            StartDate = t.StartDate,
            EndDate = t.EndDate,
            Status = t.Status,
            AssignedUserName = t.AssignedUser != null ? t.AssignedUser.FirstName + " " + t.AssignedUser.LastName : null
        };
    }

    // POST /api/projects/{projectId}/tasks
    [HttpPost("projects/{projectId:guid}/tasks")] 
    public async Task<ActionResult<TaskDto>> Create(Guid projectId, CreateTaskRequest req)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.ProjectId == projectId);
        if (!projectExists) return BadRequest("Project not found");
        if (req.EndDate.HasValue && req.StartDate.HasValue && req.EndDate < req.StartDate)
            return BadRequest("EndDate must be after StartDate");

        var entity = new ProjectTask {
            TaskId = Guid.NewGuid(),
            ProjectId = projectId,
            AssignedUserId = req.AssignedUserId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            Label = req.Label?.Trim(),
            EstimatedHours = req.EstimatedHours,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            Status = OneDc.Domain.Entities.TaskStatus.NEW
        };
        _db.ProjectTasks.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { taskId = entity.TaskId }, new { entity.TaskId });
    }

    // PUT /api/tasks/{taskId}
    [HttpPut("tasks/{taskId:guid}")]
    public async Task<IActionResult> Update(Guid taskId, UpdateTaskRequest req)
    {
        var t = await _db.ProjectTasks.FirstOrDefaultAsync(x => x.TaskId == taskId);
        if (t == null) return NotFound();
        if (req.EndDate.HasValue && req.StartDate.HasValue && req.EndDate < req.StartDate)
            return BadRequest("EndDate must be after StartDate");

        t.Title = req.Title.Trim();
        t.Description = req.Description?.Trim();
        t.Label = req.Label?.Trim();
        t.AssignedUserId = req.AssignedUserId;
        t.EstimatedHours = req.EstimatedHours;
        t.StartDate = req.StartDate;
        t.EndDate = req.EndDate;
        t.Status = req.Status;
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH /api/tasks/{taskId}/status
    [HttpPatch("tasks/{taskId:guid}/status")] 
    public async Task<IActionResult> UpdateStatus(Guid taskId, UpdateTaskStatusRequest req)
    {
        var t = await _db.ProjectTasks.FirstOrDefaultAsync(x => x.TaskId == taskId);
        if (t == null) return NotFound();
        t.Status = req.Status;
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/tasks/{taskId}
    [HttpDelete("tasks/{taskId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId)
    {
        var t = await _db.ProjectTasks.FirstOrDefaultAsync(x => x.TaskId == taskId);
        if (t == null) return NotFound();
        _db.ProjectTasks.Remove(t);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateTaskRequest(string Title, string? Description, string? Label, Guid? AssignedUserId, decimal? EstimatedHours, DateOnly? StartDate, DateOnly? EndDate);
public record UpdateTaskRequest(string Title, string? Description, string? Label, Guid? AssignedUserId, decimal? EstimatedHours, DateOnly? StartDate, DateOnly? EndDate, OneDc.Domain.Entities.TaskStatus Status);
public record UpdateTaskStatusRequest(OneDc.Domain.Entities.TaskStatus Status);

public class TaskDto
{
    public Guid TaskId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? Label { get; set; }
    public decimal? EstimatedHours { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public OneDc.Domain.Entities.TaskStatus Status { get; set; }
    public string? AssignedUserName { get; set; }
}
