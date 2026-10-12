import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { allBuildings } from '../../../src/sim/world.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { driftPoints } from '../../../src/ui/titleCard.js';
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
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      const r = await bootRig({ width, height });
      try {
        expect(await window.__thebes.devScene('title')).toBe('title: small obelisk finished, colossus course 3, palace style 2');
        const { world, cam } = r.api.titleView();
        expect([cam.x, cam.y]).toEqual(driftPoints(world)[0]);                 // the view Gentle and Still hold
        for (const type of ['obelisk_small', 'colossus', 'palace']) {
          const b = allBuildings(world).find((o) => o.type === type);
          const [sx, sy] = tileToScreen(cam, { width, height }, b.x + b.w / 2, b.y + b.d / 2);
          expect([width, type, sx > 0 && sx < width && sy > 0.8 * height && sy < height]).toEqual([width, type, true]);   // below the card
        }
      } finally { r.cleanup(); }
    }
  });
});
