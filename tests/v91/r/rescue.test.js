// Version 9.1 Track R (rulings 1675-1680, target P10): a thrown error. A throw in a day's tick, in the draw and in a handler each: the loop stops within the frame, the card shows
// (or the one toast), autosave is blocked (a tainted city) or done (a sound one), the slot still loads, nothing repeats per frame, one card a session.
import { describe, it, expect } from '../../harness.js';
import { boot, loadSave } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { unpackSave } from '../../../src/save/serialize.js';
import { openSheet } from '../../../src/ui/modes.js';
import { cleanLine, errorLines, ignorable, RENDER_IN_A_ROW, STORM_COUNT } from '../../../src/ui/v91/rescue.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { V91_R_TEXT as W } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };
const until = async (cond, ms = 4000) => { for (let t = 0; t < ms && !cond(); t += 40) await sleep(40); };
const settle = async () => { for (let i = 0; i < 6; i++) await sleep(10); };
const cards = () => document.querySelectorAll('.v91-error');

// The real page shell, a fake store, the loop's frames explicit (raf stubbed) unless realRaf: the page's own animation frames.
async function rig({ params = '', realRaf = false } = {}) {
  const shell = await mountShell(390, 844);
  const history = fakeHistory();
  const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
  const calls = { reload: 0, download: [], saves: 0, raf: 0, caf: 0 };
  const save = store.save.bind(store);
  store.save = async (text) => { calls.saves++; return save(text); };
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: realRaf ? {} : { raf: () => { calls.raf++; return calls.raf; }, caf: () => { calls.caf++; } },
    platform: { reload: () => { calls.reload++; }, download: (f) => calls.download.push(f), share: null, canShare: null },
  });
  return {
    api, store, calls, shell,
    start({ save: saveNow = true } = {}) { api.startGame(api.freshWorld(), { saveNow }); return api.game(); },
    cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; for (const c of cards()) c.remove(); },
  };
}

// A throw the first time a day's tick reads the buildings after armed (the draw, run after the tick, never gets there).
function armTick(world) {
  const buildings = world.buildings, gate = { armed: false };
  Object.defineProperty(world, 'buildings', { configurable: true, enumerable: true, get() { if (gate.armed) { gate.armed = false; throw new Error('boom'); } return buildings; } });
  return gate;
}
const frames = (loop, ts) => { for (const t of ts) loop.tick(t); };
const fail = (error, message) => window.dispatchEvent(new ErrorEvent('error', { error, message: message || (error && error.message) || '' }));
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('v91 r rescue: the details', () => {
  it('cleanLine drops the page\'s address, query and hash and cuts a long line; errorLines gives the name, the message and three stack frames', () => {
    expect(cleanLine('at tickDay (http://localhost:8000/src/sim/clock.js?v=3:70:3)')).toBe('at tickDay (/src/sim/clock.js:70:3)');
    expect(cleanLine('at f (https://example.org/app.js?seed=44:1:1)')).toBe('at f (/app.js:1:1)');
    expect(cleanLine('shared https://example.org/#share=abc')).toBe('shared /');
    expect(cleanLine('x'.repeat(500)).length).toBe(200);
    const e = new Error('boom');
    const lines = errorLines(e);
    expect(lines[0]).toBe('Error: boom');
    expect(lines.length > 1 && lines.length <= 4).toBe(true);
    expect(lines.every((l) => !l.includes(location.origin))).toBe(true);
    expect(errorLines('plain words')).toEqual(['plain words']);
  });
  it('ignorable: the browser\'s loop notice, a cancelled share or a blocked sound, a rejection with no reason, a cross-origin "Script error."; a real error is not', () => {
    expect(ignorable(undefined, 'ResizeObserver loop completed with undelivered notifications.')).toBe(true);
    expect(ignorable(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(ignorable(Object.assign(new Error('x'), { name: 'NotAllowedError' }))).toBe(true);
    expect(ignorable(undefined, '')).toBe(true);
    expect(ignorable(undefined, 'Script error.')).toBe(true);
    expect(ignorable(new TypeError('x is not a function'))).toBe(false);
    expect(ignorable(undefined, 'Uncaught SyntaxError')).toBe(false);
  });
});

describe('v91 r rescue: a throw in a day\'s tick (the sim: the city may be half changed)', () => {
  it('stops the loop, pauses the game, shows the card, blocks every save of that city and leaves the slot as it was; the slot still loads', async () => {
    const r = await rig();
    try {
      const g = r.start();
      await settle();
      const slot = (await r.store.load()).text;
      const savesBefore = r.calls.saves;
      g.world.speed = 1;
      const gate = armTick(g.world);
      frames(g.loop, [0, 250, 500, 750]);
      expect(cards().length).toBe(0);
      gate.armed = true;
      g.loop.tick(1000);
      expect([g.loop.running, g.world.speed, r.api.rescue.isTainted(g.world), r.calls.caf > 0]).toEqual([false, 0, true, true]);
      expect(cards().length).toBe(1);
      await g.ui.autosave('hidden');
      await g.ui.autosave('month');
      expect(await r.api.hooks.save('update')).toBe(false);
      expect(await r.api.hooks.save()).toBe(false);
      expect(r.calls.saves).toBe(savesBefore);
      expect(g.ui.alerts.list().some((a) => a.code === 'save_failed')).toBe(false);
      expect((await r.store.load()).text).toBe(slot);
      const loaded = await loadSave(r.store);
      expect(loaded.state).toBe('ok');
      expect(unpackSave(slot).world.seed).toBe(g.world.seed);
      await settle();
      const card = cards()[0];
      expect(card.getAttribute('role')).toBe('alertdialog');
      expect(text(card.querySelector('h2'))).toBe(W.errorTitle);
      expect(text(card.querySelector('.v91-error-body'))).toBe(`${W.paused} ${W.taintedSaved}`);
      expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual([W.reloadSave, W.exportCity, W.copyDetails]);
      expect(text(card.querySelector('.v91-act'))).toContain(W.reloadSaveWhy);   // the consequence is said before the tap
      card.querySelector('.v91-reload').click();
      expect(r.calls.reload).toBe(1);
    } finally { r.cleanup(); }
  });
  it('a city never saved says so and offers a plain Reload', async () => {
    const r = await rig();
    try {
      const g = r.start({ save: false });
      g.world.speed = 1;
      const gate = armTick(g.world);
      frames(g.loop, [0, 250, 500, 750]);
      gate.armed = true;
      g.loop.tick(1000);
      await settle();
      const card = cards()[0];
      expect(text(card.querySelector('.v91-error-body'))).toBe(`${W.paused} ${W.taintedNone}`);
      expect(card.querySelector('.v91-reload').textContent).toBe(W.reloadNone);
    } finally { r.cleanup(); }
  });
  it('the lesson\'s city is never saved: the card says so, offers Reload and no Export', async () => {
    const r = await rig();
    try {
      r.api.hooks.lesson({ step: 0 });
      const g = r.api.game();
      expect(g.lesson).toBe(true);
      g.world.speed = 1;
      const gate = armTick(g.world);
      frames(g.loop, [0, 250, 500, 750]);
      gate.armed = true;
      g.loop.tick(1000);
      await settle();
      const card = cards()[0];
      expect(text(card.querySelector('.v91-error-body'))).toBe(`${W.paused} ${W.taintedLesson}`);
      expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual([W.reloadLesson, W.copyDetails]);
    } finally { r.cleanup(); }
  });
  it('Export this city downloads the tainted city as a file and still writes nothing to the slot', async () => {
    const r = await rig();
    try {
      const g = r.start();
      await settle();
      const slot = (await r.store.load()).text, saves = r.calls.saves;
      g.world.speed = 1;
      const gate = armTick(g.world);
      frames(g.loop, [0, 250, 500, 750]);
      gate.armed = true;
      g.loop.tick(1000);
      await settle();
      cards()[0].querySelector('.v91-export').click();
      await settle();
      expect(r.calls.download.length).toBe(1);
      expect(r.calls.saves).toBe(saves);
      expect((await r.store.load()).text).toBe(slot);
    } finally { r.cleanup(); }
  });
  it('the page\'s own animation frames: the loop stops within the frame that threw, and nothing repeats per frame afterwards (?crash=tick)', async () => {
    const r = await rig({ params: 'crash=tick', realRaf: true });
    try {
      const g = r.start();
      let draws = 0;
      const draw = g.ui.render;
      g.ui.render = (f) => { draws++; return draw(f); };
      g.world.speed = 3;
      await until(() => !g.loop.running);
      expect([g.loop.running, g.world.speed, cards().length, r.api.rescue.isTainted(g.world)]).toEqual([false, 0, 1, true]);
      const day = g.world.day, n = draws;
      await sleep(350);   // twenty frames of the page's own
      expect([g.world.day, draws, cards().length]).toEqual([day, n, 1]);
      expect(r.api.rescue.details()).toContain(W.crash('tick'));
      expect(r.api.rescue.details().includes('times)')).toBe(false);   // thrown once, reported once
    } finally { r.cleanup(); }
  });
});

describe('v91 r rescue: a throw in the draw (the city is sound)', () => {
  it('three frames in a row stop the loop, save the city now (not tainted) and show the card with Reload; a good frame between resets the count', async () => {
    const r = await rig();
    try {
      const g = r.start();
      await settle();
      const real = g.ui.render;
      let throwing = true;
      g.ui.render = (f) => { if (throwing) throw new Error('draw'); return real(f); };
      frames(g.loop, [0, 250]);
      throwing = false;
      frames(g.loop, [500]);
      throwing = true;
      frames(g.loop, [750, 1000]);
      expect([g.loop.running, cards().length]).toEqual([true, 0]);    // never three in a row
      const saves = r.calls.saves;
      frames(g.loop, [1250]);
      expect(RENDER_IN_A_ROW).toBe(3);
      expect([g.loop.running, g.world.speed, cards().length, r.api.rescue.isTainted(g.world)]).toEqual([false, 0, 1, false]);
      await settle();
      expect(r.calls.saves).toBe(saves + 1);                           // saved now
      const card = cards()[0];
      expect(text(card.querySelector('.v91-error-body'))).toBe(`${W.stopped} ${W.safeSaved}`);
      expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual([W.reloadSafe, W.exportCity, W.copyDetails]);
      await g.ui.autosave('hidden');
      expect(r.calls.saves).toBe(saves + 2);                           // autosave is not blocked
      expect((await loadSave(r.store)).state).toBe('ok');
    } finally { r.cleanup(); }
  });
  it('?crash=render throws three frames in a row and the card follows', async () => {
    const r = await rig({ params: 'crash=render' });
    try {
      const g = r.start();
      frames(g.loop, [0, 250]);
      expect(cards().length).toBe(0);
      frames(g.loop, [500]);
      expect([g.loop.running, cards().length]).toEqual([false, 1]);
      expect(r.api.rescue.details()).toContain(W.crash('render'));
    } finally { r.cleanup(); }
  });
});

describe('v91 r rescue: a throw in a handler or a promise (the city is sound)', () => {
  it('shows one toast, "That didn\'t work; your city is safe", and the game goes on; a later error adds only to the details', async () => {
    const r = await rig();
    try {
      const g = r.start();
      const shown = [];
      const show = g.ui.toasts.show;
      g.ui.toasts.show = (...a) => { shown.push(a[0]); return show.apply(g.ui.toasts, a); };
      fail(undefined, 'ResizeObserver loop completed with undelivered notifications.');
      expect(shown.length).toBe(0);
      fail(new Error('handler broke'));
      expect(shown).toEqual([W.uiFailed]);
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('late task') }));
      fail(new Error('handler broke'));
      expect(shown.length).toBe(1);
      expect([g.loop.running, cards().length]).toEqual([true, 0]);
      const d = r.api.rescue.details();
      expect(d).toContain('handler broke');
      expect(d).toContain('(2 times)');
      expect(d).toContain('late task');
    } finally { r.cleanup(); }
  });
  it('errors that keep coming (a storm within a second) stop the loop and show the card, the city saved', async () => {
    const r = await rig();
    try {
      const g = r.start();
      await settle();
      for (let i = 0; i < STORM_COUNT - 1; i++) fail(new Error('again'));
      expect(cards().length).toBe(0);
      fail(new Error('again'));
      expect([g.loop.running, cards().length]).toEqual([false, 1]);
      await settle();
      expect(text(cards()[0].querySelector('.v91-error-body'))).toBe(`${W.stopped} ${W.safeSaved}`);
    } finally { r.cleanup(); }
  });
  it('?crash=ui throws once from a timer: the toast, the game on', async () => {
    const r = await rig({ params: 'crash=ui' });
    try {
      const g = r.start();
      const shown = [];
      const show = g.ui.toasts.show;
      g.ui.toasts.show = (...a) => { shown.push(a[0]); return show.apply(g.ui.toasts, a); };
      await until(() => shown.length > 0, 2500);
      expect(shown).toEqual([W.uiFailed]);
      expect([g.loop.running, cards().length]).toEqual([true, 0]);
    } finally { r.cleanup(); }
  });
  it('no flag, no crash: nothing is armed, and only rescue.js reads the crash parameter', async () => {
    const r = await rig();
    try {
      const g = r.start();
      g.world.speed = 3;
      const gate = Object.getOwnPropertyDescriptor(g.world, 'buildings');
      expect('value' in gate).toBe(true);   // a plain property: no getter was put on the world
      frames(g.loop, [0, 250, 500, 750, 1000, 1250]);
      expect([g.loop.running, cards().length]).toEqual([true, 0]);
    } finally { r.cleanup(); }
    const files = ['/src/boot.js', '/src/ui/createUI.js', '/src/ui/v91/rescue.js', '/src/ui/v91/debtSheet.js', '/src/main.js'];
    const hits = [];
    for (const f of files) if ((await (await fetch(f)).text()).includes("'crash'")) hits.push(f);
    expect(hits).toEqual(['/src/ui/v91/rescue.js']);
  });
});

describe('v91 r rescue: one card a session, and the card itself', () => {
  async function taintedRig() {
    const r = await rig();
    const g = r.start();
    await settle();
    g.world.speed = 1;
    const gate = armTick(g.world);
    frames(g.loop, [0, 250, 500, 750]);
    gate.armed = true;
    g.loop.tick(1000);
    await settle();
    return { r, g };
  }
  it('a later tick or draw error, or a handler\'s, adds to the details and never a second card', async () => {
    const { r, g } = await taintedRig();
    try {
      expect(cards().length).toBe(1);
      r.api.rescue.loopError({ where: 'tick', error: new Error('second tick') });
      for (let i = 0; i < 4; i++) r.api.rescue.loopError({ where: 'render', error: new Error('second draw') });
      fail(new Error('second handler'));
      for (let i = 0; i < STORM_COUNT; i++) fail(new Error('storm'));
      expect(cards().length).toBe(1);
      const d = cards()[0].querySelector('.v91-details-text').textContent;
      for (const w of ['boom', 'second tick', 'second draw', 'second handler']) expect(d).toContain(w);
      expect(r.api.rescue.isTainted(g.world)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('Esc does nothing until the player chooses: the card stays and no sheet closes under it', async () => {
    const { r, g } = await taintedRig();
    try {
      g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
      expect(g.ui.store.get().sheet).toBeTruthy();
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      r.shell.root.dispatchEvent(esc);
      expect([esc.defaultPrevented, cards().length, Boolean(g.ui.store.get().sheet)]).toEqual([true, 1, true]);
    } finally { r.cleanup(); }
  });
  it('keyboard: focus starts on Reload, Tab and Shift+Tab stay inside the card, every button is 44 px and named, and the card sits at the screen\'s edge', async () => {
    const { r } = await taintedRig();
    try {
      const card = cards()[0], buttons = [...card.querySelectorAll('button')];
      expect(document.activeElement).toBe(buttons[0]);
      const tab = (shift) => card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }));
      const stops = [...buttons, card.querySelector('summary')];
      for (let i = 1; i < stops.length; i++) { tab(false); expect(document.activeElement).toBe(stops[i]); }
      tab(false);
      expect(document.activeElement).toBe(stops[0]);
      tab(true);
      expect(document.activeElement).toBe(stops[stops.length - 1]);
      for (const b of buttons) {
        const box = b.getBoundingClientRect();
        expect([b.textContent.length > 0, box.width >= 44, box.height >= 44]).toEqual([true, true, true]);
      }
      const css = getComputedStyle(card), box = card.getBoundingClientRect();
      expect([css.position, css.bottom, Math.abs(box.bottom - window.innerHeight) < 1]).toEqual(['fixed', '0px', true]);
    } finally { r.cleanup(); }
  });
  it('the page behind the card is inert while it shows, and a phone held sideways gets a side sheet at the right edge, not the map\'s middle', async () => {
    const { r } = await taintedRig();
    try {
      expect([r.shell.root.querySelector('#ui').inert, r.shell.root.querySelector('#map').inert]).toEqual([true, true]);
      document.body.dataset.layout = 'compact';
      const box = cards()[0].getBoundingClientRect(), css = getComputedStyle(cards()[0]);
      expect([css.top, css.right, Math.abs(box.right - window.innerWidth) < 1, box.width <= window.innerWidth * 0.55 + 1, box.height >= window.innerHeight - 1]).toEqual(['0px', '0px', true, true, true]);
    } finally { document.body.dataset.layout = 'portrait'; r.cleanup(); }
  });
  it('Copy the details puts the version, where, the device and the error on the clipboard, with no address or query, and says Copied', async () => {
    const { r } = await taintedRig();
    let got = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { got = t; } } });
    try {
      cards()[0].querySelector('.v91-copy').click();
      await settle();
      expect(got.split('\n')[0].startsWith(`Thebes ${APP_VERSION}`)).toBe(true);
      expect(got).toContain(`Where: ${W.where.tick}`);
      expect(got).toContain('Device: ');
      expect(got).toContain('Error: boom');
      expect(got.includes(location.origin) || got.includes('?')).toBe(false);
      expect(text(cards()[0].querySelector('.v91-status'))).toBe(W.copied);
    } finally { delete navigator.clipboard; r.cleanup(); }
  });
  it('before the game: an error at the title shows the card with Reload and Copy only', async () => {
    const r = await rig();
    try {
      expect(r.api.phase()).toBe('title');
      fail(new Error('title broke'));
      const card = cards()[0];
      expect(text(card.querySelector('.v91-error-body'))).toBe(W.idle);
      expect([...card.querySelectorAll('button')].map((b) => b.textContent)).toEqual([W.reloadNone, W.copyDetails]);
    } finally { r.cleanup(); }
  });
});

describe('v91 r rescue: the loading screen\'s end and the ready mark', () => {
  it('boot removes the loading screen once the title shows and sets the thebes-ready mark; an error while it is up goes to it, not a card', async () => {
    let done = 0;
    const said = [];
    window.__v91Loading = { active: () => true, done: () => { done++; }, fail: (m) => said.push(m) };
    performance.clearMarks('thebes-ready');
    const r = await rig();
    try {
      expect(r.api.phase()).toBe('title');
      expect(done).toBe(1);
      expect(performance.getEntriesByName('thebes-ready').length).toBe(1);
      fail(new Error('start broke'));
      expect(said).toEqual(['Error: start broke']);
      expect(cards().length).toBe(0);
      r.start();
      expect(done).toBe(2);                                              // a game starting calls it too (a development flag's game has no title)
      expect(performance.getEntriesByName('thebes-ready').length).toBe(1);   // the mark is set once
    } finally { delete window.__v91Loading; r.cleanup(); }
  });
  it('boot.js wires the pieces: the loop\'s onError, a good frame, the dev hook, the loading screen\'s end at the title and at a game, destroy', async () => {
    const b = await (await fetch('/src/boot.js')).text();
    for (const piece of ['onError: (e) => rescue.loopError(e)', 'rescue.frameOk()', 'rescue.attach(current)', 'rescue.destroy()']) expect([piece, b.includes(piece)]).toEqual([piece, true]);
    expect(b.split('rescue.loadingDone()').length).toBe(3);
  });
});
