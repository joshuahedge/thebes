// Stage 4.6, Map track: the dev scenes the checkpoint screenshots use (src/dev/s46/map.js): they refuse with no city open, and run in a booted game.
import { describe, it, expect } from '../../harness.js';
import { devScene, STAGE46_SCENES } from '../../../src/dev/scenes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { canPlace } from '../../../src/sim/commands.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const NAMES = ['s46-sizes-small', 's46-sizes-normal', 's46-sizes-large', 's46-clay', 's46-bridge'];

describe('s46 map dev scenes', () => {
  it('lists the Map track\'s scenes, and refuses each with no city open', async () => {
    for (const name of NAMES) {
      expect(STAGE46_SCENES).toContain(name);
      let error = null;
      try { await devScene({ game: () => null }, name); } catch (e) { error = e.message; }
      expect([name, (error || '').startsWith(`devScene ${name.replace(/-(small|normal|large)$/, '')}`) || error.includes('no city is open')]).toEqual([name, true]);
    }
  });
  it('runs in a booted game: a new city at each size on the seed\'s layout, the clay pit picked on a fit, and a bridge drawn and refused', async () => {
    const shell = await mountShell(390, 844);
    const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11'),
      clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      for (const [name, size] of [['s46-sizes-small', 48], ['s46-sizes-normal', 64], ['s46-sizes-large', 80]]) {
        const text = await devScene(api, name);
        expect([name, api.game().world.size, text.startsWith(`size ${name.slice(10)} ${size}x${size} `)]).toEqual([name, size, true]);
        expect(Object.keys(api.game().world.buildings).length).toBeLessThan(5);      // a new city, not the sample
      }
      api.startGame(api.freshWorld({ seed: 11, variant: 'classic', size: 64 }), { saveNow: false });
      const clay = await devScene(api, 's46-clay');
      const g = api.game(), at = g.ui.store.get().ghost;
      expect([clay.startsWith('clay pit ghost'), g.ui.store.get().overlay, g.ui.store.get().tool.type, canPlace(g.world, 'clay_pit', at.x, at.y, { roadLater: true }).ok]).toEqual([true, 'ground', 'clay_pit', true]);
      const refused = await devScene(api, 's46-bridge', { view: 'refused' });
      expect(refused.includes('bad A bridge runs straight across, with land at both ends')).toBe(true);
      const ok = await devScene(api, 's46-bridge', { view: 'bridge' });
      expect(/ok \d+ tiles? · Bridge: \d+ tiles?, \d+ gold$/.test(ok)).toBe(true);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
