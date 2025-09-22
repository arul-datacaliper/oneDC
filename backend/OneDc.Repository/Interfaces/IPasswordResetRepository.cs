using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IPasswordResetRepository
{
    Task<PasswordReset> CreateAsync(PasswordReset passwordReset);
    Task<PasswordReset?> GetValidOtpAsync(Guid userId, string otp);
    Task<bool> MarkAsUsedAsync(Guid resetId);
    Task<bool> DeleteExpiredAsync();
    Task<bool> DeleteUserPendingResetsAsync(Guid userId);
    Task<List<PasswordReset>> GetUserActiveResetsAsync(Guid userId);
}
