// Version 8.2, Track L (ruling 1324): Ipi's bubble and the chapter card use at most two type sizes on every screen. Josh, 26 Oct: "The various font sizes make it look very AI/sloppy." The bubble's words
// (the do, Ipi's why, the longer detail, a reaction) share the body size; only the label, the count and More are small. The card's words and its reaction share one size beside the small label.
import { describe, it, expect } from '../../harness.js';
import { dockCard, stepCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const SCREENS = [[1280, 800], [390, 844], [844, 390]];
const visible = (n) => n.getClientRects().length > 0 && getComputedStyle(n).position !== 'absolute';
// The distinct font sizes of what shows in `parts` (selectors inside `root`).
const sizesOf = (root, parts) => [...new Set(parts.flatMap((sel) => [...root.querySelectorAll(sel)].filter(visible).map((n) => getComputedStyle(n).fontSize)))];

describe('v82 l type: the bubble and the card keep to two sizes', () => {
  for (const [width, height] of SCREENS) {
    for (const textSize of [100, 125, 150]) {
      it(`at ${width}x${height} and ${textSize}% text: the docked bubble and the chapter card show at most two sizes`, async () => {
        const s = await pageAt('tower', { width, height, textSize });
        try {
          const card = stepCard(s.root);
          card.querySelector('.lc-beat').hidden = false;                                     // the reaction that leads a card, when there is one
          card.querySelector('.lc-beat').textContent = 'The firehouse crew has taken its post.';
          const cardSizes = sizesOf(card, ['.lc-label', '.lc-words', '.lc-beat']);
          expect([cardSizes.length <= 2, cardSizes]).toEqual([true, cardSizes]);
          dockCard(s.root);
          await frame();
          const row = s.root.querySelector('#lesson');
          row.classList.add('open');                                                         // a phone's detail shows once the row is opened
          const parts = ['.label', '.ipi-why', '.text', '.why', '.chip', '.more', '.beat-line'].map((c) => `.${c.slice(1)}`);
          const sizes = sizesOf(row, parts);
          expect([sizes.length <= 2, sizes]).toEqual([true, sizes]);
          // the words are one size: the do, Ipi's why and the detail
          const words = sizesOf(row, ['.ipi-why', '.text', '.why']);
          expect([words.length]).toEqual([1]);
        } finally { s.cleanup(); }
      });
    }
  }
});
