// Version 8.3 "Lines", Track X (rulings 1393-1402): the road tool's live words and water tints while dragging, set up both ways from the sim's numbers (3
// tiles a bridge, 7 a ferry, 14 too wide, a bent line, a drag still on its way across); the stroke laid through the bar with one Undo; Show me from a refusal
// opening the Crossing card ranked from there; the Crossing card's name, line, buttons and keyboard path; the crossings tip and How to play.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { ferryWorld, dragLine, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { addRaw, setRoad } from '../../helpers/testWorld.js';
import { mixedWorld, FROM } from './card.test.js';
import { toolPreview, ghostsFor, fitTarget, createPlacement } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createMapUi } from '../../../src/ui/s46/map.js';
import { cardInfo } from '../../../src/ui/cards.js';
import { FERRY_TEXT, CROSSING_TEXT, crossingBill, V71_HELP } from '../../../src/ui/v71/ferryText.js';
import { S45_TEXT, TIP_TEXT, TIP_HELP_TEXT, buildingName, reasonText } from '../../../src/ui/text.js';
import { previewRoadTiles } from '../../../src/sim/commands.js';
import { crossingChoices } from '../../../src/sim/ferryFind.js';
import { landingsOf, ferryCost } from '../../../src/sim/ferries.js';
import { costOf } from '../../../src/sim/costs.js';
import { TIPS } from '../../../src/data/tips.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createSettings } from '../../../src/ui/settings.js';
import { mount } from '../../helpers/dom.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';

const store = (tool, extra = {}) => createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, ...extra });
const road = (l, extra = {}) => store({ kind: 'road' }, { line: { ...l, flip: false }, ...extra });
const across = (width) => ({ x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + width + 1, y1: ROW });
const sized = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };

describe('v83 x ui: the road bar names the crossing, and the water is tinted to match', () => {
  it('3 tiles: "Bridge: 3 tiles of water", the water teal planks (\'bridge\'), the price the sim\'s', () => {
    const w = ferryWorld(3);
    const s = road(across(3));
    const p = toolPreview(w, s.get()), sim = previewRoadTiles(w, dragLine(3));
    expect([p.state, p.text, p.cost]).toEqual(['ok', `${CROSSING_TEXT.bridge(3)} · ${CROSSING_TEXT.roadTiles(2)}`, sim.cost]);
    expect(CROSSING_TEXT.bridge(3)).toBe('Bridge: 3 tiles of water');
    const g = ghostsFor(w, s.get());
    expect(g.filter((q) => q.x >= RIVER_X && q.x < RIVER_X + 3).map((q) => q.state)).toEqual(['bridge', 'bridge', 'bridge']);
  });

  it('7 tiles: "Ferry: 7 tiles of water, walkers wait at the bank" and the ferrymen\'s bill, the water blue waves (\'ferry\'), the price two landings', () => {
    const w = ferryWorld(7);
    const s = road(across(7));
    const p = toolPreview(w, s.get());
    expect([p.state, p.cost, p.ferries.length]).toEqual(['ok', ferryCost(w), 1]);
    expect(p.text).toBe(`${CROSSING_TEXT.ferry(7)} · ${S45_TEXT.upkeepBill(crossingBill(w))}`);
    expect(CROSSING_TEXT.ferry(7)).toBe('Ferry: 7 tiles of water, walkers wait at the bank');
    const g = ghostsFor(w, s.get());
    expect(g.filter((q) => q.x >= RIVER_X && q.x < RIVER_X + 7).map((q) => q.state)).toEqual(Array(7).fill('ferry'));
    expect(g.filter((q) => q.x === RIVER_X - 1 || q.x === RIVER_X + 7).map((q) => q.state)).toEqual(['ok', 'ok']);   // the landings, as accepted squares
    expect(g.filter((q) => q.boat).map((q) => q.boat.label)).toEqual([`${ferryCost(w)} gold`]);                     // and the Ferry tool's boat with its price
  });

  it('14 tiles: coral, "Too wide: 14 tiles (a bridge crosses up to 4, a ferry up to 12)", with Show me; a bent line: "A crossing must go straight across"', () => {
    const w = ferryWorld(14, { roads: false });
    const p = toolPreview(w, road({ x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 15, y1: ROW }).get());
    expect([p.state, p.reason, p.text, p.showFit]).toEqual(['bad', 'too_wide', 'Too wide: 14 tiles (a bridge crosses up to 4, a ferry up to 12)', true]);
    expect(ghostsFor(w, road({ x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 15, y1: ROW }).get()).every((q) => q.state === 'bad')).toBe(true);
    const bent = toolPreview(ferryWorld(7), road({ x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 3, y1: ROW + 3 }).get());
    expect([bent.state, bent.reason, bent.text, bent.showFit]).toEqual(['bad', 'bridge_shape', CROSSING_TEXT.bent, true]);
    expect(CROSSING_TEXT.bent).toBe('A crossing must go straight across');
    // the Oasis names only the bridge's limit
    const oasis = ferryWorld(7);
    oasis.mapVariant = 'great-oasis';
    expect(toolPreview(oasis, road(across(7)).get()).text).toBe('Too wide: 7 tiles (a bridge crosses up to 4)');
  });

  it('a touch drag that stops in the water names what lies ahead and tints it, and ✓ lays the road to the bank; reaching the far bank, ✓ lays the crossing', async () => {
    const w = ferryWorld(7);
    const mid = [[RIVER_X - 2, ROW], [RIVER_X - 1, ROW], [RIVER_X, ROW], [RIVER_X + 1, ROW], [RIVER_X + 2, ROW]];
    const s = store({ kind: 'road' }, { plan: { tiles: mid }, inputType: 'touch' });
    const p = toolPreview(w, s.get());
    expect([p.state, p.text, p.cost]).toEqual(['ok', 'Ferry: 7 tiles of water · drag on to the far bank, or ✓ lays the road to the bank · 1 tile', previewRoadTiles(w, mid, { skipBlocked: true }).cost]);
    expect(ghostsFor(w, s.get()).filter((q) => q.x >= RIVER_X).map((q) => q.state)).toEqual(['ferry', 'ferry', 'ferry']);
    const narrow = toolPreview(ferryWorld(3), store({ kind: 'road' }, { plan: { tiles: mid.slice(0, 3) } }).get());
    expect([narrow.state, narrow.text]).toEqual(['ok', 'Bridge: 3 tiles of water · drag on to the far bank, or ✓ lays the road to the bank · 1 tile']);
    // with nothing dry to lay, ✓ waits for the far bank
    const bare = ferryWorld(7);
    bare.road[idx(bare.size, RIVER_X - 1, ROW)] = 1;
    expect([toolPreview(bare, store({ kind: 'road' }, { plan: { tiles: mid } }).get()).state, toolPreview(bare, store({ kind: 'road' }, { plan: { tiles: mid } }).get()).text]).toEqual(['idle', 'Ferry: 7 tiles of water · drag on to the far bank']);
    // too wide ahead: the dry part is still laid, and the bar says why, with Show me
    const wide = toolPreview(ferryWorld(14, { roads: false }), store({ kind: 'road' }, { plan: { tiles: mid } }).get());
    expect([wide.state, wide.text.includes(CROSSING_TEXT.tooWide(14)), wide.showFit]).toEqual(['ok', true, true]);
    // through the bar: ✓ on the stopped drag lays the road to the bank; a drag on to the far bank lays the ferry
    const r = await rigUI({ world: ferryWorld(7, { roads: false }) });
    try {
      const pl = r.ui.placement, world = r.world;
      setRoad(world, 4, ROW, RIVER_X - 3, ROW);
      pl.start({ kind: 'road' }); pl.setRoute(false);
      pl.stroke(RIVER_X - 3, ROW, 'start'); for (let x = RIVER_X - 2; x <= RIVER_X + 2; x++) pl.stroke(x, ROW, 'move'); pl.stroke(RIVER_X + 2, ROW, 'end');
      r.frame(0);
      expect(r.root.querySelector('#confirm .ok').disabled).toBe(false);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect([world.road[idx(world.size, RIVER_X - 1, ROW)], world.road[idx(world.size, RIVER_X, ROW)], landingsOf(world).length]).toEqual([1, 0, 0]);
      pl.start({ kind: 'road' }); pl.setRoute(false);
      pl.stroke(RIVER_X - 2, ROW + 4, 'start'); for (let x = RIVER_X - 1; x <= RIVER_X + 8; x++) pl.stroke(x, ROW + 4, 'move'); pl.stroke(RIVER_X + 8, ROW + 4, 'end');
      setRoad(world, RIVER_X - 2, ROW + 1, RIVER_X - 2, ROW + 4);
      r.frame(0);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect(landingsOf(world).map((l) => [l.x, l.y])).toEqual([[RIVER_X - 1, ROW + 4], [RIVER_X + 7, ROW + 4]]);
    } finally { r.cleanup(); }
  });

  it('a busy bank says why, with Show me: a landing\'s tile built on, and a landing no road would reach; a plain road there is taken up (ruling 1406)', () => {
    const w = ferryWorld(7);
    addRaw(w, 'well', RIVER_X - 1, ROW);
    const p = toolPreview(w, road(across(7)).get());
    expect([p.state, p.reason, p.text, p.showFit, p.fitWhat]).toEqual(['bad', 'landing_taken', 'A ferry lands on a free bank tile: this one is built on', true, 'a crossing']);
    const paved = ferryWorld(7);
    paved.road[idx(paved.size, RIVER_X - 1, ROW)] = 1;
    const q = toolPreview(paved, road(across(7)).get());
    expect([q.state, q.text]).toEqual(['ok', `${CROSSING_TEXT.ferry(7)} · the landing takes 1 road tile at the bank · ${S45_TEXT.upkeepBill(crossingBill(paved))}`]);
    expect(CROSSING_TEXT.landingTaken('taken')).toBe('A ferry needs a bank tile of its own: this strip of land is too narrow to share between two crossings');
    const bare = toolPreview(ferryWorld(7, { roads: false }), road({ x0: RIVER_X - 1, y0: ROW, x1: RIVER_X + 7, y1: ROW }).get());
    expect([bare.reason, bare.text, bare.showFit]).toEqual(['landing_no_road', CROSSING_TEXT.landingNoRoad, true]);
    expect([reasonText('landing_taken'), reasonText('landing_no_road')]).toEqual(['A ferry landing needs a free bank tile', 'A ferry landing needs a road beside it']);
  });

  it('the idle road bar says both limits before the first drag; on the Oasis only the bridge\'s', () => {
    const w = ferryWorld(7);
    const p = toolPreview(w, store({ kind: 'road' }).get());
    expect(p.note).toBe(`Water: bridge up to 4 tiles (${costOf(w, 'bridge')} a tile), ferry 5 to 12`);
    w.mapVariant = 'great-oasis';
    expect(toolPreview(w, store({ kind: 'road' }).get()).note).toBe(`Water: a bridge, ${costOf(w, 'bridge')} gold a tile`);
  });
});

describe('v83 x ui: laying it through the bar', () => {
  it('✓ lays the road and the ferry with one toast, and one Undo takes all of it back', async () => {
    const w = ferryWorld(7);
    const r = await rigUI({ world: w, width: 1280, height: 800 });
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'road' }); pl.setRoute(false);
      pl.pointAt(RIVER_X - 2, ROW); pl.pointAt(RIVER_X + 8, ROW);
      r.frame(0);
      const bar = r.root.querySelector('#confirm .confirm');
      expect(bar.querySelector('.reason').textContent.startsWith(CROSSING_TEXT.ferry(7))).toBe(true);
      const gold = w.gold;
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect([landingsOf(w).length, gold - w.gold >= 0]).toEqual([2, true]);
      r.ui.placement.undo();
      expect(landingsOf(w).length).toBe(0);
    } finally { r.cleanup(); }
  });
});

describe('v83 x ui: Show me opens the Crossing card', () => {
  it('from a too-wide road the Crossing card opens ranked from where the road met the water', async () => {
    const w = mixedWorld();
    for (let y = 20; y < 24; y++) for (let x = RIVER_X + 7; x < RIVER_X + 14; x++) w.terrain[idx(w.size, x, y)] = T.WATER;   // a wide pool east of the river on rows 20-23: 14 tiles across
    const r = await rigUI({ world: w });
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'road' }); pl.setRoute(false);                                  // Straight: Route would go round the pool
      pl.pointAt(RIVER_X - 2, 21); pl.pointAt(RIVER_X + 16, 21);
      r.frame(0);
      const p = toolPreview(w, r.store.get());
      expect([p.reason, p.water]).toEqual(['too_wide', 14]);
      const t = fitTarget(w, r.store.get());
      expect([t.kind, Boolean(t.crossing)]).toEqual(['ferry', true]);
      expect(r.root.querySelector('#confirm .show-fit').getAttribute('aria-label')).toContain(FERRY_TEXT.showFitWhat.crossing);
      fire(r.root.querySelector('#confirm .show-fit'), 'click');
      const tool = r.store.get().tool;
      expect([tool.kind, tool.from]).toEqual(['ferry', { x: t.x, y: t.y }]);
      r.frame(0);
      expect(r.root.querySelector('#confirm .name').textContent).toBe('Crossing');
    } finally { r.cleanup(); }
  });
});

describe('v83 x ui: the Crossing card', () => {
  it('is named Crossing, says both limits, and prices a ferry', () => {
    const w = ferryWorld(7);
    const info = cardInfo(w, 'ferry');
    expect([buildingName('ferry'), FERRY_TEXT.name, info.name, info.terrainText, info.costText]).toEqual(['Crossing', 'Crossing', 'Crossing', 'Cross water: bridges up to 4 tiles, ferries 5 to 12', `${ferryCost(w)} gold a ferry`]);
  });

  it('its buttons name each crossing\'s kind, water and price (never colour alone), 44 px, and the keyboard picks a bridge and builds it', async () => {
    const w = mixedWorld();
    const r = await rigUI({ world: w, width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'ferry' }, FROM);
      r.frame(0);
      const shown = crossingChoices(w, FROM);
      const buttons = () => [...r.root.querySelectorAll('#confirm .crossing-pick')];
      expect(buttons().map((b) => b.textContent)).toEqual(shown.map((c) => FERRY_TEXT.choiceName(c.water, c.cost, c.kind)));
      expect(buttons()[0].textContent).toBe(`Bridge 3 · ${shown[0].cost}`);
      expect(buttons()[1].getAttribute('aria-label')).toBe(FERRY_TEXT.choiceLabel(7, shown[1].cost, shown[1].roads.length));
      expect(buttons()[0].getAttribute('aria-label').startsWith('Bridge, 3 tiles of water')).toBe(true);
      expect(buttons().every((b) => sized(b).every(Boolean))).toBe(true);
      buttons()[0].focus();
      expect(r.store.get().tool.pick).toBe(shown[0].key);
      r.frame(0);
      expect(r.root.querySelector('#confirm .reason').textContent.startsWith('Bridge: 3 tiles of water')).toBe(true);
      const g = ghostsFor(w, r.store.get());
      expect(g.filter((q) => q.state === 'bridge').length).toBe(3);
      fire(document.activeElement, 'keydown', { key: 'Enter' });
      expect(shown[0].tiles.every(([x, y]) => w.road[idx(w.size, x, y)] === 1)).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v83 x ui: the crossings tip and How to play', () => {
  it('fires the first time the road meets any water on a map with a river, with no bridges tip beside it, and says both limits in one line', () => {
    const tip = TIPS.find((t) => t.id === 'ferries');
    expect([tip.trigger, TIP_TEXT.ferries, TIP_HELP_TEXT.ferries]).toEqual(['roadCrossing', 'Roads cross water: a bridge up to 4 tiles, a ferry 5 to 12. Drag straight across, bank to bank.', TIP_TEXT.ferries]);
    const w = ferryWorld(3);
    const s = createStore(INITIAL_UI_STATE), fired = [];
    const root = document.createElement('div');
    document.body.append(root);
    const ui = createMapUi({ world: w, store: s, root, fireTip: (k) => { if (k !== 'roadRoute') fired.push(k); }, showMeAt: () => {}, toasts: { show: () => {} } });
    try {
      const pl = createPlacement({ world: w, store: s });
      pl.start({ kind: 'road' });
      pl.pointAt(2, 5); pl.pointAt(6, 5);
      expect(fired).toEqual([]);
      pl.pointAt(RIVER_X - 2, 5); pl.pointAt(RIVER_X + 4, 5);
      expect(fired).toEqual(['roadCrossing']);                                           // ruling 1450: the one crossing tip on this map
    } finally { ui.destroy(); root.remove(); }
  });

  it('How to play lists one crossing tip: the crossings tip where a river runs, the bridges tip on a map with none', () => {
    const list = (mapHelp) => {
      const { root, cleanup } = mount('<div id="body"></div>');
      const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root: document.body, systemReducedMotion: () => false, watchSystem: () => () => {} });
      try {
        createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, mapHelp }).help(root.querySelector('#body'), { close() {} });
        return [...root.querySelectorAll('.tips-list li')].map((li) => li.textContent);
      } finally { cleanup(); settings.destroy(); }
    };
    const river = list(null), dry = list({ head: 'This map', text: 'No river.' });
    expect([river.includes(TIP_HELP_TEXT.ferries), river.includes(TIP_HELP_TEXT.bridges)]).toEqual([true, false]);
    expect([dry.includes(TIP_HELP_TEXT.ferries), dry.includes(TIP_HELP_TEXT.bridges)]).toEqual([false, true]);
  });

  it('How to play\'s Crossings entry says both limits, the tints and the Crossing card', () => {
    const [help] = V71_HELP.f;
    expect(help.head).toBe('Crossings');
    for (const words of ['up to 4 tiles of water it lays a bridge', '5 to 12 tiles, a ferry', 'teal for a bridge, blue for a ferry, coral', 'The Crossing card']) expect([words, help.text.includes(words)]).toEqual([words, true]);
  });
});
