import { describe, it, expect } from '../harness.js';
import { tickDay, advanceDays } from '../../src/sim/clock.js';
import { monthlyHousing } from '../../src/sim/housing.js';
import { serialize } from '../../src/save/serialize.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('sim events', () => {
  it('reports an upgrade with the old and new tier', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'well', 13, 9);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'upgrade', id: h.id, from: 1, to: 2 }]);
  });
  it('reports a downgrade when the timer runs out', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'downgrade', id: h.id, from: 2, to: 1 }]);
  });
  it('reports arrivals and the first milestone through tickDay', () => {
    const w = street();
    for (let x = 1; x <= 30; x++) addRaw(w, 'house', x, 11, { tier: 4, residents: 0 });
    for (let x = 2; x <= 30; x += 6) addRaw(w, 'well', x, 9);
    staffAll(w);
    const events = [];
    advanceDays(w, 10, events);
    const arrivals = events.filter((e) => e.type === 'arrivals');
    expect(arrivals.length).toBe(1);
    expect(arrivals[0].count).toBeGreaterThan(0);
    w.mood = 100;
    for (const b of Object.values(w.buildings)) if (b.type === 'house') b.residents = 16;
    advanceDays(w, 20, events);
    expect(events.some((e) => e.type === 'milestone' && e.id === 'town')).toBe(true);
  });
  it('changes nothing about the world when no events array is given', () => {
    const a = street();
    const b = street();
    for (const w of [a, b]) {
      addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
      addRaw(w, 'well', 13, 9);
    }
    const events = [];
    advanceDays(a, 45);
    advanceDays(b, 45, events);
    expect(serialize(a)).toBe(serialize(b));
    expect(events.length).toBeGreaterThan(0);
    expect(serialize(b).includes('"events"')).toBe(false);
  });
  it('accepts a single tickDay with events', () => {
    const w = street();
    const events = [];
    tickDay(w, events);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: 25 }]);   // the street is a road, so the first goal lands on day one
  });
});
