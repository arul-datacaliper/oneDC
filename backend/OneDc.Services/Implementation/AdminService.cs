using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Services.Interfaces;

namespace OneDc.Services.Implementation;

public class AdminService : IAdminService
{
    private readonly OneDcDbContext _context;

    public AdminService(OneDcDbContext context)
    {
        _context = context;
    }

    public async Task<AdminDashboardMetrics> GetDashboardMetricsAsync()
    {
        var metrics = new AdminDashboardMetrics();

        // Total and active employees
        var totalEmployees = await _context.AppUsers.CountAsync();
        var activeEmployees = await _context.AppUsers.CountAsync(u => u.IsActive);

        // Total and active projects
        var totalProjects = await _context.Projects.CountAsync();
        var activeProjects = await _context.Projects.CountAsync(p => p.Status.ToLower() == "active");

        // Total clients
        var totalClients = await _context.Clients.CountAsync(c => c.Status.ToLower() == "active");

        // Pending approvals (timesheet entries awaiting approval)
        var pendingApprovals = await _context.TimesheetEntries
            .CountAsync(te => te.Status == TimesheetStatus.SUBMITTED);

        metrics.TotalEmployees = totalEmployees;
        metrics.ActiveEmployees = activeEmployees;
        metrics.TotalProjects = totalProjects;
        metrics.ActiveProjects = activeProjects;
        metrics.TotalClients = totalClients;
        metrics.PendingApprovals = pendingApprovals;

        return metrics;
    }

    public async Task<IEnumerable<TopProjectMetrics>> GetTopProjectsWithHighTasksAsync(int limit = 10)
    {
        // Get projects with their task counts (using timesheet entries as "tasks")
        var projectMetrics = await _context.Projects
            .Where(p => p.Status.ToLower() == "active")
            .Include(p => p.Client)
            .Select(p => new TopProjectMetrics
            {
                ProjectId = p.ProjectId,
                ProjectCode = p.Code,
                ProjectName = p.Name,
                ClientName = p.Client != null ? p.Client.Name : "Unknown",
                IsBillable = p.Billable,
                Status = p.Status,
                TotalTasksCount = _context.TimesheetEntries
                    .Count(te => te.ProjectId == p.ProjectId),
                OpenTasksCount = _context.TimesheetEntries
                    .Count(te => te.ProjectId == p.ProjectId && 
                               te.Status != TimesheetStatus.APPROVED && 
                               te.Status != TimesheetStatus.REJECTED),
                UtilizationPercentage = (double)_context.TimesheetEntries
                    .Where(te => te.ProjectId == p.ProjectId && te.Status == TimesheetStatus.APPROVED)
                    .Sum(te => te.Hours)
            })
            .OrderByDescending(pm => pm.OpenTasksCount)
            .ThenByDescending(pm => pm.TotalTasksCount)
            .Take(limit)
            .ToListAsync();

        // Calculate utilization percentage (simplified calculation)
        foreach (var metric in projectMetrics)
        {
            if (metric.TotalTasksCount > 0)
            {
                metric.UtilizationPercentage = Math.Round(
                    (metric.TotalTasksCount - metric.OpenTasksCount) * 100.0 / metric.TotalTasksCount, 2);
            }
        }

        return projectMetrics;
    }
}
