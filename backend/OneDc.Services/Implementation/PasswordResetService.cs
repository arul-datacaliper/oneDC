using Microsoft.Extensions.Logging;
using OneDc.Domain.Entities;
using OneDc.Infrastructure.Repositories.Interfaces;
using OneDc.Services.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace OneDc.Services.Implementation;

public class PasswordResetService : IPasswordResetService
{
    private readonly IPasswordResetRepository _passwordResetRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(
        IPasswordResetRepository passwordResetRepository,
        IUserRepository userRepository,
        IEmailService emailService,
        ILogger<PasswordResetService> logger)
    {
        _passwordResetRepository = passwordResetRepository;
        _userRepository = userRepository;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<string> GeneratePasswordResetOtpAsync(string email)
    {
        try
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                _logger.LogWarning("Password reset requested for non-existent email: {Email}", email);
                // Return empty string for security - don't reveal if email exists
                return string.Empty;
            }

            // Invalidate any existing password reset requests for this user
            await _passwordResetRepository.InvalidateActiveRequestsAsync(user.UserId);

            // Generate new OTP
            var otp = GenerateOtp();
            
            // Hash the OTP before storing (security best practice)
            var hashedOtp = HashOtp(otp);
            
            var passwordReset = new PasswordReset
            {
                UserId = user.UserId,
                Otp = hashedOtp, // Store hashed version
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15),
                IsUsed = false,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _passwordResetRepository.CreateAsync(passwordReset);
            
            _logger.LogInformation("OTP created and stored (hashed) for user {UserId}. Sending email with plain OTP to {Email}", user.UserId, user.Email);
            
            // Send email with plain OTP (user receives unhashed version)
            var emailSent = await _emailService.SendPasswordResetEmailAsync(user.Email, $"{user.FirstName} {user.LastName}", otp);
            
            _logger.LogInformation("Email send result for {Email}: {EmailSent}", user.Email, emailSent);
            
            if (!emailSent)
            {
                _logger.LogError("Failed to send password reset email to {Email}", email);
                return string.Empty;
            }

            _logger.LogInformation("Password reset initiated successfully for user {UserId} with email {Email}. OTP: {Otp}", user.UserId, email, otp);
            return otp;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating password reset for email {Email}", email);
            return string.Empty;
        }
    }

    public async Task<bool> ValidateOtpAsync(string email, string otp)
    {
        try
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                _logger.LogWarning("OTP validation attempted for non-existent email: {Email}", email);
                return false;
            }

            var passwordReset = await _passwordResetRepository.GetActiveByUserIdAsync(user.UserId);
            if (passwordReset == null)
            {
                _logger.LogWarning("No active password reset found for user {UserId}", user.UserId);
                return false;
            }

            // Verify hashed OTP
            return passwordReset.IsValid && VerifyOtp(otp, passwordReset.Otp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating OTP for email {Email}", email);
            return false;
        }
    }

    public async Task<PasswordReset?> GetValidOtpAsync(string email, string otp)
    {
        try
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                return null;
            }

            var passwordReset = await _passwordResetRepository.GetActiveByUserIdAsync(user.UserId);
            if (passwordReset == null || !passwordReset.IsValid)
            {
                return null;
            }

            // Verify OTP hash
            if (!VerifyOtp(otp, passwordReset.Otp))
            {
                return null;
            }

            return passwordReset;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting valid OTP for email {Email}", email);
            return null;
        }
    }

    public async Task<bool> ResetPasswordAsync(string email, string otp, string newPassword)
    {
        try
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                _logger.LogWarning("Password reset attempted for non-existent email: {Email}", email);
                return false;
            }

            var passwordReset = await _passwordResetRepository.GetActiveByUserIdAsync(user.UserId);
            if (passwordReset == null || !passwordReset.IsValid)
            {
                _logger.LogWarning("Invalid OTP for password reset. User: {UserId}", user.UserId);
                return false;
            }

            // Verify hashed OTP
            if (!VerifyOtp(otp, passwordReset.Otp))
            {
                _logger.LogWarning("OTP verification failed for user {UserId}", user.UserId);
                return false;
            }

            // Hash the new password
            var hashedPassword = HashPassword(newPassword);
            
            // Update user password and clear password change requirement
            user.PasswordHash = hashedPassword;
            user.MustChangePassword = false; // Clear the flag when password is reset
            
            await _userRepository.UpdateAsync(user);

            // Mark password reset as used
            passwordReset.IsUsed = true;
            passwordReset.UsedAt = DateTimeOffset.UtcNow;
            await _passwordResetRepository.UpdateAsync(passwordReset);

            // Send confirmation email
            await _emailService.SendPasswordChangedNotificationAsync(user.Email, $"{user.FirstName} {user.LastName}");

            _logger.LogInformation("Password successfully reset for user {UserId}", user.UserId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for email {Email}", email);
            return false;
        }
    }

    public async Task<bool> CleanupExpiredOtpsAsync()
    {
        try
        {
            var deletedCount = await _passwordResetRepository.DeleteExpiredAsync();
            _logger.LogInformation("Cleaned up {Count} expired OTP records", deletedCount);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired OTPs");
            return false;
        }
    }

    private static string GenerateOtp()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var number = BitConverter.ToUInt32(bytes, 0);
        return (number % 1000000).ToString("D6");
    }

    /// <summary>
    /// Hash OTP using SHA256 for secure storage
    /// </summary>
    private static string HashOtp(string otp)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(otp);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// Verify plain OTP against hashed OTP
    /// </summary>
    private static bool VerifyOtp(string plainOtp, string hashedOtp)
    {
        var hashOfInput = HashOtp(plainOtp);
        return hashOfInput == hashedOtp;
    }

    private static string HashPassword(string password)
    {
        const int iterations = 10000;
        
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[32];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        return $"{iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
