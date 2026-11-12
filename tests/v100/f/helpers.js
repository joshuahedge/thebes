// Version 10.0 (Track F): shared by the first-view tests. offMapShare counts the share of a view that lies past the map's edge by sampling a grid of screen points
// (the exact count the off-map fill used to be: every pixel past the map, whatever the ground is drawn as); bootAt boots the real page at a size.
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { screenToTile } from '../../../src/render/camera.js';

export function offMapShare(cam, view, size, n = 48) {
  let off = 0, total = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const t = screenToTile(cam, view, ((i + 0.5) / n) * view.width, ((j + 0.5) / n) * view.height);
      total++;
      if (t.x < 0 || t.y < 0 || t.x >= size || t.y >= size) off++;
    }
  }
  return off / total;
}

const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };

export async function bootAt(width, height, { store = createSaveStore({ idb: fakeIndexedDB(), local: null }), params = '' } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage: noStorage, platform: {}, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, store, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
