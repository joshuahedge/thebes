// Version 10.0, Track L (life and motion): shared by the life tests. sampleCity() is the seed-11 sample city (a Capital, as the life scenes use),
// built once; lifeContract(...) registers the four tests every life source owes (plan, Track L): determinism, no writes with a deep-frozen world,
// the cap, and the Motion rule (Gentle: no figure moves between two calls a second apart; Still: no entries).
import { it, expect } from '../../harness.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { BUILDINGS } from '../../../src/data/buildings.js';

let sample = null;
export function sampleCity() {
  if (!sample) sample = buildSampleCity(createWorld({ seed: 11 }));
  return sample;
}
// A copy of a world, so a test can change it without touching the shared one (typed arrays copied, the rest a structured clone).
export const copyWorld = (world) => structuredClone(world);

// The sample city's first bazaar, staffed and stocked as the bazaar-crowd scene leaves it (on a copy), and a range of `r` tiles round it.
export function bazaarCity(r = 10) {
  const w = copyWorld(sampleCity());
  const b = allBuildings(w).filter((x) => x.type === 'bazaar').sort((p, q) => p.id - q.id)[0];
  b.staff = BUILDINGS.bazaar.workers; b.paused = false; b.blocked = null;
  for (const food of ['grain', 'figs']) b.store[food] = Math.max(b.store[food] || 0, 120);
  const cx = Math.round(b.x + b.w / 2), cy = Math.round(b.y + b.d / 2);
  return { w, b, range: { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r } };
}

// Freezes a world through and through (plain objects and arrays; a typed array cannot be frozen with elements, and a Map's entries are its own).
export function deepFreeze(o, seen = new Set()) {
  if (!o || typeof o !== 'object' || seen.has(o) || ArrayBuffer.isView(o)) return o;
  seen.add(o);
  for (const k of Object.keys(o)) deepFreeze(o[k], seen);
  return Object.freeze(o);
}

export const DAY = { phase: 'day', u: 0.06, dark: 0, warm: 0, lamps: 0 };          // the morning
export const NOON = { phase: 'day', u: 0.26, dark: 0, warm: 0, lamps: 0 };
export const NIGHT = { phase: 'night', u: 0.75, dark: 1, warm: 0, lamps: 1 };

// The four tests. fn(world, timeDays, nowMs, range, motion) -> entries; make() -> { world, range, timeDays, nowMs } with something to show;
// cap the most entries it may return there.
export function lifeContract(fn, make, cap) {
  it('is deterministic: the same inputs give the same entries twice, and some', () => {
    const { world, range, timeDays, nowMs } = make();
    const a = fn(world, timeDays, nowMs, range, 'full'), b = fn(world, timeDays, nowMs, range, 'full');
    expect(a.length).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('never writes the world: a deep-frozen world throws nowhere and gives the same entries', () => {
    const { world, range, timeDays, nowMs } = make();                            // make() gives a world of its own: it is frozen as it is (render-side notes kept by it stay)
    const before = JSON.stringify(fn(world, timeDays, nowMs, range, 'full'));
    const frozen = deepFreeze(world);
    let out = null, err = null;
    try { out = fn(frozen, timeDays, nowMs, range, 'full'); fn(frozen, timeDays, nowMs, range, 'gentle'); } catch (e) { err = String(e); }
    expect(err).toBe(null);
    expect(JSON.stringify(out)).toBe(before);
  });
  it(`holds its cap (${cap})`, () => {
    const { world, range, timeDays, nowMs } = make();
    for (const dt of [0, 7000, 31000, 90000]) expect(fn(world, timeDays + dt / 1000, nowMs + dt, range, 'full').length <= cap).toBe(true);
  });
  it('keeps the Motion rule: under Gentle nothing moves between two calls a second apart; under Still nothing at all', () => {
    const { world, range, timeDays, nowMs } = make();
    const at = (t) => fn(world, timeDays, t, range, 'gentle').map((e) => `${e.id}:${e.x.toFixed(4)},${e.y.toFixed(4)}:${e.lift || 0}`);
    const a = at(nowMs), b = at(nowMs + 1000);
    const moved = a.filter((s) => { const id = s.split(':')[0]; const o = b.find((t) => t.split(':')[0] === id); return o && o !== s; });
    expect(moved).toEqual([]);
    expect(fn(world, timeDays, nowMs, range, 'still')).toEqual([]);
  });
}
