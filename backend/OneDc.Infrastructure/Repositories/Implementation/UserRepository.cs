using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure.Repositories.Interfaces;

namespace OneDc.Infrastructure.Repositories.Implementation;

public class UserRepository : IUserRepository
{
    private readonly OneDcDbContext _context;

    public UserRepository(OneDcDbContext context)
    {
        _context = context;
    }

    public async Task<AppUser?> GetByIdAsync(Guid id)
    {
        return await _context.AppUsers.FindAsync(id);
    }

    public async Task<AppUser?> GetByEmailAsync(string email)
    {
        return await _context.AppUsers
            .FirstOrDefaultAsync(u => u.Email == email || u.WorkEmail == email);
    }

    public async Task<AppUser?> GetByUserNameAsync(string userName)
    {
        // Since AppUser doesn't have UserName, search by Email instead
        return await _context.AppUsers
            .FirstOrDefaultAsync(u => u.Email == userName || u.WorkEmail == userName);
    }

    public async Task<AppUser> CreateAsync(AppUser user)
    {
        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(AppUser user)
    {
        _context.AppUsers.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(AppUser user)
    {
        _context.AppUsers.Remove(user);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AppUser>> GetAllAsync()
    {
        return await _context.AppUsers.ToListAsync();
    }

    public async Task<bool> ExistsAsync(Guid id)
    {
        return await _context.AppUsers.AnyAsync(u => u.UserId == id);
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _context.AppUsers.AnyAsync(u => u.Email == email || u.WorkEmail == email);
    }

    public async Task<bool> UserNameExistsAsync(string userName)
    {
        // Since AppUser doesn't have UserName, check by Email instead
        return await _context.AppUsers.AnyAsync(u => u.Email == userName || u.WorkEmail == userName);
    }
}
