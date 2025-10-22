namespace OneDc.Domain.Entities;

public class Project
{
  public Guid ProjectId { get; set; }
  public Guid ClientId { get; set; }
  public string Code { get; set; } = null!;
  public string Name { get; set; } = null!;
  public string? Description { get; set; } // Add description field
  public string Status { get; set; } = "ACTIVE"; // ACTIVE/ON_HOLD/CLOSED
  public bool Billable { get; set; } = true;
  public Guid? DefaultApprover { get; set; }
  public DateOnly? StartDate { get; set; }
  public DateOnly? EndDate { get; set; }
  public DateOnly? PlannedReleaseDate { get; set; }
  public decimal? BudgetHours { get; set; }
  public decimal? BudgetCost { get; set; }
  public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
  // Navigation properties
  public Client? Client { get; set; }
  public ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();
}
