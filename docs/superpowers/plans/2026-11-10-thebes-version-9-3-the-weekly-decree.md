# Thebes 9.3, the weekly decree: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every week every player gets the same map with one decree, or a pair every fourth week. The run lasts 6 years in its own save slot and scores the five parts plus the decree's bonus part. The best run per week joins the ruler list, and friends compare by link.

**Architecture:**
- **Decrees are data.** `src/data/decrees.js` holds the table, the order and the pairs. The pure week helpers in `src/ui/week.js` turn a date into a week key, a seed and its decrees.
- **The sim reads every twist through `src/sim/rules.js`.** `ruleFactor` is the heir's factor times the decree's. With no `world.decree`, each rule function gives exactly today's number.
- **Boot runs a decree game the way it runs the lesson** (`current.decree`), saving to a second slot of the same store.

**Tech stack:**
- Plain ES modules, canvas 2D, no build step.
- Tests on the in-repo harness (`tests/harness.js`), run in headless Edge by `tests/run-tests.ps1`, through the scratch suite wrapper.

**Spec:** `docs/superpowers/specs/2026-11-10-thebes-version-9-3-the-weekly-decree-design.md`. Read it with this plan.

**The visual half:** `plans/2026-11-10-thebes-version-9-3-a-city-that-grows.md`.
- That plan's process, waves, merge rules, test wiring and global constraints hold here too. This plan lists only what differs or adds.
- The decree's tracks join that plan's waves:
  - D0 runs beside wave 0. It does not wait for the look sheet.
  - R, S and U run in wave 1.
  - K runs in wave 2 after the merge.

## Global Constraints

Everything in the visual plan's Global Constraints, plus:

- **The main game:**
  - With no `world.decree`, every rule function returns the number the game reads today.
  - The golden fingerprint (Task D0.3) must match on every commit of every track.
- **Saves:**
  - `WORLD_VERSION` stays 12, and `world.decree` and the new tally keys are optional.
  - The main save slot's keys and format do not change.
  - Records go to version 3; a version 2 blob reads with `decrees: []`.
- **Score:** `SCORE_VERSION` stays 3, and `scoreOf` is unchanged. A decree score is `decreeScore(world)` and is never compared with a main-game best.
- **The date:** only `src/ui/week.js` and the interface read the date. `src/sim` never does.
- **Import cycles:**
  - `src/sim/rules.js` imports `./dynasty.js`, which imports `world.js` through others.
  - So a file that `world.js` imports (for example `flood.js`) may not import `rules.js`. It reads its decree number from the data leaf (`src/data/decrees.js` helpers that take the `world.decree` object), as `flood.js` reads `deeperLoss` today.
- **Words:**
  - "The Vizier's Levy", never the roadmap's old name, and "Pharaoh" nowhere.
  - The mode is "decree" everywhere in game text, never "challenge" or "weekly".

## Process

- **Branch and worktrees:**
  - Branch `version-9-3`.
  - Worktrees `C:\dev\thebes-v93-<letter>` with letters d0, r, s, u and k.
- **Models:** Sonnet for D0, R, S, U and K and their reviewers. Opus for the final review, which is shared with the visual half's wave 3.
- **Tests:**
  - `tests/v93/<d0|r|s|u|k>/all.js`, each imported by `tests/v93/all.js`.
  - Wave 0 of the visual plan creates `tests/v93/all.js`. If D0 lands first, D0 creates it, and the other merges add their lines.
  - Describe names start `v93 <track>`.

### Waves (this plan's tracks inside the visual plan's waves)

| Wave | Decree work | Depends on |
|---|---|---|
| 0 | D0: the table, the week, `rules.js` with today's numbers, `world.decree`, the golden fingerprint | spec |
| 1 | R the rules · S saves, records, links · U the interface | D0 merged |
| 2 | Merge R, S, U after the visual tracks; K: the balance runs set bars and medals | wave 1 |
| 3 | In the visual plan's final review, fix wave and docs | wave 2 |

### Rulings

They go in `docs/superpowers/notes/2026-11-10-version-9-3-rulings-<track>.md`.

| Who | Range |
|---|---|
| D0 | 1950–1954 |
| R | 1955–1964 |
| S | 1965–1974 |
| U | 1975–1984 |
| K | 1985–1989 |

### File ownership

| Files | Owner |
|---|---|
| `src/data/decrees.js`, `src/ui/week.js`, `src/sim/rules.js` (first version), `src/sim/world.js` (`createWorld`'s `decree` option only), `tests/v93/d0/*`, `tests/v93/helpers/golden.js` | D0 |
| `src/sim/rules.js` (after D0), `costs.js`, `economy.js`, `immigration.js`, `monuments.js`, `production.js`, `trade.js`, `raids.js`, `health.js`, `fire.js`, `court.js`, `flood.js`, `armies` pay, `src/sim/score.js` (`decreeScore`, `bonusPart`, `decreeMeasure` only), the sim's step and command gate for the end, `world.js` `newTally` (two keys), `src/save/serialize.js` (tally keys optional), `tests/v93/r/*` | R |
| `src/save/store.js` (`slot`), `src/save/records.js` (v3, `decrees`, rivals' `week`), `src/save/exportImport.js` (merge), `src/ui/share.js` (`d1` links), `tests/v93/s/*` | S |
| `src/boot.js` (the decree game), `src/ui/titleCard.js` (the card), the HUD chip, the end card, the menu rows, the build menu's lock (`src/ui/placement.js` reads `ruleForbids`), the ruler list's decree rows, `src/ui/text.js` under `// Version 9.3, Track U`, `css/v93.css`, `tests/v93/u/*` | U |
| `src/data/decrees.js` bars and medals (numbers only), `tests/v93/k/*`, `tests/stage4/balance/capitalRun.js` (a `decree` option only) | K |

- **Shared with the visual plan:**
  - `src/sim/world.js`: wave 0 owns `makeBuilding`'s `day`, and D0 owns `createWorld`'s `decree`. These are different functions.
  - `src/ui/text.js`: each track writes under its own header.
- **Not shared:** U is the only decree track in `src/ui` apart from `share.js` (S) and `week.js` (D0).
- **The heirFactor importers in `src/ui`** (`monumentSheet.js`, `placement.js`, `s46/armies.js`) switch to `ruleFactor` in U, because they show the player the numbers the sim uses.

---

## Wave 0, D0: the seams (rulings 1950–1954)

### Task D0.1: the decree table and the week

**Files:**
- Create: `src/data/decrees.js`
- Create: `src/ui/week.js`
- Test: `tests/v93/d0/week.test.js`, `tests/v93/d0/all.js`

**Interfaces:**
- Produces:
  - `DECREES` (id → `{ factors, cost, rate, unitPay, reach, elephantsFrom, boatShare, floodStep, forbid, measure, bar, medals }`; every key except `measure` is optional);
  - `DECREE_ORDER` (9 ids);
  - `DECREE_PAIRS` (5 two-id arrays);
  - `DECREE` (`{ years: 6, endDay: 2160, epoch: [2026, 47] }`);
  - `floodStepOf(decree)`.
- Produces in `src/ui/week.js`:
  - `isoWeek(date)` → `{ year, week }`;
  - `weekKey(date)` → `'2026-47'`;
  - `weeklySeed(key)` → `202647`;
  - `isWeekKey(key)`;
  - `weekIndex(key)`, the weeks since the epoch (negative before it);
  - `decreesOfWeek(key)` → ids;
  - `isPairWeek(key)`.

- [ ] **Step 1: Write the failing test**

```js
// tests/v93/d0/week.test.js
import { describe, it, expect } from '../../harness.js';
import { isoWeek, weekKey, weeklySeed, isWeekKey, weekIndex, decreesOfWeek, isPairWeek } from '../../../src/ui/week.js';
import { DECREES, DECREE_ORDER, DECREE_PAIRS } from '../../../src/data/decrees.js';

describe('v93 d0 the week', () => {
  it('reads ISO weeks across a 53-week year', () => {
    expect(weekKey(new Date(2026, 10, 10))).toBe('2026-46');
    expect(weekKey(new Date(2026, 10, 16))).toBe('2026-47');
    expect(weekKey(new Date(2026, 11, 31))).toBe('2026-53');
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-53');
    expect(weekKey(new Date(2027, 0, 4))).toBe('2027-01');
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
  });
  it('gives the seed and checks keys', () => {
    expect(weeklySeed('2026-47')).toBe(202647);
    expect(isWeekKey('2026-53')).toBe(true);
    expect(isWeekKey('2027-53')).toBe(false);
    expect(isWeekKey('2026-00')).toBe(false);
    expect(isWeekKey('26-47')).toBe(false);
  });
  it('counts weeks from the epoch', () => {
    expect(weekIndex('2026-47')).toBe(0);
    expect(weekIndex('2026-46')).toBe(-1);
    expect(weekIndex('2026-53')).toBe(6);
    expect(weekIndex('2027-01')).toBe(7);
  });
  it('turns the decrees, a pair every fourth week', () => {
    expect(decreesOfWeek('2026-47')).toEqual(['sea_peoples']);
    expect(decreesOfWeek('2026-48')).toEqual(['low_nile']);
    expect(decreesOfWeek('2026-49')).toEqual(['plague']);
    expect(decreesOfWeek('2026-50')).toEqual(['low_nile', 'golden_caravans']);
    expect(isPairWeek('2026-50')).toBe(true);
    expect(decreesOfWeek('2026-51')).toEqual(['stone_famine']);
    expect(decreesOfWeek('2026-46')).toEqual(['plague', 'low_nile']);
  });
  it('repeats no decree within nine single weeks, before and after the epoch', () => {
    for (const start of [-40, -9, 0, 13, 101]) {
      const seen = [];
      for (let i = start; seen.length < 9; i++) if (((i % 4) + 4) % 4 !== 3) seen.push(decreesOfWeek(keyOfIndex(i))[0]);
      expect(new Set(seen).size).toBe(9);
    }
  });
  it('keeps the table whole', () => {
    expect(DECREE_ORDER.length).toBe(9);
    for (const id of DECREE_ORDER) expect(typeof DECREES[id].measure).toBe('string');
    for (const [a, b] of DECREE_PAIRS) { expect(Boolean(DECREES[a] && DECREES[b])).toBe(true); expect(a === b).toBe(false); }
  });
});

// The key of the week `i` weeks from the epoch (test helper: walks Mondays from 2026-11-16).
function keyOfIndex(i) { return weekKey(new Date(2026, 10, 16 + 7 * i)); }
```

```js
// tests/v93/d0/all.js
// Version 9.3 track/step 'd0': describe names start with 'v93 d0'. Add each test file here.
import './week.test.js';
```

Add `import './d0/all.js';` to `tests/v93/all.js`. If that file does not exist yet, create it with a header line and add `import './v93/all.js';` to `tests/all.js` after the v92 line.

- [ ] **Step 2: Run it to see it fail**

Run: `& <scratch>/suite.ps1 -Grep "v93 d0"`. Expected: FAIL, because the module `src/ui/week.js` is not found.

- [ ] **Step 3: Write the table**

```js
// src/data/decrees.js
// Version 9.3, the weekly decree (spec sections 1 and 5, rulings 1950-1954): the nine decrees, their order and pairs, and the run's length. A leaf: it imports nothing.
// Each decree (every key but measure optional; src/sim/rules.js reads them):
//   factors      { lever: f } multiplied into ruleFactor with the heir's (raidGap, raidSize, granaryHold, sickSpread, fireStart, courtAsk, courtReward, farms, buys, workshops)
//   cost         { building type: f } on costOf          rate     { building type: f } on a building's daily rate
//   unitPay      { unit kind: f } on a unit's pay        reach    { building type: tiles } in place of the data's reach
//   elephantsFrom  the raid index war elephants come from   boatShare  the share of raids that land by boat (at least)
//   floodStep    added to each flood's level step (-1: one step weaker)   forbid  building types that may not be built
//   measure      the bonus part's measure (src/sim/score.js decreeMeasure)   bar  the measure at which the part is 100 (Track K)
//   medals       [bronze, silver, gold] out of 600 (Track K); a pair's are in PAIR_MEDALS
export const DECREES = {
  sea_peoples: { factors: { raidGap: 0.5, raidSize: 1.5 }, cost: { wall: 0.5, gate: 0.5 }, boatShare: 0.5, measure: 'raidsBeaten', bar: 6, medals: [300, 360, 420] },
  low_nile: { factors: { farms: 0.7, granaryHold: 2 }, floodStep: -1, measure: 'fedMonths', bar: 50, medals: [300, 360, 420] },
  plague: { factors: { sickSpread: 3 }, cost: { physician: 0.5 }, measure: 'wellMonths', bar: 50, medals: [300, 360, 420] },
  stone_famine: { rate: { quarry: 0.5, brickworks: 2 }, measure: 'monumentUnits', bar: 3000, medals: [300, 360, 420] },
  vizier_levy: { factors: { courtAsk: 2, courtReward: 2 }, measure: 'requestsMet', bar: 8, medals: [300, 360, 420] },
  open_city: { forbid: ['wall', 'gate'], measure: 'raidsBeaten', bar: 4, medals: [300, 360, 420] },
  golden_caravans: { factors: { buys: 2, workshops: 0.5 }, measure: 'tradeOverBills', bar: 1, medals: [300, 360, 420] },
  fire_season: { factors: { fireStart: 3 }, reach: { firehouse: 12 }, measure: 'fireSafeMonths', bar: 60, medals: [300, 360, 420] },
  southern_host: { elephantsFrom: 2, cost: { archery_range: 0.5 }, unitPay: { archer: 0.5 }, measure: 'elephantsFelled', bar: 6, medals: [300, 360, 420] },
};
// Bars and medals above are first values; Track K sets them from the six-year runs (spec section 7).

export const DECREE_ORDER = ['sea_peoples', 'low_nile', 'plague', 'stone_famine', 'vizier_levy', 'open_city', 'golden_caravans', 'fire_season', 'southern_host'];
export const DECREE_PAIRS = [
  ['low_nile', 'golden_caravans'],
  ['sea_peoples', 'fire_season'],
  ['stone_famine', 'vizier_levy'],
  ['southern_host', 'open_city'],
  ['plague', 'low_nile'],
];
export const PAIR_MEDALS = DECREE_PAIRS.map(() => [270, 330, 390]);   // Track K

export const DECREE = { years: 6, endDay: 6 * 12 * 30, epoch: [2026, 47] };   // 2,160 days; the rotation's week 0 is 2026-W47 (Monday 16 November 2026)

// The flood's level step for a world.decree object (0 without one), here in the leaf so src/sim/flood.js may read it (it may not import rules.js).
export function floodStepOf(decree) {
  if (!decree || !Array.isArray(decree.ids)) return 0;
  return decree.ids.reduce((s, id) => s + ((DECREES[id] && DECREES[id].floodStep) || 0), 0);
}
```

- [ ] **Step 4: Write the week helpers**

```js
// src/ui/week.js
// Version 9.3, the weekly decree (spec section 1, rulings 1950-1954): the device's ISO week, its seed and its decrees. The interface reads the date; the sim never does.
import { DECREE_ORDER, DECREE_PAIRS, DECREE } from '../data/decrees.js';

const DAY = 86400000, WEEK = 7 * DAY;
const mod = (a, n) => ((a % n) + n) % n;

// The ISO week of a local date: { year, week } (6.0's helper, brought back).
export function isoWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));                   // that week's Thursday
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const thursday1 = new Date(jan4);
  thursday1.setDate(jan4.getDate() + 3 - ((jan4.getDay() + 6) % 7));      // week 1's Thursday
  return { year: d.getFullYear(), week: 1 + Math.round((d - thursday1) / WEEK) };
}

export const weekKey = (date) => { const { year, week } = isoWeek(date); return `${year}-${String(week).padStart(2, '0')}`; };
const parse = (key) => { const m = /^(\d{4})-(\d{2})$/.exec(String(key)); return m ? { year: Number(m[1]), week: Number(m[2]) } : null; };
const weeksIn = (year) => isoWeek(new Date(year, 11, 28)).week;
export const isWeekKey = (key) => { const p = parse(key); return Boolean(p) && p.week >= 1 && p.week <= weeksIn(p.year); };
export const weeklySeed = (key) => { const p = parse(key); return p ? p.year * 100 + p.week : 0; };

// The Monday (UTC ms) of an ISO year and week.
function mondayOf(year, week) {
  const jan4 = Date.UTC(year, 0, 4);
  const dow = (new Date(jan4).getUTCDay() + 6) % 7;
  return jan4 - dow * DAY + (week - 1) * WEEK;
}

// Weeks from the epoch's week (DECREE.epoch) to `key`: 0 on the epoch, negative before it; NaN for a bad key.
export function weekIndex(key) {
  if (!isWeekKey(key)) return NaN;
  const p = parse(key);
  return Math.round((mondayOf(p.year, p.week) - mondayOf(DECREE.epoch[0], DECREE.epoch[1])) / WEEK);
}

export const isPairWeek = (key) => mod(weekIndex(key), 4) === 3;

// The week's decree ids: every fourth week a pair, in DECREE_PAIRS' turn; the other weeks the next decree in DECREE_ORDER (no repeat in nine single weeks).
export function decreesOfWeek(key) {
  const i = weekIndex(key);
  if (!Number.isFinite(i)) return [];
  if (mod(i, 4) === 3) return [...DECREE_PAIRS[mod(Math.floor(i / 4), DECREE_PAIRS.length)]];
  return [DECREE_ORDER[mod(i - Math.floor((i + 1) / 4), DECREE_ORDER.length)]];
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `& <scratch>/suite.ps1 -Grep "v93 d0"`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/decrees.js src/ui/week.js tests/v93/d0/week.test.js tests/v93/d0/all.js tests/v93/all.js tests/all.js
git commit -F <msg>   # "9.3 D0: the decree table and the week (rulings 1950-1951)" + Co-Authored-By line
```

Before committing, run `tools/sw-files.ps1` and guard.

### Task D0.2: `rules.js` with today's numbers, and `world.decree`

**Files:**
- Create: `src/sim/rules.js`
- Modify: `src/sim/world.js`, `createWorld` only: a `decree` option
- Test: `tests/v93/d0/rules.test.js`

**Interfaces:**
- Consumes: `DECREES` (D0.1), and `heirFactor` (`src/sim/dynasty.js`).
- Produces:
  - `ruleFactor(world, lever)`;
  - `ruleCost(world, type)`, `ruleRate(world, type)` and `ruleUnitPay(world, kind)` (factors, 1 by default);
  - `ruleReach(world, type, base)`, `ruleElephantsFrom(world, base)` and `ruleBoatShare(world, base)`;
  - `ruleForbids(world, type)`;
  - `isDecreeRun(world)` and `decreeEnded(world)`;
  - `createWorld({ decree: { week, ids } })`, which sets `world.decree = { week, ids, endDay: DECREE.endDay, ended: false }`, `heir: 'steady'` and `difficulty: 'normal'`.

- [ ] **Step 1: Write the failing test**

```js
// tests/v93/d0/rules.test.js
import { describe, it, expect } from '../../harness.js';
import { ruleFactor, ruleCost, ruleRate, ruleUnitPay, ruleReach, ruleElephantsFrom, ruleBoatShare, ruleForbids, isDecreeRun, decreeEnded } from '../../../src/sim/rules.js';
import { heirFactor } from '../../../src/sim/dynasty.js';
import { createWorld } from '../../../src/sim/world.js';

describe('v93 d0 rules', () => {
  it('gives today\'s numbers with no decree', () => {
    const w = createWorld({ seed: 7, heir: 'builder' });
    expect(w.decree).toBe(undefined);
    for (const lever of ['crews', 'taxes', 'farms', 'raidGap', 'fireStart']) expect(ruleFactor(w, lever)).toBe(heirFactor(w, lever));
    expect(ruleCost(w, 'wall')).toBe(1); expect(ruleRate(w, 'quarry')).toBe(1); expect(ruleUnitPay(w, 'archer')).toBe(1);
    expect(ruleReach(w, 'firehouse', 8)).toBe(8); expect(ruleElephantsFrom(w, 5)).toBe(5); expect(ruleBoatShare(w, 0.2)).toBe(0.2);
    expect(ruleForbids(w, 'wall')).toBe(false); expect(isDecreeRun(w)).toBe(false); expect(decreeEnded(w)).toBe(false);
  });
  it('bends the numbers under a decree, the Steady heir and Normal for everyone', () => {
    const w = createWorld({ seed: 202647, heir: 'builder', difficulty: 'hard', decree: { week: '2026-47', ids: ['sea_peoples', 'fire_season'] } });
    expect(w.heir).toBe('steady'); expect(w.difficulty).toBe('normal');
    expect(w.decree).toEqual({ week: '2026-47', ids: ['sea_peoples', 'fire_season'], endDay: 2160, ended: false });
    expect(ruleFactor(w, 'raidGap')).toBe(0.5); expect(ruleFactor(w, 'fireStart')).toBe(3);
    expect(ruleCost(w, 'wall')).toBe(0.5); expect(ruleReach(w, 'firehouse', 8)).toBe(12); expect(ruleBoatShare(w, 0.2)).toBe(0.5);
    expect(isDecreeRun(w)).toBe(true);
  });
  it('forbids walls in an open city and ignores unknown ids', () => {
    const w = createWorld({ seed: 1, decree: { week: '2026-52', ids: ['open_city', 'nonsense'] } });
    expect(ruleForbids(w, 'wall')).toBe(true); expect(ruleForbids(w, 'gate')).toBe(true); expect(ruleForbids(w, 'tower')).toBe(false);
    expect(w.decree.ids).toEqual(['open_city']);
  });
});
```

Add `import './rules.test.js';` to `tests/v93/d0/all.js`.

- [ ] **Step 2: Run it to see it fail.** Run `-Grep "v93 d0 rules"`. Expected: FAIL, because `rules.js` is not found.

- [ ] **Step 3: Write `rules.js`**

```js
// src/sim/rules.js
// Version 9.3, the weekly decree (spec section 5, rulings 1952-1954): every twist a decree puts on the sim, read in its lever's one function. With no
// world.decree each function gives exactly what the game read before 9.3 (ruleFactor is heirFactor), so the main game plays as it did (the golden test).
// world.js and the files it imports may not import this file (dynasty.js imports world.js through score.js): they read src/data/decrees.js helpers.
import { DECREES } from '../data/decrees.js';
import { heirFactor } from './dynasty.js';

const decreesOf = (world) => (world && world.decree && Array.isArray(world.decree.ids) ? world.decree.ids.map((id) => DECREES[id]).filter(Boolean) : []);
const product = (world, key, name) => decreesOf(world).reduce((f, d) => (d[key] && typeof d[key][name] === 'number' ? f * d[key][name] : f), 1);

export const ruleFactor = (world, lever) => heirFactor(world, lever) * product(world, 'factors', lever);
export const ruleCost = (world, type) => product(world, 'cost', type);
export const ruleRate = (world, type) => product(world, 'rate', type);
export const ruleUnitPay = (world, kind) => product(world, 'unitPay', kind);
export function ruleReach(world, type, base) {
  return decreesOf(world).reduce((r, d) => (d.reach && Number.isFinite(d.reach[type]) ? Math.max(r, d.reach[type]) : r), base);
}
export const ruleElephantsFrom = (world, base) => decreesOf(world).reduce((r, d) => (Number.isInteger(d.elephantsFrom) ? Math.min(r, d.elephantsFrom) : r), base);
export const ruleBoatShare = (world, base) => decreesOf(world).reduce((r, d) => (Number.isFinite(d.boatShare) ? Math.max(r, d.boatShare) : r), base);
export const ruleForbids = (world, type) => decreesOf(world).some((d) => Array.isArray(d.forbid) && d.forbid.includes(type));
export const isDecreeRun = (world) => decreesOf(world).length > 0;
export const decreeEnded = (world) => Boolean(world && world.decree && world.decree.ended);
```

- [ ] **Step 4: Add the `decree` option to `createWorld`.** In `src/sim/world.js`:
  - Import `DECREES` and `DECREE` from `../data/decrees.js`.
  - Add `decree = null` to `createWorld`'s options.
  - Before the world object is built, add:

```js
  // Version 9.3 (the decree, ruling 1953): a decree run plays the Steady heir at Normal for everyone; world.decree is optional (WORLD_VERSION stays 12).
  const ids = decree && Array.isArray(decree.ids) ? decree.ids.filter((id) => Object.prototype.hasOwnProperty.call(DECREES, id)) : [];
  const run = ids.length && typeof decree.week === 'string' ? { week: decree.week, ids, endDay: DECREE.endDay, ended: false } : null;
  if (run) { heir = HEIR_DEFAULT; difficulty = 'normal'; }
```

  - After the object is built, add `if (run) world.decree = run;`.
  - `heir` and `difficulty` are destructured parameters, so they can be reassigned.
  - Also check that `validateWorld` (`src/save/serialize.js`) accepts an extra top-level key. If it does not, add `decree` to its optional keys, with the shape checked: `week` a string, `ids` an array of strings, `endDay` an integer and `ended` a boolean.

- [ ] **Step 5: Run it to see it pass.** Run `-Grep "v93 d0"`. Expected: PASS.

- [ ] **Step 6: Commit** ("9.3 D0: rules.js with today's numbers, and world.decree (rulings 1952-1953)").

### Task D0.3: the golden fingerprint

**Files:**
- Create: `tests/v93/helpers/golden.js`, `tests/v93/d0/golden.test.js`, `tests/v93/d0/golden.json`

**Interfaces:**
- Produces: `fingerprint(world, months)`, which takes each month end's `{ day, gold, people, milestone, parts, raids, tally }`, plus the recorded `golden.json` that tracks R, S and U must keep matching.

- [ ] **Step 1: Write the helper.** It runs `runCapital(72, { dangers: true, onMonth })` from `tests/stage4/balance/capitalRun.js`. At each month end it pushes:
  - `{ day: w.day, gold: Math.round(w.gold), people: population(w), milestone: w.milestone, parts: scoreOf(w).parts, raids: w.raids.log.length }`;
  - the `tally` with only the keys present before 9.3. For those, use `TALLY_KEYS` from `src/save/serialize.js` as it is at this commit, copied into the helper as a literal array, so the two new keys R adds never change the fingerprint.

  Read `onMonth`'s signature in `capitalRun.js` before writing it. If `w.raids.log` is named differently, use the raid record's own list.
- [ ] **Step 2: Record it.** A one-off script, `tests/v93/d0/record-golden.html`, which is not in the suite and is deleted after use, writes `JSON.stringify(fingerprint(...))`. Save the output as `golden.json`.
- [ ] **Step 3: The test.** `golden.test.js` fetches `golden.json` and compares it with a fresh fingerprint, month by month. The first difference is reported as `month N: <key> was A, now B`. Describe: `v93 d0 golden`.
- [ ] **Step 4: Run it.** It takes about as long as the capital6 helper. If both build the same run, share it: when `capital6.js` exposes the months, build the fingerprint from `capital6World()`'s run via its `onMonth`.
- [ ] **Step 5: Commit** ("9.3 D0: the main game's golden fingerprint (ruling 1954)").

---

## Wave 1

### Track R: the rules (rulings 1955–1964)

Each lever below gets the same treatment:
1. Write a test where a world with the decree changes that one number as the table says, and a world without it does not.
2. Read the number through `rules.js` at the lever's one function.
3. Run `-Grep "v93 r"` and `-Grep "v93 d0 golden"`.
4. Commit per group.

- [ ] **R.1 The heir's levers.**
  - `costs.js`, `economy.js`, `immigration.js`, `monuments.js`, `production.js` and `trade.js` import `ruleFactor` from `./rules.js` in place of `heirFactor` from `./dynasty.js`. `heirRate` reads `ruleFactor` too.
  - Tests: Low Nile's `farms` is 0.7, and Golden caravans' `buys` is 2 and `workshops` 0.5.
- [ ] **R.2 Costs.**
  - `costs.js costOf` multiplies by `ruleCost(world, type)`.
  - The unit's pay (`soldiersPayOf`) multiplies each kind's pay by `ruleUnitPay(world, kind)`.
  - Tests: Sea Peoples' wall and gate, the Plague's physician, the Southern Host's archery range and archers' pay.
- [ ] **R.3 Rates and holds.**
  - Production multiplies the quarry's and the brickworks' daily rate by `ruleRate`.
  - A granary's capacity multiplies by `ruleFactor(world, 'granaryHold')`. Find the one function that gives a store's capacity; `storeAccepts` and its callers must read it.
- [ ] **R.4 Raids.**
  - In `raids.js`, the first warning's days after the clock (`firstWarnAfterOf`), `laterMin` and `laterMax` multiply by `ruleFactor(world, 'raidGap')`. The heir's `sooner` is still subtracted, after that.
  - The band's size multiplies by `raidSize`, rounded and capped at `RAIDS.maxSize`.
  - The boat share and the elephants' first raid go through `ruleBoatShare` and `ruleElephantsFrom`, with the data's numbers as the base.
  - Seeded draws keep their salts.
- [ ] **R.5 Sickness, fire and the court.**
  - The health sim's spread chance multiplies by `sickSpread`.
  - The fire sim's daily start chance multiplies by `fireStart`.
  - The firehouse's reach is `ruleReach(world, 'firehouse', FIRE.reach)`, read wherever coverage is worked out. The overlay must agree, because U shows it.
  - `court.js` request amounts multiply by `courtAsk`, and rewards by `courtReward`.
- [ ] **R.6 The flood.** `flood.js` adds `floodStepOf(world.decree)` from `src/data/decrees.js` to the flood's level step, clamped to the levels that exist. It must not import `rules.js`.
- [ ] **R.7 Forbidden builds.**
  - The sim's place command refuses `ruleForbids(world, type)` with the reason `'decree'`.
  - `canPlace` returns that reason. U shows it.
- [ ] **R.8 The tallies.**
  - `newTally` gains `wellMonths: 0` and `fireSafeMonths: 0`.
  - The month end adds 1 to `wellMonths` when no home is sick, and 1 to `fireSafeMonths` when no building burned down that month. Find where fire losses are counted.
  - `serialize.js` treats both as optional: a save without them reads with 0. A test opens a 9.2 save.
- [ ] **R.9 The end.**
  - At the month end where `world.day >= world.decree.endDay`, set `world.decree.ended = true` and the speed to 0.
  - From then on, the sim's step returns at once, and the command entry refuses every command with `{ ok: false, reason: 'decree_ended' }`. Find the one dispatch every command goes through.
  - Tests: the end comes on day 2,160 and not before, a command is refused afterwards, and a main-game world never ends.
- [ ] **R.10 The score.** In `src/sim/score.js`:
  - `decreeMeasure(world, id)`, by `DECREES[id].measure`:

    | Measure | Reads |
    |---|---|
    | `raidsBeaten` | the Unconquered's `beaten` from `titleMeasures` |
    | `fedMonths` | `world.tally.fedMonths` |
    | `wellMonths`, `fireSafeMonths` | the tally |
    | `monumentUnits` | the Builder's measure |
    | `requestsMet` | the court tally |
    | `tradeOverBills` | the Merchant's measure |
    | `elephantsFelled` | the tally |

  - `bonusPart(world)` is the mean over the decrees of `min(100, round(100 × measure / bar))`, rounded.
  - `decreeScore(world)` returns `{ total, parts (the five plus bonus), medal (DECREES[id].medals or PAIR_MEDALS), version: 3 }`.
  - `scoreOf` is untouched.

**R's proof:**
- the `v93 r` tests;
- the golden fingerprint unchanged;
- the full suite ALL PASSED.

### Track S: saves, records and links (rulings 1965–1974)

- [ ] **S.1 The slot.**
  - `createSaveStore({ slot = '' })`:
    - IndexedDB keys are prefixed `${slot}.` when the slot is set (`decree.current`);
    - localStorage keys become `${key}.${slot}.${name}`.
  - `slot: ''` is byte-for-byte today's store.
  - Tests with fake IndexedDB and localStorage (see the existing store tests): saving and clearing the decree slot leaves the main keys alone, the reverse also holds, and backup fallback works in both.
- [ ] **S.2 Records version 3.**
  - `RECORDS_VERSION = 3`, and `emptyRecords` gains `decrees: []`.
  - `normalizeRecords` reads a v2 blob with `decrees: []`.
  - `cleanDecree(x)` keeps `{ id, week, ids, mark, score, parts (six, 0–100), medal, day, map, feats, title, name, tries, date }`, and drops a row with a bad week or parts.
  - `records.noteDecree(world, { now })`, at a run's end:
    - adds a row, or replaces the week's row when the score is higher;
    - always adds 1 to `tries`.
  - `records.decrees()` lists the rows.
  - Rival rows take an optional `week` (`isWeekKey`).
  - Merging:
    - merge decrees by week, keeping the higher score;
    - `tries` is the sum of the two;
    - a device's own row wins a tie.
- [ ] **S.3 The link.**
  - `decreeLink({ week, parts, splits, name, heir })` builds `#d1.<week>.<six parts>.<splits>.<check>[&name=…&heir=s]`, where the check is `shareCheck` over the body.
  - `parseShareLink` returns `{ ok: true, kind: 'decree', week, parts, splits, name?, heir? }` for a good `d1`.
  - It gives `bad_check`, `malformed` or `newer_format` (an unknown `d<n>`) for a bad one. A bad week counts as `malformed`.
  - t2 links parse exactly as before. Today's tests are untouched and must pass.
  - Opening a named `d1` link keeps the sender as a rival with `week`. S writes `records.addRival` for this; U calls it.
- [ ] **S.4 The share text:** `decreeShareText({ mark, total, medal, parts })` → "Sea Peoples, week 47: 412 of 600, silver", plus the emoji row of six parts. The words come from U's text section. S writes a placeholder key, and U fills it at the merge.

**S's proof:**
- the `v93 s` tests;
- an old save and old records opening as before;
- the full suite.

### Track U: the interface (rulings 1975–1984)

Screenshots for each item go in `docs/superpowers/notes/screenshots/raw/v93/`. Take them at:
- 375 × 667 at 100%;
- 390 × 844 at 150%;
- 1280 × 800 at 100%.

- [ ] **U.1 Words.** Under `// Version 9.3, Track U` in `src/ui/text.js`, as `U93_TEXT`:
  - each decree's name, its twist line and its bonus label (spec section 1);
  - `mark(names, week)` → "Sea Peoples, week 47" (two names joined by " and ");
  - the card's title "This week's decree";
  - the Start, Continue and Try again buttons;
  - "Your best this week" and the rival line;
  - the chip "Year N of 6";
  - the end card's lines;
  - the menu's "Back to your city" and "Start the decree again", and its question;
  - the locked-build line "Not under this decree";
  - the unfinished-run line "You have an unfinished run from week N. Continue";
  - the share text.

  There is no "Pharaoh" and no "challenge". The words follow the glossary.
- [ ] **U.2 Boot's decree game.** In `src/boot.js`:
  - a second store, `createSaveStore({ slot: 'decree' })`;
  - `startDecree(week)` builds `createWorld({ seed: weeklySeed(week), size: Normal, mapVariant: 'auto', decree: { week, ids: decreesOfWeek(week) } })` and runs it as `current.decree`;
  - the hooks drop Pass the throne, the heir picker, a new city and Export, the way the lesson's do;
  - there is no guide and there are no daily goals;
  - saves go to the decree store, and no city row is written to the records;
  - `continueDecree()` loads the decree slot;
  - at the end (`world.decree.ended`), call `records.noteDecree` once, then open the end card;
  - "Back to your city" saves, then loads the main slot (or opens the title).
- [ ] **U.3 The title card.**
  - It appears when the records hold a city row with a Town split, or any ruler.
  - It shows the mark, the twist lines and the bonus label, your best this week from `records.decrees()`, and the best rival with this `week`.
  - The button is Start, Continue or Try again, depending on the decree slot's run and its week.
  - When the slot holds a run of another week, the card shows the unfinished-run line with Continue. Starting this week asks first.
  - A `d1` link opens the card on that link's week.
- [ ] **U.4 In the run.**
  - The decree card is the first screen; the chip reopens it.
  - The HUD chip sits beside the date, with "Year N of 6" and the mark.
  - The build menu shows forbidden types locked, with the decree line, read from `ruleForbids`.
  - `placement.js`, `monumentSheet.js` and `s46/armies.js` show the numbers through `ruleFactor`, `ruleCost` and `ruleUnitPay`.
  - The firehouse's coverage overlay uses `ruleReach`.
- [ ] **U.5 The end card.**
  - It is 9.2's end card in shape, showing:
    - the six parts and the total out of 600;
    - the medal;
    - your best this week;
    - the rivals on this week.
  - Its buttons are Share (`decreeLink` and the share text), Try again (a new run of the same week) and Back to your city.
  - It passes keyboard focus and 200% text checks, as 9.2's end card does.
- [ ] **U.6 The ruler list.** Decree rows sit among rulers by date, each with its mark and medal and no regnal number. Tapping one replays its map.

**U's proof:**
- the `v93 u` tests: the card's gate, the three buttons, the chip, the end card's parts, the locked wall, the ruler-list rows, and the layout at the three sizes;
- the screenshots;
- the full suite.

---

## Wave 2

- [ ] **Merge.**
  - The controller merges R, then S, then U, after the visual tracks, with `git merge -F`.
  - Conflicts are resolved with `merge-file --ours` against the base.
  - After each merge, the golden test and the full suite must pass.
- [ ] **K: the balance (rulings 1985–1989).**
  - `runCapital` gains a `decree` option, `{ week, ids }`, passed to `createWorld`.
  - A balance test file (`tests/v93/k/decrees.test.js`, describe `v93 k`) runs `runCapital(72, { dangers: true, decree })` for each decree and each pair. It records:
    - the bonus measure;
    - the total;
    - the rank by year 2;
    - raids beaten and lost.
  - K sets each row's `bar` to the measure × 1.25, rounded to a clean number.
  - It sets `medals` to [the plain total rounded down to 10, +60, +120], and `PAIR_MEDALS` likewise.
  - It checks that every run reaches Town by year 2.
  - It checks that Sea Peoples, Open city and The Southern Host lose no more than half their raids.
  - It checks that the hardest pair still gets a bronze.
  - A failing check is fixed by the decree's own numbers, never the main game's.
  - The runs take minutes, so the file is excluded from the default suite the way 9.2's balance folder is, and run once with its numbers written into the ruling.

## Wave 3

The decree joins the visual plan's wave 3:
- **The Opus review:** it grades the decree's card, chip and end card at 390 × 844 and 1280 × 800, and plays one decree run to the end at fastest speed.
- **The fix wave:** split by owner.
- **The docs:**
  - the What's new entry, with the decree beside "A city that grows";
  - the README;
  - rulings Part 30, with the decree's rulings 1950–1989;
  - the roadmap's section 5, which points at the decree spec and records the rename to The Vizier's Levy;
  - the follow-ups note, with real-phone checks of a decree run;
  - `APP_VERSION` '9.3'.
- **Then:** ask Josh before pushing.
