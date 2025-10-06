using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OneDc.Services.Interfaces;
using OneDc.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace OneDc.Api.Controllers;

[ApiController]
[Route("api/files")]
[AllowAnonymous] // Files should be publicly accessible once uploaded
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _fileStorageService;
    private readonly OneDcDbContext _context;

    public FilesController(IFileStorageService fileStorageService, OneDcDbContext context)
    {
        _fileStorageService = fileStorageService;
        _context = context;
    }

    // GET api/files/{container}/{fileName}
    [HttpGet("{container}/{fileName}")]
    public async Task<IActionResult> GetFile(string container, string fileName)
    {
        try
        {
            // Get file info from database for better content type detection
            var fileInfo = await _context.FileBlobs
                .Where(f => f.Container == container && f.FileName == fileName)
                .Select(f => new { f.ContentType, f.OriginalFileName })
                .FirstOrDefaultAsync();

            var fileUrl = _fileStorageService.GetFileUrl(fileName, container);
            var fileStream = await _fileStorageService.DownloadFileAsync(fileUrl);

            var contentType = fileInfo?.ContentType ?? GetContentTypeFromFileName(fileName);
            
            // Add cache headers for better performance
            Response.Headers.Append("Cache-Control", "public, max-age=31536000"); // 1 year
            Response.Headers.Append("ETag", $"\"{fileName}\"");
            
            return File(fileStream, contentType, enableRangeProcessing: true);
        }
        catch (FileNotFoundException)
        {
            return NotFound($"File {fileName} not found in container {container}");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving file: {ex.Message}");
        }
    }

    private static string GetContentTypeFromFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };
    }
}
