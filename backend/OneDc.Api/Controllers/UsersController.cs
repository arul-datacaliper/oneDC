using Microsoft.AspNetCore.Mvc;
using OneDc.Repository.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IComplianceRepository _repo;

    public UsersController(IComplianceRepository repo)
    {
        _repo = repo;
    }

    // GET api/users?activeOnly=true
    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] bool activeOnly = true)
    {
        if (activeOnly)
        {
            var activeUsers = await _repo.GetActiveUsersAsync();
            return Ok(activeUsers);
        }
        
        // For now, we only support active users
        // If you need all users, you'd need to add a method to get all users
        var users = await _repo.GetActiveUsersAsync();
        return Ok(users);
    }
}
