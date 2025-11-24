using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using OneDc.Domain.Entities;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetsController : BaseController
{
    private readonly ITimesheetService _svc;

    public TimesheetsController(ITimesheetService svc)
    {
        _svc = svc;
    }

    // GET api/timesheets?from=2025-09-08&to=2025-09-14
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Convert DateTime to DateOnly, with defaults
            var fromDate = from.HasValue ? DateOnly.FromDateTime(from.Value) : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
            var toDate = to.HasValue ? DateOnly.FromDateTime(to.Value) : DateOnly.FromDateTime(DateTime.Today);
            
            var items = await _svc.GetMineAsync(userId, fromDate, toDate);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    public record CreateReq(Guid ProjectId, DateOnly WorkDate, decimal Hours, string? Description, string? TicketRef, Guid? TaskId, int TaskType);
    public record UpdateReq(decimal Hours, string? Description, string? TicketRef, Guid? TaskId, int? TaskType);

    // POST api/timesheets  (create DRAFT)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReq req)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Convert TaskType from int to enum
            if (!Enum.IsDefined(typeof(TaskType), req.TaskType))
            {
                return BadRequest(new { error = "Invalid TaskType value" });
            }
            var taskType = (TaskType)req.TaskType;
            
            var created = await _svc.CreateDraftAsync(userId,
                new TimesheetCreateDto(req.ProjectId, req.WorkDate, req.Hours, req.Description, req.TicketRef, req.TaskId, taskType));
            return CreatedAtAction(nameof(GetMine), new { from = created.WorkDate, to = created.WorkDate }, created);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // PUT api/timesheets/{id}  (edit DRAFT)
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateReq req)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Convert TaskType from int to enum if provided
            TaskType? taskType = null;
            if (req.TaskType.HasValue)
            {
                if (!Enum.IsDefined(typeof(TaskType), req.TaskType.Value))
                {
                    return BadRequest(new { error = "Invalid TaskType value" });
                }
                taskType = (TaskType)req.TaskType.Value;
            }
            
            var updated = await _svc.UpdateDraftAsync(userId, id,
                new TimesheetUpdateDto(req.Hours, req.Description, req.TicketRef, req.TaskId, taskType));
            return Ok(updated);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // POST api/timesheets/{id}/submit  (DRAFT -> SUBMITTED)
    [HttpPost("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var submitted = await _svc.SubmitAsync(userId, id);
            return Ok(submitted);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // DELETE api/timesheets/{id}  (delete DRAFT or REJECTED)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _svc.DeleteAsync(userId, id);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // Admin endpoints for viewing all timesheets
    
    // GET api/timesheets/all?from=2025-09-08&to=2025-09-14
    [HttpGet("all")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        try
        {
            var fromDate = from.HasValue ? DateOnly.FromDateTime(from.Value) : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
            var toDate = to.HasValue ? DateOnly.FromDateTime(to.Value) : DateOnly.FromDateTime(DateTime.Today);
            
            var items = await _svc.GetAllAsync(fromDate, toDate);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // GET api/timesheets/user/{userId}?from=2025-09-08&to=2025-09-14
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetForUser(Guid userId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var currentUserRole = GetCurrentUserRole();

            // Authorization: Employees can only view their own timesheets
            // Approvers and Admins can view any timesheet (for now - could be restricted to their projects)
            if (currentUserRole == "EMPLOYEE" && userId != currentUserId)
            {
                return StatusCode(403, "Employees can only view their own timesheets.");
            }

            var fromDate = from.HasValue ? DateOnly.FromDateTime(from.Value) : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
            var toDate = to.HasValue ? DateOnly.FromDateTime(to.Value) : DateOnly.FromDateTime(DateTime.Today);
            
            var items = await _svc.GetMineAsync(userId, fromDate, toDate);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    // GET api/timesheets/project/{projectId}?from=2025-09-08&to=2025-09-14
    [HttpGet("project/{projectId:guid}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetForProject(Guid projectId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        try
        {
            var fromDate = from.HasValue ? DateOnly.FromDateTime(from.Value) : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
            var toDate = to.HasValue ? DateOnly.FromDateTime(to.Value) : DateOnly.FromDateTime(DateTime.Today);
            
            var items = await _svc.GetForProjectAsync(projectId, fromDate, toDate);
            return Ok(items);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }
}
