# Thebes Stage 1a: Simulation Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Thebes' deterministic game-rules engine for Stage 1 (map, roads, housing tiers 1–4, water/food/religion, workers, grain chain, immigration, mood, money, undo, save format), fully covered by browser-run tests that can also be run from the command line.

**Architecture:** Plain ES modules with no build step. `src/data/` holds every number; `src/sim/` holds pure game rules that never touch the DOM, the clock or `Math.random`; `src/save/` turns a world into versioned JSON. The UI will change the world only through the command functions in `src/sim/commands.js`. Tests run in a browser page (`tests/index.html`). `tests/run-tests.ps1` runs that page in headless Microsoft Edge, so tests run from a terminal without installing anything.

**Tech Stack:** HTML + JavaScript ES modules, a small in-house test harness, Python's built-in `http.server` for local serving, headless Microsoft Edge for command-line test runs.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md` (sections 4.1–4.11, 4.14, 4.17, 7.2–7.5 and 9 apply to this plan)

**Later plans:** Stage 1 is split into four plans, each written after the previous one is built so it can reference real code. They are 1a simulation core (this plan), 1b rendering (blended terrain, sprites, walkers, overlays), 1c interface and input (three layouts, modes, gestures, mouse and keyboard, sheets), and 1d onboarding, saving and shipping (title card, goals, welcome back, IndexedDB, PWA, install flows, sound, publish).

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules loaded by the browser.
- Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox and Safari. Use only standard JS that those support (no decorators, no top-level `await` in `src/`).
- `src/sim/` must be deterministic. It never uses `Math.random`, `Date`, `performance.now` or the DOM, and all randomness comes from `src/sim/rng.js`.
- Every tunable number lives in `src/data/`. Sim code imports it, so balancing never needs a sim code change.
- The world is plain JSON-safe data: numbers, strings, booleans, arrays and plain objects. Caches live outside it (WeakMap), never inside.
- One game-day per tick, 30 days a month, 12 months a year. At 1×, a month is 20 seconds.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>`. It's already set in `.git/config`, so never change it or the global config.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never use any file, image or text from Pharaoh or Pharaoh: A New Era, and never use the word "Pharaoh" in game text or code identifiers.
- Run all commands from the repo root `C:\dev\thebes` in PowerShell.

## File Structure

```
thebes/
  .gitattributes                 force LF line endings
  .gitignore
  README.md                      what it is, how to run, how to test
  src/
    data/
      economy.js                 start gold, road cost, wages, debt floor, refunds, worker share
      goods.js                   goods table (grain) and food helpers
      housing.js                 tier table (1–4), leave cap, downgrade delay
      buildings.js               building table (house plot, well, farm, granary, bazaar, temple)
      labour.js                  priority levels, minimum staffing ratio
      mood.js                    mood and immigration constants
      progression.js             milestones and unlocks
    sim/
      rng.js                     seeded generator (mulberry32) and hash noise
      grid.js                    tile index and footprint helpers
      terrain.js                 terrain codes and terrain predicates
      mapgen.js                  seeded 64×64 map: river, fertile land, rocky patches, meadow, trade road
      world.js                   createWorld, lookups, population
      reach.js                   road BFS reach, adjacency, buildings and houses in reach (cached)
      progression.js             milestone updates and unlock checks
      money.js                   canAfford, spend, refund
      commands.js                place, canPlace, drawRoad, previewRoad, paintHouses, demolishAt, demolishArea, setPaused, setSpeed
      undo.js                    10-action undo with full refunds
      labour.js                  workforce and priority staffing
      production.js              daily farm output into storage
      distribution.js            bazaar restock and household top-up
      housing.js                 monthly needs, upgrade and downgrade, leavers, houseStatus
      immigration.js             arrivals batches and departures
      mood.js                    monthly mood and breakdown
      economy.js                 monthly taxes, wages, upkeep
      alerts.js                  monthly alert list
      time.js                    days per month, months per year, days per real second
      clock.js                   tickDay, advanceDays, date helpers
    save/
      migrate.js                 version constant and migrations
      serialize.js               serialize and deserialize worlds
  tests/
    index.html                   test runner page
    harness.js                   describe / it / expect / run
    all.js                       imports every test file
    run-tests.ps1                command-line runner (Python server + headless Edge)
    harness.test.js
    helpers/testWorld.js         makeTestWorld: a flat, hand-built map for rule tests
    data/data.test.js
    sim/*.test.js
    save/serialize.test.js
```

## How to run tests

- **Command line:** `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` runs everything. Add `-Grep "reach"` to run only tests whose full name contains "reach". It prints one line per test and exits 0 only when it prints `ALL PASSED`.
- **Browser:** run `python -m http.server 8000`, then open `http://localhost:8000/tests/` (add `?grep=reach` to filter).

---

### Task 1: Project scaffold, test harness and command-line runner

**Files:**
- Create: `.gitattributes`, `.gitignore`, `README.md`
- Create: `tests/harness.js`, `tests/index.html`, `tests/all.js`, `tests/run-tests.ps1`
- Test: `tests/harness.test.js`

**Interfaces:**
- Produces: `describe(name, fn)`, `it(name, fn)`, `expect(actual)` (matchers `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toContain`, `toThrow`), and `run(grep)`, all exported from `tests/harness.js`. Every later test file does `import { describe, it, expect } from '../harness.js';` (or `'./harness.js'` from `tests/`) and is added as one `import` line in `tests/all.js`.

- [ ] **Step 1: Create repo housekeeping files**

`.gitattributes`:
```
* text=auto eol=lf
*.png binary
```

`.gitignore`:
```
*.log
.DS_Store
Thumbs.db
```

`README.md`:
```markdown
# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Run it locally

    python -m http.server 8000

Then open http://localhost:8000/.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

Add `-Grep "reach"` to run only matching tests. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
```

- [ ] **Step 2: Write the harness self-test (it will fail because the harness doesn't exist yet)**

`tests/harness.test.js`:
```js
import { describe, it, expect } from './harness.js';

describe('harness', () => {
  it('compares primitives with toBe', () => {
    expect(1 + 1).toBe(2);
  });
  it('compares structures with toEqual', () => {
    expect({ a: [1, 2], b: { c: 'x' } }).toEqual({ a: [1, 2], b: { c: 'x' } });
  });
  it('reports a failed expectation by throwing', () => {
    let threw = false;
    try { expect(1).toBe(2); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('supports numeric comparisons and toContain', () => {
    expect(5).toBeGreaterThan(4);
    expect(5).toBeGreaterThanOrEqual(5);
    expect(3).toBeLessThan(4);
    expect(3).toBeLessThanOrEqual(3);
    expect([1, 2, 3]).toContain(2);
    expect('hello').toContain('ell');
  });
  it('supports toThrow', () => {
    expect(() => { throw new Error('boom'); }).toThrow();
  });
});
```

`tests/all.js`:
```js
import './harness.test.js';
```

`tests/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Thebes tests</title>
<style>
  body { font: 14px/1.5 ui-monospace, Consolas, monospace; margin: 16px; background: #fff; color: #111; }
  #results { white-space: pre-wrap; }
</style>
</head>
<body>
<pre id="results">RUNNING</pre>
<script type="module">
  const out = document.getElementById('results');
  try {
    const { run } = await import('./harness.js');
    await import('./all.js');
    const grep = new URLSearchParams(location.search).get('grep') || '';
    await run(grep);
  } catch (e) {
    out.textContent = 'LOAD ERROR\n' + (e && e.stack ? e.stack : String(e));
    document.title = 'FAIL';
  }
</script>
</body>
</html>
```

- [ ] **Step 3: Write the runner script**

`tests/run-tests.ps1`:
```powershell
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
try {
  Start-Sleep -Milliseconds 1500
  $url = "http://127.0.0.1:$Port/tests/index.html"
  if ($Grep) { $url += '?grep=' + [uri]::EscapeDataString($Grep) }
  $edgeArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    "--user-data-dir=`"$profileDir`"", "--virtual-time-budget=$BudgetMs", '--dump-dom', $url)
  $p = Start-Process -FilePath $edge -ArgumentList $edgeArgs -RedirectStandardOutput $outFile -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(180000)) { Stop-Process -Id $p.Id -Force; Write-Output 'TIMEOUT: tests did not finish'; exit 1 }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
$dom = Get-Content -Raw $outFile
$m = [regex]::Match($dom, '<pre id="results">([\s\S]*?)</pre>')
if (-not $m.Success) { Write-Output 'NO RESULTS: the test page did not render results'; exit 1 }
$text = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
Write-Output $text
if ($text -match 'ALL PASSED') { exit 0 } else { exit 1 }
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: output starts with `LOAD ERROR` (the module `./harness.js` is missing) and the exit code is 1.

- [ ] **Step 5: Write the harness**

`tests/harness.js`:
```js
const tests = [];
const stack = [];

export function describe(name, fn) {
  stack.push(name);
  try { fn(); } finally { stack.pop(); }
}

export function it(name, fn) {
  tests.push({ name: [...stack, name].join(' > '), fn });
}

function fmt(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  }
  return v;
}

export function expect(actual) {
  const fail = (msg) => { throw new Error(msg); };
  return {
    toBe(e) { if (!Object.is(actual, e)) fail(`expected ${fmt(actual)} to be ${fmt(e)}`); },
    toEqual(e) {
      const a = JSON.stringify(stable(actual));
      const b = JSON.stringify(stable(e));
      if (a !== b) fail(`expected ${a} to equal ${b}`);
    },
    toBeTruthy() { if (!actual) fail(`expected ${fmt(actual)} to be truthy`); },
    toBeFalsy() { if (actual) fail(`expected ${fmt(actual)} to be falsy`); },
    toBeGreaterThan(n) { if (!(actual > n)) fail(`expected ${fmt(actual)} > ${n}`); },
    toBeGreaterThanOrEqual(n) { if (!(actual >= n)) fail(`expected ${fmt(actual)} >= ${n}`); },
    toBeLessThan(n) { if (!(actual < n)) fail(`expected ${fmt(actual)} < ${n}`); },
    toBeLessThanOrEqual(n) { if (!(actual <= n)) fail(`expected ${fmt(actual)} <= ${n}`); },
    toContain(x) {
      const ok = typeof actual === 'string' ? actual.includes(x) : Array.isArray(actual) && actual.includes(x);
      if (!ok) fail(`expected ${fmt(actual)} to contain ${fmt(x)}`);
    },
    toThrow() {
      let threw = false;
      try { actual(); } catch (e) { threw = true; }
      if (!threw) fail('expected function to throw');
    },
  };
}

export async function run(grep = '') {
  const out = document.getElementById('results');
  const lines = [];
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    if (grep && !t.name.includes(grep)) continue;
    try {
      await t.fn();
      passed++;
      lines.push(`PASS ${t.name}`);
    } catch (e) {
      failed++;
      lines.push(`FAIL ${t.name}\n    ${e && e.message ? e.message : e}`);
    }
  }
  lines.push('');
  lines.push(`${passed} passed, ${failed} failed`);
  if (failed === 0 && passed > 0) lines.push('ALL PASSED');
  out.textContent = lines.join('\n');
  document.title = failed === 0 && passed > 0 ? 'PASS' : 'FAIL';
  window.__results = { passed, failed };
  return { passed, failed };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: five `PASS harness > …` lines, then `5 passed, 0 failed` and `ALL PASSED`, with exit code 0.

- [ ] **Step 7: Commit**

```powershell
git add .gitattributes .gitignore README.md tests/harness.js tests/harness.test.js tests/index.html tests/all.js tests/run-tests.ps1
git commit -m "Add test harness and headless test runner`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Seeded randomness and grid helpers

**Files:**
- Create: `src/sim/rng.js`, `src/sim/grid.js`
- Test: `tests/sim/rng.test.js`, `tests/sim/grid.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Produces: `createRng(seed) → { next(): number in [0,1), int(n): integer in [0,n), range(a,b): number, chance(p): boolean, getState(): number, setState(n) }`; `hash2(x, y, seed) → number in [0,1)`; `valueNoise(x, y, seed, scale) → number in [0,1]`.
- Produces: `idx(size, x, y) → number`; `inBounds(size, x, y) → boolean`; `footprint(x, y, w, d) → Array<[x, y]>` (row by row); `ring(x, y, w, d) → Array<[x, y]>` (tiles edge-adjacent to the footprint, outside it, in a fixed order); `NEIGHBOURS4 = [[1,0],[-1,0],[0,1],[0,-1]]`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/rng.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createRng, hash2, valueNoise } from '../../src/sim/rng.js';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42), b = createRng(42);
    const sa = [a.next(), a.next(), a.next()];
    const sb = [b.next(), b.next(), b.next()];
    expect(sa).toEqual(sb);
  });
  it('produces different sequences for different seeds', () => {
    expect(createRng(1).next() === createRng(2).next()).toBe(false);
  });
  it('keeps next() within [0,1) and int(n) within [0,n)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
      expect(Number.isInteger(n)).toBe(true);
    }
  });
  it('resumes exactly from a saved state', () => {
    const r = createRng(99);
    r.next(); r.next();
    const saved = r.getState();
    const expected = [r.next(), r.next()];
    const r2 = createRng(0);
    r2.setState(saved);
    expect([r2.next(), r2.next()]).toEqual(expected);
  });
  it('hash2 is deterministic and within [0,1)', () => {
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5));
    for (let x = 0; x < 20; x++) {
      const v = hash2(x, x * 3, 11);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('valueNoise is within [0,1] and smooth between neighbours', () => {
    for (let x = 0; x < 30; x++) {
      const a = valueNoise(x, 10, 3, 8), b = valueNoise(x + 1, 10, 3, 8);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(Math.abs(a - b)).toBeLessThan(0.35);
    }
  });
});
```

`tests/sim/grid.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { idx, inBounds, footprint, ring, NEIGHBOURS4 } from '../../src/sim/grid.js';

describe('grid', () => {
  it('maps x,y to a row-major index', () => {
    expect(idx(64, 0, 0)).toBe(0);
    expect(idx(64, 3, 2)).toBe(131);
  });
  it('checks bounds', () => {
    expect(inBounds(64, 0, 0)).toBe(true);
    expect(inBounds(64, 63, 63)).toBe(true);
    expect(inBounds(64, -1, 0)).toBe(false);
    expect(inBounds(64, 0, 64)).toBe(false);
  });
  it('lists a footprint row by row', () => {
    expect(footprint(5, 6, 2, 2)).toEqual([[5, 6], [6, 6], [5, 7], [6, 7]]);
  });
  it('lists the tiles edge-adjacent to a footprint', () => {
    expect(ring(5, 5, 1, 1)).toEqual([[5, 4], [5, 6], [4, 5], [6, 5]]);
    expect(ring(5, 5, 2, 1).length).toBe(6);
  });
  it('exposes four neighbours', () => {
    expect(NEIGHBOURS4.length).toBe(4);
  });
});
```

Add to `tests/all.js` (the full file becomes):
```js
import './harness.test.js';
import './sim/rng.test.js';
import './sim/grid.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `LOAD ERROR` mentioning `rng.js` (module not found), exit code 1.

- [ ] **Step 3: Implement**

`src/sim/rng.js`:
```js
// Seeded randomness. The simulation must never use Math.random.
export function createRng(seed) {
  let s = seed >>> 0;
  const rng = {
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(rng.next() * n); },
    range(a, b) { return a + rng.next() * (b - a); },
    chance(p) { return rng.next() < p; },
    getState() { return s; },
    setState(v) { s = v >>> 0; },
  };
  return rng;
}

export function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function valueNoise(x, y, seed, scale) {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
```

`src/sim/grid.js`:
```js
export const NEIGHBOURS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const idx = (size, x, y) => y * size + x;

export const inBounds = (size, x, y) => x >= 0 && y >= 0 && x < size && y < size;

export function footprint(x, y, w, d) {
  const out = [];
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]);
  return out;
}

// Tiles sharing an edge with the footprint, outside it: top and bottom rows, then left and right columns.
export function ring(x, y, w, d) {
  const out = [];
  for (let i = 0; i < w; i++) { out.push([x + i, y - 1]); out.push([x + i, y + d]); }
  for (let j = 0; j < d; j++) { out.push([x - 1, y + j]); out.push([x + w, y + j]); }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: all `rng` and `grid` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/rng.js src/sim/grid.js tests/sim/rng.test.js tests/sim/grid.test.js tests/all.js
git commit -m "Add seeded RNG, noise and grid helpers`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Data tables and data checks

**Files:**
- Create: `src/data/economy.js`, `src/data/goods.js`, `src/data/housing.js`, `src/data/buildings.js`, `src/data/labour.js`, `src/data/mood.js`, `src/data/progression.js`
- Test: `tests/data/data.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Produces: `ECONOMY`, `GOODS`, `FOOD_GOODS`, `TIERS`, `MAX_TIER`, `LEAVE_CAP`, `DOWNGRADE_AFTER_MONTHS`, `BUILDINGS`, `PRIORITY_LEVELS`, `MIN_STAFF_RATIO`, `MOOD`, `MILESTONES`, with the exact shapes shown below. Building footprints use `w` (x extent) and `d` (y extent). The housing plot's building type is `'house'`.

- [ ] **Step 1: Write the failing data checks**

`tests/data/data.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { ECONOMY } from '../../src/data/economy.js';
import { GOODS, FOOD_GOODS } from '../../src/data/goods.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { PRIORITY_LEVELS } from '../../src/data/labour.js';
import { MILESTONES } from '../../src/data/progression.js';

describe('data', () => {
  it('never lets an upgrade lower capacity or tax per tile', () => {
    for (let t = 1; t < MAX_TIER; t++) {
      const a = TIERS[t], b = TIERS[t + 1];
      const capA = a.capacity / (a.size * a.size), capB = b.capacity / (b.size * b.size);
      const taxA = (a.capacity * a.tax) / (a.size * a.size), taxB = (b.capacity * b.tax) / (b.size * b.size);
      expect(capB).toBeGreaterThanOrEqual(capA);
      expect(taxB).toBeGreaterThanOrEqual(taxA);
    }
  });
  it('makes each tier need everything the tier below needs', () => {
    for (let t = 1; t < MAX_TIER; t++) {
      for (const need of TIERS[t].needs) expect(TIERS[t + 1].needs).toContain(need);
    }
  });
  it('only unlocks buildings that exist', () => {
    for (const m of MILESTONES) for (const type of m.unlocks) expect(Boolean(BUILDINGS[type])).toBe(true);
  });
  it('orders milestones by population', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].population).toBeGreaterThan(MILESTONES[i - 1].population);
    }
  });
  it('gives every building a valid footprint, cost and priority', () => {
    for (const [type, b] of Object.entries(BUILDINGS)) {
      expect(b.w).toBeGreaterThanOrEqual(1);
      expect(b.d).toBeGreaterThanOrEqual(1);
      expect(b.cost).toBeGreaterThan(0);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
  });
  it('only references goods that exist', () => {
    for (const b of Object.values(BUILDINGS)) {
      if (b.produces) expect(Boolean(GOODS[b.produces.good])).toBe(true);
      for (const g of b.stores || []) expect(Boolean(GOODS[g])).toBe(true);
      for (const g of b.sells || []) expect(Boolean(GOODS[g])).toBe(true);
    }
    expect(FOOD_GOODS).toContain('grain');
  });
  it('keeps economy constants sane', () => {
    expect(ECONOMY.startGold).toBe(2000);
    expect(ECONOMY.debtFloor).toBe(-500);
    expect(ECONOMY.workerShare).toBeGreaterThan(0);
    expect(ECONOMY.workerShare).toBeLessThan(1);
  });
});
```

Append to `tests/all.js`:
```js
import './data/data.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `LOAD ERROR` mentioning `economy.js`, exit code 1.

- [ ] **Step 3: Write the data files**

`src/data/economy.js`:
```js
export const ECONOMY = {
  startGold: 2000,
  roadCost: 2,
  wagePerWorker: 4,      // gold per employed worker per month
  debtFloor: -500,       // nothing new can be built once gold would drop below this
  demolishRefund: 0.25,  // share of cost refunded on demolish (roads and plots refund nothing)
  workerShare: 0.4,      // share of residents who work
};
```

`src/data/goods.js`:
```js
export const GOODS = {
  grain: { name: 'Grain', food: true, perResidentPerMonth: 0.25 },
};

export const FOOD_GOODS = Object.keys(GOODS).filter((k) => GOODS[k].food);
```

`src/data/housing.js`:
```js
// Index = tier. Tier 0 is an empty plot. Tiers 5–9 arrive in Stage 2.
// 'road' access is implied for every tier; needs lists the extra needs.
export const TIERS = [
  null,
  { tier: 1, name: 'Hut', size: 1, capacity: 5, tax: 1, needs: [] },
  { tier: 2, name: 'Shack', size: 1, capacity: 8, tax: 1, needs: ['water'] },
  { tier: 3, name: 'Cottage', size: 1, capacity: 12, tax: 2, needs: ['water', 'food'] },
  { tier: 4, name: 'House', size: 1, capacity: 16, tax: 2, needs: ['water', 'food', 'religion'] },
];

export const MAX_TIER = TIERS.length - 1;
export const LEAVE_CAP = 0.25;              // most of a house's residents that can leave in one month
export const DOWNGRADE_AFTER_MONTHS = 2;    // consecutive unmet months before a house drops a tier
```

`src/data/buildings.js`:
```js
// w = footprint along x, d = footprint along y. reach values are in road tiles.
export const BUILDINGS = {
  house: { name: 'Housing plot', w: 1, d: 1, cost: 5, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  well: { name: 'Well', w: 1, d: 1, cost: 30, upkeep: 3, workers: 0, category: 'services', needsRoad: true, provides: 'water', reach: 5 },
  farm_grain: {
    name: 'Grain farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 10, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'grain', perMonth: 30 }, producerReach: 12,
  },
  granary: {
    name: 'Granary', w: 2, d: 2, cost: 80, upkeep: 6, workers: 6, priority: 'essential', category: 'food',
    needsRoad: true, stores: ['grain'], capacity: 600,
  },
  bazaar: {
    name: 'Bazaar', w: 2, d: 2, cost: 60, upkeep: 8, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, sells: ['grain'], capacity: 300, reach: 10, supplyReach: 16,
  },
  temple: {
    name: 'Temple', w: 2, d: 2, cost: 120, upkeep: 10, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, provides: 'religion', reach: 10,
  },
};
```

`src/data/labour.js`:
```js
// Workers fill workplaces level by level, in this order (spec 4.8).
export const PRIORITY_LEVELS = ['essential', 'safety', 'services', 'industry', 'monuments'];
export const MIN_STAFF_RATIO = 0.25; // below this a workplace stops
```

`src/data/mood.js`:
```js
export const MOOD = {
  base: 60,
  fedWeight: 20,               // mood swing from 0% to 100% of food-needing residents fed: -20..+20
  unemploymentThreshold: 0.15,
  unemploymentWeight: 100,     // mood lost per 1.0 of unemployment above the threshold (from Town only)
  debtPerPoint: 25,            // gold of debt per mood point lost
  debtMax: 20,                 // most mood debt can cost
  arrivalsMin: 30,             // no arrivals below this mood
  departuresBelow: 30,         // people leave below this mood
  departureShare: 0.02,        // share of population leaving per month when mood is low
  arrivalBase: 30,             // spec 4.9 says 6 + 0.05×pop; raised so a new village fills in minutes, not hours
  arrivalPerPop: 0.08,
  arrivalMoodDivisor: 60,
  arrivalBatchesPerMonth: 3,   // arrivals are processed every 10 days
};
```

`src/data/progression.js`:
```js
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple'] },
  { id: 'town', name: 'Town', population: 150, unlocks: [] },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: all `data` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/data tests/data/data.test.js tests/all.js
git commit -m "Add Stage 1 data tables with data checks`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Terrain codes and map generation

**Files:**
- Create: `src/sim/terrain.js`, `src/sim/mapgen.js`
- Test: `tests/sim/mapgen.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `createRng`, `valueNoise` (Task 2), `idx` (Task 2).
- Produces: `T = { DESERT: 0, FERTILE: 1, ROCKY: 2, WATER: 3, BANK: 4, MEADOW: 5 }`; `TERRAIN_BY_NAME = { fertile: T.FERTILE, rocky: T.ROCKY }`.
- Produces: `generateMap(seed, size = 64) → { size, terrain: number[], tradeEntry: {x, y}, startRoad: Array<[x, y]>, focus: {x, y}, raiderEntries: Array<{x, y}> }`. `startRoad` runs from `tradeEntry` on the south edge northwards for 9 tiles.

- [ ] **Step 1: Write the failing tests**

`tests/sim/mapgen.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { generateMap } from '../../src/sim/mapgen.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

const count = (m, t) => m.terrain.filter((v) => v === t).length;

describe('mapgen', () => {
  it('is deterministic for a seed', () => {
    expect(generateMap(5).terrain).toEqual(generateMap(5).terrain);
  });
  it('differs between seeds', () => {
    expect(JSON.stringify(generateMap(5).terrain) === JSON.stringify(generateMap(6).terrain)).toBe(false);
  });
  it('builds a 64x64 grid by default', () => {
    expect(generateMap(1).terrain.length).toBe(64 * 64);
  });
  it('guarantees a river, fertile land and rocky ground for many seeds', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMap(seed);
      expect(count(m, T.WATER)).toBeGreaterThan(64);
      expect(count(m, T.FERTILE)).toBeGreaterThanOrEqual(200);
      expect(count(m, T.ROCKY)).toBeGreaterThanOrEqual(20);
    }
  });
  it('lays a buildable start road from the south edge', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMap(seed);
      expect(m.startRoad.length).toBe(9);
      expect(m.startRoad[0]).toEqual([m.tradeEntry.x, m.size - 1]);
      for (const [x, y] of m.startRoad) {
        const t = m.terrain[idx(m.size, x, y)];
        expect(t === T.WATER || t === T.ROCKY).toBe(false);
      }
    }
  });
  it('puts the focus point inside the map', () => {
    const m = generateMap(3);
    expect(m.focus.x).toBeGreaterThanOrEqual(0);
    expect(m.focus.x).toBeLessThan(64);
    expect(m.focus.y).toBeGreaterThanOrEqual(0);
    expect(m.focus.y).toBeLessThan(64);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/mapgen.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep mapgen`
Expected: `LOAD ERROR` mentioning `mapgen.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/terrain.js`:
```js
export const T = { DESERT: 0, FERTILE: 1, ROCKY: 2, WATER: 3, BANK: 4, MEADOW: 5 };

export const TERRAIN_BY_NAME = { fertile: T.FERTILE, rocky: T.ROCKY };
```

`src/sim/mapgen.js`:
```js
import { createRng, valueNoise } from './rng.js';
import { idx } from './grid.js';
import { T } from './terrain.js';

// A river meanders down the west side; fertile land lines its east bank;
// rocky patches sit in the east; a trade road enters from the south edge.
export function generateMap(seed, size = 64) {
  const rng = createRng(seed);
  const terrain = new Array(size * size).fill(T.DESERT);
  const phase = rng.range(0, Math.PI * 2);
  const riverX = (y) => 7 + 2.5 * Math.sin(y / 9 + phase) + 1.5 * Math.sin(y / 4.3 + phase * 2);

  for (let y = 0; y < size; y++) {
    const cx = riverX(y);
    for (let x = 0; x < size; x++) {
      const dist = Math.abs(x - cx);
      let t = T.DESERT;
      if (dist <= 1.6) t = T.WATER;
      else if (dist <= 2.6) t = T.BANK;
      else if (dist <= 7 + valueNoise(x, y, seed, 6) * 5) t = T.FERTILE;
      else if (valueNoise(x, y, seed + 17, 9) > 0.72) t = T.MEADOW;
      terrain[idx(size, x, y)] = t;
    }
  }

  const patches = 2 + rng.int(2);
  for (let p = 0; p < patches; p++) {
    const px = 34 + rng.int(size - 40), py = 6 + rng.int(size - 12), r = 3 + rng.int(2);
    for (let y = py - r - 1; y <= py + r + 1; y++) {
      for (let x = px - r - 1; x <= px + r + 1; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, 3) * 4) terrain[idx(size, x, y)] = T.ROCKY;
      }
    }
  }

  const ex = Math.round(riverX(size - 1)) + 14;
  const tradeEntry = { x: ex, y: size - 1 };
  const startRoad = [];
  for (let y = size - 1; y >= size - 9; y--) {
    startRoad.push([ex, y]);
    const i = idx(size, ex, y);
    if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) terrain[i] = T.DESERT;
  }
  const focus = { x: ex - 4, y: size - 12 };
  const raiderEntries = [{ x: size - 1, y: Math.floor(size / 2) }, { x: Math.floor(size / 2), y: 0 }];
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep mapgen`
Expected: all `mapgen` tests PASS, then `ALL PASSED`. If the fertile guarantee fails for a seed, widen the fertile band by changing `7 + valueNoise(...) * 5` to `8 + valueNoise(...) * 5`, then re-run.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/terrain.js src/sim/mapgen.js tests/sim/mapgen.test.js tests/all.js
git commit -m "Add seeded map generation with river, fertile land and trade road`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: World creation, building primitives and test world helper

**Files:**
- Create: `src/sim/world.js`, `tests/helpers/testWorld.js`
- Test: `tests/sim/world.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `generateMap` (Task 4), `ECONOMY`, `BUILDINGS` (Task 3), `idx`, `footprint` (Task 2), `T` (Task 4).
- Produces from `src/sim/world.js`:
  - `WORLD_VERSION = 1`
  - `createWorld({ seed = 1, size = 64, map = null }) → world` with the fields `version, seed, size, day, speed, gold, terrain, road, occ, buildings, nextId, mood, moodBreakdown, milestone, labour, alerts, undo, roadVersion, tradeEntry, raiderEntries, focus, stats`
  - `getBuilding(world, id)`, `buildingAt(world, x, y)`, `allBuildings(world)` (ascending id), `housesOf(world)`, `population(world)`
  - `makeBuilding(world, type, x, y) → building`, `insertBuilding(world, b) → b`, `removeBuilding(world, id) → b | null`
  - Building shape: `{ id, type, x, y, w, d, staff, paused, store, progress, blocked }`. Houses add `{ tier, residents, stock, met, downTimer, leftThisMonth }`.
- Produces from `tests/helpers/testWorld.js`: `makeTestWorld({ size = 32, fertile = [[0, 0, 8, 32]], gold = 100000 }) → world` (flat desert, fertile rectangles given as `[x, y, w, d]`, no roads), `setRoad(world, x0, y0, x1, y1)` (straight inclusive line; bumps `roadVersion`), `addRaw(world, type, x, y, extra = {}) → building` (inserts without checks or cost), `staffAll(world)` (sets every workplace's `staff` to its full `workers`).

- [ ] **Step 1: Write the failing tests**

`tests/sim/world.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createWorld, buildingAt, population, makeBuilding, insertBuilding, removeBuilding, allBuildings, WORLD_VERSION } from '../../src/sim/world.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('world', () => {
  it('creates a world from a seed with the start road laid', () => {
    const w = createWorld({ seed: 4 });
    expect(w.version).toBe(WORLD_VERSION);
    expect(w.size).toBe(64);
    expect(w.gold).toBe(2000);
    expect(w.day).toBe(0);
    expect(w.speed).toBe(0);
    const [x, y] = [w.tradeEntry.x, w.tradeEntry.y];
    expect(w.road[idx(64, x, y)]).toBe(1);
  });
  it('inserts and removes buildings and tracks occupancy', () => {
    const w = makeTestWorld();
    const b = insertBuilding(w, makeBuilding(w, 'granary', 10, 10));
    expect(buildingAt(w, 11, 11).id).toBe(b.id);
    expect(allBuildings(w).length).toBe(1);
    removeBuilding(w, b.id);
    expect(buildingAt(w, 11, 11)).toBe(null);
  });
  it('gives houses residents and counts population', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 3, 3, { tier: 1, residents: 5 });
    addRaw(w, 'house', 4, 3, { tier: 2, residents: 7 });
    expect(population(w)).toBe(12);
  });
  it('lays straight roads in the test helper', () => {
    const w = makeTestWorld();
    setRoad(w, 2, 5, 6, 5);
    expect(w.road[idx(w.size, 4, 5)]).toBe(1);
    expect(w.roadVersion).toBe(1);
  });
  it('is JSON-safe', () => {
    const w = createWorld({ seed: 2 });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/world.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep world`
Expected: `LOAD ERROR` mentioning `world.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/world.js`:
```js
import { ECONOMY } from '../data/economy.js';
import { BUILDINGS } from '../data/buildings.js';
import { generateMap } from './mapgen.js';
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 1;

export function createWorld({ seed = 1, size = 64, map = null } = {}) {
  const m = map || generateMap(seed, size);
  const n = m.size * m.size;
  const world = {
    version: WORLD_VERSION,
    seed,
    size: m.size,
    day: 0,
    speed: 0,
    gold: ECONOMY.startGold,
    terrain: m.terrain.slice(),
    road: new Array(n).fill(0),
    occ: new Array(n).fill(0),
    buildings: {},
    nextId: 1,
    mood: 60,
    moodBreakdown: {},
    milestone: 'village',
    labour: { workforce: 0, employed: 0, jobs: 0, shortLevels: [] },
    alerts: [],
    undo: [],
    roadVersion: 0,
    tradeEntry: { ...m.tradeEntry },
    raiderEntries: m.raiderEntries.map((e) => ({ ...e })),
    focus: { ...m.focus },
    stats: { lastMonth: null },
  };
  for (const [x, y] of m.startRoad) world.road[idx(world.size, x, y)] = 1;
  return world;
}

export const getBuilding = (world, id) => world.buildings[id] || null;

export function buildingAt(world, x, y) {
  const id = world.occ[idx(world.size, x, y)];
  return id ? world.buildings[id] : null;
}

// Integer-like keys iterate in ascending numeric order, so this is ascending id order.
export const allBuildings = (world) => Object.values(world.buildings);

export const housesOf = (world) => allBuildings(world).filter((b) => b.type === 'house');

export function population(world) {
  let p = 0;
  for (const h of housesOf(world)) p += h.residents;
  return p;
}

export function makeBuilding(world, type, x, y) {
  const def = BUILDINGS[type];
  const b = { id: world.nextId++, type, x, y, w: def.w, d: def.d, staff: 0, paused: false, store: {}, progress: 0, blocked: null };
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0 });
  return b;
}

export function insertBuilding(world, b) {
  world.buildings[b.id] = b;
  for (const [x, y] of footprint(b.x, b.y, b.w, b.d)) world.occ[idx(world.size, x, y)] = b.id;
  return b;
}

export function removeBuilding(world, id) {
  const b = world.buildings[id];
  if (!b) return null;
  for (const [x, y] of footprint(b.x, b.y, b.w, b.d)) world.occ[idx(world.size, x, y)] = 0;
  delete world.buildings[id];
  return b;
}
```

`tests/helpers/testWorld.js`:
```js
import { createWorld, makeBuilding, insertBuilding, allBuildings } from '../../src/sim/world.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

export function makeTestWorld({ size = 32, fertile = [[0, 0, 8, 32]], gold = 100000 } = {}) {
  const terrain = new Array(size * size).fill(T.DESERT);
  for (const [fx, fy, fw, fd] of fertile) {
    for (let y = fy; y < fy + fd; y++) for (let x = fx; x < fx + fw; x++) terrain[idx(size, x, y)] = T.FERTILE;
  }
  const map = { size, terrain, tradeEntry: { x: size - 1, y: size - 1 }, startRoad: [], focus: { x: size >> 1, y: size >> 1 }, raiderEntries: [] };
  const world = createWorld({ seed: 1, size, map });
  world.gold = gold;
  return world;
}

export function setRoad(world, x0, y0, x1, y1) {
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  for (;;) {
    world.road[idx(world.size, x, y)] = 1;
    if (x === x1 && y === y1) break;
    x += dx; y += dy;
  }
  world.roadVersion++;
}

export function addRaw(world, type, x, y, extra = {}) {
  const b = makeBuilding(world, type, x, y);
  Object.assign(b, extra);
  return insertBuilding(world, b);
}

export function staffAll(world) {
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep world`
Expected: all `world` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/world.js tests/helpers/testWorld.js tests/sim/world.test.js tests/all.js
git commit -m "Add world model, building primitives and test world helper`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Reach along roads

**Files:**
- Create: `src/sim/reach.js`
- Test: `tests/sim/reach.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `ring`, `idx`, `inBounds`, `NEIGHBOURS4` (Task 2); world fields `road`, `size`, `roadVersion`, `buildings` (Task 5).
- Produces (all take any object with `x, y, w, d`, so a not-yet-placed "probe" works too):
  - `adjacentRoadTiles(world, b) → number[]` (tile indices)
  - `touchesRoad(world, b) → boolean`
  - `roadReach(world, b, maxDist) → Map<tileIndex, dist>`: BFS over road tiles. Road tiles next to `b` have distance 1. Only tiles with distance ≤ `maxDist` are included. Results are cached per world until `roadVersion` changes.
  - `reachDistance(reachMap, world, target) → number`: the smallest distance among `target`'s adjacent road tiles, or `Infinity`.
  - `buildingsInReach(world, b, maxDist, filter?) → Array<{ b, dist }>`: excludes `b` itself (matched by `id`), sorted by `dist` then `id`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/reach.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { touchesRoad, roadReach, buildingsInReach, adjacentRoadTiles } from '../../src/sim/reach.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('reach', () => {
  it('knows whether a building touches a road', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 20, 4);
    expect(touchesRoad(w, { x: 5, y: 5, w: 1, d: 1 })).toBe(true);
    expect(touchesRoad(w, { x: 5, y: 7, w: 1, d: 1 })).toBe(false);
    expect(adjacentRoadTiles(w, { x: 5, y: 5, w: 1, d: 1 })).toEqual([idx(w.size, 5, 4)]);
  });
  it('measures distance along connected roads only', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 20, 4);
    setRoad(w, 0, 20, 20, 20);
    const well = addRaw(w, 'well', 5, 5);
    const r = roadReach(w, well, 5);
    expect(r.get(idx(w.size, 5, 4))).toBe(1);
    expect(r.get(idx(w.size, 9, 4))).toBe(5);
    expect(r.has(idx(w.size, 10, 4))).toBe(false);
    expect(r.has(idx(w.size, 5, 20))).toBe(false);
  });
  it('lists buildings in reach nearest first, excluding itself', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 25, 4);
    const bz = addRaw(w, 'bazaar', 2, 5);
    const near = addRaw(w, 'granary', 8, 5);
    const far = addRaw(w, 'granary', 14, 5);
    addRaw(w, 'granary', 22, 5);
    const found = buildingsInReach(w, bz, 16, (o) => o.type === 'granary');
    expect(found.map((f) => f.b.id)).toEqual([near.id, far.id]);
    expect(found[0].dist).toBeLessThan(found[1].dist);
  });
  it('recomputes after roads change', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 4, 5, 4);
    const well = addRaw(w, 'well', 1, 5);
    expect(roadReach(w, well, 10).has(idx(w.size, 7, 4))).toBe(false);
    setRoad(w, 6, 4, 8, 4);
    expect(roadReach(w, well, 10).has(idx(w.size, 7, 4))).toBe(true);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/reach.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep reach`
Expected: `LOAD ERROR` mentioning `reach.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/reach.js`:
```js
import { ring, idx, inBounds, NEIGHBOURS4 } from './grid.js';

const cache = new WeakMap(); // world -> { version, map }; kept outside the world so saves stay pure data

export function adjacentRoadTiles(world, b) {
  const out = [];
  for (const [x, y] of ring(b.x, b.y, b.w, b.d)) {
    if (!inBounds(world.size, x, y)) continue;
    const i = idx(world.size, x, y);
    if (world.road[i]) out.push(i);
  }
  return out;
}

export const touchesRoad = (world, b) => adjacentRoadTiles(world, b).length > 0;

export function roadReach(world, b, maxDist) {
  let c = cache.get(world);
  if (!c || c.version !== world.roadVersion) {
    c = { version: world.roadVersion, map: new Map() };
    cache.set(world, c);
  }
  const key = `${b.x},${b.y},${b.w},${b.d},${maxDist}`;
  if (c.map.has(key)) return c.map.get(key);
  const dist = new Map();
  const queue = [];
  for (const t of adjacentRoadTiles(world, b)) {
    if (!dist.has(t)) { dist.set(t, 1); queue.push(t); }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    const d = dist.get(t);
    if (d >= maxDist) continue;
    const x = t % world.size, y = (t - x) / world.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const nt = idx(world.size, nx, ny);
      if (world.road[nt] && !dist.has(nt)) { dist.set(nt, d + 1); queue.push(nt); }
    }
  }
  c.map.set(key, dist);
  return dist;
}

export function reachDistance(reachMap, world, target) {
  let best = Infinity;
  for (const t of adjacentRoadTiles(world, target)) {
    const d = reachMap.get(t);
    if (d !== undefined && d < best) best = d;
  }
  return best;
}

export function buildingsInReach(world, b, maxDist, filter) {
  const rm = roadReach(world, b, maxDist);
  const out = [];
  for (const o of Object.values(world.buildings)) {
    if (o.id === b.id) continue;
    if (filter && !filter(o)) continue;
    const d = reachDistance(rm, world, o);
    if (d <= maxDist) out.push({ b: o, dist: d });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep reach`
Expected: all `reach` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/reach.js tests/sim/reach.test.js tests/all.js
git commit -m "Add road reach with cached BFS`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Milestones, unlocks and money helpers

**Files:**
- Create: `src/sim/progression.js`, `src/sim/money.js`
- Test: `tests/sim/progression.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `MILESTONES`, `ECONOMY` (Task 3), `population` (Task 5).
- Produces: `milestoneIndex(id) → number`, `updateMilestone(world) → boolean` (true when it changed; it never goes backwards), `isUnlocked(world, type) → boolean`, `atLeast(world, milestoneId) → boolean`.
- Produces: `canAfford(world, cost) → boolean` (true when `gold - cost >= ECONOMY.debtFloor`), `spend(world, amount)`, `refund(world, amount)`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/progression.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { updateMilestone, isUnlocked, atLeast } from '../../src/sim/progression.js';
import { canAfford, spend, refund } from '../../src/sim/money.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

describe('progression', () => {
  it('starts as a Village with Stage 1 buildings unlocked', () => {
    const w = makeTestWorld();
    expect(w.milestone).toBe('village');
    expect(isUnlocked(w, 'temple')).toBe(true);
    expect(isUnlocked(w, 'nonexistent')).toBe(false);
  });
  it('becomes a Town at 150 people and never goes back', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 1, 1, { tier: 4, residents: 150 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('town');
    expect(atLeast(w, 'town')).toBe(true);
    h.residents = 10;
    expect(updateMilestone(w)).toBe(false);
    expect(w.milestone).toBe('town');
  });
});

describe('money', () => {
  it('allows spending down to the debt floor and no further', () => {
    const w = makeTestWorld({ gold: 100 });
    expect(canAfford(w, 600)).toBe(true);
    expect(canAfford(w, 601)).toBe(false);
    spend(w, 50);
    expect(w.gold).toBe(50);
    refund(w, 25);
    expect(w.gold).toBe(75);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/progression.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep progression`
Expected: `LOAD ERROR` mentioning `progression.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/progression.js`:
```js
import { MILESTONES } from '../data/progression.js';
import { population } from './world.js';

export const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);

export function updateMilestone(world) {
  const pop = population(world);
  let i = milestoneIndex(world.milestone);
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  world.milestone = MILESTONES[i].id;
  return changed;
}

export function isUnlocked(world, type) {
  const cur = milestoneIndex(world.milestone);
  for (let i = 0; i <= cur; i++) if (MILESTONES[i].unlocks.includes(type)) return true;
  return false;
}

export const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
```

`src/sim/money.js`:
```js
import { ECONOMY } from '../data/economy.js';

export const canAfford = (world, cost) => world.gold - cost >= ECONOMY.debtFloor;

export function spend(world, amount) { world.gold -= amount; }

export function refund(world, amount) { world.gold += amount; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep progression`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep money`
Expected: each prints only PASS lines and `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/progression.js src/sim/money.js tests/sim/progression.test.js tests/all.js
git commit -m "Add milestones, unlock checks and money helpers`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Undo history

**Files:**
- Create: `src/sim/undo.js`
- Test: `tests/sim/undo.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `insertBuilding`, `removeBuilding` (Task 5), `spend`, `refund` (Task 7).
- Produces: `UNDO_LIMIT = 10`, `pushUndo(world, entry)`, `undo(world) → { ok: true, kind } | { ok: false, reason: 'nothing_to_undo' }`, `clearUndo(world)`.
- Undo entry shapes (commands in Tasks 9–10 create these):
  - `{ kind: 'place', ids: number[], cost }`: undo removes the buildings and refunds `cost`.
  - `{ kind: 'road', tiles: number[], cost }`: undo removes the road tiles and refunds `cost`.
  - `{ kind: 'demolish', buildings: object[] /* JSON snapshots */, roads: number[], refund }`: undo restores the buildings exactly, restores the roads, and takes `refund` back.

- [ ] **Step 1: Write the failing tests**

`tests/sim/undo.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { pushUndo, undo, clearUndo, UNDO_LIMIT } from '../../src/sim/undo.js';
import { buildingAt } from '../../src/sim/world.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

describe('undo', () => {
  it('reports when there is nothing to undo', () => {
    expect(undo(makeTestWorld()).reason).toBe('nothing_to_undo');
  });
  it('undoes a placement with a full refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const b = addRaw(w, 'well', 3, 3);
    w.gold -= 30;
    pushUndo(w, { kind: 'place', ids: [b.id], cost: 30 });
    expect(undo(w).ok).toBe(true);
    expect(buildingAt(w, 3, 3)).toBe(null);
    expect(w.gold).toBe(1000);
  });
  it('undoes roads with a refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const t = idx(w.size, 4, 4);
    w.road[t] = 1; w.gold -= 2;
    pushUndo(w, { kind: 'road', tiles: [t], cost: 2 });
    undo(w);
    expect(w.road[t]).toBe(0);
    expect(w.gold).toBe(1000);
  });
  it('restores demolished buildings exactly and takes back the refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const h = addRaw(w, 'house', 6, 6, { tier: 3, residents: 9, stock: { grain: 2 } });
    const snap = JSON.parse(JSON.stringify(h));
    delete w.buildings[h.id];
    w.occ[idx(w.size, 6, 6)] = 0;
    w.gold += 15;
    pushUndo(w, { kind: 'demolish', buildings: [snap], roads: [], refund: 15 });
    undo(w);
    expect(buildingAt(w, 6, 6)).toEqual(snap);
    expect(w.gold).toBe(1000);
  });
  it('keeps only the last 10 actions and can be cleared', () => {
    const w = makeTestWorld();
    for (let i = 0; i < 12; i++) pushUndo(w, { kind: 'road', tiles: [], cost: 0 });
    expect(w.undo.length).toBe(UNDO_LIMIT);
    clearUndo(w);
    expect(w.undo.length).toBe(0);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/undo.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep undo`
Expected: `LOAD ERROR` mentioning `undo.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/undo.js`:
```js
import { insertBuilding, removeBuilding } from './world.js';
import { spend, refund } from './money.js';

export const UNDO_LIMIT = 10;

export function pushUndo(world, entry) {
  world.undo.push(entry);
  if (world.undo.length > UNDO_LIMIT) world.undo.shift();
}

export function clearUndo(world) { world.undo = []; }

export function undo(world) {
  const e = world.undo.pop();
  if (!e) return { ok: false, reason: 'nothing_to_undo' };
  if (e.kind === 'place') {
    for (const id of e.ids) removeBuilding(world, id);
    refund(world, e.cost);
  } else if (e.kind === 'road') {
    for (const t of e.tiles) world.road[t] = 0;
    world.roadVersion++;
    refund(world, e.cost);
  } else if (e.kind === 'demolish') {
    for (const snap of e.buildings) insertBuilding(world, JSON.parse(JSON.stringify(snap)));
    for (const t of e.roads) world.road[t] = 1;
    if (e.roads.length) world.roadVersion++;
    spend(world, e.refund);
  }
  return { ok: true, kind: e.kind };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep undo`
Expected: all `undo` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/undo.js tests/sim/undo.test.js tests/all.js
git commit -m "Add 10-step undo with full refunds`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Placement, demolition, pause and speed commands

**Files:**
- Create: `src/sim/commands.js`
- Test: `tests/sim/commands.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `ECONOMY` (Task 3), `footprint`, `idx`, `inBounds` (Task 2), `T`, `TERRAIN_BY_NAME` (Task 4), `makeBuilding`, `insertBuilding`, `removeBuilding`, `buildingAt` (Task 5), `touchesRoad`, `buildingsInReach` (Task 6), `canAfford`, `spend`, `refund` (Task 7), `isUnlocked` (Task 7), `pushUndo` (Task 8).
- Produces (every result has the shape `{ ok, reason?, warnings: string[], ... }`):
  - `checkTiles(world, type, x, y) → reason string | null`: lock, bounds, water, occupied (by a building or a road), terrain and road-adjacency checks; no gold check.
  - `canPlace(world, type, x, y) → { ok, reason?, warnings }`
  - `place(world, type, x, y) → { ok, reason?, id?, warnings }`
  - `demolishAt(world, x, y) → { ok, reason?, refund, warnings }`
  - `setPaused(world, id, paused) → { ok, reason?, warnings }`
  - `setSpeed(world, speed) → { ok, reason?, warnings }` (speed is 0, 1, 2 or 3)
- Reason codes: `'unknown'`, `'locked'`, `'out_of_bounds'`, `'water'`, `'occupied'`, `'needs_fertile'`, `'needs_road'`, `'no_gold'`, `'nothing_here'`, `'bad_speed'`.
- Warning codes: `'needs_road'` (house plots, which may be placed without a road), `'no_storage'` (a producer with no matching storage in reach), `'no_supply'` (a bazaar with no matching storage in reach).

- [ ] **Step 1: Write the failing tests**

`tests/sim/commands.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { canPlace, place, demolishAt, setPaused, setSpeed } from '../../src/sim/commands.js';
import { buildingAt } from '../../src/sim/world.js';
import { undo } from '../../src/sim/undo.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

describe('commands: place', () => {
  it('places a building, charges for it and records undo', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const r = place(w, 'temple', 12, 8);
    expect(r.ok).toBe(true);
    expect(buildingAt(w, 13, 9).id).toBe(r.id);
    expect(w.gold).toBe(880);
    expect(w.undo.length).toBe(1);
  });
  it('refuses overlapping, off-map, water and roadless placements with reasons', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    expect(canPlace(w, 'well', 13, 9).reason).toBe('occupied');
    expect(canPlace(w, 'well', 5, 10).reason).toBe('occupied');
    expect(canPlace(w, 'temple', 31, 9).reason).toBe('out_of_bounds');
    expect(canPlace(w, 'well', 20, 20).reason).toBe('needs_road');
    w.terrain[idx(w.size, 20, 11)] = 3;
    expect(canPlace(w, 'well', 20, 11).reason).toBe('water');
  });
  it('requires fertile land for farms', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'farm_grain', 2, 8).ok).toBe(true);
    expect(canPlace(w, 'farm_grain', 12, 8).reason).toBe('needs_fertile');
  });
  it('refuses when the debt floor would be crossed', () => {
    const w = makeTestWorld({ gold: -450 });
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'temple', 12, 8).reason).toBe('no_gold');
  });
  it('lets house plots go down without a road, with a warning', () => {
    const w = makeTestWorld();
    const r = canPlace(w, 'house', 20, 20);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('needs_road');
  });
  it('warns about missing storage and supply', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'farm_grain', 2, 8).warnings).toContain('no_storage');
    expect(canPlace(w, 'bazaar', 14, 8).warnings).toContain('no_supply');
    place(w, 'granary', 5, 8);
    expect(canPlace(w, 'farm_grain', 2, 8).warnings).toEqual([]);
  });
  it('refuses locked buildings', () => {
    const w = makeTestWorld();
    w.milestone = 'nowhere';
    expect(canPlace(w, 'well', 1, 1).reason).toBe('locked');
  });
});

describe('commands: demolish, pause, speed', () => {
  it('demolishes with a 25% refund and undo restores it', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    const r = demolishAt(w, 12, 8);
    expect(r.ok).toBe(true);
    expect(r.refund).toBe(30);
    expect(w.gold).toBe(910);
    undo(w);
    expect(buildingAt(w, 12, 8).type).toBe('temple');
    expect(w.gold).toBe(880);
  });
  it('demolishes roads for free and reports empty tiles', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(demolishAt(w, 3, 10).refund).toBe(0);
    expect(w.road[idx(w.size, 3, 10)]).toBe(0);
    expect(demolishAt(w, 3, 3).reason).toBe('nothing_here');
  });
  it('pauses buildings and sets speed', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const { id } = place(w, 'temple', 12, 8);
    w.buildings[id].staff = 6;
    setPaused(w, id, true);
    expect(w.buildings[id].paused).toBe(true);
    expect(w.buildings[id].staff).toBe(0);
    expect(setSpeed(w, 3).ok).toBe(true);
    expect(w.speed).toBe(3);
    expect(setSpeed(w, 5).reason).toBe('bad_speed');
  });
});
```

Append to `tests/all.js`:
```js
import './sim/commands.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep commands`
Expected: `LOAD ERROR` mentioning `commands.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/commands.js`:
```js
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { footprint, idx, inBounds } from './grid.js';
import { T, TERRAIN_BY_NAME } from './terrain.js';
import { makeBuilding, insertBuilding, removeBuilding, buildingAt } from './world.js';
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const storesAny = (o, goods) => (BUILDINGS[o.type].stores || []).some((g) => goods.includes(g));

export function checkTiles(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return 'unknown';
  if (!isUnlocked(world, type)) return 'locked';
  for (const [tx, ty] of footprint(x, y, def.w, def.d)) {
    if (!inBounds(world.size, tx, ty)) return 'out_of_bounds';
    const i = idx(world.size, tx, ty);
    if (world.terrain[i] === T.WATER) return 'water';
    if (world.occ[i] || world.road[i]) return 'occupied';
    if (def.terrain && world.terrain[i] !== TERRAIN_BY_NAME[def.terrain]) return 'needs_' + def.terrain;
  }
  if (def.needsRoad && !touchesRoad(world, { x, y, w: def.w, d: def.d })) return 'needs_road';
  return null;
}

function placementWarnings(world, type, x, y) {
  const def = BUILDINGS[type];
  const probe = { id: -1, x, y, w: def.w, d: def.d };
  const warnings = [];
  if (!def.needsRoad && !touchesRoad(world, probe)) warnings.push('needs_road');
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => storesAny(o, [def.produces.good])).length) {
    warnings.push('no_storage');
  }
  if (def.sells && !buildingsInReach(world, probe, def.supplyReach, (o) => storesAny(o, def.sells)).length) {
    warnings.push('no_supply');
  }
  return warnings;
}

export function canPlace(world, type, x, y) {
  const reason = checkTiles(world, type, x, y);
  if (reason) return fail(reason);
  if (!canAfford(world, BUILDINGS[type].cost)) return fail('no_gold');
  return { ok: true, warnings: placementWarnings(world, type, x, y) };
}

export function place(world, type, x, y) {
  const check = canPlace(world, type, x, y);
  if (!check.ok) return check;
  const cost = BUILDINGS[type].cost;
  const b = insertBuilding(world, makeBuilding(world, type, x, y));
  spend(world, cost);
  pushUndo(world, { kind: 'place', ids: [b.id], cost });
  return { ok: true, id: b.id, warnings: check.warnings };
}

export const demolishRefundFor = (b) => (b.type === 'house' ? 0 : Math.floor(BUILDINGS[b.type].cost * ECONOMY.demolishRefund));

export function demolishAt(world, x, y) {
  if (!inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    const amount = demolishRefundFor(b);
    refund(world, amount);
    pushUndo(world, { kind: 'demolish', buildings: [snap], roads: [], refund: amount });
    return { ok: true, refund: amount, warnings: [] };
  }
  const i = idx(world.size, x, y);
  if (world.road[i]) {
    world.road[i] = 0;
    world.roadVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [i], refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
  return fail('nothing_here', { refund: 0 });
}

export function setPaused(world, id, paused) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  b.paused = Boolean(paused);
  if (b.paused) b.staff = 0;
  return { ok: true, warnings: [] };
}

export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep commands`
Expected: all `commands` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/commands.js tests/sim/commands.test.js tests/all.js
git commit -m "Add placement, demolition, pause and speed commands`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Road drawing and area painting commands

**Files:**
- Modify: `src/sim/commands.js` (append the functions below; the existing imports already cover them)
- Test: `tests/sim/areaCommands.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: everything `commands.js` already imports, plus `checkTiles` and `demolishRefundFor` from Task 9.
- Produces:
  - `roadPath(x0, y0, x1, y1, flip = false) → Array<[x, y]>`: an L-shaped path, horizontal first (or vertical first when `flip`), with no duplicate tiles.
  - `previewRoad(world, x0, y0, x1, y1, flip = false) → { ok, reason?, warnings, tiles: number[] /* new road tile indices only */, cost }`
  - `drawRoad(world, x0, y0, x1, y1, flip = false) → same shape as preview`. It applies the road, charges for it and records a `road` undo entry, unless the path adds no new tiles.
  - `rectTiles(x0, y0, x1, y1) → Array<[x, y]>`: normalises the corners and lists tiles row by row.
  - `previewHouses(world, x0, y0, x1, y1) → { ok, reason?, warnings, positions: Array<[x, y]>, cost }`
  - `paintHouses(world, x0, y0, x1, y1) → { ok, reason?, warnings, ids: number[], cost }`: places a plot on every valid tile in the rectangle, with one `place` undo entry.
  - `previewDemolishArea(world, x0, y0, x1, y1) → { buildingIds: number[], roadTiles: number[], refund }`
  - `demolishArea(world, x0, y0, x1, y1) → { ok, reason?, warnings, count, refund }`: one `demolish` undo entry.
- New reason codes: `'blocked'` (a building sits on the road path), `'nothing_to_place'`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/areaCommands.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { roadPath, previewRoad, drawRoad, previewHouses, paintHouses, previewDemolishArea, demolishArea, place } from '../../src/sim/commands.js';
import { buildingAt, housesOf } from '../../src/sim/world.js';
import { undo } from '../../src/sim/undo.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

describe('commands: roads', () => {
  it('builds an L-shaped path without duplicates', () => {
    expect(roadPath(0, 0, 2, 2)).toEqual([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]);
    expect(roadPath(0, 0, 2, 2, true)).toEqual([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]);
    expect(roadPath(3, 3, 3, 3)).toEqual([[3, 3]]);
  });
  it('previews cost for new tiles only', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 5, 3, 5);
    const p = previewRoad(w, 0, 5, 6, 5);
    expect(p.ok).toBe(true);
    expect(p.tiles.length).toBe(3);
    expect(p.cost).toBe(6);
  });
  it('draws, charges and undoes', () => {
    const w = makeTestWorld({ gold: 100 });
    const r = drawRoad(w, 0, 5, 9, 5);
    expect(r.ok).toBe(true);
    expect(w.gold).toBe(80);
    expect(w.road[idx(w.size, 9, 5)]).toBe(1);
    undo(w);
    expect(w.road[idx(w.size, 9, 5)]).toBe(0);
    expect(w.gold).toBe(100);
  });
  it('refuses paths through buildings or water', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    expect(previewRoad(w, 10, 9, 15, 9).reason).toBe('blocked');
    w.terrain[idx(w.size, 20, 20)] = 3;
    expect(previewRoad(w, 18, 20, 22, 20).reason).toBe('water');
  });
});

describe('commands: area painting', () => {
  it('paints plots on free tiles only, charging once with one undo', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const pv = previewHouses(w, 10, 9, 14, 11);
    expect(pv.positions.length).toBe(10);
    expect(pv.cost).toBe(50);
    const r = paintHouses(w, 14, 11, 10, 9);
    expect(r.ids.length).toBe(10);
    expect(w.gold).toBe(950);
    expect(w.undo.length).toBe(1);
    undo(w);
    expect(housesOf(w).length).toBe(0);
    expect(w.gold).toBe(1000);
  });
  it('reports nothing to place', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(paintHouses(w, 0, 10, 5, 10).reason).toBe('nothing_to_place');
  });
  it('demolishes an area with one undo that restores everything', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    paintHouses(w, 12, 11, 13, 11);
    const pv = previewDemolishArea(w, 12, 9, 13, 11);
    expect(pv.buildingIds.length).toBe(3);
    expect(pv.roadTiles.length).toBe(2);
    expect(pv.refund).toBe(30);
    const goldBefore = w.gold;
    const r = demolishArea(w, 12, 9, 13, 11);
    expect(r.count).toBe(5);
    expect(w.gold).toBe(goldBefore + 30);
    undo(w);
    expect(buildingAt(w, 12, 8).type).toBe('temple');
    expect(w.road[idx(w.size, 12, 10)]).toBe(1);
    expect(w.gold).toBe(goldBefore);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/areaCommands.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "commands:"`
Expected: `LOAD ERROR` (the named exports `roadPath` and the others don't exist yet), exit code 1.

- [ ] **Step 3: Implement (append to `src/sim/commands.js`)**

```js
function lineInto(ax, ay, bx, by, out) {
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  let x = ax, y = ay;
  for (;;) {
    if (!out.some((p) => p[0] === x && p[1] === y)) out.push([x, y]);
    if (x === bx && y === by) break;
    x += dx; y += dy;
  }
}

export function roadPath(x0, y0, x1, y1, flip = false) {
  const out = [];
  if (!flip) { lineInto(x0, y0, x1, y0, out); lineInto(x1, y0, x1, y1, out); }
  else { lineInto(x0, y0, x0, y1, out); lineInto(x0, y1, x1, y1, out); }
  return out;
}

export function previewRoad(world, x0, y0, x1, y1, flip = false) {
  const tiles = [];
  for (const [x, y] of roadPath(x0, y0, x1, y1, flip)) {
    if (!inBounds(world.size, x, y)) return fail('out_of_bounds', { tiles: [], cost: 0 });
    const i = idx(world.size, x, y);
    if (world.terrain[i] === T.WATER) return fail('water', { tiles: [], cost: 0 });
    if (world.occ[i]) return fail('blocked', { tiles: [], cost: 0 });
    if (!world.road[i]) tiles.push(i);
  }
  const cost = tiles.length * ECONOMY.roadCost;
  if (!canAfford(world, cost)) return fail('no_gold', { tiles, cost });
  return { ok: true, warnings: [], tiles, cost };
}

export function drawRoad(world, x0, y0, x1, y1, flip = false) {
  const p = previewRoad(world, x0, y0, x1, y1, flip);
  if (!p.ok || p.tiles.length === 0) return p;
  for (const t of p.tiles) world.road[t] = 1;
  world.roadVersion++;
  spend(world, p.cost);
  pushUndo(world, { kind: 'road', tiles: p.tiles.slice(), cost: p.cost });
  return p;
}

export function rectTiles(x0, y0, x1, y1) {
  const out = [];
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) out.push([x, y]);
  return out;
}

export function previewHouses(world, x0, y0, x1, y1) {
  const positions = rectTiles(x0, y0, x1, y1).filter(([x, y]) => checkTiles(world, 'house', x, y) === null);
  const cost = positions.length * BUILDINGS.house.cost;
  if (!positions.length) return fail('nothing_to_place', { positions, cost: 0 });
  if (!canAfford(world, cost)) return fail('no_gold', { positions, cost });
  return { ok: true, warnings: [], positions, cost };
}

export function paintHouses(world, x0, y0, x1, y1) {
  const p = previewHouses(world, x0, y0, x1, y1);
  if (!p.ok) return { ...p, ids: [] };
  const ids = p.positions.map(([x, y]) => insertBuilding(world, makeBuilding(world, 'house', x, y)).id);
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: p.cost });
  return { ok: true, warnings: [], ids, cost: p.cost };
}

export function previewDemolishArea(world, x0, y0, x1, y1) {
  const buildingIds = [];
  const roadTiles = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1)) {
    if (!inBounds(world.size, x, y)) continue;
    const i = idx(world.size, x, y);
    if (world.occ[i] && !buildingIds.includes(world.occ[i])) buildingIds.push(world.occ[i]);
    if (world.road[i]) roadTiles.push(i);
  }
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world.buildings[id]), 0);
  return { buildingIds, roadTiles, refund: refundTotal };
}

export function demolishArea(world, x0, y0, x1, y1) {
  const p = previewDemolishArea(world, x0, y0, x1, y1);
  const count = p.buildingIds.length + p.roadTiles.length;
  if (!count) return fail('nothing_here', { count: 0, refund: 0 });
  const snaps = p.buildingIds.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of p.buildingIds) removeBuilding(world, id);
  for (const t of p.roadTiles) world.road[t] = 0;
  if (p.roadTiles.length) world.roadVersion++;
  refund(world, p.refund);
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: p.roadTiles, refund: p.refund });
  return { ok: true, warnings: [], count, refund: p.refund };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "commands:"`
Expected: all `commands: …` tests PASS (including Task 9's), then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/commands.js tests/sim/areaCommands.test.js tests/all.js
git commit -m "Add road drawing, plot painting and area demolition`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Workers and priority staffing

**Files:**
- Create: `src/sim/labour.js`
- Test: `tests/sim/labour.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `ECONOMY`, `PRIORITY_LEVELS`, `MIN_STAFF_RATIO` (Task 3), `population`, `allBuildings` (Task 5), `touchesRoad` (Task 6).
- Produces:
  - `assignLabour(world)`: sets every workplace's `staff`, and sets `world.labour = { workforce, employed, jobs, shortLevels: string[] }`. Workers fill priority levels in order. Within a level they're shared proportionally (rounded down, with the remainder handed out one each in id order). Paused buildings and buildings with no road get 0.
  - `staffRatio(world, b) → number in [0, 1]`: buildings with no workers count as 1 unless paused (then 0).
  - `isWorking(world, b) → boolean`: not paused and `staffRatio >= MIN_STAFF_RATIO`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/labour.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { assignLabour, staffRatio, isWorking } from '../../src/sim/labour.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function town(residents) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 20, 11, { tier: 4, residents });
  return w;
}

describe('labour', () => {
  it('derives the workforce from population', () => {
    const w = town(100);
    assignLabour(w);
    expect(w.labour.workforce).toBe(40);
  });
  it('fills essential jobs before services', () => {
    const w = town(40); // 16 workers
    const farm = addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    const temple = addRaw(w, 'temple', 12, 8);
    assignLabour(w);
    expect(farm.staff).toBe(10);
    expect(granary.staff).toBe(6);
    expect(temple.staff).toBe(0);
    expect(w.labour.shortLevels).toEqual(['services']);
    expect(w.labour.jobs).toBe(22);
  });
  it('shares a short level proportionally', () => {
    const w = town(20); // 8 workers
    const farm = addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    assignLabour(w);
    expect(farm.staff + granary.staff).toBe(8);
    expect(farm.staff).toBeGreaterThan(granary.staff);
  });
  it('skips paused and roadless buildings', () => {
    const w = town(100);
    const paused = addRaw(w, 'temple', 12, 8, { paused: true });
    const roadless = addRaw(w, 'temple', 12, 20);
    assignLabour(w);
    expect(paused.staff).toBe(0);
    expect(roadless.staff).toBe(0);
  });
  it('treats a quarter staffing as the working threshold', () => {
    const w = town(0);
    const t = addRaw(w, 'temple', 12, 8);
    t.staff = 1;
    expect(isWorking(w, t)).toBe(false);
    t.staff = 2;
    expect(staffRatio(w, t)).toBe(2 / 6);
    expect(isWorking(w, t)).toBe(true);
    const well = addRaw(w, 'well', 3, 11);
    expect(isWorking(w, well)).toBe(true);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/labour.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep labour`
Expected: `LOAD ERROR` mentioning `labour.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/labour.js`:
```js
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { PRIORITY_LEVELS, MIN_STAFF_RATIO } from '../data/labour.js';
import { population, allBuildings } from './world.js';
import { touchesRoad } from './reach.js';

export function assignLabour(world) {
  const workforce = Math.floor(population(world) * ECONOMY.workerShare);
  let remaining = workforce;
  let jobs = 0;
  let employed = 0;
  const byLevel = {};
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.workers) continue;
    b.staff = 0;
    if (b.paused || !touchesRoad(world, b)) continue;
    (byLevel[def.priority] = byLevel[def.priority] || []).push(b);
    jobs += def.workers;
  }
  const shortLevels = [];
  for (const level of PRIORITY_LEVELS) {
    const list = byLevel[level] || [];
    if (!list.length) continue;
    const demand = list.reduce((s, b) => s + BUILDINGS[b.type].workers, 0);
    const give = Math.min(remaining, demand);
    if (give < demand) shortLevels.push(level);
    let given = 0;
    for (const b of list) {
      b.staff = Math.floor((BUILDINGS[b.type].workers * give) / demand);
      given += b.staff;
    }
    for (const b of list) {
      if (given >= give) break;
      if (b.staff < BUILDINGS[b.type].workers) { b.staff++; given++; }
    }
    remaining -= give;
    employed += give;
  }
  world.labour = { workforce, employed, jobs, shortLevels };
}

export function staffRatio(world, b) {
  const workers = BUILDINGS[b.type].workers;
  if (!workers) return b.paused ? 0 : 1;
  return b.staff / workers;
}

export const isWorking = (world, b) => !b.paused && staffRatio(world, b) >= MIN_STAFF_RATIO;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep labour`
Expected: all `labour` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/labour.js tests/sim/labour.test.js tests/all.js
git commit -m "Add workforce and priority staffing`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Grain production and distribution

**Files:**
- Create: `src/sim/time.js`, `src/sim/production.js`, `src/sim/distribution.js`
- Test: `tests/sim/production.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `GOODS` (Task 3), `allBuildings`, `housesOf` (Task 5), `buildingsInReach`, `roadReach`, `reachDistance` (Task 6), `isWorking`, `staffRatio` (Task 11).
- Produces from `src/sim/time.js`: `DAYS_PER_MONTH = 30`, `MONTHS_PER_YEAR = 12`, `DAYS_PER_SECOND = 1.5` (days per real second at 1×).
- Produces from `src/sim/production.js`: `storeTotal(b) → number`; `produceDay(world)`. Each producer that is working and has matching, working, non-full storage in `producerReach` adds `perMonth / 30 × staffRatio` to `progress` and moves whole units into the nearest storage. `b.blocked` is set to one of `null | 'paused' | 'understaffed' | 'no_storage' | 'storage_full'`.
- Produces from `src/sim/distribution.js`:
  - `monthlyNeed(house, good) → integer`: `ceil(residents × perResidentPerMonth)`.
  - `restockBazaars(world)`: each working bazaar fills up to `capacity` per good from storage in `supplyReach`, nearest first.
  - `bazaarsByHouse(world) → Map<houseId, Array<{ b, dist }>>`: working bazaars whose `reach` covers the house, nearest first.
  - `topUpHouse(world, house, goods, bazaars)`: tops the household stock of each good up to one month's need, from the bazaars in order.

- [ ] **Step 1: Write the failing tests**

`tests/sim/production.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { produceDay, storeTotal } from '../../src/sim/production.js';
import { restockBazaars, bazaarsByHouse, topUpHouse, monthlyNeed } from '../../src/sim/distribution.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

function farmWorld() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const farm = addRaw(w, 'farm_grain', 2, 8);
  return { w, farm };
}

describe('production', () => {
  it('fills nearby storage at the monthly rate when fully staffed', () => {
    const { w, farm } = farmWorld();
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store.grain).toBe(30);
    expect(farm.blocked).toBe(null);
  });
  it('halves output at half staffing', () => {
    const { w, farm } = farmWorld();
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    farm.staff = 5;
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store.grain).toBe(15);
  });
  it('stops with no storage in reach', () => {
    const { w, farm } = farmWorld();
    addRaw(w, 'granary', 5, 20);
    staffAll(w);
    produceDay(w);
    expect(farm.blocked).toBe('no_storage');
    expect(farm.progress).toBe(0);
  });
  it('stops when understaffed', () => {
    const { w, farm } = farmWorld();
    addRaw(w, 'granary', 5, 8);
    staffAll(w);
    farm.staff = 2;
    produceDay(w);
    expect(farm.blocked).toBe('understaffed');
  });
});

describe('distribution', () => {
  it('restocks bazaars only from storage within supply reach', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const near = addRaw(w, 'granary', 5, 8, { store: { grain: 100 } });
    const far = addRaw(w, 'granary', 28, 8, { store: { grain: 100 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    staffAll(w);
    restockBazaars(w);
    expect(bz.store.grain).toBe(100);
    expect(near.store.grain).toBe(0);
    expect(far.store.grain).toBe(100);
  });
  it('tops houses up to one month of need from the nearest bazaar', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 50 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    staffAll(w);
    const list = bazaarsByHouse(w).get(h.id);
    expect(list[0].b.id).toBe(bz.id);
    topUpHouse(w, h, ['grain'], list);
    expect(monthlyNeed(h, 'grain')).toBe(3);
    expect(h.stock.grain).toBe(3);
    expect(bz.store.grain).toBe(47);
    topUpHouse(w, h, ['grain'], list);
    expect(h.stock.grain).toBe(3);
    expect(storeTotal(bz)).toBe(47);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/production.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep production`
Expected: `LOAD ERROR` mentioning `production.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/time.js`:
```js
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_SECOND = 1.5; // at 1x: a month is 20 real seconds
```

`src/sim/production.js`:
```js
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings } from './world.js';
import { buildingsInReach } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { DAYS_PER_MONTH } from './time.js';

export const storeTotal = (b) => Object.values(b.store).reduce((s, v) => s + v, 0);

const hasSpace = (s) => storeTotal(s) < BUILDINGS[s.type].capacity;

function storageFor(world, b, good, maxDist) {
  return buildingsInReach(world, b, maxDist, (o) => (BUILDINGS[o.type].stores || []).includes(good) && isWorking(world, o) && hasSpace(o))
    .map((r) => r.b);
}

export function produceDay(world) {
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces) continue;
    if (!isWorking(world, b)) { b.blocked = b.paused ? 'paused' : 'understaffed'; continue; }
    const { good, perMonth } = def.produces;
    const targets = storageFor(world, b, good, def.producerReach);
    if (!targets.length) { b.blocked = 'no_storage'; continue; }
    b.blocked = null;
    b.progress += (perMonth / DAYS_PER_MONTH) * staffRatio(world, b);
    while (b.progress >= 1 - 1e-9) {
      const t = targets.find(hasSpace);
      if (!t) { b.blocked = 'storage_full'; break; }
      t.store[good] = (t.store[good] || 0) + 1;
      b.progress -= 1;
    }
  }
}
```

`src/sim/distribution.js`:
```js
import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';

export const monthlyNeed = (house, good) => Math.ceil(house.residents * GOODS[good].perResidentPerMonth);

export function restockBazaars(world) {
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    for (const good of def.sells) {
      let need = def.capacity - (bz.store[good] || 0);
      if (need <= 0) continue;
      const sources = buildingsInReach(world, bz, def.supplyReach,
        (o) => (BUILDINGS[o.type].stores || []).includes(good) && (o.store[good] || 0) > 0);
      for (const { b: src } of sources) {
        const take = Math.min(need, src.store[good]);
        src.store[good] -= take;
        bz.store[good] = (bz.store[good] || 0) + take;
        need -= take;
        if (need <= 0) break;
      }
    }
  }
}

export function bazaarsByHouse(world) {
  const map = new Map();
  const houses = housesOf(world);
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    const rm = roadReach(world, bz, def.reach);
    for (const h of houses) {
      const d = reachDistance(rm, world, h);
      if (d > def.reach) continue;
      if (!map.has(h.id)) map.set(h.id, []);
      map.get(h.id).push({ b: bz, dist: d });
    }
  }
  for (const list of map.values()) list.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return map;
}

export function topUpHouse(world, house, goods, bazaars) {
  for (const good of goods) {
    let need = monthlyNeed(house, good) - (house.stock[good] || 0);
    for (const { b: bz } of bazaars || []) {
      if (need <= 0) break;
      const take = Math.min(need, bz.store[good] || 0);
      if (take > 0) {
        bz.store[good] -= take;
        house.stock[good] = (house.stock[good] || 0) + take;
        need -= take;
      }
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep production`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep distribution`
Expected: each prints only PASS lines and `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/time.js src/sim/production.js src/sim/distribution.js tests/sim/production.test.js tests/all.js
git commit -m "Add grain production, bazaar restock and household top-up`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Housing needs, upgrades, downgrades and the house checklist

**Files:**
- Create: `src/sim/housing.js`
- Test: `tests/sim/housing.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `TIERS`, `MAX_TIER`, `LEAVE_CAP`, `DOWNGRADE_AFTER_MONTHS`, `BUILDINGS`, `GOODS`, `FOOD_GOODS` (Task 3), `allBuildings`, `housesOf` (Task 5), `touchesRoad`, `roadReach`, `reachDistance` (Task 6), `isWorking` (Task 11), `monthlyNeed`, `bazaarsByHouse`, `topUpHouse` (Task 12).
- Produces:
  - `needsOf(tier) → string[]`, `wantedNeeds(house) → string[]` (needs of the current tier plus the next one), `wantedGoods(house) → string[]` (food goods when `'food'` is wanted).
  - `computeCoverage(world) → { water: Set<houseId>, religion: Set<houseId> }`, from working buildings whose `provides` reach covers the house.
  - `removeResidents(house, n)`: lowers residents and counts them in `leftThisMonth`. At 0 residents the house becomes an empty plot (tier 0, empty stock).
  - `monthlyHousing(world)`: for every occupied house in id order:
    1. Reset `leftThisMonth`.
    2. Consume food from stock; `met.food` is true only if the full need was covered.
    3. Set `met.road`, `met.water`, `met.religion`.
    4. Top up stock for next month.
    5. If the current needs are met: reset `downTimer` and upgrade one tier when all of the next tier's needs are met.
    6. Otherwise: increment `downTimer`, and drop one tier (never below 1) when it reaches `DOWNGRADE_AFTER_MONTHS`.
    7. Remove over-capacity residents, or all residents when there's no road, capped at `ceil(residents × LEAVE_CAP)` a month.

    `house.met` keeps the flags for the UI.
  - `houseStatus(world, house) → { tier, name, residents, capacity, next: { tier, name } | null, checklist: Array<{ need, met }>, missingNow: string[], downgradeIn: number | null }`. `checklist` covers `'road'` plus every need of the next tier (or of the current tier at max tier) and uses last month's `met`. `downgradeIn` is the months left before a drop (`DOWNGRADE_AFTER_MONTHS - downTimer`), or null.

- [ ] **Step 1: Write the failing tests**

`tests/sim/housing.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { monthlyHousing, houseStatus, wantedNeeds, removeResidents } from '../../src/sim/housing.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y=10; houses sit on y=11 so they touch it.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('housing', () => {
  it('upgrades a hut to a shack once a well covers it', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
  });
  it('needs a month of stocked food before becoming a cottage', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
    expect(h.stock.grain).toBe(2);
    monthlyHousing(w);
    expect(h.tier).toBe(3);
  });
  it('becomes a house when a working temple covers it', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    addRaw(w, 'temple', 15, 8);
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);
  });
  it('waits a month before dropping a tier when water is lost', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    monthlyHousing(w);
    expect(h.tier).toBe(2);
    expect(houseStatus(w, h).downgradeIn).toBe(1);
    monthlyHousing(w);
    expect(h.tier).toBe(1);
  });
  it('lets stocked food carry a cottage through a missed delivery', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    expect(h.tier).toBe(3);
    expect(h.downTimer).toBe(0);
    monthlyHousing(w);
    expect(h.downTimer).toBe(1);
    monthlyHousing(w);
    expect(h.tier).toBe(2);
  });
  it('caps leavers at a quarter of residents per month', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 20, { tier: 1, residents: 5 });
    monthlyHousing(w);
    expect(h.residents).toBe(3);
    expect(h.leftThisMonth).toBe(2);
  });
  it('turns an emptied house back into a plot', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 2, stock: { grain: 1 } });
    removeResidents(h, 2);
    expect(h.tier).toBe(0);
    expect(h.stock).toEqual({});
  });
  it('wants the needs of the next tier as well', () => {
    expect(wantedNeeds({ tier: 2 })).toEqual(['water', 'food']);
  });
  it('explains what the next tier needs', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    addRaw(w, 'well', 13, 9);
    monthlyHousing(w);
    const s = houseStatus(w, h);
    expect(s.next).toEqual({ tier: 3, name: 'Cottage' });
    expect(s.checklist).toEqual([{ need: 'road', met: true }, { need: 'water', met: true }, { need: 'food', met: false }]);
    expect(s.missingNow).toEqual([]);
    expect(s.downgradeIn).toBe(null);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/housing.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep housing`
Expected: `LOAD ERROR` mentioning `housing.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/housing.js`:
```js
import { TIERS, MAX_TIER, LEAVE_CAP, DOWNGRADE_AFTER_MONTHS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';
import { bazaarsByHouse, topUpHouse } from './distribution.js';

export const needsOf = (tier) => (tier >= 1 && tier <= MAX_TIER ? TIERS[tier].needs : []);

export function wantedNeeds(house) {
  const out = [...needsOf(house.tier)];
  for (const n of needsOf(Math.min(house.tier + 1, MAX_TIER))) if (!out.includes(n)) out.push(n);
  return out;
}

export const wantedGoods = (house) => (wantedNeeds(house).includes('food') ? FOOD_GOODS.slice() : []);

export function computeCoverage(world) {
  const cov = { water: new Set(), religion: new Set() };
  const houses = housesOf(world);
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.provides || !cov[def.provides] || !isWorking(world, b)) continue;
    const rm = roadReach(world, b, def.reach);
    for (const h of houses) if (reachDistance(rm, world, h) <= def.reach) cov[def.provides].add(h.id);
  }
  return cov;
}

export function removeResidents(house, n) {
  const k = Math.min(n, house.residents);
  house.residents -= k;
  house.leftThisMonth += k;
  if (house.residents <= 0) {
    house.residents = 0;
    house.tier = 0;
    house.stock = {};
    house.downTimer = 0;
  }
}

function consumeFood(house) {
  let need = Math.ceil(house.residents * GOODS[FOOD_GOODS[0]].perResidentPerMonth);
  if (need === 0) return false;
  for (const g of FOOD_GOODS) {
    const take = Math.min(need, house.stock[g] || 0);
    house.stock[g] = (house.stock[g] || 0) - take;
    need -= take;
  }
  return need === 0;
}

export function monthlyHousing(world) {
  const cov = computeCoverage(world);
  const bazaars = bazaarsByHouse(world);
  for (const h of housesOf(world)) {
    h.leftThisMonth = 0;
    if (h.tier === 0) continue;
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      food: wantedNeeds(h).includes('food') ? consumeFood(h) : false,
    };
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id));

    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]);
    if (currentOk) {
      h.downTimer = 0;
      const next = h.tier + 1;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n])) h.tier = next;
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        if (h.tier > 1) h.tier--;
        h.downTimer = 0;
      }
    }

    const cap = TIERS[h.tier].capacity;
    let leave = met.road ? Math.max(0, h.residents - cap) : h.residents;
    leave = Math.min(leave, Math.ceil(h.residents * LEAVE_CAP));
    if (leave > 0) removeResidents(h, leave);
  }
}

export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = house.met || {};
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !met[n]) : [];
  return {
    tier,
    name: info ? info.name : 'Empty plot',
    residents: house.residents,
    capacity: info ? info.capacity : TIERS[1].capacity,
    next,
    checklist,
    missingNow,
    downgradeIn: house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep housing`
Expected: all `housing` tests PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/housing.js tests/sim/housing.test.js tests/all.js
git commit -m "Add housing needs, upgrades, downgrades and house checklist`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Mood, arrivals and departures

**Files:**
- Create: `src/sim/mood.js`, `src/sim/immigration.js`
- Test: `tests/sim/immigration.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `MOOD`, `TIERS`, `LEAVE_CAP` (Task 3), `housesOf`, `population` (Task 5), `touchesRoad` (Task 6), `atLeast` (Task 7), `wantedNeeds`, `removeResidents` (Task 13).
- Produces:
  - `updateMood(world) → number`. It sets `world.mood` (an integer from 0 to 100) and `world.moodBreakdown = { base, food, jobs, debt }`:
    - `food = round(fedWeight × (fedShare − 0.5) × 2)`, where `fedShare` is the share of food-wanting residents whose `met.food` was true (1 when nobody wants food).
    - `jobs` counts only from Town on: `−round(max(0, unemployment − threshold) × weight)`.
    - `debt = −min(debtMax, round(−gold / debtPerPoint))` when gold is below 0.
  - `vacancies(world) → Array<{ h, free }>`: road-connected houses with spare capacity, in id order. Empty plots offer tier-1 capacity.
  - `monthlyArrivals(world) → number`: 0 below `arrivalsMin`; otherwise `round((arrivalBase + arrivalPerPop × pop) × mood / arrivalMoodDivisor)`.
  - `arrivalsBatch(world) → number arrived`: places `ceil(monthlyArrivals / arrivalBatchesPerMonth)` people, filling vacancies in order. A plot that gets people becomes tier 1.
  - `departures(world) → number left`: only below `departuresBelow`; `ceil(pop × departureShare)` people leave, lowest tier first then id. Each house respects `ceil(residents × LEAVE_CAP) − leftThisMonth`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/immigration.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { updateMood } from '../../src/sim/mood.js';
import { vacancies, monthlyArrivals, arrivalsBatch, departures } from '../../src/sim/immigration.js';
import { population } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('mood', () => {
  it('rises when nobody needs food yet and falls with hunger', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    expect(updateMood(w)).toBe(80);
    const h = addRaw(w, 'house', 3, 11, { tier: 3, residents: 12, met: { food: false } });
    updateMood(w);
    expect(w.moodBreakdown.food).toBeLessThan(0);
    h.met = { food: true };
    updateMood(w);
    expect(w.moodBreakdown.food).toBe(20);
  });
  it('ignores unemployment before Town and counts it after', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };
    updateMood(w);
    expect(w.moodBreakdown.jobs).toBe(0);
    w.milestone = 'town';
    updateMood(w);
    expect(w.moodBreakdown.jobs).toBe(-35);
  });
  it('drops with debt, capped at 20', () => {
    const w = street();
    w.gold = -250;
    updateMood(w);
    expect(w.moodBreakdown.debt).toBe(-10);
    w.gold = -5000;
    updateMood(w);
    expect(w.moodBreakdown.debt).toBe(-20);
  });
});

describe('immigration', () => {
  it('only offers road-connected homes', () => {
    const w = street();
    addRaw(w, 'house', 2, 11);
    addRaw(w, 'house', 2, 20);
    expect(vacancies(w).length).toBe(1);
    expect(vacancies(w)[0].free).toBe(5);
  });
  it('fills empty plots in batches and turns them into huts', () => {
    const w = street();
    for (let x = 2; x < 8; x++) addRaw(w, 'house', x, 11);
    w.mood = 80;
    expect(monthlyArrivals(w)).toBe(40);
    const n = arrivalsBatch(w);
    expect(n).toBe(14);
    expect(population(w)).toBe(14);
    expect(w.buildings[1].tier).toBe(1);
    expect(w.buildings[1].residents).toBe(5);
  });
  it('stops arrivals when mood is low', () => {
    const w = street();
    addRaw(w, 'house', 2, 11);
    w.mood = 20;
    expect(arrivalsBatch(w)).toBe(0);
  });
  it('sends people away from the lowest tiers when mood is low', () => {
    const w = street();
    const low = addRaw(w, 'house', 2, 11, { tier: 1, residents: 5 });
    const high = addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    for (let x = 4; x < 13; x++) addRaw(w, 'house', x, 11, { tier: 4, residents: 16 }); // population 165, so 4 leave
    w.mood = 10;
    const left = departures(w);
    expect(left).toBe(4);
    expect(low.residents).toBe(3);
    expect(high.residents).toBe(14);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/immigration.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep mood`
Expected: `LOAD ERROR` mentioning `mood.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/mood.js`:
```js
import { MOOD } from '../data/mood.js';
import { housesOf } from './world.js';
import { atLeast } from './progression.js';
import { wantedNeeds } from './housing.js';

export function updateMood(world) {
  let wanting = 0;
  let fed = 0;
  for (const h of housesOf(world)) {
    if (h.tier < 1 || !wantedNeeds(h).includes('food')) continue;
    wanting += h.residents;
    if (h.met && h.met.food) fed += h.residents;
  }
  const fedShare = wanting ? fed / wanting : 1;
  const food = Math.round(MOOD.fedWeight * (fedShare - 0.5) * 2);

  let jobs = 0;
  const L = world.labour;
  if (atLeast(world, 'town') && L.workforce > 0) {
    const unemployment = (L.workforce - L.employed) / L.workforce;
    jobs = -Math.round(Math.max(0, unemployment - MOOD.unemploymentThreshold) * MOOD.unemploymentWeight);
  }

  const debt = world.gold < 0 ? -Math.min(MOOD.debtMax, Math.round(-world.gold / MOOD.debtPerPoint)) : 0;
  world.mood = Math.max(0, Math.min(100, MOOD.base + food + jobs + debt));
  world.moodBreakdown = { base: MOOD.base, food, jobs, debt };
  return world.mood;
}
```

`src/sim/immigration.js`:
```js
import { MOOD } from '../data/mood.js';
import { TIERS, LEAVE_CAP } from '../data/housing.js';
import { housesOf, population } from './world.js';
import { touchesRoad } from './reach.js';
import { removeResidents } from './housing.js';

export function vacancies(world) {
  const out = [];
  for (const h of housesOf(world)) {
    if (!touchesRoad(world, h)) continue;
    const cap = h.tier >= 1 ? TIERS[h.tier].capacity : TIERS[1].capacity;
    const free = cap - h.residents;
    if (free > 0) out.push({ h, free });
  }
  return out;
}

export function monthlyArrivals(world) {
  if (world.mood < MOOD.arrivalsMin) return 0;
  return Math.round(((MOOD.arrivalBase + MOOD.arrivalPerPop * population(world)) * world.mood) / MOOD.arrivalMoodDivisor);
}

export function arrivalsBatch(world) {
  const total = monthlyArrivals(world);
  if (total <= 0) return 0;
  let n = Math.ceil(total / MOOD.arrivalBatchesPerMonth);
  let arrived = 0;
  for (const { h, free } of vacancies(world)) {
    if (n <= 0) break;
    const k = Math.min(n, free);
    if (h.tier === 0) h.tier = 1;
    h.residents += k;
    n -= k;
    arrived += k;
  }
  return arrived;
}

export function departures(world) {
  if (world.mood >= MOOD.departuresBelow) return 0;
  let n = Math.ceil(population(world) * MOOD.departureShare);
  let left = 0;
  const houses = housesOf(world).filter((h) => h.residents > 0).sort((a, b) => a.tier - b.tier || a.id - b.id);
  for (const h of houses) {
    if (n <= 0) break;
    const allowed = Math.max(0, Math.ceil(h.residents * LEAVE_CAP) - h.leftThisMonth);
    const k = Math.min(n, allowed);
    if (k > 0) { removeResidents(h, k); n -= k; left += k; }
  }
  return left;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep mood`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep immigration`
Expected: each prints only PASS lines and `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/mood.js src/sim/immigration.js tests/sim/immigration.test.js tests/all.js
git commit -m "Add mood, arrivals and departures`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Monthly economy and alerts

**Files:**
- Create: `src/sim/economy.js`, `src/sim/alerts.js`
- Test: `tests/sim/economy.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `ECONOMY`, `TIERS`, `BUILDINGS`, `MOOD` (Task 3), `allBuildings`, `housesOf` (Task 5), `touchesRoad` (Task 6), `atLeast` (Task 7), `isWorking` (Task 11).
- Produces:
  - `monthlyEconomy(world)`: adds taxes (`residents × TIERS[tier].tax`), subtracts upkeep (not for paused buildings) and wages (`staff × wagePerWorker`), and sets `world.stats.lastMonth = { taxes, wages, upkeep, net }`.
  - `computeAlerts(world) → Array<alert>`, also stored in `world.alerts`. Alert shapes:
    - `{ code: 'no_road', id }`
    - `{ code: 'no_storage', id }`
    - `{ code: 'storage_full', id }`
    - `{ code: 'understaffed', id }`
    - `{ code: 'bazaar_empty', id }`
    - `{ code: 'labour_shortage', level }`
    - `{ code: 'unemployment' }` (from Town on)
    - `{ code: 'debt' }`

    Houses never raise `no_road`; that shows on the house checklist instead.

- [ ] **Step 1: Write the failing tests**

`tests/sim/economy.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { monthlyEconomy } from '../../src/sim/economy.js';
import { computeAlerts } from '../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('economy', () => {
  it('collects taxes and pays wages and upkeep', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 2, residents: 8 });
    addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    addRaw(w, 'temple', 12, 8, { staff: 6 });
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 40, wages: 24, upkeep: 13, net: 3 });
    expect(w.gold).toBe(1003);
  });
  it('charges nothing for paused buildings', () => {
    const w = street();
    addRaw(w, 'temple', 12, 8, { paused: true, staff: 0 });
    monthlyEconomy(w);
    expect(w.stats.lastMonth.upkeep).toBe(0);
  });
});

describe('alerts', () => {
  it('flags stuck, empty and understaffed buildings', () => {
    const w = street();
    const farm = addRaw(w, 'farm_grain', 2, 8, { staff: 10, blocked: 'no_storage' });
    const temple = addRaw(w, 'temple', 12, 8, { staff: 0 });
    const bz = addRaw(w, 'bazaar', 16, 8, { staff: 6 });
    const lonely = addRaw(w, 'well', 20, 20);
    addRaw(w, 'house', 25, 25, { tier: 1, residents: 3 });
    w.labour = { workforce: 10, employed: 10, jobs: 22, shortLevels: ['services'] };
    const codes = computeAlerts(w).map((a) => a.code + (a.id ? ':' + a.id : '') + (a.level ? ':' + a.level : ''));
    expect(codes).toContain('no_storage:' + farm.id);
    expect(codes).toContain('understaffed:' + temple.id);
    expect(codes).toContain('bazaar_empty:' + bz.id);
    expect(codes).toContain('no_road:' + lonely.id);
    expect(codes).toContain('labour_shortage:services');
    expect(codes.some((c) => c.startsWith('no_road:') && c !== 'no_road:' + lonely.id)).toBe(false);
  });
  it('flags debt, and unemployment only from Town', () => {
    const w = street(-10);
    w.labour = { workforce: 100, employed: 10, jobs: 10, shortLevels: [] };
    expect(computeAlerts(w).map((a) => a.code)).toEqual(['debt']);
    w.milestone = 'town';
    expect(computeAlerts(w).map((a) => a.code)).toEqual(['unemployment', 'debt']);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/economy.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep economy`
Expected: `LOAD ERROR` mentioning `economy.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/economy.js`:
```js
import { ECONOMY } from '../data/economy.js';
import { TIERS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';

export function monthlyEconomy(world) {
  let taxes = 0;
  for (const h of housesOf(world)) if (h.tier >= 1) taxes += h.residents * TIERS[h.tier].tax;
  let wages = 0;
  let upkeep = 0;
  for (const b of allBuildings(world)) {
    if (b.paused) continue;
    upkeep += BUILDINGS[b.type].upkeep;
    wages += b.staff * ECONOMY.wagePerWorker;
  }
  const net = taxes - wages - upkeep;
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, net };
}
```

`src/sim/alerts.js`:
```js
import { BUILDINGS } from '../data/buildings.js';
import { MOOD } from '../data/mood.js';
import { allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';

export function computeAlerts(world) {
  const alerts = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (b.type === 'house') continue;
    const road = touchesRoad(world, b);
    if (def.needsRoad && !road) alerts.push({ code: 'no_road', id: b.id });
    if (b.blocked === 'no_storage') alerts.push({ code: 'no_storage', id: b.id });
    if (b.blocked === 'storage_full') alerts.push({ code: 'storage_full', id: b.id });
    if (def.workers && road && !b.paused && !isWorking(world, b)) alerts.push({ code: 'understaffed', id: b.id });
    if (def.sells && isWorking(world, b) && def.sells.every((g) => !((b.store[g] || 0) > 0))) alerts.push({ code: 'bazaar_empty', id: b.id });
  }
  for (const level of world.labour.shortLevels || []) alerts.push({ code: 'labour_shortage', level });
  const L = world.labour;
  if (atLeast(world, 'town') && L.workforce > 0 && (L.workforce - L.employed) / L.workforce > MOOD.unemploymentThreshold) {
    alerts.push({ code: 'unemployment' });
  }
  if (world.gold < 0) alerts.push({ code: 'debt' });
  world.alerts = alerts;
  return alerts;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep economy`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep alerts`
Expected: each prints only PASS lines and `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/economy.js src/sim/alerts.js tests/sim/economy.test.js tests/all.js
git commit -m "Add monthly economy and alerts`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The clock, and a village that grows

**Files:**
- Create: `src/sim/clock.js`
- Test: `tests/sim/clock.test.js`, `tests/sim/integration.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: every system from Tasks 7–15, plus `DAYS_PER_MONTH`, `MONTHS_PER_YEAR`, `DAYS_PER_SECOND` (Task 12) and `MOOD` (Task 3).
- Produces:
  - `tickDay(world)`, which runs in this exact order:
    1. `assignLabour`
    2. `produceDay`
    3. `day += 1`
    4. every 10th day: `arrivalsBatch`
    5. every 30th day: `runMonth`
  - `runMonth(world)`, which runs in this exact order:
    1. `restockBazaars`
    2. `monthlyHousing`
    3. `departures`
    4. `monthlyEconomy`
    5. `updateMood`
    6. `updateMilestone`
    7. `computeAlerts`
    8. `clearUndo`
  - `advanceDays(world, n)`, `monthIndex(world)`, `dateParts(world) → { year, month, day }` (all 1-based), `daysForSeconds(speed, seconds) → number`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/clock.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { advanceDays, dateParts, daysForSeconds } from '../../src/sim/clock.js';
import { pushUndo } from '../../src/sim/undo.js';
import { population } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

describe('clock', () => {
  it('counts days, months and years from 1', () => {
    const w = makeTestWorld();
    expect(dateParts(w)).toEqual({ year: 1, month: 1, day: 1 });
    advanceDays(w, 30);
    expect(dateParts(w)).toEqual({ year: 1, month: 2, day: 1 });
    advanceDays(w, 330);
    expect(dateParts(w)).toEqual({ year: 2, month: 1, day: 1 });
  });
  it('converts real seconds to game days by speed', () => {
    expect(daysForSeconds(1, 20)).toBe(30);
    expect(daysForSeconds(3, 2)).toBe(9);
    expect(daysForSeconds(0, 10)).toBe(0);
  });
  it('clears undo history at the month tick', () => {
    const w = makeTestWorld();
    pushUndo(w, { kind: 'road', tiles: [], cost: 0 });
    advanceDays(w, 29);
    expect(w.undo.length).toBe(1);
    advanceDays(w, 1);
    expect(w.undo.length).toBe(0);
  });
  it('brings the first arrivals on day 10', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 5, 11);
    advanceDays(w, 9);
    expect(population(w)).toBe(0);
    advanceDays(w, 1);
    expect(population(w)).toBe(5);
  });
});
```

`tests/sim/integration.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { housesOf, population } from '../../src/sim/world.js';
import { makeTestWorld } from '../helpers/testWorld.js';

function village() {
  const w = makeTestWorld({ gold: 100000 });
  expect(drawRoad(w, 0, 10, 31, 10).ok).toBe(true);
  expect(paintHouses(w, 9, 11, 20, 11).ids.length).toBe(12);
  for (const [type, x, y] of [
    ['well', 10, 9], ['well', 19, 9], ['farm_grain', 2, 8], ['farm_grain', 2, 11],
    ['granary', 5, 8], ['bazaar', 13, 8], ['temple', 16, 8],
  ]) {
    expect(place(w, type, x, y).ok).toBe(true);
  }
  return w;
}

describe('integration', () => {
  it('grows from huts to houses within two years', () => {
    const w = village();
    advanceDays(w, 30 * 24);
    const tiers = housesOf(w).map((h) => h.tier);
    expect(tiers.filter((t) => t === 4).length).toBeGreaterThanOrEqual(10);
    expect(population(w)).toBeGreaterThanOrEqual(150);
    expect(w.milestone).toBe('town');
  });
});
```

Append to `tests/all.js`:
```js
import './sim/clock.test.js';
import './sim/integration.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep clock`
Expected: `LOAD ERROR` mentioning `clock.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/sim/clock.js`:
```js
import { MOOD } from '../data/mood.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, DAYS_PER_SECOND } from './time.js';
import { assignLabour } from './labour.js';
import { produceDay } from './production.js';
import { restockBazaars } from './distribution.js';
import { monthlyHousing } from './housing.js';
import { arrivalsBatch, departures } from './immigration.js';
import { monthlyEconomy } from './economy.js';
import { updateMood } from './mood.js';
import { updateMilestone } from './progression.js';
import { computeAlerts } from './alerts.js';
import { clearUndo } from './undo.js';

const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;

export function runMonth(world) {
  restockBazaars(world);
  monthlyHousing(world);
  departures(world);
  monthlyEconomy(world);
  updateMood(world);
  updateMilestone(world);
  computeAlerts(world);
  clearUndo(world);
}

export function tickDay(world) {
  assignLabour(world);
  produceDay(world);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) arrivalsBatch(world);
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world);
}

export function advanceDays(world, n) {
  for (let i = 0; i < n; i++) tickDay(world);
}

export const monthIndex = (world) => Math.floor(world.day / DAYS_PER_MONTH);

export function dateParts(world) {
  const m = monthIndex(world);
  return { year: Math.floor(m / MONTHS_PER_YEAR) + 1, month: (m % MONTHS_PER_YEAR) + 1, day: (world.day % DAYS_PER_MONTH) + 1 };
}

export const daysForSeconds = (speed, seconds) => speed * DAYS_PER_SECOND * seconds;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep clock`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep integration`
Expected: each prints only PASS lines and `ALL PASSED`.

If the integration test fails, debug it with superpowers:systematic-debugging. Print `housesOf(w).map(h => [h.tier, h.residents, JSON.stringify(h.met)])` and `w.labour` after 3, 6 and 12 months to find which need is failing. The layout is chosen so that:
- both wells cover plots 9–20;
- the bazaar at x 13–14 and the temple at x 16–17 cover every plot;
- the granary is 3 road tiles from both farms and 8 from the bazaar.

So a failure points at a rule bug, not at the layout. Fix the rule, not the test.

- [ ] **Step 5: Commit**

```powershell
git add src/sim/clock.js tests/sim/clock.test.js tests/sim/integration.test.js tests/all.js
git commit -m "Add the simulation clock and a village growth test`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Save format, migrations and determinism

**Files:**
- Create: `src/save/migrate.js`, `src/save/serialize.js`
- Test: `tests/save/serialize.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `WORLD_VERSION`, `createWorld` (Task 5), `advanceDays` (Task 16), `drawRoad`, `paintHouses`, `place` (Tasks 9–10).
- Produces:
  - `CURRENT_VERSION` (equals `WORLD_VERSION`) and `migrate(obj) → obj`. It throws `Error('not_a_save')` with no numeric `version`, `Error('newer_version')` for a version above current, and `Error('no_migration_<v>')` when a step is missing.
  - `serialize(world) → string`.
  - `deserialize(text) → world`. It throws `Error('corrupt_save')` on bad JSON, missing fields or a terrain length mismatch.

  Stage 1d builds IndexedDB storage, backups and export on top of these two functions.

- [ ] **Step 1: Write the failing tests**

`tests/save/serialize.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { serialize, deserialize } from '../../src/save/serialize.js';
import { migrate, CURRENT_VERSION } from '../../src/save/migrate.js';
import { createWorld } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';

function scriptedWorld(seed) {
  const w = createWorld({ seed });
  const { x, y } = w.focus;
  drawRoad(w, x - 6, y, x + 6, y);
  paintHouses(w, x - 5, y + 1, x + 5, y + 1);
  place(w, 'well', x, y - 1);
  return w;
}

describe('save', () => {
  it('round-trips a world exactly', () => {
    const w = scriptedWorld(7);
    advanceDays(w, 75);
    expect(deserialize(serialize(w))).toEqual(w);
  });
  it('rejects corrupt and future saves', () => {
    expect(() => deserialize('{not json')).toThrow();
    expect(() => deserialize(JSON.stringify({ version: 1 }))).toThrow();
    expect(() => migrate({ version: CURRENT_VERSION + 1 })).toThrow();
    expect(() => migrate({})).toThrow();
  });
  it('passes current saves through migrate unchanged', () => {
    const w = createWorld({ seed: 3 });
    expect(migrate(JSON.parse(serialize(w)))).toEqual(w);
  });
});

describe('determinism', () => {
  it('gives identical worlds for the same seed and commands', () => {
    const a = scriptedWorld(11), b = scriptedWorld(11);
    advanceDays(a, 200);
    advanceDays(b, 200);
    expect(serialize(a)).toBe(serialize(b));
  });
  it('continues identically after a save and load', () => {
    const straight = scriptedWorld(12);
    advanceDays(straight, 150);
    const interrupted = scriptedWorld(12);
    advanceDays(interrupted, 70);
    const reloaded = deserialize(serialize(interrupted));
    advanceDays(reloaded, 80);
    expect(serialize(reloaded)).toBe(serialize(straight));
  });
});
```

Append to `tests/all.js`:
```js
import './save/serialize.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep save`
Expected: `LOAD ERROR` mentioning `serialize.js`, exit code 1.

- [ ] **Step 3: Implement**

`src/save/migrate.js`:
```js
import { WORLD_VERSION } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
const MIGRATIONS = {};

export function migrate(obj) {
  if (!obj || typeof obj.version !== 'number') throw new Error('not_a_save');
  if (obj.version > CURRENT_VERSION) throw new Error('newer_version');
  let w = obj;
  while (w.version < CURRENT_VERSION) {
    const step = MIGRATIONS[w.version];
    if (!step) throw new Error('no_migration_' + w.version);
    w = step(w);
  }
  return w;
}
```

`src/save/serialize.js`:
```js
import { migrate } from './migrate.js';

const REQUIRED = ['version', 'seed', 'size', 'day', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId'];

export function serialize(world) {
  return JSON.stringify(world);
}

export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  for (const k of REQUIRED) if (!(k in obj)) throw new Error('corrupt_save');
  const cells = obj.size * obj.size;
  if (obj.terrain.length !== cells || obj.road.length !== cells || obj.occ.length !== cells) throw new Error('corrupt_save');
  return migrate(obj);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep save`
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep determinism`
Expected: each prints only PASS lines and `ALL PASSED`.

If determinism fails, something in `src/sim/` depends on state outside the world. Search for `Math.random`, `Date` and module-level mutable variables (`Select-String -Path src/sim/*.js -Pattern "Math.random|Date|performance"`). The reach cache is keyed by `roadVersion` and footprint, so a freshly loaded world rebuilds it correctly.

- [ ] **Step 5: Commit**

```powershell
git add src/save tests/save/serialize.test.js tests/all.js
git commit -m "Add versioned save format with determinism tests`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Ten-year sanity run and balance check

**Files:**
- Test: `tests/sim/longrun.test.js`
- Modify: `tests/all.js`
- Possibly modify (balance only): `src/data/economy.js`, `src/data/buildings.js`, `src/data/mood.js`

**Interfaces:**
- Consumes: `advanceDays` (Task 16), `drawRoad`, `paintHouses`, `place` (Tasks 9–10), `housesOf`, `population`, `allBuildings` (Task 5), `makeTestWorld` (Task 5).
- Produces: a guard test that the Stage 1 economy works from the real starting gold (2,000), with no impossible values over 10 game-years.

- [ ] **Step 1: Write the test**

`tests/sim/longrun.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { housesOf, population, allBuildings } from '../../src/sim/world.js';
import { makeTestWorld } from '../helpers/testWorld.js';

// A realistic Stage 1 village built from the real starting treasury.
function realVillage() {
  const w = makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: 2000 });
  const steps = [
    () => drawRoad(w, 0, 12, 27, 12),
    () => paintHouses(w, 10, 13, 26, 13),
    () => place(w, 'well', 12, 11),
    () => place(w, 'well', 18, 11),
    () => place(w, 'well', 24, 11),
    () => place(w, 'farm_grain', 0, 10),
    () => place(w, 'farm_grain', 2, 10),
    () => place(w, 'farm_grain', 4, 10),
    () => place(w, 'granary', 6, 10),
    () => place(w, 'bazaar', 16, 10),
    () => place(w, 'temple', 19, 10),
  ];
  for (const s of steps) expect(s().ok).toBe(true);
  return w;
}

function checkSane(w) {
  expect(Number.isFinite(w.gold)).toBe(true);
  expect(w.mood).toBeGreaterThanOrEqual(0);
  expect(w.mood).toBeLessThanOrEqual(100);
  for (const b of allBuildings(w)) {
    for (const v of Object.values(b.store)) expect(v).toBeGreaterThanOrEqual(0);
    if (b.type === 'house') {
      expect(b.residents).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(b.stock)) expect(v).toBeGreaterThanOrEqual(0);
    }
  }
}

describe('longrun', () => {
  it('stays sane and solvent for ten years from 2,000 gold', () => {
    const w = realVillage();
    const started = performance.now();
    let lowestGold = w.gold;
    for (let month = 0; month < 120; month++) {
      advanceDays(w, 30);
      checkSane(w);
      lowestGold = Math.min(lowestGold, w.gold);
    }
    const elapsed = performance.now() - started;
    expect(lowestGold).toBeGreaterThan(-500);
    expect(w.gold).toBeGreaterThan(2000);
    expect(population(w)).toBeGreaterThanOrEqual(220);
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
    expect(elapsed).toBeLessThan(3000);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/longrun.test.js';
```

- [ ] **Step 2: Run the test**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep longrun`
Expected: PASS, then `ALL PASSED`. The layout is planned so that:
- 17 plots on x 10–26 reach tier 4, about 272 people;
- three farms make 90 grain a month against a need of about 68;
- the monthly balance at tier 4 is roughly +300 gold;
- the early-game loss is roughly −100 a month for about four months.

- [ ] **Step 3: If it fails, tune data only (never weaken the assertions)**

- **The lowest gold dips below −500, or the final gold is under 2,000:** lower `ECONOMY.wagePerWorker` by 1 (not below 2), or cut each building's `upkeep` in `src/data/buildings.js` by up to 30%.
- **Population is too low:** check `w.mood` each month. If the food term keeps mood near 40 too long, lower `MOOD.fedWeight` to 15.
- **Too few tier-4 houses:** print `housesOf(w).map(h => [h.x, h.tier, JSON.stringify(h.met)])`. If a reach is short for the edge plots, the layout is wrong for the current reach values, so move the bazaar or temple one tile towards the middle in the test.

  If instead an edge plot shows `met.food` false while it is in reach, that's a rule bug: debug it with superpowers:systematic-debugging.
- **Too slow (over 3,000 ms):** profile `produceDay`. If `buildingsInReach` dominates, cache the per-producer storage list per `roadVersion` inside `production.js` using a WeakMap, the same pattern as `reach.js`.

After any data change, run the full suite: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`.
Expected: `ALL PASSED`.

- [ ] **Step 4: Run the whole suite**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: every test PASS, then `ALL PASSED`, exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add tests/sim/longrun.test.js tests/all.js src/data
git commit -m "Add ten-year sanity run and Stage 1 balance check`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec section | Covered by |
|---|---|
| 4.1 Opening: 2,000 gold, start road, paused start, first arrivals about 10 seconds in | Tasks 3, 4, 5, 16 (the goals list is plan 1d) |
| 4.3 Time | Tasks 12, 16 (pausing when the page is hidden is plan 1c) |
| 4.4 Map | Task 4 |
| 4.5 Roads (tap start and end, L-path with flip) and reach | Tasks 6, 10 |
| 4.6 Housing tiers 1–4, household stock, timers, leaver cap | Task 13 (2×2 merging is Stage 2) |
| 4.8 Workers and priorities | Task 11 |
| 4.9 Immigration and mood | Task 14 (the arrival constants are raised; see the note in `src/data/mood.js`) |
| 4.10 Grain chain | Task 12 |
| 4.11 Money: pause stops wages, 25% refund, debt floor, debt lowers mood | Tasks 7, 9, 14, 15 |
| 4.14 Village and Town milestones | Task 7 |
| 6.5 Placing rules: blocked reasons, "won't work yet" warnings, area painting, 10-step undo cleared each month | Tasks 8, 9, 10, 16 |
| 7.3 Commands with reason codes; deterministic sim | Tasks 2, 9, 10, 17 |
| 7.5 Versioned saves | Task 17 (IndexedDB, backup and export are plan 1d) |
| 9 Tests: reach, housing, labour, immigration, distribution, undo, determinism, saving, long run | Tasks 6–18 |

## Next plans

After this plan is executed and merged, write plan **1b (rendering)** against the real `src/sim` API: blended terrain chunks, the sprite cache with code-drawn art from brainstorming pass 4, depth sorting, walkers, overlays, effects and a debug page that runs the clock. Then plans **1c** and **1d**.
