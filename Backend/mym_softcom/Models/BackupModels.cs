using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;

namespace mym_softcom.Models
{
    public class BackupInfo
    {
        public string FileName { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
        public long FileSizeBytes { get; set; }
        public string Description { get; set; } = string.Empty;
        public string BackupType { get; set; } = "Full"; // Full, Partial
        public string CreatedBy { get; set; } = string.Empty;
        public int RecordCount { get; set; }
        public string Status { get; set; } = "Completed";

        public double FileSizeKB => FileSizeBytes / 1024.0;
        public double FileSizeMB => FileSizeBytes / 1024.0 / 1024.0;
        public string FormattedFileSize => FileSizeBytes < 1024 * 1024 ?
            $"{FileSizeKB:F1} KB" : $"{FileSizeMB:F2} MB";
    }

    public class BackupData
    {
        public BackupMetadata Metadata { get; set; } = new();
        public BackupTables Data { get; set; } = new();
    }

    public class BackupMetadata
    {
        public string Version { get; set; } = "1.0";
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public string CreatedBy { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = "mym_softcom";
        public string Description { get; set; } = string.Empty;
        public string BackupType { get; set; } = "Full";
        public Dictionary<string, int> TableCounts { get; set; } = new();
    }

    public class BackupTables
    {
        public List<Client> Clients { get; set; } = new();
        public List<Project> Projects { get; set; } = new();
        public List<Lot> Lots { get; set; } = new();
        public List<Plan> Plans { get; set; } = new();
        public List<Sale> Sales { get; set; } = new();
        public List<Payment> Payments { get; set; } = new();
        public List<Detail> Details { get; set; } = new();
    }

    public class RestoreOptions
    {
        public bool OverwriteExisting { get; set; } = false;
        public bool ValidateData { get; set; } = true;
        public bool CreateBackupBeforeRestore { get; set; } = true;
        public List<string> TablesToRestore { get; set; } = new();
    }

    public class BackupResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public int RecordCount { get; set; }
        public TimeSpan Duration { get; set; }
        public List<string> Warnings { get; set; } = new();
        public List<string> Errors { get; set; } = new();

        public double FileSizeKB => FileSizeBytes / 1024.0;
        public double FileSizeMB => FileSizeBytes / 1024.0 / 1024.0;
        public string FormattedFileSize => FileSizeBytes < 1024 * 1024 ?
            $"{FileSizeKB:F1} KB" : $"{FileSizeMB:F2} MB";
        public string FileName => Path.GetFileName(FilePath);
    }
}
