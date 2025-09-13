namespace OneDc.Domain.Entities;

public class AuditLog
{
    public Guid AuditLogId { get; set; }
    public Guid? ActorId { get; set; }
    public string Entity { get; set; } = null!;
    public Guid? EntityId { get; set; }
    public string Action { get; set; } = null!;
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
