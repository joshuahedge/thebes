// Version 10.0.1, Track U (rulings 2343-2349): keys you can see (badges, card keys) and Options > Keys (rebinding, clashes, reset, kept across a reload).
import { describe, it, expect } from '../../harness.js';
import { mount, key, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { createSettings } from '../../../src/ui/settings.js';
import { effectiveKeys, clashOf, rebind } from '../../../src/ui/v1001/keymap.js';
import { createKeyboard, matchKey } from '../../../src/ui/keyboard.js';
import { openSheet } from '../../../src/ui/modes.js';
import { KEYS } from '../../../src/data/ui.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { fakeLocal } from '../../helpers/fakeStorage.js';
import { V1001U_TEXT as K } from '../../../src/ui/text.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const tabButtons = (r) => [...r.root.querySelectorAll(r.store.get().layout === 'wide' ? '#panel .tab' : '#dock .cat')];
const cardButtons = (r) => [...r.root.querySelectorAll(r.store.get().layout === 'wide' ? '#panel .cards .card' : '#dock .tray .card')].filter((b) => !b.classList.contains('locked'));

describe('v1001 u keys: tabs and cards', () => {
  it('opens the second tab with 2 when no cards are open, then picks the second card with 2 (wide)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      expect(r.store.get().cardKeys).toBe(undefined);
      key(r.root, '2');
      const second = CATEGORIES.filter((c) => r.root.querySelector(`#panel .tab[data-category="${c.id}"]`))[1];
      expect(r.store.get().category).toBe(second.id);
      expect(r.store.get().cardKeys).toBe(true);
      const cards = cardButtons(r);
      expect(cards.length > 1).toBe(true);
      key(r.root, '2');                                                  // cards are open now: the second card, not the second tab
      expect(r.store.get().category).toBe(second.id);
      expect(r.store.get().tool && r.store.get().tool.type !== undefined || Boolean(r.store.get().tool)).toBe(true);
      expect(r.store.get().mode === 'placing' || r.store.get().mode === 'tool' || r.store.get().tool !== null).toBe(true);
    } finally { r.cleanup(); }
  });
  it('lets go of the card keys on Esc, and 1-7 open tabs again (wide)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      key(r.root, '2');
      expect(r.store.get().cardKeys).toBe(true);
      key(r.root, 'Escape');                                             // puts a tool away if one is held (none here), else lets go of the cards
      expect(r.store.get().cardKeys).toBe(false);
      key(r.root, '1');
      expect(r.store.get().category).toBe(CATEGORIES[0].id);
      expect(r.store.get().cardKeys).toBe(true);
    } finally { r.cleanup(); }
  });
  it('picks a card with a digit while the phone dock tray is open, and opens the tab with the digit while it is shut (390 x 844)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.renderer.renderFrame = () => {};
      expect(r.store.get().dock === 'tray').toBe(false);
      key(r.root, '1');
      expect(r.store.get().dock).toBe('tray');
      expect(r.store.get().category).toBe(CATEGORIES[0].id);
      key(r.root, '1');                                                  // the first card of the tray: the road tool
      expect(r.store.get().tool !== null).toBe(true);
    } finally { r.cleanup(); }
  });
  it('shows each tab\'s key as a badge and in its tooltip with a fine pointer, and each card\'s number while cards are open', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    const was = window.matchMedia;
    try {
      r.renderer.renderFrame = () => {};
      r.ui.keyBadges.decorate();
      const tabs = tabButtons(r);
      expect(tabs.length > 2).toBe(true);
      const keysShown = tabs.map((b) => (b.querySelector('.key-badge.tab-key') || {}).textContent);
      expect(keysShown.every((k, i) => typeof k === 'string' && k.length > 0)).toBe(true);
      expect(tabs[0].title.endsWith('(1)')).toBe(true);
      expect(r.root.querySelectorAll('.card .key-badge').length).toBe(0);  // no cards open for keys yet
      key(r.root, '1');
      await tick();
      const badges = [...r.root.querySelectorAll('#panel .cards .card .key-badge.card-key')];
      expect(badges.map((b) => b.textContent).slice(0, 2)).toEqual(['1', '2']);
    } finally { window.matchMedia = was; r.cleanup(); }
  });
  it('shows no badge and no key tooltip with a coarse pointer, or with Single keys off', async () => {
    const was = window.matchMedia;
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      key(r.root, '1');
      await tick();
      expect(r.root.querySelectorAll('.key-badge').length).toBe(0);
      expect(tabButtons(r).every((b) => !b.title)).toBe(true);
    } finally { window.matchMedia = was; r.cleanup(); }
    const r2 = await rigUI({ width: 1280, height: 800 });
    try {
      r2.ui.settings.set({ keyboardShortcuts: false });
      r2.ui.keyBadges.decorate();
      expect(r2.root.querySelectorAll('.key-badge').length).toBe(0);
    } finally { r2.cleanup(); }
  });
});

describe('v1001 u keys: rebinding', () => {
  it('keeps the defaults for an older save and ignores unknown actions', () => {
    expect(effectiveKeys(undefined)).toEqual(effectiveKeys({}));
    expect(effectiveKeys({ nonsense: ['x'] }).pause).toEqual(KEYS.pause);
    expect(effectiveKeys({ category: ['a'] }).category).toEqual(KEYS.category);   // a tab list of the wrong length is ignored
    const m = effectiveKeys({ pause: ['p', 'P'] });
    expect(m.pause).toEqual(['p', 'P']);
    expect(effectiveKeys({ back: ['q', 'Q'] }).back.includes('Escape')).toBe(true);   // Esc cannot be given away
  });
  it('rebinds pause to P: P pauses, Space no longer does, and Reset restores Space', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.world.speed = 1;
      r.ui.settings.set({ keyBindings: { pause: ['p', 'P'] } });
      key(r.root, ' ');
      expect(r.world.speed).toBe(1);
      key(r.root, 'p');
      expect(r.world.speed).toBe(0);
      key(r.root, 'P');
      expect(r.world.speed > 0).toBe(true);
      r.ui.settings.set({ keyBindings: {} });
      const before = r.world.speed;
      key(r.root, ' ');
      expect(r.world.speed).toBe(0);
      expect(before > 0).toBe(true);
    } finally { r.cleanup(); }
  });
  it('refuses a key another action holds, naming it (the key is not taken)', () => {
    const map = effectiveKeys({});
    expect(clashOf(map, 'pause', 'm')).toEqual({ action: 'minimap', slot: null });
    expect(clashOf(map, 'pause', 'M').action).toBe('minimap');          // either case
    expect(clashOf(map, 'pause', 'p')).toBe(null);
    expect(clashOf(map, 'card', '1', 0)).toBe(null);                    // the tab keys and the card keys share their digits
    expect(clashOf(map, 'card', '2', 0)).toEqual({ action: 'card', slot: 1 });
    expect(clashOf(map, 'card', 'r').action).toBe('rotate');
    expect(clashOf(map, 'category', '3', 0)).toEqual({ action: 'category', slot: 2 });   // and a list's own slots do not repeat a key
    expect(rebind({}, 'pause', 'p')).toEqual({ pause: ['p', 'P'] });
    expect(rebind({ pause: ['p', 'P'] }, 'pause', ' ')).toEqual({});    // back to the default: nothing stored
  });
  it('binds from Options > Keys: Change listens, a clash is refused with its action named, a free key is taken, Reset restores', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.store.set(openSheet(r.store.get(), 'settings'));
      const group = r.root.querySelector('#sheet .keys-section');
      expect(Boolean(group)).toBe(true);
      const change = () => group.querySelector('.key-row-pause .key-change');
      const warning = () => group.querySelector('.key-warning').textContent;
      change().click();
      expect(change().textContent).toBe(K.listening);
      key(change(), 'm');                                               // the minimap's key
      expect(warning()).toBe(K.clash('M', K.actions.minimap));
      expect(r.ui.settings.get().keyBindings).toEqual({});
      expect(r.store.get().sheet.kind).toBe('settings');                // the key was swallowed: the minimap did not open
      key(change(), 'p');
      expect(r.ui.settings.get().keyBindings).toEqual({ pause: ['p', 'P'] });
      expect(group.querySelector('.key-row-pause .key-now').textContent).toBe('P');
      change().click();
      key(change(), 'Escape');                                          // Esc cancels the listen and leaves the sheet open
      expect(r.store.get().sheet.kind).toBe('settings');
      expect(r.ui.settings.get().keyBindings).toEqual({ pause: ['p', 'P'] });
      group.querySelector('.keys-reset').click();
      expect(r.ui.settings.get().keyBindings).toEqual({});
      expect(group.querySelector('.key-row-pause .key-now').textContent).toBe('Space');
    } finally { r.cleanup(); }
  });
  it('rebinds a tab key and a card key from Options', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.store.set(openSheet(r.store.get(), 'settings'));
      const group = r.root.querySelector('#sheet .keys-section');
      const slot = () => group.querySelectorAll('.key-row-category .key-change')[1];   // tab 2 (the rows are redrawn while listening, so it is looked up again)
      slot().click();
      key(slot(), 'q');
      expect(r.ui.settings.get().keyBindings.category[1]).toBe('q');
      r.store.set({ sheet: null, mode: 'browse' });
      key(r.root, 'q');
      expect(r.store.get().category).toBe(CATEGORIES.filter((c) => r.root.querySelector(`#panel .tab[data-category="${c.id}"]`))[1].id);
    } finally { r.cleanup(); }
  });
  it('survives a reload (settings stored) and loads the defaults when none are stored', () => {
    const storage = fakeLocal();
    const { root, cleanup } = mount();
    try {
      const a = createSettings({ storage, root, systemReducedMotion: () => false });
      a.set({ keyBindings: { pause: ['p', 'P'], category: ['a', '2', '3', '4', '5', '6', '7'] } });
      const b = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(b.get().keyBindings).toEqual({ pause: ['p', 'P'], category: ['a', '2', '3', '4', '5', '6', '7'] });
      const fresh = createSettings({ storage: fakeLocal(), root, systemReducedMotion: () => false });
      expect(fresh.get().keyBindings).toEqual({});
      const junk = fakeLocal();
      junk.setItem('thebes.settings', JSON.stringify({ keyBindings: 'x' }));
      expect(createSettings({ storage: junk, root, systemReducedMotion: () => false }).get().keyBindings).toEqual({});
    } finally { cleanup(); }
  });
  it('reads the effective map in createKeyboard (a stand-in settings with overrides)', () => {
    const { root, cleanup } = mount('<div id="t" tabindex="0"></div>');
    const log = [];
    const kb = createKeyboard({ target: root.querySelector('#t'), settings: { get: () => ({ keyBindings: { rotate: ['x', 'X'] } }) }, cam: { x: 0, y: 0, zoom: 1 }, cameraControl: null, actions: { rotate: () => log.push('rotate') } });
    try {
      key(root.querySelector('#t'), 'x');
      key(root.querySelector('#t'), 'r');
      expect(log).toEqual(['rotate']);
      expect(matchKey({ key: 'r' })).toBe('rotate');                       // the defaults are untouched
    } finally { kb.detach(); cleanup(); }
  });
});
