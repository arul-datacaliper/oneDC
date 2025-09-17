using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace OneDc.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly OneDcDbContext _context;

    public EmployeesController(OneDcDbContext context)
    {
        _context = context;
    }

    [HttpGet("{userId}/dashboard-metrics")]
    public async Task<IActionResult> GetEmployeeDashboardMetrics(Guid userId)
    {
        try
        {
            // Get assigned tasks count - using ProjectAllocations as proxy for tasks
            var allocations = await _context.ProjectAllocations
                .Where(pa => pa.UserId == userId)
                .CountAsync();

            // Get timesheet data for hours calculation
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = DateOnly.FromDateTime(now.AddDays(-30));
            var timesheets = await _context.TimesheetEntries
                .Where(t => t.UserId == userId && t.WorkDate >= thirtyDaysAgo)
                .ToListAsync();

            var totalSubmittedHours = timesheets.Sum(t => t.Hours);
            var totalApprovedHours = timesheets.Where(t => t.Status == TimesheetStatus.APPROVED).Sum(t => t.Hours);

            var metrics = new
            {
                TotalAssignedTasks = allocations,
                TotalSubmittedHours = totalSubmittedHours,
                TotalApprovedHours = totalApprovedHours
            };

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employee metrics", error = ex.Message });
        }
    }

    [HttpGet("{userId}/tasks")]
    public async Task<IActionResult> GetAssignedTasks(Guid userId)
    {
        try
        {
            // Get project allocations as proxy for tasks
            var allocations = await _context.ProjectAllocations
                .Include(pa => pa.Project)
                .Where(pa => pa.UserId == userId)
                .ToListAsync();

            var result = allocations.Select(allocation => new
            {
                TaskId = allocation.AllocationId.ToString(),
                TaskName = $"Work on {allocation.Project?.Name ?? "Unknown Project"}",
                ProjectName = allocation.Project?.Name ?? "Unknown Project",
                Status = "Active",
                ManagerName = GetManagerName(allocation.Project?.DefaultApprover),
                StartDate = allocation.StartDate.ToString("yyyy-MM-dd"),
                EndDate = allocation.EndDate?.ToString("yyyy-MM-dd") ?? "",
                Description = $"Allocated to work on {allocation.Project?.Name ?? "Unknown Project"}",
                Priority = "Medium"
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employee tasks", error = ex.Message });
        }
    }

    [HttpGet("{userId}/timesheet-summary")]
    public async Task<IActionResult> GetTimesheetSummary(Guid userId, [FromQuery] string? range = null)
    {
        try
        {
            var query = _context.TimesheetEntries.Where(t => t.UserId == userId);
            
            // Apply date range filter if specified
            if (!string.IsNullOrEmpty(range))
            {
                var now = DateTime.UtcNow;
                switch (range.ToLower())
                {
                    case "week":
                        var weekStart = now.AddDays(-(int)now.DayOfWeek);
                        query = query.Where(t => t.WorkDate >= DateOnly.FromDateTime(weekStart));
                        break;
                    case "month":
                        var monthStart = new DateTime(now.Year, now.Month, 1);
                        query = query.Where(t => t.WorkDate >= DateOnly.FromDateTime(monthStart));
                        break;
                }
            }

            var timesheets = await query.ToListAsync();

            var summary = new
            {
                TotalHours = timesheets.Sum(t => t.Hours),
                SubmittedHours = timesheets.Where(t => t.Status == TimesheetStatus.SUBMITTED).Sum(t => t.Hours),
                ApprovedHours = timesheets.Where(t => t.Status == TimesheetStatus.APPROVED).Sum(t => t.Hours),
                PendingHours = timesheets.Where(t => t.Status == TimesheetStatus.SUBMITTED).Sum(t => t.Hours),
                RejectedHours = timesheets.Where(t => t.Status == TimesheetStatus.REJECTED).Sum(t => t.Hours)
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving timesheet summary", error = ex.Message });
        }
    }

    [HttpGet("{userId}/project-utilization")]
    public async Task<IActionResult> GetProjectUtilization(Guid userId)
    {
        try
        {
            var timesheets = await _context.TimesheetEntries
                .Include(t => t.Project)
                .Where(t => t.UserId == userId)
                .ToListAsync();

            var allocations = await _context.ProjectAllocations
                .Include(pa => pa.Project)
                .Where(pa => pa.UserId == userId)
                .ToListAsync();

            // Group timesheets by project to calculate utilization
            var projectGroups = timesheets
                .GroupBy(t => t.ProjectId)
                .Select(g => {
                    var project = g.First().Project;
                    var allocation = allocations.FirstOrDefault(a => a.ProjectId == g.Key);
                    var allocatedHours = (double)(allocation?.AllocationPct ?? 100m); // Use allocation percentage as proxy
                    var workedHours = g.Sum(t => t.Hours);
                    
                    return new
                    {
                        ProjectId = g.Key.ToString(),
                        ProjectName = project?.Name ?? "Unknown Project",
                        TotalAllocatedHours = (double)allocatedHours * 1.6, // Convert percentage to hours (example calculation)
                        TotalWorkedHours = (double)workedHours,
                        UtilizationPercentage = allocatedHours > 0 ? Math.Round(((double)workedHours / ((double)allocatedHours * 1.6)) * 100, 1) : 0,
                        Status = "Active", // Default status
                        StartDate = project?.StartDate?.ToString("yyyy-MM-dd") ?? "",
                        EndDate = project?.EndDate?.ToString("yyyy-MM-dd") ?? "",
                        ManagerName = GetManagerName(project?.DefaultApprover)
                    };
                })
                .ToList();

            return Ok(projectGroups);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving project utilization", error = ex.Message });
        }
    }

    private string GetManagerName(Guid? managerId)
    {
        if (!managerId.HasValue) return "No Manager";
        
        try
        {
            var manager = _context.AppUsers.FirstOrDefault(u => u.UserId == managerId.Value);
            return manager != null ? $"{manager.FirstName} {manager.LastName}" : "No Manager";
        }
        catch
        {
            return "No Manager";
        }
    }
}
