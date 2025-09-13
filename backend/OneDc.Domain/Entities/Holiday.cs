namespace OneDc.Domain.Entities;

public class Holiday
{
    public DateOnly HolidayDate { get; set; }
    public string Name { get; set; } = null!;
    public string Region { get; set; } = "IN";
}
