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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var client = await _context.Clients.FirstOrDefaultAsync(c => c.ClientId == id);
        if (client is null) return NotFound();

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
