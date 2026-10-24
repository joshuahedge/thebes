// The menu, settings, help and about sheets (spec 6.3) as custom renderers for sheets.js, plus the
// confirm dialog that store.confirmDialog drives (New city, undoing an occupied area).
import { KEYS, APP_VERSION } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { TIPS } from '../data/tips.js';
import { openSheet } from './modes.js';
import { FIRE_REACTIONS, MOTION_SETTINGS, motionStatus } from './settings.js';
import { HELP_ROWS, HELP_NAMES, TIP_TEXT, TIP_HELP_TEXT, DIFFICULTY_NAMES, T, DANGER_UI_TEXT, CONTRACT4_TEXT, MOTION4_TEXT, CARDS4_TEXT, V60_HELP, V70_HELP, D2_TEXT, V711_TEXT, SEASON_TEXT } from './text.js';
import { el, button, clear } from './components.js';
import { MAPS_HELP } from './v71/mapsText.js';   // Version 7.1 (Track M): How to play's Maps note
import { V71_HELP } from './v71/ferryText.js';   // Version 7.1 (Track F): How to play's Ferries entry (and importing it registers the ferries tip)

const SILENCED = 'silenced';   // Version 7.1: what Sound Off does to the Music and Effects rows, in a word
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
    // Version 6.0 (Track D2): the lesson's menu has no New city, Export or Import (the lesson's city is never kept) and leaves the lesson instead; any other
    // game's menu replays the lesson when the page offers it (hooks.lesson), saving the city first.
    const inLesson = Boolean(hooks.lessonRun);
    body.append(el('div', { class: 'menu-list' }, [
      button(T.continueGame, { class: 'primary', onClick: close }),
      inLesson ? button(D2_TEXT.menuLeave, { class: 'leave-lesson', onClick: () => store.set({ confirmDialog: { text: D2_TEXT.leaveConfirm, confirmLabel: D2_TEXT.menuLeave, onConfirm: () => hooks.lessonRun.leave() } }) }) : null,
      inLesson ? null : button(T.newCity, { onClick: () => store.set({ confirmDialog: {
        text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity,
        extraLabel: typeof hooks.exportCity === 'function' ? T.exportFirst : null, onExtra: hookOr('exportCity'),
      } }) }),
      !inLesson && typeof hooks.lesson === 'function' ? button(D2_TEXT.menuLesson, { class: 'menu-lesson', onClick: () => store.set({ confirmDialog: { text: D2_TEXT.menuLessonConfirm, confirmLabel: D2_TEXT.menuLesson,
        // "It is saved first": a save that failed (storage full, a newer version's save in the slot) keeps the city and says so, rather than leaving it unsaved for the lesson.
        onConfirm: async () => {
          let saved = true;
          try { if (typeof hooks.save === 'function') saved = (await hooks.save('lesson')) !== false; } catch (e) { saved = false; }
          if (saved) hooks.lesson(); else toasts.show(D2_TEXT.menuLessonNotSaved);
        } } }) }) : null,
      inLesson ? null : button(T.exportCity, { onClick: hookOr('exportCity') }),
      inLesson ? null : button(T.importCity, { onClick: hookOr('importCity') }),
      typeof hooks.install === 'function' && (typeof hooks.canInstall !== 'function' || hooks.canInstall()) ? button(T.installMenu, { class: 'install', onClick: () => hooks.install() }) : null,
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { class: 'how-to-play-row', 'aria-keyshortcuts': settings.get().keyboardShortcuts !== false ? '?' : null, onClick: () => open('help') }),
      typeof onScreenshot === 'function' ? button(T.screenshotMode, { class: 'screenshot-mode', onClick: onScreenshot }) : null,
      button(T.about, { onClick: () => open('about') }),
    ]));
  }

  // silenceable (Version 7.1, fix batch B): a switch the Sound switch is the master of reads "On, silenced" while Sound is Off, so the cue is in words and not
  // only the softer text and dashed border.
  function switchRow(label, key, { silenceable = false } = {}) {
    const state = el('span', { class: 'state small muted' });
    const b = el('button', { type: 'button', role: 'switch', class: `switch ${key}` }, [el('span', { text: label }), ' ', state]);
    const sync = () => {
      const on = Boolean(settings.get()[key]);
      b.setAttribute('aria-checked', String(on));
      state.textContent = on ? (silenceable && !settings.get().sound ? `${T.on}, ${SILENCED}` : T.on) : T.off;
    };
    b.addEventListener('click', () => { settings.set({ [key]: !settings.get()[key] }); sync(); });
    sync();
    if (silenceable) { const stop = settings.subscribe(() => { if (b.isConnected) sync(); else stop(); }); }   // the sheet has closed: stop listening
    return el('div', { class: 'row' }, [b]);
  }

  // A volume stepper, 0-100 in tens: a 44 px − and + (each disabled at its end), and a value the screen reader hears change (role status, polite, named "30 out of 100").
  // The button that has just disabled itself hands keyboard focus to its sibling, so a held-down Louder never strands focus on a dead button.
  function volumeStepper(key, names, onStep = () => {}) {
    const value = el('span', { class: 'value', role: 'status', 'aria-live': 'polite' });
    const quieter = button('−', { class: 'quieter', 'aria-label': names.quieter });
    const louder = button('+', { class: 'louder', 'aria-label': names.louder });
    const sync = () => {
      const v = settings.get()[key];
      value.textContent = String(v);
      value.setAttribute('aria-label', `${v} out of 100`);
      for (const [b, off, other] of [[quieter, v <= 0, louder], [louder, v >= 100, quieter]]) {
        if (off && !b.disabled && document.activeElement === b) other.focus();
        b.disabled = off;
      }
    };
    const step = (d) => { settings.set({ [key]: Math.max(0, Math.min(100, settings.get()[key] + d)) }); sync(); onStep(); };
    quieter.addEventListener('click', () => step(-10));
    louder.addEventListener('click', () => step(10));
    sync();
    return el('span', { class: 'stepper', role: 'group', 'aria-label': names.group, dataset: { label: names.group } }, [quieter, value, louder]);
  }

  function choiceRow(label, key, options) {
    const buttons = options.map(([value, text]) => button(text, { class: `choice ${key}`, dataset: { value: String(value) } }));
    const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(settings.get()[key] === options[i][0])));
    buttons.forEach((b, i) => b.addEventListener('click', () => { settings.set({ [key]: options[i][0] }); sync(); }));
    sync();
    return el('div', { class: 'row' }, [el('span', { text: label }), el('span', { class: 'choices', role: 'group', 'aria-label': label }, buttons)]);
  }

  // Stage 4 (spec 5.4, ruling 216, Track E): one Motion row replaces Stage 3's Reduce motion and Ambient motion rows. Under
  // it, a status line says what it is doing ("Motion: Gentle (your device asks for less motion)", settings.js motionStatus)
  // and a line says what that level moves. Both follow every change at once, a change of the device's own setting
  // included (settings tell their subscribers), until the sheet closes. Track G adds Music and its volume.
  function motionRow() {
    const M = MOTION4_TEXT;
    const row = choiceRow(M.motion, 'motion', MOTION_SETTINGS.map((m) => [m, M.choices[m]]));
    const status = el('p', { class: 'motion-status small', 'aria-live': 'polite' });
    const line = el('p', { class: 'motion-line small muted' });
    const buttons = [...row.querySelectorAll('.choice.motion')];
    const sync = () => {
      const s = motionStatus(settings);
      status.textContent = M.status(s);
      line.textContent = M.levelLines[s.level];
      for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.value === s.setting));
    };
    sync();
    const stop = settings.subscribe(() => { if (status.isConnected) sync(); else stop(); });   // the sheet has closed: stop listening
    return el('div', { class: 'motion-row' }, [row, status, line]);
  }

  // Stage 4, Track G (spec 5.5, ruling 269): Music On / Off and its volume, 0-100 in tens with a 44 px − and + (each
  // disabled at its end), beside Sound and separate from it.
  function musicRows() {
    const C = CARDS4_TEXT;
    return [
      switchRow(C.music, 'music', { silenceable: true }),
      el('div', { class: 'row music-volume' }, [el('span', { text: C.musicVolume }), volumeStepper('musicVolume', { quieter: C.quieter, louder: C.louder, group: C.musicVolume })]),
    ];
  }

  // Version 7.0 (Track S, ruling 935): the Effects volume under the Music rows, the same stepper (0-100 in tens, a 44 px − and +, each disabled at its
  // end; 100 is the loudness the effects had before 7.0). It shares the Music volume's styles (class music-volume) and plays one effect at each step,
  // so the new level is heard; the Sound switch above stays the master of both.
  function effectsRow(sfx) {
    const S = SEASON_TEXT;
    const stepper = volumeStepper('effectsVolume', { quieter: S.effectsQuieter, louder: S.effectsLouder, group: S.effectsVolume }, () => { if (sfx && typeof sfx.play === 'function') sfx.play('coin'); });
    return el('div', { class: 'row music-volume effects-volume' }, [el('span', { text: S.effectsVolume }), stepper]);
  }

  function settingsSheet(body) {
    const D = DANGER_UI_TEXT;
    const motion = motionRow();
    // Version 7.0 (Track S, ruling 935): while Sound is Off the Music and Effects rows are dimmed (class silenced: they still change, and take effect when Sound
    // is back on); the note under them says why in words.
    const soundRows = [...musicRows(), effectsRow(hooks.sfx)];
    // Version 7.1: the volume groups' aria-labels carry the same word, so a screen reader hears it too.
    const dim = () => {
      const silenced = !settings.get().sound;
      for (const r of soundRows) {
        r.classList.toggle('silenced', silenced);
        const group = r.querySelector('.stepper');
        if (group) group.setAttribute('aria-label', silenced ? `${group.dataset.label}, ${SILENCED}` : group.dataset.label);
      }
    };
    dim();
    const stopDim = settings.subscribe(() => { if (soundRows[0].isConnected) dim(); else stopDim(); });   // the sheet has closed: stop listening
    body.append(
      switchRow(T.sound, 'sound'), ...soundRows, el('p', { class: 'sound-note small muted', text: SEASON_TEXT.soundNote }), switchRow(T.vibration, 'vibration'),
      switchRow(T.keyboardShortcuts, 'keyboardShortcuts'), switchRow(T.leftHanded, 'leftHanded'),
      choiceRow(T.textSize, 'textSize', [[100, '100%'], [125, '125%'], [150, '150%']]),
      motion,
      // Version 7.0 (Track S): Day and night on or off (Still keeps daylight whatever it says), after the Motion row it depends on.
      switchRow(SEASON_TEXT.dayNight, 'dayNight'), el('p', { class: 'daynight-note small muted', text: SEASON_TEXT.dayNightNote }),
      // Spec 4.3: what a fire no staffed firehouse reaches does to the speed, after the city's first (which always pauses).
      choiceRow(D.onAFire, 'fireReaction', FIRE_REACTIONS.map((k) => [k, D.fireReactions[k]])),
      el('p', { class: 'fire-note small muted', text: D.onAFireNote }),
      choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]]),
      // Spec 4.18: the level the next new city starts at; the city being played keeps its own (the summary names it).
      choiceRow(T.difficultyForNewCities, 'difficulty', DIFFICULTY_ORDER.map((d) => [d, DIFFICULTY_NAMES[d]])),
      el('p', { class: 'difficulty-note small muted', text: T.difficultyNote }),
    );
  }

  function help(body, { close } = {}) {
    // Stage 4, Track G (spec 4.1): the picture cards at the top of How to play, over the open sheet (hooks.pictureCards
    // pauses the game behind them); the sheet is still open after.
    if (typeof hooks.pictureCards === 'function') {
      body.append(el('div', { class: 'actions show-cards' }, [button(CARDS4_TEXT.showCards, { class: 'show-cards primary', onClick: () => hooks.pictureCards() })]));
    }
    body.append(el('p', { text: T.leaveMode }));
    // Version 7.1 (fix batch B): every heading below is a closed section whose summary is the heading (44 px tall; Enter or Space opens it), so a player can find Trade, Events or
    // Seasons without a 70-screen scroll (the keys table, the tips and the paragraphs were 27,000 px at 375 px and 150% text).
    const section = (head, ...kids) => el('details', { class: 'help-section' }, [el('summary', {}, [el('h3', { text: head })]), ...kids]);
    // Version 7.1.1 (ruling 1110): the first entry says what the game is for (V711_TEXT.goal: the ranks and the great temple, from the sim's data); it stands open.
    body.append(el('details', { class: 'help-section help-goal', open: true }, [el('summary', {}, [el('h3', { text: V711_TEXT.helpGoalHead })]), el('p', { text: V711_TEXT.helpGoal() })]));
    body.append(section(T.shortcuts,
      el('table', { class: 'shortcuts' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: T.keyHead }), el('th', { text: T.doesHead })])]),
        el('tbody', {}, HELP_ROWS.map(([name, text, keys]) => el('tr', {}, [el('td', {}, [el('kbd', { text: keys || keyLabel(name) })]), el('td', { text })]))),
      ]),
      el('p', { class: 'small muted', text: T.shortcutsOff })));
    body.append(section(T.gestures, el('p', { text: T.gesturesHelp })));
    // Version 6.0 (contract section 9): each track's paragraphs, from its own src/ui/text.js section, in track order.
    const paragraph = (p) => body.append(section(p.head, el('p', { text: p.text })));
    for (const p of Object.values(V60_HELP).flat()) paragraph(p);
    for (const p of Object.values(V70_HELP).flat()) paragraph(p);   // Version 7.0: the same, from V70_HELP
    for (const p of MAPS_HELP) paragraph(p);   // Version 7.1 (Track M)
    for (const p of Object.values(V71_HELP).flat()) paragraph(p);   // Version 7.1 (Track F): the same, from V71_HELP
    body.append(section(T.goals, el('p', { class: 'muted', text: T.goalsHelp }), el('p', { class: 'muted', text: T.guideHelp })));
    if (canResumeGuide()) {
      body.append(el('div', { class: 'actions' }, [button(T.resumeGuide, { class: 'resume-guide primary', onClick: () => { onResumeGuide(); if (close) close(); } })]));
    }
    body.append(section(T.tips, el('p', { class: 'muted', text: T.tipsHelp }), el('ul', { class: 'tips-list' }, TIPS.map((tip) => el('li', { text: TIP_HELP_TEXT[tip.id] || TIP_TEXT[tip.id] })))));   // Stage 4: a tip true only where it fires has its help words
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
    const ok = button(d.confirmLabel || T.confirm, { class: d.destructive === false ? 'ok primary' : 'ok danger', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onConfirm === 'function') d.onConfirm(); } });
    container.append(el('div', { class: 'box', role: 'document' }, [el('p', { id: 'dialog-text', text: d.text }), el('div', { class: 'buttons' }, [cancel, extra, ok])]));
    container.hidden = false;
    cancel.focus();
  }
  render();
  store.subscribe(render);
  return { render };
}
