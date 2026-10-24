// Version 8.0 Track U: Options (four groups, smaller rows, the version at the foot), full motion for everyone with the test rig's switch kept, and the words (short labels, "place" and
// "lay" for "paint").
import { describe, it, expect } from '../../harness.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createSettings, DEFAULT_SETTINGS } from '../../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { T, V80_U_TEXT, V711_TEXT, D2_TEXT, D1_TEXT, CARDS4_TEXT, S46_UX_TEXT, TIP_TEXT, TIP_HELP_TEXT, HELP_NAMES } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const words = (label) => label.trim().split(/\s+/).length;

function sheet(hooks = {}) {
  const { root, cleanup } = mount('<div id="body"></div>');
  const settings = createSettings({ storage: memory(), root });
  const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, hooks, version: APP_VERSION });
  const body = root.querySelector('#body');
  menus.settings(body, { close() {} });
  return { body, settings, root, cleanup };
}

describe('v80 u options: four groups, smaller rows, the version at the foot', () => {
  it('lists Sound, Display, Controls and Saves in that order, each a labelled group with its rows', () => {
    const r = sheet({ exportCity() {} });
    try {
      const groups = [...r.body.querySelectorAll('.options-group')];
      expect(groups.map((g) => g.querySelector('h3').textContent)).toEqual(['Sound', 'Display', 'Controls', 'Saves']);
      for (const g of groups) expect([g.className, document.getElementById(g.getAttribute('aria-labelledby')) === g.querySelector('h3')]).toEqual([g.className, true]);
      const has = (g, sel) => Boolean(groups[g].querySelector(sel));
      expect([has(0, '.switch.sound'), has(0, '.switch.music'), has(0, '.music-volume:not(.effects-volume)'), has(0, '.effects-volume')]).toEqual([true, true, true, true]);
      expect([has(1, '.choice.textSize'), has(1, '.switch.dayNight')]).toEqual([true, true]);
      expect([has(2, '.switch.keyboardShortcuts'), has(2, '.switch.leftHanded'), has(2, '.switch.vibration'), has(2, '.choice.fireReaction'), has(2, '.choice.help')]).toEqual([true, true, true, true, true]);
      expect([has(3, '.export-city'), has(3, '.choice.difficulty')]).toEqual([true, true]);
      expect(r.body.querySelector('.switch.keyboardShortcuts').textContent).toContain('Single keys');
      expect(r.body.querySelectorAll('.options-group .row').length).toBeGreaterThan(8);
    } finally { r.cleanup(); }
  });
  it('puts the version and build at the foot, small and muted, and Export city only where there is a city', () => {
    const r = sheet();
    try {
      const foot = r.body.querySelector('.options-version .version');
      expect([foot.textContent.startsWith(`Version ${APP_VERSION}`), foot.classList.contains('small'), foot.classList.contains('muted'), r.body.lastElementChild.className]).toEqual([true, true, true, 'options-version']);
      expect(r.body.querySelector('.export-city')).toBe(null);                  // no exportCity hook: no button
    } finally { r.cleanup(); }
  });
  it('has Options in the game\'s menu as its name, and the sheet\'s Export city runs the hook', async () => {
    const log = [];
    const g = await rigUI({ width: 390, height: 844, hooks: { exportCity: () => log.push('export') } });
    try {
      g.store.set(openSheet(g.store.get(), 'settings'));
      const exp = g.root.querySelector('#sheet .options-group.saves .export-city');
      expect(exp).toBeTruthy();
      const q = exp.getBoundingClientRect();
      expect([q.width >= 44, q.height >= 44, exp.textContent]).toEqual([true, true, 'Export city']);
      fire(exp, 'click');
      expect(log).toEqual(['export']);
      expect(T.settings).toBe('Options');
      expect(D1_TEXT.settingsPanel).toBe('Options');
    } finally { g.cleanup(); }
  });
});

describe('v80 u options: full motion for everyone, the test rig\'s switch kept', () => {
  it('has no Motion row and says nothing of it in its words', () => {
    const r = sheet();
    try {
      expect([r.body.querySelector('.choice.motion, .motion-row, .motion-status'), /motion/i.test(r.body.textContent)]).toEqual([null, false]);
    } finally { r.cleanup(); }
    for (const t of [TIP_TEXT.gentle_motion, TIP_HELP_TEXT.gentle_motion, TIP_TEXT.night_falls]) expect(/Settings →|Motion row|Settings → Motion/.test(t)).toBe(false);
  });
  it('ignores the phone\'s Reduce motion: the level is Full and nothing watches the device, unless the test rig opts in', () => {
    const was = window.matchMedia, rig = window.__thebesRigDevice, listeners = [];
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener: (...a) => listeners.push(a), removeEventListener() {}, addListener: (...a) => listeners.push(a), removeListener() {} });
    const { root, cleanup } = mount();
    try {
      delete window.__thebesRigDevice;                                         // a player's page: nothing sets it
      const s = createSettings({ storage: memory(), root });
      expect([s.motionLevel(), s.reducedMotion(), root.dataset.motion, root.classList.contains('reduce-motion'), listeners.length]).toEqual(['full', false, 'full', false, 0]);
      s.destroy();
      window.__thebesRigDevice = true;                                         // the test page and the screenshot tool: the browser's own setting, as 7.x followed it
      const r = createSettings({ storage: memory(), root });
      expect([r.motionLevel(), root.dataset.motion, listeners.length]).toEqual(['gentle', 'gentle', 1]);
      r.destroy();
    } finally { window.matchMedia = was; if (rig === undefined) delete window.__thebesRigDevice; else window.__thebesRigDevice = rig; cleanup(); }
  });
  it('does not read back a Motion level 7.x stored (nobody is stuck on Gentle or Still with no row), while the rig\'s own blob and set() still work', () => {
    const { root, cleanup } = mount();
    try {
      for (const stored of [{ motion: 'still' }, { motion: 'gentle' }, { reducedMotion: 'on' }, { ambient: false }]) {
        const s = createSettings({ storage: memory({ 'thebes.settings': JSON.stringify(stored) }), root, systemReducedMotion: () => false });   // the device says nothing: a stored level that was read back would show
        expect([JSON.stringify(stored), s.motionLevel()]).toEqual([JSON.stringify(stored), 'full']);
      }
      const rig = createSettings({ storage: memory({ 'thebes.settings': JSON.stringify({ motion: 'still', motionRig: true }) }), root });
      expect([rig.motionLevel(), root.dataset.motion]).toEqual(['still', 'still']);   // the rig's pre-seeded storage
      const s = createSettings({ storage: memory(), root });
      s.set({ motion: 'gentle' });
      expect([s.motionLevel(), root.dataset.motion, root.classList.contains('reduce-motion')]).toEqual(['gentle', 'gentle', true]);   // setMotion for the shots
      const forced = createSettings({ storage: memory(), root, systemReducedMotion: () => true });
      expect(forced.motionLevel()).toBe('gentle');                              // the rig's injected device stand-in, as every old test uses it
      expect([DEFAULT_SETTINGS.motion, DEFAULT_SETTINGS.motionRig]).toEqual(['system', false]);
    } finally { cleanup(); }
  });
});

describe('v80 u words: short labels, place and lay', () => {
  it('keeps the primary buttons to one or two words', () => {
    const primary = [T.continueGame, T.newCity, V80_U_TEXT.play, V80_U_TEXT.start, T.settings, S46_UX_TEXT.whatsNew, D2_TEXT.titleStart, D2_TEXT.titleContinue, T.installMenu, T.install, D1_TEXT.lesson,
      V80_U_TEXT.resumeLesson, V80_U_TEXT.moreChoices, V80_U_TEXT.fewerChoices, CARDS4_TEXT.showCards, D2_TEXT.endNew, D2_TEXT.endStay, T.exportCity, T.back];
    for (const label of primary) expect([label, words(label) <= 2]).toEqual([label, true]);
    expect([V711_TEXT.skip, words(V711_TEXT.skip)]).toEqual(["I've played before", 3]);   // the one secondary button the design names in three
  });
  it('says place for plots and lay for roads where a player reads it, never paint', () => {
    const homes = D2_TEXT.steps.homes().text, workers = D2_TEXT.steps.workers({ labour: { jobs: 8, workforce: 4 }, paused: false }).text;
    expect([/^Place \d+ housing plots/.test(homes), /place more homes/.test(workers)]).toEqual([true, true]);
    for (const t of [homes, workers, HELP_NAMES.full]) expect([t, /paint/i.test(t)]).toEqual([t, false]);
  });
});
