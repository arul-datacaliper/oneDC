namespace OneDc.Domain.Entities;

public enum TimesheetStatus { DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED }

public class TimesheetEntry
{
  public Guid EntryId { get; set; }
  public Guid UserId { get; set; }
  public Guid ProjectId { get; set; }
  public DateOnly WorkDate { get; set; }
  public decimal Hours { get; set; } // 0..24
  public string? Description { get; set; }
  public string? TicketRef { get; set; }
  public TimesheetStatus Status { get; set; } = TimesheetStatus.DRAFT;
  public DateTimeOffset? SubmittedAt { get; set; }
  public DateTimeOffset? ApprovedAt { get; set; }
  public Guid? ApprovedBy { get; set; }
  public string? ApproverComment { get; set; }
  public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
  public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public Project? Project { get; set; }
    public AppUser? User { get; set; }

}
