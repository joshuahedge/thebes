// Version 8.1 "The vizier", Track T (ruling 1200): the lesson's lock and dim. While a lesson step runs only its own controls stay live; everything else that can be
// dimmed is, and refuses taps, so the player can only do what the step teaches (design 7b, "Tutorial, made foolproof"). The map is never locked: it pans and zooms.
//
// The contract: lockTo(allowed, { root, onRefused }) and unlock(). A control that can be dimmed carries data-lock="<id>" (one id, or several separated by spaces): the
// top bar's stat-gold, stat-people, stat-mood, stat-date, stat-score, papyrus and speed (Track B); the build tray's tray-cat-<category> and tray-item-<type>, and
// layers, minimap and menu (Track D). A control none of whose ids is allowed gets data-locked and aria-disabled; css/v81-t.css dims it, and one capture listener on the
// document refuses a press, a click or Enter/Space on it or inside it, and calls onRefused(id, element). A control with no data-lock is never touched.
//
// Until Tracks B and D put data-lock on their controls, BRIDGE gives today's controls their ids (the same ids), so the lesson locks the 8.0 interface as it stands;
// an element that carries its own data-lock is read from that alone.
import { matchKey } from '../keyboard.js';
import { CATEGORIES, KEYS } from '../../data/ui.js';

const BRIDGE = [
  ['#dock .cat[data-category], #rail .cat[data-category], #panel .cat[data-category], .tab[data-category]', (n) => `tray-cat-${n.dataset.category}`],
  ['.card[data-item]', (n) => `tray-item-${n.dataset.item}`],
  ['#topbar .stats', () => 'stat-gold stat-people stat-mood stat-date stat-score'],
  ['#topbar .advice', () => 'papyrus'],
  ['.speed-bar, .speed-corner', () => 'speed'],
  ['#corners .overlay-button', () => 'layers'],
  ['#corners .minimap-button, #panel .minimap', () => 'minimap'],
  ['#topbar .menu', () => 'menu'],
];
const BRIDGED = 'data-lock-bridge';

let state = null;   // { root, doc, allowed: Set, onRefused, observer, onEvent }

export const lockIdsOf = (node) => (node.getAttribute('data-lock') || node.getAttribute(BRIDGED) || '').split(/\s+/).filter(Boolean);
export const isLocked = () => Boolean(state);
export const allowedNow = () => (state ? [...state.allowed] : null);

// Marks every lockable control: locked (none of its ids allowed) or not.
function apply() {
  if (!state) return;
  const { root } = state;
  if (state.observer) state.observer.disconnect();
  for (const [sel, idOf] of BRIDGE) for (const n of root.querySelectorAll(sel)) if (!n.hasAttribute('data-lock')) { const id = idOf(n); if (n.getAttribute(BRIDGED) !== id) n.setAttribute(BRIDGED, id); }
  for (const n of root.querySelectorAll('[data-lock], [data-lock-bridge]')) {
    const ids = lockIdsOf(n);
    const locked = ids.length > 0 && !ids.some((id) => state.allowed.has(id));
    if (locked && !n.hasAttribute('data-locked')) { n.setAttribute('data-locked', ''); n.setAttribute('aria-disabled', 'true'); }
    else if (!locked && n.hasAttribute('data-locked')) { n.removeAttribute('data-locked'); n.removeAttribute('aria-disabled'); }
  }
  if (state.observer) state.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lock', 'data-category', 'data-item'] });
}

// The locked control a press or key landed on, or null.
function lockedAt(target) {
  if (!state || !target || typeof target.closest !== 'function') return null;
  const n = target.closest('[data-locked]');
  return n && state.root.contains(n) ? n : null;
}

// The game's own keys that work a lockable control (src/data/ui.js KEYS): the category keys, the clock's, the minimap's and the layers'. The view's keys are never locked.
function keyLockId(ev) {
  const t = ev.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return null;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return null;
  const name = matchKey(ev);
  if (name === 'category') { const c = CATEGORIES[KEYS.category.indexOf(ev.key)]; return c ? `tray-cat-${c.id}` : null; }
  if (name === 'pause' || name === 'speedUp' || name === 'speedDown') return 'speed';
  if (name === 'minimap') return 'minimap';
  if (name === 'overlay') return 'layers';
  return null;
}
const allowedId = (id) => state.allowed.has(id);
const elementFor = (id) => [...state.root.querySelectorAll('[data-lock], [data-lock-bridge]')].find((n) => lockIdsOf(n).includes(id) && n.getClientRects().length > 0) || null;

function refuse(ev, id, n) {
  ev.preventDefault();
  ev.stopPropagation();
  if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  state.lastRefused = n; state.lastAt = Date.now();
  if (typeof state.onRefused === 'function') state.onRefused(id, n);
}

// A press on a dimmed control is stopped before the interface sees it (no drag, no tray scroll taken over: the browser's own scrolling is left alone); the click
// that follows says Ipi's line, once. Enter or Space on a dimmed control, and a game key for one, are refused the same way.
function onEvent(ev) {
  if (!state) return;
  if (ev.type === 'keydown') {
    if (ev.repeat) return;
    const n = lockedAt(ev.target);
    if (n && (ev.key === 'Enter' || ev.key === ' ')) { refuse(ev, lockIdsOf(n)[0] || '', n); return; }
    const id = keyLockId(ev);
    if (id && !allowedId(id) && (state.root.contains(ev.target) || ev.target === state.doc.body || ev.target === state.doc.documentElement || ev.target === state.doc.defaultView)) refuse(ev, id, elementFor(id));
    return;
  }
  const n = lockedAt(ev.target);
  if (!n) return;
  if (ev.type !== 'click') { ev.stopPropagation(); if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation(); return; }
  refuse(ev, lockIdsOf(n)[0] || '', n);
}
const EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];

// Locks the interface to `allowed` (control ids). Called again it changes what is allowed, keeping one listener.
export function lockTo(allowed = [], { root = document.body, onRefused = null } = {}) {
  if (state && state.root !== root) unlock();
  if (!state) {
    const doc = root.ownerDocument || document;
    state = { root, doc, allowed: new Set(), onRefused, observer: null, lastRefused: null, lastAt: 0 };
    const MO = (doc.defaultView || window).MutationObserver;
    if (typeof MO === 'function') state.observer = new MO(() => apply());
    for (const t of EVENTS) doc.addEventListener(t, onEvent, true);
  }
  state.allowed = new Set(allowed);
  if (onRefused) state.onRefused = onRefused;
  apply();
}

// Every mark goes, and the listener.
export function unlock() {
  if (!state) return;
  const { root, doc } = state;
  if (state.observer) state.observer.disconnect();
  for (const t of EVENTS) doc.removeEventListener(t, onEvent, true);
  for (const n of root.querySelectorAll('[data-locked]')) { n.removeAttribute('data-locked'); n.removeAttribute('aria-disabled'); }
  for (const n of root.querySelectorAll(`[${BRIDGED}]`)) n.removeAttribute(BRIDGED);
  state = null;
}
