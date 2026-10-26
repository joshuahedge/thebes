// Version 8.2 Track G (rulings 1300-1305): the Great oasis. No river anywhere; one great lake (about 3x the 7.0 oasis pond's area at Normal), its
// bank and fertile ring, 2-4 spring pools listed as oases, at least one dry wadi; the start beside the lake's ring and the trade road over the desert.
// Playable on 200 seeds at every offered size (25 on Huge): the 7.1 checks, less the Quay site (no river: no Quay). 'auto' picks it about one in nine
// and never picks the old oasis, which still draws as in 7.1.1.
import { describe, it, expect } from '../../harness.js';
import { generateMap, variantFor } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { MAP, MAP_VARIANTS, MAP_VARIANTS_70, MAP_VARIANTS_71, MAP_VARIANTS_OFFERED, MAP_SIZES, hasRiver } from '../../../src/data/map.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds, NEIGHBOURS4 } from '../../../src/sim/grid.js';
import { floodplainOf } from '../../../src/sim/flood.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { LAYOUT_NAMES } from '../../../src/ui/v71/mapsText.js';
import { playability } from '../../v71/m/check.js';

const SIZES = Object.values(MAP_SIZES);
const seedsFor = (size) => (size > 80 ? 25 : 200);

// The 4-linked pieces of water on a map, each a list of tile indices, largest first.
export function waterPieces(m) {
  const n = m.size, seen = new Uint8Array(n * n), out = [];
  for (let s = 0; s < n * n; s++) {
    if (m.terrain[s] !== T.WATER || seen[s]) continue;
    const q = [s];
    seen[s] = 1;
    for (let k = 0; k < q.length; k++) {
      const x = q[k] % n, y = (q[k] - x) / n;
      for (const [dx, dy] of NEIGHBOURS4) {
        if (!inBounds(n, x + dx, y + dy)) continue;
        const j = idx(n, x + dx, y + dy);
        if (m.terrain[j] === T.WATER && !seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    out.push(q);
  }
  return out.sort((a, b) => b.length - a.length);
}
const onEdge = (n, i) => { const x = i % n, y = (i - x) / n; return x === 0 || y === 0 || x === n - 1 || y === n - 1; };
const near = (n, a, b) => Math.hypot((a % n) - (b % n), Math.floor(a / n) - Math.floor(b / n));

describe('v82 g great oasis (the list and the pick)', () => {
  it("appends 'great-oasis' after the twelve, offers it and not the old oasis, and saves, loads and validates a city of it", () => {
    expect(MAP_VARIANTS).toEqual([...MAP_VARIANTS_70, ...MAP_VARIANTS_71, 'great-oasis']);
    expect(MAP_VARIANTS_OFFERED).toEqual(MAP_VARIANTS.filter((v) => v !== 'oasis'));
    expect([hasRiver('great-oasis'), ...MAP_VARIANTS.filter((v) => v !== 'great-oasis').map(hasRiver)]).toEqual([false, ...MAP_VARIANTS.slice(0, -1).map(() => true)]);
    expect([LAYOUT_NAMES['great-oasis'], LAYOUT_NAMES.oasis]).toEqual(['Oasis', 'River oasis']);
    const w = createWorld({ seed: 21, mapVariant: 'great-oasis' });
    const back = deserialize(serialize(w));
    expect([validateWorld(JSON.parse(serialize(w))), back.mapVariant, back.terrain.join('') === w.terrain.join(''), back.oases.length === w.oases.length]).toEqual([true, 'great-oasis', true, true]);
  });
  it("'auto' picks the Great oasis about one in nine, never the old oasis, and every other layout from the seed alone", () => {
    let great = 0;
    const seen = new Set();
    for (let seed = 1; seed <= 3000; seed++) { const v = variantFor(seed); seen.add(v); if (v === 'great-oasis') great++; }
    expect([great / 3000 > 0.09, great / 3000 < 0.135]).toEqual([true, true]);
    expect([...seen].sort()).toEqual([...MAP_VARIANTS_OFFERED].sort());
    const seed = [...Array(400).keys()].find((s) => variantFor(s) === 'great-oasis');
    const w = createWorld({ seed, mapVariant: 'auto' });
    expect([w.mapVariant, w.terrain.join('') === generateMap(seed, 64, 'great-oasis').terrain.join('')]).toEqual(['great-oasis', true]);
  });
  it('draws a map from (seed, size, layout) alone, and a seed or a size changes it', () => {
    for (const size of SIZES) {
      const a = generateMap(5, size, 'great-oasis');
      expect([size, JSON.stringify(a)]).toEqual([size, JSON.stringify(generateMap(5, size, 'great-oasis'))]);
      expect([size, a.terrain.join('') === generateMap(6, size, 'great-oasis').terrain.join('')]).toEqual([size, false]);
    }
  });
});

describe('v82 g great oasis (what its name says)', () => {
  it('has no river: no water reaches the map edge, and the lake keeps its distance from every edge', () => {
    const bad = [];
    for (const size of SIZES) for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(seed, size, 'great-oasis');
      m.terrain.forEach((t, i) => { if (t === T.WATER && onEdge(size, i)) bad.push(`${size} #${seed} water on the edge`); });
      const lake = waterPieces(m)[0];
      if (lake.some((i) => Math.min(i % size, Math.floor(i / size), size - 1 - (i % size), size - 1 - Math.floor(i / size)) < MAP.greatOasis.edge)) bad.push(`${size} #${seed} lake near the edge`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('one great lake about three times the old oasis pond, with a bank ring and a fertile ring that reaches the start area', () => {
    let great = 0, pond = 0;
    const bad = [];
    for (let seed = 1; seed <= 60; seed++) {
      const m = generateMap(seed, 64, 'great-oasis'), old = generateMap(seed, 64, 'oasis');
      const lake = waterPieces(m)[0];
      great += lake.length;
      // the old pond: the old oasis's water off the river (the piece that touches no edge, largest)
      const oldPond = waterPieces(old).filter((q) => !q.some((i) => onEdge(64, i)))[0] || [];
      pond += oldPond.length;
      // every lake tile's land neighbours are bank or clay (the bank ring; clay is laid on banks)
      for (const i of lake) for (const [dx, dy] of NEIGHBOURS4) {
        const x = (i % 64) + dx, y = Math.floor(i / 64) + dy, t = m.terrain[idx(64, x, y)];
        if (t !== T.WATER && t !== T.BANK && t !== T.CLAY) bad.push(`#${seed} lake beside ${t} at ${x},${y}`);
      }
      // the floodplain (fertile within the flood's reach of water) holds land within 8 tiles of the start area's centre
      const plain = floodplainOf(m.terrain, 64), f = idx(64, m.focus.x, m.focus.y);
      if (!plain.some((v, i) => v && near(64, i, f) <= 8)) bad.push(`#${seed} no floodplain within 8 of the start`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    const ratio = great / pond;
    expect([ratio > 2.4, ratio < 4]).toEqual([true, true]);
  });
  it('2 to 4 spring pools of 2 to 5 tiles each, apart from the lake, listed as oases; and at least one dry wadi', () => {
    const bad = [];
    for (const size of SIZES) for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(seed, size, 'great-oasis'), w = { size, terrain: m.terrain, oases: m.oases };
      const pieces = waterPieces(m), springs = m.oases.slice(0, m.params.course.springs);   // the springs come first in the oases, the desert oases after
      if (springs.length < MAP.greatOasis.springs[0] || springs.length > MAP.greatOasis.springs[1]) bad.push(`${size} #${seed}: ${springs.length} springs`);
      for (const s of springs) {
        const piece = pieces.find((q) => q.includes(idx(size, s.x, s.y)));
        if (!piece || piece.length < 2 || piece.length > 5 || piece === pieces[0]) bad.push(`${size} #${seed}: spring at ${s.x},${s.y} is ${piece ? piece.length : 0} tiles`);
        // inOasisPool's circle holds the spring's own water only
        for (let y = s.y - 2; y <= s.y + 2; y++) for (let x = s.x - 2; x <= s.x + 2; x++) if (Math.hypot(x - s.x, y - s.y) <= s.r && w.terrain[idx(size, x, y)] === T.WATER && !piece.includes(idx(size, x, y))) bad.push(`${size} #${seed}: spring circle at ${s.x},${s.y} holds other water`);
      }
      if (!(m.params.wadis && m.params.wadis.length >= 1)) bad.push(`${size} #${seed}: no wadi`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('v82 g great oasis (playable on 200 seeds at every size)', () => {
  it(`one piece of land for the start, the trade road and the raiders; clay, a mine and farms on it; no Quay site (no river); water under ${Math.round(MAP.courses.maxWater * 100)}%`, () => {
    const bad = [];
    for (const size of SIZES) for (let seed = 1; seed <= seedsFor(size); seed++) {
      const m = generateMap(seed, size, 'great-oasis'), r = playability(m);
      const broken = r.bad.filter((b) => b !== 'no Quay site');
      if (broken.length || r.quay) bad.push(`${size} #${seed}: ${broken.join('; ')}${r.quay ? ' a Quay site' : ''}`);
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });
});
