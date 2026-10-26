// A small city, a fake browser history, and a mounted copy of the real page shell for interface tests.
import { makeTestWorld, setRoad, addRaw, staffAll } from './testWorld.js';
import { fire } from './dom.js';
import { createCamera, tileToScreen } from '../../src/render/camera.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createUI } from '../../src/ui/createUI.js';

// uiWorld, already running as the interface starts. On a paused phone a tip fired at the start (the test city's problem
// marker) waits for Play in the one-tip slot (ruling 176) and would show ahead of the tip a test is after.
export function runningUiWorld() { const w = uiWorld(); w.speed = 1; return w; }

// Road along y = 10; huts north of it; services south of it. Fertile land is x < 8 (makeTestWorld's default).
export function uiWorld() {
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  addRaw(world, 'house', 12, 9, { tier: 1, residents: 4 });
  addRaw(world, 'house', 13, 9, { tier: 1, residents: 4 });
  addRaw(world, 'farm_grain', 2, 11);
  addRaw(world, 'granary', 6, 11);
  addRaw(world, 'bazaar', 9, 11);
  addRaw(world, 'well', 15, 11);
  addRaw(world, 'temple', 24, 11);
  staffAll(world);
  return world;
}

export function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    entries, listeners,
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
  };
}

let cssLoaded = null;
const BODY_KEYS = ['layout', 'mode', 'input', 'dock', 'hand', 'textSize'];

// The real shell from index.html, inside an off-screen box. The transform makes the box the containing
// block for the shell's position: fixed chrome, so the top bar, dock and sheets lay out inside it.
export async function mountShell(width = 390, height = 844) {
  if (!cssLoaded) {
    // Version 8.0: every stylesheet index.html links, in order, so the shell's layout is the page's (Version 8.1: read from index.html itself, so a track's new stylesheet needs no line here).
    cssLoaded = (async () => {
      const page = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
      for (const href of [...page.querySelectorAll('link[rel="stylesheet"]')].map((l) => new URL(l.getAttribute('href'), `${location.origin}/`).pathname)) {
        await new Promise((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet'; link.href = href; link.onload = resolve; link.onerror = reject;
          document.head.append(link);
        });
      }
    })();
  }
  await cssLoaded;
  const html = await (await fetch('/index.html')).text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  for (const n of parsed.querySelectorAll('script, noscript')) n.remove();
  const root = document.createElement('div');
  root.className = 'test-mount shell';
  root.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;transform:translateZ(0);overflow:hidden;`;
  root.innerHTML = parsed.body.innerHTML;
  document.body.append(root);
  return {
    root,
    cleanup() {
      root.remove();
      for (const k of BODY_KEYS) delete document.body.dataset[k];
      document.body.classList.remove('has-banner', 'has-overlay', 'panel-folded', 'reduce-motion', 'guide-on');
    },
  };
}

// A document stand-in for the visibility hook: the real document's hidden flag cannot be set from a test.
export function fakeDoc() {
  const listeners = [];
  return {
    hidden: false,
    addEventListener(type, fn) { if (type === 'visibilitychange') listeners.push(fn); },
    removeEventListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    fireVisibility() { for (const fn of [...listeners]) fn(); },
    get activeElement() { return document.activeElement; },
    get listenerCount() { return listeners.length; },
  };
}

// The whole interface on the mounted shell, with the window-facing parts injected: size, resize source,
// history, keyboard target and storage. `root` is document.body so the stylesheet's body[data-...] rules apply.
// `world` (default uiWorld()) and `settings` (default: the interface makes its own) can be handed in.
export async function rigUI({ width = 390, height = 844, hooks = {}, doc = fakeDoc(), welcome = null, sfx = null, clock = undefined, now = () => 0, world = uiWorld(), settings = null } = {}) {
  const shell = await mountShell(width, height);
  const canvas = shell.root.querySelector('#map');
  const cam = createCamera({ x: 12, y: 10, zoom: 1 });
  const renderer = createRenderer({ canvas, dpr: 1 });
  let size = { width, height };
  const resizeListeners = [];
  const history = fakeHistory();
  const ui = createUI({
    world, canvas, cam, renderer, root: document.body, getSize: () => size,
    subscribeResize: (fn) => { resizeListeners.push(fn); return () => resizeListeners.splice(resizeListeners.indexOf(fn), 1); },
    history, addListener: history.addListener, removeListener: history.removeListener,
    // Version 8.1: the layered tray (More) is off in the rig unless a test turns it on with hooks.flatTray = false; what is locked is hidden either way.
    keyTarget: shell.root, storage: { getItem: () => null, setItem: () => {} }, now, hooks: { flatTray: true, ...hooks }, doc, welcome, sfx, clock, settings,   // undefined clock: createUI's Date.now
  });
  const at = (x, y) => { const r = canvas.getBoundingClientRect(); return { clientX: r.left + x, clientY: r.top + y }; };
  const screenOf = (tx, ty) => { const [sx, sy] = tileToScreen(cam, size, tx, ty); return { x: sx, y: sy }; };
  // A tap on the centre of tile (tx, ty). Two touch taps on the same spot within 300 ms are a double tap
  // (zoom), so tests that tap one place twice pass type 'mouse'.
  const tap = (tx, ty, type = 'touch') => {
    const p = screenOf(tx + 0.5, ty + 0.5);
    fire(canvas, 'pointerdown', { ...at(p.x, p.y), pointerId: 9, pointerType: type, button: 0, buttons: 1 });
    fire(canvas, 'pointerup', { ...at(p.x, p.y), pointerId: 9, pointerType: type, button: 0, buttons: 0 });
  };
  const resize = (w, h) => { size = { width: w, height: h }; shell.root.style.width = `${w}px`; shell.root.style.height = `${h}px`; for (const fn of resizeListeners) fn(); };
  const frame = (t = 0) => ui.render({ timeDays: world.day, now: t });
  return {
    root: shell.root, world, canvas, cam, renderer, ui, store: ui.store, history, doc, at, screenOf, tap, resize, frame,
    cleanup() { ui.destroy(); shell.cleanup(); },
  };
}
