using System.ComponentModel.DataAnnotations;

namespace OneDc.Domain.Entities;

public class PasswordReset
{
    [Key]
    public Guid ResetId { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(6)]
    public string Otp { get; set; } = string.Empty;
    
    [Required]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    [Required]
    public DateTimeOffset ExpiresAt { get; set; }
    
    public DateTimeOffset? UsedAt { get; set; }
    
    public bool IsUsed { get; set; } = false;
    
    public bool IsExpired => DateTimeOffset.UtcNow > ExpiresAt;
    
    public bool IsValid => !IsUsed && !IsExpired;
    
    // Navigation property
    public virtual AppUser User { get; set; } = null!;
}
