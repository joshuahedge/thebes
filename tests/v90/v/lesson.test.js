// Version 9.0 Track V (design section 10, item 4; ruling 1604): no effect hides a lesson pointer. Every one of V's effects draws on the map's canvas,
// under the overlays (the map's guide ring is drawn after them) and under the page (the lesson's ring, row and card are elements above the canvas),
// and the panels' fade is off in the lesson. A walk through every step on a 375x667 phone, with V's effects live at each (nothing shed, a scaffold
// and the beaten raid's moment on the map, the clouds over it): the step's ring is shown whole on the phone, nothing of V's is on the page, and a
// sheet opens with no animation.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { dockPlain } from '../../helpers/lesson.js';
import { allBuildings } from '../../../src/sim/world.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { noteUpgrade, scaffoldsAt } from '../../../src/render/v90/scaffold.js';
import { startMoment, endMoment } from '../../../src/render/v90/moment.js';
import { v90Dropper, resetV90Dropper, forceV90Off } from '../../../src/render/v90/dropper.js';
import { noteFrameTime } from '../../../src/render/v90/clock.js';
import { openSheet } from '../../../src/ui/modes.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

async function lessonAt(i, width = 375, height = 667) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  api.hooks.lesson({ step: i });
  dockPlain(api);
  await frame();
  return { api, g: api.game(), root: shell.root, box: shell.root.getBoundingClientRect(), cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on'); delete window.__thebes; } };
}

describe('v90 v the lesson with every effect live', () => {
  it('draws V\'s layers before the overlays, so the map\'s guide ring is always over them', () => {
    resetV90Dropper();
    const r = createRenderer({ canvas: makeCanvas(10, 10), dpr: 1, maxBakesPerFrame: Infinity });
    let seen = null;
    r.renderFrame(makeTestWorld(), createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 200, height: 150 }, now: 0, drawOverlay: () => { seen = v90Dropper.stats.frames; } });
    expect(seen).toBe(1);                                                            // V's frame was already accounted when the overlay drew
  });
  it('shows each step\'s ring on a 375x667 phone where it stands without V, adds nothing to the page, and opens a sheet with no fade', async () => {
    for (let i = 0; i < LESSON_STEPS.length; i++) {
      const s = await lessonAt(i);
      try {
        const id = LESSON_STEPS[i].id, w = s.g.world;
        resetV90Dropper();
        const b = allBuildings(w)[0];
        noteFrameTime(w, w.day + 0.2);
        if (b) noteUpgrade(w, b);
        startMoment(w, { day: w.day, x: w.size / 2, y: w.size / 2, edge: { x: 0, y: w.size / 2 }, chief: { x: w.size / 2 + 1, y: w.size / 2 } });
        const ring = s.root.querySelector('.lesson-ring');
        const box = () => (ring && !ring.hidden ? JSON.stringify(ring.getBoundingClientRect()) : 'none');
        forceV90Off('all');                                                          // the frame as 8.4 drew it: where the ring stands without V
        s.g.ui.render({ timeDays: w.day + 0.2, now: 1000 });
        const without = box();
        forceV90Off(null);
        const before = v90Dropper.stats.frames;
        s.g.ui.render({ timeDays: w.day + 0.2, now: 1000 });
        expect([id, v90Dropper.stats.frames, v90Dropper.stats.dropped, b ? scaffoldsAt(w).length : 1]).toEqual([id, before + 1, [], 1]);
        expect([id, box()]).toEqual([id, without]);                                  // the same ring, in the same place, with every effect live
        if (ring && !ring.hidden) {
          const rb = ring.getBoundingClientRect(), cs = getComputedStyle(ring);
          expect([id, rb.width > 0 && rb.height > 0, cs.visibility, cs.display !== 'none', Number(cs.opacity) > 0.5]).toEqual([id, true, 'visible', true, true]);
        }
        expect([id, s.root.querySelectorAll('[class*="v90"]').length]).toEqual([id, 0]);   // V draws on the canvas only
        expect(document.body.classList.contains('lesson-on')).toBe(true);
        s.g.ui.store.set(openSheet(s.g.ui.store.get(), 'menu'));
        const sheet = s.root.querySelector('#sheet');
        if (sheet && !sheet.hidden) expect([id, getComputedStyle(sheet).animationName]).toEqual([id, 'none']);
        endMoment(w);
      } finally { s.cleanup(); }
    }
  });
});
