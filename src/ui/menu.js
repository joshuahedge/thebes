// The menu, settings, help and about sheets (spec 6.3) as custom renderers for sheets.js, plus the
// confirm dialog that store.confirmDialog drives (New city, undoing an occupied area).
import { KEYS, APP_VERSION } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { TIPS } from '../data/tips.js';
import { openSheet } from './modes.js';
import { FIRE_REACTIONS } from './settings.js';
import { HELP_ROWS, HELP_NAMES, TIP_TEXT, TIP_HELP_TEXT, DIFFICULTY_NAMES, T, DANGER_UI_TEXT, CONTRACT4_TEXT, CARDS4_TEXT, V60_HELP, V70_HELP, D2_TEXT, V711_TEXT, V80_U_TEXT, SEASON_TEXT, V90_D_TEXT, V90_L_TEXT, V91_A_TEXT, Q92_TEXT, U93_TEXT } from './text.js';
import { el, button, clear } from './components.js';
import { rulerNameRow, bringRulersRow } from './v90/rulerOptions.js';   // Version 9.0 (Track L): Options > Saves' ruler name and Bring rulers
import { versionLine } from './s46/whatsNew.js';   // Version 8.0: the version and build moved from the title to the foot of Options
import { MAPS_HELP } from './v71/mapsText.js';   // Version 7.1 (Track M): How to play's Maps note
import { V71_HELP } from './v71/ferryText.js';   // Version 7.1 (Track F): How to play's Ferries entry (and importing it registers the ferries tip)
import { renderNewCityCard } from './titleCard.js';   // Version 8.2 (Track G): the new-city card in the game's menu
import { MAP_WORDS_AS_WRITTEN } from './v82/mapWords.js';

// The game's new-city card's picture: 120 px on a short screen, else 160 (ruling 1311).
const newCityPreviewPx = () => (typeof window !== 'undefined' && window.innerHeight < 700 ? 120 : 160);

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
// Version 8.2 (Track G): onPause pauses the game (the new-city card opens over a paused game); words(text) says a text as this city's map should (the Great oasis:
// src/ui/v82/oasisText.js forMap), and mapHelp is How to play's paragraph about this map, or null.
const BRIDGE_ONLY_TIPS = ['bridges'];   // Version 8.3 (ruling 1450): the crossings tip says the rule on a map with a river, so its How to play lists one crossing tip, not two
const RIVER_ONLY_TIPS = ['quay_boats', 'ferries'];   // Version 8.2 (ruling 1335): tips a map with no river never fires, left out of its How to play
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION, canResumeGuide = () => false, onResumeGuide = () => {}, onScreenshot = null, onPause = () => {}, words = (s) => s, mapHelp = null }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };

  function menu(body, { close }) {
    // Version 6.0 (Track D2): the lesson's menu has no New city (the lesson's city is never kept) and leaves the lesson instead; any other
    // game's menu replays the lesson when the page offers it (hooks.lesson), saving the city first. Version 8.0 (Track U): Export city moved to Options >
    // Saves, and Import city is gone with Bring a city from Safari.
    const inDecree = Boolean(hooks.decreeRun);   // Version 9.3 (Track U): a decree run has Back to your city and Start the decree again, and no new city, ruler or lesson rows (it is never the city's)
    const inLesson = Boolean(hooks.lessonRun) || inDecree;
    body.append(el('div', { class: 'menu-list' }, [
      button(T.continueGame, { class: 'primary', onClick: close }),
      inDecree ? button(U93_TEXT.backToCity, { class: 'menu-back-to-city', onClick: () => hooks.decreeRun.back() }) : null,
      inDecree ? button(U93_TEXT.startAgain, { class: 'menu-decree-again', onClick: () => store.set({ confirmDialog: { text: U93_TEXT.againQuestion, confirmLabel: U93_TEXT.againYes, destructive: true, onConfirm: () => hooks.decreeRun.again() } }) }) : null,
      // After 8.3 (ruling 1454): Home goes back to the title, the city saved first, so Continue there brings it straight back; a city that cannot be saved stays open
      // and says why. The lesson has its own way home, Leave the lesson.
      !inLesson && typeof hooks.home === 'function' ? button(T.home, { class: 'menu-home', onClick: async () => { if ((await hooks.home()) === false) toasts.show(T.homeNotSaved); } }) : null,
      hooks.lessonRun ? button(D2_TEXT.menuLeave, { class: 'leave-lesson', onClick: () => store.set({ confirmDialog: { text: D2_TEXT.leaveConfirm, confirmLabel: D2_TEXT.menuLeave, onConfirm: () => hooks.lessonRun.leave() } }) }) : null,
      // Version 8.2 (Track G, ruling 1308): New city opens the new-city card (the title's own) as this one sheet; its Start asks the replace question.
      inLesson ? null : button(T.newCity, { class: 'menu-new-city', onClick: () => { onPause(); open('newCity'); } }),
      // Version 9.0 (wave 0, ruling 1563): Pass the throne (Track D's hooks.passThrone, offered while hooks.canPassThrone() says so: from City) and the
      // ruler list (Track L's hooks.rulers). Each row is absent until its hook exists, and both are absent in the lesson (its city is never kept).
      !inLesson && typeof hooks.passThrone === 'function' && (typeof hooks.canPassThrone !== 'function' || hooks.canPassThrone()) ? button(V90_D_TEXT.menuPass, { class: 'menu-pass-throne', onClick: () => hooks.passThrone() }) : null,
      !inLesson && typeof hooks.rulers === 'function' ? button(V90_L_TEXT.menuRulers, { class: 'menu-rulers', onClick: () => hooks.rulers() }) : null,
      !inLesson && typeof hooks.lesson === 'function' ? button(D2_TEXT.menuLesson, { class: 'menu-lesson', onClick: () => store.set({ confirmDialog: { text: D2_TEXT.menuLessonConfirm, confirmLabel: D2_TEXT.menuLesson, destructive: false,   // the city is saved first, nothing is lost: primary, not coral (Version 8.0, ruling 1176)
        // "It is saved first": a save that failed (storage full, a newer version's save in the slot) keeps the city and says so, rather than leaving it unsaved for the lesson.
        onConfirm: async () => {
          let saved = true;
          try { if (typeof hooks.save === 'function') saved = (await hooks.save('lesson')) !== false; } catch (e) { saved = false; }
          if (saved) hooks.lesson(); else toasts.show(D2_TEXT.menuLessonNotSaved);
        } } }) }) : null,
      typeof hooks.install === 'function' && (typeof hooks.canInstall !== 'function' || hooks.canInstall()) ? button(T.installMenu, { class: 'install', onClick: () => hooks.install() }) : null,
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { class: 'how-to-play-row', 'aria-keyshortcuts': settings.get().keyboardShortcuts !== false ? '?' : null, onClick: () => open('help') }),
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

  // Version 8.0 (Track U, ruling 1147): the Motion row is gone; the game always moves in full (settings.js says how the test rig still forces Gentle).

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

  // Version 9.1 (Track A, rulings 1701-1703): who made the game, its licence, where its art and sound come from and what it does with data, as four short
  // lines; the About sheet shows them, and Options folds them under an About heading above the version and build (a closed section, so the sheet stays short).
  const aboutLines = () => [V91_A_TEXT.madeBy, V91_A_TEXT.licenceLine(V91_A_TEXT.aboutLicence), V91_A_TEXT.art, V91_A_TEXT.privacy].map((text, i) => el('p', { class: `about-line about-${['made', 'licence', 'art', 'privacy'][i]}`, text }));

  function settingsSheet(body) {
    const D = DANGER_UI_TEXT, G = V80_U_TEXT.groups;
    // Version 8.0 (Track U, ruling 1149): the rows sit under four small headings, Sound, Display, Controls and Saves (each a labelled group), so the sheet reads as
    // four short lists instead of one long one.
    // Version 9.2 (Track Q, ruling 1792): each is a collapsible section (a details, its heading in the summary), open to begin with; Help has its own, and About is last.
    const group = (key, name, ...rows) => el('details', { class: `options-group ${key}`, open: true, role: 'group', 'aria-labelledby': `options-${key}` }, [el('summary', { class: 'options-heading', id: `options-${key}`, text: name }), ...rows]);   // Version 9.2 (fix wave, ruling 1879): a summary's button role flattens an h3 inside it, so the plain words sit in the summary and the section is a labelled group
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
    // Saves: Export city, a file copy of the city being played (no import: Version 8.0 ruling 1146), where there is a city to export (not the lesson's, which is
    // never kept); and the level the next new city starts at (spec 4.18), which the in-game New city has no card to pick.
    const canExport = typeof hooks.exportCity === 'function' && !hooks.lessonRun && !hooks.decreeRun;
    const saves = [
      canExport ? el('div', { class: 'row export-row' }, [button(T.exportCity, { class: 'export-city', onClick: () => hooks.exportCity() }), el('p', { class: 'export-note small muted', text: V80_U_TEXT.exportNote })]) : null,
      choiceRow(V80_U_TEXT.newCityLevel, 'difficulty', DIFFICULTY_ORDER.map((d) => [d, DIFFICULTY_NAMES[d]])),
      el('p', { class: 'difficulty-note small muted', text: T.difficultyNote }),
      // Version 9.0 (Track L, rulings 1586, 1593): the ruler's name and Bring rulers from a file; neither in the lesson (its city is never kept).
      hooks.records && !hooks.lessonRun ? rulerNameRow(hooks) : null,
      hooks.records && typeof hooks.bringRulers === 'function' && !hooks.lessonRun ? bringRulersRow(hooks) : null,
    ];
    body.append(
      group('sound', G.sound, switchRow(T.sound, 'sound'), ...soundRows, el('p', { class: 'sound-note small muted', text: SEASON_TEXT.soundNote })),
      // Version 7.0 (Track S): Day and night on or off.
      group('display', G.display, choiceRow(T.textSize, 'textSize', [[100, '100%'], [125, '125%'], [150, '150%'], [200, '200%']]),
        switchRow(SEASON_TEXT.dayNight, 'dayNight'), el('p', { class: 'daynight-note small muted', text: SEASON_TEXT.dayNightNote }),
        // Version 9.2 (Track Q, ruling 1791): Screenshot mode lives here (it left the menu and the City summary); it hides the interface until a tap, Esc or Back.
        // Version 9.2 (after the release): the row stacks like Export (css/v92.css), the button the row's width on one line and the note under it.
        typeof onScreenshot === 'function' ? el('div', { class: 'row screenshot-row' }, [button(T.screenshotMode, { class: 'screenshot-mode', onClick: onScreenshot }), el('p', { class: 'screenshot-note small muted', text: Q92_TEXT.screenshotNote })]) : null),
      group('controls', G.controls, switchRow(T.keyboardShortcuts, 'keyboardShortcuts'), switchRow(T.leftHanded, 'leftHanded'), switchRow(T.vibration, 'vibration'),
        // Spec 4.3: what a fire no staffed firehouse reaches does to the speed, after the city's first (which always pauses).
        choiceRow(D.onAFire, 'fireReaction', FIRE_REACTIONS.map((k) => [k, D.fireReactions[k]])),
        el('p', { class: 'fire-note small muted', text: D.onAFireNote })),
      group('help', G.help, choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]])),
      group('saves', G.saves, ...saves),
      el('details', { class: 'help-section options-about' }, [el('summary', {}, [el('h3', { text: V91_A_TEXT.about })]), ...aboutLines()]),   // Version 9.1 (Track A): shares the closed sections' 44 px summary
      el('div', { class: 'options-version' }, [versionLine({ version })]),   // the version and build, small and muted, at the foot (it left the title card in 8.0)
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
    // Version 8.2 (Track G, ruling 1307): a city with no river (the Great oasis) says so first, open, and every paragraph below says the great lake where it says the river.
    if (mapHelp) body.append(el('details', { class: 'help-section help-map', open: true }, [el('summary', {}, [el('h3', { text: mapHelp.head })]), el('p', { text: mapHelp.text })]));
    body.append(section(T.shortcuts,
      el('table', { class: 'shortcuts' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: T.keyHead }), el('th', { text: T.doesHead })])]),
        el('tbody', {}, HELP_ROWS.map(([name, text, keys]) => el('tr', {}, [el('td', {}, [el('kbd', { text: keys || keyLabel(name) })]), el('td', { text })]))),
      ]),
      el('p', { class: 'small muted', text: T.shortcutsOff })));
    body.append(section(T.gestures, el('p', { text: T.gesturesHelp })));
    // Version 6.0 (contract section 9): each track's paragraphs, from its own src/ui/text.js section, in track order.
    // Version 8.2 (integration, ruling 1335): a city with no river (mapHelp is said only there) leaves out what its map cannot have: trade by river, the Quay, the ferries and their tips.
    const riverOnly = mapHelp ? new Set([V70_HELP.t[0], V70_HELP.a[0], ...V71_HELP.f].filter(Boolean).map((p) => p.head)) : new Set();
    const paragraph = (p) => { if (!riverOnly.has(p.head)) body.append(section(p.head, el('p', { text: words(p.text) }))); };
    for (const p of Object.values(V60_HELP).flat()) paragraph(p);
    for (const p of Object.values(V70_HELP).flat()) paragraph(p);   // Version 7.0: the same, from V70_HELP
    for (const p of MAPS_HELP) { const s = section(p.head, el('p', { text: p.text })); s.setAttribute(MAP_WORDS_AS_WRITTEN, ''); body.append(s); }   // Version 7.1 (Track M); 8.2 (ruling 1335): it names every map's river, as written
    for (const p of Object.values(V71_HELP).flat()) paragraph(p);   // Version 7.1 (Track F): the same, from V71_HELP
    body.append(section(T.goals, el('p', { class: 'muted', text: T.goalsHelp }), el('p', { class: 'muted', text: T.guideHelp })));
    if (canResumeGuide()) {
      body.append(el('div', { class: 'actions' }, [button(T.resumeGuide, { class: 'resume-guide primary', onClick: () => { onResumeGuide(); if (close) close(); } })]));
    }
    body.append(section(T.tips, el('p', { class: 'muted', text: T.tipsHelp }), el('ul', { class: 'tips-list' }, TIPS.filter((tip) => tip.id !== 'gentle_motion' && !(mapHelp ? RIVER_ONLY_TIPS : BRIDGE_ONLY_TIPS).includes(tip.id)).map((tip) => el('li', { text: words(TIP_HELP_TEXT[tip.id] || TIP_TEXT[tip.id]) })))));   // Stage 4: a tip true only where it fires has its help words
  }

  function about(body) {
    body.append(el('h3', { text: 'Thebes' }), versionLine({ version }), el('p', { text: T.aboutText }), ...aboutLines());   // Version 9.1 (Track A): the version and its build, as Options' foot says them
  }

  // Version 8.2 (Track G, rulings 1308-1310): the new-city card, the title's own (difficulty, the map preview, More choices), over the paused game. Its choices are
  // kept by boot (hooks.newCityChoices) and the difficulty is the device's setting, the one Options > Saves shows. Back closes it and the city is as it was; Start
  // asks the replace question (the city is lost unless exported: Export first), and only its confirm starts the new city (onNewCity).
  let moreOpen = false;
  function newCity(body, { close } = {}) {
    const C = hooks.newCityChoices || { get: () => ({}), setSize() {}, setLayout() {}, setSeed() {} };
    const now = C.get();
    const card = renderNewCityCard({
      difficulty: settings.get().difficulty, onDifficulty: (level) => settings.set({ difficulty: level }),
      mapSize: now.mapSize, onMapSize: C.setSize, layout: now.layout || 'auto', onLayout: C.setLayout, seed: now.seed, onSeed: C.setSeed,
      hasSave: true, head: false, previewPx: newCityPreviewPx(), moreOpen, onMore: (open) => { moreOpen = open; },   // the sheet may be drawn again: More choices stays as it was
      onBack: () => { if (close) close(); },
      onStart: () => store.set({ confirmDialog: {
        text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity,
        extraLabel: typeof hooks.exportCity === 'function' ? T.exportFirst : null, onExtra: hookOr('exportCity'),
      } }),
    });
    card.element.setAttribute(MAP_WORDS_AS_WRITTEN, '');   // Version 8.2 (ruling 1335): the card names the maps to come, river and all, from a city of any map
    body.append(card.element);
    queueMicrotask(() => { if (card.element.isConnected) card.focus(); });
  }

  return { menu, settings: settingsSheet, help, about, newCity };
}

// The confirm dialog: store.confirmDialog = { text, confirmLabel, onConfirm, extraLabel?, onExtra? } shows it; null hides it.
// Cancel gets focus so a stray Enter never confirms; Esc reaches it through modes.back.
// Version 9.2 (Track A, ruling 1825): it is a real modal. Cancel takes focus once, when the dialog comes up (not on every store change), Tab and Shift+Tab stay among
// its buttons, and closing it hands focus back to the control that was focused when it opened.
export function createDialog({ container, store }) {
  container.setAttribute('aria-labelledby', 'dialog-text');
  let shown = null, opener = null;
  // Version 9.2 (fix wave, Track A, ruling 1875): a confirm opened from a sheet re-renders that sheet, so the opener is a node that is gone by the time the dialog closes. The opener is kept
  // with where it sat (its nearest container with an id), its class and its words, and a dead one is found again by those.
  // An opener with its own id is found again by that id; a class alone is trusted only when one live button has it (re-review: never focus the wrong button).
  const describe = (a) => { const scope = a.parentElement ? a.parentElement.closest('[id]') : null; return { node: a, id: a.id || null, scope: scope ? scope.id : null, cls: a.className, text: a.textContent }; };
  const successor = (o) => {
    if (o.node.isConnected) return o.node;
    if (o.id) { const same = document.getElementById(o.id); if (same && !container.contains(same)) return same; }
    const within = o.scope ? document.getElementById(o.scope) : null;
    if (!within || container.contains(within)) return null;
    const live = [...within.querySelectorAll('button')].filter((b) => !b.disabled);
    const byClass = live.filter((b) => b.className === o.cls);
    return byClass.find((b) => b.textContent === o.text) || (byClass.length === 1 ? byClass[0] : null);
  };
  function render() {
    const d = store.get().confirmDialog;
    if (d && d === shown && !container.hidden) return;   // the same question, still asked: leave its focus alone
    clear(container);
    if (!d) {
      const back = opener ? successor(opener) : null;
      shown = null; opener = null; container.hidden = true;
      if (back && typeof back.focus === 'function' && (!document.activeElement || document.activeElement === document.body || container.contains(document.activeElement))) back.focus({ preventScroll: true });
      return;
    }
    if (!shown) { const a = document.activeElement; opener = a && a !== document.body && !container.contains(a) ? describe(a) : null; }
    shown = d;
    const cancel = button(T.cancel, { class: 'cancel', onClick: () => store.set({ confirmDialog: null }) });
    const extra = d.extraLabel ? button(d.extraLabel, { class: 'extra', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onExtra === 'function') d.onExtra(); } }) : null;
    const ok = button(d.confirmLabel || T.confirm, { class: d.destructive === false ? 'ok primary' : 'ok danger', onClick: () => { store.set({ confirmDialog: null }); if (typeof d.onConfirm === 'function') d.onConfirm(); } });
    container.append(el('div', { class: 'box', role: 'document' }, [el('p', { id: 'dialog-text', text: d.text }), el('div', { class: 'buttons' }, [cancel, extra, ok])]));
    container.hidden = false;
    cancel.focus();
  }
  // Tab never leaves the dialog while it is up, wherever focus was (a click on the backdrop leaves it on the page).
  const trap = (e) => {
    if (e.key !== 'Tab' || !shown || container.hidden || !container.isConnected || e.defaultPrevented) return;
    const list = [...container.querySelectorAll('button:not([disabled])')];
    if (!list.length) return;
    const at = list.indexOf(document.activeElement);
    e.preventDefault();
    list[e.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : (at < 0 || at === list.length - 1 ? 0 : at + 1)].focus();
  };
  document.addEventListener('keydown', trap, true);
  render();
  const unsubscribe = store.subscribe(render);
  // Version 9.2 (fix wave, Track A, ruling 1879): the interface that made the dialog takes its document listener (and its store subscription) away when it is destroyed.
  const destroy = () => { document.removeEventListener('keydown', trap, true); if (typeof unsubscribe === 'function') unsubscribe(); };
  return { render, destroy };
}
