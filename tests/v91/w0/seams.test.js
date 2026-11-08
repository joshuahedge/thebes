// Version 9.1 wave 0 (ruling 1651): the seams Tracks F, R and P fill, each a stub with 9.0's behaviour, wired where its caller calls it; index.html's three
// marked, empty blocks and css/v91.css linked last; the five text.js sections in merge order. Ruling 1652: world.lessonCards is optional and survives a save.
import { describe, it, expect } from '../../harness.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { installRescue } from '../../../src/ui/v91/rescue.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { PRESTIGE_UNLOCKS } from '../../../src/data/monuments.js';
import { createWorld } from '../../../src/sim/world.js';
import { serialize, deserialize, packSave, unpackSave } from '../../../src/save/serialize.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../../helpers/uiWorld.js';

const source = (path) => fetch(path).then((r) => r.text());
const flush = () => new Promise((r) => setTimeout(r, 0));
const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };

// A small city at 1x whose day's tick throws while `armed` (its buildings are read every day).
function throwingCity() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 5, 11);
  w.speed = 1;
  const buildings = w.buildings, boom = new Error('boom');
  const gate = { armed: false };
  Object.defineProperty(w, 'buildings', { get() { if (gate.armed) throw boom; return buildings; }, configurable: true });
  return { w, gate, boom };
}

describe('v91 w0 seams: the loop\'s onError', () => {
  it('without onError a throw in the tick or the render leaves the frame as on 9.0 (it throws, the next frame is queued)', () => {
    const { w, gate } = throwingCity();
    let queued = 0, renders = 0, renderThrows = false;
    const loop = createGameLoop({ world: w, render: () => { renders++; if (renderThrows) throw new Error('draw'); }, raf: () => { queued++; return 1; }, caf: () => {} });
    loop.start();
    for (const t of [0, 250, 500, 750]) loop.tick(t);
    gate.armed = true;
    expect(() => loop.tick(1000)).toThrow();   // a whole day's time: the day's tick throws
    expect(loop.running).toBe(true);
    gate.armed = false;
    renderThrows = true;
    expect(() => loop.tick(1250)).toThrow();
    expect(queued).toBe(7);   // start, then one a frame before anything in it can throw
    expect(renders).toBe(5);
  });
  it('with onError a throw in a day\'s tick calls onError({ where: \'tick\', error }) and ends that frame: no more days, no events, no draw', () => {
    const { w, gate, boom } = throwingCity();
    const errors = [], frames = [], batches = [];
    const loop = createGameLoop({ world: w, render: (f) => frames.push(f), onEvents: (e) => batches.push(e), onError: (e) => errors.push(e), raf: () => 1, caf: () => {} });
    loop.start();
    for (const t of [0, 250, 500, 750]) loop.tick(t);
    const day = w.day, drawn = frames.length, delivered = batches.length;
    gate.armed = true;
    loop.tick(1000);                         // a whole day's time: the day's tick throws
    expect(errors.length).toBe(1);
    expect([errors[0].where, errors[0].error]).toEqual(['tick', boom]);
    expect(Object.keys(errors[0]).sort()).toEqual(['error', 'where']);
    expect(w.day).toBe(day);
    expect([frames.length, batches.length]).toEqual([drawn, delivered]);   // the throwing frame drew nothing and delivered nothing
    expect(loop.accumulator).toBe(0);
    expect(loop.running).toBe(true);         // stopping is the caller's choice (Track R)
    gate.armed = false;
    for (let t = 1250; t <= 2000; t += 250) loop.tick(t);
    expect(w.day).toBe(day + 1);              // the loop goes on as before once the tick stops throwing
    expect(errors.length).toBe(1);
  });
  it('with onError a throw in the render calls onError({ where: \'render\', error }); the days still ran and the events still came', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const errors = [], draw = new Error('draw');
    let calls = 0;
    const loop = createGameLoop({ world: w, render: () => { calls++; throw draw; }, onError: (e) => errors.push(e), raf: () => 1, caf: () => {} });
    loop.start();
    loop.tick(0);
    for (let t = 250; t <= 1000; t += 250) loop.tick(t);
    expect(w.day).toBe(1);
    expect(calls).toBe(5);
    expect(errors.length).toBe(5);
    expect(errors.every((e) => e.where === 'render' && e.error === draw)).toBe(true);
  });
  it('with onError and nothing thrown the loop steps, delivers and draws exactly as without it', () => {
    const run = (withError) => {
      const w = makeTestWorld();
      setRoad(w, 0, 10, 31, 10);
      addRaw(w, 'house', 5, 11);
      w.speed = 3;
      const frames = [], batches = [];
      const loop = createGameLoop({ world: w, render: (f) => frames.push(f.timeDays), onEvents: (e) => batches.push(e.length), ...(withError ? { onError: () => { throw new Error('never'); } } : {}), raf: () => 1, caf: () => {} });
      for (let t = 0; t <= 20000; t += 250) loop.tick(t);
      return { day: w.day, gold: w.gold, frames, batches };
    };
    expect(run(true)).toEqual(run(false));
  });
});

describe('v91 w0 seams: the rescue, autosave\'s blocked() and the caches', () => {
  it('installRescue installs nothing (no listener, no element)', () => {
    const added = [];
    const win = { addEventListener: (...a) => added.push(a), removeEventListener() {} };
    const doc = { addEventListener: (...a) => added.push(a), createElement: () => { throw new Error('no element'); } };
    expect(installRescue({ win, doc, root: null, game: () => null })).toBe(undefined);
    expect(added.length).toBe(0);
  });
  it('boot.js calls installRescue once, before the title or a development flag\'s game opens', async () => {
    const b = await source('/src/boot.js');
    expect(b.split('installRescue(').length).toBe(2);   // one call (the import names it without a bracket)
    const call = b.indexOf('installRescue({');
    expect(call > 0).toBe(true);
    for (const opener of ["if (params.get('skipTitle') === '1')", '} else showTitle(await loadSave(store));']) expect([opener, call < b.indexOf(opener)]).toEqual([opener, true]);
    expect(b.slice(call, b.indexOf(';', call))).toContain('game: () => current');
  });
  it('autosave saves as on 9.0 until ui.setAutosaveBlocked(true), then never calls the save and raises no save-failing banner', async () => {
    const reasons = [];
    const r = await rigUI({ hooks: { save: async (reason) => { reasons.push(reason); return true; } } });
    try {
      await r.ui.autosave('month');
      expect(reasons).toEqual(['month']);
      r.ui.setAutosaveBlocked(true);
      await r.ui.autosave('month'); await r.ui.autosave('hidden'); await r.ui.autosave('export');
      expect(reasons).toEqual(['month']);
      expect(r.ui.alerts.list().some((a) => a.code === 'save_failed')).toBe(false);
      r.ui.setAutosaveBlocked(false);
      await r.ui.autosave('hidden');
      expect(reasons).toEqual(['month', 'hidden']);
    } finally { r.cleanup(); }
  });
  it('autosave asks blocked() first, in one place', async () => {
    const ui = await source('/src/ui/createUI.js');
    const body = ui.slice(ui.indexOf('async function autosave(reason)'), ui.indexOf('function onEvents(events)'));
    expect(body.split('\n')[1]).toContain('blocked()');
    expect(ui.split('function blocked()').length).toBe(2);
  });
  // Track P filled it (ruling 1686): the bytes the one renderer's caches hold, zero before anything is drawn (tests/v91/p/caches.test.js has the figures).
  it('window.__thebes.caches() gives { terrainBytes, spriteBytes } on the title and in a game, from the renderer', async () => {
    expect(createRenderer({ canvas: document.createElement('canvas') }).cacheBytes()).toEqual({ terrainBytes: 0, spriteBytes: 0 });
    const counts = (c) => [Object.keys(c).sort(), Number.isFinite(c.terrainBytes) && c.terrainBytes >= 0, Number.isFinite(c.spriteBytes) && c.spriteBytes >= 0];
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      expect(api.phase()).toBe('title');
      expect(counts(window.__thebes.caches())).toEqual([['spriteBytes', 'terrainBytes'], true, true]);
      api.startGame(api.freshWorld(), { saveNow: false });
      await flush();
      expect(api.phase()).toBe('game');
      const { renderer, world } = window.__thebes;
      expect(window.__thebes.caches()).toEqual(renderer.cacheBytes());
      renderer.renderFrame(world, window.__thebes.cam, { view: { width: 1280, height: 800 } });
      expect(window.__thebes.caches()).toEqual({ terrainBytes: renderer.baker.bytes(world), spriteBytes: renderer.spriteCache.bytes() });
      expect(window.__thebes.caches().terrainBytes).toBeGreaterThan(0);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});

describe('v91 w0 seams: isUnlocked reads world.lessonCards', () => {
  // The first card a fresh city (Village) has not unlocked by rank: one of a later milestone's, not a prestige one.
  const laterCard = () => MILESTONES.slice(1).flatMap((m) => m.unlocks).find((t) => !PRESTIGE_UNLOCKS.includes(t));
  it('a city without lessonCards unlocks by rank alone, as on 9.0', () => {
    const w = createWorld({ seed: 3 });
    expect('lessonCards' in w).toBe(false);
    const type = laterCard();
    expect(isUnlocked(w, type)).toBe(false);
    expect(isUnlocked(w, 'house')).toBe(true);
  });
  it('a type in lessonCards counts as unlocked whatever the rank; the rest are unchanged', () => {
    const w = createWorld({ seed: 3 });
    const type = laterCard();
    const all = MILESTONES.flatMap((m) => m.unlocks);
    const before = all.map((t) => isUnlocked(w, t));
    w.lessonCards = [type];
    expect(isUnlocked(w, type)).toBe(true);
    expect(all.map((t) => (t === type ? false : isUnlocked(w, t)))).toEqual(before.map((v, i) => (all[i] === type ? false : v)));
    w.lessonCards = [];
    expect(all.map((t) => isUnlocked(w, t))).toEqual(before);
  });
  it('lessonCards survives a save and a reload (no world-version bump), and a city without it reloads without it', () => {
    const w = createWorld({ seed: 3 });
    const version = w.version;
    const type = laterCard();
    w.lessonCards = ['tower', type];
    const again = deserialize(serialize(w));
    expect([again.version, again.lessonCards]).toEqual([version, ['tower', type]]);
    expect(isUnlocked(again, type)).toBe(true);
    const packed = unpackSave(packSave(w, { savedAt: 5, lastSpeed: 2 })).world;
    expect(packed.lessonCards).toEqual(['tower', type]);
    const plain = deserialize(serialize(createWorld({ seed: 3 })));
    expect('lessonCards' in plain).toBe(false);
  });
});

describe('v91 w0 seams: index.html\'s blocks, css/v91.css and the text sections', () => {
  const MARKS = ['<!-- v91 loading -->', '<!-- end v91 loading -->', '<!-- v91 early-error -->', '<!-- end v91 early-error -->', '<!-- v91 preload -->', '<!-- end v91 preload -->'];
  it('has the three marked blocks, each once and empty: loading and the early error before the first stylesheet, the preload after the last', async () => {
    const html = await source('/index.html');
    const at = (s) => html.indexOf(s);
    for (const m of MARKS) expect([m, html.split(m).length]).toEqual([m, 2]);
    for (let i = 1; i < MARKS.length; i++) expect([MARKS[i], at(MARKS[i - 1]) < at(MARKS[i])]).toEqual([MARKS[i], true]);
    for (let i = 0; i < MARKS.length; i += 2) {
      if (MARKS[i] === '<!-- v91 preload -->') continue;   // Track P fills it (tools/sw-files.ps1; tests/v91/p/preload.test.js)
      expect([MARKS[i], html.slice(at(MARKS[i]) + MARKS[i].length, at(MARKS[i + 1])).trim()]).toEqual([MARKS[i], '']);
    }
    const firstSheet = at('<link rel="stylesheet"'), lastSheet = html.lastIndexOf('<link rel="stylesheet"');
    expect(at('<!-- end v91 early-error -->') < firstSheet).toBe(true);
    expect(at('<!-- v91 preload -->') > lastSheet && at('<!-- end v91 preload -->') < at('</head>')).toBe(true);
  });
  it('links css/v91.css last, once', async () => {
    const page = new DOMParser().parseFromString(await source('/index.html'), 'text/html');
    const hrefs = [...page.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')).filter((h) => /css\//.test(h));
    expect(hrefs[hrefs.length - 1]).toBe('./css/v91.css');
    expect(hrefs.filter((h) => h === './css/v91.css').length).toBe(1);
    expect((await fetch('/css/v91.css')).status).toBe(200);
  });
  it('ends text.js with the five 9.1 sections in merge order, F, R, A, P then H, each empty', async () => {
    const text = await source('/src/ui/text.js');
    const at = (s) => text.indexOf(s);
    const marks = ['f', 'r', 'a', 'p', 'h'].flatMap((k) => [`// Version 9.1, Track ${k.toUpperCase()} (`, `// ── end v91 ${k} ──`]);
    for (const m of marks) expect([m, text.split(m).length, at(m) > at('// ── end v90 v ──')]).toEqual([m, 2, true]);
    for (let i = 1; i < marks.length; i++) expect([marks[i], at(marks[i - 1]) < at(marks[i])]).toEqual([marks[i], true]);
    for (let i = 0; i < marks.length; i += 2) {
      const header = text.indexOf('\n', at(marks[i]));
      expect([marks[i], text.slice(header, at(marks[i + 1])).trim()]).toEqual([marks[i], '']);
    }
    expect(text.trimEnd().endsWith('// ── end v91 h ──')).toBe(true);
  });
});
