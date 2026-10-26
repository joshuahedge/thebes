// Version 8.1 integration: a build card's name is never cut off ("Police pos" at 390 px). The name wraps inside its card, in one type size across the cards.
import { describe, it, expect } from '../../harness.js';
import { trayCategories, unlockedItems } from '../../../src/ui/cards.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';

const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

describe('v81 i tray names: no card name is cut off', () => {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    for (const textSize of ['100', '150']) {
      it(`at ${w}x${h}, text ${textSize}%: every card's name fits its own width in every category, one font size throughout`, async () => {
        const world = uiWorld(); world.milestone = 'seat';
        const r = await rigUI({ width: w, height: h, world, hooks: { flatTray: true } });
        document.body.dataset.textSize = textSize;
        try {
          const bad = []; const sizes = new Set(); let seen = 0;
          for (const c of trayCategories(world)) {
            r.store.set({ dock: 'tray', category: c.id });
            r.frame();
            await frame();
            for (const card of r.root.querySelectorAll('.card[data-item]')) {
              if (card.getClientRects().length === 0) continue;
              const name = card.querySelector('.name');
              seen++;
              sizes.add(getComputedStyle(name).fontSize);
              if (name.scrollWidth > name.clientWidth || card.scrollWidth > card.clientWidth + 1) bad.push(`${c.id}/${card.dataset.item}: ${name.scrollWidth}>${name.clientWidth}`);
            }
          }
          expect([seen >= unlockedItems(world, 'services').length, bad, sizes.size]).toEqual([true, [], 1]);
        } finally { r.cleanup(); delete document.body.dataset.textSize; }
      });
    }
  }
});
