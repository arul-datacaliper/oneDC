using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;
using OneDc.Repository.Implementation;
using OneDc.Services.Interfaces;
using OneDc.Services.Implementation;
using OneDc.Infrastructure.Repositories.Interfaces;
using OneDc.Infrastructure.Repositories.Implementation;
using Microsoft.OpenApi.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using OneDc.Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using OneDc.Api.JsonConverters;
using System.Security.Cryptography;
using Azure.Communication.Email;

using DotNetEnv;

// Load environment variables from .env file
Env.Load();


var builder = WebApplication.CreateBuilder(args);

// Configure configuration to use environment variables
builder.Configuration.AddEnvironmentVariables();
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
// DbContext  
var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING") ?? 
                       builder.Configuration.GetConnectionString("OneDcDb");

builder.Services.AddDbContext<OneDcDbContext>(opt =>
    opt.UseNpgsql(connectionString)
       .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITimesheetRepository, TimesheetRepository>();
builder.Services.AddScoped<ITimesheetService, TimesheetService>();
builder.Services.AddScoped<IApprovalRepository, ApprovalRepository>();
builder.Services.AddScoped<IApprovalService, ApprovalService>();
builder.Services.AddScoped<IReportsRepository, ReportsRepository>();
builder.Services.AddScoped<IReportsService, ReportsService>();
builder.Services.AddScoped<IComplianceRepository, ComplianceRepository>();
builder.Services.AddScoped<IComplianceService, ComplianceService>();
builder.Services.AddScoped<ILockRepository, LockRepository>();
builder.Services.AddScoped<ILockService, LockService>();
builder.Services.AddScoped<IUnlockRepository, UnlockRepository>();
builder.Services.AddScoped<IUnlockService, UnlockService>();
builder.Services.AddScoped<IOnboardingRepository, OnboardingRepository>();
builder.Services.AddScoped<IOnboardingService, OnboardingService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// Password Reset Services
builder.Services.AddScoped<OneDc.Infrastructure.Repositories.Interfaces.IPasswordResetRepository, OneDc.Infrastructure.Repositories.Implementation.PasswordResetRepository>();
builder.Services.AddScoped<OneDc.Infrastructure.Repositories.Interfaces.IUserRepository, OneDc.Infrastructure.Repositories.Implementation.UserRepository>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// Azure Email Communication Service
var azureEmailConnectionString = Environment.GetEnvironmentVariable("AZURE_EMAIL_CONNECTION_STRING") ?? 
                                builder.Configuration["AzureEmail:ConnectionString"] ?? "";
builder.Services.AddSingleton(new EmailClient(azureEmailConnectionString));

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? builder.Configuration["Jwt:Issuer"],
            ValidAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? builder.Configuration["Jwt:Key"] ?? "your-256-bit-secret"))
        };
    });

builder.Services.AddAuthorization();
// Controllers & Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        // Ensure DateOnly serializes as YYYY-MM-DD format
        options.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Angular dev server
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

//builder.Services.AddSwaggerGen();


builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "OneDC API", Version = "v1" });

    // JWT Bearer authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT with Bearer into field",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});



var app = builder.Build();

// Ensure database is created and migrated
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OneDcDbContext>();
    
    // Apply any pending migrations
    await context.Database.MigrateAsync();
    
    // Only seed data in development environment
    if (app.Environment.IsDevelopment())
    {
        await SeedTestDataAsync(context);
    }
    else
    {
        // In production, only create the admin user if it doesn't exist
        await SeedProductionDataAsync(context);
    }
}

app.UseSwagger();
app.UseSwaggerUI();

// Enable CORS
app.UseCors("AllowAngularApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

// Add method to hash passwords (same as AuthService)
static string HashPassword(string password)
{
    // Use the same method as AuthService for consistency
    using var rng = RandomNumberGenerator.Create();
    var salt = new byte[32];
    rng.GetBytes(salt);

    using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256);
    var hash = pbkdf2.GetBytes(32);

    return $"10000.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
}

static async Task SeedTestDataAsync(OneDcDbContext context)
{
    // Force update password hashes to fix format mismatch
    var existingUsers = await context.AppUsers.ToListAsync();
    
    if (existingUsers.Any())
    {
        // Update all existing users with correct password format and address data
        foreach (var user in existingUsers)
        {
            user.PasswordHash = HashPassword("password123");
            
            // Add missing fields if they don't exist
            if (string.IsNullOrEmpty(user.WorkEmail))
            {
                user.WorkEmail = user.Email;
            }
            
            // Add address data if missing
            if (string.IsNullOrEmpty(user.PresentAddressLine1))
            {
                switch (user.FirstName)
                {
                    case "Admin":
                        user.JobTitle = "System Administrator";
                        user.Department = "IT";
                        user.EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME;
                        user.Gender = OneDc.Domain.Entities.Gender.PREFER_NOT_TO_SAY;
                        user.DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddYears(-2));
                        user.DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-30));
                        user.ContactNumber = "+1-555-0101";
                        user.EmergencyContactNumber = "+1-555-0102";
                        user.PersonalEmail = "admin.personal@gmail.com";
                        user.PresentAddressLine1 = "123 Admin Street";
                        user.PresentAddressLine2 = "Apt 1A";
                        user.PresentCity = "New York";
                        user.PresentState = "NY";
                        user.PresentCountry = "USA";
                        user.PresentZipCode = "10001";
                        user.PermanentAddressLine1 = "123 Admin Street";
                        user.PermanentAddressLine2 = "Apt 1A";
                        user.PermanentCity = "New York";
                        user.PermanentState = "NY";
                        user.PermanentCountry = "USA";
                        user.PermanentZipCode = "10001";
                        break;
                    case "Project":
                        user.JobTitle = "Project Manager";
                        user.Department = "Operations";
                        user.EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME;
                        user.Gender = OneDc.Domain.Entities.Gender.MALE;
                        user.DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddYears(-3));
                        user.DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-35));
                        user.ContactNumber = "+1-555-0201";
                        user.EmergencyContactNumber = "+1-555-0202";
                        user.PersonalEmail = "project.manager@gmail.com";
                        user.PresentAddressLine1 = "456 Manager Avenue";
                        user.PresentAddressLine2 = "Suite 200";
                        user.PresentCity = "Los Angeles";
                        user.PresentState = "CA";
                        user.PresentCountry = "USA";
                        user.PresentZipCode = "90210";
                        user.PermanentAddressLine1 = "789 Permanent Lane";
                        user.PermanentAddressLine2 = "";
                        user.PermanentCity = "San Francisco";
                        user.PermanentState = "CA";
                        user.PermanentCountry = "USA";
                        user.PermanentZipCode = "94102";
                        break;
                    case "John":
                        user.JobTitle = "Senior Software Developer";
                        user.Department = "Engineering";
                        user.EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME;
                        user.Gender = OneDc.Domain.Entities.Gender.MALE;
                        user.DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddYears(-1));
                        user.DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-28));
                        user.ContactNumber = "+1-555-0301";
                        user.EmergencyContactNumber = "+1-555-0302";
                        user.PersonalEmail = "john.dev@gmail.com";
                        user.PresentAddressLine1 = "789 Developer Drive";
                        user.PresentAddressLine2 = "Unit 5B";
                        user.PresentCity = "Austin";
                        user.PresentState = "TX";
                        user.PresentCountry = "USA";
                        user.PresentZipCode = "73301";
                        user.PermanentAddressLine1 = "789 Developer Drive";
                        user.PermanentAddressLine2 = "Unit 5B";
                        user.PermanentCity = "Austin";
                        user.PermanentState = "TX";
                        user.PermanentCountry = "USA";
                        user.PermanentZipCode = "73301";
                        break;
                    case "Jane":
                        user.JobTitle = "Quality Assurance Engineer";
                        user.Department = "Engineering";
                        user.EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME;
                        user.Gender = OneDc.Domain.Entities.Gender.FEMALE;
                        user.DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddMonths(-8));
                        user.DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-26));
                        user.ContactNumber = "+1-555-0401";
                        user.EmergencyContactNumber = "+1-555-0402";
                        user.PersonalEmail = "jane.tester@gmail.com";
                        user.PresentAddressLine1 = "321 Quality Street";
                        user.PresentAddressLine2 = "";
                        user.PresentCity = "Seattle";
                        user.PresentState = "WA";
                        user.PresentCountry = "USA";
                        user.PresentZipCode = "98101";
                        user.PermanentAddressLine1 = "654 Testing Boulevard";
                        user.PermanentAddressLine2 = "Apt 12C";
                        user.PermanentCity = "Portland";
                        user.PermanentState = "OR";
                        user.PermanentCountry = "USA";
                        user.PermanentZipCode = "97201";
                        break;
                    case "Alex":
                        user.JobTitle = "UX/UI Designer";
                        user.Department = "Design";
                        user.EmployeeType = OneDc.Domain.Entities.EmployeeType.CONTRACT;
                        user.Gender = OneDc.Domain.Entities.Gender.OTHER;
                        user.DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddMonths(-6));
                        user.DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-29));
                        user.ContactNumber = "+1-555-0501";
                        user.EmergencyContactNumber = "+1-555-0502";
                        user.PersonalEmail = "alex.designer@gmail.com";
                        user.PresentAddressLine1 = "987 Design Plaza";
                        user.PresentAddressLine2 = "Floor 15";
                        user.PresentCity = "Chicago";
                        user.PresentState = "IL";
                        user.PresentCountry = "USA";
                        user.PresentZipCode = "60601";
                        user.PermanentAddressLine1 = "987 Design Plaza";
                        user.PermanentAddressLine2 = "Floor 15";
                        user.PermanentCity = "Chicago";
                        user.PermanentState = "IL";
                        user.PermanentCountry = "USA";
                        user.PermanentZipCode = "60601";
                        break;
                }
            }
        }
        await context.SaveChangesAsync();
        return; // Users updated with correct passwords and address data
    }
    
    // Create all users from scratch
    var users = new List<OneDc.Domain.Entities.AppUser>
    {
        // Admin user
        new OneDc.Domain.Entities.AppUser
        {
            UserId = Guid.Parse("59bd99db-9be0-4a55-a062-ecf8636896ad"),
            Email = "admin@onedc.local",
            WorkEmail = "admin@onedc.local",
            FirstName = "Admin",
            LastName = "User",
            Role = OneDc.Domain.Entities.UserRole.ADMIN,
            JobTitle = "System Administrator",
            Department = "IT",
            EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME,
            Gender = OneDc.Domain.Entities.Gender.PREFER_NOT_TO_SAY,
            DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddYears(-2)),
            DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-30)),
            ContactNumber = "+1-555-0101",
            EmergencyContactNumber = "+1-555-0102",
            PersonalEmail = "admin.personal@gmail.com",
            PresentAddressLine1 = "123 Admin Street",
            PresentAddressLine2 = "Apt 1A",
            PresentCity = "New York",
            PresentState = "NY",
            PresentCountry = "USA",
            PresentZipCode = "10001",
            PermanentAddressLine1 = "123 Admin Street",
            PermanentAddressLine2 = "Apt 1A",
            PermanentCity = "New York",
            PermanentState = "NY",
            PermanentCountry = "USA",
            PermanentZipCode = "10001",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            PasswordHash = HashPassword("password123")
        },
        
        // Approver user
        new OneDc.Domain.Entities.AppUser
        {
            UserId = Guid.Parse("f6f173b6-ac51-4944-9082-e670533438e9"),
            Email = "approver@onedc.local",
            WorkEmail = "approver@onedc.local",
            FirstName = "Project",
            LastName = "Manager",
            Role = OneDc.Domain.Entities.UserRole.APPROVER,
            JobTitle = "Project Manager",
            Department = "Operations",
            EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME,
            Gender = OneDc.Domain.Entities.Gender.MALE,
            DateOfJoining = DateOnly.FromDateTime(DateTime.Now.AddYears(-3)),
            DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-35)),
            ContactNumber = "+1-555-0201",
            EmergencyContactNumber = "+1-555-0202",
            PersonalEmail = "project.manager@gmail.com",
            PresentAddressLine1 = "456 Manager Avenue",
            PresentAddressLine2 = "Suite 200",
            PresentCity = "Los Angeles",
            PresentState = "CA",
            PresentCountry = "USA",
            PresentZipCode = "90210",
            PermanentAddressLine1 = "789 Permanent Lane",
            PermanentAddressLine2 = "",
            PermanentCity = "San Francisco",
            PermanentState = "CA",
            PermanentCountry = "USA",
            PermanentZipCode = "94102",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            PasswordHash = HashPassword("password123")
        },
        
        // Developer user
       
        
        // QA user
       
        
        // UX user
       
    };
    
    // Add all users
    context.AppUsers.AddRange(users);
    
    // Create test client only if it doesn't exist
    if (!await context.Clients.AnyAsync(c => c.ClientId == Guid.Parse("11111111-1111-1111-1111-111111111111")))
    {
        var testClient = new OneDc.Domain.Entities.Client
        {
            ClientId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Demo Client",
            Code = "DEMO",
            Status = "ACTIVE"
        };
        context.Clients.Add(testClient);
    }
    
    // Create test projects only if they don't exist
    if (!await context.Projects.AnyAsync())
    {
        var approverUser = users.First(u => u.Role == OneDc.Domain.Entities.UserRole.APPROVER);
        var employeeUser = users.First(u => u.Role == OneDc.Domain.Entities.UserRole.EMPLOYEE);
        
        var testProject1 = new OneDc.Domain.Entities.Project
        {
            ProjectId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            ClientId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "DEMO",
            Name = "Demo Project",
            Status = "ACTIVE",
            Billable = true,
            DefaultApprover = approverUser.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        
        var testProject2 = new OneDc.Domain.Entities.Project
        {
            ProjectId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            ClientId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "INTERNAL",
            Name = "Internal Work",
            Status = "ACTIVE",
            Billable = false,
            DefaultApprover = approverUser.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var testProject3 = new OneDc.Domain.Entities.Project
        {
            ProjectId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            ClientId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Code = "PR000J3",
            Name = "Remap",
            Status = "ACTIVE", 
            Billable = true,
            DefaultApprover = approverUser.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        
        context.Projects.AddRange(testProject1, testProject2, testProject3);
    }

    // Seed sample tasks - force creation for testing
    var existingTasks = await context.ProjectTasks.ToListAsync();
    Console.WriteLine($"Existing tasks count: {existingTasks.Count}");
    if (existingTasks.Count == 0)
    {
        Console.WriteLine("Seeding sample tasks...");
        var demoProjectId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var internalProjectId = Guid.Parse("33333333-3333-3333-3333-333333333333"); 
        var remapProjectId = Guid.Parse("44444444-4444-4444-4444-444444444444");
        // Get specific user IDs for task assignment
        var adminUserId = Guid.Parse("59bd99db-9be0-4a55-a062-ecf8636896ad");
        var approverUserId = Guid.Parse("f6f173b6-ac51-4944-9082-e670533438e9");
        var developerUserId = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        var qaUserId = Guid.Parse("b2c3d4e5-f637-8901-bcde-f23456789012");
        var uxUserId = Guid.Parse("c3d4e5f6-a7b8-9012-cdef-345678901234");

        var sampleTasks = new[]
        {
            // DEMO Project Tasks - Assigned to different users
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = demoProjectId,
                Title = "Frontend Component Development",
                Description = "Develop React components for the demo application",
                Label = "Frontend",
                EstimatedHours = 16,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = developerUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(7))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = demoProjectId,
                Title = "API Integration",
                Description = "Integrate with backend APIs",
                Label = "Backend",
                EstimatedHours = 12,
                Status = OneDc.Domain.Entities.TaskStatus.IN_PROGRESS,
                AssignedUserId = developerUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(5))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = demoProjectId,
                Title = "Database Schema Updates",
                Description = "Update database schema for demo requirements",
                Label = "Database",
                EstimatedHours = 8,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = adminUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(3))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = demoProjectId,
                Title = "Testing & QA",
                Description = "Comprehensive testing of demo features",
                Label = "QA",
                EstimatedHours = 20,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = qaUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(5)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(12))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = demoProjectId,
                Title = "UX Design Review",
                Description = "Review and improve user experience design",
                Label = "UX",
                EstimatedHours = 6,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = uxUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2))
            },

            // INTERNAL Project Tasks
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = internalProjectId,
                Title = "Team Meeting",
                Description = "Weekly team sync and planning",
                Label = "Meeting",
                EstimatedHours = 2,
                Status = OneDc.Domain.Entities.TaskStatus.COMPLETED,
                AssignedUserId = approverUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-2)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-1))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = internalProjectId,
                Title = "Code Review",
                Description = "Review and approve code changes",
                Label = "Review",
                EstimatedHours = 4,
                Status = OneDc.Domain.Entities.TaskStatus.IN_PROGRESS,
                AssignedUserId = approverUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = internalProjectId,
                Title = "Documentation",
                Description = "Update project documentation",
                Label = "Docs",
                EstimatedHours = 6,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = developerUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(4))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = internalProjectId,
                Title = "Process Improvement",
                Description = "Analyze and improve development processes",
                Label = "Process",
                EstimatedHours = 10,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = adminUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(3)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(10))
            },

            // Remap Project Tasks
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = remapProjectId,
                Title = "Data Migration",
                Description = "Migrate existing data to new schema",
                Label = "Migration",
                EstimatedHours = 24,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = developerUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(14))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = remapProjectId,
                Title = "UI/UX Redesign",
                Description = "Redesign user interface for better UX",
                Label = "Design",
                EstimatedHours = 18,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = uxUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(10))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = remapProjectId,
                Title = "Performance Optimization",
                Description = "Optimize application performance",
                Label = "Performance",
                EstimatedHours = 14,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = developerUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(9))
            },
            new OneDc.Domain.Entities.ProjectTask
            {
                TaskId = Guid.NewGuid(),
                ProjectId = remapProjectId,
                Title = "Bug Fixes",
                Description = "Fix reported bugs and issues",
                Label = "Bug",
                EstimatedHours = 16,
                Status = OneDc.Domain.Entities.TaskStatus.NEW,
                AssignedUserId = qaUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                StartDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                EndDate = DateOnly.FromDateTime(DateTime.Now.AddDays(8))
            }
        };

        context.ProjectTasks.AddRange(sampleTasks);
        Console.WriteLine($"Added {sampleTasks.Length} sample tasks");
    }
    else 
    {
        Console.WriteLine("Tasks already exist, skipping seeding");
    }
    
    // Save all changes
    await context.SaveChangesAsync();
}

// Production data seeding - only creates essential admin user
static async Task SeedProductionDataAsync(OneDcDbContext context)
{
    // Check if any users exist
    if (!await context.AppUsers.AnyAsync())
    {
        // Create only the admin user for production
        var adminUser = new OneDc.Domain.Entities.AppUser
        {
            UserId = Guid.NewGuid(),
            Email = "admin@yourcompany.com", // Change this to your company email
            WorkEmail = "admin@yourcompany.com",
            FirstName = "System",
            LastName = "Administrator",
            Role = OneDc.Domain.Entities.UserRole.ADMIN,
            JobTitle = "System Administrator",
            Department = "IT",
            EmployeeType = OneDc.Domain.Entities.EmployeeType.FULL_TIME,
            Gender = OneDc.Domain.Entities.Gender.PREFER_NOT_TO_SAY,
            DateOfJoining = DateOnly.FromDateTime(DateTime.Now),
            DateOfBirth = DateOnly.FromDateTime(DateTime.Now.AddYears(-30)),
            ContactNumber = "+1-000-000-0000",
            EmergencyContactNumber = "+1-000-000-0001",
            PersonalEmail = "admin.personal@yourcompany.com",
            PresentAddressLine1 = "Your Company Address",
            PresentCity = "Your City",
            PresentState = "Your State", 
            PresentCountry = "Your Country",
            PresentZipCode = "00000",
            PermanentAddressLine1 = "Your Company Address",
            PermanentCity = "Your City",
            PermanentState = "Your State",
            PermanentCountry = "Your Country", 
            PermanentZipCode = "00000",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            PasswordHash = HashPassword("YourSecurePassword123!") // Change this password!
        };
        
        context.AppUsers.Add(adminUser);
        await context.SaveChangesAsync();
        
        Console.WriteLine("Production admin user created successfully.");
        Console.WriteLine("Email: admin@yourcompany.com");
        Console.WriteLine("Password: YourSecurePassword123!");
        Console.WriteLine("IMPORTANT: Change these credentials after first login!");
    }
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
