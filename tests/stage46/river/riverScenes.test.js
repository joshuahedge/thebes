// The River track's dev scenes run in a booted game (the checkpoint screenshots use them): each sets the picture up through the sim's own state
// and says what it set up; with no city open each refuses.
import { describe, it, expect } from '../../harness.js';
import { devScene, STAGE46_SCENES } from '../../../src/dev/scenes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { allBuildings } from '../../../src/sim/world.js';
import { isFloodFarm, onFloodplain, floodLook } from '../../../src/sim/flood.js';
import { huntingOutlook } from '../../../src/sim/wildlife.js';

const NAMES = ['s46-flood', 's46-wildlife', 's46-hunting', 's46-wharf', 's46-nilometer', 's46-farm-flood'];

describe('s46 river dev scenes', () => {
  it('lists the River track\'s scenes, and refuses each with no city open', async () => {
    for (const name of NAMES) {
      expect(STAGE46_SCENES).toContain(name);
      let error = null;
      try { await devScene({ game: () => null }, name); } catch (e) { error = e.message; }
      expect([name, (error || '').includes('no city is open')]).toEqual([name, true]);
    }
  });
  it('runs in the sample city: the water up on farms on the floodplain, the herds, a lodge at work, a wharf, a Nilometer and a farm sheet', async () => {
    const shell = await mountShell(390, 844);
    const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
      clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      const w = () => api.game().world;
      const flood = await devScene(api, 's46-flood', { level: 'low' });
      expect(flood.startsWith('flood low day ')).toBe(true);
      expect([w().flood.risen, w().flood.level, w().flood.applied]).toEqual([true, 'low', 'low']);
      expect(allBuildings(w()).filter((b) => isFloodFarm(b.type) && onFloodplain(w(), b)).length).toBeGreaterThan(0);
      expect(floodLook(w()).phase).toBe('high');
      const wild = await devScene(api, 's46-wildlife');
      expect(wild.startsWith('wildlife ')).toBe(true);
      expect(w().wildlife.herds.length).toBeGreaterThan(1);
      const hunt = await devScene(api, 's46-hunting');
      const lodge = allBuildings(w()).find((b) => b.type === 'hunting_lodge');
      expect([hunt.startsWith('hunting lodge '), huntingOutlook(w(), lodge).herds > 0]).toEqual([true, true]);
      const wharf = await devScene(api, 's46-wharf');
      expect(wharf.startsWith('fishing wharf ')).toBe(true);
      const nil = await devScene(api, 's46-nilometer');
      expect(nil.startsWith('nilometer ')).toBe(true);
      expect([w().flood.year, w().flood.risen, w().flood.forecast]).toEqual([3, false, w().flood.level]);
      const sheet = await devScene(api, 's46-farm-flood');
      expect(sheet.startsWith('farm sheet ')).toBe(true);
      expect(document.querySelector('#sheet').textContent).toContain('Floodplain');
      const sheetNil = await devScene(api, 's46-nilometer', { sheet: true });
      expect(sheetNil.startsWith('nilometer ')).toBe(true);
      expect(document.querySelector('#sheet').textContent).toContain('Next flood');
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
