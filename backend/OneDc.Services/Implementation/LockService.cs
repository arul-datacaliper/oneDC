using OneDc.Services.Interfaces;
using OneDc.Repository.Interfaces;
using OneDc.Domain.Entities;
using System.Text.Json;

namespace OneDc.Services.Implementation;

public class LockService : ILockService
{
    private readonly ILockRepository _repo;
    public LockService(ILockRepository repo) => _repo = repo;

    public async Task<LockResult> LockAsync(LockRequest req)
    {
        if (req.From > req.To) throw new ArgumentException("From must be <= to");
        // Guard huge ranges (accidental lock of years)
        if ((req.To.ToDateTime(TimeOnly.MinValue) - req.From.ToDateTime(TimeOnly.MinValue)).TotalDays > 62)
            throw new ArgumentException("Range too large (max 62 days).");

        // Count first
        var count = await _repo.CountApprovedAsync(req.From, req.To, req.ProjectId, req.UserId);

        if (req.Preview)
        {
            return new LockResult(req.From, req.To, req.ProjectId, req.UserId, true, count);
        }

        // Do the lock in one set-based UPDATE
        var affected = await _repo.LockApprovedAsync(req.From, req.To, req.ProjectId, req.UserId);

        // Audit
        var before = JsonSerializer.Serialize(new {
            from = req.From, to = req.To,
            projectId = req.ProjectId, userId = req.UserId, preview = req.Preview, expected = count
        });
        var after = JsonSerializer.Serialize(new { locked = affected });

        await _repo.AddAuditAsync(new AuditLog {
            AuditLogId = Guid.NewGuid(),
            ActorId = req.ActorId,
            Entity = "TimesheetEntry",
            EntityId = null,
            Action = "LOCK_RANGE",
            BeforeJson = before,
            AfterJson = after,
            At = DateTimeOffset.UtcNow
        });
        await _repo.SaveChangesAsync();

        return new LockResult(req.From, req.To, req.ProjectId, req.UserId, false, affected);
    }
}
