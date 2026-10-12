import { describe, it, expect } from '../../harness.js';
import { createSettings, DEFAULT_SETTINGS, MOTION_SETTINGS, MOTION_LEVELS, MUSIC_VOLUMES, motionFromLegacy, motionLevelOf } from '../../../src/ui/settings.js';
import { createRenderer, collectObjects } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { ART } from '../../../src/render/art/registry.js';
import { markerAt, layoutMarkers, MARKER_TAP_PX } from '../../../src/render/markers.js';
import { createMusic, musicMood } from '../../../src/audio/music.js';
import { showPictureCards } from '../../../src/ui/tutorial.js';
import { createMonumentUi } from '../../../src/ui/monumentSheet.js';
import { toolForItem } from '../../../src/data/ui.js';
import { TIPS } from '../../../src/data/tips.js';
import { CONTRACT4_TEXT, MOOD_NAMES, SCORE_TEXT } from '../../../src/ui/text.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI, mountShell, fakeHistory, fakeDoc } from '../../helpers/uiWorld.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } });
const stored = (obj) => memory({ 'thebes.settings': JSON.stringify(obj) });

describe('s4 contract settings: Motion, music and the picture cards flag', () => {
  it('has one Motion setting following the device, music on at 30, and no picture cards seen', () => {
    expect([DEFAULT_SETTINGS.motion, DEFAULT_SETTINGS.music, DEFAULT_SETTINGS.musicVolume, DEFAULT_SETTINGS.cardsSeen]).toEqual(['system', true, 30, false]);
    expect(['reducedMotion' in DEFAULT_SETTINGS, 'ambient' in DEFAULT_SETTINGS]).toEqual([false, false]);
    expect([MOTION_SETTINGS, MOTION_LEVELS, MUSIC_VOLUMES]).toEqual([['system', 'full', 'gentle', 'still'], ['full', 'gentle', 'still'], [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]]);
  });
  it('gives Gentle, not Still, to a device that asks for less motion, read live, and says the level on the root', () => {
    let asks = true;
    let changed = null;                                                             // the device's change watch, injected
    const watchSystem = (cb) => { changed = cb; return () => { changed = null; }; };
    const { root, cleanup } = mount();
    try {
      const s = createSettings({ storage: memory(), root, systemReducedMotion: () => asks, watchSystem });
      expect([s.motionLevel(), s.reducedMotion(), root.dataset.motion]).toEqual(['gentle', true, 'gentle']);
      asks = false;
      expect([s.motionLevel(), s.reducedMotion()]).toEqual(['full', false]);       // the device changed: at once
      changed();                                                                    // and the root follows it (spec 5.4)
      expect([root.dataset.motion, root.classList.contains('reduce-motion')]).toEqual(['full', false]);
      asks = true;
      changed();
      expect([root.dataset.motion, root.classList.contains('reduce-motion')]).toEqual(['gentle', true]);
      s.set({ motion: 'still' });
      expect([s.motionLevel(), root.dataset.motion, root.classList.contains('reduce-motion')]).toEqual(['still', 'still', true]);
      s.set({ motion: 'gentle' });
      expect(s.motionLevel()).toBe('gentle');
      s.set({ motion: 'calm', musicVolume: 35, music: 'yes' });                     // not settings: ignored
      expect([s.get().motion, s.get().musicVolume, s.get().music]).toEqual(['gentle', 30, true]);
      expect([motionLevelOf('system', true), motionLevelOf('system', false), motionLevelOf('still', false)]).toEqual(['gentle', 'full', 'still']);
      s.destroy();
      expect(changed).toBe(null);                                                   // destroy stops the watch
      const bare = createSettings({ storage: memory(), root, systemReducedMotion: () => false, watchSystem: () => undefined });
      bare.destroy();                                                               // no watch offered: nothing to stop
      expect(root.dataset.motion).toBe('full');
    } finally { cleanup(); }
  });
  it('moves a Stage 3 device\'s choice to Motion once (ruling 249), and still reads the two old keys when they are set', () => {
    const { root, cleanup } = mount();
    try {
      const load = (obj) => createSettings({ storage: stored(obj), root, systemReducedMotion: () => true }).get().motion;
      expect([load({ reducedMotion: 'on' }), load({ ambient: false }), load({ reducedMotion: 'off', ambient: false }), load({ reducedMotion: 'off' }), load({ reducedMotion: 'system' }), load({})])
        .toEqual(['still', 'still', 'still', 'full', 'system', 'system']);
      expect(load({ reducedMotion: 'on', motion: 'full' })).toBe('full');             // a Stage 4 choice wins
      expect([motionFromLegacy({ reducedMotion: 'off', ambient: true }), motionFromLegacy({ ambient: true })]).toEqual(['full', null]);
      const s = createSettings({ storage: memory(), root, systemReducedMotion: () => true });
      s.set({ reducedMotion: 'off', ambient: true });                                // a Stage 1-3 test's write
      expect([s.get().motion, s.get().reducedMotion, s.get().ambient]).toEqual(['full', undefined, undefined]);   // Track E retired the mirrors
      s.set({ reducedMotion: 'system', ambient: true });                             // follow the device
      expect([s.get().motion, s.motionLevel()]).toEqual(['system', 'gentle']);
      expect(Object.keys(s.get()).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());   // the old keys are never kept
    } finally { cleanup(); }
  });
});

describe('s4 contract render seams', () => {
  it('draws a monument through opts.live in its depth slot, never from the sprite cache, and falls back without it', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const site = addRaw(w, 'colossus', 12, 8);
    addRaw(w, 'well', 11, 9);
    addRaw(w, 'well', 14, 9);
    const range = { x0: 0, y0: 0, x1: 31, y1: 31 };
    const objects = collectObjects(w, range, []);
    const o = objects.find((x) => x.id === site.id);
    expect([o.b, o.def.live, ART.colossus.live]).toEqual([site, true, true]);
    expect(objects.filter((x) => x.b).length).toBe(1);                            // only live slots carry their building
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1 });
    const cam = createCamera({ x: 13, y: 9, zoom: 1 });
    const calls = [];
    const stats = renderer.renderFrame(w, cam, { view: { width: 400, height: 300 }, live: (g, x) => calls.push(x.b.id) });
    expect([calls, stats.live]).toEqual([[site.id], 1]);
    const bare = renderer.renderFrame(w, cam, { view: { width: 400, height: 300 } });
    expect(bare.live).toBe(0);
  });
  it('hits a problem marker on its badge or its stem within 22 px, the front one first', () => {
    const layout = [
      { ids: [1], x: 100, y: 50, r: 10, foot: { x: 100, y: 90 }, glyph: '!', tone: 'problem', count: 1 },
      { ids: [2, 3], x: 110, y: 55, r: 10, foot: { x: 110, y: 70 }, glyph: '!', tone: 'problem', count: 2 },
    ];
    expect(MARKER_TAP_PX).toBe(22);
    expect(markerAt(layout, 112, 56).ids).toEqual([2, 3]);                        // both badges are near: the front wins
    expect(markerAt(layout, 100, 88).ids).toEqual([1]);                           // on the first one's stem
    expect(markerAt(layout, 300, 300)).toBe(null);
    expect(markerAt([], 1, 1)).toBe(null);
    expect(Array.isArray(layoutMarkers(makeTestWorld(), [], createCamera({ x: 1, y: 1, zoom: 1 }), { width: 10, height: 10 }))).toBe(true);
  });
});

describe('s4 contract interface seams', () => {
  it('makes the monuments interface once with the seam context, and asks its pickFit when a monument card is picked', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const m = r.ui.monumentUi;
      expect(['sheets', 'sheetParts', 'onEvents', 'refresh', 'onAlertAction', 'onCommand', 'pickFit', 'markerTap', 'destroy'].every((k) => k in m)).toBe(true);
      const blank = createMonumentUi({});
      expect([blank.pickFit('colossus', { x: 1, y: 1 }, {}), blank.markerTap({ ids: [1] })]).toEqual([null, false]);
      r.world.milestone = 'great_city';
      const asked = [];
      let fitZoom = 0.5;
      m.pickFit = (type, ghost, insets) => { asked.push([type, typeof ghost.x, typeof insets.top]); return { zoom: fitZoom, extent: { up: 60, down: 20 } }; };
      const cc = r.ui.cameraControl, keep = cc.keepVisible, kept = [];
      cc.keepVisible = (...args) => { kept.push([args[5], args[6]]); return keep(...args); };
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="monuments"]'), 'click');
      fire(r.root.querySelector('#dock .tray .card[data-item="colossus"]'), 'click');
      expect(asked).toEqual([['colossus', 'number', 'number']]);
      const tool = r.store.get().tool;
      expect([tool.kind, tool.type]).toEqual(['building', 'colossus']);
      expect(kept).toEqual([[{ up: 60, down: 20 }, 0.5]]);                          // the fit's extent and zoom go to the camera
      cc.tick(1e12);
      expect(r.cam.zoom).toBe(0.5);                                                 // and the camera ends at the fit's zoom
      fitZoom = 1.5;                                                                // a fit never zooms in (ruling 231)
      r.store.set({ tool: null });
      fire(r.root.querySelector('#dock .tray .card[data-item="colossus"]'), 'click');
      expect([kept.length, kept[1][1]]).toEqual([2, 0.5]);
      expect(r.ui.motionLevel()).toBe(r.ui.settings.motionLevel());
      expect(Array.isArray(r.ui.markers())).toBe(true);
    } finally { r.cleanup(); }
  });
  it('puts the monuments interface\'s sheet parts on a building sheet', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const b = addRaw(r.world, 'obelisk_small', 20, 9);
      r.ui.monumentUi.sheetParts.building = (x) => (x.id === b.id ? [Object.assign(document.createElement('p'), { className: 's4-part', textContent: 'site' })] : []);
      r.store.set(openSheet(r.store.get(), 'info', b.id));
      expect(r.root.querySelector('#sheet .s4-part').textContent).toBe('site');
    } finally { r.cleanup(); }
  });
  it('paints plazas with the plaza card\'s tool, one undo step', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expect(toolForItem('plaza')).toEqual({ kind: 'plazas' });
      r.world.milestone = 'city';
      r.ui.placement.start({ kind: 'plazas' });
      r.ui.placement.pointAt(16, 12);
      r.ui.placement.pointAt(17, 12);
      expect(r.ui.placement.preview().count).toBe(2);
      expect(r.ui.placement.confirm().ok).toBe(true);
      const step = r.world.undo[r.world.undo.length - 1];                       // (goals may pay out after the command, so not the gold)
      expect([step.kind, step.cost, step.ids.length, Object.values(r.world.buildings).filter((x) => x.type === 'plaza').length]).toEqual(['place', 16, 2, 2]);
    } finally { r.cleanup(); }
  });
  it('paints plazas from a touch plan too: tiles toggled on and off, then confirmed as one undo step', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'city';
      r.ui.placement.start({ kind: 'plazas' });
      r.ui.placement.toggleTile(16, 12);
      r.ui.placement.toggleTile(17, 12);
      r.ui.placement.toggleTile(18, 12);
      r.ui.placement.toggleTile(18, 12);                                            // the same tile twice: off again
      expect([r.store.get().plan.tiles, r.ui.placement.preview().count, r.ui.placement.preview().cost]).toEqual([[[16, 12], [17, 12]], 2, 16]);
      const undoBefore = r.world.undo.length;
      expect(r.ui.placement.confirm().ok).toBe(true);
      const step = r.world.undo[r.world.undo.length - 1];
      expect([r.world.undo.length - undoBefore, step.kind, step.cost, step.ids.length]).toEqual([1, 'place', 16, 2]);
      expect(step.ids.map((id) => r.world.buildings[id].type)).toEqual(['plaza', 'plaza']);
    } finally { r.cleanup(); }
  });
  it('has the Stage 4 words the contract needs, and the tips keep the base twenty first, each id once', () => {
    expect([SCORE_TEXT.parts.monuments, MOOD_NAMES.monuments, MOOD_NAMES.palace, CONTRACT4_TEXT.motion]).toEqual(['Monuments', 'Monuments', 'Palace', 'Motion']);
    expect(Object.keys(CONTRACT4_TEXT.motionLevels)).toEqual(MOTION_SETTINGS);
    const base = ['press_play', 'arrivals', 'house_needs', 'service_reach', 'problem_marker', 'month_summary', 'more_workers', 'undo_demolish', 'goals_list', 'overlay_keys',
      'nicer_streets', 'storehouse_choices', 'trade_orders', 'merging_homes', 'fire_risk', 'firebreaks', 'clearing_rubble', 'raider_targets', 'tribute_once', 'wall_ring'];
    const ids = TIPS.map((t) => t.id);
    expect(ids.slice(0, base.length)).toEqual(base);                                // the tracks add theirs after (src/data/tips.js)
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('s4 contract music and picture cards seams', () => {
  it('calls the music\'s mood raid while a warning or a raid is on, and has the music\'s and the cards\' controls', () => {
    const w = makeTestWorld();
    expect([musicMood(null), musicMood(w)]).toEqual(['calm', 'calm']);
    w.raid.warning = { index: 0 };
    expect(musicMood(w)).toBe('raid');
    w.raid.warning = null; w.raid.active = { index: 0 };
    expect(musicMood(w)).toBe('raid');
    const m = createMusic();
    expect([typeof m.unlock(), typeof m.playing()]).toEqual(['boolean', 'boolean']);
    for (const k of ['start', 'stop', 'refresh', 'tick', 'destroy']) expect(typeof m[k]).toBe('function');
    const c = showPictureCards({ onDone: () => {} });
    expect(typeof c.close).toBe('function');
  });

  // boot on the real shell with the music and the picture cards injected. Frames run by hand: frames(t) runs every queued
  // animation frame once at time t.
  async function bootWith({ createMusic: makeMusic, showPictureCards: showCards, storage = memory(), doc = fakeDoc() }) {
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const queued = new Map();
    let next = 1;
    const api = await boot(doc, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: (fn) => { queued.set(next, fn); return next++; }, caf: (id) => { queued.delete(id); } },
      createMusic: makeMusic, showPictureCards: showCards,
    });
    const frames = (t) => { const fns = [...queued.values()]; queued.clear(); for (const fn of fns) fn(t); };
    const cleanup = () => { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; };
    return { api, shell, doc, frames, cleanup };
  }
  const storedSettings = (storage) => JSON.parse(storage.getItem('thebes.settings') || '{}');

  it('wires the music in boot: unlocked by the first gestures, quiet while hidden, refreshed by settings, ticked by both loops', async () => {
    const calls = [];
    let opts = null, unlocks = 0;
    const spy = (o) => {
      opts = o;
      return {
        unlock: () => { calls.push('unlock'); return ++unlocks >= 2; }, start: () => calls.push('start'), stop: () => calls.push('stop'),
        refresh: () => calls.push('refresh'), tick: (t) => calls.push(`tick ${t}`), destroy: () => calls.push('destroy'), playing: () => false,
      };
    };
    const storage = memory();
    const b = await bootWith({ createMusic: spy, showPictureCards: ({ onDone }) => { onDone(); return { close() {} }; }, storage });
    let destroyed = false;
    try {
      expect([b.api.music === null, typeof opts.seed(), opts.mood()]).toEqual([false, 'number', 'calm']);
      fire(b.shell.root, 'pointerdown');
      fire(b.shell.root, 'keydown');                                               // unlocked: the gestures stop asking
      fire(b.shell.root, 'pointerup');
      expect(calls.filter((c) => c === 'unlock').length).toBe(2);
      b.doc.hidden = true; b.doc.fireVisibility();
      b.doc.hidden = false; b.doc.fireVisibility();
      expect(calls.slice(-2)).toEqual(['stop', 'start']);
      b.frames(1000);                                                               // the title's loop
      expect(calls.includes('tick 1000')).toBe(true);
      const sound = b.shell.root.querySelector('#title .sound');
      fire(sound, 'click');                                                         // Play with sound: sound and music on
      expect([storedSettings(storage).sound, storedSettings(storage).music, opts.enabled(), calls[calls.length - 1]]).toEqual([true, true, true, 'refresh']);
      fire(sound, 'click');                                                         // Play muted: both off (ruling 269)
      expect([storedSettings(storage).sound, storedSettings(storage).music, opts.enabled()]).toEqual([false, false, false]);
      fire(b.shell.root.querySelector('#title .new-city'), 'click');
      expect(b.api.phase()).toBe('game');
      expect(opts.seed()).toBe(b.api.game().world.seed);                            // the city's seed once it runs
      b.frames(2000);                                                               // the game's loop
      expect(calls.includes('tick 2000')).toBe(true);
      b.cleanup(); destroyed = true;
      expect(calls[calls.length - 1]).toBe('destroy');
    } finally { if (!destroyed) b.cleanup(); }
  });
  it('shows the picture cards before the first new city on the device and starts the city only when they are done', async () => {
    let held = null, shown = 0, closed = 0;
    const cards = ({ onDone }) => { shown++; held = onDone; return { close: () => { closed++; } }; };
    const storage = memory();
    const b = await bootWith({ showPictureCards: cards, storage });
    let destroyed = false;
    try {
      fire(b.shell.root.querySelector('#title .new-city'), 'click');
      expect([b.api.phase(), shown, storedSettings(storage).cardsSeen === true]).toEqual(['title', 1, false]);   // the cards first
      fire(b.shell.root.querySelector('#title .new-city'), 'click');
      expect(shown).toBe(1);                                                        // a second New city while they show: ignored
      held();
      expect([b.api.phase(), b.api.game().ui.settings.get().cardsSeen, storedSettings(storage).cardsSeen]).toEqual(['game', true, true]);
      let after = 0;
      b.api.hooks.pictureCards(() => { after++; });                                 // any time after: onDone when they are done
      expect([shown, after]).toEqual([2, 0]);
      held();
      expect(after).toBe(1);
      b.api.hooks.pictureCards();
      b.cleanup(); destroyed = true;
      expect(closed).toBe(1);                                                       // the page torn down under them: closed
    } finally { if (!destroyed) b.cleanup(); }
  });
});
