import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { FIGURE_KINDS, FIGURE_ART, gang } from '../../../src/render/art/figures.js';
import { supplySlot } from '../../../src/render/art/supply.js';
import { siteLook, drawSite, drawFinished, courseTop, workSpots } from '../../../src/render/art/monuments.js';
import { drawMonument, gangLayout, isWorking, siteMemo, monumentTop, GANG, DUST_MS, OUTLINE_MS } from '../../../src/render/monuments.js';
import { layoutMarkers, drawMarkers, markerAt, roofOf, MARKER } from '../../../src/render/markers.js';
import { createCamera, artToScreen } from '../../../src/render/camera.js';
import { UI } from '../../../src/render/art/palette.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { makeBuilding, insertBuilding, newSite } from '../../../src/sim/world.js';
import { makeTestWorld, addRaw, setRoad } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash, hexToRgb } from '../../helpers/canvas.js';

function drawAt(fn, w = 520, h = 400, ox = 260, oy = 150) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(ox, oy);
  fn(makeDraw(ctx, 2, 2));
  return c;
}
const countNear = (c, hex, tol = 10) => {
  const [r, g, b] = hexToRgb(hex), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 250 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol) n++;
  return n;
};
function siteIn(w, type, x, y, { course = 0, frac = 0, crews = [], reason = null, paused = false, done = null } = {}) {
  const b = insertBuilding(w, makeBuilding(w, type, x, y));
  const c = MONUMENTS[type].courses[Math.min(course, MONUMENTS[type].courses.length - 1)];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { stone: 40, bricks: 20 }, crews, reason, done });
  b.paused = paused;
  return b;
}
// The ramp a site draws (its geometry), for the gangs.
const rampOf = (b) => drawSite(makeDraw(makeCanvas(4, 4).getContext('2d'), 1), b.x, b.y, b.w, b.d, siteLook(b));

describe('s4 art monument gangs', () => {
  it('hauls one sled with four haulers a crew up the ramp and back on game time, masons swinging at the course', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'pyramid_great', 4, 4, { course: 6, frac: 0.5, crews: [1, 2, 3] });
    const look = siteLook(b), ramp = rampOf(b);
    expect(isWorking(b, look)).toBe(true);
    const a = gangLayout(b, look, ramp, 10), later = gangLayout(b, look, ramp, 11);
    expect([a.working, a.sleds.length, a.people.length, a.masons.length]).toEqual([true, 3, 3 * GANG.haulers, 2]);
    expect(a.people.every((m) => m.pose === 'pull') && a.masons.every((m) => m.pose === 'mallet')).toBe(true);
    expect(JSON.stringify(gangLayout(b, look, ramp, 10))).toBe(JSON.stringify(a));     // the same day, the same scene
    expect(JSON.stringify(later.sleds) !== JSON.stringify(a.sleds)).toBe(true);        // a day later they have moved
    for (const s of a.sleds) expect(s.q[0] >= ramp.xf - 1e-9 && s.q[0] <= ramp.xt + 1e-9 && s.z >= 0 && s.z <= ramp.z1).toBe(true);
    const loads = new Set();                                                            // up loaded, down empty, out of step
    for (let t = 0; t < GANG.tripDays; t += 0.25) for (const s of gangLayout(b, look, ramp, t).sleds) loads.add(s.loaded);
    expect([...loads].sort()).toEqual([false, true]);
    expect(new Set(a.sleds.map((s) => s.q[0].toFixed(3))).size).toBe(3);
  });

  it('moves under every Motion level (gangs are walkers), and holds still while the game is paused', () => {
    const w = makeTestWorld();
    const b = siteIn(w, 'mastaba_large', 4, 4, { course: 2, frac: 0.4, crews: [1, 2] });
    const at = (motion, timeDays) => canvasHash(drawAt((g) => drawMonument(g, w, b, { now: 99999, timeDays, motion }), 520, 400, 260, 60));
    for (const motion of ['full', 'gentle', 'still']) {
      expect([motion, at(motion, 20) !== at(motion, 20.5)]).toEqual([motion, true]);
      expect([motion, at(motion, 20)]).toEqual([motion, at(motion, 20)]);              // paused: timeDays stands, so do they
    }
  });

  it('parks the sleds at the ramp\'s foot with the haulers standing by when the site does no work', () => {
    const w = makeTestWorld();
    const stalled = siteIn(w, 'pyramid_great', 4, 4, { course: 6, frac: 0.5, crews: [1, 2], reason: 'no_stone' });
    const L = siteLook(stalled), ramp = rampOf(stalled), a = gangLayout(stalled, L, ramp, 10);
    expect([isWorking(stalled, L), a.working, a.people.length, a.people.every((m) => m.pose === 'rest'), a.masons.every((m) => m.pose === 'rest')]).toEqual([false, false, 2 * GANG.haulers, true, true]);
    expect(JSON.stringify(gangLayout(stalled, L, ramp, 13.7))).toBe(JSON.stringify(a)); // idle: nothing moves
    expect(a.sleds.every((s) => !s.loaded && s.q[0] - ramp.xf < (ramp.xt - ramp.xf) * 0.2)).toBe(true);
    const paused = siteIn(w, 'pyramid_small', 20, 4, { course: 3, crews: [], paused: true });   // pausing sends the crews away
    const p = gangLayout(paused, siteLook(paused), rampOf(paused), 10);
    expect([p.sleds.length, p.people.length, p.masons.length, p.sleds[0].loaded]).toEqual([1, 0, 0, false]);
    const done = siteIn(w, 'colossus', 4, 20, { course: 6, done: 12, crews: [] });
    expect(isWorking(done)).toBe(false);
  });

  it('works along the apron before the first course and round the scaffold of an obelisk or the colossus', () => {
    const w = makeTestWorld();
    for (const [type, course] of [['pyramid_great', 0], ['obelisk_large', 2], ['colossus', 3]]) {
      const b = siteIn(w, type, 4 + 8 * ['pyramid_great', 'obelisk_large', 'colossus'].indexOf(type), 4, { course, frac: 0.3, crews: [1, 2] });
      const look = siteLook(b), spots = workSpots(type, b.x, b.y, b.w, b.d, look), lay = gangLayout(b, look, rampOf(b), 7);
      expect([type, rampOf(b), lay.people.length, lay.sleds.every((s) => s.z === 0)]).toEqual([type, null, 2 * GANG.haulers, true]);
      for (const s of lay.sleds) expect([type, s.q[0] >= spots.path.x0 - 1e-9 && s.q[0] <= spots.path.x1 + 1e-9, s.q[1]]).toEqual([type, true, spots.path.y]);
    }
  });

  it('raises a dust puff along a course laid under Full, a still outline under Gentle and Still, then nothing', () => {
    const shot = (motion, after) => {
      const w = makeTestWorld();
      const b = siteIn(w, 'pyramid_small', 4, 4, { course: 3, frac: 0.99 });
      drawAt((g) => drawMonument(g, w, b, { now: 0, motion }));
      Object.assign(b.site, { course: 4, laid: { stone: 0, bricks: 0 } });
      drawAt((g) => drawMonument(g, w, b, { now: 100, motion }));
      expect(siteMemo(w, b, siteLook(b), 100 + after).lastCourse).toBe(3);
      return drawAt((g) => drawMonument(g, w, b, { now: 100 + after, motion }));
    };
    const fresh = (() => { const w = makeTestWorld(); const b = siteIn(w, 'pyramid_small', 4, 4, { course: 4 }); return drawAt((g) => drawMonument(g, w, b, { now: 0, motion: 'full' })); })();
    expect(canvasHash(shot('full', DUST_MS / 2)) !== canvasHash(fresh)).toBe(true);
    expect(canvasHash(shot('full', DUST_MS + 1))).toBe(canvasHash(fresh));
    for (const motion of ['gentle', 'still']) {
      expect([motion, countNear(shot(motion, OUTLINE_MS / 2), '#E2B13C', 8) > countNear(fresh, '#E2B13C', 8) + 20]).toEqual([motion, true]);
      expect([motion, canvasHash(shot(motion, OUTLINE_MS + 1)) === canvasHash(fresh)]).toEqual([motion, true]);
    }
    const edge = courseTop('pyramid_small', 4, 4, 4, 4, 3);
    expect([edge.length, edge[1][1] > edge[0][1], edge[1][1] > edge[2][1]]).toEqual([3, true, true]);   // the front corner is lowest on screen
  });

  it('outlines only the two top front edges of the course just laid (no chord across its top), and its dust reads', () => {
    let b = null;
    const shot = (motion, after) => {
      const w = makeTestWorld();
      b = siteIn(w, 'pyramid_small', 4, 4, { course: 3, frac: 0.99 });
      drawAt((g) => drawMonument(g, w, b, { now: 0, motion }));
      Object.assign(b.site, { course: 4, laid: { stone: 0, bricks: 0 } });
      drawAt((g) => drawMonument(g, w, b, { now: 100, motion }));
      return drawAt((g) => drawMonument(g, w, b, { now: 100 + after, motion }));
    };
    const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const at = (q) => [Math.round(260 + 2 * q[0]), Math.round(150 + 2 * q[1])];         // drawAt's origin, 2 px an art px
    const block = (c, q, r) => {                                                          // the pixels round q, r px each way
      const d = pixels(c), [x, y] = at(q), out = [];
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const o = ((y + j) * c.width + x + i) * 4; out.push([d[o], d[o + 1], d[o + 2], d[o + 3]]); }
      return out;
    };
    const [gr, gg, gb] = hexToRgb('#E2B13C');
    const goldish = (px) => px[3] >= 200 && Math.abs(px[0] - gr) <= 40 && Math.abs(px[1] - gg) <= 40 && Math.abs(px[2] - gb) <= 40;
    const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
    for (const motion of ['gentle', 'still']) {
      const lit = shot(motion, OUTLINE_MS / 2), plain = shot(motion, OUTLINE_MS + 1);
      const [a, f, c] = courseTop('pyramid_small', b.x, b.y, b.w, b.d, 3);
      const chord = block(lit, mid(a, c), 2), base = block(plain, mid(a, c), 2);
      expect([motion, 'chord', chord.some(goldish)]).toEqual([motion, 'chord', false]);
      expect([motion, 'chord same as without', chord.every((px, i) => px.every((v, k) => Math.abs(v - base[i][k]) <= 2))]).toEqual([motion, 'chord same as without', true]);
      expect([motion, 'left edge', block(lit, mid(a, f), 1).some(goldish), 'right edge', block(lit, mid(f, c), 1).some(goldish)]).toEqual([motion, 'left edge', true, 'right edge', true]);
    }
    // The Full dust a third of the way through: the pixels it covers that were already drawn (stone, sand) change by a
    // visible step, not only a level or two.
    const puff = pixels(shot('full', DUST_MS / 3)), clear = pixels(shot('full', DUST_MS + 1));
    let seen = 0;
    for (let i = 0; i < puff.length; i += 4) {
      if (clear[i + 3] < 250) continue;
      if (Math.abs(puff[i] - clear[i]) + Math.abs(puff[i + 1] - clear[i + 1]) + Math.abs(puff[i + 2] - clear[i + 2]) >= 30) seen++;
    }
    expect(['dust pixels a visible step off', seen >= 100]).toEqual(['dust pixels a visible step off', true]);   // 145 now; the faint first puff gave 43
  });

  it('draws a record that is not in the world from itself (the placing silhouette), and keeps no state by id', () => {
    const w = makeTestWorld();
    const ghost = { id: -1, type: 'pyramid_great', x: 4, y: 4, w: 7, d: 7, rot: 0, paused: false, site: { ...newSite(), course: 12, done: 0 } };
    const c = drawAt((g) => drawMonument(g, w, ghost, { motion: 'still' }));
    expect(canvasHash(c)).toBe(canvasHash(drawAt((g) => drawFinished(g, 4, 4, 7, 7, 'pyramid_great'))));
    const twin = { ...ghost, site: { ...ghost.site } };
    expect(siteMemo(w, twin, siteLook(twin), 5) !== siteMemo(w, ghost, siteLook(ghost), 5)).toBe(true);
  });

  it('adds the mason and the processions\' musician, dancer and shrine to the figures, and draws a gang in one go', () => {
    for (const kind of ['mason', 'musician', 'dancer', 'shrine']) {
      expect([kind, FIGURE_KINDS.includes(kind), typeof FIGURE_ART[`fig.${kind}`].draw]).toEqual([kind, true, 'function']);
      expect([kind, ART[`fig.${kind}`] === FIGURE_ART[`fig.${kind}`]]).toEqual([kind, true]);
    }
    const hashes = new Set(['mason', 'musician', 'dancer', 'shrine', 'citizen'].map((k) => canvasHash(drawAt((g) => FIGURE_ART[`fig.${k}`].draw(g, 0, 0), 80, 80, 40, 60))));
    expect(hashes.size).toBe(5);
    const people = [{ q: [0, 0], s: 1, pose: 'pull' }, { q: [8, 0], s: 1, pose: 'mallet', swing: 0.5 }, { q: [16, 0], s: 1, pose: 'rest' }];
    const c = drawAt((g) => gang(g, people), 120, 60, 40, 40);
    expect(countNear(c, '#F7F2E8', 4)).toBeGreaterThan(20);                         // their white kilts
    expect(canvasHash(drawAt((g) => gang(g, []), 120, 60, 40, 40))).toBe(canvasHash(makeCanvas(120, 60)));
  });

  it('lays an idle quarry\'s or brickworks\' tools down (b.blocked "idle")', () => {
    expect([supplySlot({ type: 'quarry', staff: 10, blocked: 'idle' }), supplySlot({ type: 'brickworks', staff: 8, blocked: 'idle' }), supplySlot({ type: 'quarry', staff: 10, blocked: null })]).toEqual(['quarry.idle', 'brickworks.idle', 'quarry']);
  });
});

describe('s4 art pinned markers', () => {
  const view = { width: 390, height: 844 };
  const camOn = (x, y, zoom = 1) => createCamera({ x, y, zoom });

  it('pins a badge on a stem of at least 10 px to the roof of its own building, the road mark when it has no road', () => {
    const w = makeTestWorld();
    const well = addRaw(w, 'well', 10, 10), pot = addRaw(w, 'potter', 14, 14);
    const cam = camOn(12, 12);
    const layout = layoutMarkers(w, [{ code: 'no_road', id: well.id }, { code: 'understaffed', id: pot.id }], cam, view);
    expect(layout.map((m) => [m.ids, m.glyph, m.tone, m.count])).toEqual([[[well.id], 'road', 'problem', 1], [[pot.id], '!', 'problem', 1]]);
    for (const m of layout) {
      const b = w.buildings[m.ids[0]], roof = roofOf(b), [fx, fy] = artToScreen(cam, view, roof[0], roof[1]);
      expect([Math.abs(m.foot.x - fx) < 1e-9, Math.abs(m.foot.y - fy) < 1e-9, m.x, m.r >= 10, m.foot.y - (m.y + m.r) >= MARKER.stem - 1e-9]).toEqual([true, true, m.foot.x, true, true]);
    }
    expect(layoutMarkers(w, [], cam, view)).toEqual([]);
  });

  it('never overlaps two badges: the one further back stands on a longer stem; more than three in one place merge', () => {
    const w = makeTestWorld();
    const back = addRaw(w, 'well', 10, 10), front = addRaw(w, 'well', 11, 11);    // one behind the other on screen, zoomed out
    const cam = camOn(11, 11, 0.5);
    const two = layoutMarkers(w, [{ code: 'no_road', id: back.id }, { code: 'no_road', id: front.id }], cam, view);
    expect(two.map((m) => m.ids[0])).toEqual([back.id, front.id]);                // back first: the front is drawn last, asked first
    const [b, f] = two, stem = (m) => m.foot.y - m.y;
    expect(Math.hypot(b.x - f.x, b.y - f.y) >= 2 * MARKER.r).toBe(true);
    expect(stem(b)).toBeGreaterThan(stem(f));
    expect(markerAt(two, f.x, f.y).ids).toEqual([front.id]);
    const crowd = [12, 13, 14, 15].map((k) => addRaw(w, 'well', k, k));            // six wells in a diagonal row, zoomed out
    const all = [back, front, ...crowd].map((x) => ({ code: 'no_road', id: x.id }));
    const far = layoutMarkers(w, all, camOn(12, 12, 0.5), view);
    const merged = far.find((m) => m.count > 1);
    expect(Boolean(merged)).toBe(true);
    expect([merged.count, merged.ids]).toEqual([4, [crowd[3].id, crowd[2].id, crowd[1].id, crowd[0].id]]);   // front first
    expect(far.filter((m) => m.count === 1).map((m) => m.ids[0]).sort()).toEqual([back.id, front.id].sort());
    for (let i = 0; i < far.length; i++) for (let j = i + 1; j < far.length; j++) expect(Math.hypot(far[i].x - far[j].x, far[i].y - far[j].y) >= 2 * MARKER.r).toBe(true);
  });

  it('marks a home about to lose a tier in amber with ↓, and stands a stalled site\'s stem on what is built', () => {
    const w = makeTestWorld();
    const home = addRaw(w, 'house', 10, 10, { tier: 3, residents: 5, downTimer: 4 });
    setRoad(w, 9, 9, 9, 12);                                                      // a road beside it: the road would decide the mark
    const site = siteIn(w, 'pyramid_small', 14, 8, { course: 5, crews: [1], reason: 'no_stone' });
    const cam = camOn(13, 11);
    const layout = layoutMarkers(w, [{ code: 'site_stalled', id: site.id, reason: 'no_stone' }], cam, view);
    const h = layout.find((m) => m.ids[0] === home.id), s = layout.find((m) => m.ids[0] === site.id);
    expect([h.glyph, h.tone, s.glyph, s.tone]).toEqual(['down', 'warning', '!', 'problem']);
    const top = monumentTop(site), [, ty] = artToScreen(cam, view, top[0], top[1]);
    expect(Math.abs(s.foot.y - ty) < 1e-9).toBe(true);
    expect(roofOf(site)).toEqual(top);
    const lone = addRaw(w, 'house', 4, 20, { tier: 3, residents: 5, downTimer: 4 });   // no road: one marker, the road's
    const mine = layoutMarkers(w, [], camOn(4.5, 20.5), view).filter((m) => m.ids.includes(lone.id));
    expect(mine.map((m) => m.glyph)).toEqual(['road']);
  });

  it('merges three or more homes about to lose a tier in one place into one amber count badge, and marks them softly', () => {
    const w = makeTestWorld();
    setRoad(w, 8, 9, 15, 9);
    const homes = [10, 11, 12].map((x) => addRaw(w, 'house', x, 10, { tier: 3, residents: 5, downTimer: 4 }));
    const cam = camOn(11, 10, 0.5);
    const three = layoutMarkers(w, [], cam, view);
    expect(three.map((m) => [m.count, m.glyph, m.tone, [...m.ids].sort()])).toEqual([[3, 'down', 'warning', homes.map((h) => h.id).sort()]]);
    homes[2].downTimer = 0;
    expect(layoutMarkers(w, [], cam, view).map((m) => m.count)).toEqual([1, 1]);   // two stay two
    const problem = addRaw(w, 'well', 13, 10);
    const mixed = layoutMarkers(w, [{ code: 'understaffed', id: problem.id }], cam, view);
    expect(mixed.map((m) => m.count).sort()).toEqual([1, 1, 1]);                  // a problem beside them: the three-in-one rule
    // the warning's footprint: half the wash and a thin ring, no white halo
    const draw = (tone) => {
      const c = makeCanvas(200, 200), ctx = c.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 200, 200);
      ctx.setTransform(1, 0, 0, 1, 100, 100 - 2 * (20.5 * 8));                    // the home's tile (10, 10) in the middle
      const m = { ids: [homes[0].id], x: -999, y: -999, r: 11, foot: { x: -999, y: -999 }, glyph: 'down', tone, count: 1 };
      drawMarkers(makeDraw(ctx, 2, 2), w, [], { x0: 0, y0: 0, x1: 0, y1: 0 }, [m]);   // the badge and stem off the canvas
      return c;
    };
    const light = (c) => { const d = c.getContext('2d').getImageData(0, 0, 200, 200).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
    expect(light(draw('warning')) > 0 && light(draw('warning')) < 0.6 * light(draw('problem'))).toBe(true);
  });

  it('draws the ring and wash on the footprint, the stem and roof dot, and the badge in the marker\'s colour', () => {
    const w = makeTestWorld();
    const well = addRaw(w, 'well', 10, 10);
    const cam = camOn(10.5, 10.5);
    const v = { width: 300, height: 300 };
    const layout = layoutMarkers(w, [{ code: 'understaffed', id: well.id }], cam, v);
    const c = makeCanvas(300, 300), ctx = c.getContext('2d');
    const origin = artToScreen(cam, v, 0, 0);
    ctx.setTransform(1, 0, 0, 1, origin[0], origin[1]);
    drawMarkers(makeDraw(ctx, 2, 2), w, [], { x0: 0, y0: 0, x1: 31, y1: 31 }, layout);
    const px = (x, y) => Array.from(c.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data);
    const [r, g, b2] = hexToRgb(UI.problem), m = layout[0];
    const at = px(m.x, m.y + m.r * 0.6);
    expect(Math.abs(at[0] - r) < 12 && Math.abs(at[1] - g) < 12 && Math.abs(at[2] - b2) < 12).toBe(true);
    expect(countNear(c, UI.problem, 12)).toBeGreaterThan(200);
    const stem = px(m.x, (m.y + m.r + m.foot.y) / 2);
    expect(stem[3]).toBe(255);
    expect(slotFor(well)).toBe('well');
  });
});
