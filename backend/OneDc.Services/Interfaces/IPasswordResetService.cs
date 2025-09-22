using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public interface IPasswordResetService
{
    Task<string> GeneratePasswordResetOtpAsync(string email);
    Task<bool> ValidateOtpAsync(string email, string otp);
    Task<bool> ResetPasswordAsync(string email, string otp, string newPassword);
    Task<bool> CleanupExpiredOtpsAsync();
    Task<PasswordReset?> GetValidOtpAsync(string email, string otp);
}
