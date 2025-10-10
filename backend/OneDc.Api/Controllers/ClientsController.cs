using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Domain.Entities;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly OneDcDbContext _context;

    public ClientsController(OneDcDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var clients = await _context.Clients.AsNoTracking().ToListAsync();
        return Ok(clients);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.ClientId == id);
        return client is null ? NotFound() : Ok(client);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Client client)
    {
        client.ClientId = Guid.NewGuid();
        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = client.ClientId }, client);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Client client)
    {
        var existingClient = await _context.Clients.FirstOrDefaultAsync(c => c.ClientId == id);
        if (existingClient is null) return NotFound();

        // Update only the provided fields
        existingClient.Name = client.Name;
        existingClient.Code = client.Code;
        existingClient.ContactPerson = client.ContactPerson;
        existingClient.Email = client.Email;
        existingClient.ContactNumber = client.ContactNumber;
        existingClient.Country = client.Country;
        existingClient.State = client.State;
        existingClient.City = client.City;
        existingClient.ZipCode = client.ZipCode;
        existingClient.Status = client.Status;

        await _context.SaveChangesAsync();
        return Ok(existingClient);
    }

    [HttpGet("{id:guid}/dependencies")]
    public async Task<IActionResult> CheckDependencies(Guid id)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.ClientId == id);
        if (client is null) return NotFound();

        var projectCount = await _context.Projects.CountAsync(p => p.ClientId == id);
        var projects = projectCount > 0 ? await _context.Projects
            .Where(p => p.ClientId == id)
            .Select(p => new { p.ProjectId, p.Name, p.Status })
            .Take(5) // Limit to first 5 for display
            .ToListAsync() : null;
        
        return Ok(new
        {
            canDelete = projectCount == 0,
            dependencies = new
            {
                projectCount = projectCount,
                projects = projects
            },
            message = projectCount > 0 
                ? $"Cannot delete client. {projectCount} project(s) are associated with this client."
                : "Client can be safely deleted."
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.ClientId == id);
        if (client is null) return NotFound();

        // Check if client has any associated projects
        var hasProjects = await _context.Projects.AnyAsync(p => p.ClientId == id);
        if (hasProjects)
        {
            return BadRequest(new { 
                message = "Cannot delete client. Please remove or reassign all associated projects before deleting this client.",
                errorCode = "FOREIGN_KEY_CONSTRAINT",
                details = "This client has active projects that must be handled first."
            });
        }

        try
        {
            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("foreign key constraint") == true)
        {
            return BadRequest(new { 
                message = "Cannot delete client due to existing dependencies. Please check for any associated projects, allocations, or other related data.",
                errorCode = "FOREIGN_KEY_CONSTRAINT",
                details = ex.InnerException.Message
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "An error occurred while deleting the client.",
                details = ex.Message
            });
        }
    }
}
