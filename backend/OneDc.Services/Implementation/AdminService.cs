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
        // Get projects with their actual task counts (using ProjectTask table)
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
                TotalTasksCount = _context.ProjectTasks
                    .Count(pt => pt.ProjectId == p.ProjectId),
                OpenTasksCount = _context.ProjectTasks
                    .Count(pt => pt.ProjectId == p.ProjectId && 
                               pt.Status != Domain.Entities.TaskStatus.COMPLETED && 
                               pt.Status != Domain.Entities.TaskStatus.CANCELLED),
                UtilizationPercentage = 0 // Will be calculated below
            })
            .OrderByDescending(pm => pm.OpenTasksCount)
            .ThenByDescending(pm => pm.TotalTasksCount)
            .Take(limit)
            .ToListAsync();

        // Calculate completion percentage (tasks completed vs total tasks)
        foreach (var metric in projectMetrics)
        {
            if (metric.TotalTasksCount > 0)
            {
                var completedTasks = metric.TotalTasksCount - metric.OpenTasksCount;
                metric.UtilizationPercentage = Math.Round(
                    completedTasks * 100.0 / metric.TotalTasksCount, 2);
            }
        }

        return projectMetrics;
    }

    public async Task<IEnumerable<ProjectReleaseInfo>> GetProjectsWithReleaseInfoAsync(int limit = 10)
    {
        var projectsReleaseInfo = await _context.Projects
            .Where(p => p.Status.ToLower() == "active")
            .OrderBy(p => p.PlannedReleaseDate.HasValue ? p.PlannedReleaseDate : DateOnly.MaxValue)
            .ThenBy(p => p.Name)
            .Take(limit)
            .Select(p => new ProjectReleaseInfo
            {
                ProjectId = p.ProjectId,
                ProjectName = p.Name,
                PlannedReleaseDate = p.PlannedReleaseDate,
                Status = p.Status,
                ManagerName = p.DefaultApprover.HasValue 
                    ? _context.AppUsers
                        .Where(u => u.UserId == p.DefaultApprover.Value)
                        .Select(u => u.FirstName + " " + u.LastName)
                        .FirstOrDefault() ?? "Not Assigned"
                    : "Not Assigned"
            })
            .ToListAsync();

        return projectsReleaseInfo;
    }
}
