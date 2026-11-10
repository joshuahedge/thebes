// Version 9.3 fix wave, group A (rulings 1990-1994): the decree's bars can be reached, the Plague counts only a real city, the Vizier's Levy pays what its card says,
// and every command a player can reach refuses once the decree has ended.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { countDynastyMonth } from '../../../src/sim/dynasty.js';
import { ruleFactor } from '../../../src/sim/rules.js';
import { sealReign } from '../../../src/sim/score.js';
import { meetDemand } from '../../../src/sim/demands.js';
import { layCrossing, drawFerry } from '../../../src/sim/ferryLay.js';
import { DECREES, DECREE_PAIRS, MONTHS_BAR_MAX, MONTH_MEASURES, WELL_MONTH_HOMES } from '../../../src/data/decrees.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

// The most a months measure can count in a 72-month run: a month counts only from Town, and the scripted run (tests/v93/k) reaches Town in month 6, counting 66.
const MONTHS_REACHABLE = 66;

describe('v93 x a bars', () => {
  it('every months-measure bar, and every pair member, is at most what a run can count', () => {
    const ids = new Set(Object.keys(DECREES));
    for (const p of DECREE_PAIRS) for (const id of p) expect(ids.has(id)).toBe(true);
    for (const [id, d] of Object.entries(DECREES)) {
      if (!MONTH_MEASURES.includes(d.measure)) continue;
      expect([id, d.bar <= MONTHS_BAR_MAX && d.bar <= MONTHS_REACHABLE]).toEqual([id, true]);
    }
    expect(MONTHS_BAR_MAX <= MONTHS_REACHABLE).toBe(true);
  });
  it('every bar is positive, so a bonus part can be worked out', () => {
    for (const [id, d] of Object.entries(DECREES)) expect([id, d.bar > 0]).toEqual([id, true]);
  });
});

describe('v93 x a plague', () => {
  const town = (homes, ill = false) => {
    const w = makeTestWorld(); w.milestone = 'town'; w.day = 300;
    for (let i = 0; i < homes; i++) addRaw(w, 'house', 10 + (i % 8) * 2, 10 + Math.floor(i / 8) * 2, { tier: 3, residents: 4 });
    if (ill) addRaw(w, 'house', 2, 2, { tier: 3, residents: 4, illness: { start: 0, days: 9, left: 9, lost: 0, cap: 0 } });
    return w;
  };
  it('counts a well month only while the city has enough Cottage-or-better homes', () => {
    const few = town(WELL_MONTH_HOMES - 1);
    countDynastyMonth(few);
    expect(few.tally.wellMonths).toBe(0);
    const enough = town(WELL_MONTH_HOMES);
    countDynastyMonth(enough);
    expect(enough.tally.wellMonths).toBe(1);
  });
  it('still misses a month with a sick home, however big the city', () => {
    const w = town(WELL_MONTH_HOMES, true);
    countDynastyMonth(w);
    expect(w.tally.wellMonths).toBe(0);
  });
  it('a bare city with no homes counts no well months at all', () => {
    const w = town(0);
    countDynastyMonth(w); countDynastyMonth(w);
    expect(w.tally.wellMonths).toBe(0);
  });
});

describe('v93 x a levy', () => {
  it("The Vizier's Levy asks twice as much and its reward follows the ask: no extra reward factor", () => {
    const w = createWorld({ seed: 5, decree: { week: '2026-47', ids: ['vizier_levy'] } });
    expect(ruleFactor(w, 'courtAsk')).toBe(2);
    expect(ruleFactor(w, 'courtReward')).toBe(1);
  });
});

// Known 10: the decree-ended refusal on every command the interface can reach.
describe('v93 x a ended', () => {
  const ended = () => { const w = makeTestWorld(); w.decree = { week: '2026-47', ids: ['low_nile'], ended: true }; return w; };
  it('refuses the three commands that were missed: meet a demand, lay a crossing, seal a reign', () => {
    const refused = { ok: false, reason: 'decree_ended' };
    expect(meetDemand(ended(), 1)).toEqual(refused);
    expect(layCrossing(ended(), { ok: true })).toEqual(refused);
    expect(drawFerry(ended(), [])).toEqual(refused);
    expect(sealReign(ended())).toEqual(refused);
    expect(sealReign(makeTestWorld()).ok).toBe(true);
  });

  // Every sim function the interface imports that takes the world first must refuse after the end, or be named here as one that reads and never changes the world
  // (or only runs inside a command that refuses). Only functions that answer { ok, reason } count as commands. A command added later is a new import the scan finds, so it fails here until it is gated or listed.
  const READS = new Set([
    'anotherOf', 'campQuote', 'canPassThrone', 'canPlace', 'checkTiles', 'conditionsFor', 'crossingRuns', 'demandStatus', 'eventChoices', 'festivalStatus', 'greatWorkStatus',
    'harvestQuote', 'houseSpots', 'nextStep', 'palaceQuote', 'placementWarnings', 'previewAreaTiles', 'previewDemolishTiles', 'previewHouseTiles', 'previewPlazaTiles',
    'previewRoad', 'previewRoadTiles', 'previewWallTiles', 'quarantineQuote', 'rebuildQuote', 'requestStatus', 'routeRoad', 'rushQuote', 'scoreOf', 'siteStatus',
    'stalledGuild', 'tributeQuote', 'titleMeasures', 'scorePreview', 'previewFerry', 'judgeCrossing', 'fitOf', 'monumentPreview',
  ]);
  const OTHER = {   // not decree commands: a setting made at boot, and the daily goals' swap (the daily list is not part of a decree run)
    drawRoad: 'draws through drawRoadTiles, which refuses', buildCrossing: 'lays through drawRoadTiles or layCrossing, which refuse',
    setGuide: 'the guide switch, set at boot', setCityId: 'the records id, set once at boot', swapDaily: 'the daily goals, outside a decree run',
  };
  it('has no interface-reachable command without the refusal', async () => {
    const files = (await (await fetch(new URL('../../../sw-files.js', import.meta.url))).text()).match(/'\.\/(?:src\/(?:ui|sim)\/[^']+|src\/boot)\.js'/g).map((s) => s.slice(3, -1));
    const sources = new Map();
    for (const f of files) sources.set(f, await (await fetch(new URL('../../../' + f, import.meta.url))).text());
    const exported = new Map();
    for (const [f, s] of sources) {
      if (!f.startsWith('src/sim/')) continue;
      for (const m of s.matchAll(/^export function (\w+)\((?:world|w)\b[^)]*\)[^\n]*\{\r?\n([\s\S]*?)^\}/gm)) exported.set(m[1], m[2]);
    }
    const used = new Set();
    for (const [f, s] of sources) {
      if (f.startsWith('src/sim/')) continue;
      for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[./]*sim\//g)) for (const n of m[1].split(',')) used.add(n.trim().split(' as ')[0].trim());
    }
    const answers = (body) => /ok|fail\(|reason/.test(body);   // a command answers { ok, reason }; the other imports return numbers, lists or facts
    const missing = [...used].filter((n) => exported.has(n) && answers(exported.get(n)) && !exported.get(n).includes('decreeEnded(world)') && !READS.has(n) && !OTHER[n]);
    expect(missing).toEqual([]);
  });
});
