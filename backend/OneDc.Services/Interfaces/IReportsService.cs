namespace OneDc.Services.Interfaces;

public record UtilizationRow(
    Guid? user_id, string? user_name,
    Guid? project_id, string? project_code, string? project_name, bool? billable,
    decimal billable_hours, decimal total_hours, decimal utilization_pct);

public record ProjectUtilizationRow(
    string ProjectId,
    string? ProjectCode,
    string? ProjectName,
    decimal? ProjectBudgetHours,
    string? UserId,
    string? UserName,
    decimal TotalHours,
    decimal BillableHours,
    decimal NonBillableHours,
    decimal? UtilizationPercentage,
    int EntryCount);

public record ProjectUtilizationReport(
    ProjectUtilizationParams Parameters,
    ProjectUtilizationRow[] Data,
    ProjectUtilizationSummary Summary);

public record ProjectUtilizationParams(
    string From,
    string To,
    string GroupBy,
    string? ProjectId,
    string? UserId);

public record ProjectUtilizationSummary(
    decimal TotalHours,
    decimal TotalBillableHours,
    decimal TotalNonBillableHours,
    decimal? AverageUtilization,
    int ProjectCount,
    int UserCount);

// Project Burn-down Report Models
public record ProjectBurndownParams(
    string ProjectId,
    string From,
    string To,
    string Interval);

public record ProjectBurndownDataPoint(
    string BucketStart,
    decimal ActualCumHours,
    decimal BudgetHours);

public record ProjectBurndownProjectInfo(
    string ProjectId,
    string ProjectCode,
    string ProjectName,
    decimal BudgetHours,
    string? StartDate,
    string? EndDate);

public record ProjectBurndownSummary(
    decimal TotalActualHours,
    decimal TotalBudgetHours,
    decimal UtilizationPercentage,
    decimal RemainingBudget,
    string? ProjectedCompletion);

public record ProjectBurndownReport(
    ProjectBurndownParams Parameters,
    ProjectBurndownProjectInfo ProjectInfo,
    ProjectBurndownDataPoint[] Data,
    ProjectBurndownSummary Summary);

// Missing Timesheets models
public record MissingTimesheetsParams(
    string From,           // YYYY-MM-DD
    string To,             // YYYY-MM-DD
    Guid? UserId,
    bool SkipWeekends);

public record MissingTimesheetsRow(
    Guid UserId,
    string UserName,
    string Date,           // YYYY-MM-DD
    string DayOfWeek);

public record MissingTimesheetsDateRange(
    string From,
    string To,
    int WorkingDays);

public record MissingTimesheetsSummary(
    int TotalMissingDays,
    int AffectedUsers,
    MissingTimesheetsDateRange DateRange);

public record MissingTimesheetsReport(
    MissingTimesheetsParams Parameters,
    MissingTimesheetsRow[] Data,
    MissingTimesheetsSummary Summary);

public interface IReportsService
{
    Task<IEnumerable<UtilizationRow>> UtilizationAsync(DateOnly from, DateOnly to, string groupBy);
    Task<byte[]> UtilizationCsvAsync(DateOnly from, DateOnly to, string groupBy);
    
    // Project Utilization methods
    Task<ProjectUtilizationReport> GetProjectUtilizationReportAsync(DateOnly from, DateOnly to, string groupBy, Guid? projectId = null, Guid? userId = null);
    Task<byte[]> GetProjectUtilizationCsvAsync(DateOnly from, DateOnly to, string groupBy, Guid? projectId = null, Guid? userId = null);
    
    // Project Burn-down methods
    Task<ProjectBurndownReport> GetProjectBurndownReportAsync(Guid projectId, DateOnly from, DateOnly to, string interval = "week");
    Task<byte[]> GetProjectBurndownCsvAsync(Guid projectId, DateOnly from, DateOnly to, string interval = "week");
    
    // Missing Timesheets methods
    Task<MissingTimesheetsReport> GetMissingTimesheetsReportAsync(DateOnly from, DateOnly to, Guid? userId = null, bool skipWeekends = true);
    Task<byte[]> GetMissingTimesheetsCsvAsync(DateOnly from, DateOnly to, Guid? userId = null, bool skipWeekends = true);
}
