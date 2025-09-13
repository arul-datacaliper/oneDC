using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;
using OneDc.Repository.Implementation;
using OneDc.Services.Interfaces;
using OneDc.Services.Implementation;
using Microsoft.OpenApi.Models;



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
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
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
app.UseSwagger();
app.UseSwaggerUI();
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

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
