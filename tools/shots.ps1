# Takes six screens (title, fresh city, placing a well, a house sheet, the summary, Welcome back) at four sizes
# for before/after comparisons. Usage: tools/shots.ps1 -Tag before [-Only title,fresh] [-OnlySizes phone-portrait]
# then: python tools/contact.py docs/superpowers/notes/screenshots/raw docs/superpowers/notes/screenshots <prefix> before after
param([string]$Tag = 'before', [string]$OutDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'docs\superpowers\notes\screenshots\raw'), [string[]]$Only = @(), [string[]]$OnlySizes = @())
$ErrorActionPreference = 'Stop'
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
$scenarios = @(
  @{ name = 'title'; url = '/?nosw=1'; eval = '' },
  @{ name = 'fresh'; url = '/?skipTitle=1&nosw=1&seed=7'; eval = '' },
  @{ name = 'placing'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $placing },
  @{ name = 'house'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $house },
  @{ name = 'summary'; url = '/?skipTitle=1&nosw=1&seed=7&sample=1'; eval = $summary },
  @{ name = 'welcome'; url = '/?welcome=1&nosw=1&seed=7'; eval = '' }
)
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force $OutDir | Out-Null }
foreach ($sc in $scenarios) {
  if ($Only.Count -and -not ($Only -contains $sc.name)) { continue }
  foreach ($sz in $sizes) {
    if ($OnlySizes.Count -and -not ($OnlySizes -contains $sz.name)) { continue }
    $out = Join-Path $OutDir "$Tag-$($sc.name)-$($sz.name).png"
    & $shot -Url $sc.url -Out $out -Width $sz.w -Height $sz.h -BudgetMs 1800 -Eval $sc.eval
  }
}
