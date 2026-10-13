import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { devScene, DEV_SCENES } from '../../../src/dev/scenes.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { coverageOf } from '../../../src/sim/fire.js';
import { tributeQuote } from '../../../src/sim/raids.js';
import { isGate } from '../../../src/sim/defence.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { DEFENCE, UNITS } from '../../../src/data/raids.js';
import { difficultyHint } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };

async function bootRig(params = '', { width = 1280, height = 800 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params),
    now: () => 0, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

// The seed-11 sample city the -Stage3 shots open (?skipTitle=1&seed=11&sample=1), built once and copied per scene.
let sampleText = null;
const sample = () => deserialize(sampleText || (sampleText = serialize(buildSampleCity(createWorld({ seed: 11 })))));

// Where a tile lands on the map, in the interface's own view (1280 x 800 here).
const screenOf = (g, x, y) => tileToScreen(g.cam, { width: 1280, height: 800 }, x, y);

describe('s3 balance dev scenes', () => {
  it('names the six -Stage3 scenes, chooses Peaceful on the title card, and refuses a scene it cannot set up', async () => {
    expect(DEV_SCENES).toEqual(['peaceful', 'fire', 'tribute', 'battle', 'score', 'ambient']);
    const r = await bootRig();
    try {
      expect(r.api.phase()).toBe('title');
      expect(await window.__thebes.devScene('peaceful')).toBe('peaceful');
      const chosen = r.root.querySelector('#title .choice.difficulty[aria-pressed="true"]');
      expect(chosen.dataset.value).toBe('peaceful');
      expect(r.root.querySelector('#title .difficulty-hint').textContent).toBe(difficultyHint('peaceful'));
      let error = null;
      try { await devScene(r.api, 'fire'); } catch (e) { error = e.message; }
      expect(error).toBe('devScene fire: no city is open (use ?skipTitle=1&sample=1)');
      error = null;
      try { await devScene(r.api, 'parade'); } catch (e) { error = e.message; }
      expect(error).toBe('devScene: no scene named parade (peaceful, fire, tribute, battle, score, ambient, early, plots, raid, raid-fire, raid-overlay, placing, farm, farm-raid, sheet, welcome, expanded, pyramid-placing, title, tutorial, site, pyramid, capstone, procession, palace, sitesheet, motion, variant)');
    } finally { r.cleanup(); }
  });

  it('sets a home on fire beside a blaze, with no staffed firehouse reaching either, in the middle of the map', async () => {
    const r = await bootRig();
    try {
      const g = r.api.startGame(sample());
      const text = await devScene(r.api, 'fire');
      const home = g.world.buildings[Number(text.split(' ')[1])];
      expect(home.fire).toEqual({ stage: 'fire', days: 4, left: 8 });
      const blaze = allBuildings(g.world).filter((b) => b.fire && b.fire.stage === 'blaze');
      expect(blaze.map((b) => [b.type, b.y, Math.abs(b.x - home.x)])).toEqual([['house', home.y, 1]]);
      expect(blaze[0].fire).toEqual({ stage: 'blaze', days: 1, need: 2, fought: 0 });
      expect([coverageOf(g.world, home), coverageOf(g.world, blaze[0])]).toEqual([0, 0]);   // the firehouses that reach them are paused
      expect(allBuildings(g.world).some((b) => b.type === 'firehouse' && b.paused)).toBe(true);
      expect([g.world.danger.lastFireDay, g.world.danger.firePaused, g.world.speed]).toEqual([g.world.day, true, 0]);
      expect(g.ui.settings.reducedMotion()).toBe(false);                                     // flames, not the still icon
      const [sx, sy] = screenOf(g, home.x + 0.5, home.y + 0.5);
      expect([Math.abs(sx - (1280 - 320) / 2) < 2, Math.abs(sy - (48 + 800) / 2) < 2]).toEqual([true, true]);   // the free map's middle, left of the side panel
    } finally { r.cleanup(); }
  });

  // On a phone the scene frames the fire in the map left free below the rows under the top bar, measured as the camera
  // measures them (ruling 168): in portrait above the bottom fifth, in compact left of the rail and its drawer.
  it('centres the fire on a phone in the map left free under the banner and the rows below it', async () => {
    for (const [width, height] of [[390, 844], [844, 390]]) {
      const r = await bootRig('', { width, height });
      try {
        const g = r.api.startGame(sample());
        const home = g.world.buildings[Number((await devScene(r.api, 'fire')).split(' ')[1])];
        const map = r.root.querySelector('#map').getBoundingClientRect();
        expect(r.root.querySelector('#banner').getBoundingClientRect().height).toBeGreaterThan(0);   // the fire's critical banner is up
        const rows = [r.root.querySelector('#topbar'), ...r.root.querySelector('#under-bar').children]
          .map((n) => n.getBoundingClientRect()).filter((b) => b.width > 2 && b.height > 2);
        const top = Math.max(48, ...rows.map((b) => b.bottom - map.top));
        const portrait = height > width, bottom = portrait ? height * 0.8 : height, right = portrait ? width : width - 56 - 268;
        const [sx, sy] = tileToScreen(g.cam, { width, height }, home.x + 0.5, home.y + 0.5);
        expect([width, Math.abs(sx - right / 2) < 2, Math.abs(sy - (top + bottom) / 2) < 2, top > 48]).toEqual([width, true, true, true]);
      } finally { r.cleanup(); }
    }
  });

  it('raises a later raid\'s warning with its tribute and asks the danger interface for the tribute sheet', async () => {
    const r = await bootRig();
    try {
      const g = r.api.startGame(sample());
      const asked = [];
      g.ui.danger.onAlertAction = (alert, kind) => asked.push([alert.code, kind]);   // stands in for Track D's sheet
      await devScene(r.api, 'tribute');
      const w = g.world.raid.warning;
      expect(Object.keys(w)).toEqual(['index', 'entry', 'dir', 'size', 'tribute', 'target', 'day', 'arrives', 'first']);
      expect([w.index, w.first, w.dir, g.world.raid.index, w.arrives - w.day]).toEqual([1, false, 'east', 2, 90]);
      expect(w.size).toBeGreaterThanOrEqual(2);
      const quote = tributeQuote(g.world);
      expect([quote.cost, quote.hidden, quote.payable]).toEqual([w.tribute, false, true]);
      expect(asked).toEqual([['raid_warning', 'tribute']]);
    } finally { r.cleanup(); }
  });

  it('stands raiders at a wall with a damaged gate, a breach and a tower either side of the gate, soldiers out behind it', async () => {
    const r = await bootRig();
    try {
      const g = r.api.startGame(sample());
      await devScene(r.api, 'battle');
      const { world } = g, a = world.raid.active;
      expect(Object.keys(a)).toEqual(['index', 'entry', 'dir', 'size', 'target', 'day', 'raiders', 'phase', 'targetId', 'struck', 'wait', 'byTowers', 'bySoldiers', 'burned', 'stolen', 'shots']);
      expect([a.dir, a.phase, a.raiders.length, a.raiders.filter((u) => u.hit).length, world.raid.warning]).toEqual(['north', 'attack', 6, 2, null]);
      const gate = a.raiders[0];                                                       // the first raider stands at the gate
      const gi = idx(world.size, gate.x, gate.y + 1);
      expect([isGate(world, gi), world.wall[gi] > 0, world.wall[gi] < DEFENCE.gateHp]).toEqual([true, true, true]);
      expect(world.wall.filter((v) => v === -1).length).toBe(1);
      const towers = allBuildings(world).filter((b) => b.type === 'tower' && world.wall[idx(world.size, b.x, b.y)] === DEFENCE.towerOnWallHp);
      expect(towers.map((t) => t.x - gate.x).sort()).toEqual([-1, 1]);
      expect(a.shots.length).toBe(2);
      const out = world.soldiers.filter((s) => s.task === 'out');
      expect(out.map((s) => [s.hp, s.y > gate.y + 1])).toEqual([[UNITS.soldier.hp, true], [UNITS.soldier.hp, true], [UNITS.soldier.hp, true]]);
      expect(out.every((s) => s.id > Math.max(...a.raiders.map((u) => u.id)))).toBe(true);   // fresh ids: drawn where they stand, not gliding from the yard
      expect(world.soldiers.map((s) => s.id)).toEqual(world.soldiers.map((s) => s.id).sort((x, y) => x - y));   // ascending id (contract)
      const ids = [...a.raiders, ...world.soldiers].map((u) => u.id);
      expect([new Set(ids).size === ids.length, Math.max(...ids) < world.nextUnitId]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });

  it('opens the city summary, and shows the river close up with ambient life on', async () => {
    const r = await bootRig();
    try {
      let g = r.api.startGame(sample());
      expect(await devScene(r.api, 'score')).toBe('score');
      expect(g.ui.store.get().sheet.kind).toBe('summary');
      expect(document.querySelector('#sheet').scrollTop).toBeGreaterThan(0);          // down to the parts after the goals
      g = r.api.startGame(sample());
      const [, at] = (await devScene(r.api, 'ambient')).split(' ');
      const [x, y] = at.split(',').map(Number);
      expect(g.world.terrain[idx(g.world.size, x, y)]).toBe(TERRAIN.WATER);
      expect([g.ui.settings.motionLevel(), g.ui.settings.reducedMotion(), g.cam.zoom]).toEqual(['full', false, 1.5]);   // Stage 4: Motion Full
    } finally { r.cleanup(); }
  });
});
