using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class UserRepository : IUserRepository
{
    private readonly OneDcDbContext _context;

    public UserRepository(OneDcDbContext context)
    {
        _context = context;
    }

    public async Task<AppUser?> GetByEmailAsync(string email)
    {
        return await _context.AppUsers
            .FirstOrDefaultAsync(u => u.Email == email || u.WorkEmail == email);
    }

    public async Task<AppUser?> GetByIdAsync(Guid userId)
    {
        return await _context.AppUsers.FindAsync(userId);
    }

    public async Task<AppUser> CreateAsync(AppUser user)
    {
        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<AppUser> UpdateAsync(AppUser user)
    {
        _context.AppUsers.Update(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<bool> DeleteAsync(Guid userId)
    {
        var user = await _context.AppUsers.FindAsync(userId);
        if (user == null) return false;

        _context.AppUsers.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<AppUser>> GetAllAsync()
    {
        return await _context.AppUsers.ToListAsync();
    }
}
