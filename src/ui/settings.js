// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion,
// (early-game pass 3.1, 3.4) Help ('full' guide and tips, 'tips' only, 'off') and the tips seen on this device,
// and (spec 4.18) the difficulty the next new city starts at. Stored in localStorage when available; applied to
// the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';

export const HELP_LEVELS = ['full', 'tips', 'off'];
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [], difficulty: 'normal' };

const isBool = (v) => typeof v === 'boolean';
const VALID = {
  sound: isBool, vibration: isBool, leftHanded: isBool, keyboardShortcuts: isBool,
  textSize: (v) => [100, 125, 150].includes(v),
  reducedMotion: (v) => ['system', 'on', 'off'].includes(v),
  help: (v) => HELP_LEVELS.includes(v),
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  difficulty: (v) => DIFFICULTY_ORDER.includes(v),
};
// Lists are copied on the way in and out of storage, so no caller can change the defaults or the stored copy.
const copy = (v) => (Array.isArray(v) ? v.slice() : v);

// Reading the localStorage global itself throws when storage is blocked, so the default is resolved in a guard.
function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

export function createSettings({
  storage = defaultStorage(), key = 'thebes.settings',
  root = document.body, systemReducedMotion = prefersReducedMotion,
} = {}) {
  const subs = new Set();

  function load() {
    try {
      const raw = storage && storage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      const out = {};
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (obj && VALID[k](obj[k])) out[k] = copy(obj[k]);
      return out;
    } catch (e) { return {}; }
  }

  let value = { ...DEFAULT_SETTINGS, seenTips: DEFAULT_SETTINGS.seenTips.slice(), ...load() };

  function save() {
    try { if (storage) storage.setItem(key, JSON.stringify(value)); } catch (e) { /* full or blocked storage: the setting still applies this session */ }
  }

  const reducedMotion = () => (value.reducedMotion === 'system' ? Boolean(systemReducedMotion()) : value.reducedMotion === 'on');

  function apply() {
    root.dataset.textSize = String(value.textSize);
    root.dataset.hand = value.leftHanded ? 'left' : 'right';
    root.classList.toggle('reduce-motion', reducedMotion());
  }

  apply();
  return {
    get: () => value,
    set(patch) {
      const next = { ...value };
      for (const [k, v] of Object.entries(patch)) if (k in VALID && VALID[k](v)) next[k] = copy(v);
      value = next;
      save();
      apply();
      for (const fn of [...subs]) fn(value);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    reducedMotion,
    apply,
  };
}
