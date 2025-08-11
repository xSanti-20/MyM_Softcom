using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.IO.Compression;
using mym_softcom.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Dynamic;
using System.IO;
using System.Text;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace mym_softcom.Services
{
    public interface IBackupService
    {
        Task<BackupResult> CreateBackupAsync(string description, string createdBy, List<string>? tablesToBackup = null);
        Task<BackupResult> RestoreBackupAsync(string backupFileName, RestoreOptions options, string restoredBy);
        Task<List<BackupInfo>> GetAvailableBackupsAsync();
        Task<bool> DeleteBackupAsync(string fileName);
        Task<BackupResult> ValidateBackupFileAsync(string fileName);
    }

    public class BackupService : IBackupService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BackupService> _logger;
        private readonly string _backupDirectory;

        public BackupService(AppDbContext context, ILogger<BackupService> logger)
        {
            _context = context;
            _logger = logger;

            _backupDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
            if (!Directory.Exists(_backupDirectory))
            {
                Directory.CreateDirectory(_backupDirectory);
            }
        }

        public async Task<BackupResult> CreateBackupAsync(string description, string createdBy, List<string>? tablesToBackup = null)
        {
            var startTime = DateTime.Now;
            var result = new BackupResult();

            try
            {
                _logger.LogInformation("🔄 Iniciando backup por {User}: {Description}", createdBy, description);

                var backupData = new BackupData
                {
                    Metadata = new BackupMetadata
                    {
                        CreatedDate = startTime,
                        CreatedBy = createdBy,
                        Description = description,
                        BackupType = "Full"
                    }
                };

                backupData.Data.Clients = await _context.Clients.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Clients"] = backupData.Data.Clients.Count;

                backupData.Data.Projects = await _context.Projects.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Projects"] = backupData.Data.Projects.Count;

                backupData.Data.Lots = await _context.Lots.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Lots"] = backupData.Data.Lots.Count;

                backupData.Data.Plans = await _context.Plans.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Plans"] = backupData.Data.Plans.Count;

                backupData.Data.Sales = await _context.Sales.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Sales"] = backupData.Data.Sales.Count;

                backupData.Data.Payments = await _context.Payments.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Payments"] = backupData.Data.Payments.Count;

                backupData.Data.Details = await _context.Details.AsNoTracking().ToListAsync();
                backupData.Metadata.TableCounts["Details"] = backupData.Data.Details.Count;

                result.RecordCount = backupData.Metadata.TableCounts.Values.Sum();

                var sanitizedDescription = SanitizeFileName(description);
                var fileName = $"{sanitizedDescription}_{DateTime.Now:yyyyMMdd_HHmmss}_{createdBy.Replace(" ", "_").Replace("@", "_")}.json";
                var compressedFileName = fileName.Replace(".json", ".zip");
                var compressedFilePath = Path.Combine(_backupDirectory, compressedFileName);

                var jsonOptions = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                };

                var jsonString = JsonSerializer.Serialize(backupData, jsonOptions);

                using (var fileStream = new FileStream(compressedFilePath, FileMode.Create))
                using (var archive = new ZipArchive(fileStream, ZipArchiveMode.Create))
                {
                    var entry = archive.CreateEntry(fileName);
                    using var entryStream = entry.Open();
                    using var writer = new StreamWriter(entryStream);
                    await writer.WriteAsync(jsonString);
                }

                var fileInfo = new FileInfo(compressedFilePath);

                result.Success = true;
                result.Message = "Backup creado exitosamente";
                result.FilePath = compressedFilePath;
                result.FileSizeBytes = fileInfo.Length;
                result.Duration = DateTime.Now - startTime;

                _logger.LogInformation("✅ Backup completado: {FileName} - {Records} registros - {Size:F2} MB",
                    compressedFileName, result.RecordCount, fileInfo.Length / 1024.0 / 1024.0);

            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"Error creando backup: {ex.Message}";
                result.Errors.Add(ex.Message);
                _logger.LogError(ex, "❌ Error creando backup");
            }

            return result;
        }

        public async Task<BackupResult> RestoreBackupAsync(string backupFileName, RestoreOptions options, string restoredBy)
        {
            var startTime = DateTime.Now;
            var result = new BackupResult();

            try
            {
                _logger.LogInformation("🔄 Iniciando restauración de {FileName} por {User}", backupFileName, restoredBy);

                var filePath = Path.Combine(_backupDirectory, backupFileName);
                if (!File.Exists(filePath))
                {
                    result.Success = false;
                    result.Message = "Archivo de backup no encontrado";
                    return result;
                }

                var backupData = await LoadBackupDataAsync(filePath);
                if (backupData == null)
                {
                    result.Success = false;
                    result.Message = "Error cargando datos del backup";
                    return result;
                }

                await RestoreDataAsync(backupData, options.OverwriteExisting);

                result.Success = true;
                result.Message = "Backup restaurado exitosamente";
                result.FilePath = filePath;
                result.Duration = DateTime.Now - startTime;
                result.RecordCount = backupData.Metadata.TableCounts.Values.Sum();

                _logger.LogInformation("✅ Restauración completada: {FileName}", backupFileName);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error restaurando backup {FileName}: {Error}", backupFileName, ex.Message);
                result.Success = false;
                result.Message = $"Error restaurando backup: {ex.Message}";
                return result;
            }
        }

        private void DetachNavigationProperties(BackupData backupData)
        {
            if (backupData.Data.Clients != null)
            {
                foreach (var client in backupData.Data.Clients)
                {
                    // Client no tiene propiedades navegación que limpiar aquí
                }
            }

            if (backupData.Data.Projects != null)
            {
                foreach (var project in backupData.Data.Projects)
                {
                    // Projects sin navegación a limpiar
                }
            }

            if (backupData.Data.Lots != null)
            {
                foreach (var lot in backupData.Data.Lots)
                {
                    // Limpiar navegación a Project para no duplicar
                    lot.project = null;
                }
            }

            if (backupData.Data.Plans != null)
            {
                foreach (var plan in backupData.Data.Plans)
                {
                    // Plans sin navegación a limpiar
                }
            }

            if (backupData.Data.Sales != null)
            {
                foreach (var sale in backupData.Data.Sales)
                {
                    sale.client = null;
                    sale.lot = null;
                    sale.plan = null;
                    sale.user = null;
                }
            }

            if (backupData.Data.Payments != null)
            {
                foreach (var payment in backupData.Data.Payments)
                {
                    payment.sale = null;
                }
            }

            if (backupData.Data.Details != null)
            {
                foreach (var detail in backupData.Data.Details)
                {
                    // Si Details tuviera navegación, ponerlas a null aquí
                }
            }
        }

        private async Task RestoreDataAsync(BackupData backupData, bool overwriteExisting)
        {
            if (overwriteExisting)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                // Desactivar FK checks para evitar errores truncando tablas relacionadas
                await _context.Database.ExecuteSqlRawAsync("SET FOREIGN_KEY_CHECKS = 0");

                // Vaciar tablas en orden adecuado
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE details");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE payments");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE sales");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE lots");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE plans");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE clients");
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE projects");

                await _context.Database.ExecuteSqlRawAsync("SET FOREIGN_KEY_CHECKS = 1");

                await transaction.CommitAsync();
            }

            // Limpiar navegación para evitar que EF Core rastree dos veces las mismas entidades relacionadas
            DetachNavigationProperties(backupData);

            _context.ChangeTracker.Clear();

            if (backupData.Data.Clients?.Any() == true)
            {
                _context.Clients.AddRange(backupData.Data.Clients);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Projects?.Any() == true)
            {
                _context.Projects.AddRange(backupData.Data.Projects);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Plans?.Any() == true)
            {
                _context.Plans.AddRange(backupData.Data.Plans);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Lots?.Any() == true)
            {
                _context.Lots.AddRange(backupData.Data.Lots);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Sales?.Any() == true)
            {
                _context.Sales.AddRange(backupData.Data.Sales);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Payments?.Any() == true)
            {
                _context.Payments.AddRange(backupData.Data.Payments);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            if (backupData.Data.Details?.Any() == true)
            {
                _context.Details.AddRange(backupData.Data.Details);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }
        }

        public async Task<List<BackupInfo>> GetAvailableBackupsAsync()
        {
            var backups = new List<BackupInfo>();

            try
            {
                if (!Directory.Exists(_backupDirectory))
                    return backups;

                var files = Directory.GetFiles(_backupDirectory, "*.zip")
                    .OrderByDescending(f => File.GetCreationTime(f));

                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    var fileName = Path.GetFileName(file);

                    var parts = fileName.Replace("backup_", "").Replace(".zip", "").Split('_');
                    var createdBy = parts.Length > 2 ? string.Join("_", parts.Skip(2)) : "Unknown";

                    var backup = new BackupInfo
                    {
                        FileName = fileName,
                        CreatedDate = fileInfo.CreationTime,
                        FileSizeBytes = fileInfo.Length,
                        CreatedBy = createdBy.Replace("_", " "),
                        Status = "Completed"
                    };

                    try
                    {
                        var validationResult = await ValidateBackupFileAsync(fileName);
                        if (validationResult.Success)
                        {
                            backup.RecordCount = validationResult.RecordCount;
                            backup.Description = "Backup válido";
                        }
                        else
                        {
                            backup.Status = "Corrupted";
                            backup.Description = "Archivo corrupto";
                        }
                    }
                    catch
                    {
                        backup.Status = "Unknown";
                        backup.Description = "No se pudo validar";
                    }

                    backups.Add(backup);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error obteniendo lista de backups");
            }

            return backups;
        }

        public async Task<bool> DeleteBackupAsync(string fileName)
        {
            try
            {
                var filePath = Path.Combine(_backupDirectory, fileName);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    _logger.LogInformation("🗑️ Backup eliminado: {FileName}", fileName);
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error eliminando backup {FileName}", fileName);
                return false;
            }
        }

        public async Task<BackupResult> ValidateBackupFileAsync(string fileName)
        {
            var result = new BackupResult();

            try
            {
                var filePath = Path.Combine(_backupDirectory, fileName);
                if (!File.Exists(filePath))
                {
                    result.Success = false;
                    result.Message = "Archivo no encontrado";
                    return result;
                }

                using var fileStream = new FileStream(filePath, FileMode.Open);
                using var archive = new ZipArchive(fileStream, ZipArchiveMode.Read);

                var entry = archive.Entries.FirstOrDefault(e => e.Name.EndsWith(".json"));
                if (entry == null)
                {
                    result.Success = false;
                    result.Message = "Formato inválido";
                    return result;
                }

                using var entryStream = entry.Open();
                using var reader = new StreamReader(entryStream);
                var jsonString = await reader.ReadToEndAsync();

                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                };

                var backupData = JsonSerializer.Deserialize<BackupData>(jsonString, options);

                if (backupData?.Metadata != null)
                {
                    result.Success = true;
                    result.Message = "Backup válido";
                    result.RecordCount = backupData.Metadata.TableCounts.Values.Sum();
                }
                else
                {
                    result.Success = false;
                    result.Message = "Estructura inválida";
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"Error: {ex.Message}";
            }

            return result;
        }

        private async Task<BackupData?> LoadBackupDataAsync(string filePath)
        {
            try
            {
                using var fileStream = new FileStream(filePath, FileMode.Open);
                using var archive = new ZipArchive(fileStream, ZipArchiveMode.Read);
                var entry = archive.Entries.FirstOrDefault(e => e.Name.EndsWith(".json"));
                if (entry == null) return null;

                using var entryStream = entry.Open();
                using var reader = new StreamReader(entryStream);
                var jsonString = await reader.ReadToEndAsync();

                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                };

                return JsonSerializer.Deserialize<BackupData>(jsonString, options);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cargando datos del backup");
                return null;
            }
        }

        private string SanitizeFileName(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return "Backup";

            var invalidChars = Path.GetInvalidFileNameChars();
            var sanitized = new string(fileName.Where(c => !invalidChars.Contains(c)).ToArray());

            // Replace spaces and special characters
            sanitized = sanitized.Replace(" ", "_")
                                .Replace("-", "_")
                                .Replace(".", "_");

            // Limit length
            if (sanitized.Length > 30)
                sanitized = sanitized.Substring(0, 30);

            return string.IsNullOrWhiteSpace(sanitized) ? "Backup" : sanitized;
        }
    }
}
