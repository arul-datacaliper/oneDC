namespace OneDc.Domain.Entities;

public enum TaskStatus { NEW, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED }

public class ProjectTask
{
    public Guid TaskId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public decimal? EstimatedHours { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.NEW;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Project? Project { get; set; }
    public AppUser? AssignedUser { get; set; }
}
