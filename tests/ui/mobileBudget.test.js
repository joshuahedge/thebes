// The phone height budget (mobile UX review, docs/superpowers/notes/2026-10-12-mobile-ux-review.md, section 3; ruling
// 175): each mobile scene (src/dev/scenes.js MOBILE_SCENES, the busy moments tools/shots.ps1 -Mobile captures) is booted
// as its page query opens it, on a small portrait phone (375x667) and a landscape phone (844x390) at 100% and 150% text,
// and measureRows() reads where the rows under the top bar end. The scenes run quick (no settling waits; the clock is
// moved past the session's first seconds for 'early', whose tip waits for them). The shell is mounted in the test page,
// so sizes in vh (the portrait sheet's 60vh) follow the test page, not the phone; no check reads them. The checks:
//   end    the rows end by 30% of the height in portrait at 100% text, 40% at 150%; with a sheet open 20% and 25%;
//          in landscape by 40%
//   rows   at most two rows (the alert row and the guidance row), one on a landscape phone at 125% text or more
//          (ruling 172), and while a sheet is open only the alert row (ruling 168)
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

const SIZES = [[375, 667], [844, 390]];
const TEXT_SIZES = [100, 150];

// Not met yet, with what M1 measured: where the rows end (share of the height), or the rows and the layers in them.
const NOT_YET = new Set([
  'early 375x667 100% end',         // 37%
  'early 375x667 100% rows',        // 3 (goal+tip+caption)
  'early 375x667 150% end',         // 49%
  'early 844x390 150% end',         // 45%
  'early 844x390 150% rows',        // 2 (goal+tip)

  'plots 375x667 100% end',         // 44%
  'plots 375x667 100% rows',        // 3 (goal+tip+caption)
  'plots 375x667 150% end',         // 49%
  'plots 844x390 150% end',         // 53%
  'plots 844x390 150% rows',        // 2 (goal+tip)

  'raid 375x667 100% end',          // 44%
  'raid 375x667 100% rows',         // 3 (alert+goal+caption)
  'raid 375x667 150% end',          // 72%
  'raid 375x667 150% rows',         // 3 (alert+goal+caption)
  'raid 844x390 100% end',          // 56%
  'raid 844x390 100% rows',         // 3 (alert+goal+caption)
  'raid 844x390 150% end',          // 77%
  'raid 844x390 150% rows',         // 3 (alert+goal+caption)

  'raid-fire 375x667 100% end',     // 44%
  'raid-fire 375x667 100% rows',    // 3 (alert+goal+caption)
  'raid-fire 375x667 150% end',     // 79%
  'raid-fire 375x667 150% rows',    // 3 (alert+goal+caption)
  'raid-fire 844x390 100% end',     // 56%
  'raid-fire 844x390 100% rows',    // 3 (alert+goal+caption)
  'raid-fire 844x390 150% end',     // 93%
  'raid-fire 844x390 150% rows',    // 3 (alert+goal+caption)

  'raid-overlay 375x667 100% end',  // 48%
  'raid-overlay 375x667 100% rows', // 3 (alert+legend+goal+caption)
  'raid-overlay 375x667 150% end',  // 84%
  'raid-overlay 375x667 150% rows', // 3 (alert+legend+goal+caption)
  'raid-overlay 844x390 100% end',  // 56%
  'raid-overlay 844x390 100% rows', // 3 (alert+legend+goal+caption)
  'raid-overlay 844x390 150% end',  // 77%
  'raid-overlay 844x390 150% rows', // 3 (alert+legend+goal+caption)

  'placing 375x667 150% end',       // 42% (the alert row's chip takes two lines)
  'placing 844x390 100% end',       // 45%
  'placing 844x390 150% end',       // 67%
  'placing 844x390 150% rows',      // 2 (alert+legend+goal)

  'sheet 375x667 100% end',         // 38%
  'sheet 375x667 100% rows',        // 2 (alert+goal)
  'sheet 375x667 150% end',         // 62%
  'sheet 375x667 150% rows',        // 2 (alert+goal)
  'sheet 844x390 100% end',         // 45%
  'sheet 844x390 100% rows',        // 2 (alert+goal)
  'sheet 844x390 150% end',         // 67%
  'sheet 844x390 150% rows',        // 2 (alert+goal)
  'sheet 844x390 150% edge',        // the rows reach 780 px, the sheet starts at 520

  'welcome 375x667 100% end',       // 22%
  'welcome 375x667 100% rows',      // 1 (goal)
  'welcome 375x667 150% end',       // 34%
  'welcome 375x667 150% rows',      // 1 (goal)
  'welcome 844x390 100% rows',      // 1 (goal)
  'welcome 844x390 150% rows',      // 1 (goal)
  'welcome 844x390 150% edge',      // the rows reach 724 px, the sheet starts at 520
]);

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
  early: (g) => [g.ui.tips.current() !== null, g.world.speed],
  plots: (g) => [g.ui.tips.current() === 'press_play', g.world.speed],
  raid: (g) => [raidUp(g), g.world.speed],
  'raid-fire': (g) => [raidUp(g), Object.values(g.world.buildings).some((b) => b.fire && b.fire.stage === 'fire')],
  'raid-overlay': (g) => [raidUp(g), g.ui.store.get().overlay],
  placing: (g) => [raidUp(g), g.ui.store.get().mode, g.ui.store.get().tool.type],
  sheet: (g) => [raidUp(g), g.ui.store.get().sheet.kind, g.world.buildings[g.ui.store.get().selectedId].type],
  welcome: (g) => [g.ui.store.get().sheet.kind, g.world.speed],
};
const SET_UP_WANTED = {
  early: [true, 0], plots: [true, 0], raid: [true, 0], 'raid-fire': [true, true], 'raid-overlay': [true, 'fire'],
  placing: [true, 'placing', 'well'], sheet: [true, 'info', 'house'], welcome: ['welcome', 0],
};

// The budget checks for one measurement: [{ id, ok, got, limit }].
function budgetChecks(scene, m) {
  const at = `${scene} ${m.width}x${m.height} ${m.textSize}%`;
  const portrait = m.layout === 'portrait', sheet = m.sheet !== null;
  const endLimit = portrait ? (sheet ? (m.textSize >= 150 ? 0.25 : 0.2) : (m.textSize >= 150 ? 0.4 : 0.3)) : 0.4;
  const rowLimit = !portrait && m.textSize >= 125 ? 1 : 2;
  const end = m.rowsEnd / m.height, names = Object.keys(m.layers);
  const out = [
    { id: `${at} end`, ok: end <= endLimit + 0.005, got: `${Math.round(end * 100)}%`, limit: `${Math.round(endLimit * 100)}%` },
    sheet
      ? { id: `${at} rows`, ok: names.every((k) => k === 'alert'), got: `${m.rows} (${names.join('+')})`, limit: 'the alert row only' }
      : { id: `${at} rows`, ok: m.rows <= rowLimit, got: `${m.rows} (${names.join('+')})`, limit: rowLimit },
  ];
  if (!portrait && sheet && m.sheet.left > m.width / 3) {
    out.push({ id: `${at} edge`, ok: m.rows === 0 || m.rowsRight <= m.sheet.left + 1, got: Math.round(m.rowsRight), limit: Math.round(m.sheet.left) });
  }
  return out;
}

describe('mobile height budget', () => {
  it('names a page query for every mobile scene, and lists only checks it makes', () => {
    expect(MOBILE_SCENES).toEqual(['early', 'plots', 'raid', 'raid-fire', 'raid-overlay', 'placing', 'sheet', 'welcome']);
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
            if (name === 'early') r.skip(TIP_FIRST_DELAY_MS);   // the scene waits out the session's first seconds, so its tip may show
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
