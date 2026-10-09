param([string]$Grep = '', [int]$Port = 8790, [int]$BudgetMs = 60000)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
$profileDir = Join-Path $env:TEMP ("thebes-edge-" + [guid]::NewGuid().ToString('N'))
$outFile = Join-Path $env:TEMP 'thebes-test-dom.html'
$errFile = Join-Path $env:TEMP 'thebes-test-edge-stderr.txt'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
if (Test-Path $errFile) { Remove-Item $errFile -Force }
$serve = Join-Path $PSScriptRoot 'serve.py'
$server = Start-Process -FilePath python -ArgumentList "`"$serve`"", "$Port", "`"$root`"" -PassThru -WindowStyle Hidden
$ready = $false
try {
  for ($i = 0; $i -lt 40; $i++) {
    if ($server.HasExited) { break }
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/tests/index.html" -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if ($ready) {
    $url = "http://127.0.0.1:$Port/tests/index.html"
    if ($Grep) { $url += '?grep=' + [uri]::EscapeDataString($Grep) }
    $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disk-cache-size=1',
      "--user-data-dir=`"$profileDir`"", "--virtual-time-budget=$BudgetMs", '--dump-dom', $url)
    $p = Start-Process -FilePath $edge -ArgumentList $edgeArgs -RedirectStandardOutput $outFile -RedirectStandardError $errFile -PassThru -WindowStyle Hidden
    if (-not $p.WaitForExit(180000)) { Stop-Process -Id $p.Id -Force; Write-Output 'TIMEOUT: tests did not finish'; exit 1 }
  }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  # Stop only the Edge processes that use this run's profile (root and children), then remove the profile.
  # Cleanup must never fail the run, so errors here are ignored.
  try {
    Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$profileDir*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    for ($try = 0; $try -lt 5 -and (Test-Path -LiteralPath $profileDir); $try++) {
      if ($try -gt 0) { Start-Sleep -Milliseconds 200 }
      Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  } catch { }
}
if (-not $ready) { Write-Output 'SERVER NOT READY'; exit 1 }
$dom = ''
if (Test-Path $outFile) { $dom = [string](Get-Content -Raw -Encoding UTF8 $outFile) }
$m = [regex]::Match($dom, '<pre id="results">([\s\S]*?)</pre>')
if (-not $m.Success) { Write-Output 'NO RESULTS: the test page did not render results'; exit 1 }
$text = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Write-Output $text
if ($text -match 'ALL PASSED') { exit 0 } else { exit 1 }
