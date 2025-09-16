namespace OneDc.Services.Interfaces;

public record AuthResult(string Token, Guid UserId, string Email, string Name, string Role);

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(string email, string password);
    Task SetPasswordAsync(Guid userId, string newPassword);
}
