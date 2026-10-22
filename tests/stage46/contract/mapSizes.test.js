// Stage 4.6 contract (Track 0): map size plumbing. The generator and createWorld take a size (MAP_SIZES: 48, 64, 80); at 64
// every layout draws exactly as it did before Stage 4.6 (the fingerprints below were taken from the generator at e9f2307,
// before any Stage 4.6 change), and at 48 and 80 every layout keeps its basic invariants.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { MAP, MAP_SIZES, MAP_VARIANTS, DEFAULT_MAP_SIZE, isMapSize } from '../../../src/data/map.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { createWorld, housesOf, population } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld } from '../../../src/save/serialize.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { buildSampleCity, buildStressCity } from '../../../src/dev/sampleCity.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

// FNV-1a over everything the generator returns, so a single tile, entry or road step that moves changes the print.
export function mapPrint(m) {
  const text = JSON.stringify({ size: m.size, terrain: m.terrain, tradeEntry: m.tradeEntry, startRoad: m.startRoad, focus: m.focus, raiderEntries: m.raiderEntries, variant: m.variant });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
const LAYOUTS = ['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis'];
const SEEDS = [1, 3, 7, 11, 42, 1234];
// Taken at e9f2307 (before Stage 4.6): layout -> the prints of SEEDS in order. Classic at 64 must never move (ruling 332). The other five
// layouts draw the Map track's seeded shape choices (meander, pools, outcrops, groves, wide clay; ruling 332), so their prints moved on
// purpose: AFTER holds them as the Map track left them (tests/stage46/map holds what the choices guarantee).
const BEFORE = {
  classic: ['607276e', '98a0019b', 'ad53af4b', 'dfdff5e8', '2e774056', '9e9d65d0'],
  east: ['e3c86066', 'f491d03b', '97a31e45', '2d9e9b5b', 'a2672ccd', 'df1d0246'],
  middle: ['36ef2807', '6ff13d87', '35adab1', '94afdc06', 'f9041f11', 'c93f642d'],
  'wide-bends': ['1b51dc2e', '74a25255', 'fb7b65c0', '3c93193b', '4e9c94c5', '97d5f950'],
  island: ['1b9c71cb', 'b23fee63', '9bb1c748', '8b4512c1', 'b3615dd6', '6c9de8bb'],
  oasis: ['48da32c', 'f2a3ad70', '2bf4d64e', '2643c37', 'd38fbe59', 'd3aacd0a'],
};
const AFTER = {
  east: ['d562593c', '1f15b668', 'ed55cf99', '242f9637', '92a815e', '56b187f5'],
  middle: ['7ac36543', '2bb38229', 'c17d77c6', '8f357168', 'bf9c1a4', '8de3263e'],
  'wide-bends': ['42620959', '3b21ba52', '6c7e8542', '9bd45a55', '8dcc2691', 'b33635aa'],
  island: ['a754f478', 'b1bbaa4a', '11b50137', 'f2e42b3f', '83bce82b', 'b9fd928'],
  oasis: ['fb568110', 'f540e459', '59efc15d', 'f0a014db', '621c807f', '710fc76a'],
};
// Stage 4.7 Task 3b: every non-classic map moved again: its rock lies in long belts with the hills on them (no outcrop patches, no groves) and its meadow follows the
// water (no noise meadow). Review round 1 moved them once more (belts reach the map's edges, a last-resort belt on every map, the mine repair's rock a belt fragment).
// Classic at 64 is not in AFTER and is untouched.
// Stage 4.7 Task 3 (ruling 464): hills (and their rocky skirts) are terrain on every map but classic at Normal, so every non-classic seed here moved once more
// (a few keep their print where no cluster found room); classic at 64 is not in AFTER and is untouched.
// Stage 4.7 Task 2 (ruling 463): the oases are terrain on every map but classic at Normal, so a seed that holds one (or two) moved again: seeds 11 and 1234 of east, middle, wide-bends and island, and seed 1234 of oasis (the generator's other draws are untouched). Classic at 64 is not in AFTER.
// Stage 4.7 Task 1 review minors: the mine blob draws from its own salt (S47_SALT.mineBlob) and the clay repair stops 4 tiles from water, so the repaired
// seeds moved again (non-classic maps only; classic at 64 is untouched).
// Stage 4.7 Task 1 (ruling 461): AFTER is the Map track's set with the resource repair on top (clay, mine and farms near the start): a seed that already
// held them keeps its Stage 4.6 print (east 7, 11, 42; middle 7, 11, 42; wide-bends 1, 11, 1234; island 11; oasis 11), the others moved. Classic at 64 is
// not in AFTER: its prints are the Stage 4.6 ones (the mine repair is off for it, and none of these six seeds needed clay).

const count = (m, t) => m.terrain.filter((v) => v === t).length;

describe('s46 contract map sizes', () => {
  it('draws classic at 64 exactly as before Stage 4.6, and the other layouts with the shape choices of the Map track', () => {
    const now = Object.fromEntries(LAYOUTS.map((v) => [v, SEEDS.map((s) => mapPrint(generateMap(s, 64, v)))]));
    expect(now.classic).toEqual(BEFORE.classic);
    const { classic, ...others } = now;
    expect(others).toEqual(AFTER);
    expect(LAYOUTS).toEqual(MAP_VARIANTS);
    for (const s of SEEDS) expect(generateMap(s, 64, 'classic').params).toEqual({});
  });
  it('offers Small 48, Normal 64 (the default), Large 80 and Huge 112', () => {
    expect(MAP_SIZES).toEqual({ small: 48, normal: 64, large: 80, huge: 112 });   // Version 6.0 (ruling 740): Huge is offered
    expect([DEFAULT_MAP_SIZE, MAP.size, createWorld({ seed: 2 }).size, createWorld({ seed: 2 }).mapSize]).toEqual([64, 64, 64, 64]);
    expect([isMapSize(48), isMapSize(64), isMapSize(80), isMapSize(32), isMapSize('64')]).toEqual([true, true, true, false, false]);
  });
  it('keeps every layout whole at 48 and 80: a river, a buildable start road from the south edge, land entries on the edges, the focus inside', () => {
    for (const size of [48, 80]) {
      for (const v of LAYOUTS) {
        for (const seed of [1, 7, 42]) {
          const m = generateMap(seed, size, v);
          const at = `${v} ${size} seed ${seed}`;
          expect([at, m.size, m.terrain.length, m.variant]).toEqual([at, size, size * size, v]);
          expect([at, count(m, T.WATER) > size]).toEqual([at, true]);
          expect([at, count(m, T.FERTILE) > 0, count(m, T.CLAY) > 0]).toEqual([at, true, true]);
          expect([at, m.startRoad[0]]).toEqual([at, [m.tradeEntry.x, size - 1]]);
          for (const [x, y] of m.startRoad) expect([at, x, y, [T.WATER, T.ROCKY].includes(m.terrain[idx(size, x, y)])]).toEqual([at, x, y, false]);
          expect([at, m.focus.x >= 0 && m.focus.x < size && m.focus.y >= 0 && m.focus.y < size]).toEqual([at, true]);
          expect([at, m.raiderEntries.length]).toEqual([at, size === 80 ? 3 : 2]);   // Stage 4.6 (ruling 333): the entries scale with the area, two at least
          for (const e of m.raiderEntries) {
            const edge = e.x === 0 || e.y === 0 || e.x === size - 1 || e.y === size - 1;
            expect([at, e, edge, m.terrain[idx(size, e.x, e.y)] === T.WATER]).toEqual([at, e, true, false]);
          }
          expect(typeof m.params.meander.strength).toBe('number');                   // every map but classic at 64 draws its shape choices (ruling 332)
        }
      }
    }
  });
  it('makes a world of each size whose every per-tile list, camera range and save follow the size', () => {
    for (const size of [48, 64, 80]) {
      const w = createWorld({ seed: 5, size, mapVariant: 'island' });
      expect([w.size, w.mapSize]).toEqual([size, size]);
      for (const k of ['terrain', 'road', 'occ', 'wall', 'floodplain']) expect([k, w[k].length]).toEqual([k, size * size]);
      const r = visibleTileRange(createCamera({ x: size / 2, y: size / 2, zoom: 0.5 }), { width: 3000, height: 3000 }, w.size);
      expect([r.x0, r.y0, r.x1, r.y1]).toEqual([0, 0, size - 1, size - 1]);
      const back = deserialize(serialize(w));
      expect([back.size, back.mapSize, validateWorld(back)]).toEqual([size, size, true]);
      const odd = JSON.parse(serialize(w));
      odd.mapSize = size === 64 ? 80 : 64;                                       // mapSize is the size, always
      expect(validateWorld(odd)).toBe(false);
    }
  });
  it('lays the sample city at 48 and 80 through the public commands, and the stress city at 80', () => {
    for (const size of [48, 80]) {
      const w = buildSampleCity(createWorld({ seed: 11, size }));
      expect([size, housesOf(w).length > 20, population(w) > 100]).toEqual([size, true, true]);
      expect(validateWorld(deserialize(serialize(w)))).toBe(true);
    }
    const s = buildStressCity(createWorld({ seed: 3, size: 80 }), { days: 10 });
    expect(Object.keys(s.buildings).length).toBeGreaterThan(600);
  });
  it('carries ?size= through a new city at boot, and a size it does not know falls back to Normal (freshWorld)', async () => {
    for (const [q, want] of [['size=48', 48], ['size=80', 80], ['size=50', 64], ['', 64]]) {
      const shell = await mountShell(390, 844);
      const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
      const api = await boot(document, window, {
        root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(`skipTitle=1&seed=7&${q}`),
        clock: () => 1760000000000, storage: { getItem: () => null, setItem: () => {} }, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
        uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
        loopOptions: { raf: () => 0, caf: () => {} },
      });
      try {
        expect([q, api.game().world.size]).toEqual([q, want]);
        expect([q, api.freshWorld({ seed: 3, size: 48 }).size]).toEqual([q, 48]);
      } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
    }
  });
});
