import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART, slotFor, boundsFor } from '../../../src/render/art/registry.js';
import { SUPPLY_TYPES, SUPPLY_TINT, supplySlot, brickworksStage, buildersGuild, quarry, brickworks } from '../../../src/render/art/supply.js';
import { plazaEdges, sphinxFacing, plaza, sphinx } from '../../../src/render/art/plaza.js';
import { PALACE_DRAW, PALACE_HEIGHT, scaffolding } from '../../../src/render/art/palace.js';
import { PALACE_STYLES } from '../../../src/data/palace.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { CATEGORY_TINT } from '../../../src/data/ui.js';
import { drawThumb } from '../../../src/ui/thumbs.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash, hexToRgb } from '../../helpers/canvas.js';

// A building drawn alone at scale 2 (zoom 1 on a 1x screen), its art origin at canvas (200, 140).
function drawAlone(fn) {
  const c = makeCanvas(400, 300);
  const ctx = c.getContext('2d');
  ctx.translate(200, 140);
  fn(makeDraw(ctx, 2));
  return c;
}
const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
const solid = (c) => { const d = pixels(c); let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 250) n++; return n; };
// The highest canvas row with solid ink: smaller is taller.
const topRow = (c) => { const d = pixels(c); for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 250) return y; return c.height; };
const countNear = (c, hex, tol = 24) => {
  const [r, g, b] = hexToRgb(hex), d = pixels(c);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 250 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol) n++;
  return n;
};

describe('s4 art supply buildings', () => {
  it('draws the guild, quarry and brickworks with ink, a look of their own and a gold Monuments pennant', () => {
    expect(SUPPLY_TINT).toBe(CATEGORY_TINT.monuments);
    const hashes = new Set();
    for (const fn of [buildersGuild, quarry, brickworks]) {
      const c = drawAlone((g) => fn(g, 0, 0));
      expect(solid(c)).toBeGreaterThan(2500);
      expect(countNear(c, SUPPLY_TINT, 12)).toBeGreaterThan(10);                    // the pennant
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(3);
  });

  it('registers working and idle 2x2 slots with bounds from their height, and the brickworks by its drying rows', () => {
    for (const type of SUPPLY_TYPES) {
      for (const slot of [type, `${type}.idle`]) {
        const e = ART[slot];
        expect([slot, e.w, e.d, BUILDINGS[type].w, BUILDINGS[type].d]).toEqual([slot, 2, 2, 2, 2]);
        expect([slot, e.bounds]).toEqual([slot, boundsFor(2, 2, e.height)]);
        expect(e.shadows.length).toBeGreaterThan(0);
      }
      const at = drawAlone((g) => ART[type].draw(g, 0, 0)), idle = drawAlone((g) => ART[`${type}.idle`].draw(g, 0, 0));
      expect([type, canvasHash(at) !== canvasHash(idle)]).toEqual([type, true]);
    }
    const rows = [1, 2, 3].map((r) => countNear(drawAlone((g) => ART[`brickworks.s${r}`].draw(g, 0, 0)), '#DCB57E', 6));   // the bricks' tops
    expect(rows[1]).toBeGreaterThan(rows[0]);
    expect(rows[2]).toBeGreaterThan(rows[1]);
  });

  it('shows a supply building nobody works at, or a paused one, idle; a brickworks by how many of its workers it has', () => {
    const need = BUILDINGS.brickworks.workers;
    expect([0, 3, need / 2 - 1, need / 2, need - 1, need].map((staff) => brickworksStage({ staff }))).toEqual([1, 1, 1, 2, 2, 3]);
    const w = makeTestWorld();
    const guild = addRaw(w, 'builders_guild', 10, 10, { staff: 0 });
    const q = addRaw(w, 'quarry', 14, 10, { staff: 10 });
    const bw = addRaw(w, 'brickworks', 18, 10, { staff: 4 });
    expect([slotFor(guild, w), slotFor(q, w), slotFor(bw, w)]).toEqual(['builders_guild.idle', 'quarry', 'brickworks.s2']);
    guild.staff = 16; q.paused = true; bw.staff = 0;
    expect([slotFor(guild, w), slotFor(q, w), slotFor(bw, w)]).toEqual(['builders_guild', 'quarry.idle', 'brickworks.idle']);
    expect([supplySlot({ type: 'brickworks', staff: need }), supplySlot({ type: 'quarry' })]).toEqual(['brickworks.s3', 'quarry.idle']);
  });
});

describe('s4 art palace', () => {
  it('draws five styles, each its own and each grander than the last', () => {
    const shots = PALACE_DRAW.map((fn) => drawAlone((g) => fn(g, 0, 0)));
    expect(new Set(shots.map(canvasHash)).size).toBe(5);
    const ink = shots.map(solid), tops = shots.map(topRow);
    for (let i = 1; i < 5; i++) expect([i, ink[i] > ink[0]]).toEqual([i, true]);   // every enlargement covers more of the plot
    expect(tops[2]).toBeLessThan(tops[1]);                                        // the pylons' banners rise over the columned hall
    expect(countNear(shots[3], '#E2B13C', 12)).toBeGreaterThan(countNear(shots[2], '#E2B13C', 12));   // gilded: more gold
    expect(countNear(shots[4], '#2C4F9E', 12)).toBeGreaterThan(100);             // lapis
    expect(countNear(shots[3], '#2C4F9E', 12)).toBe(0);
  });

  it('registers a 3x3 slot per style and a scaffolded one while it is enlarged, chosen by style and works', () => {
    expect(PALACE_HEIGHT.length).toBe(PALACE_STYLES.length);
    for (let i = 0; i < PALACE_STYLES.length; i++) {
      for (const slot of [`palace.s${i}`, `palace.s${i}.w`]) expect([slot, ART[slot].w, ART[slot].d, ART[slot].bounds]).toEqual([slot, 3, 3, boundsFor(3, 3, PALACE_HEIGHT[i])]);
    }
    const plain = drawAlone((g) => ART['palace.s1'].draw(g, 0, 0)), works = drawAlone((g) => ART['palace.s1.w'].draw(g, 0, 0));
    expect(solid(works)).toBeGreaterThan(solid(plain));                           // the timber and the workers
    expect(canvasHash(drawAlone((g) => ART.palace.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => PALACE_DRAW[0](g, 0, 0))));   // the card: as built
    const w = makeTestWorld();
    const b = addRaw(w, 'palace', 10, 10, { style: 2, works: null });
    expect(slotFor(b, w)).toBe('palace.s2');
    b.works = { style: 3, left: 40 };
    expect(slotFor(b, w)).toBe('palace.s2.w');                                    // the old style stands until the works end
    expect(slotFor({ type: 'palace' })).toBe('palace.s0');
    expect(typeof scaffolding).toBe('function');
  });
});

describe('s4 art plazas and sphinxes', () => {
  it('joins painted plazas: the kerb runs only along a court\'s open edges, one slot per set of neighbours', () => {
    const w = makeTestWorld();
    const a = addRaw(w, 'plaza', 10, 10), b = addRaw(w, 'plaza', 11, 10), c = addRaw(w, 'plaza', 10, 11);
    const lone = addRaw(w, 'plaza', 20, 20);
    addRaw(w, 'sphinx', 12, 10);                                                  // a sphinx is not a plaza
    expect([plazaEdges(w, a), plazaEdges(w, b), plazaEdges(w, c), plazaEdges(w, lone)]).toEqual([2 | 4, 8, 1, 0]);
    expect([slotFor(a, w), slotFor(lone, w), slotFor(a)]).toEqual(['plaza.e6', 'plaza.e0', 'plaza']);
    const hashes = new Set();
    for (let m = 0; m < 16; m++) {
      expect([m, ART[`plaza.e${m}`].w, ART[`plaza.e${m}`].d, ART[`plaza.e${m}`].shadows]).toEqual([m, 1, 1, []]);
      hashes.add(canvasHash(drawAlone((g) => plaza(g, 0, 0, m))));
    }
    expect(hashes.size).toBe(16);
    const tile = drawAlone((g) => plaza(g, 0, 0, 0));
    expect(countNear(tile, '#3F6FA6', 16)).toBeGreaterThan(150);                  // the blue checks
    expect(countNear(tile, '#F3EAD6', 10)).toBeGreaterThan(150);                  // and the white
  });

  it('turns a sphinx towards the nearest road, along the axis it lies further along; with none near, to the viewer\'s left', () => {
    const w = makeTestWorld();
    const s = addRaw(w, 'sphinx', 15, 15);
    expect(sphinxFacing(w, s)).toBe(1);                                           // no road within 6 tiles
    setRoad(w, 18, 10, 18, 20);                                                   // 3 tiles to the +x side
    expect([sphinxFacing(w, s), slotFor(s, w)]).toEqual([0, 'sphinx.f0']);
    setRoad(w, 10, 13, 20, 13);                                                   // 2 tiles to the -y side: nearer
    expect(sphinxFacing(w, s)).toBe(3);
    setRoad(w, 13, 14, 13, 16);                                                   // (13, 15) is as near as (15, 13): the lower tile index wins
    expect(sphinxFacing(w, s)).toBe(3);
    setRoad(w, 14, 16, 16, 16);                                                   // right beside it on +y
    expect(sphinxFacing(w, s)).toBe(1);
    const f2 = makeTestWorld(), t = addRaw(f2, 'sphinx', 15, 15);
    setRoad(f2, 12, 14, 12, 16);
    expect(sphinxFacing(f2, t)).toBe(2);
    const shots = [0, 1, 2, 3].map((f) => canvasHash(drawAlone((g) => sphinx(g, 0, 0, f))));
    expect(new Set(shots).size).toBe(4);
    for (let f = 0; f < 4; f++) expect([f, ART[`sphinx.f${f}`].w, ART[`sphinx.f${f}`].d]).toEqual([f, 1, 1]);
  });

  it('gives the plaza card a little court of four tiles, and the palace and supply cards their own drawings', () => {
    const one = drawThumb(makeCanvas(1, 1), 'plaza', 1), guild = drawThumb(makeCanvas(1, 1), 'builders_guild', 1), pal = drawThumb(makeCanvas(1, 1), 'palace', 1);
    for (const c of [one, guild, pal]) expect(solid(c)).toBeGreaterThan(400);
    expect(countNear(one, '#3F6FA6', 30)).toBeGreaterThan(60);
    expect(new Set([one, guild, pal].map(canvasHash)).size).toBe(3);
  });
});
