# Takes six screens at four sizes for before/after comparisons. By default the early-game six (title, fresh city,
# placing a well, a house sheet, the summary, Welcome back); with -Stage2 the Stage 2 six (title, city, placing a
# potter, a Manor's sheet, a trade sheet with an open route, the summary).
# Usage: tools/shots.ps1 -Tag before [-Stage2] [-Only title,fresh] [-OnlySizes phone-portrait]
# then: python tools/contact.py docs/superpowers/notes/screenshots/raw docs/superpowers/notes/screenshots <prefix> before after [--stage2]
param([string]$Tag = 'before', [string]$OutDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'docs\superpowers\notes\screenshots\raw'), [string[]]$Only = @(), [string[]]$OnlySizes = @(), [switch]$Stage2)
$ErrorActionPreference = 'Stop'
# `powershell -File ... -Only a,b` hands over one string "a,b": split it.
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$OnlySizes = @($OnlySizes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$shot = Join-Path (Split-Path -Parent $PSScriptRoot) 'tests\screenshot.ps1'
$sizes = @(
  @{ name = 'phone-portrait'; w = 390; h = 844 },
  @{ name = 'phone-landscape'; w = 844; h = 390 },
  @{ name = 'tablet'; w = 1024; h = 768 },
  @{ name = 'laptop'; w = 1280; h = 800 }
)
$modes = "import('./src/ui/modes.js')"
$placing = @'
(async () => { const t = window.__thebes; const m = await import('./src/ui/modes.js');
  t.ui.store.set(m.pickCategory(t.ui.store.get(), 'services'));
  await new Promise((r) => setTimeout(r, 300));
  const card = [...document.querySelectorAll('[data-item="well"]')].find((b) => b.offsetParent);
  card.click(); return 'ok'; })()
'@
$house = @'
(async () => { const t = window.__thebes; const m = await import('./src/ui/modes.js');
  const hs = Object.values(t.world.buildings).filter((b) => b.type === 'house' && b.residents > 0);
  const c = t.world.size / 2; hs.sort((a, b) => (a.tier - b.tier) || (Math.abs(a.x - t.cam.x) + Math.abs(a.y - t.cam.y)) - (Math.abs(b.x - t.cam.x) + Math.abs(b.y - t.cam.y)));
  const h = hs.find((x) => x.tier >= 2) || hs[0];
  t.ui.store.set(m.select(t.ui.store.get(), h.id)); return 'house ' + h.id + ' tier ' + h.tier; })()
'@
$summary = @'
(async () => { const t = window.__thebes; const m = await import('./src/ui/modes.js');
  t.ui.store.set(m.openSheet(t.ui.store.get(), 'summary')); return 'ok'; })()
'@

# The Stage 2 scenes drive the page the way a player (or the sim's public commands) would. This opening is shared:
# focus(x, y, kind) puts a tile in the middle of the map the screen leaves free (the top bar, and the side panel, the
# sheet or the confirm bar take the rest, as in createUI's insets), by a jump, so no camera tween is left running.
$stage2Prelude = @'
const t = window.__thebes, w = t.world;
const m = await import('./src/ui/modes.js');
const camera = await import('./src/render/camera.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const view = () => { const c = document.querySelector('#map'); return { width: c.clientWidth || innerWidth, height: c.clientHeight || innerHeight }; };
const insets = (kind) => {
  const v = view(), layout = t.ui.store.get().layout, top = 48;
  if (layout === 'portrait') return { top, left: 0, right: 0, bottom: kind === 'sheet' ? v.height * 0.6 : kind === 'placing' ? Math.min(v.height * 0.3, 240) : v.height * 0.2 };
  return { top, left: 0, bottom: 0, right: layout === 'compact' ? 56 + 268 : 320 };
};
const focus = (x, y, kind) => {
  const v = view(), i = insets(kind), z = t.cam.zoom;
  const midX = i.left + (v.width - i.left - i.right) / 2, midY = i.top + (v.height - i.top - i.bottom) / 2;
  const c = camera.screenToTile({ x, y, zoom: z }, v, v.width - midX, v.height - midY);
  t.ui.cameraControl.jumpTo(c.x, c.y);
};
'@
function New-Scene([string]$Body) { "(async () => {`n$stage2Prelude`n$Body`nreturn 'ok'; })()" }

# A Stage 2 city, camera on the town: Townhouses and Manors around the first street.
$city = New-Scene @'
focus(20.5, 50, 'browse');
'@

# A potter on the spot, near the homes, where it would spoil the most homes without a warning of its own: the confirm
# bar shows "Makes N homes less pleasant" and the desirability tint lies under the ghost.
$placing2 = New-Scene @'
const cmd = await import('./src/sim/commands.js'), des = await import('./src/sim/desirability.js');
let best = null;
for (let y = 40; y < 62; y++) for (let x = 8; x < 34; x++) {
  const r = cmd.canPlace(w, 'potter', x, y);
  if (!r.ok) continue;
  const score = (r.warnings.length ? 0 : 1000) + des.desirabilityPreview(w, 'potter', x, y).worse * 10 - Math.hypot(x - 20, y - 50);
  if (!best || score > best.score) best = { x, y, score };
}
if (!best) throw new Error('no spot for a potter');
focus(best.x + 1, best.y + 1, 'placing');
t.ui.store.set(m.pickCategory(t.ui.store.get(), 'industry'));
await wait(300);
const card = [...document.querySelectorAll('[data-item="potter"]')].find((b) => b.offsetParent);
card.click();
t.ui.placement.moveGhost(best.x, best.y);
focus(best.x + 1, best.y + 1, 'placing');
'@

# The house sheet of the highest-tier home (a Manor or better when the city has one), the nearest to the town first.
$manor = New-Scene @'
const hs = Object.values(w.buildings).filter((b) => b.type === 'house' && b.residents > 0);
hs.sort((a, b) => (b.tier - a.tier) || (Math.abs(a.x - 20) + Math.abs(a.y - 50)) - (Math.abs(b.x - 20) + Math.abs(b.y - 50)));
const h = hs[0];
focus(h.x + h.w / 2, h.y + h.d / 2, 'sheet');
t.ui.store.set(m.select(t.ui.store.get(), h.id));
'@

# A trading post beside the start road (joined to the trade entry), staffed, Memphis open and four orders set, all
# through the sim's public commands (the city can afford them), then the post's trade sheet.
$trade = New-Scene @'
const cmd = await import('./src/sim/commands.js'), trade = await import('./src/sim/trade.js'), lab = await import('./src/sim/labour.js');
const e = w.tradeEntry;
let at = null;
for (let y = e.y - 3; y >= e.y - 12 && !at; y--) for (const x of [e.x + 1, e.x - 2]) if (!at && cmd.canPlace(w, 'trading_post', x, y).ok) at = { x, y };
if (!at) throw new Error('no spot for a trading post');
const placed = cmd.place(w, 'trading_post', at.x, at.y);
if (!placed.ok) throw new Error('post: ' + placed.reason);
lab.assignLabour(w);
const post = w.buildings[placed.id];
if (!trade.postConnected(w) || !lab.isWorking(w, post)) throw new Error('post not joined or not staffed');
const opened = trade.openRoute(w, 'memphis');
if (!opened.ok) throw new Error('route: ' + opened.reason);
trade.setTradeOrder(w, 'grain', 'sell', 50);
trade.setTradeOrder(w, 'figs', 'buy', 30);
trade.setTradeOrder(w, 'pottery', 'sell', 20);
trade.setTradeOrder(w, 'clay', 'buy', 40);
focus(post.x + 1, post.y + 1, 'sheet');
t.ui.store.set(m.select(t.ui.store.get(), post.id));
t.ui.store.set(m.openSheet(t.ui.store.get(), 'trade', post.id));
// A short sheet shows only the routes: scroll the least that brings the first good's order (its keep level) into view,
// but never past the open route (Memphis stays just under the sheet's heading).
await wait(200);
const sheet = document.querySelector('#sheet'), help = sheet.querySelector('.trade-good .keep-help');
const rect = (sel) => sheet.querySelector(sel).getBoundingClientRect();
if (help) sheet.scrollTop += Math.min(Math.max(0, help.getBoundingClientRect().bottom - sheet.getBoundingClientRect().bottom + 16), Math.max(0, rect('.route.open').top - rect('.head').bottom));
'@

$scenarios = if ($Stage2) {
  @(
    @{ name = 'title'; url = '/?nosw=1'; eval = '' },
    @{ name = 'city'; url = '/?skipTitle=1&nosw=1&seed=11&sample=1'; eval = $city },
    @{ name = 'placing'; url = '/?skipTitle=1&nosw=1&seed=11&sample=1'; eval = $placing2 },
    @{ name = 'manor'; url = '/?skipTitle=1&nosw=1&seed=11&sample=1'; eval = $manor },
    @{ name = 'trade'; url = '/?skipTitle=1&nosw=1&seed=11&sample=1'; eval = $trade },
    @{ name = 'summary'; url = '/?skipTitle=1&nosw=1&seed=11&sample=1'; eval = $summary }
  )
} else {
  @(
    @{ name = 'title'; url = '/?nosw=1'; eval = '' },
    @{ name = 'fresh'; url = '/?skipTitle=1&nosw=1&seed=7'; eval = '' },
    @{ name = 'placing'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $placing },
    @{ name = 'house'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $house },
    @{ name = 'summary'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $summary },
    @{ name = 'welcome'; url = '/?welcome=1&nosw=1&seed=7'; eval = '' }
  )
}
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
foreach ($sc in $scenarios) {
  if ($Only.Count -and -not ($Only -contains $sc.name)) { continue }
  foreach ($sz in $sizes) {
    if ($OnlySizes.Count -and -not ($OnlySizes -contains $sz.name)) { continue }
    $out = Join-Path $OutDir "$Tag-$($sc.name)-$($sz.name).png"
    & $shot -Url $sc.url -Out $out -Width $sz.w -Height $sz.h -BudgetMs 1800 -Eval $sc.eval
  }
}
