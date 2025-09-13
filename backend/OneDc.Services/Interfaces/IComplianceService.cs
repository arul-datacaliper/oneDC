namespace OneDc.Services.Interfaces;

public record MissingRow(Guid user_id, string user_name, DateOnly date);
public record OvertimeRow(Guid user_id, string user_name, DateOnly date, decimal total_hours);

public interface IComplianceService
{
    Task<IEnumerable<MissingRow>> MissingTimesheetsAsync(DateOnly from, DateOnly to, bool skipWeekends = true, string? holidayRegion = null);
    Task<IEnumerable<OvertimeRow>> OvertimeAsync(DateOnly from, DateOnly to, decimal dailyCap = 12m);
    Task<byte[]> MissingTimesheetsCsvAsync(DateOnly from, DateOnly to, bool skipWeekends = true, string? holidayRegion = null);
    Task<byte[]> OvertimeCsvAsync(DateOnly from, DateOnly to, decimal dailyCap = 12m);
}
