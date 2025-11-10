namespace OneDc.Domain.Entities;

public enum UserRole { EMPLOYEE, APPROVER, ADMIN, INFRA, HR, OPERATION }
public enum Gender { MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY }
public enum EmployeeType { FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT }

public class AppUser
{
    public Guid UserId { get; set; }
    public string EmployeeId { get; set; } = null!; // Required field for manual Employee ID input
    public string Email { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public Gender? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly? DateOfJoining { get; set; }
    public string? JobTitle { get; set; }
    public UserRole Role { get; set; } = UserRole.EMPLOYEE;
    public string? Department { get; set; }
    public EmployeeType EmployeeType { get; set; } = EmployeeType.FULL_TIME;
    public string? PersonalEmail { get; set; }
    public string WorkEmail { get; set; } = null!;
    public string? ContactNumber { get; set; }
    public string? EmergencyContactNumber { get; set; }
    
    // Present Address
    public string? PresentAddressLine1 { get; set; }
    public string? PresentAddressLine2 { get; set; }
    public string? PresentCity { get; set; }
    public string? PresentState { get; set; }
    public string? PresentCountry { get; set; }
    public string? PresentZipCode { get; set; }
    
    // Permanent Address
    public string? PermanentAddressLine1 { get; set; }
    public string? PermanentAddressLine2 { get; set; }
    public string? PermanentCity { get; set; }
    public string? PermanentState { get; set; }
    public string? PermanentCountry { get; set; }
    public string? PermanentZipCode { get; set; }
    
    public bool IsActive { get; set; } = true;
    public string? PasswordHash { get; set; } // PBKDF2 hash (format: iterations.salt.hash)
    public bool MustChangePassword { get; set; } = false; // Flag to force password change on next login
    public Guid? ManagerId { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    // Navigation properties
    public ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
}
