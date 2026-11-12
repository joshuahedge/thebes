// Version 10.0, Track M (ruling 2300, C7): the lesson's first road bar says its one instruction and not the bridge and ferry limits.
import { describe, it, expect } from '../../harness.js';
import { pickCategory } from '../../../src/ui/modes.js';
import { pageAt } from '../../v711/lessonPage.js';
import { dockCard } from '../../helpers/lesson.js';
import { bootAt, frame, wait, SAMPLE_CITY } from './helpers.js';

async function pickRoad(root, ui) {
  ui.store.set(pickCategory(ui.store.get(), 'roads'));
  await wait(150); await frame();
  [...root.querySelectorAll('[data-item="road"]')].find((b) => b.offsetParent).click();
  await wait(150); await frame();
  return root.querySelector('#confirm').textContent;
}

describe('v100 m: the lesson road bar (C7)', () => {
  it('drops the water line on the lesson road step, at 375x667 and 390x844, 100% and 150%', async () => {
    for (const [width, height] of [[375, 667], [390, 844]]) {
      for (const textSize of [100, 150]) {
        const s = await pageAt('road', { width, height, textSize });
        try {
          dockCard(s.root);                                  // the card's button starts the road tool (Show me)
          await wait(150); await frame();
          expect(s.g().ui.store.get().mode).toBe('drawing');
          const text = s.root.querySelector('#confirm').textContent;
          const at = [width, height, textSize];
          expect([...at, s.g().world.lesson]).toEqual([...at, true]);
          expect([...at, /bridge|ferry|Water/i.test(text)]).toEqual([...at, false]);
          expect([...at, /Tap where it starts/.test(text)]).toEqual([...at, true]);
        } finally { s.cleanup(); }
      }
    }
  });
  it('keeps the water line in an ordinary city', async () => {
    const r = await bootAt(SAMPLE_CITY, 375, 667, 100);
    try {
      const text = await pickRoad(r.root, r.api.game().ui);
      expect(r.api.game().world.lesson).toBeFalsy();
      expect(/Water: bridge/.test(text)).toBe(true);
    } finally { r.cleanup(); }
  });
});
