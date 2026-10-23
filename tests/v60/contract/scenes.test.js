// Version 6.0 Track 0 (the contract): the v60 dev scenes. Each refuses with no city open (v60-title: off the title card) and runs without
// error in a booted game, with the minimal world its track will refine.
import { describe, it, expect } from '../../harness.js';
import { devScene, VERSION60_SCENES } from '../../../src/dev/scenes.js';
import { V60_SCENES } from '../../../src/dev/v60/index.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const NAMES = ['v60-demand', 'v60-greatwork', 'v60-plague', 'v60-drought', 'v60-locusts', 'v60-raid-burn', 'v60-battle', 'v60-largeplot', 'v60-title', 'v60-huge', 'v60-lesson'];

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

describe('v60 contract dev scenes', () => {
  it('lists the eleven v60 scenes, each a function, and refuses each with no city open', async () => {
    expect(VERSION60_SCENES).toEqual(NAMES);
    for (const name of NAMES) expect([name, typeof V60_SCENES[name]]).toEqual([name, 'function']);
    for (const name of NAMES) {
      let error = null;
      try { await devScene({ game: () => null, phase: () => 'game' }, name); } catch (e) { error = e.message; }
      expect([name, (error || '').startsWith(`devScene ${name}`)]).toEqual([name, true]);
    }
  });

  it('runs each in a booted game: the sample city with its record set, a Huge map, the device\'s lesson state', async () => {
    const r = await bootAt('skipTitle=1&seed=11');
    try {
      const said = {}, sizes = {};
      for (const name of NAMES.filter((n) => n !== 'v60-title')) {
        said[name] = await devScene(r.api, name, { quick: true });
        sizes[name] = r.api.game().world.size;
        expect([name, said[name].startsWith(`${name}: `)]).toEqual([name, true]);
      }
      expect(said['v60-demand']).toBe('v60-demand: demand 1 (goods, 400 linen, 12 months left, offered)');
      expect(said['v60-greatwork']).toBe('v60-greatwork: capital, no great work founded, reign not won');
      expect(said['v60-raid-burn'].endsWith('strikes burn true, wreck true, loot true')).toBe(true);
      expect(said['v60-huge']).toBe('v60-huge: 112x112, seed 11');
      expect(sizes['v60-huge']).toBe(112);
      // Version 6.0 (Track D2): the lesson scene starts the guided first city (its own 48 map), at the device's step, the first on a fresh device.
      expect([said['v60-lesson'].startsWith('v60-lesson: step 0, at road, row "Lay a road'), sizes['v60-lesson'], r.api.game().lesson]).toEqual([true, 48, true]);
    } finally { r.cleanup(); }
  });

  it('reads the title card\'s buttons on the title, and refuses in a game', async () => {
    const r = await bootAt('');
    try {
      expect(r.api.phase()).toBe('title');
      const text = await devScene(r.api, 'v60-title', { quick: true });
      expect(text.startsWith('v60-title: ')).toBe(true);
      expect(text.split(' | ').length).toBeGreaterThan(1);
    } finally { r.cleanup(); }
  });
});
