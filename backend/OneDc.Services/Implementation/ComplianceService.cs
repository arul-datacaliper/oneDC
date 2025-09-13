using System.Globalization;
using OneDc.Services.Interfaces;
using OneDc.Repository.Interfaces;

namespace OneDc.Services.Implementation;

public class ComplianceService :IComplianceService
{
    private readonly IComplianceRepository _repo;
    private readonly IReportsRepository _reportsRepo; // for user meta reuse

    public ComplianceService(IComplianceRepository repo, IReportsRepository reportsRepo)
    {
        _repo = repo;
        _reportsRepo = reportsRepo;
    }

    public async Task<IEnumerable<MissingRow>> MissingTimesheetsAsync(DateOnly from, DateOnly to, bool skipWeekends = true, string? holidayRegion = null)
    {
        var users = await _repo.GetActiveUsersAsync();
        var totals = await _repo.GetDailyTotalsAsync(from, to);
        var holidays = await _repo.GetHolidaysAsync(from, to, holidayRegion);
        var holidaySet = holidays.Select(h => h.HolidayDate).ToHashSet();

        var days = EachDay(from, to)
            .Where(d => !(skipWeekends && (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)))
            .Where(d => !holidaySet.Contains(d))
            .ToArray();

        // presence map
        var present = totals.ToLookup(x => (x.userId, x.day));

        var result = new List<MissingRow>();
        foreach (var u in users)
        {
            foreach (var d in days)
            {
                if (!present.Contains((u.UserId, d)))
                {
                    result.Add(new MissingRow(u.UserId, $"{u.FirstName} {u.LastName}", d));
                }
            }
        }
        return result.OrderBy(r => r.date).ThenBy(r => r.user_name);
    }

    public async Task<IEnumerable<OvertimeRow>> OvertimeAsync(DateOnly from, DateOnly to, decimal dailyCap = 12m)
    {
        var totals = await _repo.GetDailyTotalsAsync(from, to);
        var byUserDate = totals
            .Where(t => t.hours > dailyCap)
            .GroupBy(t => new { t.userId, t.day })
            .Select(g => new { g.Key.userId, g.Key.day, total = g.Sum(x => x.hours) })
            .ToList();

        var usersMeta = await _reportsRepo.GetUsersMetaAsync(byUserDate.Select(x => x.userId));
        return byUserDate
            .Select(x => new OvertimeRow(
                x.userId,
                $"{usersMeta[x.userId].first} {usersMeta[x.userId].last}",
                x.day,
                x.total))
            .OrderBy(r => r.date).ThenBy(r => r.user_name);
    }

    public async Task<byte[]> MissingTimesheetsCsvAsync(DateOnly from, DateOnly to, bool skipWeekends = true, string? holidayRegion = null)
    {
        var rows = (await MissingTimesheetsAsync(from, to, skipWeekends, holidayRegion)).ToList();
        using var ms = new MemoryStream();
        using var w = new StreamWriter(ms);
        await w.WriteLineAsync("user_id,user_name,date");
        foreach (var r in rows)
            await w.WriteLineAsync($"{r.user_id},{Escape(r.user_name)},{r.date:yyyy-MM-dd}");
        await w.FlushAsync();
        return ms.ToArray();
    }

    public async Task<byte[]> OvertimeCsvAsync(DateOnly from, DateOnly to, decimal dailyCap = 12m)
    {
        var rows = (await OvertimeAsync(from, to, dailyCap)).ToList();
        using var ms = new MemoryStream();
        using var w = new StreamWriter(ms);
        await w.WriteLineAsync("user_id,user_name,date,total_hours");
        foreach (var r in rows)
            await w.WriteLineAsync($"{r.user_id},{Escape(r.user_name)},{r.date:yyyy-MM-dd},{r.total_hours.ToString(CultureInfo.InvariantCulture)}");
        await w.FlushAsync();
        return ms.ToArray();
    }

    private static IEnumerable<DateOnly> EachDay(DateOnly from, DateOnly to)
    {
        for (var d = from; d <= to; d = d.AddDays(1)) yield return d;
    }

    private static string Escape(string? s) => s is null
        ? ""
        : (s.Contains(',') ? $"\"{s.Replace("\"","\"\"")}\"" : s);
}
