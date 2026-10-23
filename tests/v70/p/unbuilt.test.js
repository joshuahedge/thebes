// Version 7.0, Track P (ruling 1009): what is placed but not built is marked on the map. Josh: a house plot looks like plain land until it is finished. The code's list of such states is two
// (an empty housing plot awaiting settlers, a monument's site before any work), each given a pegged string, stakes and a sign in its footprint that reads at every zoom including the Huge
// map's floor, never moves (so Gentle and Still show it too) and costs a frame the same few strokes however many there are. Tapping one opens the sheet as before.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { makeCanvas, pixelAt, nearColour, canvasHash } from '../../helpers/canvas.js';
import { paintHouses } from '../../../src/sim/commands.js';
import { unbuiltList, unbuiltIn, drawUnbuilt, UNBUILT, SIGN_MOST } from '../../../src/render/unbuilt.js';
import { drawMarkers } from '../../../src/render/markers.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { p } from '../../../src/render/iso.js';
import { STEP_LABELS, STEP_TEXT } from '../../../src/ui/nextStepText.js';

function city() {
  const w = makeTestWorld({ gold: 100000 });
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const kinds = (w) => unbuiltList(w).map((u) => `${u.kind}@${u.x},${u.y}`).sort();

describe('v70 p what is placed but not built, from the sim', () => {
  it('lists an empty plot and not a home with people in it or a Large lot (which has its marked-lot art)', () => {
    const w = city();
    paintHouses(w, 12, 9, 14, 9);
    expect(kinds(w)).toEqual(['plot@12,9', 'plot@13,9', 'plot@14,9']);
    const homes = Object.values(w.buildings).filter((b) => b.type === 'house');
    homes[1].tier = 1;                                                                            // settled: a hut stands there (people move in on the day)
    w.day += 1;
    expect(kinds(w)).toEqual(['plot@12,9', 'plot@14,9']);
    const lot = addRaw(w, 'house', 20, 8, { large: true, w: 2, d: 2 });
    expect(unbuiltList(w).some((u) => u.id === lot.id)).toBe(false);
  });
  it('lists a monument site before any work, and not once a course is begun or a block laid', () => {
    const w = city();
    const site = addRaw(w, 'mastaba_small', 20, 5);
    expect(unbuiltList(w).filter((u) => u.kind === 'site').map((u) => u.id)).toEqual([site.id]);
    site.site.laid.stone = 1;                                                                     // (same day, same buildings: the list still drops it the moment work begins)
    expect(unbuiltList(w).some((u) => u.kind === 'site')).toBe(false);
    site.site.laid.stone = 0;
    site.site.course = 1;
    w.day += 1;
    expect(unbuiltList(w).some((u) => u.kind === 'site')).toBe(false);
    const done = city();
    const finished = addRaw(done, 'mastaba_small', 20, 5);
    finished.site.done = 10;
    expect(unbuiltList(done)).toEqual([]);
  });
  it('keeps to what is in view when asked: the visible tile range, and the renderer\'s cull', () => {
    const w = city();
    paintHouses(w, 2, 9, 3, 9);
    paintHouses(w, 28, 9, 29, 9);
    expect(unbuiltIn(w, { x0: 0, y0: 0, x1: 8, y1: 20 }).map((u) => u.x)).toEqual([2, 3]);
    expect(unbuiltIn(w, null, { sees: (x) => x > 20 }).map((u) => u.x)).toEqual([28, 29]);
    expect(unbuiltIn(w).length).toBe(4);
  });
});

// The scene's origin: tile (tx, ty)'s corner at device (150, 120); `scale` device px per art px, cssScale the CSS px (the renderer gives both).
function scene(tx, ty, scale, cssScale = scale) {
  const c = makeCanvas(300, 240);
  const ctx = c.getContext('2d');
  const [ax, ay] = p(tx, ty);
  ctx.translate(150 - scale * ax, 120 - scale * ay);
  return { c, ctx, g: makeDraw(ctx, scale, cssScale), at: (x, y) => { const q = p(x, y); return [150 + scale * (q[0] - ax), 120 + scale * (q[1] - ay)]; } };
}
const inkIn = (s, x0, y0, x1, y1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pixelAt(s.c, x, y)[3] > 40) n++; return n; };

describe('v70 p the marks are drawn in the footprint, at every zoom', () => {
  it('pegs the plot out: a string round it, a stake at each corner and a sign on a post in the middle, and draws nothing for a settled home', () => {
    const w = city();
    paintHouses(w, 12, 9, 12, 9);
    const s = scene(12, 9, 4);                                                                    // near in: 16 device px a tile edge
    drawUnbuilt(s.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    const [cx, cy] = s.at(12.5, 9.5);
    const inset = UNBUILT.inset, at = (x, y) => s.at(x, y).map(Math.round);
    for (const [x, y] of [[12 + inset, 9 + inset], [13 - inset, 9 + inset], [13 - inset, 10 - inset], [12 + inset, 10 - inset]]) {   // the string's four corners, a stake standing on each
      const [px, py] = at(x, y);
      expect([x, y, inkIn(s, px - 3, py - 8, px + 3, py + 3) > 6]).toEqual([x, y, true]);
    }
    let board = 0;                                                                                // the sign's board: the light cream above the footprint's middle, on a post
    for (let y = Math.round(cy) - 60; y < Math.round(cy) - 8; y++) for (let x = Math.round(cx) - 24; x <= Math.round(cx) + 24; x++) if (nearColour(pixelAt(s.c, x, y), UNBUILT.board, 12) && pixelAt(s.c, x, y)[3] > 200) board++;
    expect(board).toBeGreaterThan(30);
    Object.values(w.buildings)[0].tier = 1;                                                       // a hut stands: nothing is marked
    w.day += 1;
    const none = scene(12, 9, 4);
    drawUnbuilt(none.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(inkIn(none, 0, 0, 299, 239)).toBe(0);
  });
  it('still reads at the Huge map\'s zoom floor, where a plot is about 11 CSS px across: the cord, the stakes and the sign are floored in CSS px', () => {
    const w = city();
    paintHouses(w, 12, 9, 12, 9);
    const far = scene(12, 9, 0.7);                                                                // zoom 0.35 of ART_SCALE 2
    drawUnbuilt(far.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(inkIn(far, 0, 0, 299, 239)).toBeGreaterThan(80);                                       // a sign and a cord, in a space the plot's pad alone leaves bare
    const [cx, cy] = far.at(12.5, 9.5);
    let board = 0;
    for (let y = Math.round(cy) - 40; y < Math.round(cy); y++) for (let x = Math.round(cx) - 14; x <= Math.round(cx) + 14; x++) if (nearColour(pixelAt(far.c, x, y), UNBUILT.board, 12) && pixelAt(far.c, x, y)[3] > 200) board++;
    expect(board).toBeGreaterThan(10);                                                            // the board is still there, at least 9 art px wide
  });
  it('is the same picture every time it is drawn (nothing moves, so Gentle and Still show it as Full does), and a site gets the pyramid sign where a plot gets the hut', () => {
    const w = city();
    paintHouses(w, 12, 9, 12, 9);
    const a = scene(12, 9, 4), b = scene(12, 9, 4);
    drawUnbuilt(a.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    drawUnbuilt(b.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(canvasHash(a.c)).toBe(canvasHash(b.c));
    const sites = city();
    addRaw(sites, 'mastaba_small', 12, 9);
    const site = scene(12, 9, 4);
    drawUnbuilt(site.g, sites, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(canvasHash(site.c) === canvasHash(a.c)).toBe(false);                                   // a different footprint and a different picture
  });
  it('costs a few strokes however many there are: the strings and stakes are one path each, the signs are left out of a crowd', () => {
    const w = city();
    const small = scene(12, 9, 1);
    paintHouses(w, 12, 9, 14, 9);
    let strokes = 0;
    const real = small.ctx.stroke.bind(small.ctx);
    small.ctx.stroke = () => { strokes++; real(); };
    drawUnbuilt(small.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(strokes).toBeLessThanOrEqual(12);
    const big = makeTestWorld({ size: 80, gold: 1e9 });
    for (let y = 1; y <= 6; y++) paintHouses(big, 1, y, 60, y);                                    // 360 plots, more than the signs' limit
    expect(unbuiltList(big).length).toBeGreaterThan(SIGN_MOST);
    const crowd = scene(0, 0, 0.7);
    let crowdStrokes = 0, fills = 0;
    const realStroke = crowd.ctx.stroke.bind(crowd.ctx), realFill = crowd.ctx.fill.bind(crowd.ctx);
    crowd.ctx.stroke = () => { crowdStrokes++; realStroke(); };
    crowd.ctx.fill = (...a) => { fills++; realFill(...a); };
    drawUnbuilt(crowd.g, big, { x0: 0, y0: 0, x1: 79, y1: 79 });
    expect([crowdStrokes <= 4, fills]).toEqual([true, 0]);                                         // the strings and stakes only: no board, no picture
  });
  it('is drawn with the problem markers (drawMarkers), under the road-less plots\' dashed outlines, and is skipped by a stand-in drawing helper', () => {
    const w = city();
    paintHouses(w, 12, 9, 12, 9);
    const s = scene(12, 9, 4);
    drawMarkers(s.g, w, [], { x0: 0, y0: 0, x1: 31, y1: 31 }, []);
    expect(inkIn(s, 0, 0, 299, 239)).toBeGreaterThan(100);
    let threw = false;
    try { drawUnbuilt({}, w, null); } catch (e) { threw = true; }
    expect(threw).toBe(false);
  });
});

describe('v70 p tapping a marked plot opens the sheet as before, with words for what it waits on', () => {
  it('an empty plot beside a road waits for people to move in (the sim\'s nextStep); one with no road asks for a road', async () => {
    const world = uiWorld();
    paintHouses(world, 20, 9, 20, 9);                                                              // beside the road along y = 10
    paintHouses(world, 20, 3, 20, 3);                                                              // nowhere near it
    const r = await rigUI({ world });
    try {
      r.tap(20, 9);
      expect(r.store.get().mode).toBe('selected');
      expect(r.root.querySelector('#sheet').textContent.includes(`${STEP_LABELS.empty} ${STEP_TEXT.empty}`)).toBe(true);
      r.store.set({ sheet: null, mode: 'browse', selectedId: null });
      r.tap(20, 3);
      expect(r.store.get().mode).toBe('selected');
      expect(r.root.querySelector('#sheet').textContent.toLowerCase().includes('road')).toBe(true);
    } finally { r.cleanup(); }
  });
});
