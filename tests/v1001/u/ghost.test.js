// Version 10.0.1, Track U (ruling 2410, review fix 1): a picked farm's ghost stays above the bar on every phone size, the steady stack where it fits and the 10.0 stacking (body.stack-tight) where the band
// between the rows and the bar is too short for it. A 390x844-class phone is never tight.
// Version 10.0.2 (ruling 2449): the stack and its tight fallback are gone (the corner row is a side rail now), so the class never appears and every case is the one layout; the ghost's assertions are unchanged.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { dimsOf } from '../../../src/data/buildings.js';

const CASES = [[375, 667, 150, 67], [375, 667, 150, 0], [375, 667, 125, 67], [375, 667, 100, 0], [390, 844, 100, 0], [390, 844, 150, 0]];

describe('v1001 u ghost above the bar', () => {
  for (const [width, height, text, extra] of CASES) {
    it(`a farm picked at ${width}x${height}, ${text}% text${extra ? `, ${extra} px goal row` : ''}: the whole ghost is above the bar and below the rows (no tight stack since 10.0.2)`, async () => {
      const r = await rigUI({ width, height });
      try {
        r.ui.settings.set({ textSize: text, reducedMotion: 'on', help: 'off' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        if (extra) {
          const filler = document.createElement('div');
          filler.style.cssText = `height:${extra}px;width:10px;pointer-events:none`;
          filler.append(document.createTextNode(' '));
          r.root.querySelector('#under-bar').append(filler);
        }
        fire(r.root.querySelector('#dock .cat[data-category="food"]'), 'click');
        fire(r.root.querySelector('#dock .tray .card[data-item="farm_grain"]'), 'click');
        r.frame(0);
        const s = r.store.get();
        const { w, d } = dimsOf('farm_grain', s.tool.rot || 0);
        const ys = [[0, 0], [w, 0], [0, d], [w, d]].map(([dx, dy]) => tileToScreen(r.cam, { width, height }, s.ghost.x + dx, s.ghost.y + dy)[1]);
        const barTop = r.root.querySelector('#confirm .confirm').getBoundingClientRect().top;
        const rowsEnd = r.root.querySelector('#under-bar').getBoundingClientRect().bottom;
        const lowest = Math.max(...ys), highest = Math.min(...ys);
        expect([lowest <= barTop, highest >= rowsEnd - 2, document.body.classList.contains('stack-tight')]).toEqual([true, true, false]);
      } finally { r.cleanup(); }
    });
  }
});
