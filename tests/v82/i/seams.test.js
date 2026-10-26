// Version 8.2 integration (ruling 1337): the in-game new-city card (Track G) in the scrolling sheet (Track L): on the tightest phone, at 150% text with More choices open, the card
// scrolls inside the sheet by finger, the page never moves, and Start is reached by scrolling.
import { describe, it, expect } from '../../harness.js';
import { openSheet } from '../../../src/ui/modes.js';
import { fire } from '../../helpers/dom.js';
import { cityAt } from './oasis.test.js';

describe('v82 i seams: the new-city card in the game', () => {
  it('at 375x667 and 150% text, with More choices open, the card scrolls inside its sheet and Start comes into view', async () => {
    const s = await cityAt({ width: 375, height: 667, variant: 'classic', settings: { textSize: 150 } });
    try {
      const store = s.g().ui.store;
      store.set(openSheet(store.get(), 'menu'));
      fire(s.root.querySelector('#sheet .menu-new-city'), 'click');
      const sheet = s.root.querySelector('#sheet');
      fire(sheet.querySelector('.more-choices-toggle'), 'click');
      const cs = getComputedStyle(sheet), before = document.scrollingElement.scrollTop;
      expect([document.body.dataset.textSize, ['auto', 'scroll'].includes(cs.overflowY), cs.overscrollBehaviorY, sheet.scrollHeight > sheet.clientHeight]).toEqual(['150', true, 'contain', true]);
      sheet.scrollTop = sheet.scrollHeight;
      const start = sheet.querySelector('.start-city'), a = start.getBoundingClientRect(), b = sheet.getBoundingClientRect();
      expect([a.top >= b.top - 0.5, a.bottom <= b.bottom + 0.5, a.height >= 43.5, document.scrollingElement.scrollTop === before]).toEqual([true, true, true, true]);
    } finally { s.cleanup(); }
  });
});
