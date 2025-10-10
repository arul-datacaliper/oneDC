using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation;

public class ProjectRepository : IProjectRepository
{
    private readonly OneDcDbContext _db;
    public ProjectRepository(OneDcDbContext db) => _db = db;

    public async Task<IEnumerable<Project>> GetAllAsync() =>
        await _db.Projects.Include(p => p.Client).AsNoTracking().ToListAsync();

    public async Task<Project?> GetByIdAsync(Guid id) =>
        await _db.Projects.Include(p => p.Client).FirstOrDefaultAsync(p => p.ProjectId == id);

    public async Task<bool> ExistsByCodeAsync(string code) =>
        await _db.Projects.AnyAsync(p => p.Code == code);

    public async Task AddAsync(Project project) => await _db.Projects.AddAsync(project);

    public Task UpdateAsync(Project project)
    {
        _db.Projects.Update(project);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Project project)
    {
        _db.Projects.Remove(project);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
