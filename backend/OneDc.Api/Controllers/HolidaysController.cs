using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HolidaysController : ControllerBase
{
    private readonly IComplianceRepository _repository;

    public HolidaysController(IComplianceRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetHolidays([FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null, [FromQuery] string? region = null)
    {
        try
        {
            var fromDate = from ?? DateOnly.FromDateTime(DateTime.Now.AddYears(-1));
            var toDate = to ?? DateOnly.FromDateTime(DateTime.Now.AddYears(1));
            
            var holidays = await _repository.GetHolidaysAsync(fromDate, toDate, region);
            return Ok(holidays);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving holidays", error = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateHoliday([FromBody] Holiday holiday)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(holiday.Name))
            {
                return BadRequest(new { message = "Holiday name is required" });
            }

            if (string.IsNullOrWhiteSpace(holiday.Region))
            {
                holiday.Region = "IN";
            }

            await _repository.AddHolidayAsync(holiday);
            return CreatedAtAction(nameof(GetHolidays), new { }, holiday);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating holiday", error = ex.Message });
        }
    }

    [HttpPut("{date}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateHoliday(DateOnly date, [FromBody] Holiday holiday)
    {
        try
        {
            if (date != holiday.HolidayDate)
            {
                return BadRequest(new { message = "Holiday date in URL must match the holiday data" });
            }

            var updated = await _repository.UpdateHolidayAsync(holiday);
            if (!updated)
            {
                return NotFound(new { message = "Holiday not found" });
            }

            return Ok(holiday);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating holiday", error = ex.Message });
        }
    }

    [HttpDelete("{date}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteHoliday(DateOnly date, [FromQuery] string? region = null)
    {
        try
        {
            var deleted = await _repository.DeleteHolidayAsync(date, region);
            if (!deleted)
            {
                return NotFound(new { message = "Holiday not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting holiday", error = ex.Message });
        }
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> BulkCreateHolidays([FromBody] List<Holiday> holidays)
    {
        try
        {
            if (holidays == null || holidays.Count == 0)
            {
                return BadRequest(new { message = "No holidays provided" });
            }

            // Set default region if not provided
            foreach (var holiday in holidays)
            {
                if (string.IsNullOrWhiteSpace(holiday.Region))
                {
                    holiday.Region = "IN";
                }
            }

            var result = await _repository.BulkAddHolidaysAsync(holidays);
            return Ok(new { message = $"Successfully added {result} holidays", count = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating holidays in bulk", error = ex.Message });
        }
    }
}
