using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace OneDc.Services.Implementation;

public class EmailService : IEmailService
{
    private readonly ISendGridClient _sendGridClient;
    private readonly EmailConfiguration _emailConfig;
    private readonly ILogger<EmailService> _logger;

    public EmailService(ISendGridClient sendGridClient, IConfiguration configuration, ILogger<EmailService> logger)
    {
        _sendGridClient = sendGridClient;
        _logger = logger;
        
        _emailConfig = new EmailConfiguration
        {
            SendGridApiKey = configuration["SendGrid:ApiKey"] ?? "",
            FromEmail = configuration["SendGrid:FromEmail"] ?? "noreply@onedc.local",
            FromName = configuration["SendGrid:FromName"] ?? "OneDC System",
            BaseUrl = configuration["AppSettings:BaseUrl"] ?? "http://localhost:4200"
        };
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string userName, string otp)
    {
        var subject = "Password Reset Request - OneDC";
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Password Reset</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .otp-box {{ background-color: #007bff; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>OneDC Password Reset</h1>
                </div>
                <div class='content'>
                    <h2>Hello {userName},</h2>
                    <p>We received a request to reset your password for your OneDC account.</p>
                    <p>Please use the following One-Time Password (OTP) to reset your password:</p>
                    
                    <div class='otp-box'>
                        {otp}
                    </div>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This OTP is valid for 15 minutes only</li>
                        <li>Do not share this OTP with anyone</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                    </ul>
                    
                    <p>If you're having trouble, please contact your system administrator.</p>
                </div>
                <div class='footer'>
                    <p>This is an automated email from OneDC System. Please do not reply to this email.</p>
                    <p>&copy; 2025 OneDC. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>";

        var plainTextContent = $@"
        OneDC Password Reset
        
        Hello {userName},
        
        We received a request to reset your password for your OneDC account.
        
        Please use the following One-Time Password (OTP) to reset your password:
        
        OTP: {otp}
        
        Important:
        - This OTP is valid for 15 minutes only
        - Do not share this OTP with anyone
        - If you didn't request this reset, please ignore this email
        
        If you're having trouble, please contact your system administrator.
        
        This is an automated email from OneDC System. Please do not reply to this email.
        ";

        return await SendEmailAsync(toEmail, subject, htmlContent, plainTextContent);
    }

    public async Task<bool> SendWelcomeEmailAsync(string toEmail, string userName, string temporaryPassword)
    {
        var subject = "Welcome to OneDC - Account Created";
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Welcome to OneDC</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .credentials {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Welcome to OneDC!</h1>
                </div>
                <div class='content'>
                    <h2>Hello {userName},</h2>
                    <p>Your OneDC account has been successfully created. You can now access the system using the credentials below:</p>
                    
                    <div class='credentials'>
                        <strong>Login URL:</strong> {_emailConfig.BaseUrl}<br>
                        <strong>Email:</strong> {toEmail}<br>
                        <strong>Temporary Password:</strong> {temporaryPassword}
                    </div>
                    
                    <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
                    
                    <a href='{_emailConfig.BaseUrl}' class='button'>Login to OneDC</a>
                    
                    <p>If you have any questions or need assistance, please contact your system administrator.</p>
                </div>
                <div class='footer'>
                    <p>This is an automated email from OneDC System. Please do not reply to this email.</p>
                    <p>&copy; 2025 OneDC. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>";

        var plainTextContent = $@"
        Welcome to OneDC!
        
        Hello {userName},
        
        Your OneDC account has been successfully created. You can now access the system using the credentials below:
        
        Login URL: {_emailConfig.BaseUrl}
        Email: {toEmail}
        Temporary Password: {temporaryPassword}
        
        Important: Please change your password after your first login for security purposes.
        
        If you have any questions or need assistance, please contact your system administrator.
        
        This is an automated email from OneDC System. Please do not reply to this email.
        ";

        return await SendEmailAsync(toEmail, subject, htmlContent, plainTextContent);
    }

    public async Task<bool> SendPasswordChangedNotificationAsync(string toEmail, string userName)
    {
        var subject = "Password Changed Successfully - OneDC";
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Password Changed</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .alert {{ background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Password Changed</h1>
                </div>
                <div class='content'>
                    <h2>Hello {userName},</h2>
                    <div class='alert'>
                        <strong>✓ Success!</strong> Your password has been changed successfully.
                    </div>
                    <p>This email confirms that your OneDC account password was recently changed on {DateTimeOffset.UtcNow:yyyy-MM-dd} at {DateTimeOffset.UtcNow:HH:mm} UTC.</p>
                    <p><strong>If you did not make this change:</strong></p>
                    <ul>
                        <li>Contact your system administrator immediately</li>
                        <li>Your account may have been compromised</li>
                    </ul>
                    <p>For security, we recommend:</p>
                    <ul>
                        <li>Using a strong, unique password</li>
                        <li>Not sharing your credentials with anyone</li>
                        <li>Logging out from shared devices</li>
                    </ul>
                </div>
                <div class='footer'>
                    <p>This is an automated email from OneDC System. Please do not reply to this email.</p>
                    <p>&copy; 2025 OneDC. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>";

        return await SendEmailAsync(toEmail, subject, htmlContent);
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlContent, string? plainTextContent = null)
    {
        try
        {
            var from = new EmailAddress(_emailConfig.FromEmail, _emailConfig.FromName);
            var to = new EmailAddress(toEmail);
            
            var msg = MailHelper.CreateSingleEmail(from, to, subject, plainTextContent ?? "", htmlContent);
            
            var response = await _sendGridClient.SendEmailAsync(msg);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent successfully to {Email} with subject '{Subject}'", toEmail, subject);
                return true;
            }
            else
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("Failed to send email to {Email}. Status: {StatusCode}, Body: {Body}", 
                    toEmail, response.StatusCode, body);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Email} with subject '{Subject}'", toEmail, subject);
            return false;
        }
    }
}
