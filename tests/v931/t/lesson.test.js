// Version 9.3.1 Track T (rulings 2025-2029): the lesson's road step keeps its marked end clear of the screen's edge (M3) and says to tap the tick and counts the
// planned tiles (S2); the housing-plots bar says Stop beside the tick (S3); the decree chip is a 44 px tap target (S11); the decree's end card leads with a filled
// first choice, full-width buttons stacked (S12).
import { describe, it, expect } from '../../harness.js';
import { V91F_TEXT, V931T_TEXT, S47_SPOTS_TEXT } from '../../../src/ui/text.js';
import { pageAt, frame } from '../../v711/lessonPage.js';
import { dockCard } from '../../helpers/lesson.js';
import { titleAt, WITH_TOWN } from '../../v93/u/page.js';

const EDGE = 48;
for (const [w, h] of [[360, 780], [390, 844], [375, 667], [412, 915]]) {
  describe(`v931 t lesson: the road step at ${w}x${h}`, () => {
    it('keeps the marked end 48 px clear of both side edges, and the words name no compass point', async () => {
      const s = await pageAt('road', { width: w, height: h });
      try {
        dockCard(s.root);
        s.g().ui.placement.cancel();
        s.g().ui.cameraControl.tick(1e9);
        await frame(); await frame();
        const o = s.root.getBoundingClientRect();
        const dia = s.root.querySelector('.lesson-road-mark').querySelectorAll('polygon')[3].getBoundingClientRect();
        const mid = (dia.left + dia.right) / 2 - o.left;
        expect([mid >= EDGE, w - mid >= EDGE, mid]).toEqual([true, true, mid]);
        expect(/west|east|north|south/i.test(V91F_TEXT.roadDo)).toBe(false);
      } finally { s.cleanup(); }
    });
  });
}

describe('v931 t lesson: a drawn road is counted and the row says to tap the tick', () => {
  it('shows "N of 9 planned" and "Tap" while the plan is drawn, and the old words and count when it is cleared', async () => {
    const s = await pageAt('road', { width: 360, height: 780 });
    try {
      dockCard(s.root);
      const text = () => s.root.querySelector('#lesson .text').textContent, chip = () => s.root.querySelector('#lesson .chip');
      expect([text(), chip().textContent]).toEqual([V91F_TEXT.roadDo, '0 of 9']);
      const g = s.g(), n = g.world.size;
      const tiles = [];
      for (let x = 19; x >= 11; x--) tiles.push([x, 39]);
      g.ui.store.set({ plan: { tiles } });
      await frame();
      expect([text(), chip().textContent, chip().getAttribute('aria-label')]).toEqual([V931T_TEXT.roadTap, '9 of 9 planned', V931T_TEXT.roadPlannedLabel(9, 9)]);
      g.ui.store.set({ plan: null });
      await frame();
      expect([text(), chip().textContent]).toEqual([V91F_TEXT.roadDo, '0 of 9']);
      expect(n > 0).toBe(true);
    } finally { s.cleanup(); }
  });
});

for (const [w, h, ts] of [[390, 844, 100], [360, 780, 150]]) {
  describe(`v931 t decree: the chip and the end card at ${w}x${h}, ${ts}% text`, () => {
    it('the chip is a 44 px tap target, and the end card has a filled first choice with full-width buttons stacked', async () => {
      const t = await titleAt({ width: w, height: h, textSize: ts, records: WITH_TOWN });
      try {
        t.api.startDecree('2026-47');
        await frame();
        const chip = t.root.querySelector('.decree-chip');
        expect(chip.getBoundingClientRect().height >= 43.5).toBe(true);
        t.root.querySelector('#sheet .decree-begin').click();
        await frame();
        const g = t.g();
        g.world.decree.ended = true; g.world.speed = 0; g.ui.refresh();
        await frame();
        expect(t.kind()).toBe('decreeEnd');
        const bs = [...t.root.querySelectorAll('#sheet .decree-end-actions button')];
        expect(bs.map((b) => b.className.split(' ')[0])).toEqual(['decree-again', 'decree-back', 'decree-share']);
        expect(bs.map((b) => b.classList.contains('primary'))).toEqual([true, false, false]);
        const r = bs.map((b) => b.getBoundingClientRect());
        expect([r.every((x) => Math.abs(x.width - r[0].width) < 1 && Math.abs(x.left - r[0].left) < 1), r[1].top >= r[0].bottom - 1, r[2].top >= r[1].bottom - 1]).toEqual([true, true, true]);
      } finally { t.cleanup(); }
    });
  });
}

describe('v931 t bars: the housing-plots bar', () => {
  it('says Stop, not Done, beside the tick', () => {
    expect([S47_SPOTS_TEXT.done, S47_SPOTS_TEXT.doneLabel.startsWith('Stop')]).toEqual(['Stop', true]);
  });
});
