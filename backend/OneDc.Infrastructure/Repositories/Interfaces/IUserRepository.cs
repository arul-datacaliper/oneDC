using OneDc.Domain.Entities;

namespace OneDc.Infrastructure.Repositories.Interfaces;

public interface IUserRepository
{
    Task<AppUser?> GetByIdAsync(Guid id);
    Task<AppUser?> GetByEmailAsync(string email);
    Task<AppUser?> GetByUserNameAsync(string userName);
    Task<AppUser> CreateAsync(AppUser user);
    Task UpdateAsync(AppUser user);
    Task DeleteAsync(AppUser user);
    Task<List<AppUser>> GetAllAsync();
    Task<bool> ExistsAsync(Guid id);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> UserNameExistsAsync(string userName);
}
