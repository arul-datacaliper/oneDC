using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public record AuthResult(string Token, Guid UserId, string Email, string Name, string Role, bool MustChangePassword = false);

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(string email, string password);
    Task SetPasswordAsync(Guid userId, string newPassword);
    Task<AppUser?> GetUserByIdAsync(Guid userId);
    Task<string> GenerateTokenForUserAsync(AppUser user);
}
