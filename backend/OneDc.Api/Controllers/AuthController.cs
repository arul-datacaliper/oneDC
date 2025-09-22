using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

public record LoginRequest([Required] string Email, [Required] string Password);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IEmailService _emailService;

    public AuthController(IAuthService authService, IEmailService emailService)
    {
        _authService = authService;
        _emailService = emailService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (result == null) return Unauthorized("Invalid credentials");

        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        try
        {
            // For now, we'll just return success since JWT tokens are stateless
            // In the future, we could implement a token blacklist here
            
            // Get user info from token for logging
            var userId = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
            var userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
            
            // Log the logout event (optional)
            Console.WriteLine($"User logout: {userEmail} (ID: {userId}) at {DateTime.UtcNow}");
            
            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during logout: {ex.Message}");
            return Ok(new { message = "Logged out successfully" }); // Still return success for security
        }
    }

    [HttpPost("set-password")]
    [AllowAnonymous]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        try
        {
            await _authService.SetPasswordAsync(request.UserId, request.Password);
            return Ok(new { message = "Password set successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            // Get the current user's ID from the JWT token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user token");
            }

            // Verify current password before allowing change
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (userEmail == null)
            {
                return Unauthorized("Invalid user token");
            }

            // Verify current password
            var loginResult = await _authService.LoginAsync(userEmail, request.CurrentPassword);
            if (loginResult == null)
            {
                return BadRequest("Current password is incorrect");
            }

            // Set new password
            await _authService.SetPasswordAsync(userId, request.NewPassword);
            
            // Send notification email about password change
            try
            {
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? userEmail;
                await _emailService.SendPasswordChangedNotificationAsync(userEmail, userName);
            }
            catch (Exception emailEx)
            {
                // Log email error but don't fail password change
                Console.WriteLine($"Failed to send password change notification: {emailEx.Message}");
            }

            return Ok(new { message = "Password changed successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to change password: {ex.Message}");
        }
    }
}

public record SetPasswordRequest([Required] Guid UserId, [Required] string Password);
public record ChangePasswordRequest([Required] string CurrentPassword, [Required] string NewPassword);
