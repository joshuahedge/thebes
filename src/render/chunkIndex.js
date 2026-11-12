// Version 5.0 (Task 0, contract section 4): the buildings by chunk (CHUNK x CHUNK tiles, the terrain bake's chunks), so drawing and
// hit-testing look only at the buildings near the view instead of every building in the city. A building is listed in every chunk its
// footprint touches. Built once per world and rebuilt whenever its buildings change (buildingsVersion, bumped by insertBuilding and
// removeBuilding); kept beside the world, never saved. The index holds ids, so a building deleted behind its back is skipped, never drawn.
import { CHUNK } from './camera.js';
import { buildingsVersion } from '../sim/world.js';

const indexes = new WeakMap();   // world -> { version, per, chunks }

const chunkOf = (t) => Math.floor(t / CHUNK);

// { version, per, chunks }: per is chunks to a row (ceil(size / CHUNK)), chunks[cy * per + cx] the ids whose footprint touches that chunk,
// ascending.
export function chunkIndex(world) {
  const version = buildingsVersion(world);
  const had = indexes.get(world);
  if (had && had.version === version && had.size === world.size) return had;
  const per = Math.ceil(world.size / CHUNK);
  const chunks = Array.from({ length: per * per }, () => []);
  for (const b of Object.values(world.buildings)) {          // ascending id, so each list is too
    for (let cy = chunkOf(b.y); cy <= chunkOf(b.y + b.d - 1); cy++) {
      for (let cx = chunkOf(b.x); cx <= chunkOf(b.x + b.w - 1); cx++) {
        if (cx >= 0 && cy >= 0 && cx < per && cy < per) chunks[cy * per + cx].push(b.id);
      }
    }
  }
  const index = { version, size: world.size, per, chunks };
  indexes.set(world, index);
  return index;
}

const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;

// The buildings whose footprint meets the inclusive tile range { x0, y0, x1, y1 }, each once, ascending id: the same list (and order) as
// Object.values(world.buildings) filtered by the range, from the chunks the range touches only.
export function buildingsInRange(world, range) {
  const { per, chunks } = chunkIndex(world);
  const cx0 = Math.max(0, chunkOf(range.x0)), cy0 = Math.max(0, chunkOf(range.y0));
  const cx1 = Math.min(per - 1, chunkOf(range.x1)), cy1 = Math.min(per - 1, chunkOf(range.y1));
  const out = [];
  let spans = false;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      for (const id of chunks[cy * per + cx]) {
        const b = world.buildings[id];
        if (!b || !intersects(b, range)) continue;
        // A building over several chunks is taken from the first of them inside the range only, so it is listed once.
        if (Math.max(chunkOf(b.x), cx0) !== cx || Math.max(chunkOf(b.y), cy0) !== cy) continue;
        if (out.length && out[out.length - 1].id > id) spans = true;
        out.push(b);
      }
    }
  }
  if (spans) out.sort((a, b) => a.id - b.id);
  return out;
}

// Version 10.0 (Track P, ruling 2284): the buildings of the chunk ring `ring` chunks outside the chunks the tile range { x0, y0, x1, y1 } touches
// (the band a pan reaches next), each once, the chunks nearest the range's middle first (a building over the ring's edge is listed too: its sprite
// is cached already when the view drew it). The sprite cache's warm band (spriteCache.js warmBand) renders their slots ahead.
export function ringBuildings(world, range, ring = 1) {
  const { per, chunks } = chunkIndex(world);
  const cx0 = Math.max(0, chunkOf(range.x0)), cy0 = Math.max(0, chunkOf(range.y0));
  const cx1 = Math.min(per - 1, chunkOf(range.x1)), cy1 = Math.min(per - 1, chunkOf(range.y1));
  const inner = (cx, cy) => cx >= cx0 && cx <= cx1 && cy >= cy0 && cy <= cy1;
  const mx = (cx0 + cx1) / 2, my = (cy0 + cy1) / 2, band = [];
  for (let cy = Math.max(0, cy0 - ring); cy <= Math.min(per - 1, cy1 + ring); cy++) {
    for (let cx = Math.max(0, cx0 - ring); cx <= Math.min(per - 1, cx1 + ring); cx++) if (!inner(cx, cy)) band.push({ cx, cy, d: Math.hypot(cx - mx, cy - my) });
  }
  band.sort((a, b) => a.d - b.d || a.cy - b.cy || a.cx - b.cx);
  const seen = new Set(), out = [];
  for (const { cx, cy } of band) {
    for (const id of chunks[cy * per + cx]) {
      const b = world.buildings[id];
      if (!b || seen.has(id)) continue;
      seen.add(id);
      out.push(b);
    }
  }
  return out;
}

// The buildings with a footprint tile within r tiles (a square) of the tile point (x, y): hit-testing's candidates near a tap.
export function buildingsNear(world, x, y, r) {
  return buildingsInRange(world, { x0: Math.floor(x - r), y0: Math.floor(y - r), x1: Math.floor(x + r), y1: Math.floor(y + r) });
}
