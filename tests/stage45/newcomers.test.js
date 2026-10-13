// Task 4c: newcomers on the road. A home's residents rising on an arrival day send 1-3 figures with bundles in from the entry
// at the map edge along the roads to the home's door; at most NEWCOMER_CAP walk at once; Still shows none (and none later);
// a home no road reaches shows none; leavers walk the other way; Gentle walks like Full; nothing is written to the world.
import { describe, it, expect } from '../harness.js';
import { newcomersAt, entryPath, NEWCOMER_CAP, NEWCOMER_GROUP } from '../../src/render/newcomers.js';
import { TILES_PER_DAY } from '../../src/render/walkers.js';
import { FIGURE_ART, FIGURE_KINDS } from '../../src/render/art/figures.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

// The entry is (31, 31); the road runs north to y = 12 then west along it; homes stand just south of the westward road.
function town(homes = 1) {
  const w = makeTestWorld({ fertile: [] });
  setRoad(w, 31, 31, 31, 12);
  setRoad(w, 30, 12, 8, 12);
  const hs = [];
  for (let i = 0; i < homes; i++) hs.push(addRaw(w, 'house', 10 + i * 2, 13, { tier: 1, residents: 1 }));
  return { w, hs };
}
// One frame to notice the homes (day 9), then `n` arrivals landing on the next arrival day (day 10).
function arrive(w, hs, n, level = 'full') {
  w.day = 9;
  newcomersAt(w, 9, null, level);
  for (const h of hs) h.residents += n;
  w.day = 10;
  return newcomersAt(w, 10, null, level);
}
const onRoadOrDoor = (w, h, f) => {
  const i = Math.floor(f.y) * w.size + Math.floor(f.x);
  return Boolean(w.road[i]) || (f.x >= h.x && f.x <= h.x + h.w && f.y >= h.y && f.y <= h.y + h.d);
};

describe('s45 newcomers arrive', () => {
  it('sends the group in from the entry and walks them along the road to the home\'s door, where they vanish', () => {
    const { w, hs } = town();
    const [h] = hs;
    const first = arrive(w, hs, 2);
    expect(first.length).toBe(1);                                              // the second steps out a moment later
    expect([first[0].kind, Math.floor(first[0].x), Math.floor(first[0].y)]).toEqual(['newcomer', 31, 31]);
    const path = entryPath(w, h);
    const len = path.reduce((s, q, i) => s + (i ? Math.hypot(q.x - path[i - 1].x, q.y - path[i - 1].y) : 0), 0);
    expect([path[0].x, path[0].y]).toEqual([31.5, 31.5]);
    let seen = 0;
    for (let t = 10; t < 10 + (len - 0.7) / TILES_PER_DAY; t += 0.1) {   // time only runs forward
      const out = newcomersAt(w, t, null, 'full');
      seen = Math.max(seen, out.length);
      for (const f of out) expect(onRoadOrDoor(w, h, f)).toBe(true);
    }
    expect(seen).toBe(2);
    const near = newcomersAt(w, 10 + (len - 0.6) / TILES_PER_DAY, null, 'full');
    expect(near.length).toBeGreaterThan(0);
    expect(Math.hypot(near[0].x - (h.x + 0.5), near[0].y - (h.y + 0.5))).toBeLessThan(2);   // at the door
    expect(newcomersAt(w, 10 + len / TILES_PER_DAY + 3, null, 'full')).toEqual([]);           // vanished
  });
  it('shows one to three figures for a home, however many moved in', () => {
    const { w, hs } = town();
    arrive(w, hs, 9);
    expect(newcomersAt(w, 14, null, 'full').length).toBe(NEWCOMER_GROUP);
  });
  it('walks under Gentle as under Full, holds still when time does, and writes nothing to the world', () => {
    const a = town(), b = town();
    arrive(a.w, a.hs, 2, 'full');
    arrive(b.w, b.hs, 2, 'gentle');
    const before = JSON.stringify(b.w);
    expect(newcomersAt(b.w, 14, null, 'gentle')).toEqual(newcomersAt(a.w, 14, null, 'full'));
    expect(newcomersAt(b.w, 14, null, 'gentle')).toEqual(newcomersAt(b.w, 14, null, 'gentle'));   // paused: the same frame
    expect(JSON.stringify(b.w)).toBe(before);
  });
  it('lets leavers walk the other way, from the door to the entry', () => {
    const { w, hs } = town();
    const [h] = hs;
    h.residents = 3;
    w.day = 29; newcomersAt(w, 29, null, 'full');
    h.residents = 1;
    w.day = 30;
    const out = newcomersAt(w, 30, null, 'full');
    expect(out.length).toBe(1);
    expect(Math.hypot(out[0].x - (h.x + 0.5), out[0].y - (h.y + 0.5))).toBeLessThan(1.5);
  });
  it('reads a merge of homes as no arrivals, and a split as no leavers, even on a month day', () => {
    const { w, hs } = town();
    const [h] = hs;
    w.day = 29; newcomersAt(w, 29, null, 'full');
    h.w = 2; h.residents += 4;                                   // two homes merged: the survivor takes both households
    w.day = 30;
    expect(newcomersAt(w, 30, null, 'full')).toEqual([]);
    expect(newcomersAt(w, 31, null, 'full')).toEqual([]);
    w.day = 59; newcomersAt(w, 59, null, 'full');
    h.w = 1; h.residents -= 4;                                   // and split again: the plot keeps its id, residents fall
    w.day = 60;
    expect(newcomersAt(w, 60, null, 'full')).toEqual([]);
    expect(newcomersAt(w, 61, null, 'full')).toEqual([]);
  });
  it('shows nothing for a frame that saw more days than the detection window', () => {
    const { w, hs } = town();
    w.day = 9; newcomersAt(w, 9, null, 'full');
    hs[0].residents += 4;
    w.day = 40;
    expect(newcomersAt(w, 40, null, 'full')).toEqual([]);
    expect(newcomersAt(w, 41, null, 'full')).toEqual([]);
  });
});

describe('s45 newcomers limits', () => {
  it('never has more than the cap walking at once, however big the city', () => {
    const { w, hs } = town(10);
    arrive(w, hs, 3);
    expect(newcomersAt(w, 18, null, 'full').length).toBe(NEWCOMER_CAP);
    let most = 0;
    for (let t = 10; t < 40; t += 0.25) most = Math.max(most, newcomersAt(w, t, null, 'full').length);
    expect(most).toBeLessThanOrEqual(NEWCOMER_CAP);
  });
  it('shows nothing under Still, and nothing later for what arrived while it was Still', () => {
    const { w, hs } = town();
    expect(arrive(w, hs, 2, 'still')).toEqual([]);
    expect(newcomersAt(w, 11, null, 'full')).toEqual([]);
    expect(newcomersAt(w, 14, null, 'gentle')).toEqual([]);
  });
  it('shows nothing for a home the roads do not reach, or when no road joins it to the entry', () => {
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 31, 31, 31, 20);
    const lone = addRaw(w, 'house', 10, 13, { tier: 1, residents: 1 });          // no road beside it
    expect(arrive(w, [lone], 2)).toEqual([]);
    expect(newcomersAt(w, 12, null, 'full')).toEqual([]);
    const { w: w2, hs } = town();
    expect(entryPath(w2, hs[0]).length).toBeGreaterThan(2);
    w2.road.fill(0); w2.roadVersion++;
    expect(entryPath(w2, hs[0])).toBe(null);
  });
  it('has a figure of its own in the art registry', () => {
    expect([FIGURE_KINDS.includes('newcomer'), typeof FIGURE_ART['fig.newcomer'].draw]).toEqual([true, 'function']);
  });
});
