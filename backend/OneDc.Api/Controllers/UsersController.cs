using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Repository.Interfaces;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;

namespace OneDc.Api.Controllers;

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string FirstName { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string LastName { get; set; } = null!;
    
    [Required]
    public UserRole Role { get; set; } = UserRole.EMPLOYEE;
    
    public Guid? ManagerId { get; set; }
}

public class UpdateUserRequest
{
    [Required]
    [MinLength(2)]
    public string FirstName { get; set; } = null!;
    
    [Required]
    [MinLength(2)]
    public string LastName { get; set; } = null!;
    
    [Required]
    public UserRole Role { get; set; }
    
    public bool IsActive { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IComplianceRepository _repo;
    private readonly IEmailService _emailService;
    private const int IterationCount = 10000;
    private const string DefaultPassword = "changeme@123";

    public UsersController(IComplianceRepository repo, IEmailService emailService)
    {
        _repo = repo;
        _emailService = emailService;
    }

    // GET api/users
    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] bool activeOnly = false)
    {
        if (activeOnly)
        {
            var activeUsers = await _repo.GetActiveUsersAsync();
            return Ok(activeUsers);
        }
        
        var allUsers = await _repo.GetAllUsersAsync();
        return Ok(allUsers);
    }

    // GET api/users/{userId}
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUserById(Guid userId)
    {
        var user = await _repo.GetUserByIdAsync(userId);
        if (user == null)
        {
            return NotFound($"User with ID {userId} not found");
        }
        return Ok(user);
    }

    // GET api/users/by-role/{role}
    [HttpGet("by-role/{role}")]
    public async Task<IActionResult> GetUsersByRole(UserRole role)
    {
        try
        {
            var users = await _repo.GetUsersByRoleAsync(role);
            return Ok(users);
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to get users by role: {ex.Message}");
        }
    }

    // POST api/users
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var newUser = new AppUser
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                WorkEmail = request.Email, // Set work email same as email
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = request.Role,
                ManagerId = request.ManagerId,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                PasswordHash = HashPassword(DefaultPassword) // Set default password
            };

            var createdUser = await _repo.CreateUserAsync(newUser);

            // Send welcome email with default password
            try
            {
                var userName = $"{createdUser.FirstName} {createdUser.LastName}";
                await _emailService.SendWelcomeEmailAsync(
                    createdUser.Email, 
                    userName, 
                    DefaultPassword
                );
            }
            catch (Exception emailEx)
            {
                // Log email error but don't fail user creation
                Console.WriteLine($"Failed to send welcome email: {emailEx.Message}");
            }

            return CreatedAtAction(nameof(GetUserById), new { userId = createdUser.UserId }, createdUser);
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to create user: {ex.Message}");
        }
    }

    // PUT api/users/{userId}
    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var existingUser = await _repo.GetUserByIdAsync(userId);
            if (existingUser == null)
            {
                return NotFound($"User with ID {userId} not found");
            }

            existingUser.FirstName = request.FirstName;
            existingUser.LastName = request.LastName;
            existingUser.Role = request.Role;
            existingUser.IsActive = request.IsActive;

            var updatedUser = await _repo.UpdateUserAsync(existingUser);
            return Ok(updatedUser);
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to update user: {ex.Message}");
        }
    }

    // PATCH api/users/{userId}/toggle-status
    [HttpPatch("{userId}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid userId)
    {
        try
        {
            var user = await _repo.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound($"User with ID {userId} not found");
            }

            user.IsActive = !user.IsActive;
            await _repo.UpdateUserAsync(user);
            
            return Ok(new { message = $"User status changed to {(user.IsActive ? "active" : "inactive")}" });
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to toggle user status: {ex.Message}");
        }
    }

    // DELETE api/users/{userId}
    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        try
        {
            var user = await _repo.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound($"User with ID {userId} not found");
            }

            // Soft delete by setting isActive to false
            user.IsActive = false;
            await _repo.UpdateUserAsync(user);
            
            return Ok(new { message = "User deleted successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to delete user: {ex.Message}");
        }
    }

    private string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[32];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, IterationCount, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        return $"{IterationCount}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
