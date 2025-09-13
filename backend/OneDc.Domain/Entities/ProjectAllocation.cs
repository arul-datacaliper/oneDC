namespace OneDc.Domain.Entities;

public class ProjectAllocation
{
  public Guid AllocationId { get; set; }
  public Guid ProjectId { get; set; }
  public Guid UserId { get; set; }
  public DateOnly StartDate { get; set; }
  public DateOnly? EndDate { get; set; }
  public decimal AllocationPct { get; set; } = 100m;
    
    public Project? Project { get; set; }
    public AppUser? User { get; set; }
}
