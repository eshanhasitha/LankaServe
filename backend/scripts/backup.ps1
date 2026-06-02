param(
    [Parameter(Mandatory=$true)]
    [string]$MongoUri
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$archive = "$backupDir\\lankaserve_$timestamp.gz"

mongodump --uri="$MongoUri" --archive="$archive" --gzip

Write-Host "Backup created: $archive"
