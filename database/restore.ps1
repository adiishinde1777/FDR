# PowerShell Database Restore Script
Param(
    [string]$BackupFile,
    [string]$DbName = "aicte_fdr_db",
    [string]$Host = "localhost",
    [string]$User = "postgres"
)

if (-not $BackupFile) {
    Write-Error "Please specify -BackupFile <path_to_backup>"
    exit 1
}

Write-Host "Restoring database from $BackupFile..."

if ($BackupFile.EndsWith(".db")) {
    Copy-Item $BackupFile "./backend/dev.db" -Force
    Write-Host "Restored SQLite database to ./backend/dev.db"
} else {
    & pg_restore -h $Host -U $User -d $DbName -v $BackupFile
    Write-Host "Restored PostgreSQL database."
}
