// Stage 4.6, Map track: clay you can find (ruling 331). The clay pit needs 2 of its 4 tiles on clay; every word that states that rule, the
// number it counts and where clay lies is built from the sim's own row and map (tested both ways: change the rule and the words follow);
// the refusal, its Show me and the pottery goal's Show me find the nearest fit; every terrain-bound building reads the same way.
import { describe, it, expect } from '../../harness.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { AUTO_OVERLAY } from '../../../src/data/ui.js';
import { MAP } from '../../../src/data/map.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { canPlace, conditionsFor } from '../../../src/sim/commands.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createPlacement, nearestFit, fitTarget } from '../../../src/ui/placement.js';
import { createOverlayLegend } from '../../../src/ui/overlayUi.js';
import { roomTiles } from '../../../src/render/overlays.js';
import { cardInfo, renderCards } from '../../../src/ui/cards.js';
import { showMeTarget } from '../../../src/ui/goalsList.js';
import { conditionText, groundRoomText, S46_MAP_TEXT, TIP_TEXT } from '../../../src/ui/text.js';
import { GOALS } from '../../../src/data/goals.js';
import { makeTestWorld, layClay, setRoad, addRaw } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { mount, fire } from '../../helpers/dom.js';

const PIT = { kind: 'building', type: 'clay_pit' };
const pitCity = (clay = [[10, 10, 3, 3]]) => { const w = makeTestWorld({ clay, gold: 1000 }); w.milestone = 'town'; return w; };
const ground = (w, type, x, y) => conditionsFor(w, type, x, y, { roadLater: true }).conditions.find((c) => c.key === 'ground');

// Runs fn with BUILDINGS[type] changed, then puts the row back: the words follow the row, so a changed rule reads differently.
function withRule(type, patch, fn) {
  const row = BUILDINGS[type];
  BUILDINGS[type] = { ...row, ...patch };
  try { return fn(); } finally { BUILDINGS[type] = row; }
}
function withRow(type, row, fn) {
  BUILDINGS[type] = row;
  MILESTONES[0].unlocks.push(type);
  try { return fn(); } finally { delete BUILDINGS[type]; MILESTONES[0].unlocks.splice(MILESTONES[0].unlocks.indexOf(type), 1); }
}

describe('s46 map clay pit: 2 of its 4 tiles on clay', () => {
  it('fits where 2 of 4 tiles are clay and refuses fewer, in the sim', () => {
    const w = pitCity();
    expect([BUILDINGS.clay_pit.terrain, BUILDINGS.clay_pit.terrainMin]).toEqual(['clay', 2]);
    expect(canPlace(w, 'clay_pit', 10, 10, { roadLater: true }).ok).toBe(true);     // 4 of 4
    expect(canPlace(w, 'clay_pit', 12, 10, { roadLater: true }).ok).toBe(true);     // 2 of 4
    expect(canPlace(w, 'clay_pit', 12, 12, { roadLater: true }).reason).toBe('needs_clay');   // 1 of 4
    expect(canPlace(w, 'clay_pit', 20, 20, { roadLater: true }).reason).toBe('needs_clay');
  });
  it('says the rule and the spot in the sim\'s own numbers: "Needs 2 of 4 tiles on clay (this spot has 1)", and the words follow the rule', () => {
    const w = pitCity();
    const one = ground(w, 'clay_pit', 12, 12);
    expect([one.state, one.fit, one.of, one.need]).toEqual(['cant', 1, 4, 2]);
    expect(conditionText(one, 'clay_pit')).toBe('Needs 2 of 4 tiles on clay (this spot has 1)');
    expect(S46_MAP_TEXT.needsTilesRule('clay', BUILDINGS.clay_pit.terrainMin, BUILDINGS.clay_pit.w * BUILDINGS.clay_pit.d)).toBe('Needs 2 of 4 tiles on clay');
    // the rule changed to 3 of 4: the same spot's words say 3, and 2 of 4 is refused
    withRule('clay_pit', { terrainMin: 3 }, () => {
      const two = ground(w, 'clay_pit', 12, 10);
      expect([two.state, two.fit, two.need, conditionText(two, 'clay_pit')]).toEqual(['cant', 2, 3, 'Needs 3 of 4 tiles on clay (this spot has 2)']);
      expect(cardInfo(w, 'clay_pit').terrainText).toBe(S46_MAP_TEXT.clayWhere);
      const { root, cleanup } = mount('<div id="tray"></div>');
      try {
        renderCards(root.querySelector('#tray'), { world: w, category: 'industry', activeItem: null, onPick: () => {} });
        expect(root.querySelector('.card[data-item="clay_pit"] .terrain').title).toBe('Needs 3 of 4 tiles on clay. Clay ground, along the riverbanks.');
      } finally { cleanup(); }
    });
    const { root, cleanup } = mount('<div id="tray"></div>');
    try {
      renderCards(root.querySelector('#tray'), { world: w, category: 'industry', activeItem: null, onPick: () => {} });
      const terrain = root.querySelector('.card[data-item="clay_pit"] .terrain');
      expect([terrain.textContent, terrain.title]).toEqual(['Clay ground, along the riverbanks', 'Needs 2 of 4 tiles on clay. Clay ground, along the riverbanks.']);
    } finally { cleanup(); }
  });
  it('words a spot that fits partly on clay as "Clay ground: 2 of 4 tiles", and one wholly on clay as "Clay ground"', () => {
    const w = pitCity();
    expect(conditionText(ground(w, 'clay_pit', 10, 10), 'clay_pit')).toBe('Clay ground');
    expect(conditionText(ground(w, 'clay_pit', 12, 10), 'clay_pit')).toBe('Clay ground: 2 of 4 tiles');
  });
  it('lays the bar\'s refusal line and offers Show me for every refusal about the spot of a building bound to its ground', () => {
    const w = pitCity();
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: w, store });
    pl.start(PIT, { x: 11, y: 11 });
    const at = (x, y) => { pl.moveGhost(x, y); return pl.preview(); };
    const fits = at(10, 10);
    expect([fits.state === 'bad', Boolean(fits.showFit)]).toEqual([false, false]);
    const bad = at(12, 12);
    expect([bad.state, bad.reason, bad.text, bad.showFit]).toEqual(['bad', 'needs_clay', 'Needs 2 of 4 tiles on clay (this spot has 1)', true]);
    expect(at(20, 20).text).toBe('Needs 2 of 4 tiles on clay (this spot has 0)');
    // a refusal that is not the ground's (the spot is taken) still offers Show me for a building bound to its ground (UX rule 6, ruling 352)
    addRaw(w, 'house', 10, 10);
    const taken = at(10, 10);
    expect([taken.state, taken.reason, taken.showFit]).toEqual(['bad', 'occupied', true]);
    // a building with no ground of its own has no nearest fit to show: its taken spot offers none
    pl.start({ kind: 'building', type: 'well' }, { x: 10, y: 10 });
    pl.moveGhost(10, 10);
    const well = pl.preview();
    expect([well.state, well.reason, Boolean(well.showFit)]).toEqual(['bad', 'occupied', false]);
  });
});

describe('s46 map clay pit: where clay lies, and the way there', () => {
  it('lands the picked ghost on the nearest spot that fits, Ground on, with the legend\'s line about where clay lies', () => {
    const w = pitCity([[20, 20, 3, 3]]);
    expect(AUTO_OVERLAY.clay_pit).toBe('ground');
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: w, store });
    pl.start(PIT, { x: 8, y: 20 });
    expect(store.get().overlay).toBe('ground');
    const g = store.get().ghost;
    expect(canPlace(w, 'clay_pit', g.x, g.y, { roadLater: true }).ok).toBe(true);
    expect(Math.hypot(g.x - 8, g.y - 20)).toBeGreaterThan(8);                           // the clay is on, not where the pick began
    expect(nearestFit(w, PIT, 8, 20)).toEqual({ x: 19, y: 20 });
    // the guidance row: the Ground legend says where clay lies while a clay pit is picked, and says when no room is left
    const m = mount('<div id="legend"></div>');
    try {
      createOverlayLegend({ container: m.root.querySelector('#legend'), store, world: w });
      expect(m.root.querySelector('#legend').textContent).toContain(S46_MAP_TEXT.clayGuide);
      expect(S46_MAP_TEXT.clayGuide).toBe('Clay pits stand on clay: the reddish ground by the river');
      expect(groundRoomText('clay_pit', true)).toBe(S46_MAP_TEXT.clayGuide);
      expect(groundRoomText('clay_pit', false)).toBe('No room left for a clay pit');
      expect(groundRoomText('farm_grain', true)).toBe('Bright: room for a farm');
    } finally { m.cleanup(); }
  });
  it('is true that clay lies by the river and is reddish: every clay tile is within 4 of water, and its colour is not the loam\'s, the sand\'s or the rock\'s', () => {
    for (const seed of [1, 7, 11, 23, 42]) {
      for (const v of ['classic', 'island', 'oasis']) {
        const m = generateMap(seed, 64, v), n = m.size;
        for (let i = 0; i < n * n; i++) {
          if (m.terrain[i] !== T.CLAY) continue;
          const x = i % n, y = (i - x) / n;
          let near = false;
          for (let dy = -4; dy <= 4 && !near; dy++) for (let dx = -4; dx <= 4 && !near; dx++) if (x + dx >= 0 && y + dy >= 0 && x + dx < n && y + dy < n && m.terrain[idx(n, x + dx, y + dy)] === T.WATER) near = true;
          expect([seed, v, i, near]).toEqual([seed, v, i, true]);
        }
      }
    }
    const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const dist = (a, b) => Math.hypot(...rgb(a).map((c, k) => c - rgb(b)[k]));
    const [r, g, b] = rgb(TERRAIN.clay);
    expect(r > g && g > b && r - b >= 100).toBe(true);                                  // reddish: red far above blue
    for (const other of [TERRAIN.fertile, TERRAIN.sand, TERRAIN.rocky, TERRAIN.bank, TERRAIN.grass]) expect(dist(TERRAIN.clay, other)).toBeGreaterThan(70);
  });
  it('Show me from a refused spot goes to the nearest fit on the whole map, or says there is none', () => {
    const w = pitCity([[26, 26, 3, 3]]);
    const state = { tool: PIT, ghost: { x: 2, y: 2 } };
    const t = fitTarget(w, state);
    expect(t.kind).toBe('building');
    expect([t.item, canPlace(w, 'clay_pit', t.x - 1, t.y - 1, { roadLater: true }).ok]).toEqual(['clay_pit', true]);
    expect(Math.hypot(t.x - 2, t.y - 2)).toBeGreaterThan(20);                           // farther than the pick's 3 x reach would look from here
    expect(fitTarget(pitCity([]), state)).toBe(null);
    expect(fitTarget(w, { tool: { kind: 'demolish' } })).toBe(null);
  });
  it('points the pottery goal\'s Show me at the nearest fit, not merely at clay', () => {
    const pottery = GOALS.find((g) => g.id === 'pottery');
    expect(pottery.showMe.target).toBe('clay');
    // one lone clay tile beside the focus, with water round it so no pit fits there, and a patch farther away that holds one
    const w = makeTestWorld({ size: 32, clay: [[26, 4, 3, 3]], gold: 1000 });
    w.milestone = 'town';
    w.focus = { x: 16, y: 16 };
    layClay(w, 15, 15, 1, 1);
    for (const [x, y] of [[14, 14], [15, 14], [16, 14], [14, 15], [16, 15], [14, 16], [15, 16], [16, 16], [17, 15], [17, 16], [14, 17], [15, 17], [16, 17], [17, 14], [17, 17]]) w.terrain[idx(32, x, y)] = T.WATER;
    expect(canPlace(w, 'clay_pit', 15, 15, { roadLater: true }).ok).toBe(false);        // the lone tile is no fit
    const target = showMeTarget(w, pottery);
    const origin = { x: Math.round(target.x - 1), y: Math.round(target.y - 1) };
    expect([target.x > 20, canPlace(w, 'clay_pit', origin.x, origin.y, { roadLater: true }).ok]).toEqual([true, true]);
    // with a fit beside the focus, that is the target
    layClay(w, 18, 18, 2, 2);
    const near = showMeTarget(w, pottery);
    expect(Math.hypot(near.x - 16, near.y - 16)).toBeLessThan(5);
    // no clay at all: the focus, as before
    expect(showMeTarget(pitCity([]), pottery)).toEqual({ x: 16, y: 16 });
  });
});

describe('s46 map: every terrain-bound building reads the same way (the shared refusal and nearest fit)', () => {
  it('words a farm, an orchard and a mine from the same helper: Needs N of M tiles on <ground> (this spot has K)', () => {
    const w = makeTestWorld({ gold: 1000 });
    w.milestone = 'capital';
    const farm = ground(w, 'farm_grain', 7, 8);              // fertile land is x < 8: two tiles of four
    expect([farm.state, farm.fit, farm.of, conditionText(farm, 'farm_grain')]).toEqual(['cant', 2, 4, 'Needs 4 of 4 tiles on fertile land (this spot has 2)']);
    expect(conditionText(ground(w, 'farm_fig', 20, 8), 'farm_fig')).toBe('Needs 4 of 4 tiles on fertile land (this spot has 0)');
    expect(conditionText(ground(w, 'gem_mine', 20, 8), 'gem_mine')).toBe('Needs 4 of 4 tiles on rocky ground (this spot has 0)');
    expect(conditionText(ground(w, 'farm_grain', 2, 8), 'farm_grain')).toBe('Fertile land');
    // a farm that needed only 3 of its 4 would say 3 of 4, from its row
    withRule('farm_grain', { terrainMin: 3 }, () => {
      const g = ground(w, 'farm_grain', 7, 8);
      expect([g.state, g.need, conditionText(g, 'farm_grain')]).toEqual(['cant', 3, 'Needs 3 of 4 tiles on fertile land (this spot has 2)']);
    });
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: w, store });
    pl.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 8 });
    pl.moveGhost(7, 8);
    expect([pl.preview().text, pl.preview().showFit]).toEqual(['Needs 4 of 4 tiles on fertile land (this spot has 2)', true]);
  });
  it('words a building that must touch water, from its row: Must touch water / along its long side, with Show me', () => {
    const w = makeTestWorld({ size: 24, fertile: [], gold: 1000 });
    for (let y = 0; y < 24; y++) w.terrain[idx(24, 10, y)] = T.WATER;
    setRoad(w, 0, 12, 9, 12); setRoad(w, 11, 12, 23, 12);
    w.milestone = 'capital';
    const wharf = { name: 'Wharf', w: 2, d: 1, cost: 10, upkeep: 0, workers: 0, category: 'food', needsRoad: true, water: 'longSide' };
    const meter = { name: 'Meter', w: 1, d: 1, cost: 10, upkeep: 0, workers: 0, category: 'services', needsRoad: true, water: 'touch' };
    withRow('test_wharf', wharf, () => withRow('test_meter', meter, () => {
      const store = createStore(INITIAL_UI_STATE);
      const pl = createPlacement({ world: w, store });
      pl.start({ kind: 'building', type: 'test_wharf' }, { x: 4, y: 11 });
      pl.moveGhost(4, 11);
      expect([pl.preview().state, pl.preview().text, pl.preview().showFit]).toEqual(['bad', 'Must touch water along its long side', true]);
      expect(conditionText(ground(w, 'test_wharf', 4, 11), 'test_wharf')).toBe('Must touch water along its long side');
      expect(conditionText(ground(w, 'test_meter', 4, 11), 'test_meter')).toBe('Must touch water');
      expect(conditionText(ground(w, 'test_meter', 9, 11), 'test_meter')).toBe('Water beside it');
      const to = fitTarget(w, { tool: { kind: 'building', type: 'test_meter' }, ghost: { x: 2, y: 11 } });
      expect([to.item, canPlace(w, 'test_meter', Math.floor(to.x), Math.floor(to.y), { roadLater: true }).ok]).toEqual(['test_meter', true]);
      expect(Math.abs(to.x - 9.5) <= 1.5 || Math.abs(to.x - 11.5) <= 1.5).toBe(true);   // beside the channel at x = 10
    }));
  });
  it('keeps the legend, the bar and the tip free of a stale "all four" rule: the pit\'s card and bar quote the row\'s own number', () => {
    expect(BUILDINGS.clay_pit.terrainMin).toBe(2);
    expect(S46_MAP_TEXT.cardTitle('clay_pit').startsWith(`Needs ${BUILDINGS.clay_pit.terrainMin} of ${BUILDINGS.clay_pit.w * BUILDINGS.clay_pit.d} tiles on clay.`)).toBe(true);
    expect(S46_MAP_TEXT.cardTitle('farm_grain')).toBe('Needs 4 of 4 tiles on fertile land.');
    expect(S46_MAP_TEXT.cardTitle('well')).toBe(null);
    expect(TIP_TEXT.bridges.includes(`${MAP.bridgeMax} tiles`)).toBe(true);
  });
});

describe('s46 map clay pit: the confirm bar\'s Show me', () => {
  it('raises Show me on a refused spot, and the seam moves the ghost to the nearest fit with showMeAt', async () => {
    const w = uiWorld();
    w.milestone = 'town';
    layClay(w, 20, 14, 3, 3);                                 // a patch the road at y = 10 does not touch: a fit with a warning
    const r = await rigUI({ world: w });
    try {
      r.ui.placement.start(PIT, { x: 3, y: 3 });
      r.ui.placement.moveGhost(4, 3);                         // fertile land, no clay
      r.frame(1);
      const bar = r.root.querySelector('#confirm');
      const show = bar.querySelector('.show-fit');
      expect([Boolean(show), show && show.textContent, show && show.getAttribute('aria-label')]).toEqual([true, 'Show me', 'Show me where a clay pit fits']);
      expect(bar.querySelector('.reason').textContent).toBe('Needs 2 of 4 tiles on clay (this spot has 0)');
      fire(show, 'click');
      const g = r.ui.store.get().ghost;
      expect(canPlace(w, 'clay_pit', g.x, g.y, { roadLater: true }).ok).toBe(true);
      expect([g.x >= 19 && g.x <= 22, g.y >= 13 && g.y <= 16, r.ui.store.get().tool.type]).toEqual([true, true, 'clay_pit']);
      expect(r.root.querySelector('#confirm .show-fit')).toBe(null);               // it fits now: no Show me
    } finally { r.cleanup(); }
  });
});

describe('s46 map clay: the Ground overlay\'s bright tiles and its legend follow the sim\'s own fit rule (ruling 331)', () => {
  const inRoom = (w, room, x, y) => room.has(idx(w.size, x, y));
  const legend = (w) => {
    const store = createStore({ ...INITIAL_UI_STATE, overlay: 'ground', tool: PIT });
    const m = mount('<div id="legend"></div>');
    try { createOverlayLegend({ container: m.root.querySelector('#legend'), store, world: w }); return m.root.querySelector('#legend').textContent; } finally { m.cleanup(); }
  };
  it('counts a spot as room when 2 of its 4 tiles are clay: a one-wide strip is bright, and the legend does not say no room is left', () => {
    const w = pitCity([[10, 10, 1, 4]]);                                          // a strip one tile wide: no 2 x 2 is wholly on clay
    const room = roomTiles(w, 'clay_pit');
    expect(room.size).toBe(4);                                                    // every clay tile of the strip is bright
    for (let y = 10; y < 14; y++) expect(inRoom(w, room, 10, y)).toBe(true);
    expect(canPlace(w, 'clay_pit', 9, 10, { roadLater: true }).ok).toBe(true);    // the sim places a pit on it
    expect(legend(w)).toContain(S46_MAP_TEXT.clayGuide);
    expect(legend(w).includes('No room left')).toBe(false);
  });
  it('agrees with canPlace on every origin of a mixed patch: the room is exactly the clay tiles of the spots the sim accepts', () => {
    const w = pitCity([[10, 10, 3, 3], [14, 12, 1, 2], [18, 18, 1, 1]]);
    w.terrain[idx(w.size, 12, 9)] = T.WATER;
    const want = new Set();
    for (let y = 0; y < w.size - 1; y++) for (let x = 0; x < w.size - 1; x++) {
      if (!canPlace(w, 'clay_pit', x, y, { roadLater: true }).ok) continue;
      for (const [tx, ty] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) if (w.terrain[idx(w.size, tx, ty)] === T.CLAY) want.add(idx(w.size, tx, ty));
    }
    const room = roomTiles(w, 'clay_pit');
    expect([...room].sort((a, b) => a - b)).toEqual([...want].sort((a, b) => a - b));
    expect(inRoom(w, room, 18, 18)).toBe(false);                                  // one clay tile alone is 1 of 4: not a spot
    expect(inRoom(w, room, 14, 12)).toBe(true);                                   // a strip of two is
  });
  it('says no room is left when the spots are used up, and not while one remains', () => {
    const w = pitCity([[10, 10, 2, 2]]);
    expect(roomTiles(w, 'clay_pit').size).toBeGreaterThan(0);
    expect(legend(w).includes('No room left')).toBe(false);
    const one = pitCity([[10, 10, 2, 2]]);
    addRaw(one, 'house', 10, 10);
    expect(roomTiles(one, 'clay_pit').size).toBe(3);                              // one plot on the patch leaves the spots beside it (2 of 4 is enough)
    const all = pitCity([[10, 10, 2, 2]]);
    for (const [x, y] of [[10, 10], [11, 10], [10, 11], [11, 11]]) addRaw(all, 'house', x, y);   // the patch is built over: every spot that touches it is taken
    expect(roomTiles(all, 'clay_pit').size).toBe(0);
    expect(legend(all)).toContain('No room left for a clay pit');
  });
  it('follows the row: with the rule changed to 3 of 4 the bright set shrinks, and the legend follows the same rule', () => {
    const clay = [[10, 10, 1, 4], [14, 10, 2, 2]];
    const base = roomTiles(pitCity(clay), 'clay_pit').size;
    expect(base).toBe(8);                                                         // the strip and the block, 2 of 4 is enough
    withRule('clay_pit', { terrainMin: 3 }, () => {
      const w = pitCity(clay);
      const room = roomTiles(w, 'clay_pit');
      expect(room.size).toBe(4);                                                  // only the 2 x 2 block has a spot of 3 clay tiles; the strip's best is 2
      expect(inRoom(w, room, 10, 11)).toBe(false);
      expect(inRoom(w, room, 14, 10)).toBe(true);
    });
    withRule('clay_pit', { terrainMin: 3 }, () => {
      const w = pitCity([[10, 10, 1, 4]]);
      expect(roomTiles(w, 'clay_pit').size).toBe(0);
      expect(legend(w)).toContain('No room left for a clay pit');
    });
  });
  it('keeps the every-tile rule for a building with no terrainMin (a farm needs its whole footprint on fertile land)', () => {
    const w = makeTestWorld({ size: 16, fertile: [[4, 4, 1, 3]], gold: 1000 });
    expect(roomTiles(w, 'farm_grain').size).toBe(0);                              // a farm is wider than a strip
  });
});
