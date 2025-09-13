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
    }
}
