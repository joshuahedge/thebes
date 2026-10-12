import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { allBuildings } from '../../../src/sim/world.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { driftPoints, showcaseFrame, showcaseBox } from '../../../src/ui/titleCard.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };

// The game booted on its title card at a size, as tests/stage3/balance/scenes.test.js boots it.
async function bootRig({ width = 1280, height = 800 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''),
    now: () => 0, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('s4 balance title scene', () => {
  it('opens the title card on the sample city\'s colossus under way, its finished small obelisk and its palace, on a laptop and a phone', async () => {
    // Tall and short phones both ways round, a tablet and laptops (the F2 review: under ~735 px of height the showcase was
    // off the screen): every one of the three stands on the screen and clear of the card, at one of the cache's zooms.
    const sizes = [[1280, 800], [390, 844], [375, 667], [360, 640], [844, 390], [667, 375], [1024, 768], [1366, 768]];
    for (const [width, height] of sizes) {
      const r = await bootRig({ width, height });
      try {
        expect(await window.__thebes.devScene('title')).toBe('title: small obelisk finished, colossus course 3, palace style 2');
        const { world, cam } = r.api.titleView();
        const box = document.querySelector('.test-mount #title'), card = box.querySelector('.title-card');
        const o = box.getBoundingClientRect(), c = card.getBoundingClientRect();
        const cb = { left: c.left - o.left, right: c.right - o.left, top: c.top - o.top, bottom: c.bottom - o.top };
        expect([width, height, [1, 0.75, 0.5].includes(cam.zoom)]).toEqual([width, height, true]);
        const near = driftPoints(world, showcaseFrame(showcaseBox(world), { width, height }, cb), { width, height })[0];
        expect([width, height, Math.abs(cam.x - near[0]) < 1e-6 && Math.abs(cam.y - near[1]) < 1e-6]).toEqual([width, height, true]);   // the view Gentle and Still hold
        for (const type of ['obelisk_small', 'colossus', 'palace']) {
          const b = allBuildings(world).find((q) => q.type === type);
          const [sx, sy] = tileToScreen(cam, { width, height }, b.x + b.w / 2, b.y + b.d / 2);
          const onScreen = sx > 0 && sx < width && sy > 0 && sy < height;
          const clear = sx < cb.left || sx > cb.right || sy < cb.top || sy > cb.bottom;
          expect([width, height, type, onScreen, clear]).toEqual([width, height, type, true, true]);
        }
      } finally { r.cleanup(); }
    }
  });
});
