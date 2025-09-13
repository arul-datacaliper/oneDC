namespace OneDc.Services.Interfaces;

public record UnlockRequest(DateOnly From, DateOnly To, Guid? ProjectId, Guid? UserId, bool Preview, string Reason, Guid ActorId);
public record UnlockResult(DateOnly From, DateOnly To, Guid? ProjectId, Guid? UserId, bool Preview, int Affected);

public interface IUnlockService
{
    Task<UnlockResult> UnlockAsync(UnlockRequest req);
}
