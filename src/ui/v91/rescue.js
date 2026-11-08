// Version 9.1 "First hours" (Track R, design 5a and 5b, rulings 1675-1680): the global error and unhandled-rejection handler, the error card, and the end of the
// loading screen. boot.js calls installRescue once, before the title shows, with its context: { win, doc, root, store, settings, records, io, hooks, game: () => the
// running game ({ world, ui, loop, cam, lesson }) or null }; it answers the pieces boot wires: loopError (the game loop's onError), frameOk (a frame drew), attach
// (a game started: the ?crash= dev hook), loadingDone (the title or a game is up) and destroy.
//
// Where it threw decides what is safe:
//   the sim (a day's tick): the city may be half changed. The loop stops, the game pauses, autosave and the hooks' save are blocked for this city, so the slot keeps the
//     last month's save and its backup, and the card offers Reload from the save, Export this city and Copy the details.
//   the render (three frames in a row, or errors coming in a storm): the city is sound, so it is saved now; the same card, with Reload.
//   anything else (a button's handler, a timer, a promise): one toast, "That didn't work; your city is safe", and the game goes on.
// One card a session: a later error only adds to its details. The card is a sheet at the screen's edge and Esc does nothing: the way out is Reload.
import { el, button } from '../components.js';
import { unpackSave } from '../../save/serialize.js';
import { APP_VERSION } from '../../data/ui.js';
import { readBuildStamp } from '../s46/whatsNew.js';
import { V91_R_TEXT as W } from '../text.js';

export const RENDER_IN_A_ROW = 3;      // render throws in a row that stop the loop
export const STORM_COUNT = 10;         // this many uncaught errors within STORM_MS are one failure that keeps coming: the loop stops and the card shows
export const STORM_MS = 1000;
const MAX_ERRORS = 10;                 // distinct errors the details keep
const MAX_LINE = 200;

// The details never carry the page's address, query or hash (a seed, a shared score), and no line is long.
export function cleanLine(s) {
  return String(s).replace(/\b(?:https?|file):\/\/[^\s/)]*/g, '').replace(/[?#][^\s):]*/g, '').slice(0, MAX_LINE);
}

// An error's first lines: its name and message, then the first three stack frames.
export function errorLines(err) {
  if (err && typeof err === 'object' && (err.message !== undefined || err.stack)) {
    const head = cleanLine(`${err.name || 'Error'}: ${err.message}`);
    const frames = String(err.stack || '').split('\n').map((l) => l.trim()).filter((l) => /^at |@/.test(l)).slice(0, 3).map(cleanLine);
    return [head, ...frames];
  }
  return [cleanLine(String(err))];
}

// What is not a failure of the game: the browser's own loop notice, a cancelled share or a blocked sound, a rejection with no reason, and the cross-origin "Script error." (no information).
export function ignorable(err, message = '') {
  const text = `${message} ${err && err.message ? err.message : ''}`;
  if (/ResizeObserver loop|^\s*Script error\.?\s*$/.test(text)) return true;
  if (err === undefined || err === null) return !message;
  return Boolean(err && (err.name === 'AbortError' || err.name === 'NotAllowedError'));
}

export function installRescue(ctx) {
  const { win, doc, root } = ctx;
  const params = ctx.params || new URLSearchParams((win && win.location && win.location.search) || '');   // boot's own (a test passes its own)
  const crash = params.get('crash');   // read once, here: the dev hook for tests and a real phone (design 5b); nothing else reads the URL
  const errors = [];                   // { where, lines, count }
  const stamps = [];
  const tainted = new WeakSet();       // worlds whose tick threw: never saved
  const listeners = [];
  let card = null, details = null, status = null, build = '', streak = 0, toastShown = false, crashDone = false, readyMarked = false, destroyed = false;

  const now = () => (win.performance && win.performance.now ? win.performance.now() : Date.now());
  const on = (type, fn) => { win.addEventListener(type, fn); listeners.push([win, type, fn, undefined]); };

  // ── the details ──
  function note(where, err) {
    const lines = errorLines(err), same = errors.find((e) => e.lines[0] === lines[0]);
    if (same) same.count += 1;
    else if (errors.length < MAX_ERRORS) errors.push({ where, lines, count: 1 });
    stamps.push(now());
    if (stamps.length > STORM_COUNT) stamps.shift();
    if (details) details.textContent = detailsText();
    return lines;
  }
  function detailsText() {
    const device = String((win.navigator && win.navigator.userAgent) || 'unknown').slice(0, 160);
    const list = errors.map((e) => `${e.count > 1 ? `(${e.count} times) ` : ''}${e.lines.join('\n  ')}`);
    return W.detailLines({ version: APP_VERSION, build, where: W.where[errors.length ? errors[0].where : 'idle'] || W.where.idle, device, errors: list }).join('\n');
  }
  const storming = () => stamps.length >= STORM_COUNT && stamps[stamps.length - 1] - stamps[0] <= STORM_MS;

  // ── what a failure does to the game ──
  function stopGame(game) {
    try { game.loop.stop(); } catch (e) { /* the loop is already gone */ }
    try { game.world.speed = 0; } catch (e) { /* a sealed world */ }
    try { game.ui.speedControl.render(); } catch (e) { /* the control is part of what broke */ }
  }
  function taint(game) {
    tainted.add(game.world);
    stopGame(game);
    try { game.ui.setAutosaveBlocked(true); } catch (e) { /* the hooks' save is blocked as well, below */ }
  }
  // Only the hooks' save is wrapped, so every path that writes the slot (autosave, Home, the update's Restart) refuses a tainted city; the update waits as it does for a failed save.
  const save = ctx.hooks && ctx.hooks.save;
  if (typeof save === 'function') {
    ctx.hooks.save = function rescueSave(...args) {
      const game = ctx.game();
      if (game && tainted.has(game.world)) return Promise.resolve(false);
      return save.apply(this, args);
    };
  }

  // ── the card ──
  async function slotState(game) {
    if (game.lesson) return 'lesson';
    try {
      const loaded = await ctx.store.load();
      if (!loaded) return 'none';
      unpackSave(loaded.text);
      return 'saved';
    } catch (e) { return 'none'; }
  }

  function showCard({ kind, game = null }) {
    if (card || destroyed) return;
    readBuildStamp().then((b) => { if (b) { build = b; if (details) details.textContent = detailsText(); } }).catch(() => {});
    const lesson = Boolean(game && game.lesson);
    const first = kind === 'idle' ? W.idle : kind === 'tainted' ? W.paused : W.stopped;
    const second = el('span', { class: 'v91-error-second', text: kind === 'idle' ? '' : W.checking });
    const body = el('p', { id: 'v91-error-body', class: 'v91-error-body' }, [el('span', { class: 'v91-error-first', text: first }), ' ', second]);
    const reload = button(W.reloadNone, { class: 'v91-reload primary', onClick: () => ctx.io.reload() });
    const reloadWhy = el('p', { class: 'v91-why small', text: W.reloadNoneWhy });
    const act = (btn, why) => el('div', { class: 'v91-act' }, [btn, why]);
    const acts = [act(reload, reloadWhy)];
    status = el('p', { class: 'v91-status small', role: 'status' });
    details = el('pre', { class: 'v91-details-text', text: detailsText() });
    const more = el('details', { class: 'v91-details' }, [el('summary', { text: W.detailsHead(errors.length || 1) }), details]);
    if (game && !lesson && ctx.hooks && typeof ctx.hooks.exportCity === 'function') {
      const exp = button(W.exportCity, { class: 'v91-export', onClick: async () => {
        status.textContent = '';
        try { await ctx.hooks.exportCity(); } catch (e) { status.textContent = W.exportFailed; }
      } });
      acts.push(act(exp, el('p', { class: 'v91-why small', text: W.exportWhy })));
    }
    const copy = button(W.copyDetails, { class: 'v91-copy', onClick: async () => {
      if (await copyText(detailsText())) status.textContent = W.copied;
      else { status.textContent = W.copyBy; more.open = true; selectAll(details); }
    } });
    acts.push(act(copy, el('p', { class: 'v91-why small', text: W.copyWhy })));
    card = el('div', { class: 'v91-error', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'v91-error-title', 'aria-describedby': 'v91-error-body' }, [
      el('h2', { id: 'v91-error-title', text: W.errorTitle }), body, el('div', { class: 'v91-actions' }, acts), status, more,
    ]);
    card.addEventListener('keydown', trap);
    (root || doc.body).append(card);
    behind(true);   // the card is aria-modal: the page behind it takes no tap, key or reader focus
    reload.focus();
    // What the slot holds, said once it is known: the card is up at once, with Reload working, whatever the storage does.
    if (kind === 'tainted') {
      slotState(game).then((s) => {
        if (!card) return;
        second.textContent = s === 'saved' ? W.taintedSaved : s === 'lesson' ? W.taintedLesson : W.taintedNone;
        reload.textContent = s === 'saved' ? W.reloadSave : s === 'lesson' ? W.reloadLesson : W.reloadNone;
        reloadWhy.textContent = s === 'saved' ? W.reloadSaveWhy : s === 'lesson' ? W.reloadLessonWhy : W.reloadNoneWhy;
      });
    } else if (kind === 'safe') {
      const done = (s) => {
        if (!card) return;
        second.textContent = s === 'saved' ? W.safeSaved : s === 'lesson' ? W.safeLesson : W.safeNotSaved;
        reload.textContent = s === 'saved' ? W.reloadSafe : s === 'lesson' ? W.reloadLesson : W.reloadNone;
        reloadWhy.textContent = s === 'saved' ? W.reloadSafeWhy : s === 'lesson' ? W.reloadLessonWhy : W.reloadNoneWhy;
      };
      if (lesson) done('lesson');
      else Promise.resolve().then(() => ctx.hooks.save('error')).then((ok) => done(ok ? 'saved' : 'none'), () => done('none'));
    }
  }
  function behind(on) {
    for (const id of ['ui', 'map']) { const n = (root || doc).querySelector ? (root || doc).querySelector('#' + id) : null; if (n) n.inert = on; }
  }
  // Tab stays inside the card; Esc does nothing until the player chooses (Reload leaves the page).
  function trap(e) {
    if (e.key !== 'Tab') return;
    const items = [...card.querySelectorAll('button, summary')];
    const at = items.indexOf(doc.activeElement);
    const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at < 0 || at === items.length - 1 ? 0 : at + 1);
    e.preventDefault();
    items[next].focus();
  }
  const swallowEsc = (e) => { if (card && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
  doc.addEventListener('keydown', swallowEsc, true);
  listeners.push([doc, 'keydown', swallowEsc, true]);

  async function copyText(text) {
    try {
      const nav = win.navigator;
      if (nav && nav.clipboard && nav.clipboard.writeText) { await nav.clipboard.writeText(text); return true; }
    } catch (e) { /* the old way, next */ }
    try {
      const area = el('textarea', { 'aria-hidden': 'true', readonly: true, style: { position: 'fixed', left: '-9999px', top: '0' } });
      area.value = text;
      doc.body.append(area);
      area.select();
      const ok = doc.execCommand && doc.execCommand('copy');
      area.remove();
      return Boolean(ok);
    } catch (e) { return false; }
  }
  function selectAll(node) {
    try { const r = doc.createRange(); r.selectNodeContents(node); const s = win.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* the text is shown: it can be selected by hand */ }
  }

  // ── what the loop and the page report ──
  function loopError({ where, error }) {
    const game = ctx.game();
    note(where, error);
    if (!game) return;
    if (where === 'tick') { taint(game); showCard({ kind: 'tainted', game }); return; }
    streak += 1;
    if (streak < RENDER_IN_A_ROW) return;
    streak = 0;
    stopGame(game);
    showCard({ kind: 'safe', game });
  }
  const frameOk = () => { streak = 0; };

  function outside(where, err, message = '') {
    if (destroyed || ignorable(err, message)) return;
    const lines = note(where, err === undefined || err === null ? new Error(message) : err);
    const loading = win.__v91Loading;
    if (loading && loading.active && loading.active()) { loading.fail(lines[0]); return; }   // before the title: the loading screen says so, with Reload
    if (card) return;
    const game = ctx.game();
    if (!game) { showCard({ kind: 'idle' }); return; }
    if (storming()) { stopGame(game); showCard({ kind: 'safe', game }); return; }
    if (toastShown) return;
    toastShown = true;
    try { game.ui.toasts.show(W.uiFailed); } catch (e) { /* no toast: the details still hold it */ }
  }
  on('error', (ev) => { if (ev && ev.target && ev.target !== win && ev.target.tagName) return; outside('ui', ev.error, ev.message); });
  on('unhandledrejection', (ev) => outside('promise', ev.reason));

  // ── the dev hook (?crash=tick|render|ui): one failure of that kind, for the tests and for Josh's real phone ──
  function attach(game) {
    if (!crash || crashDone) return;
    crashDone = true;
    if (crash === 'tick') {
      // The first day's tick reads the buildings: the getter throws once, and only when a tick is the reader (the draw reads them too).
      const world = game.world, buildings = world.buildings;
      const plain = (value) => Object.defineProperty(world, 'buildings', { value, writable: true, configurable: true, enumerable: true });
      Object.defineProperty(world, 'buildings', { configurable: true, enumerable: true, get() {
        if (world.speed > 0 && /tickDay/.test(new Error().stack || '')) { plain(buildings); throw new Error(W.crash('tick')); }
        return buildings;
      }, set: plain });
    } else if (crash === 'render') {
      const ui = game.ui, draw = ui.render;
      let n = 0;
      ui.render = (f) => { if (n < RENDER_IN_A_ROW) { n += 1; throw new Error(W.crash('render')); } return draw(f); };
    } else if (crash === 'ui') {
      win.setTimeout(() => { throw new Error(W.crash('ui')); }, 1500);
    }
  }

  // The title (or a development flag's game) is up: the loading screen goes, and the page's ready mark is set for the profile (tools/profile.ps1 -Load waits for it).
  function loadingDone() {
    try { if (win.__v91Loading && win.__v91Loading.done) win.__v91Loading.done(); } catch (e) { /* the screen was never there */ }
    if (readyMarked) return;
    readyMarked = true;
    try { win.performance.mark('thebes-ready'); } catch (e) { /* no performance marks */ }
  }

  function destroy() {
    destroyed = true;
    for (const [target, type, fn, opts] of listeners) target.removeEventListener(type, fn, opts);
    listeners.length = 0;
    if (card) { behind(false); card.remove(); card = null; }
    if (typeof save === 'function' && ctx.hooks.save && ctx.hooks.save.name === 'rescueSave') ctx.hooks.save = save;
  }

  return { loopError, frameOk, attach, loadingDone, destroy, details: detailsText, isTainted: (world) => tainted.has(world), cardOpen: () => Boolean(card) };
}
