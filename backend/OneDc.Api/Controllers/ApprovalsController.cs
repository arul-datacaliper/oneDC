using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApprovalsController : BaseController
{
    private readonly IApprovalService _svc;
    public ApprovalsController(IApprovalService svc) => _svc = svc;

    // GET api/approvals?from=2025-09-08&to=2025-09-14&projectId=...&userId=...
    [HttpGet]
    public async Task<IActionResult> GetPending([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? projectId, [FromQuery] Guid? userId)
    {
        var approverId = GetCurrentUserId();
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

    // GET api/approvals/admin/all?from=2025-09-08&to=2025-09-14&projectId=...&userId=...
    [HttpGet("admin/all")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetAllPending([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? projectId, [FromQuery] Guid? userId)
    {
        var items = await _svc.GetAllPendingAsync(from, to, projectId, userId);

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
            approverComment = t.ApproverComment,
            defaultApprover = t.Project?.DefaultApprover
        });
        return Ok(shaped);
    }

    // POST api/approvals/{id}/approve
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var approverId = GetCurrentUserId();
        var result = await _svc.ApproveAsync(approverId, id);
        return Ok(result);
    }

    public record RejectReq(string Comment);

    // POST api/approvals/{id}/reject
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectReq body)
    {
        var approverId = GetCurrentUserId();
        var result = await _svc.RejectAsync(approverId, id, body.Comment);
        return Ok(result);
    }
}
