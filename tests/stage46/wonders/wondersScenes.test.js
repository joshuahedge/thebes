// Stage 4.6, Wonders track: the dev scenes the checkpoint screenshots use (src/dev/s46/wonders.js). They refuse with no city open, and run in a booted game.
import { describe, it, expect } from '../../harness.js';
import { devScene, STAGE46_SCENES } from '../../../src/dev/scenes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { allBuildings } from '../../../src/sim/world.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const NAMES = ['s46-wonders', 's46-wonders-sphinx', 's46-wonders-temple', 's46-wonders-step', 's46-wonders-styles', 's46-wonders-picker'];

describe('s46 wonders dev scenes', () => {
  it('lists the Wonders track\'s scenes, and refuses each with no city open', async () => {
    for (const name of NAMES) {
      expect(STAGE46_SCENES).toContain(name);
      let error = null;
      try { await devScene({ game: () => null }, name); } catch (e) { error = e.message; }
      expect([name, (error || '').includes('no city is open')]).toEqual([name, true]);
    }
  });

  it('runs in a booted game: the new kinds finished in three styles, each kind finished beside a half-built one, the pyramid in every style, the picker open', async () => {
    const shell = await mountShell(390, 844);
    const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11'),
      clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      const all = await devScene(api, 's46-wonders');
      const finished = () => allBuildings(api.game().world).filter((b) => b.site && b.site.done !== null);
      const n = finished().length;                                                    // a column of three on a tall screen, three rows of three on a wide one
      expect([all.startsWith(`wonders ${n} finished`), n === 3 || n === 9, new Set(finished().map((b) => b.style)).size]).toEqual([true, true, 3]);
      expect(new Set(finished().map((b) => b.type)).size).toBe(3);
      for (const [name, type] of [['s46-wonders-sphinx', 'great_sphinx'], ['s46-wonders-temple', 'sun_temple'], ['s46-wonders-step', 'step_pyramid']]) {
        const text = await devScene(api, name);
        const here = allBuildings(api.game().world).filter((b) => b.type === type);
        expect([name, here.length, here.filter((b) => b.site.done === null).length, text.includes('finished')]).toEqual([name, 2, 1, true]);
      }
      const styles = await devScene(api, 's46-wonders-styles');
      expect([styles, allBuildings(api.game().world).filter((b) => b.type === 'pyramid_small').map((b) => b.style)]).toEqual(['styles classic whitewashed painted gilded', ['classic', 'whitewashed', 'painted', 'gilded']]);
      const picker = await devScene(api, 's46-wonders-picker');
      const g = api.game(), s = g.ui.store.get();
      expect([picker.startsWith('picker placing style whitewashed'), s.mode, s.tool.type, s.tool.style]).toEqual([true, 'placing', 'mastaba_large', 'whitewashed']);
      expect(document.querySelectorAll('#confirm .style-pick').length).toBe(3);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
