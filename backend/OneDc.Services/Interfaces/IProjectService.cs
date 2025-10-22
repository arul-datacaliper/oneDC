using OneDc.Domain.Entities;
using OneDc.Services.DTOs;

namespace OneDc.Services.Interfaces;

public interface IProjectService
{
    Task<IEnumerable<Project>> GetAllAsync();
    Task<Project?> GetByIdAsync(Guid id);
    Task<Project> CreateAsync(Project project);
    Task<Project?> UpdateAsync(Project project);
    Task<bool> DeleteAsync(Guid id);
    
    // New methods for project members
    Task<ProjectResponseDto> CreateWithMembersAsync(ProjectCreateDto projectDto);
    Task<ProjectResponseDto?> UpdateWithMembersAsync(ProjectUpdateDto projectDto);
    Task<ProjectResponseDto?> GetByIdWithMembersAsync(Guid id);
    Task<IEnumerable<ProjectResponseDto>> GetAllWithMembersAsync();
}
