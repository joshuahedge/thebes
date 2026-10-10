// The menu, settings, help and about sheets (spec 6.3) as custom renderers for sheets.js, plus the
// confirm dialog that store.confirmDialog drives (New city, undoing an occupied area).
import { KEYS, APP_VERSION } from '../data/ui.js';
import { openSheet } from './modes.js';
import { HELP_ROWS, T } from './text.js';
import { el, button, clear } from './components.js';

const KEY_NAMES = { ' ': 'Space', Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

export function keyLabel(name) {
  const seen = [];
  for (const k of KEYS[name] || []) {
    const label = KEY_NAMES[k] || (k.length === 1 ? k.toUpperCase() : k);
    if (!seen.includes(label)) seen.push(label);
  }
  return seen.join(' or ');
}

export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };

  function menu(body, { close }) {
    body.append(el('div', { class: 'menu-list' }, [
      button(T.continueGame, { class: 'primary', onClick: close }),
      button(T.newCity, { onClick: () => store.set({ confirmDialog: { text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity } }) }),
      button(T.exportCity, { onClick: hookOr('exportCity') }),
      button(T.importCity, { onClick: hookOr('importCity') }),
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { onClick: () => open('help') }),
      button(T.about, { onClick: () => open('about') }),
    ]));
  }

  function switchRow(label, key) {
    const state = el('span', { class: 'state small muted' });
    const b = el('button', { type: 'button', role: 'switch', class: `switch ${key}` }, [el('span', { text: label }), ' ', state]);
    const sync = () => { const on = Boolean(settings.get()[key]); b.setAttribute('aria-checked', String(on)); state.textContent = on ? T.on : T.off; };
    b.addEventListener('click', () => { settings.set({ [key]: !settings.get()[key] }); sync(); });
    sync();
    return el('div', { class: 'row' }, [b]);
  }

  function choiceRow(label, key, options) {
    const buttons = options.map(([value, text]) => button(text, { class: `choice ${key}`, dataset: { value: String(value) } }));
    const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(settings.get()[key] === options[i][0])));
    buttons.forEach((b, i) => b.addEventListener('click', () => { settings.set({ [key]: options[i][0] }); sync(); }));
    sync();
    return el('div', { class: 'row' }, [el('span', { text: label }), el('span', { class: 'choices', role: 'group', 'aria-label': label }, buttons)]);
  }

  function settingsSheet(body) {
    body.append(
      switchRow(T.sound, 'sound'), switchRow(T.vibration, 'vibration'),
      switchRow(T.keyboardShortcuts, 'keyboardShortcuts'), switchRow(T.leftHanded, 'leftHanded'),
      choiceRow(T.textSize, 'textSize', [[100, '100%'], [125, '125%'], [150, '150%']]),
      choiceRow(T.reducedMotion, 'reducedMotion', [['system', T.followSystem], ['on', T.on], ['off', T.off]]),
    );
  }

  function help(body) {
    body.append(el('p', { text: T.leaveMode }));
    body.append(el('h3', { text: T.shortcuts }));
    body.append(el('table', { class: 'shortcuts' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: T.keyHead }), el('th', { text: T.doesHead })])]),
      el('tbody', {}, HELP_ROWS.map(([name, text, keys]) => el('tr', {}, [el('td', {}, [el('kbd', { text: keys || keyLabel(name) })]), el('td', { text })]))),
    ]));
    body.append(el('p', { class: 'small muted', text: T.shortcutsOff }));
    body.append(el('h3', { text: T.gestures }), el('p', { text: T.gesturesHelp }));
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsLater }));
  }

  function about(body) {
    body.append(el('h3', { text: 'Thebes' }), el('p', { text: `${T.version} ${version}` }), el('p', { text: T.aboutText }));
  }

  return { menu, settings: settingsSheet, help, about };
}

// The confirm dialog: store.confirmDialog = { text, confirmLabel, onConfirm } shows it; null hides it.
// Cancel gets focus so a stray Enter never confirms; Esc reaches it through modes.back.
export function createDialog({ container, store }) {
  function render() {
    const d = store.get().confirmDialog;
    clear(container);
    if (!d) { container.hidden = true; return; }
    const cancel = button(T.cancel, { class: 'cancel', onClick: () => store.set({ confirmDialog: null }) });
    const ok = button(d.confirmLabel || T.confirm, { class: 'ok danger', onClick: () => { store.set({ confirmDialog: null }); d.onConfirm(); } });
    container.append(el('div', { class: 'box', role: 'document' }, [el('p', { text: d.text }), el('div', { class: 'buttons' }, [cancel, ok])]));
    container.hidden = false;
    cancel.focus();
  }
  render();
  store.subscribe(render);
  return { render };
}
