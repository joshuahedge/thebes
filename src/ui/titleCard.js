// The title card (spec 4.1): Continue, New city with its difficulty and map size under it (spec 4.18), then Lesson, Settings and What's new
// over a paused, slowly drifting sample city; Install and Bring your city only where offered. Version 6.0 (Track D1, rulings 740-747): "This
// week's Nile" and "Play with sound / Play muted" are gone (sound is on by default, Settings mutes it), Settings opens on the card, and the
// size picker has Huge. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS, TITLE_HOLD_MS } from '../data/ui.js';
import { ART, slotFor } from '../render/art/registry.js';
import { p, artToTile, ART_SCALE } from '../render/iso.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { el, button, clear } from './components.js';
import { T, DIFFICULTY_NAMES, difficultyHint, CARDS4_TEXT, S46_MAP_TEXT, S46_UX_TEXT, D1_TEXT, D2_TEXT } from './text.js';
import { MAP_SIZES, MAP_SIZE_IDS, MAP_SIZE_TABLE } from '../data/map.js';
import { versionLine, renderWhatsNew } from './s46/whatsNew.js';   // Stage 4.6 (rulings 401-403): the version line and the What's new panel

// Relaxed, Normal or Hard for the next new city: three pressed-state buttons with the chosen level's line under them.
// Choosing one tells onChoose (boot.js keeps it in settings.difficulty), so the last one used is chosen next time.
function difficultyRow(initial, onChoose) {
  let level = DIFFICULTY_ORDER.includes(initial) ? initial : 'normal';
  const hint = el('p', { class: 'difficulty-hint small muted', id: 'title-difficulty-hint' });
  const choices = DIFFICULTY_ORDER.map((d) => button(DIFFICULTY_NAMES[d], { class: 'choice difficulty', dataset: { value: d }, 'aria-describedby': 'title-difficulty-hint' }));
  const sync = () => { for (const b of choices) b.setAttribute('aria-pressed', String(b.dataset.value === level)); hint.textContent = difficultyHint(level); };
  for (const b of choices) b.addEventListener('click', () => { level = b.dataset.value; sync(); onChoose(level); });
  sync();
  return el('div', { class: 'title-difficulty' }, [
    el('span', { class: 'label small', 'aria-hidden': 'true', text: T.difficulty }),
    el('div', { class: 'choices', role: 'group', 'aria-label': T.difficultyForNewCities }, choices),
    hint,
  ]);
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

// decorate (Stage 3): called once with (element, { buttonBox, newCity }) after the card is built, so the score interface
// adds the records, stamps and a shared score (src/ui/scoreUi.js titleDecor) without editing this file.
// Version 6.0 (Track D1, rulings 742, 747): the third button is Lesson (onLesson, from the guided first city: Track D2) and, until that exists, How to play
// (onHowToPlay, Stage 4 Track G, spec 4.1: boot.js passes hooks.pictureCards), the picture cards; no button without either. Settings (renderSettings(body),
// the same rows as the game's Settings sheet) and What's new open as the card's one panel with Back. screen() is the screen's size in CSS px (a phone is
// told Huge suits a tablet or computer).
export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, difficulty = 'normal', message = null, onContinue, onNewCity, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {}, decorate = null, onHowToPlay = null, onLesson = null, lesson = null, renderSettings = null, mapSize = 'normal', onMapSize = () => {}, screen = null }) {
  const install = button(T.install, { class: 'install', hidden: !canInstall, onClick: onInstall });
  const newCity = button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity });
  // Version 6.0 (Track D2, ruling 617): on a device that has not done the lesson and has no saved city (lesson.due) the card offers the lesson alone
  // (Start the lesson, or Continue the lesson with Start again for one left part-way): no New city, difficulty or size until it has been played.
  // Elsewhere the Lesson button plays it again (lesson.partWay says Continue).
  const lessonOnly = Boolean(lesson && lesson.due && typeof onLesson === 'function');
  const buttons = [];
  if (lessonOnly) {
    buttons.push(button(lesson.partWay ? D2_TEXT.titleContinue : D2_TEXT.titleStart, { class: 'lesson-start primary', onClick: () => onLesson() }));
  } else if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  if (!lessonOnly) buttons.push(newCity);
  const levels = difficultyRow(difficulty, onDifficulty);
  const sizes = sizeRow(mapSize, onMapSize);
  levels.append(sizes);   // Stage 4.6: the size sits with the difficulty under New city
  const lessonExtras = lessonOnly ? [
    el('p', { class: 'lesson-hint small muted', text: D2_TEXT.titleHint }),
    lesson.partWay && typeof lesson.onAgain === 'function' ? button(D2_TEXT.titleAgain, { class: 'lesson-again quiet', onClick: () => lesson.onAgain() }) : null,
  ] : [];
  const more = [];
  if (typeof onLesson === 'function' && !lessonOnly) more.push(button(lesson && lesson.partWay ? D2_TEXT.titleContinue : D1_TEXT.lesson, { class: 'lesson', onClick: () => onLesson() }));
  else if (typeof onHowToPlay === 'function' && !lessonOnly) more.push(button(CARDS4_TEXT.howToPlay, { class: 'how-to-play', onClick: () => onHowToPlay() }));
  if (typeof renderSettings === 'function') more.push(button(T.settings, { class: 'title-settings', onClick: () => showSettings() }));
  more.push(button(S46_UX_TEXT.whatsNew, { class: 'whats-new-button', onClick: () => showWhatsNew() }));   // Stage 4.6 (ruling 402): one panel of releases, newest first
  const bring = canBring ? button(T.bringCity, { class: 'bring', onClick: onBring }) : null;
  const buttonBox = el('div', { class: 'title-buttons' }, [
    ...buttons.flatMap((b) => (b === newCity ? [b, levels] : [b])),   // the choice sits under New city
    ...lessonExtras,
    el('div', { class: 'title-more', role: 'group', 'aria-label': D1_TEXT.titleGroup }, more),
    bring, install,
  ]);
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    versionLine(),   // Stage 4.6 (ruling 401): "Version 4.6 · build 989a650", small
    message ? el('p', { class: 'message coral', text: message }) : null,
    lesson && lesson.note ? el('p', { class: 'lesson-note teal', text: lesson.note }) : null,   // "Your first city stands": back on the title after the lesson
    buttonBox,
  ]);
  let guide = null;
  const showPanelNode = (children) => { guide = el('div', { class: 'guide' }, children); buttonBox.hidden = true; element.append(guide); };
  const showCard = () => { if (guide) { guide.remove(); guide = null; } buttonBox.hidden = false; buttons[0].focus(); };
  const showWhatsNew = () => { showCard(); const body = el('div', { class: 'guide-body' }); const { top } = renderWhatsNew(body, showCard); showPanelNode([body]); top.focus(); };
  // Settings on the card (Version 6.0): the game's own rows (sound, music, text size, motion...), written to the device's settings at once, then Back.
  const showSettings = () => {
    showCard();
    const body = el('div', { class: 'guide-body settings-body' });
    renderSettings(body);
    const back = button(T.back, { class: 'guide-back', onClick: showCard });
    showPanelNode([el('h2', { class: 'settings-head', text: D1_TEXT.settingsPanel }), body, el('div', { class: 'actions' }, [back])]);
    (body.querySelector('button') || back).focus();
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
  const checkPhone = () => sizes.setPhone(isPhoneScreen(screenNow()));
  checkPhone();
  window.addEventListener('resize', checkPhone);
  return {
    element,
    setCanInstall(flag) { install.hidden = !flag; },
    // The install guide takes the buttons' place until Back (iOS, or a browser without the install prompt).
    showGuide(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body);
      const back = button(T.back, { class: 'guide-back', onClick: showCard });
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
    // The line under the tagline: save and import problems the player needs to see on the title.
    setMessage(text) {
      let node = element.querySelector('.message');
      if (!node) { node = el('p', { class: 'message coral' }); element.insertBefore(node, buttonBox); }
      node.textContent = text || '';
      node.hidden = !text;
    },
    showCard,
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
