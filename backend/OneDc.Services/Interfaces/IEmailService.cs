namespace OneDc.Services.Interfaces;

public interface IEmailService
{
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string userName, string otp);
    Task<bool> SendWelcomeEmailAsync(string toEmail, string userName, string temporaryPassword);
    Task<bool> SendPasswordChangedNotificationAsync(string toEmail, string userName);
    Task<bool> SendManagerAssignmentNotificationAsync(string toEmail, string employeeName, string managerName, string managerEmail);
    Task<bool> SendNewTeamMemberNotificationAsync(string managerEmail, string managerName, string employeeName, string employeeEmail);
    Task<bool> SendTaskAssignmentNotificationAsync(string assigneeEmail, string assigneeName, string taskTitle, string taskDescription, string projectName, DateOnly? startDate, DateOnly? endDate);
    Task<bool> SendEmailAsync(string toEmail, string subject, string htmlContent, string? plainTextContent = null);
}
