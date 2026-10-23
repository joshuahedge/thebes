// Version 7.0 Track 0 (the contract): the v70 dev scenes. Each refuses with no city open and runs without error in a booted game, with the
// minimal world its track will refine.
import { describe, it, expect } from '../../harness.js';
import { devScene, VERSION70_SCENES } from '../../../src/dev/scenes.js';
import { V70_SCENES } from '../../../src/dev/v70/index.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const NAMES = ['v70-trade', 'v70-quay', 'v70-boat', 'v70-event', 'v70-festival', 'v70-season-flood', 'v70-season-growing', 'v70-season-harvest', 'v70-night',
  'v70-advice-tower', 'v70-stranded'];

async function bootAt(query) {
  const shell = await mountShell(390, 844);
  const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(query),
    now: () => 0, clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('v70 contract dev scenes', () => {
  it('lists the eleven v70 scenes, each a function, and refuses each with no city open', async () => {
    expect(VERSION70_SCENES).toEqual(NAMES);
    for (const name of NAMES) expect([name, typeof V70_SCENES[name]]).toEqual([name, 'function']);
    for (const name of NAMES) {
      let error = null;
      try { await devScene({ game: () => null, phase: () => 'game' }, name); } catch (e) { error = e.message; }
      expect([name, (error || '').startsWith(`devScene ${name}`)]).toEqual([name, true]);
    }
  });

  it('runs each in a booted game on the seed-11 sample city', async () => {
    const r = await bootAt('skipTitle=1&seed=11');
    try {
      const said = {};
      for (const name of NAMES) {
        said[name] = await devScene(r.api, name, { quick: true });
        expect([name, said[name].startsWith(`${name}: `)]).toEqual([name, true]);
      }
      expect(said['v70-trade'].startsWith('v70-trade: capital, routes open ')).toBe(true);
      expect(said['v70-event'].startsWith('v70-event: capital, next ')).toBe(true);                 // Track E's scene: an event waiting (tests/v70/e), not Track 0's empty record
      expect(said['v70-event'].includes(', waiting ')).toBe(true);
      expect(said['v70-season-flood'].endsWith('akhet (blend 0)')).toBe(true);
      expect(said['v70-season-growing'].endsWith('peret (blend 0)')).toBe(true);
      expect(said['v70-season-harvest'].endsWith('shemu (blend 0)')).toBe(true);
      expect(said['v70-night']).toBe('v70-night: light day (dark 0), day and night on');
      expect(said['v70-quay'].startsWith('v70-quay: river at ')).toBe(true);
      expect(said['v70-quay'].includes('none')).toBe(false);
    } finally { r.cleanup(); }
  });
});
