namespace OneDc.Domain.Entities;

public enum TimesheetStatus { DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED }

public enum TaskType 
{ 
    DEV = 0,        // Development
    QA = 1,         // Quality Assurance
    UX = 2,         // User Experience
    UI = 3,         // User Interface
    MEETING = 4,    // Meetings
    RND = 5,        // Research & Development
    ADHOC = 6,      // Ad-hoc tasks
    PROCESS = 7,    // Process work
    OPERATIONS = 8  // Operations
}

public class TimesheetEntry
{
  public Guid EntryId { get; set; }
  public Guid UserId { get; set; }
  public Guid ProjectId { get; set; }
  public Guid? TaskId { get; set; }
  public DateOnly WorkDate { get; set; }
  public decimal Hours { get; set; } // 0..24
  public string? Description { get; set; }
  public string? TicketRef { get; set; }
  public TaskType TaskType { get; set; } = TaskType.DEV;
  public TimesheetStatus Status { get; set; } = TimesheetStatus.DRAFT;
  public DateTimeOffset? SubmittedAt { get; set; }
  public DateTimeOffset? ApprovedAt { get; set; }
  public Guid? ApprovedBy { get; set; }
  public string? ApproverComment { get; set; }
  public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
  public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public Project? Project { get; set; }
    public AppUser? User { get; set; }
    public ProjectTask? Task { get; set; }

}
