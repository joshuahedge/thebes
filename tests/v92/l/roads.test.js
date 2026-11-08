// Version 9.2 Track L (design 2.3; ruling 1757; target T2): the lesson's road begins at the end of the road (a drag within two tiles snaps to it, one further away is refused in the
// bar and costs nothing), and in every city a road that joins nothing wears the amber outline and badge and says so in its toast.
import { describe, it, expect } from '../../harness.js';
import { LESSON_PLACES } from '../../../src/data/lesson.js';
import { lessonWorld, gateRoadTiles, lessonRoadEnds, lessonRoadStart } from '../../../src/sim/lesson.js';
import { loneRoads, laidLone } from '../../../src/sim/loneRoad.js';
import { createPlacement, toolPreview } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { V92L_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

function rig(world) {
  const store = createStore(INITIAL_UI_STATE);
  const said = [];
  const pl = createPlacement({ world, store, afterCommand: (c) => said.push(c), effects: null, now: () => 0 });
  return { store, pl, said };
}
const [fx, fy] = LESSON_PLACES.road.from;

describe('v92 l road: the lesson\'s road begins at the end of the road (T2, ruling 1757)', () => {
  it('the end of the road is the diamond: the start road\'s last tile', () => {
    const w = lessonWorld();
    expect(lessonRoadEnds(w)).toEqual([[fx, fy]]);
    expect([lessonRoadStart(w, fx, fy), lessonRoadStart(w, fx - 1, fy + 1), lessonRoadStart(w, fx - 2, fy), lessonRoadStart(w, fx - 3, fy)]).toEqual([{ x: fx, y: fy, snapped: false }, { x: fx, y: fy, snapped: true }, { x: fx, y: fy, snapped: true }, { refused: true }]);
  });

  it('a drag from four tiles off is refused in the bar with the reason, lays nothing and spends no gold', () => {
    const w = lessonWorld();
    const { store, pl, said } = rig(w);
    pl.start({ kind: 'road' });
    pl.pointAt(fx - 4, fy);
    pl.pointAt(fx - 9, fy);
    const p = toolPreview(w, store.get());
    expect([p.state, p.reason, p.text]).toEqual(['bad', 'lesson_road_start', V92L_TEXT.roadStart]);
    const gold = w.gold, roads = w.road.reduce((a, b) => a + (b ? 1 : 0), 0);
    expect(pl.confirm().ok).toBe(false);
    expect([w.gold, w.road.reduce((a, b) => a + (b ? 1 : 0), 0), said.length, gateRoadTiles(w)]).toEqual([gold, roads, 0, 0]);
  });

  it('a drag from one tile off snaps to the end: the road is joined and counted', () => {
    const w = lessonWorld();
    const { store, pl } = rig(w);
    pl.start({ kind: 'road' });
    pl.pointAt(fx - 1, fy + 1);
    pl.pointAt(fx - 9, fy);
    const p = toolPreview(w, store.get());
    expect(p.state).toBe('ok');
    expect(p.tiles[0]).toEqual([fx, fy]);                                              // the ghost begins on the diamond
    expect(pl.confirm().ok).toBe(true);
    expect(gateRoadTiles(w)).toBeGreaterThanOrEqual(9);
  });

  it('a touch stroke that starts three tiles off is refused, and one that starts one tile off is joined to the end', () => {
    const far = lessonWorld(), near = lessonWorld();
    for (const [w, x, want] of [[far, fx - 3, 'bad'], [near, fx - 1, 'ok']]) {
      const { store, pl } = rig(w);
      store.set({ inputType: 'touch' });
      pl.start({ kind: 'road' });
      store.set({ plan: { tiles: [[x, fy], [x - 1, fy], [x - 2, fy]] } });
      expect(toolPreview(w, store.get()).state).toBe(want);
      if (want === 'ok') { expect(pl.confirm().ok).toBe(true); expect(gateRoadTiles(w)).toBeGreaterThan(0); }
    }
  });

  it('a free city is not held to the end of the road: the same drag lays there', () => {
    const w = lessonWorld();
    delete w.lesson;
    const { store, pl } = rig(w);
    pl.start({ kind: 'road' });
    pl.pointAt(fx - 4, fy);
    pl.pointAt(fx - 9, fy);
    expect(toolPreview(w, store.get()).state).toBe('ok');
  });
});

describe('v92 l road: a lone road is marked and says so (ruling 1757)', () => {
  it('a road that touches no road and no building is lone; a house beside it, or a road joining it, ends that', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);                     // the map's edge: a way out
    const { store, pl, said } = rig(w);
    pl.start({ kind: 'road' });
    pl.pointAt(10, 20);
    pl.pointAt(14, 20);
    expect(pl.confirm().ok).toBe(true);
    expect(loneRoads(w).map((r) => r.tiles.length)).toEqual([5]);
    expect(said[0].text).toBe(V92L_TEXT.roadLone);
    pl.start({ kind: 'road' });
    pl.pointAt(14, 14);
    pl.pointAt(14, 19);                             // joins the stray piece to nothing else: still lone, longer
    expect(pl.confirm().ok).toBe(true);
    expect(loneRoads(w).length).toBe(1);
    addRaw(w, 'house', 15, 20);                     // a plot beside the road: it joins a building
    w.roadVersion++;
    expect(loneRoads(w).length).toBe(0);
    void store;
  });

  it('a road drawn from a road is never lone, and says only "Road laid"', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const { pl, said } = rig(w);
    pl.start({ kind: 'road' });
    pl.pointAt(5, 10);
    pl.pointAt(5, 14);
    expect(pl.confirm().ok).toBe(true);
    expect([loneRoads(w).length, said[0].text, laidLone(w, [[5, 12]])]).toEqual([0, 'Road laid', false]);
  });
});
