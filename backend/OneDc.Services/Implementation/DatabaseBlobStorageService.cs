using Microsoft.Extensions.Configuration;
using OneDc.Infrastructure;
using OneDc.Services.Interfaces;
using OneDc.Services.Models;
using OneDc.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace OneDc.Services.Implementation;

public class DatabaseBlobStorageService : IFileStorageService
{
    private readonly OneDcDbContext _context;
    private readonly string _baseUrl;

    public DatabaseBlobStorageService(OneDcDbContext context, IConfiguration configuration)
    {
        _context = context;
        _baseUrl = configuration["FileStorage:BaseUrl"] ?? "/api/files";
    }

    public async Task<FileUploadResult> UploadFileAsync(Stream fileStream, string fileName, string contentType, string containerName = "profile-photos")
    {
        // Read stream to byte array
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream);
        var data = memoryStream.ToArray();

        // Generate unique filename
        var extension = Path.GetExtension(fileName);
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";

        var fileBlob = new FileBlob
        {
            FileBlobId = Guid.NewGuid(),
            FileName = uniqueFileName,
            OriginalFileName = fileName,
            ContentType = contentType,
            FileSize = data.Length,
            Data = data,
            Container = containerName,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.FileBlobs.Add(fileBlob);
        await _context.SaveChangesAsync();

        var fileUrl = $"{_baseUrl}/{containerName}/{uniqueFileName}";

        return new FileUploadResult
        {
            FileUrl = fileUrl,
            FileName = uniqueFileName,
            FileSize = data.Length,
            ContentType = contentType
        };
    }

    public async Task DeleteFileAsync(string fileUrl, string containerName = "profile-photos")
    {
        try
        {
            var fileName = Path.GetFileName(fileUrl);
            var fileBlob = await _context.FileBlobs
                .FirstOrDefaultAsync(f => f.FileName == fileName && f.Container == containerName);

            if (fileBlob != null)
            {
                _context.FileBlobs.Remove(fileBlob);
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to delete file {fileUrl}: {ex.Message}");
        }
    }

    public async Task<Stream> DownloadFileAsync(string fileUrl)
    {
        var fileName = Path.GetFileName(fileUrl);
        var urlParts = fileUrl.Split('/');
        var containerName = urlParts[urlParts.Length - 2];

        var fileBlob = await _context.FileBlobs
            .FirstOrDefaultAsync(f => f.FileName == fileName && f.Container == containerName);

        if (fileBlob == null)
        {
            throw new FileNotFoundException($"File not found: {fileName}");
        }

        // Update last accessed time
        fileBlob.LastAccessedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return new MemoryStream(fileBlob.Data);
    }

    public string GetFileUrl(string fileName, string containerName = "profile-photos")
    {
        return $"{_baseUrl}/{containerName}/{fileName}";
    }
}
