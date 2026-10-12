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
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
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
    const { root, cleanup } = mount();
    try {
      const s = createSettings({ storage: memory(), root, systemReducedMotion: () => asks });
      expect([s.motionLevel(), s.reducedMotion(), root.dataset.motion]).toEqual(['gentle', true, 'gentle']);
      asks = false;
      expect([s.motionLevel(), s.reducedMotion()]).toEqual(['full', false]);       // the device changed: at once
      s.set({ motion: 'still' });
      expect([s.motionLevel(), root.dataset.motion, root.classList.contains('reduce-motion')]).toEqual(['still', 'still', true]);
      s.set({ motion: 'gentle' });
      expect(s.motionLevel()).toBe('gentle');
      s.set({ motion: 'calm', musicVolume: 35, music: 'yes' });                     // not settings: ignored
      expect([s.get().motion, s.get().musicVolume, s.get().music]).toEqual(['gentle', 30, true]);
      expect([motionLevelOf('system', true), motionLevelOf('system', false), motionLevelOf('still', false)]).toEqual(['gentle', 'full', 'still']);
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
      s.set({ reducedMotion: 'off', ambient: true });                                // src/dev/scenes.js setMotion('full')
      expect([s.get().motion, s.get().reducedMotion, s.get().ambient]).toEqual(['full', 'off', true]);
      s.set({ reducedMotion: 'system', ambient: true });                             // setMotion('reduced'): follow the device
      expect([s.get().motion, s.motionLevel(), s.get().reducedMotion]).toEqual(['system', 'gentle', 'system']);
      expect(Object.keys(s.get()).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());   // the old keys are mirrors only
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
    expect(layoutMarkers(makeTestWorld(), [], createCamera({ x: 1, y: 1, zoom: 1 }), { width: 10, height: 10 })).toEqual([]);   // STUB until Track B
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
      m.pickFit = (type, ghost, insets) => { asked.push([type, typeof ghost.x, typeof insets.top]); return { zoom: 0.5, extent: { up: 60, down: 20 } }; };
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="monuments"]'), 'click');
      fire(r.root.querySelector('#dock .tray .card[data-item="colossus"]'), 'click');
      expect(asked).toEqual([['colossus', 'number', 'number']]);
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'colossus' });
      expect(r.ui.motionLevel()).toBe(r.ui.settings.motionLevel());
      expect(r.ui.markers()).toEqual([]);
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
  it('has the Stage 4 words the contract needs, and its tips sections add nothing yet', () => {
    expect([SCORE_TEXT.parts.monuments, MOOD_NAMES.monuments, MOOD_NAMES.palace, CONTRACT4_TEXT.motion]).toEqual(['Monuments', 'Monuments', 'Palace', 'Motion']);
    expect(Object.keys(CONTRACT4_TEXT.motionLevels)).toEqual(MOTION_SETTINGS);
    expect(TIPS.length).toBe(20);
  });
});

describe('s4 contract music and picture cards seams', () => {
  it('calls the music\'s mood raid while a warning or a raid is on, and its stub does nothing', () => {
    const w = makeTestWorld();
    expect([musicMood(null), musicMood(w)]).toEqual(['calm', 'calm']);
    w.raid.warning = { index: 0 };
    expect(musicMood(w)).toBe('raid');
    w.raid.warning = null; w.raid.active = { index: 0 };
    expect(musicMood(w)).toBe('raid');
    const m = createMusic();
    expect([m.unlock(), m.playing()]).toEqual([false, false]);
    for (const k of ['start', 'stop', 'refresh', 'tick', 'destroy']) expect(typeof m[k]).toBe('function');
  });
  it('shows the picture cards before the first new city on the device, once, and offers them through hooks.pictureCards', async () => {
    let done = 0;
    const c = showPictureCards({ onDone: () => { done++; } });
    expect([done, typeof c.close]).toEqual([1, 'function']);                      // STUB: done at once
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      expect(typeof api.music.tick).toBe('function');
      fire(shell.root.querySelector('#title .new-city'), 'click');
      expect(api.phase()).toBe('game');
      const settings = api.game().ui.settings;
      expect(settings.get().cardsSeen).toBe(true);
      let after = 0;
      api.hooks.pictureCards(() => { after++; });
      expect(after).toBe(1);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
