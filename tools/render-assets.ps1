# Renders the icons and the link preview with the art code: serves the repo, opens tools/assets.html in
# headless Edge, and waits for the page's log (POSTed to /__results). The PNGs land in icons/ and og-image.png.
param([int]$Port = 0)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
if ($Port -eq 0) {
  $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $Port = $l.LocalEndpoint.Port; $l.Stop()
}
$runId = [guid]::NewGuid().ToString('N')
$profileDir = Join-Path $env:TEMP ("thebes-assets-" + $runId)
$resultsFile = Join-Path $env:TEMP ("thebes-assets-" + $runId + ".txt")
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $root 'tests/serve.py')`"", "$Port", "`"$root`"", "`"$resultsFile`"" -PassThru -WindowStyle Hidden
$browser = $null
try {
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) {
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/tools/assets.html" -TimeoutSec 2).StatusCode -eq 200 } catch { $up = $false }
    if (-not $up) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $up) { Write-Output "Server did not answer on port $Port"; exit 1 }
  $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', "--user-data-dir=`"$profileDir`"", "http://127.0.0.1:$Port/tools/assets.html")
  $browser = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru -WindowStyle Hidden
  $clock = [Diagnostics.Stopwatch]::StartNew()
  while ($clock.Elapsed.TotalSeconds -lt 60 -and -not (Test-Path -LiteralPath $resultsFile)) { Start-Sleep -Milliseconds 200 }
  if (-not (Test-Path -LiteralPath $resultsFile)) { Write-Output 'TIMEOUT: the asset page never reported'; exit 1 }
  $text = [System.IO.File]::ReadAllText($resultsFile, [System.Text.Encoding]::UTF8)
  Write-Output $text
  if ($text -notmatch '(?m)^DONE\s*$') { exit 1 }
} finally {
  if ($browser) { Stop-Process -Id $browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $resultsFile -Force -ErrorAction SilentlyContinue
}
