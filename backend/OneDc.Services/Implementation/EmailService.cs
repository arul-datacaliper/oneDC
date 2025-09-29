using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
using Azure.Communication.Email;
using Microsoft.Extensions.DependencyInjection;

namespace OneDc.Services.Implementation;

public class EmailService : IEmailService
{
    private readonly EmailClient? _emailClient;
    private readonly EmailConfiguration _emailConfig;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IServiceProvider serviceProvider, IConfiguration configuration, ILogger<EmailService> logger)
    {
        // Try to get EmailClient from DI, will be null if not registered
        _emailClient = serviceProvider.GetService<EmailClient>();
        _logger = logger;
        
        _emailConfig = new EmailConfiguration
        {
            AzureEmailConnectionString = Environment.GetEnvironmentVariable("AZURE_EMAIL_CONNECTION_STRING") ?? configuration["AzureEmail:ConnectionString"] ?? "",
            FromEmail = Environment.GetEnvironmentVariable("AZURE_EMAIL_FROM_EMAIL") ?? configuration["AzureEmail:FromEmail"] ?? "noreply@onedc.local",
            FromName = Environment.GetEnvironmentVariable("AZURE_EMAIL_FROM_NAME") ?? configuration["AzureEmail:FromName"] ?? "OneDC System",
            BaseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? configuration["AppSettings:BaseUrl"] ?? "http://localhost:4200"
        };
        
        // Log warning if email client is not configured
        if (_emailClient == null)
        {
            _logger.LogWarning("EmailClient is not configured. Email functionality will be disabled.");
        }
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
            // Check if email client is configured
            if (_emailClient == null)
            {
                _logger.LogWarning("Email client not configured. Cannot send email to {Email} with subject '{Subject}'", toEmail, subject);
                return false;
            }

            var emailMessage = new EmailMessage(
                senderAddress: _emailConfig.FromEmail,
                content: new EmailContent(subject)
                {
                    PlainText = plainTextContent ?? "",
                    Html = htmlContent
                },
                recipients: new EmailRecipients(new List<EmailAddress> { new EmailAddress(toEmail) }));

            var operation = await _emailClient.SendAsync(Azure.WaitUntil.Completed, emailMessage);
            
            if (operation.HasCompleted && !operation.HasValue)
            {
                _logger.LogInformation("Email sent successfully to {Email} with subject '{Subject}'", toEmail, subject);
                return true;
            }
            else if (operation.HasValue)
            {
                var result = operation.Value;
                _logger.LogInformation("Email operation completed. Status: {Status} for {Email}", result.Status, toEmail);
                return result.Status == EmailSendStatus.Succeeded;
            }
            else
            {
                _logger.LogError("Failed to send email to {Email}. Operation did not complete successfully", toEmail);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Email} with subject '{Subject}'", toEmail, subject);
            return false;
        }
    }

    public async Task<bool> SendManagerAssignmentNotificationAsync(string toEmail, string employeeName, string managerName, string managerEmail)
    {
        var subject = "New Reporting Manager Assigned - OneDC";
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Manager Assignment Notification</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .manager-info {{ background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }}
                h2 {{ color: #28a745; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>OneDC - Manager Assignment</h1>
                </div>
                
                <div class='content'>
                    <h2>Hello {employeeName},</h2>
                    
                    <p>We're writing to inform you that a new reporting manager has been assigned to you in the OneDC system.</p>
                    
                    <div class='manager-info'>
                        <h3>Your New Reporting Manager:</h3>
                        <p><strong>Name:</strong> {managerName}</p>
                        <p><strong>Email:</strong> <a href='mailto:{managerEmail}'>{managerEmail}</a></p>
                    </div>
                    
                    <p>Your new manager will be able to:</p>
                    <ul>
                        <li>Review and approve your timesheets</li>
                        <li>Assign projects and tasks</li>
                        <li>Provide guidance and support</li>
                        <li>Monitor your professional development</li>
                    </ul>
                    
                    <p>If you have any questions about this change or need assistance, please don't hesitate to reach out to your HR department or contact your new manager directly.</p>
                    
                    <a href='{_emailConfig.BaseUrl}' class='button'>Access OneDC System</a>
                    
                    <p>Best regards,<br>
                    The OneDC Team</p>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from OneDC. Please do not reply to this email.</p>
                    <p>If you have questions, contact your system administrator.</p>
                </div>
            </div>
        </body>
        </html>";

        var plainTextContent = $@"
Hello {employeeName},

We're writing to inform you that a new reporting manager has been assigned to you in the OneDC system.

Your New Reporting Manager:
Name: {managerName}
Email: {managerEmail}

Your new manager will be able to:
- Review and approve your timesheets
- Assign projects and tasks  
- Provide guidance and support
- Monitor your professional development

If you have any questions about this change or need assistance, please don't hesitate to reach out to your HR department or contact your new manager directly.

Access OneDC System: {_emailConfig.BaseUrl}

Best regards,
The OneDC Team

This is an automated notification from OneDC. Please do not reply to this email.
If you have questions, contact your system administrator.
        ";

        return await SendEmailAsync(toEmail, subject, htmlContent, plainTextContent);
    }

    public async Task<bool> SendNewTeamMemberNotificationAsync(string managerEmail, string managerName, string employeeName, string employeeEmail)
    {
        var subject = "New Team Member Assigned - OneDC";
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>New Team Member Notification</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .employee-info {{ background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }}
                h2 {{ color: #007bff; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>OneDC - New Team Member</h1>
                </div>
                
                <div class='content'>
                    <h2>Hello {managerName},</h2>
                    
                    <p>We're writing to inform you that a new team member has been assigned to report to you in the OneDC system.</p>
                    
                    <div class='employee-info'>
                        <h3>Your New Team Member:</h3>
                        <p><strong>Name:</strong> {employeeName}</p>
                        <p><strong>Email:</strong> <a href='mailto:{employeeEmail}'>{employeeEmail}</a></p>
                    </div>
                    
                    <p>As their reporting manager, you will now be able to:</p>
                    <ul>
                        <li>Review and approve their timesheets</li>
                        <li>Assign projects and tasks</li>
                        <li>Provide guidance and support</li>
                        <li>Monitor their professional development</li>
                        <li>Conduct performance reviews</li>
                    </ul>
                    
                    <p>We recommend reaching out to {employeeName} to introduce yourself and discuss expectations, goals, and any ongoing projects.</p>
                    
                    <a href='{_emailConfig.BaseUrl}' class='button'>Access OneDC System</a>
                    
                    <p>Best regards,<br>
                    The OneDC Team</p>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from OneDC. Please do not reply to this email.</p>
                    <p>If you have questions, contact your system administrator.</p>
                </div>
            </div>
        </body>
        </html>";

        var plainTextContent = $@"
Hello {managerName},

We're writing to inform you that a new team member has been assigned to report to you in the OneDC system.

Your New Team Member:
Name: {employeeName}
Email: {employeeEmail}

As their reporting manager, you will now be able to:
- Review and approve their timesheets
- Assign projects and tasks
- Provide guidance and support  
- Monitor their professional development
- Conduct performance reviews

We recommend reaching out to {employeeName} to introduce yourself and discuss expectations, goals, and any ongoing projects.

Access OneDC System: {_emailConfig.BaseUrl}

Best regards,
The OneDC Team

This is an automated notification from OneDC. Please do not reply to this email.
If you have questions, contact your system administrator.
        ";

        return await SendEmailAsync(managerEmail, subject, htmlContent, plainTextContent);
    }

    public async Task<bool> SendTaskAssignmentNotificationAsync(string assigneeEmail, string assigneeName, string taskTitle, string taskDescription, string projectName, DateOnly? startDate, DateOnly? endDate)
    {
        var subject = "New Task Assigned - OneDC";
        
        var formatDate = (DateOnly? date) => date?.ToString("MMMM dd, yyyy") ?? "Not specified";
        var startDateStr = formatDate(startDate);
        var endDateStr = formatDate(endDate);
        
        var htmlContent = $@"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>New Task Assignment</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .task-details {{ background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                .button {{ display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }}
                h2 {{ color: #007bff; }}
                .task-title {{ font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px; }}
                .detail-row {{ margin: 8px 0; }}
                .detail-label {{ font-weight: bold; color: #555; }}
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>OneDC - New Task Assignment</h1>
                </div>
                
                <div class='content'>
                    <h2>Hello {assigneeName},</h2>
                    
                    <p>You have been assigned a new task in the OneDC system. Please review the details below and begin work as appropriate.</p>
                    
                    <div class='task-details'>
                        <div class='task-title'>{taskTitle}</div>
                        
                        <div class='detail-row'>
                            <span class='detail-label'>Project:</span> {projectName}
                        </div>
                        
                        {(string.IsNullOrEmpty(taskDescription) ? "" : $@"
                        <div class='detail-row'>
                            <span class='detail-label'>Description:</span><br>
                            <div style='margin-top: 5px; padding: 10px; background-color: white; border-radius: 3px;'>
                                {taskDescription.Replace("\n", "<br>")}
                            </div>
                        </div>")}
                        
                        <div class='detail-row'>
                            <span class='detail-label'>Start Date:</span> {startDateStr}
                        </div>
                        
                        <div class='detail-row'>
                            <span class='detail-label'>End Date:</span> {endDateStr}
                        </div>
                    </div>
                    
                    <p>Next steps:</p>
                    <ul>
                        <li>Review the task details and requirements</li>
                        <li>Update the task status as you make progress</li>
                        <li>Log your time using the timesheet feature</li>
                        <li>Reach out to your project manager if you have questions</li>
                        <li>Set the task to 'Completed' when finished</li>
                    </ul>
                    
                    <a href='{_emailConfig.BaseUrl}' class='button'>View Task in OneDC</a>
                    
                    <p>Best regards,<br>
                    The OneDC Team</p>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from OneDC. Please do not reply to this email.</p>
                    <p>If you have questions about this task, contact your project manager or system administrator.</p>
                </div>
            </div>
        </body>
        </html>";

        var plainTextContent = $@"
Hello {assigneeName},

You have been assigned a new task in the OneDC system. Please review the details below and begin work as appropriate.

Task Details:
Title: {taskTitle}
Project: {projectName}
{(string.IsNullOrEmpty(taskDescription) ? "" : $"Description: {taskDescription}")}
Start Date: {startDateStr}
End Date: {endDateStr}

Next steps:
- Review the task details and requirements
- Update the task status as you make progress
- Log your time using the timesheet feature
- Reach out to your project manager if you have questions
- Set the task to 'Completed' when finished

View Task in OneDC: {_emailConfig.BaseUrl}

Best regards,
The OneDC Team

This is an automated notification from OneDC. Please do not reply to this email.
If you have questions about this task, contact your project manager or system administrator.
        ";

        return await SendEmailAsync(assigneeEmail, subject, htmlContent, plainTextContent);
    }
}
