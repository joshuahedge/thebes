// Version 9.1 Track P (ruling 1686): the caches by bytes. The terrain chunks keep a canvas byte budget (TERRAIN_BUDGET_BYTES, 48 MB), never
// evicting a chunk the frame shows; the sprite cache drops a zoom bucket left for SPRITE_IDLE_MS, never the one in use, and keeps SPRITE_BUDGET_BYTES
// (16 MB) by the least recently drawn, never one this frame draws; window.__thebes.caches()
// (the renderer's cacheBytes) reports both. Target P3's bound on a Large map at DPR 2, panned over every chunk at every zoom bucket.
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createSpriteCache, ZOOM_BUCKETS, SPRITE_IDLE_MS, SPRITE_BUDGET_BYTES, canvasBytes } from '../../../src/render/spriteCache.js';
import { createTerrainBaker, TERRAIN_BUDGET_BYTES, CACHES_BUDGET_BYTES, TERRAIN_FLOOR_BYTES, terrainBudgetFor, chunkBytes, chunkScaleFor, CHUNK } from '../../../src/render/terrainBaker.js';
import { createCamera } from '../../../src/render/camera.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { setRoad } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

const MB = 1024 * 1024;
const P3_CANVAS_BYTES = 64 * MB;   // design section 9, P3: canvas held by the caches at DPR 2

// A clock the sprite cache reads, moved by hand.
const fakeClock = () => { const c = { t: 0, now: () => c.t }; return c; };

describe('v91 p caches: the terrain budget', () => {
  it('counts each chunk by its canvas: bytes() is the sum of the held canvases, and chunkBytes(scale) is what bakeChunk makes', () => {
    const w = createWorld({ seed: 4 });
    const baker = createTerrainBaker();
    const a = baker.get(w, 0, 0, 1, 1), b = baker.get(w, 1, 0, 0.5, 1);
    expect(baker.bytes(w)).toBe(canvasBytes(a.canvas) + canvasBytes(b.canvas));
    expect(canvasBytes(a.canvas)).toBe(chunkBytes(chunkScaleFor(1, 1)));
    expect(canvasBytes(b.canvas)).toBe(chunkBytes(chunkScaleFor(0.5, 1)));
    expect(chunkBytes(chunkScaleFor(1, 2))).toBe(1560 * 792 * 4);   // a chunk at DPR 2 and zoom 1: about 4.9 MB, so 32 of them were about 160 MB
    baker.get(w, 0, 0, 0.5, 1);                                      // a re-bake at another scale replaces the old one: its bytes go with it
    expect(baker.size(w)).toBe(2);
    expect(baker.bytes(w)).toBe(2 * chunkBytes(chunkScaleFor(0.5, 1)));
  });
  it('evicts the least recently used chunk the frame does not show once the bytes pass the budget, and keeps the count cap', () => {
    const w = createWorld({ seed: 4 });
    const one = chunkBytes(chunkScaleFor(1, 1));
    const baker = createTerrainBaker({ maxBytes: 3 * one });
    baker.frame([{ cx: 0, cy: 0 }]);
    for (const [cx, cy] of [[0, 0], [1, 0], [2, 0], [3, 0]]) baker.get(w, cx, cy, 1, 1);
    expect(baker.size(w)).toBe(3);
    expect(baker.bytes(w)).toBe(3 * one);
    expect(baker.peek(w, 0, 0, 1, 1).fresh).toBe(true);              // shown: kept although it was the oldest
    expect(baker.peek(w, 1, 0, 1, 1).sprite).toBe(null);             // the oldest not shown went
    expect([baker.room(w, 1, 1), baker.room(w, 0.5, 1)]).toEqual([false, false]);   // full, and every chunk looked at in this frame
    baker.frame([{ cx: 0, cy: 0 }], w);                              // the next frame shows (0, 0) alone: (2, 0) and (3, 0) are behind it
    expect(baker.room(w, 1, 1)).toBe(true);                          // so the ring ahead may take a place of theirs
    baker.get(w, 0, 1, 1, 1);
    expect([baker.size(w), baker.bytes(w), baker.peek(w, 2, 0, 1, 1).sprite]).toEqual([3, 3 * one, null]);   // the least recently used went
    baker.frame([{ cx: 0, cy: 0 }], w, one);                         // a frame's lower budget (the sprites need room) lets the others go at once
    expect([baker.size(w), baker.bytes(w)]).toEqual([1, one]);
    baker.get(w, 1, 1, 1, 1);
    baker.trim(w, one);                                              // and so does trim, later in the frame
    expect([baker.size(w), baker.peek(w, 0, 0, 1, 1).fresh]).toEqual([1, true]);
    const counted = createTerrainBaker({ maxChunks: 2 });           // the count of 32 stays an upper bound as before
    for (const cx of [0, 1, 2]) counted.get(w, cx, 0, 1, 1);
    expect(counted.size(w)).toBe(2);
  });
  it('keeps every chunk a view shows when they need more than the budget, so nothing in view is baked twice', () => {
    const w = createWorld({ seed: 4, size: 80 });
    const counter = {};
    const baker = createTerrainBaker({ counter, maxBytes: 2 * chunkBytes(1) });
    const V = { width: 1600, height: 1000 };
    const renderer = createRenderer({ canvas: makeCanvas(V.width, V.height), dpr: 1, baker, spriteCache: createSpriteCache(), maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 40, y: 40, zoom: 0.5 });
    renderer.renderFrame(w, cam, { view: V });
    const shown = renderer.stats.chunks;
    expect(shown).toBeGreaterThan(2);
    expect(baker.size(w)).toBe(shown);                               // over the budget, but every chunk in view is held
    const bakes = counter.bakes;
    for (let i = 0; i < 3; i++) renderer.renderFrame(w, cam, { view: V });
    expect(counter.bakes).toBe(bakes);                               // and none is baked again
    setRoad(w, 38, 40, 42, 40);                                      // a re-bake in view (a road under the middle chunks)
    renderer.renderFrame(w, cam, { view: V });
    const rebaked = counter.bakes - bakes;
    expect(rebaked).toBeGreaterThan(0);
    expect(rebaked).toBeLessThan(shown);
    expect(baker.size(w)).toBe(shown);                               // it evicted no visible chunk
    for (let i = 0; i < 3; i++) renderer.renderFrame(w, cam, { view: V });
    expect(counter.bakes - bakes).toBe(rebaked);                     // and nothing else re-bakes after it
    expect(renderer.stats.prebakes).toBe(0);                         // no ring past the budget
  });
});

describe('v91 p caches: the sprite buckets', () => {
  it('drops a bucket left for SPRITE_IDLE_MS, never the one in use, and counts the bytes it holds', () => {
    const clock = fakeClock();
    const cache = createSpriteCache({ now: clock.now });
    const a = cache.get('house.t1', 1, 1), b = cache.get('granary', 1, 1);
    expect(cache.bytes()).toBe(canvasBytes(a.canvas) + canvasBytes(b.canvas));
    cache.get('house.t1', 2, 1);                                     // zoom 2: another bucket; zoom 1 left at 0
    expect(cache.buckets()).toEqual(['1x1', '2x1']);
    clock.t = SPRITE_IDLE_MS - 1;
    cache.get('house.t1', 0.5, 1);                                   // zoom 2 left now
    expect(cache.buckets().length).toBe(3);                          // zoom 1 not idle long enough yet
    clock.t = 2 * SPRITE_IDLE_MS;
    for (let i = 0; i < 5000; i++) cache.get('house.t1', 0.5, 1);   // staying in one bucket still sweeps now and then
    expect(cache.buckets()).toEqual(['0.5x1']);                      // zoom 1 and 2 dropped; the bucket in use never is
    expect(cache.bytes()).toBe(canvasBytes(cache.get('house.t1', 0.5, 1).canvas));
    expect(cache.drops).toBe(2);
    const again = cache.get('house.t1', 1, 1);                       // coming back draws it again
    expect(again === a).toBe(false);
    expect(cache.buckets()).toEqual(['0.5x1', '1x1']);
  });
  it('keeps a bucket in use however long it is used, and clear() empties the count', () => {
    const clock = fakeClock();
    const cache = createSpriteCache({ now: clock.now });
    const s = cache.get('house.t1', 1, 2);
    clock.t = 10 * SPRITE_IDLE_MS;
    for (let i = 0; i < 5000; i++) cache.get('house.t1', 1, 2);
    expect(cache.get('house.t1', 1, 2)).toBe(s);
    cache.clear();
    expect([cache.bytes(), cache.buckets(), cache.size()]).toEqual([0, [], 0]);
  });
  it('the renderer warms a figure\'s walk slots again after its bucket was dropped', () => {
    const clock = fakeClock(), counter = {};
    const cache = createSpriteCache({ now: clock.now, counter });
    const w = createWorld({ seed: 11 });
    const V = { width: 640, height: 480 };
    const renderer = createRenderer({ canvas: makeCanvas(V.width, V.height), dpr: 1, spriteCache: cache, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const walkers = [{ id: 1, x: 32, y: 32, kind: 'archer', dir: 1 }];
    const at = (zoom, t) => { cam.zoom = zoom; clock.t = t; renderer.renderFrame(w, cam, { view: V, walkers }); };
    at(1, 0);
    expect(cache.get('fig.archer.w1m', 1, 1)).toBeTruthy();
    at(2, 1);                                                         // zoom 1 left at 1
    at(0.5, SPRITE_IDLE_MS + 2);                                      // and dropped at the next switch
    expect(cache.buckets()).toEqual(['2x1', '0.5x1']);
    at(1, SPRITE_IDLE_MS + 3);
    const misses = counter.misses;
    cache.get('fig.archer.w1m', 1, 1);                                // a pose the figure has not shown since: warmed with the others
    expect(counter.misses).toBe(misses);
  });
  it('past its byte budget drops the sprites least recently drawn, never one drawn in this frame, and only once frames are counted', () => {
    const counter = {};
    const one = canvasBytes(createSpriteCache().get('house.t1', 1, 1).canvas);
    const cache = createSpriteCache({ counter, maxBytes: one * 2.5 });
    for (const t of [1, 2, 3, 4]) cache.get(`house.t${t}`, 1, 1);    // no frame yet: a cache used alone keeps everything
    expect([cache.size(), counter.evicted || 0]).toEqual([4, 0]);
    cache.frame();
    cache.get('house.t4', 1, 1); cache.get('house.t3', 1, 1);         // drawn in this frame
    cache.get('granary', 1, 1);                                       // a miss past the budget: t1 and t2 (not drawn since) go
    expect(cache.bytes()).toBeLessThanOrEqual(one * 2.5 + canvasBytes(cache.get('granary', 1, 1).canvas));
    expect(counter.evicted).toBeGreaterThanOrEqual(2);
    const before = counter.misses;
    for (const s of ['house.t4', 'house.t3', 'granary']) cache.get(s, 1, 1);
    expect(counter.misses).toBe(before);                              // this frame's sprites all kept, over the budget if need be
    cache.get('house.t1', 1, 1);
    expect(counter.misses).toBe(before + 1);                          // an evicted one is drawn again when next needed
    expect(cache.bytes()).toBe([...['house.t4', 'house.t3', 'granary', 'house.t1']].reduce((a, s) => a + canvasBytes(cache.get(s, 1, 1).canvas), 0));
  });
});

describe('v91 p caches: P3 on a Large map at DPR 2', () => {
  // Ruling 1687: the two caches keep 64 MB together, except in a frame whose own view needs more (a hilly view at zoom 2: every hill is its own
  // slot, about 0.8 MB at 8 device px per art px), where they hold only what that frame shows.
  it('holds the terrain under its budget and the caches under 64 MB but for what a view itself needs, panned over every chunk at every zoom bucket', () => {
    const w = buildSampleCity(createWorld({ seed: 11, size: 80 }), { days: 120, stageTwoDays: 60 });
    const clock = fakeClock();
    const V = { width: 390, height: 844 };
    const cache = createSpriteCache({ now: clock.now });
    const realGet = cache.get;
    let drawn = new Map();                                            // this frame's sprites and their bytes
    cache.get = (slot, zoom, dpr) => { const s = realGet(slot, zoom, dpr); if (s) drawn.set(slot, canvasBytes(s.canvas)); return s; };
    const renderer = createRenderer({ canvas: makeCanvas(V.width * 2, V.height * 2), dpr: 2, spriteCache: cache });
    const cam = createCamera({ x: 40, y: 40, zoom: 1 });
    const n = Math.ceil(w.size / CHUNK);
    let maxTerrain = 0, maxSprites = 0, maxBoth = 0, frames = 0, over = 0;
    for (const zoom of ZOOM_BUCKETS) {
      cam.zoom = zoom;
      clock.t += SPRITE_IDLE_MS / 2;                                 // a player's few seconds at each zoom: the bucket before last goes
      for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
        cam.x = cx * CHUNK + CHUNK / 2; cam.y = cy * CHUNK + CHUNK / 2;
        let k = 0;
        do {
          drawn = new Map();
          renderer.renderFrame(w, cam, { view: V });
          const c = renderer.cacheBytes(), both = c.terrainBytes + c.spriteBytes;
          maxTerrain = Math.max(maxTerrain, c.terrainBytes); maxSprites = Math.max(maxSprites, c.spriteBytes); maxBoth = Math.max(maxBoth, both);
          if (both > P3_CANVAS_BYTES) {                               // over: only what this frame shows is held
            over++;
            const need = [...drawn.values()].reduce((a, b) => a + b, 0);
            expect([zoom, cx, cy, c.spriteBytes <= Math.max(SPRITE_BUDGET_BYTES, need)]).toEqual([zoom, cx, cy, true]);
            expect([zoom, cx, cy, c.terrainBytes <= Math.max(terrainBudgetFor(c.spriteBytes), renderer.stats.chunks * chunkBytes(3))]).toEqual([zoom, cx, cy, true]);
          }
          k++; frames++;
        } while ((renderer.stats.bakes > 0 || renderer.stats.stale > 0) && k < 24);
        expect([zoom, cx, cy, renderer.stats.stale]).toEqual([zoom, cx, cy, 0]);   // every chunk in view ready before the camera moves on
      }
    }
    expect(maxTerrain).toBeLessThanOrEqual(TERRAIN_BUDGET_BYTES);
    expect(maxSprites).toBeGreaterThan(SPRITE_BUDGET_BYTES);       // a hilly view at zoom 2 draws more than the sprite budget in one frame
    expect(over / frames).toBeLessThan(0.1);   // WAVE2-PIN 9.1 Track P (ruling 1687): new, design target 64 MB (P3 holds in nine frames of ten)
    expect(maxBoth).toBeLessThan(80 * MB);     // WAVE2-PIN 9.1 Track P (ruling 1687): new, design target 64 MB (the worst view measured 77 MB)
    const c = renderer.cacheBytes();
    expect(c).toEqual({ terrainBytes: renderer.baker.bytes(w), spriteBytes: renderer.spriteCache.bytes() });
    expect(renderer.spriteCache.buckets().length).toBe(3);            // zoom 2, and 1.5 and 1 left under SPRITE_IDLE_MS ago; 0.5 and 0.75 dropped
    expect(frames).toBeGreaterThan(5 * n * n);
  });
  it('keeps the terrain at TERRAIN_FLOOR_BYTES under a sprite-heavy hilly view at zoom 2, so its ring is baked once, not frame after frame', () => {
    const w = buildSampleCity(createWorld({ seed: 11, size: 80 }), { days: 120, stageTwoDays: 60 });
    const V = { width: 390, height: 844 };
    const counter = {};
    // Sprites past 48 MB (64 less the floor): the hilliest view's own (about 41 MB here) and the whole city's at zoom 2, kept by an unbounded cache.
    const sprites = createSpriteCache({ maxBytes: Infinity });
    const renderer = createRenderer({ canvas: makeCanvas(V.width * 2, V.height * 2), dpr: 2, spriteCache: sprites, baker: createTerrainBaker({ counter }) });
    const cam = createCamera({ x: 40, y: 40, zoom: 2 });
    for (let y = 4; y < w.size; y += 8) for (let x = 4; x < w.size; x += 8) { cam.x = x; cam.y = y; renderer.renderFrame(w, cam, { view: V }); }
    expect(terrainBudgetFor(sprites.bytes())).toBe(TERRAIN_FLOOR_BYTES);
    cam.x = 3 * CHUNK + CHUNK / 2; cam.y = 2 * CHUNK + CHUNK / 2;    // the hilliest view of this city at zoom 2
    let quiet = 0;
    for (let i = 0; i < 120 && quiet < 5; i++) {
      const s = renderer.renderFrame(w, cam, { view: V });
      quiet = s.bakes === 0 && s.prebakes === 0 ? quiet + 1 : 0;
    }
    expect(quiet).toBe(5);                                           // settled: the view and what of the ring fits are baked
    const c = renderer.cacheBytes();
    expect(c.spriteBytes).toBeGreaterThan(CACHES_BUDGET_BYTES - TERRAIN_FLOOR_BYTES);   // the sprites alone would leave the terrain under the floor
    expect(c.terrainBytes).toBeGreaterThan(Math.max(TERRAIN_FLOOR_BYTES - chunkBytes(3), renderer.stats.chunks * chunkBytes(3) - 1));   // the floor (or the view, if more) is held
    const bakes = counter.bakes;
    for (let i = 0; i < 20; i++) {
      const s = renderer.renderFrame(w, cam, { view: V });
      expect([i, s.bakes, s.prebakes]).toEqual([i, 0, 0]);
    }
    expect(counter.bakes).toBe(bakes);
  });
});
