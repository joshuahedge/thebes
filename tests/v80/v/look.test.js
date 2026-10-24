// Version 8.0, Track V (rulings 1130-1134): the look. The patterned band is 6 px (it was 4), and it is the frame of every panel and pop-up: sheets (on the head), the title card (which
// holds What's new, Options and the new-city card), dialogs, the lesson card, the placing bar and toasts all wear the same band on their top edge over their linen; a title in a panel
// is a cartouche; the top bar keeps its band, still fits a 375 px phone at 150% text, and every text pair on the new frames reads at 4.5:1 or more.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createLessonCard } from '../../../src/ui/lessonCard.js';
import { TOKENS, contrastRatio } from '../../../src/ui/theme.js';
import { LOOK_TOKENS, SERIF, cssRgb } from '../../stage4/look/lookTokens.js';

const BAND = '100% 1px, 100% 6px';
const COLOURS = [LOOK_TOKENS.lapis, TOKENS.gold, LOOK_TOKENS.terracotta, LOOK_TOKENS.turquoise, TOKENS.ink];
const wearsBand = (el) => {
  const cs = getComputedStyle(el);
  return { size: cs.backgroundSize.startsWith(BAND), colours: COLOURS.every((c) => cs.backgroundImage.includes(cssRgb(c))), positionedAtTop: cs.backgroundPosition.startsWith('0px 5px, 0px 0px') };
};
const BANDED = { size: true, colours: true, positionedAtTop: true };
const SIZES = [[390, 844], [1280, 800]];

describe('v80 v the band is 6 px and is the frame of every panel', () => {
  it('is 6 px, one and a half times the 4 px it was, with each colour block taking 15 px of every 16', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const root = getComputedStyle(document.documentElement);
      expect(root.getPropertyValue('--band-h').trim()).toBe('6px');
      const f = getComputedStyle(r.root.querySelector('#topbar'), '::after');
      expect([f.height, f.bottom, f.zIndex]).toEqual(['6px', '-1px', '-1']);
      const blocks = root.getPropertyValue('--band-blocks');
      expect([blocks.includes('15px 16px'), blocks.includes('31px 32px'), blocks.includes('63px 64px')]).toEqual([true, true, true]);
    } finally { r.cleanup(); }
  });

  it('is on the top edge of a sheet\'s head, a dialog, the placing bar and a toast, at a phone and a desktop size', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      for (const [w, h] of SIZES) {
        r.resize(w, h);
        const at = `${w}x${h}`;
        for (const kind of ['summary', 'settings', 'help', 'menu', 'goals']) {
          r.store.set(openSheet(r.store.get(), kind));
          expect([at, kind, wearsBand(r.root.querySelector('#sheet .head'))]).toEqual([at, kind, BANDED]);
        }
        r.store.set({ confirmDialog: { text: 'Demolish the granary?', confirmLabel: 'Demolish' } });
        expect([at, 'dialog', wearsBand(r.root.querySelector('#dialog .box'))]).toEqual([at, 'dialog', BANDED]);
        r.store.set({ confirmDialog: null });
        r.ui.placement.start({ kind: 'building', type: 'well' });
        expect([at, 'bar', wearsBand(r.root.querySelector('#confirm .confirm'))]).toEqual([at, 'bar', BANDED]);
        r.ui.placement.cancel();
        r.ui.toasts.show('Well placed', { ms: 60000 });
        expect([at, 'toast', wearsBand(r.root.querySelector('#toasts .toast'))]).toEqual([at, 'toast', BANDED]);
      }
    } finally { r.cleanup(); }
  });

  it('is on the lesson card and the title card, whose panels (Options, What\'s new) share it', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const card = createLessonCard({ root: r.root, store: r.store, onGo() {}, onLeave() {} });
      card.show({ label: 'Step 1 of 14', words: 'Lay a road from the gate.', goLabel: 'Show me', picture: null });
      expect(wearsBand(card.element.querySelector('.lesson-card') || card.element)).toEqual(BANDED);
      card.destroy();
      const container = r.root.querySelector('#title');
      const title = createTitleCard({ container, hasSave: true, onContinue: () => {}, onNewCity: () => {}, onSound: () => {}, renderSettings: () => document.createElement('div') });
      expect(wearsBand(title.element)).toEqual(BANDED);
      title.element.remove();
      container.hidden = true;
    } finally { r.cleanup(); }
  });

  it('puts a panel\'s title in the serif cartouche: the title card\'s Options and What\'s new headings, and anything marked frame-title', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const container = r.root.querySelector('#title');
      const title = createTitleCard({ container, hasSave: true, onContinue: () => {}, onNewCity: () => {}, onSound: () => {}, renderSettings: () => document.createElement('div') });
      const tag = document.createElement('h2');
      tag.className = 'frame-title';
      tag.textContent = 'Anything';
      title.element.append(tag);
      const cs = getComputedStyle(tag);
      expect([cs.fontFamily, cs.boxShadow.includes('inset'), parseFloat(cs.borderTopLeftRadius) > 4]).toEqual([SERIF, true, true]);
      expect(contrastIn(tag, title.element)).toBeGreaterThanOrEqual(4.5);
      title.element.remove();
      container.hidden = true;
    } finally { r.cleanup(); }
  });

  it('keeps room under the band: no framed box lets its first line touch it', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const head = r.root.querySelector('#sheet .head'), at = head.getBoundingClientRect().top;
      const kids = [...head.children].map((c) => c.getBoundingClientRect().top - at);
      expect(kids.every((k) => k >= 6)).toBe(true);
      r.store.set({ confirmDialog: { text: 'Demolish the granary?', confirmLabel: 'Demolish' } });
      const box = r.root.querySelector('#dialog .box');
      expect(parseFloat(getComputedStyle(box).paddingTop)).toBeGreaterThanOrEqual(6 + 8);
      r.store.set({ confirmDialog: null });
      r.ui.placement.start({ kind: 'building', type: 'well' });
      const bar = r.root.querySelector('#confirm .confirm');
      expect(parseFloat(getComputedStyle(bar).paddingTop)).toBeGreaterThanOrEqual(6 + 4);
      expect(bar.querySelector('.info').getBoundingClientRect().top - bar.getBoundingClientRect().top).toBeGreaterThanOrEqual(6);
    } finally { r.cleanup(); }
  });
});

describe('v80 v the band costs the top bar 3 px and nothing else', () => {
  it('still fits a 375 px phone at 150% text, and the panels start flush under it', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      for (const text of [100, 150]) {
        r.ui.settings.set({ textSize: text });
        const bar = r.root.querySelector('#topbar'), box = bar.getBoundingClientRect(), stats = bar.querySelector('.stats');
        expect([text, stats.scrollWidth <= stats.clientWidth + 1, [...bar.children].filter((c) => c.offsetParent).every((c) => c.getBoundingClientRect().left >= box.left - 0.5 && c.getBoundingClientRect().right <= box.right + 0.5)]).toEqual([text, true, true]);
        const scale = text / 100, expected = 48 * scale + 3 + 1;                       // the bar's content, the band's foot and the 1 px border
        expect([text, text === 100 ? Math.abs(box.height - expected) <= 1 : box.height >= expected - 1]).toEqual([text, true]);   // at 150% the numbers may wrap to a second row, as they did before
        const buttons = [...bar.querySelectorAll('button')].filter((b) => b.offsetParent);
        expect(buttons.every((b) => b.getBoundingClientRect().height >= 44)).toBe(true);
        expect(buttons.every((b) => b.getBoundingClientRect().bottom <= box.bottom - 4)).toBe(true);   // the band (6 px, 1 below the border) shows under every button but a tall wrapped stats row, which keeps the 3 px foot and the border (as 7.1.1 did)
      }
    } finally { r.cleanup(); }
  });

  it('reads at 4.5:1 or more: ink, lapis and amber text on the linen the frames lie over', () => {
    for (const [fg, bg] of [[TOKENS.ink, TOKENS.parchment], [LOOK_TOKENS.lapis, TOKENS.parchment], [TOKENS.amberText, TOKENS.parchment], [LOOK_TOKENS.lapisInk, LOOK_TOKENS.lapis], [TOKENS.ink, TOKENS.tealSoft], [TOKENS.inkSoft, TOKENS.parchment]]) {
      expect([fg, bg, contrastRatio(fg, bg) >= 4.5]).toEqual([fg, bg, true]);
    }
  });
});
