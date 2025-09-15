using Microsoft.AspNetCore.Mvc;
using OneDc.Domain.Entities;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OnboardingController : ControllerBase
{
    private readonly IOnboardingService _onboardingService;

    public OnboardingController(IOnboardingService onboardingService)
    {
        _onboardingService = onboardingService;
    }

    // GET api/onboarding/profile/{userId}
    [HttpGet("profile/{userId}")]
    public async Task<IActionResult> GetUserProfile(Guid userId)
    {
        var profile = await _onboardingService.GetUserProfileAsync(userId);
        return profile == null ? NotFound() : Ok(profile);
    }

    // POST api/onboarding/profile/{userId}
    [HttpPost("profile/{userId}")]
    public async Task<IActionResult> CreateUserProfile(Guid userId, [FromBody] CreateUserProfileRequest request)
    {
        try
        {
            var profile = await _onboardingService.CreateUserProfileAsync(userId, request);
            return CreatedAtAction(nameof(GetUserProfile), new { userId }, profile);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    // PUT api/onboarding/profile/{userId}
    [HttpPut("profile/{userId}")]
    public async Task<IActionResult> UpdateUserProfile(Guid userId, [FromBody] UpdateUserProfileRequest request)
    {
        try
        {
            var profile = await _onboardingService.UpdateUserProfileAsync(userId, request);
            return Ok(profile);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // DELETE api/onboarding/profile/{userId}
    [HttpDelete("profile/{userId}")]
    public async Task<IActionResult> DeleteUserProfile(Guid userId)
    {
        await _onboardingService.DeleteUserProfileAsync(userId);
        return NoContent();
    }

    // POST api/onboarding/profile/{userId}/photo
    [HttpPost("profile/{userId}/photo")]
    public async Task<IActionResult> UploadProfilePhoto(Guid userId, IFormFile photo)
    {
        if (photo == null || photo.Length == 0)
            return BadRequest("No file uploaded");

        if (photo.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest("File size cannot exceed 5MB");

        try
        {
            using var stream = photo.OpenReadStream();
            var photoUrl = await _onboardingService.UploadProfilePhotoAsync(
                userId, stream, photo.FileName, photo.ContentType);
            
            return Ok(new { PhotoUrl = photoUrl });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // DELETE api/onboarding/profile/{userId}/photo
    [HttpDelete("profile/{userId}/photo")]
    public async Task<IActionResult> DeleteProfilePhoto(Guid userId)
    {
        await _onboardingService.DeleteProfilePhotoAsync(userId);
        return NoContent();
    }

    // GET api/onboarding/skills/{userId}
    [HttpGet("skills/{userId}")]
    public async Task<IActionResult> GetUserSkills(Guid userId)
    {
        var skills = await _onboardingService.GetUserSkillsAsync(userId);
        return Ok(skills);
    }

    // POST api/onboarding/skills/{userId}
    [HttpPost("skills/{userId}")]
    public async Task<IActionResult> CreateUserSkill(Guid userId, [FromBody] CreateUserSkillRequest request)
    {
        try
        {
            var skill = await _onboardingService.CreateUserSkillAsync(userId, request);
            return CreatedAtAction(nameof(GetUserSkills), new { userId }, skill);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    // PUT api/onboarding/skills/{userId}/{skillId}
    [HttpPut("skills/{userId}/{skillId}")]
    public async Task<IActionResult> UpdateUserSkill(Guid userId, Guid skillId, [FromBody] UpdateUserSkillRequest request)
    {
        try
        {
            var skill = await _onboardingService.UpdateUserSkillAsync(userId, skillId, request);
            return Ok(skill);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    // DELETE api/onboarding/skills/{userId}/{skillId}
    [HttpDelete("skills/{userId}/{skillId}")]
    public async Task<IActionResult> DeleteUserSkill(Guid userId, Guid skillId)
    {
        try
        {
            await _onboardingService.DeleteUserSkillAsync(userId, skillId);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // GET api/onboarding/status/{userId}
    [HttpGet("status/{userId}")]
    public async Task<IActionResult> GetOnboardingStatus(Guid userId)
    {
        var status = await _onboardingService.GetOnboardingStatusAsync(userId);
        return Ok(status);
    }

    // POST api/onboarding/complete/{userId}
    [HttpPost("complete/{userId}")]
    public async Task<IActionResult> CompleteOnboarding(Guid userId)
    {
        var completed = await _onboardingService.CompleteOnboardingAsync(userId);
        return Ok(new { Completed = completed });
    }

    // GET api/onboarding/admin/status
    [HttpGet("admin/status")]
    public async Task<IActionResult> GetAllUsersOnboardingStatus()
    {
        var statuses = await _onboardingService.GetAllUsersOnboardingStatusAsync();
        return Ok(statuses);
    }

    // GET api/onboarding/skill-levels
    [HttpGet("skill-levels")]
    public IActionResult GetSkillLevels()
    {
        var skillLevels = Enum.GetValues<SkillLevel>()
            .Select(level => new { 
                Value = (int)level, 
                Name = level.ToString(),
                DisplayName = level switch
                {
                    SkillLevel.Beginner => "Beginner (< 1 year)",
                    SkillLevel.Intermediate => "Intermediate (1-3 years)",
                    SkillLevel.Advanced => "Advanced (3-7 years)",
                    SkillLevel.Expert => "Expert (7+ years)",
                    _ => level.ToString()
                }
            });
        
        return Ok(skillLevels);
    }
}
