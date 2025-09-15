namespace OneDc.Domain.Entities;

public enum SkillLevel
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
    Expert = 4
}

public class UserSkill
{
    public Guid UserSkillId { get; set; }
    public Guid UserId { get; set; }
    public string SkillName { get; set; } = null!;
    public SkillLevel Level { get; set; }
    public int YearsOfExperience { get; set; }
    public string? Description { get; set; }
    public bool IsPrimary { get; set; } = false; // Mark as primary skill
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation property
    public AppUser? User { get; set; }
}
