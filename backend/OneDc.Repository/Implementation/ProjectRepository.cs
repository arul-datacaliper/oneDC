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

    public async Task AddAsync(Project project) => await _db.Projects.AddAsync(project);

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
