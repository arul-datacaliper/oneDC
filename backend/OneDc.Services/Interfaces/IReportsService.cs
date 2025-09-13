namespace OneDc.Services.Interfaces;

public record UtilizationRow(
    Guid? user_id, string? user_name,
    Guid? project_id, string? project_code, string? project_name, bool? billable,
    decimal billable_hours, decimal total_hours, decimal utilization_pct);

public interface IReportsService
{
    Task<IEnumerable<UtilizationRow>> UtilizationAsync(DateOnly from, DateOnly to, string groupBy);
    Task<byte[]> UtilizationCsvAsync(DateOnly from, DateOnly to, string groupBy);
}
