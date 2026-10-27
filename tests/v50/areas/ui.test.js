// Version 5.0 Task 4 (rulings 550-559): drag areas through the placement tool and the confirm bar, and Build another through the building sheets. Every number and sentence
// is compared with the sim's own function (previewAreaTiles, anotherOf, costOf, canPlace), the world set up both ways: the area that fits and the one that does not, a copy that
// goes and one the sim refuses. The mobile budget for the bar and the sheet is in tests/v50/areas/budget.test.js.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { createPlacement, ghostsFor, toolPreview } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select } from '../../../src/ui/modes.js';
import { previewAreaTiles } from '../../../src/sim/areas.js';
import { anotherOf } from '../../../src/sim/another.js';
import { canPlace, rectTiles, setAccept, setGuide } from '../../../src/sim/commands.js';
import { setFetch, ordersOf } from '../../../src/sim/carts.js';
import { costOf } from '../../../src/sim/costs.js';
import { monthlyBill, balanceWith } from '../../../src/sim/economy.js';
import { allBuildings } from '../../../src/sim/world.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { AREA_TEXT, ANOTHER_TEXT, areaCount } from '../../../src/ui/areaText.js';
import { S45_TEXT, goodName, warningText } from '../../../src/ui/text.js';
import { AUTO_OVERLAY } from '../../../src/data/ui.js';
import { TIPS } from '../../../src/data/tips.js';
import { TIP_TEXT, TIP_HELP_TEXT } from '../../../src/ui/text.js';

function rig(inputType = 'mouse', gold = 100000) {
  const world = makeTestWorld({ gold });
  world.milestone = 'capital';
  setRoad(world, 0, 10, 31, 10);
  const store = createStore({ ...INITIAL_UI_STATE, inputType });
  const log = [];
  const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e), effects: null, now: () => 0 });
  return { world, store, pl, log };
}
const rect = (w, x0, y0, x1, y1) => rectTiles(x0, y0, x1, y1, w.size);

describe('v50 areas ui: the farm area through the placement tool', () => {
  it('previews "N farms · G gold" from the sim, with the refused tiles skipped and the farms drawn at their own size', () => {
    const { world, store, pl } = rig();
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) world.terrain[idx(world.size, x, y)] = T.WATER;
    expect(pl.start({ kind: 'areas', type: 'farm_grain' })).toBe(undefined);
    expect(store.get().tool).toEqual({ kind: 'areas', type: 'farm_grain', spacing: 2 });
    expect(store.get().mode).toBe('drawing');
    expect(store.get().overlay).toBe(AUTO_OVERLAY.farm_grain);                    // the Ground layer shows where farms can stand
    pl.pointAt(0, 0); pl.pointAt(7, 5);                                          // a mouse: a click on each corner
    const r = previewAreaTiles(world, 'farm_grain', rect(world, 0, 0, 7, 5));
    const p = pl.preview();
    expect(r.positions.length).toBeGreaterThan(0);
    expect(p.count).toBe(r.positions.length);
    expect(p.cost).toBe(r.cost);
    expect(p.costText).toBe(`${areaCount('farm_grain', r.positions.length)} · ${r.cost} gold`);
    expect(p.costText).toBe(AREA_TEXT.costLine('farm_grain', r.positions.length, r.cost));
    expect(p.skipped.length).toBe(r.skipped.length);
    expect(p.skipped.length).toBe(4);
    expect(p.text).toBe(`${warningText('needs_road', 'farm_grain')} · ${AREA_TEXT.skipped(r.skipped)}`);
    expect(AREA_TEXT.skipped(r.skipped)).toBe('4 tiles skipped: 4 water');
    expect(p.state).toBe('warn');                                                 // no road touches them yet: amber, still placeable
    const g = ghostsFor(world, store.get());
    expect(g.filter((s) => s.w === 2 && s.d === 2).length).toBe(r.positions.length);
    expect(g.filter((s) => s.state === 'bad').length).toBe(4);
    expect(p.upkeep).toBe(AREA_TEXT.upkeepFor(monthlyBill('farm_grain', world), r.positions.length));   // Version 6.0 (Track A): the city's own bill (its rank's costs)
    expect(p.balance).toBe('');                                                   // a farm no road touches costs nothing yet, so the balance waits for the road (as one farm's does)
    pl.cancel();                                                                 // the same area beside the road: no warning, and the balance is the sim's for that many
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.pointAt(0, 8); pl.pointAt(5, 9);
    const beside = previewAreaTiles(world, 'farm_grain', rect(world, 0, 8, 5, 9));
    const q = pl.preview();
    expect([beside.warnings.includes('needs_road'), q.count, q.state]).toEqual([false, beside.positions.length, beside.warnings.length ? 'warn' : 'ok']);
    expect(q.balanceNet).toBe(balanceWith(world, 'farm_grain', beside.positions.length));
    expect(q.balance).toBe(S45_TEXT.balanceLine(q.balanceNet));
  });
  it('lays them on the tick as one undo step, and the toast says how many', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.pointAt(0, 0); pl.pointAt(5, 3);
    const want = previewAreaTiles(world, 'farm_grain', rect(world, 0, 0, 5, 3));
    const gold = world.gold;
    const res = pl.confirm();
    expect(res.ok).toBe(true);
    expect(res.ids.length).toBe(want.positions.length);
    expect(world.gold).toBe(gold - want.cost);
    expect(world.undo.length).toBe(1);
    const e = log[log.length - 1];
    expect([e.kind, e.undoable, e.text]).toEqual(['areas', true, AREA_TEXT.laid('farm_grain', want.positions.length)]);
    expect(store.get().area).toBe(null);
    expect(store.get().tool.kind).toBe('areas');                                  // a mouse keeps the tool on
    expect(pl.undo().ok).toBe(true);
    expect(allBuildings(world).filter((b) => b.type === 'farm_grain').length).toBe(0);
    expect(world.gold).toBe(gold);
  });
  it('a finger\'s strokes and taps make a plan, and the farms are packed in exactly the plan\'s tiles', () => {
    const { world, store, pl } = rig('touch');
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.stroke(0, 0, 'start'); pl.stroke(3, 1, 'move'); pl.stroke(3, 1, 'end');
    pl.stroke(0, 4, 'start'); pl.stroke(3, 5, 'move'); pl.stroke(3, 5, 'end');   // a second stroke, two rows below: the gap between is not part of the plan
    const tiles = store.get().plan.tiles;
    expect(tiles.length).toBe(16);
    const want = previewAreaTiles(world, 'farm_grain', tiles);
    expect(want.positions.length).toBe(4);
    expect(pl.preview().count).toBe(4);
    const res = pl.confirm();
    expect(res.ok).toBe(true);
    expect(res.ids.map((id) => [world.buildings[id].x, world.buildings[id].y]).sort()).toEqual(want.positions.slice().sort());
    expect(store.get().plan).toBe(null);
    expect(world.undo.length).toBe(1);
  });
  it('says nothing fits when no farm can stand there, and refuses the tick', () => {
    const { world, pl } = rig();
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.pointAt(12, 0); pl.pointAt(16, 4);                                        // sand
    const p = pl.preview();
    expect([p.state, p.reason]).toEqual(['bad', 'nothing_to_place']);
    expect(p.text).toBe(AREA_TEXT.nothing('farm_grain', previewAreaTiles(world, 'farm_grain', rect(world, 12, 0, 16, 4)).skipped));
    expect(pl.confirm().ok).toBe(false);
  });
  it('the treasury rule: an area the treasury cannot pay is refused whole, the bar says how many it can pay for, and more gold lets it through', () => {
    const { world, pl } = rig('mouse', -350);
    pl.start({ kind: 'areas', type: 'farm_grain' });
    pl.pointAt(0, 0); pl.pointAt(5, 5);
    const r = previewAreaTiles(world, 'farm_grain', rect(world, 0, 0, 5, 5));
    expect(r.reason).toBe('no_gold');
    const p = pl.preview();
    expect([p.state, p.reason]).toEqual(['bad', 'no_gold']);
    expect(p.text).toBe(AREA_TEXT.noGold('farm_grain', r));
    expect(p.text.includes(`pay for ${Math.floor((-350 - ECONOMY.debtFloor) / costOf(world, 'farm_grain'))} of 9`)).toBe(true);
    expect(p.costText).toBe(AREA_TEXT.costLine('farm_grain', 9, r.cost));         // the price is still said
    const gold = world.gold;
    expect(pl.confirm().ok).toBe(false);
    expect([world.gold, allBuildings(world).length, world.undo.length]).toEqual([gold, 0, 0]);
    world.gold = ECONOMY.debtFloor + r.cost;                                      // exactly enough
    expect(pl.preview().state).toBe('warn');
    expect(pl.confirm().ok).toBe(true);
    expect(world.gold).toBe(ECONOMY.debtFloor);
  });
});

describe('v50 areas ui: garden and statue areas', () => {
  it('fill the rectangle at the chosen spacing, each button saying what it would lay', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'areas', type: 'statue' });
    expect(pl.spacingChoices().map((c) => [c.gap, c.active, c.label.includes('every')])).toEqual([[1, false, true], [2, true, true], [3, false, true]]);   // nothing drawn: the rule
    pl.pointAt(10, 12); pl.pointAt(18, 18);
    const tiles = rect(world, 10, 12, 18, 18);
    for (const gap of [1, 2, 3]) {
      expect(pl.setSpacing(gap)).toBe(true);
      const r = previewAreaTiles(world, 'statue', tiles, { spacing: gap });
      const p = pl.preview();
      expect(p.count).toBe(r.positions.length);
      expect(p.costText).toBe(`${areaCount('statue', r.positions.length)} · ${r.cost} gold`);
      expect(pl.spacingChoices().find((c) => c.active).gap).toBe(gap);
      expect(pl.spacingChoices().find((c) => c.gap === gap).label).toBe(AREA_TEXT.spacingLabel(gap, 'statue', r));
    }
    expect(pl.spacingChoices().map((c) => c.label)).toEqual([1, 2, 3].map((gap) => AREA_TEXT.spacingLabel(gap, 'statue', previewAreaTiles(world, 'statue', tiles, { spacing: gap }))));
    expect(pl.setSpacing(4)).toBe(false);
    expect(store.get().tool.spacing).toBe(3);
    const res = pl.confirm();
    expect(res.ids.length).toBe(9);
    pl.cancel();
    pl.start({ kind: 'areas', type: 'statue' });
    expect(store.get().tool.spacing).toBe(3);                                     // the spacing last chosen is remembered
    expect(rig().pl.setSpacing(2)).toBe(false);                                   // and there is no spacing without an area tool
  });
  it('a farm area has no spacing, and a single building tool has no area choices', () => {
    const { pl } = rig();
    pl.start({ kind: 'areas', type: 'farm_grain' });
    expect(pl.spacingChoices()).toBe(null);
    expect(pl.areaType()).toBe('farm_grain');
    pl.start({ kind: 'building', type: 'well' }, { x: 5, y: 8 });
    expect(pl.areaType()).toBe(null);
    pl.start({ kind: 'building', type: 'garden' }, { x: 5, y: 8 });
    expect(pl.areaType()).toBe('garden');
  });
  it('are refused before they unlock, with the sim\'s reason', () => {
    const { world, pl } = rig();
    world.milestone = 'village';
    pl.start({ kind: 'areas', type: 'statue' });
    pl.pointAt(10, 12); pl.pointAt(14, 14);
    const p = pl.preview();
    expect([p.state, p.reason]).toEqual(['bad', 'locked']);
    expect(pl.confirm().ok).toBe(false);
  });
});

async function pickCard(r, category, item) {
  fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
  fire(r.root.querySelector(`#dock .tray .card[data-item="${item}"]`), 'click');
}
const city = () => { const w = uiWorld(); w.milestone = 'capital'; setGuide(w, false); return w; };   // guide off: a goal's reward would move the gold

describe('v50 areas ui: the confirm bar and a finger\'s drag', () => {
  it('a farm card\'s bar offers a named 44 px Drag an area button; it switches to the area tool and back to one farm', async () => {
    const r = await rigUI({ world: city() });
    await pickCard(r, 'food', 'farm_grain');
    expect(r.store.get().tool.kind).toBe('building');
    const toggle = r.root.querySelector('#confirm .area-toggle');
    expect(toggle.getAttribute('aria-label')).toBe(AREA_TEXT.areaLabel('farm_grain'));
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    const b = toggle.getBoundingClientRect();
    expect([b.width >= 43.5, b.height >= 43.5]).toEqual([true, true]);
    fire(toggle, 'click');
    expect(r.store.get().tool).toEqual({ kind: 'areas', type: 'farm_grain', spacing: 2 });
    expect(r.root.querySelector('#confirm .title').textContent).toBe(AREA_TEXT.title('farm_grain'));
    const back = r.root.querySelector('#confirm .area-toggle');
    expect([back.getAttribute('aria-label'), back.getAttribute('aria-pressed')]).toEqual([AREA_TEXT.oneLabel('farm_grain'), 'true']);
    fire(back, 'click');
    expect([r.store.get().tool.kind, r.store.get().tool.type, r.store.get().mode]).toEqual(['building', 'farm_grain', 'placing']);
    expect(r.store.get().ghost !== null).toBe(true);
    r.cleanup();
  });
  it('a well\'s bar has no area button, and the dock card for the farm stays lit in area mode', async () => {
    const r = await rigUI({ world: city() });
    await pickCard(r, 'services', 'well');
    expect(r.root.querySelector('#confirm .area-toggle')).toBe(null);
    await pickCard(r, 'food', 'farm_grain');
    fire(r.root.querySelector('#confirm .area-toggle'), 'click');
    expect(r.root.querySelector('#dock .tray .card[data-item="farm_grain"]').getAttribute('aria-pressed')).toBe('true');
    r.cleanup();
  });
  it('a finger drags a farm area: the bar says the total, the tick lays it and ends the tool, Undo takes the lot back', async () => {
    const world = city();
    const r = await rigUI({ world });
    await pickCard(r, 'food', 'farm_grain');
    fire(r.root.querySelector('#confirm .area-toggle'), 'click');
    r.store.set({ inputType: 'touch' });
    const finger = (type, tx, ty) => { const p = r.screenOf(tx + 0.5, ty + 0.5); fire(r.canvas, type, { ...r.at(p.x, p.y), pointerId: 3, pointerType: 'touch' }); };
    finger('pointerdown', 0, 13);
    for (const [tx, ty] of [[1, 14], [3, 15], [5, 16]]) finger('pointermove', tx, ty);
    finger('pointerup', 5, 16);
    const want = previewAreaTiles(world, 'farm_grain', rectTiles(0, 13, 5, 16, world.size));
    const bar = r.root.querySelector('#confirm');
    expect(want.positions.length).toBe(6);
    expect(bar.querySelector('.cost').textContent.startsWith(`${AREA_TEXT.costLine('farm_grain', 6, want.cost)}`)).toBe(true);
    expect(bar.querySelector('.cost').textContent.startsWith('6 farms · ')).toBe(true);
    const gold = world.gold;
    const before = allBuildings(world).length;
    const ok = bar.querySelector('.ok');
    fire(ok, 'pointerdown', { pointerType: 'touch' }); fire(ok, 'click');
    expect(allBuildings(world).length).toBe(before + 6);
    const paid = world.gold;                                                      // a first (src/sim/firsts.js) may add its reward, so the gold is checked from here: the area cost the sim's price and Undo gives it back
    expect(paid >= gold - want.cost).toBe(true);
    expect([r.store.get().mode, r.store.get().plan]).toEqual(['browse', null]);
    expect(world.undo.length).toBeGreaterThan(0);
    expect(r.ui.placement.undo().ok).toBe(true);
    expect(allBuildings(world).length).toBe(before);
    expect(world.gold).toBe(paid + want.cost);
    r.cleanup();
  });
  it('a mouse clicks two corners (or drags) for the area, and its tick keeps the tool on', async () => {
    const world = city();
    const r = await rigUI({ world });
    await pickCard(r, 'food', 'farm_grain');
    fire(r.root.querySelector('#confirm .area-toggle'), 'click');
    r.tap(0, 13, 'mouse'); r.tap(5, 16, 'mouse');
    expect(r.store.get().area).toEqual({ x0: 0, y0: 13, x1: 5, y1: 16 });
    expect(r.root.querySelector('#confirm .cost').textContent.startsWith('6 farms · ')).toBe(true);
    const ok = r.root.querySelector('#confirm .ok');
    fire(ok, 'pointerdown', { pointerType: 'mouse' }); fire(ok, 'click');
    expect(r.store.get().tool.kind).toBe('areas');
    expect(allBuildings(world).filter((b) => b.type === 'farm_grain').length).toBe(7);   // the city's own farm and six more
    r.cleanup();
  });
  it('a garden area\'s bar has three spacing buttons (44 px, named for what each lays, the one in force pressed) and the choice changes the total', async () => {
    const world = city();
    const r = await rigUI({ world });
    await pickCard(r, 'homes', 'garden');
    fire(r.root.querySelector('#confirm .area-toggle'), 'click');
    r.tap(16, 13, 'mouse'); r.tap(24, 19, 'mouse');
    const picks = [...r.root.querySelectorAll('#confirm .area-pick')];
    expect(picks.length).toBe(3);
    for (const b of picks) { const q = b.getBoundingClientRect(); expect([q.width >= 43.5, q.height >= 43.5, Boolean(b.getAttribute('aria-label'))]).toEqual([true, true, true]); }
    expect(picks.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    const tiles = rectTiles(16, 13, 24, 19, world.size);
    expect(picks.map((b) => b.getAttribute('aria-label'))).toEqual([1, 2, 3].map((gap) => AREA_TEXT.spacingLabel(gap, 'garden', previewAreaTiles(world, 'garden', tiles, { spacing: gap }))));
    const cost = () => r.root.querySelector('#confirm .cost').textContent;
    expect(cost()).toBe(AREA_TEXT.costLine('garden', previewAreaTiles(world, 'garden', tiles, { spacing: 2 }).positions.length, previewAreaTiles(world, 'garden', tiles, { spacing: 2 }).cost));
    fire(r.root.querySelectorAll('#confirm .area-pick')[0], 'click');
    expect(cost()).toBe(AREA_TEXT.costLine('garden', 63, 63 * costOf(world, 'garden')));
    expect(r.root.querySelectorAll('#confirm .area-pick')[0].getAttribute('aria-pressed')).toBe('true');
    r.cleanup();
  });
  it('an area the treasury cannot pay shows the refusal in the bar with the tick disabled', async () => {
    const world = city();
    world.gold = -350;
    const r = await rigUI({ world });
    await pickCard(r, 'food', 'farm_grain');
    fire(r.root.querySelector('#confirm .area-toggle'), 'click');
    r.tap(0, 13, 'mouse'); r.tap(5, 18, 'mouse');
    const reason = r.root.querySelector('#confirm .reason');
    const want = previewAreaTiles(world, 'farm_grain', rectTiles(0, 13, 5, 18, world.size));
    expect(want.reason).toBe('no_gold');
    expect(reason.textContent.startsWith(AREA_TEXT.noGold('farm_grain', want))).toBe(true);
    expect(r.root.querySelector('#confirm .ok').disabled).toBe(true);
    r.cleanup();
  });
});

describe('v50 areas ui: Build another on the building sheets', () => {
  const sheetOf = async (world, id) => { const r = await rigUI({ world }); r.store.set(select(r.store.get(), id)); r.frame(0); return r; };
  const buttonOf = (r) => r.root.querySelector('#sheet button.another');

  it('is on every building sheet, a named 44 px button: a service, a store, a monument, a plot and the palace', async () => {
    const world = city();
    const ids = {
      well: allBuildings(world).find((b) => b.type === 'well').id, granary: allBuildings(world).find((b) => b.type === 'granary').id, house: allBuildings(world).find((b) => b.type === 'house').id,
      obelisk: addRaw(world, 'obelisk_small', 20, 20).id, palace: addRaw(world, 'palace', 24, 20).id,
    };
    for (const [name, id] of Object.entries(ids)) {
      const r = await sheetOf(world, id);
      const b = buttonOf(r);
      expect([name, Boolean(b)]).toEqual([name, true]);
      expect([name, b.getAttribute('aria-label')]).toEqual([name, ANOTHER_TEXT.label(world.buildings[id].type)]);
      const q = b.getBoundingClientRect();
      expect([name, q.width >= 43.5, q.height >= 43.5]).toEqual([name, true, true]);
      r.cleanup();
    }
  });
  it('picks up the same building with a ghost beside it, closes the sheet, and places on the tick', async () => {
    const world = city();
    const well = allBuildings(world).find((b) => b.type === 'well');
    const r = await sheetOf(world, well.id);
    fire(buttonOf(r), 'click');
    const s = r.store.get();
    expect([s.mode, s.tool.kind, s.tool.type, s.sheet]).toEqual(['placing', 'building', 'well', null]);
    expect(canPlace(world, 'well', s.ghost.x, s.ghost.y, { roadLater: true }).ok).toBe(true);
    expect(r.root.querySelector('#confirm .copy-line')).toBe(null);               // a well has no settings to copy
    const before = allBuildings(world).length;
    const ok = r.root.querySelector('#confirm .ok');
    fire(ok, 'pointerdown', { pointerType: 'mouse' }); fire(ok, 'click');
    expect(allBuildings(world).length).toBe(before + 1);
    r.cleanup();
  });
  it('a store\'s Fetch orders and switches are said in the bar before the tick, and the new store has them after it', async () => {
    const world = city();
    const a = addRaw(world, 'storehouse', 12, 11);
    addRaw(world, 'storehouse', 20, 11, { store: { pottery: 300, linen: 300 } });
    staffAll(world);
    setFetch(world, a.id, 'pottery', 100); setFetch(world, a.id, 'linen', 40);
    setAccept(world, a.id, 'beer', false);
    const r = await sheetOf(world, a.id);
    fire(buttonOf(r), 'click');
    const line = r.root.querySelector('#confirm .copy-line');
    const copy = anotherOf(world, a).copy;
    expect(line.textContent).toBe(ANOTHER_TEXT.copy(copy, goodName));
    expect(line.textContent).toBe('Copies Keep stocked: Pottery 100, Linen 40 · refuses beer');   // Version 8.3: Keep stocked
    const ok = r.root.querySelector('#confirm .ok');
    fire(ok, 'pointerdown', { pointerType: 'mouse' }); fire(ok, 'click');
    const made = allBuildings(world).filter((b) => b.type === 'storehouse' && b.id !== a.id && b.x !== 20).pop();
    expect(ordersOf(made)).toEqual(ordersOf(a));
    expect(made.accepts.beer).toBe(false);
    r.cleanup();
  });
  it('a store with no settings says nothing to copy', async () => {
    const world = city();
    const a = addRaw(world, 'storehouse', 12, 11);
    const r = await sheetOf(world, a.id);
    fire(buttonOf(r), 'click');
    expect(r.root.querySelector('#confirm .copy-line')).toBe(null);
    r.cleanup();
  });
  it('a monument comes back in the same style, ticked in the bar', async () => {
    const world = city();
    world.gold = 100000;
    const m = addRaw(world, 'obelisk_small', 18, 18);
    m.style = 'gilded';
    const r = await sheetOf(world, m.id);
    fire(buttonOf(r), 'click');
    expect(r.store.get().tool.style).toBe('gilded');
    expect(r.root.querySelector('#confirm .style-pick.on').dataset.style).toBe('gilded');
    r.cleanup();
  });
  it('a copy the sim refuses says why in the sheet, with Show me, and starts no tool: no gold', async () => {
    const world = city();
    const well = allBuildings(world).find((b) => b.type === 'well');
    world.gold = ECONOMY.debtFloor + costOf(world, 'well') - 1;
    const r = await sheetOf(world, well.id);
    fire(buttonOf(r), 'click');
    const note = r.root.querySelector('#sheet .another-note');
    const why = anotherOf(world, well);
    expect(why.reason).toBe('no_gold');
    expect(note.textContent.startsWith(ANOTHER_TEXT.refusal(world, why))).toBe(true);
    expect(note.textContent.includes(`costs ${costOf(world, 'well')} gold`)).toBe(true);
    expect(note.textContent.includes(String(world.gold))).toBe(true);
    expect(r.store.get().tool).toBe(null);
    expect(r.store.get().sheet.kind).toBe('info');
    const show = note.querySelector('.show-me');
    expect(Boolean(show) && show.getBoundingClientRect().height >= 43.5).toBe(true);
    fire(show, 'click');
    expect([r.store.get().sheet.kind, r.store.get().sheet.id]).toEqual(['summary', 'forecast']);
    r.cleanup();
    // The same sheet with the gold given back: the sim says yes and the tool starts.
    const world2 = city();
    world2.gold = ECONOMY.debtFloor + costOf(world2, 'well');
    const r2 = await sheetOf(world2, allBuildings(world2).find((b) => b.type === 'well').id);
    fire(buttonOf(r2), 'click');
    expect(r2.store.get().tool.type).toBe('well');
    r2.cleanup();
  });
  it('locked: says what unlocks it, and the sheet goes on', async () => {
    const world = city();
    const store = addRaw(world, 'storehouse', 12, 11);
    world.milestone = 'village';
    const r = await sheetOf(world, store.id);
    fire(buttonOf(r), 'click');
    const why = anotherOf(world, store);
    expect(why.reason).toBe('locked');
    expect(r.root.querySelector('#sheet .another-note').textContent.startsWith(ANOTHER_TEXT.refusal(world, why))).toBe(true);
    expect(r.root.querySelector('#sheet .another-note .show-me') !== null).toBe(true);
    expect(r.store.get().tool).toBe(null);
    r.cleanup();
  });
  it('the palace: only one, said so; no Show me to itself, but a monument kind\'s second is fine', async () => {
    const world = city();
    world.gold = 100000;
    const palace = addRaw(world, 'palace', 24, 20);
    const r = await sheetOf(world, palace.id);
    fire(buttonOf(r), 'click');
    const why = anotherOf(world, palace);
    expect(why.reason).toBe('one_only');
    const note = r.root.querySelector('#sheet .another-note');
    expect(note.textContent.startsWith(ANOTHER_TEXT.refusal(world, why))).toBe(true);
    expect(note.querySelector('.show-me')).toBe(null);
    expect(canPlace(world, 'palace', 3, 20).reason).toBe('one_only');
    r.cleanup();
  });
  it('no room: a farm with no fertile ground left says so by the sim\'s own placing rule, with Show me for the ground', async () => {
    const world = city();
    for (let i = 0; i < world.terrain.length; i++) world.terrain[i] = T.DESERT;
    const farm = allBuildings(world).find((b) => b.type === 'farm_grain');
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.terrain[idx(world.size, farm.x + dx, farm.y + dy)] = T.FERTILE;
    let fits = 0;
    for (let y = 0; y < world.size; y++) for (let x = 0; x < world.size; x++) if (canPlace(world, 'farm_grain', x, y, { roadLater: true }).ok) fits++;
    expect(fits).toBe(0);                                                         // the sim: nowhere
    const r = await sheetOf(world, farm.id);
    fire(buttonOf(r), 'click');
    const note = r.root.querySelector('#sheet .another-note');
    expect(note.textContent.startsWith("Can't build another grain farm: no fertile land with room for it")).toBe(true);
    expect(r.store.get().tool).toBe(null);
    expect(note.querySelector('.show-me') !== null).toBe(true);
    r.cleanup();
    // The same city with one more patch of fertile land: the sim finds a place and the tool starts.
    const world2 = city();
    const farm2 = allBuildings(world2).find((b) => b.type === 'farm_grain');
    const r2 = await sheetOf(world2, farm2.id);
    fire(buttonOf(r2), 'click');
    const t = r2.store.get();
    expect([t.tool.type, canPlace(world2, 'farm_grain', t.ghost.x, t.ghost.y, { roadLater: true }).ok]).toEqual(['farm_grain', true]);
    r2.cleanup();
  });
  it('the refusal belongs to its sheet: another building\'s sheet does not show it', async () => {
    const world = city();
    world.gold = ECONOMY.debtFloor + 5;
    const [well, granary] = [allBuildings(world).find((b) => b.type === 'well'), allBuildings(world).find((b) => b.type === 'granary')];
    const r = await sheetOf(world, well.id);
    fire(buttonOf(r), 'click');
    expect(r.root.querySelector('#sheet .another-note') !== null).toBe(true);
    r.store.set(select(r.store.get(), granary.id));
    expect(r.root.querySelector('#sheet .another-note')).toBe(null);
    r.cleanup();
  });
  it('a house sheet offers the plots tool', async () => {
    const world = city();
    const home = allBuildings(world).find((b) => b.type === 'house');
    const r = await sheetOf(world, home.id);
    fire(buttonOf(r), 'click');
    expect([r.store.get().tool.kind, r.store.get().mode]).toEqual(['houses', 'drawing']);
    r.cleanup();
  });
});

describe('v50 areas ui: progressive disclosure', () => {
  it('has a tip and How to play words for Build another and for drag areas, fired by the first building sheet opened and the first farm, garden or statue placed', () => {
    for (const id of ['build_another', 'drag_areas']) {
      expect([id, TIPS.some((t) => t.id === id), Boolean(TIP_TEXT[id]), Boolean(TIP_HELP_TEXT[id])]).toEqual([id, true, true, true]);
    }
    expect(TIPS.find((t) => t.id === 'build_another').trigger).toBe('buildAnother');
    expect(TIPS.find((t) => t.id === 'drag_areas').trigger).toBe('dragAreas');
  });
});
