// Track H, task H1: the look's tokens and base (spec 6.9, rulings 276-277): papyrus tones with a faint fibre drawn in
// CSS, the serif display stack as a token, gold on lapis for the one main action, an ink outline on every other button.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { TOKENS, TEXT_PAIRS, contrastRatio, luminance } from '../../../src/ui/theme.js';
import { CATEGORY_TINT } from '../../../src/data/ui.js';
import { openSheet, startTool, pickCategory } from '../../../src/ui/modes.js';
import { LOOK_TOKENS, SERIF, cssName, cssRgb, blend, fibreLayers } from './lookTokens.js';

const rootVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

describe('s4 look tokens and base', () => {
  it('keeps the look\'s tokens in the stylesheet: gold on lapis at about 8:1, lapis words at 4.5:1, outlines at 3:1', async () => {
    const css = (await (await fetch('/css/ui.css')).text()).toUpperCase();
    const missing = Object.entries(LOOK_TOKENS).filter(([name, hex]) => !css.includes(`${cssName(name).toUpperCase()}: ${hex}`)).map(([n]) => n);
    expect(missing).toEqual([]);
    const r = await rigUI({ width: 390, height: 844 });   // the stylesheet is on the page from here
    try {
      expect(rootVar('--serif')).toBe(SERIF);
      const ratio = contrastRatio(LOOK_TOKENS.lapisInk, LOOK_TOKENS.lapis);
      expect([ratio >= 7.5, ratio <= 9]).toEqual([true, true]);                                   // "about 8:1"
      expect(contrastRatio(LOOK_TOKENS.lapis, TOKENS.parchment)).toBeGreaterThanOrEqual(4.5);     // a row's action: lapis on papyrus
      // An outline is a boundary, not text: 3:1 against the surfaces buttons sit on (WCAG 1.4.11).
      for (const bg of ['parchment', 'parchment2']) expect([bg, contrastRatio(LOOK_TOKENS.inkLine, TOKENS[bg]) >= 3]).toEqual([bg, true]);
    } finally { r.cleanup(); }
  });

  it('lays the fibre on every surface of the chrome, and its darkest point keeps every text pair at 4.5:1', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const layers = fibreLayers(rootVar('--look-fibre'));
      expect(layers.length).toBeGreaterThanOrEqual(2);
      const dark = layers.filter((l) => l.stroke && luminance(l.stroke) < luminance(TOKENS.parchment));
      expect(dark.length).toBe(1);                                                   // one darker layer; the rest lighten
      expect(dark[0].opacity <= 0.1).toBe(true);                                     // faint
      for (const bg of ['parchment', 'parchment2']) {
        const worst = blend(TOKENS[bg], dark[0].stroke, dark[0].opacity);
        const failing = TEXT_PAIRS.filter(([, b]) => b === bg).map(([fg]) => [fg, bg, contrastRatio(TOKENS[fg], worst)]).filter(([, , c]) => c < 4.5);
        expect(failing).toEqual([]);
      }
      const fibred = (sel) => [sel, getComputedStyle(r.root.querySelector(sel)).backgroundImage.includes('data:image/svg+xml')];
      expect(['#topbar', '#dock', '#panel', '#rail'].map(fibred)).toEqual(['#topbar', '#dock', '#panel', '#rail'].map((s) => [s, true]));
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect([fibred('#sheet'), fibred('#sheet .head')]).toEqual([['#sheet', true], ['#sheet .head', true]]);
      r.store.set(startTool(r.store.get(), { kind: 'building', type: 'well' }));
      expect(fibred('#confirm .confirm')).toEqual(['#confirm .confirm', true]);
    } finally { r.cleanup(); }
  });

  it('gives the main action gold on lapis, a row\'s action lapis in an outline, and every other button an ink outline', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(startTool(r.store.get(), { kind: 'building', type: 'well' }));
      const ok = r.root.querySelector('#confirm .ok');
      const cs = getComputedStyle(ok);
      expect([ok.classList.contains('primary'), cs.backgroundColor, cs.color]).toEqual([true, cssRgb(LOOK_TOKENS.lapis), cssRgb(LOOK_TOKENS.lapisInk)]);
      const cancel = [...r.root.querySelectorAll('#confirm button')].find((b) => !b.classList.contains('primary'));
      expect(getComputedStyle(cancel).borderTopColor).toBe(cssRgb(LOOK_TOKENS.inkLine));
      // A sheet's list: each row's own action (here two goals' Show me) is lapis words in a lapis outline.
      r.store.set(openSheet(r.store.get(), 'summary'));
      const list = document.createElement('ul');
      list.innerHTML = '<li><button type="button" class="show-me primary">Show me</button></li><li><button type="button" class="show-me primary">Show me</button></li>';
      r.root.querySelector('#sheet .body').append(list);
      for (const b of list.querySelectorAll('button')) {
        const s = getComputedStyle(b);
        expect([s.backgroundColor, s.color, s.borderTopColor]).toEqual([cssRgb(TOKENS.parchment), cssRgb(LOOK_TOKENS.lapis), cssRgb(LOOK_TOKENS.lapis)]);
        expect(contrastIn(b, b)).toBeGreaterThanOrEqual(4.5);
      }
      // ✕ is an ordinary button; a quiet one (the top bar's numbers) stays without an edge; Demolish stays coral.
      expect(getComputedStyle(r.root.querySelector('#sheet .close')).borderTopColor).toBe(cssRgb(LOOK_TOKENS.inkLine));
      expect(getComputedStyle(r.root.querySelector('#topbar .stats')).borderTopColor).toBe('rgba(0, 0, 0, 0)');
      const danger = document.createElement('button');
      danger.className = 'danger';
      danger.textContent = 'Demolish';
      r.root.querySelector('#sheet .body').append(danger);
      expect(getComputedStyle(danger).backgroundColor).toBe(cssRgb(TOKENS.coralText));
    } finally { r.cleanup(); }
  });

  it('leaves the category tints and the teal of a chosen tab as they were (they carry meaning)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const cats = [...r.root.querySelectorAll('#dock .cat[data-category]')];
      expect(cats.length).toBeGreaterThan(0);
      for (const c of cats) expect([c.dataset.category, getComputedStyle(c).backgroundImage.includes(cssRgb(CATEGORY_TINT[c.dataset.category]))]).toEqual([c.dataset.category, true]);
      r.resize(1280, 800);
      r.store.set(pickCategory(r.store.get(), 'food'));
      const pressed = r.root.querySelector('#panel .tab[aria-pressed="true"]');
      expect(getComputedStyle(pressed).backgroundColor).toBe(cssRgb(TOKENS.teal));
    } finally { r.cleanup(); }
  });
});
