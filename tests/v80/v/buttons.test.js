// Version 8.0, Track V (ruling 1133, design rule 1): button weight. Exactly one filled style (primary, the deep blue Start the lesson wears), an outlined one (secondary), a plain-text one
// (tertiary) and coral only for a destructive confirm (danger). Other tracks give their buttons the class; the existing buttons that need one get it from the CSS. In the placing bar the
// tick is the only filled button: Flip/Straight, Undo and Cancel are neutral, and a chosen chip (a style, a route, one or an area) is shown by a soft fill and a ring, never a solid one.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createLessonCard } from '../../../src/ui/lessonCard.js';
import { TOKENS } from '../../../src/ui/theme.js';
import { LOOK_TOKENS, cssRgb } from '../../stage4/look/lookTokens.js';
import { openSheet } from '../../../src/ui/modes.js';

const LAPIS = cssRgb(LOOK_TOKENS.lapis), CORAL = cssRgb(TOKENS.coralText), PARCHMENT = cssRgb(TOKENS.parchment);
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const style = (el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopColor, underline: cs.textDecorationLine }; };
// Filled = a solid colour behind the words: not the linen, not see-through, and not the soft teal a chosen chip wears.
const SOFT = [TRANSPARENT, PARCHMENT, cssRgb(TOKENS.tealSoft)];
const filled = (el) => !SOFT.includes(getComputedStyle(el).backgroundColor);
const probe = (parent, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = 'Go'; parent.append(b); return b; };

describe('v80 v the four button weights', () => {
  it('gives primary the one fill (gold on lapis), secondary a lapis outline, tertiary underlined words and danger coral', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const host = r.root.querySelector('#ui');
      const primary = probe(host, 'primary'), secondary = probe(host, 'secondary'), tertiary = probe(host, 'tertiary'), danger = probe(host, 'danger');
      expect(style(primary).bg).toBe(LAPIS);
      expect([style(secondary).bg, style(secondary).border, style(secondary).color]).toEqual([TRANSPARENT, `2px ${LAPIS}`, LAPIS]);
      expect([style(tertiary).bg, style(tertiary).underline, style(tertiary).color]).toEqual([TRANSPARENT, 'underline', LAPIS]);
      expect(style(danger).bg).toBe(CORAL);
      for (const b of [primary, secondary, tertiary, danger]) {
        const box = b.getBoundingClientRect();
        expect([b.className, box.width >= 44, box.height >= 44]).toEqual([b.className, true, true]);   // a plain-text button keeps its 44 px box
      }
      expect([filled(secondary), filled(tertiary)]).toEqual([false, false]);
      for (const b of [primary, secondary, tertiary, danger]) b.remove();
    } finally { r.cleanup(); }
  });

  it('draws the title card\'s Settings and What\'s new outlined and its Skip a plain link, under the one filled Start', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const container = r.root.querySelector('#title');
      const title = createTitleCard({ container, hasSave: false, onContinue: () => {}, onNewCity: () => {}, onSound: () => {}, onLesson: () => {}, renderSettings: () => document.createElement('div'), lesson: { due: true, onSkip: () => {}, partWay: false } });
      const q = (s) => title.element.querySelector(s);
      expect(style(q('.lesson-start')).bg).toBe(LAPIS);
      for (const s of ['.title-settings', '.whats-new-button']) expect([s, style(q(s)).bg, style(q(s)).border]).toEqual([s, TRANSPARENT, `2px ${LAPIS}`]);
      expect([style(q('.lesson-skip')).bg, style(q('.lesson-skip')).underline]).toEqual([TRANSPARENT, 'underline']);
      const buttons = [...title.element.querySelectorAll('.title-buttons button')].filter((b) => b.offsetParent);
      expect(buttons.filter(filled).length).toBe(1);                                              // one filled button on the card
      title.element.remove();
      container.hidden = true;
    } finally { r.cleanup(); }
  });

  it('draws the lesson card\'s Leave outlined and its Skip a plain link, under the one filled Go', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const card = createLessonCard({ root: r.root, store: r.store, onGo() {}, onLeave() {}, onSkip() {} });
      card.show({ label: 'Step 1 of 14', words: 'Lay a road from the gate.', goLabel: 'Show me', picture: null, skipOffered: true });
      const q = (s) => r.root.querySelector(`.lesson-card ${s}`);
      expect(style(q('.lc-go')).bg).toBe(LAPIS);
      expect([style(q('.lc-leave')).bg, style(q('.lc-leave')).border]).toEqual([TRANSPARENT, `2px ${LAPIS}`]);
      expect([style(q('.lc-skip')).bg, style(q('.lc-skip')).underline]).toEqual([TRANSPARENT, 'underline']);
      card.destroy();
    } finally { r.cleanup(); }
  });

  it('draws a dialog\'s Cancel outlined, its OK coral when it destroys something and lapis when it does not', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set({ confirmDialog: { text: 'Demolish the granary?', confirmLabel: 'Demolish' } });
      expect(style(r.root.querySelector('#dialog .cancel')).border).toBe(`2px ${LAPIS}`);
      expect(style(r.root.querySelector('#dialog .ok')).bg).toBe(CORAL);
      r.store.set({ confirmDialog: { text: 'Enlarge the palace?', confirmLabel: 'Enlarge', destructive: false } });
      expect([r.root.querySelector('#dialog .ok').classList.contains('primary'), style(r.root.querySelector('#dialog .ok')).bg]).toEqual([true, LAPIS]);
      expect(contrastIn(r.root.querySelector('#dialog .ok'), r.root.querySelector('#dialog .ok'))).toBeGreaterThanOrEqual(4.5);
      r.store.set({ confirmDialog: null });
    } finally { r.cleanup(); }
  });

  it('leaves the placing bar one filled button, the tick, whatever else it carries', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const bar = r.root.querySelector('#confirm');
      r.ui.placement.start({ kind: 'building', type: 'well' });
      // A road bar carries Flip; add the chips a bar can carry, pressed, so the test sees how each is drawn (the markup is the bar's own).
      const row = bar.querySelector('.confirm');
      const flip = probe(row, 'flip'), rotate = probe(row, 'rotate');
      const chips = ['style-pick', 'area-pick', 'area-toggle', 'route-pick'].map((c) => { const b = probe(row, c); b.setAttribute('aria-pressed', 'true'); return b; });
      const buttons = [...row.querySelectorAll('button')].filter((b) => b.offsetParent);
      const solid = buttons.filter(filled).map((b) => b.className);
      expect(solid).toEqual(['ok primary']);
      for (const b of [flip, rotate, bar.querySelector('.cancel'), bar.querySelector('.undo')].filter(Boolean)) expect([b.className, style(b).bg]).toEqual([b.className, PARCHMENT]);
      for (const c of chips) expect([c.className, style(c).bg]).toEqual([c.className, cssRgb(TOKENS.tealSoft)]);
      for (const c of chips) expect(contrastIn(c, c) >= 4.5).toBe(true);
      for (const b of [flip, rotate, ...chips]) b.remove();
      r.ui.placement.cancel();
    } finally { r.cleanup(); }
  });

  it('keeps a sheet row\'s own primary action outlined, so the sheet keeps one filled button', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const li = document.createElement('li');
      const b = probe(li, 'primary');
      r.root.querySelector('#sheet .body').append(li);
      expect([style(b).bg, style(b).color]).toEqual([PARCHMENT, LAPIS]);
      li.remove();
    } finally { r.cleanup(); }
  });
});
