// The phone height budget (mobile UX review, docs/superpowers/notes/2026-10-12-mobile-ux-review.md, section 3; ruling
// 175): each mobile scene (src/dev/scenes.js MOBILE_SCENES, the busy moments tools/shots.ps1 -Mobile captures) is booted
// as its page query opens it, on a small portrait phone (375x667) and two landscape phones (844x390 and 667x375, the
// review's worst case) at 100%, 125% and 150% text, and measureRows() reads where the rows under the top bar end. The
// scenes run quick (no settling waits; the clock is moved past the session's first seconds for 'early' and 'expanded', as the scene
// waits them out; on a paused phone its goal tip then waits for Play, ruling 176). The shell is mounted in the test page,
// so sizes in vh (the portrait sheet's 60vh) follow the test page, not the phone; no check reads them. The checks:
//   end    the rows end by 30% of the height in portrait at 100% text, 40% at 125% and 150%; with a sheet open 20% and
//          25%; in landscape by 40%; in the 'expanded' scene (a tip opened in place, placement review P8) by 40% at every
//          size and text size
//   rows   at most two rows (the alert row and the guidance row), one on a landscape phone at 125% text or more
//          (ruling 172), and that one the alert row whenever a banner shows; while a sheet is open only the alert row
//          (ruling 168)
//   edge   in landscape the rows stop at an open sheet's left edge
// NOT_YET lists the checks the game does not meet yet. Each must fail as listed, so the task that meets one removes it
// here; the list is empty when the mobile UX pass is done.
import { describe, it, expect } from '../harness.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { devScene, measureRows, MOBILE_SCENES, MOBILE_SCENE_PARAMS } from '../../src/dev/scenes.js';
import { TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';

const SIZES = [[375, 667], [844, 390], [667, 375]];
const TEXT_SIZES = [100, 125, 150];

// Not met yet: none. The mobile UX pass met every check (M6 met the last, on the landscape phone: the compact rows and the
// one-row rule at large text, ruling 172). A check that fails again is a regression, not a task left to do.
const NOT_YET = new Set([]);

const noStorage = { getItem: () => null, setItem: () => {} };
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// The page as the scene's query opens it, at the given size: the real game loop runs (the city is paused), and the
// interface's clock can be moved on (skip) past the session's first moments.
async function bootScene(name, width, height) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  let skew = 0;
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(MOBILE_SCENE_PARAMS[name]),
    now: () => performance.now() + skew, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
  });
  return {
    api, root: shell.root,
    skip(ms) { skew += ms; },
    cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; },
  };
}

// What each scene must have set up, read from the game (so a scene that quietly stops setting up its moment fails here,
// not as a budget that is suddenly met).
const raidUp = (g) => g.world.raid.warning !== null;
const SET_UP = {
  early: (g) => [g.world.goals.completed.length > 0, g.ui.tips.current(), document.body.dataset.guidance, g.world.speed],   // the goal's tip waits for Play: the goal has the row (ruling 176)
  plots: (g) => [g.ui.tips.current() === 'press_play', g.world.speed],
  raid: (g) => [raidUp(g), g.world.speed],
  'raid-fire': (g) => [raidUp(g), Object.values(g.world.buildings).some((b) => b.fire && b.fire.stage === 'fire')],
  'raid-overlay': (g) => [raidUp(g), g.ui.store.get().overlay],
  placing: (g) => [raidUp(g), g.ui.store.get().mode, g.ui.store.get().tool.type],
  farm: (g) => [raidUp(g), g.ui.store.get().mode, g.ui.store.get().tool.type, g.ui.store.get().overlay],
  'farm-raid': (g) => [raidUp(g), g.ui.store.get().mode, g.ui.store.get().tool.type, g.ui.store.get().overlay],
  sheet: (g) => [raidUp(g), g.ui.store.get().sheet.kind, g.world.buildings[g.ui.store.get().selectedId].type],
  welcome: (g) => [g.ui.store.get().sheet.kind, g.world.speed],
  expanded: (g) => [g.ui.tips.current(), g.ui.store.get().guidanceOpen, document.body.dataset.guidance, g.world.speed],   // the goal's tip, open, on the row
};
const SET_UP_WANTED = {
  early: [true, null, 'goal', 0], plots: [true, 0], raid: [true, 0], 'raid-fire': [true, true], 'raid-overlay': [true, 'fire'],
  placing: [true, 'placing', 'well'], farm: [false, 'placing', 'farm_grain', 'ground'], 'farm-raid': [true, 'placing', 'farm_grain', 'ground'], sheet: [true, 'info', 'house'], welcome: ['welcome', 0], expanded: ['goals_list', true, 'tip', 0],
};

// The budget checks for one measurement: [{ id, ok, got, limit }].
function budgetChecks(scene, m) {
  const at = `${scene} ${m.width}x${m.height} ${m.textSize}%`;
  const portrait = m.layout === 'portrait', sheet = m.sheet !== null;
  const large = m.textSize >= 125;                   // the spec's budget names 100% and 150%; 125% is held to the larger-text line
  const endLimit = scene === 'expanded' ? 0.4 : portrait ? (sheet ? (large ? 0.25 : 0.2) : (large ? 0.4 : 0.3)) : 0.4;
  const oneRow = !portrait && large;
  const end = m.rowsEnd / m.height, names = Object.keys(m.layers);
  const got = `${m.rows} (${names.join('+')})`;
  const out = [
    { id: `${at} end`, ok: end <= endLimit + 0.005, got: `${Math.round(end * 100)}%`, limit: `${Math.round(endLimit * 100)}%` },
    sheet
      ? { id: `${at} rows`, ok: names.every((k) => k === 'alert'), got, limit: 'the alert row only' }
      : oneRow && names.includes('alert')
        ? { id: `${at} rows`, ok: names.length === 1, got, limit: 'the alert row only (ruling 172)' }
        : { id: `${at} rows`, ok: m.rows <= (oneRow ? 1 : 2), got, limit: oneRow ? 1 : 2 },
  ];
  if (!portrait && sheet && m.sheet.left > m.width / 3) {
    out.push({ id: `${at} edge`, ok: m.rows === 0 || m.rowsRight <= m.sheet.left + 1, got: Math.round(m.rowsRight), limit: Math.round(m.sheet.left) });
  }
  return out;
}

describe('mobile height budget', () => {
  it('names a page query for every mobile scene, and lists only checks it makes', () => {
    expect(MOBILE_SCENES).toEqual(['early', 'plots', 'raid', 'raid-fire', 'raid-overlay', 'placing', 'farm', 'farm-raid', 'sheet', 'welcome', 'expanded']);
    expect(MOBILE_SCENES.every((name) => typeof MOBILE_SCENE_PARAMS[name] === 'string')).toBe(true);
    const kinds = ['end', 'rows', 'edge'], sizes = SIZES.map(([w, h]) => `${w}x${h}`), texts = TEXT_SIZES.map((t) => `${t}%`);
    const unknown = [...NOT_YET].filter((id) => {
      const [scene, size, text, kind] = id.split(' ');
      return !(MOBILE_SCENES.includes(scene) && sizes.includes(size) && texts.includes(text) && kinds.includes(kind));
    });
    expect(unknown).toEqual([]);
  });

  for (const name of MOBILE_SCENES) {
    it(`holds the budget in the ${name} scene, or fails exactly the checks NOT_YET lists`, async () => {
      const wrong = [], made = new Set();
      for (const [width, height] of SIZES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene(name, width, height);
          try {
            const g = r.api.game();
            g.ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            if (name === 'early' || name === 'expanded') r.skip(TIP_FIRST_DELAY_MS);   // the scene waits out the session's first seconds before its road or its tip
            await devScene(r.api, name, { quick: true });
            await frame(); await frame();
            expect(SET_UP[name](g)).toEqual(SET_UP_WANTED[name]);
            const m = measureRows(r.root);
            expect([m.width, m.height, m.textSize]).toEqual([width, height, textSize]);
            for (const c of budgetChecks(name, m)) {
              made.add(c.id);
              if (c.ok === NOT_YET.has(c.id)) wrong.push(`${c.id}: ${c.ok ? 'now met, take it off NOT_YET' : 'not met'} (${c.got}, limit ${c.limit})`);
            }
          } finally { r.cleanup(); }
        }
      }
      for (const id of NOT_YET) if (id.startsWith(`${name} `) && !made.has(id)) wrong.push(`${id}: no longer checked, take it off NOT_YET`);
      expect(wrong).toEqual([]);
    });
  }
});
