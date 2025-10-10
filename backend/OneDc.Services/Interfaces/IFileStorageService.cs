using OneDc.Services.Models;

namespace OneDc.Services.Interfaces;

public interface IFileStorageService
{
    Task<FileUploadResult> UploadFileAsync(Stream fileStream, string fileName, string contentType, string containerName = "profile-photos");
    Task DeleteFileAsync(string fileUrl, string containerName = "profile-photos");
    Task<Stream> DownloadFileAsync(string fileUrl);
    string GetFileUrl(string fileName, string containerName = "profile-photos");
}
