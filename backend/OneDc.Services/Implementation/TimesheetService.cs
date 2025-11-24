using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;
using OneDc.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace OneDc.Services.Implementation;

public class TimesheetService : ITimesheetService
{
    private readonly ITimesheetRepository _repo;
    private readonly OneDcDbContext _context;

    // simple policy constants (move to settings later)
    private const decimal DAILY_CAP = 12.0m;

    public TimesheetService(ITimesheetRepository repo, OneDcDbContext context)
    {
        _repo = repo;
        _context = context;
    }

    public Task<IEnumerable<TimesheetEntry>> GetMineAsync(Guid userId, DateOnly from, DateOnly to)
        => _repo.GetByUserAndRangeAsync(userId, from, to);

    public async Task<TimesheetEntry> CreateDraftAsync(Guid userId, TimesheetCreateDto dto)
    {
        if (dto.ProjectId == Guid.Empty)
            throw new ArgumentException("ProjectId is required.", nameof(dto.ProjectId));

        // Validate that the project exists and is not soft-deleted
        var projectExists = await _context.Projects
            .AnyAsync(p => p.ProjectId == dto.ProjectId && !p.IsDeleted);
        
        if (!projectExists)
        {
            throw new ArgumentException("Project not found or has been deleted.", nameof(dto.ProjectId));
        }
            
        ValidateHours(dto.Hours);
        RequireDescriptionIfHours(dto.Hours, dto.Description);

        await EnsureDailyCapNotExceeded(userId, dto.WorkDate, dto.Hours, excludeEntryId: null);

        var entry = new TimesheetEntry
        {
            EntryId = Guid.NewGuid(),
            UserId = userId,
            ProjectId = dto.ProjectId,
            WorkDate = dto.WorkDate,
            Hours = dto.Hours,
            Description = dto.Description,
            TicketRef = dto.TicketRef,
            TaskId = dto.TaskId,
            TaskType = dto.TaskType,
            Status = TimesheetStatus.DRAFT,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _repo.AddAsync(entry);
        await _repo.SaveChangesAsync();
        return entry;
    }

    public async Task<TimesheetEntry> UpdateDraftAsync(Guid userId, Guid entryId, TimesheetUpdateDto dto)
    {
        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.UserId != userId) throw new UnauthorizedAccessException("Cannot edit another user's timesheet.");
        if (entry.Status != TimesheetStatus.DRAFT && entry.Status != TimesheetStatus.REJECTED) 
            throw new InvalidOperationException("Only DRAFT and REJECTED entries can be edited.");

        ValidateHours(dto.Hours);
        RequireDescriptionIfHours(dto.Hours, dto.Description);
        await EnsureDailyCapNotExceeded(userId, entry.WorkDate, dto.Hours, excludeEntryId: entry.EntryId);

        entry.Hours = dto.Hours;
        entry.Description = dto.Description;
        entry.TicketRef = dto.TicketRef;
        entry.TaskId = dto.TaskId;
        if (dto.TaskType.HasValue)
        {
            entry.TaskType = dto.TaskType.Value;
        }
        entry.UpdatedAt = DateTimeOffset.UtcNow;

        await _repo.SaveChangesAsync();
        return entry;
    }

    public async Task<TimesheetEntry> SubmitAsync(Guid userId, Guid entryId)
    {
        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.UserId != userId) throw new UnauthorizedAccessException("Cannot submit another user's timesheet.");
        if (entry.Status != TimesheetStatus.DRAFT && entry.Status != TimesheetStatus.REJECTED) 
            throw new InvalidOperationException("Only DRAFT and REJECTED entries can be submitted.");
        RequireDescriptionIfHours(entry.Hours, entry.Description);

        entry.Status = TimesheetStatus.SUBMITTED;
        entry.SubmittedAt = DateTimeOffset.UtcNow;
        entry.UpdatedAt = DateTimeOffset.UtcNow;

        await _repo.SaveChangesAsync();
        return entry;
    }

    public async Task DeleteAsync(Guid userId, Guid entryId)
    {
        var entry = await _repo.GetByIdAsync(entryId) ?? throw new InvalidOperationException("Entry not found.");
        if (entry.UserId != userId) throw new UnauthorizedAccessException("Cannot delete another user's timesheet.");
        if (entry.Status != TimesheetStatus.DRAFT && entry.Status != TimesheetStatus.REJECTED) 
            throw new InvalidOperationException("Only DRAFT and REJECTED entries can be deleted.");

        await _repo.DeleteAsync(entryId);
        await _repo.SaveChangesAsync();
    }

    // --- helpers ---
    private static void ValidateHours(decimal hours)
    {
        if (hours < 0 || hours > 24) throw new ArgumentOutOfRangeException(nameof(hours), "Hours must be between 0 and 24.");
    }

    private static void RequireDescriptionIfHours(decimal hours, string? description)
    {
        if (hours > 0 && string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required when hours > 0.", nameof(description));
    }

    private async Task EnsureDailyCapNotExceeded(Guid userId, DateOnly day, decimal newHours, Guid? excludeEntryId)
    {
        var existing = await _repo.GetByUserAndRangeAsync(userId, day, day);
        var total = existing.Where(e => e.EntryId != excludeEntryId).Sum(e => e.Hours) + newHours;
        if (total > DAILY_CAP)
            throw new InvalidOperationException($"Daily cap exceeded: {total}h > {DAILY_CAP}h.");
    }

    public async Task<IEnumerable<TimesheetEntry>> GetAllAsync(DateOnly from, DateOnly to)
    {
        return await _repo.GetByRangeAsync(from, to);
    }

    public async Task<IEnumerable<TimesheetEntry>> GetForProjectAsync(Guid projectId, DateOnly from, DateOnly to)
    {
        return await _repo.GetByProjectAndRangeAsync(projectId, from, to);
    }
}
