import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { UNIT_ID_BASE, unitsAt, drawUnitMarks } from '../../../src/render/units.js';
import { drawFires } from '../../../src/render/fire.js';
import { createAmbient, createFrameGate } from '../../../src/render/ambient.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { createConfirmBar } from '../../../src/ui/confirmBar.js';
import { createPlacement, LINE_TOOLS } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createSettings, DEFAULT_SETTINGS, FIRE_REACTIONS } from '../../../src/ui/settings.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createDanger } from '../../../src/ui/danger.js';
import { createScoreUi, scoreLineFor, titleDecor } from '../../../src/ui/scoreUi.js';
import { weeklySeed, shareLink, parseShareLink, emojiRow, pictureCard } from '../../../src/ui/share.js';
import { createRecords, emptyRecords, newCityId, mergeRecords } from '../../../src/save/records.js';
import { devScene } from '../../../src/dev/scenes.js';
import { toolForItem } from '../../../src/data/ui.js';
import { SFX } from '../../../src/audio/sfx.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { openSheet } from '../../../src/ui/modes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { T, reasonText, alertText, ALERT_TEXT, FIRE_TEXT, RAID_TEXT, ART_TEXT, DANGER_UI_TEXT, SCORE_TEXT, BALANCE_TEXT } from '../../../src/ui/text.js';
import { el } from '../../../src/ui/components.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const noStorage = { getItem: () => null, setItem: () => {} };
const STUB_PARTS = ['building', 'house', 'actions', 'summary'];

async function bootRig({ platform = {}, store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage, platform,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('s3 contract render seams', () => {
  it('calls the ambient layer after the terrain, then fire and the units\' marks after the sprites, before effects and overlays', () => {
    const w = makeTestWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1 });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const order = [];
    const hook = (name) => (g, range) => { order.push(name); expect([name, typeof g.poly, Number.isInteger(range.x0)]).toEqual([name, 'function', true]); };
    renderer.renderFrame(w, cam, {
      view: { width: 400, height: 300 }, ambient: hook('ambient'), fire: hook('fire'), units: hook('units'),
      effects: { draw: () => order.push('effects') }, drawOverlay: () => order.push('overlay'),
    });
    expect(order).toEqual(['ambient', 'fire', 'units', 'effects', 'overlay']);
    renderer.renderFrame(w, cam, { view: { width: 400, height: 300 } });               // every hook is optional
  });
  it('asks the frame gate before drawing each frame, after running the day', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const drawn = [];
    let allow = true;
    const loop = createGameLoop({ world: w, render: ({ now }) => drawn.push(now), allowFrame: () => allow, raf: () => 0, caf: () => {} });
    loop.tick(0); loop.tick(250);
    allow = false;
    loop.tick(500); loop.tick(750);
    expect([drawn, w.day]).toEqual([[0, 250], 1]);                                      // the sim ran on; only the drawing waited
    const gate = createFrameGate();
    gate.noteInput(0);
    expect(typeof gate.allow(5000, true)).toBe('boolean');                           // the answer's type only: Track C decides its value
  });
  it('exports the fire, units and ambient layers in their final shapes (shapes only; each track owns the behaviour)', () => {
    const w = makeTestWorld();
    expect(UNIT_ID_BASE).toBe(100000);
    expect(Array.isArray(unitsAt(w, 0, null))).toBe(true);
    expect([typeof drawFires, typeof drawUnitMarks]).toEqual(['function', 'function']);
    const a = createAmbient({ enabled: () => false });
    expect([typeof a.draw, typeof a.stats]).toEqual(['function', 'object']);
  });
});

describe('s3 contract interface seams', () => {
  it('hands the renderer the ambient, fire and units hooks and the units with the walkers', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      let seen = null;
      const real = r.renderer.renderFrame;
      r.renderer.renderFrame = (world, cam, opts) => { seen = opts; return real(world, cam, opts); };
      r.frame();
      expect([typeof seen.ambient, typeof seen.fire, typeof seen.units, Array.isArray(seen.walkers)]).toEqual(['function', 'function', 'function', true]);
      expect([typeof r.ui.danger, typeof r.ui.scoreUi, typeof r.ui.ambient.draw, typeof r.ui.allowFrame(0)]).toEqual(['object', 'object', 'function', 'boolean']);
    } finally { r.cleanup(); }
  });
  it('counts a held drag or pinch as input for the frame gate, not only a press, a key or the wheel', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const noted = [];
      r.ui.frameGate.noteInput = () => noted.push(1);
      for (const type of ['pointerdown', 'pointermove', 'touchmove', 'keydown', 'wheel']) fire(r.root, type);
      expect(noted.length).toBe(5);
    } finally { r.cleanup(); }
  });
  it('builds the danger and score interfaces in the final shape, and routes events, refreshes and sheet parts to them', async () => {
    expect([typeof createDanger, typeof createScoreUi]).toEqual(['function', 'function']);
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      for (const x of [r.ui.danger, r.ui.scoreUi]) {                                  // built by the real interface, with its real ctx
        expect(Object.keys(x).sort()).toEqual(['destroy', 'onAlertAction', 'onCommand', 'onEvents', 'refresh', 'sheetParts', 'sheets']);
        expect(Object.keys(x.sheetParts)).toEqual(STUB_PARTS);
        for (const k of STUB_PARTS) expect(typeof x.sheetParts[k]).toBe('function');
      }
      const log = [];
      r.ui.danger.onEvents = (events) => log.push(['danger', events.length]);
      r.ui.scoreUi.onEvents = (events) => log.push(['score', events.length]);
      r.ui.danger.refresh = () => log.push(['danger refresh']);
      r.ui.scoreUi.refresh = () => log.push(['score refresh']);
      r.ui.onEvents([{ type: 'month' }]);
      r.ui.refresh();
      expect(log).toEqual([['danger', 1], ['score', 1], ['danger refresh'], ['score refresh']]);
      log.length = 0;
      r.ui.danger.onCommand = (e) => log.push(['danger command', e.kind]);
      r.ui.scoreUi.onCommand = (e) => log.push(['score command', e.kind]);
      r.ui.afterCommand({ kind: 'pause', result: { ok: true }, undoable: false });
      expect(log.slice(0, 2)).toEqual([['danger command', 'pause'], ['score command', 'pause']]);
      r.ui.danger.sheetParts.building = (b) => [el('p', { class: 's3-danger-row', text: `fire row ${b.type}` })];
      r.ui.danger.sheetParts.actions = (b) => [el('button', { type: 'button', class: 's3-festival', text: b.type })];
      r.ui.scoreUi.sheetParts.summary = () => [el('section', { class: 's3-score', text: 'Score 0' })];
      r.ui.danger.sheetParts.house = (h) => [el('p', { class: 's3-house-row', text: `home ${h.id}` })];
      const temple = Object.values(r.world.buildings).find((b) => b.type === 'temple');
      r.store.set(openSheet(r.store.get(), 'info', temple.id));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('.s3-danger-row').textContent).toBe('fire row temple');
      expect(sheet.querySelector('.actions').firstElementChild.className).toBe('s3-festival');   // at the front of the actions
      const home = Object.values(r.world.buildings).find((b) => b.type === 'house');
      r.store.set(openSheet(r.store.get(), 'info', home.id));
      expect(sheet.querySelector('.s3-house-row').textContent).toBe(`home ${home.id}`);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(sheet.querySelector('.s3-score').textContent).toBe('Score 0');
    } finally { r.cleanup(); }
  });
  it('routes an alert\'s second action to both interfaces', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const seen = [];
      r.ui.danger.onAlertAction = (a, kind) => seen.push(['danger', a.code, kind]);
      r.ui.scoreUi.onAlertAction = (a, kind) => seen.push(['score', a.code, kind]);
      r.ui.alerts.action({ code: 'raid_warning' }, 'tribute');
      expect(seen).toEqual([['danger', 'raid_warning', 'tribute'], ['score', 'raid_warning', 'tribute']]);
    } finally { r.cleanup(); }
  });
  it('hides the whole interface in screenshot mode, from the menu, until a tap, Esc or Back, and leaves the speed alone', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.speedControl.set(2);
      r.store.set(openSheet(r.store.get(), 'menu'));
      const items = [...r.root.querySelectorAll('#sheet .menu-list button')].map((b) => b.textContent);
      expect(items.slice(-3)).toEqual([T.howToPlay, T.screenshotMode, T.about]);
      fire(r.root.querySelector('#sheet .screenshot-mode'), 'click');
      expect([r.store.get().screenshot, r.store.get().sheet, document.body.classList.contains('screenshot')]).toEqual([true, null, true]);
      expect(getComputedStyle(r.root.querySelector('#topbar')).display).toBe('none');
      expect(getComputedStyle(r.root.querySelector('#dock')).display).toBe('none');
      expect(r.world.speed).toBe(2);
      r.tap(12, 12);
      expect([r.store.get().screenshot, document.body.classList.contains('screenshot')]).toEqual([false, false]);
      expect(r.store.get().mode).toBe('browse');                                       // the tap only brought the interface back
      r.ui.screenshotMode();
      for (const key of [' ', '+', '1', 'm']) fire(r.root, 'keydown', { key });                // hidden: shortcuts do nothing
      fire(r.root, 'keydown', { key: 'z', ctrlKey: true });
      expect([r.world.speed, r.store.get().sheet, r.store.get().screenshot]).toEqual([2, null, true]);
      fire(r.root, 'keydown', { key: 'Escape' });
      expect(r.store.get().screenshot).toBe(false);
      fire(r.root, 'keydown', { key: ' ' });                                            // and back once it shows again
      expect(r.world.speed).toBe(0);
      r.ui.speedControl.set(2);
      r.ui.screenshotMode();
      expect(r.history.length).toBeGreaterThan(1);                                      // a history entry, so Back closes it
      r.history.back();
      expect(r.store.get().screenshot).toBe(false);
    } finally { r.cleanup(); }
  });
  it('repaints the speed buttons after the sim changes the speed in a batch of events', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.speedControl.set(2);
      expect(r.root.querySelector('.speed-main').getAttribute('aria-label') === T.play).toBe(false);
      r.world.speed = 0;                                                               // what fire.js and raids.js do on a first fire or warning
      r.ui.onEvents([{ type: 'fire', id: 1, covered: false, first: true }]);
      expect(r.root.querySelector('.speed-main').getAttribute('aria-label')).toBe(T.play);
    } finally { r.cleanup(); }
  });
  it('shows soldiers\' pay on its own summary row once soldiers are paid', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.stats.lastMonth = { taxes: 40, wages: 10, upkeep: 5, soldiers: 0, net: 25 };
      r.store.set(openSheet(r.store.get(), 'summary'));
      const rows = () => [...r.root.querySelectorAll('#sheet .row')].map((x) => x.textContent);
      expect(rows().some((t) => t.startsWith(T.soldiersPay))).toBe(false);
      r.world.stats.lastMonth = { taxes: 40, wages: 10, upkeep: 5, soldiers: 16, net: 9 };
      r.ui.refresh();
      expect(rows()).toContain(`${T.soldiersPay}−16`);
    } finally { r.cleanup(); }
  });
});

describe('s3 contract placement seams', () => {
  function rig(gold = 1000) {
    const { root, cleanup } = mount();
    const world = makeTestWorld({ gold });
    setRoad(world, 0, 10, 31, 10);
    world.milestone = 'market_town';
    const store = createStore(INITIAL_UI_STATE);
    const placement = createPlacement({ world, store });
    const bar = createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
    return { root, world, store, placement, bar, cleanup };
  }
  it('draws walls with the line tool: tap a start and an end, Flip, and the sim\'s answer in the bar', () => {
    const r = rig();
    try {
      expect(toolForItem('wall')).toEqual({ kind: 'wall' });
      expect(LINE_TOOLS).toEqual(['road', 'wall']);
      r.placement.start(toolForItem('wall'));
      expect(r.store.get().mode).toBe('drawing');
      expect(r.root.querySelector('.title').textContent).toBe('Wall');
      r.placement.pointAt(3, 3);
      r.placement.pointAt(8, 5);
      expect(r.store.get().line).toEqual({ x0: 3, y0: 3, x1: 8, y1: 5, flip: false });
      r.bar.render();
      expect(r.root.querySelector('.flip')).toBeTruthy();
      const p = r.placement.preview();
      expect([p.state, p.text, p.cost]).toEqual(['ok', '8 tiles', 64]);               // previewWall's answer (Track B): 6 + 2 tiles at 8
      expect(r.placement.confirm().ok).toBe(true);
      expect(r.world.tally.wallTiles).toBe(8);
      r.placement.dragTo(1, 1, 'start');
      r.placement.dragTo(4, 1, 'move');
      expect(r.store.get().line).toEqual({ x0: 1, y0: 1, x1: 4, y1: 1, flip: false });
    } finally { r.cleanup(); }
  });
  it('carries the score line beside the effect', () => {
    const r = rig();
    try {
      expect(typeof scoreLineFor(r.world, 'well', 3, 9)).toBe('string');
      r.placement.start({ kind: 'building', type: 'well' }, { x: 12, y: 9 });
      expect(typeof r.placement.preview().score).toBe('string');
      const { root, cleanup } = mount();
      const store = createStore({ ...INITIAL_UI_STATE, mode: 'placing', tool: { kind: 'building', type: 'well' } });
      const fake = { preview: () => ({ state: 'ok', reason: null, text: '', effect: 'Gives water to 2 homes', score: '+3 Culture', cost: 30, refund: 0, nicer: '' }), canUndo: () => false, flip() {} };
      createConfirmBar({ container: root, store, placement: fake, onCancel() {}, onConfirm() {}, onUndo() {} });
      expect(root.querySelector('.effect').textContent).toBe('Gives water to 2 homes · +3 Culture');
      cleanup();
    } finally { r.cleanup(); }
  });
  it('refuses a demolish whose rubble clearing would cross the debt floor, in the bar', () => {
    const r = rig(-498);
    try {
      addRaw(r.world, 'rubble', 12, 9);
      r.placement.start({ kind: 'demolish' });
      r.placement.pointAt(12, 9);
      r.placement.pointAt(12, 9);
      const p = r.placement.preview();
      expect([p.state, p.reason]).toEqual(['bad', 'no_gold']);
    } finally { r.cleanup(); }
  });
});

describe('s3 contract settings, title, sound and words', () => {
  it('keeps Ambient motion (on) and On a fire (Just tell me) in settings, and only their own values', () => {
    expect([DEFAULT_SETTINGS.ambient, DEFAULT_SETTINGS.fireReaction, FIRE_REACTIONS]).toEqual([true, 'inform', ['pause', 'goto', 'inform']]);
    const data = {};
    const storage = { getItem: (k) => data[k] || null, setItem: (k, v) => { data[k] = v; } };
    const { root, cleanup } = mount();
    try {
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      s.set({ ambient: false, fireReaction: 'goto' });
      s.set({ ambient: 'no', fireReaction: 'panic', difficulty: 'peaceful' });
      expect([s.get().ambient, s.get().fireReaction, s.get().difficulty]).toEqual([false, 'goto', 'peaceful']);
      expect(createSettings({ storage, root, systemReducedMotion: () => false }).get().fireReaction).toBe('goto');
    } finally { cleanup(); }
  });
  it('lets the score interface decorate the title card once, with its buttons', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
      const calls = [];
      createTitleCard({ container: root.querySelector('#title'), hasSave: true, onContinue() {}, onNewCity() {}, onSound() {},
        decorate: (element, parts) => calls.push([element.classList.contains('title-card'), parts.buttonBox.classList.contains('title-buttons'), parts.newCity.classList.contains('new-city')]) });
      expect(calls).toEqual([[true, true, true]]);
      expect(typeof titleDecor({})).toBe('function');
    } finally { cleanup(); }
  });
  it('builds the raid horn from three low notes and the coin tick from one short quiet high note', () => {
    expect(SFX.horn.length).toBe(3);
    for (const n of SFX.horn) expect([n.f < 200, n.d <= 0.4, n.g <= 0.35]).toEqual([true, true, true]);
    expect(SFX.coin.length).toBe(1);
    expect([SFX.coin[0].f > 1000, SFX.coin[0].d <= 0.1, SFX.coin[0].g <= 0.15]).toEqual([true, true, true]);
  });
  it('gives every track its own words object, and the contract its own words', () => {
    for (const o of [FIRE_TEXT, RAID_TEXT, ART_TEXT, DANGER_UI_TEXT, SCORE_TEXT, BALANCE_TEXT]) expect(o !== null && typeof o === 'object').toBe(true);
    expect([T.soldiersPay, T.wallBuilt, reasonText('no_rubble')]).toEqual(["Soldiers' pay", 'Wall built', 'No rubble here']);
  });
  it('lets a track word its own alert codes through ALERT_TEXT, the one table alertText reads first', () => {
    const w = makeTestWorld();
    const potter = addRaw(w, 'potter', 2, 11);
    expect(alertText({ code: 's3_test', id: potter.id }, w).title).toBe('Something needs attention');
    ALERT_TEXT.s3_test = (a, world, b, name) => ({ title: `${name} test ${b.id}`, fix: 'Do it' });
    try {
      expect(alertText({ code: 's3_test', id: potter.id }, w)).toEqual({ title: `Potter test ${potter.id}`, fix: 'Do it' });
      expect(alertText({ code: 'debt' }, w).title).toBe('The treasury is in debt');                // the rest as before
    } finally { delete ALERT_TEXT.s3_test; }
  });
});

describe('s3 contract records, sharing and boot', () => {
  it('carries the device\'s records in an export beside the world, and none in an autosave', () => {
    const w = createWorld({ seed: 5 });
    const recs = { ...emptyRecords(), cities: [{ id: 'a' }] };
    expect(unpackSave(packSave(w, { savedAt: 1, lastSpeed: 2, records: recs })).records).toEqual(recs);
    expect(unpackSave(packSave(w, { savedAt: 1, lastSpeed: 2 })).records).toBe(null);
    expect('records' in JSON.parse(packSave(w))).toBe(false);
    expect(unpackSave(JSON.stringify(w)).records).toBe(null);                          // a bare world
  });
  it('exports the records and sharing with their final shapes (shapes only; Track E owns the behaviour)', () => {
    expect(emptyRecords()).toEqual({ version: 1, cities: [], chronicle: [] });
    const recs = createRecords({ storage: noStorage });
    expect(recs.load()).toEqual(emptyRecords());
    expect(Array.isArray(recs.bests())).toBe(true);
    expect(Array.isArray(mergeRecords(emptyRecords(), emptyRecords()).cities)).toBe(true);
    expect(/^[0-9a-z]+-[0-9a-z]{4}$/.test(newCityId(1760000000000, () => 0.5))).toBe(true);
    expect(newCityId(1760000000000, () => 0.5)).toBe(newCityId(1760000000000, () => 0.5));
    expect(Number.isInteger(weeklySeed(new Date(2026, 9, 11)))).toBe(true);
    expect([shareLink, parseShareLink, emojiRow, pictureCard].map((f) => typeof f)).toEqual(['function', 'function', 'function', 'function']);
  });
  it('shows the dev scene hook before the game, keeps it in the game, gives each city an id, and writes and carries records', async () => {
    const downloaded = [];
    const r = await bootRig({ platform: { share: null, canShare: null, download: (f) => downloaded.push(f) } });
    try {
      expect(r.api.phase()).toBe('title');
      expect([typeof window.__thebes.devScene, typeof devScene]).toEqual(['function', 'function']);   // before the game; Track F owns what a scene does
      expect(r.api.hooks.records).toBe(r.api.records);                                 // for Seal this reign
      const noted = [];
      r.api.records.noteCity = (world) => noted.push(world.cityId);
      fire(r.root.querySelector('#title .new-city'), 'click');
      const g = r.api.game();
      expect(typeof g.world.cityId).toBe('string');
      expect([window.__thebes.world, typeof window.__thebes.devScene]).toEqual([g.world, 'function']);
      await flush(); await flush();
      expect(noted).toEqual([g.world.cityId]);                                         // the new city's first autosave noted it
      await r.api.hooks.exportCity();
      const text = await downloaded[0].text();
      expect(JSON.parse(text).records).toEqual(emptyRecords());
    } finally { r.cleanup(); }
  });
  it('gives a loaded city without an id its own, and merges an imported file\'s records', async () => {
    const old = createWorld({ seed: 6 });
    const file = new File([packSave(old, { savedAt: 1, lastSpeed: 1, records: { ...emptyRecords(), cities: [{ id: 'z' }] } })], 'c.json', { type: 'application/json' });
    const r = await bootRig({ platform: { pick: async () => file } });
    try {
      const merged = [];
      r.api.records.merge = (other) => merged.push(other.cities.map((c) => c.id));
      await r.api.hooks.importCity();
      expect(merged).toEqual([['z']]);
      expect(typeof r.api.game().world.cityId).toBe('string');
    } finally { r.cleanup(); }
  });
});
