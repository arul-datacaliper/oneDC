using System.Globalization;
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
}
