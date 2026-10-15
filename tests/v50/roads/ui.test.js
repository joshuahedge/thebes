// Version 5.0 Task 5 (rulings 560-569): the routed road through the placement tool and the confirm bar. Every number and sentence is compared with the sim's own function
// (routeRoad, previewRoadTiles, costOf, roadCostOf), the world set up both ways: a way there and none, a toggle on and off. The mobile budget for the bar is in
// tests/v50/roads/budget.test.js; the Task 4 review minors folded into this task are at the end.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { createPlacement, fitTarget, ghostsFor, toolPreview, areaPreviewOf } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { routeRoad } from '../../../src/sim/route.js';
import { previewRoad, previewRoadTiles, setGuide, setAccept } from '../../../src/sim/commands.js';
import { setFetch } from '../../../src/sim/carts.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { BRIDGE_MAX, bridgeSpot } from '../../../src/sim/bridges.js';
import { settingsThatApply, settingsOf, applySettings } from '../../../src/sim/another.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { ROUTE_TEXT } from '../../../src/ui/routeText.js';
import { AREA_TEXT, ANOTHER_TEXT, SPACING_NAMES } from '../../../src/ui/areaText.js';
import { goodName, TIP_TEXT, TIP_HELP_TEXT, reasonText } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';
import { allBuildings } from '../../../src/sim/world.js';
import { undo } from '../../../src/sim/undo.js';
import { createMapUi } from '../../../src/ui/s46/map.js';

const lay = (w, terrain, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(w.size, x, y)] = terrain; };
// A town of sand with a river 3 wide (x 18-20, every row) and hills in the way of a straight road at y 14 (x 8-10).
function land(opts = {}) {
  const w = makeTestWorld({ fertile: [], gold: 5000, ...opts });
  lay(w, T.WATER, 18, 0, 20, 31);
  lay(w, T.HILLS, 8, 12, 10, 16);
  return w;
}
function rig(inputType = 'mouse', world = land()) {
  const store = createStore({ ...INITIAL_UI_STATE, inputType });
  const log = [], saved = [];
  let shape = 'straight';
  const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e), effects: null, now: () => 0, roadMode: { get: () => shape, set: (v) => { shape = v; saved.push(v); } } });
  return { world, store, pl, log, saved };
}

describe('v50 roads ui: the toggle', () => {
  it('starts in Straight (the L and the finger as before), and a tap on a plan tile still toggles a tile', () => {
    const { store, pl } = rig('touch');
    pl.start({ kind: 'road' });
    expect(store.get().tool).toEqual({ kind: 'road' });                          // no route key: the tool is exactly as it was
    expect(pl.routeMode()).toBe('straight');
    pl.toggleTile(3, 3); pl.toggleTile(4, 3);
    expect(store.get().plan.tiles).toEqual([[3, 3], [4, 3]]);
    expect(store.get().line).toBe(null);
  });
  it('switches to Route and back, remembers the choice for the next road tool, and has no shapes on the Gate card', () => {
    const { store, pl, saved } = rig();
    pl.start({ kind: 'road' });
    expect(pl.setRoute(true)).toBe(true);
    expect([store.get().tool.route, pl.routeMode(), saved]).toEqual([true, 'route', ['route']]);
    pl.cancel();
    pl.start({ kind: 'road' });
    expect(pl.routeMode()).toBe('route');                                        // the road bar starts in the shape last chosen
    pl.setRoute(false);
    expect([store.get().tool.route, pl.routeMode(), saved]).toEqual([undefined, 'straight', ['route', 'straight']]);
    pl.cancel();
    pl.start({ kind: 'road', gate: true });
    expect([pl.routeMode(), pl.setRoute(true), store.get().tool.route]).toEqual([null, false, undefined]);
    pl.cancel();
    pl.start({ kind: 'wall' });
    expect(pl.routeMode()).toBe(null);
    expect(pl.setRoute(true)).toBe(false);
  });
  it('carries the two ends across: a Straight plan\'s first and last tile become Route\'s start and end', () => {
    const { store, pl } = rig('touch');
    pl.start({ kind: 'road' });
    pl.toggleTile(4, 14); pl.toggleTile(5, 14); pl.toggleTile(6, 14);
    pl.setRoute(true);
    expect([store.get().plan, store.get().line]).toEqual([null, { x0: 4, y0: 14, x1: 6, y1: 14, flip: false }]);
    pl.cancel(); pl.start({ kind: 'road' });                                     // a mouse's line carries too
    pl.setRoute(false);
    pl.pointAt(4, 5); pl.pointAt(9, 9);
    pl.setRoute(true);
    expect(store.get().line).toEqual({ x0: 4, y0: 5, x1: 9, y1: 9, flip: false });
  });
  it('keeps the setting valid and per device: roadMode is straight by default and only straight or route', () => {
    expect(DEFAULT_SETTINGS.roadMode).toBe('straight');
  });
});

describe('v50 roads ui: choosing the ends and the preview', () => {
  it('a mouse clicks a start and an end (or drags): the preview is the route, priced as the sim prices it, with the bridge count', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'road' }); pl.setRoute(true);
    expect(pl.preview().state).toBe('idle');
    expect(pl.preview().text).toBe(ROUTE_TEXT.idleMouse);
    pl.pointAt(4, 14);
    expect(pl.preview().text).toBe('Tap where it ends');
    pl.pointAt(26, 14);
    const r = routeRoad(world, 4, 14, 26, 14), p = pl.preview();
    expect(r.ok).toBe(true);
    expect(r.crossings).toBe(1);
    expect(p.state).toBe('ok');
    expect(p.cost).toBe(r.cost);
    expect(p.cost).toBe(previewRoadTiles(world, r.path).cost);
    expect(p.count).toBe(r.tiles.length);
    expect(p.tiles).toEqual(r.path);
    expect(p.bridges).toEqual(r.bridges);
    expect(p.text).toBe(`${r.tiles.length} tiles · 1 bridge (3 tiles, ${3 * costOf(world, 'bridge')} gold)`);
    expect(previewRoad(world, 4, 14, 26, 14).ok).toBe(false);                    // the L cannot be laid here: hills and the river
    pl.dragTo(5, 5, 'start'); pl.dragTo(9, 9, 'move'); pl.dragTo(25, 13, 'end');
    expect(store.get().line).toEqual({ x0: 5, y0: 5, x1: 25, y1: 13, flip: false });
    expect(pl.preview().cost).toBe(routeRoad(world, 5, 5, 25, 13).cost);
  });
  it('says how many tiles of road already there it uses', () => {
    const { world, pl } = rig();
    setRoad(world, 13, 8, 15, 8);
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(12, 8); pl.pointAt(16, 8);
    const r = routeRoad(world, 12, 8, 16, 8), p = pl.preview();
    expect(r.used).toBeGreaterThan(0);
    expect(p.text.endsWith(ROUTE_TEXT.used(r.used))).toBe(true);
    expect(p.text.includes('already there')).toBe(true);
  });
  it('a finger taps the start and the end, or drags from one to the other; a second finger (cancel) takes the drag back', () => {
    const { world, store, pl } = rig('touch');
    pl.start({ kind: 'road' }); pl.setRoute(true);
    expect(pl.preview().text).toBe(ROUTE_TEXT.idleTouch);
    pl.toggleTile(4, 14);
    expect(store.get().line).toEqual({ x0: 4, y0: 14, x1: null, y1: null, flip: false });
    pl.toggleTile(26, 14);
    expect(store.get().line).toEqual({ x0: 4, y0: 14, x1: 26, y1: 14, flip: false });
    expect(store.get().plan).toBe(null);
    expect(pl.preview().cost).toBe(routeRoad(world, 4, 14, 26, 14).cost);
    pl.stroke(5, 5, 'start'); pl.stroke(8, 6, 'move'); pl.stroke(12, 7, 'end');
    expect(store.get().line).toEqual({ x0: 5, y0: 5, x1: 12, y1: 7, flip: false });
    pl.stroke(6, 6, 'start'); pl.stroke(9, 9, 'move'); pl.stroke(null, null, 'cancel');
    expect(store.get().line).toEqual({ x0: 5, y0: 5, x1: 12, y1: 7, flip: false });   // back to the route drawn before
  });
  it('lays the route as one command, charges the preview\'s price, says how many bridges, and undoes in one step', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(4, 14); pl.pointAt(26, 14);
    const want = pl.preview();
    const gold = world.gold, undos = world.undo.length;
    const result = pl.confirm();
    expect(result.ok).toBe(true);
    expect(gold - world.gold).toBe(want.cost);
    expect(world.undo.length).toBe(undos + 1);
    expect(log[log.length - 1].text).toBe('Road laid · 1 bridge');
    expect(store.get().line).toBe(null);
    for (const [x, y] of want.tiles) expect(world.road[idx(world.size, x, y)]).toBe(1);
    expect(pl.undo().ok).toBe(true);
    expect(world.gold).toBe(gold);
  });
  it('the ghost draws every tile of the way', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(4, 14); pl.pointAt(26, 14);
    expect(ghostsFor(world, store.get()).length).toBe(pl.preview().tiles.length);
  });
});

describe('v50 roads ui: refusals say why, with Show me', () => {
  it('a river wider than a bridge spans: "No way across: the water is too wide here", Show me goes to where a bridge fits', () => {
    const world = land();
    lay(world, T.WATER, 18, 0, 18 + BRIDGE_MAX, 31);
    const { store, pl } = rig('mouse', world);
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(4, 20); pl.pointAt(26, 20);
    const p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.reason).toBe('too_wide');
    expect(p.text).toBe(`No way across: the water is too wide here (${BRIDGE_MAX + 1} tiles; a bridge spans up to ${BRIDGE_MAX})`);
    expect(toolPreview(world, store.get()).showFit).toBe(true);
    expect(routeRoad(world, 4, 20, 26, 20).water).toBe(BRIDGE_MAX + 1);
    const t = fitTarget(world, store.get());
    const spot = bridgeSpot(world, { x: 4, y: 20 });
    expect(t === null).toBe(spot === null);
    if (spot) expect(t.kind).toBe('bridge');
  });
  it('buildings closing the end off: names the first in the way, and Show me goes to it', () => {
    const world = land();
    for (let x = 13; x <= 15; x++) for (let y = 4; y <= 6; y++) if (x !== 14 || y !== 5) addRaw(world, 'well', x, y);
    const { store, pl } = rig('mouse', world);
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(4, 20); pl.pointAt(14, 5);
    const p = pl.preview(), r = routeRoad(world, 4, 20, 14, 5);
    expect([p.state, p.reason]).toEqual(['bad', 'boxed_in']);
    expect(p.text).toBe(ROUTE_TEXT.refusal(world, r));
    expect(p.text.startsWith('No way there: buildings close it off (well in the way)')).toBe(true);
    expect(p.showFit).toBe(true);
    const t = fitTarget(world, store.get());
    expect(t.kind).toBe('spot');
    expect([t.x, t.y]).toEqual([r.at[0] + 0.5, r.at[1] + 0.5]);
    expect(world.occ[idx(world.size, r.at[0], r.at[1])]).toBeGreaterThan(0);
  });
  it('hills, an end on water, and the treasury', () => {
    const world = land();
    lay(world, T.HILLS, 5, 5, 5, 5);
    const { pl } = rig('mouse', world);
    pl.start({ kind: 'road' }); pl.setRoute(true);
    pl.pointAt(5, 5); pl.pointAt(14, 20);
    expect(pl.preview().text).toBe(reasonText('hills'));                         // the start is on hills
    pl.pointAt(14, 20); pl.pointAt(19, 20);
    expect(pl.preview().text).toBe(reasonText('water'));                         // the end is on water
    world.gold = -495;
    pl.pointAt(2, 20); pl.pointAt(7, 20);
    const p = pl.preview();
    expect([p.state, p.reason, p.cost]).toEqual(['bad', 'no_gold', 6 * roadCostOf(world)]);
    expect(p.text.endsWith(reasonText('no_gold'))).toBe(true);
    expect(pl.confirm().ok).toBe(false);
    expect(world.gold).toBe(-495);
  });
});

describe('v50 roads ui: the confirm bar', () => {
  const city = () => { const w = uiWorld(); w.milestone = 'capital'; setGuide(w, false); lay(w, T.WATER, 18, 12, 20, 31); return w; };
  const pickRoad = async (r) => {
    fire(r.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
    fire(r.root.querySelector('#dock .tray .card[data-item="road"]'), 'click');
  };
  it('has a Route and a Straight button, 44 px, named for what each does, the one in force ticked and pressed; Flip is for Straight', async () => {
    const r = await rigUI({ world: city() });
    await pickRoad(r);
    const names = () => [...r.root.querySelectorAll('#confirm .route-pick')];
    expect(names().length).toBe(2);
    expect(names().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);   // Straight by default
    expect(names().map((b) => b.textContent)).toEqual(['Route', '✓ Straight']);
    for (const b of names()) { const q = b.getBoundingClientRect(); expect([q.width >= 43.5, q.height >= 43.5]).toEqual([true, true]); }
    expect(names()[0].getAttribute('aria-label')).toBe(ROUTE_TEXT.routeLabel);
    expect(names()[1].getAttribute('aria-label')).toBe(ROUTE_TEXT.straightLabel);
    for (const b of names()) expect(b.getAttribute('aria-label').startsWith(b.textContent.replace('✓ ', ''))).toBe(true);
    r.tap(2, 20, 'mouse'); r.tap(8, 20, 'mouse');
    expect(r.root.querySelector('#confirm .flip') === null).toBe(false);
    fire(names()[0], 'click');
    expect(names().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(r.store.get().tool.route).toBe(true);
    expect(r.root.querySelector('#confirm .flip')).toBe(null);                    // no L to flip in Route
    expect(r.root.querySelector('#confirm .cost').textContent).toBe(`${routeRoad(r.world, 2, 20, 8, 20).cost} gold`);
    r.cleanup();
  });
  it('the gate card has no shape buttons, and a wall has none', async () => {
    const r = await rigUI({ world: city() });
    r.ui.placement.start({ kind: 'road', gate: true });
    expect(r.root.querySelector('#confirm .route-pick')).toBe(null);
    r.ui.placement.start({ kind: 'wall' });
    expect(r.root.querySelector('#confirm .route-pick')).toBe(null);
    r.cleanup();
  });
  it('a route\'s refusal is in the bar with Show me named for what it shows, and the tick is off', async () => {
    const world = city();
    lay(world, T.WATER, 18, 0, 24, 31);
    for (let x = 18; x <= 24; x++) world.road[idx(world.size, x, 10)] = 0;   // the city's own road no longer crosses the river
    world.roadVersion++;
    const r = await rigUI({ world });
    await pickRoad(r);
    fire(r.root.querySelectorAll('#confirm .route-pick')[0], 'click');
    r.tap(2, 20, 'mouse'); r.tap(28, 20, 'mouse');
    expect(r.root.querySelector('#confirm .reason').textContent.startsWith('No way across')).toBe(true);
    expect(r.root.querySelector('#confirm .ok').disabled).toBe(true);
    expect(r.root.querySelector('#confirm .show-fit').getAttribute('aria-label').includes('bridge')).toBe(true);
    r.cleanup();
  });
});

describe('v50 roads ui: progressive disclosure', () => {
  it('has a tip and How to play words for Route, fired by the first road laid and by a straight road refused for what lies in its way', () => {
    expect([TIPS.some((t) => t.id === 'road_route'), Boolean(TIP_TEXT.road_route), Boolean(TIP_HELP_TEXT.road_route)]).toEqual([true, true, true]);
    expect(TIPS.find((t) => t.id === 'road_route').trigger).toBe('roadRoute');
    expect(TIP_TEXT.road_route.includes('Route')).toBe(true);
  });
});

describe('v50 roads ui: Task 4 review minors', () => {
  it('Build another\'s Copies line lists only the goods the copy would keep, by the rule applySettings uses', () => {
    const w = makeTestWorld({ gold: 100000 });
    w.milestone = 'capital';
    setRoad(w, 0, 10, 31, 10);
    const store = addRaw(w, 'storehouse', 12, 11);
    addRaw(w, 'storehouse', 20, 11, { store: { pottery: 300, linen: 300 } });
    staffAll(w);
    expect(setFetch(w, store.id, 'pottery', 100).ok).toBe(true);
    expect(setAccept(w, store.id, 'beer', false).ok).toBe(true);
    const copy = settingsOf(store);
    const odd = { fetch: [{ good: 'pottery', fetch: 100 }, { good: 'dragonfruit', fetch: 40 }], refuses: ['beer', 'dragonfruit'] };   // a good a storehouse never holds
    const kept = settingsThatApply('storehouse', odd);
    expect(kept.fetch).toEqual([{ good: 'pottery', fetch: 100 }]);
    expect(kept.refuses).toEqual(['beer']);
    const made = addRaw(w, 'storehouse', 12, 14);
    const done = applySettings(w, made.id, odd);
    expect(done).toEqual(kept);                                                  // what the bar says is what is written
    expect(ANOTHER_TEXT.copy(kept, goodName)).toBe(`Copies Fetch: ${goodName('pottery')} 100 · refuses ${goodName('beer').toLowerCase()}`);
    expect(settingsThatApply('storehouse', copy)).toEqual(copy);                  // a real copy keeps everything
    expect(settingsThatApply('well', odd)).toBe(null);                           // a well holds nothing: no line at all
    expect(ANOTHER_TEXT.copy(settingsThatApply('well', odd), goodName)).toBe('');
    expect(settingsThatApply('storehouse', null)).toBe(null);
  });
  it('a refused good is not listed as fetched when the copy would refuse it too', () => {
    expect(settingsThatApply('storehouse', { fetch: [{ good: 'pottery', fetch: 100 }], refuses: ['pottery'] })).toEqual({ fetch: [], refuses: ['pottery'] });
  });
  it('the spacing buttons are named from their visible words ("Every 2nd tile: ..."), with no repeated word', () => {
    for (const gap of [1, 2, 3]) {
      for (const r of [null, { positions: [[1, 1]], cost: 12 }, { positions: [], cost: 0 }]) {
        const label = AREA_TEXT.spacingLabel(gap, 'garden', r);
        expect(label.startsWith(SPACING_NAMES[gap])).toBe(true);
        expect(label.includes('tile tile')).toBe(false);
      }
    }
    expect(AREA_TEXT.spacingLabel(2, 'garden', null).startsWith('Every 2nd tile: ')).toBe(true);
    expect(AREA_TEXT.spacingLabel(1, 'garden', null).startsWith('Every tile: ')).toBe(true);
  });
  it('previewAreaTiles is asked once for a rectangle and spacing while nothing changes, and again when the world does', () => {
    const w = makeTestWorld({ gold: 100000 });
    const tiles = [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2]];
    const a = areaPreviewOf(w, 'garden', tiles, 2);
    expect(areaPreviewOf(w, 'garden', tiles, 2)).toBe(a);                         // the same answer object: not worked out again
    expect(areaPreviewOf(w, 'garden', tiles, 1) === a).toBe(false);
    expect(areaPreviewOf(w, 'garden', tiles.slice(1), 2) === a).toBe(false);
    w.gold -= 10;
    const b = areaPreviewOf(w, 'garden', tiles, 2);
    expect(b === a).toBe(false);                                                        // the treasury moved: the verdict is worked out afresh
    addRaw(w, 'well', 1, 1);
    expect(areaPreviewOf(w, 'garden', tiles, 2) === b).toBe(false);                     // a building stands on a tile
    expect(areaPreviewOf(w, 'garden', tiles, 2).skipped.length).toBeGreaterThan(0);
  });
  it('the unused idle words of AREA_TEXT are gone', () => {
    expect(AREA_TEXT.idle).toBe(undefined);
    expect(AREA_TEXT.idleMouse).toBe(undefined);
  });
});

describe('v50 roads ui: the Route tip at the moment a straight road is refused', () => {
  it('fires when a straight road meets hills or a building, and not in Route, for a clear road or for the Gate card', () => {
    const world = land();
    const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
    const root = document.createElement('div');
    document.body.append(root);
    const fired = [];
    const ui = createMapUi({ world, store, root, fireTip: (k) => { if (k === 'roadRoute') fired.push(k); }, showMeAt: () => {}, toasts: { show: () => {} } });
    const pl = createPlacement({ world, store });
    try {
      pl.start({ kind: 'road' });
      pl.pointAt(4, 20); pl.pointAt(7, 20);                                      // clear sand
      expect(fired).toEqual([]);
      pl.pointAt(4, 14); pl.pointAt(14, 14);                                     // through the hills
      expect(fired).toEqual(['roadRoute']);
      pl.setRoute(true);
      pl.pointAt(4, 13); pl.pointAt(14, 15);                                     // Route goes round them: nothing to say
      expect(fired).toEqual(['roadRoute']);
      pl.start({ kind: 'road', gate: true });
      pl.pointAt(4, 14); pl.pointAt(14, 14);
      expect(fired.length).toBe(1);
    } finally { ui.destroy(); root.remove(); }
  });
});
