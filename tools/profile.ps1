# Version 9.1 (Track P, ruling 1688): the throttled profile. A measure, not a test: it runs outside the suite (it throttles Edge for minutes) and
# prints a table for the report and the ledger. The screenshot script's DevTools pattern (tests/screenshot.ps1): headless Edge, a phone's
# viewport (390x844 at DPR 2 unless told otherwise), and tools/profile-serve.py, which gzips as the real host does.
#   -Load      a cold first load (fresh profile, no cache) with the network at slow 4G (1.6 Mbps down, 750 kbps up, 150 ms round trip) and
#              the CPU 4x slower (the first of -Cpu): first paint, and the ready point (the page's 'thebes-ready' mark when it sets one,
#              otherwise the title card appearing; the table says which). -Runs cold loads, then a warm load once the service worker holds
#              the files. -NoPreload serves index.html without its module preload block, to measure P1 both ways.
#   -Frames    the stress city (?stress=1; -Size huge or a number for a bigger map) at each -Cpu throttle: the drawn frames' script time
#              (the loop's whole frame: the days ticked and the draw) after -WarmSeconds, over -MeasureSeconds: p50, p95 and the worst.
#              -Zooms lists the zooms (a number, or 'floor' for the map's least zoom). -Layers adds a CPU profile of the first throttle's
#              window: the functions that took the most time, for a miss's biggest cost.
#   -Session   a simulated play session (-SessionHours, 2 by default) on a Large map (-City sample, the seed-11 sample town, or stress),
#              unthrottled: days fast-forwarded at the speeds the profile assumes (40% of the time at 1x, 40% at 2x, 20% at 3x), a frame every
#              10 days, and after every 10 minutes of play the camera over every chunk at every zoom bucket. Then: the JS heap after a forced
#              collection, the caches' bytes (window.__thebes.caches()) and every live canvas's bytes (a census of the canvases the page made).
# -Root serves another tree (a checkout of an older commit, for a before figure). -MaxSeconds is a hard limit: a reaper stops this script,
# its Edges and its server after that many seconds, so a caller never waits forever. -Json writes the figures to a file as well.
param(
  [switch]$Load, [switch]$Frames, [switch]$Session,
  [string]$Size = '', [string]$Root = '', [switch]$NoPreload, [int]$Runs = 3,
  [string]$Cpu = '4,6', [string]$Zooms = '1',
  [int]$Width = 390, [int]$Height = 844, [double]$Dpr = 2,
  [int]$WarmSeconds = 5, [int]$MeasureSeconds = 10, [double]$SessionHours = 2,
  [string]$City = 'sample', [switch]$Layers,
  [int]$MaxSeconds = 600, [string]$Json = ''
)
$ErrorActionPreference = 'Stop'
if (-not ($Load -or $Frames -or $Session)) { Write-Output 'Say -Load, -Frames or -Session'; exit 2 }
$cpuList = @($Cpu -split ',' | ForEach-Object { [double]$_.Trim() })   # lists as text, so `powershell -File` passes them whole ("4,6")
$zoomList = @($Zooms -split ',' | ForEach-Object { $_.Trim() })
$repo = Split-Path -Parent $PSScriptRoot
$serveRoot = if ($Root) { (Resolve-Path $Root).Path } else { $repo }
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
function Get-FreePort {
  $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $p = $l.LocalEndpoint.Port; $l.Stop(); return $p
}
$started = Get-Date
$token = 'thebes-prof-' + [guid]::NewGuid().ToString('N')
$port = Get-FreePort
$serveArgs = @("`"$(Join-Path $PSScriptRoot 'profile-serve.py')`"", "$port", "`"$serveRoot`"")
if ($NoPreload) { $serveArgs += 'nopreload' }
$server = Start-Process -FilePath python -ArgumentList $serveArgs -PassThru -WindowStyle Hidden
$reaperScript = "Start-Sleep -Seconds $MaxSeconds; Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue; Stop-Process -Id $($server.Id) -Force -ErrorAction SilentlyContinue; " +
  "Get-CimInstance Win32_Process -Filter `"Name='msedge.exe'`" | Where-Object { `$_.CommandLine -like '*$token*' } | ForEach-Object { Stop-Process -Id `$_.ProcessId -Force -ErrorAction SilentlyContinue }"
$reaper = Start-Process -FilePath powershell -ArgumentList @('-NoProfile', '-EncodedCommand', [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($reaperScript))) -PassThru -WindowStyle Hidden
$script:browser = $null; $script:socket = $null; $script:profileDir = $null; $script:msgId = 0

# What every page gets before its own scripts: the ready point, the first paint, a census of the canvases it makes, and the drawn frames' times.
$initScript = @'
(() => {
  const P = window.__prof = { ready: null, via: null, fcp: null, fp: null, errors: [] };
  try { performance.setResourceTimingBufferSize(4000); } catch (e) { /* not offered */ }
  const warn = console.warn.bind(console);
  console.warn = (...a) => { P.errors.push('warn: ' + a.map((x) => String(x && x.message || x)).join(' ')); warn(...a); };
  window.addEventListener('error', (e) => P.errors.push(String(e.message || (e.target && e.target.src) || e.type)), true);
  window.addEventListener('unhandledrejection', (e) => P.errors.push('rejection: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; if (e.name === 'first-paint') P.fp = e.startTime; } }).observe({ type: 'paint', buffered: true }); } catch (e) { /* not offered */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'thebes-ready') { P.ready = e.startTime; P.via = 'mark'; } }).observe({ type: 'mark', buffered: true }); } catch (e) { /* not offered */ }
  const raf = window.requestAnimationFrame.bind(window);
  const poll = () => {
    if (P.ready !== null) return;
    const t = document.getElementById('title');
    if (t && !t.hidden && t.childElementCount) { P.ready = performance.now(); P.via = 'title'; return; }
    raf(poll);
  };
  raf(poll);
  const canvases = new Set();
  const make = Document.prototype.createElement;
  Document.prototype.createElement = function (name, options) {
    const el = make.call(this, name, options);
    if (String(name).toLowerCase() === 'canvas') canvases.add(new WeakRef(el));
    return el;
  };
  window.__profCanvas = () => {
    let n = 0, bytes = 0;
    for (const r of canvases) { const c = r.deref(); if (!c) { canvases.delete(r); continue; } n++; bytes += c.width * c.height * 4; }
    return { n, bytes };
  };
  const F = window.__profFrames = { on: false, ms: [], render: [], at: [] };
  let drew = false;
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...a) { if (!drew && this.canvas && this.canvas.id === 'map') drew = true; return fill.apply(this, a); };
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (!F.on) { cb(t); return; }
    drew = false;
    const s = performance.now();
    try { cb(t); } finally {
      if (drew) { F.ms.push(performance.now() - s); F.at.push(s); const T = window.__thebes; if (T && T.renderer) F.render.push(T.renderer.stats.ms); }
    }
  });
})();
'@

function Open-Edge {
  if ($script:socket) { $script:socket.Dispose(); $script:socket = $null }
  if ($script:browser) {
    $leaf = Split-Path -Leaf $script:profileDir
    Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$leaf*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 500
  }
  if ($script:profileDir) { Remove-Item -LiteralPath $script:profileDir -Recurse -Force -ErrorAction SilentlyContinue }
  $debugPort = Get-FreePort
  $script:profileDir = Join-Path $env:TEMP ($token + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6))
  $browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-frame-rate-limit',
    '--enable-precise-memory-info', "--user-data-dir=`"$script:profileDir`"", "--remote-debugging-port=$debugPort", 'about:blank')
  $script:browser = Start-Process -FilePath $edge -ArgumentList $browserArgs -PassThru -WindowStyle Hidden
  $wsUrl = $null
  for ($i = 0; $i -lt 40 -and -not $wsUrl; $i++) {
    try {
      $targets = Invoke-RestMethod "http://127.0.0.1:$debugPort/json" -TimeoutSec 2
      $wsUrl = ($targets | Where-Object type -eq 'page' | Select-Object -First 1).webSocketDebuggerUrl
    } catch { $wsUrl = $null }
    if (-not $wsUrl) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $wsUrl) { throw 'Edge did not open a DevTools page' }
  $script:socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $script:socket.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(10)
  $script:socket.ConnectAsync([uri]$wsUrl, [Threading.CancellationToken]::None).Wait()
  Invoke-Cdp 'Emulation.setFocusEmulationEnabled' @{ enabled = $true } | Out-Null
  Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{ width = $Width; height = $Height; deviceScaleFactor = $Dpr; mobile = $true } | Out-Null
  Invoke-Cdp 'Page.enable' @{} | Out-Null
  Invoke-Cdp 'Page.addScriptToEvaluateOnNewDocument' @{ source = $initScript } | Out-Null
}

function Invoke-Cdp([string]$Method, $Params = @{}, [int]$TimeoutMs = 60000) {
  $script:msgId++
  $json = @{ id = $script:msgId; method = $Method; params = $Params } | ConvertTo-Json -Depth 6 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $script:socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  while ($true) {
    $stream = [IO.MemoryStream]::new(); $buffer = New-Object byte[] 65536
    do {
      $cts = [Threading.CancellationTokenSource]::new($TimeoutMs)
      $r = $script:socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $cts.Token).Result
      $stream.Write($buffer, 0, $r.Count)
    } until ($r.EndOfMessage)
    $text = [Text.Encoding]::UTF8.GetString($stream.ToArray())
    if ($text -cnotmatch ('"id":' + $script:msgId + '[,}]')) { continue }   # an event, or another reply: not parsed (the Network domain sends many)
    if ($text.Length -gt 1MB -or $Method -eq 'Profiler.stop') {                # a CPU profile: past what ConvertFrom-Json takes in PowerShell 5.1
      Add-Type -AssemblyName System.Web.Extensions
      $js = [System.Web.Script.Serialization.JavaScriptSerializer]::new(); $js.MaxJsonLength = [int]::MaxValue; $js.RecursionLimit = 1000
      $reply = $js.DeserializeObject($text)
      if ($reply['id'] -eq $script:msgId) { if ($reply['error']) { throw "DevTools $Method failed: $($reply['error']['message'])" }; return $reply }
      continue
    }
    $reply = $text | ConvertFrom-Json
    if ($reply.id -eq $script:msgId) {
      if ($reply.error) { throw "DevTools $Method failed: $($reply.error.message)" }
      return $reply
    }
  }
}

# Page JavaScript's value (JSON-able), awaited when it is a promise.
function Get-Page([string]$Expression, [int]$TimeoutMs = 60000) {
  $r = Invoke-Cdp 'Runtime.evaluate' @{ expression = $Expression; awaitPromise = $true; returnByValue = $true } $TimeoutMs
  if ($r.result.exceptionDetails) { throw "Page threw: $($r.result.exceptionDetails.exception.description)" }
  return $r.result.result.value
}

function Wait-Page([string]$Condition, [int]$Seconds) {
  $until = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $until) {
    try { if (Get-Page "Boolean($Condition)") { return $true } } catch { }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Set-Throttle([double]$Rate, [bool]$Slow4g) {
  Invoke-Cdp 'Emulation.setCPUThrottlingRate' @{ rate = $Rate } | Out-Null
  Invoke-Cdp 'Network.enable' @{} | Out-Null
  if ($Slow4g) { Invoke-Cdp 'Network.emulateNetworkConditions' @{ offline = $false; latency = 150; downloadThroughput = 200000; uploadThroughput = 93750 } | Out-Null }
  else { Invoke-Cdp 'Network.emulateNetworkConditions' @{ offline = $false; latency = 0; downloadThroughput = -1; uploadThroughput = -1 } | Out-Null }
}

function Left-Seconds { return $MaxSeconds - ((Get-Date) - $started).TotalSeconds }
$fmt = { param($v) if ($null -eq $v) { '-' } else { '{0:N0}' -f [double]$v } }
$out = [ordered]@{ root = $serveRoot; viewport = "${Width}x$Height@$Dpr"; preload = -not $NoPreload }

try {
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) {
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/index.html" -TimeoutSec 2).StatusCode -eq 200 } catch { $up = $false }
    if (-not $up) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $up) { Write-Output "Server did not answer on port $port"; exit 1 }
  $base = "http://127.0.0.1:$port"

  if ($Load) {
    $rate = $cpuList[0]
    $served = (Invoke-WebRequest -UseBasicParsing -Uri "$base/index.html" -TimeoutSec 10).Content
    $preloads = '{0} modules' -f ([regex]::Matches($served, 'rel="modulepreload"')).Count   # what the page is served with (-NoPreload strips the block)
    $cold = @(); $warm = $null; $warmTried = $false
    for ($run = 1; $run -le $Runs; $run++) {
      if ((Left-Seconds) -lt 100) { Write-Output "LOAD: stopped after $($run - 1) runs (time)"; break }
      Open-Edge
      Set-Throttle $rate $true
      Invoke-Cdp 'Page.navigate' @{ url = "$base/" } | Out-Null
      if (-not (Wait-Page 'window.__prof && window.__prof.ready !== null' 90)) {
        $why = try { Get-Page "JSON.stringify({ href: location.href, state: document.readyState, prof: typeof window.__prof, title: !!document.getElementById('title'), hidden: document.getElementById('title') && document.getElementById('title').hidden, thebes: typeof window.__thebes, body: document.body.className, errors: __prof.errors.slice(0, 5), dialog: (document.getElementById('dialog') || {}).hidden })" 10000 } catch { "$_" }
        Write-Output "LOAD run ${run}: no ready point within 90 s ($why)"; continue
      }
      Start-Sleep -Milliseconds 300
      $m = Get-Page "(() => { const n = performance.getEntriesByType('navigation')[0] || {}; const res = performance.getEntriesByType('resource'); return JSON.stringify({ ready: __prof.ready, via: __prof.via, fp: __prof.fp, fcp: __prof.fcp, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, requests: res.length, kb: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) }); })()"
      $row = $m | ConvertFrom-Json
      $cold += $row
      Write-Output ("LOAD cold run {0}: first paint {1} ms, ready {2} ms (by the {3}), DOMContentLoaded {4} ms, requests {5}, {6} KB moved" -f $run, (& $fmt $row.fcp), (& $fmt $row.ready), $row.via, (& $fmt $row.dcl), $row.requests, $row.kb)
      # The warm load once, on the first cold run that loaded: the same page reloaded once the service worker holds the files (still throttled).
      if ($null -eq $warm -and -not $warmTried -and (Left-Seconds) -gt 100) {
        $warmTried = $true
        if (Wait-Page 'navigator.serviceWorker && navigator.serviceWorker.controller' ([Math]::Min(150, (Left-Seconds) - 60))) {
          Invoke-Cdp 'Page.reload' @{ ignoreCache = $false } | Out-Null
          Start-Sleep -Milliseconds 200
          if (Wait-Page 'window.__prof && window.__prof.ready !== null' 60) {
            Start-Sleep -Milliseconds 300
            $warm = (Get-Page "JSON.stringify({ ready: __prof.ready, via: __prof.via, fcp: __prof.fcp })") | ConvertFrom-Json
            Write-Output ("LOAD warm (service worker): first paint {0} ms, ready {1} ms (by the {2})" -f (& $fmt $warm.fcp), (& $fmt $warm.ready), $warm.via)
          } else { Write-Output 'LOAD warm: no ready point within 60 s' }
        } else {
          $sw = try { Get-Page "navigator.serviceWorker.getRegistration().then((r) => JSON.stringify({ reg: r ? { installing: !!r.installing, waiting: !!r.waiting, active: r.active && r.active.state } : null, errors: __prof.errors.slice(0, 4) }))" 10000 } catch { "$_" }
          Write-Output "LOAD warm: the service worker never took the page ($sw)"
        }
      }
    }
    $med = { param($xs) $s = @($xs | Where-Object { $null -ne $_ } | Sort-Object); if (-not $s.Count) { $null } else { $s[[Math]::Floor(($s.Count - 1) / 2)] } }
    $out.load = [ordered]@{ cpu = $rate; runs = $cold; warm = $warm; medianReady = (& $med ($cold | ForEach-Object { $_.ready })); medianPaint = (& $med ($cold | ForEach-Object { $_.fcp })) }
    Write-Output ''
    Write-Output ("| P1 | cpu {0}x, slow 4G, preload {1} | first paint (median of {2}) | {3} ms | ready (median) | {4} ms | warm ready | {5} ms |" -f $rate, $preloads, $cold.Count, (& $fmt $out.load.medianPaint), (& $fmt $out.load.medianReady), (& $fmt $(if ($warm) { $warm.ready } else { $null })))
  }

  if ($Frames) {
    $sizeArg = if ($Size -eq 'huge') { '&size=112' } elseif ($Size) { "&size=$Size" } else { '' }
    Open-Edge
    Set-Throttle 1 $false
    Invoke-Cdp 'Page.navigate' @{ url = "$base/?skipTitle=1&stress=1&nosw=1$sizeArg" } | Out-Null
    if (-not (Wait-Page 'window.__thebes && window.__thebes.world && window.__thebes.renderer' 120)) { Write-Output 'FRAMES: the city never opened'; exit 1 }
    $rows = @()
    foreach ($z in $zoomList) {
      $setZoom = if ($z -eq 'floor') { "(async () => { const m = await import('/src/render/camera.js'); const T = window.__thebes; const c = document.getElementById('map'); T.cam.zoom = m.minZoomFor(T.world.size, { width: c.clientWidth, height: c.clientHeight }); return T.cam.zoom; })()" } else { "(() => { window.__thebes.cam.zoom = $z; return $z; })()" }
      $zoomNow = Get-Page $setZoom
      foreach ($rate in $cpuList) {
        if ((Left-Seconds) -lt ($WarmSeconds + $MeasureSeconds + 20)) { Write-Output 'FRAMES: stopped (time)'; break }
        Set-Throttle $rate $false
        Get-Page 'window.__profFrames.on = true' | Out-Null
        Start-Sleep -Seconds $WarmSeconds
        Get-Page 'window.__profFrames.ms = []; window.__profFrames.render = []; window.__profFrames.at = []; 0' | Out-Null
        $profiling = $Layers -and $rate -eq $cpuList[0]
        if ($profiling) { Invoke-Cdp 'Profiler.enable' @{} | Out-Null; Invoke-Cdp 'Profiler.setSamplingInterval' @{ interval = 1000 } | Out-Null; Invoke-Cdp 'Profiler.start' @{} | Out-Null }
        Start-Sleep -Seconds $MeasureSeconds
        if ($profiling) {
          # Self time by function (and file), over the window: the biggest costs of a frame that misses.
          $prof = (Invoke-Cdp 'Profiler.stop' @{} 120000)['result']['profile']
          $name = @{}
          foreach ($node in $prof['nodes']) { $cf = $node['callFrame']; $name[[int]$node['id']] = "$($cf['functionName'])@$((($cf['url'] -split '/')[-1]))" }
          $self = @{}; $total = 0.0
          $ids = $prof['samples']; $dts = $prof['timeDeltas']
          for ($i = 0; $i -lt $ids.Count; $i++) { $k = $name[[int]$ids[$i]]; $self[$k] = [double]$self[$k] + $dts[$i] / 1000.0; $total += $dts[$i] / 1000.0 }
          $top = $self.GetEnumerator() | Where-Object { $_.Key -notlike '(idle)*' } | Sort-Object Value -Descending | Select-Object -First 12
          Write-Output ("LAYERS zoom {0} cpu {1}x, self time over {2:N0} ms:" -f $zoomNow, $rate, $total)
          foreach ($t in $top) { Write-Output ("  {0,7:N0} ms {1,5:N1}%  {2}" -f $t.Value, (100 * $t.Value / $total), $t.Key) }
          Invoke-Cdp 'Profiler.disable' @{} | Out-Null
        }
        $s = (Get-Page @'
JSON.stringify((() => {
  const F = window.__profFrames, q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
  const span = F.at.length > 1 ? (F.at[F.at.length - 1] - F.at[0]) / 1000 : 0;
  return { n: F.ms.length, fps: span ? (F.ms.length - 1) / span : null, p50: q(F.ms, 0.5), p95: q(F.ms, 0.95), max: F.ms.length ? Math.max(...F.ms) : null, renderP50: q(F.render, 0.5), renderP95: q(F.render, 0.95), bakesNow: window.__thebes.renderer.stats.bakes, sprites: window.__thebes.renderer.stats.sprites };
})())
'@) | ConvertFrom-Json
        $s | Add-Member -NotePropertyName cpu -NotePropertyValue $rate
        $s | Add-Member -NotePropertyName zoom -NotePropertyValue $zoomNow
        $rows += $s
        Get-Page 'window.__profFrames.on = false' | Out-Null
        Write-Output ("FRAMES size {0} zoom {1:N2} cpu {2}x: {3} frames ({4:N1} a second), p50 {5:N1} ms, p95 {6:N1} ms, worst {7:N1} ms; the draw alone p50 {8:N1} ms, p95 {9:N1} ms; {10} sprites" -f $(if ($Size) { $Size } else { 64 }), [double]$zoomNow, $rate, $s.n, [double]$s.fps, [double]$s.p50, [double]$s.p95, [double]$s.max, [double]$s.renderP50, [double]$s.renderP95, $s.sprites)
      }
    }
    Set-Throttle 1 $false
    $out.frames = $rows
  }

  if ($Session) {
    $sizeArg = if ($Size -eq 'huge') { 112 } elseif ($Size) { [int]$Size } else { 80 }
    Open-Edge
    Set-Throttle 1 $false
    Invoke-Cdp 'Page.navigate' @{ url = "$base/?skipTitle=1&$City=1&seed=11&nosw=1&size=$sizeArg" } | Out-Null
    if (-not (Wait-Page 'window.__thebes && window.__thebes.world && window.__thebes.renderer' 120)) { Write-Output 'SESSION: the city never opened'; exit 1 }
    $driver = @'
(() => {
  const S = window.__profSession = { playMin: 0, day: 0, waiting: null, done: false, error: null, frames: 0, peakCaches: 0, peakCanvas: 0, go: null, msTick: 0, msDraw: 0, msSweep: 0 };
  const HOURS = __HOURS__;
  const pause = (label) => new Promise((resolve) => { S.waiting = label; S.go = () => { S.waiting = null; S.go = null; resolve(); }; });
  (async () => {
    const T = window.__thebes;
    const { tickDay } = await import('/src/sim/clock.js');
    const { setSpeed } = await import('/src/sim/commands.js');
    const { ZOOM_BUCKETS } = await import('/src/render/spriteCache.js');
    const { CHUNK, minZoomFor } = await import('/src/render/camera.js');
    const world = T.world, cam = T.cam, ui = T.ui, stats = T.renderer.stats, canvas = document.getElementById('map');
    T.loop.stop();                                    // the driver draws the frames itself, as fast as they come
    const view = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });
    const peaks = () => {
      const c = window.__thebes.caches ? window.__thebes.caches() : { terrainBytes: 0, spriteBytes: 0 };
      S.peakCaches = Math.max(S.peakCaches, (c.terrainBytes || 0) + (c.spriteBytes || 0));
    };
    const frame = () => { const t0 = performance.now(); ui.render({ timeDays: world.day, now: t0 }); S.msDraw += performance.now() - t0; S.frames++; peaks(); };
    const yieldNow = () => new Promise((r) => setTimeout(r, 0));
    const events = [];
    const days = async (n, speed) => {
      setSpeed(world, speed);
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        tickDay(world, events);
        if (events.length) { const ev = events.splice(0); ui.effects.fromEvents(world, ev, performance.now()); ui.onEvents(ev); }
        S.msTick += performance.now() - t0;
        if (i % 10 === 9) { frame(); await yieldNow(); }
        S.day = world.day;
      }
    };
    const sweep = async () => {
      const t0 = performance.now(), d0 = S.msDraw;
      const n = Math.ceil(world.size / CHUNK), floor = minZoomFor(world.size, view());
      const keep = { x: cam.x, y: cam.y, zoom: cam.zoom };
      for (const b of ZOOM_BUCKETS) {
        if (b < floor - 1e-9) continue;
        cam.zoom = b;
        for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
          cam.x = cx * CHUNK + CHUNK / 2; cam.y = cy * CHUNK + CHUNK / 2;
          let k = 0;
          do { frame(); k++; } while ((stats.bakes > 0 || stats.stale > 0) && k < 24);
          if ((cx + cy * n) % 8 === 7) await yieldNow();
        }
      }
      Object.assign(cam, keep);
      frame();
      S.msSweep += performance.now() - t0; S.msDraw = d0;   // the sweep's frames count as the sweep's
    };
    // 10 minutes of play: 4 at 1x, 4 at 2x, 2 at 3x (DAYS_PER_SECOND 1), so 1,080 days (three game years), then the camera over every chunk at
    // every zoom bucket (ruling 1690: once each 10 minutes of play, not each game year, so 2 hours fit the profile's 10 minutes on this machine).
    const BLOCK = [[240, 1], [480, 2], [360, 3]];
    await pause(0);
    for (let block = 1; block <= Math.round(HOURS * 6); block++) {
      for (const [n, speed] of BLOCK) await days(n, speed);
      await sweep();
      S.playMin = block * 10;
      await pause(S.playMin);
    }
    S.done = true;
  })().catch((e) => { S.error = String(e && e.stack || e); S.done = true; });
  return true;
})()
'@
    Get-Page ($driver.Replace('__HOURS__', [string]$SessionHours)) | Out-Null
    $samples = @()
    while ($true) {
      if ((Left-Seconds) -lt 25) { Write-Output 'SESSION: stopped (time)'; break }
      $st = (Get-Page 'JSON.stringify({ waiting: __profSession.waiting, done: __profSession.done, error: __profSession.error, day: __profSession.day, frames: __profSession.frames, ms: [__profSession.msTick, __profSession.msDraw, __profSession.msSweep].map(Math.round) })') | ConvertFrom-Json
      if ($st.error) { Write-Output "SESSION threw: $($st.error)"; break }
      if ($null -ne $st.waiting) {
        Invoke-Cdp 'HeapProfiler.collectGarbage' @{} 120000 | Out-Null
        Start-Sleep -Milliseconds 300
        Invoke-Cdp 'HeapProfiler.collectGarbage' @{} 120000 | Out-Null
        $heap = Invoke-Cdp 'Runtime.getHeapUsage' @{}
        $c = (Get-Page 'JSON.stringify({ caches: window.__thebes.caches ? window.__thebes.caches() : null, canvas: window.__profCanvas(), peak: __profSession.peakCaches })') | ConvertFrom-Json
        $row = [ordered]@{ playMin = $st.waiting; day = $st.day; frames = $st.frames; heapMB = [Math]::Round($heap.result.usedSize / 1MB, 1)
          terrainMB = [Math]::Round([double]$c.caches.terrainBytes / 1MB, 1); spriteMB = [Math]::Round([double]$c.caches.spriteBytes / 1MB, 1)
          peakCachesMB = [Math]::Round([double]$c.peak / 1MB, 1); canvases = $c.canvas.n; canvasMB = [Math]::Round([double]$c.canvas.bytes / 1MB, 1)
          elapsedS = [Math]::Round(((Get-Date) - $started).TotalSeconds) }
        $samples += [pscustomobject]$row
        Write-Output ("SESSION {0,3} min of play (day {1}, {2} frames, {3} s; ticks {10} s, frames {11} s, sweeps {12} s): heap {4} MB; caches terrain {5} MB + sprites {6} MB (peak so far {7} MB); {8} live canvases, {9} MB" -f $row.playMin, $row.day, $row.frames, $row.elapsedS, $row.heapMB, $row.terrainMB, $row.spriteMB, $row.peakCachesMB, $row.canvases, $row.canvasMB, [Math]::Round($st.ms[0] / 1000), [Math]::Round($st.ms[1] / 1000), [Math]::Round($st.ms[2] / 1000))
        Get-Page '__profSession.go(); 0' | Out-Null
        continue
      }
      if ($st.done) { break }
      Start-Sleep -Milliseconds 500
    }
    $out.session = $samples
    $h1 = $samples | Where-Object { $_.playMin -eq 60 } | Select-Object -First 1
    $h2 = $samples | Select-Object -Last 1
    if ($h1 -and $h2 -and $h2.playMin -gt 60) {
      $growth = 100 * ($h2.heapMB - $h1.heapMB) / $h1.heapMB
      Write-Output ''
      Write-Output ("| P3 | heap at {0} min {1} MB, at 60 min {2} MB: second hour {3:N1}% | caches at the end {4} MB, peak {5} MB | live canvases {6} MB |" -f $h2.playMin, $h2.heapMB, $h1.heapMB, $growth, ($h2.terrainMB + $h2.spriteMB), ($samples | Measure-Object -Property peakCachesMB -Maximum).Maximum, $h2.canvasMB)
    }
  }
  if ($Json) { $out | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Json -Encoding utf8 }
} finally {
  if ($reaper) { Stop-Process -Id $reaper.Id -Force -ErrorAction SilentlyContinue }
  if ($script:socket) { $script:socket.Dispose() }
  if ($script:browser) { Stop-Process -Id $script:browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$token*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Get-ChildItem -Path $env:TEMP -Directory -Filter "$token*" -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
}
