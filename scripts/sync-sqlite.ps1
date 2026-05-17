param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("pull", "push", "backup-remote")]
  [string]$Direction,

  [Parameter(Mandatory = $true)]
  [string]$Remote,

  [string]$RemoteDb = "/opt/visiontree/visiontree_content_os/data/content-system.sqlite",
  [string]$LocalDb = "data/content-system.sqlite",
  [string]$BackupDir = "data/db-backups",
  [switch]$RestartRemoteService,
  [string]$RemoteService = "visiontree-content-os"
)

$ErrorActionPreference = "Stop"

function Timestamp {
  Get-Date -Format "yyyyMMdd-HHmmss"
}

function Ensure-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Ensure-BackupDir {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

function Backup-LocalDb {
  if (Test-Path -LiteralPath $LocalDb) {
    Ensure-BackupDir
    $backup = Join-Path $BackupDir ("content-system.local.{0}.sqlite" -f (Timestamp))
    Copy-Item -LiteralPath $LocalDb -Destination $backup
    Write-Host "Local backup: $backup"
  }
}

function Backup-RemoteDb {
  $remoteBackup = "{0}.bak-{1}" -f $RemoteDb, (Timestamp)
  ssh $Remote "test -f '$RemoteDb' && cp '$RemoteDb' '$remoteBackup' && echo Remote backup: '$remoteBackup' || echo Remote database not found: '$RemoteDb'"
}

Ensure-Command ssh
Ensure-Command scp

if ($Direction -eq "pull") {
  Backup-LocalDb
  $localDir = Split-Path -Parent $LocalDb
  if ($localDir) {
    New-Item -ItemType Directory -Force -Path $localDir | Out-Null
  }
  scp "${Remote}:${RemoteDb}" $LocalDb
  Write-Host "Pulled remote database to $LocalDb"
  exit 0
}

if ($Direction -eq "push") {
  if (-not (Test-Path -LiteralPath $LocalDb)) {
    throw "Local database not found: $LocalDb"
  }
  Backup-RemoteDb
  scp $LocalDb "${Remote}:${RemoteDb}"
  Write-Host "Pushed local database to ${Remote}:${RemoteDb}"
  if ($RestartRemoteService) {
    ssh $Remote "sudo systemctl restart '$RemoteService' && sudo systemctl status '$RemoteService' --no-pager"
  } else {
    Write-Host "Remote service was not restarted. Use -RestartRemoteService if the server should reload the database."
  }
  exit 0
}

if ($Direction -eq "backup-remote") {
  Backup-RemoteDb
  exit 0
}
