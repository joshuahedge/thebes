# Thebes 9.3, the visual half ("A city that grows"): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The city's buildings, streets and ground step up through four looks as it ranks up and rebuild outward from the centre. Homes get variety, services show whether they work, tiles blend, and every existing drawing is redrawn once at a richer flat bar.

**Architecture:**
- **Looks are worked out at draw time.** A pure helper `src/render/looks.js` reads the world: rank days from `world.splits`, distance from a memoised centre. It gives each tile and building its look (0 Village, 1 Town, 2 City, 3 Capital). The sim never reads it.
- **Slot keys carry the extras.** `slotFor` appends the look, a home's variant and a service's state to the slot key. The registry builds those slots from draw functions that take `{ look, variant, state }`, so the sprite cache works unchanged.
- **Ground work is baked.** Blending, yards, paths and street details go into the terrain chunk bake, whose signature gains the inputs.

**Tech stack:**
- Plain ES modules, canvas 2D, no build step.
- Tests on the in-repo harness (`tests/harness.js`), run in headless Edge by `tests/run-tests.ps1`, through the scratch suite wrapper.

**Spec:** `docs/superpowers/specs/2026-11-10-thebes-version-9-3-a-city-that-grows-design.md`. Read it with this plan.

**The decree:** this plan is the visual half of 9.3. The weekly decree (roadmap `specs/2026-10-27-thebes-v9-roadmap-design.md` section 5) has no design yet. It gets its own design session and plan, and its tracks join wave 1 beside these. See "The decree's slot" below.

## Global Constraints

- **Identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com` in the branch and every worktree.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - The guard script (scratch `guard.sh <worktree>`) prints GUARD OK before every commit. Before a push, `guard.sh <wt> --push` also checks the unpushed commits.
  - Never write Josh's employer's name anywhere, including briefs.
  - Josh's friend is "a friend".
- **Tests and build:**
  - The full suite prints ALL PASSED before every commit. A frame-budget test that fails only under load and passes alone counts, and is reported.
  - After any change to `src/`, `css/`, `index.html` or `assets/`, run `Set-Location <worktree>; & ./tools/sw-files.ps1` in PowerShell.
  - Stage files by path; never commit `.superpowers/`.
  - No shell heredoc, echo, sed or python on repo files: use the Edit/Write tools.
- **Merging:** never `git checkout --ours/--theirs` a whole file. Resolve with `git merge-file --ours <ours> <base> <theirs>` against the true base, or by hand.
- **Saves and the sim:**
  - Old saves (8.4, 9.0, 9.1, 9.2, with or without a lesson city) open as they were. `WORLD_VERSION` stays 12, and new world or building fields are optional.
  - The sim stays deterministic (no `Math.random`, `Date`, `performance.now` in `src/sim`). Visual noise is seeded too: a hash of the map seed and tile, so a map always draws the same.
- **Words:** "Pharaoh" in no game text. New strings only under `// Version 9.3, Track <X>` in `src/ui/text.js`. Words follow the glossary in `docs/superpowers/notes/2026-11-08-version-9-2-rulings-w.md`.
- **Not in scope:** no colour-blind patterns, tests or settings.
- **Frame bounds:** no frame-budget bound is loosened. Cache caps change only by ruling with a measurement (spec section 7).
- **Motion:** no flashing or shaking. The level-up sweep is skipped under reduced motion.
- **Art style:**
  - the existing palette (`src/render/art/palette.js`), flat illustrated, warm lit faces against cool lavender shade;
  - no textures or painterly edges;
  - every drawing reaches the bar through the new primitives.
- **Ask Josh before every push.**

## Process

- **Branch:** `version-9-3` (holds the spec and this plan).
- **Worktrees:** tracks run in `C:\dev\thebes-v93-<letter>`, cut from `version-9-3` after wave 0 is approved. The controller merges them with `git merge -F <file>`.
- **Models:** Sonnet for wave 0, every track, the reviewers and the fix wave. Opus for the final review and any merge Sonnet cannot settle.
- **Per track:**
  - the implementer writes, then a Sonnet reviewer checks it against the spec and the bar;
  - at most two fix rounds;
  - before-and-after screenshots for every change, named `v93-<track>-<what>-<before|after>-<WxH>-t<text>.png` in `docs/superpowers/notes/screenshots/raw/v93/` (gitignored).
- **One full suite on the machine at a time,** through the scratch wrapper (lock file). Tracks iterate with `-Grep "v93 <x>"`.
- **Tests:**
  - **Folders:** new tests go in `tests/v93/<track>/`, each folder with its own `all.js`.
  - **Wiring:** `tests/v93/all.js` imports each folder's `all.js`, and `tests/all.js` imports `./v93/all.js` once, after `./v92/all.js`.
  - **Names:** describe names start `v93 <track>`.

### Waves

| Wave | Work | Model | Depends on |
|---|---|---|---|
| 0 | Looks, slot keys, materials, primitives, the building's day, the look sheet; **then STOP for Josh** | Sonnet | spec |
| 1 | H homes · B services, workshops, landmarks · G ground, yards, streets · N the rest of the art · M the rebuild and the moment (and the decree's tracks) | Sonnet ×5 | wave 0 approved |
| 2 | Merge H, B, G, N, M (and the decree); P: measure and set the caches | controller, Sonnet | wave 1 |
| 3 | Final review (Opus, graded at 390x844 and 1280x800), one Sonnet fix wave split by owner, a Sonnet re-review, the docs | Opus, Sonnet | wave 2 |

### Rulings

They go in `docs/superpowers/notes/2026-11-10-version-9-3-rulings-<track>.md`. Part 30 of `notes/handoff-2026-10-11/rulings-so-far.md` is written at the docs step.

| Who | Range |
|---|---|
| Wave 0 | 1885–1889 |
| H | 1890–1899 |
| B | 1900–1909 |
| G | 1910–1919 |
| N | 1920–1929 |
| M | 1930–1934 |
| P | 1935–1939 |
| Wave 3 | 1940–1949 |
| The decree | 1950 on |

### File ownership

| Files | Owner |
|---|---|
| `src/render/looks.js`, `src/render/art/materials.js`, `src/render/art/primitives.js` (new helpers only), `src/render/art/registry.js` (`slotFor`, `withLooks`), `src/sim/world.js` (`makeBuilding`'s optional `day`), `src/dev/looksheet.js`, `tests/v93/w0/*`, `tests/v93/all.js`, `tests/all.js` (one line) | wave 0 |
| `src/render/art/housing.js`, the far-zoom home drawing, `tests/v93/h/*` | H |
| `src/render/art/services.js`, `industry.js`, `supply.js`, `stages.js`, `defence.js` (buildings, not rubble or wrecks), `trade.js`, `s46.js`, `s47.js`, `v70.js` and `ferry.js` (buildings only), `tests/v93/b/*` | B |
| `src/render/terrainBaker.js`, `grass.js`, `terrainWater.js`, `terrainRoads.js`, `rockBelts.js`, `hills.js`, `unbuilt.js`, a new `src/render/yards.js`, `tests/v93/g/*` | G |
| `src/render/art/palace.js`, `monuments.js` (art only), `nature.js`, `figures.js`, `armies.js`, `river.js`, `carts.js`, `plaza.js`, `seasons.js`, `defence.js` rubble and wrecks, boats in `v70.js` and `ferry.js`, `tests/v93/n/*` | N |
| `src/render/v90/scaffold.js`, the sweep (new `src/render/v93/sweep.js`), the rank-up notice's line (`src/ui/text.js` Track M section and the notice's caller), `tests/v93/m/*` | M |
| `src/render/spriteCache.js` and `terrainBaker.js` caps, `tests/v93/p/*` | P (wave 2) |
| `src/ui/text.js` new strings | each track under its own `// Version 9.3, Track <X>` header |
| `src/data/releases.js`, `APP_VERSION`, README, rulings Part 30, the roadmap table, the follow-ups note | the docs step only |

Where two tracks share a file (`defence.js`: B buildings, N rubble and wrecks; `v70.js` and `ferry.js`: B buildings, N boats), they edit different functions. On a conflict, keep both sides and regenerate `sw-files.js`.

### The decree's slot

- **Now planned (10 Nov).**
  - The spec is `specs/2026-11-10-thebes-version-9-3-the-weekly-decree-design.md`, and the plan is `plans/2026-11-10-thebes-version-9-3-the-weekly-decree.md`.
  - D0 runs beside wave 0 and does not wait for the look sheet. R, S and U run in wave 1. K runs in wave 2 after the merge.
  - "Pharaoh's levy" is renamed The Vizier's Levy.
  - The text below is kept as it was written.
- **Was: not planned here.** The decree needs its own design (the twists, the weekly seed, the second save slot, the fixed length, the scoring and the ruler-list mark, the rivals by link). Its plan then adds its tracks to wave 1 with its own file ownership, and those tracks own `src/sim`, `src/save` and the decree's UI.
- **No overlap:** this plan's tracks touch none of those files, except wave 0's optional `day` on `makeBuilding`.
- **Words:** the roadmap's "Pharaoh's levy" needs a new name (ruling 379).

---

## Wave 0: the seams and the look sheet (rulings 1885–1889)

One Sonnet agent, on `version-9-3` in worktree `C:\dev\thebes-v93-w0`. It ends by stopping for Josh's approval of the look sheet; no wave 1 track starts before that.

### Task 0.1: `lookOf`, the look of a tile or a building

**Files:**
- Create: `src/render/looks.js`
- Test: `tests/v93/w0/looks.test.js`, `tests/v93/w0/all.js`, `tests/v93/all.js`
- Modify: `tests/all.js` (one import line after `./v92/all.js`)

**Interfaces:**
- **Produces** (for every later track):
  - `LOOKS = ['village', 'town', 'city', 'capital']`;
  - `lookOfRank(rankId) -> 0..3`;
  - `lookCentre(world) -> { cx, cy, dMax }`;
  - `lookAt(world, x, y) -> 0..3` (a tile);
  - `lookOfBuilding(world, b) -> 0..3`;
  - `REBUILD_DAYS = 120`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/v93/w0/looks.test.js
import { describe, it, expect } from '../../harness.js';
import { LOOKS, lookOfRank, lookCentre, lookAt, lookOfBuilding, REBUILD_DAYS } from '../../../src/render/looks.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };

describe('v93 w0 looks: a look for each rank, and a rebuild from the centre', () => {
  it('folds the eight ranks into four looks', () => {
    expect(LOOKS).toEqual(['village', 'town', 'city', 'capital']);
    expect(['village', 'town', 'market_town', 'city', 'great_city', 'capital', 'great_capital', 'seat'].map(lookOfRank)).toEqual([0, 1, 1, 2, 2, 3, 3, 3]);
  });
  it('centres on the palace when one stands, else on the built-up area', () => {
    const w = makeTestWorld();
    put(w, 'house', 10, 10); put(w, 'house', 20, 10);
    expect([lookCentre(w).cx, lookCentre(w).cy]).toEqual([15.5, 10.5]);
    const p = put(w, 'palace', 30, 30);
    const c = lookCentre(w);
    expect([c.cx, c.cy]).toEqual([p.x + p.w / 2, p.y + p.d / 2]);
  });
  it('a Village is all Village; a fresh Town is Town at the centre and Village at the edge', () => {
    const w = makeTestWorld();
    put(w, 'house', 10, 10); put(w, 'house', 20, 10); const far = put(w, 'house', 30, 10);   // centre (20.5, 10.5), dMax 10
    expect(lookAt(w, 20.5, 10.5)).toBe(0);
    w.milestone = 'town'; w.splits.town = w.day;
    expect(lookAt(w, 20.5, 10.5)).toBe(1);                  // the centre takes the look on the day
    expect(lookOfBuilding(w, far)).toBe(0);                 // the edge waits
    w.day += REBUILD_DAYS;
    expect(lookOfBuilding(w, far)).toBe(1);                 // 4 months on, the edge has it
  });
  it('a rank with no recorded day counts as fully rebuilt (a city from before Stage 3)', () => {
    const w = makeTestWorld();
    const far = put(w, 'house', 40, 40); put(w, 'house', 5, 5);
    w.milestone = 'city'; delete w.splits.town; delete w.splits.city;
    expect(lookOfBuilding(w, far)).toBe(2);
  });
  it('a building placed after the rank-up starts in the current look', () => {
    const w = makeTestWorld();
    put(w, 'house', 5, 5); put(w, 'house', 6, 5);
    w.milestone = 'town'; w.splits.town = w.day;
    w.day += 1;
    const late = put(w, 'house', 40, 40);
    expect(lookOfBuilding(w, late)).toBe(1);
  });
  it('a paused city does not move: the look depends on the day alone', () => {
    const w = makeTestWorld();
    put(w, 'house', 5, 5); const far = put(w, 'house', 30, 30);
    w.milestone = 'town'; w.splits.town = w.day;
    const a = lookOfBuilding(w, far), b = lookOfBuilding(w, far);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail.** Run `timeout 900 powershell -NoProfile -File "<S>\suite.ps1" -Root 'C:\dev\thebes-v93-w0' -Grep "v93 w0 looks" -WaitSeconds 600` in the background. Expected: FAIL, because the module `src/render/looks.js` does not exist.

- [ ] **Step 3: Write `src/render/looks.js`**

```js
// Version 9.3 (spec section 3, ruling 1885): the look of a tile or a building, worked out at draw time from the world. The eight ranks fold into four
// looks; when a rank brings a new look, it spreads from the centre (the palace, else the built-up area's middle) and reaches the farthest building
// REBUILD_DAYS after the rank-up (world.splits keeps the day each rank was first reached; a rank never falls). Pure: the sim never reads it.
import { MILESTONES } from '../data/progression.js';
import { allBuildings, buildingsVersion } from '../sim/world.js';
import { DAYS_PER_MONTH } from '../sim/time.js';

export const LOOKS = ['village', 'town', 'city', 'capital'];
const FIRST_RANK = ['village', 'town', 'city', 'capital'];          // the rank that brings each look
export const REBUILD_DAYS = 4 * DAYS_PER_MONTH;

const rankIndex = (id) => MILESTONES.findIndex((m) => m.id === id);
export function lookOfRank(rankId) {
  const i = rankIndex(rankId);
  for (let look = FIRST_RANK.length - 1; look > 0; look--) if (i >= rankIndex(FIRST_RANK[look])) return look;
  return 0;
}

const centres = new WeakMap();   // world -> { version, cx, cy, dMax }
export function lookCentre(world) {
  const v = buildingsVersion(world);
  const held = centres.get(world);
  if (held && held.version === v) return held;
  const list = allBuildings(world);
  const palace = list.find((b) => b.type === 'palace');
  let cx = 0, cy = 0;
  if (palace) { cx = palace.x + palace.w / 2; cy = palace.y + palace.d / 2; }
  else if (list.length) {
    for (const b of list) { cx += b.x + b.w / 2; cy += b.y + b.d / 2; }
    cx /= list.length; cy /= list.length;
  }
  let dMax = 0;
  for (const b of list) dMax = Math.max(dMax, Math.hypot(b.x + b.w / 2 - cx, b.y + b.d / 2 - cy));
  const out = { version: v, cx, cy, dMax };
  centres.set(world, out);
  return out;
}

// The newest look whose front has reached (x, y). A look whose rank has no recorded day counts as fully rebuilt.
export function lookAt(world, x, y) {
  const top = lookOfRank(world.milestone);
  if (top === 0) return 0;
  const { cx, cy, dMax } = lookCentre(world);
  const share = dMax > 0 ? Math.min(1, Math.hypot(x - cx, y - cy) / dMax) : 0;
  for (let look = top; look > 0; look--) {
    const day = world.splits && world.splits[FIRST_RANK[look]];
    if (!Number.isInteger(day)) return look;
    if (world.day >= day + share * REBUILD_DAYS) return look;
  }
  return 0;
}

// A building's look: its centre's, unless it was placed after its rank's look arrived (b.day, Task 0.2), when it starts current.
export function lookOfBuilding(world, b) {
  const top = lookOfRank(world.milestone);
  const day = world.splits && world.splits[FIRST_RANK[top]];
  if (top > 0 && Number.isInteger(b.day) && Number.isInteger(day) && b.day > day) return top;
  return lookAt(world, b.x + b.w / 2, b.y + b.d / 2);
}
```

- [ ] **Step 4: Run the tests and see them pass.** The same command. Expected: `v93 w0 looks` 6 passed. The "placed after" test passes only after Task 0.2, so mark it with a note until then, or do Task 0.2 first.

- [ ] **Step 5: Wire the folders.** `tests/v93/w0/all.js` imports `./looks.test.js`. `tests/v93/all.js` imports `./w0/all.js`. Add `import './v93/all.js';` to `tests/all.js` after the v92 line.

- [ ] **Step 6: Commit** after the guard, with the message `9.3 wave 0: lookOf, the look of a tile or a building (ruling 1885)`.

### Task 0.2: the building's day (optional field)

**Files:**
- Modify: `src/sim/world.js` (`makeBuilding`: `day: world.day`)
- Test: `tests/v93/w0/day.test.js`

**Interfaces:**
- **Produces:** `b.day`, an optional integer, the game day the building was placed. It is absent on buildings from older saves.

- [ ] **Step 1: Write the failing test.** A new building has `day === world.day`. A world packed and unpacked through the save code keeps it. A 9.2 save (`tests/v84/r` old-save fixtures) loads with no `day` and validates.

```js
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding } from '../../../src/sim/world.js';
describe('v93 w0 day: a building knows the day it was placed', () => {
  it('stamps the day on a new building; an older one has none', () => {
    const w = makeTestWorld(); w.day = 77;
    expect(makeBuilding(w, 'house', 3, 3).day).toBe(77);
    const old = makeBuilding(w, 'house', 4, 3); delete old.day;
    expect(old.day).toBe(undefined);
  });
});
```

- [ ] **Step 2: Run it and see it fail** (`day` is undefined).
- [ ] **Step 3: Add `day: world.day` to the object literal in `makeBuilding`** (`src/sim/world.js:220`), with a comment naming ruling 1886.
- [ ] **Step 4: Run it, plus the old-save groups** (`-Grep "old saves"`, `-Grep "validate"`, `-Grep "migrate"`), and see them pass. If `validateWorld` rejects an unknown building field, allow `day` as an optional integer there, in the same commit.
- [ ] **Step 5: Commit:** `9.3 wave 0: a building keeps the day it was placed (optional; ruling 1886)`.

### Task 0.3: slot keys with look, variant and state

**Files:**
- Modify: `src/render/art/registry.js` (`slotFor`, a new `withLooks`)
- Test: `tests/v93/w0/slots.test.js`

**Interfaces:**
- **Consumes:** `lookOfBuilding` (Task 0.1).
- **Produces:**
  - `withLooks(table, { looks = true, variants = 1, states = false })`: it expands each entry whose `draw` takes a fourth argument `opt = { look, variant, state }` into the keys `${slot}.l${look}` (and `.v${variant}`, `.${state}` where asked). Each expanded key keeps its own `bounds`, `height` and `shadows`, which an entry may give per look as `boundsFor(look)`.
  - `homeVariant(b) -> 0..2`, a hash of the tile.
  - `serviceState(b) -> 'work' | 'short' | 'shut'`.
  - `slotFor(b, world)` appends `.l${lookOfBuilding(world, b)}` (with a world) for every type a track has expanded, `.v${n}` for homes, and `.${state}` for services and workshops. A type a track has not yet expanded keeps today's key. The tracks register expansion by putting their table through `withLooks`.

- [ ] **Step 1: Write the failing test.** A fake table entry, with a `draw(g, x, y, opt)` that records `opt`, put through `withLooks(..., { variants: 3, states: true })`, gives exactly the 4 × 3 × 3 keys, and each key's draw receives its own `opt`. `homeVariant` is stable for a tile and spreads over 0..2 on a 10x10 block (each value at least 20 times). `serviceState` gives `shut` for `staff 0` or `paused`, `short` for `0 < staff < workers`, and `work` at full staff. `slotFor` of a house of tier 3 at look 2, variant 1 is `house.t3.v1.l2` once housing is expanded, and `house.t3` before.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Implement** in `registry.js`:
  - `withLooks`;
  - `homeVariant` (`((b.x * 73856093) ^ (b.y * 19349663)) >>> 0) % 3`);
  - `serviceState`, from `BUILDINGS[b.type].workers` and `b.staff`;
  - an `EXPANDED` set that `withLooks` fills;
  - in `slotFor`, the suffix logic, after today's chooser, only for types in `EXPANDED`.
  - Today's `.idle` keys for supply buildings stay as they are until Track B moves them onto `.shut`.
- [ ] **Step 4: Run it, and `-Grep "art bounds"` and `-Grep "renderer"`, and see them pass.** No slot is expanded yet, so nothing visible changes.
- [ ] **Step 5: Commit:** `9.3 wave 0: slot keys carry the look, a home's variant and a service's state (ruling 1887)`.

### Task 0.4: the materials table and the new primitives

**Files:**
- Create: `src/render/art/materials.js`
- Modify: `src/render/art/primitives.js` (new helpers only)
- Test: `tests/v93/w0/materials.test.js`

**Interfaces:**
- **Produces:**
  - `MATERIALS[look]` gives `{ wall: [lit, mid, shade], roof: [lit, mid, shade], trim, band, ground: [packed, edge], paving }`. Every value is taken from `palette.js` (MUD, WASH, STONE, SST, GOLDC, THATCH, and the accents).
  - The primitives, each drawing in art px through `g`:
    - `shadeWall(g, face, h)`: a soft top-to-base shade on a wall face;
    - `contactLine(g, footprint)`: the dark line where walls meet the ground;
    - `insetOpening(g, at, w, h, { lintel })`: a door or window set in, with an inner shadow;
    - `parapetSteps(g, top, n)`;
    - `awning(g, at, w, colour)`;
    - `cornice(g, top, colour)`;
    - `band(g, face, y, colour)`;
    - `porch(g, at, w, h)`;
    - `gildedCap(g, at, r)`.

- [ ] **Step 1: Write the failing test.**
  - Every look has every key.
  - Every colour value appears in `palette.js`'s exports: no new hex outside the palette, except where a ruling adds one to `palette.js` itself.
  - Each primitive draws inside the bounds it is given. Use the `tests/render/artBounds.test.js` pattern on a 40x60 test canvas.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Implement** `materials.js` and the primitives. Shade and lines follow `primitives.js`'s existing `OUTLINE`, `INK` and `SHADOW`. Silhouette lines are 1.0 px; inner lines stay at 0.6 px and 32%.
- [ ] **Step 4: Run it and `-Grep "primitives"`, and see them pass.**
- [ ] **Step 5: Commit:** `9.3 wave 0: the materials of the four looks and the primitives of the new bar (ruling 1888)`.

### Task 0.5: the look sheet, then STOP

**Files:**
- Create: `src/dev/looksheet.js`, a dev scene at `?dev=looksheet&nosw=1`
- Modify: the dev scene list (find where `?dev=` scenes register, e.g. `src/dev/`), wave 0's own entry only
- Modify: `src/render/art/housing.js`, `src/render/art/services.js` and `src/render/art/nature.js`, only to add the reference drawings below behind `withLooks`. The tracks own these files afterwards and will redo them at the same bar.

**What the sheet shows:**
- **Columns:** the four looks, each beside today's drawing.
- **Rows:**
  - a home of tiers 1, 3, 6 and 9 (three variants of tier 3);
  - the bazaar, the granary and a kiln, working and shut;
  - a palm;
  - a figure;
  - a 6x6 patch of ground with a yard, a path, a road and a grass edge, in the Village and City looks.
- **Rendering:** at zoom 1 and 2, on parchment, with each cell labelled.

- [ ] **Step 1:** Draw the reference drawings at the bar (spec section 6), through the primitives and `MATERIALS`.
- [ ] **Step 2:** Screenshots of the sheet at 1280x800 and 390x844 (`tests/screenshot.ps1`, `timeout 150`), saved as `v93-w0-looksheet-<WxH>.png`.
- [ ] **Step 3:** The full suite prints ALL PASSED. Run sw-files. Commit: `9.3 wave 0: the look sheet (ruling 1889)`.
- [ ] **Step 4: STOP.** The controller shows Josh the sheet and asks for approval or changes. Wave 1 waits for his yes. Changes go back into this task.

---

## Wave 1 (after Josh approves the look sheet)

Each track reads the spec, this plan, the wave 0 interfaces and the look sheet. Every drawing reaches the sheet's bar. Each task below ends with its tests passing, sw-files run, and a commit after the guard. A track runs one full suite before its last commit.

### Track H: homes (rulings 1890–1899)

**Files:** `src/render/art/housing.js`, `tests/v93/h/*`. A far-zoom drawing helper may live in `housing.js`.

- [ ] **H.1 Homes in four looks.** Put `HOUSE_ART` through `withLooks(..., { variants: 3 })`.
  - **Tiers 1–5** (1x1) and **6–9** (2x2, today's `big()`) take their shape from the tier and their materials from `MATERIALS[look]`.
  - The extras by look come from spec section 2.
  - `house.lot` stays one slot.
  - **Test:** every `house.t{1..9}.v{0..2}.l{0..3}` exists and draws inside its bounds (artBounds pattern). The Capital look is not shorter than the Village look at the same tier.
- [ ] **H.2 Three variants.**
  - **What varies:** the door's face and place, the window pattern, and the roof clutter (water jars, linen, a dovecote from tier 3, a yard palm).
  - **No mirroring.**
  - **Test:** for each tier and look, the three variants' pixels differ by at least 3% of the drawn area, and the lit face is on the same side in all three (sample the mean lightness of each side face).
- [ ] **H.3 The far-zoom home.**
  - **What it is:** at zoom 0.6 and under, homes draw `house.t{n}.l{look}.far`, one plain drawing per tier and look, with no variant and no clutter.
  - **Who picks it:** the renderer through `slotFor` with the zoom passed in, or a `far` flag. Agree it with wave 0's `slotFor` signature, extending it with an optional third argument `{ far }`; H owns that small change.
  - **Test:** at zoom 0.5 a house's slot ends in `.far`; at zoom 1 it does not.
- [ ] **H.4 Screenshots.** A street of tier 3 and a block of tier 7, in each look, near and far, at 390x844 and 1280x800, at 100% and 150%. Then the full suite and a commit.

### Track B: services, workshops and landmarks (rulings 1900–1909)

**Files:** `services.js`, `industry.js`, `supply.js`, `stages.js`, `defence.js` (buildings), `trade.js`, the buildings in `s46.js`, `s47.js`, `v70.js` and `ferry.js`, `tests/v93/b/*`.

- [ ] **B.1 Every service and workshop in four looks and three states.**
  - Put each table through `withLooks(..., { states: true })`.
  - **Working:** an open, warm-lit doorway with a figure, and goods in a workshop's yard.
  - **Short:** as working, with an empty yard.
  - **Shut:** a plank door, closed shutters, no smoke, an empty yard.
  - The supply buildings' `.idle` moves onto `.shut`. Keep `.idle` as an alias that resolves to `.shut`, so older references and tests still find a slot.
  - **Test:** every expanded key exists and draws inside its bounds. A shut and a working drawing of the same type and look differ in the door's region. `ambient.js`'s smoke reads the same state, so there is no smoke when shut.
- [ ] **B.2 The eight landmarks change shape at City and at Capital.**
  - **The landmarks:** granary, bazaar, temple, kiln (potter), brickworks, weaver, well (the water supply), firehouse.
  - **The bazaar:** stalls, then a covered market, then a colonnaded one.
  - **Fill stages** (granary, storehouse, bazaar) keep working in every look.
  - **Test:** for each landmark the City and Capital silhouettes differ from the Town one, measured as the drawn area's bounding box or outline.
- [ ] **B.3 Screenshots** of each landmark in each look and state. Then the full suite and a commit.

### Track G: ground, yards and streets (rulings 1910–1919)

**Files:** `terrainBaker.js`, `grass.js`, `terrainWater.js`, `terrainRoads.js`, `rockBelts.js`, `hills.js`, `unbuilt.js`, a new `src/render/yards.js`, `tests/v93/g/*`.

- [ ] **G.1 Soft terrain edges.**
  - **The edges:** every edge between grounds (grass band, floodplain soil, rock belts, river banks) is a soft, uneven curve, from a noise seeded by `world.seed` and the tile.
  - **The detail band:** tufts at a grass edge, wet sand and reeds at the water, pebbles at rock.
  - **Tests:**
    - Baking the same chunk twice gives the same pixels.
    - On a straight diagonal edge, no edge pixel run follows the tile diagonal for more than one tile. Sample along the edge, and check the distance from the ideal diagonal varies by at least 1 art px within each tile.
- [ ] **G.2 Yards, paths and contact shadows** (`yards.js`, called from the chunk bake).
  - **Yards:** a trodden patch a little larger than each footprint, in `MATERIALS[look].ground`, merged between neighbouring homes.
  - **Paths:** a worn path to the nearest road tile.
  - **Contact shadows:** a soft shadow at the walls' base.
  - **By look:** packed earth, swept, part-paved, paved court.
  - **The chunk signature** gains each tile's building footprint edge and `lookAt`.
  - **Tests:**
    - Placing a building changes the signature and draws its yard.
    - Removing it clears the yard.
    - Two neighbouring homes share one patch: there are no sand pixels between them in the 1-tile gap.
- [ ] **G.3 Streets by look.**
  - **Road surface:** Village roads fray with wheel dust, Town gravel has a firm edge, City roads get stone kerbs (paved where a road runs between buildings), and Capital avenues are paved.
  - **Street trees and lamps:** from the City look, along built-up roads, baked.
  - **The road's look** is `lookAt` of the tile, and the signature gains it.
  - **Test:** paving and trees appear only at looks 2 and 3, and the signature changes when `world.day` crosses a tile's front.
- [ ] **G.4 Bake time.** Measure the chunk bake time before and after on the stress city. The two-bakes-a-frame rule holds, and the time goes in a ruling. Take the screenshots, then the full suite and a commit.

### Track N: the rest of the art (rulings 1920–1929)

**Files:** `palace.js`, `monuments.js` (art), `nature.js`, `figures.js`, `armies.js`, `river.js`, `carts.js`, `plaza.js`, `seasons.js`, rubble and wrecks in `defence.js`, boats in `v70.js` and `ferry.js`, `tests/v93/n/*`.

- [ ] **N.1 The quality pass on each file,** with no looks:
  - **Palace:** the five styles, each at the bar.
  - **Monuments:** each kind at the bar, while their course-by-course rise stays the same.
  - **Plaza and nature:** plaza edges; palms, trees, rocks and reeds with more shape and a contact shadow.
  - **Figures and animals:** every pose at the bar, with silhouettes kept readable at zoom 0.5.
  - **The river and boats:** carts, boats and ferries; the river's banks (with G's soft edges, which G owns).
  - **Rubble and wrecks:** Track V's charred stump stays.
- [ ] **N.2 Tests.**
  - every slot still exists, with the same keys as before;
  - each draws inside its bounds;
  - every figure pose is still cached in one pass;
  - the contract list of drawings not using the new primitives is empty for N's files.
- [ ] **N.3 Screenshots,** then the full suite and a commit.

### Track M: the rebuild and the moment (rulings 1930–1934)

**Files:** `src/render/v90/scaffold.js`, `src/render/v93/sweep.js`, the rank-up notice's caller and the `// Version 9.3, Track M` section of `text.js`, `tests/v93/m/*`.

- [ ] **M.1 Scaffolds when a building's look changes.**
  - **When:** the scaffold layer watches each visible building's `lookOfBuilding`. When it rises, the building shows the existing scaffold for one game day. On-screen sites go first, within the 8-site cap.
  - **Test:** a building whose front passes shows a scaffold for one day, and a building off-screen at that moment shows none.
- [ ] **M.2 The sweep.** `sweep.js` draws one soft gold ring from `lookCentre` outward over about 3 s on a `milestone` event that brings a new look:
  - inside the 9.0 effects' 2 ms budget, and shed first;
  - none under reduced motion;
  - none for a rank inside the same look (Market town, Great City, Great Capital, Seat);
  - the camera never moves.
  - **Test:** these four cases.
- [ ] **M.3 The notice line.** The rank-up notice gains `M93_TEXT.rebuilds`: "The city rebuilds in the new style over the next months." It shows only for a rank that brings a new look, and is at most 90 characters (T13's test covers it).
- [ ] **M.4 Screenshots** of the moment and of a city mid-rebuild. Then the full suite and a commit.

## Wave 2: merge and measure

- [ ] **Merge.** The controller merges H, B, G, N, M in that order (and the decree's tracks after its plan), each with `git merge -F`. Resolve conflicts with `merge-file --ours` against the base, never a whole-file checkout. Regenerate sw-files, and run the v93 groups on each merge.
- [ ] **P.1 Measure the caches** (rulings 1935–1939).
  - **The scenes:** the stress city (`tests/render/stress.test.js`) and the 112 map in the Capital look and mid-rebuild, at DPR 1 and 2.
  - **What to measure:** sprite and terrain bytes, eviction counts per 600 frames, and frame p50 and p95.
  - **Then:** set `SPRITE_BUDGET_BYTES` and `CACHES_BUDGET_BYTES` by device (desktop and phone, by `navigator.deviceMemory` where reported, else by screen width). The proposal is 32 MB and 24 MB for sprites.
  - **Test:** no frame bound loosened, and evictions under 5% of draws in each scene.
- [ ] **P.2 The bar's contract** (`tests/v93/p/bar.test.js`).
  - **What it checks:** across every art file, every building and asset drawing goes through the new primitives (`shadeWall`, `contactLine`, `insetOpening` where it has openings).
  - **How:** wave 0's primitives count their calls in a test hook. The test draws every slot once and lists any slot that called none.
  - **Pass:** the list is empty, or each entry is named in a ruling with why (a reed, a ripple).
- [ ] **The full suite** on the merged branch prints ALL PASSED.

## Wave 3: review, fix, docs

- [ ] **Final review (Opus):**
  - the whole diff against the spec;
  - the bar checked on the look sheet's subjects;
  - usability and readability graded at 390x844 and 1280x800, at 100% and 150%: a Village, a Town mid-rebuild, a City, a Capital, far and near;
  - frame numbers.
  - Findings go to the scratch `review-final.md` by owner.
- [ ] **One Sonnet fix wave** split by file ownership, then a Sonnet re-review.
- [ ] **Docs:**
  - the 9.3 What's new entry (with the decree's), with 9.2's build set to `853310a`;
  - `APP_VERSION` '9.3';
  - the README;
  - rulings Part 30;
  - the follow-ups note, carrying the real-phone list and adding "does the tab reload on a Capital mid-rebuild?";
  - the roadmap table.
- [ ] **Merge to main,** run the full suite on main, then guard `--push`. **Ask Josh before pushing.**
