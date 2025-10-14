using OneDc.Domain.Entities;

namespace OneDc.Services.DTOs;

public class ProjectCreateDto
{
    public Guid ClientId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
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
    public Guid UserId { get; set; }
    public ProjectRole ProjectRole { get; set; } = ProjectRole.MEMBER;
}

public class ProjectResponseDto
{
    public Guid ProjectId { get; set; }
    public Guid ClientId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
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
