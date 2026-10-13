import { describe, it, expect } from '../harness.js';
import { MILESTONES } from '../../src/data/progression.js';
import { updateMilestone } from '../../src/sim/progression.js';
import { place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw, layClay } from '../helpers/testWorld.js';

const unlocksOf = (...ids) => ids.flatMap((id) => MILESTONES.find((m) => m.id === id).unlocks);

describe('sim new items', () => {
  it("adds a milestone's unlocks to newItems once, in order, and placing one takes it out", () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(w.newItems).toEqual([]);
    const home = addRaw(w, 'house', 12, 9, { tier: 1, residents: 150 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.newItems).toEqual(unlocksOf('town'));
    expect(updateMilestone(w)).toBe(false);
    expect(w.newItems).toEqual(unlocksOf('town'));                                   // never twice
    layClay(w, 16, 11); layClay(w, 20, 11);
    expect(place(w, 'clay_pit', 16, 11).ok).toBe(true);
    const left = unlocksOf('town').filter((t) => t !== 'clay_pit');
    expect(w.newItems).toEqual(left);
    expect(place(w, 'clay_pit', 20, 11).ok).toBe(true);                             // a second one changes nothing
    expect(w.newItems).toEqual(left);
    home.residents = MILESTONES.find((m) => m.id === 'city').population;           // straight past Market town to City
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('city');
    expect(w.newItems).toEqual([...left, ...unlocksOf('market_town', 'city')]);
  });
  it('leaves newItems alone when a building that was never new is placed, or a placement fails', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.newItems = ['potter'];
    expect(place(w, 'well', 12, 11).ok).toBe(true);
    expect(place(w, 'potter', 12, 11).ok).toBe(false);                              // locked at Village, and the tile is taken
    expect(w.newItems).toEqual(['potter']);
  });
});
