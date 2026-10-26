// Version 6.0 Track D1 (rulings 740-747): the title card. Continue, New city (difficulty and map size under it), Lesson, Settings, What's new; "This week's
// Nile" and "Play with sound / Play muted" are gone; sound is on by default and Settings (on the card too) mutes it; the size picker offers Huge and a
// phone is told it suits a bigger screen.
import { describe, it, expect } from '../../harness.js';
import { createTitleCard, isPhoneScreen, PHONE_SHORT_SIDE } from '../../../src/ui/titleCard.js';
import { createSettings, DEFAULT_SETTINGS } from '../../../src/ui/settings.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { MAP_SIZE_TABLE, MAP_SIZES, MAP_SIZE_IDS } from '../../../src/data/map.js';
import { D1_TEXT, CARDS4_TEXT, S46_UX_TEXT, S46_MAP_TEXT, T, V80_U_TEXT } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';
import { mountShell } from '../../helpers/uiWorld.js';

const BIG = () => ({ width: 1280, height: 800 });
const PHONE = () => ({ width: 390, height: 844 });
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
// Version 8.0: the size picker is on the new-city card, under More choices: open both.
const openMore = (container) => { fire(container.querySelector('.new-city'), 'click'); fire(container.querySelector('.more-choices-toggle'), 'click'); };
const shown = (container) => [...container.querySelectorAll('.title-buttons button')].filter((b) => !b.hidden && !b.closest('.title-difficulty')).map((b) => b.textContent.trim());

function card(props = {}) {
  const m = mount('<div id="title" hidden></div>');
  const container = m.root.querySelector('#title');
  const log = [];
  const tc = createTitleCard({ container, hasSave: false, onContinue: () => log.push('continue'), onNewCity: () => log.push('new'), onHowToPlay: () => log.push('how'), screen: BIG, ...props });
  return { container, log, tc, cleanup() { tc.destroy(); m.cleanup(); } };
}

describe('v60 d1 title card: the buttons', () => {
  it('lists Play, How to play, Options and What\'s new on a fresh device, with the difficulty and the size on the card Play opens (Version 8.0)', () => {
    const c = card({ renderSettings: () => {}, canInstall: false });
    try {
      expect(shown(c.container)).toEqual([V80_U_TEXT.play, CARDS4_TEXT.howToPlay, T.settings, S46_UX_TEXT.whatsNew]);
      const box = c.container.querySelector('.title-buttons');
      const order = [...box.children].map((n) => (n.classList.contains('title-more') ? 'more' : n.classList.contains('new-city') ? 'new' : n.className));
      expect(order.slice(0, 2)).toEqual(['new', 'more']);
      expect(c.container.querySelector('.title-difficulty, .title-size')).toBe(null);   // not on the title itself
      expect(c.container.querySelector('.new-city').classList.contains('primary')).toBe(true);
      fire(c.container.querySelector('.new-city'), 'click');
      expect(c.container.querySelector('.new-city-body .title-difficulty')).toBeTruthy();
      expect(c.container.querySelector('.more-choices-body .title-size')).toBeTruthy();   // the size waits under More choices
    } finally { c.cleanup(); }
  });
  it('puts Continue first and primary with a saved city, New city second', () => {
    const c = card({ hasSave: true, renderSettings: () => {} });
    try {
      expect(shown(c.container).slice(0, 2)).toEqual([T.continueGame, T.newCity]);
      expect(c.container.querySelector('.continue').classList.contains('primary')).toBe(true);
      expect(c.container.querySelector('.new-city').classList.contains('primary')).toBe(false);
      expect(document.activeElement).toBe(c.container.querySelector('.continue'));
    } finally { c.cleanup(); }
  });
  it('shows no weekly seed and no sound button anywhere on the card', () => {
    const c = card({ hasSave: true, renderSettings: () => {} });
    try {
      for (const sel of ['.weekly', '.title-weekly', '.weekly-hint', '.sound']) expect([sel, c.container.querySelector(sel)]).toEqual([sel, null]);
      const words = c.container.textContent;
      for (const gone of ['This week', 'Play with sound', 'Play muted']) expect([gone, words.includes(gone)]).toEqual([gone, false]);
    } finally { c.cleanup(); }
  });
  it('puts Lesson in the third place once the guided first city supplies it, and How to play then steps aside', () => {
    const log = [];
    const c = card({ onLesson: () => log.push('lesson'), renderSettings: () => {} });
    try {
      expect(shown(c.container)).toEqual([V80_U_TEXT.play, D1_TEXT.lesson, T.settings, S46_UX_TEXT.whatsNew]);
      expect(c.container.querySelector('.how-to-play')).toBe(null);
      fire(c.container.querySelector('.lesson'), 'click');
      expect(log).toEqual(['lesson']);
    } finally { c.cleanup(); }
  });
  it('has no third button at all when neither the lesson nor How to play is wired, and no Settings without its rows', () => {
    const c = card({ onHowToPlay: null });
    try { expect(shown(c.container)).toEqual([V80_U_TEXT.play, S46_UX_TEXT.whatsNew]); } finally { c.cleanup(); }
  });
  it('keeps Install after the row, only where offered, and has no Bring your city (Version 8.0)', () => {
    const c = card({ canInstall: true, renderSettings: () => {} });
    try {
      const last = [...c.container.querySelector('.title-buttons').children].map((n) => n.className.split(' ')[0]);
      expect(last.slice(-2)).toEqual(['title-more', 'install']);
      expect(c.container.querySelector('.bring')).toBe(null);
    } finally { c.cleanup(); }
  });
});

describe('v60 d1 title card: Settings on the card, and sound on by default', () => {
  function rig({ stored = {} } = {}) {
    const storage = memory(stored.__raw ? stored.__raw : { 'thebes.settings': JSON.stringify(stored) });
    const root = document.createElement('div');
    const settings = createSettings({ storage, root, systemReducedMotion: () => false, watchSystem: () => () => {} });
    const menus = createMenuSheets({ store: { get: () => ({}), set() {}, subscribe: () => () => {} }, settings, toasts: { show() {} }, hooks: {} });
    const c = card({ hasSave: true, renderSettings: (body) => menus.settings(body) });
    return { ...c, settings, storage };
  }
  it('starts with sound and music on and no choice stored, and a device that stored a choice keeps it', () => {
    expect([DEFAULT_SETTINGS.sound, DEFAULT_SETTINGS.music]).toEqual([true, true]);
    const root = document.createElement('div');
    expect(createSettings({ storage: memory(), root, systemReducedMotion: () => false, watchSystem: () => () => {} }).get().sound).toBe(true);
    const kept = createSettings({ storage: memory({ 'thebes.settings': JSON.stringify({ sound: false }) }), root, systemReducedMotion: () => false, watchSystem: () => () => {} });
    expect(kept.get().sound).toBe(false);
  });
  it('opens Settings as the card\'s one panel: the game\'s own rows, a switch writes through, Back returns the buttons and focus', () => {
    const r = rig();
    try {
      const buttons = r.container.querySelector('.title-buttons');
      fire(r.container.querySelector('.title-settings'), 'click');
      expect(buttons.hidden).toBe(!r.container.querySelector('.title-card').classList.contains('wide'));   // one panel at a time (Version 8.2, ruling 1312: beside the buttons on a wide screen)
      expect(r.container.querySelectorAll('.guide').length).toBe(1);
      expect(r.container.querySelector('.settings-head').textContent).toBe(D1_TEXT.settingsPanel);
      const sound = r.container.querySelector('.switch.sound');
      expect([sound.getAttribute('role'), sound.getAttribute('aria-checked')]).toEqual(['switch', 'true']);
      fire(sound, 'click');
      expect([r.settings.get().sound, sound.getAttribute('aria-checked')]).toEqual([false, 'false']);
      expect(JSON.parse(r.storage.data['thebes.settings']).sound).toBe(false);
      fire(r.container.querySelector('.switch.music'), 'click');
      expect(r.settings.get().music).toBe(false);
      for (const sel of ['.choice.textSize', '.options-group.saves', '.switch.vibration', '.switch.keyboardShortcuts', '.choice.difficulty']) expect([sel, Boolean(r.container.querySelector(`.guide ${sel}`))]).toEqual([sel, true]);
      fire(r.container.querySelector('.guide-back'), 'click');
      expect([buttons.hidden, r.container.querySelector('.guide')]).toEqual([false, null]);
      expect(document.activeElement).toBe(r.container.querySelector('.continue'));
    } finally { r.cleanup(); }
  });
  it('gives every control in the Settings panel an accessible name and 44 px to tap', async () => {
    const shell = await mountShell(390, 844);
    const container = shell.root.querySelector('#title');
    const root = document.createElement('div');
    const settings = createSettings({ storage: memory(), root, systemReducedMotion: () => false, watchSystem: () => () => {} });
    const menus = createMenuSheets({ store: { get: () => ({}), set() {}, subscribe: () => () => {} }, settings, toasts: { show() {} }, hooks: {} });
    const tc = createTitleCard({ container, hasSave: false, onNewCity() {}, screen: PHONE, renderSettings: (body) => menus.settings(body) });
    try {
      fire(container.querySelector('.title-settings'), 'click');
      for (const b of container.querySelectorAll('.guide button')) {
        const r = b.getBoundingClientRect();
        const name = b.getAttribute('aria-label') || b.textContent.trim();
        expect([name.length > 0, r.height >= 44 - 0.5, r.width >= 44 - 0.5]).toEqual([true, true, true]);
      }
    } finally { tc.destroy(); shell.cleanup(); }
  });
});

describe('v60 d1 title card: every Settings row works with no city behind it (fixer round 1)', () => {
  it('builds the panel on an empty store and takes a tap on every button without a throw, and it has no Restart or Export row', () => {
    const calls = [];
    const store = { get: () => { calls.push('get'); return {}; }, set() { calls.push('set'); }, subscribe: () => () => {} };
    const root = document.createElement('div');
    const settings = createSettings({ storage: memory(), root, systemReducedMotion: () => false, watchSystem: () => () => {} });
    const menus = createMenuSheets({ store, settings, toasts: { show() {} }, hooks: {} });
    const body = document.createElement('div');
    document.body.append(body);
    try {
      menus.settings(body);
      const buttons = [...body.querySelectorAll('button')];
      expect(buttons.length).toBeGreaterThan(10);
      for (const b of buttons) fire(b, 'click');
      expect(calls.includes('set')).toBe(false);                                        // no row writes to the city's store
      expect(/restart|export|import/i.test(body.textContent)).toBe(false);
    } finally { body.remove(); }
  });
});

describe('v60 d1 title card: the Huge map in the picker, and the phone note', () => {
  it('offers every size the table offers, Huge last at 112 by 112, from the data', () => {
    const c = card();
    try {
      openMore(c.container);
      const ids = [...c.container.querySelectorAll('.choice.mapsize')].map((b) => b.dataset.value);
      expect(ids).toEqual(MAP_SIZE_TABLE.filter((r) => r.offered).map((r) => r.id));
      expect(ids).toEqual(MAP_SIZE_IDS);
      expect(ids[ids.length - 1]).toBe('huge');
      expect(MAP_SIZES.huge).toBe(112);
      const huge = c.container.querySelector('.choice.mapsize[data-value="huge"]');
      expect([huge.textContent, huge.getAttribute('aria-label')]).toEqual(['Huge', 'Huge, 112 by 112 tiles']);
      fire(huge, 'click');
      expect(c.container.querySelector('#title-size-hint').textContent).toBe(S46_MAP_TEXT.sizeHints.huge);
    } finally { c.cleanup(); }
  });
  it('tells a phone "Best on a tablet or computer" while Huge is chosen, in the line under the picker and in the button\'s name, and never blocks the choice', () => {
    const chosen = [];
    const c = card({ screen: PHONE, onMapSize: (id) => chosen.push(id) });
    try {
      openMore(c.container);
      const note = c.container.querySelector('#title-size-note');
      expect(note.hidden).toBe(true);                                                    // Normal: nothing to say
      const huge = c.container.querySelector('.choice.mapsize[data-value="huge"]');
      expect(huge.getAttribute('aria-label')).toBe('Huge, 112 by 112 tiles, best on a tablet or computer');
      fire(huge, 'click');
      expect([note.hidden, note.textContent, chosen]).toEqual([false, D1_TEXT.bigScreen, ['huge']]);
      expect(D1_TEXT.bigScreen).toBe('Best on a tablet or computer');
      expect(huge.getAttribute('aria-pressed')).toBe('true');
      fire(c.container.querySelector('.choice.mapsize[data-value="large"]'), 'click');   // another size: the note goes
      expect(note.hidden).toBe(true);
    } finally { c.cleanup(); }
  });
  it('says nothing on a tablet or a computer, and follows the window when it changes', () => {
    let size = { width: 1280, height: 800 };
    const c = card({ screen: () => size });
    try {
      openMore(c.container);
      const note = c.container.querySelector('#title-size-note');
      fire(c.container.querySelector('.choice.mapsize[data-value="huge"]'), 'click');
      expect(note.hidden).toBe(true);
      size = { width: 390, height: 844 };
      window.dispatchEvent(new Event('resize'));
      expect(note.hidden).toBe(false);
      size = { width: 768, height: 1024 };                                               // a tablet held upright: its short side is 768
      window.dispatchEvent(new Event('resize'));
      expect(note.hidden).toBe(true);
    } finally { c.cleanup(); }
  });
  it('calls a screen a phone when its shorter side is under 600 px, either way up', () => {
    expect(PHONE_SHORT_SIDE).toBe(600);
    expect([[390, 844], [844, 390], [667, 375], [360, 640], [599, 900]].map(([w, h]) => isPhoneScreen({ width: w, height: h }))).toEqual([true, true, true, true, true]);
    expect([[768, 1024], [1280, 800], [1920, 1080], [600, 1000]].map(([w, h]) => isPhoneScreen({ width: w, height: h }))).toEqual([false, false, false, false]);
    expect([isPhoneScreen(null), isPhoneScreen({ width: 0, height: 0 })]).toEqual([false, false]);
  });
});

describe('v60 d1 title card: nothing clipped and every button 44 px, on a phone and a laptop, at 100% and 150% text', () => {
  it('keeps the whole card reachable with the new rows at 390x844, 360x640, 844x390 and 1280x800', async () => {
    for (const [w, h, size] of [[390, 844, 100], [390, 844, 150], [360, 640, 100], [360, 640, 150], [844, 390, 100], [1280, 800, 100], [1280, 800, 150]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const container = shell.root.querySelector('#title');
      const tc = createTitleCard({ container, hasSave: true, canInstall: true, onContinue() {}, onNewCity() {}, onHowToPlay() {}, renderSettings() {}, screen: () => ({ width: w, height: h }) });
      try {
        const at = `${w}x${h} at ${size}%`;
        const cardEl = shell.root.querySelector('.title-card');
        const box = cardEl.getBoundingClientRect(), outer = shell.root.getBoundingClientRect();
        expect([at, box.top >= outer.top - 0.5, box.bottom <= outer.bottom + 0.5, box.left >= outer.left - 0.5, box.right <= outer.right + 0.5]).toEqual([at, true, true, true, true]);
        expect([at, cardEl.scrollHeight <= cardEl.clientHeight + 1 || getComputedStyle(cardEl).overflowY === 'auto']).toEqual([at, true]);
        expect([at, cardEl.scrollWidth <= cardEl.clientWidth + 1]).toEqual([at, true]);   // no sideways overflow
        for (const step of ['title', 'new city', 'more choices']) {   // Version 8.0: the title, the new-city card, and the card with More choices open
          if (step === 'new city') fire(cardEl.querySelector('.new-city'), 'click');
          if (step === 'more choices') fire(cardEl.querySelector('.more-choices-toggle'), 'click');
          expect([at, step, cardEl.scrollWidth <= cardEl.clientWidth + 1]).toEqual([at, step, true]);
          for (const b of cardEl.querySelectorAll('button:not([hidden]), select')) {
            if (b.closest('[hidden]')) continue;
            const r = b.getBoundingClientRect();
            expect([at, step, b.textContent, r.width >= 44 - 0.5, r.height >= 44 - 0.5]).toEqual([at, step, b.textContent, true, true]);
            expect([at, step, b.textContent, b.scrollWidth <= b.clientWidth + 1]).toEqual([at, step, b.textContent, true]);   // the words fit their button
          }
        }
      } finally { tc.destroy(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
  });
});
