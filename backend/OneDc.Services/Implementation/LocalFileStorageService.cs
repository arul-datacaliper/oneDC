using Microsoft.Extensions.Configuration;
using OneDc.Services.Interfaces;
using OneDc.Services.Models;

namespace OneDc.Services.Implementation;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _baseUploadPath;
    private readonly string _baseUrl;

    public LocalFileStorageService(IConfiguration configuration)
    {
        _baseUploadPath = configuration["FileStorage:BasePath"] ?? "uploads";
        _baseUrl = configuration["FileStorage:BaseUrl"] ?? "/uploads";
        
        // Ensure base upload directory exists
        Directory.CreateDirectory(_baseUploadPath);
    }

    public async Task<FileUploadResult> UploadFileAsync(Stream fileStream, string fileName, string contentType, string containerName = "profile-photos")
    {
        // Create container directory if it doesn't exist
        var containerPath = Path.Combine(_baseUploadPath, containerName);
        Directory.CreateDirectory(containerPath);

        // Generate unique filename with timestamp and GUID
        var extension = Path.GetExtension(fileName);
        var timestamp = DateTimeOffset.UtcNow.ToString("yyyyMMdd_HHmmss");
        var uniqueFileName = $"{timestamp}_{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(containerPath, uniqueFileName);

        // Save file
        using (var fileStream2 = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(fileStream2);
        }

        // Generate public URL
        var fileUrl = $"{_baseUrl}/{containerName}/{uniqueFileName}";

        return new FileUploadResult
        {
            FileUrl = fileUrl,
            FileName = uniqueFileName,
            FileSize = fileStream.Length,
            ContentType = contentType
        };
    }

    public async Task DeleteFileAsync(string fileUrl, string containerName = "profile-photos")
    {
        try
        {
            var fileName = Path.GetFileName(fileUrl);
            var filePath = Path.Combine(_baseUploadPath, containerName, fileName);
            
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            // Log error but don't throw - deletion failure shouldn't break the flow
            Console.WriteLine($"Failed to delete file {fileUrl}: {ex.Message}");
        }
        
        await Task.CompletedTask;
    }

    public async Task<Stream> DownloadFileAsync(string fileUrl)
    {
        var fileName = Path.GetFileName(fileUrl);
        var urlParts = fileUrl.Split('/');
        var containerName = urlParts[urlParts.Length - 2];
        
        var filePath = Path.Combine(_baseUploadPath, containerName, fileName);
        
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        return await Task.FromResult(new FileStream(filePath, FileMode.Open, FileAccess.Read));
    }

    public string GetFileUrl(string fileName, string containerName = "profile-photos")
    {
        return $"{_baseUrl}/{containerName}/{fileName}";
    }
}
