import { describe, it, expect } from '../../harness.js';
import { unitsAt, drawUnitMarks, UNIT_ID_BASE, ARROW_MS, STILL_ARROW_MS, BAR, BAR_COLOUR } from '../../../src/render/units.js';
import { SCRUM, FIGHT } from '../../../src/data/battle.js';
import { fig, raider, soldier, FIGURE_KINDS, UNIT_KINDS, UNIT_SCALE } from '../../../src/render/art/figures.js';
import { KIND_BY_TYPE, walkersAt } from '../../../src/render/walkers.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

// A raid under way with raiders at the given tiles (hit raiders carry hp below 10), shots and no soldiers yet.
function raidWorld(raiders, shots = []) {
  const w = makeTestWorld({ fertile: [] });
  w.raid.active = {
    index: 0, entry: { x: 31, y: 10 }, dir: 'east', size: raiders.length, target: 'storehouse', day: 0, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots,
    raiders: raiders.map(([x, y, hp = 10], i) => ({ id: 1 + i, x, y, hp, hit: hp < 10 })),
  };
  return w;
}

// A figure drawn alone; returns its alpha mask and the inked height in art px.
function mask(draw) {
  const c = makeCanvas(160, 200), ctx = c.getContext('2d');
  ctx.translate(80, 160);
  draw(makeDraw(ctx, 3));
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const on = new Uint8Array(c.width * c.height);
  let top = c.height;
  for (let i = 0; i < on.length; i++) if (d[i * 4 + 3] > 100) { on[i] = 1; top = Math.min(top, Math.floor(i / c.width)); }
  return { on, height: (160 - top) / 3 };
}

// drawUnitMarks with its line and poly calls recorded.
function marks(w, timeDays, now, opts = {}) {
  const ctx = makeCanvas(64, 64).getContext('2d');
  const g = makeDraw(ctx, 1);
  const calls = { line: [], poly: [] };
  const { line, poly } = g;
  g.line = (a, b, c, wd, al) => { calls.line.push({ a, b, c, al }); return line(a, b, c, wd, al); };
  g.poly = (pts, fill, o) => { calls.poly.push({ pts, fill }); return poly(pts, fill, o); };
  drawUnitMarks(g, w, null, timeDays, now, opts);
  return calls;
}

describe('s3 art units', () => {
  it('draws raiders and soldiers half as big again as citizens, told apart by shape and not only colour', () => {
    expect([UNIT_SCALE, UNIT_KINDS]).toEqual([1.5, ['raider', 'soldier']]);
    const citizen = mask((g) => fig(g, 0, 0, 'citizen')), r = mask((g) => raider(g, 0, 0)), s = mask((g) => soldier(g, 0, 0));
    expect(r.height / citizen.height).toBeGreaterThan(1.5);                      // the body is 1.5x; the crest rises above it
    expect(s.height / citizen.height).toBeGreaterThan(2);                        // the tall spear
    let differ = 0, either = 0;
    for (let i = 0; i < r.on.length; i++) { if (r.on[i] !== s.on[i]) differ++; if (r.on[i] || s.on[i]) either++; }
    expect(differ / either).toBeGreaterThan(0.4);                                // silhouettes differ, not just their colours
    for (const kind of UNIT_KINDS) expect([kind, ART[`fig.${kind}`].bounds]).toEqual([kind, [-21, -45, 21, 9]]);
  });
  it('sends a firefighter out from a working firehouse along its roads', () => {
    expect([KIND_BY_TYPE.firehouse, FIGURE_KINDS.includes('firefighter')]).toEqual(['firefighter', true]);
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 4, 10, 20, 10);
    addRaw(w, 'firehouse', 8, 9);
    staffAll(w);
    expect(walkersAt(w, 3).some((wk) => wk.kind === 'firefighter')).toBe(true);
  });
  it('lists raiders and soldiers as walker entries in range, a waiting soldier in its barracks yard', () => {
    const w = raidWorld([[20, 10], [21, 11, 4]]);
    const bk = addRaw(w, 'barracks', 6, 6);
    w.soldiers = [{ id: 7, barracks: bk.id, x: 6, y: 6, hp: 12, hit: false, task: 'wait' }, { id: 8, barracks: bk.id, x: 7, y: 7, hp: 12, hit: false, task: 'wait' },
      { id: 9, barracks: bk.id, x: 12, y: 9, hp: 5, hit: true, task: 'out' }];
    const list = unitsAt(w, 0);
    expect(list.map((u) => [u.id, u.kind])).toEqual([[UNIT_ID_BASE + 1, 'raider'], [UNIT_ID_BASE + 2, 'raider'], [UNIT_ID_BASE + 7, 'soldier'], [UNIT_ID_BASE + 8, 'soldier'], [UNIT_ID_BASE + 9, 'soldier']]);
    expect([list[0].x, list[0].y]).toEqual([20.5, 10.5]);   // tile centres
    // Version 6.0 (ruling 721): a soldier out in the field stands where its id puts it in the company's spread, round the tile centre the sim has it on
    expect([list[4].x, list[4].y].map((v) => Math.round(v * 1000))).toEqual([12.5 + SCRUM[9][0] * FIGHT.spread, 9.5 + SCRUM[9][1] * FIGHT.spread].map((v) => Math.round(v * 1000)));
    const yard = list.filter((u) => u.id === UNIT_ID_BASE + 7 || u.id === UNIT_ID_BASE + 8);
    for (const u of yard) expect(u.x + u.y).toBeGreaterThan(bk.x + bk.y + 2);   // drawn after the barracks (its depth key), in its yard
    expect(yard[1].x - yard[0].x).toBeGreaterThan(0.3);                          // side by side, not on one spot
    expect(unitsAt(w, 0, { x0: 0, y0: 0, x1: 15, y1: 15 }).map((u) => u.id - UNIT_ID_BASE)).toEqual([7, 8, 9]);
    expect(unitsAt(makeTestWorld(), 0)).toEqual([]);
  });
  it('glides a unit from its last spot to its new one over the next game day', () => {
    const w = raidWorld([[20, 10]]);
    expect(unitsAt(w, 5.2)[0].x).toBe(20.5);
    w.raid.active.raiders[0].x = 19;                                             // the sim moved it one tile west
    w.day = 6;
    const at = (t) => unitsAt(w, t)[0];
    expect([at(6).x, at(6.5).x, at(7).x, at(7.6).x]).toEqual([20.5, 20, 19.5, 19.5]);
    expect(at(6.5).dir).toBe(3);
    w.raid.active.raiders[0].y = 11;                                             // moved again mid-glide: starts from where it is drawn
    expect(unitsAt(w, 7.2)[0]).toEqual({ id: UNIT_ID_BASE + 1, kind: 'raider', x: 19.5, y: 10.5, dir: 2 });
    expect(unitsAt(w, 7.7)[0].y).toBe(11);
  });
  it('shows a health bar only once a unit has been hit, as long as its health', () => {
    const w = raidWorld([[20, 10], [22, 10, 6]]);
    const bars = marks(w, 0, 0).poly;
    expect(bars.map((b) => b.fill)).toEqual([BAR_COLOUR.back, BAR_COLOUR.raider]);   // the second raider's bar only
    const fill = bars[1].pts;
    expect(Math.round((fill[1][0] - fill[0][0]) * 100)).toBe(Math.round(BAR.w * 60));      // 60% of the bar for 6 of 10 hit points
    w.raid.active.raiders[1].hp = 0;
    expect(marks(w, 0, 0).poly.length).toBe(1);                                  // an empty bar: no fill
  });
  it('flies each of the day\'s tower arrows for 0.3 s, or shows a still line for a moment under reduced motion', () => {
    const w = raidWorld([[20, 10]], [{ from: { x: 17, y: 10 }, to: { x: 20, y: 10 } }]);
    expect([ARROW_MS, STILL_ARROW_MS]).toEqual([300, 600]);
    const arrows = (now, opts) => marks(w, 0, now, opts).line.filter((l) => l.c === '#3E3040');
    const first = arrows(1000);
    const mid = arrows(1150);
    expect([first.length, mid.length, arrows(1000 + ARROW_MS).length]).toEqual([1, 1, 0]);
    expect(mid[0].b[0]).toBeGreaterThan(first[0].b[0]);                         // the head moves toward the raider (east)
    w.day = 1;                                                                   // the next day's shots start a new volley
    expect(arrows(5000).length).toBe(1);
    w.day = 2;
    const still = (now) => arrows(now, { reducedMotion: true });
    const a = still(9000), b = still(9000 + STILL_ARROW_MS - 1);
    expect([a.length, b.length, still(9000 + STILL_ARROW_MS).length]).toEqual([1, 1, 0]);
    expect(b[0]).toEqual(a[0]);                                                  // the same still line
  });
  it('draws units in the depth-sorted pass through the walkers list', () => {
    const w = raidWorld([[16, 16]]);
    const renderer = createRenderer({ canvas: makeCanvas(300, 200), dpr: 1 });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const base = renderer.renderFrame(w, cam, { view: { width: 300, height: 200 }, walkers: [] }).sprites;
    const withUnits = renderer.renderFrame(w, cam, { view: { width: 300, height: 200 }, walkers: unitsAt(w, 0) }).sprites;
    expect(withUnits).toBe(base + 1);
  });
});
