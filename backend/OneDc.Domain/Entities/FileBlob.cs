namespace OneDc.Domain.Entities;

public class FileBlob
{
    public Guid FileBlobId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public string Container { get; set; } = "default";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastAccessedAt { get; set; }
}
