// Version 10.0, Track M (ruling 2307, S8): the City page has one title over its two tabs, and the tabs stay under the head while the sheet scrolls.
import { describe, it, expect } from '../../harness.js';
import { openSheet } from '../../../src/ui/modes.js';
import { V100M_TEXT } from '../../../src/ui/text.js';
import { bootAt, frame, wait, SAMPLE_CITY } from './helpers.js';

for (const [w, h] of [[375, 667], [390, 844]]) {
  for (const text of [100, 150]) {
    describe(`v100 m: the City page at ${w}x${h}, ${text}% (S8)`, () => {
      it('has one title on both tabs, and sticky tabs', async () => {
        const r = await bootAt(SAMPLE_CITY, w, h, text);
        try {
          const ui = r.api.game().ui, sheet = r.root.querySelector('#sheet');
          const at = [w, h, text];
          ui.store.set(openSheet(ui.store.get(), 'summary'));
          await wait(150); await frame();
          const cityTitle = sheet.querySelector('.head h2').textContent;
          for (const d of sheet.querySelectorAll('details')) d.open = true;
          sheet.scrollTop = 500;
          await wait(100); await frame();
          const head = sheet.querySelector('.head').getBoundingClientRect(), tabs = sheet.querySelector('.sheet-tabs').getBoundingClientRect();
          expect([...at, sheet.scrollTop > 100]).toEqual([...at, true]);
          expect([...at, Math.abs(tabs.top - head.bottom) <= 2, tabs.height > 20]).toEqual([...at, true, true]);
          ui.store.set(openSheet(ui.store.get(), 'advice'));
          await wait(150); await frame();
          const messagesTitle = sheet.querySelector('.head h2').textContent;
          expect([...at, cityTitle, messagesTitle]).toEqual([...at, V100M_TEXT.cityPage, V100M_TEXT.cityPage]);
          expect([...at, sheet.getAttribute('aria-label')]).toEqual([...at, V100M_TEXT.cityPage]);
        } finally { r.cleanup(); }
      });
    });
  }
}
