// The menu, settings, help and about sheets (spec 6.3) as custom renderers for sheets.js, plus the
// confirm dialog that store.confirmDialog drives (New city, undoing an occupied area).
import { KEYS, APP_VERSION } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { TIPS } from '../data/tips.js';
import { openSheet } from './modes.js';
import { FIRE_REACTIONS } from './settings.js';
import { HELP_ROWS, HELP_NAMES, TIP_TEXT, DIFFICULTY_NAMES, T, DANGER_UI_TEXT } from './text.js';
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

// canResumeGuide / onResumeGuide come from createUI: How to play offers "Resume guide" while the guide is off
// and one of its steps is open, under Help: Guide and tips only (early-game pass 3.2).
// onScreenshot (Stage 3, spec 6.3): the menu's Screenshot mode; createUI enters the mode.
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION, canResumeGuide = () => false, onResumeGuide = () => {}, onScreenshot = null }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };

  function menu(body, { close }) {
    body.append(el('div', { class: 'menu-list' }, [
      button(T.continueGame, { class: 'primary', onClick: close }),
      button(T.newCity, { onClick: () => store.set({ confirmDialog: {
        text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity,
        extraLabel: typeof hooks.exportCity === 'function' ? T.exportFirst : null, onExtra: hookOr('exportCity'),
      } }) }),
      button(T.exportCity, { onClick: hookOr('exportCity') }),
      button(T.importCity, { onClick: hookOr('importCity') }),
      typeof hooks.install === 'function' && (typeof hooks.canInstall !== 'function' || hooks.canInstall()) ? button(T.installMenu, { class: 'install', onClick: () => hooks.install() }) : null,
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { onClick: () => open('help') }),
      typeof onScreenshot === 'function' ? button(T.screenshotMode, { class: 'screenshot-mode', onClick: onScreenshot }) : null,
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

  // Stage 3 (Track D, spec 5.6): Ambient motion is Off while reduced motion is on (createUI's ambient layer runs only when
  // both allow it), so the switch shows Off, is disabled and says why; the reduced-motion choices re-sync it.
  function ambientRow() {
    const D = DANGER_UI_TEXT;
    const r = switchRow(D.ambient, 'ambient');
    const b = r.querySelector('button'), state = b.querySelector('.state');
    const note = el('p', { class: 'ambient-note small muted', text: D.ambientReduced });
    const sync = () => {
      const reduced = settings.reducedMotion();
      b.disabled = reduced;
      note.hidden = !reduced;
      const on = !reduced && Boolean(settings.get().ambient);
      b.setAttribute('aria-checked', String(on));
      state.textContent = on ? T.on : T.off;
    };
    b.addEventListener('click', sync);
    sync();
    return { row: el('div', {}, [r, note]), sync };
  }

  function settingsSheet(body) {
    const D = DANGER_UI_TEXT;
    const ambient = ambientRow();
    const motion = choiceRow(T.reducedMotion, 'reducedMotion', [['system', T.followSystem], ['on', T.on], ['off', T.off]]);
    for (const c of motion.querySelectorAll('button')) c.addEventListener('click', ambient.sync);
    body.append(
      switchRow(T.sound, 'sound'), switchRow(T.vibration, 'vibration'),
      switchRow(T.keyboardShortcuts, 'keyboardShortcuts'), switchRow(T.leftHanded, 'leftHanded'),
      choiceRow(T.textSize, 'textSize', [[100, '100%'], [125, '125%'], [150, '150%']]),
      motion,
      // Spec 4.3: what a fire no staffed firehouse reaches does to the speed, after the city's first (which always pauses).
      choiceRow(D.onAFire, 'fireReaction', FIRE_REACTIONS.map((k) => [k, D.fireReactions[k]])),
      el('p', { class: 'fire-note small muted', text: D.onAFireNote }),
      ambient.row,
      choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]]),
      // Spec 4.18: the level the next new city starts at; the city being played keeps its own (the summary names it).
      choiceRow(T.difficultyForNewCities, 'difficulty', DIFFICULTY_ORDER.map((d) => [d, DIFFICULTY_NAMES[d]])),
      el('p', { class: 'difficulty-note small muted', text: T.difficultyNote }),
    );
  }

  function help(body, { close } = {}) {
    body.append(el('p', { text: T.leaveMode }));
    body.append(el('h3', { text: T.shortcuts }));
    body.append(el('table', { class: 'shortcuts' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: T.keyHead }), el('th', { text: T.doesHead })])]),
      el('tbody', {}, HELP_ROWS.map(([name, text, keys]) => el('tr', {}, [el('td', {}, [el('kbd', { text: keys || keyLabel(name) })]), el('td', { text })]))),
    ]));
    body.append(el('p', { class: 'small muted', text: T.shortcutsOff }));
    body.append(el('h3', { text: T.gestures }), el('p', { text: T.gesturesHelp }));
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsHelp }), el('p', { class: 'muted', text: T.guideHelp }));
    if (canResumeGuide()) {
      body.append(el('div', { class: 'actions' }, [button(T.resumeGuide, { class: 'resume-guide primary', onClick: () => { onResumeGuide(); if (close) close(); } })]));
    }
    body.append(el('h3', { text: T.tips }), el('p', { class: 'muted', text: T.tipsHelp }), el('ul', { class: 'tips-list' }, TIPS.map((tip) => el('li', { text: TIP_TEXT[tip.id] }))));
  }

  function about(body) {
    body.append(el('h3', { text: 'Thebes' }), el('p', { text: `${T.version} ${version}` }), el('p', { text: T.aboutText }));
  }

  return { menu, settings: settingsSheet, help, about };
}

// The confirm dialog: store.confirmDialog = { text, confirmLabel, onConfirm, extraLabel?, onExtra? } shows it; null hides it.
// Cancel gets focus so a stray Enter never confirms; Esc reaches it through modes.back.
export function createDialog({ container, store }) {
  container.setAttribute('aria-labelledby', 'dialog-text');
  function render() {
    const d = store.get().confirmDialog;
    clear(container);
    if (!d) { container.hidden = true; return; }
    const cancel = button(T.cancel, { class: 'cancel', onClick: () => store.set({ confirmDialog: null }) });
    const extra = d.extraLabel ? button(d.extraLabel, { class: 'extra', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onExtra === 'function') d.onExtra(); } }) : null;
    const ok = button(d.confirmLabel || T.confirm, { class: 'ok danger', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onConfirm === 'function') d.onConfirm(); } });
    container.append(el('div', { class: 'box', role: 'document' }, [el('p', { id: 'dialog-text', text: d.text }), el('div', { class: 'buttons' }, [cancel, extra, ok])]));
    container.hidden = false;
    cancel.focus();
  }
  render();
  store.subscribe(render);
  return { render };
}
