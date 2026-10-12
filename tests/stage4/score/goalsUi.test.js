import { describe, it, expect } from '../../harness.js';
import { goalById } from '../../../src/sim/goals.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';

describe('s4 score goals in the interface', () => {
  it('shows a goal\'s why when the goal is opened in place on a phone, and keeps the rows within 40% of the screen', async () => {
    for (const [w, h] of [[360, 640], [390, 844], [740, 360]]) {
      for (const size of [100, 150]) {
        const r = await rigUI({ width: w, height: h });
        r.renderer.renderFrame = () => {};
        try {
          r.world.goals.completed.push('road', 'plots', 'well');            // 'Farm on fertile land, granary, bazaar': the longest why
          r.ui.settings.set({ textSize: size, motion: 'still' });
          r.ui.refresh();
          r.frame(0);
          const strip = r.root.querySelector('#goals .goal-strip');
          const why = strip.querySelector('.why');
          const at = `${w}x${h} at ${size}%`;
          expect([at, why.hidden]).toEqual([at, true]);                    // closed: the words only
          r.ui.setGuidanceOpen(true);
          r.frame(1000);
          expect([at, why.hidden, why.textContent]).toEqual([at, false, goalById('food').why]);
          expect([at, strip.querySelector('.open-goals').getAttribute('aria-label').includes(goalById('food').why)]).toEqual([at, true]);
          const canvas = r.root.querySelector('#map').getBoundingClientRect();
          expect([at, strip.getBoundingClientRect().bottom - canvas.top <= 0.4 * h + 1]).toEqual([at, true]);
          r.ui.setGuidanceOpen(false);
          r.frame(2000);
          expect([at, why.hidden]).toEqual([at, true]);
        } finally { r.cleanup(); }
      }
    }
  });
  it('lists each open goal\'s why in the Goals sheet', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set(openSheet(r.store.get(), 'goals'));
      const rows = [...r.root.querySelectorAll('#sheet .goals .goal')];
      expect(rows.map((li) => (li.querySelector('.why') || { textContent: null }).textContent)).toEqual(['road', 'plots', 'well'].map((id) => goalById(id).why));
    } finally { r.cleanup(); }
  });
});
