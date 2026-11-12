// Version 10.0, Track L (L.4, spec 5c, rulings 2210-2214): river life: feluccas crossing by rank, herons that lift as a boat passes, the Shemu
// crocodile and the hippo surfacing once a minute; capped, none in the lesson, standing under Gentle.
import { describe, it, expect } from '../../harness.js';
import { riverLifeAt, RIVER } from '../../../src/render/v100/riverLife.js';
import { riverRows } from '../../../src/render/ambient.js';
import { LIFE } from '../../../src/data/ambient.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';
import { animalsAt, BOAT_HOLD } from '../../../src/render/wildlife.js';
import { ART } from '../../../src/render/art/registry.js';
import { riverWorld, addRaw } from '../../stage46/river/riverHelpers.js';
import { lifeContract, sampleCity, copyWorld, DAY } from './helpers.js';

const MOVE_PACE_FULL = 0.22;                                                     // wildlife.js MOVE.full.pace

// The sample city with the river's middle rows in view.
function river() {
  const w = sampleCity(), rows = [...riverRows(w, 0, w.size - 1).entries()].filter(([, r]) => r.right - r.left >= RIVER.minWidth);
  const [y, r] = rows[Math.floor(rows.length / 2)];
  return { w, range: { x0: Math.floor(r.left) - 8, y0: y - 8, x1: Math.ceil(r.right) + 8, y1: y + 8 } };
}
const fn = (day) => (w, t, n, r, m) => riverLifeAt(w, t, n, r, m, { day });
const make = () => { const { w, range } = river(); return { world: copyWorld(w), range, timeDays: 40, nowMs: 3000 }; };

describe('v100 l river: the contract', () => {
  lifeContract(fn(DAY), make, LIFE.riverCap);
});

describe('v100 l river: the wharf\'s fisher casts (final review L-4, ruling 2329)', () => {
  it('casts (fisher_cast) at the hold time of a staffed wharf\'s boat under Full, stands (fisher) otherwise, never under Gentle or Still, nothing for an idle wharf', () => {
    const w = riverWorld(), wh = addRaw(w, 'fishing_wharf', 22, 11);
    wh.rot = 1; wh.w = 1; wh.d = 2; wh.staff = 3;
    const ALL = { x0: 0, y0: 0, x1: w.size, y1: w.size };
    const fishers = (t, motion) => animalsAt(w, t, ALL, motion).filter((a) => /^fisher/.test(a.kind));
    const kinds = new Set(), held = [], moving = [];
    for (let t = 0; t < 120; t += 0.25) {
      const f = fishers(t, 'full');
      expect(f.length).toBe(1);
      kinds.add(f[0].kind);
      (Math.abs(Math.sin(t * MOVE_PACE_FULL * 0.7 + wh.id)) > BOAT_HOLD ? held : moving).push(f[0].kind);
      expect(typeof (ART[`fig.${f[0].kind}`] && ART[`fig.${f[0].kind}`].draw)).toBe('function');
    }
    expect([...kinds].sort()).toEqual(['fisher', 'fisher_cast']);
    expect(held.length > 0 && held.every((k) => k === 'fisher_cast')).toBe(true);
    expect(moving.length > 0 && moving.every((k) => k === 'fisher')).toBe(true);
    for (const motion of ['gentle', 'still']) for (let t = 0; t < 120; t += 3) expect(fishers(t, motion).map((a) => a.kind)).toEqual(['fisher']);
    wh.staff = 0;
    expect(fishers(3, 'full')).toEqual([]);
  });
});

describe('v100 l river: boats with somewhere to go', () => {
  it('sends one felucca across from City and two from Capital, none before; each crosses bank to bank on the real clock', () => {
    const { w, range } = river(), c = copyWorld(w);
    const boats = (world, t) => fn(DAY)(world, 40, t, range, 'full').filter((e) => /^trade_boat/.test(e.kind));
    c.milestone = 'market_town';
    expect(boats(c, 3000)).toEqual([]);
    c.milestone = 'city';
    expect(boats(c, 3000).length <= 1).toBe(true);
    c.milestone = 'capital';
    const xs = [];
    for (let t = 0; t < 2 * (RIVER.crossMs + RIVER.restMs); t += 4000) { const b = boats(c, t).find((e) => e.id === LIFE_IDS.river); if (b) xs.push(b.x); }
    expect(Math.max(...xs) - Math.min(...xs) > RIVER.minWidth - 1.5).toBe(true);
    expect(Math.max(...[0, 9000, 30000, 61000].map((t) => boats(c, t).length))).toBe(2);
  });
  it('lifts a heron in two frames as a boat comes near, and keeps it standing under Gentle', () => {
    const { w, range } = river(), c = copyWorld(w);
    c.milestone = 'capital';
    const lifts = new Set();
    for (let t = 0; t < 2 * (RIVER.crossMs + RIVER.restMs); t += 250) for (const e of fn(DAY)(c, 40, t, range, 'full')) if (/^heron/.test(e.kind)) lifts.add(e.lift);
    expect([...lifts].sort((a, b) => a - b)).toEqual([0, 4, 9]);
    for (let t = 0; t < 60000; t += 1000) for (const e of fn(DAY)(c, 40, t, range, 'gentle')) if (/^heron/.test(e.kind)) expect(e.lift).toBe(0);
  });
  it('basks a crocodile in Shemu through the day and slides it in at dusk; surfaces a hippo once a minute; nothing in the lesson', () => {
    const { w, range } = river(), c = copyWorld(w);
    c.day = 30 * 9 + 5;                                                          // a Shemu month (SEASONS), as the storm scene finds one
    const kinds = (day, t = 3000) => fn(day)(c, 40, t, range, 'full').map((e) => e.kind);
    const shemu = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => { c.day = m * 30 + 5; return kinds(DAY).includes('crocodile'); });
    expect(shemu.some(Boolean)).toBe(true);
    c.day = shemu.indexOf(true) * 30 + 5;
    expect(kinds({ phase: 'dusk', u: 0.6, dark: 0.5, warm: 0.5, lamps: 0.4 }).includes('crocodile_slide')).toBe(true);
    expect(kinds({ phase: 'night', u: 0.75, dark: 1, warm: 0, lamps: 1 }).some((k) => /^crocodile/.test(k))).toBe(false);
    const up = [];
    for (let t = 0; t < RIVER.hippoEveryMs; t += 500) up.push(kinds(DAY, t).includes('hippo'));
    const share = up.filter(Boolean).length / up.length;
    expect(share > 0.05 && share < 0.15).toBe(true);
    c.lesson = true;
    expect(fn(DAY)(c, 40, 3000, range, 'full')).toEqual([]);
  });
});
