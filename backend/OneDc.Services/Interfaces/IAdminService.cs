using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public interface IAdminService
{
    Task<AdminDashboardMetrics> GetDashboardMetricsAsync();
    Task<IEnumerable<TopProjectMetrics>> GetTopProjectsWithHighTasksAsync(int limit = 10);
}

public class AdminDashboardMetrics
{
    public int TotalEmployees { get; set; }
    public int TotalProjects { get; set; }
    public int TotalClients { get; set; }
    public int ActiveProjects { get; set; }
    public int ActiveEmployees { get; set; }
    public int PendingApprovals { get; set; }
}

public class TopProjectMetrics
{
    public Guid ProjectId { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public int OpenTasksCount { get; set; }
    public int TotalTasksCount { get; set; }
    public double UtilizationPercentage { get; set; }
    public bool IsBillable { get; set; }
    public string Status { get; set; } = string.Empty;
}
