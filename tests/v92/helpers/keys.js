// Version 9.2 wave 0: a keyboard rig for Track A and the final review. Each call dispatches a keydown on the focused element (or `from`), as
// tests/helpers/dom.js `key` does, and returns document.activeElement afterwards. The page's own handlers move focus; the browser's default Tab move
// does not happen on a synthetic event, so tab() moves it among the tabbable elements of `root` itself when nothing handled and prevented the event.
import { key } from '../../helpers/dom.js';

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const visible = (e) => e.getClientRects().length > 0;

export function press(k, { shift = false, from = document.activeElement || document.body } = {}) {
  const ev = key(from, k, { shiftKey: shift });
  return { event: ev, focused: document.activeElement };
}

export function tab({ shift = false, root = document } = {}) {
  const from = document.activeElement || document.body;
  const { event } = press('Tab', { shift, from });
  if (!event.defaultPrevented && document.activeElement === from) {
    const stops = [...root.querySelectorAll(TABBABLE)].filter(visible);
    if (stops.length) {
      const at = stops.indexOf(from);
      const next = shift ? stops[(at <= 0 ? stops.length : at) - 1] : stops[(at + 1) % stops.length];
      next.focus();
    }
  }
  return document.activeElement;
}

export const shiftTab = (opts = {}) => tab({ ...opts, shift: true });
export const enter = (opts = {}) => press('Enter', opts).focused;
export const space = (opts = {}) => press(' ', opts).focused;
export const escape = (opts = {}) => press('Escape', opts).focused;
