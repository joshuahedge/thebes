// The title card (spec 4.1). Version 8.0 (Track U, rulings 1148-1153): one main button (Continue with a saved city, else Play), then the quieter ones
// (New city, I've played before, Lesson), Options and What's new, over a paused, slowly drifting sample city; Install only where offered. The version
// number moved to the foot of Options. New city is a card of its own: difficulty as large tiles, with map size and layout under More choices.
// Version 6.0 (Track D1, rulings 740-747): "This week's Nile" and "Play with sound / Play muted" are gone (sound is on by default, Options mutes it),
// Options opens on the card, and the size picker has Huge. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS, TITLE_HOLD_MS } from '../data/ui.js';
import { ART, slotFor } from '../render/art/registry.js';
import { p, artToTile, ART_SCALE } from '../render/iso.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { el, button, clear } from './components.js';
import { T, DIFFICULTY_NAMES, CARDS4_TEXT, S46_MAP_TEXT, S46_UX_TEXT, D1_TEXT, D2_TEXT, V711_TEXT, V80_U_TEXT } from './text.js';
import { MAP_SIZES, MAP_SIZE_IDS, MAP_SIZE_TABLE, MAP_VARIANTS_OFFERED } from '../data/map.js';
import { createMapPreview, rollSeed } from './v82/mapPreview.js';   // Version 8.2 (Track G): the new-city card's map preview
import { PREVIEW_TEXT } from './v82/oasisText.js';
import { renderWhatsNew } from './s46/whatsNew.js';   // Stage 4.6 (rulings 401-403): the What's new panel

// The difficulty tiles of the new-city card (Version 8.0): one large pressed-state button per level, its name and one line from the sim's own data
// (V80_U_TEXT.difficultyLine). Choosing one tells onChoose (boot.js keeps it in settings.difficulty), so the last one used is chosen next time.
function difficultyTiles(initial, onChoose) {
  let level = DIFFICULTY_ORDER.includes(initial) ? initial : 'normal';
  const choices = DIFFICULTY_ORDER.map((d) => el('button', { type: 'button', class: 'choice difficulty tile', dataset: { value: d } }, [
    el('span', { class: 'tile-name', text: DIFFICULTY_NAMES[d] }),
    el('span', { class: 'tile-line small', text: V80_U_TEXT.difficultyLine(d) }),
  ]));
  const sync = () => { for (const b of choices) b.setAttribute('aria-pressed', String(b.dataset.value === level)); };
  for (const b of choices) b.addEventListener('click', () => { level = b.dataset.value; sync(); onChoose(level); });
  sync();
  return el('div', { class: 'title-difficulty tiles', role: 'group', 'aria-label': T.difficultyForNewCities }, choices);
}

// Stage 4.6 (ruling 333): Small, Normal or Large for the next new city: three pressed-state buttons with the chosen size's line under them
// ("Small: a quick city"). Choosing one tells onChoose (boot.js keeps it for the session; it starts as Normal, so a new city is Normal unless
// the player picks), and the weekly seed and a shared link ignore it. initial is a size id ('small', 'normal' or 'large').
// Version 6.0 (Track D1, rulings 740, 743): Huge is the fourth size, and a size the table marks bigScreen (Huge) says "Best on a tablet or computer" while it is
// chosen on a phone (setPhone): under the hint, never blocking the choice, and in the button's name for assistive technology.
const BIG_SCREEN_IDS = new Set(MAP_SIZE_TABLE.filter((r) => r.bigScreen).map((r) => r.id));
export const PHONE_SHORT_SIDE = 600;   // CSS px: a screen whose shorter side is under this is a phone (a tablet's is 600 or more)
export const isPhoneScreen = (v) => Boolean(v) && Math.min(v.width, v.height) > 0 && Math.min(v.width, v.height) < PHONE_SHORT_SIDE;

function sizeRow(initial, onChoose) {
  let id = MAP_SIZE_IDS.includes(initial) ? initial : 'normal', phone = false;
  const hint = el('p', { class: 'difficulty-hint size-hint small muted', id: 'title-size-hint' });
  const note = el('p', { class: 'size-note small', id: 'title-size-note', role: 'status', hidden: true });
  const nameOf = (k) => (phone && BIG_SCREEN_IDS.has(k) ? D1_TEXT.hugeWords(MAP_SIZES[k], true) : S46_MAP_TEXT.sizeWords(k, MAP_SIZES[k]));
  const choices = MAP_SIZE_IDS.map((k) => button(S46_MAP_TEXT.sizeNames[k], { class: 'choice mapsize', dataset: { value: k }, 'aria-describedby': 'title-size-hint', 'aria-label': nameOf(k) }));
  const sync = () => {
    for (const b of choices) { b.setAttribute('aria-pressed', String(b.dataset.value === id)); b.setAttribute('aria-label', nameOf(b.dataset.value)); }
    hint.textContent = S46_MAP_TEXT.sizeHints[id];
    note.hidden = !(phone && BIG_SCREEN_IDS.has(id));
    note.textContent = note.hidden ? '' : D1_TEXT.bigScreen;
  };
  for (const b of choices) b.addEventListener('click', () => { id = b.dataset.value; sync(); onChoose(id); });
  sync();
  const row = el('div', { class: 'title-size' }, [
    el('span', { class: 'label small', 'aria-hidden': 'true', text: S46_MAP_TEXT.sizeLabel }),
    el('div', { class: 'choices', role: 'group', 'aria-label': S46_MAP_TEXT.sizeGroup }, choices),
    hint,
    note,
  ]);
  row.setPhone = (flag) => { if (phone !== Boolean(flag)) { phone = Boolean(flag); sync(); } };
  return row;
}

// The layout picker of More choices (Version 8.0): Surprise me (the seed picks, 'auto') or one of the twelve river layouts by name. A native select: a 44 px
// control with a label, and the keyboard's own arrows. Choosing one tells onChoose (boot.js keeps it for the session, as it keeps the size).
// Version 8.2 (Track G, ruling 1300): the offered layouts only (the old river oasis is no longer one; "Oasis" is the Great oasis).
function layoutRow(initial, onChoose) {
  const ids = ['auto', ...MAP_VARIANTS_OFFERED];
  const value = ids.includes(initial) ? initial : 'auto';
  const select = el('select', { class: 'layout-select', id: 'title-layout' }, ids.map((id) => el('option', { value: id, text: V80_U_TEXT.layoutName(id) })));
  select.value = value;
  select.addEventListener('change', () => onChoose(select.value));
  return el('div', { class: 'title-layout' }, [
    el('label', { class: 'label small', for: 'title-layout', text: V80_U_TEXT.layoutLabel }),
    select,
  ]);
}

// Version 8.2 (Track G, rulings 1308-1311): the new-city card on its own, so the title and the game's menu show the same one. The difficulty tiles, the map
// preview (the map the city will get, drawn from the seed, the size and the layout, with Another to draw a new seed), More choices (map size and layout, closed
// at first, with a line saying what is chosen), a note when a saved city would be replaced, then Start and Back. Each choice is told at once (onDifficulty,
// onMapSize, onLayout, onSeed) to whoever keeps it; seed: the card's seed (null draws one, and onSeed is told). wide: the desktop and tablet layout (tiles
// two by two, a larger picture with More choices beside it); previewPx: the picture's side. Returns { element, focus(), setPhone(flag), preview }.
export function renderNewCityCard({ difficulty = 'normal', onDifficulty = () => {}, mapSize = 'normal', onMapSize = () => {}, layout = 'auto', onLayout = () => {}, seed = null, onSeed = () => {}, hasSave = false, onStart = () => {}, onBack = () => {}, head = true, wide = false, previewPx = 160, defer, moreOpen = false, onMore = () => {} } = {}) {
  let sizeNow = MAP_SIZE_IDS.includes(mapSize) ? mapSize : 'normal', layoutNow = layout, seedNow = Number.isInteger(seed) ? seed : null;
  if (seedNow === null) { seedNow = rollSeed(); onSeed(seedNow); }
  const levels = difficultyTiles(difficulty, onDifficulty);
  const preview = createMapPreview({ px: previewPx, ...(defer ? { defer } : {}) });
  const redraw = () => preview.show({ seed: seedNow, size: MAP_SIZES[sizeNow], layout: layoutNow });
  const another = button(PREVIEW_TEXT.another, { class: 'another-map', 'aria-label': PREVIEW_TEXT.anotherLabel, 'aria-describedby': 'map-preview-name', onClick: () => { seedNow = rollSeed(); onSeed(seedNow); redraw(); } });
  const sizes = sizeRow(sizeNow, (id) => { sizeNow = id; onMapSize(id); sync(); redraw(); });
  const picker = layoutRow(layoutNow, (id) => { layoutNow = id; onLayout(id); sync(); redraw(); });
  const region = el('div', { class: 'more-choices-body', id: 'more-choices-body', hidden: !moreOpen }, [sizes, picker]);
  const summary = el('p', { class: 'more-summary small muted' });
  const toggle = el('button', { type: 'button', class: 'more-choices-toggle', 'aria-expanded': 'false', 'aria-controls': 'more-choices-body' });
  const sync = () => {
    const open = !region.hidden;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? V80_U_TEXT.fewerChoices : V80_U_TEXT.moreChoices;
    summary.textContent = V80_U_TEXT.moreSummary(S46_MAP_TEXT.sizeNames[sizeNow] || sizeNow, layoutNow);
    summary.hidden = open;
  };
  toggle.addEventListener('click', () => { region.hidden = !region.hidden; onMore(!region.hidden); sync(); });
  sync();
  redraw();
  const start = button(V80_U_TEXT.start, { class: 'start-city primary', onClick: () => onStart({ seed: seedNow, size: MAP_SIZES[sizeNow], layout: layoutNow }) });
  const back = button(T.back, { class: 'guide-back', onClick: onBack });
  const element = el('div', { class: `guide-body new-city-body${wide ? ' wide' : ''}` }, [
    head ? el('h2', { class: 'new-city-head', text: V80_U_TEXT.newCityHead }) : null,
    levels,
    el('div', { class: 'map-preview-block' }, [preview.element, another]),
    el('div', { class: 'more-col' }, [toggle, summary, region]),
    hasSave ? el('p', { class: 'replace-note small muted', text: V80_U_TEXT.replaceNote }) : null,
    el('div', { class: 'actions' }, [start, back]),
  ]);
  return { element, preview, focus: () => (levels.querySelector('[aria-pressed="true"]') || start).focus(), setPhone: (flag) => sizes.setPhone(flag) };
}

// The wide title (Version 8.2, Track G, ruling 1312): a screen at least WIDE_TITLE px wide and taller than a phone held sideways.
export const WIDE_TITLE = 768;
export const isWideTitle = (v) => Boolean(v) && v.width >= WIDE_TITLE && v.height > 480;

// decorate (Stage 3): called once with (element, { buttonBox, newCity }) after the card is built, so the score interface
// adds the records, stamps and a shared score (src/ui/scoreUi.js titleDecor) without editing this file.
// Version 6.0 (Track D1, rulings 742, 747): the Lesson button (onLesson, from the guided first city: Track D2) and, until that exists, How to play
// (onHowToPlay, Stage 4 Track G, spec 4.1: boot.js passes hooks.pictureCards), the picture cards; no button without either. Options (renderSettings(body),
// the same rows as the game's Options sheet) and What's new open as the card's one panel with Back. screen() is the screen's size in CSS px (a phone is
// told Huge suits a tablet or computer).
// Version 8.0 (Track U, rulings 1148-1153): the main button is Continue with a saved city, else Play. On a device that has not done the lesson and has no
// saved city, Play starts the lesson (the lesson alone, as ruling 617 had it, with I've played before under it); with the lesson done and no city, Play opens
// the new-city card; with a saved city, New city does. difficulty is a level or a function that gives the device's level now; mapSize a size id and layout
// a layout id ('auto' is Surprise me), both kept here once chosen so the card shows them when it opens again.
export function createTitleCard({ container, hasSave, canInstall = false, difficulty = 'normal', message = null, onContinue, onNewCity, onDifficulty = () => {}, onInstall = () => {}, decorate = null, onHowToPlay = null, onLesson = null, lesson = null, renderSettings = null, mapSize = 'normal', onMapSize = () => {}, layout = 'auto', onLayout = () => {}, screen = null, seed = null, onSeed = () => {} }) {
  const install = button(T.install, { class: 'install', hidden: !canInstall, onClick: onInstall });
  const lessonOnly = Boolean(lesson && lesson.due && typeof onLesson === 'function');
  const primaryNew = !hasSave && !lessonOnly;
  const newCity = button(primaryNew ? V80_U_TEXT.play : T.newCity, { class: primaryNew ? 'new-city primary' : 'new-city', onClick: () => showNewCity() });
  const levelNow = () => (typeof difficulty === 'function' ? difficulty() : difficulty);
  let sizeNow = mapSize, layoutNow = layout, sizes = null, seedNow = Number.isInteger(seed) ? seed : null;
  const buttons = [];
  if (lessonOnly) {
    buttons.push(button(lesson.partWay ? D2_TEXT.titleContinue : D2_TEXT.titleStart, { class: 'lesson-start primary', onClick: () => onLesson() }));
  } else {
    if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
    buttons.push(newCity);
  }
  const lessonExtras = lessonOnly ? [
    el('p', { class: 'lesson-hint small muted', text: lesson.partWay ? D2_TEXT.titleContinueHint : D2_TEXT.titleHint }),
    lesson.partWay && typeof lesson.onAgain === 'function' ? button(D2_TEXT.titleAgain, { class: 'lesson-again quiet', onClick: () => lesson.onAgain() }) : null,
    // Version 7.1.1 (ruling 1111, over ruling 617): a secondary button under the lesson's own: a player who has played before marks the lesson done and gets the usual
    // New city card (difficulty, map size) at once. Version 8.0: it is called I've played before.
    typeof lesson.onSkip === 'function' ? button(V711_TEXT.skip, { class: 'lesson-skip', onClick: () => lesson.onSkip() }) : null,
  ] : [];
  const more = [];
  if (typeof onLesson === 'function' && !lessonOnly) more.push(button(lesson && lesson.partWay ? V80_U_TEXT.resumeLesson : D1_TEXT.lesson, { class: 'lesson', onClick: () => onLesson() }));
  else if (typeof onHowToPlay === 'function' && !lessonOnly) more.push(button(CARDS4_TEXT.howToPlay, { class: 'how-to-play', onClick: () => onHowToPlay() }));
  if (typeof renderSettings === 'function') more.push(button(T.settings, { class: 'title-settings', onClick: () => showSettings() }));
  more.push(button(S46_UX_TEXT.whatsNew, { class: 'whats-new-button', onClick: () => showWhatsNew() }));   // Stage 4.6 (ruling 402): one panel of releases, newest first
  const buttonBox = el('div', { class: 'title-buttons' }, [
    ...buttons,
    ...lessonExtras,
    el('div', { class: 'title-more', role: 'group', 'aria-label': D1_TEXT.titleGroup }, more),
    install,
  ]);
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    el('p', { class: 'goal-line', text: V711_TEXT.goal() }),   // Version 7.1.1 (ruling 1110): what the game is for, up front
    message ? el('p', { class: 'message coral', text: message }) : null,
    lesson && lesson.note ? el('p', { class: 'lesson-note teal', text: lesson.note }) : null,   // "Your first city stands": back on the title after the lesson
    buttonBox,
  ]);
  let guide = null;
  // Version 8.2 (Track G, ruling 1312): on a wide screen (isWideTitle) a panel opens beside the buttons, which stay (the card grows into two parts); on a phone
  // it takes the buttons' place, as before. Esc closes a panel either way.
  const showPanelNode = (children) => {
    guide = el('div', { class: 'guide' }, children);
    const wide = isWideTitle(screenNow());
    element.classList.toggle('wide', wide);
    element.classList.add('panel-open');
    buttonBox.hidden = !wide;
    element.append(guide);
  };
  const showCard = () => { sizes = null; if (guide) { guide.remove(); guide = null; } element.classList.remove('panel-open'); buttonBox.hidden = false; buttons[0].focus(); };
  element.addEventListener('keydown', (e) => { if (e.key === 'Escape' && guide) { e.preventDefault(); e.stopPropagation(); showCard(); } });
  const showWhatsNew = () => { showCard(); const body = el('div', { class: 'guide-body' }); const { top } = renderWhatsNew(body, showCard); showPanelNode([body]); top.focus(); };
  // Options on the card (Version 6.0): the game's own rows, written to the device's settings at once, then Back.
  const showSettings = () => {
    showCard();
    const body = el('div', { class: 'guide-body settings-body' });
    renderSettings(body);
    const back = button(T.back, { class: 'guide-back', onClick: showCard });
    showPanelNode([el('h2', { class: 'settings-head', text: D1_TEXT.settingsPanel }), body, el('div', { class: 'actions' }, [back])]);
    (body.querySelector('button') || back).focus();
  };
  // The new-city card (Version 8.0): the difficulty tiles, More choices (map size and layout, closed at first, with a line saying what is chosen), a note when
  // a saved city would be replaced, then Start and Back. Start is onNewCity (boot.js: the replace question first when a city is saved, then the picture cards).
  // Version 8.2 (Track G): the card itself is renderNewCityCard (the game's menu shows the same one), with the map preview; Start passes the pick (seed, size,
  // layout) to onNewCity, so the city that starts is the map shown.
  const showNewCity = () => {
    showCard();
    const v = screenNow(), wide = isWideTitle(v);
    const card = renderNewCityCard({
      difficulty: levelNow(), onDifficulty, mapSize: sizeNow, onMapSize: (id) => { sizeNow = id; onMapSize(id); },
      layout: layoutNow, onLayout: (id) => { layoutNow = id; onLayout(id); }, seed: seedNow, onSeed: (s) => { seedNow = s; onSeed(s); },
      hasSave, onStart: (pick) => onNewCity(pick), onBack: showCard, wide, previewPx: wide ? (v.width >= 1000 ? 280 : 220) : v && v.height < 700 ? 120 : 160,
    });
    sizes = card;
    showPanelNode([card.element]);
    checkPhone();
    card.focus();
  };
  if (typeof decorate === 'function') decorate(element, { buttonBox, newCity });
  clear(container);
  container.append(element);
  container.hidden = false;
  buttons[0].focus();
  // A phone is told Huge suits a bigger screen: judged from the screen the card fills now and whenever the window changes (a phone turned, a window resized).
  const screenNow = () => {
    if (typeof screen === 'function') return screen();
    const r = container.getBoundingClientRect();
    return r.width && r.height ? { width: r.width, height: r.height } : { width: window.innerWidth, height: window.innerHeight };
  };
  // Version 8.2 (ruling 1312): the card knows it is on a wide screen (a little larger at rest; a panel opens beside the buttons) as the window changes too.
  const checkPhone = () => { if (sizes) sizes.setPhone(isPhoneScreen(screenNow())); if (!guide) element.classList.toggle('wide', isWideTitle(screenNow())); };
  element.classList.toggle('wide', isWideTitle(screenNow()));
  window.addEventListener('resize', checkPhone);
  return {
    element,
    setCanInstall(flag) { install.hidden = !flag; },
    // The install guide takes the buttons' place until Back (iOS, or a browser without the install prompt).
    showGuide(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body);
      const back = button(V711_TEXT.continueLabel, { class: 'guide-back', onClick: showCard });   // Version 7.1.1 (ruling 1106): the install guide is read through, then Continue
      showPanelNode([body, el('div', { class: 'actions' }, [back])]);
      back.focus();
    },
    // A panel with its own buttons (the new-city confirmation): render(body, back) fills it and wires Back itself.
    showPanel(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body, showCard);
      showPanelNode([body]);
      const first = body.querySelector('button');
      if (first) first.focus();
    },
    // The line under the tagline: save problems the player needs to see on the title.
    setMessage(text) {
      let node = element.querySelector('.message');
      if (!node) { node = el('p', { class: 'message coral' }); element.insertBefore(node, buttonBox); }
      node.textContent = text || '';
      node.hidden = !text;
    },
    showCard,
    showNewCity,
    destroy() { window.removeEventListener('resize', checkPhone); clear(container); container.hidden = true; },
  };
}

// The backdrop's showcase (spec 4.1, 5.7 item 7): the sample city's finished small obelisk, its colossus under way and its
// palace (src/dev/sampleCity.js addShowcase), as the box they fill on the map in art px [left, top, right, bottom] (their
// footprints and their height), or null when the city has none of them.
const SHOWCASE = ['obelisk_small', 'colossus', 'palace'];
export function showcaseBox(world) {
  const found = SHOWCASE.map((t) => Object.values(world.buildings || {}).find((b) => b && b.type === t)).filter(Boolean);
  if (!found.length) return null;
  let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity;
  for (const b of found) {
    const art = ART[slotFor(b, world)], h = art ? art.height : 40;
    l = Math.min(l, p(b.x, b.y + b.d)[0]); r = Math.max(r, p(b.x + b.w, b.y)[0]);
    t = Math.min(t, p(b.x + b.w / 2, b.y + b.d / 2)[1] - h); bt = Math.max(bt, p(b.x + b.w, b.y + b.d)[1]);
  }
  return [l, t, r, bt];
}

// Where on the screen the showcase goes and at what zoom (art-direction review 4, the F2 review): the largest of the four
// bands round the title card (below, beside it on the right or the left, above) that holds the showcase at the largest of
// the sprite cache's zooms (1, 0.75, 0.5), below first when two hold it as large. view { width, height } and card (the
// card's box on screen, CSS px) as getBoundingClientRect gives them. Returns { x, y, zoom }: the screen point (CSS px) the
// showcase's middle goes to.
const FRAME_ZOOMS = [1, 0.75, 0.5];
const FRAME_MARGIN = 10;
export function showcaseFrame(box, view, card) {
  const W = (box[2] - box[0]) * ART_SCALE, H = (box[3] - box[1]) * ART_SCALE, m = FRAME_MARGIN;
  const c = card || { left: view.width / 2, right: view.width / 2, top: view.height / 2, bottom: view.height / 2 };
  const bands = [
    { x: 0, y: c.bottom, w: view.width, h: view.height - c.bottom },
    { x: c.right, y: 0, w: view.width - c.right, h: view.height },
    { x: 0, y: 0, w: c.left, h: view.height },
    { x: 0, y: 0, w: view.width, h: c.top },
  ];
  let best = null;
  for (const band of bands) {
    const fit = Math.min((band.w - 2 * m) / W, (band.h - 2 * m) / H);
    const zoom = FRAME_ZOOMS.find((z) => z <= fit + 1e-9) || 0;
    const score = zoom || fit / 10;                    // none holds it even at 0.5: the band that comes nearest
    if (!best || score > best.score + 1e-9) best = { score, zoom: zoom || FRAME_ZOOMS[FRAME_ZOOMS.length - 1], band };
  }
  const { band, zoom } = best;
  return { x: band.x + band.w / 2, y: band.y + band.h / 2, zoom };
}

// The backdrop's drift points: the first (the one Gentle and Still hold) frames the showcase; the others breathe round it,
// none more than a tile from it, so under Full the camera never leaves the showcase. With a frame ({ x, y, zoom } and
// the view), the first is the camera tile that puts the showcase's middle at that screen point at that zoom. Without
// one (no view yet), it is ten tiles west and thirteen north of the colossus's middle: the band under the card on a
// laptop and a tall phone.
const DRIFT_OFFSETS = [[0, 0], [0.7, -0.7], [0.4, 0.4], [-0.7, 0.7]];
export function driftPoints(world, frame = null, view = null) {
  const clamp = (v) => Math.max(0, Math.min(world.size - 1, v));
  const box = frame && view ? showcaseBox(world) : null;
  let x0, y0;
  if (box) {
    const k = ART_SCALE * frame.zoom, mid = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    const t = artToTile(mid[0] - (frame.x - view.width / 2) / k, mid[1] - (frame.y - view.height / 2) / k);
    [x0, y0] = [t.x, t.y];
  } else [x0, y0] = [world.tradeEntry.x - 1, world.size - 35];
  return DRIFT_OFFSETS.map(([dx, dy]) => [clamp(x0 + dx), clamp(y0 + dy)]);
}

// Stage 4 (spec 5.4, ruling 247, Track E): the backdrop drifts under Full only. reducedMotion() is boot's
// settings.reducedMotion ("anything but Full"), so under Gentle and Still the view holds still, and a drift under way when
// the level leaves Full (the device's setting changed, read live) stops where it is at once; it starts again from the
// next point when Full comes back. Under Full it first holds the showcase for holdMs. view() and card() (the title card's
// box on screen, or null) frame the showcase beside the card: while they change (the card appears, the window turns),
// the points are worked out again, and a view that is not drifting jumps to the new first point.
export function createBackdrop({ world, cam, cameraControl, reducedMotion = () => false, driftMs = TITLE_DRIFT_MS, holdMs = TITLE_HOLD_MS, view = null, card = () => null }) {
  let points = driftPoints(world);
  let i = 0, nextAt = null, holdUntil = null, stopped = false, key = '';
  cameraControl.jumpTo(points[0][0], points[0][1]);
  const reframe = () => {
    const v = view && view(), c = card && card();
    if (!v || !c || !showcaseBox(world)) return;
    const k = [v.width, v.height, c.left, c.top, c.right, c.bottom].map(Math.round).join(',');
    if (k === key) return;
    key = k;
    const frame = showcaseFrame(showcaseBox(world), v, c);
    points = driftPoints(world, frame, v);
    api.points = points;
    if (nextAt === null || reducedMotion()) {          // not drifting: the view moves to the new frame at once
      cam.zoom = frame.zoom;
      i = 0;
      cameraControl.cancel();
      cameraControl.jumpTo(points[0][0], points[0][1]);
    } else cam.zoom = frame.zoom;
  };
  const api = {
    points,
    tick(now) {
      if (stopped) return;
      reframe();
      if (reducedMotion()) {                           // Gentle or Still: the view stays still (spec 5.4)
        if (nextAt !== null) { cameraControl.cancel(); nextAt = null; }
        return;
      }
      if (holdUntil === null) holdUntil = now + holdMs;   // Full: first hold the showcase a while (once)
      if (now < holdUntil || (nextAt !== null && now < nextAt)) return;
      i = (i + 1) % points.length;
      cameraControl.panTo(points[i][0], points[i][1], driftMs);
      nextAt = now + driftMs;
    },
    frame: reframe,                                    // frames the showcase now (boot calls it once the card shows)
    stop() { stopped = true; cameraControl.cancel(); },
  };
  return api;
}
