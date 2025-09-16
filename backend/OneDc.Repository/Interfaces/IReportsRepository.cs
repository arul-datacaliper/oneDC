using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IReportsRepository
{
    Task<IEnumerable<(Guid userId, Guid projectId, bool billable, decimal hours)>> GetApprovedHoursAsync(DateOnly from, DateOnly to);
    Task<Dictionary<Guid,(string code,string name,bool billable,decimal? budgetHours)>> GetProjectsMetaAsync(IEnumerable<Guid> projectIds);
    Task<Dictionary<Guid,(string email,string first,string last)>> GetUsersMetaAsync(IEnumerable<Guid> userIds);
    
    // Project Burn-down methods
    Task<IEnumerable<(DateOnly date, decimal hours)>> GetProjectHoursByDateAsync(Guid projectId, DateOnly from, DateOnly to);
    Task<(string code, string name, decimal? budgetHours, DateOnly? startDate, DateOnly? endDate)> GetProjectDetailsAsync(Guid projectId);
    
    // Missing Timesheets methods
    Task<Dictionary<Guid,(string email,string first,string last)>> GetAllActiveUsersAsync();
    Task<IEnumerable<TimesheetEntry>> GetTimesheetEntriesAsync(DateOnly from, DateOnly to, Guid? userId = null);
}
