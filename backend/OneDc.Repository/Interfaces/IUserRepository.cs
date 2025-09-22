using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces;

public interface IUserRepository
{
    Task<AppUser?> GetByEmailAsync(string email);
    Task<AppUser?> GetByIdAsync(Guid userId);
    Task<AppUser> CreateAsync(AppUser user);
    Task<AppUser> UpdateAsync(AppUser user);
    Task<bool> DeleteAsync(Guid userId);
    Task<List<AppUser>> GetAllAsync();
}
