using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;

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
    
    // Manager assignment
    public Guid? ManagerId { get; set; }
    
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
    
    // Manager assignment
    public Guid? ManagerId { get; set; }
    
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
    private readonly IEmailService _emailService;

    public EmployeesController(OneDcDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
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
    public async Task<IActionResult> GetAllEmployees([FromQuery] string status = "active")
    {
        try
        {
            var query = _context.AppUsers.AsQueryable();
            
            // Filter based on status: "active", "inactive", or "all"
            switch (status.ToLower())
            {
                case "active":
                    query = query.Where(u => u.IsActive);
                    break;
                case "inactive":
                    query = query.Where(u => !u.IsActive);
                    break;
                case "all":
                    // No filter, include both active and inactive
                    break;
                default:
                    // Default to active only
                    query = query.Where(u => u.IsActive);
                    break;
            }
            
            var employees = await query
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

    // GET api/employees/inactive
    [HttpGet("inactive")]
    public async Task<IActionResult> GetInactiveEmployees()
    {
        try
        {
            var inactiveEmployees = await _context.AppUsers
                .Where(u => !u.IsActive)
                .OrderBy(u => u.FirstName)
                .ToListAsync();

            return Ok(inactiveEmployees);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving inactive employees", error = ex.Message });
        }
    }

    // GET api/employees/counts
    [HttpGet("counts")]
    public async Task<IActionResult> GetEmployeeCounts()
    {
        try
        {
            var activeCount = await _context.AppUsers.CountAsync(u => u.IsActive);
            var inactiveCount = await _context.AppUsers.CountAsync(u => !u.IsActive);
            var totalCount = await _context.AppUsers.CountAsync();

            return Ok(new
            {
                active = activeCount,
                inactive = inactiveCount,
                total = totalCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employee counts", error = ex.Message });
        }
    }

    // GET api/employees/{id}
    [HttpGet("{id:guid}")]
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
            
            // Generate temporary password for new employee
            var temporaryPassword = GenerateTemporaryPassword();
            var hashedPassword = HashPassword(temporaryPassword);

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
                ManagerId = request.ManagerId, // Add manager assignment
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
                PasswordHash = hashedPassword, // Set the hashed password
                MustChangePassword = true, // Force password change on first login
                IsActive = request.IsActive,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.AppUsers.Add(newEmployee);
            await _context.SaveChangesAsync();

            // Send manager assignment notification if a manager is assigned
            if (request.ManagerId.HasValue)
            {
                var manager = await _context.AppUsers
                    .FirstOrDefaultAsync(u => u.UserId == request.ManagerId.Value);
                
                if (manager != null)
                {
                    var employeeEmail = request.WorkEmail;
                    var employeeName = $"{request.FirstName} {request.LastName}";
                    var managerName = $"{manager.FirstName} {manager.LastName}";
                    var managerEmail = manager.WorkEmail ?? manager.Email;
                    
                    // Send notification email (don't await to avoid blocking the response)
                    _ = Task.Run(async () => 
                    {
                        try
                        {
                            await _emailService.SendManagerAssignmentNotificationAsync(
                                employeeEmail, employeeName, managerName, managerEmail);
                        }
                        catch (Exception emailEx)
                        {
                            // Log the error but don't fail the employee creation
                            Console.WriteLine($"Failed to send manager assignment email: {emailEx.Message}");
                        }
                    });
                }
            }

            // Send welcome email with temporary password (don't await to avoid blocking the response)
            _ = Task.Run(async () => 
            {
                try
                {
                    var employeeName = $"{request.FirstName} {request.LastName}";
                    await _emailService.SendWelcomeEmailAsync(
                        request.WorkEmail, employeeName, temporaryPassword);
                }
                catch (Exception emailEx)
                {
                    // Log the error but don't fail the employee creation
                    Console.WriteLine($"Failed to send welcome email: {emailEx.Message}");
                }
            });

            return CreatedAtAction(nameof(GetEmployeeById), new { id = newEmployee.UserId }, newEmployee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating employee", error = ex.Message });
        }
    }

    // PUT api/employees/{id}
    [HttpPut("{id:guid}")]
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

            // Check if manager has changed
            var oldManagerId = existingEmployee.ManagerId;
            var newManagerId = request.ManagerId;
            var managerChanged = oldManagerId != newManagerId;

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
            existingEmployee.ManagerId = request.ManagerId; // Update manager assignment
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

            // Send manager assignment notification if manager changed and new manager assigned
            if (managerChanged && newManagerId.HasValue)
            {
                var newManager = await _context.AppUsers
                    .FirstOrDefaultAsync(u => u.UserId == newManagerId.Value);
                
                if (newManager != null)
                {
                    var employeeEmail = existingEmployee.WorkEmail ?? existingEmployee.Email;
                    var employeeName = $"{existingEmployee.FirstName} {existingEmployee.LastName}";
                    var managerName = $"{newManager.FirstName} {newManager.LastName}";
                    var managerEmail = newManager.WorkEmail ?? newManager.Email;
                    
                    // Send notification email (don't await to avoid blocking the response)
                    _ = Task.Run(async () => 
                    {
                        try
                        {
                            await _emailService.SendManagerAssignmentNotificationAsync(
                                employeeEmail, employeeName, managerName, managerEmail);
                        }
                        catch (Exception emailEx)
                        {
                            // Log the error but don't fail the employee update
                            Console.WriteLine($"Failed to send manager assignment email: {emailEx.Message}");
                        }
                    });
                }
            }

            return Ok(existingEmployee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating employee", error = ex.Message });
        }
    }

    // DELETE api/employees/{id}
    [HttpDelete("{id:guid}")]
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

    // PUT api/employees/{id}/reactivate
    [HttpPut("{id:guid}/reactivate")]
    public async Task<IActionResult> ReactivateEmployee(Guid id)
    {
        try
        {
            var employee = await _context.AppUsers
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (employee == null)
            {
                return NotFound($"Employee with ID {id} not found");
            }

            if (employee.IsActive)
            {
                return BadRequest(new { message = "Employee is already active" });
            }

            // Reactivate by setting isActive to true
            employee.IsActive = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee reactivated successfully", employee });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error reactivating employee", error = ex.Message });
        }
    }

    [HttpGet("{userId:guid}/dashboard-metrics")]
    public async Task<IActionResult> GetEmployeeDashboardMetrics(Guid userId, [FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate)
    {
        try
        {
            // Get assigned tasks count from ProjectTasks table
            var assignedTasksCount = await _context.ProjectTasks
                .Where(pt => pt.AssignedUserId == userId)
                .CountAsync();

            // Get timesheet data for hours calculation with date range filtering
            IQueryable<TimesheetEntry> timesheetQuery = _context.TimesheetEntries
                .Where(t => t.UserId == userId);

            // Apply date range filter if provided
            if (startDate.HasValue && endDate.HasValue)
            {
                timesheetQuery = timesheetQuery.Where(t => t.WorkDate >= startDate.Value && t.WorkDate <= endDate.Value);
            }
            else if (startDate.HasValue)
            {
                timesheetQuery = timesheetQuery.Where(t => t.WorkDate >= startDate.Value);
            }
            else
            {
                // Default to last 30 days if no date range provided
                var now = DateTime.UtcNow;
                var thirtyDaysAgo = DateOnly.FromDateTime(now.AddDays(-30));
                timesheetQuery = timesheetQuery.Where(t => t.WorkDate >= thirtyDaysAgo);
            }

            var timesheets = await timesheetQuery.ToListAsync();

            var totalSubmittedHours = timesheets.Sum(t => t.Hours);
            var totalApprovedHours = timesheets.Where(t => t.Status == TimesheetStatus.APPROVED).Sum(t => t.Hours);

            var metrics = new
            {
                TotalAssignedTasks = assignedTasksCount,
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

    [HttpGet("{userId:guid}/tasks")]
    public async Task<IActionResult> GetAssignedTasks(Guid userId)
    {
        try
        {
            // Get actual assigned tasks from ProjectTasks table
            var tasks = await _context.ProjectTasks
                .Include(pt => pt.Project)
                .Include(pt => pt.AssignedUser)
                .Where(pt => pt.AssignedUserId == userId)
                .OrderByDescending(pt => pt.CreatedAt)
                .ToListAsync();

            var result = tasks.Select(task => new
            {
                TaskId = task.TaskId.ToString(),
                TaskName = task.Title,
                ProjectName = task.Project?.Name ?? "Unknown Project",
                Status = task.Status.ToString(),
                ManagerName = GetManagerName(task.Project?.DefaultApprover),
                StartDate = task.StartDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                EndDate = task.EndDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.AddDays(7).ToString("yyyy-MM-dd"),
                Description = task.Description,
                Priority = "Medium", // Default priority, can be enhanced later
                EstimatedHours = task.EstimatedHours
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

            var allocations = await _context.WeeklyAllocations
                .Include(wa => wa.Project)
                .Where(wa => wa.UserId == userId && wa.Status == "ACTIVE")
                .ToListAsync();

            // Group timesheets by project to calculate utilization
            var projectGroups = timesheets
                .GroupBy(t => t.ProjectId)
                .Select(g => {
                    var project = g.First().Project;
                    var allocation = allocations.FirstOrDefault(a => a.ProjectId == g.Key);
                    var allocatedHours = (double)(allocation?.AllocatedHours ?? 0); // Use weekly allocated hours
                    var workedHours = g.Sum(t => t.Hours);
                    
                    return new
                    {
                        ProjectId = g.Key.ToString(),
                        ProjectName = project?.Name ?? "Unknown Project",
                        TotalAllocatedHours = allocatedHours,
                        TotalWorkedHours = (double)workedHours,
                        UtilizationPercentage = allocatedHours > 0 ? Math.Round(((double)workedHours / allocatedHours) * 100, 1) : 0,
                        Status = allocation?.Status ?? "Active",
                        StartDate = allocation?.WeekStartDate.ToString("yyyy-MM-dd") ?? "",
                        EndDate = allocation?.WeekEndDate.ToString("yyyy-MM-dd") ?? "",
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

    // Helper method to generate a temporary password
    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        const string specialChars = "!@#$%";
        
        using var rng = RandomNumberGenerator.Create();
        
        // Generate 6 alphanumeric characters
        var alphanumeric = new char[6];
        for (int i = 0; i < 6; i++)
        {
            var randomBytes = new byte[4];
            rng.GetBytes(randomBytes);
            var randomInt = BitConverter.ToUInt32(randomBytes, 0);
            alphanumeric[i] = chars[(int)(randomInt % chars.Length)];
        }
        
        // Add 2 special characters
        var special = new char[2];
        for (int i = 0; i < 2; i++)
        {
            var randomBytes = new byte[4];
            rng.GetBytes(randomBytes);
            var randomInt = BitConverter.ToUInt32(randomBytes, 0);
            special[i] = specialChars[(int)(randomInt % specialChars.Length)];
        }
        
        // Combine and shuffle
        var password = new string(alphanumeric) + new string(special);
        var passwordArray = password.ToCharArray();
        
        // Shuffle the password
        for (int i = passwordArray.Length - 1; i > 0; i--)
        {
            var randomBytes = new byte[4];
            rng.GetBytes(randomBytes);
            var randomInt = BitConverter.ToUInt32(randomBytes, 0);
            var j = (int)(randomInt % (i + 1));
            (passwordArray[i], passwordArray[j]) = (passwordArray[j], passwordArray[i]);
        }
        
        return new string(passwordArray);
    }

    // Helper method to hash password (same as AuthService)
    private static string HashPassword(string password)
    {
        const int iterations = 10000;
        
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[32];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        return $"{iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
