// Version 10.0.1 (Track U, rulings 2343-2349): the keys as the player has set them. KEYS (src/data/ui.js) holds the defaults; settings.keyBindings holds the player's overrides,
// { action: [keys] }; effectiveKeys(overrides) is the map every reader uses (the keyboard, the badges, the Options rows). Pure: no DOM, no settings object.
import { KEYS } from '../../data/ui.js';

export const ACTIONS = Object.keys(KEYS);
// Actions that always keep Esc as well: it is what cancels a Change listen, so it cannot be given away.
const KEEPS_ESCAPE = new Set(['back']);
// Keys that can never be bound: they belong to the page (focus, the browser) or are only modifiers.
const NEVER = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Dead', 'Unidentified', 'Process', 'ContextMenu']);

const isLetter = (k) => typeof k === 'string' && k.length === 1 && k.toLowerCase() !== k.toUpperCase();

// A key's twin in the other case (letters are bound in both cases, as the defaults are), else the key alone.
export function withTwin(key) {
  if (!isLetter(key)) return [key];
  const lo = key.toLowerCase(), up = key.toUpperCase();
  return [lo, up];
}

// Whether a key list holds `key`: letters match in either case (the defaults list both; a tab or card slot holds one).
export const holds = (list, key) => list.some((k) => k === key || (k.length === 1 && key.length === 1 && k.toLowerCase() === key.toLowerCase()));
export const slotOf = (list, key) => list.findIndex((k) => k === key || (k.length === 1 && key.length === 1 && k.toLowerCase() === key.toLowerCase()));

export const bindable =(key) => typeof key === 'string' && key.length > 0 && !NEVER.has(key) && !/^F\d+$/.test(key);

const cleanList = (v) => (Array.isArray(v) && v.length && v.every((k) => typeof k === 'string' && k.length > 0) ? v.slice() : null);

// The map in effect: the defaults with each valid override laid over its action. Unknown actions are ignored; a bad list is ignored.
// Tab and card lists keep their length (a short list would leave later tabs without a key): a list of the wrong length is ignored.
export function effectiveKeys(overrides) {
  const out = {};
  for (const a of ACTIONS) out[a] = KEYS[a].slice();
  if (overrides && typeof overrides === 'object') {
    for (const a of ACTIONS) {
      if (!Object.prototype.hasOwnProperty.call(overrides, a)) continue;
      const list = cleanList(overrides[a]);
      if (!list) continue;
      if ((a === 'category' || a === 'card') && list.length !== KEYS[a].length) continue;
      out[a] = list;
    }
  }
  for (const a of KEEPS_ESCAPE) if (!out[a].includes('Escape')) out[a].push('Escape');
  return out;
}

// Which other action already holds `key`, for a change to `action` (null when none). The tab keys and the card keys share their digits by design (the tabs when no cards are open, the cards
// when they are), so those two never clash with each other.
// Returns { action, slot } (slot: the place in a tab or card list, else null) or null. Inside one list (tabs, cards) a key cannot sit in two slots either (slot = the one being set, skipped).
export function clashOf(map, action, key, slot = null) {
  const same = (a, b) => (a === 'category' && b === 'card') || (a === 'card' && b === 'category');
  const mine = withTwin(key);
  for (const a of ACTIONS) {
    if (same(a, action)) continue;
    if (a === action && !(a === 'category' || a === 'card')) continue;
    const at = map[a].findIndex((k, i) => !(a === action && i === slot) && mine.includes(k));
    if (at >= 0) return { action: a, slot: a === 'category' || a === 'card' ? at : null };
  }
  return null;
}

// The overrides after the player sets one action's keys (a whole list). When it equals the default the override is dropped, so the stored object stays only what differs.
export function withBinding(overrides, action, keys) {
  const next = { ...(overrides || {}) };
  const def = KEYS[action];
  if (keys.length === def.length && keys.every((k, i) => k === def[i])) delete next[action];
  else next[action] = keys.slice();
  return next;
}

// Rebinding one slot of the tab or card list (slot i), or a whole ordinary action to one key (and its other case).
export function rebind(overrides, action, key, slot = null) {
  const map = effectiveKeys(overrides);
  if (action === 'category' || action === 'card') {
    const list = map[action].slice();
    list[slot === null ? 0 : slot] = isLetter(key) ? key.toLowerCase() : key;
    return withBinding(overrides, action, list);
  }
  const keys = withTwin(key);
  if (KEEPS_ESCAPE.has(action)) keys.push('Escape');
  return withBinding(overrides, action, keys);
}

// A key as a player reads it.
const NAMES = { ' ': 'Space', Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
export const keyName = (k) => NAMES[k] || (k.length === 1 ? k.toUpperCase() : k);
export function keysText(list) {
  const seen = [];
  for (const k of list) { const n = keyName(k); if (!seen.includes(n)) seen.push(n); }
  return seen.join(' or ');
}
