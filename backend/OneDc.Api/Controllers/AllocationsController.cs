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
public class AllocationsController : BaseController
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

        var endDate = startDate.AddDays(6); // Sunday + 6 = Saturday
        
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        var query = _context.WeeklyAllocations
            .Include(wa => wa.Project)
            .Include(wa => wa.User)
            .Where(wa => wa.WeekStartDate <= endDate && wa.WeekEndDate >= startDate); // Overlaps with the requested week

        // Role-based filtering
        if (currentUserRole == "EMPLOYEE")
        {
            // Employees can only see their own allocations
            query = query.Where(wa => wa.UserId == currentUserId);
        }
        else if (currentUserRole == "APPROVER")
        {
            // Approvers can see allocations for projects they manage (DefaultApprover) or are members of
            var approverProjectIds = await _context.Projects
                .Include(p => p.ProjectMembers)
                .Where(p => p.DefaultApprover == currentUserId || 
                           p.ProjectMembers.Any(pm => pm.UserId == currentUserId))
                .Select(p => p.ProjectId)
                .ToListAsync();
            
            query = query.Where(wa => approverProjectIds.Contains(wa.ProjectId));
        }
        // Admin can see all allocations (no additional filter)

        var allocations = await query
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

            if (!DateOnly.TryParse(request.WeekEndDate, out var weekEndDate))
            {
                return BadRequest("Invalid end date format. Use YYYY-MM-DD.");
            }

            var currentUserId = GetCurrentUserId();
            var currentUserRole = GetCurrentUserRole();

            // Role-based authorization for creating allocations
            if (currentUserRole == "EMPLOYEE")
            {
                // Employees can only create allocations for themselves
                if (userId != currentUserId)
                {
                    return StatusCode(403, "Employees can only create allocations for themselves.");
                }

                // Employees can only create allocations for projects they're assigned to (ProjectAllocations) or are team members of (ProjectMembers)
                var isAssignedToProject = await _context.ProjectAllocations
                    .AnyAsync(pa => pa.ProjectId == projectId && pa.UserId == currentUserId);
                
                var isProjectMember = await _context.ProjectMembers
                    .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == currentUserId);

                if (!isAssignedToProject && !isProjectMember)
                {
                    return StatusCode(403, "You can only create allocations for projects you are assigned to.");
                }
            }
            else if (currentUserRole == "APPROVER")
            {
                // Approvers can create allocations for any user but only for projects they manage or are members of
                var isApproverProject = await _context.Projects
                    .Include(p => p.ProjectMembers)
                    .AnyAsync(p => p.ProjectId == projectId && 
                                  (p.DefaultApprover == currentUserId || 
                                   p.ProjectMembers.Any(pm => pm.UserId == currentUserId)));

                if (!isApproverProject)
                {
                    return StatusCode(403, "You can only create allocations for projects you manage.");
                }
            }
            // Admin can create allocations for anyone on any project (no additional check)

            // Check if allocation already exists for this project, user, and period
            var existingAllocation = await _context.WeeklyAllocations
                .FirstOrDefaultAsync(wa => wa.ProjectId == projectId && 
                                         wa.UserId == userId && 
                                         wa.WeekStartDate == weekStartDate &&
                                         wa.WeekEndDate == weekEndDate);

            if (existingAllocation != null)
            {
                return Conflict("Allocation already exists for this project, user, and period.");
            }

            var allocation = new WeeklyAllocation
            {
                ProjectId = projectId,
                UserId = userId,
                AllocatedHours = request.AllocatedHours,
                WeekStartDate = weekStartDate,
                WeekEndDate = weekEndDate,
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

        var endDate = startDate.AddDays(6); // Sunday + 6 = Saturday
        
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        IQueryable<Project> projectQuery = _context.Projects;

        // Role-based filtering for projects
        if (currentUserRole == "EMPLOYEE")
        {
            // Employees can see projects they're allocated to (WeeklyAllocations) or are team members of (ProjectMembers)
            var employeeProjectIdsFromAllocations = await _context.WeeklyAllocations
                .Where(wa => wa.UserId == currentUserId && 
                            wa.WeekStartDate <= endDate && 
                            wa.WeekEndDate >= startDate)
                .Select(wa => wa.ProjectId)
                .Distinct()
                .ToListAsync();
            
            var employeeProjectIdsFromMembers = await _context.ProjectMembers
                .Where(pm => pm.UserId == currentUserId)
                .Select(pm => pm.ProjectId)
                .Distinct()
                .ToListAsync();
            
            // Combine both lists
            var allEmployeeProjectIds = employeeProjectIdsFromAllocations
                .Union(employeeProjectIdsFromMembers)
                .ToList();
            
            projectQuery = projectQuery.Where(p => allEmployeeProjectIds.Contains(p.ProjectId));
        }
        else if (currentUserRole == "APPROVER")
        {
            // Approvers can see projects where they are DefaultApprover or ProjectMember
            projectQuery = projectQuery
                .Include(p => p.ProjectMembers)
                .Where(p => 
                    p.DefaultApprover == currentUserId || 
                    p.ProjectMembers.Any(pm => pm.UserId == currentUserId));
        }
        // Admin can see all projects (no filter)

        var allProjects = await projectQuery
            .Select(p => new
            {
                p.ProjectId,
                p.Name
            })
            .ToListAsync();

        // Get allocations for the week
        var weekAllocations = await _context.WeeklyAllocations
            .Where(wa => wa.WeekStartDate <= endDate && wa.WeekEndDate >= startDate)
            .GroupBy(wa => wa.ProjectId)
            .Select(g => new
            {
                ProjectId = g.Key,
                TotalAllocatedHours = g.Sum(wa => wa.AllocatedHours),
                TotalEmployees = g.Count(),
                AvgUtilization = g.Average(wa => wa.UtilizationPercentage)
            })
            .ToListAsync();

        // Combine all projects with their allocations (0 if no allocation)
        var summary = allProjects
            .Select(proj =>
            {
                var allocation = weekAllocations.FirstOrDefault(a => a.ProjectId == proj.ProjectId);
                return new AllocationSummaryDto
                {
                    ProjectId = proj.ProjectId.ToString(),
                    ProjectName = proj.Name,
                    TotalAllocatedHours = allocation?.TotalAllocatedHours ?? 0,
                    TotalEmployees = allocation?.TotalEmployees ?? 0,
                    UtilizationPercentage = allocation != null ? Math.Round(allocation.AvgUtilization, 2) : 0
                };
            })
            .OrderByDescending(s => s.TotalAllocatedHours)
            .ThenBy(s => s.ProjectName)
            .ToList();

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

        var endDate = startDate.AddDays(6); // Sunday + 6 = Saturday
        
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        IQueryable<AppUser> employeeQuery = _context.AppUsers;

        // Role-based filtering for employees
        if (currentUserRole == "EMPLOYEE")
        {
            // Employees can only see themselves
            employeeQuery = employeeQuery.Where(u => u.UserId == currentUserId);
        }
        else if (currentUserRole == "APPROVER")
        {
            // Approvers can see employees from projects they manage (DefaultApprover) or are members of
            var approverProjectIds = await _context.Projects
                .Include(p => p.ProjectMembers)
                .Where(p => p.DefaultApprover == currentUserId || 
                           p.ProjectMembers.Any(pm => pm.UserId == currentUserId))
                .Select(p => p.ProjectId)
                .ToListAsync();
            
            // Get all employees who have allocations or are members in these projects
            var employeeIdsInAllocations = await _context.ProjectAllocations
                .Where(pa => approverProjectIds.Contains(pa.ProjectId))
                .Select(pa => pa.UserId)
                .ToListAsync();
                
            var employeeIdsInMembers = await _context.ProjectMembers
                .Where(pm => approverProjectIds.Contains(pm.ProjectId))
                .Select(pm => pm.UserId)
                .ToListAsync();
            
            var allEmployeeIds = employeeIdsInAllocations.Union(employeeIdsInMembers).Distinct().ToList();
            
            employeeQuery = employeeQuery.Where(u => allEmployeeIds.Contains(u.UserId));
        }
        // Admin can see all employees (no filter)

        var allEmployees = await employeeQuery
            .Select(u => new
            {
                u.UserId,
                u.FirstName,
                u.LastName
            })
            .ToListAsync();

        // Get allocations for the week
        var weekAllocations = await _context.WeeklyAllocations
            .Where(wa => wa.WeekStartDate <= endDate && wa.WeekEndDate >= startDate)
            .GroupBy(wa => wa.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                TotalAllocatedHours = g.Sum(wa => wa.AllocatedHours),
                TotalProjects = g.Count()
            })
            .ToListAsync();

        // Get holidays in the week
        var holidays = await _context.Holidays
            .Where(h => h.HolidayDate >= startDate && h.HolidayDate <= endDate)
            .Select(h => h.HolidayDate)
            .ToListAsync();

        // Get approved leaves for all employees in the week
        // Convert DateOnly to DateTime (UTC) for comparison in SQL
        var startDateTime = DateTime.SpecifyKind(startDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var endDateTime = DateTime.SpecifyKind(endDate.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
        
        var approvedLeaves = await _context.LeaveRequests
            .Where(lr => lr.Status == "Approved" &&
                         lr.StartDate <= endDateTime &&
                         lr.EndDate >= startDateTime)
            .Select(lr => new
            {
                lr.EmployeeId,
                lr.StartDate,
                lr.EndDate
            })
            .ToListAsync();
        
        // Convert to DateOnly for processing
        var approvedLeavesProcessed = approvedLeaves.Select(lr => new
        {
            lr.EmployeeId,
            StartDate = DateOnly.FromDateTime(lr.StartDate),
            EndDate = DateOnly.FromDateTime(lr.EndDate)
        }).ToList();

        // Calculate working days in the week (excluding weekends)
        int totalWorkingDays = 0;
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dayOfWeek = date.DayOfWeek;
            if (dayOfWeek != DayOfWeek.Saturday && dayOfWeek != DayOfWeek.Sunday)
            {
                totalWorkingDays++;
            }
        }

        // Combine all employees with their allocations (0 if no allocation)
        var summary = allEmployees
            .Select(emp =>
            {
                var allocation = weekAllocations.FirstOrDefault(a => a.UserId == emp.UserId);
                var allocatedHours = allocation?.TotalAllocatedHours ?? 0;
                
                // Calculate weekly capacity for this employee
                int workingDays = totalWorkingDays;
                
                // Subtract holidays (applies to all employees)
                workingDays -= holidays.Count;
                
                // Subtract approved leave days for this employee
                var employeeLeaves = approvedLeavesProcessed.Where(al => al.EmployeeId == emp.UserId).ToList();
                foreach (var leave in employeeLeaves)
                {
                    // Calculate overlap between leave and the week
                    var leaveStart = leave.StartDate > startDate ? leave.StartDate : startDate;
                    var leaveEnd = leave.EndDate < endDate ? leave.EndDate : endDate;
                    
                    // Count working days in the leave period
                    for (var date = leaveStart; date <= leaveEnd; date = date.AddDays(1))
                    {
                        var dayOfWeek = date.DayOfWeek;
                        // Only count if it's a working day and not a holiday
                        if (dayOfWeek != DayOfWeek.Saturday && 
                            dayOfWeek != DayOfWeek.Sunday && 
                            !holidays.Contains(date))
                        {
                            workingDays--;
                        }
                    }
                }
                
                // Ensure working days is not negative
                workingDays = Math.Max(0, workingDays);
                
                // Calculate capacity: working days × 9 hours
                var weeklyCapacity = workingDays * 9;
                
                return new EmployeeAllocationSummaryDto
                {
                    UserId = emp.UserId.ToString(),
                    UserName = emp.FirstName + " " + emp.LastName,
                    TotalAllocatedHours = allocatedHours,
                    TotalProjects = allocation?.TotalProjects ?? 0,
                    WeeklyCapacity = weeklyCapacity,
                    UtilizationPercentage = weeklyCapacity > 0 ? Math.Round((decimal)allocatedHours / weeklyCapacity * 100, 2) : 0
                };
            })
            .OrderBy(s => s.UserName)
            .ToList();

        return Ok(summary);
    }

    // GET: api/allocations/available-projects
    [HttpGet("available-projects")]
    public async Task<ActionResult<IEnumerable<AvailableProjectDto>>> GetAvailableProjects()
    {
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        IQueryable<Project> projectQuery = _context.Projects
            .Include(p => p.Client)
            .Include(p => p.ProjectMembers)
            .Where(p => p.Status.ToLower() == "active");

        // Role-based filtering
        if (currentUserRole == "EMPLOYEE")
        {
            // Employees can see projects they're assigned to (ProjectAllocations) OR are team members of (ProjectMembers)
            var employeeProjectIdsFromAllocations = await _context.ProjectAllocations
                .Where(pa => pa.UserId == currentUserId)
                .Select(pa => pa.ProjectId)
                .Distinct()
                .ToListAsync();
            
            var employeeProjectIdsFromMembers = await _context.ProjectMembers
                .Where(pm => pm.UserId == currentUserId)
                .Select(pm => pm.ProjectId)
                .Distinct()
                .ToListAsync();
            
            // Combine both lists
            var allEmployeeProjectIds = employeeProjectIdsFromAllocations
                .Union(employeeProjectIdsFromMembers)
                .ToList();
            
            projectQuery = projectQuery.Where(p => allEmployeeProjectIds.Contains(p.ProjectId));
        }
        else if (currentUserRole == "APPROVER")
        {
            // Approvers can see projects where they are DefaultApprover or ProjectMember
            projectQuery = projectQuery.Where(p => 
                p.DefaultApprover == currentUserId || 
                p.ProjectMembers.Any(pm => pm.UserId == currentUserId));
        }
        // Admin can see all active projects (no additional filter)

        var projects = await projectQuery
            .Select(p => new AvailableProjectDto
            {
                ProjectId = p.ProjectId.ToString(),
                ProjectName = p.Name,
                ClientName = p.Client != null ? p.Client.Name : "Unknown Client",
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
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        IQueryable<AppUser> employeeQuery = _context.AppUsers.Where(u => u.IsActive);

        // Role-based filtering
        if (currentUserRole == "EMPLOYEE")
        {
            // Employees can only see themselves
            employeeQuery = employeeQuery.Where(u => u.UserId == currentUserId);
        }
        else if (currentUserRole == "APPROVER")
        {
            // Approvers can see employees from projects they manage (DefaultApprover) or are members of
            var approverProjectIds = await _context.Projects
                .Include(p => p.ProjectMembers)
                .Where(p => p.DefaultApprover == currentUserId || 
                           p.ProjectMembers.Any(pm => pm.UserId == currentUserId))
                .Select(p => p.ProjectId)
                .ToListAsync();
            
            // Get all employees who have allocations or are members in these projects
            var employeeIdsInAllocations = await _context.ProjectAllocations
                .Where(pa => approverProjectIds.Contains(pa.ProjectId))
                .Select(pa => pa.UserId)
                .ToListAsync();
                
            var employeeIdsInMembers = await _context.ProjectMembers
                .Where(pm => approverProjectIds.Contains(pm.ProjectId))
                .Select(pm => pm.UserId)
                .ToListAsync();
            
            var allEmployeeIds = employeeIdsInAllocations.Union(employeeIdsInMembers).Distinct().ToList();
            
            employeeQuery = employeeQuery.Where(u => allEmployeeIds.Contains(u.UserId));
        }
        // Admin can see all active employees (no additional filter)

        var employees = await employeeQuery
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

        var weekEnd = weekStart.AddDays(6);

        var exists = await _context.WeeklyAllocations
            .AnyAsync(wa => wa.ProjectId == projId && 
                           wa.UserId == usrId && 
                           wa.WeekStartDate <= weekEnd && wa.WeekEndDate >= weekStart); // Overlaps with the week

        return Ok(exists);
    }

    // GET: api/allocations/export/csv
    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportToCsv(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] string? projectId = null,
        [FromQuery] string? userId = null)
    {
        if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
        {
            return BadRequest("Invalid date format. Use YYYY-MM-DD.");
        }

        var query = _context.WeeklyAllocations
            .Include(wa => wa.Project)
            .Include(wa => wa.User)
            .Where(wa => wa.WeekStartDate >= fromDate && wa.WeekStartDate <= toDate);

        // Apply filters
        if (!string.IsNullOrEmpty(projectId) && Guid.TryParse(projectId, out var projId))
        {
            query = query.Where(wa => wa.ProjectId == projId);
        }

        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var usrId))
        {
            query = query.Where(wa => wa.UserId == usrId);
        }

        var allocations = await query
            .OrderBy(wa => wa.WeekStartDate)
            .ThenBy(wa => wa.Project!.Name)
            .ThenBy(wa => wa.User!.FirstName)
            .Select(wa => new
            {
                ProjectCode = wa.Project!.Code,
                ProjectName = wa.Project!.Name,
                EmployeeName = wa.User!.FirstName + " " + wa.User.LastName,
                EmployeeRole = wa.User.Role,
                WeekStartDate = wa.WeekStartDate.ToString("yyyy-MM-dd"),
                WeekEndDate = wa.WeekEndDate.ToString("yyyy-MM-dd"),
                AllocatedHours = wa.AllocatedHours,
                UtilizationPercentage = wa.UtilizationPercentage,
                Status = wa.Status,
                CreatedAt = wa.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
            })
            .ToListAsync();

        // Generate CSV content
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Project Code,Project Name,Employee Name,Employee Role,Week Start Date,Week End Date,Allocated Hours,Utilization %,Status,Created At");

        foreach (var allocation in allocations)
        {
            csv.AppendLine($"\"{allocation.ProjectCode}\",\"{allocation.ProjectName}\",\"{allocation.EmployeeName}\",\"{allocation.EmployeeRole}\",\"{allocation.WeekStartDate}\",\"{allocation.WeekEndDate}\",{allocation.AllocatedHours},{allocation.UtilizationPercentage},\"{allocation.Status}\",\"{allocation.CreatedAt}\"");
        }

        var fileName = $"allocations-{fromDate:yyyy-MM-dd}-to-{toDate:yyyy-MM-dd}";
        if (!string.IsNullOrEmpty(projectId))
        {
            var project = await _context.Projects.FindAsync(Guid.Parse(projectId));
            fileName += $"-{project?.Code ?? "project"}";
        }
        fileName += ".csv";

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", fileName);
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
    public string WeekEndDate { get; set; } = string.Empty;
    
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
    public string ClientName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AvailableEmployeeDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
