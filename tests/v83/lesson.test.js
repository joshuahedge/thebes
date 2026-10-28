// Version 8.3 (ruling 1453): the lesson never lets a building that needs a road stand off one. The owner's report: in the lesson a
// farm was placed not touching the road; the player's placing lets a building that only lacks a road through ("road later", ruling P10), but an off-road
// farm counts for no "Build a" goal (src/sim/goals.js countOf), so the farm step never ended, and the lesson's lock had taken the road tool and Demolish
// away, so nothing could join it to the road: the lesson stood still. Every lesson step that builds something needing a road (well, farm, granary, bazaar,
// firehouse, tower) had the same trap. Now in the lesson's city (world.lesson) "road later" does not apply: the bar refuses the spot with "needs a road",
// as the steps' own words ask; plots may still go off the road (the homes step teaches that), and a real city keeps road later.
import { describe, it, expect } from '../harness.js';
import { LESSON_STEPS } from '../../src/data/lesson.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { lessonWorld, replayTo, stepDone } from '../../src/sim/lesson.js';
import { canPlace, conditionsFor, checkTiles, place } from '../../src/sim/commands.js';
import { LARGE_PLOT } from '../../src/data/largePlots.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const atStep = (id) => { const w = lessonWorld(); replayTo(w, index(id)); w.gold = 100000; return w; };
// The nearest origin to (cx, cy) where checkTiles says `reason` (null: it fits outright).
function spotWhere(world, type, cx, cy, reason) {
  for (let r = 0; r < 20; r++) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue;
      if (checkTiles(world, type, x, y) === reason) return { x, y };
    }
  }
  return null;
}
// The spot a player could pick off the road: it fits but for a road.
const offRoadSpot = (world, type, cx, cy) => spotWhere(world, type, cx, cy, 'needs_road');
// Each lesson step that builds something needing a road, with the step it is built in.
const ROAD_STEPS = LESSON_STEPS.filter((s) => s.show && BUILDINGS[s.show.item] && BUILDINGS[s.show.item].needsRoad).map((s) => ({ id: s.id, type: s.show.item, at: s.at }));

describe('v83 lesson: a building that needs a road never stands off one in the lesson', () => {
  it('covers every step that builds something needing a road', () => {
    expect(ROAD_STEPS.map((s) => s.type)).toEqual(['well', 'farm_grain', 'granary', 'bazaar', 'firehouse', 'tower']);
  });
  for (const s of ROAD_STEPS) {
    it(`the ${s.id} step: a ${s.type} off the road is refused with needs_road, by the placing and the preview alike; a real city still takes it with a warning`, () => {
      const world = atStep(s.id);
      const spot = offRoadSpot(world, s.type, s.at.x, s.at.y);
      expect(Boolean(spot)).toBe(true);
      const c = canPlace(world, s.type, spot.x, spot.y, { roadLater: true });
      expect([c.ok, c.reason]).toEqual([false, 'needs_road']);
      const pre = conditionsFor(world, s.type, spot.x, spot.y, { roadLater: true });
      expect([pre.state, pre.conditions.find((k) => k.key === 'road').state]).toEqual(['cant', 'cant']);
      expect(place(world, s.type, spot.x, spot.y, { roadLater: true }).ok).toBe(false);
      delete world.lesson;   // the lesson over: the city is the player's, and road later is back
      const real = canPlace(world, s.type, spot.x, spot.y, { roadLater: true });
      expect([real.ok, real.warnings.includes('needs_road')]).toEqual([true, true]);
      expect(conditionsFor(world, s.type, spot.x, spot.y, { roadLater: true }).conditions.find((k) => k.key === 'road').state).toBe('later');
    });
  }
  it('was the trap: an off-road farm (as road later let it stand) leaves the farm step waiting for ever; one touching the road ends it', () => {
    const world = atStep('farm');
    const step = LESSON_STEPS[index('farm')];
    const spot = offRoadSpot(world, 'farm_grain', step.at.x, step.at.y);
    delete world.lesson;
    expect(place(world, 'farm_grain', spot.x, spot.y, { roadLater: true }).ok).toBe(true);
    world.lesson = true;
    expect(stepDone(world, step)).toBe(false);
    const onRoad = spotWhere(world, 'farm_grain', step.at.x, step.at.y, null);
    expect(place(world, 'farm_grain', onRoad.x, onRoad.y, { roadLater: true }).ok).toBe(true);
    expect(stepDone(world, step)).toBe(true);
  });
  it('still lets plots go off the road in the lesson (a plot waits for a road; the homes step teaches it)', () => {
    const world = atStep('homes');
    const house = offRoadSpot(world, 'house', 19, 41);
    if (house) expect(canPlace(world, 'house', house.x, house.y, { roadLater: true }).ok).toBe(true);
    const w2 = atStep('largeplot');
    const lot = offRoadSpot(w2, LARGE_PLOT.type, 17, 37);
    if (lot) expect(canPlace(w2, LARGE_PLOT.type, lot.x, lot.y, { roadLater: true }).ok).toBe(true);
  });
});
