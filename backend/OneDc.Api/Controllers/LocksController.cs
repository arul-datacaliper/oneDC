using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LocksController : ControllerBase
{
    private readonly ILockService _svc;
    public LocksController(ILockService svc) => _svc = svc;

    // Get actor ID from JWT token
    private Guid GetActorId()
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
