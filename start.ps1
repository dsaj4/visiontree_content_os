param(
  [switch]$NoInstall,
  [switch]$NoBrowser,
  [switch]$Restart,
  [int]$ApiPort = 8787,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Port($Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync("127.0.0.1", $Port)
    if (-not $task.Wait(350)) {
      return $false
    }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Get-PortOwners($Port) {
  @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)
}

function Get-ProcessSummary($ProcessIds) {
  if (-not $ProcessIds -or $ProcessIds.Count -eq 0) {
    return "none"
  }

  $items = foreach ($processId in $ProcessIds) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if ($process) {
      "PID ${processId}: $($process.CommandLine)"
    } else {
      "PID ${processId}"
    }
  }
  return ($items -join "`n")
}

function Stop-PortOwners($Port, $Name) {
  $owners = Get-PortOwners $Port
  if ($owners.Count -eq 0) {
    return
  }

  Write-Host "Stopping existing $Name process on port $Port" -ForegroundColor Yellow
  foreach ($processId in $owners) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }

  for ($i = 0; $i -lt 20; $i++) {
    if (-not (Test-Port $Port)) {
      return
    }
    Start-Sleep -Milliseconds 250
  }

  throw "Port $Port is still in use after stopping existing $Name processes."
}

function Test-Http($Url, $ExpectedText) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
      return $false
    }
    if ($ExpectedText) {
      return $response.Content.Contains($ExpectedText)
    }
    return $true
  } catch {
    return $false
  }
}

function Wait-Port($Port, $Name) {
  for ($i = 0; $i -lt 45; $i++) {
    if (Test-Port $Port) {
      Write-Host "$Name ready: http://localhost:$Port" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 1
  }
  throw "$Name did not become ready in time. Check the log files."
}

function Wait-Health($Name, $Url, $ExpectedText, $OutLog, $ErrLog) {
  for ($i = 0; $i -lt 45; $i++) {
    if (Test-Http $Url $ExpectedText) {
      Write-Host "$Name healthy: $Url" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 1
  }

  Write-Host ""
  Write-Host "$Name did not pass health check: $Url" -ForegroundColor Red
  Write-Host "Last $OutLog lines:" -ForegroundColor Yellow
  if (Test-Path $OutLog) { Get-Content $OutLog -Tail 30 }
  Write-Host "Last $ErrLog lines:" -ForegroundColor Yellow
  if (Test-Path $ErrLog) { Get-Content $ErrLog -Tail 30 }
  throw "$Name started listening but failed its HTTP health check."
}

function Start-ServiceIfNeeded($Port, $Name, $FilePath, $ArgumentList, $OutLog, $ErrLog, $HealthUrl, $ExpectedText) {
  if ($Restart) {
    Stop-PortOwners $Port $Name
  }

  if (Test-Port $Port) {
    if (Test-Http $HealthUrl $ExpectedText) {
      Write-Host "$Name already healthy: $HealthUrl" -ForegroundColor Yellow
      return
    }

    $owners = Get-PortOwners $Port
    $summary = Get-ProcessSummary $owners
    throw @"
$Name port $Port is already in use, but it is not responding like this project.

$summary

Run this script with -Restart to stop the process on port $Port and start a fresh service:
  powershell -ExecutionPolicy Bypass -File .\start.ps1 -Restart
"@
    return
  }

  Write-Step "Starting $Name"
  Start-Process `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $PSScriptRoot `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden
}

Write-Host "VisionTree Content OS launcher" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node was not found. Install Node.js 22.5 or newer first."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm.cmd was not found. Make sure Node.js/npm is in PATH."
}

$nodeVersionText = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersionText.Split(".")[0])
$nodeMinor = [int]($nodeVersionText.Split(".")[1])
if ($nodeMajor -lt 22 -or ($nodeMajor -eq 22 -and $nodeMinor -lt 5)) {
  throw "Current Node.js version is $nodeVersionText. This project requires 22.5 or newer."
}

if (-not $NoInstall -and -not (Test-Path "node_modules")) {
  Write-Step "Installing dependencies"
  & npm.cmd install
}

$env:API_PORT = "$ApiPort"

Start-ServiceIfNeeded `
  -Port $ApiPort `
    -Name "API service" `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "api") `
    -OutLog (Join-Path $PSScriptRoot "api.log") `
    -ErrLog (Join-Path $PSScriptRoot "api.err.log") `
    -HealthUrl "http://127.0.0.1:$ApiPort/api/accounts" `
    -ExpectedText "thinking-lab"

Start-ServiceIfNeeded `
  -Port $WebPort `
  -Name "Web service" `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--port", "$WebPort") `
  -OutLog (Join-Path $PSScriptRoot "vite.log") `
  -ErrLog (Join-Path $PSScriptRoot "vite.err.log") `
  -HealthUrl "http://127.0.0.1:$WebPort/" `
  -ExpectedText "/src/main.tsx"

Write-Step "Waiting for services"
Wait-Port $ApiPort "API service"
Wait-Port $WebPort "Web service"
Wait-Health "API service" "http://127.0.0.1:$ApiPort/api/accounts" "thinking-lab" (Join-Path $PSScriptRoot "api.log") (Join-Path $PSScriptRoot "api.err.log")
Wait-Health "Web service" "http://127.0.0.1:$WebPort/" "/src/main.tsx" (Join-Path $PSScriptRoot "vite.log") (Join-Path $PSScriptRoot "vite.err.log")

$url = "http://localhost:$WebPort/"
if (-not $NoBrowser) {
  Write-Step "Opening browser"
  Start-Process $url
}

Write-Host ""
Write-Host "Startup complete." -ForegroundColor Green
Write-Host "  Web: $url"
Write-Host "  API: http://localhost:$ApiPort/"
Write-Host "  Logs: api.log / api.err.log / vite.log / vite.err.log"
Write-Host ""
Write-Host "To stop services, close the related node processes or run in PowerShell:"
Write-Host "  Get-NetTCPConnection -LocalPort $ApiPort,$WebPort | ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }"
Write-Host "To force a clean restart:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\start.ps1 -Restart"
