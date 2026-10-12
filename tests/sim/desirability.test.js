import { describe, it, expect } from '../harness.js';
import { desirabilityField, desirabilityAt, houseDesirability, desirabilityContributors, desirabilityPreview } from '../../src/sim/desirability.js';
import { createWorld, removeBuilding, housesOf } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { makeTestWorld, addRaw, setRoad } from '../helpers/testWorld.js';

// Values (spec 4.7, data/desirability.js) by distance 1, 2, 3...: garden 3, 2, 1; statue 8, 6, 4, 2; temple 6, 6, 4,
// 4, 2, 2; well 1; potter -4, -3, -2, -1; granary -8, -6, -4, -2; Hut -2, -1; Cottage 0; Manor 2, 2.
// Gardens, statues and homes need no road; a building that needs one gives nothing until a road touches it (rulings
// P10, P11), so `linked` lays one road tile beside it, at (rx, ry). A road tile changes no tile's score.
const world = () => makeTestWorld();
const linked = (w, type, x, y, rx, ry) => { const b = addRaw(w, type, x, y); setRoad(w, rx, ry, rx, ry); return b; };
const home = (w, x, y, tier = 3, extra = {}) => addRaw(w, 'house', x, y, { tier, residents: 5, ...extra });
const manor = (w, x, y) => home(w, x, y, 6, { w: 2, d: 2, residents: 100 });

describe('desirability', () => {
  it('falls off 3, 2, 1 around a garden, diagonals included, and never on the garden itself', () => {
    const w = world();
    addRaw(w, 'garden', 10, 10);
    expect(desirabilityAt(w, 10, 10)).toBe(0);
    expect(desirabilityAt(w, 11, 10)).toBe(3);
    expect(desirabilityAt(w, 12, 10)).toBe(2);
    expect(desirabilityAt(w, 13, 10)).toBe(1);
    expect(desirabilityAt(w, 14, 10)).toBe(0);
    expect(desirabilityAt(w, 9, 9)).toBe(3);
    expect(desirabilityAt(w, 8, 12)).toBe(2);
    expect(desirabilityAt(w, 7, 13)).toBe(1);
    expect(desirabilityAt(w, -1, 10)).toBe(0);            // off the map
  });
  it('adds values where they overlap, good and bad alike', () => {
    const w = world();
    addRaw(w, 'garden', 10, 10);
    addRaw(w, 'garden', 14, 10);
    expect(desirabilityAt(w, 11, 10)).toBe(4);            // 3 + 1
    expect(desirabilityAt(w, 12, 10)).toBe(4);            // 2 + 2
    linked(w, 'potter', 20, 10, 22, 10);                   // a 2x2 at x 20-21
    addRaw(w, 'garden', 17, 10);
    expect(desirabilityAt(w, 18, 10)).toBe(0);            // garden +3, potter -3
    expect(desirabilityAt(w, 19, 10)).toBe(-2);           // garden +2, potter -4
  });
  it('counts distance from the nearest tile of a 2x2 footprint and leaves the footprint alone', () => {
    const w = world();
    linked(w, 'granary', 10, 10, 10, 12);
    for (const [x, y] of [[10, 10], [11, 10], [10, 11], [11, 11]]) expect(desirabilityAt(w, x, y)).toBe(0);
    expect(desirabilityAt(w, 12, 11)).toBe(-8);
    expect(desirabilityAt(w, 9, 9)).toBe(-8);
    expect(desirabilityAt(w, 14, 7)).toBe(-4);
    expect(desirabilityAt(w, 15, 10)).toBe(-2);
    expect(desirabilityAt(w, 16, 10)).toBe(0);
  });
  it('scores homes by tier, and an empty plot not at all', () => {
    const w = world();
    home(w, 10, 10, 1);                                    // a Hut
    home(w, 20, 10, 0, { residents: 0 });                  // an empty plot
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    expect(desirabilityAt(w, 12, 10)).toBe(-1);
    expect(desirabilityAt(w, 21, 10)).toBe(0);
    manor(w, 10, 20);
    expect(desirabilityAt(w, 12, 21)).toBe(2);
    expect(desirabilityAt(w, 13, 21)).toBe(2);
    expect(desirabilityAt(w, 14, 21)).toBe(0);
  });
  it('gives a 2x2 home the score of its best tile, and never its own values', () => {
    const w = world();
    const h = manor(w, 20, 20);
    expect(houseDesirability(w, h)).toBe(0);
    addRaw(w, 'garden', 23, 20);
    expect(desirabilityAt(w, 20, 20)).toBe(1);
    expect(desirabilityAt(w, 21, 21)).toBe(2);
    expect(houseDesirability(w, h)).toBe(2);
  });
  it('names the biggest causes of a home\'s score, largest effect first, either sign', () => {
    const w = world();
    const h = home(w, 15, 15, 5);
    const temple = linked(w, 'temple', 13, 15, 12, 15);
    const potter = linked(w, 'potter', 16, 14, 18, 14);
    const garden = addRaw(w, 'garden', 15, 14);
    const well = linked(w, 'well', 16, 16, 17, 16);
    addRaw(w, 'garden', 25, 25);                           // too far to matter
    expect(houseDesirability(w, h)).toBe(6);               // 6 - 4 + 3 + 1
    expect(desirabilityContributors(w, h)).toEqual([
      { id: temple.id, type: 'temple', value: 6 },
      { id: potter.id, type: 'potter', value: -4 },
      { id: garden.id, type: 'garden', value: 3 },
    ]);
    expect(desirabilityContributors(w, h, 5).map((c) => c.id)).toEqual([temple.id, potter.id, garden.id, well.id]);
  });
  it('takes a 2x2 home\'s causes at its best tile', () => {
    const w = world();
    const h = manor(w, 20, 20);
    const statue = addRaw(w, 'statue', 23, 23);
    const garden = addRaw(w, 'garden', 19, 19);
    expect(houseDesirability(w, h)).toBe(8);               // at (21, 21): statue 6, garden 2
    expect(desirabilityContributors(w, h)).toEqual([
      { id: statue.id, type: 'statue', value: 6 },
      { id: garden.id, type: 'garden', value: 2 },
    ]);
  });
  it('previews the tiles a building would change and the homes it would make nicer or less pleasant', () => {
    const w = world();
    for (const x of [10, 11, 12]) home(w, x, 10);
    home(w, 25, 25);
    const garden = desirabilityPreview(w, 'garden', 11, 12);
    expect(garden.better).toBe(3);
    expect(garden.worse).toBe(0);
    expect(garden.tiles.length).toBe(48);                  // a 7x7 square less the garden's own tile
    expect(garden.tiles.every((t) => t.v > 0)).toBe(true);
    expect(garden.tiles.some((t) => t.x === 11 && t.y === 12)).toBe(false);
    expect(garden.tiles.find((t) => t.x === 11 && t.y === 10).v).toBe(2);
    const potter = desirabilityPreview(w, 'potter', 11, 12);
    expect(potter.better).toBe(0);
    expect(potter.worse).toBe(3);
    expect(potter.tiles.length).toBe(96);                  // a 10x10 square less the 2x2 footprint
    expect(desirabilityPreview(w, 'garden', 0, 0).tiles.length).toBe(15);   // clipped at the map's corner
    expect(desirabilityPreview(w, 'house', 11, 12)).toEqual({ better: 0, worse: 0, tiles: [] });
    expect(desirabilityPreview(w, 'nonsense', 11, 12)).toEqual({ better: 0, worse: 0, tiles: [] });
    expect(housesOf(w).length).toBe(4);                    // a preview places nothing
  });
  it('counts a home only when its best tile changes', () => {
    const w = world();
    const h = manor(w, 20, 20);
    addRaw(w, 'statue', 23, 20);                           // the east tiles score 6, the west ones 4
    expect(houseDesirability(w, h)).toBe(6);
    const p = desirabilityPreview(w, 'garden', 17, 20);    // +1 on the west tiles only
    expect(p.tiles.some((t) => t.x === 20 && t.y === 20)).toBe(true);
    expect(p.better).toBe(0);
    expect(p.worse).toBe(0);
  });
  it('previews exactly what placing the building then does', () => {
    const w = world();
    for (let x = 4; x < 28; x += 3) home(w, x, 12, 1 + (x % 5));
    linked(w, 'temple', 8, 15, 7, 15);
    linked(w, 'potter', 20, 9, 22, 9);
    const before = housesOf(w).map((h) => houseDesirability(w, h));
    const fieldBefore = Float32Array.from(desirabilityField(w));
    const p = desirabilityPreview(w, 'statue', 14, 14);
    addRaw(w, 'statue', 14, 14);
    const after = housesOf(w).map((h) => houseDesirability(w, h));
    expect(p.better).toBe(after.filter((v, i) => v > before[i]).length);
    expect(p.worse).toBe(after.filter((v, i) => v < before[i]).length);
    const field = desirabilityField(w);
    for (const t of p.tiles) expect(field[t.y * w.size + t.x] - fieldBefore[t.y * w.size + t.x]).toBe(t.v);
    let changed = 0;
    for (let i = 0; i < field.length; i++) if (field[i] !== fieldBefore[i]) changed++;
    expect(changed).toBe(p.tiles.length);
  });
  it('gives nothing from a building that needs a road until one touches it, and refreshes when roads change (P11)', () => {
    const w = world();
    const h = home(w, 15, 15, 5);
    const temple = addRaw(w, 'temple', 13, 15);            // needs a road and has none
    const garden = addRaw(w, 'garden', 15, 14);            // needs no road
    addRaw(w, 'potter', 16, 16);                           // a road-less potter does not spoil the street either
    expect(desirabilityAt(w, 15, 15)).toBe(3);             // the garden only
    expect(houseDesirability(w, h)).toBe(3);
    expect(desirabilityContributors(w, h)).toEqual([{ id: garden.id, type: 'garden', value: 3 }]);
    const before = desirabilityField(w);
    setRoad(w, 12, 15, 12, 15);                            // a road beside the temple wakes it
    expect(desirabilityField(w) === before).toBe(false);
    expect(desirabilityAt(w, 15, 15)).toBe(9);             // temple 6 + garden 3
    expect(desirabilityContributors(w, h).map((c) => c.id)).toEqual([temple.id, garden.id]);
    w.road[12 + 15 * w.size] = 0; w.roadVersion++;         // and taking it away silences it again
    expect(desirabilityAt(w, 15, 15)).toBe(3);
    const p = desirabilityPreview(w, 'temple', 13, 18);    // a ghost is judged as if a road will reach it
    expect(p.tiles.length).toBeGreaterThan(0);
    expect(p.better).toBe(1);
  });
  it('memoises the field until a building is added, removed, changes tier or merges', () => {
    const w = world();
    const h = home(w, 10, 10, 1);
    const first = desirabilityField(w);
    expect(desirabilityField(w)).toBe(first);              // the same array while nothing changes
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    const garden = addRaw(w, 'garden', 12, 10);
    expect(desirabilityField(w) === first).toBe(false);   // rebuilt once a building is added
    expect(desirabilityAt(w, 11, 10)).toBe(1);             // Hut -2, garden +3
    removeBuilding(w, garden.id);
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    h.tier = 4;                                            // the Hut grew into a House
    expect(desirabilityAt(w, 11, 10)).toBe(1);
    h.tier = 6; h.w = 2; h.d = 2;                          // merged into a Manor (the plots beside it gone)
    expect(desirabilityAt(w, 12, 10)).toBe(2);
    expect(desirabilityAt(w, 13, 10)).toBe(2);
  });
  it('rebuilds the field when one building gives way to another whose id and place once packed to the same number', () => {
    const w = makeTestWorld({ size: 64 });
    w.nextId = 2;
    const far = addRaw(w, 'garden', 61, 12);                // id 2 at (61, 12) ...
    expect(desirabilityAt(w, 62, 12)).toBe(3);
    removeBuilding(w, far.id);
    w.nextId = 3;
    addRaw(w, 'garden', 0, 0);                              // ... and id 3 at (0, 0): 2*4099 + 61*67 + 12 = 3*4099
    expect([desirabilityAt(w, 62, 12), desirabilityAt(w, 1, 0)]).toEqual([0, 3]);
  });
  it('judges every home against one field when given it, the same as asking one by one', () => {
    const w = world();
    const homes = [home(w, 10, 10, 1), manor(w, 12, 10), home(w, 15, 10, 4)];
    addRaw(w, 'garden', 11, 12);
    const field = desirabilityField(w);
    expect(homes.map((h) => houseDesirability(w, h, field))).toEqual(homes.map((h) => houseDesirability(w, h)));
  });
  it('builds and reads the field of a full 64x64 city quickly', () => {
    const w = buildStressCity(createWorld({ seed: 3 }));
    const homes = housesOf(w);
    expect(homes.length).toBeGreaterThan(1000);
    let started = performance.now();
    const field = desirabilityField(w);
    const build = performance.now() - started;
    started = performance.now();
    for (let i = 0; i < 100; i++) desirabilityField(w);   // memo hits
    const hits = performance.now() - started;
    started = performance.now();
    for (const h of homes) houseDesirability(w, h, field);
    const reads = performance.now() - started;
    started = performance.now();
    for (let x = 0; x < 60; x += 2) desirabilityPreview(w, 'statue', x, 30);
    const previews = performance.now() - started;
    expect(build).toBeLessThan(50);
    expect(hits).toBeLessThan(50);
    expect(reads).toBeLessThan(50);
    expect(previews).toBeLessThan(100);
  });
});
