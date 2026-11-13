// Version 10.0.1, Track U (ruling 2355, review fix 1): a picked farm's ghost stays above the bar on every phone size, the steady stack where it fits and the 10.0 stacking (body.stack-tight) where the band
// between the rows and the bar is too short for it. A 390x844-class phone is never tight.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { dimsOf } from '../../../src/data/buildings.js';

const CASES = [[375, 667, 150, 67, true], [375, 667, 150, 0, true], [375, 667, 125, 67, true], [375, 667, 100, 0, false], [390, 844, 100, 0, false], [390, 844, 150, 0, false]];

describe('v1001 u ghost above the bar', () => {
  for (const [width, height, text, extra, tight] of CASES) {
    it(`a farm picked at ${width}x${height}, ${text}% text${extra ? `, ${extra} px goal row` : ''}: the whole ghost is above the bar and below the rows (${tight ? 'tight' : 'steady'} stack)`, async () => {
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
        expect([lowest <= barTop, highest >= rowsEnd - 2, document.body.classList.contains('stack-tight')]).toEqual([true, true, tight]);
      } finally { r.cleanup(); }
    });
  }
});
