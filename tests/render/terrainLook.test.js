import { describe, it, expect } from '../harness.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { bakeChunk, createTerrainBaker, BLOTCH_ALPHA, CHUNK } from '../../src/render/terrainBaker.js';
import { drawRiver, SHALLOWS_TILES } from '../../src/render/terrainWater.js';
import { createRenderer, EDGE_FADE } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p, artToTile } from '../../src/render/iso.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, hexToRgb, nearColour } from '../helpers/canvas.js';

// WCAG relative luminance on the 0-1 scale, and HSL lightness.
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const lightness = ([r, g, b]) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Every device pixel of a baked chunk whose tile point lies inside one of `tiles`, kept `margin` tiles in
// from the tile's edges (so the soft blend edge is left out), as [r, g, b].
function tilePixels(sprite, tiles, margin = 0.12) {
  const o = p(sprite.cx * CHUNK, sprite.cy * CHUNK);
  const { width } = sprite.canvas;
  const data = sprite.canvas.getContext('2d').getImageData(0, 0, width, sprite.canvas.height).data;
  const dev = (ax, ay) => [sprite.ax + (ax - o[0]) * sprite.scale, sprite.ay + (ay - o[1]) * sprite.scale];
  const out = [];
  for (const [tx, ty] of tiles) {
    const [x0] = dev(...p(tx, ty + 1)), [x1] = dev(...p(tx + 1, ty));
    const [, y0] = dev(...p(tx, ty)), [, y1] = dev(...p(tx + 1, ty + 1));
    for (let dy = Math.floor(y0); dy <= y1; dy++) {
      for (let dx = Math.floor(x0); dx <= x1; dx++) {
        const t = artToTile(o[0] + (dx - sprite.ax) / sprite.scale, o[1] + (dy - sprite.ay) / sprite.scale);
        if (t.x < tx + margin || t.x > tx + 1 - margin || t.y < ty + margin || t.y > ty + 1 - margin) continue;
        const k = (dy * width + dx) * 4;
        out.push([data[k], data[k + 1], data[k + 2]]);
      }
    }
  }
  return out;
}

const block = (x0, x1, y0, y1) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };

describe('terrain look', () => {
  it('paints fertile land as dark loam that reads against sand at a glance', () => {
    expect(TERRAIN.fertile).toBe('#A8885C');
    expect(TERRAIN.fertileSoft).toBe('#BC9C6E');
    const sand = luminance(hexToRgb(TERRAIN.sand)), loam = luminance(hexToRgb(TERRAIN.fertile)), soft = luminance(hexToRgb(TERRAIN.fertileSoft));
    expect(sand - loam).toBeGreaterThanOrEqual(0.12);
    expect(soft).toBeGreaterThan(loam);                       // the soft edge feathers loam towards sand
    expect(soft).toBeLessThan(sand);
    expect(luminance(hexToRgb(TERRAIN.fertileSpeck))).toBeLessThan(loam);
    // Every third speckle is a pale crumb, drawn at 0.7 alpha (terrainBaker.js): it must read against the loam, lighter.
    const crumb = hexToRgb(TERRAIN.fertileSecond).map((c, i) => 0.7 * c + 0.3 * hexToRgb(TERRAIN.fertile)[i]);
    expect(luminance(crumb) - loam).toBeGreaterThanOrEqual(0.06);
    expect(luminance(hexToRgb(TERRAIN.fertileSecond))).toBeGreaterThan(soft);
    for (const key of ['offMap', 'edgeFade', 'fertileSpeck', 'fertileTuft', 'shallows']) expect(typeof TERRAIN[key]).toBe('string');
  });
  it('makes the meadow a saturated green and the ground past the map a darker, quieter sand', () => {
    expect(TERRAIN.grass).toBe('#86B04A');
    const greenness = (hex) => { const [r, g] = hexToRgb(hex); return g - r; };
    expect(greenness(TERRAIN.grass)).toBeGreaterThan(30);
    expect(greenness(TERRAIN.grass)).toBeGreaterThan(greenness(TERRAIN.sand));
    expect(greenness(TERRAIN.grassSecond)).toBeGreaterThan(greenness(TERRAIN.grassSoft));
    expect(TERRAIN.offMap).toBe('#C8AE7C');
    expect(TERRAIN.sandOff).toBe(TERRAIN.offMap);
    expect(luminance(hexToRgb(TERRAIN.offMap))).toBeLessThan(luminance(hexToRgb(TERRAIN.sand)));
    expect(luminance(hexToRgb(TERRAIN.edgeFade))).toBeLessThan(luminance(hexToRgb(TERRAIN.offMap)));
  });
  it('keeps the sand blotches faint and within a narrow lightness band', () => {
    expect(BLOTCH_ALPHA).toBeLessThanOrEqual(0.25);
    const sand = lightness(hexToRgb(TERRAIN.sand));
    for (const hex of TERRAIN.blotches) expect(Math.abs(lightness(hexToRgb(hex)) - sand)).toBeLessThanOrEqual(0.04);
  });
  it('bakes fertile tiles much darker than sand, textured with speckles and tufts', () => {
    const s = bakeChunk(riverWorld(), 0, 1, 2);
    const loam = tilePixels(s, block(7, 9, 18, 22));              // fertile, free, away from the bank and the meadow
    const sand = tilePixels(s, block(12, 14, 26, 28));            // open desert
    expect(loam.length).toBeGreaterThan(1000);
    expect(mean(sand.map(luminance)) - mean(loam.map(luminance))).toBeGreaterThanOrEqual(0.12);
    const main = luminance(hexToRgb(TERRAIN.fertile));
    const specks = loam.filter((c) => luminance(c) < main - 0.05).length;
    const tufts = loam.filter(([r, g, b]) => g > r + 8 && g > b + 30).length;
    expect(specks).toBeGreaterThan(10);
    expect(tufts).toBeGreaterThan(3);
  });
  it('lays a turquoise shallows strip inside each bank, between the foam line and the channel', () => {
    const w = makeTestWorld({ size: 24, fertile: [] });
    for (let y = 0; y < 24; y++) for (let x = 10; x <= 13; x++) w.terrain[idx(24, x, y)] = T.WATER;   // a straight river four tiles wide
    const c = makeCanvas(600, 500);
    const ctx = c.getContext('2d');
    const ox = 100, oy = -150, k = 2;
    ctx.translate(ox, oy);
    drawRiver(makeDraw(ctx, k), w, { x0: 0, y0: 0, x1: 23, y1: 23 });
    const at = (tx, ty) => pixelAt(c, ox + p(tx, ty)[0] * k, oy + p(tx, ty)[1] * k);
    const wobble = (y) => Math.sin(y * 1.3) * 0.12 + Math.sin(y * 0.47) * 0.18;   // terrainWater's bank wobble
    let shallows = 0, channel = 0, rows = 0;
    for (let y = 3; y <= 12; y++) {
      const bank = 10 - 0.05 + wobble(y);                         // the left bank curve at this row's centre
      rows++;
      if (nearColour(at(bank + SHALLOWS_TILES * 0.68, y + 0.5), TERRAIN.shallows, 30)) shallows++;
      if (nearColour(at(bank + SHALLOWS_TILES * 2, y + 0.5), TERRAIN.water, 30)) channel++;
    }
    expect(shallows).toBeGreaterThanOrEqual(Math.ceil(rows * 0.6));
    expect(channel).toBeGreaterThanOrEqual(Math.ceil(rows * 0.6));
  });
  it('cuts a chunk to its diamond without paling its edge pixels, so no line shows along chunk borders', () => {
    const w = makeTestWorld({ size: 32, fertile: [[0, 0, 32, 32]] });   // loam everywhere
    const s = bakeChunk(w, 0, 0, 2);
    const d = s.canvas.getContext('2d').getImageData(0, 0, s.canvas.width, s.canvas.height).data;
    const edge = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 64 && d[i + 3] <= 250) edge.push([d[i], d[i + 1], d[i + 2]]);
    expect(edge.length).toBeGreaterThan(100);
    // A clip on every layer blended the sand beneath into these partly covered pixels (about 20 levels paler).
    expect(Math.abs(mean(edge.map((c) => c[0])) - hexToRgb(TERRAIN.fertile)[0])).toBeLessThan(12);
  });
  it('fills past the map with the off-map sand and fades the map edge into it', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    // Camera centre p(21, 33) = art (-192, 432). At that art y the map's bottom-left edge (y = 32) is at tile
    // x 22, art x -160: screen (264, 150). The map lies to the right of it.
    renderer.renderFrame(w, createCamera({ x: 21, y: 33, zoom: 1 }), { view: { width: 400, height: 300 } });
    const far = pixelAt(canvas, 20, 150);                          // nearly four tiles off the map
    const edge = pixelAt(canvas, 258, 150);                        // 3 art px outside the edge
    const inside = pixelAt(canvas, 300, 150);                      // sand on the map
    expect(nearColour(far, TERRAIN.offMap, 3)).toBe(true);
    expect(nearColour(edge, TERRAIN.offMap, 6)).toBe(false);
    expect(edge[0] + edge[1] + edge[2]).toBeLessThan(far[0] + far[1] + far[2]);
    expect(nearColour(inside, TERRAIN.offMap, 6)).toBe(false);
    expect(EDGE_FADE.length).toBeGreaterThan(1);
  });
});
