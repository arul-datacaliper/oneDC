using System.Security.Cryptography;

class Program
{
    private const int IterationCount = 10000;
    
    static void Main(string[] args)
    {
        string password = "password123";
        string hash = HashPassword(password);
        Console.WriteLine($"Password hash for '{password}':");
        Console.WriteLine(hash);
        Console.WriteLine();
        Console.WriteLine("Use this hash in your SQL INSERT statement:");
        Console.WriteLine($"'{hash}'");
    }
    
    static string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[32];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, IterationCount, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);

        return $"{IterationCount}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
}
