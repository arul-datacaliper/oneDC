using OneDc.Domain.Entities;

namespace OneDc.Infrastructure.Repositories.Interfaces;

public interface IPasswordResetRepository
{
    Task<PasswordReset> CreateAsync(PasswordReset passwordReset);
    Task<PasswordReset?> GetActiveByUserIdAsync(Guid userId);
    Task<PasswordReset?> GetByOtpAsync(string otp);
    Task UpdateAsync(PasswordReset passwordReset);
    Task InvalidateActiveRequestsAsync(Guid userId);
    Task<List<PasswordReset>> GetExpiredAsync();
    Task DeleteAsync(PasswordReset passwordReset);
    Task<int> DeleteExpiredAsync();
}
