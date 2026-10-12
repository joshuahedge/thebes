import { describe, it, expect } from '../../harness.js';
import { CRITICAL, CRITICAL_RANK, triage, bannerModel, createAlerts } from '../../../src/ui/alerts.js';
import { minimapPins, createMinimap } from '../../../src/ui/minimap.js';
import { createSheets } from '../../../src/ui/sheets.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select, openSheet } from '../../../src/ui/modes.js';
import { tributeQuote, raidDay } from '../../../src/sim/raids.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { RAIDS } from '../../../src/data/raids.js';
import { createCamera } from '../../../src/render/camera.js';
import { UI } from '../../../src/render/art/palette.js';
import { alertText, viewLabel, T, DANGER_UI_TEXT as D, ALERT_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { pixelAt } from '../../helpers/canvas.js';
import { rigUI } from '../../helpers/uiWorld.js';

function rig() {
  const { root, cleanup } = mount('<div id="banner"></div><p id="live"></p>');
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const potter = addRaw(world, 'potter', 2, 11);
  const granary = addRaw(world, 'granary', 6, 11);
  const farm = addRaw(world, 'farm_grain', 2, 8, { blocked: 'no_storage' });
  staffAll(world);
  return { root, world, potter, granary, farm, banner: root.querySelector('#banner'), live: root.querySelector('#live'), cleanup };
}
// A raid warning set by hand in the contract's shape (src/sim/raids.js), and its alert as raidAlerts words it.
function warn(world, { first = false, size = 6, arrives = 72 } = {}) {
  world.raid.warning = { index: first ? 0 : 1, entry: { x: 31, y: 16 }, dir: 'east', size, tribute: first ? null : 240, target: 'storehouse', day: 0, arrives, first };
  return { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives };
}
const click = (node) => fire(node, 'click');

describe('s3 ui alert tiers', () => {
  it('ranks an active raid, a fire no staffed firehouse reaches, a raid warning, debt and save failing as critical, in that order (ruling 166)', () => {
    const r = rig();
    try {
      expect(CRITICAL_RANK).toEqual(['raid', 'fire', 'raid_warning', 'debt', 'save_failed']);
      for (const c of CRITICAL_RANK) expect(CRITICAL.has(c)).toBe(true);
      for (const c of ['blaze', 'fire_risk', 'no_storage']) expect(CRITICAL.has(c)).toBe(false);
      const list = [{ code: 'save_failed' }, { code: 'debt' }, { code: 'fire', id: r.potter.id }, { code: 'blaze', id: r.granary.id },
        { code: 'raid', x: 20, y: 16, left: 4 }, { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }, { code: 'fire_risk', id: r.farm.id }];
      const t = triage(r.world, list);
      expect(t.critical.map((a) => a.code)).toEqual(['raid', 'fire', 'raid_warning', 'debt', 'save_failed']);
      expect(t.ordinary.map((a) => a.code)).toEqual(['blaze', 'fire_risk']);
      // A fire nobody reaches burns out in seconds: it takes the banner from raiders who are months away.
      const banner = bannerModel(r.world, triage(r.world, [warn(r.world), { code: 'fire', id: r.potter.id }, { code: 'debt' }]).critical);
      expect([banner.code, banner.more]).toEqual(['fire', 2]);
    } finally { r.cleanup(); }
  });

  it('on phones keeps the banner to one line: a raid warning as its chip, whose words open the raid sheet, and View; no Shrink or "+N more" (ruling 167)', () => {
    const r = rig();
    try {
      let phone = true;
      let alerts = [warn(r.world, { arrives: 72 }), { code: 'debt' }, { code: 'no_storage', id: r.farm.id }];
      const actions = [];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, onAction: (x, k) => actions.push([x.code, k]), getAlerts: () => alerts, phone: () => phone });
      a.refresh();
      expect(r.banner.querySelectorAll('.critical').length).toBe(1);
      const row = r.banner.querySelector('.critical');
      expect([row.className, row.dataset.code]).toEqual(['critical line chip', 'raid_warning']);
      const words = row.querySelector('.warning');
      expect([words.textContent, words.getAttribute('aria-label')]).toEqual(['Raid from the east · 2 m 12 d', 'Raid from the east · 2 m 12 d: show the whole warning']);
      expect([...row.querySelectorAll('button')].map((b) => b.className)).toEqual(['warning quiet', 'view']);
      expect([row.querySelector('strong'), row.querySelector('.defence'), row.querySelector('.tribute'), row.querySelector('.collapse'), row.querySelector('.more')]).toEqual([null, null, null, null, null]);
      expect(row.querySelector('.view').getAttribute('aria-label')).toBe(viewLabel('Raid from the east · 2 m 12 d'));
      click(words);
      click(row.querySelector('.view'));
      expect(actions).toEqual([['raid_warning', 'warning'], ['raid_warning', 'view']]);   // the raid sheet, then its map point
      expect(a.count()).toBe(2);                                                           // the badge: debt and the warning-tier alert, every one the row is not showing
      words.focus();
      r.world.day = 65;                                                                    // the countdown moves on: the row is rebuilt, focus stays on the words
      a.refresh();
      expect(r.banner.querySelector('.warning').textContent).toBe('Raid from the east · 7 d');
      expect(document.activeElement === r.banner.querySelector('.warning')).toBe(true);
      // A fire nobody reaches outranks the warning (ruling 166): the fires' row is its title and View, the fix is in the list.
      alerts = [warn(r.world, { arrives: 72 }), { code: 'fire', id: r.potter.id }, { code: 'fire', id: r.granary.id }, { code: 'debt' }];
      a.refresh();
      const fires = r.banner.querySelector('.critical');
      expect([fires.className, fires.querySelector('strong').textContent, fires.textContent.includes(D.firesFix)]).toEqual(['critical line', D.firesTitle(2), false]);
      expect([...fires.querySelectorAll('button')].map((b) => b.className)).toEqual(['view']);
      expect(a.count()).toBe(2);                                                           // the warning and debt: both fires are on the row
      phone = false;                                                                       // a wide screen: today's banner and badge
      a.refresh();
      expect([r.banner.querySelector('.critical').className, r.banner.querySelector('.more').textContent, a.count()]).toEqual(['critical', '+2 more', 0]);
    } finally { r.cleanup(); }
  });

  it('shows one banner with "+N more" that opens the list, and rolls repeated fires into one line whose View steps through them', () => {
    const r = rig();
    try {
      let alerts = [{ code: 'fire', id: r.potter.id }, { code: 'fire', id: r.granary.id }, { code: 'debt' }, { code: 'save_failed' }, { code: 'no_storage', id: r.farm.id }];
      const viewed = [], actions = [];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, onView: (x) => viewed.push(x.id), onAction: (x, k) => actions.push([x.code, k]), getAlerts: () => alerts });
      a.refresh();
      expect(r.banner.querySelectorAll('.critical').length).toBe(1);
      const row = r.banner.querySelector('.critical');
      expect(row.querySelector('strong').textContent).toBe(D.firesTitle(2));
      expect(row.textContent).toContain(D.firesFix);
      expect(row.querySelector('.more').textContent).toBe('+2 more');                       // debt and save failing wait in the list
      expect(row.querySelector('.view').getAttribute('aria-label')).toBe(viewLabel(D.firesTitle(2)));
      for (let i = 0; i < 3; i++) click(row.querySelector('.view'));
      expect(viewed).toEqual([r.potter.id, r.granary.id, r.potter.id]);
      click(row.querySelector('.more'));
      expect(actions).toEqual([['fire', 'more']]);
      expect(a.count()).toBe(1);                                                             // the badge counts the warnings only
      alerts = [{ code: 'fire', id: r.granary.id }, { code: 'debt' }];
      a.refresh();
      const one = r.banner.querySelector('.critical');
      expect(one.querySelector('strong').textContent).toBe(alertText({ code: 'fire', id: r.granary.id }, r.world).title);   // one fire: its own words (Track A's)
      expect(one.querySelector('.more').textContent).toBe('+1 more');
      alerts = [{ code: 'debt' }];
      a.refresh();
      expect(r.banner.querySelector('.more')).toBe(null);
      alerts = [];
      a.refresh();
      expect([r.banner.children.length, r.root.classList.contains('has-banner')]).toEqual([0, false]);
    } finally { r.cleanup(); }
  });

  it('words a raid warning\'s defence from the sim\'s quote, offers Pay tribute except on the first raid, and Views its map point', () => {
    const r = rig();
    try {
      let alerts = [warn(r.world), { code: 'debt' }];
      const actions = [], viewed = [];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, onView: (x) => viewed.push(x.code), onAction: (x, k) => actions.push([x.code, k]), getAlerts: () => alerts });
      a.refresh();
      const q = tributeQuote(r.world);
      expect([q.towersNeeded, q.towersHave, q.buildN, q.buildCost]).toEqual([2, 0, 2, 300]);
      let row = r.banner.querySelector('.critical');
      expect(row.querySelector('.defence').textContent).toBe('or build 2 towers facing east (≈ 300 gold)');
      expect(row.querySelector('.more').textContent).toBe('+1 more');
      click(row.querySelector('.tribute'));
      click(row.querySelector('.view'));
      expect([actions, viewed]).toEqual([[['raid_warning', 'tribute'], ['raid_warning', 'view']], []]);   // a point: no building to select
      // Two working towers beat six raiders (ceil(6 / 3)): the line follows the quote, not a guess.
      addRaw(r.world, 'tower', 12, 11); addRaw(r.world, 'tower', 14, 11);
      staffAll(r.world);
      a.refresh();
      expect(tributeQuote(r.world).buildN).toBe(0);
      expect(r.banner.querySelector('.defence').textContent).toBe('Your towers can beat this raid');
      r.world.buildings[Object.values(r.world.buildings).find((b) => b.type === 'tower').id].paused = true;
      a.refresh();
      expect(r.banner.querySelector('.defence').textContent).toBe('or build 1 tower facing east (≈ 150 gold)');
      alerts = [warn(r.world, { first: true, size: 3 })];
      a.refresh();
      row = r.banner.querySelector('.critical');
      expect(row.querySelector('.tribute')).toBe(null);                                   // the first raid cannot be paid off
      expect(row.querySelector('.defence').textContent).toBe('Your towers can beat this raid');
      for (const t of Object.values(r.world.buildings)) if (t.type === 'tower') r.world.buildings[t.id].paused = true;
      a.refresh();
      expect(r.banner.querySelector('.defence').textContent).toBe('Build 1 tower facing east (≈ 150 gold)');
    } finally { r.cleanup(); }
  });

  it('collapses a raid warning to a countdown chip in the same slot, counting down with the days, and shows it again', () => {
    const r = rig();
    try {
      const alerts = [warn(r.world, { arrives: 72 })];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, getAlerts: () => alerts });
      a.refresh();
      // The open banner says when they arrive (spec 6.3), from the warning's arrives day less today.
      expect(r.banner.querySelector('.critical strong').textContent).toBe('Raiders from the east are after your storehouses. They arrive in 2 months 12 days.');
      const collapse = r.banner.querySelector('.collapse');
      collapse.focus();
      click(collapse);
      expect(r.banner.querySelectorAll('.critical').length).toBe(1);
      const chip = r.banner.querySelector('.critical.chip');
      expect(document.activeElement === chip.querySelector('.expand')).toBe(true);        // focus lands on the button that undoes Shrink
      expect(chip.querySelector('.expand').textContent).toBe('Raid from the east · 2 m 12 d');   // its words show the whole warning again
      expect(chip.querySelector('.expand').getAttribute('aria-expanded')).toBe('false');
      expect(chip.querySelector('.view').getAttribute('aria-label')).toBe(viewLabel('Raid from the east · 2 m 12 d'));
      a.refresh();
      expect(r.banner.querySelector('.critical.chip') === chip).toBe(true);                // same day, same words: kept
      r.world.day = 65;
      a.refresh();
      expect(r.banner.querySelector('.chip .expand').textContent).toBe('Raid from the east · 7 d');
      r.banner.querySelector('.expand').focus();
      click(r.banner.querySelector('.expand'));
      expect([r.banner.querySelector('.chip'), Boolean(r.banner.querySelector('.defence'))]).toEqual([null, true]);
      expect(document.activeElement === r.banner.querySelector('.collapse')).toBe(true);
      expect(r.banner.querySelector('.critical strong').textContent).toBe('Raiders from the east are after your storehouses. They arrive in 7 days.');
      r.world.day = 72;                                                                    // raidDay brings them in on this day's step
      a.refresh();
      expect(r.banner.querySelector('.critical strong').textContent).toBe('Raiders from the east are after your storehouses. They arrive today.');
      expect(D.chip('north', 90)).toBe('Raid from the north · 3 months');             // no "0 d" when the days come out at 0 (ruling 174)
      expect([D.chip('east', 31), D.chip('east', 30), D.chip('east', 29), D.chip('east', 0)]).toEqual(['Raid from the east · 1 m 1 d', 'Raid from the east · 1 month', 'Raid from the east · 29 d', 'Raid from the east · 0 d']);
    } finally { r.cleanup(); }
  });

  it('says a raid warning\'s defence once, though Track B\'s fix words the same towers', () => {
    const r = rig();
    const saved = Object.prototype.hasOwnProperty.call(ALERT_TEXT, 'raid_warning') ? ALERT_TEXT.raid_warning : undefined;
    // Track B's wording (plan, B's text.js): its fix is RAID_TEXT.towers(world), the same sentence as D's defence line.
    const towers = (world) => {
      const q = tributeQuote(world);
      if (!q) return '';
      if (q.buildN === 0) return 'Your towers can beat this raid';
      return `Build ${q.buildN === 1 ? '1 tower' : `${q.buildN} towers`} facing east (≈ ${q.buildCost} gold)`;
    };
    ALERT_TEXT.raid_warning = (alert, world) => ({ title: 'Raiders from the east are after your storehouses', fix: towers(world) });
    try {
      let alerts = [warn(r.world)];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, getAlerts: () => alerts });
      const once = (sentence) => {
        a.refresh();
        const text = r.banner.querySelector('.critical .text').textContent;
        expect(text.toLowerCase().split(sentence.toLowerCase()).length - 1).toBe(1);
        expect(r.banner.querySelector('.critical .text > .small:not(.defence)')).toBe(null);
      };
      once('build 2 towers facing east (≈ 300 gold)');
      expect(bannerModel(r.world, triage(r.world, alerts).critical).fix).toBe('');
      addRaw(r.world, 'tower', 12, 11); addRaw(r.world, 'tower', 14, 11);
      staffAll(r.world);
      once('Your towers can beat this raid');
      for (const t of Object.values(r.world.buildings)) if (t.type === 'tower') r.world.buildings[t.id].paused = true;
      alerts = [warn(r.world, { first: true, size: 3 })];
      once('Build 1 tower facing east (≈ 150 gold)');
      // Without a quote (no warning up) there is no defence line, so the alert's own fix stays.
      r.world.raid.warning = null;
      ALERT_TEXT.raid_warning = () => ({ title: 'Raiders from the east are after your storehouses', fix: 'Have a look' });
      a.refresh();
      expect([r.banner.querySelector('.critical .defence'), r.banner.querySelector('.critical .text > .small').textContent]).toEqual([null, 'Have a look']);
    } finally {
      if (saved === undefined) delete ALERT_TEXT.raid_warning; else ALERT_TEXT.raid_warning = saved;
      r.cleanup();
    }
  });

  it('words the banner of a real warning from the sim: the title, when the raiders arrive and the defence, counting down to the day', () => {
    const { root, cleanup } = mount('<div id="banner"></div><p id="live"></p>');
    try {
      const w = makeTestWorld({ gold: 1000, raiderEntries: [{ x: 31, y: 16 }] });
      setRoad(w, 0, 10, 31, 10);
      w.milestone = 'market_town';
      addRaw(w, 'house', 2, 11, { tier: 4, residents: 300 });
      w.day = 100; raidDay(w, []);                                                       // the raid clock starts
      w.day = w.raid.nextWarnDay; raidDay(w, []);                                        // the first warning
      const warning = w.raid.warning;
      const banner = root.querySelector('#banner');
      const a = createAlerts({ world: w, banner, live: root.querySelector('#live'), root });
      const title = () => banner.querySelector('.critical strong').textContent;
      a.refresh();
      const alert = alertsFor(w).find((x) => x.code === 'raid_warning');
      expect([alert.arrives, warning.arrives - w.day]).toEqual([warning.arrives, RAIDS.warningDays]);
      expect(title()).toBe(`${alertText(alert, w).title}. They arrive in 3 months.`);
      expect(title()).toBe('Raiders from the east are after your buildings. They arrive in 3 months.');
      expect(banner.querySelector('.defence').textContent).toBe(D.capital(D.defenceLine(tributeQuote(w), 'east')));
      w.day += 47; a.refresh();
      expect(title()).toBe('Raiders from the east are after your buildings. They arrive in 1 month 13 days.');
      w.day = warning.arrives; a.refresh();
      expect(title()).toBe('Raiders from the east are after your buildings. They arrive today.');
      raidDay(w, []);                                                                    // and they do, on this day's step
      expect([w.raid.warning, Boolean(w.raid.active)]).toEqual([null, true]);
    } finally { cleanup(); }
  });

  it('announces a new critical at once (assertive), and other changes politely (ruling 9)', () => {
    const r = rig();
    try {
      let alerts = [{ code: 'no_storage', id: r.farm.id }];
      const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, getAlerts: () => alerts });
      a.refresh();
      expect(r.live.getAttribute('aria-live')).toBe('polite');
      alerts = [{ code: 'no_storage', id: r.farm.id }, { code: 'debt' }];
      a.refresh();
      expect([r.live.getAttribute('aria-live'), r.live.textContent.includes(alertText({ code: 'debt' }, r.world).title)]).toEqual(['assertive', true]);
      alerts = [{ code: 'debt' }];                                                         // a warning cleared: no new critical
      a.refresh();
      expect(r.live.getAttribute('aria-live')).toBe('polite');
      expect(r.banner.querySelectorAll('.critical').length).toBe(1);
    } finally { r.cleanup(); }
  });

  it('pins a raid\'s map point on the minimap with an arrow pointing into the map', () => {
    const w = makeTestWorld();
    const potter = addRaw(w, 'potter', 4, 4);
    const pins = minimapPins(w, [{ code: 'fire', id: potter.id }, { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }, { code: 'raid', x: 10, y: 0 }, { code: 'no_road', id: 999 }]);
    expect(pins.length).toBe(3);
    expect(pins[0]).toEqual({ x: 5, y: 5, point: false, dx: 0, dy: 0 });
    expect([pins[1].x, pins[1].y, pins[1].point, pins[1].dx, pins[1].dy]).toEqual([31.5, 16.5, true, -1, 0]);   // from the east edge, pointing west
    expect(pins[2].dy).toBeGreaterThan(0.9);                                              // no dir: towards the middle
    const mm = createMinimap({ world: w, cam: createCamera({ x: 16, y: 16, zoom: 1 }), view: () => ({ width: 400, height: 300 }), size: 128, dpr: 1 });
    const scale = 128 / 32;
    const before = pixelAt(mm.canvas, 28 * scale, 16.5 * scale);
    mm.render([{ code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }]);
    const arrow = pixelAt(mm.canvas, 29.6 * scale, 16.5 * scale);                          // on the arrow, west of the pin
    const bad = [parseInt(UI.bad.slice(1, 3), 16), parseInt(UI.bad.slice(3, 5), 16), parseInt(UI.bad.slice(5, 7), 16)];
    expect(Math.abs(arrow[0] - bad[0]) + Math.abs(arrow[1] - bad[1]) + Math.abs(arrow[2] - bad[2])).toBeLessThan(30);
    expect(before[0] === arrow[0] && before[1] === arrow[1]).toBe(false);
  });

  it('Views a raid\'s map point from the alert list, closing the sheet', () => {
    const { root, cleanup } = mount('<section id="sheet"></section>');
    try {
      const world = makeTestWorld();
      const store = createStore(INITIAL_UI_STATE);
      const panned = [];
      const cameraControl = { panTo: (x, y) => panned.push([x, y]), zoomStep() {}, centre: () => ({ x: 0, y: 0 }) };
      const minimap = { canvas: document.createElement('canvas'), render() {}, tileFromPoint: () => ({ x: 0, y: 0 }) };
      createSheets({ container: root.querySelector('#sheet'), store, world, placement: null, cameraControl, minimap, getAlerts: () => [{ code: 'raid', x: 20, y: 7, left: 3 }] });
      store.set(openSheet(store.get(), 'minimap'));
      click(root.querySelector('.alert-list .view'));
      expect([panned, store.get().sheet]).toEqual([[[20.5, 7.5]], null]);
    } finally { cleanup(); }
  });

  it('closes the sheet of a building that vanished without handing later subscribers an older state', async () => {
    const { root, cleanup } = mount('<section id="sheet"></section>');
    try {
      const world = makeTestWorld();
      const store = createStore(INITIAL_UI_STATE);
      createSheets({ container: root.querySelector('#sheet'), store, world, placement: null, cameraControl: null, minimap: null });
      const seen = [];
      store.subscribe((s) => seen.push(s.sheet));                                         // subscribed after the sheets
      store.set(select(store.get(), 999));                                                // a building that burned down
      await Promise.resolve();
      expect(store.get().sheet).toBe(null);
      expect(seen).toEqual([{ kind: 'info', id: 999 }, null]);                             // never the old sheet after the new
      expect(root.querySelector('#sheet').hidden).toBe(true);
    } finally { cleanup(); }
  });
});

describe('s3 ui alert tiers on the page', () => {
  it('gives the legend the guidance row under the banner on small phones, in place of the goal, so the rows end above the middle', async () => {
    for (const [w, h, sizes] of [[375, 667, [100, 125, 150]], [844, 390, [100, 125, 150]]]) {
      for (const size of sizes) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.store.set({ overlay: 'water' });
          r.world.gold = -5;                                                              // debt: a critical banner
          r.ui.alerts.refresh();
          const shell = r.root.getBoundingClientRect();
          expect(r.root.querySelector('#legend .legend-icon')).toBe(null);               // no icon stands in for the legend any more (ruling 164)
          const strip = r.root.querySelector('#legend .strip');
          expect([w, size, getComputedStyle(strip).display === 'none', getComputedStyle(r.root.querySelector('#goals')).display]).toEqual([w, size, false, 'none']);
          const banner = r.root.querySelector('#banner .critical').getBoundingClientRect(), box = strip.getBoundingClientRect();
          expect([w, size, box.top >= banner.bottom - 0.5, box.right <= shell.right + 0.5]).toEqual([w, size, true, true]);   // the row under the alert row, on screen
          expect([w, size, box.bottom - shell.top < shell.height / 2]).toEqual([w, size, true]);
          for (const word of strip.querySelectorAll('.text')) expect([w, size, word.getBoundingClientRect().width > 2]).toEqual([w, size, true]);   // the words show
          r.store.set({ overlay: null });
          expect([w, size, getComputedStyle(r.root.querySelector('#goals')).display === 'none']).toEqual([w, size, false]);   // the goal comes back
        } finally { r.cleanup(); }
      }
    }
    const wide = await rigUI({ width: 1280, height: 800 });
    try {
      wide.store.set({ overlay: 'water' });
      wide.world.gold = -5;
      wide.ui.alerts.refresh();
      expect(getComputedStyle(wide.root.querySelector('#legend .strip')).display === 'none').toBe(false);
      expect(getComputedStyle(wide.root.querySelector('#goals')).display === 'none').toBe(false);   // a wide screen keeps every row
    } finally { wide.cleanup(); }
  });

  // Spec 6.1 (nothing under the top bar past the middle of the map). On phones the raid warning is its one-line chip
  // (ruling 167). The 844 x 390 phone at 125% and 150% text, where the goals strip alone reaches the middle, waits for the
  // one-row rule of ruling 172 (tests/ui/mobileBudget.test.js holds the whole budget).
  it('keeps a raid warning, its countdown, and the goals strip above the middle on phones', async () => {
    for (const [w, h, sizes] of [[375, 667, [100, 125, 150]], [390, 844, [100, 125, 150]], [844, 390, [100]]]) {
      for (const size of sizes) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.world.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 9, tribute: 360, target: 'storehouse', day: r.world.day, arrives: r.world.day + 72, first: false };
          r.ui.alerts.refresh();
          const shell = r.root.getBoundingClientRect();
          const words = r.root.querySelector('#banner .critical .warning');
          expect([w, size, words.textContent, words.getBoundingClientRect().height > 0]).toEqual([w, size, 'Raid from the east · 2 m 12 d', true]);
          const row = r.root.querySelector('#banner .critical').getBoundingClientRect();
          const view = r.root.querySelector('#banner .critical .view').getBoundingClientRect();
          expect([w, size, Math.abs(view.top + view.height / 2 - (row.top + row.height / 2)) < 2]).toEqual([w, size, true]);   // one row: View beside the words, not under them
          const goals = r.root.querySelector('#goals .goal-strip').getBoundingClientRect();
          const banner = r.root.querySelector('#banner .critical').getBoundingClientRect();
          expect([w, size, Math.max(goals.bottom, banner.bottom) - shell.top < shell.height / 2]).toEqual([w, size, true]);
        } finally { r.cleanup(); }
      }
    }
  });

  it('opens the raid sheet from a phone chip\'s words, counts the criticals it is not showing on the Map badge, and gives a wide screen the full banner', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.world.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 9, tribute: 360, target: 'storehouse', day: r.world.day, arrives: r.world.day + 72, first: false };
      r.world.gold = -5;                                                                   // debt too: a second critical
      r.ui.refresh();
      const row = r.root.querySelector('#banner .critical');
      expect([row.dataset.code, row.querySelector('.more')]).toEqual(['raid_warning', null]);
      const badge = r.root.querySelector('#corners .minimap-button .badge');
      expect(r.ui.alerts.list().some((x) => x.code === 'debt')).toBe(true);
      expect(badge.textContent).toBe(String(r.ui.alerts.list().length - 1));               // every alert but the warning, debt included
      click(row.querySelector('.warning'));
      const sheet = r.root.querySelector('#sheet');
      expect([r.store.get().sheet, sheet.querySelector('h2').textContent]).toEqual([{ kind: 'tribute', id: null }, T.tribute]);
      expect(sheet.querySelector('.arrives').textContent).toBe('Raiders from the east are after your storehouses. They arrive in 2 months 12 days.');
      click(sheet.querySelector('.keep'));
      r.resize(1280, 800);
      expect(r.store.get().layout).toBe('wide');
      const wide = r.root.querySelector('#banner .critical');
      expect([wide.querySelector('strong').textContent, Boolean(wide.querySelector('.collapse')), wide.querySelector('.more').textContent]).toEqual(['Raiders from the east are after your storehouses. They arrive in 2 months 12 days.', true, '+1 more']);
      expect(badge.textContent).toBe(String(r.ui.alerts.list().length - 2));               // wide: the warnings only
    } finally { r.cleanup(); }
  });

  it('moves the camera to a raid\'s point from the banner, and opens the alert list from "+N more"', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.alerts.action({ code: 'raid_warning', x: 30, y: 16, dir: 'east', arrives: 90 }, 'view');
      expect([Math.round(r.cam.x * 10) / 10, Math.round(r.cam.y * 10) / 10]).toEqual([30.5, 16.5]);   // reduced motion (headless): an instant cut
      r.ui.alerts.action({ code: 'fire', id: 1 }, 'more');
      expect(r.store.get().sheet).toEqual({ kind: 'minimap', id: null });
      expect(r.root.querySelector('#sheet h2').textContent).toBe(T.minimap);
    } finally { r.cleanup(); }
  });
});
