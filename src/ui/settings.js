// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts,
// (early-game pass 3.1, 3.4) Help ('full' guide and tips, 'tips' only, 'off') and the tips seen on this device,
// and (spec 4.18) the difficulty the next new city starts at. Stored in localStorage when available; applied to
// the document as data attributes and a class.
//
// Stage 4 (spec 5.4, 5.5, 4.1; rulings 216, 249, 262, 269): one Motion setting replaces Stage 3's reducedMotion and
// ambient: motion is 'system' (follow the device, read live: Gentle when the device asks for less motion, else Full),
// 'full', 'gentle' or 'still'; motionLevel() is the level in use ('full' | 'gentle' | 'still'), and reducedMotion() is
// kept for Stage 1-3 code as "anything but Full". A stored Stage 3 setting migrates once: reduced motion 'on' or ambient
// off -> 'still'; else reduced motion 'off' -> 'full'; else 'system'. set() still accepts the two old keys with the same
// mapping (Stage 1-3 tests and scenes write them); get() has only the Stage 4 keys (Track E retired its read-only mirrors).
// A change of the device's own setting moves the level at once and tells every subscriber, as set() does, so the Settings
// row's words and anything else that reads the level follow it (spec 5.4). music (on by default) and musicVolume (0-100
// in tens, 30 by default) are separate from sound; cardsSeen is the device's "picture cards seen or skipped" flag.
//
// Version 8.0 (Track U, ruling 1147, Josh's call): every player gets full motion. The Motion row is gone from Options, the game no longer reads the
// phone's Reduce motion (systemReducedMotion defaults to "never asks" and nothing watches the device, unless the test rig sets window.__thebesRigDevice), and a
// Motion level left in a device's storage by 7.x is not read back (only a blob marked motionRig: true is, the tests' own), so nobody is stuck on Gentle or Still with
// no row to change it. What stays is the test rig's switch: that flag, createSettings' systemReducedMotion and watchSystem arguments, and set({ motion })
// (window.__thebes.setMotion), which move the level for this session only.
import { prefersReducedMotion } from '../render/effects.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';

export const HELP_LEVELS = ['full', 'tips', 'off'];
// Stage 3 (spec 4.3, 6.3): what a fire no staffed firehouse reaches does to the speed after the city's first one:
// 'pause', 'goto' (1x and the camera goes there) or 'inform' (1x and the banner).
export const FIRE_REACTIONS = ['pause', 'goto', 'inform'];
export const MOTION_SETTINGS = ['system', 'full', 'gentle', 'still'];
export const MOTION_LEVELS = ['full', 'gentle', 'still'];
export const MUSIC_VOLUMES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
// Version 6.0 (Track D1, ruling 746): sound is on by default (the title's Play with sound is gone; Settings mutes it). A device that stored a choice keeps it.
// Version 10.0 (Track D, ruling 2120): textSize null is "Auto": no choice made, so the desktop default by width and pointer applies (uiScaleDefault).
export const DEFAULT_SETTINGS = {
  sound: true, vibration: true, textSize: null, leftHanded: false, keyboardShortcuts: true, help: 'full', seenTips: [], difficulty: 'normal',
  fireReaction: 'inform', motion: 'system', music: true, musicVolume: 30, cardsSeen: false,
  adviceSeen: [],   // Version 5.0: the keys of the City advice items shown when its sheet was last open (the button's dot, src/ui/adviceSheet.js)
  roadMode: 'straight',   // Version 5.0 (Task 5): the road bar's shape, 'straight' (the L and the finger) or 'route' (the cheapest way between two points); per device
  // Version 6.0 (Track 0 seam, Track D2 owns them; ruling 626): the lesson is the device's, never a city's. lessonDone: it has ended ("Your first city
  // stands"); lessonStep: the step reached (0 before it starts), for a lesson left part-way. src/ui/lesson.js lessonDue reads them.
  lessonDone: false, lessonStep: 0,
  // Version 9.1 (fix wave, ruling 1735): the records id of the city the lesson's hand-over made the player's own ('' on a device that never adopted one), so the
  // new-city card does not count it as a city the player started (firstCityLayout).
  lessonCityId: '',
  // Version 7.0 (Track 0 seam, Track S owns them): dayNight, the Settings switch "Day and night" (on: the six-minute light loop, unless Motion is
  // Still); effectsVolume, the effects' volume beside musicVolume (MUSIC_VOLUMES steps; 100 is today's loudness), both under the Sound master.
  dayNight: true, effectsVolume: 100,
  // Version 8.0 (Track U, ruling 1147): the test rig's mark. A stored Motion level is read back only from a blob that also says motionRig: true (the tests' and shot tools'
  // pre-seeded storage); the game never writes it true, so a Motion choice 7.x left on a device is ignored and everyone moves in full.
  motionRig: false,
  // Version 10.0 (final review D-2, ruling 2322): true once a stored 9.x textSize of 100 has been turned into Auto (and from the first time the player picks a size), so a later pick of 100 is kept.
  textSizeAutoOffered: false,
};

const isBool = (v) => typeof v === 'boolean';
const VALID = {
  sound: isBool, vibration: isBool, leftHanded: isBool, keyboardShortcuts: isBool,
  textSize: (v) => v === null || [100, 125, 150, 200].includes(v),   // Version 9.2 (Track A, ruling 1828): 200% is the fourth step; Version 10.0: null is Auto
  help: (v) => HELP_LEVELS.includes(v),
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  adviceSeen: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  roadMode: (v) => v === 'straight' || v === 'route',
  lessonDone: isBool,
  lessonStep: (v) => Number.isInteger(v) && v >= 0,
  lessonCityId: (v) => typeof v === 'string' && v.length <= 64,
  difficulty: (v) => DIFFICULTY_ORDER.includes(v),
  fireReaction: (v) => FIRE_REACTIONS.includes(v),
  motion: (v) => MOTION_SETTINGS.includes(v),
  music: isBool,
  musicVolume: (v) => MUSIC_VOLUMES.includes(v),
  cardsSeen: isBool,
  dayNight: isBool,
  effectsVolume: (v) => MUSIC_VOLUMES.includes(v),
  motionRig: isBool,
  textSizeAutoOffered: isBool,
};
// Lists are copied on the way in and out of storage, so no caller can change the defaults or the stored copy.
const copy = (v) => (Array.isArray(v) ? v.slice() : v);

// Version 10.0 (Track D, ruling 2120): the text size a desktop gets when its player has made no choice. Only a pointer-primary device (a fine pointer and no coarse one
// anywhere) is scaled: 1.25 from 1600 px wide, 1.5 from 2200; a phone or tablet (any coarse pointer) and a narrower window stay at 1, so the phone layouts never change.
export function uiScaleDefault({ width = 0, finePointer = false, coarsePointer = false } = {}) {
  if (!finePointer || coarsePointer) return 1;
  return width >= 2200 ? 1.5 : width >= 1600 ? 1.25 : 1;
}
// The text size (100, 125, 150 or 200) in use: the player's choice, else the Auto size for env ({ width, finePointer, coarsePointer }; no env is no Auto: 100).
export const effectiveTextSize = (value, env = null) => (value === null || value === undefined ? (env ? Math.round(uiScaleDefault(env) * 100) : 100) : value);

// The window's own env: its width and what pointers the device has. boot.js hands it to createSettings; tests inject their own.
export function windowEnv(win = typeof window !== 'undefined' ? window : null) {
  const q = (s) => { try { return Boolean(win && typeof win.matchMedia === 'function' && win.matchMedia(s).matches); } catch (e) { return false; } };
  return { width: (win && win.innerWidth) || 0, finePointer: q('(pointer: fine)'), coarsePointer: q('(any-pointer: coarse)') };
}
// Calls cb when the window is resized; returns the unwatch. (Ruling 2121: nothing listened for a resize before, since a text size never depended on the width.)
export function watchWindowSize(cb, win = typeof window !== 'undefined' ? window : null) {
  if (!win || typeof win.addEventListener !== 'function') return () => {};
  win.addEventListener('resize', cb);
  return () => win.removeEventListener('resize', cb);
}

// Stage 3's two motion settings as Stage 4's one (ruling 249), or null when neither says anything.
export function motionFromLegacy({ reducedMotion, ambient } = {}) {
  if (reducedMotion === 'on' || ambient === false) return 'still';
  if (reducedMotion === 'off') return 'full';
  if (reducedMotion === 'system') return 'system';
  return null;
}

// The level a Motion setting gives: 'system' follows the device (Gentle when it asks for less motion, ruling 216).
export const motionLevelOf = (motion, deviceAsks) => (motion === 'system' ? (deviceAsks ? 'gentle' : 'full') : motion);

// What the Settings sheet's Motion row says (spec 5.4): the setting, the level it gives, whether it follows the device,
// and whether the device asks for less motion (known only while following it: that is when it decides the level).
export function motionStatus(settings) {
  const setting = settings.get().motion, level = settings.motionLevel();
  return { setting, level, device: setting === 'system', asks: setting === 'system' && level === 'gentle' };
}

// The one-time Gentle tip (ruling 218) is due while the city follows a device that asks for less motion; a player who
// chose a level needs no telling. A stand-in settings object without motionLevel (a Stage 1-3 test's) never asks.
export const gentleTipDue = (settings) => typeof settings.motionLevel === 'function' && motionStatus(settings).asks;

// Reading the localStorage global itself throws when storage is blocked, so the default is resolved in a guard.
function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

// The game's answer to "does the device ask for less motion": never (Version 8.0). The test rig is the one exception: the test page and the screenshot tool set
// window.__thebesRigDevice = true before the game loads, and the stand-in then follows the browser's own Reduce motion as 7.x did (headless Edge asks for less,
// so the rig runs under Gentle, which every existing test and shot expects). A player's page never sets it.
const rigFollowsDevice = () => typeof window !== 'undefined' && window.__thebesRigDevice === true;
const deviceAsks = () => rigFollowsDevice() && prefersReducedMotion();
// Calls cb whenever the browser's reduced-motion preference changes (the rig only); returns the unwatch.
function watchDevice(cb) {
  if (!rigFollowsDevice()) return () => {};
  try {
    const q = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (!q) return () => {};
    if (q.addEventListener) { q.addEventListener('change', cb); return () => q.removeEventListener('change', cb); }
    if (q.addListener) { q.addListener(cb); return () => q.removeListener(cb); }
  } catch (e) { /* not offered */ }
  return () => {};
}

// systemReducedMotion() and watchSystem(cb) -> unwatch: the test rig's stand-in for the device's preference, so root's data-motion and
// reduce-motion follow it at once under 'system' (spec 5.4); tests inject both. destroy() stops the watch.
export function createSettings({
  storage = defaultStorage(), key = 'thebes.settings',
  root = document.body, systemReducedMotion = deviceAsks, watchSystem = watchDevice,
  env = null, watchEnv = (cb) => watchWindowSize(cb),   // Version 10.0 (Track D): env() -> { width, finePointer, coarsePointer } gives Auto its size (null: Auto is 100%); watchEnv(cb) -> unwatch calls cb when the width may have changed
} = {}) {
  const subs = new Set();

  function load() {
    try {
      const raw = storage && storage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      const out = {};
      const rig = Boolean(obj) && obj.motionRig === true;   // Version 8.0: a stored Motion choice is read back only from the test rig's blob
      for (const k of Object.keys(DEFAULT_SETTINGS)) if ((k !== 'motion' || rig) && obj && VALID[k](obj[k])) out[k] = copy(obj[k]);
      // Version 10.0 (ruling 2322): 9.x saved the whole object, so a stored 100 with no marker was the default and not a choice: it becomes Auto once, and the marker is written.
      if (obj && obj.textSize === 100 && obj.textSizeAutoOffered !== true) { out.textSize = null; out.textSizeAutoOffered = true; migratedTextSize = true; }
      return out;
    } catch (e) { return {}; }
  }

  let migratedTextSize = false;
  let value = { ...DEFAULT_SETTINGS, seenTips: DEFAULT_SETTINGS.seenTips.slice(), adviceSeen: DEFAULT_SETTINGS.adviceSeen.slice(), ...load() };

  function save() {
    try { if (storage) storage.setItem(key, JSON.stringify(value)); } catch (e) { /* full or blocked storage: the setting still applies this session */ }
  }

  if (migratedTextSize) save();   // the marker is written now, so the next load keeps whatever the player picks

  const motionLevel = () => motionLevelOf(value.motion, Boolean(systemReducedMotion()));
  const reducedMotion = () => motionLevel() !== 'full';

  // What get() hands out: the stored value with textSize the size in use (a number, as every reader expects) and textSizeChoice the player's choice (null = Auto).
  let shown = null;
  // Version 10.0 (final review D-3, ruling 2324): env() reads the window (two matchMedia calls), so it is read once here and again only when the window may have changed (watchEnv's callback, set()).
  const readEnv = () => (typeof env === 'function' ? env() : null);
  let envNow = readEnv();
  const size = () => effectiveTextSize(value.textSize, envNow);
  // textSizeChoice is not enumerable, so the object has exactly the keys DEFAULT_SETTINGS has.
  const make = () => Object.defineProperty({ ...value, textSize: size() }, 'textSizeChoice', { value: value.textSize, enumerable: false });
  const view = () => (shown && shown.textSize === size() && shown.stored === value ? shown.out : (shown = { stored: value, textSize: size(), out: make() }).out);

  function apply() {
    root.dataset.textSize = String(size());
    root.dataset.hand = value.leftHanded ? 'left' : 'right';
    root.dataset.motion = motionLevel();
    root.classList.toggle('reduce-motion', reducedMotion());
  }

  const notify = () => { for (const fn of [...subs]) fn(view()); };
  apply();
  // A resize that moves Auto's size (the window crossed 1600 or 2200 px) re-applies it and tells every subscriber, as set() does; a choice never moves.
  let lastSize = size();
  let unwatchEnv = (typeof env === 'function' && typeof watchEnv === 'function' && watchEnv(() => { envNow = readEnv(); const n = size(); if (n === lastSize) return; lastSize = n; apply(); notify(); })) || null;
  // The device's own setting changed: under 'system' the level moves at once (spec 5.4), so the root and every
  // subscriber hear of it as they do of set().
  let unwatch = (typeof watchSystem === 'function' && watchSystem(() => { apply(); notify(); })) || null;
  return {
    get: view,
    autoTextSize: () => effectiveTextSize(null, envNow),   // what Auto gives now: the Options row's "Auto (125%)"
    set(patch) {
      const next = { ...value };
      for (const [k, v] of Object.entries(patch)) if (k in VALID && VALID[k](v)) next[k] = copy(v);
      if (!('motion' in patch)) { const m = motionFromLegacy(patch); if (m) next.motion = m; }
      if ('textSize' in patch && VALID.textSize(patch.textSize)) next.textSizeAutoOffered = true;   // a pick of any size (Auto too) is a choice made: a later load keeps a 100
      value = next;
      envNow = readEnv();
      save();
      lastSize = size();
      apply();
      notify();
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    motionLevel,
    reducedMotion,
    apply,
    destroy() { if (typeof unwatch === 'function') unwatch(); unwatch = null; if (typeof unwatchEnv === 'function') unwatchEnv(); unwatchEnv = null; },
  };
}
