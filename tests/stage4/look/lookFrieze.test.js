// Track H, task H2: the frieze, the cartouches and the title card's glyph (spec 6.9, rulings 276-277). The frieze lies along
// the top bar's lower edge and each sheet's head, 4 px, inside the heights they had; a sheet's title and the city's name sit
// in cartouches in the serif display face, each tie flush inside its outline's end, and section titles get a quieter serif rule
// (the controller's ruling 18); one glyph, on the title card, hidden from screen readers; nothing in the look moves.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { LOOK_TOKENS, SERIF, cssRgb } from './lookTokens.js';
import { TOKENS } from '../../../src/ui/theme.js';

const SIZES = [[390, 844], [844, 390], [1280, 800]];
const TEXT_SIZES = [100, 150];
const pseudo = (el, which) => getComputedStyle(el, which);
// The look switched off for a moment: what each box measures without the frieze and the cartouche.
const PLAIN = '#topbar::after, #sheet .head::after { display: none !important; } #sheet .head h2 { padding: 0 !important; box-shadow: none !important; }';
function heightsWithout(root, sels) {
  const style = document.createElement('style');
  style.textContent = PLAIN;
  document.head.append(style);
  try { return sels.map((s) => root.querySelector(s).getBoundingClientRect().height); } finally { style.remove(); }
}
const heights = (root, sels) => sels.map((s) => root.querySelector(s).getBoundingClientRect().height);

describe('s4 look frieze and cartouches', () => {
  it('runs a 4 px frieze of lapis, gold, terracotta and turquoise along the top bar and each sheet\'s head, inside their heights', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      for (const [w, h] of SIZES) {
        r.resize(w, h);
        for (const ts of TEXT_SIZES) {
          r.ui.settings.set({ textSize: ts });
          r.store.set(openSheet(r.store.get(), 'summary'));
          const at = `${w}x${h} ${ts}%`;
          for (const sel of ['#topbar', '#sheet .head']) {
            const box = r.root.querySelector(sel), f = pseudo(box, '::after');
            expect([at, sel, f.content, f.height, f.bottom, getComputedStyle(box).borderBottomWidth, f.zIndex]).toEqual([at, sel, '""', '4px', '-1px', '1px', '-1']);
            const colours = [LOOK_TOKENS.lapis, TOKENS.gold, LOOK_TOKENS.terracotta, LOOK_TOKENS.turquoise, TOKENS.ink].map((c) => f.backgroundImage.includes(cssRgb(c)));
            expect([at, sel, colours]).toEqual([at, sel, [true, true, true, true, true]]);
          }
          const sels = ['#topbar', '#sheet .head', '#under-bar'];
          expect([at, heights(r.root, sels)]).toEqual([at, heightsWithout(r.root, sels)]);
          const top = r.root.querySelector('#under-bar').getBoundingClientRect().top;
          r.store.set(openSheet(r.store.get(), 'menu'));
          expect([at, r.root.querySelector('#under-bar').getBoundingClientRect().top]).toEqual([at, top]);
        }
      }
    } finally { r.cleanup(); }
  });

  it('puts a sheet\'s title in a cartouche whose tie joins it, gives section titles a quieter serif rule, and keeps body text in the system sans', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const h2 = r.root.querySelector('#sheet .head h2'), h3 = r.root.querySelector('#sheet .body h3');
      const cs = getComputedStyle(h2), tie = pseudo(h2, '::after');
      expect([cs.fontFamily, cs.boxShadow.startsWith(cssRgb(TOKENS.inkSoft)) && cs.boxShadow.includes('inset'), parseFloat(cs.borderTopLeftRadius) >= h2.getBoundingClientRect().height / 2]).toEqual([SERIF, true, true]);
      // Ruling 18 and the art-direction review (5): the tie joins the outline or goes. Stage 4.6 (UX ruling 405) made both ends round; fix round 1
      // (ruling 409) moved the tie onto the loop's end; the final review (ruling 450) found it still read as a text cursor, so it went: the round
      // loop alone is the cartouche (tests/stage46/final/riverux.test.js holds the finding).
      const box = h2.getBoundingClientRect();
      expect(tie.content).toBe('none');
      expect(parseFloat(cs.borderTopRightRadius) >= box.height / 2 - 0.5).toBe(true);   // a round end, like the start
      // A section title is no cartouche: the serif face at a normal weight, no outline, a thin ink rule after its words.
      const h3cs = getComputedStyle(h3), rule = pseudo(h3, '::after');
      expect([h3cs.fontFamily, h3cs.fontWeight, h3cs.boxShadow, rule.content, rule.height, rule.backgroundColor]).toEqual([SERIF, '400', 'none', '""', '1px', cssRgb(LOOK_TOKENS.inkLine)]);
      // The cartouche hugs its words: the head's ✕ keeps its place at the far end.
      const head = r.root.querySelector('#sheet .head').getBoundingClientRect(), close = r.root.querySelector('#sheet .head .close').getBoundingClientRect();
      expect([Math.round(head.right - close.right) <= 8, h2.getBoundingClientRect().right < close.left]).toEqual([true, true]);
      const body = r.root.querySelector('#sheet .body .row');
      expect(getComputedStyle(body).fontFamily).toBe(getComputedStyle(document.documentElement).getPropertyValue('--font').trim());
    } finally { r.cleanup(); }
  });

  it('gives the title card its frieze, the city\'s name in a cartouche and one ankh hidden from screen readers', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const container = r.root.querySelector('#title');
      const card = createTitleCard({ container, hasSave: false, onContinue: () => {}, onNewCity: () => {}, onSound: () => {} });
      const h1 = card.element.querySelector('h1');
      expect([h1.textContent, getComputedStyle(h1).fontFamily, pseudo(card.element, '::before').height]).toEqual(['Thebes', SERIF, '4px']);
      expect(pseudo(h1, '::after').content).toBe('none');                                    // no tie after the name (ruling 450): it read as a caret
      const glyph = pseudo(h1, '::before');
      expect([glyph.content, glyph.backgroundImage.startsWith('url("data:image/svg+xml'), parseFloat(glyph.width) > 0]).toEqual(['""', true, true]);
      expect(r.root.querySelector('#title').textContent.includes('☥')).toBe(false);              // the glyph is a picture, never a word
      const images = [...card.element.querySelectorAll('*'), card.element].flatMap((el) => ['::before', '::after'].map((p) => pseudo(el, p).backgroundImage)).filter((b) => b.includes('url('));
      expect(images.length).toBe(1);
      // The name still fits a 375 px phone at 150% text, inside the card.
      r.resize(375, 667);
      r.ui.settings.set({ textSize: 150 });
      const box = card.element.getBoundingClientRect(), name = h1.getBoundingClientRect();
      expect([name.left >= box.left, name.right + 4 <= box.right]).toEqual([true, true]);
      card.element.remove();
      container.hidden = true;
    } finally { r.cleanup(); }
  });

  it('keeps sheet heads to one glyph at most, and nothing in the look moves', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      for (const kind of ['summary', 'menu', 'settings', 'help', 'minimap', 'goals']) {
        r.store.set(openSheet(r.store.get(), kind));
        const head = r.root.querySelector('#sheet .head');
        const images = [head, ...head.querySelectorAll('*')].flatMap((el) => ['::before', '::after'].map((p) => pseudo(el, p).backgroundImage)).filter((b) => b.includes('url('));
        expect([kind, images.length <= 1]).toEqual([kind, true]);
      }
      const still = (el, p = null) => { const cs = getComputedStyle(el, p); return [cs.animationName, cs.transitionDuration]; };
      const h2 = r.root.querySelector('#sheet .head h2'), h3 = r.root.querySelector('#sheet .body h3') || h2;
      const parts = [[r.root.querySelector('#topbar'), '::after'], [r.root.querySelector('#sheet .head'), '::after'], [h2, null], [h2, '::after'], [h3, null], [h3, '::after']];
      for (const [el, p] of parts) expect(still(el, p)).toEqual(['none', '0s']);
    } finally { r.cleanup(); }
  });
});
