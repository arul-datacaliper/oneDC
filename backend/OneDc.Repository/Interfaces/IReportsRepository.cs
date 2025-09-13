using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IReportsRepository
{
    Task<IEnumerable<(Guid userId, Guid projectId, bool billable, decimal hours)>> GetApprovedHoursAsync(DateOnly from, DateOnly to);
    Task<Dictionary<Guid,(string code,string name,bool billable)>> GetProjectsMetaAsync(IEnumerable<Guid> projectIds);
    Task<Dictionary<Guid,(string email,string first,string last)>> GetUsersMetaAsync(IEnumerable<Guid> userIds);
}
