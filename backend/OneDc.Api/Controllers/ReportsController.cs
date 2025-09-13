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
    
    // GET api/reports/missing-timesheets?from=YYYY-MM-DD&to=YYYY-MM-DD&skipWeekends=true&holidayRegion=IN
    [HttpGet("missing-timesheets")]
    public async Task<IActionResult> Missing([FromQuery] DateOnly from, [FromQuery] DateOnly to,
                                             [FromQuery] bool skipWeekends = true,
                                             [FromQuery] string? holidayRegion = null)
        => Ok(await _compSvc.MissingTimesheetsAsync(from, to, skipWeekends, holidayRegion));

    // GET api/reports/missing-timesheets.csv?from=...&to=...
    [HttpGet("missing-timesheets.csv")]
    public async Task<IActionResult> MissingCsv([FromQuery] DateOnly from, [FromQuery] DateOnly to,
                                                [FromQuery] bool skipWeekends = true,
                                                [FromQuery] string? holidayRegion = null)
        => File(await _compSvc.MissingTimesheetsCsvAsync(from, to, skipWeekends, holidayRegion),
                "text/csv", $"missing_timesheets_{from:yyyyMMdd}_{to:yyyyMMdd}.csv");

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
}

