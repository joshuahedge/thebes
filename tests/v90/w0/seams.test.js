// Version 9.0 wave 0 (ruling 1563): the seams the three tracks fill, each a stub with 8.4's behaviour, where its caller calls it; the game
// menu's two rows, absent until their hooks exist and always in the lesson; css/v90.css linked last; the three text.js sections in merge order.
import { describe, it, expect } from '../../harness.js';
import { heirFactor, titleOf, countDynastyMonth } from '../../../src/sim/dynasty.js';
import { passSheetExtras } from '../../../src/ui/v90/passSheet.js';
import { onSplit } from '../../../src/ui/v90/rivalToast.js';
import { effectsV90 } from '../../../src/render/v90/effects.js';
import { createWorld } from '../../../src/sim/world.js';
import { serialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { T, V90_D_TEXT, V90_L_TEXT } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';

const noStorage = { getItem: () => null, setItem() {} };
const source = (path) => fetch(path).then((r) => r.text());

describe('v90 w0 seams: the dynasty, each a stub with 8.4 behaviour', () => {
  // Track D filled the seams (rulings 1565-1567): the Steady still bends no lever; this sample city has earned no title; the month-end count now counts
  // (tests/v90/d covers each rule). Was: titleOf gave exactly { id: 'steady', fit: 0 } and countDynastyMonth changed nothing.
  it('bends no lever for the Steady, names this reign the Steady and counts the month end', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    for (const lever of ['crews', 'taxes', 'pay', 'firstWarn', 'harvest', 'flood', 'buys', 'workshops', 'arrivals', 'high']) expect([lever, heirFactor(w, lever)]).toEqual([lever, 1]);
    const t = titleOf(w);
    expect([t.id, t.fit]).toEqual(['steady', 0]);
    const town = w.tally.townMonths;
    countDynastyMonth(w);
    expect(w.tally.townMonths).toBe(town + 1);
  });
  it('calls the month-end count once a month, after the goods\' month record and before the month-end row', async () => {
    const clock = await source('/src/sim/clock.js');
    const body = clock.slice(clock.indexOf('export function runMonth'), clock.indexOf('export function tickDay'));
    const at = (s) => body.indexOf(s);
    expect(body.split('countDynastyMonth(world)').length).toBe(2);
    expect(at('monthlyEconomy(world)') < at('countDynastyMonth(world)')).toBe(true);
    expect(at('updateMilestone(world)') < at('countDynastyMonth(world)')).toBe(true);
    expect(at('recordGoodsMonth(') < at('countDynastyMonth(world)') && at('countDynastyMonth(world)') < at('world.history.push(')).toBe(true);
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    const town = w.tally.townMonths;
    advanceDays(w, 90);
    expect(w.tally.townMonths).toBe(town + 3);   // Track D: three month ends counted (was: every count stayed 0)
  });
});

describe('v90 w0 seams: the interface and the frame, each a stub', () => {
  it('draws nothing more into the Pass sheet, says nothing at a split and draws no effect', () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body'), w = createWorld({ seed: 3 });
      expect(passSheetExtras(body, w, {})).toBe(undefined);
      expect(body.childNodes.length).toBe(0);
      expect(onSplit(w, 'town', {})).toBe(undefined);
      const calls = [];
      const g = new Proxy({}, { get: (t, k) => (...a) => calls.push([k, a]) });
      expect(effectsV90(g, { width: 390, height: 844 }, w, {})).toBe(undefined);
      expect(calls).toEqual([]);
    } finally { cleanup(); }
  });
  it('calls onSplit from the interface once a split is new, and effectsV90 once a frame after the effects pass', async () => {
    const ui = await source('/src/ui/createUI.js');
    expect(ui.split('onSplit(world, id, seamCtx)').length).toBe(2);
    expect(ui.includes('splitsSeen = new Set(SPLITS.filter((id) => Number.isInteger(world.splits[id])))')).toBe(true);   // a split the city had on opening is never new
    const r = await source('/src/render/renderer.js');
    expect(r.split('effectsV90(g, view, world, { ...opts, range, cam })').length).toBe(2);
    const at = (s) => r.indexOf(s);
    expect(at('opts.effects.draw(') < at('effectsV90(g,') && at('effectsV90(g,') < at('if (opts.drawOverlay)')).toBe(true);
  });
  // Version 9.1 wave 0 (ruling 1651): css/v91.css now comes last, so v90.css is the one before it (was: v90.css the last stylesheet).
  it('links css/v90.css after every other stylesheet but 9.1\'s', async () => {
    const page = new DOMParser().parseFromString(await source('/index.html'), 'text/html');
    const hrefs = [...page.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')).filter((h) => /css\//.test(h));
    expect(hrefs.slice(-4)).toEqual(['./css/v90.css', './css/v91.css', './css/v92.css', './css/v93.css']);   // Version 9.2 (Track D): css/v92.css comes after 9.1's
    expect(hrefs.filter((h) => h === './css/v90.css').length).toBe(1);
  });
});

describe('v90 w0 seams: the game menu\'s two rows', () => {
  function menuWith(hooks) {
    const { root, cleanup } = mount('<div id="body"></div>');
    const settings = createSettings({ storage: noStorage, root });
    const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, hooks });
    const body = root.querySelector('#body');
    menus.menu(body, { close() {} });
    const labels = [...body.querySelectorAll('.menu-list button')].map((b) => b.textContent.trim());
    return { body, labels, cleanup };
  }
  it('has neither row until its hook exists', () => {
    const r = menuWith({ home: () => true });
    try {
      expect([r.labels.includes(V90_D_TEXT.menuPass), r.labels.includes(V90_L_TEXT.menuRulers)]).toEqual([false, false]);
      expect([V90_D_TEXT.menuPass, V90_L_TEXT.menuRulers]).toEqual(['Pass the throne', 'Rulers']);
    } finally { r.cleanup(); }
  });
  it('shows Pass the throne and Rulers after New city once the hooks exist, and each calls its hook', () => {
    const called = [];
    const r = menuWith({ passThrone: () => called.push('pass'), canPassThrone: () => true, rulers: () => called.push('rulers') });
    try {
      const i = r.labels.indexOf(T.newCity);
      expect(r.labels.slice(i, i + 3)).toEqual([T.newCity, 'Pass the throne', 'Rulers']);
      fire(r.body.querySelector('.menu-pass-throne'), 'click');
      fire(r.body.querySelector('.menu-rulers'), 'click');
      expect(called).toEqual(['pass', 'rulers']);
    } finally { r.cleanup(); }
  });
  it('leaves Pass the throne out while canPassThrone says not yet (below City)', () => {
    const r = menuWith({ passThrone() {}, canPassThrone: () => false, rulers() {} });
    try { expect([r.labels.includes('Pass the throne'), r.labels.includes('Rulers')]).toEqual([false, true]); } finally { r.cleanup(); }
  });
  it('never shows either in the lesson', () => {
    const r = menuWith({ passThrone() {}, canPassThrone: () => true, rulers() {}, lessonRun: { leave() {} } });
    try { expect([r.labels.includes('Pass the throne'), r.labels.includes('Rulers')]).toEqual([false, false]); } finally { r.cleanup(); }
  });
});

describe('v90 w0 seams: the text sections', () => {
  it('ends text.js with the three 9.0 sections in merge order, D, L then V', async () => {
    const text = await source('/src/ui/text.js');
    const at = (s) => text.indexOf(s);
    const marks = ['// Version 9.0, Track D', '// ── end v90 d ──', '// Version 9.0, Track L', '// ── end v90 l ──', '// Version 9.0, Track V', '// ── end v90 v ──'];
    for (const m of marks) expect([m, at(m) > at('// ── end v84 e ──')]).toEqual([m, true]);
    for (let i = 1; i < marks.length; i++) expect([marks[i], at(marks[i - 1]) < at(marks[i])]).toEqual([marks[i], true]);
    expect(at('export const V90_D_TEXT') > at(marks[0]) && at('export const V90_D_TEXT') < at(marks[1])).toBe(true);
    expect(at('export const V90_L_TEXT') > at(marks[2]) && at('export const V90_L_TEXT') < at(marks[3])).toBe(true);
  });
});
