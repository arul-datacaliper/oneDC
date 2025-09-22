using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly OneDcDbContext _db;
    private readonly IEmailService _emailService;
    
    public TasksController(OneDcDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

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

        // Send email notification if task is assigned to someone
        if (req.AssignedUserId.HasValue)
        {
            try
            {
                var assignee = await _db.AppUsers.FirstOrDefaultAsync(u => u.UserId == req.AssignedUserId.Value);
                var project = await _db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId);
                
                if (assignee != null && project != null && !string.IsNullOrEmpty(assignee.WorkEmail))
                {
                    var assigneeName = $"{assignee.FirstName} {assignee.LastName}";
                    await _emailService.SendTaskAssignmentNotificationAsync(
                        assignee.WorkEmail,
                        assigneeName,
                        entity.Title,
                        entity.Description ?? "",
                        project.Name,
                        entity.StartDate,
                        entity.EndDate
                    );
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the task creation
                Console.WriteLine($"Failed to send task assignment email: {ex.Message}");
            }
        }

        return CreatedAtAction(nameof(Get), new { taskId = entity.TaskId }, new { entity.TaskId });
    }

    // PUT /api/tasks/{taskId}
    [HttpPut("tasks/{taskId:guid}")]
    public async Task<IActionResult> Update(Guid taskId, UpdateTaskRequest req)
    {
        var t = await _db.ProjectTasks
            .Include(x => x.Project)
            .FirstOrDefaultAsync(x => x.TaskId == taskId);
        if (t == null) return NotFound();
        if (req.EndDate.HasValue && req.StartDate.HasValue && req.EndDate < req.StartDate)
            return BadRequest("EndDate must be after StartDate");

        // Check if assignee changed
        var previousAssigneeId = t.AssignedUserId;
        var newAssigneeId = req.AssignedUserId;
        var assigneeChanged = previousAssigneeId != newAssigneeId;

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

        // Send email notification if task assignee changed and is now assigned to someone
        if (assigneeChanged && req.AssignedUserId.HasValue)
        {
            try
            {
                var assignee = await _db.AppUsers.FirstOrDefaultAsync(u => u.UserId == req.AssignedUserId.Value);
                
                if (assignee != null && !string.IsNullOrEmpty(assignee.WorkEmail))
                {
                    var assigneeName = $"{assignee.FirstName} {assignee.LastName}";
                    await _emailService.SendTaskAssignmentNotificationAsync(
                        assignee.WorkEmail,
                        assigneeName,
                        t.Title,
                        t.Description ?? "",
                        t.Project?.Name ?? "Unknown Project",
                        t.StartDate,
                        t.EndDate
                    );
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the task update
                Console.WriteLine($"Failed to send task assignment email: {ex.Message}");
            }
        }

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
