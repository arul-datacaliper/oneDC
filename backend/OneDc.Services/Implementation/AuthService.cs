using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OneDc.Infrastructure;
using OneDc.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;

namespace OneDc.Services.Implementation;

public class AuthService : IAuthService
{
    private readonly OneDcDbContext _context;
    private readonly IConfiguration _config;
    private const int IterationCount = 10000;

    public AuthService(OneDcDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    public async Task<AuthResult?> LoginAsync(string email, string password)
    {
        var user = await _context.AppUsers.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user?.PasswordHash == null) return null;

        if (!VerifyPassword(password, user.PasswordHash)) return null;

        // Update last login
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return new AuthResult(token, user.UserId, user.Email, $"{user.FirstName} {user.LastName}", user.Role.ToString(), user.MustChangePassword);
    }

    public async Task SetPasswordAsync(Guid userId, string newPassword)
    {
        var user = await _context.AppUsers.FindAsync(userId);
        if (user == null) throw new InvalidOperationException("User not found");

        user.PasswordHash = HashPassword(newPassword);
        user.MustChangePassword = false; // Clear the flag when user sets a new password
        await _context.SaveChangesAsync();
    }

    private string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[32];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, IterationCount, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        return $"{IterationCount}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 3) return false;

        var iterations = int.Parse(parts[0]);
        var salt = Convert.FromBase64String(parts[1]);
        var hash = Convert.FromBase64String(parts[2]);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var testHash = pbkdf2.GetBytes(32);

        return hash.SequenceEqual(testHash);
    }
private string GenerateJwtToken(OneDc.Domain.Entities.AppUser user)
{
    var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? _config["Jwt:Key"] ?? "your-256-bit-secret";
    var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? _config["Jwt:Issuer"];
    var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? _config["Jwt:Audience"];
    
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
        new Claim(ClaimTypes.Role, user.Role.ToString())
    };

    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: DateTime.Now.AddDays(7),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}
}
