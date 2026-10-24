// Version 6.0, Track D2: the lesson's in-game part (the guided first city). The seam (src/ui/s46/seam.js shape); Track D2 owns this file.
//
// In a normal game it does only one thing: the picture cards' first moments (src/ui/cardMoments.js). In the lesson (src/boot.js gives the game
// hooks.lessonRun: its starting step, its camera, how to leave and how to finish) it runs the guided first city:
//  - one row in the guidance place under the top bar says the step, its instruction (two or three lines on a phone, with More for the rest and the
//    reason), how far the step has got (a count the sim's own) and Show me (Version 8.0: Leave the lesson is in the ☰ menu, ruling 1171). The goals strip, tips and captions are out of the way (css/ui.css
//    body.lesson-on); alerts stay;
//  - the step's target is lit: the card it asks for and its category carry the guide's "Suggested" tag and ring and every other card is dimmed (still
//    usable), a place on the map is ringed with the rest of the map dimmed round it, and a control (the speed buttons, the gold chip) gets a ring;
//  - it asks the sim (src/sim/lesson.js lessonAt) after every command and every day, and moves on only when the sim shows the step done;
//  - the lesson's end is a sheet, "Your first city stands", and the row's Go to the title button (live while the sheet is not open).
// The step reached is kept in the device's settings (lessonStep), never in the world; the lesson's city is never saved (src/boot.js).
// Version 7.0 (Track P, ruling 1002): a step opens as a card in the middle of the screen (src/ui/lessonCard.js) with the game paused behind it, and docks to the row when
// it is dismissed. Dismissing a step that only waits on the game (src/data/lesson.js `play: 'card'`) plays again at the speed the player had before the card paused it
// (normal speed if none); a step with a part of its own to do (`play: 'act'`) stays paused until that part is done (src/sim/lesson.js actionDone), then plays again by
// itself; a step whose building ends it needs neither (the next card pauses again at once). Placing and the build tray work while paused.
import { seamBase } from '../s46/seam.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../data/lesson.js';
import { LESSON_LENGTH, lessonAt, stepSpot, stepProgress, playWhen, actionBase, actionDone } from '../../sim/lesson.js';
import { setSpeed } from '../../sim/commands.js';
import { lessonFacts } from '../lesson.js';
import { createCardMoments } from '../cardMoments.js';
import { createLessonCard, pictureOf } from '../lessonCard.js';
import { D2_TEXT, P_TEXT, V711_TEXT, T } from '../text.js';
import { el, button, setText } from '../components.js';
import { isCut, writeMore } from '../expand.js';
import { tileToScreen } from '../../render/camera.js';
import { openSheet, isToolMode } from '../modes.js';
import { TOPBAR_PX, freeTop } from '../layout.js';

// The lit ring's reach round a footprint: the footprint's diamond (a tile is 64 px wide and 32 tall at zoom 1, so w + d tiles are (w + d) x 32 px wide and
// (w + d) x 16 tall, and the ring's half-axes are half of that) with this much to spare, in px.
const RING_PAD = 14;
const RING_MIN = { x: 44, y: 30 };
const ringHalf = (spot, k) => { const span = spot.w + spot.d; return { rx: Math.max(RING_MIN.x, span * 16 * k + RING_PAD), ry: Math.max(RING_MIN.y, span * 8 * k + RING_PAD) }; };

// The steps whose alert the row itself carries (the fire, the raid warning and the raid: who, how many, how long, what to build), so the alert's banner does not
// stand over the row saying it twice (css/ui.css body.lesson-names-alert).
const NAMES_ALERT = new Set(['fire', 'tower', 'raid']);

export function createLessonUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const run = ctx.hooks && ctx.hooks.lessonRun;
  const moments = run ? null : createCardMoments(ctx);
  if (!run) return { ...base, onEvents(events) { moments.onEvents(events); }, destroy() { moments.destroy(); } };

  const { world, store, root, settings } = ctx;
  const doc = root.ownerDocument || document, win = doc.defaultView || window;
  const underBar = root.querySelector('#under-bar');
  const phoneNow = () => store.get().layout !== 'wide';

  // ── the row ──
  const label = el('span', { class: 'label small muted' });
  const text = el('span', { class: 'text' });
  const why = el('span', { class: 'why small muted' });
  const chip = el('span', { class: 'chip small', role: 'img' });
  const more = el('button', { type: 'button', class: 'more quiet', 'aria-expanded': 'false', hidden: true });
  const body = el('span', { class: 'body', onClick: () => { if (!more.hidden) toggleOpen(); } }, [label, text, ' ', chip, why, more]);
  const showMe = button(T.showMe, { class: 'show-me quiet', onClick: () => doShowMe() });
  const newCity = button(D2_TEXT.endNew, { class: 'lesson-new primary', hidden: true, onClick: () => run.finish() });
  const row = el('div', { id: 'lesson', class: 'lesson-row', role: 'region', 'aria-label': D2_TEXT.region }, [body, showMe, newCity]);
  const before = underBar ? underBar.querySelector('#goals') : null;
  if (underBar) underBar.insertBefore(row, before);
  root.classList.add('lesson-on');

  // ── the lit target: a scrim with a hole, a ring, and a ring on a control ──
  const scrim = el('div', { class: 'lesson-scrim', 'aria-hidden': 'true', hidden: true });
  const ring = el('div', { class: 'lesson-ring', 'aria-hidden': 'true', hidden: true });
  const ui = root.querySelector('#ui') || root;
  ui.insertBefore(ring, ui.firstChild);
  ui.insertBefore(scrim, ui.firstChild);

  let at = lessonAt(world, run.step || 0);
  let facts = null, step = null, open = false, finished = false, needPause = false, announceNext = true, endShown = false, destroyed = false, key = '', litSel = null, shownAt = -1;
  // The step card and the clock (ruling 1002): cardAt the step it was last shown for, held the speed the player had before it paused the game, actBase what an 'act' step
  // counts its own part from, actResumed whether that part has already played the game on again.
  // Version 7.1 (ruling 1066): showing is true while a step's card is being brought up: holdForCard's pause runs afterCommand and onCommand, which calls sync() again before the card is up,
  // and that nested sync must not take a step whose part is already done for one that has been played through (it would play the game on behind the card).
  // Version 7.1.1 (ruling 1102): a card never comes up while the player is in the middle of a step's action: a finger down on the map, or a road, plots or a demolish stroke drawn and not
  // yet laid. cardWaits: the card of the step the city is at is waiting for that to end (the row shows the step meanwhile); the frame and the store's changes bring it up.
  let touching = false, cardWaits = false;
  const midAction = () => { const s = store.get(); return touching || Boolean(s.line || s.area || s.plan); };
  const mapOf = (ev) => Boolean(ev.target && typeof ev.target.closest === 'function' && ev.target.closest('#map'));
  const onDown = (ev) => { if (mapOf(ev)) touching = true; };
  const onUp = () => { touching = false; };
  doc.addEventListener('pointerdown', onDown, true);
  doc.addEventListener('pointerup', onUp, true);
  doc.addEventListener('pointercancel', onUp, true);
  let cardAt = -1, held = null, actBase = null, actResumed = false, showing = false;

  const persist = () => { if (!settings.get().lessonDone) settings.set({ lessonStep: Math.min(at, LESSON_LENGTH) }); };

  // A step coming up is said once to a screen reader, politely (the alerts' own announcer, #live); the row's words change every day (a count, the days to a raid), so the row itself is not a live region.
  const live = root.querySelector('#live');
  function announce() { if (live) live.textContent = `${label.textContent} ${text.textContent}`.trim(); }
  function toggleOpen() { open = !open; paintOpen(); }
  function paintOpen() {
    row.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    measure();
  }
  // "More ▾" shows while a phone cuts the words (css/ui.css cuts the label, the words and the count together at three lines), "Less ▴" while open; measured with the control hidden, so it never decides its own need.
  function measure() {
    more.hidden = true;
    const cut = !open && isCut(body);
    if (cut || open) { writeMore(more, open); more.hidden = false; }
  }

  // Which card and category the step asks for (the bazaar's, when it has been taken down and the step needs it).
  function targetOf() {
    if (!step) return null;
    if (facts && facts.missing === 'bazaar') return { category: 'services', item: 'bazaar', spot: { x: LESSON_PLACES.bazaar[0], y: LESSON_PLACES.bazaar[1], w: 2, d: 2 } };
    return step.show ? { ...step.show, spot: stepSpot(world, step) } : null;
  }

  function doShowMe() {
    const t = targetOf();
    if (!t || !t.spot) return;
    ctx.showMeAt({ category: t.category, item: t.item, x: t.spot.x + t.spot.w / 2, y: t.spot.y + t.spot.d / 2 });
  }

  // Version 7.1.1 (ruling 1112): the first card's "Skip, I've played before" asks its own question (like Leave the lesson) and then marks the lesson done and goes on to a city of
  // the player's own (src/boot.js skipLesson); it names the title instead when a saved city is there, which a fresh city would take the place of.
  function askSkip() {
    const toTitle = typeof run.skipTo === 'function' && run.skipTo() === 'title';
    store.set({ confirmDialog: { text: toTitle ? V711_TEXT.skipConfirmTitle : V711_TEXT.skipConfirm, confirmLabel: V711_TEXT.skip, onConfirm: () => run.skip() } });
  }

  // ── the step card and the clock (ruling 1002) ──
  const keysOn = () => settings.get().keyboardShortcuts !== false;
  const card = createLessonCard({ root, doc, store, onGo: () => dismissCard(), onSkip: () => askSkip(), keys: keysOn });

  // The card pauses the game, remembering the speed it was playing at (the player's own, kept through the cards that follow while it stays paused).
  function holdForCard(building) {
    if (world.speed > 0) held = world.speed;
    if (world.speed === 0) return;
    if (building || !ctx.speedControl) setSpeed(world, 0); else ctx.speedControl.set(0);   // building: the interface is still being made, so no command's afterCommand yet
  }
  // Plays again at the speed the player had before the lesson paused it, normal speed if none; only from a pause (a player who pressed Play already is left alone).
  function resumePlay() {
    if (world.speed !== 0 || destroyed) return;
    const to = held || store.get().lastSpeed || 1;
    if (ctx.speedControl) ctx.speedControl.set(to); else setSpeed(world, to);
  }

  // A step begins: its card says the step (a step that waits on the game asks for Play, the rest for Show me, or Got it with nothing to show), and the game waits behind it.
  function showCard(building) {
    if (!step || finished) return;
    cardAt = at; actBase = actionBase(world); actResumed = false;
    const mode = playWhen(world, step);
    showing = true;
    try { holdForCard(building); } finally { showing = false; }
    const t = targetOf();
    const words = D2_TEXT.steps[step.id](lessonFacts(world, step));   // a waiting step says "Press Play" (the game is held, lessonFacts.paused): its button is Play; the others play on by themselves, as their docked row says too
    // Ruling 1115: a placing, road or demolish tool still on from the step just done (it stays on after a placement) is put away as Cancel does, so the bar behind the card never shows a
    // refusal for the plot just laid; the step's own Show me starts its tool afresh.
    if (isToolMode(store.get().mode) && typeof ctx.cancelPlacing === 'function') ctx.cancelPlacing();
    if (ctx.toasts && typeof ctx.toasts.dropLoose === 'function') ctx.toasts.dropLoose();   // ruling 1100: no timed toast stays up under a card
    const first = at === 0;   // ruling 1110: the first card opens with the game's goal, and offers Skip, I've played before
    card.show({ label: D2_TEXT.lessonLabel(at + 1, LESSON_LENGTH), text: first ? `${V711_TEXT.goal()} ${words.text}` : words.text, skipOffered: first && typeof run.skip === 'function', goLabel: mode === 'card' ? P_TEXT.card.play : t ? P_TEXT.card.showMe : P_TEXT.card.gotIt, picture: pictureOf(step) });
    announceNext = false;   // the dialog is read as it takes focus
  }
  // The card closes (its button, Enter, Space or Esc): the step docks to its row; a waiting step plays on, the others point at their place as Show me does.
  function dismissCard() {
    if (!card.isUp()) return;
    card.hide();
    if (playWhen(world, step) === 'card') resumePlay(); else doShowMe();
    if (step && !finished && !actResumed && playWhen(world, step) === 'act' && actionDone(world, step, actBase)) { actResumed = true; resumePlay(); }   // its own part was already done when the card came up (a firehouse built early): it plays on now the card is gone (ruling 1066)
    // Ruling 821's lesson, for the step's own Show me: held sideways at large text the card's tool leaves its overlay and legend over a row of the same height, with no map
    // between (the firehouse's Fire risk), so the overlay stays off there; the player turns it on from Layers.
    if (store.get().layout === 'compact' && Number(settings.get().textSize) >= 125 && store.get().overlay) store.set({ overlay: null });
    paintOpen();
    const focus = row.querySelector('.show-me:not([hidden])') || root.querySelector('#topbar .menu');
    if (focus && focus.offsetParent !== null) focus.focus();
  }

  // The dock's cards and categories, as the guided start marks them (src/ui/guide.js): the step's card ringed and tagged, the rest dimmed.
  function dim() {
    const t = finished ? null : targetOf();
    const item = t ? t.item : null, category = t ? t.category : null;
    for (const card of root.querySelectorAll('.card[data-item]')) {
      const on = Boolean(item) && card.dataset.item === item;
      card.classList.toggle('suggested', on);
      card.classList.toggle('lesson-pulse', on);   // Version 8.0 (ruling 1171): the same ring the map's target wears, pulsing under Full motion (css/ui.css, 8.0 N)
      card.classList.toggle('dimmed', Boolean(item) && !on);
      const tag = card.querySelector('.tag');
      if (on && !tag) card.append(el('span', { class: 'tag', text: T.suggested }));
      if (!on && tag) tag.remove();
    }
    for (const b of root.querySelectorAll('.cat[data-category], .tab[data-category]')) {
      const on = Boolean(category) && b.dataset.category === category;
      b.classList.toggle('suggested', on);
      b.classList.toggle('lesson-pulse', on);
      b.classList.toggle('dimmed', Boolean(category) && !on);
    }
  }

  // The words, the count and the buttons for the step the city is at.
  function paint() {
    step = at < LESSON_LENGTH ? LESSON_STEPS[at] : null;
    facts = lessonFacts(world, step);
    if (!step) {
      setText(label, ''); setText(text, D2_TEXT.endRow); setText(why, ''); chip.hidden = true;
      showMe.hidden = true; paintEnd();
      row.dataset.step = 'end';
    } else {
      const words = D2_TEXT.steps[step.id](facts);
      const p = stepProgress(world, step);
      setText(label, D2_TEXT.lessonLabel(at + 1, LESSON_LENGTH));
      setText(text, words.text);
      setText(why, words.why);
      chip.hidden = !p;
      if (p) { setText(chip, D2_TEXT.progress(p.n, p.of)); chip.setAttribute('aria-label', D2_TEXT.progress(p.n, p.of)); }
      const t = targetOf();
      showMe.hidden = !t;
      if (t) showMe.setAttribute('aria-label', `${T.showMe}: ${words.text}`);
      newCity.hidden = true;
      row.dataset.step = step.id;
    }
    root.classList.toggle('lesson-names-alert', Boolean(step) && NAMES_ALERT.has(step.id));
    dim();
    measure();
  }

  // Version 6.0.1 (ruling 821): a step begins on a clear map. The tool that finished the step before leaves things over the map: the overlay its card or Show me
  // turned on (a firehouse's Fire risk, a well's Water) with its legend, a second panel under the top bar beside the lesson's row, and on a phone the build tray it
  // was picked from. Held sideways at large text the two hid the whole map (the staged fire: the bazaar ringed, the rest dimmed, no map left to pan), so as a new
  // step comes the overlay goes off, and a phone's tray folds when the step asks for no card (the fire, the months, the raid: steps that wait on the sim and want
  // the map). A step with a card keeps the tray, since its Show me opens it anyway. The player can turn either back on at once.
  function clearForStep() {
    const s = store.get(), next = at < LESSON_LENGTH ? LESSON_STEPS[at] : null;
    const patch = {};
    if (s.overlay) patch.overlay = null;
    if (phoneNow() && s.dock === 'tray' && !(next && next.show)) patch.dock = 'slim';
    if (Object.keys(patch).length) store.set(patch);
  }

  // The row's way out at the end ("Go to the title") is live only while the end sheet is not open: under the sheet it would be a second button behind it (a tap
  // through the sheet's edge, a Tab into it), and the sheet has the same button.
  const endSheetOpen = () => { const s = store.get().sheet; return Boolean(s) && s.kind === 'lessonEnd'; };
  function paintEnd() { newCity.hidden = !finished || endSheetOpen(); }

  // Where the sim says the lesson is: moves on through every step it shows done, stages what the next one stages, says so with a sound, and ends.
  function sync(building = false) {
    if (destroyed) return;
    const next = lessonAt(world, at);
    if (next !== at) {
      at = next;
      persist();
      if (!building) clearForStep();
      if (ctx.sfx) { ctx.sfx.play('goal'); if (ctx.sfx.buzz) ctx.sfx.buzz(20); }
      open = false; paintOpen();
      shownAt = -1;
      announceNext = true;
    }
    if (at >= LESSON_LENGTH && !finished) {
      finished = true;
      needPause = true;
      settings.set({ lessonDone: true, lessonStep: LESSON_LENGTH, cardsSeen: true });
    }
    if (needPause && !building && ctx.speedControl) { needPause = false; ctx.speedControl.set(0); }   // a command: not while the interface is still being built
    paint();
    cardWaits = false;
    if (!finished && step && cardAt !== at) { if (midAction()) cardWaits = true; else showCard(building); }
    else if (finished && card.isUp()) card.hide();
    // The player's own part of a step that has one is done: the game plays again by itself (ruling 1002).
    if (!card.isUp() && !showing && step && !finished && !actResumed && playWhen(world, step) === 'act' && actionDone(world, step, actBase)) { actResumed = true; resumePlay(); }
    if (announceNext) { announceNext = false; announce(); }
    // The end sheet opens once nothing else is open, and never while the interface is still being built (its sheets are made after its seams: a lesson begun
    // at the end, a dev scene's, opens it at the first refresh instead).
    if (finished && !building && !endShown && !store.get().sheet && !store.get().confirmDialog) { endShown = true; store.set(openSheet(store.get(), 'lessonEnd')); }
    ensureVisible();
  }

  // The map the interface leaves free, as insets from the screen's edges in px (createUI's sheetInsets is private to it, so the same parts are read here): a wide screen's
  // top bar and side panel (320 px, 56 folded), a landscape phone's rows under the top bar (measured) and rail, a portrait phone's band between the rows above and the dock
  // below (about a third of its height each way).
  function freeInsets(v) {
    const layout = store.get().layout;
    if (layout === 'wide') { const p = root.querySelector('#panel'); return { top: TOPBAR_PX, right: p && p.offsetWidth ? p.offsetWidth : 320, bottom: 0, left: 0 }; }
    if (layout === 'compact') { const r = root.querySelector('#rail'); return { top: freeTop(root, root.querySelector('#map'), layout), right: r && r.offsetWidth ? r.offsetWidth : 56, bottom: 0, left: 0 }; }
    return { top: v.height * 0.3, right: 0, bottom: v.height * 0.34, left: 0 };
  }

  // A step's target is brought into the middle of the free map once, when the step begins, if its ring does not already sit well inside it (a ring wider than the
  // free map only needs its centre): a glide, as Show me's is (a jump under Still).
  // Version 8.0 (Track N, ruling 1170): the view follows each step's own target. 7.1.1 moved it only when the target was off the free map, so the tower step (its tile is four tiles from the bazaar,
  // which the fire and raid steps aim at) left the view where the bazaar had put it, the ring somewhere else. Now every step that points at a place frames that place in the middle of the free map
  // as it begins, as Show me does (a step about the whole city leaves the view alone).
  function ensureVisible() {
    if (finished || shownAt === at || !step || !ctx.cameraControl) return;
    const spot = stepSpot(world, step);
    shownAt = at;
    if (!spot || !run.cam) return;
    const v = viewOf(), cx = spot.x + spot.w / 2, cy = spot.y + spot.d / 2, i = freeInsets(v);
    const go = () => ctx.cameraControl.frameKeeping(cx, cy, cx, cy, i);
    if (typeof ctx.cameraControl.glide === 'function') ctx.cameraControl.glide(go); else go();
  }

  const viewOf = () => { const c = ctx.cameraControl.centre(); return { width: c.x * 2, height: c.y * 2 }; };

  // Once a frame: the ring and the dimming follow the camera, and the control's ring follows its element (the top bar draws its controls afresh).
  function layout() {
    const spot = step && !finished && !card.isUp() ? stepSpot(world, step) : null;   // under the step card the map is dimmed by the card's own layer
    if (!spot || !run.cam) { scrim.hidden = true; ring.hidden = true; }
    else {
      const v = viewOf();
      const [sx, sy] = tileToScreen(run.cam, v, spot.x + spot.w / 2, spot.y + spot.d / 2);
      const { rx, ry } = ringHalf(spot, run.cam.zoom);
      const k2 = [Math.round(sx), Math.round(sy), Math.round(rx), Math.round(ry)].join(',');
      if (k2 !== key || scrim.hidden) {
        key = k2;
        scrim.hidden = false; ring.hidden = false;
        scrim.style.setProperty('--cx', `${sx}px`); scrim.style.setProperty('--cy', `${sy}px`);
        scrim.style.setProperty('--rx', `${rx * 1.18}px`); scrim.style.setProperty('--ry', `${ry * 1.18}px`);
        Object.assign(ring.style, { left: `${sx - rx}px`, top: `${sy - ry}px`, width: `${2 * rx}px`, height: `${2 * ry}px` });
      }
    }
    const sel = step && step.dom && !finished ? step.dom : null;
    if (sel !== litSel) { for (const n of root.querySelectorAll('.lesson-lit')) n.classList.remove('lesson-lit'); litSel = sel; }
    if (sel) for (const n of root.querySelectorAll(sel)) if (!n.classList.contains('lesson-lit')) n.classList.add('lesson-lit');
    const v = viewOf(), mk = `${v.width}x${v.height}|${settings.get().textSize}|${store.get().layout}|${at}`;
    if (mk !== layout.mk) { layout.mk = mk; measure(); }
    if (cardWaits && !midAction() && !destroyed) sync();
  }
  let raf = win.requestAnimationFrame ? win.requestAnimationFrame(function frame() { raf = win.requestAnimationFrame(frame); layout(); }) : 0;

  // ── the end sheet ──
  function endSheet(sheetBody, { close, setTitle }) {
    setTitle(D2_TEXT.endTitle);
    const raidWon = Boolean(world.raid.last && world.raid.last.won);
    let people = 0;
    for (const b of Object.values(world.buildings)) if (b.type === 'house') people += b.residents || 0;
    sheetBody.append(el('div', { class: 'lesson-end' }, [
      el('p', { class: 'lead', text: D2_TEXT.endBody({ people, won: raidWon }) }),
      el('p', { class: 'small muted', text: D2_TEXT.endMore }),
    ]));
    sheetBody.append(el('div', { class: 'actions' }, [
      button(D2_TEXT.endNew, { class: 'lesson-new-city primary', onClick: () => run.finish() }),
      button(D2_TEXT.endStay, { class: 'lesson-stay', onClick: close }),
    ]));
  }

  const stop = store.subscribe(() => { if (!destroyed) { dim(); if (finished) paintEnd(); if (cardWaits && !midAction()) sync(); } });
  sync(true);
  return {
    ...base,
    sheets: { lessonEnd: endSheet },
    onEvents() { sync(); },
    onCommand() { sync(); },
    refresh() { sync(); },
    destroy() {
      destroyed = true;
      stop();
      if (raf && win.cancelAnimationFrame) win.cancelAnimationFrame(raf);
      doc.removeEventListener('pointerdown', onDown, true); doc.removeEventListener('pointerup', onUp, true); doc.removeEventListener('pointercancel', onUp, true);
      row.remove(); scrim.remove(); ring.remove(); card.destroy();
      for (const n of root.querySelectorAll('.lesson-lit, .lesson-pulse')) n.classList.remove('lesson-lit', 'lesson-pulse');
      root.classList.remove('lesson-on', 'lesson-names-alert');
    },
  };
}
