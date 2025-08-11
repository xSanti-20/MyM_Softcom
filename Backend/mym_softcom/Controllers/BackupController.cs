using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using mym_softcom.Services;
using mym_softcom.Models;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace mym_softcom.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BackupController : ControllerBase
    {
        private readonly IBackupService _backupService;
        private readonly ILogger<BackupController> _logger;

        public BackupController(IBackupService backupService, ILogger<BackupController> logger)
        {
            _backupService = backupService;
            _logger = logger;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateBackup([FromBody] CreateBackupRequest request)
        {
            try
            {
                var result = await _backupService.CreateBackupAsync(
                    request.Description,
                    request.CreatedBy,
                    request.TablesToBackup
                );

                if (result.Success)
                {
                    var fileSizeDisplay = GetFormattedFileSize(result.FileSizeBytes);

                    return Ok(new
                    {
                        success = true,
                        message = result.Message,
                        fileName = Path.GetFileName(result.FilePath),
                        fileSizeBytes = result.FileSizeBytes,
                        fileSizeMB = Math.Round(result.FileSizeBytes / 1024.0 / 1024.0, 3), // More decimals
                        fileSizeDisplay = fileSizeDisplay, // Human readable format
                        recordCount = result.RecordCount,
                        durationSeconds = result.Duration.TotalSeconds,
                        warnings = result.Warnings
                    });
                }
                else
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = result.Message,
                        errors = result.Errors
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en CreateBackup");
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        [HttpPost("restore")]
        public async Task<IActionResult> RestoreBackup([FromBody] RestoreBackupRequest request)
        {
            try
            {
                var options = new RestoreOptions
                {
                    OverwriteExisting = request.OverwriteExisting,
                    ValidateData = request.ValidateData,
                    CreateBackupBeforeRestore = request.CreateBackupBeforeRestore,
                    TablesToRestore = request.TablesToRestore ?? new List<string>()
                };

                var result = await _backupService.RestoreBackupAsync(
                    request.BackupFileName,
                    options,
                    request.RestoredBy
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        message = result.Message,
                        recordCount = result.RecordCount,
                        durationSeconds = result.Duration.TotalSeconds,
                        warnings = result.Warnings
                    });
                }
                else
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = result.Message,
                        errors = result.Errors
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en RestoreBackup");
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetBackupList()
        {
            try
            {
                var backups = await _backupService.GetAvailableBackupsAsync();

                return Ok(new
                {
                    success = true,
                    count = backups.Count,
                    backups = backups.Select(b => new
                    {
                        fileName = b.FileName,
                        createdDate = b.CreatedDate,
                        fileSizeBytes = b.FileSizeBytes,
                        fileSizeMB = Math.Round(b.FileSizeBytes / 1024.0 / 1024.0, 3), // More decimals
                        fileSizeDisplay = GetFormattedFileSize(b.FileSizeBytes), // Human readable format
                        description = b.Description,
                        createdBy = b.CreatedBy,
                        recordCount = b.RecordCount,
                        status = b.Status
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo lista de backups");
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        [HttpGet("download/{fileName}")]
        public async Task<IActionResult> DownloadBackup(string fileName)
        {
            try
            {
                var backupDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
                var filePath = Path.Combine(backupDirectory, fileName);

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { success = false, message = "Archivo no encontrado" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                return File(fileBytes, "application/zip", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error descargando backup {FileName}", fileName);
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        [HttpDelete("delete/{fileName}")]
        public async Task<IActionResult> DeleteBackup(string fileName)
        {
            try
            {
                var success = await _backupService.DeleteBackupAsync(fileName);

                if (success)
                {
                    return Ok(new { success = true, message = "Backup eliminado exitosamente" });
                }
                else
                {
                    return NotFound(new { success = false, message = "Archivo no encontrado" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error eliminando backup {FileName}", fileName);
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadBackup(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No se proporcionó archivo" });
                }

                if (!file.FileName.EndsWith(".zip"))
                {
                    return BadRequest(new { success = false, message = "Solo se permiten archivos .zip" });
                }

                var backupDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
                var fileName = $"uploaded_{DateTime.Now:yyyyMMdd_HHmmss}_{file.FileName}";
                var filePath = Path.Combine(backupDirectory, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var validationResult = await _backupService.ValidateBackupFileAsync(fileName);

                return Ok(new
                {
                    success = true,
                    message = "Archivo subido exitosamente",
                    fileName = fileName,
                    fileSizeBytes = file.Length,
                    fileSizeMB = Math.Round(file.Length / 1024.0 / 1024.0, 3), // More decimals
                    fileSizeDisplay = GetFormattedFileSize(file.Length), // Human readable format
                    isValid = validationResult.Success,
                    validationMessage = validationResult.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subiendo backup");
                return StatusCode(500, new { success = false, message = "Error interno del servidor" });
            }
        }

        private string GetFormattedFileSize(long bytes)
        {
            if (bytes < 1024)
                return $"{bytes} B";
            else if (bytes < 1024 * 1024)
                return $"{Math.Round(bytes / 1024.0, 1)} KB";
            else if (bytes < 1024 * 1024 * 1024)
                return $"{Math.Round(bytes / 1024.0 / 1024.0, 2)} MB";
            else
                return $"{Math.Round(bytes / 1024.0 / 1024.0 / 1024.0, 2)} GB";
        }
    }

    public class CreateBackupRequest
    {
        public string Description { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public List<string>? TablesToBackup { get; set; }
    }

    public class RestoreBackupRequest
    {
        public string BackupFileName { get; set; } = string.Empty;
        public string RestoredBy { get; set; } = string.Empty;
        public bool OverwriteExisting { get; set; } = false;
        public bool ValidateData { get; set; } = true;
        public bool CreateBackupBeforeRestore { get; set; } = true;
        public List<string>? TablesToRestore { get; set; }
    }
}
