# Saves a PNG of a page at an exact viewport size. Uses headless Edge over the DevTools protocol, because
# --window-size includes the window chrome (a 1280x800 window gives a 1254x707 page and nothing narrower than ~496 px).
# -BudgetMs is the settle time after the page has loaded, so a few frames have run before the capture.
param([string]$Url = '/', [string]$Out = 'shot.png', [int]$Width = 1280, [int]$Height = 800, [int]$BudgetMs = 1500)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
function Get-FreePort {
  $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $p = $l.LocalEndpoint.Port; $l.Stop(); return $p
}
$port = Get-FreePort
$debugPort = Get-FreePort
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $PSScriptRoot 'serve.py')`"", "$port", "`"$root`"" -PassThru -WindowStyle Hidden
$profileDir = Join-Path $env:TEMP ('thebes-shot-' + [guid]::NewGuid().ToString('N'))
$browser = $null
$socket = $null
try {
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) {
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/index.html" -TimeoutSec 2).StatusCode -eq 200 } catch { $up = $false }
    if (-not $up) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $up) { Write-Output "Server did not answer on port $port"; exit 1 }

  $outPath = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path (Get-Location) $Out }
  $dir = Split-Path -Parent $outPath
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  if (Test-Path $outPath) { Remove-Item -LiteralPath $outPath -Force }

  $browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    "--user-data-dir=`"$profileDir`"", "--remote-debugging-port=$debugPort", 'about:blank')
  $browser = Start-Process -FilePath $edge -ArgumentList $browserArgs -PassThru -WindowStyle Hidden

  $wsUrl = $null
  for ($i = 0; $i -lt 40 -and -not $wsUrl; $i++) {
    try {
      $targets = Invoke-RestMethod "http://127.0.0.1:$debugPort/json" -TimeoutSec 2   # assign first: PS 5.1 does not unroll a JSON array down a pipeline
      $wsUrl = ($targets | Where-Object type -eq 'page' | Select-Object -First 1).webSocketDebuggerUrl
    } catch { $wsUrl = $null }
    if (-not $wsUrl) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $wsUrl) { Write-Output 'Edge did not open a DevTools page'; exit 1 }

  $socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $socket.ConnectAsync([uri]$wsUrl, [Threading.CancellationToken]::None).Wait()
  $script:msgId = 0
  function Invoke-Cdp([string]$Method, $Params) {
    $script:msgId++
    $json = @{ id = $script:msgId; method = $Method; params = $Params } | ConvertTo-Json -Depth 6 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
    while ($true) {
      $stream = [IO.MemoryStream]::new(); $buffer = New-Object byte[] 65536
      do {
        $cts = [Threading.CancellationTokenSource]::new(30000)
        $r = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $cts.Token).Result
        $stream.Write($buffer, 0, $r.Count)
      } until ($r.EndOfMessage)
      $reply = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
      if ($reply.id -eq $script:msgId) {
        if ($reply.error) { throw "DevTools $Method failed: $($reply.error.message)" }
        return $reply
      }
    }
  }

  Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{ width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false } | Out-Null
  Invoke-Cdp 'Page.navigate' @{ url = "http://127.0.0.1:$port$Url" } | Out-Null
  $loaded = $false
  for ($i = 0; $i -lt 120 -and -not $loaded; $i++) {
    $state = Invoke-Cdp 'Runtime.evaluate' @{ expression = 'document.readyState' }
    $loaded = $state.result.result.value -eq 'complete'
    if (-not $loaded) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $loaded) { Write-Output 'TIMEOUT waiting for the page to load'; exit 1 }
  Start-Sleep -Milliseconds $BudgetMs
  $shot = Invoke-Cdp 'Page.captureScreenshot' @{ format = 'png' }
  [IO.File]::WriteAllBytes($outPath, [Convert]::FromBase64String($shot.result.data))
  if (Test-Path $outPath) { Write-Output "Wrote $outPath" } else { Write-Output 'NO SCREENSHOT'; exit 1 }
} finally {
  if ($socket) { $socket.Dispose() }
  if ($browser) { Stop-Process -Id $browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
