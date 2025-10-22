using System.Text.Json;
using OneDc.Services.Interfaces;
using OneDc.Repository.Interfaces;
using OneDc.Domain.Entities;

namespace OneDc.Services.Implementation;

public class UnlockService : IUnlockService
{
    private readonly IUnlockRepository _repo;
    public UnlockService(IUnlockRepository repo) => _repo = repo;

    public async Task<UnlockResult> UnlockAsync(UnlockRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
            throw new ArgumentException("Reason is required for unlock.", nameof(req.Reason));
        if (req.From > req.To) throw new ArgumentException("From must be <= to");
        if ((req.To.ToDateTime(TimeOnly.MinValue) - req.From.ToDateTime(TimeOnly.MinValue)).TotalDays > 62)
            throw new ArgumentException("Range too large (max 62 days).");

        var count = await _repo.CountLockedAsync(req.From, req.To, req.ProjectId, req.UserId);
        if (req.Preview)
            return new UnlockResult(req.From, req.To, req.ProjectId, req.UserId, true, count);

        var affected = await _repo.UnlockLockedAsync(req.From, req.To, req.ProjectId, req.UserId);

        await _repo.AddAuditAsync(new AuditLog {
            AuditLogId = Guid.NewGuid(),
            ActorId = req.ActorId,
            Entity = "TimesheetEntry",
            EntityId = null,
            Action = "UNLOCK_RANGE",
            BeforeJson = JsonSerializer.Serialize(new {
                from = req.From, to = req.To, req.ProjectId, req.UserId, req.Reason, expected=count
            }),
            AfterJson = JsonSerializer.Serialize(new { unlocked = affected }),
            At = DateTimeOffset.UtcNow
        });
        await _repo.SaveChangesAsync();

        return new UnlockResult(req.From, req.To, req.ProjectId, req.UserId, false, affected);
    }
}
