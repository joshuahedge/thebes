// Version 10.0.1 (Track U, rulings 2347-2349): Options > Keys. Every action in KEYS with its keys now; Change listens for the next key; a key another action holds is refused (the warning names
// that action, the new key is not taken, and the listen stays open for another); Reset to defaults. The choices live in settings.keyBindings (src/ui/settings.js); createKeyboard reads them.
import { el, button } from '../components.js';
import { V1001U_TEXT as K } from '../text.js';
import { ACTIONS, effectiveKeys, clashOf, rebind, bindable, keysText, keyName } from './keymap.js';

const isEmpty = (o) => !o || Object.keys(o).length === 0;

// Returns the rows for the Options sheet's Keys group (a note, one row per action, a Reset button, and a live warning line).
export function keysRows({ settings }) {
  const doc = typeof document !== 'undefined' ? document : null;
  let listening = null;       // { action, slot } while a Change waits for a key
  let off = null;             // removes the key listener
  const warning = el('p', { class: 'key-warning small', role: 'status', 'aria-live': 'polite', text: '' });
  const list = el('div', { class: 'key-rows' });
  const reset = button(K.reset, { class: 'keys-reset secondary', onClick: () => { stop(); settings.set({ keyBindings: {} }); warn(''); } });
  const note = el('p', { class: 'keys-note small muted', text: K.keysNote });

  const warn = (text) => { warning.textContent = text; };
  const idOf = (action, slot) => `${action}${slot === null || slot === undefined ? '' : `:${slot}`}`;

  function stop() {
    listening = null;
    if (off) { off(); off = null; }
    render();
  }

  function listen(action, slot) {
    if (off) { off(); off = null; }
    listening = { action, slot };
    warn('');
    const owner = (list.ownerDocument || doc);
    const onKey = (ev) => {
      if (!list.isConnected) { if (off) { off(); off = null; } listening = null; return; }   // the sheet has closed under a listen: never keep swallowing the game's keys
      // Version 10.0.1 (Track U, ruling 2413): Tab is never swallowed: it ends the listen and moves focus as it always does (the rows are drawn again once focus has moved, keeping it on whatever it reached).
      if (ev.key === 'Tab') { if (off) { off(); off = null; } listening = null; setTimeout(render, 0); return; }
      if (ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt' || ev.key === 'Meta') return;   // a modifier alone is not a key
      ev.preventDefault(); ev.stopPropagation(); if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      if (ev.repeat) return;
      if (ev.key === 'Escape') { warn(''); stop(); refocus(action, slot); return; }
      if (!bindable(ev.key)) { warn(K.refused(keyName(ev.key))); return; }
      const map = effectiveKeys(settings.get().keyBindings);
      const clash = clashOf(map, action, ev.key, slot);
      if (clash) { warn(K.clash(keyName(ev.key), clash.slot !== null ? K.slot(K.actions[clash.action], clash.slot + 1) : K.actions[clash.action])); return; }
      settings.set({ keyBindings: rebind(settings.get().keyBindings, action, ev.key, slot) });
      warn('');
      stop();
      refocus(action, slot);
    };
    owner.addEventListener('keydown', onKey, true);
    off = () => owner.removeEventListener('keydown', onKey, true);
    render();
    refocus(action, slot);
  }

  function refocus(action, slot) {
    const b = list.querySelector(`[data-key-id="${idOf(action, slot)}"]`);
    if (b && typeof b.focus === 'function') b.focus();
  }

  // One Change button: it names the action in its label, shows the key (or "Press a key…" while it listens), and starts the listen.
  const changer = (action, slot, text) => {
    const on = listening && listening.action === action && listening.slot === (slot === undefined ? null : slot);
    const name = slot === null ? K.actions[action] : K.slot(K.actions[action], slot + 1);
    const b = button(on ? K.listening : text, { class: `key-change${on ? ' listening' : ''}`, 'data-key-id': idOf(action, slot), 'aria-label': K.changeLabel(name), onClick: () => (on ? (warn(''), stop()) : listen(action, slot)) });
    b.addEventListener('blur', () => { if (on && listening && listening.action === action) setTimeout(() => { if (listening && !list.contains((list.ownerDocument || doc).activeElement)) stop(); }, 0); });
    return b;
  };

  function render() {
    const map = effectiveKeys(settings.get().keyBindings);
    const rows = ACTIONS.map((action) => {
      if (action === 'category' || action === 'card') {
        const slots = map[action].map((k, i) => changer(action, i, keyName(k)));
        return el('div', { class: `row key-row key-row-${action}` }, [el('span', { class: 'key-action', text: K.actions[action] }), el('span', { class: 'key-slots' }, slots)]);
      }
      return el('div', { class: `row key-row key-row-${action}` }, [el('span', { class: 'key-action', text: K.actions[action] }), el('span', { class: 'key-now', text: keysText(map[action]) || K.unbound }), changer(action, null, K.change)]);
    });
    const active = (list.ownerDocument || doc).activeElement, keep = active && list.contains(active) ? active.dataset.keyId : null;   // focus stays on the same button across a redraw
    while (list.firstChild) list.removeChild(list.firstChild);
    list.append(...rows);
    if (keep) { const again = list.querySelector(`[data-key-id="${keep}"]`); if (again && typeof again.focus === 'function') again.focus(); }
    reset.disabled = isEmpty(settings.get().keyBindings);
  }
  render();
  const unsub = settings.subscribe(() => { if (list.isConnected || !list.parentNode) render(); else { unsub(); if (off) off(); } });
  return [note, list, warning, reset];
}
