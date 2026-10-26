// Version 8.2 integration (ruling 1331): as each lesson step begins, the wide panel and the phone's tray open on the category of the step's own card, or for a step with no card of
// its own (the families, the months, the fire, the raid) the category of the card before it in its chapter: the raid's panel shows Defence, not Roads.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, stepCategory } from '../../../src/data/lesson.js';
import { dockCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const EXPECTED = { road: 'roads', homes: 'homes', largeplot: 'homes', well: 'services', families: 'services', farm: 'food', granary: 'food', bazaar: 'services', workers: 'homes',
  month: 'homes', firehouse: 'services', fire: 'services', tower: 'defence', raid: 'defence' };

describe('v82 i category: every lesson step opens its own category', () => {
  it('stepCategory names each step\'s card\'s category, else its chapter\'s card before it', () => {
    expect(LESSON_STEPS.map((s, i) => [s.id, stepCategory(i)])).toEqual(LESSON_STEPS.map((s) => [s.id, EXPECTED[s.id]]));
    for (const [i, s] of LESSON_STEPS.entries()) if (s.show) expect([s.id, stepCategory(i)]).toEqual([s.id, s.show.category]);
  });
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    it(`at ${width}x${height}: the panel or the tray shows the step's category as it begins and after its card docks`, async () => {
      const wrong = [];
      for (const step of LESSON_STEPS) {
        const s = await pageAt(step.id, { width, height });
        try {
          const store = s.g().ui.store;
          const pressed = () => {
            const b = s.root.querySelector(width >= 1000 ? '#panel .tab[aria-pressed="true"]' : '#dock .cat[aria-pressed="true"]');
            return b && b.getClientRects().length ? b.dataset.category : store.get().category;   // a folded phone tray: the category it opens on
          };
          const begun = [store.get().category, pressed()];
          dockCard(s.root);
          await frame();
          const docked = [store.get().category, pressed()];
          const want = EXPECTED[step.id];
          if ([...begun, ...docked].some((c) => c !== want)) wrong.push(`${step.id}: begun ${begun}, docked ${docked}, want ${want}`);
        } finally { s.cleanup(); }
      }
      expect(wrong).toEqual([]);
    });
  }
});
