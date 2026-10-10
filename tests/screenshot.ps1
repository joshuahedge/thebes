param([string]$Url = '/dev.html', [string]$Out = 'shot.png', [int]$Width = 1280, [int]$Height = 800, [int]$BudgetMs = 4000)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
$l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $port = $l.LocalEndpoint.Port; $l.Stop()
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $PSScriptRoot 'serve.py')`"", "$port", "`"$root`"" -PassThru -WindowStyle Hidden
$profileDir = Join-Path $env:TEMP ('thebes-shot-' + [guid]::NewGuid().ToString('N'))
try {
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/dev.html" -TimeoutSec 2).StatusCode -eq 200) { break } } catch { Start-Sleep -Milliseconds 250 }
  }
  $outPath = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path (Get-Location) $Out }
  $dir = Split-Path -Parent $outPath
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $args = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    "--user-data-dir=`"$profileDir`"", "--window-size=$Width,$Height", "--virtual-time-budget=$BudgetMs",
    "--screenshot=`"$outPath`"", "http://127.0.0.1:$port$Url")
  $p = Start-Process -FilePath $edge -ArgumentList $args -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(60000)) { Stop-Process -Id $p.Id -Force; Write-Output 'TIMEOUT'; exit 1 }
  if (Test-Path $outPath) { Write-Output "Wrote $outPath" } else { Write-Output 'NO SCREENSHOT'; exit 1 }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
