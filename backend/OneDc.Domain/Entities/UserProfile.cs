namespace OneDc.Domain.Entities;

public class UserProfile
{
    public Guid UserProfileId { get; set; }
    public Guid UserId { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? Bio { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Location { get; set; }
    public DateOnly? DateOfJoining { get; set; }
    public string? EmployeeId { get; set; }
    public string? ReportingManager { get; set; }
    public int? TotalExperienceYears { get; set; }
    public string? EducationBackground { get; set; }
    public string? Certifications { get; set; }
    public string? LinkedInProfile { get; set; }
    public string? GitHubProfile { get; set; }
    public bool IsOnboardingComplete { get; set; } = false;
    public DateTimeOffset? OnboardingCompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation property
    public AppUser? User { get; set; }
}
