using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace OneDc.Services.Models;

public class ClientDto
{
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    public string Name { get; set; } = null!;

    [StringLength(20, ErrorMessage = "Code cannot exceed 20 characters")]
    public string? Code { get; set; }

    [Required(ErrorMessage = "Status is required")]
    [RegularExpression("^(ACTIVE|INACTIVE)$", ErrorMessage = "Status must be either ACTIVE or INACTIVE")]
    public string Status { get; set; } = "ACTIVE";

    [StringLength(100, ErrorMessage = "Contact person name cannot exceed 100 characters")]
    public string? ContactPerson { get; set; }

    [EmailAddress(ErrorMessage = "Please enter a valid email address")]
    [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters")]
    public string? Email { get; set; }

    [ContactNumber(ErrorMessage = "Contact number can only contain digits, spaces, hyphens, parentheses, and + (at the start)")]
    [StringLength(30, ErrorMessage = "Contact number cannot exceed 30 characters")]
    public string? ContactNumber { get; set; }

    [StringLength(80, ErrorMessage = "Country cannot exceed 80 characters")]
    public string? Country { get; set; }

    [StringLength(80, ErrorMessage = "State/Province cannot exceed 80 characters")]
    public string? State { get; set; }

    [StringLength(80, ErrorMessage = "City cannot exceed 80 characters")]
    public string? City { get; set; }

    [ZipCode(ErrorMessage = "Zip code can only contain letters, numbers, spaces, and hyphens")]
    [StringLength(20, ErrorMessage = "Zip code cannot exceed 20 characters")]
    public string? ZipCode { get; set; }
}

/// <summary>
/// Custom validation attribute for contact numbers
/// Validates that contact number contains only digits, spaces, hyphens, parentheses, and + (at the start)
/// Requires at least 10 digits and maximum 15 digits
/// </summary>
public class ContactNumberAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
        {
            return ValidationResult.Success; // Null or empty is valid (use [Required] for mandatory)
        }

        var contactNumber = value.ToString()!.Trim();

        // Check for valid characters: digits, spaces, hyphens, parentheses, and + (only at start)
        var validCharactersPattern = @"^[\d\s\-\(\)]+$|^\+[\d\s\-\(\)]+$";
        if (!Regex.IsMatch(contactNumber, validCharactersPattern))
        {
            return new ValidationResult("Contact number can only contain digits, spaces, hyphens, parentheses, and + (at the start)");
        }

        // Ensure + only appears at the start
        if (contactNumber.Contains('+'))
        {
            if (!contactNumber.StartsWith('+') || contactNumber.IndexOf('+', 1) != -1)
            {
                return new ValidationResult("The + symbol can only appear at the start of the contact number");
            }
        }

        // Count digits only
        var digitsOnly = Regex.Replace(contactNumber, @"[\s\-\(\)\+]", "");

        if (digitsOnly.Length < 10)
        {
            return new ValidationResult("Contact number must contain at least 10 digits");
        }

        if (digitsOnly.Length > 15)
        {
            return new ValidationResult("Contact number cannot exceed 15 digits");
        }

        return ValidationResult.Success;
    }
}

/// <summary>
/// Custom validation attribute for zip/postal codes
/// Validates that zip code contains only alphanumeric characters, spaces, and hyphens
/// Maximum 10 characters
/// </summary>
public class ZipCodeAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
        {
            return ValidationResult.Success; // Null or empty is valid (use [Required] for mandatory)
        }

        var zipCode = value.ToString()!.Trim();

        // Check for valid characters: alphanumeric, spaces, and hyphens
        var zipCodePattern = @"^[A-Za-z0-9\s\-]+$";
        if (!Regex.IsMatch(zipCode, zipCodePattern))
        {
            return new ValidationResult("Zip code can only contain letters, numbers, spaces, and hyphens");
        }

        if (zipCode.Length > 10)
        {
            return new ValidationResult("Zip code cannot exceed 10 characters");
        }

        return ValidationResult.Success;
    }
}
