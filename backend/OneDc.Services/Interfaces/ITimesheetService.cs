using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces;

public record TimesheetCreateDto(Guid ProjectId, DateOnly WorkDate, decimal Hours, string? Description, string? TicketRef, Guid? TaskId);
public record TimesheetUpdateDto(decimal Hours, string? Description, string? TicketRef, Guid? TaskId);

public interface ITimesheetService
{
    Task<IEnumerable<TimesheetEntry>> GetMineAsync(Guid userId, DateOnly from, DateOnly to);
    Task<TimesheetEntry> CreateDraftAsync(Guid userId, TimesheetCreateDto dto);
    Task<TimesheetEntry> UpdateDraftAsync(Guid userId, Guid entryId, TimesheetUpdateDto dto);
    Task<TimesheetEntry> SubmitAsync(Guid userId, Guid entryId);
}
