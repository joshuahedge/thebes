param([string]$Grep = '', [int]$Port = 8790, [int]$BudgetMs = 60000)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
$profileDir = Join-Path $env:TEMP 'thebes-test-edge-profile'
$outFile = Join-Path $env:TEMP 'thebes-test-dom.html'
if (Test-Path $outFile) { Remove-Item $outFile -Force }
$server = Start-Process -FilePath python -ArgumentList '-m', 'http.server', "$Port", '--bind', '127.0.0.1', '--directory', "`"$root`"" -PassThru -WindowStyle Hidden
$ready = $false
try {
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/tests/index.html" -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if ($ready) {
    $url = "http://127.0.0.1:$Port/tests/index.html"
    if ($Grep) { $url += '?grep=' + [uri]::EscapeDataString($Grep) }
    $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      "--user-data-dir=`"$profileDir`"", "--virtual-time-budget=$BudgetMs", '--dump-dom', $url)
    $p = Start-Process -FilePath $edge -ArgumentList $edgeArgs -RedirectStandardOutput $outFile -PassThru -WindowStyle Hidden
    if (-not $p.WaitForExit(180000)) { Stop-Process -Id $p.Id -Force; Write-Output 'TIMEOUT: tests did not finish'; exit 1 }
  }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
if (-not $ready) { Write-Output 'SERVER NOT READY'; exit 1 }
$dom = ''
if (Test-Path $outFile) { $dom = [string](Get-Content -Raw $outFile) }
$m = [regex]::Match($dom, '<pre id="results">([\s\S]*?)</pre>')
if (-not $m.Success) { Write-Output 'NO RESULTS: the test page did not render results'; exit 1 }
$text = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Write-Output $text
if ($text -match 'ALL PASSED') { exit 0 } else { exit 1 }
