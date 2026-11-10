// Version 9.3 Track U (rulings 1975-1984): the title's decree card, the chip, the first screen and the end card at the three sizes (375x667 at 100%, 390x844 at 150%, 1280x800 at 100%) and at
// 200% text on the smallest phone. Rectangles are read against the shell they sit in (the test shell is parked off the page).
import { describe, it, expect } from '../../harness.js';
import { titleAt, frame, WITH_TOWN } from './page.js';

const W47 = '2026-47';
const sizes = [[375, 667, 100], [390, 844, 150], [1280, 800, 100], [375, 667, 200]];

describe('v93 u layout: phone and desktop, text at 100%, 150% and 200%', () => {
  for (const [width, height, textSize] of sizes) {
    it(`the title card, the chip, the first screen and the end card fit ${width}x${height} at ${textSize}% text`, async () => {
      // What the title card does with no decree card at this size and text: the card must be no worse than that (a 200% phone may already scroll its own buttons a little).
      const base = await titleAt({ width, height, textSize });
      const baseCard = base.root.querySelector('.title-card');
      const baseScrolls = baseCard.scrollWidth > baseCard.clientWidth + 1;
      base.cleanup();
      const t = await titleAt({ width, height, textSize, records: WITH_TOWN });
      try {
        const o = t.shell.root.getBoundingClientRect();
        const inside = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.left >= o.left - 1 && r.right <= o.right + 1; };
        const noSideScroll = (n) => n.scrollWidth <= n.clientWidth + 1;
        const card = t.root.querySelector('.title-card'), dc = t.root.querySelector('.decree-card'), go = t.root.querySelector('.decree-go');
        const cr = card.getBoundingClientRect(), over = [...card.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().width > 0 && n.getBoundingClientRect().right > cr.right + 1).map((n) => n.className || n.tagName).slice(0, 6).join(' ');
        expect(['title card', noSideScroll(card) || baseScrolls, inside(card), inside(dc), inside(go), over]).toEqual(['title card', true, true, true, true, '']);
        expect(go.getBoundingClientRect().height >= 43).toBe(true);
        t.api.startDecree(W47);
        await frame();
        expect(t.kind()).toBe('decree');
        const chip = t.root.querySelector('.decree-chip'), sheet = t.root.querySelector('#sheet');
        expect(['chip', inside(chip), chip.getBoundingClientRect().height >= 35]).toEqual(['chip', true, true]);
        expect(['first screen', noSideScroll(sheet), inside(t.root.querySelector('#sheet .decree-begin'))]).toEqual(['first screen', true, true]);
        const begin = t.root.querySelector('#sheet .decree-begin');
        begin.focus();
        expect(document.activeElement).toBe(begin);
        begin.click();
        await frame();
        const g = t.g();
        g.world.decree.ended = true; g.world.speed = 0; g.ui.refresh();
        await frame();
        expect(t.kind()).toBe('decreeEnd');
        const end = t.root.querySelector('#sheet');
        expect(['end card', noSideScroll(end)]).toEqual(['end card', true]);
        for (const b of end.querySelectorAll('.decree-end-actions button')) expect([b.textContent, inside(b), b.getBoundingClientRect().height >= 43]).toEqual([b.textContent, true, true]);
        const first = end.querySelector('.decree-end-actions button');
        first.focus();
        expect(document.activeElement).toBe(first);
      } finally { t.cleanup(); }
    });
  }
});
