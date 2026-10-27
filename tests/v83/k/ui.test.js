// Version 8.3 Track K (rulings 1410-1425): Keep stocked on the store sheet, the pick of a source on the map (by touch and by keyboard), the Supply lines
// layer, the tip and the two Advice fixes. Every sentence is checked against the sim's own function, with the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { freeTop } from '../../../src/ui/layout.js';
import { select, startPick, endPick, back, isPicking } from '../../../src/ui/modes.js';
import { setFetch, setSource, fetchStatus, orderSource, sourceChoices, cartDay } from '../../../src/sim/carts.js';
import { demolishAt } from '../../../src/sim/commands.js';
import { supplyLines } from '../../../src/sim/layers.js';
import { layerUnlocked } from '../../../src/sim/layers.js';
import { keepStockedAdvice, siteKeepFix } from '../../../src/sim/adviceFixes.js';
import { bazaarFoodProblem } from '../../../src/sim/bazaarFood.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { restockBazaars } from '../../../src/sim/distribution.js';
import { monthlyHousing } from '../../../src/sim/housing.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { newSite } from '../../../src/sim/world.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { OVERLAYS, OVERLAY_HUE, LAYER_OVERLAYS } from '../../../src/render/overlays.js';
import { supplyLineAt, lineWidth } from '../../../src/render/layers.js';
import { LINES, LAYER_HUE } from '../../../src/data/layers.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { S47_CARTS_TEXT as W, KEEP_TEXT as K, PICK_TEXT as P, LINES_TEXT, OVERLAY_NAMES, TIP_TEXT, TIP_HELP_TEXT, alertText } from '../../../src/ui/text.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { V60_HELP, V70_HELP, OPEN_TEXT, ADVICE_FIX_TEXT } from '../../../src/ui/text.js';
import { ANOTHER_TEXT } from '../../../src/ui/areaText.js';
import * as TEXT from '../../../src/ui/text.js';
import { findSource } from '../../../src/sim/carts.js';
import { setAccept } from '../../../src/sim/commands.js';
import { bazaarFix } from '../../../src/ui/threatFix.js';

const click = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
const step = (w, n = 1) => { for (let i = 0; i < n; i++) { cartDay(w); w.day += 1; } };

// A street along y = 10: the order's store at x 4, a near storehouse at x 10 and a far one at x 18 (both with pottery), a farm at x 24 that holds no pottery.
function world({ nearHeld = 80, farHeld = 80 } = {}) {
  const w = makeTestWorld({ size: 40, fertile: [[22, 11, 6, 6]], gold: 1000 });
  setRoad(w, 0, 10, 39, 10);
  const home = addRaw(w, 'storehouse', 4, 11, { staff: 6, store: {} });
  const near = addRaw(w, 'storehouse', 10, 11, { staff: 6, store: { pottery: nearHeld } });
  const far = addRaw(w, 'storehouse', 18, 11, { staff: 6, store: { pottery: farHeld } });
  const farm = addRaw(w, 'farm_grain', 24, 11);
  return { w, home, near, far, farm };
}
const open = async (w, id, size = [390, 844]) => {
  const r = await rigUI({ world: w, width: size[0], height: size[1] });
  r.store.set(select(r.store.get(), id));
  return r;
};
const row = (r, good) => r.root.querySelector(`#sheet .fetch-good[data-good="${good}"]`);
const bar = (r) => r.root.querySelector('#source-pick');

describe('v83 k ui: the store sheet', () => {
  it('a storehouse has Keeps stocked near the top and Takes in for its switches; a granary has no Takes in', async () => {
    const { w, home } = world();
    const granary = addRaw(w, 'granary', 30, 11, { staff: 6, store: { grain: 10 } });
    const r = await open(w, home.id);
    try {
      const body = r.root.querySelector('#sheet .body');
      const kids = [...body.children];
      const keeps = kids.indexOf(r.root.querySelector('#sheet .fetch-panel')), takes = kids.findIndex((n) => n.classList.contains('takes-in-head'));
      expect([keeps > 0, takes > keeps]).toEqual([true, true]);
      expect(kids[takes].textContent).toBe(K.takesIn);
      expect(kids[takes + 1].textContent).toBe(K.takesInHelp);
      expect(r.root.querySelector('#sheet .fetch-panel .keeps-head').textContent).toContain(W.head);
      r.store.set(select(r.store.get(), granary.id));
      expect(r.root.querySelector('#sheet .takes-in-head')).toBe(null);
      expect(r.root.querySelector('#sheet .fetch-panel .keeps-head') === null).toBe(false);
    } finally { r.cleanup(); }
  });

  it('an order\'s row reads left to right: its good, Keep stocked On, up to the amount, and from the store the sim draws on (Nearest, or the chosen one)', async () => {
    const { w, home, far } = world();
    setFetch(w, home.id, 'pottery', 60);
    const r = await open(w, home.id);
    try {
      const li = row(r, 'pottery');
      expect(li.classList.contains('order')).toBe(true);
      expect(li.querySelector('.fetch-switch').textContent).toContain(W.switchWord);
      expect(li.querySelector('.fetch-switch .onoff').textContent).toBe(W.on);
      expect(li.querySelector('.fetch-second').textContent.startsWith(W.upToWord)).toBe(true);
      expect(li.querySelector('.stepper .value').textContent).toBe('60');
      const from = () => row(r, 'pottery').querySelector('.from-pick');
      expect(from().querySelector('.label').textContent).toBe(K.fromLabel(orderSource(w, home.id, 'pottery')));
      expect(from().querySelector('.label').textContent).toBe(`Nearest storehouse, ${orderSource(w, home.id, 'pottery').store.len} tiles`);
      expect(orderSource(w, home.id, 'pottery').store.id).toBe(w.buildings[home.id + 1].id);   // the near storehouse
      expect(from().getAttribute('aria-label')).toBe(K.fromAria('pottery', orderSource(w, home.id, 'pottery')));
      setSource(w, home.id, 'pottery', far.id);
      r.ui.refresh();
      expect(from().querySelector('.label').textContent).toBe(`Storehouse, ${orderSource(w, home.id, 'pottery').store.len} tiles`);
      expect(from().classList.contains('chosen')).toBe(true);
      // no store can spare it: Nearest has none
      setSource(w, home.id, 'pottery', null);
      for (const b of Object.values(w.buildings)) if (b.store && b.id !== home.id) b.store.pottery = 0;
      r.ui.refresh();
      expect(from().querySelector('.label').textContent).toBe('Nearest: none to spare');
    } finally { r.cleanup(); }
  });

  it('a dry chosen source says so in amber, with Nearest instead?, which sets the order back to today\'s rule', async () => {
    const { w, home, near, far } = world({ farHeld: 0 });
    setFetch(w, home.id, 'pottery', 60);
    setSource(w, home.id, 'pottery', far.id);
    const r = await open(w, home.id);
    try {
      const dry = row(r, 'pottery').querySelector('.fetch-dry');
      const st = fetchStatus(w, home.id, 'pottery');
      expect(st.state).toBe('dry');
      expect(dry.querySelector('.fetch-status').textContent).toBe(W.status(st));
      expect(W.status(st)).toBe(`The storehouse ${st.source.len} road tiles east has no pottery to spare, so the cart waits`);
      expect(dry.querySelector('.fetch-status').classList.contains('amber-text')).toBe(true);   // amber, and the words say it: not colour alone
      const instead = dry.querySelector('.nearest-instead');
      expect([instead.textContent, instead.getAttribute('aria-label')]).toEqual([K.nearestInstead, K.nearestInsteadAria('pottery')]);
      click(instead);
      expect(w.buildings[home.id].orders.pottery.from).toBe(undefined);
      expect(row(r, 'pottery').querySelector('.fetch-dry')).toBe(null);
      expect(fetchStatus(w, home.id, 'pottery').source.id).toBe(near.id);
    } finally { r.cleanup(); }
  });

  it('a chosen store that is demolished: the row says once that the order is Nearest again', async () => {
    const { w, home, far } = world();
    setFetch(w, home.id, 'pottery', 60);
    setSource(w, home.id, 'pottery', far.id);
    demolishAt(w, far.x, far.y);
    const r = await open(w, home.id);
    try {
      expect(row(r, 'pottery').querySelector('.fetch-gone').textContent).toBe(K.gone);
      expect(row(r, 'pottery').querySelector('.from-pick .label').textContent).toBe(K.fromLabel(orderSource(w, home.id, 'pottery')));
      expect(row(r, 'pottery').querySelector('.from-pick .label').textContent.startsWith('Nearest')).toBe(true);
      const events = [];
      cartDay(w, events);
      r.ui.onEvents(events);
      expect(r.ui.tray.list()[0].text).toBe(K.goneMessage({ id: home.id, good: 'pottery' }, w));
    } finally { r.cleanup(); }
  });
});

describe('v83 k ui: the pick on the map', () => {
  it('by touch: from opens the map with a bar; a tap on something else says why; a tap on a lit store picks it and the sheet comes back', async () => {
    const { w, home, far, farm } = world();
    setFetch(w, home.id, 'pottery', 60);
    const r = await open(w, home.id);
    try {
      click(row(r, 'pottery').querySelector('.from-pick'));
      const s = r.store.get();
      expect([s.mode, s.sheet, isPicking(s), s.pick]).toEqual(['picking', null, true, { home: home.id, good: 'pottery' }]);
      expect(r.root.querySelector('#sheet').hidden).toBe(true);                         // one panel: the map and its bar
      expect(bar(r).hidden).toBe(false);
      expect(bar(r).querySelector('.pick-head').textContent).toBe(P.head('pottery', { type: 'storehouse', off: null }));
      expect(bar(r).querySelector('.pick-head').textContent).toBe('Pick the store to bring pottery from, for this storehouse (To here)');
      const choices = sourceChoices(w, home.id, 'pottery');
      expect([...bar(r).querySelectorAll('.pick-choice')].map((b) => b.textContent)).toEqual(choices.map((c) => P.choice(c, 'pottery')));
      expect(bar(r).querySelectorAll('[aria-pressed]').length).toBe(0);                 // one-shot picks, not toggles
      r.frame();                                                                         // the map draws the lit stores, their routes and the store being set
      // panned away from the store being set, the head says where it lies, in words (no floating marker)
      const cam = { x: r.cam.x, y: r.cam.y };
      r.cam.x = home.x + 0.5 + 30; r.cam.y = home.y + 1;
      r.frame();
      const said = bar(r).querySelector('.pick-head').textContent;
      expect([said, /^Pick the store to bring pottery from, for the storehouse \d+ tiles (west|north-west|south-west) of the view$/.test(said)]).toEqual([said, true]);
      Object.assign(r.cam, cam);
      r.frame();
      expect(bar(r).querySelector('.pick-head').textContent.endsWith('(To here)')).toBe(true);
      r.tap(farm.x, farm.y, 'mouse');
      expect(bar(r).querySelector('.pick-status').textContent).toBe(P.notStore('farm_grain', 'pottery'));
      r.tap(home.x, home.y, 'mouse');
      expect(bar(r).querySelector('.pick-status').textContent).toBe(W.refusal({ reason: 'same_store', good: 'pottery' }));
      expect(r.store.get().mode).toBe('picking');
      r.tap(far.x, far.y, 'mouse');
      expect(w.buildings[home.id].orders.pottery.from).toBe(far.id);
      expect([r.store.get().mode, r.store.get().sheet, r.store.get().selectedId]).toEqual(['selected', { kind: 'info', id: home.id }, home.id]);
      expect(bar(r).hidden).toBe(true);
      expect(row(r, 'pottery').querySelector('.from-pick').classList.contains('chosen')).toBe(true);
    } finally { r.cleanup(); }
  });

  it('by keyboard: the first lit store\'s button has focus; Enter picks it; Esc leaves with nothing changed; Nearest sets today\'s rule', async () => {
    const { w, home, near, far } = world({ nearHeld: 0 });
    setFetch(w, home.id, 'pottery', 60);
    setSource(w, home.id, 'pottery', far.id);
    const r = await open(w, home.id, [1280, 800]);
    try {
      click(row(r, 'pottery').querySelector('.from-pick'));
      const lit = [...bar(r).querySelectorAll('.pick-choice')];
      expect(lit.map((b) => b.classList.contains('dim'))).toEqual([true, false]);        // the near store holds none: dimmed, with the reason in words
      expect(lit[0].textContent).toBe(P.choice(sourceChoices(w, home.id, 'pottery')[0], 'pottery'));
      expect(lit[0].textContent).toContain('none held');
      expect(document.activeElement).toBe(lit[1]);
      expect(lit.every((b) => b.getBoundingClientRect().height >= 43.5)).toBe(true);
      fire(r.root, 'keydown', { key: 'Escape' });
      expect(r.store.get().mode).toBe('selected');
      expect(w.buildings[home.id].orders.pottery.from).toBe(far.id);
      click(row(r, 'pottery').querySelector('.from-pick'));
      click(bar(r).querySelector('.pick-nearest'));
      expect(w.buildings[home.id].orders.pottery.from).toBe(undefined);
      expect(r.store.get().mode).toBe('selected');
      click(row(r, 'pottery').querySelector('.from-pick'));
      click([...bar(r).querySelectorAll('.pick-choice')][0]);                           // a dimmed store is a choice all the same: the order waits on it
      expect(w.buildings[home.id].orders.pottery.from).toBe(near.id);
      expect(fetchStatus(w, home.id, 'pottery').state).toBe('dry');
    } finally { r.cleanup(); }
  });

  it('on a small and a tall phone at every text size the bar stays at the foot, under half the screen, its buttons named 44 px targets inside the frame', async () => {
    const wrong = [];
    for (const [width, height] of [[375, 667], [390, 844]]) {
      for (const textSize of [100, 125, 150]) {
        const { w, home } = world();
        setFetch(w, home.id, 'pottery', 60);
        const r = await open(w, home.id, [width, height]);
        try {
          r.ui.settings.set({ textSize });
          click(row(r, 'pottery').querySelector('.from-pick'));
          const at = `${width}x${height} ${textSize}%`, box = r.root.getBoundingClientRect(), b = bar(r).getBoundingClientRect();
          if (b.height > height / 2) wrong.push(`${at}: the bar is ${Math.round(b.height)} px tall`);
          if (Math.abs(b.bottom - box.bottom) > 1) wrong.push(`${at}: the bar is not at the foot`);
          for (const n of bar(r).querySelectorAll('button')) {
            const q = n.getBoundingClientRect(), name = n.getAttribute('aria-label') || n.textContent;
            if (q.height < 43.5 || q.width < 43.5) wrong.push(`${at} ${name}: ${Math.round(q.width)}x${Math.round(q.height)}`);
            if (q.left < box.left - 1 || q.right > box.right + 1) wrong.push(`${at} ${name}: outside the frame`);
            if (!name) wrong.push(`${at}: a button with no name`);
          }
          if (bar(r).scrollWidth > bar(r).clientWidth + 1) wrong.push(`${at}: the bar scrolls sideways`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the framing keeps the store clear of the rows under the top bar and of the bar: at 375x667 and 150% text with a tall notice up, the store lands inside the free map (ruling 1451)', async () => {
    const wrong = [];
    for (const [width, height, textSize, notice] of [[375, 667, 150, 200], [375, 667, 150, 0], [390, 844, 100, 0]]) {
      const { w, home, near } = world();
      setFetch(w, home.id, 'pottery', 60);
      const r = await open(w, home.id, [width, height]);
      try {
        r.ui.settings.set({ textSize });                                                 // (the framing's own: the nearest store it could draw on is always in the band; the order's store too where the two fit together)
        if (notice) r.root.querySelector('#under-bar').append(Object.assign(document.createElement('div'), { id: 'test-notice', textContent: 'A notice', style: `width:300px;height:${notice}px` }));
        click(row(r, 'pottery').querySelector('.from-pick'));
        r.ui.cameraControl.tick(1e6);                                                    // the framing's glide, run to its end
        const at = `${width}x${height} ${textSize}% notice ${notice}`;
        const top = freeTop(document.body, r.canvas, r.store.get().layout), foot = height - bar(r).getBoundingClientRect().height;
        if (notice && top < notice) wrong.push(`${at}: the free top is ${Math.round(top)}`);
        for (const [name, b] of height > 700 ? [['order store', home], ['nearest store', near]] : [['nearest store', near]]) {
          const p = r.screenOf(b.x + b.w / 2, b.y + b.d / 2);
          if (p.y < top || p.y > foot) wrong.push(`${at}: the ${name} is at y ${Math.round(p.y)}, free map ${Math.round(top)} to ${Math.round(foot)}`);
        }
      } finally { r.cleanup(); }
    }
    expect(wrong).toEqual([]);
  });

  it('on a phone held sideways the category rail, the dock and the corner buttons all step aside, and the bar stands at the screen\'s edge (ruling 1452)', async () => {
    const { w, home } = world();
    setFetch(w, home.id, 'pottery', 60);
    const r = await open(w, home.id, [667, 375]);
    try {
      const shown = (sel) => { const n = r.root.querySelector(sel); return n ? getComputedStyle(n).display !== 'none' : false; };
      expect([r.store.get().layout, shown('#rail')]).toEqual(['compact', true]);          // up before the pick (the sheet is open, as it is when from is tapped)
      click(row(r, 'pottery').querySelector('.from-pick'));
      expect(['#rail', '#dock', '#corners'].map(shown)).toEqual([false, false, false]);
      expect(Math.abs(bar(r).getBoundingClientRect().right - r.root.getBoundingClientRect().right)).toBeLessThan(1.5);
      click(bar(r).querySelector('.pick-cancel'));
      expect(shown('#rail')).toBe(true);
    } finally { r.cleanup(); }
  });

  it('the transitions: Back leaves the pick for the store\'s sheet; Cancel does too', async () => {
    const s = startPick({ mode: 'selected', selectedId: 4, sheet: { kind: 'info', id: 4 }, layersOpen: true }, 4, 'grain');
    expect([s.mode, s.sheet, s.selectedId, s.layersOpen]).toEqual(['picking', null, null, false]);
    expect(back({ ...s })).toEqual(endPick(s));
    expect(endPick(s)).toEqual({ mode: 'selected', pick: null, selectedId: 4, sheet: { kind: 'info', id: 4 } });
    const { w, home } = world();
    setFetch(w, home.id, 'pottery', 60);
    const r = await open(w, home.id);
    try {
      click(row(r, 'pottery').querySelector('.from-pick'));
      click(bar(r).querySelector('.pick-cancel'));
      expect([r.store.get().mode, r.store.get().selectedId]).toEqual(['selected', home.id]);
    } finally { r.cleanup(); }
  });
});

describe('v83 k ui: the Supply lines layer', () => {
  it('is a layer of its own beside Goods supply, from Town, named in words, with its own hue', () => {
    expect([OVERLAYS.includes('lines'), LAYER_OVERLAYS.includes('lines'), OVERLAY_NAMES.lines, OVERLAY_NAMES.supply]).toEqual([true, true, 'Supply lines', 'Goods supply']);
    expect(OVERLAY_HUE.lines).toBe(LAYER_HUE.lines);
    const w = makeTestWorld();
    w.milestone = 'village';
    expect(layerUnlocked(w, 'lines')).toBe(false);
    w.milestone = 'town';
    expect(layerUnlocked(w, 'lines')).toBe(true);
    expect([lineWidth(0), lineWidth(LINES.per), lineWidth(1e6)]).toEqual([LINES.thin, LINES.thin + 1, LINES.thick]);
  });

  it('draws, keys its legend, and a tap on a line opens the store it keeps stocked', async () => {
    const { w, home, far } = world({ nearHeld: 0 });
    setFetch(w, home.id, 'pottery', 60);
    setSource(w, home.id, 'pottery', far.id);
    w.milestone = 'town';
    const r = await open(w, far.id);
    try {
      r.store.set({ overlay: 'lines', sheet: null, mode: 'browse', selectedId: null });
      r.frame(0); r.frame(500);
      const legend = r.root.querySelector('#legend .strip.layer.lines');
      expect(legend.querySelector('.text').textContent).toBe('Supply lines');
      expect([...legend.querySelectorAll('.key')].map((k) => k.getAttribute('aria-label'))).toEqual([LINES_TEXT.moving.words, LINES_TEXT.stuck.words, LINES_TEXT.tap.words]);
      const line = supplyLines(w)[0];
      const mid = line.path[Math.floor(line.path.length / 2)], mx = mid % w.size, my = (mid - mx) / w.size;
      expect(supplyLineAt(w, mx + 0.5, my + 0.5).home).toBe(home.id);
      expect(supplyLineAt(w, mx + 0.5, my + 4.5)).toBe(null);
      expect(supplyLineAt(w, home.x + 1.5, home.y + 0.1)).toBe(null);                     // on a building's footprint the building wins, though the line is within reach
      expect(supplyLineAt(w, home.x + 1.5, home.y - 0.1).home).toBe(home.id);            // on the road beside it, the line
      r.tap(mx, my, 'mouse');
      expect(r.store.get().selectedId).toBe(home.id);
    } finally { r.cleanup(); }
  });
});

describe('v83 k ui: the words', () => {
  it('no tip, How to play paragraph or Keep stocked word says Fetch any more (ruling 1383)', () => {
    const fetchWord = /\bfetch(es|ing)?\b/i;
    const said = [...Object.values(TIP_TEXT), ...Object.values(TIP_HELP_TEXT), ...Object.values(V60_HELP).flat().map((p) => p.text), ...Object.values(V70_HELP).flat().map((p) => p.text),
      ...Object.values(W).filter((v) => typeof v === 'string'), W.setLabel('pottery'), W.amountLabel('pottery'), W.less('pottery'), W.tipFor({ good: 'pottery' }),
      OPEN_TEXT.stepMaker({ maker: 'weaver', input: 'flax' }, '(70 gold)', 'storehouse'), OPEN_TEXT.adviceStore({ store: 'storehouse', maker: 'weaver', input: 'flax' }, 'storehouse'),
      ADVICE_FIX_TEXT.strandedFix({ item: 'storehouse', maker: null, perMonth: 40, len: 60 }, 'pottery'), ANOTHER_TEXT.copy({ fetch: [{ good: 'pottery', fetch: 100, from: 3 }], refuses: [] }, (g) => g)];
    expect(said.filter((s) => typeof s === 'string' && fetchWord.test(s))).toEqual([]);
    expect(ANOTHER_TEXT.copy({ fetch: [{ good: 'pottery', fetch: 100, from: 3 }], refuses: [] }, (g) => g)).toBe('Copies Keep stocked: pottery 100 from the same store');
  });

  it('walks every exported text object (its strings, and each family that said Fetch, called) and finds no "fetch" (ruling 1426)', () => {
    const fetchWord = /\bfetch(es|ing)?\b/i, found = [];
    const walk = (v, path, depth = 0) => {
      if (typeof v === 'string') { if (fetchWord.test(v)) found.push(`${path}: ${v}`); return; }
      if (!v || typeof v !== 'object' || depth > 4) return;
      for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, depth + 1);
    };
    for (const [name, v] of Object.entries(TEXT)) walk(v, name);
    // the sentence families that said Fetch, each with sample inputs (both ways where it branches)
    const w = makeTestWorld({ size: 40 });
    setRoad(w, 0, 10, 39, 10);
    const bz = addRaw(w, 'bazaar', 4, 11), far = addRaw(w, 'storehouse', 30, 11, { staff: 6, store: { pottery: 50 } });
    const cause = { code: 'good_far', good: 'pottery', id: far.id, len: 26, bazaar: bz.id };
    const open = { store: 'storehouse', maker: 'weaver', input: 'flax' };
    const called = [
      TEXT.S47_PRESSURE_TEXT.goodFar(cause, w), TEXT.S47_PRESSURE_TEXT.showFar(cause, w),
      TEXT.OPEN_TEXT.stepStore(open, '(70 gold)', 110, 'storehouse'), TEXT.OPEN_TEXT.stepMaker(open, '(110 gold)', 'storehouse'),
      TEXT.OPEN_TEXT.adviceStore(open, 'storehouse'), TEXT.OPEN_TEXT.adviceMaker(open, 'storehouse'),
      TEXT.ADVICE_FIX_TEXT.strandedFix({ item: 'storehouse', maker: null, perMonth: 40, len: 60 }, 'pottery'), TEXT.ADVICE_FIX_TEXT.strandedFix({ item: 'storehouse', maker: 7, perMonth: 40, len: 60 }, 'pottery'),
      TEXT.ADVICE_FIX_TEXT.strandedStep({ item: 'storehouse', maker: null, perMonth: 40, len: 60 }, '(70 gold)', 'pottery'), TEXT.ADVICE_FIX_TEXT.strandedStep({ item: 'storehouse', maker: 7, perMonth: 40, len: 60 }, '(70 gold)', 'pottery'),
      ...['out', 'return', 'other', 'full', 'refused', 'unstaffed', 'no_room', 'no_source', 'ready'].map((state) => W.status({ good: 'pottery', state, amount: 20, days: 3, held: 10, fetch: 100, staff: 2, workers: 6, source: { type: 'storehouse', len: 30, dir: 'north' } })),
      ...['not_storage', 'cannot_store', 'refuses', 'bad_amount', 'no_source', 'no_order', 'same_store', 'not_holder', 'unlinked'].map((reason) => W.refusal({ reason, good: 'pottery', max: 800, type: 'farm_grain' })),
      W.consequence({ good: 'pottery', fetch: 100, perTrip: 20, held: 0, state: null, source: { len: 30, roundTrip: 8 }, staffed: true }), W.help, W.tip, W.tipHelp, W.tipFor({ good: 'pottery' }),
    ];
    walk(called, 'called');
    expect(found).toEqual([]);
    expect(TEXT.S47_PRESSURE_TEXT.goodFar(cause, w).fix).toBe('No store near the bazaar can keep it stocked yet; Show me the one that holds it');
    expect(TEXT.OPEN_TEXT.stepStore(open, '(70 gold)', 110, 'storehouse')).toBe('a storehouse in the open (70 gold), then a weaver beside it (110 gold), with the storehouse set to keep flax stocked: no room beside the storehouse that holds it');
  });
});

describe('v83 k ui: finding it', () => {
  it('the tip fires the first time the city has two stores', async () => {
    expect(TIPS.some((t) => t.id === 'keep_stocked' && t.trigger === 'twoStores')).toBe(true);
    expect(TIP_TEXT.keep_stocked.split(/\s+/).length).toBeLessThan(21);
    expect(TIP_HELP_TEXT.keep_stocked.split(/\s+/).length).toBeLessThan(21);
    const w = makeTestWorld({ size: 40 });
    setRoad(w, 0, 10, 39, 10);
    addRaw(w, 'storehouse', 4, 11, { staff: 6 });
    let t = 0;
    const r = await rigUI({ world: w, width: 1280, height: 800, now: () => t });
    try {
      r.ui.settings.set({ seenTips: TIPS.map((x) => x.id).filter((id) => id !== 'keep_stocked') });   // only this tip can show
      t = TIP_FIRST_DELAY_MS;
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      expect(r.ui.tips.current()).toBe(null);                                             // one store
      addRaw(w, 'granary', 10, 11, { staff: 6 });
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      expect(r.ui.tips.current()).toBe('keep_stocked');
    } finally { r.cleanup(); }
  });
});

// The bazaar's granary runs low (8.2.1's town: a bazaar, its granary of 400 grain, 14 manors that eat 350 a month), and a granary beyond the bazaar's reach holds
// grain to spare.
const SPOTS = [[2, 8], [4, 8], [6, 8], [8, 8], [10, 8], [12, 8], [14, 8], [16, 8], [18, 8], [13, 11], [15, 11], [7, 11], [17, 11], [5, 11]];
function town(spare) {
  const w = makeTestWorld({ size: 64 });
  setRoad(w, 0, 10, 63, 10);
  const bazaar = addRaw(w, 'bazaar', 9, 11);
  const store = addRaw(w, 'granary', 11, 11);
  store.store.grain = 400;
  const farGranary = addRaw(w, 'granary', 50, 11);
  farGranary.store.grain = spare;
  SPOTS.forEach(([x, y]) => addRaw(w, 'house', x, y, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 }));
  staffAll(w);
  restockBazaars(w); monthlyHousing(w);
  return { w, bazaar, store, farGranary };
}

describe('v83 k ui: the two Advice fixes', () => {
  it('a bazaar\'s low granary that a far store can keep stocked: the alert names it, Show me opens the granary at that food, and City advice says so', async () => {
    const { w, bazaar, store, farGranary } = town(500);
    const a = bazaarFoodProblem(w, bazaar);
    const len = a.spare.len;
    expect(a).toEqual({ code: 'bazaar_empty', id: bazaar.id, reason: 'granary_low', store: store.id, maker: 'none', spare: { id: farGranary.id, good: 'grain', len, spare: 500 } });
    expect(alertText(a, w).fix).toBe(`The granary ${len} road tiles away can spare 500 grain: keep the granary stocked with grain from the nearest store that can spare it`);
    expect(bazaarFix(w, a)).toEqual({ view: store.id, keep: { good: 'grain', from: farGranary.id } });
    const item = cityAdvice(w).find((x) => x.kind === 'keep_stocked');
    expect([item.fix.select, item.fix.keep]).toEqual([store.id, { good: 'grain', from: farGranary.id }]);
    const words = adviceWords(item, w);
    expect([words.what, words.why, words.fix, words.action.label]).toEqual(['The granary by the bazaar runs low on food', `The granary ${len} road tiles away can spare 500 grain`, 'Keep the granary stocked with grain from the nearest store that can spare it', 'Show me']);
    // the words say what the sim does: set as the player would (Nearest), the cart draws on the nearest store that can spare grain, which is this one
    expect(findSource(w, store, 'grain').b.id).toBe(farGranary.id);
    // what the fix says works: the granary can be set to keep grain stocked from that store
    expect(setFetch(w, store.id, 'grain', 100).ok).toBe(true);
    expect(setSource(w, store.id, 'grain', farGranary.id).ok).toBe(true);
    // and once it does, there is nothing to suggest
    expect(bazaarFoodProblem(w, bazaar).spare).toBe(undefined);
    // the other way: nothing to spare far away: 8.2.1's words, and no Advice item
    const other = town(0);
    const b = bazaarFoodProblem(other.w, other.bazaar);
    expect(b.spare).toBe(undefined);
    expect(alertText(b, other.w).fix).toBe('Nothing fills it: build a farm within 12 road tiles of it');
    expect(cityAdvice(other.w).some((x) => x.kind === 'keep_stocked')).toBe(false);
    // Show me from the alert list opens the granary with its grain row focused
    w.buildings[store.id].orders = {};
    const r = await rigUI({ world: w });
    try {
      r.ui.alerts.refresh();
      r.store.set({ sheet: { kind: 'minimap', id: null } });
      const show = [...r.root.querySelectorAll('#sheet .alert-list li')].find((li) => li.textContent.includes('can spare')).querySelector('.show-me');
      click(show);
      await Promise.resolve();
      expect(r.store.get().selectedId).toBe(store.id);
      expect(document.activeElement.closest('.fetch-good').dataset.good).toBe('grain');
    } finally { r.cleanup(); }
  });

  it('a site stalled for stone: a storehouse within its supply reach to keep stocked, or one to build, or nothing', () => {
    const w = makeTestWorld({ size: 64 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 63, 10);
    const site = addRaw(w, 'obelisk_small', 6, 11, { site: { ...newSite(), idle: MONUMENT.stallDays, reason: 'no_stone' } });
    const holder = addRaw(w, 'storehouse', 50, 11, { staff: 6, store: { stone: 90 } });
    staffAll(w);
    const alerts = alertsFor(w).filter((x) => x.code === 'site_stalled');
    expect(alerts).toEqual([{ code: 'site_stalled', id: site.id, reason: 'no_stone' }]);
    // no storehouse in reach: build one, at a spot the placing rule takes within the reach
    let f = siteKeepFix(w, site, 'stone');
    expect([f.from, f.spare, Boolean(f.build)]).toEqual([holder.id, 90, true]);
    let out = [];
    keepStockedAdvice(w, alerts, out);
    expect([out[0].kind, out[0].fix.item, out[0].fix.target]).toEqual(['keep_stocked', 'storehouse', f.build]);
    expect(adviceWords(out[0], w).fix).toBe('Build a storehouse near the site, then keep it stocked with stone');
    // a storehouse in reach: keep it stocked from the holder
    const by = addRaw(w, 'storehouse', 10, 11, { staff: 6, store: {} });
    f = siteKeepFix(w, site, 'stone');
    expect(f).toEqual({ store: by.id, from: holder.id, len: f.len, spare: 90 });
    out = [];
    keepStockedAdvice(w, alerts, out);
    expect([out[0].fix.select, out[0].fix.keep]).toEqual([by.id, { good: 'stone', from: holder.id }]);
    expect(adviceWords(out[0], w).fix).toBe('Keep the storehouse by the site stocked with stone from the nearest store that can spare it');
    expect(adviceWords(out[0], w).action.label).toBe('Show me');
    // the storehouse in reach refuses stone (Takes in off): setFetch would refuse it, so the fix never names it, and no storehouse is to be built either
    expect(setAccept(w, by.id, 'stone', false).ok).toBe(true);
    expect(setFetch(w, by.id, 'stone', 100).reason).toBe('refuses');
    expect(siteKeepFix(w, site, 'stone')).toBe(null);
    out = [];
    keepStockedAdvice(w, alerts, out);
    expect(out).toEqual([]);
    expect(setAccept(w, by.id, 'stone', true).ok).toBe(true);
    expect(setFetch(w, by.id, 'stone', 100).ok).toBe(true);                                // the sim takes what Advice says
    // with the order set, or nothing to spare: no item
    expect(siteKeepFix(w, site, 'stone')).toBe(null);
    delete by.orders.stone;
    holder.store.stone = 0;
    expect(siteKeepFix(w, site, 'stone')).toBe(null);
  });
});
