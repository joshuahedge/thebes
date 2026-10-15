// Version 5.0 Task 1 (City advice): the sheet's words, each set up both ways (the problem there and its sentence with the sim's own numbers, the problem
// gone and the sentence with it); the button's unlock, dot and seen marker; Show me for every fix shape, refused with its reason when no tile takes it;
// the summary's link; one panel at a time. The advice itself is src/sim/advice.js (tested in v50 contract advice).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { adviceWords, ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { adviceUnlocked, adviceTopKeys, adviceHasNew, nextMilestone } from '../../../src/ui/adviceSheet.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';
import { causeText, plural, T, TIP_TEXT, TIP_HELP_TEXT, buildingName } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { ADVICE } from '../../../src/data/advice.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TIERS } from '../../../src/data/housing.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { categoryOfItem } from '../../../src/data/ui.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { monthForecast } from '../../../src/sim/economy.js';
import { towersNeeded } from '../../../src/sim/raids.js';
import { fallIll } from '../../../src/sim/health.js';
import { removeBuilding, population } from '../../../src/sim/world.js';
import { createSettings, DEFAULT_SETTINGS } from '../../../src/ui/settings.js';
import { openSheet } from '../../../src/ui/modes.js';

const ofKind = (w, kind) => cityAdvice(w).filter((a) => a.kind === kind);
const words = (w, kind, which = (a) => true) => { const a = ofKind(w, kind).find(which); return { a, t: adviceWords(a, w) }; };

// A road along y = 10 with a working well, temple and bazaar in reach of a House (tier 4) at (12, 11) that has its food (as the contract tests).
function street({ size = 64, tier = 4, milestone = 'village', fertile } = {}) {
  const w = makeTestWorld(fertile ? { size, fertile } : { size });
  w.milestone = milestone;
  setRoad(w, 0, 10, size - 1, 10);
  const well = addRaw(w, 'well', 14, 9);
  const temple = addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  const home = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, stockedFor: TIERS[tier].capacity, stock: { grain: 30 } });
  staffAll(w);
  return { w, well, temple, bazaar, home };
}

describe('v50 advice words: homes held back', () => {
  it('a missing well says how many homes, why, what to build, its price and that you can pay it; gone once a well serves them', () => {
    const { w, well, home } = street({ tier: 2 });
    removeBuilding(w, well.id);
    const hut = addRaw(w, 'house', 13, 11, { tier: 2, residents: 6, stockedFor: 6, stock: { grain: 30 } });
    let { a, t } = words(w, 'home_need');
    expect([a.count, a.data.homes]).toEqual([2, [home.id, hut.id]]);
    expect(t.what).toBe('2 homes are held back by water');
    expect(t.why).toBe(causeText(a.data.cause, w, 'water').cause);
    expect(t.why).toBe('No well within 8 road tiles'.replace('8', String(BUILDINGS.well.reach)));
    expect(t.fix).toBe('Build a well near them');                       // several homes: "them"
    expect([t.cost, t.short, t.action]).toEqual([`Well: ${costOf(w, 'well')} gold`, false, { label: 'Show me', aria: `Show me: ${t.what}` }]);
    removeBuilding(w, hut.id);
    ({ a, t } = words(w, 'home_need'));
    expect([t.what, t.fix]).toEqual(['1 home is held back by water', 'Build a well near it']);
    w.gold = -480;                                                         // the placing rule's debt floor: the price is more than it will take
    ({ a, t } = words(w, 'home_need'));
    expect([a.afford, t.short, t.cost]).toEqual([false, true, `Well: ${costOf(w, 'well')} gold. Not enough gold: you have -480`]);
    w.gold = 100000;
    addRaw(w, 'well', 15, 9, { staff: BUILDINGS.well.workers });
    expect(ofKind(w, 'home_need')).toEqual([]);
  });

  it('a provider in reach that is paused is viewed, not rebuilt: View, no price', () => {
    const { w, well } = street({ tier: 3 });
    well.paused = true;
    const { a, t } = words(w, 'home_need');
    expect(a.fix.select).toBe(well.id);
    expect([t.what, t.why, t.fix, t.cost]).toEqual(['1 home is held back by water', 'The well is paused', 'Resume it', '']);
    expect(t.action).toEqual({ label: 'View', aria: `View: ${t.what}` });
  });

  it('a good whose makers are locked says which milestone brings them and offers no button; at Town the store has its price', () => {
    const { w, home } = street();
    let { a, t } = words(w, 'home_need');
    expect(a.data.locked).toEqual({ item: 'clay_pit', milestone: 'town' });
    expect([t.what, t.fix, t.cost, t.action]).toEqual(['1 home is held back by pottery', `${buildingName('clay_pit')} comes with ${MILESTONES.find((m) => m.id === 'town').name}`, '', null]);
    w.milestone = 'town';
    ({ a, t } = words(w, 'home_need'));
    expect([a.fix.item, t.cost, t.action.label]).toEqual(['storehouse', `Storehouse: ${costOf(w, 'storehouse')} gold`, 'Show me']);
    expect(home.tier).toBe(4);
  });

  it('a good held only in a far store: the cause names the store and the distance, the button is Show me for that store', () => {
    const { w } = street({ milestone: 'town' });
    addRaw(w, 'storehouse', 4, 8);
    const far = addRaw(w, 'storehouse', 50, 8, { store: { pottery: 40 } });
    staffAll(w);
    const { a, t } = words(w, 'stranded');
    expect(t.what).toBe('1 home is held back by pottery kept too far away');
    expect(t.why).toBe(`Pottery is held only in a storehouse ${a.data.len} road tiles from the bazaar`);
    expect(t.action).toEqual({ label: 'Show me', aria: 'Show me the storehouse that holds pottery' });
    expect(a.fix.select).toBe(far.id);
  });
});

describe('v50 advice words: the city', () => {
  it('a good running out: months, what is held and the shortfall; "another" when the city already has a maker, "a" when it has none', () => {
    const { w, home } = street({ tier: 5, milestone: 'town' });
    addRaw(w, 'storehouse', 4, 8, { store: { pottery: 40 } });
    staffAll(w);
    w.stats.lastMonth = { used: { pottery: 30 }, made: {} };
    let { a, t } = words(w, 'running_out', (x) => x.data.need === 'pottery');
    expect([a.data.monthsLeft, a.data.held, a.count]).toEqual([1.3, 40, 1]);
    expect(t.what).toBe('Pottery runs out in about 1.3 months');
    expect(t.why).toBe('The city holds 40 pottery; 30 more were used than made last month, and 1 home needs it');
    expect(t.fix).toBe('Build a clay pit to make more');                  // nothing makes it yet
    expect([t.cost, t.action.label]).toEqual([`Clay pit: ${costOf(w, 'clay_pit')} gold`, 'Show me']);
    addRaw(w, 'clay_pit', 2, 20, { staff: 4 });
    addRaw(w, 'potter', 4, 20);
    staffAll(w);
    ({ a, t } = words(w, 'running_out', (x) => x.data.need === 'pottery'));
    expect([a.fix.item, t.fix]).toEqual(['potter', 'Build another potter to make more']);   // both makers stand: the last of them again
    w.stats.lastMonth = { used: { pottery: 30 }, made: { pottery: 30 } };
    expect(ofKind(w, 'running_out')).toEqual([]);
    expect(home.tier).toBe(5);
  });

  it('food running out names the grain farm: "a grain farm" with none, "another" with one', () => {
    const { w } = street({ tier: 4 });
    addRaw(w, 'granary', 4, 8, { store: { grain: 40 } });
    staffAll(w);
    w.stats.lastMonth = { used: { grain: 30 }, made: {} };
    let { a, t } = words(w, 'running_out', (x) => x.data.need === 'food');
    expect(a.data.monthsLeft).toBeGreaterThan(0);
    expect(t.what).toBe(`Food runs out in about ${a.data.monthsLeft} months`.replace('1 months', '1 month'));
    expect(t.fix).toBe('Build a grain farm to make more');
    addRaw(w, 'farm_grain', 2, 20);
    ({ a, t } = words(w, 'running_out', (x) => x.data.need === 'food'));
    expect(t.fix).toBe('Build another grain farm to make more');
    expect(t.cost).toBe(`Grain farm: ${costOf(w, 'farm_grain')} gold`);
  });

  it('workers short and jobless say the labour record\'s numbers; View opens the summary at employment', () => {
    const { w } = street({ milestone: 'town' });
    w.labour = { workforce: 10, employed: 10, jobs: 30, shortLevels: ['services'] };
    let { a, t } = words(w, 'workers_short');
    expect([t.what, t.why]).toEqual(['20 jobs have no worker', '30 jobs for 10 workers']);
    expect([a.fix, t.cost, t.action]).toEqual([{ view: 'summary', section: 'employment', target: null }, '', { label: 'View', aria: `View: ${ADVICE_TEXT.seeEmployment}` }]);
    w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };
    ({ a, t } = words(w, 'jobless'));
    expect([t.what, t.why]).toEqual(['50 of 100 workers have no work', '50 jobs for 100 workers']);
    w.labour = { workforce: 100, employed: 90, jobs: 90, shortLevels: [] };
    expect([ofKind(w, 'workers_short'), ofKind(w, 'jobless')]).toEqual([[], []]);
  });

  it('the treasury: the months it lasts, the gold and the month\'s balance; View opens the forecast; gone with gold in hand', () => {
    const { w } = street();
    w.gold = 30;
    const f = monthForecast(w);
    const { a, t } = words(w, 'treasury');
    expect(t.what.startsWith('At this rate the treasury runs out in about ')).toBe(true);
    expect(t.what).toContain(`${Math.max(1, Math.ceil(f.monthsLeft))} month`);
    expect(t.why.startsWith(`30 gold, −${Math.abs(f.net)} a month`)).toBe(true);
    expect([a.fix.section, t.action.aria]).toEqual(['forecast', `View: ${ADVICE_TEXT.seeForecast}`]);
    w.gold = -50;
    expect(words(w, 'treasury').t.what).toBe('The treasury is below 0');
    w.gold = 100000;
    expect(ofKind(w, 'treasury')).toEqual([]);
  });

  it('fire, illness and crime: the count, the cause and what to do; a firehouse by it with its price, or View for one in reach', () => {
    const { w, home } = street({ milestone: 'market_town' });
    home.risk = 100000;
    let { a, t } = words(w, 'fire');
    expect([t.what, t.why, t.cost]).toEqual(['1 building is at fire risk', `No firehouse within ${BUILDINGS.firehouse.reach} road tiles: build one near it`, `Firehouse: ${costOf(w, 'firehouse')} gold`]);
    expect(t.action.label).toBe('Show me');
    const fh = addRaw(w, 'firehouse', 16, 9, { paused: true });
    ({ a, t } = words(w, 'fire'));
    expect([t.why, t.cost, t.action.label, a.fix.select]).toEqual(['Its firehouse is paused: resume it', '', 'View', fh.id]);
    home.risk = 0;
    expect(ofKind(w, 'fire')).toEqual([]);
    expect(fallIll(w, home.id)).toBe(true);
    ({ a, t } = words(w, 'illness'));
    expect([t.what, t.why, t.cost]).toEqual([`Sickness in a ${TIERS[home.tier].name}`, 'Build a physician nearby', `Physician: ${costOf(w, 'physician')} gold`]);
    w.milestone = 'village';
    expect([words(w, 'illness').t.action, words(w, 'illness').t.cost]).toEqual([null, '']);   // the physician comes with Town: not unlocked, so no button and no price
    w.milestone = 'market_town';
    home.illness = null;
    home.crime = 100000;
    ({ a, t } = words(w, 'crime'));
    expect([t.what, t.why, t.cost]).toEqual(['1 home has a high crime risk', 'Build a police post nearby', `Police post: ${costOf(w, 'police_post')} gold`]);
    home.crime = 0;
    expect(ofKind(w, 'crime')).toEqual([]);
  });

  it('burning buildings count as such, and the fix is for the burning one with the lowest id, not the first alert', () => {
    const { w } = street({ milestone: 'village' });
    const b = addRaw(w, 'house', 14, 11, { tier: 2, residents: 6 });
    const c = addRaw(w, 'house', 16, 11, { tier: 2, residents: 6 });
    for (const x of [c, b]) x.fire = { stage: 'fire', left: 5, days: 0, need: 3, fought: 0 };   // c is listed before b: the lowest id is b's
    const [a] = ofKind(w, 'fire');
    expect(a.id).toBe(Math.min(b.id, c.id));
    expect(adviceWords(a, w).what).toBe('2 buildings are burning');
  });

  it('towers: a warned raid says its size, the towers it needs and the working ones, and the fix the raid banner gives; unwarned, the next raid\'s', () => {
    const { w } = street({ milestone: 'market_town' });
    w.raid.clockDay = 0;
    const need = towersNeeded(3);
    let { a, t } = words(w, 'raid_towers');
    expect(t.what).toBe(`The next raid will be about 3 raiders and needs ${plural(need, 'tower', 'towers')}; 0 are working`);
    expect([t.fix, t.cost]).toEqual([`Build ${plural(need, 'tower', 'towers')} (≈ ${need * costOf(w, 'tower')} gold)`, need > 1 ? `Tower: ${costOf(w, 'tower')} gold each` : `Tower: ${costOf(w, 'tower')} gold`]);
    w.raid.warning = { size: 9, tribute: null, first: true, entry: { x: 0, y: 10 }, dir: 'W', arrives: 100 };
    ({ a, t } = words(w, 'raid_towers'));
    expect(t.what).toBe(`A raid of 9 raiders needs ${plural(towersNeeded(9), 'tower', 'towers')}; 0 are working`);
    expect(t.fix.startsWith(`Build ${plural(towersNeeded(9), 'tower', 'towers')} facing `)).toBe(true);
    expect(towersNeeded(9)).toBeGreaterThan(1);
    expect(t.action.label).toBe('Show me');
  });

  it('every kind the advice makes has words', () => {
    const w = uiWorld();
    for (const a of cityAdvice(w)) {
      const t = adviceWords(a, w);
      expect([a.kind, t.what.length > 0]).toEqual([a.kind, true]);
    }
  });
});

describe('v50 advice the sheet', () => {
  const openAdvice = (r) => r.store.set(openSheet(r.store.get(), 'advice'));
  const itemsOf = (r) => [...r.root.querySelectorAll('#sheet .advice-item')];

  it('lists the top five of cityAdvice, worst first, each as the words say, with Show me or View named for a screen reader', async () => {
    const r = await rigUI({ world: street({ tier: 3 }).w });
    try {
      const w = r.world;
      removeBuilding(w, Object.values(w.buildings).find((b) => b.type === 'well').id);
      w.labour = { workforce: 10, employed: 10, jobs: 30, shortLevels: ['services'] };
      addRaw(w, 'house', 13, 11, { tier: 1, residents: 4 });
      addRaw(w, 'house', 40, 11, { tier: 1, residents: 4 });
      w.gold = 30;
      const list = cityAdvice(w);
      expect(list.length).toBeGreaterThan(2);
      openAdvice(r);
      const items = itemsOf(r);
      const top = list.slice(0, ADVICE.top);
      expect(items.map((li) => li.dataset.key)).toEqual(top.map((a) => a.key));
      top.forEach((a, i) => {
        const t = adviceWords(a, w);
        expect(items[i].querySelector('.what').textContent).toBe(t.what);
        expect(items[i].textContent).toContain(t.cost);
        const btn = items[i].querySelector('button');
        expect([a.key, btn ? btn.getAttribute('aria-label') : null]).toEqual([a.key, t.action ? t.action.aria : null]);
      });
      expect(r.root.querySelector('#sheet h2').textContent).toBe(T.advice);
      expect(r.root.querySelector('#sheet .advice-lead').textContent).toBe(T.adviceLead);
      const more = r.root.querySelector('#sheet .advice-more');
      expect(more ? more.textContent : null).toBe(list.length > ADVICE.top ? ADVICE_TEXT.more(list.length - ADVICE.top) : null);
    } finally { r.cleanup(); }
  });

  it('marks what an unaffordable fix costs in words, and only for fixes the placing rule would refuse', async () => {
    const { w, well } = street({ tier: 2 });
    removeBuilding(w, well.id);
    const r = await rigUI({ world: w });
    try {
      w.gold = -480;                                                       // 20 gold of room: a well costs more
      openAdvice(r);
      let li = itemsOf(r).find((x) => x.dataset.key.startsWith('home_need:water'));
      expect(li.querySelector('.cost').textContent).toBe(`Well: ${costOf(w, 'well')} gold. Not enough gold: you have -480`);
      expect(li.querySelector('.cost').classList.contains('short')).toBe(true);
      expect(li.querySelector('button')).toBeTruthy();                      // Show me still opens the card: the confirm bar says it again
      w.gold = 5000;
      r.ui.refresh();
      li = itemsOf(r).find((x) => x.dataset.key.startsWith('home_need:water'));
      expect([li.querySelector('.cost').textContent, li.querySelector('.cost').classList.contains('short')]).toEqual([`Well: ${costOf(w, 'well')} gold`, false]);
    } finally { r.cleanup(); }
  });

  it('says All is well with the next milestone when nothing holds the city back, and the problem comes back with its sentence when it does', async () => {
    const { w, well } = street({ tier: 3 });
    const r = await rigUI({ world: w });
    try {
      expect(cityAdvice(w)).toEqual([]);
      openAdvice(r);
      expect(r.root.querySelector('#sheet .advice-well').textContent).toBe(ADVICE_TEXT.allWell);
      const next = nextMilestone(w);
      expect(next.id).toBe('town');
      expect(r.root.querySelector('#sheet .advice-next').textContent).toBe(`Next: ${next.name}, at ${next.population} people (you have ${Math.max(w.tally.peakPeople, population(w))})`);
      expect(itemsOf(r)).toEqual([]);
      well.paused = true;
      r.ui.refresh();
      expect(itemsOf(r).length).toBe(1);
      expect(r.root.querySelector('#sheet .advice-well')).toBe(null);
      w.milestone = 'capital';
      well.paused = false;
      r.ui.refresh();
      expect(r.root.querySelector('#sheet .advice-next').textContent).toBe(ADVICE_TEXT.last(MILESTONES[MILESTONES.length - 1]));
      expect(nextMilestone(w)).toBe(null);
    } finally { r.cleanup(); }
  });
});

describe('v50 advice the button', () => {
  const click = (n) => fire(n, 'click');

  it('comes with the first home: hidden before, there once a plot is laid, and a tip says so once', async () => {
    const w = makeTestWorld({ gold: 500 });
    w.speed = 1;
    setRoad(w, 0, 10, 31, 10);
    expect(adviceUnlocked(w)).toBe(false);
    let t = 0;
    const r = await rigUI({ world: w, now: () => t });
    try {
      const btn = r.root.querySelector('#topbar .advice');
      expect([btn.hidden, btn.getAttribute('aria-label')]).toEqual([true, T.advice]);
      t = 20000;
      r.ui.settings.set({ seenTips: ['house_spots'] });                      // the spots tip comes first with the first plot; the advice tip is what is left
      const house = addRaw(w, 'house', 12, 9, { tier: 0, residents: 0 });
      r.ui.afterCommand({ kind: 'houses', undoable: true, text: 'Placed 1 plot', result: { ids: [house.id] } });
      expect(adviceUnlocked(w)).toBe(true);
      expect(btn.hidden).toBe(false);
      expect(r.ui.tips.current()).toBe('city_advice');
      expect(TIPS.find((x) => x.id === 'city_advice')).toEqual({ id: 'city_advice', trigger: 'cityAdvice', priority: false });
      expect(TIP_TEXT.city_advice).toContain('scroll button');
      expect(TIP_HELP_TEXT.city_advice).toContain('Show me');
      expect(r.root.querySelector('#tip .tip-show-me')).toBeTruthy();       // its Show me opens the sheet
      click(r.root.querySelector('#tip .tip-show-me'));
      expect(r.store.get().sheet.kind).toBe('advice');
      removeBuilding(w, house.id);                                           // the button stays once it has come
      r.ui.refresh();
      expect(btn.hidden).toBe(false);
    } finally { r.cleanup(); }
  });

  it('shows a dot while the top items hold one the sheet has not shown, clears it on opening, and lights it again for a new problem', async () => {
    const { w, home } = street({ tier: 3 });
    w.speed = 0;
    const r = await rigUI({ world: w });
    try {
      const btn = r.root.querySelector('#topbar .advice'), dot = () => !btn.querySelector('.advice-dot').hidden;
      r.ui.settings.set({ adviceSeen: [] });
      r.ui.refresh();
      expect(cityAdvice(w)).toEqual([]);
      expect([dot(), btn.getAttribute('aria-label')]).toEqual([false, T.advice]);      // nothing to see: no dot
      home.risk = 100000;                                                              // a problem appears (fire risk)
      r.ui.afterCommand({ kind: 'speed', undoable: false });                           // any command: the advice is read again
      expect(adviceTopKeys(w)).toEqual(['fire']);
      expect([dot(), btn.getAttribute('aria-label')]).toEqual([true, T.adviceNew]);    // the name says it too: the dot is never the only cue
      click(btn);
      expect(r.store.get().sheet.kind).toBe('advice');
      expect(r.ui.settings.get().adviceSeen).toEqual(['fire']);
      r.ui.refresh();
      expect(dot()).toBe(false);
      click(btn);                                                                      // a tap on the open sheet's button closes it
      expect(r.store.get().sheet).toBe(null);
      home.risk = 0;
      home.crime = 0;
      w.milestone = 'town';                                                            // the sim counts unemployment from Town
      w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };          // another problem, jobless, with fire gone
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      expect(adviceTopKeys(w)).toEqual(['jobless']);
      expect(dot()).toBe(true);
      r.ui.settings.set({ adviceSeen: ['jobless'] });
      r.ui.refresh();
      expect(dot()).toBe(false);
      expect([adviceHasNew(['a', 'b'], ['b', 'a', 'c']), adviceHasNew(['a', 'd'], ['a']), adviceHasNew([], [])]).toEqual([false, true, false]);
    } finally { r.cleanup(); }
  });

  it('reads the advice at a command and every fifth game day, not every frame', async () => {
    const { w, home } = street({ tier: 3 });
    const r = await rigUI({ world: w });
    try {
      const btn = r.root.querySelector('#topbar .advice');
      r.ui.settings.set({ adviceSeen: [] });
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      const dot = () => !btn.querySelector('.advice-dot').hidden;
      expect(dot()).toBe(false);
      home.risk = 100000;                                                              // changes without a command
      for (let i = 0; i < 3; i++) r.frame(i * 16);
      expect(dot()).toBe(false);                                                       // frames do not look
      w.day += 5;
      r.ui.refresh();
      expect(dot()).toBe(true);                                                        // the fifth day does
    } finally { r.cleanup(); }
  });

  it('keeps its settings key: a list of strings, per device, defaulting to none, dropped when it is not one', () => {
    expect(DEFAULT_SETTINGS.adviceSeen).toEqual([]);
    const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    const s = createSettings({ storage: store, root: document.createElement('div') });
    expect(s.get().adviceSeen).toEqual([]);
    s.set({ adviceSeen: ['fire', 'jobless'] });
    s.set({ adviceSeen: 'fire' });                                                      // not a list: ignored
    s.set({ adviceSeen: [1, 2] });                                                      // not strings: ignored
    expect(s.get().adviceSeen).toEqual(['fire', 'jobless']);
    const again = createSettings({ storage: store, root: document.createElement('div') });
    expect(again.get().adviceSeen).toEqual(['fire', 'jobless']);
    s.get().adviceSeen.push('x');                                                       // a caller cannot change the stored copy
    expect(s.get().adviceSeen).toEqual(['fire', 'jobless', 'x']);
    expect(createSettings({ storage: { getItem: () => JSON.stringify({ adviceSeen: [3] }), setItem() {} }, root: document.createElement('div') }).get().adviceSeen).toEqual([]);
  });

  it('is linked from the summary, which keeps its figures, and the two are never open together', async () => {
    const { w } = street({ tier: 3 });
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const link = r.root.querySelector('#sheet .open-advice');
      expect([link.textContent, Boolean(r.root.querySelector('#sheet .row'))]).toEqual([T.advice, true]);
      expect(r.root.querySelector('#sheet').textContent).toContain(T.incomeVsSpending);
      click(link);
      expect(r.store.get().sheet.kind).toBe('advice');
      expect(r.root.querySelector('#sheet h2').textContent).toBe(T.advice);
      expect(r.root.querySelectorAll('#sheet').length).toBe(1);
      click(r.root.querySelector('#topbar .stats'));                                   // the numbers open the summary: it replaces the advice
      expect(r.store.get().sheet.kind).toBe('summary');
    } finally { r.cleanup(); }
    const none = await rigUI({ world: makeTestWorld({ gold: 500 }) });                  // no home yet: no link
    try {
      none.store.set(openSheet(none.store.get(), 'summary'));
      expect(none.root.querySelector('#sheet .open-advice')).toBe(null);
    } finally { none.cleanup(); }
  });
});

describe('v50 advice Show me', () => {
  const openAndClick = (r, kind) => {
    r.store.set(openSheet(r.store.get(), 'advice'));
    const li = [...r.root.querySelectorAll('#sheet .advice-item')].find((x) => x.dataset.kind === kind || x.dataset.key.startsWith(kind));
    fire(li.querySelector('button'), 'click');
    return li;
  };

  it('a build fix closes the sheet and starts that card\'s tool near the target, in its category', async () => {
    const { w, well, home } = street({ tier: 2 });
    removeBuilding(w, well.id);
    const r = await rigUI({ world: w });
    try {
      const li = openAndClick(r, 'home_need:water');
      const s = r.store.get();
      expect([li.dataset.key, s.sheet, s.tool, s.category]).toEqual(['home_need:water:no_well:-', null, { kind: 'building', type: 'well' }, categoryOfItem('well')]);
      expect(Math.hypot(s.ghost.x + 0.5 - (home.x + home.w / 2), s.ghost.y + 0.5 - (home.y + home.d / 2))).toBeLessThan(8);
    } finally { r.cleanup(); }
  });

  it('a road fix starts the road tool; a plot\'s house fix starts the plots tool', async () => {
    const w = makeTestWorld();
    w.milestone = 'village';
    addRaw(w, 'house', 12, 5, { tier: 1, residents: 4 });
    staffAll(w);
    const r = await rigUI({ world: w });
    try {
      const adv = cityAdvice(w).find((a) => a.fix && a.fix.item === 'road');
      expect(adv.cost).toBe(roadCostOf(w));
      openAndClick(r, adv.kind);
      expect([r.store.get().tool.kind, r.store.get().sheet]).toEqual(['road', null]);
      expect(adviceWords(adv, w).cost).toBe(ADVICE_TEXT.costRoad(roadCostOf(w)));
    } finally { r.cleanup(); }
  });

  it('a select fix selects the building and its sheet opens; a view fix opens the summary at that section', async () => {
    const { w, well } = street({ tier: 3 });
    well.paused = true;
    const r = await rigUI({ world: w });
    try {
      openAndClick(r, 'home_need:water');
      expect([r.store.get().selectedId, r.store.get().sheet]).toEqual([well.id, { kind: 'info', id: well.id }]);
      well.paused = false;
      w.labour = { workforce: 10, employed: 10, jobs: 30, shortLevels: ['services'] };
      r.ui.refresh();
      openAndClick(r, 'workers_short');
      expect(r.store.get().sheet).toEqual({ kind: 'summary', id: 'employment' });
      expect(r.root.querySelector('#sheet [data-section="employment"]')).toBeTruthy();
      w.gold = 30;
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'advice'));
      fire([...r.root.querySelectorAll('#sheet .advice-item')].find((x) => x.dataset.kind === 'treasury').querySelector('button'), 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'summary', id: 'forecast' });
    } finally { r.cleanup(); }
  });

  it('with no tile that takes the building, Show me refuses with why in a toast, starts no tool and leaves the sheet; with one it starts', async () => {
    const make = (fertile) => {
      const { w } = street({ tier: 4, fertile });
      addRaw(w, 'granary', 4, 20, { store: { grain: 40 } });
      staffAll(w);
      w.stats.lastMonth = { used: { grain: 30 }, made: {} };
      return w;
    };
    const rocky = make([]);                                                            // no fertile land at all: a grain farm has nowhere to stand
    expect(showMeRefusal(rocky, 'farm_grain', { x: 10, y: 10 })).toBe('no fertile land with room for it');
    expect(showMeRefusal(make([[0, 0, 8, 32]]), 'farm_grain', { x: 10, y: 10 })).toBe(null);
    expect(showMeRefusal(rocky, 'road', { x: 10, y: 10 })).toBe(null);                  // drawn tools always start
    expect(showMeRefusal(rocky, 'well', { x: 10, y: 10 })).toBe(null);                  // a well fits anywhere free
    for (const [world, fits] of [[rocky, false], [make([[0, 0, 8, 32]]), true]]) {
      const r = await rigUI({ world });
      try {
        const adv = cityAdvice(world).find((a) => a.kind === 'running_out' && a.data.need === 'food');
        expect(adv.fix.item).toBe('farm_grain');
        openAndClick(r, 'running_out');
        const s = r.store.get();
        if (fits) {
          expect([s.tool, s.sheet]).toEqual([{ kind: 'building', type: 'farm_grain' }, null]);
        } else {
          expect([s.tool, s.sheet && s.sheet.kind]).toEqual([null, 'advice']);
          const toast = r.root.querySelector('#toasts .toast');
          expect(toast.textContent).toContain(ADVICE_TEXT.noRoom('farm_grain', 'no fertile land with room for it'));
          expect(ADVICE_TEXT.noRoom('farm_grain', 'No fertile land')).toBe('No place for a grain farm near there: no fertile land');
        }
      } finally { r.cleanup(); }
    }
  });
});
