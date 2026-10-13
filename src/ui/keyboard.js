// Spec 6.7 shortcuts. Single-key shortcuts switch off while a text field has focus and can be turned off in
// settings (WCAG 2.1.4); Esc, Enter and Ctrl/Cmd+Z always work.
import { KEYS, PAN_STEP_PX } from '../data/ui.js';
import { panBy } from '../render/camera.js';

const ALWAYS = new Set(['back', 'confirm', 'undo']);

const isTyping = (node) => Boolean(node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable));

// A focused button (or link, or role=button) keeps its own Enter and Space, so a keyboard user can press a card.
const isActivatable = (node) => Boolean(node && (node.tagName === 'BUTTON' || (node.tagName === 'A' && node.hasAttribute('href'))
  || (node.getAttribute && node.getAttribute('role') === 'button')));

export function matchKey(ev, names = Object.keys(KEYS)) {
  if (ev.altKey) return null;
  const mod = Boolean(ev.ctrlKey || ev.metaKey);
  for (const name of names) {
    if (!KEYS[name].includes(ev.key)) continue;
    if (name === 'undo') { if (mod && !ev.shiftKey) return name; continue; }   // Ctrl+Shift+Z is redo, not undo
    return mod ? null : name;          // Ctrl+R, Cmd+M and friends stay the browser's
  }
  return null;
}

// hidden(): true while the interface is hidden (screenshot mode, spec 6.4); then only Esc (which brings it back) and the
// pan keys act, so nothing changes the city where the player cannot see it.
const WHILE_HIDDEN = new Set(['back', 'panLeft', 'panRight', 'panUp', 'panDown']);

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
export function createKeyboard({ target = window, settings = null, cam, cameraControl, actions = {}, hidden = () => false, pending = () => false }) {
  const run = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };
  const pan = (dx, dy) => { if (cameraControl) cameraControl.cancel(); panBy(cam, dx, dy); };
  const doc = target && target.ownerDocument ? target.ownerDocument : (typeof document !== 'undefined' ? document : null);
  const markedFine = noteKeyboard(doc, doc && doc.defaultView);
  const onKey = (ev) => {
    if (isTyping(ev.target)) return;
    const name = matchKey(ev);
    if (!name) return;
    if (ev.isTrusted && doc && doc.body && doc.body.dataset.keyboard !== 'used') doc.body.dataset.keyboard = 'used';
    if (hidden() && !WHILE_HIDDEN.has(name)) return;
    if (ev.repeat && !name.startsWith('pan')) return;                                  // held keys fire toggles once
    const placing = name === 'confirm' && pending(ev.target);                             // a placement waits: Enter lays it, whatever has focus
    if (isActivatable(ev.target) && (name === 'confirm' || name === 'pause') && !placing) return;   // leave the button its Enter and Space
    if (!ALWAYS.has(name) && settings && settings.get().keyboardShortcuts === false) return;
    switch (name) {
      case 'panLeft': pan(PAN_STEP_PX, 0); break;
      case 'panRight': pan(-PAN_STEP_PX, 0); break;
      case 'panUp': pan(0, PAN_STEP_PX); break;
      case 'panDown': pan(0, -PAN_STEP_PX); break;
      case 'category': run(actions.category, KEYS.category.indexOf(ev.key)); break;
      default: run(actions[name]); break;
    }
    ev.preventDefault();
  };
  target.addEventListener('keydown', onKey);
  return { detach() { target.removeEventListener('keydown', onKey); if (markedFine && doc.body.dataset.keyboard === 'fine') delete doc.body.dataset.keyboard; } };   // the mark this made goes with it (a real key press's 'used' stays)
}
