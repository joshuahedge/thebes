import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { back, openSheet, select } from '../../src/ui/modes.js';
import { INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createEffects } from '../../src/render/effects.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createCamera } from '../../src/render/camera.js';
import { makeTestWorld, addRaw, setRoad } from '../helpers/testWorld.js';
import { buildingAt } from '../../src/sim/world.js';
import { alertText, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';

describe('ui carry-overs', () => {
  it('mirrors the confirm bar for left-handed play', async () => {
    const r = await rigUI({ width: 844, height: 390 });                        // compact: the rail
    fire(r.root.querySelector('#rail .cat[data-category="services"]'), 'click');
    fire(r.root.querySelector('#rail .drawer .card'), 'click');
    expect(r.store.get().mode).toBe('placing');
    const bar = r.root.querySelector('#confirm .confirm');
    expect(getComputedStyle(bar).flexDirection).toBe('row');
    r.ui.settings.set({ leftHanded: true });
    expect(document.body.dataset.hand).toBe('left');
    expect(getComputedStyle(bar).flexDirection).toBe('row-reverse');
    r.cleanup();
  });
  it('Esc closes an open tray or drawer, and that is not a history step', async () => {
    const r = await rigUI();
    const len = r.history.length;
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
    expect(r.store.get().dock).toBe('tray');
    expect(r.history.length).toBe(len);
    key(r.root, 'Escape');
    expect(r.store.get().dock).toBe('slim');
    key(r.root, 'Escape');
    expect(r.store.get().dock).toBe('slim');
    expect(r.history.length).toBe(len);
    expect(back({ ...INITIAL_UI_STATE, layout: 'portrait', dock: 'tray' })).toEqual({ dock: 'slim' });
    expect(back({ ...INITIAL_UI_STATE, layout: 'compact', dock: 'tray' })).toEqual({ dock: 'slim' });
    expect(back({ ...INITIAL_UI_STATE, layout: 'wide', dock: 'tray' })).toBe(null);
    expect(back({ ...INITIAL_UI_STATE, layout: 'portrait', dock: 'tray', sheet: { kind: 'menu', id: null } }).sheet).toBe(null);   // a sheet closes first
    r.cleanup();
  });
  it('puts focus back on the same button after a sheet rebuilds', async () => {
    const r = await rigUI();
    r.store.set(select(r.store.get(), buildingAt(r.world, 15, 11).id));      // the well: Pause and Demolish
    const pause = r.root.querySelector('#sheet .pause');
    pause.focus();
    expect(document.activeElement).toBe(pause);
    r.ui.refresh();                                                             // after a command the sheet is rebuilt
    const again = r.root.querySelector('#sheet .pause');
    expect(again === pause).toBe(false);
    expect(document.activeElement).toBe(again);
    r.store.set(openSheet(r.store.get(), 'minimap'));
    r.root.querySelector('#sheet .zoom-out').focus();
    r.ui.refresh();
    expect(document.activeElement.classList.contains('zoom-out')).toBe(true);
    r.cleanup();
  });
  it('keeps the legend words readable under a banner, and reads reduced motion live', async () => {
    const r = await rigUI();
    r.store.set({ overlay: 'water' });
    r.world.gold = -5;
    r.ui.alerts.refresh();
    expect(document.body.classList.contains('has-banner')).toBe(true);
    const words = r.root.querySelectorAll('#legend .strip .text');
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) { const cs = getComputedStyle(w); expect(cs.display === 'none').toBe(false); expect(cs.width).toBe('1px'); }
    r.ui.settings.set({ reducedMotion: 'off' });
    r.ui.effects.pulse(1, 1, 0);
    expect(r.ui.effects.count(0)).toBe(1);
    r.ui.settings.set({ reducedMotion: 'on' });
    r.ui.effects.pulse(2, 2, 0);
    expect(r.ui.effects.count(0)).toBe(1);                                      // no new pulse once reduced
    expect(r.ui.effects.reducedMotion).toBe(true);
    let flag = false;
    const fx = createEffects({ reducedMotion: () => flag });
    fx.puff(0, 0, 0);
    flag = true;
    fx.puff(0, 0, 0);
    expect(fx.count(0)).toBe(1);
    expect(fx.labelLift(1)).toBe(0);
    expect(createEffects({ reducedMotion: false }).reducedMotion).toBe(false);
    r.cleanup();
  });
  it('names the fix for an empty bazaar, keeps every summary label in T, and clears sprites when the pixel ratio changes', async () => {
    const w = makeTestWorld();
    const bazaar = addRaw(w, 'bazaar', 10, 10);
    expect(alertText({ code: 'bazaar_empty', id: bazaar.id }, w)).toEqual({ title: 'Bazaar has no food', fix: `Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles` });   // it may still sell goods
    for (const k of ['grain', 'lasts', 'working', 'jobs']) expect(typeof T[k]).toBe('string');
    const src = await (await fetch('/src/ui/sheets.js')).text();
    expect(/row\('[A-Z]/.test(src)).toBe(false);                               // no literal labels left in the sheets
    const r = await rigUI();
    r.store.set(openSheet(r.store.get(), 'summary'));
    const text = r.root.querySelector('#sheet').textContent;
    for (const k of ['grain', 'lasts', 'working', 'jobs']) expect(text).toContain(T[k]);
    r.cleanup();
    const canvas = document.createElement('canvas');
    const counter = {};
    const cache = createSpriteCache({ counter });
    let dpr = 1;
    const renderer = createRenderer({ canvas, dpr: () => dpr, spriteCache: cache, maxBakesPerFrame: Infinity });
    const world = makeTestWorld();
    setRoad(world, 0, 10, 31, 10);
    addRaw(world, 'well', 5, 11);
    addRaw(world, 'temple', 8, 11);
    const cam = createCamera({ x: 6, y: 11, zoom: 1 });
    const view = { width: 300, height: 200 };
    renderer.renderFrame(world, cam, { view });
    expect(renderer.dpr).toBe(1);
    const before = cache.size();
    expect(before).toBeGreaterThan(0);
    renderer.renderFrame(world, cam, { view });
    expect(cache.size()).toBe(before);
    const misses = counter.misses;
    dpr = 2;
    renderer.renderFrame(world, cam, { view });
    expect(renderer.dpr).toBe(2);
    expect(canvas.width).toBe(600);
    expect(cache.size()).toBe(before);                                          // cleared and refilled at 2x, not doubled
    expect(counter.misses).toBe(misses + before);
    expect(createRenderer({ canvas: document.createElement('canvas'), dpr: 3 }).dpr).toBe(3);
  });
});
