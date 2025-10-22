namespace OneDc.Domain.Entities;

public enum ProjectRole 
{ 
    MEMBER, 
    LEAD, 
    CONTRIBUTOR, 
    REVIEWER 
}

public class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public ProjectRole ProjectRole { get; set; } = ProjectRole.MEMBER;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    public Project? Project { get; set; }
    public AppUser? User { get; set; }
}
