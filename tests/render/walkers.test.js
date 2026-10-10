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
});
