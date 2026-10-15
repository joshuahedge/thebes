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
async function bootScene(name, width, height, params = MOBILE_SCENE_PARAMS[name]) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  let skew = 0;
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params),
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
  'pyramid-placing': (g) => [g.ui.store.get().mode, g.ui.store.get().tool.type, g.ui.store.get().overlay, Boolean(document.querySelector('#confirm .conds.tall'))],   // Stage 4 (ruling 252)
};
const SET_UP_WANTED = {
  early: [true, null, 'goal', 0], plots: [true, 0], raid: [true, 0], 'raid-fire': [true, true], 'raid-overlay': [true, 'fire'],
  placing: [true, 'placing', 'well'], farm: [false, 'placing', 'farm_grain', 'ground'], 'farm-raid': [true, 'placing', 'farm_grain', 'ground'], sheet: [true, 'info', 'house'], welcome: ['welcome', 0], expanded: ['goals_list', true, 'tip', 0],
  'pyramid-placing': ['placing', 'pyramid_great', 'ground', true],
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
    expect(MOBILE_SCENES).toEqual(['early', 'plots', 'raid', 'raid-fire', 'raid-overlay', 'placing', 'farm', 'farm-raid', 'sheet', 'welcome', 'expanded', 'pyramid-placing']);
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

// Stage 4.6 (UX rule 2): a court letter, the Court track's dev scene 's46-court-letter' on the sample city, as a sheet and as the alert row
// alone, on a small and a tall phone at each text size. The rows obey the budget above (a sheet leaves only the alert row; the letter alone
// in the row is one row), and the sheet may scroll but its Send button is reachable: scrolled to, it sits on screen and is a 44 px target.
describe('mobile height budget: a court letter (Stage 4.6)', () => {
  const PHONES = [[375, 667], [390, 844]];
  for (const [what, options] of [['as a sheet', {}], ['in the alert row, unread', { alert: true }]]) {
    it(`holds the budget with a court letter ${what}, and Send is reachable`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene('s46-court-letter', width, height, 'skipTitle=1&seed=11&sample=1');
          try {
            const g = r.api.game();
            g.ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, 's46-court-letter', { ...options, quick: true });
            await frame(); await frame();
            const m = measureRows(r.root);
            const at = `${width}x${height} ${textSize}%`;
            expect([at, said.startsWith('court letter: ') && !said.includes('no request')]).toEqual([at, true]);
            for (const c of budgetChecks('s46-court-letter', m)) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);
            if (options.alert) {
              expect([at, Boolean(r.root.querySelector('#banner .critical[data-code="court_letter"]'))]).toEqual([at, true]);
            } else {
              expect([at, g.ui.store.get().sheet.kind]).toEqual([at, 'letter']);
              const send = r.root.querySelector('#sheet .court-choice.send button');
              expect([at, Boolean(send)]).toEqual([at, true]);
              send.scrollIntoView({ block: 'nearest' });
              const b = send.getBoundingClientRect(), frameBox = r.root.getBoundingClientRect();
              if (b.height < 44 - 0.5 || b.width < 44 - 0.5) wrong.push(`${at} send: ${Math.round(b.width)}x${Math.round(b.height)} is under 44x44`);
              if (b.top < frameBox.top - 1 || b.bottom > frameBox.bottom + 1) wrong.push(`${at} send: not on screen (${Math.round(b.top)}..${Math.round(b.bottom)} of ${Math.round(frameBox.height)})`);
            }
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});

// Stage 4.7 (Task 3 review): the Ground legend with its hills key, on a hilly map (the s47-hills scene), on a small and a tall phone at each text
// size: the rows obey the budget (the legend alone in the guidance row) and every key, the hills' among them, is on screen inside the frame.
describe('mobile height budget: the Ground legend with hills (Stage 4.7)', () => {
  const PHONES = [[375, 667], [390, 844]];
  it('holds the budget with the hills key, and the key is inside the frame', async () => {
    const wrong = [];
    for (const [width, height] of PHONES) {
      for (const [textSize, banner] of TEXT_SIZES.flatMap((t) => [[t, false], [t, true]])) {   // each with the alert row clear, and under the scene's debt banner
        const r = await bootScene('s47-hills', width, height, 'skipTitle=1&seed=11&sample=1');
        try {
          const g = r.api.game();
          g.ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          const said = await devScene(r.api, 's47-hills', { quick: true });
          const g2 = r.api.game();                                  // the scene started a new city, so a new game
          if (!banner) g2.ui.alerts.refresh();                      // the scene's gold fixture leaves the fresh city's debt banner stale: cleared, or kept as the banner variant
          g2.ui.store.set({ overlay: 'ground' });
          await frame(); await frame();
          const at = `${width}x${height} ${textSize}%${banner ? ' under the debt banner' : ''}`;
          expect([at, Boolean(r.root.querySelector('#banner .critical'))]).toEqual([at, banner]);   // the variant has the banner it names
          expect([at, said.includes('hills [{') ? 'hilly' : said]).toEqual([at, 'hilly']);                      // a hilly map
          const key = r.root.querySelector('#legend .ground-keys .key:last-of-type');
          expect([at, Boolean(key)]).toEqual([at, true]);
          const b = key.getBoundingClientRect(), box = r.root.getBoundingClientRect();
          if (b.left < box.left - 1 || b.right > box.right + 1) wrong.push(`${at}: the hills key is outside the frame (${Math.round(b.left)}..${Math.round(b.right)} of ${Math.round(box.width)})`);
          for (const c of budgetChecks('s47-hills', measureRows(r.root))) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});

// Stage 4.7 (Task 4): the house tool with its spots (the s47-house-spots scene, the sample city with a well beside the free plots): the legend of Good and Fair has the guidance row alone
// (the alert row may sit above it), it and the Done button are inside the frame, Done is a 44 px target, on a small and a tall phone at each text size.
describe('mobile height budget: the house tool with its spots (Stage 4.7)', () => {
  const PHONES = [[375, 667], [390, 844]];
  it('holds the budget with the spots legend, and Done is reachable', async () => {
    const wrong = [];
    for (const [width, height] of PHONES) {
      for (const textSize of TEXT_SIZES) {
        const r = await bootScene('s47-house-spots', width, height, 'skipTitle=1&seed=11&sample=1');
        try {
          r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          const said = await devScene(r.api, 's47-house-spots', {});
          const g = r.api.game();
          g.ui.alerts.refresh();
          await frame(); await frame();
          const at = `${width}x${height} ${textSize}%`;
          expect([at, /\b[1-9]\d* good and [1-9]\d* fair\b/.test(said) ? 'both kinds' : said]).toEqual([at, 'both kinds']);
          expect([at, g.ui.store.get().tool && g.ui.store.get().tool.kind, document.body.dataset.guidance]).toEqual([at, 'houses', 'legend']);
          const box = r.root.getBoundingClientRect();
          const legend = r.root.querySelector('#legend .strip.spots');
          if (!legend) { wrong.push(`${at}: no spots legend`); continue; }
          for (const [name, n] of [['legend', legend], ['done', r.root.querySelector('#confirm .done')]]) {
            if (!n) { wrong.push(`${at}: no ${name}`); continue; }
            const b = n.getBoundingClientRect();
            if (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1) wrong.push(`${at}: the ${name} is outside the frame`);
            if (name === 'done' && (b.height < 44 - 0.5 || b.width < 44 - 0.5)) wrong.push(`${at}: Done is ${Math.round(b.width)}x${Math.round(b.height)}, under 44x44`);
          }
          for (const c of budgetChecks('s47-house-spots', measureRows(r.root))) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});

// Stage 4.7 (Task 6): a store's sheet with the Fetch list open (the s47-carts scene, sheet: true: the near storehouse with an order and a cart on the road), on a small and a tall
// phone at each text size: the rows obey the budget (a sheet leaves only the alert row), the panel is inside the frame with no sideways scroll, and every control in it (the
// Fetch row, each switch and stepper button, Show me) is a 44 px target that scrolled to sits on screen, on the first good and the last.
describe('mobile height budget: the store sheet with Fetch open (Stage 4.7)', () => {
  const PHONES = [[375, 667], [390, 844]];
  it('holds the budget, the panel fits the width and its controls are reachable 44 px targets', async () => {
    const wrong = [];
    for (const [width, height] of PHONES) {
      for (const textSize of TEXT_SIZES) {
        const r = await bootScene('s47-carts', width, height, 'skipTitle=1&seed=11&sample=1');
        try {
          r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          const said = await devScene(r.api, 's47-carts', { sheet: true });
          const g = r.api.game();
          g.ui.alerts.refresh();
          await frame(); await frame();
          const at = `${width}x${height} ${textSize}%`;
          expect([at, said.includes('cart out, 20 pottery')]).toEqual([at, true]);
          expect([at, g.ui.store.get().sheet.kind]).toEqual([at, 'info']);
          const sheet = r.root.querySelector('#sheet'), panel = sheet.querySelector('.fetch-panel');
          if (!panel) { wrong.push(`${at}: no Fetch panel`); continue; }
          expect([at, panel.querySelector('.fetch-head').getAttribute('aria-expanded')]).toEqual([at, 'true']);
          const box = r.root.getBoundingClientRect();
          if (sheet.scrollWidth > sheet.clientWidth + 1) wrong.push(`${at}: the sheet scrolls sideways (${sheet.scrollWidth} of ${sheet.clientWidth})`);
          const rows = [...panel.querySelectorAll('.fetch-good')];
          const controls = [panel.querySelector('.fetch-head'), ...[rows[0], rows[rows.length - 1]].flatMap((li) => [...li.querySelectorAll('button')])];
          for (const n of controls) {
            n.scrollIntoView({ block: 'nearest' });
            const b = n.getBoundingClientRect();
            const name = n.getAttribute('aria-label') || n.textContent;
            if (b.height < 44 - 0.5 || b.width < 44 - 0.5) wrong.push(`${at} ${name}: ${Math.round(b.width)}x${Math.round(b.height)} is under 44x44`);
            if (b.left < box.left - 1 || b.right > box.right + 1) wrong.push(`${at} ${name}: outside the frame sideways (${Math.round(b.left)}..${Math.round(b.right)} of ${Math.round(box.width)})`);
            if (b.top < box.top - 1 || b.bottom > box.bottom + 1) wrong.push(`${at} ${name}: not on screen when scrolled to`);
          }
          for (const c of budgetChecks('sheet', measureRows(r.root))) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});

// Stage 4.7 (Task 7, rulings 469 and 471): the court sheet with the yearly tribute (the s47-quota scene: year 8, part of it sent) and an Estate's sheet with
// what keeps it (the s47-estate scene: three kinds of food missing, linen and pottery held only in a far store), on a small and a tall phone at each text size:
// the rows obey the budget (a sheet leaves only the alert row), the sheet never scrolls sideways, and each control named (Send, the tribute's Show me; the
// keep list's Show me buttons) is a 44 px target that, scrolled to, sits on screen inside the frame.
describe('mobile height budget: the court sheet with the tribute and an Estate\'s sheet (Stage 4.7)', () => {
  const PHONES = [[375, 667], [390, 844]];
  const SCENES = [
    ['s47-quota', (said) => said.includes('year 8'), (sheet) => [sheet.querySelector('.quota-send button'), sheet.querySelector('.quota-actions .show-me')]],
    ['s47-estate', (said) => said.includes('estate #'), (sheet) => [...sheet.querySelectorAll('.keep-list .show-me')]],
  ];
  for (const [scene, setUp, controlsOf] of SCENES) {
    it(`holds the budget with ${scene}, the sheet fits the width and its controls are reachable 44 px targets`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene(scene, width, height, 'skipTitle=1&seed=11&sample=1');
          try {
            r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, scene, { quick: true });
            const g = r.api.game();
            g.ui.settings.set({ textSize, reducedMotion: 'on' });
            g.ui.refresh();
            await frame(); await frame();
            const at = `${scene} ${width}x${height} ${textSize}%`;
            expect([at, setUp(said)]).toEqual([at, true]);
            const sheet = r.root.querySelector('#sheet');
            const controls = controlsOf(sheet).filter(Boolean);
            if (!controls.length) { wrong.push(`${at}: no controls`); continue; }
            const box = r.root.getBoundingClientRect();
            if (sheet.scrollWidth > sheet.clientWidth + 1) wrong.push(`${at}: the sheet scrolls sideways (${sheet.scrollWidth} of ${sheet.clientWidth})`);
            for (const n of controls) {
              n.scrollIntoView({ block: 'nearest' });
              const b = n.getBoundingClientRect();
              const name = n.getAttribute('aria-label') || n.textContent;
              if (b.height < 44 - 0.5 || b.width < 44 - 0.5) wrong.push(`${at} ${name}: ${Math.round(b.width)}x${Math.round(b.height)} is under 44x44`);
              if (b.left < box.left - 1 || b.right > box.right + 1) wrong.push(`${at} ${name}: outside the frame sideways`);
              if (b.top < box.top - 1 || b.bottom > box.bottom + 1) wrong.push(`${at} ${name}: not on screen when scrolled to`);
            }
            for (const c of budgetChecks('sheet', measureRows(r.root))) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
