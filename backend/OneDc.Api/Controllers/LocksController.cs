using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocksController : ControllerBase
{
    private readonly ILockService _svc;
    public LocksController(ILockService svc) => _svc = svc;

    // Temporary admin identity via header (replace with AAD later)
    private Guid GetActorId()
    {
        if (Request.Headers.TryGetValue("X-Debug-UserId", out var raw) && Guid.TryParse(raw, out var id))
            return id;
        throw new UnauthorizedAccessException("X-Debug-UserId header missing or invalid.");
    }

    public record LockReq(DateOnly from, DateOnly to, Guid? projectId, Guid? userId, bool preview = false);

    // POST /api/locks
    // Body: { "from":"2025-09-08","to":"2025-09-14","projectId":null,"userId":null,"preview":true }
    [HttpPost]
    public async Task<IActionResult> Lock([FromBody] LockReq body)
    {
        var actor = GetActorId(); // must be ADMIN later
        var res = await _svc.LockAsync(new LockRequest(body.from, body.to, body.projectId, body.userId, body.preview, actor));
        return Ok(new {
            from = res.From,
            to = res.To,
            scope = new { res.ProjectId, res.UserId },
            preview = res.Preview,
            locked_count = res.Affected
        });
    }
}
