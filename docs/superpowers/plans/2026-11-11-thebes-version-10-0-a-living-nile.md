# Thebes 10.0 "A living Nile": Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first thing a player sees is a city and not sand, the game reads well on a 1080p monitor, every drawing meets one bar, and the city looks alive at every rank on a phone, inside frame budgets tightened to the 9.1 targets.

**Architecture:**
- **Life is render-side only.** Every new figure, crowd, boat, builder, lamp and weather beat is a pure function of the world, the time and a hash (`hash2` in `src/render/ambient.js`), computed in `*At(world, timeDays, nowMs, range, motion)` functions that never write the world. Walkers move on game time; the ambient and the weather on the real clock. The sim and the save are untouched (`WORLD_VERSION` 12).
- **One more budget, one more dropper.** A `LIFE` budget in `src/data/ambient.js` with its own `createDropper` (the v90 pattern) and drop order; the ambient and v90 budgets are unchanged. The budget tests' bounds become the 9.1 targets plus 20% headroom, and a phone-size frame test joins them.
- **The camera is held inside the map** by one helper, `holdInMap`, that every camera write calls; the off-map ground is a baked pattern drawn before the chunks.
- **The interface scales by width** through the existing `--ui-scale` token; the dock's icons are drawn once to data URLs.

**Tech Stack:** Plain ES modules, canvas 2D, no build step. Tests on the in-repo harness (`tests/harness.js`), run in headless Edge by `tests/run-tests.ps1` through the scratch suite wrapper. Screenshots by `tests/screenshot.ps1`; scenes by `window.__thebes.devScene` (`src/dev/scenes.js`).

**Spec:** `docs/superpowers/specs/2026-11-11-thebes-version-10-0-a-living-nile-design.md`. Read it with this plan. The roadmap is `specs/2026-11-11-thebes-v10-roadmap-design.md`.

## Global Constraints

- **Identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com` in the branch and every worktree.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - The guard script (scratch `guard.sh <worktree>`) prints GUARD OK before every commit; before a push, `guard.sh <wt> --push` also checks the unpushed commits.
  - Never write Josh's employer's name anywhere, including briefs. Josh's friend is "a friend".
- **Tests and build:**
  - The full suite prints ALL PASSED before every commit. A frame-budget test that fails only under load and passes alone counts, and is reported.
  - After any change to `src/`, `css/`, `index.html` or `assets/`, run `Set-Location <worktree>; & ./tools/sw-files.ps1` in PowerShell.
  - Stage files by path; never commit `.superpowers/`.
  - No shell heredoc, echo, sed or python on repo files: use the Edit/Write tools.
  - Every wait has a timeout; one full suite on the machine at a time (the lock file); tracks iterate with `-Grep "v100 <x>"`.
- **Merging:** never `git checkout --ours/--theirs` a whole file. Resolve with `git merge-file --ours <ours> <base> <theirs>` against the true base, or by hand.
- **Saves and the sim:** old saves (8.4 to 9.3.1) open as they were; `WORLD_VERSION` stays 12; no new world or building field. The sim stays deterministic (no `Math.random`, `Date`, `performance.now` in `src/sim`). Nothing in `src/render` or `src/ui` writes the world from a draw.
- **Words:** "Pharaoh" in no game text. New strings only under `// Version 10.0, Track <X>` in `src/ui/text.js`. Words follow the glossary in `docs/superpowers/notes/2026-11-08-version-9-2-rulings-w.md`.
- **Not in scope:** no colour-blind patterns, tests or settings; no new sound beyond the festival cue; no Steam shell; no new rule, cost or footprint.
- **Frame bounds:** no bound is loosened. The LIFE budget is 1.5 ms desktop and 1.0 ms phone (spec Q1). Cache caps change only by ruling with a measurement.
- **Motion:** Full shows everything; Gentle shows figures standing or fading in place and no weather motion; Still draws nothing that moves. No flashing or shaking; nothing changes faster than about once a second except a walking step.
- **Art:** the existing palette (`src/render/art/palette.js`), flat illustrated, warm lit faces against cool lavender shade; every new slot has bounds, a `footShadow` or `contactShadow`, and the 9.3 bar primitives where a wall or a face is drawn; the `OWED` list in `tests/v93/p/bar.test.js` ends empty and `EXEMPT` gains no slot.
- **Ask Josh before every push.**

## Process

- **Branch:** `version-10-0` (holds the specs and this plan).
- **Worktrees:** tracks run in `C:\dev\thebes-v100-<letter>`, cut from `version-10-0` after Track 0 is approved. The controller merges them with `git merge -F <file>`.
- **Models:** Opus for Track 0, Track L, Track P, the merges and the final review; Sonnet for F, D, Q, M, the reviewers and the fix wave. Josh orchestrates on Opus.
- **Per track:** the implementer writes, then a Sonnet reviewer checks it against the spec and the bar; at most two fix rounds; before-and-after screenshots for every visible change, named `v100-<track>-<what>-<before|after>-<WxH>-t<text>.png` in `docs/superpowers/notes/screenshots/raw/v100/` (gitignored), with contact sheets by `tools/contact.py` committed to `notes/screenshots/`.
- **Tests:** new tests go in `tests/v100/<track>/`, each folder with its own `all.js`; `tests/v100/all.js` imports each folder's `all.js`; `tests/all.js` imports `./v100/all.js` once, after `./v931/all.js`; describe names start `v100 <track>`.

### Waves

| Wave | Work | Model | Depends on |
|---|---|---|---|
| 0 | The seams: `holdInMap`, the LIFE budget and dropper, the figure-kind registry entries and id ranges, the dev scenes, the phone frame test with today's numbers, the test wiring; **then STOP for Josh** | Opus | spec |
| 1 | F the first view · D the desktop scale · Q the quality pass | Sonnet ×3 | wave 0 approved |
| 2 | L life and motion · P performance (in parallel; P hands L its headroom numbers at its midpoint) | Opus ×2 | wave 1 merged |
| 3 | M the phone leftovers and Josh's real-device findings | Sonnet | Josh's pass done; wave 2 merged |
| 4 | Final review (Opus, graded at 390x844 and 1920x1080 under Full and Gentle, and the first view), one Sonnet fix wave split by owner, a Sonnet re-review, the docs | Opus, Sonnet | wave 3 |

### Rulings

They go in `docs/superpowers/notes/2026-11-11-version-10-0-rulings-<track>.md`. Part 31 of `notes/handoff-2026-10-11/rulings-so-far.md` is written at the docs step; the design's proposed rulings 2050-2065 are confirmed or amended there.

| Who | Range |
|---|---|
| Track 0 | 2100-2109 |
| F | 2110-2119 |
| D | 2120-2129 |
| Q | 2140-2179 |
| L | 2200-2259 |
| P | 2280-2299 |
| M | 2300-2319 |
| Wave 4 | 2320-2339 |

### File ownership

| Files | Owner |
|---|---|
| `src/render/camera.js` (`holdInMap`), `src/data/ambient.js` (`LIFE`), `src/render/v100/life.js` (the dropper and the `lifeAt` seam), `src/render/art/figures.js` (new kinds' registry entries only, drawings as placeholders of the citizen kind), `src/dev/scenes.js` (new scene names), `tests/v100/w0/*`, `tests/v100/all.js`, `tests/all.js` (one line) | Track 0 |
| `src/render/renderer.js` (`drawMapEdge` and the off-map pattern), `src/ui/cameraControl.js` (the `holdInMap` calls), `src/boot.js` (the start frame), `src/ui/scribe` row logic (`src/ui/v81/scribe.js`, the guidance-row arbiter in `src/ui/createUI.js`), `tests/v100/f/*` | F |
| `src/ui/settings.js` (`uiScaleDefault`), `css/ui.css` (the scale tokens for panel and drawer), the top bar's date (`src/ui/topbar.js` or where the date is composed), `tests/v100/d/*` | D |
| `css/ui.css` (button classes), `src/ui/dock.js`, `src/data/ui.js` (`CATEGORY_ICONS`), `src/render/art/icons.js` (new), `src/render/art/nature.js`, `figures.js` (drawings), `units.js`/`armies.js`, `river.js`, `carts.js`, boats in `v70.js` and `ferry.js`, `src/render/v90/scaffold.js` (art), `defence.js` rubble, `src/render/terrainRoads.js` (wear and kerb), `src/render/unbuilt.js` (plots), `src/render/markers.js`, `src/render/light.js` (contrast floors only), `tests/v100/q/*` | Q |
| `src/render/v100/townsfolk.js`, `crowd.js`, `riverLife.js`, `builders.js`, `night.js`, `weather.js` (new), `src/render/art/figures.js` (the new kinds' drawings and poses), `src/render/walkers.js` (processions' size), `src/render/monuments.js` (builders and the rest beat), `src/render/v90/layers.js` (`windOf` drift, the storm), `src/render/light.js` (hearths and flicker), `src/sim/lesson.js` reads only, `tests/v100/l/*` | L |
| `src/render/spriteCache.js`, `terrainBaker.js`, `chunkIndex.js`, `tests/render/stress.test.js`, `tests/v90/v/budget.test.js` (bounds), `tests/v100/p/*` | P |
| The files each finding names, `tests/v100/m/*` | M |
| `src/ui/text.js` new strings | each track under its own `// Version 10.0, Track <X>` header |
| `src/data/releases.js`, `APP_VERSION`, README, rulings Part 31, the roadmap table, the follow-ups note, the 9.3 follow-ups' C-list | the docs step only |

Where two tracks share a file (`figures.js`: Track 0 registry, Q drawings of existing kinds, L drawings of new kinds; `light.js`: Q contrast floors, L hearths; `v90/layers.js`: L only), they edit different functions. On a conflict, keep both sides and regenerate `sw-files.js`.

---

## Wave 0: the seams (rulings 2100-2109)

One Opus agent on `version-10-0` in worktree `C:\dev\thebes-v100-w0`. It ends by stopping for Josh's approval of the measured today-numbers and the budget table; no wave 1 track starts before that.

### Task 0.1: `holdInMap`, the camera held inside the map

**Files:**
- Modify: `src/render/camera.js` (`panBy`'s clamp line becomes a call; new export)
- Test: `tests/v100/w0/holdInMap.test.js`, `tests/v100/w0/all.js`, `tests/v100/all.js`
- Modify: `tests/all.js` (one import line after `./v931/all.js`)

**Interfaces:**
- **Produces** (for F and every camera write): `holdInMap(cam, view) -> cam`, clamping `cam.x` and `cam.y` to `[m, size - m]` with `m = Math.min(OFF_MAP_SHARE * halfExtentTiles(view, cam.zoom), size / 2)`, `OFF_MAP_SHARE = 0.7`; `halfExtentTiles(view, zoom)` = half the view's diagonal in tiles at the zoom (the view is a tilted rectangle in tile space, so the diagonal is the safe measure: `Math.hypot(view.width, view.height) / (2 * 64 * zoom)` in tile units along x and y, where a tile is 64 px wide at zoom 1). A camera with no `mapSize` (the title's backdrop, a test's) is returned unchanged.

- [ ] **Step 1: Write the failing tests**

```js
// tests/v100/w0/holdInMap.test.js
import { describe, it, expect } from '../../harness.js';
import { createCamera, holdInMap, panBy, OFF_MAP_SHARE } from '../../../src/render/camera.js';

const view = { width: 390, height: 844 };

describe('v100 w0 holdInMap: the centre stays a margin inside the map', () => {
  it('pulls a corner camera inward by the margin', () => {
    const cam = createCamera({ x: 0, y: 0, zoom: 1, size: 64 });
    holdInMap(cam, view);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
    expect(cam.x).toBe(cam.y);
  });
  it('leaves a centred camera alone', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1, size: 64 });
    holdInMap(cam, view);
    expect(cam.x).toBe(32); expect(cam.y).toBe(32);
  });
  it('centres a map that fits in the view', () => {
    const cam = createCamera({ x: 3, y: 60, zoom: 0.5, size: 48 });
    holdInMap(cam, { width: 2560, height: 1440 });
    expect(cam.x).toBe(24); expect(cam.y).toBe(24);
  });
  it('is what panBy applies', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1, size: 64 });
    panBy(cam, 100000, 100000);
    const held = createCamera({ x: 0, y: 0, zoom: 1, size: 64 });
    holdInMap(held, { width: 0, height: 0 });
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(OFF_MAP_SHARE).toBe(0.7);
  });
  it('leaves a camera with no map size alone', () => {
    const cam = createCamera({ x: -50, y: -50, zoom: 1 });
    holdInMap(cam, view);
    expect(cam.x).toBe(-50);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `tests/run-tests.ps1 -Grep "v100 w0" -WaitSeconds 300` (through the scratch wrapper). Expected: FAIL, `holdInMap` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/render/camera.js`, after `zoomFloor`:

```js
// Version 10.0 (Track 0, ruling 2050): the view's centre is held a margin inside the map, so at most about 30% of the screen is off-map
// (it replaces the 6.0 rule that let the centre reach the edge). The margin is OFF_MAP_SHARE of half the view's diagonal in tiles at the zoom,
// capped at half the map, so a map that fits in the view is centred. A camera with no mapSize (the title's backdrop, a test's) pans freely.
export const OFF_MAP_SHARE = 0.7;
export const halfExtentTiles = (view, zoom) => Math.hypot(view.width, view.height) / (2 * 64 * clampZoom(zoom));
export function holdInMap(cam, view) {
  if (!cam || !cam.mapSize) return cam;
  const size = cam.mapSize;
  const m = Math.min(OFF_MAP_SHARE * halfExtentTiles(view || { width: 0, height: 0 }, cam.zoom), size / 2);
  cam.x = Math.min(size - m, Math.max(m, cam.x));
  cam.y = Math.min(size - m, Math.max(m, cam.y));
  return cam;
}
```

`panBy` gains a `view` parameter with a default and replaces its clamp line: `panBy(cam, dxPx, dyPx, view = null) { ...; return view ? holdInMap(cam, view) : (cam.mapSize ? holdInMap(cam, { width: 0, height: 0 }) : cam); }` (with no view the margin is 0 and the old clamp holds, so every existing caller keeps its behaviour until Track F passes the view). `zoomAt` ends with `return holdInMap(cam, view);`.

- [ ] **Step 4: Run the tests to see them pass, then the full suite**

Run: `tests/run-tests.ps1 -Grep "v100 w0" -WaitSeconds 300`, then the full suite through the wrapper (`-WaitSeconds 1200`). Expected: ALL PASSED (the 6.0 edge tests in `tests/v60/*` still pass because `panBy` without a view keeps the old clamp).

- [ ] **Step 5: Wire the test folders and commit**

`tests/v100/w0/all.js` imports `./holdInMap.test.js`; `tests/v100/all.js` imports `./w0/all.js` with a comment `// Version 10.0 ("A living Nile"): one aggregator; each track adds its folder's all.js here, and describe names start 'v100 <track>'.`; `tests/all.js` gains `import './v100/all.js';` after the v931 line. Run `& ./tools/sw-files.ps1`. Commit: `10.0 Track 0: holdInMap, the camera held a margin inside the map (ruling 2050)`.

### Task 0.2: the LIFE budget, its dropper and the `lifeAt` seam

**Files:**
- Modify: `src/data/ambient.js` (the `LIFE` export)
- Create: `src/render/v100/life.js`
- Test: `tests/v100/w0/life.test.js`

**Interfaces:**
- **Produces** (for L and P):
  - `LIFE = { budgetMs: { desktop: 1.5, phone: 1.0 }, dropOrder: ['crowd', 'river', 'idle', 'weather', 'flicker'], idleCap: { desktop: 24, phone: 16 }, crowdCap: 8, riverCap: 6, buildersPerSite: [2, 4], lineCap: 16, storm: { perYear: [1, 2], seconds: [20, 40], fromYear: 2, dustCap: 60, hazeAlpha: 0.35 }, windDriftMs: 240000, fadeMs: 1000 }` in `src/data/ambient.js`.
  - `createLife({ deviceKind, level, now })` in `src/render/v100/life.js` -> `{ sources: [], addSource(name, fn), walkers(world, timeDays, nowMs, range, motion) -> entries[], ground(g, world, range, nowMs, motion), late(g, world, range, nowMs, motion), spend(name, ms), dropped(name) -> bool, stats() }`, where each source registered by L is `{ name, walkers?, ground?, late? }` and the dropper (the `createDropper` of `src/render/v90/dropper.js`, with `LIFE.budgetMs[deviceKind]` and `LIFE.dropOrder`) decides which sources draw this frame; `deviceKind` is `spriteCache.js`'s `deviceKind()`.
  - The seam is called from `src/ui/createUI.js`: `life.walkers(...)` concatenated after `v70Walkers` in the walkers list, `life.ground` after `ambient.draw` in the `opts.ambient` lambda, and `life.late` from the late ambient closure. Track 0 wires the calls with no sources, so nothing draws until L adds one.

- [ ] **Step 1: Write the failing tests**

```js
// tests/v100/w0/life.test.js
import { describe, it, expect } from '../../harness.js';
import { LIFE } from '../../../src/data/ambient.js';
import { createLife } from '../../../src/render/v100/life.js';

describe('v100 w0 life: a budget, a dropper and a seam with no sources', () => {
  it('has the numbers the spec gives', () => {
    expect(LIFE.budgetMs).toEqual({ desktop: 1.5, phone: 1.0 });
    expect(LIFE.dropOrder).toEqual(['crowd', 'river', 'idle', 'weather', 'flicker']);
    expect(LIFE.idleCap).toEqual({ desktop: 24, phone: 16 });
  });
  it('draws nothing and returns no walkers with no sources', () => {
    const life = createLife({ deviceKind: 'phone', level: () => 'full', now: () => 0 });
    expect(life.walkers({}, 0, 0, { x0: 0, y0: 0, x1: 10, y1: 10 }, 'full')).toEqual([]);
    expect(life.stats().sources).toBe(0);
  });
  it('drops sources in order once over budget, and restores', () => {
    let t = 0;
    const life = createLife({ deviceKind: 'phone', level: () => 'full', now: () => t });
    life.addSource({ name: 'crowd', walkers: () => [{ id: 1900001, kind: 'citizen', x: 1, y: 1, dir: 0, stand: true }] });
    for (let i = 0; i < 120; i++) { life.spend('crowd', 3); t += 16; }
    expect(life.dropped('crowd')).toBe(true);
    expect(life.walkers({}, 0, t, { x0: 0, y0: 0, x1: 10, y1: 10 }, 'full')).toEqual([]);
    for (let i = 0; i < 1200; i++) { life.spend('crowd', 0.1); t += 16; }
    expect(life.dropped('crowd')).toBe(false);
  });
  it('returns no walkers under Still', () => {
    const life = createLife({ deviceKind: 'desktop', level: () => 'still', now: () => 0 });
    life.addSource({ name: 'idle', walkers: () => [{ id: 1600001, kind: 'citizen', x: 1, y: 1, dir: 0, stand: true }] });
    expect(life.walkers({}, 0, 0, { x0: 0, y0: 0, x1: 10, y1: 10 }, 'still')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to see them fail.** Expected: FAIL, `LIFE` and `createLife` do not exist.

- [ ] **Step 3: Write the implementation**

`src/data/ambient.js` gains, after `PROCESSION`:

```js
// Version 10.0 (Track 0, rulings 2057-2059): the life layer's budget (ms a frame, a running average as the v90 dropper measures it), what goes
// first when over it, and its caps. Life is render-side only: a pure function of the world, the time and a hash; it never writes the world.
export const LIFE = {
  budgetMs: { desktop: 1.5, phone: 1.0 },
  dropOrder: ['crowd', 'river', 'idle', 'weather', 'flicker'],
  idleCap: { desktop: 24, phone: 16 },
  crowdCap: 8,
  riverCap: 6,
  buildersPerSite: [2, 4],
  lineCap: 16,
  storm: { perYear: [1, 2], seconds: [20, 40], fromYear: 2, dustCap: 60, hazeAlpha: 0.35 },
  windDriftMs: 240000,
  fadeMs: 1000,
};
```

`src/render/v100/life.js`: a `createLife` that keeps `sources` in registration order, builds one `createDropper({ budgetMs: LIFE.budgetMs[deviceKind], order: LIFE.dropOrder, now })` (read `src/render/v90/dropper.js` for its exact constructor and `spend`/`dropped` names and use those; if its order is fixed at construction, pass `LIFE.dropOrder`), and whose `walkers` returns `[]` when `level() === 'still'` or `motion === 'still'`, else the concatenation of each non-dropped source's `walkers(world, timeDays, nowMs, range, motion)`; `ground` and `late` call each non-dropped source's hook inside `spend(name, ms)` timing. The createUI wiring is three lines at the places named in the interfaces block, each under `// Version 10.0 (Track 0)`.

- [ ] **Step 4: Run the tests, then the full suite.** Expected: ALL PASSED.

- [ ] **Step 5: Commit.** `10.0 Track 0: the LIFE budget, dropper and seam (rulings 2057-2059)`.

### Task 0.3: the new figure kinds and id ranges

**Files:**
- Modify: `src/render/art/figures.js` (`FIGURE_KINDS`, `FIGURE_ART` entries), `src/render/renderer.js` or the id-range comment in `src/render/wildlife.js` (the table)
- Test: `tests/v100/w0/figures.test.js`

**Interfaces:**
- **Produces** (for L and Q): `FIGURE_KINDS` gains `'child', 'goat', 'dog', 'builder', 'crocodile'`, each registered in `FIGURE_ART` with the standard bounds `[-14, -30, 14, 6]` and a placeholder draw that calls `fig(g, x, y, 'citizen')` (child and builder) or draws a flat oval in the palette's `shade` colour with a `footShadow` (goat, dog, crocodile), so every test that walks the registry passes today and L replaces the drawings. `LIFE_IDS = { townsfolk: 1600000, river: 1700000, builders: 1800000, crowd: 1900000 }` exported from `src/render/v100/life.js`.

- [ ] **Step 1: Write the failing test**

```js
// tests/v100/w0/figures.test.js
import { describe, it, expect } from '../../harness.js';
import { FIGURE_KINDS, FIGURE_ART, walkSlotFor } from '../../../src/render/art/figures.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';

describe('v100 w0 figures: the new kinds exist with bounds, a foot and walk slots', () => {
  it('registers child, goat, dog, builder and crocodile', () => {
    for (const k of ['child', 'goat', 'dog', 'builder', 'crocodile']) {
      expect(FIGURE_KINDS.includes(k)).toBe(true);
      expect(FIGURE_ART[`fig.${k}`].bounds).toEqual([-14, -30, 14, 6]);
      expect(typeof walkSlotFor(k, 0, 0)).toBe('string');
    }
  });
  it('gives life its own id ranges, apart from every other', () => {
    expect(LIFE_IDS).toEqual({ townsfolk: 1600000, river: 1700000, builders: 1800000, crowd: 1900000 });
  });
});
```

- [ ] **Step 2: Run to see it fail.** Expected: FAIL on `includes('child')`.
- [ ] **Step 3: Add the kinds and the placeholder draws** as the interfaces block says, and the id table row `1600000+ life (townsfolk 16, river 17, builders 18, crowd 19)` in the comment that lists ranges. Run `tests/render/figuresArt.test.js` and `tests/render/artBounds.test.js` too: a placeholder that draws the citizen passes the distinguishable-kinds test only if that test lists kinds explicitly; if it walks `FIGURE_KINDS`, give each placeholder a distinct tint band so the test's pixel comparison passes, and note it in the ruling.
- [ ] **Step 4: Run the tests and the full suite.** Expected: ALL PASSED.
- [ ] **Step 5: Commit.** `10.0 Track 0: the life figure kinds and id ranges (ruling 2101)`.

### Task 0.4: the dev scenes and the phone frame test with today's numbers

**Files:**
- Modify: `src/dev/scenes.js` (`V100_SCENES`: `bazaar-crowd`, `night-town`, `storm`, `wharf`, `festival-crowd`, `fresh-corner`), `tools/shots.ps1` (`-V100` switch listing those scenes at 390x844 DPR 2 and 1280x800)
- Create: `tests/v100/w0/phoneFrame.test.js`
- Create: `docs/superpowers/notes/2026-11-11-version-10-0-rulings-w0.md` with the measured table

**Interfaces:**
- **Produces:** the scenes by name through `window.__thebes.devScene('<name>')`, each building a world and placing the camera: `bazaar-crowd` a Town with a staffed bazaar at the view's centre at noon; `night-town` the same at the night phase (`lightClock` forced through the existing test hook in `light.js`); `storm` the stress city with `weather.stormAt` forced on (L fills it; Track 0 makes it the stress city at Shemu noon); `wharf` the s46 wharf scene at zoom 1.5; `festival-crowd` the `v70-festival` scene; `fresh-corner` a fresh classic city at its start camera. `tests/v100/w0/phoneFrame.test.js` measures 600 frames of the stress city and the 112 map at 390x844 DPR 2 with the phone cache budgets and prints p50 and p95 under `v100 w0 phone frame`; its bounds today are the 9.1 targets P2 (median ≤ 16.7 ms, p95 ≤ 33 ms) and P4 (median ≤ 33 ms) times 1.2 and it is expected to FAIL at 0209a40: it runs as `it.skip` with the numbers printed until Track P turns it on (the ruling records the measured numbers).

- [ ] **Step 1: Write the scenes** in the shape of the `v70-festival` entry (build the world with the same helpers, set `cam.x/y/zoom`, return 'ok'), and the `-V100` switch in `tools/shots.ps1` in the shape of `-Stage46`.
- [ ] **Step 2: Write the frame test** in the shape of `tests/render/stress.test.js` (its warm-up and timing loop), with `view = { width: 390, height: 844 }`, `DPR 2` through the canvas helper, the phone budgets (`deviceKind` forced to 'phone' through `spriteCache.js`'s test hook), 600 frames with the camera panning one tile a frame, and a `console.log` of the p50 and p95 in the test's name output. Mark the `expect` lines `it.skip` with the comment `// Track P turns these on (ruling 2062)`.
- [ ] **Step 3: Run the scenes through `tools/shots.ps1 -V100 -Tag before`** and the frame test; record p50 and p95 for the stress city and the 112 map at 390x844 DPR 2, 1280x800 DPR 1 and 1920x1080 DPR 1 in the rulings note's table beside the 9.1 targets.
- [ ] **Step 4: Run the full suite.** Expected: ALL PASSED (the skipped bounds print).
- [ ] **Step 5: Commit and STOP for Josh** with the table and the six before-shots. `10.0 Track 0: dev scenes, the phone frame test and today's numbers (rulings 2102-2104)`.

---

## Wave 1

### Track F: the first view (Sonnet, rulings 2110-2119)

**Files:** `src/ui/cameraControl.js`, `src/boot.js` (the start frame), `src/render/renderer.js` (`drawMapEdge`), a new `src/render/v100/offMap.js`, the guidance-row arbiter in `src/ui/createUI.js` and `src/ui/v81/scribe.js`, `tests/v100/f/*`, `tests/ui/mobileBudget.test.js` (one scene).

**Interfaces:** consumes `holdInMap`, `halfExtentTiles`, `OFF_MAP_SHARE` (Task 0.1). Produces `drawOffMap(g, world, cam, view, nowMs, { season, dark })` in `offMap.js`, called by `renderFrame` in place of the fill behind `drawMapEdge`; `startCamera(world, view) -> { x, y, zoom }` in `cameraControl.js` for `boot.js`.

- [ ] **Task F.1: every camera write holds.** Tests (`tests/v100/f/cameraWrites.test.js`): `jumpTo`, the tween's end, a fling's step and `fitCamera`'s result all satisfy `holdInMap` (the camera after each equals the camera after `holdInMap`); a loaded save with a camera at (0, 0) on a 64 map opens held. Implementation: `createCameraControl` gets `view` already; call `holdInMap(cam, view)` at the end of `jumpTo`, after each tween step, after each fling step, and in the save-load path where the camera is restored (`boot.js` `startGame`, find the `cam.x =` restore and follow it with the call). `panBy` callers in `cameraControl.js` pass `view`. Commit after the suite passes.
- [ ] **Task F.2: the start frame.** Test: a fresh classic city at 390x844 and 1920x1080 has the entry road's end diamond inside the map-side third of the screen and the camera satisfies `holdInMap`. Implementation: `startCamera(world, view)` = the diamond's tile, then `holdInMap`, then the diamond pushed to one third from the map edge by moving the centre `m / 2` further inward on the axis that points into the map (the entry's side is known from `world.tradeEntry`). `boot.js` uses it for a new city. Screenshot test: `fresh-corner` at both sizes counts pixels of `TERRAIN.offMap` (the off-map fill's one colour, exported by F.3) under 30% of the canvas. Commit.
- [ ] **Task F.3: the off-map ground.** Tests: `drawOffMap` draws the same pixels twice for the same inputs (seeded dunes); the fill colour `TERRAIN.offMap` differs from every terrain palette colour; the render budget tests hold with it on. Implementation in `offMap.js`: at boot bake a 256x256 pattern canvas of sparse dune strokes (`hash2(x, y, seed + SALT.dunes)`, 1 px strokes in `TERRAIN.sand` darkened 6%, about 40 a tile); each frame fill the canvas with a vertical gradient from `TERRAIN.offMap` (the sand paled 10%) at the map's rim to the haze colour (the sand blended 40% with `#E9DCC3`) 12 tiles out, then `g.fillPattern` with the dune pattern at alpha 0.5 inside the first 12 tiles, then a 1-tile soft shadow ramp inside the map's rim (`EDGE_FADE` widened to a gradient stroke of alpha 0.18 to 0); the season wash and the night tint multiply over it because it is drawn before the chunks. Under Still nothing differs (nothing moves). Before-and-after shots of `fresh-corner` on 48, 64, 80 and 112 at 390x844 and 1280x800. Commit.
- [ ] **Task F.4: the scribe in the phone budget.** Test: `tests/ui/mobileBudget.test.js` gains the scene "court letter + goal + scribe line" at 375x667 100% and 150%: at most two rows under the top bar; the scribe's bubble is in the guidance slot and the goal waits; when the alert clears, the goal returns after the bubble's time. Implementation: the guidance-row arbiter (the turn-taking of legend, tip, caption and goal from ruling 176) gains `scribe` as a participant with the highest priority while it speaks and the bubble element is placed in that row's slot on the narrow layout; `scribe.js` asks the arbiter for the slot instead of drawing its own row. Wide layout unchanged (a test asserts the desktop bubble's position is as before). Retake `sample-390`. Commit.

### Track D: the desktop scale (Sonnet, rulings 2120-2129)

**Files:** `src/ui/settings.js`, `css/ui.css`, the top bar's date composer, `tests/v100/d/*`.

**Interfaces:** produces `uiScaleDefault({ width, finePointer, coarsePointer }) -> 1 | 1.25 | 1.5` in `settings.js` and `effectiveTextSize(value, env) -> number`; the Options text-size control shows "Auto (125%)" when the stored choice is absent.

- [ ] **Task D.1: the default by width.** Tests: `uiScaleDefault({ width: 1366, finePointer: true, coarsePointer: false })` is 1; 1600 is 1.25; 2200 and 3840 are 1.5; any coarse pointer is 1; a stored `textSize` of 100 wins over a 1920 width; the Options label reads "Auto (125%)" at 1920 with no choice and "150%" with a choice. Implementation: `settings.js` keeps `textSize: null` as "no choice" (today's default 100 becomes `null` with a migration that treats a stored 100 as a choice only if the stored object has the key, else `null`); `apply` sets `--ui-scale` from `effectiveTextSize` and `root.dataset.textSize`; the Options control's first option is `Auto (<n>%)`. Commit.
- [ ] **Task D.2: the panel, drawer, minimap and title card scale.** Test: at `--ui-scale` 1.5 the computed widths of `#panel` and the drawer are 1.5x their 1.0 widths, the minimap's canvas too, and the title card's width at 1920x1080 is at least 560 px. Implementation: `--panel-w: calc(320px * var(--ui-scale))`, `--drawer-w` the same, the minimap's size token and the title card's `max-width` take the factor. Screenshots at 1920x1080 and 2560x1440 of the title, a sample city and the tray, before and after. Commit.
- [ ] **Task D.3: the top bar's date.** Test: on a wide layout the date reads `Y2 · M9 · D1` and the stat explainer's text holds "Year 2, month 9, day 1"; on the narrow layout nothing changes. Implementation in the date composer under `// Version 10.0, Track D` in `text.js`. Commit.

### Track Q: the quality pass (Sonnet, rulings 2140-2179)

**Files:** as the ownership table. **Interfaces:** consumes the 9.3 primitives; produces `src/render/art/icons.js` with `CATEGORY_ICON_DRAWS = { roads, homes, food, industry, services, defence, monuments }` (each `(g, x, y, size) => void`) and `categoryIconUrl(id, size, color) -> data URL` cached per id and size.

- [ ] **Task Q.1: one button language.** Test (`tests/v100/q/buttons.test.js`): a DOM pass over the title, the lesson card, the tray, the Layers sheet and the Demolish bar finds exactly one `.primary` per surface (the surface = the nearest `section`, `.title-card`, `.card` or `#dock`), Layers "Off" has `aria-pressed="false"` when off, and `#dock .demolish` is filled only while the Demolish tool is live. Implementation in `ui.css` and the three places that set a second primary (`grep -n "primary" src/ui/*.js` lists them). Shots of the tray, Layers and the lesson card. Commit.
- [ ] **Task Q.2: drawn dock icons.** Test: `CATEGORY_ICONS` holds no character outside ASCII; `categoryIconUrl('roads', 20, '#2B1F0E')` starts with `data:image/png` and two calls return the same string; the dock's buttons have an `img` with that src; the panel's tabs the same. Implementation: `icons.js` draws each icon with the game's own shapes (a road tile from `terrainRoads`' tile, a home from `housing.js`'s silhouette at the smallest tier, a grain ear, a pick, an ankh from `--look-ankh`'s path, a shield, a pyramid) at 20 px in ink on transparent, renders once to a canvas and `toDataURL`; `dock.js` and the panel use `img` elements; `CATEGORY_ICONS` becomes `{ roads: 'roads', ... }` ids. Shots of the dock at 390x844. Commit.
- [ ] **Task Q.3: foot shadows and the file contract.** Test: `tests/v93/n/art.test.js`'s file contract extended to the files that hold the raider chariot, elephant, raider boat, ibis, heron, hippo, wharf and charred stump (find each with `grep -rn "chariot\|elephant\|ibis\|heron\|hippo\|wharf\|stump" src/render/art`), each must call `footShadow` or `contactShadow`; the boat gets `waterShadow` (a new 3-line helper in `primitives.js`: a darker ellipse at alpha 0.25). Shots of each, before and after. Commit.
- [ ] **Task Q.4: the drawings 9.3 did not reach.** Test: `tests/v93/p/bar.test.js`'s `OWED` list is empty and `EXEMPT` unchanged. Implementation, one commit per family, each through `shadeWall`, `contactLine`, `insetOpening` or the face/shade pair for figures: nature (`nature.js`), figures and units (`figures.js`, `armies.js`), boats and ferries (`river.js`, boats in `v70.js`, `ferry.js`), carts and sleds (`carts.js`), scaffolds (`v90/scaffold.js`), walls and towers (`defence.js`), wharf and quay. Regenerate `looksheet.html` (`src/dev/looksheet.js`) before and after. Commit per family.
- [ ] **Task Q.5: ground marks.** Tests: a plot's bake draws stakes and string (the chunk's pixels differ from the bare ground at the plot's corners); a City-look road chunk has wear tracks (two darker lines along the road's axis) and a kerb shadow; a burnt tile's bake has charred timbers (three dark strokes) and an ash drift; at zoom 0.6 a street with 5 troubled buildings of one cause shows one badge. Implementation in `unbuilt.js`, `terrainRoads.js`, the rubble drawing in `defence.js`, `markers.js` (badge 20% smaller, stem 1 px, one per rolled-up cause at the far buckets using 9.2's roll-up groups). Shots before and after. Commit.
- [ ] **Task Q.6: legibility.** Test (`tests/v100/q/legibility.test.js`, with `tests/helpers/contrast.js`): every text token pair over the parchment composited with the deepest night tint and with each season's strongest wash keeps 4.5:1; the road and water colours differ by at least 25 in luminance under the deepest night. Implementation: raise the night tint's floor or the wash's cap in `light.js` and `seasons.js` only where a pair fails; the ruling records each number. Commit.
- [ ] **Task Q.7: the title and sheets.** Test: the title backdrop scene is the Capital look with a procession (`devScene('title')` asserts `lookOfRank` 3 and a procession entry); a sheet head with a 40-character name wraps inside its cartouche at 150% on 390x844 (no overflow). Shots at 390x844 and 1920x1080. Commit.

---

## Wave 2

### Track L: life and motion (Opus, rulings 2200-2259)

**Files:** as the ownership table. **Interfaces:** consumes `createLife`, `LIFE`, `LIFE_IDS` (Task 0.2, 0.3), `hash2`, `windOf`, `lightAt`, `lightShown`, `seasonAt`, the festival state (`world.danger.festivalDay`), the bazaar's stock and staff (`src/sim/bazaarFood.js` read-only), the wharf's staff, monument sites and crews (`world.monuments`), `drawMonument`'s gang layout. Produces one source per feature, each registered with `life.addSource` in `createUI.js` under `// Version 10.0, Track L`.

Every task below has the same four tests first: determinism (the same inputs give the same entries twice), no writes (a frozen world, `Object.freeze` deep, throws nowhere), the cap, and the Motion rule (Gentle: positions unchanged between two calls a second apart; Still: no entries). Then the feature's own tests. Screenshots through the Track 0 scenes, before and after, at 390x844 DPR 2 and 1280x800 under Full and Gentle.

- [ ] **Task L.1: the new figure drawings.** Replace the Task 0.3 placeholders: `child` (two poses, running and sitting), `goat` and `dog` (standing, lying), `builder` (carrying, climbing, hammering), `crocodile` (basking, sliding); poses for existing kinds: `woman.grind`, `citizen.sit`, `fisher.cast`, `woman.kneel`. Each with bounds, `footShadow`, the face/shade pair. `tests/render/figuresArt.test.js` lists them as distinguishable. Commit.
- [ ] **Task L.2: townsfolk** (`townsfolk.js`, source `idle`, ids from `LIFE_IDS.townsfolk`): for each home with residents in range, `hash2(x, y, seed + SALT.idle)` and the hour of the real-time day pick none, one or two figures at the door or yard with a pose from L.1; at night (phase `night`) none; near the bank (within 2 tiles of water, homes within 2 tiles) `woman.kneel` and `water` figures; cap `LIFE.idleCap[deviceKind]` nearest the middle first; appearance and departure fade over `LIFE.fadeMs` (the entry carries `alpha`, which `renderFrame`'s walker draw honours: add `alpha` support to the walker draw under this track if it has none). Commit.
- [ ] **Task L.3: the bazaar crowd** (`crowd.js`, source `crowd`, ids `LIFE_IDS.crowd`): a staffed bazaar with food draws `3 + Math.floor(5 * busy(hour))` figures (`busy` 1 in the morning, 0.3 at noon, 0 at night) standing around its stalls, each moving to the next stall every 6 to 10 s (game-time steps so they hold while paused); a bazaar short of food shows one figure; a plaza or garden within 3 tiles adds two `citizen.sit`. The lesson city's bazaar draws no crowd until the lesson's food step is done (`world.lesson.step` read-only; spec 5h and Q6). Cap `LIFE.crowdCap` per bazaar. Commit.
- [ ] **Task L.4: river life** (`riverLife.js`, source `river`, ids `LIFE_IDS.river`): a staffed wharf's boat out and back 2 tiles along the bank over 60 s real time with `fisher.cast` aboard; feluccas crossing at City (one) and Capital (two) between the banks at a hash-chosen crossing; herons in shallows that lift (a two-frame rise, Full) when a boat passes within 2 tiles; a crocodile basking in Shemu that slides in at dusk; a hippo surfacing once a minute in the deep channel. Cap `LIFE.riverCap`. Under Gentle boats and birds stand. Commit.
- [ ] **Task L.5: builders** (`builders.js`, source `idle` share, ids `LIFE_IDS.builders`): on each active monument site and each rising building, `LIFE.buildersPerSite` by footprint (2 for ≤ 2x2, 4 above), moving between a scaffold pole and the current course on game time with L.1's poses; a mason's strike every 3 s with a 4 px dust puff under Full; crews gain a rest beat on the first day of each game month (sled stops, haulers `citizen.sit` for a day). `drawMonument` stays within its 1 ms for 3 sites (the existing bound in `tests/stage4/*` holds); no builders on a paused crew's scaffold. Commit.
- [ ] **Task L.6: night** (`night.js`, source `flicker`): at dusk and night every home with residents gets a warm `insetOpening` glow at its door (drawn in `drawLight`'s lit-homes pass, which already knows the homes), hearth smoke from 1 in 4 homes by hash (thin, slow, reusing the smoke puff drawing with `smokeAlpha` 0.3), lamp flicker alpha ±8% over 1 to 2 s under Full only, the temple's lamps 30% brighter on a festival night, the palace's windows lighting in a 3 s sweep at dusk. `tests/v70/s/budget.test.js` holds. Commit.
- [ ] **Task L.7: weather** (`weather.js`, source `weather`): `windOf` gains the drift (`windAt(seed, nowMs)` = the seed's wind plus a sine of amplitude 25° over `LIFE.windDriftMs`; every caller of `windOf` in `ambient.js`, `v90/layers.js` and `procession.js` takes `windAt`); heat shimmer in Shemu at the noon phase over sand tiles more than 6 tiles from water (three 1 px horizontal slice offsets of the baked chunk rows at alpha 0.3, in the V layer under the V budget, Full only, never over the interface); the storm: `stormsOf(seed, year) -> [{ startDay, seconds }]` seeded, 1 or 2 a year in Shemu from year 2, never in the lesson, each 20 to 40 s of real time from the first frame after `startDay`; while it runs the wind swings 60°, `DUST` and the gust streaks scale to `LIFE.storm.dustCap`, a warm haze (the sand colour at alpha rising to `hazeAlpha` over 5 s) covers the map, figures lean (a 4° skew on the walker draw), lamps dim 30%; Gentle = the haze only; Still = nothing; the sim reads none of it. Tests: `stormsOf` deterministic, none in year 1 or with `world.lesson`, the V budget holds with a storm up (`storm` scene). Commit.
- [ ] **Task L.8: festival crowds.** `PROCESSION.max` doubles on a festival day (`start` 8, `max` 20, a second shrine after the tenth figure); a line of townsfolk (L.2's figures, `stand: true`, facing the road, cap `LIFE.lineCap`) along the procession's road within the view; the bazaar crowd joins the line; hearths light at dusk minus 60 s; the music's festival piece is cued through the existing `pieces.js` hook (the only sound change, ruling 2065). Tests: the procession's length and the line follow the festival state; the `festival-crowd` scene. Commit.
- [ ] **Task L.9: the lesson's life.** Test: during each lesson step the life kinds present are only townsfolk and hearths, and the crowd appears at the lesson bazaar only after the food step. Implementation: `createLife` reads `world.lesson` and filters sources by a `lessonOk` flag each source declares. Commit.

### Track P: performance (Opus, rulings 2280-2299)

**Files:** `spriteCache.js`, `terrainBaker.js`, `chunkIndex.js`, `tests/render/stress.test.js`, `tests/v90/v/budget.test.js`, `tests/v100/w0/phoneFrame.test.js` (turning its bounds on), `tests/v100/p/*`.

- [ ] **Task P.1: the bounds.** Turn on the phone frame test's `expect` lines; set `stress.test.js`'s median bound to the 9.1 P2 target times 1.2 at 1280x800 scaled by the Track 0 ratio between 1280x800 and 390x844 DPR 2 (the ruling states both numbers); `budget.test.js`'s 112 bound likewise from P4. They fail. Commit the failing bounds with the ruling (`it` not `it.skip`; the suite is red until P.4, so P runs on its own worktree and the controller merges only after green).
- [ ] **Task P.2: the warm band.** `spriteCache.js` gains `warmBand(world, cam, view, budgetMs)`: on a frame with no bake and under 8 ms spent, render into the cache the slots of the buildings in the chunk ring one chunk outside the view (`chunkIndex.js` gives them), at most `budgetMs` 2 a frame, nearest the view first. Test: after a warm frame and a one-chunk pan, the cache misses stay 0 (the stress test's pattern). Commit.
- [ ] **Task P.3: the far-view canvas.** At zoom ≤ 0.6 chunks bake at 2 device pixels per art pixel, not 3 (`terrainBaker.js`'s bake scale takes the zoom bucket); the chunk ceiling follows the 9.3 device rule; on a phone the bake limit drops to one a frame when the last bake took over 8 ms (ruling 1919's cap). Tests: a 112 map far view's canvas bytes at DPR 2 under 64 MB (P3's number); `tests/v93/p/caches.test.js` holds. Commit.
- [ ] **Task P.4: measure and settle.** Run the Track 0 table again on this machine; where a target is unreachable, the ruling records both numbers and the bound becomes the measured best times 1.1, never looser than today (spec Q4). Hand L the headroom numbers at this point. Commit with the table in `rulings-p.md`.

---

## Wave 3: Track M (Sonnet, rulings 2300-2319)

- [ ] **Task M.1: Josh's findings.** One task per finding in `notes/2026-11-xx-real-device-pass.md`, in its order, each with a screenshot test at the size the finding names and a commit.
- [ ] **Task M.2: the 9.3.1 could items.** One commit each, each with a screenshot test at 375x667 or 390x844 at 100% and 150%: C12 (a double tap zooms without selecting: the tap handler waits the double-tap window before selecting when zoom is on), C7 (the lesson's first road bar text drops the bridge sentence while `world.lesson` is on its road step), C14 (the tray folds to one row while placing at 150% on a screen under 700 px tall), C13 (the New city card's difficulty row scrolls into view at 150%), S14 (iOS: `touch-action: none` on the bars and the pinch handler ignores two-finger touches that start on a bar), the Ground legend's words at 150% (the legend wraps instead of hiding), F6 (the sideways lesson row's ring stays inside 375 px: the ring's x is clamped to the viewport minus its radius), S8 (sticky City page tabs, one title), C5 (the menu's Continue outlined), C6 (a toast waits while the Paused tag shows in the same corner). Update the C-list in the 9.3 follow-ups note. Commit.

---

## Wave 4: the final review, the fix wave and the docs (rulings 2320-2339)

- [ ] **The final review (Opus):** grades the look and the life at 390x844 DPR 2 and 1920x1080 under Full and Gentle on the Track 0 scenes, the first view on a fresh city at three sizes, the budgets' table, and the first two hours' first view as a new player; it checks the words against the sim (a caption may not say what the sim does not do) and lists findings by owner.
- [ ] **The fix wave (Sonnet, split by owner, at most one round), then a Sonnet re-review.**
- [ ] **The docs:** `src/data/releases.js` (the 10.0 entry: "A living Nile"), `APP_VERSION` '10.0', README (the scenes and the LIFE budget in Tools), `notes/2026-11-xx-version-10-0-followups.md` (the before-and-after table at three sizes, the real-device findings, what was left), rulings Part 31 in `rulings-so-far.md` (2050-2065 confirmed or amended, then each track's), the roadmap's section 6 table unchanged, the 9.3 follow-ups' C-list updated. `& ./tools/sw-files.ps1`, the full suite, the guard, then STOP: Josh pushes.

---

## Self-review against the spec

- **Coverage:** spec 2a-2c = F.1-F.4; 3 = D.1-D.3; 4a-4g = Q.1-Q.7; 5a-5h = L.2-L.9 with L.1 the art; 6 = P.1-P.4 and Task 0.4; 7 = M.1-M.2; 8 = the process, waves and docs; 9 holds by the global constraints; 10's questions take their recommended answers (Q1 LIFE 1.5/1.0; Q2 the five kinds; Q3 the storm in, cut first; Q4 the bounds rule in P.4; Q5 the wave order; Q6 the lesson bazaar in L.3).
- **Names used across tasks:** `holdInMap`, `halfExtentTiles`, `OFF_MAP_SHARE` (0.1 → F); `LIFE`, `createLife`, `addSource`, `spend`, `dropped`, `LIFE_IDS` (0.2, 0.3 → L, P); `drawOffMap`, `TERRAIN.offMap`, `startCamera` (F); `uiScaleDefault`, `effectiveTextSize` (D); `CATEGORY_ICON_DRAWS`, `categoryIconUrl`, `waterShadow` (Q); `windAt`, `stormsOf` (L); `warmBand` (P).
- **Placeholders:** none; where a task says "find with grep" it gives the grep.
