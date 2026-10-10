import { describe, it, expect } from '../harness.js';
import { walkerLoop, walkersAt, WALKER_CAP, KIND_BY_TYPE } from '../../src/render/walkers.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const onRoad = (w, wk) => Boolean(w.road[Math.floor(wk.y) * w.size + Math.floor(wk.x)]);

describe('walkers', () => {
  it('walks from the building out to the edge of its reach and back', () => {
    const w = riverWorld();
    const well = Object.values(w.buildings).find((b) => b.type === 'well');
    const loop = walkerLoop(w, well, 5);
    expect(loop[0]).toEqual({ x: 16, y: 12 });
    expect(loop.length).toBe(8);
    expect(loop.some((t) => t.x === 12 && t.y === 12)).toBe(true);
    for (let i = 1; i < loop.length; i++) expect(Math.abs(loop[i].x - loop[i - 1].x) + Math.abs(loop[i].y - loop[i - 1].y)).toBe(1);
  });
  it('is deterministic from the world and the time, and never writes the world', () => {
    const w = riverWorld();
    const before = JSON.stringify(w);
    const a = JSON.stringify(walkersAt(w, 3.7));
    const b = JSON.stringify(walkersAt(w, 3.7));
    expect(a).toBe(b);
    expect(a === JSON.stringify(walkersAt(w, 4.2))).toBe(false);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('keeps every walker on a road tile and moves smoothly', () => {
    const w = riverWorld();
    for (let t = 0; t < 12; t += 0.37) {
      const list = walkersAt(w, t);
      expect(list.length).toBeGreaterThan(0);
      for (const wk of list) expect(onRoad(w, wk)).toBe(true);
      const next = walkersAt(w, t + 0.01);
      for (const wk of list) {
        const n = next.find((o) => o.id === wk.id);
        expect(Math.abs(n.x - wk.x) + Math.abs(n.y - wk.y)).toBeLessThan(0.1);
      }
    }
  });
  it('sends out the right kinds and only from working buildings', () => {
    const w = riverWorld();
    const kinds = new Set(walkersAt(w, 1).map((wk) => wk.kind));
    expect(kinds.has('water')).toBe(true);
    expect(kinds.has('priest')).toBe(true);
    expect(kinds.has('porter')).toBe(true);
    const temple = Object.values(w.buildings).find((b) => b.type === 'temple');
    temple.staff = 0;
    expect(walkersAt(w, 1).some((wk) => wk.kind === 'priest')).toBe(false);
    expect(KIND_BY_TYPE.well).toBe('water');
  });
  it('caps the crowd', () => {
    const w = makeTestWorld({ size: 64 });
    for (let y = 2; y < 62; y += 4) setRoad(w, 0, y, 63, y);
    for (let y = 2; y < 62; y += 4) for (let x = 1; x < 63; x += 6) addRaw(w, 'well', x, y + 1);
    staffAll(w);
    expect(walkersAt(w, 0.5).length).toBe(WALKER_CAP);
  });
  it('sends the capped crowd to the visible range', () => {
    const w = makeTestWorld({ size: 64 });
    for (let y = 2; y < 62; y += 4) setRoad(w, 0, y, 63, y);
    for (let y = 2; y < 62; y += 4) for (let x = 1; x < 63; x += 6) addRaw(w, 'well', x, y + 1);
    staffAll(w);
    const far = walkersAt(w, 0.5, { x0: 40, y0: 40, x1: 63, y1: 63 });
    expect(far.length).toBeGreaterThan(0);
    // A well reaches 5 tiles, and its loop can run 5 more tiles past the range edge: 40 - 2 * 5.
    for (const wk of far) expect(wk.x >= 40 - 10 && wk.y >= 40 - 10).toBe(true);
    const near = walkersAt(w, 0.5, { x0: 0, y0: 0, x1: 20, y1: 20 });
    expect(JSON.stringify(near) === JSON.stringify(far)).toBe(false);
    expect(JSON.stringify(walkersAt(w, 0.5, { x0: 40, y0: 40, x1: 63, y1: 63 }))).toBe(JSON.stringify(far));
  });
  it('picks the walkers nearest the middle of the view, not the oldest buildings', () => {
    const w = makeTestWorld({ size: 64 });
    for (let y = 2; y < 62; y += 4) setRoad(w, 0, y, 63, y);
    for (let y = 2; y < 62; y += 4) for (let x = 1; x < 63; x += 6) addRaw(w, 'well', x, y + 1);
    staffAll(w);
    const view = { x0: 20, y0: 20, x1: 44, y1: 44 };
    const list = walkersAt(w, 0.5, view);
    expect(list.length).toBe(WALKER_CAP);
    // Wells sit 6 apart in x and 4 in y, so the nearest 40 lie within ~22 tiles of the centre; a loop adds up to 5.
    // The id-order crowd (first rows, y < 10) would be at least 22 further out in y alone.
    for (const wk of list) expect(Math.abs(wk.x - 32) + Math.abs(wk.y - 32) <= 28).toBe(true);
    expect(JSON.stringify(walkersAt(w, 0.5, view))).toBe(JSON.stringify(list));
    expect(walkersAt(w, 0.5, null).some((wk) => wk.y < 10)).toBe(true);
  });
});
