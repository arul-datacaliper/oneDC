using OneDc.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace OneDc.Services.DTOs;

public class ProjectCreateDto
{
    [Required(ErrorMessage = "Client is required")]
    public Guid ClientId { get; set; }
    
    [Required(ErrorMessage = "Project code is required")]
    [StringLength(50, ErrorMessage = "Project code cannot exceed 50 characters")]
    public string Code { get; set; } = null!;
    
    [Required(ErrorMessage = "Project name is required")]
    [StringLength(200, ErrorMessage = "Project name cannot exceed 200 characters")]
    public string Name { get; set; } = null!;
    
    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; } // Add description field
    
    public string Status { get; set; } = "ACTIVE";
    public bool Billable { get; set; } = true;
    public Guid? DefaultApprover { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateOnly? PlannedReleaseDate { get; set; }
    public decimal? BudgetHours { get; set; }
    public decimal? BudgetCost { get; set; }
    public List<ProjectMemberDto> ProjectMembers { get; set; } = new();
}

public class ProjectUpdateDto : ProjectCreateDto
{
    public Guid ProjectId { get; set; }
}

public class ProjectMemberDto
{
    [Required(ErrorMessage = "User is required")]
    public Guid UserId { get; set; }
    
    [Required(ErrorMessage = "Project role is required")]
    public ProjectRole ProjectRole { get; set; } = ProjectRole.MEMBER;
}

public class ProjectResponseDto
{
    public Guid ProjectId { get; set; }
    public Guid ClientId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; } // Add description field
    public string Status { get; set; } = null!;
    public bool Billable { get; set; }
    public Guid? DefaultApprover { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateOnly? PlannedReleaseDate { get; set; }
    public decimal? BudgetHours { get; set; }
    public decimal? BudgetCost { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<ProjectMemberResponseDto> ProjectMembers { get; set; } = new();
    public Client? Client { get; set; }
}

public class ProjectMemberResponseDto
{
    public Guid UserId { get; set; }
    public ProjectRole ProjectRole { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public UserRole Role { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
}
