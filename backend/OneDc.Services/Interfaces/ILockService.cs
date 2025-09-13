namespace OneDc.Services.Interfaces;

public record LockRequest(DateOnly From, DateOnly To, Guid? ProjectId, Guid? UserId, bool Preview, Guid ActorId);
public record LockResult(DateOnly From, DateOnly To, Guid? ProjectId, Guid? UserId, bool Preview, int Affected);

public interface ILockService
{
    Task<LockResult> LockAsync(LockRequest req);
}
