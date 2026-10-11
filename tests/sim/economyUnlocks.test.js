import { describe, it, expect } from '../harness.js';
import { MILESTONES } from '../../src/data/progression.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import { updateMilestone, isUnlocked } from '../../src/sim/progression.js';
import { canPlace, place } from '../../src/sim/commands.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { monthlyHousing, houseStatus } from '../../src/sim/housing.js';
import { produceDay } from '../../src/sim/production.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const later = MILESTONES.slice(1).flatMap((m) => m.unlocks);

describe('stage 2 unlocks', () => {
  it('keeps a Village to the Stage 1 buildings and the garden', () => {
    const w = street();
    expect(MILESTONES[0].unlocks.filter((t) => isUnlocked(w, t))).toEqual(MILESTONES[0].unlocks);
    for (const t of later) expect([t, isUnlocked(w, t), canPlace(w, t, 12, 8).reason]).toEqual([t, false, 'locked']);
    expect(canPlace(w, 'garden', 12, 8).ok).toBe(true);
  });
  it('walks the milestones by population, unlocking each one’s buildings and none of the next', () => {
    const w = street();
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: 0 });
    for (let i = 1; i < MILESTONES.length; i++) {
      const m = MILESTONES[i];
      home.residents = m.population - 1;
      expect([m.id, updateMilestone(w)]).toEqual([m.id, false]);
      home.residents = m.population;
      expect([m.id, updateMilestone(w), w.milestone]).toEqual([m.id, true, m.id]);
      for (const t of m.unlocks) expect([t, isUnlocked(w, t)]).toEqual([t, true]);
      for (const t of (MILESTONES[i + 1] || { unlocks: [] }).unlocks) expect([t, isUnlocked(w, t)]).toEqual([t, false]);
    }
    expect(w.milestone).toBe('capital');
  });
  it('jumps straight to the highest milestone a population has reached', () => {
    const w = street();
    addRaw(w, 'house', 1, 1, { tier: 4, residents: 420 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('city');
  });
  it('places a garden anywhere, with no road and no warning, since it needs neither', () => {
    const w = street();
    const r = canPlace(w, 'garden', 20, 20);
    expect([r.ok, r.warnings]).toEqual([true, []]);
    expect(canPlace(w, 'house', 20, 20).warnings).toEqual(['needs_road']);   // a plot still warns: no one moves in without a road
    expect(place(w, 'garden', 20, 20).ok).toBe(true);
  });
  it('keeps a House a House while nothing makes pottery, and names the Townhouse next', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { grain: 4 } });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    addRaw(w, 'temple', 15, 8);
    staffAll(w);
    monthlyHousing(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);
    expect(h.downTimer).toBe(0);
    const s = houseStatus(w, h);
    expect(s.next).toEqual({ tier: 5, name: 'Townhouse' });
    expect(s.checklist.map((c) => c.need)).toEqual(['road', 'water', 'food', 'religion', 'pottery']);
  });
  it('sends a fig orchard’s figs to a granary and counts them as harvest', () => {
    const w = street();
    w.milestone = 'town';
    expect(place(w, 'farm_fig', 2, 8).ok).toBe(true);
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store).toEqual({ figs: 24 });
    expect(w.tally.harvested).toBe(24);
  });
  it('prices a trade route by the city’s difficulty', () => {
    const byLevel = (id) => DIFFICULTY_ORDER.map((d) => { const w = street(); w.difficulty = d; return routeCostOf(w, id); });
    expect(byLevel('memphis')).toEqual([240, 300, 375]);
    expect(byLevel('byblos')).toEqual([480, 600, 750]);
  });
});
