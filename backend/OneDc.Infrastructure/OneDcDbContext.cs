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
    public DbSet<WeeklyAllocation> WeeklyAllocations => Set<WeeklyAllocation>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<ProjectTask> ProjectTasks => Set<ProjectTask>();
    public DbSet<PasswordReset> PasswordResets => Set<PasswordReset>();
    public DbSet<FileBlob> FileBlobs => Set<FileBlob>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Schema
        b.HasDefaultSchema("ts");

        // ===== AppUser =====
        b.Entity<AppUser>(e =>
        {
            e.ToTable("app_user");
            e.HasKey(x => x.UserId);
            e.Property(x => x.EmployeeId).HasMaxLength(20);
            e.Property(x => x.Email).HasMaxLength(150).IsRequired();
            e.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(80).IsRequired();
            e.Property(x => x.Gender);
            e.Property(x => x.DateOfBirth);
            e.Property(x => x.DateOfJoining);
            e.Property(x => x.JobTitle).HasMaxLength(100);
            e.Property(x => x.Role).IsRequired();
            e.Property(x => x.Department).HasMaxLength(100);
            e.Property(x => x.EmployeeType).IsRequired();
            e.Property(x => x.PersonalEmail).HasMaxLength(150);
            e.Property(x => x.WorkEmail).HasMaxLength(150).IsRequired();
            e.Property(x => x.ContactNumber).HasMaxLength(30);
            e.Property(x => x.EmergencyContactNumber).HasMaxLength(30);
            
            // Present Address
            e.Property(x => x.PresentAddressLine1).HasMaxLength(200);
            e.Property(x => x.PresentAddressLine2).HasMaxLength(200);
            e.Property(x => x.PresentCity).HasMaxLength(80);
            e.Property(x => x.PresentState).HasMaxLength(80);
            e.Property(x => x.PresentCountry).HasMaxLength(80);
            e.Property(x => x.PresentZipCode).HasMaxLength(20);
            
            // Permanent Address
            e.Property(x => x.PermanentAddressLine1).HasMaxLength(200);
            e.Property(x => x.PermanentAddressLine2).HasMaxLength(200);
            e.Property(x => x.PermanentCity).HasMaxLength(80);
            e.Property(x => x.PermanentState).HasMaxLength(80);
            e.Property(x => x.PermanentCountry).HasMaxLength(80);
            e.Property(x => x.PermanentZipCode).HasMaxLength(20);
            
            e.Property(x => x.IsActive).IsRequired();
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(600);
            e.Property(x => x.LastLoginAt);
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
            e.Property(x => x.ContactPerson).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(150);
            e.Property(x => x.ContactNumber).HasMaxLength(30);
            e.Property(x => x.Country).HasMaxLength(80);
            e.Property(x => x.State).HasMaxLength(80);
            e.Property(x => x.City).HasMaxLength(80);
            e.Property(x => x.ZipCode).HasMaxLength(20);
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
            e.Property(x => x.TaskId).HasColumnName("task_id"); // Map TaskId to task_id column

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

            // 🔗 Timesheet → Task (optional)
            e.HasOne(t => t.Task)
             .WithMany()
             .HasForeignKey(t => t.TaskId)
             .OnDelete(DeleteBehavior.SetNull);
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

        // ===== ProjectTask =====
        b.Entity<ProjectTask>(e =>
        {
            e.ToTable("task");
            e.HasKey(x => x.TaskId);
            e.Property(x => x.Title).HasMaxLength(150).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.EstimatedHours).HasPrecision(8,2);
            e.Property(x => x.Status).IsRequired();
            e.HasIndex(x => x.ProjectId);
            e.HasIndex(x => new { x.ProjectId, x.Status });
            e.HasIndex(x => x.AssignedUserId);

            e.HasOne(x => x.Project)
             .WithMany()
             .HasForeignKey(x => x.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.AssignedUser)
             .WithMany()
             .HasForeignKey(x => x.AssignedUserId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== WeeklyAllocation =====
        b.Entity<WeeklyAllocation>(e =>
        {
            e.ToTable("weekly_allocation");
            e.HasKey(x => x.AllocationId);
            e.Property(x => x.AllocatedHours).IsRequired();
            e.Property(x => x.UtilizationPercentage).HasPrecision(5, 2);
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("ACTIVE");
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.UpdatedAt).IsRequired();
            
            e.HasIndex(x => new { x.ProjectId, x.UserId, x.WeekStartDate }).IsUnique();
            e.HasIndex(x => x.WeekStartDate);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.ProjectId);

            // 🔗 WeeklyAllocation → Project
            e.HasOne(wa => wa.Project)
             .WithMany()
             .HasForeignKey(wa => wa.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            // 🔗 WeeklyAllocation → AppUser
            e.HasOne(wa => wa.User)
             .WithMany()
             .HasForeignKey(wa => wa.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== PasswordReset =====
        b.Entity<PasswordReset>(entity =>
        {
            entity.ToTable("password_reset", "ts");
            entity.HasKey(e => e.ResetId);
            
            entity.Property(e => e.ResetId)
                .HasColumnName("reset_id");
                
            entity.Property(e => e.UserId)
                .HasColumnName("user_id")
                .IsRequired();
                
            entity.Property(e => e.Otp)
                .HasColumnName("otp")
                .HasMaxLength(6)
                .IsRequired();
                
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();
                
            entity.Property(e => e.ExpiresAt)
                .HasColumnName("expires_at")
                .IsRequired();
                
            entity.Property(e => e.UsedAt)
                .HasColumnName("used_at");
                
            entity.Property(e => e.IsUsed)
                .HasColumnName("is_used")
                .HasDefaultValue(false);
            
            // Foreign key relationship
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Indexes
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.Otp, e.UserId });
            entity.HasIndex(e => e.ExpiresAt);
        });

        // ===== FileBlob =====
        b.Entity<FileBlob>(e =>
        {
            e.ToTable("file_blob");
            e.HasKey(x => x.FileBlobId);
            e.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            e.Property(x => x.FileSize).IsRequired();
            e.Property(x => x.Data).IsRequired();
            e.Property(x => x.Container).HasMaxLength(100).IsRequired().HasDefaultValue("default");
            e.Property(x => x.CreatedAt).IsRequired();
            e.Property(x => x.LastAccessedAt);
            
            // Indexes
            e.HasIndex(x => new { x.Container, x.FileName }).IsUnique();
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.LastAccessedAt);
        });

        // ===== LeaveRequest =====
        b.Entity<LeaveRequest>(e =>
        {
            e.ToTable("leave_request");
            e.HasKey(x => x.Id);
            e.Property(x => x.EmployeeId).IsRequired();
            e.Property(x => x.StartDate).IsRequired();
            e.Property(x => x.EndDate).IsRequired();
            e.Property(x => x.LeaveType).HasMaxLength(50).IsRequired();
            e.Property(x => x.Reason).HasMaxLength(500);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired().HasDefaultValue("Pending");
            e.Property(x => x.ApproverId);
            e.Property(x => x.ApprovedDate);
            e.Property(x => x.ApproverComments).HasMaxLength(500);
            e.Property(x => x.CreatedDate).IsRequired();
            e.Property(x => x.ModifiedDate);
            e.Property(x => x.TotalDays).IsRequired();
            e.Property(x => x.IsHalfDay).IsRequired().HasDefaultValue(false);
            e.Property(x => x.HalfDayPeriod).HasMaxLength(20);

            // Relationships
            e.HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Approver)
                .WithMany()
                .HasForeignKey(x => x.ApproverId)
                .OnDelete(DeleteBehavior.SetNull);

            // Indexes
            e.HasIndex(x => x.EmployeeId);
            e.HasIndex(x => x.ApproverId);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => new { x.StartDate, x.EndDate });
            e.HasIndex(x => x.CreatedDate);
        });
    }
}
