using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;
using OneDc.Repository.Implementation;
using OneDc.Services.Interfaces;
using OneDc.Services.Implementation;
using Microsoft.OpenApi.Models;
using System.Text.Json;
using OneDc.Domain.Entities;



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






// Controllers & Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
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

    // 👇 add custom header for debugging
    c.AddSecurityDefinition("X-Debug-UserId", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "X-Debug-UserId",
        Type = SecuritySchemeType.ApiKey,
        Description = "Temporary header to identify the current user"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "X-Debug-UserId"
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
        UserId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
        Email = "test@example.com",
        FirstName = "Test",
        LastName = "User",
        Role = OneDc.Domain.Entities.UserRole.EMPLOYEE,
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
        CreatedAt = DateTimeOffset.UtcNow
    };
    
    context.AppUsers.Add(testUser);
    context.Clients.Add(testClient);
    context.Projects.AddRange(testProject1, testProject2);
    
    await context.SaveChangesAsync();
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
