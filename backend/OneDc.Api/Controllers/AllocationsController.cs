using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace OneDc.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AllocationsController : ControllerBase
{
    private readonly OneDcDbContext _context;

    public AllocationsController(OneDcDbContext context)
    {
        _context = context;
    }

    // GET: api/allocations/week/{weekStartDate}
    [HttpGet("week/{weekStartDate}")]
    public async Task<ActionResult<IEnumerable<WeeklyAllocationDto>>> GetAllocationsForWeek(string weekStartDate)
    {
        if (!DateOnly.TryParse(weekStartDate, out var startDate))
        {
            return BadRequest("Invalid date format. Use YYYY-MM-DD.");
        }

        var allocations = await _context.WeeklyAllocations
            .Include(wa => wa.Project)
            .Include(wa => wa.User)
            .Where(wa => wa.WeekStartDate == startDate)
            .Select(wa => new WeeklyAllocationDto
            {
                AllocationId = wa.AllocationId.ToString(),
                ProjectId = wa.ProjectId.ToString(),
                ProjectName = wa.Project!.Name,
                UserId = wa.UserId.ToString(),
                UserName = wa.User!.FirstName + " " + wa.User.LastName,
                WeekStartDate = wa.WeekStartDate.ToString("yyyy-MM-dd"),
                WeekEndDate = wa.WeekEndDate.ToString("yyyy-MM-dd"),
                AllocatedHours = wa.AllocatedHours,
                UtilizationPercentage = wa.UtilizationPercentage,
                Status = wa.Status,
                CreatedAt = wa.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                UpdatedAt = wa.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
            })
            .ToListAsync();

        return Ok(allocations);
    }

    // POST: api/allocations
    /// <summary>
    /// Creates a new weekly allocation
    /// Business Rules:
    /// - Standard work week: 45 hours (9 hours/day × 5 working days)
    /// - Maximum allowed: 67.5 hours (150% utilization, includes reasonable overtime)
    /// - Minimum: 1 hour (for partial allocations)
    /// - Based on standard labor practices and employee wellbeing guidelines
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<WeeklyAllocation>> CreateAllocation(CreateAllocationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            if (!Guid.TryParse(request.ProjectId, out var projectId))
            {
                return BadRequest("Invalid Project ID format.");
            }

            if (!Guid.TryParse(request.UserId, out var userId))
            {
                return BadRequest("Invalid User ID format.");
            }

            if (!DateOnly.TryParse(request.WeekStartDate, out var weekStartDate))
            {
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");
            }

            // Check if allocation already exists for this project, user, and week
            var existingAllocation = await _context.WeeklyAllocations
                .FirstOrDefaultAsync(wa => wa.ProjectId == projectId && 
                                         wa.UserId == userId && 
                                         wa.WeekStartDate == weekStartDate);

            if (existingAllocation != null)
            {
                return Conflict("Allocation already exists for this project, user, and week.");
            }

            var allocation = new WeeklyAllocation
            {
                ProjectId = projectId,
                UserId = userId,
                AllocatedHours = request.AllocatedHours,
                WeekStartDate = weekStartDate,
                WeekEndDate = weekStartDate.AddDays(6), // Sunday + 6 = Saturday
                UtilizationPercentage = Math.Round((decimal)request.AllocatedHours / 45 * 100, 2),
                Status = "ACTIVE"
            };

            _context.WeeklyAllocations.Add(allocation);
            await _context.SaveChangesAsync();

            return Created($"api/allocations/{allocation.AllocationId}", allocation);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error creating allocation: {ex.Message}");
        }
    }

    // PUT: api/allocations/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<WeeklyAllocationDto>> UpdateAllocation(string id, UpdateAllocationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (!Guid.TryParse(id, out var allocationId))
        {
            return BadRequest("Invalid allocation ID format.");
        }

        // Additional business rule validation
        if (request.AllocatedHours > 67.5)
        {
            return BadRequest("Allocated hours cannot exceed 67.5 hours per week for employee wellbeing and legal compliance.");
        }

        var allocation = await _context.WeeklyAllocations
            .Include(wa => wa.Project)
            .Include(wa => wa.User)
            .FirstOrDefaultAsync(wa => wa.AllocationId == allocationId);

        if (allocation == null)
        {
            return NotFound();
        }

        // Update fields
        allocation.AllocatedHours = request.AllocatedHours;
        allocation.UtilizationPercentage = Math.Round((decimal)request.AllocatedHours / 45 * 100, 2);
        allocation.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.Status))
        {
            allocation.Status = request.Status;
        }

        await _context.SaveChangesAsync();

        var updatedAllocation = new WeeklyAllocationDto
        {
            AllocationId = allocation.AllocationId.ToString(),
            ProjectId = allocation.ProjectId.ToString(),
            ProjectName = allocation.Project!.Name,
            UserId = allocation.UserId.ToString(),
            UserName = allocation.User!.FirstName + " " + allocation.User.LastName,
            WeekStartDate = allocation.WeekStartDate.ToString("yyyy-MM-dd"),
            WeekEndDate = allocation.WeekEndDate.ToString("yyyy-MM-dd"),
            AllocatedHours = allocation.AllocatedHours,
            UtilizationPercentage = allocation.UtilizationPercentage,
            Status = allocation.Status,
            CreatedAt = allocation.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            UpdatedAt = allocation.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };

        return Ok(updatedAllocation);
    }

    // DELETE: api/allocations/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAllocation(string id)
    {
        if (!Guid.TryParse(id, out var allocationId))
        {
            return BadRequest("Invalid allocation ID format.");
        }

        var allocation = await _context.WeeklyAllocations.FindAsync(allocationId);
        if (allocation == null)
        {
            return NotFound();
        }

        _context.WeeklyAllocations.Remove(allocation);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/allocations/project-summary/{weekStartDate}
    [HttpGet("project-summary/{weekStartDate}")]
    public async Task<ActionResult<IEnumerable<AllocationSummaryDto>>> GetProjectAllocationSummary(string weekStartDate)
    {
        if (!DateOnly.TryParse(weekStartDate, out var startDate))
        {
            return BadRequest("Invalid date format. Use YYYY-MM-DD.");
        }

        var summary = await _context.WeeklyAllocations
            .Include(wa => wa.Project)
            .Where(wa => wa.WeekStartDate == startDate)
            .GroupBy(wa => new { wa.ProjectId, wa.Project!.Name })
            .Select(g => new AllocationSummaryDto
            {
                ProjectId = g.Key.ProjectId.ToString(),
                ProjectName = g.Key.Name,
                TotalAllocatedHours = g.Sum(wa => wa.AllocatedHours),
                TotalEmployees = g.Count(),
                UtilizationPercentage = Math.Round(g.Average(wa => wa.UtilizationPercentage), 2)
            })
            .ToListAsync();

        return Ok(summary);
    }

    // GET: api/allocations/employee-summary/{weekStartDate}
    [HttpGet("employee-summary/{weekStartDate}")]
    public async Task<ActionResult<IEnumerable<EmployeeAllocationSummaryDto>>> GetEmployeeAllocationSummary(string weekStartDate)
    {
        if (!DateOnly.TryParse(weekStartDate, out var startDate))
        {
            return BadRequest("Invalid date format. Use YYYY-MM-DD.");
        }

        var summary = await _context.WeeklyAllocations
            .Include(wa => wa.User)
            .Where(wa => wa.WeekStartDate == startDate)
            .GroupBy(wa => new { wa.UserId, wa.User!.FirstName, wa.User.LastName })
            .Select(g => new EmployeeAllocationSummaryDto
            {
                UserId = g.Key.UserId.ToString(),
                UserName = g.Key.FirstName + " " + g.Key.LastName,
                TotalAllocatedHours = g.Sum(wa => wa.AllocatedHours),
                TotalProjects = g.Count(),
                WeeklyCapacity = 45, // Standard work week: 9 hours/day × 5 days
                UtilizationPercentage = Math.Round((decimal)g.Sum(wa => wa.AllocatedHours) / 45 * 100, 2)
            })
            .ToListAsync();

        return Ok(summary);
    }

    // GET: api/allocations/available-projects
    [HttpGet("available-projects")]
    public async Task<ActionResult<IEnumerable<AvailableProjectDto>>> GetAvailableProjects()
    {
        var projects = await _context.Projects
            .Where(p => p.Status.ToLower() == "active")
            .Select(p => new AvailableProjectDto
            {
                ProjectId = p.ProjectId.ToString(),
                ProjectName = p.Name,
                Status = p.Status
            })
            .OrderBy(p => p.ProjectName)
            .ToListAsync();

        return Ok(projects);
    }

    // GET: api/allocations/available-employees
    [HttpGet("available-employees")]
    public async Task<ActionResult<IEnumerable<AvailableEmployeeDto>>> GetAvailableEmployees()
    {
        var employees = await _context.AppUsers
            .Where(u => u.IsActive)
            .Select(u => new AvailableEmployeeDto
            {
                UserId = u.UserId.ToString(),
                UserName = u.FirstName + " " + u.LastName,
                Role = u.Role.ToString()
            })
            .OrderBy(u => u.UserName)
            .ToListAsync();

        return Ok(employees);
    }

    // GET: api/allocations/check-existing/{projectId}/{userId}/{weekStartDate}
    [HttpGet("check-existing/{projectId}/{userId}/{weekStartDate}")]
    public async Task<ActionResult<bool>> CheckExistingAllocation(string projectId, string userId, string weekStartDate)
    {
        if (!Guid.TryParse(projectId, out var projId) || 
            !Guid.TryParse(userId, out var usrId) ||
            !DateOnly.TryParse(weekStartDate, out var weekStart))
        {
            return BadRequest("Invalid parameters format.");
        }

        var exists = await _context.WeeklyAllocations
            .AnyAsync(wa => wa.ProjectId == projId && 
                           wa.UserId == usrId && 
                           wa.WeekStartDate == weekStart);

        return Ok(exists);
    }
}

// DTOs
public class WeeklyAllocationDto
{
    public string AllocationId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string WeekStartDate { get; set; } = string.Empty;
    public string WeekEndDate { get; set; } = string.Empty;
    public int AllocatedHours { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateAllocationRequest
{
    [Required]
    public string ProjectId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string WeekStartDate { get; set; } = string.Empty;
    
    [Required]
    [Range(1, 67.5, ErrorMessage = "Allocated hours must be between 1 and 67.5 hours per week (9 hrs/day × 5 days + overtime)")]
    public int AllocatedHours { get; set; }
}

public class UpdateAllocationRequest
{
    [Required]
    [Range(1, 67.5, ErrorMessage = "Allocated hours must be between 1 and 67.5 hours per week (9 hrs/day × 5 days + overtime)")]
    public int AllocatedHours { get; set; }
    public string? Status { get; set; }
}

public class AllocationSummaryDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public int TotalAllocatedHours { get; set; }
    public int TotalEmployees { get; set; }
    public decimal UtilizationPercentage { get; set; }
}

public class EmployeeAllocationSummaryDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int TotalAllocatedHours { get; set; }
    public int TotalProjects { get; set; }
    public int WeeklyCapacity { get; set; }
    public decimal UtilizationPercentage { get; set; }
}

public class AvailableProjectDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AvailableEmployeeDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
