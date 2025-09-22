namespace OneDc.Services.Interfaces;

public interface IEmailService
{
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string userName, string otp);
    Task<bool> SendWelcomeEmailAsync(string toEmail, string userName, string temporaryPassword);
    Task<bool> SendPasswordChangedNotificationAsync(string toEmail, string userName);
    Task<bool> SendEmailAsync(string toEmail, string subject, string htmlContent, string? plainTextContent = null);
}
