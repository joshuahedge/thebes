# Saves a PNG of a page at an exact viewport size. Uses headless Edge over the DevTools protocol, because
# --window-size includes the window chrome (a 1280x800 window gives a 1254x707 page and nothing narrower than ~496 px).
# -BudgetMs is the settle time after the page has loaded, so a few frames have run before the capture.
# -Eval is page JavaScript run after the load and before the settle time (awaited if it returns a promise),
# for driving the interface into a state: open a sheet, pick a tool; what it returns is printed as "EVAL <value>".
# -Measure is page JavaScript run after the settle time, just before the capture (awaited too), printed as
# "MEASURE <value>" (tools/shots.ps1 -Mobile measures the rows under the top bar). -Dpr sets the device pixel ratio.
# -MaxSeconds is a hard limit: whatever hangs (a DevTools reply that never comes on a loaded machine, a crashed page),
# a reaper stops this script, its Edge and its server after that many seconds, so a caller never waits forever.
param([string]$Url = '/', [string]$Out = 'shot.png', [int]$Width = 1280, [int]$Height = 800, [int]$BudgetMs = 1500, [string]$Eval = '', [double]$Dpr = 1, [string]$Measure = '', [int]$MaxSeconds = 150, [bool]$RigDevice = $true)
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
$reaperScript = "Start-Sleep -Seconds $MaxSeconds; Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue; Stop-Process -Id $($server.Id) -Force -ErrorAction SilentlyContinue; " +
  "Get-CimInstance Win32_Process -Filter `"Name='msedge.exe'`" | Where-Object { `$_.CommandLine -like '*$(Split-Path -Leaf $profileDir)*' } | ForEach-Object { Stop-Process -Id `$_.ProcessId -Force -ErrorAction SilentlyContinue }"
$reaperArgs = @('-NoProfile', '-EncodedCommand', [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($reaperScript)))
$reaper = Start-Process -FilePath powershell -ArgumentList $reaperArgs -PassThru -WindowStyle Hidden
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

  $browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-frame-rate-limit',
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

  # A headless page can stop drawing frames (requestAnimationFrame stops, a DOM change made after a few seconds never
  # reaches the capture), seen on Windows in scenes that wait a few seconds: emulated focus and no frame-rate limit keep
  # frames coming.
  Invoke-Cdp 'Emulation.setFocusEmulationEnabled' @{ enabled = $true } | Out-Null
  Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{ width = $Width; height = $Height; deviceScaleFactor = $Dpr; mobile = $false } | Out-Null
  # Version 8.0: the game ignores the browser's Reduce motion; the rig opts back in (src/ui/settings.js), so headless Edge keeps the shots under Gentle as before. -RigDevice $false shows what a player sees (full motion).
  if ($RigDevice) { Invoke-Cdp 'Page.addScriptToEvaluateOnNewDocument' @{ source = 'window.__thebesRigDevice = true;' } | Out-Null }
  Invoke-Cdp 'Page.navigate' @{ url = "http://127.0.0.1:$port$Url" } | Out-Null
  $loaded = $false
  for ($i = 0; $i -lt 120 -and -not $loaded; $i++) {
    $state = Invoke-Cdp 'Runtime.evaluate' @{ expression = 'document.readyState' }
    $loaded = $state.result.result.value -eq 'complete'
    if (-not $loaded) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $loaded) { Write-Output 'TIMEOUT waiting for the page to load'; exit 1 }
  if ($Eval) {
    Start-Sleep -Milliseconds 800                     # the boot is async: let the game (and window.__thebes) exist first
    $r = Invoke-Cdp 'Runtime.evaluate' @{ expression = $Eval; awaitPromise = $true }
    if ($r.result.exceptionDetails) { Write-Output "Eval threw: $($r.result.exceptionDetails.exception.description)"; exit 1 }
    if ($null -ne $r.result.result.value) { Write-Output "EVAL $($r.result.result.value)" }
  }
  Start-Sleep -Milliseconds $BudgetMs
  if ($Measure) {
    $mr = Invoke-Cdp 'Runtime.evaluate' @{ expression = $Measure; awaitPromise = $true; returnByValue = $true }
    if ($mr.result.exceptionDetails) { Write-Output "Measure threw: $($mr.result.exceptionDetails.exception.description)"; exit 1 }
    Write-Output "MEASURE $($mr.result.result.value)"
  }
  $shot = Invoke-Cdp 'Page.captureScreenshot' @{ format = 'png' }
  [IO.File]::WriteAllBytes($outPath, [Convert]::FromBase64String($shot.result.data))
  if (Test-Path $outPath) { Write-Output "Wrote $outPath" } else { Write-Output 'NO SCREENSHOT'; exit 1 }
} finally {
  if ($reaper) { Stop-Process -Id $reaper.Id -Force -ErrorAction SilentlyContinue }
  if ($socket) { $socket.Dispose() }
  if ($browser) { Stop-Process -Id $browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
