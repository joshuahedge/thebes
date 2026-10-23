// Version 5.0 Task 2: every reason nextStep gives besides a fix (waiting, locked, ready, kept, empty), each set up both ways, then the line on the house sheet:
// first in the sheet, its Show me aiming where the checklist row's does, View, no button when there is nothing to do, a price the treasury cannot pay said in
// words, and Show me refused with why when no tile takes the building. The causes' fixes are in step.test.js.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { nextStep, daysToDelivery } from '../../../src/sim/advice.js';
import { houseStatus } from '../../../src/sim/housing.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { roadCostOf } from '../../../src/sim/costs.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { TIERS, MAX_TIER } from '../../../src/data/housing.js';
import { HOUSEHOLD_GOODS, GOODS } from '../../../src/data/goods.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { stepWords, STEP_LABELS, STEP_TEXT } from '../../../src/ui/nextStepText.js';
import { createSheets } from '../../../src/ui/sheets.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select } from '../../../src/ui/modes.js';
import { createCamera } from '../../../src/render/camera.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { T, TIP_TEXT, NEED_NAMES, buildingName, viewLabel, S47_PRESSURE_TEXT } from '../../../src/ui/text.js';
import { ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';

const gold = (n) => `${n} gold`;
const lineOf = (w, home) => { const step = nextStep(w, home); return { step, words: stepWords(w, home, step) }; };

function street({ tier = 2, milestone = 'capital', homeAt = [12, 9], stock, large = false } = {}) {
  const w = makeTestWorld({ clay: [[24, 20, 4, 4]] });
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', homeAt[0], homeAt[1], { tier, residents: tier ? TIERS[tier].capacity : 0, stockedFor: tier ? TIERS[tier].capacity : 0, stock: stock || {}, ...(large ? { w: 2, d: 2, large: true } : {}) });
  return { w, home };
}
function pottery({ milestone = 'town' } = {}) {
  const { w, home } = street({ tier: 4, milestone, homeAt: [12, 11], stock: { grain: 30 } });
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  addRaw(w, 'bazaar', 9, 8);
  staffAll(w);
  return { w, home };
}

describe('v50 step: every reason nextStep gives besides a fix', () => {
  it('waiting: the good on its way and the days to the next delivery, from the sim; the home\'s own stock ends the wait', () => {
    const { w, home } = street();
    addRaw(w, 'well', 14, 11);
    const bazaar = addRaw(w, 'bazaar', 9, 11);
    bazaar.store.grain = 40;
    staffAll(w);
    let l = lineOf(w, home);
    expect([l.step.reason, l.step.cause.code, l.step.days]).toEqual(['waiting', 'next_delivery', daysToDelivery(w)]);
    expect([l.words.text, l.words.action, l.words.label]).toEqual([`Waiting: food on its way (${daysToDelivery(w)} days)`, null, STEP_LABELS.waiting]);
    advanceDays(w, 29);
    expect(daysToDelivery(w)).toBe(1);
    expect(lineOf(w, home).words.text).toBe('Waiting: food on its way (1 day)');
    home.stock.grain = 2;                                                  // a month of food for 8 people: nothing left to wait for
    l = lineOf(w, home);
    expect([l.step.reason, l.words.text]).toEqual(['ready', `Ready: this home grows to a ${TIERS[3].name} at the month's end (1 day)`]);
  });

  it('waiting on a household good names the good; the second kind of food and a check with no cause have their own words', () => {
    const { w, home } = pottery();
    addRaw(w, 'storehouse', 4, 8, { store: { pottery: 40 } });
    staffAll(w);
    const l = lineOf(w, home);
    expect([l.step.reason, l.step.need, l.words.text]).toEqual(['waiting', 'pottery', `Waiting: pottery on its way (${daysToDelivery(w)} days)`]);
    const second = stepWords(w, home, { ...l.step, need: 'twoFoods', days: 4 });
    expect(second.text).toBe('Waiting: the second kind of food on its way (4 days)');
    const none = stepWords(w, home, { ...l.step, cause: null, days: 5 });
    expect(none.text).toBe("Waiting: the month's check decides (5 days)");
  });

  it('locked: names the building and the milestone that brings it, no button; unlocked, it becomes the fix', () => {
    const { w, home } = pottery({ milestone: 'village' });
    let l = lineOf(w, home);
    const milestone = MILESTONES.find((m) => m.id === 'town').name;
    expect([l.step.reason, l.step.locked]).toEqual(['locked', { item: 'clay_pit', milestone: 'town' }]);
    expect([l.words.text, l.words.action, l.words.label]).toEqual([`Locked: the ${buildingName('clay_pit').toLowerCase()} comes with ${milestone}; this home's pottery waits for it`, null, STEP_LABELS.locked]);
    w.milestone = 'town';
    l = lineOf(w, home);
    expect([l.step.reason, l.words.label, l.words.action.label]).toEqual([null, STEP_LABELS.next, T.showMe]);
  });

  it('ready: grows at the month\'s end, with the days and the tier it grows to; lose a need and it is a next step again', () => {
    const { w, home } = street();
    const well = addRaw(w, 'well', 14, 11);
    addRaw(w, 'bazaar', 9, 11).store.grain = 40;
    home.stock = { grain: 2 };
    staffAll(w);
    let l = lineOf(w, home);
    expect([l.step.reason, l.words.text, l.words.action]).toEqual(['ready', `Ready: this home grows to a ${TIERS[3].name} at the month's end (${daysToDelivery(w)} days)`, null]);
    expect(houseStatus(w, home).checklist.every((c) => c.met)).toBe(true);
    well.paused = true;
    l = lineOf(w, home);
    expect([l.step.reason, l.words.label]).toEqual([null, STEP_LABELS.next]);
  });

  it('kept: the top tier with everything it needs says there is nothing more to do; short of one thing, it is a step again', () => {
    const w = makeTestWorld({ gold: 100000 });
    w.milestone = 'capital';
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 14, 9); addRaw(w, 'temple', 20, 8); addRaw(w, 'booth', 16, 9);
    const bz = addRaw(w, 'bazaar', 9, 8);
    bz.store = Object.fromEntries([['grain', 300], ['figs', 300], ['fish', 300], ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
    const top = addRaw(w, 'house', 12, 11, { tier: MAX_TIER, w: 2, d: 2, residents: 180, stockedFor: 180 });
    top.stock = Object.fromEntries([...HOUSEHOLD_GOODS.map((g) => [g, Math.ceil(180 * GOODS[g].perResidentPerMonth * 2)]), ['grain', 20], ['figs', 20], ['fish', 20]]);
    for (const [x, y] of [[11, 11], [11, 12], [11, 13], [12, 13], [13, 13], [14, 13], [14, 12], [14, 11], [10, 11], [10, 12], [10, 13], [11, 14], [12, 14], [13, 14], [14, 14], [15, 11], [15, 12], [15, 13]]) {
      if (houseDesirability(w, top) >= TIERS[MAX_TIER].desirability.rise) break;
      addRaw(w, 'statue', x, y);
    }
    staffAll(w);
    let l = lineOf(w, top);
    expect([l.step.reason, l.words.text, l.words.action, l.words.label]).toEqual(['kept', 'Kept: nothing more to do', null, STEP_LABELS.kept]);
    top.stock.jewellery = 0;
    l = lineOf(w, top);
    expect(l.words.text === 'Kept: nothing more to do').toBe(false);
    expect([l.step.reason === null || l.step.reason === 'waiting', l.step.need]).toEqual([true, 'jewellery']);
  });

  it('empty: a plot beside a road says people move in as the city draws them; with no road it is the road that is the step', () => {
    const { w, home } = street({ tier: 0 });
    const l = lineOf(w, home);
    expect([l.step.reason, l.words.text, l.words.action, l.words.label]).toEqual(['empty', `Empty: ${STEP_TEXT.empty}`, null, STEP_LABELS.empty]);
    const { w: w2, home: away } = street({ tier: 0, homeAt: [12, 5] });
    const m = lineOf(w2, away);
    expect([m.step.reason, m.words.text]).toEqual([null, `Next step: a road beside this home (${gold(roadCostOf(w2))} a tile) gives it road access`]);
  });
});

// The sheets on their own, with Show me and View recorded instead of acted on (as tests/ui/houseSheetWhy.test.js).
function rig(world) {
  const { root, cleanup } = mount();
  const store = createStore(INITIAL_UI_STATE);
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const shown = [], selected = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }),
    cameraControl: createCameraControl({ cam, view, reducedMotion: () => true }),
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world), onShowMe: (t) => shown.push(t), onSelect: (id) => selected.push(id),
  });
  return { root, world, store, sheets, shown, selected, open: (h) => store.set(select(store.get(), h.id)), cleanup };
}
const rowFor = (root, need) => [...root.querySelectorAll('.checklist li')].find((li) => li.querySelector('.name').textContent === NEED_NAMES[need]);
const hasPlotLine = (root) => [...root.querySelectorAll('.body > p.muted')].some((p) => p.textContent === T.emptyPlot);

describe('v50 step: the line on the house sheet', () => {
  it('the house sheet tip points at it', () => {
    expect(TIP_TEXT.house_needs).toContain('Next step');
  });

  it('is the first thing in the sheet, says what the words say, and leaves the checklist below it', () => {
    const { w, home } = street();
    const r = rig(w);
    try {
      r.open(home);
      const body = r.root.querySelector('.body');
      const line = body.firstElementChild;
      expect(line.classList.contains('step-line')).toBe(true);
      expect([line.dataset.reason, line.textContent.replace(/Show me$/, '')]).toEqual(['next', lineOf(w, home).words.text]);
      expect(line.querySelector('.step-label').textContent).toBe(STEP_LABELS.next);
      expect(body.children[1].classList.contains('residents')).toBe(true);
      const rows = [...r.root.querySelectorAll('.checklist li')].map((li) => li.querySelector('.name').textContent);
      expect(rows).toEqual([NEED_NAMES.road, NEED_NAMES.water, NEED_NAMES.food]);        // the full checklist stays
      expect(rowFor(r.root, 'water').querySelector('.show-me')).toBeTruthy();
    } finally { r.cleanup(); }
  });

  it('Show me aims exactly where the checklist row\'s Show me aims, and is named for a screen reader; View selects the building', () => {
    const { w, home } = street();
    const r = rig(w);
    try {
      r.open(home);
      const btn = r.root.querySelector('.step-line button');
      expect([btn.textContent, btn.getAttribute('aria-label')]).toEqual([T.showMe, `${T.showMe}: ${lineOf(w, home).words.rest}`]);
      fire(btn, 'click');
      fire(rowFor(r.root, 'water').querySelector('.show-me'), 'click');
      expect(r.shown.length).toBe(2);
      expect(r.shown[0]).toEqual(r.shown[1]);
      expect(r.shown[0]).toEqual({ category: 'services', item: 'well', x: 12.5, y: 9.5 });
      const well = addRaw(w, 'well', 14, 11, { paused: true });             // a well in reach that is paused: viewed, not rebuilt
      r.sheets.render();
      const view = r.root.querySelector('.step-line button');
      expect([view.textContent, view.getAttribute('aria-label')]).toEqual([T.view, viewLabel(buildingName('well'))]);
      fire(view, 'click');
      expect(r.selected).toEqual([well.id]);
      expect(r.root.querySelector('.step-line').dataset.reason).toBe('next');
    } finally { r.cleanup(); }
  });

  it('a good held in a far store: Show me opens the store near the bazaar that should set the Fetch order, in the line and in the checklist row; with none near, the far store, and the words say so', () => {
    for (const near of [true, false]) {
      const { w, home } = pottery();
      const nearStore = near ? addRaw(w, 'storehouse', 4, 8) : null;
      const far = addRaw(w, 'storehouse', 31, 8, { store: { pottery: 40 } });
      staffAll(w);
      setRoad(w, 30, 10, 31, 10);
      const step = nextStep(w, home);
      expect([step.cause.code, step.fix.select, step.fix.fetch]).toEqual(['good_far', near ? nearStore.id : far.id, near ? true : undefined]);
      const r = rig(w);
      try {
        r.open(home);
        const line = r.root.querySelector('.step-line');
        const btn = line.querySelector('button');
        expect([btn.textContent, btn.getAttribute('aria-label')]).toEqual([T.showMe, S47_PRESSURE_TEXT.showFar(step.cause, w)]);
        expect(btn.getAttribute('aria-label')).toBe(near ? 'Show me the storehouse near the bazaar that can Fetch pottery' : 'Show me the storehouse that holds pottery');
        expect(line.textContent).toContain(near ? 'have the storehouse near the bazaar fetch pottery by cart' : `pottery is held only in a storehouse ${step.cause.len} road tiles from the bazaar, and no store near the bazaar can fetch it yet`);
        fire(btn, 'click');
        const row = rowFor(r.root, 'pottery');
        expect(row.querySelector('.fix').textContent).toContain(near ? 'The storehouse near the bazaar can Fetch it by cart' : 'No store near the bazaar can Fetch it yet; Show me the one that holds it');
        fire(row.querySelector('.show-me'), 'click');                           // the checklist row opens the same store
        expect(r.selected).toEqual([near ? nearStore.id : far.id, near ? nearStore.id : far.id]);
      } finally { r.cleanup(); }
    }
  });

  it('waiting, locked and empty have the line and no button; an empty plot does not say it twice, a roadless one keeps its old line', () => {
    const wait = street();
    addRaw(wait.w, 'well', 14, 11);
    addRaw(wait.w, 'bazaar', 9, 11).store.grain = 40;
    staffAll(wait.w);
    const locked = pottery({ milestone: 'village' });
    const plot = street({ tier: 0 });
    for (const [c, reason] of [[wait, 'waiting'], [locked, 'locked'], [plot, 'empty']]) {
      const r = rig(c.w);
      try {
        r.open(c.home);
        const line = r.root.querySelector('.step-line');
        expect([line.dataset.reason, line.textContent, line.querySelector('button')]).toEqual([reason, lineOf(c.w, c.home).words.text, null]);
        expect(hasPlotLine(r.root)).toBe(false);
      } finally { r.cleanup(); }
    }
    const away = street({ tier: 0, homeAt: [12, 5] });
    const r = rig(away.w);
    try {
      r.open(away.home);
      expect(r.root.querySelector('.step-line').dataset.reason).toBe('next');
      expect(hasPlotLine(r.root)).toBe(true);
    } finally { r.cleanup(); }
  });

  it('a checklist row whose fix is locked (a booth before Town) says the step line\'s Locked words and has no Show me; at Town it offers one', () => {
    const townhouse = (milestone) => {   // Version 6.0: an empty Large plot, whose Manor rows are what a Townhouse's next tier's were
      const { w, home } = street({ tier: 0, milestone, homeAt: [12, 11], large: true });
      addRaw(w, 'well', 14, 11);
      addRaw(w, 'temple', 20, 11);
      const bazaar = addRaw(w, 'bazaar', 9, 11);
      bazaar.store = Object.fromEntries([['grain', 300], ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
      staffAll(w);
      return { w, home };
    };
    const closed = townhouse('village');
    const r = rig(closed.w);
    try {
      r.open(closed.home);
      const row = rowFor(r.root, 'entertainment');
      const town = MILESTONES.find((m) => m.id === 'town').name;
      expect(row.querySelector('.fix .small').textContent).toBe(`The ${buildingName('booth').toLowerCase()} comes with ${town}; this home's entertainment waits for it`);   // the step line's Locked words, as it would say them
      expect([row.querySelector('.show-me'), row.querySelector('.view')]).toEqual([null, null]);
      expect(r.shown).toEqual([]);
    } finally { r.cleanup(); }
    const open = townhouse('town');
    const r2 = rig(open.w);
    try {
      r2.open(open.home);
      expect(rowFor(r2.root, 'entertainment').querySelector('.show-me') !== null).toBe(true);
    } finally { r2.cleanup(); }
  });

  it('ready and kept: the line and no button, the keep list still below for the top tier', () => {
    const { w, home } = street();
    addRaw(w, 'well', 14, 11);
    addRaw(w, 'bazaar', 9, 11).store.grain = 40;
    home.stock = { grain: 2 };
    staffAll(w);
    const r = rig(w);
    try {
      r.open(home);
      const line = r.root.querySelector('.step-line');
      expect([line.dataset.reason, line.querySelector('button')]).toEqual(['ready', null]);
      expect(r.root.querySelectorAll('.checklist li').length).toBe(3);
    } finally { r.cleanup(); }
  });

  it('a price the treasury cannot pay is said in words and marked on the line', () => {
    const { w, home } = street();
    w.gold = -480;
    const r = rig(w);
    try {
      r.open(home);
      const line = r.root.querySelector('.step-line');
      expect(line.classList.contains('short')).toBe(true);
      expect(line.textContent).toContain('more than the -480 you have');
    } finally { r.cleanup(); }
  });
});

describe('v50 step: Show me with no tile that takes the building', () => {
  const farmStreet = (fertile) => {
    const w = makeTestWorld({ fertile: fertile || [] });
    w.milestone = 'capital';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 2, residents: 8, stock: {} });
    addRaw(w, 'well', 14, 11);
    addRaw(w, 'bazaar', 9, 11);
    addRaw(w, 'granary', 4, 11);
    staffAll(w);
    return { w, home };
  };

  it('the line and the checklist row say why in a toast, start no tool and leave the sheet; with room the tool starts', async () => {
    for (const fertile of [null, [[0, 0, 8, 32]]]) {
      const { w, home } = farmStreet(fertile);
      expect(nextStep(w, home).fix.item).toBe('farm_grain');
      expect(showMeRefusal(w, 'farm_grain', nextStep(w, home).fix.target)).toBe(fertile ? null : 'no fertile land with room for it');
      const r = await rigUI({ world: w });
      try {
        for (const pick of ['.step-line button', '.checklist li[data-need="food"] .show-me']) {
          r.store.set(select(r.store.get(), home.id));
          fire(r.root.querySelector(`#sheet ${pick}`), 'click');
          const s = r.store.get();
          if (fertile) {
            expect([s.tool, s.sheet]).toEqual([{ kind: 'building', type: 'farm_grain' }, null]);
          } else {
            expect([s.tool, s.sheet && s.sheet.kind]).toEqual([null, 'info']);
            expect(r.root.querySelector('#toasts .toast').textContent).toContain(ADVICE_TEXT.noRoom('farm_grain', 'no fertile land with room for it'));
          }
        }
      } finally { r.cleanup(); }
    }
  });
});
