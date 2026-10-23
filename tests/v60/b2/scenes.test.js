// Version 6.0 Track B2: the dev scenes v60-battle (its looks) and v60-raid-burn (the ruins and the result), run in a booted game: each sets up the state its
// words say, through the sim's own raid days.
import { describe, it, expect } from '../../harness.js';
import { devScene } from '../../../src/dev/scenes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { unitsAt, UNIT_ID_BASE, heldAge, resetBattleHooks } from '../../../src/render/units.js';
import { allBuildings } from '../../../src/sim/world.js';
import { pairsOf } from '../../../src/dev/v60/battle.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { SHELL_CLASS } from '../../../src/data/battle.js';
import { FIGHTERS, POSES, FACES } from '../../../src/data/battle.js';

async function bootAt(query) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(query),
    now: () => 0, clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; resetBattleHooks(); } };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('v60 b2 scenes the battle', () => {
  it('sets up a clash: soldiers and raiders face to face, a chieftain, a tower\'s shot, the camera on it, and says what it did', async () => {
    const r = await bootAt('skipTitle=1&seed=11&sample=1');
    try {
      const said = await devScene(r.api, 'v60-battle', { quick: true });
      expect(said.startsWith('v60-battle: clash, ')).toBe(true);
      const w = r.api.game().world, a = w.raid.active;
      expect(a.raiders.some((u) => u.chief)).toBe(true);
      expect(pairsOf(w).length).toBeGreaterThanOrEqual(2);
      expect(a.shots.some((s) => s.by === 'tower')).toBe(true);
      expect(w.speed).toBe(0);                                                                         // paused: the shot holds
      const kinds = unitsAt(w, w.day, null, { motion: 'full', now: 0 }).map((u) => u.kind);
      expect(kinds.filter((k) => /^soldier_[ab]_[rl]$/.test(k)).length).toBeGreaterThanOrEqual(2);
      expect(kinds.filter((k) => /^raider_[ab]_[rl]$/.test(k)).length).toBeGreaterThanOrEqual(2);
      expect(kinds.some((k) => k.startsWith('chief'))).toBe(true);
      expect(heldAge()).toBe(null);                                                                    // no hold unless asked
      const held = await devScene(r.api, 'v60-battle', { quick: true, hold: 120 });
      expect(held.startsWith('v60-battle: clash, ')).toBe(true);
      expect(heldAge()).toBe(120);
      const chief = await devScene(r.api, 'v60-battle', { quick: true, look: 'chief' });
      expect(chief.startsWith('v60-battle: chief, ')).toBe(true);
      expect(heldAge()).toBe(null);                                                                    // a new game clears the hold
    } finally { r.cleanup(); }
  });

  it('shows the raid beaten and the raid lost: the result in the alert row, the chieftain\'s banner where he fell, the last raiders fallen', async () => {
    const r = await bootAt('skipTitle=1&seed=11&sample=1');
    try {
      const won = await devScene(r.api, 'v60-battle', { quick: true, look: 'won' });
      expect(won.startsWith('v60-battle: won, raid beaten')).toBe(true);
      let w = r.api.game().world;
      expect([w.raid.active, w.raid.last.won]).toEqual([null, true]);
      expect(w.raid.last.chiefs).toBe(1);
      await tick();
      const row = document.querySelector('#banner .moment');
      expect(row.dataset.code).toBe('raid_beaten');
      expect(row.querySelector('strong').textContent).toBe('Raid beaten');
      const lost = await devScene(r.api, 'v60-battle', { quick: true, look: 'lost' });
      expect(lost.startsWith('v60-battle: lost, raid lost')).toBe(true);
      w = r.api.game().world;
      expect([w.raid.active, w.raid.last.won]).toEqual([null, false]);
      await tick();
      expect(document.querySelector('#banner .moment').dataset.code).toBe('raid_lost');
    } finally { r.cleanup(); }
  });

  it('sets a blaze going where the band struck, with no one to put it out, and shows every pose and the shells on bare desert', async () => {
    const r = await bootAt('skipTitle=1&seed=11&sample=1');
    try {
      const burning = await devScene(r.api, 'v60-battle', { look: 'burning' });                        // the full run: a few starting days tried for a strike that burns
      expect(burning.startsWith('v60-battle: burning, burning: 1')).toBe(true);
      let w = r.api.game().world;
      const fire = allBuildings(w).filter((b) => b.fire);
      expect([fire.length, fire[0].fire.stage]).toEqual([1, 'fire']);                                   // the blaze, unchecked, grew
      const poses = await devScene(r.api, 'v60-battle', { quick: true, look: 'poses' });
      expect(poses.startsWith('v60-battle: poses, on bare desert')).toBe(true);
      w = r.api.game().world;
      const kinds = new Set(unitsAt(w, w.day, null, { motion: 'full', now: 0 }).map((u) => u.kind));
      for (const k of ['soldier_a_r', 'soldier_a_l', 'raider_a_r', 'raider_a_l', 'chief_a_l', 'chief', 'raider_sack', 'raider_archer', 'raider_chariot']) expect([k, kinds.has(k)]).toEqual([k, true]);
      expect(FIGHTERS.length * POSES.length * FACES.length).toBe(12);
      const shells = await devScene(r.api, 'v60-battle', { quick: true, look: 'shells' });
      expect(shells.startsWith('v60-battle: shells, on bare desert')).toBe(true);
      w = r.api.game().world;
      const rubble = allBuildings(w).filter((b) => b.type === 'rubble' && b.was);
      expect(new Set(rubble.map((b) => b.was.cause))).toEqual(new Set(['fire', 'wreck']));
      expect(new Set(rubble.map((b) => b.was.type))).toEqual(new Set(['tower', 'storehouse', 'farm_grain', 'granary', 'temple']));
      expect(rubble.length).toBe(2 * (1 + 4 + 4 + 4 + 4));
      expect(rubble.every((b) => b.was.type in SHELL_CLASS)).toBe(true);
      expect(UNIT_ID_BASE).toBe(100000);
    } finally { r.cleanup(); }
  });
});

describe('v60 b2 scenes the raid that burns', () => {
  it('shows the ruins a raid left (a wreck\'s shell with its dust, rubble that remembers what stood there) and the result in the alert row', async () => {
    const r = await bootAt('skipTitle=1&seed=11&sample=1');
    try {
      const ruins = await devScene(r.api, 'v60-raid-burn', { quick: true, look: 'ruins' });
      expect(ruins.endsWith('strikes burn true, wreck true, loot true')).toBe(true);                   // the contract's ending, kept
      let w = r.api.game().world;
      expect(Boolean(w.raid.active)).toBe(true);                                                       // two days after the second strike: the raid is still on
      expect(r.api.game().ui.store.get().sheet).toBe(null);                                            // no sheet over the ruins
      const moment = await devScene(r.api, 'v60-raid-burn', { quick: true, look: 'moment' });
      expect(moment.endsWith('strikes burn true, wreck true, loot true')).toBe(true);
      w = r.api.game().world;
      expect(w.raid.active).toBe(null);
      await tick();
      expect(Boolean(document.querySelector('#banner .moment'))).toBe(true);
      const report = await devScene(r.api, 'v60-raid-burn', { quick: true });                         // the default look is as B1 left it: the summary sheet
      expect(report.endsWith('strikes burn true, wreck true, loot true')).toBe(true);
      expect(r.api.game().ui.store.get().sheet.kind).toBe('summary');
    } finally { r.cleanup(); }
  });
});
