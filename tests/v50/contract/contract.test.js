// Version 5.0 Task 0 (the contract): the chunk index (src/render/chunkIndex.js) gives exactly the buildings a pass over every building
// would, set up both ways (a building added, moved by a merge, removed, or deleted behind its back); the world stays at version 8 (the
// buildings' version is kept beside the world, never saved); the v50 dev scenes.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { chunkIndex, buildingsInRange, buildingsNear } from '../../../src/render/chunkIndex.js';
import { collectObjects } from '../../../src/render/renderer.js';
import { CHUNK } from '../../../src/render/camera.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { createWorld, WORLD_VERSION, buildingsVersion, removeBuilding, insertBuilding, makeBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { CURRENT_VERSION } from '../../../src/save/migrate.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place } from '../../../src/sim/commands.js';
import { VERSION50_SCENES } from '../../../src/dev/scenes.js';
import { V50_SCENES } from '../../../src/dev/v50/index.js';

const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;
const brute = (w, r) => Object.values(w.buildings).filter((b) => intersects(b, r)).map((b) => b.id);
const ids = (list) => list.map((b) => b.id);

describe('v50 contract chunk index', () => {
  it('gives the same buildings in the same order as a pass over all of them, for ranges across chunk edges', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    const n = w.size;
    const ranges = [{ x0: 0, y0: 0, x1: n - 1, y1: n - 1 }];
    for (let k = 0; k < 40; k++) {
      const x0 = (k * 7) % n, y0 = (k * 13) % n;
      ranges.push({ x0, y0, x1: Math.min(n - 1, x0 + 3 + (k % 5) * 9), y1: Math.min(n - 1, y0 + 2 + (k % 7) * 6) });
    }
    ranges.push({ x0: CHUNK - 1, y0: CHUNK - 1, x1: CHUNK, y1: CHUNK }, { x0: -5, y0: -5, x1: n + 5, y1: n + 5 });
    for (const r of ranges) expect([r, ids(buildingsInRange(w, r))]).toEqual([r, brute(w, r)]);
    const cam = { x0: 10, y0: 12, x1: 40, y1: 44 };
    // The renderer's sprites for buildings: every building in range that has art, as a pass over all of them would give (ids below the
    // decor base, 1e6).
    const drawn = (b) => { const def = ART[slotFor(b, w)]; return Boolean(def && (def.draw || def.png)); };
    expect(collectObjects(w, cam).filter((o) => o.id < 1e6).map((o) => o.id).sort((a, b) => a - b))
      .toEqual(brute(w, cam).filter((id) => drawn(w.buildings[id])));
    const near = ids(buildingsNear(w, 20.4, 30.6, 2));
    expect(near).toEqual(brute(w, { x0: 18, y0: 28, x1: 22, y1: 32 }));
  });

  it('lists a building over a chunk edge in each chunk it touches, but once in a range', () => {
    const w = makeTestWorld({ size: 48 });
    const big = addRaw(w, 'granary', CHUNK - 1, CHUNK - 1);           // a 2x2 over four chunks' corner
    const { per, chunks } = chunkIndex(w);
    expect(per).toBe(3);
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(chunks[cy * per + cx]).toEqual([big.id]);
    expect(ids(buildingsInRange(w, { x0: 0, y0: 0, x1: 47, y1: 47 }))).toEqual([big.id]);
    expect(ids(buildingsInRange(w, { x0: CHUNK, y0: CHUNK, x1: CHUNK, y1: CHUNK }))).toEqual([big.id]);
  });

  it('rebuilds when the buildings change (insert, remove, a merge, an undo-style reinsert) and skips one deleted behind its back', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const all = { x0: 0, y0: 0, x1: 31, y1: 31 };
    const v0 = buildingsVersion(w);
    expect(ids(buildingsInRange(w, all))).toEqual([]);
    const r = place(w, 'well', 14, 9);
    expect(buildingsVersion(w)).toBeGreaterThan(v0);
    expect(ids(buildingsInRange(w, all))).toEqual([r.id]);
    const moved = removeBuilding(w, r.id);
    expect(ids(buildingsInRange(w, all))).toEqual([]);
    moved.x = 20;
    insertBuilding(w, moved);
    expect(ids(buildingsInRange(w, { x0: 20, y0: 9, x1: 20, y1: 9 }))).toEqual([r.id]);
    expect(ids(buildingsInRange(w, { x0: 14, y0: 9, x1: 14, y1: 9 }))).toEqual([]);
    const v = buildingsVersion(w);
    const before = chunkIndex(w);
    expect(chunkIndex(w)).toBe(before);                               // no change: the same index
    delete w.buildings[r.id];                                          // as a test or an old Undo might
    expect(buildingsVersion(w)).toBe(v);
    expect(ids(buildingsInRange(w, all))).toEqual([]);
    // A Townhouse square merging into a Manor: four plots go, one 2x2 comes, all through insertBuilding and removeBuilding.
    const plots = [[4, 11], [5, 11], [4, 12], [5, 12]].map(([x, y]) => addRaw(w, 'house', x, y));
    expect(ids(buildingsInRange(w, all))).toEqual(plots.map((p) => p.id));
    for (const p of plots.slice(1)) removeBuilding(w, p.id);
    const keep = removeBuilding(w, plots[0].id);
    Object.assign(keep, { w: 2, d: 2 });
    insertBuilding(w, keep);
    expect(ids(buildingsInRange(w, { x0: 5, y0: 12, x1: 5, y1: 12 }))).toEqual([keep.id]);
  });
});

describe('v50 contract world', () => {
  it('keeps the buildings\' version beside the world (5.0 needed no world version; 6.0 is 9), never saved, and a loaded city starts its own', () => {
    expect([WORLD_VERSION, CURRENT_VERSION]).toEqual([9, 9]);
    const w = createWorld({ seed: 4 });
    insertBuilding(w, makeBuilding(w, 'well', 3, 3));
    expect(buildingsVersion(w)).toBe(1);
    const text = serialize(w);
    expect(text.includes('buildingsVersion')).toBe(false);
    const back = deserialize(text);
    expect(buildingsVersion(back)).toBe(0);
    expect(ids(buildingsInRange(back, { x0: 0, y0: 0, x1: back.size - 1, y1: back.size - 1 }))).toEqual(Object.values(back.buildings).map((b) => b.id));
    advanceDays(back, 2);
  });

  it('has the six v50 dev scenes, each a stub until its task fills it', () => {
    expect(VERSION50_SCENES).toEqual(['v50-advice', 'v50-house-step', 'v50-layers', 'v50-areas', 'v50-roads', 'v50-grand']);
    for (const name of VERSION50_SCENES) expect(typeof V50_SCENES[name]).toBe('function');
  });
});
