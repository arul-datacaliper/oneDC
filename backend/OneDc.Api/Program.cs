using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;
using OneDc.Repository.Implementation;
using OneDc.Services.Interfaces;
using OneDc.Services.Implementation;
using Microsoft.OpenApi.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using OneDc.Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using OneDc.Api.JsonConverters;



var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
// DbContext
builder.Services.AddDbContext<OneDcDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("OneDcDb"))
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
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "your-256-bit-secret"))
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

// Ensure database is created and seed test data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<OneDcDbContext>();
    await SeedTestDataAsync(context);
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

static async Task SeedTestDataAsync(OneDcDbContext context)
{
    // Check if we already have users
    if (await context.AppUsers.AnyAsync())
        return; // Already seeded
    
    // Create test user
    var testUser = new OneDc.Domain.Entities.AppUser
    {
        UserId = Guid.Parse("59bd99db-9be0-4a55-a062-ecf8636896ad"),
        Email = "admin@onedc.com",
        FirstName = "Admin",
        LastName = "User",
        Role = OneDc.Domain.Entities.UserRole.ADMIN,
        IsActive = true,
        CreatedAt = DateTimeOffset.UtcNow
    };
    
    // Create test approver
    var testApprover = new OneDc.Domain.Entities.AppUser
    {
        UserId = Guid.Parse("f6f173b6-ac51-4944-9082-e670533438e9"),
        Email = "approver@onedc.com",
        FirstName = "Project",
        LastName = "Manager",
        Role = OneDc.Domain.Entities.UserRole.APPROVER,
        IsActive = true,
        CreatedAt = DateTimeOffset.UtcNow
    };
    
    // Create test client
    var testClient = new OneDc.Domain.Entities.Client
    {
        ClientId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        Name = "Demo Client",
        Code = "DEMO",
        Status = "ACTIVE"
    };
    
    // Create test projects
    var testProject1 = new OneDc.Domain.Entities.Project
    {
        ProjectId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
        ClientId = testClient.ClientId,
        Code = "DEMO",
        Name = "Demo Project",
        Status = "ACTIVE",
        Billable = true,
        DefaultApprover = testApprover.UserId,
        CreatedAt = DateTimeOffset.UtcNow
    };
    
    var testProject2 = new OneDc.Domain.Entities.Project
    {
        ProjectId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
        ClientId = testClient.ClientId,
        Code = "INTERNAL",
        Name = "Internal Work",
        Status = "ACTIVE",
        Billable = false,
        DefaultApprover = testApprover.UserId,
        CreatedAt = DateTimeOffset.UtcNow
    };
    
    context.AppUsers.AddRange(testUser, testApprover);
    context.Clients.Add(testClient);
    context.Projects.AddRange(testProject1, testProject2);
    
    await context.SaveChangesAsync();
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
