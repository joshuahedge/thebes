// Version 10.0.1, Track U (ruling 2340): the tip card on a wide screen. Its words take the card's width and its buttons stand on a line of their own beneath; a phone keeps its one row.
import { describe, it, expect } from '../../harness.js';
import { createTips } from '../../../src/ui/tips.js';
import { TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { rigUI } from '../../helpers/uiWorld.js';

async function tipIn(width, height, textSize = null) {
  const r = await rigUI({ width, height });
  if (textSize) r.ui.settings.set({ textSize });
  const host = r.root.querySelector('#tip');
  const clock = { t: 0 };
  const tips = createTips({ container: host, settings: r.ui.settings, now: () => clock.t });
  clock.t = TIP_FIRST_DELAY_MS + 1;
  tips.trigger('arrivals');
  document.body.dataset.guidance = 'tip';   // a phone shows the guidance row the tip is in only while createUI names it (the rig's own tip slot is empty)
  const q = (s) => host.querySelector(s).getBoundingClientRect();
  return { r, tips, text: q('.tip-row .text'), got: q('.tip-row .got-it'), row: q('.tip-row'), host };
}

describe('v1001 u tip card', () => {
  for (const [w, h] of [[1920, 1080], [2000, 1024]]) {
    it(`gives its words at least 300 px and puts its buttons beneath them (${w} x ${h})`, async () => {
      const t = await tipIn(w, h);
      try {
        expect(t.r.root.ownerDocument.body.dataset.layout).toBe('wide');
        expect(t.text.width >= 300).toBe(true);
        expect(t.got.top >= t.text.bottom - 1).toBe(true);                       // Got it is not on the words' line
        expect(t.got.right <= t.row.right + 1 && t.got.right > t.row.right - 40).toBe(true);   // and sits at the card's right
      } finally { t.tips.dismiss(); t.r.cleanup(); }
    });
  }
  it('lets the card grow with the text size (the cap is 440 px times the scale)', async () => {
    const a = await tipIn(1920, 1080, 100);
    const b = await tipIn(1920, 1080, 150);
    try {
      expect(a.row.width <= 440 + 1).toBe(true);
      expect(b.row.width > a.row.width).toBe(true);
      expect(b.row.width <= 660 + 1).toBe(true);
    } finally { a.tips.dismiss(); b.tips.dismiss(); a.r.cleanup(); b.r.cleanup(); }
  });
  it('leaves a phone as it was: the words and Got it share one row (390 x 844, 100% and 150%)', async () => {
    for (const size of [100, 150]) {
      const t = await tipIn(390, 844, size);
      try {
        expect(t.r.root.ownerDocument.body.dataset.layout).toBe('portrait');
        expect(t.row.width > 0).toBe(true);                                       // the phone's guidance row shows it
        expect(t.got.top < t.text.bottom && t.got.bottom > t.text.top).toBe(true);   // the button overlaps the words' lines: one row
      } finally { t.tips.dismiss(); t.r.cleanup(); }
    }
  });
});
