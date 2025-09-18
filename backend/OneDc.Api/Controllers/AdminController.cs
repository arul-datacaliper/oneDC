using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("dashboard-metrics")]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        try
        {
            var metrics = await _adminService.GetDashboardMetricsAsync();
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving dashboard metrics", error = ex.Message });
        }
    }

    [HttpGet("top-projects")]
    public async Task<IActionResult> GetTopProjects([FromQuery] int limit = 10)
    {
        try
        {
            if (limit <= 0 || limit > 50)
            {
                limit = 10;
            }

            var topProjects = await _adminService.GetTopProjectsWithHighTasksAsync(limit);
            return Ok(topProjects);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving top projects", error = ex.Message });
        }
    }

    [HttpGet("projects-release-info")]
    public async Task<IActionResult> GetProjectsWithReleaseInfo([FromQuery] int limit = 10)
    {
        try
        {
            if (limit <= 0 || limit > 50)
            {
                limit = 10;
            }

            var projectsReleaseInfo = await _adminService.GetProjectsWithReleaseInfoAsync(limit);
            return Ok(projectsReleaseInfo);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving projects release info", error = ex.Message });
        }
    }
}
