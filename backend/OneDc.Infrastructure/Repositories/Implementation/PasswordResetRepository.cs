using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure.Repositories.Interfaces;

namespace OneDc.Infrastructure.Repositories.Implementation;

public class PasswordResetRepository : IPasswordResetRepository
{
    private readonly OneDcDbContext _context;

    public PasswordResetRepository(OneDcDbContext context)
    {
        _context = context;
    }

    public async Task<PasswordReset> CreateAsync(PasswordReset passwordReset)
    {
        _context.PasswordResets.Add(passwordReset);
        await _context.SaveChangesAsync();
        return passwordReset;
    }

    public async Task<PasswordReset?> GetActiveByUserIdAsync(Guid userId)
    {
        return await _context.PasswordResets
            .Where(pr => pr.UserId == userId && !pr.IsUsed && pr.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(pr => pr.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<PasswordReset?> GetByOtpAsync(string otp)
    {
        return await _context.PasswordResets
            .Where(pr => pr.Otp == otp && !pr.IsUsed && pr.ExpiresAt > DateTimeOffset.UtcNow)
            .FirstOrDefaultAsync();
    }

    public async Task UpdateAsync(PasswordReset passwordReset)
    {
        _context.PasswordResets.Update(passwordReset);
        await _context.SaveChangesAsync();
    }

    public async Task InvalidateActiveRequestsAsync(Guid userId)
    {
        var activeRequests = await _context.PasswordResets
            .Where(pr => pr.UserId == userId && !pr.IsUsed && pr.ExpiresAt > DateTimeOffset.UtcNow)
            .ToListAsync();

        foreach (var request in activeRequests)
        {
            request.IsUsed = true;
            request.UsedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<PasswordReset>> GetExpiredAsync()
    {
        return await _context.PasswordResets
            .Where(pr => pr.ExpiresAt <= DateTimeOffset.UtcNow)
            .ToListAsync();
    }

    public async Task DeleteAsync(PasswordReset passwordReset)
    {
        _context.PasswordResets.Remove(passwordReset);
        await _context.SaveChangesAsync();
    }

    public async Task<int> DeleteExpiredAsync()
    {
        var expiredRequests = await GetExpiredAsync();
        _context.PasswordResets.RemoveRange(expiredRequests);
        await _context.SaveChangesAsync();
        return expiredRequests.Count;
    }
}
