using OneDc.Domain.Entities;

namespace OneDc.Domain.Interfaces;

public interface IEmployeeRepository
{
    Task<AppUser?> GetByIdAsync(Guid userId);
    Task<IEnumerable<AppUser>> GetAllAsync();
}
