// Version 7.1, fix batch B (rulings 1067-1073): Settings' volume steppers and their silenced words, How to play as closed sections, a sheet's title for the screen reader and
// keyboard focus, the wide screen's number keys behind a sheet, the key names on the zoom buttons, the Map button and the menu's How to play row, and the road-first words.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire, key } from '../../helpers/dom.js';
import { tradeCity } from './helpers.js';
import { openSheet } from '../../../src/ui/modes.js';
import { ADVICE_FIX_TEXT, T } from '../../../src/ui/text.js';
import { V60_HELP, V70_HELP } from '../../../src/ui/text.js';
import { MAPS_HELP } from '../../../src/ui/v71/mapsText.js';
import { V71_HELP } from '../../../src/ui/v71/ferryText.js';

const tap = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };

describe('v71 fb settings: the volume steppers and the silenced words', () => {
  it('announces each step (a polite status named "N out of 100") and moves focus off a button that has just disabled itself', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ musicVolume: 80, effectsVolume: 20 });
      r.store.set(openSheet(r.store.get(), 'settings'));
      const row = r.root.querySelector('#sheet .music-volume:not(.effects-volume)');
      const value = row.querySelector('.value'), quieter = row.querySelector('.quieter'), louder = row.querySelector('.louder');
      expect([value.getAttribute('role'), value.getAttribute('aria-live'), value.getAttribute('aria-label'), value.textContent]).toEqual(['status', 'polite', '80 out of 100', '80']);
      louder.focus();
      const heard = [];
      for (let i = 0; i < 2; i++) { fire(louder, 'click'); heard.push([value.textContent, value.getAttribute('aria-label')]); }
      expect(heard).toEqual([['90', '90 out of 100'], ['100', '100 out of 100']]);
      expect([louder.disabled, document.activeElement === quieter]).toEqual([true, true]);   // focus is not stranded on the dead button
      fire(quieter, 'click');
      expect([louder.disabled, document.activeElement === quieter, value.textContent]).toEqual([false, true, '90']);   // focus stays where the player is
      const fx = r.root.querySelector('#sheet .effects-volume');
      const fq = fx.querySelector('.quieter'), fl = fx.querySelector('.louder');
      fq.focus();
      fire(fq, 'click');
      fire(fq, 'click');
      expect([fx.querySelector('.value').textContent, fq.disabled, document.activeElement === fl]).toEqual(['0', true, true]);
      expect([...tap(quieter), ...tap(louder), ...tap(fq), ...tap(fl)]).toEqual(Array(8).fill(true));
    } finally { r.cleanup(); }
  });

  it('says "On, silenced" on the Music switch and in the volume rows\' names while Sound is Off, and not once Sound is back On', async () => {
    const r = await rigUI();
    try {
      r.store.set(openSheet(r.store.get(), 'settings'));
      const state = () => r.root.querySelector('#sheet .switch.music .state').textContent;
      const names = () => [...r.root.querySelectorAll('#sheet .music-volume .stepper')].map((g) => g.getAttribute('aria-label'));
      expect([state(), names()]).toEqual(['On', ['Music volume', 'Effects volume']]);
      fire(r.root.querySelector('#sheet .switch.sound'), 'click');
      expect(r.ui.settings.get().sound).toBe(false);
      expect([state(), names()]).toEqual(['On, silenced', ['Music volume, silenced', 'Effects volume, silenced']]);
      fire(r.root.querySelector('#sheet .switch.music'), 'click');                      // Music Off: it says Off, there is nothing to silence
      expect(state()).toBe('Off');
      fire(r.root.querySelector('#sheet .switch.music'), 'click');
      expect(state()).toBe('On, silenced');
      fire(r.root.querySelector('#sheet .switch.sound'), 'click');
      expect([state().includes('silenced'), names()]).toEqual([false, ['Music volume', 'Effects volume']]);
    } finally { r.cleanup(); }
  });
});

describe('v71 fb how to play: closed sections', () => {
  it('is under four screens with every section closed, each summary at least 44 px and named by its heading, and a tap opens its text', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set(openSheet(r.store.get(), 'help'));
      const sheet = r.root.querySelector('#sheet');
      const sections = [...sheet.querySelectorAll('details.help-section')];
      const entries = [...Object.values(V60_HELP).flat(), ...Object.values(V70_HELP).flat(), ...MAPS_HELP, ...Object.values(V71_HELP).flat()];
      expect(sections.map((d) => d.querySelector('summary h3').textContent)).toEqual([T.shortcuts, T.gestures, ...entries.map((p) => p.head), T.goals, T.tips]);   // every entry, 7.1's Maps and Ferries included, in order
      expect(sections.length).toBeGreaterThan(25);
      expect(sections.every((d) => !d.open)).toBe(true);
      expect(sections.map((d) => Math.round(d.querySelector('summary').getBoundingClientRect().height)).filter((h) => h < 44)).toEqual([]);
      expect(sections.filter((d) => d.getBoundingClientRect().height > d.querySelector('summary').getBoundingClientRect().height + 1).length).toBe(0);   // a closed section is its summary and no more
      expect([sheet.scrollHeight < 4 * 667, sheet.scrollHeight]).toEqual([true, sheet.scrollHeight]);
      const trade = sections.find((d) => d.querySelector('h3').textContent === 'The Trade sheet');
      const summary = trade.querySelector('summary');
      summary.focus();
      summary.click();                                                                  // what Enter or Space on a summary does
      expect([trade.open, trade.getBoundingClientRect().height > summary.getBoundingClientRect().height + 1, document.activeElement === summary]).toEqual([true, true, true]);
      summary.click();
      expect(trade.open).toBe(false);
    } finally { r.cleanup(); }
  });
});

describe('v71 fb sheets: a title for the screen reader, focus from the keyboard', () => {
  const summaryTrade = (r) => {
    r.store.set(openSheet(r.store.get(), 'summary'));
    return r.root.querySelector('#sheet .open-trade');
  };
  it('labels #sheet with its own title and puts keyboard focus on it when the keyboard opened it', async () => {
    const { w } = tradeCity();
    const r = await rigUI({ world: w });
    try {
      const sheet = r.root.querySelector('#sheet');
      const opener = summaryTrade(r);
      expect(sheet.getAttribute('aria-label')).toBe('City summary');
      opener.focus();
      fire(opener, 'keydown', { key: 'Enter' });
      fire(opener, 'click');                                                            // detail 0: what Enter on a button sends
      expect([r.store.get().sheet.kind, sheet.getAttribute('aria-label'), sheet.querySelector('h2').textContent]).toEqual(['trade', 'Trade', 'Trade']);
      expect([sheet.contains(document.activeElement), document.activeElement === sheet.querySelector('h2')]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });

  it('leaves focus alone when a pointer opened it, and when the game opened it by itself', async () => {
    const { w } = tradeCity();
    const r = await rigUI({ world: w });
    try {
      const sheet = r.root.querySelector('#sheet');
      const opener = summaryTrade(r);
      fire(opener, 'pointerdown');
      fire(opener, 'click', { detail: 1 });
      expect([sheet.getAttribute('aria-label'), document.activeElement === sheet.querySelector('h2')]).toEqual(['Trade', false]);
      await new Promise((resolve) => setTimeout(resolve, 20));
      r.store.set(openSheet(r.store.get(), 'about'));                                   // no input at all
      expect([sheet.getAttribute('aria-label'), document.activeElement === sheet.querySelector('h2')]).toEqual(['About', false]);
    } finally { r.cleanup(); }
  });
});

describe('v71 fb keys: number keys, key names, words', () => {
  it('leaves the build category alone while a sheet is open on a wide screen, and changes it with none open', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expect(r.store.get().layout).toBe('wide');
      const start = r.store.get().category;
      const k = ['1', '2', '3', '4', '5', '6', '7'].find((c) => { key(r.root, c); const moved = r.store.get().category !== start; r.store.set({ category: start }); return moved; });
      expect(Boolean(k)).toBe(true);                                                           // with no sheet open a number key changes it
      r.store.set(openSheet(r.store.get(), 'trade'));
      key(r.root, k);
      expect([r.store.get().category, r.store.get().sheet.kind]).toEqual([start, 'trade']);
      r.store.set({ sheet: null });
      key(r.root, k);
      expect(r.store.get().category !== start).toBe(true);                                   // and again once it is closed
    } finally { r.cleanup(); }
  });

  it('names its key on the zoom buttons (+ and -), the Map button (M) and the menu\'s How to play row (?), and drops them with single keys off', async () => {
    const r = await rigUI();
    try {
      const hints = () => {
        const map = r.root.querySelector('#corners .minimap-button');
        r.store.set(openSheet(r.store.get(), 'minimap'));
        const zin = r.root.querySelector('#sheet .zoom-in'), zout = r.root.querySelector('#sheet .zoom-out');
        r.store.set(openSheet(r.store.get(), 'menu'));
        const how = r.root.querySelector('#sheet .how-to-play-row');
        return [map, zin, zout, how].map((b) => b.getAttribute('aria-keyshortcuts'));
      };
      expect(hints()).toEqual(['M', '+', '-', '?']);
      r.ui.settings.set({ keyboardShortcuts: false });
      expect(hints()).toEqual([null, null, null, null]);
    } finally { r.cleanup(); }
  });

  it('words the road-first tower fix as the spot Show me marks, not "here"', () => {
    const fix = ADVICE_FIX_TEXT.roadFirst(7, 2, 120);
    expect(fix).toBe('Lay a road to the spot Show me marks (7 tiles), then build 2 towers (≈ 120 gold)');
    expect([fix.includes('Show me marks'), /\bhere\b/.test(fix)]).toEqual([true, false]);
  });
});
