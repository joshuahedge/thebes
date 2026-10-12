# Makes the picture cards' pictures (spec 4.1, ruling 264): for each card of src/data/tutorial.js it opens the game on
# the picture's city (src/dev/tutorialScenes.js TUTORIAL_SHOT: seed 7's fresh city on a 390x844 phone), runs the
# picture's dev scene (tutorialPicture(window.__thebes, '<id>'), which devScene('tutorial', { picture }) runs too) and
# captures the square the scene names as a 600x600 WebP (the phone's pixel ratio is 600/390, so it is sharp) of at most
# 60 KB (the quality steps down from -Quality until it fits), saved as assets/tutorial/<id>.webp. The marks the scenes
# read off the page (a tile through the camera, a building's drawn box, a button's or a row's box) go to
# assets/tutorial/cards.json. Run it again whenever the art or the interface's look changes (every visual review's
# checklist; Track F runs it last on the final art), then tools/sw-files.ps1. A page that fails to load a module while
# it boots is opened again (three tries).
#
# -Check also shoots the six cards as a player sees them, picture and ring together, on the title card at a phone held
# both ways (devScene('tutorial'), then Next), as <CheckDir>/card-<n>-<id>-<size>.png: look at each one and make sure the
# ring or arrow sits on its thing. -CheckOnly shoots those without making the pictures again.
# Usage: tools/tutorial.ps1 [-Only road,farm] [-Quality 80] [-Check | -CheckOnly] [-CheckDir <dir>]
param([string[]]$Only = @(), [int]$Quality = 80, [switch]$Check, [switch]$CheckOnly,
  [string]$CheckDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'docs\superpowers\notes\screenshots\raw'))
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'assets\tutorial'
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
function Get-FreePort {
  $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $p = $l.LocalEndpoint.Port; $l.Stop(); return $p
}
$port = Get-FreePort
$debugPort = Get-FreePort
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $root 'tests\serve.py')`"", "$port", "`"$root`"" -PassThru -WindowStyle Hidden
$profileDir = Join-Path $env:TEMP ('thebes-tutorial-' + [guid]::NewGuid().ToString('N'))
$browser = $null
$socket = $null
$failed = $false
try {
  $up = $false
  for ($i = 0; $i -lt 40 -and -not $up; $i++) {
    try { $up = (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/index.html" -TimeoutSec 2).StatusCode -eq 200 } catch { $up = $false }
    if (-not $up) { Start-Sleep -Milliseconds 250 }
  }
  if (-not $up) { Write-Output "Server did not answer on port $port"; exit 1 }
  $browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-frame-rate-limit',
    "--user-data-dir=`"$profileDir`"", "--remote-debugging-port=$debugPort", 'about:blank')
  $browser = Start-Process -FilePath $edge -ArgumentList $browserArgs -PassThru -WindowStyle Hidden
  $wsUrl = $null
  for ($i = 0; $i -lt 40 -and -not $wsUrl; $i++) {
    try {
      $targets = Invoke-RestMethod "http://127.0.0.1:$debugPort/json" -TimeoutSec 2
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
        $cts = [Threading.CancellationTokenSource]::new(60000)
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
  # Opens a page at a size and pixel ratio and waits for the game to boot.
  function Open-Page([string]$Url, [int]$W, [int]$H, [double]$Dpr) {
    Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{ width = $W; height = $H; deviceScaleFactor = $Dpr; mobile = $false } | Out-Null
    Invoke-Cdp 'Page.navigate' @{ url = "http://127.0.0.1:$port$Url" } | Out-Null
    $loaded = $false
    for ($i = 0; $i -lt 120 -and -not $loaded; $i++) {
      $state = Invoke-Cdp 'Runtime.evaluate' @{ expression = 'document.readyState' }
      $loaded = $state.result.result.value -eq 'complete'
      if (-not $loaded) { Start-Sleep -Milliseconds 250 }
    }
    if (-not $loaded) { throw "TIMEOUT loading $Url" }
    Start-Sleep -Milliseconds 900                     # the boot is async: let the game (and window.__thebes) exist first
  }
  function Invoke-Page([string]$Expression) {
    $r = Invoke-Cdp 'Runtime.evaluate' @{ expression = $Expression; awaitPromise = $true; returnByValue = $true }
    if ($r.result.exceptionDetails) { throw "Page threw: $($r.result.exceptionDetails.exception.description)" }
    return $r.result.result.value
  }
  Invoke-Cdp 'Emulation.setFocusEmulationEnabled' @{ enabled = $true } | Out-Null
  $info = $null
  for ($try = 1; $try -le 3 -and -not $info; $try++) {
    try {
      Open-Page '/?nosw=1' 390 844 1
      $info = Invoke-Page "(async () => { const t = await import('./src/data/tutorial.js'), s = await import('./src/dev/tutorialScenes.js'); return JSON.stringify({ ids: t.TUTORIAL_CARDS.map((c) => c.id), size: t.TUTORIAL.size, maxBytes: t.TUTORIAL.maxBytes, shot: s.TUTORIAL_SHOT }); })()" | ConvertFrom-Json
    } catch { if ($try -eq 3) { throw } }
  }
  $ids = @($info.ids)
  if ($Only.Count) { foreach ($o in $Only) { if ($ids -notcontains $o) { Write-Output "No card named $o ($($ids -join ', '))"; exit 2 } } }

  if (-not $CheckOnly) {
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force $outDir | Out-Null }
    $marksPath = Join-Path $outDir 'cards.json'
    # Marks of cards not made this run are kept from the last cards.json.
    $marks = [ordered]@{}
    if (Test-Path $marksPath) {
      $old = Get-Content -LiteralPath $marksPath -Raw | ConvertFrom-Json
      foreach ($id in $ids) { if ($old.cards.$id) { $marks[$id] = ($old.cards.$id.mark | ConvertTo-Json -Compress) } }
    }
    $dpr = [double]$info.size / [double]$info.shot.clip
    foreach ($id in $ids) {
      if ($Only.Count -and -not ($Only -contains $id)) { continue }
      # A page now and then fails to fetch a module while it boots: open it again (three tries).
      $scene = $null
      for ($try = 1; $try -le 3 -and -not $scene; $try++) {
        try {
          Open-Page $info.shot.params ([int]$info.shot.width) ([int]$info.shot.height) $dpr
          $scene = Invoke-Page "(async () => JSON.stringify(await (await import('./src/dev/tutorialScenes.js')).tutorialPicture(window.__thebes, '$id')))()" | ConvertFrom-Json
        } catch { if ($try -eq 3) { throw } else { Write-Output "Retrying $id ($($_.Exception.Message.Split([char]10)[0]))" } }
      }
      Start-Sleep -Milliseconds 700                   # a few frames with the scene drawn
      $clip = @{ x = [double]$scene.clip.x; y = [double]$scene.clip.y; width = [double]$scene.clip.size; height = [double]$scene.clip.size; scale = 1 }
      $q = $Quality
      $bytes = $null
      while ($true) {
        $shot = Invoke-Cdp 'Page.captureScreenshot' @{ format = 'webp'; quality = $q; clip = $clip }
        $bytes = [Convert]::FromBase64String($shot.result.data)
        if ($bytes.Length -le [int]$info.maxBytes -or $q -le 30) { break }
        $q -= 10
      }
      if ($bytes.Length -gt [int]$info.maxBytes) { Write-Output "TOO BIG $id $($bytes.Length) bytes at quality $q"; $failed = $true; continue }
      [IO.File]::WriteAllBytes((Join-Path $outDir "$id.webp"), $bytes)
      $marks[$id] = ($scene.mark | ConvertTo-Json -Compress)
      Write-Output ("Wrote assets/tutorial/{0}.webp: {1:N0} bytes at quality {2}, mark {3}" -f $id, $bytes.Length, $q, $marks[$id])
    }
    $lines = @($ids | Where-Object { $marks.Contains($_) } | ForEach-Object { "    `"$_`": { `"mark`": $($marks[$_]) }" })
    $text = "{`n  `"size`": $($info.size),`n  `"cards`": {`n" + ($lines -join ",`n") + "`n  }`n}`n"
    [IO.File]::WriteAllText($marksPath, $text, [Text.UTF8Encoding]::new($false))
    Write-Output "Wrote assets/tutorial/cards.json: $($lines.Count) marks. Now run tools/sw-files.ps1."
  }

  if ($Check -or $CheckOnly) {
    if (-not (Test-Path $CheckDir)) { New-Item -ItemType Directory -Force $CheckDir | Out-Null }
    foreach ($size in @(@{ name = 'phone-portrait'; w = 390; h = 844 }, @{ name = 'phone-landscape'; w = 844; h = 390 })) {
      for ($n = 0; $n -lt $ids.Count; $n++) {
        if ($Only.Count -and -not ($Only -contains $ids[$n])) { continue }
        $said = $null
        for ($try = 1; $try -le 3 -and -not $said; $try++) {
          try {
            Open-Page '/?nosw=1' $size.w $size.h 1
            $said = Invoke-Page "(async () => { const said = await window.__thebes.devScene('tutorial'); for (let i = 0; i < $n; i++) document.querySelector('.picture-cards .pc-next').click(); return said + ', then card $($n + 1)'; })()"
          } catch { if ($try -eq 3) { throw } }
        }
        Start-Sleep -Milliseconds 500
        $shot = Invoke-Cdp 'Page.captureScreenshot' @{ format = 'png' }
        $out = Join-Path $CheckDir ("card-{0}-{1}-{2}.png" -f ($n + 1), $ids[$n], $size.name)
        [IO.File]::WriteAllBytes($out, [Convert]::FromBase64String($shot.result.data))
        Write-Output "Wrote $out ($said)"
      }
    }
  }
} finally {
  if ($socket) { $socket.Dispose() }
  if ($browser) { Stop-Process -Id $browser.Id -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
if ($failed) { exit 1 }
