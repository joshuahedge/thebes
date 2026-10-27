// Track C, Task C3: the stall warning and its list row, View's outline, the marker taps, the summary's Monuments section and
// spending row, Welcome back's site lines, the minimap's monuments, the palace's tip and the sitesheet and palace scenes
// (spec 4.16, 4.17, 4.20, 6.3; rulings 211, 245, 258, 275, 281). Words checked against the sim with the world set up both
// ways; Track A's state (site.idle, site.reason, site.crews, site.last) is set by hand to the contract's shapes.
import { describe, it, expect } from '../../harness.js';
import { summaryRows, countBadgeTarget, causeText, createMonumentUi, supplyLine, siteRows } from '../../../src/ui/monumentSheet.js';
import { siteLines } from '../../../src/ui/welcomeBack.js';
import { triage, bannerModel } from '../../../src/ui/alerts.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { viewOutlineAlpha, viewOutlineOn, drawReachHighlight } from '../../../src/render/overlays.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { paceOf, monumentDay } from '../../../src/sim/monuments.js';
import { createCamera } from '../../../src/render/camera.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { p } from '../../../src/render/iso.js';
import { MONUMENTS, MONUMENT } from '../../../src/data/monuments.js';
import { TIPS } from '../../../src/data/tips.js';
import { VIEW_OUTLINE, ZOOM_STEP } from '../../../src/data/ui.js';
import { alertText, TIP_TEXT, UI4_TEXT } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene } from '../../../src/dev/scenes.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { fire } from '../../helpers/dom.js';

function city(milestone = 'capital') {
  const w = makeTestWorld({ gold: 20000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = milestone;
  return w;
}
// A site three days without work for `reason` (Track A's state, set by hand).
const stall = (w, type, x, y, reason) => { const b = addRaw(w, type, x, y); Object.assign(b.site, { idle: 3, reason }); return b; };

describe('s4 ui the stall warning', () => {
  it('is a warning, never a critical, worded with the sheet\'s own cause', () => {
    const w = city();
    const b = stall(w, 'pyramid_small', 12, 11, 'no_crew');
    const alerts = alertsFor(w).filter((a) => a.code === 'site_stalled');
    expect(alerts).toEqual([{ code: 'site_stalled', id: b.id, reason: 'no_crew' }]);
    const t = triage(w, alerts);
    expect([t.critical.length, t.ordinary.length, bannerModel(w, t.critical)]).toEqual([0, 1, null]);
    expect(alertText(alerts[0], w)).toEqual({ title: 'Small pyramid is not progressing', fix: "No crew: build a builders' guild on a road that reaches this site" });
    for (const reason of ['no_bricks', 'no_gold', 'crew_short', 'waiting_capstone']) {
      expect(alertText({ code: 'site_stalled', id: b.id, reason }, w).fix).toBe(causeText(w, b, reason));
    }
    expect(alertText({ code: 'site_stalled', id: b.id, reason: 'no_bricks' }, w).fix).toBe('Waiting for bricks: no brickworks or storehouse with bricks within reach');
    b.site.idle = 2;
    expect(alertsFor(w).some((a) => a.code === 'site_stalled')).toBe(false);
  });

  it('offers Show me for a missing guild or material in the alert list, and View on the guild short of workers', async () => {
    const w = city();
    const b = stall(w, 'obelisk_small', 12, 11, 'no_crew');                          // takes 1 crew
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'minimap'));
      const row = () => [...r.root.querySelectorAll('#sheet .alert-list li')].find((li) => li.textContent.includes('Small obelisk is not progressing'));
      fire(row().querySelector('.show-me'), 'click');
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'builders_guild']);
      r.ui.placement.cancel();
      // I1 (final review): the stall set up through the sim. The nearest guild holds the place but is short of workers, so
      // site.crews is empty; a healthy guild farther off has no place. View selects the short one.
      const g = addRaw(r.world, 'builders_guild', 14, 11, { staff: 3 });
      addRaw(r.world, 'builders_guild', 18, 11, { staff: 16 });
      for (let i = 0; i < MONUMENT.stallDays; i++) { monumentDay(r.world); r.world.day += 1; }
      expect([b.site.reason, b.site.crews, b.site.idle >= MONUMENT.stallDays]).toEqual(['crew_short', [], true]);
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'minimap'));
      expect(row().querySelector('.show-me')).toBe(null);
      fire(row().querySelector('.view'), 'click');
      expect([r.store.get().selectedId, r.store.get().sheet.id]).toEqual([g.id, g.id]);
    } finally { r.cleanup(); }
  });
});

describe('s4 ui View\'s outline and the marker taps', () => {
  it('holds the outline 2.5 s, then fades it over 0.5 s under Full, and goes at once under Gentle and Still', () => {
    const { holdMs, fadeMs } = VIEW_OUTLINE;
    expect([holdMs, fadeMs]).toEqual([2500, 500]);
    expect([0, 2499, 2750, 3000].map((t) => viewOutlineAlpha(t, 'full'))).toEqual([1, 1, 0.5, 0]);
    expect([0, 2499, 2500, 2750].map((t) => viewOutlineAlpha(t, 'gentle'))).toEqual([1, 1, 0, 0]);
    expect(viewOutlineAlpha(2750, 'still')).toBe(0);
  });

  it('outlines the building View frames, from the alert list, by the interface\'s clock and Motion level', async () => {
    const w = city();
    const b = stall(w, 'colossus', 12, 11, 'no_gold');
    let t = 1000;
    const r = await rigUI({ width: 1280, height: 800, world: w, now: () => t });
    try {
      r.ui.settings.set({ motion: 'full' });
      r.store.set(openSheet(r.store.get(), 'minimap'));
      const row = [...r.root.querySelectorAll('#sheet .alert-list li')].find((li) => li.textContent.includes('Colossus is not progressing'));
      fire(row.querySelector('.view'), 'click');
      expect([r.store.get().selectedId, viewOutlineOn(r.world, b.id)]).toEqual([b.id, 1]);
      t += 2750;
      expect(viewOutlineOn(r.world, b.id)).toBe(0.5);
      r.ui.settings.set({ motion: 'gentle' });
      expect(viewOutlineOn(r.world, b.id)).toBe(0);
      // Drawn on the selected building while it holds: more of the problem colour than once it has gone.
      const coral = () => {
        const c = makeCanvas(240, 200), ctx = c.getContext('2d');
        const [ax, ay] = p(13, 12);
        ctx.translate(120 - 2 * ax, 100 - 2 * ay);
        drawReachHighlight(makeDraw(ctx, 2), r.world, b);
        let n = 0;
        for (let y = 0; y < 200; y += 2) for (let x = 0; x < 240; x += 2) { const [rr, gg, bb, aa] = pixelAt(c, x, y); if (aa > 100 && rr > 120 && rr > gg + 50 && rr > bb + 50) n++; }
        return n;
      };
      const gone = coral();
      t -= 2750;
      expect(coral()).toBeGreaterThan(gone + 20);
    } finally { r.cleanup(); }
  });

  it('zooms a count badge in one step, centred on its buildings, and leaves a single marker to the selection', async () => {
    const w = city();
    const a = addRaw(w, 'granary', 10, 11), b = addRaw(w, 'granary', 14, 11);
    expect(countBadgeTarget(w, { ids: [a.id, b.id] }, 1)).toEqual({ x: 13, y: 12, zoom: ZOOM_STEP });
    expect(countBadgeTarget(w, { ids: [a.id] }, 1)).toBe(null);
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.ui.settings.set({ motion: 'gentle' });                                         // M1: Gentle set here, not the machine's: a cut
      expect(r.ui.monumentUi.markerTap({ ids: [a.id], count: 1 })).toBe(false);
      expect(r.ui.monumentUi.markerTap({ ids: [a.id, b.id], count: 2 })).toBe(true);
      expect([r.cam.zoom, Math.abs(r.cam.x - 13) < 0.1, Math.abs(r.cam.y - 12) < 0.1]).toEqual([ZOOM_STEP, true, true]);
    } finally { r.cleanup(); }
  });
});

describe('s4 ui the summary\'s Monuments section and Welcome back\'s site lines', () => {
  it('shows from City each site\'s course, each finished monument and the prestige with what it unlocks next', () => {
    const w = city('great_city');
    expect(summaryRows(city('market_town'))).toEqual([]);
    const text = () => summaryRows(w).map((r) => r.text);
    expect(text()).toEqual(['No monument founded yet', 'Prestige 0: the small pyramid unlocks at 100 and Capital']);
    const s = addRaw(w, 'mastaba_small', 12, 11);
    s.site.course = 2;
    const c = addRaw(w, 'colossus', 20, 11);
    Object.assign(c.site, { course: 6, done: 30 });
    expect(text()).toEqual(['Colossus: finished', 'Small mastaba: course 3 of 4', 'Prestige 67: the small pyramid unlocks at 100 and Capital']);
    w.milestone = 'capital';
    expect(text()[2]).toBe('Prestige 67: the small pyramid unlocks at 100');
    w.prestigeUnlocks.pyramid_small = 5;
    expect(text()[2]).toBe('Prestige 67: the great pyramid unlocks at 300');
    w.prestigeUnlocks.pyramid_great = 9;
    expect(text()[2]).toBe('Prestige 67 of 1280');   // Stage 4.6: the ten kinds' shares added (the seven made 700); Version 6.0 (Track A): the great temple's 200
  });

  it('adds the monument gold to the summary only once there is some (a version 4 save has none until a month ends)', async () => {
    const w = city();
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      const heads = () => [...r.root.querySelectorAll('#sheet h3')].map((h) => h.textContent);
      r.world.stats.lastMonth = null;
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect([heads().includes('Monuments last month'), heads().includes('Monuments')]).toEqual([false, true]);
      r.store.set(openSheet(r.store.get(), 'minimap'));
      r.world.stats.lastMonth = { ...(r.world.stats.lastMonth || {}), monuments: 0 };
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(heads().includes('Monuments last month')).toBe(false);
      r.store.set(openSheet(r.store.get(), 'minimap'));
      r.world.stats.lastMonth.monuments = 300;
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(heads().includes('Monuments last month')).toBe(true);
      expect(r.root.querySelector('#sheet').textContent.includes('Work, gilding and capstone−300')).toBe(true);
    } finally { r.cleanup(); }
  });

  it('gives each site\'s course and its pace on Welcome back, from siteStatus', async () => {
    const w = city();
    const s = addRaw(w, 'pyramid_small', 12, 11);
    Object.assign(s.site, { course: 5, last: { units: 80, gold: 400, crews: 4 } });
    expect(siteLines(w)).toEqual([`Small pyramid: course 6 of 8, ${UI4_TEXT.welcomePace(paceOf(w, s))}`]);
    expect(siteLines(w)).toEqual(['Small pyramid: course 6 of 8, about 3 years left at last month\'s pace']);
    // I2 (final review): laid 80 last month but stalled now: the stall, never last month's pace; one day short of a stall: the pace.
    Object.assign(s.site, { reason: 'no_stone', idle: MONUMENT.stallDays - 1 });
    expect(siteLines(w)).toEqual(["Small pyramid: course 6 of 8, about 3 years left at last month's pace"]);
    s.site.idle = MONUMENT.stallDays;
    expect(siteLines(w)).toEqual(['Small pyramid: course 6 of 8, not progressing: no stone']);
    s.site.idle = 0;
    Object.assign(s.site, { last: { units: 0, gold: 0, crews: 0 }, reason: 'no_stone' });
    expect(siteLines(w)).toEqual(['Small pyramid: course 6 of 8, not progressing: no stone']);
    Object.assign(s.site, { last: { units: 0, gold: 0, crews: 0 }, reason: null });   // laid nothing last month but was working when the player left: no cause is invented
    expect(siteLines(w)).toEqual(['Small pyramid: course 6 of 8, pace shows after a month of work']);
    Object.assign(s.site, { reason: 'no_stone' });
    s.paused = true;
    expect(siteLines(w)).toEqual(['Small pyramid: course 6 of 8, paused']);
    addRaw(w, 'obelisk_small', 25, 20);
    expect(siteLines(w)[1]).toBe('Small obelisk: course 1 of 3, no road yet');
    addRaw(w, 'obelisk_large', 25, 11);
    expect(siteLines(w)[2]).toBe('Large obelisk: course 1 of 4, pace shows after a month of work');
    const r = await rigUI({ width: 390, height: 844, world: w, welcome: { savedAt: 1759990000000, lastSpeed: 1 }, clock: () => 1760000000000 });
    try {
      const sheet = r.root.querySelector('#sheet');
      expect([...sheet.querySelectorAll('.sites .site')].map((li) => li.textContent)).toEqual(siteLines(w));
    } finally { r.cleanup(); }
  });
});

describe('s4 ui Track A\'s shapes', () => {
  it('says a quarry or brickworks Track A marks idle is idle, and floors fractional gold', () => {
    const w = city();
    const q = addRaw(w, 'quarry', 20, 11);
    const sim = { supplyNeeded: () => true, deliverySites: () => [], guildSite: () => null, siteStatus: () => ({ materials: {} }) };   // the branch's supplyLine asks deliverySites
    expect(supplyLine(w, q, sim)).toBe('');
    q.blocked = 'idle';
    expect(supplyLine(w, q, sim)).toBe('Idle: no monument site needs stone within reach');
    const b = addRaw(w, 'colossus', 12, 11);
    b.site.last = { units: 26.67, gold: 133.4, crews: 2 };
    expect(siteRows(w, b).find((r) => r.key === 'gold').text).toBe('Last month: 133 gold for 2 crews. Work stops if gold would go below 0.');
  });
});

describe('s4 ui the minimap, the palace\'s tip and the scenes', () => {
  it('marks a monument on the minimap with the glyph Track B draws (a site under way in sandstone, not the stand-in gold)', () => {
    const w = city();
    addRaw(w, 'colossus', 24, 24);
    const m = createMinimap({ world: w, cam: createCamera({ x: 2, y: 2 }), view: () => ({ width: 100, height: 100 }), size: 64, dpr: 1 });
    m.render([]);
    const [rr, gg, bb] = pixelAt(m.canvas, 49, 49);                                  // tile (24.5, 24.5) at 2 px a tile, far from the view's outline
    expect([rr > 200, gg > 150, bb > 120]).toEqual([true, true, true]);                // sandstone #DCC493; the stand-in gold #E2B13C has blue 60
  });

  it('tips once the palace can be enlarged, and not before', () => {
    expect([TIPS.some((t) => t.id === 'palace_grows' && t.trigger === 'palaceCanGrow'), typeof TIP_TEXT.palace_grows]).toEqual([true, 'string']);
    const w = city('town');
    w.gold = 1000;
    const fired = [];
    const ui = createMonumentUi({ world: w, fireTip: (k) => fired.push(k) });
    ui.refresh();
    const p0 = addRaw(w, 'palace', 20, 11);
    ui.refresh();
    expect(fired).toEqual([]);                                                       // a columned hall waits for Market town
    w.milestone = 'market_town';
    ui.refresh();
    expect(fired).toEqual(['palaceCanGrow']);
    expect(p0.style).toBe(0);
  });

  it('sets up the sitesheet and palace scenes with their sheets open', async () => {
    for (const name of ['sitesheet', 'palace']) {
      const shell = await mountShell(390, 844);
      const history = fakeHistory();
      const noStorage = { getItem: () => null, setItem: () => {} };
      const api = await boot(document, window, {
        root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
        now: () => 0, clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
        uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
        loopOptions: { raf: () => 0, caf: () => {} },
      });
      try {
        await devScene(api, name);
        const g = api.game(), b = g.world.buildings[g.ui.store.get().selectedId];
        const rows = [...shell.root.querySelectorAll('#sheet .s4-rows li')].map((li) => li.dataset.row);
        if (name === 'sitesheet') {
          expect([b.type, b.site.course, rows]).toEqual(['pyramid_small', 3, ['progress', 'crews', 'cause', 'material-stone', 'material-bricks', 'pace', 'gold', 'prestige']]);
          expect(shell.root.querySelector('#sheet .row-crews').textContent).toBe("Crews: 2 of 4. 2 builders' guilds work here.");
        } else {
          expect([b.type, b.style, rows.slice(0, 3)]).toEqual(['palace', 4, ['style', 'nicer', 'mood']]);
          expect(shell.root.querySelector('#sheet .actions .enlarge').textContent).toBe('The palace is at its grandest');
        }
      } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
    }
  });
});
