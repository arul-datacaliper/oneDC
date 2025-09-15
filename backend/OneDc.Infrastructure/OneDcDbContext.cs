using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;

namespace OneDc.Infrastructure;

public class OneDcDbContext : DbContext
{
    public OneDcDbContext(DbContextOptions<OneDcDbContext> options) : base(options) { }

    // DbSets
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectAllocation> ProjectAllocations => Set<ProjectAllocation>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Schema
        b.HasDefaultSchema("ts");

        // ===== AppUser =====
        b.Entity<AppUser>(e =>
        {
            e.ToTable("app_user");
            e.HasKey(x => x.UserId);
            e.Property(x => x.Email).HasMaxLength(150).IsRequired();
            e.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(80).IsRequired();
            e.Property(x => x.Role).IsRequired();
            e.Property(x => x.IsActive).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
        });

        // ===== Client =====
        b.Entity<Client>(e =>
        {
            e.ToTable("client");
            e.HasKey(x => x.ClientId);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Code).HasMaxLength(30);
            e.Property(x => x.Status).HasMaxLength(20);
            e.HasIndex(x => x.Code).IsUnique();
        });

        // ===== Project =====
        b.Entity<Project>(e =>
        {
            e.ToTable("project");
            e.HasKey(x => x.ProjectId);
            e.Property(x => x.Code).HasMaxLength(30).IsRequired();
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("ACTIVE");
            e.Property(x => x.Billable).HasDefaultValue(true);
            e.Property(x => x.BudgetHours).HasPrecision(10, 2);
            e.Property(x => x.BudgetCost).HasPrecision(12, 2);

            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => new { x.ClientId, x.Status });

            // 🔗 Project → Client (many-to-one)
            e.HasOne(p => p.Client)
             .WithMany() // no collection on Client for now
             .HasForeignKey(p => p.ClientId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== ProjectAllocation =====
        b.Entity<ProjectAllocation>(e =>
        {
            e.ToTable("project_allocation");
            e.HasKey(x => x.AllocationId);
            e.Property(x => x.AllocationPct).HasPrecision(5, 2);

            e.HasIndex(x => new { x.ProjectId, x.UserId, x.StartDate }).IsUnique();

            // 🔗 Allocation → Project
            e.HasOne(a => a.Project)
             .WithMany() // add Project.Allocations later if you want
             .HasForeignKey(a => a.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            // 🔗 Allocation → AppUser
            e.HasOne(a => a.User)
             .WithMany() // add AppUser.Allocations later if you want
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== TimesheetEntry =====
        b.Entity<TimesheetEntry>(e =>
        {
            e.ToTable("timesheet_entry");
            e.HasKey(x => x.EntryId);

            e.Property(x => x.Hours).HasPrecision(4, 2);
            e.Property(x => x.Status).IsRequired();
            e.Property(x => x.TaskType).IsRequired();

            e.HasIndex(x => new { x.UserId, x.WorkDate });
            e.HasIndex(x => new { x.ProjectId, x.WorkDate });

            // 🔗 Timesheet → Project
            e.HasOne(t => t.Project)
             .WithMany()
             .HasForeignKey(t => t.ProjectId)
             .OnDelete(DeleteBehavior.Restrict);

            // 🔗 Timesheet → AppUser
            e.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== Holiday =====
        b.Entity<Holiday>(e =>
        {
            e.ToTable("holiday");
            e.HasKey(x => x.HolidayDate);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Region).HasMaxLength(50).HasDefaultValue("IN");
        });

        // ===== AuditLog =====
        b.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_log");
            e.HasKey(x => x.AuditLogId);
            e.HasIndex(x => new { x.Entity, x.EntityId, x.At });
        });

        // ===== UserProfile =====
        b.Entity<UserProfile>(e =>
        {
            e.ToTable("user_profile");
            e.HasKey(x => x.UserProfileId);
            e.Property(x => x.Bio).HasMaxLength(1000);
            e.Property(x => x.Department).HasMaxLength(100);
            e.Property(x => x.JobTitle).HasMaxLength(100);
            e.Property(x => x.PhoneNumber).HasMaxLength(20);
            e.Property(x => x.Location).HasMaxLength(100);
            e.Property(x => x.EmployeeId).HasMaxLength(50);
            e.Property(x => x.ReportingManager).HasMaxLength(150);
            e.Property(x => x.EducationBackground).HasMaxLength(500);
            e.Property(x => x.Certifications).HasMaxLength(1000);
            e.Property(x => x.LinkedInProfile).HasMaxLength(200);
            e.Property(x => x.GitHubProfile).HasMaxLength(200);
            e.Property(x => x.ProfilePhotoUrl).HasMaxLength(500);
            
            // One-to-one relationship with AppUser
            e.HasOne(p => p.User)
             .WithOne()
             .HasForeignKey<UserProfile>(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasIndex(x => x.UserId).IsUnique();
        });

        // ===== UserSkill =====
        b.Entity<UserSkill>(e =>
        {
            e.ToTable("user_skill");
            e.HasKey(x => x.UserSkillId);
            e.Property(x => x.SkillName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Level).IsRequired();
            e.Property(x => x.YearsOfExperience).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            
            // Many-to-one relationship with AppUser
            e.HasOne(s => s.User)
             .WithMany()
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
             
            e.HasIndex(x => new { x.UserId, x.SkillName }).IsUnique();
        });
    }
}
