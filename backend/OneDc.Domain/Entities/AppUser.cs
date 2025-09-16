namespace OneDc.Domain.Entities;

public enum UserRole { EMPLOYEE, APPROVER, ADMIN }

public class AppUser
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public UserRole Role { get; set; } = UserRole.EMPLOYEE;
    public bool IsActive { get; set; } = true;
    public string? PasswordHash { get; set; } // PBKDF2 hash (format: iterations.salt.hash)
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
