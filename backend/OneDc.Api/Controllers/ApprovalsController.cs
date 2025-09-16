using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApprovalsController : ControllerBase
{
    private readonly IApprovalService _svc;
    public ApprovalsController(IApprovalService svc) => _svc = svc;

    private Guid GetApproverId()
    {
        if (Request.Headers.TryGetValue("X-Debug-UserId", out var raw) && Guid.TryParse(raw, out var id))
            return id;
        throw new UnauthorizedAccessException("X-Debug-UserId header missing or invalid.");
    }

    // GET api/approvals?from=2025-09-08&to=2025-09-14&projectId=...&userId=...
    [HttpGet]
    public async Task<IActionResult> GetPending([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? projectId, [FromQuery] Guid? userId)
    {
        var approverId = GetApproverId();
        var items = await _svc.GetPendingAsync(approverId, from, to, projectId, userId);

        var shaped = items.Select(t => new {
            entryId = t.EntryId,
            userId = t.UserId,
            userName = t.User != null ? ($"{t.User.FirstName} {t.User.LastName}") : null,
            projectId = t.ProjectId,
            projectCode = t.Project?.Code,
            projectName = t.Project?.Name,
            taskId = t.TaskId,
            taskTitle = t.Task != null ? t.Task.Title : null,
            workDate = t.WorkDate.ToString("yyyy-MM-dd"),
            hours = t.Hours,
            description = t.Description,
            ticketRef = t.TicketRef,
            status = t.Status,
            submittedAt = t.SubmittedAt,
            approverComment = t.ApproverComment
        });
        return Ok(shaped);
    }

    // POST api/approvals/{id}/approve
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var approverId = GetApproverId();
        var result = await _svc.ApproveAsync(approverId, id);
        return Ok(result);
    }

    public record RejectReq(string Comment);

    // POST api/approvals/{id}/reject
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectReq body)
    {
        var approverId = GetApproverId();
        var result = await _svc.RejectAsync(approverId, id, body.Comment);
        return Ok(result);
    }
}
