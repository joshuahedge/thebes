// Version 8.1 "The vizier", Track T (rulings 1200-1219): Ipi, the king's scribe, who goes with the vizier to Thebes. One voice, warm and brief: never more than two
// short sentences at a time (tests/v81/t holds every line to it). The scribe speaks the lesson, the first-time moments, the rank-ups and the Advice sheet ("Ipi suggests").
//
// The contract (ruling 1201): say(text, { anchor, ms, onDone }) -> { close() }.
//  - One bubble at a time: a new say replaces the one showing (its onDone runs then).
//  - anchor: an element, and the bubble is pinned beside it (above it when there is room, else below), 16 px inside the screen's edges. No anchor: the bubble docks
//    under the top bar, in the guidance place (#under-bar, first), never over the middle of the map.
//  - ms: it fades by itself after that many milliseconds (default SAY_MS); 0 keeps it until it is closed or replaced.
//  - onDone runs once: when it fades, is replaced or is closed.
//  - Until the interface mounts the scribe (mountScribe(root)) say does nothing and returns a handle whose close does nothing.
// The bubble is a polite live region (role status), so a screen reader hears each line once; it never takes focus. portrait(px) is Ipi's drawn face (decoration).
import { el } from '../components.js';

export const SAY_MS = 2600;   // a line that fades by itself stays this long (design 3: "fades by itself after 2 to 3 seconds")
const FADE_MS = 240;          // the fade itself (css/v81-t.css .scribe-bubble.fading)
const GUTTER = 16;            // the bubble keeps this far inside the screen's edges
const SVG_NS = 'http://www.w3.org/2000/svg';

// Ipi's portrait, drawn in the game's own colours (the lapis, gold, turquoise and terracotta of the band, css/ui.css): a scribe in profile, facing right, in a black
// bob wig with a reed pen tucked behind it and a broad collar, on a lapis disc ringed in gold. Made to read at 48 px; px is its size on screen.
const PORTRAIT = [
  ['circle', { cx: 24, cy: 24, r: 22.5, fill: '#1C3768' }],
  ['path', { d: 'M7 48C8 40.5 14 36 24 36s16 4.5 17 12Z', fill: '#F3E7CB' }],                                                     // linen on the shoulders
  ['path', { d: 'M11.5 43.5C15 38.6 33 38.6 36.5 43.5', fill: 'none', stroke: '#3A9E96', 'stroke-width': 2.6 }],                // the broad collar: turquoise,
  ['path', { d: 'M9.5 46.8C14 40.8 34 40.8 38.5 46.8', fill: 'none', stroke: '#E2B13C', 'stroke-width': 2.4 }],                 // gold
  ['path', { d: 'M13.8 40.6C17.5 37.4 30.5 37.4 34.2 40.6', fill: 'none', stroke: '#B4502E', 'stroke-width': 1.6 }],            // and terracotta
  ['path', { d: 'M22 27.5h7.2v9.2c-2.4 1-4.8 1-7.2 0Z', fill: '#B86A3E' }],                                                      // the neck
  ['path', { d: 'M21 10.5C27 8.6 32.4 10.6 32.6 15.2L33.4 18.2 35.8 21.4 33.6 22.4 34 24.2 32.8 25.1 33.4 26.6 31.2 29.4C28 30.8 24.6 30.4 22.4 29.2Z', fill: '#B86A3E' }],   // the face in profile
  ['path', { d: 'M14.6 12.4C15.8 6.2 24.4 4.4 30.4 7.2 32.2 8.1 33 10.4 32.4 12.6L27.6 12.8C26.4 16 26.4 19.4 26.8 22.4L25.4 33.6 13.6 33.6C12.6 26 12.8 18.4 14.6 12.4Z', fill: '#2B1F0E' }],   // the wig
  ['path', { d: 'M29.6 6.4 23.2 20.6', fill: 'none', stroke: '#E2B13C', 'stroke-width': 1.5, 'stroke-linecap': 'round' }],     // the reed pen behind it
  ['path', { d: 'M28.2 17.2Q30.3 15.5 32.4 17.2 30.3 18.4 28.2 17.2Z', fill: '#FFF9EA' }],                                     // the eye,
  ['circle', { cx: 30.7, cy: 17.1, r: 0.95, fill: '#2B1F0E' }],
  ['path', { d: 'M28.4 17.3 26.4 18M28.6 15.4Q30.6 14.2 32.6 15.4', fill: 'none', stroke: '#2B1F0E', 'stroke-width': 0.9, 'stroke-linecap': 'round' }],   // its kohl line and brow
  ['circle', { cx: 24, cy: 24, r: 22.5, fill: 'none', stroke: '#E2B13C', 'stroke-width': 2.2 }],
];
export function portrait(px = 48) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 48 48'], ['width', String(px)], ['height', String(px)], ['class', 'scribe-portrait'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  const clip = document.createElementNS(SVG_NS, 'clipPath');
  const id = `ipi-clip-${portrait.n = (portrait.n || 0) + 1}`;
  clip.setAttribute('id', id);
  const disc = document.createElementNS(SVG_NS, 'circle');
  disc.setAttribute('cx', '24'); disc.setAttribute('cy', '24'); disc.setAttribute('r', '22.5');
  clip.append(disc);
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.append(clip);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('clip-path', `url(#${id})`);
  PORTRAIT.forEach(([tag, attrs], i) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    (i === PORTRAIT.length - 1 ? svg : g).append(n);   // the gold rim sits over the clip's edge
  });
  svg.append(defs, g);
  return svg;
}

// ── the bubble ──
let host = null;   // { root, doc, win, bubble, words, timer, fadeTimer, current }
const NOOP = Object.freeze({ close() {} });

// The interface mounts the scribe once a game's interface is made (src/ui/v60/lesson.js) and unmounts it as it goes; mounting again moves it to the new root.
export function mountScribe(root) {
  if (host && host.root === root) return;
  unmountScribe();
  const doc = root.ownerDocument || document, win = doc.defaultView || window;
  const words = el('span', { class: 'scribe-words' });
  const bubble = el('div', { class: 'scribe-bubble', role: 'status', 'aria-live': 'polite', hidden: true }, [portrait(36), words]);
  const under = root.querySelector('#under-bar');
  (under || root.querySelector('#ui') || root).prepend(bubble);
  host = { root, doc, win, bubble, words, timer: 0, fadeTimer: 0, current: null };
}
export function unmountScribe() {
  if (!host) return;
  finish(host.current);
  clearTimeout(host.timer); clearTimeout(host.fadeTimer);
  host.bubble.remove();
  host = null;
}

// Whether a line is showing now (the tests and the lesson read it).
export const speaking = () => Boolean(host && host.current);
export const bubbleOf = () => (host ? host.bubble : null);

function finish(entry) {
  if (!entry || entry.done) return;
  entry.done = true;
  if (typeof entry.onDone === 'function') { try { entry.onDone(); } catch (e) { console.warn('Thebes: a scribe line\'s onDone failed', e); } }
}

// Pins the bubble beside its anchor: above when the room above holds it, else below; left-aligned with the anchor, kept GUTTER px inside the screen.
// The screen is the interface's own box (#ui covers it: position fixed, inset 0; in the tests' shell, the shell), else the window; the bubble is fixed, so its offsets are
// measured from where left 0, top 0 puts it (a transformed ancestor moves that).
function pin(anchor) {
  const { bubble, win, root } = host;
  const r = anchor.getBoundingClientRect();
  const ui = root.querySelector('#ui'), u = ui ? ui.getBoundingClientRect() : null;
  const box = u && u.width > 0 && u.height > 0 ? u : { left: 0, top: 0, width: win.innerWidth, height: win.innerHeight };
  Object.assign(bubble.style, { left: '0px', top: '0px', maxWidth: `${Math.max(120, box.width - 2 * GUTTER)}px` });
  const b = bubble.getBoundingClientRect(), ox = b.left, oy = b.top;
  const room = r.top - box.top - b.height - 8 >= GUTTER;
  const top = room ? r.top - b.height - 8 : Math.min(box.top + box.height - b.height - GUTTER, r.bottom + 8);
  const left = Math.max(box.left + GUTTER, Math.min(box.left + box.width - b.width - GUTTER, r.left + r.width / 2 - b.width / 2));
  Object.assign(bubble.style, { left: `${Math.round(left - ox)}px`, top: `${Math.round(Math.max(box.top + GUTTER, top) - oy)}px` });
  bubble.dataset.side = room ? 'above' : 'below';
}

function hideNow() {
  const { bubble } = host;
  bubble.hidden = true;
  bubble.classList.remove('fading', 'pinned');
  bubble.removeAttribute('style');
  delete bubble.dataset.side;
}

export function say(text, { anchor = null, ms = SAY_MS, onDone = null } = {}) {
  if (!host || !text) return NOOP;
  const prev = host.current;
  clearTimeout(host.timer); clearTimeout(host.fadeTimer);
  const entry = { text, onDone, done: false };
  host.current = entry;
  finish(prev);
  const { bubble, words } = host;
  hideNow();
  words.textContent = text;
  bubble.hidden = false;
  const pinned = Boolean(anchor && anchor.isConnected);
  bubble.classList.toggle('pinned', pinned);
  if (pinned) pin(anchor);
  const close = () => {
    if (!host || host.current !== entry) return;
    clearTimeout(host.timer); clearTimeout(host.fadeTimer);
    host.current = null;
    hideNow();
    finish(entry);
  };
  if (ms > 0) {
    host.timer = setTimeout(() => {
      if (!host || host.current !== entry) return;
      bubble.classList.add('fading');
      host.fadeTimer = setTimeout(close, FADE_MS);
    }, ms);
  }
  return { close };
}

// Every line showing goes, at once (a card coming up: no bubble stays under it, as no toast does, ruling 1100).
export function hush() { if (host && host.current) { const e = host.current; host.current = null; clearTimeout(host.timer); clearTimeout(host.fadeTimer); hideNow(); finish(e); } }
