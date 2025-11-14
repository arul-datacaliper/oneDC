namespace OneDc.Domain.Entities;

public class WeeklyAllocation
{
    public Guid AllocationId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly WeekStartDate { get; set; }
    public DateOnly WeekEndDate { get; set; }
    public decimal AllocatedHours { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Project? Project { get; set; }
    public AppUser? User { get; set; }
}
