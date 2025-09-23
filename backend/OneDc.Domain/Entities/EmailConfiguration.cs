namespace OneDc.Domain.Entities;

public class EmailConfiguration
{
    public string AzureEmailConnectionString { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
}

public class EmailTemplate
{
    public string Subject { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public string PlainTextContent { get; set; } = string.Empty;
}
