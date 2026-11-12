// Version 10.0, Track Q (ruling 2146, Task Q.6): legibility in the dark and in every wash. What the deepest night's tint and a season's strongest wash can reach is the map (the light pass and the
// wash are drawn on the canvas; the panels are opaque and every word is drawn after them, tests/v70/s/night.test.js holds that the page does not change at night), so what is measured is what
// lies on the map: the white ring of a marker and the pill of a label against every colour the ground can be under the deepest night, under each season's strongest wash, and under both; the road
// and the water read apart (a luminance difference of at least 25) under the deepest night; and every text pair of the interface keeps 4.5:1 as it is (the pairs themselves are untouched).
import { describe, it, expect } from '../../harness.js';
import { TEXT_PAIRS, contrastRatio, TOKENS } from '../../../src/ui/theme.js';
import { NIGHT, SEASON_LOOK } from '../../../src/data/seasons.js';
import { TERRAIN, UI } from '../../../src/render/art/palette.js';
import { tintFor } from '../../../src/render/light.js';

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const relLum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const multiply = (c, m) => c.map((v, i) => Math.round((v * m[i]) / 255));
const wash = (c, colour, alpha) => c.map((v, i) => v * (1 - alpha) + colour[i] * alpha);
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const deepest = tintFor({ dark: 1, warm: 0 });
const GROUND = ['sand', 'grass', 'grassSoft', 'fertile', 'bank', 'bankSecond', 'water', 'waterDeep', 'shallows', 'road', 'clay', 'rocky', 'hills', 'plot', 'field', 'wadi', 'beltRock'];   // tests/v70/s/night.test.js's list

describe('v100 q legibility: the map under the deepest night and the strongest washes', () => {
  it('the deepest tint is the one the light pass holds (NIGHT.rgb)', () => {
    expect(deepest).toEqual(NIGHT.rgb);
  });
  it('the interface keeps 4.5:1 for every text pair', () => {
    const low = TEXT_PAIRS.filter(([f, b]) => contrastRatio(TOKENS[f], TOKENS[b]) < 4.5).map(([f, b]) => `${f} on ${b}`);
    expect(low).toEqual([]);
  });
  for (const [id, look] of Object.entries(SEASON_LOOK)) {
    it(`a marker's ring and a label's pill keep ${NIGHT.minRing}:1 against every ground at the deepest night under ${id}'s strongest wash (by day the ring has its dark stem and badge; the 3:1 is the night's floor, as tests/v70/s/night.test.js holds it)`, () => {
      const [colour, alpha] = look.wash;
      const low = [];
      for (const key of GROUND) {
        const day = wash(rgb(TERRAIN[key]), rgb(colour), alpha), night = multiply(day, deepest);
        for (const [what, ink] of [['ring', rgb(UI.halo)], ['pill', rgb('#FFF8EA')]]) {
          if (ratio(ink, night) < NIGHT.minRing) low.push(`${key} ${what} at night ${ratio(ink, night).toFixed(2)}`);
        }
      }
      expect(low).toEqual([]);
    });
  }
  it('the road and the water differ by at least 25 in luminance under the deepest night, and under the strongest wash too', () => {
    const road = luma(multiply(rgb(TERRAIN.road), deepest)), water = luma(multiply(rgb(TERRAIN.water), deepest));
    expect(Math.abs(road - water) >= 25).toBe(true);
    for (const [id, look] of Object.entries(SEASON_LOOK)) {
      const [colour, alpha] = look.wash;
      const r = luma(multiply(wash(rgb(TERRAIN.road), rgb(colour), alpha), deepest)), w = luma(multiply(wash(rgb(TERRAIN.water), rgb(colour), alpha), deepest));
      expect([id, Math.abs(r - w) >= 25]).toEqual([id, true]);
    }
  });
});
