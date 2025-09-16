using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnlocksController : ControllerBase
{
    private readonly IUnlockService _svc;
    public UnlocksController(IUnlockService svc) => _svc = svc;

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

    public record UnlockReq(DateOnly from, DateOnly to, Guid? projectId, Guid? userId, bool preview, string reason);

    // POST /api/unlocks
    // Body: { "from":"2025-09-08","to":"2025-09-14","projectId":null,"userId":null,"preview":true,"reason":"Invoice correction" }
    [HttpPost]
    public async Task<IActionResult> Unlock([FromBody] UnlockReq body)
    {
        var actor = GetActorId(); // later: enforce ADMIN role
        var res = await _svc.UnlockAsync(new UnlockRequest(body.from, body.to, body.projectId, body.userId, body.preview, body.reason, actor));
        return Ok(new {
            from = res.From,
            to = res.To,
            scope = new { res.ProjectId, res.UserId },
            preview = res.Preview,
            unlocked_count = res.Affected
        });
    }
}
