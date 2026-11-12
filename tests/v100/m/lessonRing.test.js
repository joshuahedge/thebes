// Version 10.0, Track M (ruling 2306, F6): the lesson's ring stays inside the screen's sides: its middle is at least its radius in, so the road step's long ring is whole on a 375 px phone.
import { describe, it, expect } from '../../harness.js';
import { pageAt, frame } from '../../v711/lessonPage.js';
import { dockCard } from '../../helpers/lesson.js';

for (const [w, h] of [[375, 667], [667, 375], [390, 844]]) {
  for (const textSize of [100, 150]) {
    describe(`v100 m: the lesson ring at ${w}x${h}, ${textSize}% (F6)`, () => {
      it('lies inside the screen on the road step', async () => {
        const s = await pageAt('road', { width: w, height: h, textSize });
        try {
          dockCard(s.root);
          s.g().ui.placement.cancel();
          s.g().ui.cameraControl.tick(1e9);
          await frame(); await frame();
          const ring = s.root.querySelector('.lesson-ring:not(.lesson-ring-tower)');
          const o = s.root.getBoundingClientRect(), b = ring.getBoundingClientRect();
          expect([w, h, textSize, ring.hidden]).toEqual([w, h, textSize, false]);
          expect([w, h, textSize, b.left - o.left >= -0.5, b.right - o.left <= w + 0.5]).toEqual([w, h, textSize, true, true]);
        } finally { s.cleanup(); }
      });
    });
  }
}
