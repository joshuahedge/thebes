// Version 9.2, Track Q, 3.5, 3.7 and 3.8 (rulings 1791, 1792, 1794): Screenshot mode in Options > Display, toasts that never stack, and the interface tidies (one badge to a
// tray card, the price alone, parchment toasts, Options in collapsible sections with About last, New city's amber replace note).
import { describe, it, expect } from '../../harness.js';
import { createToasts } from '../../../src/ui/toasts.js';
import { renderCards } from '../../../src/ui/cards.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { T } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

function timers() {
  const list = [];
  return { list, setTimer: (fn, ms) => { list.push({ fn, ms }); return list.length; }, clearTimer: (id) => { list[id - 1] = null; }, fire: (id) => { const t = list[id - 1]; if (t) { list[id - 1] = null; t.fn(); } } };
}
const shown = (root) => [...root.querySelectorAll('.toast')].map((n) => n.textContent);

describe('v92 q toasts: the group and the wait', () => {
  it('a toast of the same group waits for the one up, and shows when it goes', () => {
    const { root, cleanup } = mount();
    const t = timers();
    const toasts = createToasts({ container: root, max: 2, setTimer: t.setTimer, clearTimer: t.clearTimer });
    toasts.show('Paused while you were away', { group: 'welcome' });
    toasts.show('Install Thebes', { group: 'welcome', waits: true });
    expect(shown(root)).toEqual(['Paused while you were away']);
    t.fire(1);                                                  // the first times out
    expect(shown(root)).toEqual(['Install Thebes']);
    cleanup();
  });
  it('on a phone (one at a time) a toast that waits never replaces the one up; a toast that does not wait still does', () => {
    const { root, cleanup } = mount();
    const t = timers();
    const toasts = createToasts({ container: root, max: 1, setTimer: t.setTimer, clearTimer: t.clearTimer });
    toasts.show('Road laid');
    toasts.show('Install Thebes', { group: 'welcome', waits: true });
    expect(shown(root)).toEqual(['Road laid']);
    toasts.show('House placed');
    expect(shown(root)).toEqual(['House placed']);              // the ordinary newest still replaces the last
    t.fire(2);
    expect(shown(root)).toEqual(['Install Thebes']);
    cleanup();
  });
  it('without the options a toast is as it was: two at most on a wide screen, the oldest goes', () => {
    const { root, cleanup } = mount();
    const toasts = createToasts({ container: root, max: 2 });
    toasts.show('one'); toasts.show('two'); toasts.show('three');
    expect(shown(root)).toEqual(['two', 'three']);
    cleanup();
  });
  it('the waiting toast is kept once in the tray, and clear() forgets it', () => {
    const { root, cleanup } = mount();
    const seen = [];
    const toasts = createToasts({ container: root, max: 1, record: (text) => { seen.push(text); return seen.length; } });
    toasts.show('A');
    toasts.show('Install Thebes', { waits: true });
    expect(seen).toEqual(['A', 'Install Thebes']);
    toasts.clear();
    expect(shown(root)).toEqual([]);
    cleanup();
  });
});

describe('v92 q tidies: the tray card', () => {
  it('shows the price alone: no monthly cost line, and one badge, Suggested over New', () => {
    const w = makeTestWorld({ gold: 1000 });
    const { root, cleanup } = mount();
    const layers = { view: () => ({ items: ['well', 'granary'], advised: 'well' }) };
    renderCards(root, { world: w, category: 'services', activeItem: null, onPick: () => {}, layers });
    for (const c of root.querySelectorAll('.card')) expect([c.dataset.item, c.querySelector('.upkeep')]).toEqual([c.dataset.item, null]);
    const well = root.querySelector('.card[data-item="well"]');
    expect(Boolean(well.querySelector('.hint'))).toBe(true);
    expect(well.querySelector('.new-badge')).toBe(null);
    cleanup();
  });
  it('a card carries at most one of Suggested and New', () => {
    const w = makeTestWorld({ gold: 1000 });
    const { root, cleanup } = mount();
    const layers = { view: () => ({ items: ['well', 'granary'], advised: 'granary' }) };
    renderCards(root, { world: w, category: 'services', activeItem: null, onPick: () => {}, layers });
    for (const c of root.querySelectorAll('.card')) expect(c.querySelectorAll('.new-badge, .hint').length).toBeLessThanOrEqual(1);
    cleanup();
  });
});

describe('v92 q tidies: Options and the menu', () => {
  function settingsSheet(hooks = {}, onScreenshot = () => {}) {
    const { root, cleanup } = mount('<div id="body"></div>');
    const settings = createSettings({ storage: { getItem: () => null, setItem() {} }, root });
    const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, hooks, version: APP_VERSION, onScreenshot });
    const body = root.querySelector('#body');
    menus.settings(body, { close() {} });
    return { body, root, cleanup, menus };
  }
  it('Options has Sound, Display, Controls, Help and Saves as collapsible sections, then About last, then the version', () => {
    const r = settingsSheet({ exportCity() {} });
    try {
      const kids = [...r.body.children];
      expect(kids.slice(0, 5).map((n) => [n.tagName, n.querySelector('summary').textContent])).toEqual([['DETAILS', 'Sound'], ['DETAILS', 'Display'], ['DETAILS', 'Controls'], ['DETAILS', 'Help'], ['DETAILS', 'Saves']]);   // fix wave (ruling 1879): the words are the summary's own; an h3 inside a summary is flattened by its button role
      expect(kids[5].matches('details.options-about')).toBe(true);
      expect(kids[6].className).toBe('options-version');
      expect(kids.slice(0, 5).every((n) => n.open)).toBe(true);
      expect(Boolean(r.body.querySelector('.options-group.help .choice.help'))).toBe(true);
      expect(r.body.querySelector('.options-group.controls .choice.help')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('Screenshot mode is a button in Display', () => {
    let entered = 0;
    const r = settingsSheet({}, () => { entered++; });
    try {
      const b = r.body.querySelector('.options-group.display .screenshot-mode');
      expect(b.textContent).toBe(T.screenshotMode);
      fire(b, 'click');
      expect(entered).toBe(1);
    } finally { r.cleanup(); }
  });
  it('the game\'s menu and the City summary have no Screenshot mode', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'menu'));
      expect(r.root.querySelector('#sheet .screenshot-mode')).toBe(null);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(r.root.querySelector('#sheet .screenshot-mode')).toBe(null);
      r.store.set(openSheet(r.store.get(), 'settings'));
      expect(Boolean(r.root.querySelector('#sheet .options-group.display .screenshot-mode'))).toBe(true);
    } finally { r.cleanup(); }
  });
  it('the toast is parchment with an ink outline, and New city\'s replace note is amber', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.toasts.show('Hello');
      const cs = getComputedStyle(r.root.querySelector('.toast'));
      expect([cs.backgroundImage, cs.boxShadow.includes('inset')]).toEqual(['none', true]);
      r.store.set(openSheet(r.store.get(), 'newCity'));
      const note = r.root.querySelector('#sheet .replace-note');
      expect(Boolean(note)).toBe(true);
      const nc = getComputedStyle(note);
      expect([nc.borderTopWidth, nc.backgroundColor === 'rgba(0, 0, 0, 0)']).toEqual(['1px', false]);
    } finally { r.cleanup(); }
  });
});
