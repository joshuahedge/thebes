// Spec 6.7 shortcuts. Single-key shortcuts switch off while a text field has focus and can be turned off in
// settings (WCAG 2.1.4); Esc, Enter and Ctrl/Cmd+Z always work.
import { KEYS, PAN_STEP_PX, ZOOM_STEP } from '../data/ui.js';
import { panBy } from '../render/camera.js';
import { effectiveKeys, holds, slotOf } from './v1001/keymap.js';   // Version 10.0.1 (Track U, ruling 2347): the keys as the player set them

const ALWAYS = new Set(['back', 'confirm', 'undo']);

const isTyping = (node) => Boolean(node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable));

// Version 6.0 (Track D1, ruling 745): a control that needs a key for itself keeps it. Besides a text field, a slider, a spin button, a list, a tab, a
// radio, a menu and anything marked data-own-keys uses the arrows and the plus and minus keys to do its own job, so the map's keys leave them be.
const OWN_KEY_ROLES = new Set(['slider', 'spinbutton', 'textbox', 'searchbox', 'combobox', 'listbox', 'option', 'tablist', 'tab', 'radio', 'radiogroup',
  'menu', 'menuitem', 'menuitemradio', 'menuitemcheckbox', 'scrollbar', 'tree', 'treeitem', 'grid', 'gridcell']);
const hasOwnKeys = (node) => Boolean(node && node.getAttribute && (OWN_KEY_ROLES.has(node.getAttribute('role')) || (typeof node.closest === 'function' && node.closest('[data-own-keys], [role="slider"], [role="listbox"], [role="tablist"], [role="menu"], [role="radiogroup"]'))));
// A panel that scrolls (a sheet, the confirm dialog, the title card) keeps the arrow keys for its own scrolling while focus is inside it; W, A, S and D still move the map.
const SCROLLING_PANELS = '#sheet, #dialog, .confirm-dialog, .title-card, [data-scrolls]';
const inScrollingPanel = (node) => Boolean(node && typeof node.closest === 'function' && node.closest(SCROLLING_PANELS));

// A focused button (or link, or role=button) keeps its own Enter and Space, so a keyboard user can press a card; a summary opens and closes its details.
const isActivatable = (node) => Boolean(node && (node.tagName === 'BUTTON' || node.tagName === 'SUMMARY' || (node.tagName === 'A' && node.hasAttribute('href'))
  || (node.getAttribute && node.getAttribute('role') === 'button')));

// Version 10.0.1 (Track U, ruling 2347): `keys` is the map in effect (the defaults when none is given). matchKeys lists every action the key could be (the tab keys and the card keys
// share digits), matchKey the first.
export function matchKeys(ev, names = null, keys = KEYS) {
  if (ev.altKey) return [];
  const mod = Boolean(ev.ctrlKey || ev.metaKey);
  const out = [];
  for (const name of names || Object.keys(keys)) {
    if (!keys[name] || !holds(keys[name], ev.key)) continue;
    if (name === 'undo') { if (mod && !ev.shiftKey) out.push(name); continue; }   // Ctrl+Shift+Z is redo, not undo
    if (!mod) out.push(name);          // Ctrl+R, Cmd+M and friends stay the browser's
  }
  return out;
}
export function matchKey(ev, names = null, keys = KEYS) {
  const all = matchKeys(ev, names, keys);
  return all.length ? all[0] : null;
}

// hidden(): true while the interface is hidden (screenshot mode, spec 6.4); then only Esc (which brings it back) and the
// pan keys act, so nothing changes the city where the player cannot see it.
const WHILE_HIDDEN = new Set(['back', 'panLeft', 'panRight', 'panUp', 'panDown', 'zoomIn', 'zoomOut']);

// Stage 4.6 (ruling 400): body[data-keyboard] says there is a keyboard, so the confirm bar can show its key hint (css, s46 ux section).
// 'fine' = a mouse or trackpad is attached (media query), 'used' = a real key press was seen (a trusted event: a test's synthetic key
// presses never set it, so they leave nothing behind on the page). Quiet where there is no body (a bare test target).
const KEYBOARD_QUERY = '(any-pointer: fine) and (any-hover: hover)';
function noteKeyboard(doc, win) {
  const body = doc && doc.body;
  if (!body) return false;
  try { if (!body.dataset.keyboard && win && typeof win.matchMedia === 'function' && win.matchMedia(KEYBOARD_QUERY).matches) { body.dataset.keyboard = 'fine'; return true; } } catch (e) { /* no media queries here */ }
  return false;
}

// pending(target) (ruling 400): true while a placement waits for its Enter and the focused element should not keep that Enter. A
// focused card or corner button used to keep it (a click on the map leaves the card that started the tool focused), so Enter ran the
// card again and wiped the road just drawn instead of laying it.
// cardsOpen() (Version 10.0.1, Track U, ruling 2343): true while a tab's cards are open, so a card key picks that card instead of opening a tab.
export function createKeyboard({ target = window, settings = null, cam, cameraControl, actions = {}, hidden = () => false, pending = () => false, cardsOpen = () => false }) {
  const run = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };
  // Version 10.0 (Track F, ruling 2110): the pan holds the map in view; the view is twice the camera control's centre (a test's bare control gives none: the old clamp).
  const viewOf = () => { const c = cameraControl && typeof cameraControl.centre === 'function' ? cameraControl.centre() : null; return c ? { width: 2 * c.x, height: 2 * c.y } : null; };
  const pan = (dx, dy) => { if (cameraControl) cameraControl.cancel(); panBy(cam, dx, dy, viewOf()); };
  // Version 6.0 (Track D1): + and - zoom about the middle of the view, a step as the minimap's buttons do (the tween follows the Motion level).
  const zoom = (factor) => { if (cameraControl && typeof cameraControl.zoomStep === 'function') { const c = cameraControl.centre(); cameraControl.zoomStep(factor, c.x, c.y); } };
  const doc = target && target.ownerDocument ? target.ownerDocument : (typeof document !== 'undefined' ? document : null);
  const markedFine = noteKeyboard(doc, doc && doc.defaultView);
  const onKey = (ev) => {
    if (isTyping(ev.target)) return;
    const keys = effectiveKeys(settings && typeof settings.get === 'function' ? settings.get().keyBindings : null);
    const all = matchKeys(ev, null, keys);
    // Version 10.0.1 (Track U, ruling 2343): with a tab's cards open a card key picks its card; otherwise the tab key opens its tab. A key that is only a card key does nothing without cards.
    const name = all.includes('card') && cardsOpen() ? 'card' : (all.find((n) => n !== 'card') || null);
    if (!name) return;
    if (ev.isTrusted && doc && doc.body && doc.body.dataset.keyboard !== 'used') doc.body.dataset.keyboard = 'used';
    if (hidden() && !WHILE_HIDDEN.has(name)) return;
    // Version 6.0 (ruling 745): the keys that move the view leave a control that needs them (a slider's arrows, a list's) and a scrolling panel's arrows alone.
    const viewKey = name.startsWith('pan') || name.startsWith('zoom');
    if (viewKey && hasOwnKeys(ev.target)) return;
    if (name.startsWith('pan') && ev.key.startsWith('Arrow') && inScrollingPanel(ev.target)) return;
    if (name === 'remove' && hasOwnKeys(ev.target)) return;                              // Version 7.0 (Track P): a list or a slider may use Delete for itself
    if (ev.repeat && !viewKey) return;                                                  // held keys fire toggles once; the view keeps moving
    const placing = name === 'confirm' && pending(ev.target);                             // a placement waits: Enter lays it, whatever has focus
    if (isActivatable(ev.target) && (ev.key === ' ' || ev.key === 'Enter') && (name === 'confirm' || name === 'pause') && !placing) return;   // leave the button its Enter and Space (Version 10.0.1, ruling 2415: by the key, so a rebound P or C still works with a button focused)
    if (!ALWAYS.has(name) && settings && settings.get().keyboardShortcuts === false) return;
    switch (name) {
      case 'panLeft': pan(PAN_STEP_PX, 0); break;
      case 'panRight': pan(-PAN_STEP_PX, 0); break;
      case 'panUp': pan(0, PAN_STEP_PX); break;
      case 'panDown': pan(0, -PAN_STEP_PX); break;
      case 'zoomIn': zoom(ZOOM_STEP); break;
      case 'zoomOut': zoom(1 / ZOOM_STEP); break;
      case 'category': run(actions.category, slotOf(keys.category, ev.key)); break;
      case 'card': run(actions.card, slotOf(keys.card, ev.key)); break;
      default: run(actions[name]); break;
    }
    ev.preventDefault();
  };
  target.addEventListener('keydown', onKey);
  return { detach() { target.removeEventListener('keydown', onKey); if (markedFine && doc.body.dataset.keyboard === 'fine') delete doc.body.dataset.keyboard; } };   // the mark this made goes with it (a real key press's 'used' stays)
}
