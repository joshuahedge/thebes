import { describe, it, expect } from '../../harness.js';
import { chunkSignature, bakeChunk } from '../../../src/render/terrainBaker.js';
import { wallCode, wallPieceAt, runsAlongX } from '../../../src/render/terrainWalls.js';
import { wallPiece, gatePiece, breachPiece, WALL } from '../../../src/render/art/defence.js';
import { p, U } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { MUD2 } from '../../../src/render/art/palette.js';
import { idx } from '../../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { chunkPixel } from '../../helpers/renderWorld.js';
import { makeCanvas, canvasHash, nearColour } from '../../helpers/canvas.js';

const setWall = (w, x, y, v) => { w.wall[idx(w.size, x, y)] = v; };

// The highest inked row (art px, the tile's back corner at 0) of one piece drawn alone at scale 3.
function inkTop(draw) {
  const c = makeCanvas(150, 150), ctx = c.getContext('2d');
  ctx.translate(75, 100);
  draw(makeDraw(ctx, 3));
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) return (y - 100) / 3;
  return null;
}

describe('s3 art walls on the map', () => {
  it('reads each wall tile as a band piece linked to its neighbours, a gate on a road, or broken stone at a breach', () => {
    const w = makeTestWorld({ fertile: [] });
    for (let x = 4; x <= 8; x++) setWall(w, x, 10, 40);
    for (let y = 11; y <= 13; y++) setWall(w, 8, y, 40);
    setRoad(w, 6, 6, 6, 14);
    setWall(w, 5, 10, -1);
    expect([wallCode(w, 4, 10), wallCode(w, 5, 10), wallCode(w, 3, 10), wallCode(w, -1, 10)]).toEqual([1, 2, 0, 0]);
    expect(wallPieceAt(w, 4, 10)).toEqual({ kind: 'wall', links: { n: 0, e: 2, s: 0, w: 0 } });     // its east arm ends broken
    expect(wallPieceAt(w, 7, 10)).toEqual({ kind: 'wall', links: { n: 0, e: 1, s: 0, w: 1 } });
    expect(wallPieceAt(w, 8, 10)).toEqual({ kind: 'wall', links: { n: 0, e: 0, s: 1, w: 1 } });     // the corner
    expect(wallPieceAt(w, 6, 10)).toEqual({ kind: 'gate', alongX: true });                          // the wall over the road
    expect(wallPieceAt(w, 5, 10)).toEqual({ kind: 'breach', alongX: true });
    expect(wallPieceAt(w, 3, 3)).toBe(null);
    const v = makeTestWorld({ fertile: [] });
    setRoad(v, 2, 5, 9, 5);
    setWall(v, 5, 5, 40);
    expect([runsAlongX(v, 5, 5), wallPieceAt(v, 5, 5)]).toEqual([false, { kind: 'gate', alongX: false }]);   // a lone gate turns across its road
    setWall(w, 8, 14, 80);
    addRaw(w, 'tower', 8, 14);
    expect(wallPieceAt(w, 8, 13).links.s).toBe(1);                                                    // a tower on a wall tile is part of the ring
  });
  it('re-bakes a chunk when a wall tile under it or in the ring it draws appears, breaks or goes, not when it is only hit', () => {
    const w = makeTestWorld({ fertile: [] });
    const sig = () => [chunkSignature(w, 0, 0), chunkSignature(w, 1, 0), chunkSignature(w, 0, 1)];
    const none = sig();
    setWall(w, 5, 5, 40);
    const one = sig();
    expect([one[0] === none[0], one[1] === none[1], one[2] === none[2]]).toEqual([false, true, true]);
    setWall(w, 5, 5, 12);
    expect(sig()).toEqual(one);
    setWall(w, 5, 5, -1);
    expect(sig()[0] === one[0]).toBe(false);
    setWall(w, 5, 5, 0);
    expect(sig()).toEqual(none);
    setWall(w, 17, 5, 40);                                                       // chunk (1, 0), inside chunk (0, 0)'s two-tile ring
    const ring = sig();
    expect([ring[0] === none[0], ring[1] === none[1], ring[2] === none[2]]).toEqual([false, false, true]);
  });
  it('bakes the walls into the terrain as a mudbrick band standing over the ground and the road it crosses', () => {
    const w = makeTestWorld({ fertile: [] });
    setRoad(w, 2, 8, 12, 8);
    const plain = bakeChunk(w, 0, 0, 2);
    for (let y = 4; y <= 12; y++) setWall(w, 7, y, 40);
    const walled = bakeChunk(w, 0, 0, 2);
    expect(canvasHash(walled.canvas) === canvasHash(plain.canvas)).toBe(false);
    for (const y of [5, 10]) {
      const px = chunkPixel(walled, 7, y);
      expect([y, MUD2.some((c) => nearColour(px, c, 30))]).toEqual([y, true]);
      expect([y, nearColour(px, '#EBD6A8', 8)]).toEqual([y, false]);           // no longer the bare sand
    }
    expect(wallPieceAt(w, 7, 8)).toEqual({ kind: 'gate', alongX: false });
  });
  it('stands a gate taller than the wall and a breach lower', () => {
    const wall = inkTop((g) => wallPiece(g, 0, 0, { n: 1, s: 1 }));
    const gate = inkTop((g) => gatePiece(g, 0, 0, false));
    const breach = inkTop((g) => breachPiece(g, 0, 0, false));
    expect(gate).toBeLessThan(wall - 3);
    expect(breach).toBeGreaterThan(wall + 3);
  });
  it('draws a run of wall tiles as one band, with no seam where the tiles meet', () => {
    for (const alongX of [true, false]) {
      const c = makeCanvas(260, 200), ctx = c.getContext('2d');
      const S = 3, ox = 130, oy = 60;
      ctx.translate(ox, oy);
      const g = makeDraw(ctx, S);
      const at = (k) => (alongX ? [k, 0] : [0, k]);
      const links = (k) => (alongX ? { w: k > 0 ? 1 : 0, e: k < 2 ? 1 : 0 } : { n: k > 0 ? 1 : 0, s: k < 2 ? 1 : 0 });
      for (let k = 0; k < 3; k++) wallPiece(g, ...at(k), links(k));                // back to front, as drawWalls does
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const px = (q) => { const i = (Math.round(q[1] * S + oy) * c.width + Math.round(q[0] * S + ox)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
      // Along the face toward the viewer, half way between two courses: the same mudbrick all the way, joints included.
      const face = (u) => U(alongX ? p(u, 0.5 + WALL.t / 2) : p(0.5 + WALL.t / 2, u), 3);
      const samples = [];
      for (let u = 0.4; u <= 2.6; u += 0.05) samples.push(px(face(u)));                 // the run's ends stand in from the tile edges
      const worst = Math.max(...samples.slice(1).map((q, i) => Math.max(...q.map((v, ch) => Math.abs(v - samples[i][ch])))));
      expect([alongX, samples.every((q) => q[3] === 255), worst < 10]).toEqual([alongX, true, true]);
    }
  });
});
