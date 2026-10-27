# PowerShell Database Backup Script
Param(
    [string]$DbName = "aicte_fdr_db",
    [string]$Host = "localhost",
    [string]$User = "postgres",
    [string]$OutputDir = "./backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$BackupFile = "$OutputDir/aicte_fdr_backup_$Timestamp.sql"

Write-Host "Creating backup of $DbName to $BackupFile..."
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    & pg_dump -h $Host -U $User -d $DbName -F c -b -v -f $BackupFile
    Write-Host "PostgreSQL backup completed: $BackupFile"
} else {
    Write-Host "Local SQLite active backup..."
    Copy-Item "./backend/dev.db" "$OutputDir/dev_backup_$Timestamp.db"
    Write-Host "SQLite backup created: $OutputDir/dev_backup_$Timestamp.db"
}
