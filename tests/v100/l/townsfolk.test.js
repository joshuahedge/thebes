// Version 10.0, Track L (L.2, spec 5a, rulings 2202-2205): townsfolk at their doors and yards, by the hour; the bank's washerwomen; the yards empty at
// night; the idle cap by device; fades, never pops.
import { describe, it, expect } from '../../harness.js';
import { townsfolkAt, shareAt, bankSpot, TOWNSFOLK } from '../../../src/render/v100/townsfolk.js';
import { LIFE } from '../../../src/data/ambient.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';
import { housesOf } from '../../../src/sim/world.js';
import { lifeContract, sampleCity, bazaarCity, DAY, NOON, NIGHT } from './helpers.js';

const fn = (day, deviceKind = 'desktop') => (w, t, n, r, m) => townsfolkAt(w, t, n, r, m, { day, deviceKind });
const make = () => { const { w, range } = bazaarCity(12); return { world: w, range, timeDays: 40.3, nowMs: 50000 }; };

describe('v100 l townsfolk: the contract', () => {
  lifeContract(fn(DAY), make, LIFE.idleCap.desktop);
});

describe('v100 l townsfolk: people at their doors, by the hour', () => {
  it('fills the cap on a desktop and on a phone, the homes nearest the middle first, with the yard\'s poses', () => {
    const { world, range, timeDays, nowMs } = make();
    const desk = fn(DAY, 'desktop')(world, timeDays, nowMs, range, 'full'), phone = fn(DAY, 'phone')(world, timeDays, nowMs, range, 'full');
    expect(desk.length <= LIFE.idleCap.desktop && desk.length >= LIFE.idleCap.desktop / 2).toBe(true);
    expect(phone.length <= LIFE.idleCap.phone && phone.length >= LIFE.idleCap.phone / 2).toBe(true);
    for (const e of desk) expect(e.id >= LIFE_IDS.townsfolk && e.id < LIFE_IDS.townsfolk + 200000).toBe(true);
    const kinds = new Set(desk.map((e) => e.kind));
    expect(kinds.size >= 3).toBe(true);
    // every figure stands at a home with residents, at its front edge
    const homes = housesOf(world).filter((h) => h.residents > 0);
    for (const e of desk.filter((x) => x.kind !== 'woman_kneel' && x.kind !== 'water')) {
      expect(homes.some((h) => e.x >= h.x - 0.5 && e.x <= h.x + h.w + 0.6 && e.y >= h.y - 0.5 && e.y <= h.y + h.d + 0.6)).toBe(true);
    }
  });
  it('is busier in the morning than at noon, thins at dusk and empties at night', () => {
    expect(shareAt(DAY) > shareAt(NOON)).toBe(true);
    expect(shareAt(NIGHT)).toBe(0);
    const { world, range, timeDays, nowMs } = make();
    expect(fn(NIGHT)(world, timeDays, nowMs, range, 'full')).toEqual([]);
    const dusk = { phase: 'dusk', u: 0.6, dark: 0.7, warm: 0.5, lamps: 0.6 };
    const at = fn(dusk)(world, timeDays, nowMs, range, 'full');
    for (const e of at) expect(e.alpha <= 0.3 + 1e-9).toBe(true);                 // fading with the dark
  });
  it('fades a figure in and out over LIFE.fadeMs of its window, never popping', () => {
    const { world, range, timeDays } = make();
    const seen = new Map();
    for (let t = 0; t < TOWNSFOLK.slotMs * 2; t += 250) {
      const now = new Map(fn(NOON)(world, timeDays, 100000 + t, range, 'full').map((e) => [e.id, e.alpha]));
      for (const [id, a] of seen) if (!now.has(id)) expect([id, a <= 0.3]).toEqual([id, true]);   // went only once faded
      for (const [id, a] of now) if (!seen.has(id) && t > 0) expect([id, a <= 0.3]).toEqual([id, true]);   // came faint
      seen.clear();
      for (const [id, a] of now) seen.set(id, a);
    }
  });
  it('sends a bank home\'s women to the water: one kneeling to wash, one carrying water, on open ground by it', () => {
    const world = sampleCity();
    const banked = housesOf(world).filter((h) => h.residents > 0 && bankSpot(world, h));
    expect(banked.length).toBeGreaterThan(0);
    const h = banked[0], s = bankSpot(world, h);
    expect(world.terrain[Math.floor(s.y) * world.size + Math.floor(s.x)] === 3).toBe(false);   // on land
    const range = { x0: h.x - 6, y0: h.y - 6, x1: h.x + 6, y1: h.y + 6 };
    let found = false;
    for (let t = 0; t < 400000 && !found; t += 6000) found = fn(DAY)(world, 10, t, range, 'full').some((e) => e.kind === 'woman_kneel');
    expect(found).toBe(true);
  });
  it('lets a child run about on game time under Full (holding while paused) and stand under Gentle', () => {
    const { world, range } = make();
    let child = null, t0 = 0;
    for (let t = 0; t < 600000 && !child; t += 5000) { child = fn(DAY)(world, 40, t, range, 'full').find((e) => e.kind === 'child'); t0 = t; }
    expect(Boolean(child)).toBe(true);
    const later = fn(DAY)(world, 40.5, t0, range, 'full').find((e) => e.id === child.id);
    expect(later.x !== child.x || later.y !== child.y).toBe(true);
    expect(child.stand).toBe(false);
    const g = fn(DAY)(world, 40, t0, range, 'gentle').find((e) => e.id === child.id);
    expect(g.stand).toBe(true);
  });
});
