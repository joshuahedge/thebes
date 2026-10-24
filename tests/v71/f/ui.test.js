// Version 7.1, Track F (rulings 1040-1059): the Ferry tool's interface, on the real shell: the card in the Roads tray, the bar's words set up both ways (what a crossing is and what each
// refusal says, with the numbers the sim decided it by), the road tool's "lay a ferry" refusal and its Show me, the landing's sheet, How to play, and the keyboard path.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire, key } from '../../helpers/dom.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from './helpers.js';
import { toolPreview, ghostsFor, fitTarget } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select, openSheet } from '../../../src/ui/modes.js';
import { cardInfo, shownItems } from '../../../src/ui/cards.js';
import { FERRY_TEXT, V71_HELP } from '../../../src/ui/v71/ferryText.js';
import { S45_TEXT, TIP_TEXT, TIP_HELP_TEXT, buildingName } from '../../../src/ui/text.js';
import { ROUTE_TEXT } from '../../../src/ui/routeText.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { ferryCost, crossingTiles, landingsOf, FERRY } from '../../../src/sim/ferries.js';
import { monthlyBill } from '../../../src/sim/economy.js';
import { BRIDGE_MAX } from '../../../src/sim/bridges.js';
import { TIPS } from '../../../src/data/tips.js';

const store = (tool, extra = {}) => createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, ...extra });
const line = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, flip: false });
const across = (width) => line(RIVER_X - 2, ROW, RIVER_X + width + 1, ROW);
const sized = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };

describe('v71 f ui: the bar\'s words', () => {
  it('says what a crossing is from the sim: the water, the two ferrymen\'s monthly bill, and the price', () => {
    for (const width of [5, 7, 12]) {
      const w = ferryWorld(width);
      const p = toolPreview(w, store({ kind: 'ferry' }, { line: across(width) }).get());
      const bill = monthlyBill('ferry_landing', w);
      expect([width, p.state, p.cost, p.count]).toEqual([width, 'ok', ferryCost(w), 2]);
      expect(p.text).toBe(`${width} tiles of water · Costs ${2 * bill.bill} a month`);   // one short line (fix batch G, ruling 1086): what it counts as is in the landing's sheet
    }
    const hard = ferryWorld(7);
    hard.difficulty = 'hard';
    expect(toolPreview(hard, store({ kind: 'ferry' }, { line: across(7) }).get()).cost).toBe(ferryCost(hard));
    expect(ferryCost(hard)).toBeGreaterThan(ferryCost(ferryWorld(7)));
  });

  it('says why a line is refused, with the number that decided it, for each reason', () => {
    const say = (w, l) => { const p = toolPreview(w, store({ kind: 'ferry' }, { line: l }).get()); return [p.state, p.reason, p.text]; };
    expect(say(ferryWorld(4), across(4))).toEqual(['bad', 'ferry_bridge', `Only 4 tiles of water: a bridge does this (the road tool)`]);
    expect(say(ferryWorld(13), across(13))).toEqual(['bad', 'ferry_too_wide', `Too wide for a ferry (13 tiles of water; the most is ${FERRY.max})`]);
    expect(say(ferryWorld(7), line(RIVER_X - 2, ROW, RIVER_X + 8, ROW + 2))).toEqual(['bad', 'ferry_bent', 'A ferry runs straight across one stretch of water: drag along one row or column']);
    expect(say(ferryWorld(7), line(3, 3, 8, 3))).toEqual(['bad', 'ferry_no_water', 'No water on this line: a ferry crosses water']);
    expect(say(ferryWorld(7), line(RIVER_X - 2, ROW, RIVER_X + 5, ROW))[1]).toBe('ferry_no_land');
    expect(say(ferryWorld(7, { roads: false }), across(7))).toEqual(['bad', 'ferry_no_road', 'Each landing needs a road beside it, so the ferryman can come: lay the road first']);
    expect(say(ferryWorld(7), across(7))[0]).toBe('ok');
    const poor = ferryWorld(7);
    poor.gold = -9999;
    expect(say(poor, across(7))[1]).toBe('no_gold');
  });

  it('before a line is drawn the bar says how, and what a ferry is for', () => {
    const w = ferryWorld(7);
    const mouse = toolPreview(w, store({ kind: 'ferry' }, { inputType: 'mouse' }).get());
    const touch = toolPreview(w, store({ kind: 'ferry' }, { inputType: 'touch' }).get());
    expect([mouse.state, mouse.text, touch.text]).toEqual(['idle', FERRY_TEXT.idleMouse, FERRY_TEXT.idleTouch]);
    expect(mouse.note).toBe(FERRY_TEXT.note);
    expect(FERRY_TEXT.note.includes(`${FERRY.min} to ${FERRY.max}`)).toBe(true);
    const half = toolPreview(w, store({ kind: 'ferry' }, { line: { x0: 3, y0: 3, x1: null, y1: null, flip: false } }).get());
    expect(half.state).toBe('idle');
  });

  it('a touch plan is one line, judged whole: the same words as a dragged line', () => {
    const w = ferryWorld(7);
    const plan = toolPreview(w, store({ kind: 'ferry' }, { plan: { tiles: dragLine(7) }, inputType: 'touch' }).get());
    const drag = toolPreview(w, store({ kind: 'ferry' }, { line: across(7) }).get());
    expect([plan.state, plan.text, plan.cost]).toEqual([drag.state, drag.text, drag.cost]);
    const bent = toolPreview(w, store({ kind: 'ferry' }, { plan: { tiles: [...dragLine(7).slice(0, 6), [RIVER_X + 3, ROW + 1]] }, inputType: 'touch' }).get());
    expect([bent.state, bent.reason]).toEqual(['bad', 'ferry_bent']);
  });

  it('draws the landings as accepted squares and the water between them with the wave mark, never planks', () => {
    const w = ferryWorld(7);
    const g = ghostsFor(w, store({ kind: 'ferry' }, { line: across(7) }).get());
    expect(g.map((t) => t.state)).toEqual(['ok', ...Array(7).fill('ferry'), 'ok']);
    expect(g.map((t) => t.x)).toEqual([RIVER_X - 1, ...Array.from({ length: 7 }, (_, k) => RIVER_X + k), RIVER_X + 7]);
    const refused = ghostsFor(ferryWorld(13), store({ kind: 'ferry' }, { line: across(13) }).get());
    expect(refused.every((t) => t.state === 'bad')).toBe(true);
  });
});

describe('v71 f ui: the road tool says "lay a ferry"', () => {
  it('refuses water past a bridge with the width and the way on, up to a ferry\'s width, and says when even a ferry cannot', () => {
    for (const width of [5, 7, 12]) {
      const p = toolPreview(ferryWorld(width), store({ kind: 'road' }, { line: line(RIVER_X - 4, ROW, RIVER_X + width + 3, ROW) }).get());
      expect([width, p.state, p.reason, p.text]).toEqual([width, 'bad', 'too_wide', `Too wide for a bridge (${width} tiles of water): lay a ferry`]);
      expect(p.text).toBe(S45_TEXT.tooWide(width));
    }
    const wide = toolPreview(ferryWorld(13), store({ kind: 'road' }, { line: line(RIVER_X - 4, ROW, RIVER_X + 16, ROW) }).get());
    expect(wide.text).toBe(`Too wide for a bridge (13 tiles of water) or a ferry (the most is ${FERRY.max})`);
    // 4 tiles still bridge
    expect(toolPreview(ferryWorld(4), store({ kind: 'road' }, { line: line(RIVER_X - 4, ROW, RIVER_X + 7, ROW) }).get()).state).toBe('ok');
    expect(BRIDGE_MAX).toBe(4);
  });

  it('its Show me goes to the nearest place a ferry fits, and starts the Ferry tool there; with no such place it says so', async () => {
    const w = ferryWorld(7);
    const s = store({ kind: 'road' }, { line: line(RIVER_X - 4, 4, RIVER_X + 10, 4) });
    const p = toolPreview(w, s.get());
    expect([p.state, p.reason, p.showFit]).toEqual(['bad', 'too_wide', true]);
    const t = fitTarget(w, s.get());
    expect([t.kind, t.spot.water, t.spot.from[0], t.spot.to[0], [3, 4].includes(t.spot.from[1]), t.spot.from[1] === t.spot.to[1]]).toEqual(['ferry', 7, RIVER_X - 1, RIVER_X + 7, true, true]);   // a tie between the rows either side of the line's end goes to the first
    const r = await rigUI({ world: ferryWorld(7) });
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'road' });
      pl.pointAt(RIVER_X - 4, 4); pl.pointAt(RIVER_X + 10, 4);
      r.frame(0);
      const btn = r.root.querySelector('#confirm .show-fit');
      expect([btn.textContent, btn.getAttribute('aria-label').includes('a ferry'), ...sized(btn)]).toEqual(['Show me', true, true, true]);
      fire(btn, 'click');
      expect(r.store.get().tool.kind).toBe('ferry');
    } finally { r.cleanup(); }
  });

  it('the Ferry tool\'s own Show me goes to a bridge for water a bridge crosses, else to a ferry\'s place; none where the map has none', () => {
    const w = ferryWorld(4);
    const s = store({ kind: 'ferry' }, { line: across(4) });
    expect(toolPreview(w, s.get()).showFit).toBe(true);
    expect(fitTarget(w, s.get()).kind).toBe('bridge');
    const none = ferryWorld(13);
    expect(fitTarget(none, store({ kind: 'ferry' }, { line: across(13) }).get())).toBe(null);
    expect(fitTarget(ferryWorld(7), store({ kind: 'ferry' }, { line: line(3, 3, 8, 3) }).get()).kind).toBe('ferry');
  });

  it('the routed road\'s refusal names the ferry too', () => {
    expect(ROUTE_TEXT.refusal(ferryWorld(7), { reason: 'too_wide', water: 7 }).endsWith(': lay a ferry')).toBe(true);
    expect(ROUTE_TEXT.refusal(ferryWorld(13), { reason: 'too_wide', water: 13 }).endsWith(': lay a ferry')).toBe(false);
  });
});

describe('v71 f ui: the card, the sheet, How to play and the keys', () => {
  it('the Roads tray offers Ferry after Road with its price and width, a named 44 px button, and picking it starts the Ferry tool', async () => {
    const w = ferryWorld(7);
    expect(shownItems(w, 'roads')).toEqual(['road', 'ferry', 'demolish']);
    const info = cardInfo(w, 'ferry');
    expect([info.name, info.cost, info.costText, info.locked, info.terrainText]).toEqual(['Ferry', ferryCost(w), `${ferryCost(w)} gold per crossing`, false, FERRY_TEXT.card]);
    expect(buildingName('ferry')).toBe('Ferry');
    const r = await rigUI({ world: w });
    try {
      fire(r.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
      const card = [...r.root.querySelectorAll('#dock .tray .card')].find((c) => c.dataset.item === 'ferry');
      expect([card.tagName, card.querySelector('.name').textContent, card.querySelector('.cost').textContent.includes(`${ferryCost(w)} gold per crossing`), ...sized(card)]).toEqual(['BUTTON', 'Ferry', true, true, true]);
      expect(card.querySelector('.thumb').tagName).toBe('CANVAS');
      fire(card, 'click');
      expect(r.store.get().tool).toEqual({ kind: 'ferry' });
    } finally { r.cleanup(); }
  });

  it('Enter lays what is drawn: both landings, paid for, with the ferrymen hired and the crossing running, from the keyboard alone', async () => {
    const w = ferryWorld(7);
    const r = await rigUI({ world: w });
    try {
      const gold = w.gold;
      const pl = r.ui.placement;
      pl.start({ kind: 'ferry' });
      pl.pointAt(RIVER_X - 2, ROW); pl.pointAt(RIVER_X + 8, ROW);
      r.frame(0);
      const ok = r.root.querySelector('#confirm .ok');
      expect([ok.disabled, ...sized(ok)]).toEqual([false, true, true]);
      key(r.root, 'Enter');
      expect([landingsOf(w).length, w.undo[w.undo.length - 1].cost, w.gold < gold]).toEqual([2, ferryCost(w), true]);   // paid in one entry (a goal's reward may come back)
      expect(landingsOf(w).map((b) => b.ferry.run)).toEqual([true, true]);
    } finally { r.cleanup(); }
  });

  it('a landing\'s sheet says where the crossing goes and that it runs, or why it does not, and its button shows the other landing', async () => {
    const w = ferryWorld(7);
    const [a, b] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
    settle(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), a.id));
      r.ui.refresh();
      const lines = () => [...r.root.querySelectorAll('#sheet .ferry-line')].map((n) => n.textContent);
      expect(lines()).toEqual([`Ferry across 7 tiles of water, to the east`, `Running: walkers and carts cross as if it were ${crossingTiles(7)} road tiles`]);
      const other = r.root.querySelector('#sheet .ferry-other');
      expect([other.textContent, other.getAttribute('aria-label'), ...sized(other)]).toEqual([FERRY_TEXT.sheet.other, FERRY_TEXT.sheet.otherLabel, true, true]);
      fire(other, 'click');
      expect(r.root.querySelector('#sheet h2').textContent).toBe('Ferry landing');
      // the east landing paused: the west one says so, the east one says it is paused
      b.paused = true;
      settle(w);
      r.ui.refresh();
      expect(lines()[1]).toBe(`Not running: ${FERRY_TEXT.sheet.why.mate_paused}`);
      r.store.set(select(r.store.get(), b.id));
      r.ui.refresh();
      expect([lines()[0], lines()[1]]).toEqual([`Ferry across 7 tiles of water, to the west`, `Not running: ${FERRY_TEXT.sheet.why.paused}`]);
    } finally { r.cleanup(); }
  });

  it('How to play has a Ferries entry and the tips list has the ferries tip, fired when a road meets water too wide to bridge', async () => {
    expect(V71_HELP.f[0].head).toBe('Ferries');
    expect(V71_HELP.f[0].text.includes(`${FERRY.min} up to ${FERRY.max} tiles`)).toBe(true);
    const tip = TIPS.find((t) => t.id === 'ferries');
    expect([tip.trigger, Boolean(TIP_TEXT.ferries), TIP_HELP_TEXT.ferries]).toEqual(['roadTooWide', true, TIP_TEXT.ferries]);
    const r = await rigUI({ world: ferryWorld(7) });
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      r.ui.refresh();
      const heads = [...r.root.querySelectorAll('#sheet h3')].map((h) => h.textContent);
      expect(heads.includes('Ferries')).toBe(true);
      expect([...r.root.querySelectorAll('#sheet .tips-list li')].some((li) => li.textContent === TIP_HELP_TEXT.ferries)).toBe(true);
    } finally { r.cleanup(); }
  });
});
