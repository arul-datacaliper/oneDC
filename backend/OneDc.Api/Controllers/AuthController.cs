using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace OneDc.Api.Controllers;

public record LoginRequest([Required] string Email, [Required] string Password);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (result == null) return Unauthorized("Invalid credentials");

        return Ok(result);
    }

    [HttpPost("set-password")]
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
}

public record SetPasswordRequest([Required] Guid UserId, [Required] string Password);
