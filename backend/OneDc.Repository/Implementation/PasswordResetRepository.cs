using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

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

    public async Task<PasswordReset?> GetValidOtpAsync(Guid userId, string otp)
    {
        return await _context.PasswordResets
            .FirstOrDefaultAsync(pr => 
                pr.UserId == userId && 
                pr.Otp == otp && 
                !pr.IsUsed && 
                pr.ExpiresAt > DateTimeOffset.UtcNow);
    }

    public async Task<bool> MarkAsUsedAsync(Guid resetId)
    {
        var reset = await _context.PasswordResets.FindAsync(resetId);
        if (reset == null) return false;

        reset.IsUsed = true;
        reset.UsedAt = DateTimeOffset.UtcNow;
        
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteExpiredAsync()
    {
        var expiredResets = await _context.PasswordResets
            .Where(pr => pr.ExpiresAt <= DateTimeOffset.UtcNow || pr.IsUsed)
            .ToListAsync();

        _context.PasswordResets.RemoveRange(expiredResets);
        var deletedCount = await _context.SaveChangesAsync();
        
        return deletedCount > 0;
    }

    public async Task<bool> DeleteUserPendingResetsAsync(Guid userId)
    {
        var userResets = await _context.PasswordResets
            .Where(pr => pr.UserId == userId && !pr.IsUsed)
            .ToListAsync();

        _context.PasswordResets.RemoveRange(userResets);
        var deletedCount = await _context.SaveChangesAsync();
        
        return deletedCount >= 0;
    }

    public async Task<List<PasswordReset>> GetUserActiveResetsAsync(Guid userId)
    {
        return await _context.PasswordResets
            .Where(pr => pr.UserId == userId && !pr.IsUsed && pr.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(pr => pr.CreatedAt)
            .ToListAsync();
    }
}
