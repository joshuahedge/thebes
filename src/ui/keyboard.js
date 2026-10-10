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

export function createKeyboard({ target = window, settings = null, cam, cameraControl, actions = {} }) {
  const run = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };
  const pan = (dx, dy) => { if (cameraControl) cameraControl.cancel(); panBy(cam, dx, dy); };
  const onKey = (ev) => {
    if (isTyping(ev.target)) return;
    const name = matchKey(ev);
    if (!name) return;
    if (ev.repeat && !name.startsWith('pan')) return;                                  // held keys fire toggles once
    if (isActivatable(ev.target) && (name === 'confirm' || name === 'pause')) return;   // leave the button its Enter and Space
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
  return { detach() { target.removeEventListener('keydown', onKey); } };
}
