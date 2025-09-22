using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PasswordResetController : ControllerBase
{
    private readonly IPasswordResetService _passwordResetService;
    private readonly ILogger<PasswordResetController> _logger;

    public PasswordResetController(IPasswordResetService passwordResetService, ILogger<PasswordResetController> logger)
    {
        _passwordResetService = passwordResetService;
        _logger = logger;
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _passwordResetService.GeneratePasswordResetOtpAsync(request.Email);
            
            // Always return success for security - don't reveal if email exists
            return Ok(new { message = "If the email exists, a password reset OTP will be sent." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing forgot password request for email {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred while processing your request." });
        }
    }

    [HttpPost("validate-otp")]
    public async Task<IActionResult> ValidateOtp([FromBody] ValidateOtpRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var isValid = await _passwordResetService.ValidateOtpAsync(request.Email, request.Otp);
            
            if (isValid)
            {
                return Ok(new { message = "OTP is valid.", isValid = true });
            }
            else
            {
                return BadRequest(new { message = "Invalid or expired OTP.", isValid = false });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating OTP for email {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred while validating the OTP." });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _passwordResetService.ResetPasswordAsync(request.Email, request.Otp, request.NewPassword);
            
            if (result)
            {
                return Ok(new { message = "Password has been reset successfully." });
            }
            else
            {
                return BadRequest(new { message = "Invalid OTP or password reset failed." });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for email {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred while resetting the password." });
        }
    }

    [HttpPost("resend-otp")]
    public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Check if there's a valid OTP first
            var validOtp = await _passwordResetService.GetValidOtpAsync(request.Email, "000000"); // dummy check
            if (validOtp == null)
            {
                return BadRequest(new { message = "No active password reset request found." });
            }

            // Generate new OTP
            var result = await _passwordResetService.GeneratePasswordResetOtpAsync(request.Email);
            
            if (!string.IsNullOrEmpty(result))
            {
                return Ok(new { message = "A new OTP has been sent to your email." });
            }
            else
            {
                return BadRequest(new { message = "Failed to send OTP. Please try again." });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending OTP for email {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred while resending the OTP." });
        }
    }
}

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
}

public class ValidateOtpRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Otp { get; set; } = null!;
}

public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Otp { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = null!;
}

public class ResendOtpRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;
}
