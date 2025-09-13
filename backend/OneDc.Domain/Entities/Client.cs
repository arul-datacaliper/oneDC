namespace OneDc.Domain.Entities;

public class Client
{
    public Guid ClientId { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE/INACTIVE
}
