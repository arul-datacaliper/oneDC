namespace OneDc.Domain.Entities;

public class Client
{
    public Guid ClientId { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE/INACTIVE
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? ContactNumber { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? ZipCode { get; set; }
}
