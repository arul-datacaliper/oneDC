using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace OneDc.Api.Controllers;

public class CreateEmployeeRequest
{
    [Required]
    [EmailAddress]
    public string WorkEmail { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string FirstName { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string LastName { get; set; } = null!;
    
    [Required]
    public UserRole Role { get; set; } = UserRole.EMPLOYEE;
    
    public Gender? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly? DateOfJoining { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public EmployeeType EmployeeType { get; set; } = EmployeeType.FULL_TIME;
    public string? PersonalEmail { get; set; }
    public string? ContactNumber { get; set; }
    public string? EmergencyContactNumber { get; set; }
    
    // Present Address
    public string? PresentAddressLine1 { get; set; }
    public string? PresentAddressLine2 { get; set; }
    public string? PresentCity { get; set; }
    public string? PresentState { get; set; }
    public string? PresentCountry { get; set; }
    public string? PresentZipCode { get; set; }
    
    // Permanent Address
    public string? PermanentAddressLine1 { get; set; }
    public string? PermanentAddressLine2 { get; set; }
    public string? PermanentCity { get; set; }
    public string? PermanentState { get; set; }
    public string? PermanentCountry { get; set; }
    public string? PermanentZipCode { get; set; }
    
    public bool IsActive { get; set; } = true;
}

public class UpdateEmployeeRequest
{
    [Required]
    [MinLength(2)]
    public string FirstName { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string LastName { get; set; } = null!;
    
    [Required]
    public UserRole Role { get; set; }
    
    public Gender? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly? DateOfJoining { get; set; }
    public string? EmployeeId { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public EmployeeType EmployeeType { get; set; }
    public string? PersonalEmail { get; set; }
    public string? WorkEmail { get; set; }
    public string? ContactNumber { get; set; }
    public string? EmergencyContactNumber { get; set; }
    
    // Present Address
    public string? PresentAddressLine1 { get; set; }
    public string? PresentAddressLine2 { get; set; }
    public string? PresentCity { get; set; }
    public string? PresentState { get; set; }
    public string? PresentCountry { get; set; }
    public string? PresentZipCode { get; set; }
    
    // Permanent Address
    public string? PermanentAddressLine1 { get; set; }
    public string? PermanentAddressLine2 { get; set; }
    public string? PermanentCity { get; set; }
    public string? PermanentState { get; set; }
    public string? PermanentCountry { get; set; }
    public string? PermanentZipCode { get; set; }
    
    public bool IsActive { get; set; }
}

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

    // Helper method to generate next employee ID
    private async Task<string> GenerateNextEmployeeIdAsync()
    {
        var lastEmployee = await _context.AppUsers
            .Where(u => !string.IsNullOrEmpty(u.EmployeeId) && u.EmployeeId.StartsWith("DC"))
            .OrderByDescending(u => u.EmployeeId)
            .FirstOrDefaultAsync();

        if (lastEmployee == null || string.IsNullOrEmpty(lastEmployee.EmployeeId))
        {
            return "DC001";
        }

        // Extract number from last employee ID (e.g., "DC005" -> 5)
        var lastIdNumber = lastEmployee.EmployeeId.Substring(2);
        if (int.TryParse(lastIdNumber, out int number))
        {
            return $"DC{(number + 1):D3}"; // Format as DC001, DC002, etc.
        }

        return "DC001";
    }

    // GET api/employees
    [HttpGet]
    public async Task<IActionResult> GetAllEmployees()
    {
        try
        {
            var employees = await _context.AppUsers
                .Where(u => u.IsActive)
                .OrderBy(u => u.FirstName)
                .ToListAsync();

            // Log the first employee to see the structure
            if (employees.Any())
            {
                var firstEmployee = employees.First();
                Console.WriteLine($"Sample employee data: UserId={firstEmployee.UserId}, " +
                    $"PresentAddressLine1={firstEmployee.PresentAddressLine1}, " +
                    $"PermanentAddressLine1={firstEmployee.PermanentAddressLine1}");
            }

            return Ok(employees);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employees", error = ex.Message });
        }
    }

    // GET api/employees/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployeeById(Guid id)
    {
        try
        {
            var employee = await _context.AppUsers
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (employee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            return Ok(employee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employee", error = ex.Message });
        }
    }

    // POST api/employees
    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Generate the next employee ID
            var employeeId = await GenerateNextEmployeeIdAsync();

            var newEmployee = new AppUser
            {
                UserId = Guid.NewGuid(),
                EmployeeId = employeeId,
                Email = request.WorkEmail,
                WorkEmail = request.WorkEmail,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = request.Role,
                Gender = request.Gender,
                DateOfBirth = request.DateOfBirth,
                DateOfJoining = request.DateOfJoining,
                JobTitle = request.JobTitle,
                Department = request.Department,
                EmployeeType = request.EmployeeType,
                PersonalEmail = request.PersonalEmail,
                ContactNumber = request.ContactNumber,
                EmergencyContactNumber = request.EmergencyContactNumber,
                PresentAddressLine1 = request.PresentAddressLine1,
                PresentAddressLine2 = request.PresentAddressLine2,
                PresentCity = request.PresentCity,
                PresentState = request.PresentState,
                PresentCountry = request.PresentCountry,
                PresentZipCode = request.PresentZipCode,
                PermanentAddressLine1 = request.PermanentAddressLine1,
                PermanentAddressLine2 = request.PermanentAddressLine2,
                PermanentCity = request.PermanentCity,
                PermanentState = request.PermanentState,
                PermanentCountry = request.PermanentCountry,
                PermanentZipCode = request.PermanentZipCode,
                IsActive = request.IsActive,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.AppUsers.Add(newEmployee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployeeById), new { id = newEmployee.UserId }, newEmployee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating employee", error = ex.Message });
        }
    }

    // PUT api/employees/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var existingEmployee = await _context.AppUsers
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (existingEmployee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            // Update employee properties
            existingEmployee.FirstName = request.FirstName;
            existingEmployee.LastName = request.LastName;
            existingEmployee.Role = request.Role;
            existingEmployee.Gender = request.Gender;
            existingEmployee.DateOfBirth = request.DateOfBirth;
            existingEmployee.DateOfJoining = request.DateOfJoining;
            existingEmployee.JobTitle = request.JobTitle;
            existingEmployee.Department = request.Department;
            existingEmployee.EmployeeType = request.EmployeeType;
            existingEmployee.PersonalEmail = request.PersonalEmail;
            existingEmployee.ContactNumber = request.ContactNumber;
            existingEmployee.EmergencyContactNumber = request.EmergencyContactNumber;
            existingEmployee.PresentAddressLine1 = request.PresentAddressLine1;
            existingEmployee.PresentAddressLine2 = request.PresentAddressLine2;
            existingEmployee.PresentCity = request.PresentCity;
            existingEmployee.PresentState = request.PresentState;
            existingEmployee.PresentCountry = request.PresentCountry;
            existingEmployee.PresentZipCode = request.PresentZipCode;
            existingEmployee.PermanentAddressLine1 = request.PermanentAddressLine1;
            existingEmployee.PermanentAddressLine2 = request.PermanentAddressLine2;
            existingEmployee.PermanentCity = request.PermanentCity;
            existingEmployee.PermanentState = request.PermanentState;
            existingEmployee.PermanentCountry = request.PermanentCountry;
            existingEmployee.PermanentZipCode = request.PermanentZipCode;
            existingEmployee.IsActive = request.IsActive;

            // Update work email if provided
            if (!string.IsNullOrEmpty(request.WorkEmail))
            {
                existingEmployee.WorkEmail = request.WorkEmail;
                existingEmployee.Email = request.WorkEmail; // Keep Email in sync with WorkEmail
            }

            await _context.SaveChangesAsync();

            return Ok(existingEmployee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating employee", error = ex.Message });
        }
    }

    // DELETE api/employees/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(Guid id)
    {
        try
        {
            var employee = await _context.AppUsers
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (employee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            // Soft delete by setting isActive to false
            employee.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting employee", error = ex.Message });
        }
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
