using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
  private readonly IReportsService _utilSvc;
  private readonly IComplianceService _compSvc;

  public ReportsController(IReportsService utilSvc, IComplianceService compSvc)
  {
    _utilSvc = utilSvc;
    _compSvc = compSvc;
  }


  // GET api/reports/utilization?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=project|user
  [HttpGet("utilization")]
  public async Task<IActionResult> Utilization([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] string? groupBy = "project")
  {
    var rows = await _utilSvc.UtilizationAsync(from, to, groupBy ?? "project");
    return Ok(rows);
  }

  // GET api/reports/utilization.csv?from=...&to=...&groupBy=user
  [HttpGet("utilization.csv")]
  public async Task<IActionResult> UtilizationCsv([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] string? groupBy = "project")
  {
    var bytes = await _utilSvc.UtilizationCsvAsync(from, to, groupBy ?? "project");
    return File(bytes, "text/csv", $"utilization_{from:yyyyMMdd}_{to:yyyyMMdd}.csv");
  }
    
    // GET api/reports/missing-timesheets?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=Guid&skipWeekends=true
    [HttpGet("missing-timesheets")]
    public async Task<IActionResult> GetMissingTimesheets(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] Guid? userId = null,
        [FromQuery] bool skipWeekends = true)
    {
        var report = await _utilSvc.GetMissingTimesheetsReportAsync(from, to, userId, skipWeekends);
        return Ok(report);
    }

    // GET api/reports/missing-timesheets.csv
    [HttpGet("missing-timesheets.csv")]
    public async Task<IActionResult> GetMissingTimesheetsCsv(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] Guid? userId = null,
        [FromQuery] bool skipWeekends = true)
    {
        var csvData = await _utilSvc.GetMissingTimesheetsCsvAsync(from, to, userId, skipWeekends);
        var fileName = $"missing-timesheets-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv";
        return File(csvData, "text/csv", fileName);
    }

    // GET api/reports/overtime?from=YYYY-MM-DD&to=YYYY-MM-DD&cap=12
    [HttpGet("overtime")]
    public async Task<IActionResult> Overtime([FromQuery] DateOnly from, [FromQuery] DateOnly to,
                                              [FromQuery] decimal cap = 12)
        => Ok(await _compSvc.OvertimeAsync(from, to, cap));

    // GET api/reports/overtime.csv?from=...&to=...&cap=12
    [HttpGet("overtime.csv")]
    public async Task<IActionResult> OvertimeCsv([FromQuery] DateOnly from, [FromQuery] DateOnly to,
                                                 [FromQuery] decimal cap = 12)
        => File(await _compSvc.OvertimeCsvAsync(from, to, cap),
                "text/csv", $"overtime_{from:yyyyMMdd}_{to:yyyyMMdd}.csv");

    // GET api/reports/project-utilization
    [HttpGet("project-utilization")]
    public async Task<IActionResult> GetProjectUtilization(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] string groupBy = "project",
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? userId = null)
    {
        var report = await _utilSvc.GetProjectUtilizationReportAsync(from, to, groupBy, projectId, userId);
        return Ok(report);
    }

    // GET api/reports/project-utilization.csv
    [HttpGet("project-utilization.csv")]
    public async Task<IActionResult> GetProjectUtilizationCsv(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] string groupBy = "project",
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? userId = null)
    {
        var csvData = await _utilSvc.GetProjectUtilizationCsvAsync(from, to, groupBy, projectId, userId);
        var fileName = $"project-utilization-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv";
        return File(csvData, "text/csv", fileName);
    }

    // GET api/reports/project-burndown
    [HttpGet("project-burndown")]
    public async Task<IActionResult> GetProjectBurndown(
        [FromQuery] Guid projectId,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] string interval = "week")
    {
        var report = await _utilSvc.GetProjectBurndownReportAsync(projectId, from, to, interval);
        return Ok(report);
    }

    // GET api/reports/project-burndown.csv
    [HttpGet("project-burndown.csv")]
    public async Task<IActionResult> GetProjectBurndownCsv(
        [FromQuery] Guid projectId,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] string interval = "week")
    {
        var csvData = await _utilSvc.GetProjectBurndownCsvAsync(projectId, from, to, interval);
        var fileName = $"project-burndown-{projectId}-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv";
        return File(csvData, "text/csv", fileName);
    }
}

