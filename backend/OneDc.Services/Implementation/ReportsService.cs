using System.Globalization;
using System.Text;
using OneDc.Services.Interfaces;
using OneDc.Repository.Interfaces;

namespace OneDc.Services.Implementation;

public class ReportsService : IReportsService
{
  private readonly IReportsRepository _repo;
  public ReportsService(IReportsRepository repo) => _repo = repo;

  public async Task<IEnumerable<UtilizationRow>> UtilizationAsync(DateOnly from, DateOnly to, string groupBy)
  {
    var data = (await _repo.GetApprovedHoursAsync(from, to)).ToList();
    var projMeta = await _repo.GetProjectsMetaAsync(data.Select(d => d.projectId));
    var userMeta = await _repo.GetUsersMetaAsync(data.Select(d => d.userId));

    groupBy = (groupBy ?? "project").ToLowerInvariant();

    if (groupBy == "user")
    {
      var grouped = data.GroupBy(d => d.userId);
      return grouped.Select(g =>
      {
        var billable = g.Where(x => x.billable).Sum(x => x.hours);
        var total = g.Sum(x => x.hours);
        var u = userMeta[g.Key];
        return new UtilizationRow(
                  user_id: g.Key,
                  user_name: $"{u.first} {u.last}",
                  project_id: null, project_code: null, project_name: null, billable: null,
                  billable_hours: billable,
                  total_hours: total,
                  utilization_pct: total == 0 ? 0 : Math.Round((billable / total) * 100m, 2)
              );
      }).OrderBy(r => r.user_name).ToList();
    }
    else if (groupBy == "user_project")
    {
      var grouped = data.GroupBy(d => new { d.userId, d.projectId });
      return grouped.Select(g =>
      {
        var billable = g.Where(x => x.billable).Sum(x => x.hours);
        var total = g.Sum(x => x.hours);
        var u = userMeta[g.Key.userId];
        var p = projMeta[g.Key.projectId];
        return new UtilizationRow(
          user_id: g.Key.userId,
          user_name: $"{u.first} {u.last}",
          project_id: g.Key.projectId,
          project_code: p.code,
          project_name: p.name,
          billable: p.billable,
          billable_hours: billable,
          total_hours: total,
          utilization_pct: total == 0 ? 0 : Math.Round((billable / total) * 100m, 2)
      );
      }).OrderBy(r => r.user_name).ThenBy(r => r.project_name).ToList();
    }
    else // project (default)
    {
      var grouped = data.GroupBy(d => d.projectId);
      return grouped.Select(g =>
      {
        var billable = g.Where(x => x.billable).Sum(x => x.hours);
        var total = g.Sum(x => x.hours);
        var p = projMeta[g.Key];
        return new UtilizationRow(
                  user_id: null, user_name: null,
                  project_id: g.Key, project_code: p.code, project_name: p.name, billable: p.billable,
                  billable_hours: billable,
                  total_hours: total,
                  utilization_pct: total == 0 ? 0 : Math.Round((billable / total) * 100m, 2)
              );
      }).OrderBy(r => r.project_name).ToList();
    }
  }

  public async Task<byte[]> UtilizationCsvAsync(DateOnly from, DateOnly to, string groupBy)
  {
    var rows = (await UtilizationAsync(from, to, groupBy)).ToList();
    using var ms = new MemoryStream();
    using var writer = new StreamWriter(ms);
    // header
    await writer.WriteLineAsync("group,user_id,user_name,project_id,project_code,project_name,billable,billable_hours,total_hours,utilization_pct");
    foreach (var r in rows)
    {
      var group = (groupBy ?? "project").ToLowerInvariant();
      await writer.WriteLineAsync(string.Join(",",
          group,
          r.user_id?.ToString() ?? "",
          Escape(r.user_name),
          r.project_id?.ToString() ?? "",
          Escape(r.project_code),
          Escape(r.project_name),
          r.billable?.ToString() ?? "",
          r.billable_hours.ToString(CultureInfo.InvariantCulture),
          r.total_hours.ToString(CultureInfo.InvariantCulture),
          r.utilization_pct.ToString(CultureInfo.InvariantCulture)
      ));
    }
    await writer.FlushAsync();
    return ms.ToArray();

    static string Escape(string? s) => s is null ? "" :
        (s.Contains(',') ? $"\"{s.Replace("\"", "\"\"")}\"" : s);
  }

  public async Task<ProjectUtilizationReport> GetProjectUtilizationReportAsync(DateOnly from, DateOnly to, string groupBy, Guid? projectId = null, Guid? userId = null)
  {
    // Get approved and submitted timesheet data (exclude DRAFT, REJECTED)
    var data = (await _repo.GetApprovedHoursAsync(from, to)).ToList();
    
    // Apply filters
    if (projectId.HasValue)
      data = data.Where(d => d.projectId == projectId.Value).ToList();
    
    if (userId.HasValue)
      data = data.Where(d => d.userId == userId.Value).ToList();

    var projMeta = await _repo.GetProjectsMetaAsync(data.Select(d => d.projectId));
    var userMeta = await _repo.GetUsersMetaAsync(data.Select(d => d.userId));

    var reportData = new List<ProjectUtilizationRow>();
    
    groupBy = (groupBy ?? "project").ToLowerInvariant();

    if (groupBy == "user")
    {
      var grouped = data.GroupBy(d => d.userId);
      reportData = grouped.Select(g =>
      {
        var billableHours = g.Where(x => x.billable).Sum(x => x.hours);
        var totalHours = g.Sum(x => x.hours);
        var nonBillableHours = totalHours - billableHours;
        var u = userMeta[g.Key];
        
        return new ProjectUtilizationRow(
          ProjectId: "", // Not applicable for user grouping
          ProjectCode: null,
          ProjectName: null,
          ProjectBudgetHours: null,
          UserId: g.Key.ToString(),
          UserName: $"{u.first} {u.last}",
          TotalHours: totalHours,
          BillableHours: billableHours,
          NonBillableHours: nonBillableHours,
          UtilizationPercentage: null, // Not applicable for user grouping
          EntryCount: g.Count()
        );
      }).OrderBy(r => r.UserName).ToList();
    }
    else if (groupBy == "user_project")
    {
      var grouped = data.GroupBy(d => new { d.userId, d.projectId });
      reportData = grouped.Select(g =>
      {
        var billableHours = g.Where(x => x.billable).Sum(x => x.hours);
        var totalHours = g.Sum(x => x.hours);
        var nonBillableHours = totalHours - billableHours;
        var u = userMeta[g.Key.userId];
        var p = projMeta[g.Key.projectId];
        
        decimal? utilizationPercentage = null;
        if (p.Item4.HasValue && p.Item4 > 0)
        {
          utilizationPercentage = Math.Round((totalHours / p.Item4.Value) * 100m, 2);
        }

        return new ProjectUtilizationRow(
          ProjectId: g.Key.projectId.ToString(),
          ProjectCode: p.Item1,
          ProjectName: p.Item2,
          ProjectBudgetHours: p.Item4,
          UserId: g.Key.userId.ToString(),
          UserName: $"{u.first} {u.last}",
          TotalHours: totalHours,
          BillableHours: billableHours,
          NonBillableHours: nonBillableHours,
          UtilizationPercentage: utilizationPercentage,
          EntryCount: g.Count()
        );
      }).OrderBy(r => r.UserName).ThenBy(r => r.ProjectName).ToList();
    }
    else // project (default)
    {
      var grouped = data.GroupBy(d => d.projectId);
      reportData = grouped.Select(g =>
      {
        var billableHours = g.Where(x => x.billable).Sum(x => x.hours);
        var totalHours = g.Sum(x => x.hours);
        var nonBillableHours = totalHours - billableHours;
        var p = projMeta[g.Key];
        
        decimal? utilizationPercentage = null;
        if (p.Item4.HasValue && p.Item4 > 0)
        {
          utilizationPercentage = Math.Round((totalHours / p.Item4.Value) * 100m, 2);
        }

        return new ProjectUtilizationRow(
          ProjectId: g.Key.ToString(),
          ProjectCode: p.Item1,
          ProjectName: p.Item2,
          ProjectBudgetHours: p.Item4,
          UserId: null,
          UserName: null,
          TotalHours: totalHours,
          BillableHours: billableHours,
          NonBillableHours: nonBillableHours,
          UtilizationPercentage: utilizationPercentage,
          EntryCount: g.Count()
        );
      }).OrderBy(r => r.ProjectName).ToList();
    }

    // Calculate summary
    var summary = new ProjectUtilizationSummary(
      TotalHours: reportData.Sum(r => r.TotalHours),
      TotalBillableHours: reportData.Sum(r => r.BillableHours),
      TotalNonBillableHours: reportData.Sum(r => r.NonBillableHours),
      AverageUtilization: reportData.Where(r => r.UtilizationPercentage.HasValue).Any() 
        ? reportData.Where(r => r.UtilizationPercentage.HasValue).Average(r => r.UtilizationPercentage!.Value)
        : null,
      ProjectCount: reportData.Where(r => !string.IsNullOrEmpty(r.ProjectId)).Select(r => r.ProjectId).Distinct().Count(),
      UserCount: reportData.Where(r => !string.IsNullOrEmpty(r.UserId)).Select(r => r.UserId).Distinct().Count()
    );

    var parameters = new ProjectUtilizationParams(
      From: from.ToString("yyyy-MM-dd"),
      To: to.ToString("yyyy-MM-dd"),
      GroupBy: groupBy,
      ProjectId: projectId?.ToString(),
      UserId: userId?.ToString()
    );

    return new ProjectUtilizationReport(parameters, reportData.ToArray(), summary);
  }

  public async Task<byte[]> GetProjectUtilizationCsvAsync(DateOnly from, DateOnly to, string groupBy, Guid? projectId = null, Guid? userId = null)
  {
    var report = await GetProjectUtilizationReportAsync(from, to, groupBy, projectId, userId);
    
    using var ms = new MemoryStream();
    using var writer = new StreamWriter(ms);
    
    // Write header
    var headers = new List<string>();
    if (groupBy != "user") headers.Add("Project ID,Project Code,Project Name,Budget Hours");
    if (groupBy != "project") headers.Add("User ID,User Name");
    headers.Add("Total Hours,Billable Hours,Non-Billable Hours,Utilization %,Entry Count");
    
    await writer.WriteLineAsync(string.Join(",", headers));

    // Write data rows
    foreach (var row in report.Data)
    {
      var values = new List<string>();
      
      if (groupBy != "user")
      {
        values.Add(EscapeCsv(row.ProjectId));
        values.Add(EscapeCsv(row.ProjectCode));
        values.Add(EscapeCsv(row.ProjectName));
        values.Add(row.ProjectBudgetHours?.ToString(CultureInfo.InvariantCulture) ?? "");
      }
      
      if (groupBy != "project")
      {
        values.Add(EscapeCsv(row.UserId));
        values.Add(EscapeCsv(row.UserName));
      }
      
      values.Add(row.TotalHours.ToString(CultureInfo.InvariantCulture));
      values.Add(row.BillableHours.ToString(CultureInfo.InvariantCulture));
      values.Add(row.NonBillableHours.ToString(CultureInfo.InvariantCulture));
      values.Add(row.UtilizationPercentage?.ToString(CultureInfo.InvariantCulture) ?? "");
      values.Add(row.EntryCount.ToString());
      
      await writer.WriteLineAsync(string.Join(",", values));
    }
    
    await writer.FlushAsync();
    return ms.ToArray();
  }

  private static string EscapeCsv(string? s) => s is null ? "" :
      (s.Contains(',') ? $"\"{s.Replace("\"", "\"\"")}\"" : s);

  public async Task<ProjectBurndownReport> GetProjectBurndownReportAsync(Guid projectId, DateOnly from, DateOnly to, string interval = "week")
  {
    // Get project details
    var projectDetails = await _repo.GetProjectDetailsAsync(projectId);
    
    // Get daily hours data for the project
    var dailyHours = (await _repo.GetProjectHoursByDateAsync(projectId, from, to)).ToList();
    
    // Create time buckets based on interval
    var buckets = GenerateTimeBuckets(from, to, interval);
    var burndownData = new List<ProjectBurndownDataPoint>();
    
    decimal cumulativeHours = 0;
    foreach (var bucket in buckets)
    {
      // Calculate actual cumulative hours up to this bucket
      var hoursInPeriod = dailyHours
        .Where(h => h.date >= from && h.date <= bucket.End)
        .Sum(h => h.hours);
      
      cumulativeHours = hoursInPeriod;
      
      // Calculate budget hours proportionally
      var totalDays = (decimal)(to.DayNumber - from.DayNumber + 1);
      var daysToBucket = (decimal)(bucket.End.DayNumber - from.DayNumber + 1);
      var budgetHours = projectDetails.budgetHours.HasValue 
        ? (projectDetails.budgetHours.Value * daysToBucket / totalDays)
        : 0;
      
      burndownData.Add(new ProjectBurndownDataPoint(
        BucketStart: bucket.Start.ToString("yyyy-MM-dd"),
        ActualCumHours: cumulativeHours,
        BudgetHours: Math.Round(budgetHours, 2)
      ));
    }
    
    // Calculate summary
    var totalActualHours = dailyHours.Sum(h => h.hours);
    var totalBudgetHours = projectDetails.budgetHours ?? 0;
    var utilizationPercentage = totalBudgetHours > 0 
      ? Math.Round((totalActualHours / totalBudgetHours) * 100m, 2)
      : 0;
    var remainingBudget = totalBudgetHours - totalActualHours;
    
    var summary = new ProjectBurndownSummary(
      TotalActualHours: totalActualHours,
      TotalBudgetHours: totalBudgetHours,
      UtilizationPercentage: utilizationPercentage,
      RemainingBudget: remainingBudget,
      ProjectedCompletion: null // Could implement projection logic here
    );
    
    var projectInfo = new ProjectBurndownProjectInfo(
      ProjectId: projectId.ToString(),
      ProjectCode: projectDetails.code,
      ProjectName: projectDetails.name,
      BudgetHours: projectDetails.budgetHours ?? 0,
      StartDate: projectDetails.startDate?.ToString("yyyy-MM-dd"),
      EndDate: projectDetails.endDate?.ToString("yyyy-MM-dd")
    );
    
    var parameters = new ProjectBurndownParams(
      ProjectId: projectId.ToString(),
      From: from.ToString("yyyy-MM-dd"),
      To: to.ToString("yyyy-MM-dd"),
      Interval: interval
    );
    
    return new ProjectBurndownReport(parameters, projectInfo, burndownData.ToArray(), summary);
  }

  public async Task<byte[]> GetProjectBurndownCsvAsync(Guid projectId, DateOnly from, DateOnly to, string interval = "week")
  {
    var report = await GetProjectBurndownReportAsync(projectId, from, to, interval);
    
    using var ms = new MemoryStream();
    using var writer = new StreamWriter(ms);
    
    // Write header
    await writer.WriteLineAsync("Period,Cumulative Actual Hours,Budget Hours,Progress %,Variance");

    // Write data rows
    foreach (var row in report.Data)
    {
      var progressPercentage = row.BudgetHours > 0 
        ? Math.Round((row.ActualCumHours / row.BudgetHours) * 100m, 2)
        : 0;
      var variance = row.ActualCumHours - row.BudgetHours;
      
      var values = new List<string>
      {
        EscapeCsv(row.BucketStart),
        row.ActualCumHours.ToString(CultureInfo.InvariantCulture),
        row.BudgetHours.ToString(CultureInfo.InvariantCulture),
        progressPercentage.ToString(CultureInfo.InvariantCulture),
        variance.ToString(CultureInfo.InvariantCulture)
      };
      
      await writer.WriteLineAsync(string.Join(",", values));
    }
    
    await writer.FlushAsync();
    return ms.ToArray();
  }

  private static List<(DateOnly Start, DateOnly End)> GenerateTimeBuckets(DateOnly from, DateOnly to, string interval)
  {
    var buckets = new List<(DateOnly Start, DateOnly End)>();
    var current = from;
    
    while (current <= to)
    {
      DateOnly bucketEnd;
      
      if (interval.ToLowerInvariant() == "day")
      {
        bucketEnd = current;
        buckets.Add((current, bucketEnd));
        current = current.AddDays(1);
      }
      else // week (default)
      {
        // Find the end of the week (Sunday)
        var daysToSunday = (7 - (int)current.DayOfWeek) % 7;
        bucketEnd = current.AddDays(daysToSunday);
        
        // Don't exceed the 'to' date
        if (bucketEnd > to) bucketEnd = to;
        
        buckets.Add((current, bucketEnd));
        current = bucketEnd.AddDays(1);
      }
    }
    
    return buckets;
  }

  public async Task<MissingTimesheetsReport> GetMissingTimesheetsReportAsync(DateOnly from, DateOnly to, Guid? userId = null, bool skipWeekends = true)
  {
    // Get all active users or specific user
    var users = userId.HasValue 
      ? await _repo.GetUsersMetaAsync(new[] { userId.Value })
      : await _repo.GetAllActiveUsersAsync();
    
    // Get all timesheet entries in the date range
    var timesheetEntries = await _repo.GetTimesheetEntriesAsync(from, to, userId);
    
    // Create a set of (userId, date) pairs that have timesheet entries
    var existingEntries = timesheetEntries
      .Select(e => new { UserId = e.UserId, Date = e.WorkDate })
      .ToHashSet();
    
    var missingTimesheets = new List<MissingTimesheetsRow>();
    var totalWorkingDays = 0;
    
    foreach (var user in users)
    {
      var currentDate = from;
      
      while (currentDate <= to)
      {
        // Skip weekends if requested
        if (skipWeekends && (currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday))
        {
          currentDate = currentDate.AddDays(1);
          continue;
        }
        
        totalWorkingDays++;
        
        // Check if user has timesheet entry for this date
        var hasEntry = existingEntries.Contains(new { UserId = user.Key, Date = currentDate });
        
        if (!hasEntry)
        {
          missingTimesheets.Add(new MissingTimesheetsRow(
            UserId: user.Key,
            UserName: $"{user.Value.first} {user.Value.last}",
            Date: currentDate.ToString("yyyy-MM-dd"),
            DayOfWeek: currentDate.ToString("dddd")
          ));
        }
        
        currentDate = currentDate.AddDays(1);
      }
    }
    
    var summary = new MissingTimesheetsSummary(
      TotalMissingDays: missingTimesheets.Count,
      AffectedUsers: missingTimesheets.Select(m => m.UserId).Distinct().Count(),
      DateRange: new MissingTimesheetsDateRange(
        From: from.ToString("yyyy-MM-dd"),
        To: to.ToString("yyyy-MM-dd"),
        WorkingDays: totalWorkingDays
      )
    );
    
    var parameters = new MissingTimesheetsParams(
      From: from.ToString("yyyy-MM-dd"),
      To: to.ToString("yyyy-MM-dd"),
      UserId: userId,
      SkipWeekends: skipWeekends
    );
    
    return new MissingTimesheetsReport(
      Parameters: parameters,
      Data: missingTimesheets.ToArray(),
      Summary: summary
    );
  }

  public async Task<byte[]> GetMissingTimesheetsCsvAsync(DateOnly from, DateOnly to, Guid? userId = null, bool skipWeekends = true)
  {
    var report = await GetMissingTimesheetsReportAsync(from, to, userId, skipWeekends);
    
    var csv = new StringBuilder();
    csv.AppendLine("User ID,User Name,Date,Day of Week");
    
    foreach (var row in report.Data)
    {
      csv.AppendLine($"{row.UserId},{row.UserName},{row.Date},{row.DayOfWeek}");
    }
    
    return Encoding.UTF8.GetBytes(csv.ToString());
  }
}
