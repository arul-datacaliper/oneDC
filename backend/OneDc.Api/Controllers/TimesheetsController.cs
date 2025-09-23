using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetsController : ControllerBase
{
    private readonly ITimesheetService _svc;

    public TimesheetsController(ITimesheetService svc)
    {
        _svc = svc;
    }

    // Helper: get user ID from JWT token
    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? User.FindFirst("sub")?.Value 
                         ?? User.FindFirst("userId")?.Value;
        
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
            
        // Fallback to debug header for development
        if (Request.Headers.TryGetValue("X-Debug-UserId", out var raw) && Guid.TryParse(raw, out var debugId))
            return debugId;
            
        throw new UnauthorizedAccessException("Unable to determine user ID from token or debug header.");
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

    public record CreateReq(Guid ProjectId, DateOnly WorkDate, decimal Hours, string? Description, string? TicketRef, Guid? TaskId);
    public record UpdateReq(decimal Hours, string? Description, string? TicketRef, Guid? TaskId);

    // POST api/timesheets  (create DRAFT)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReq body)
    {
        try
        {
            var userId = GetCurrentUserId();
            var created = await _svc.CreateDraftAsync(userId,
                new TimesheetCreateDto(body.ProjectId, body.WorkDate, body.Hours, body.Description, body.TicketRef, body.TaskId));
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
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateReq body)
    {
        try
        {
            var userId = GetCurrentUserId();
            var updated = await _svc.UpdateDraftAsync(userId, id,
                new TimesheetUpdateDto(body.Hours, body.Description, body.TicketRef, body.TaskId));
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
}
