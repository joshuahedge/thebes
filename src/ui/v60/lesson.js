// Version 6.0, Track D2: the lesson's in-game part (the guided first city). The seam (src/ui/s46/seam.js shape); Track D2 owns this file.
//
// In a normal game it does only one thing: the picture cards' first moments (src/ui/cardMoments.js). In the lesson (src/boot.js gives the game
// hooks.lessonRun: its starting step, its camera, how to leave and how to finish) it runs the guided first city:
//  - one row in the guidance place under the top bar says the step, its instruction (two or three lines on a phone, with More for the rest and the
//    reason), how far the step has got (a count the sim's own) and Show me (Version 8.0: Leave the lesson is in the ☰ menu, ruling 1171). The goals strip, tips and captions are out of the way (css/ui.css
//    body.lesson-on); alerts stay;
//  - the step's target is lit: the card it asks for and its category carry the guide's "Suggested" tag and ring, a place on the map is ringed with the rest of the map
//    dimmed round it, and a control (the speed buttons, the gold chip) gets a ring;
//  - it asks the sim (src/sim/lesson.js lessonAt) after every command and every day, and moves on only when the sim shows the step done.
// The step reached is kept in the device's settings (lessonStep), never in the world.
// Version 7.0 (Track P, ruling 1002): a step opens as a card in the middle of the screen (src/ui/lessonCard.js) with the game paused behind it, and docks to the row when
// it is dismissed. Dismissing a step that only waits on the game (src/data/lesson.js `play: 'card'`) plays again at the speed the player had before the card paused it
// (normal speed if none); a step with a part of its own to do (`play: 'act'`) stays paused until that part is done (src/sim/lesson.js actionDone), then plays again by
// itself; a step whose building ends it needs neither. Placing and the build tray work while paused.
//
// Version 8.1 "The vizier" (Track T, rulings 1200-1219), the lesson made foolproof (design 3 and 7b):
//  - Chapters (src/data/lesson.js LESSON_CHAPTERS), one idea each. Only a chapter's first step opens with the card (the chapter's name and why, then the step's do), and
//    pauses; the steps inside a chapter are said by Ipi in the docked row (now Ipi's bubble: the portrait, the why, the do) and do not pause.
//  - After each step Ipi reacts in one line naming what was done, with a gold glow on it and the step's soft chime; it fades by itself (BEAT_MS). The reaction to a
//    chapter's last step leads the next chapter's card instead (ruling 1207), so nothing waits on it and no bubble stands under a card.
//  - The lock (src/ui/v81/lessonLock.js): only the step's own controls stay live, the rest is dimmed and refuses taps, and a tap on a dimmed control gets one line from
//    Ipi pinned beside it. The map always pans and zooms.
//  - The end: the lesson's city becomes the player's own (run.adopt, src/boot.js): Ipi hands over and the first real goal shows (ruling 1208). A device with a saved city
//    keeps the end sheet, since the lesson's city must not take that city's place (ruling 1209).
import { seamBase } from '../s46/seam.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../data/lesson.js';
import { MILESTONES } from '../../data/progression.js';
import { LESSON_LENGTH, LESSON_CHAPTER_COUNT, chapterAt, lessonAt, stepSpot, stepProgress, playWhen, actionBase, actionDone, homesOnRoad, homesReached, workingTypes, gateRoadTiles } from '../../sim/lesson.js';
import { population } from '../../sim/world.js';
import { monthIndex } from '../../sim/clock.js';
import { workingTowers } from '../../sim/raids.js';
import { setSpeed } from '../../sim/commands.js';
import { lessonFacts } from '../lesson.js';
import { createCardMoments } from '../cardMoments.js';
import { createLessonCard, pictureOf } from '../lessonCard.js';
import { D2_TEXT, P_TEXT, V711_TEXT, T } from '../text.js';
import { V81T_TEXT } from '../v81/lessonText.js';
import { mountScribe, unmountScribe, say, hush, portrait } from '../v81/scribe.js';
import { lockTo, unlock } from '../v81/lessonLock.js';
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

// Version 8.1 (ruling 1206): how long Ipi's reaction to a step stays in the docked bubble before the step that follows takes its place (design: "fades by itself after
// 2 to 3 seconds").
export const BEAT_MS = 2600;
const REFUSED_MS = 2600;

// The controls a step leaves live (ruling 1204, src/data/lesson.js `lock`): its card and category, the speed control for a step about time (one with a `play`), what its
// `lock` names, and always the menu, where Leave the lesson is (ruling 1171), and the papyrus, where the messages are (design 7b locks the stats, not the messages).
export function lockFor(step) {
  if (!step) return [];
  const ids = ['menu', 'papyrus'];
  if (step.show) ids.push(`tray-cat-${step.show.category}`, `tray-item-${step.show.item}`, 'tray-handle', 'tray-pill');   // ruling 1261: the tray that holds the step's card opens and folds
  if (step.play) ids.push('speed');
  if (step.lock) ids.push(...step.lock);
  return ids;
}

// What a step's reaction names, from the sim now (src/ui/v81/lessonText.js beats).
export function beatFacts(world) {
  return {
    roads: gateRoadTiles(world), homes: homesOnRoad(world), well: homesReached(world, 'well'), bazaar: homesReached(world, 'bazaar'), people: population(world),
    months: monthIndex(world), gold: Math.floor(world.gold), towers: workingTowers(world), won: Boolean(world.raid.last && world.raid.last.won),
    burned: (world.tally.blazesOut || 0) === 0 && (world.tally.firesOut || 0) === 0, working: workingTypes(world, ['farm_grain', 'granary', 'bazaar']).length,
  };
}
export const beatText = (world, step) => (step && V81T_TEXT.beats[step.id] ? V81T_TEXT.beats[step.id](beatFacts(world)) : '');

// Whether the placing tool in hand is the one a step's card gives.
const toolIs = (tool, item) => Boolean(tool) && Boolean(item) && (item === 'road' ? tool.kind === 'road' : item === 'house' ? tool.kind === 'houses' : tool.type === item);

export function createLessonUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const run = ctx.hooks && ctx.hooks.lessonRun;
  if (ctx.root) mountScribe(ctx.root);
  const moments = run ? null : createCardMoments(ctx);
  // Rank-ups (design 2): one line from Ipi as the milestone is reached (its caption says the rank; Ipi says what it means to the king).
  const rankUps = (events) => {
    for (const e of events || []) {
      if (e.type !== 'milestone') continue;
      const m = MILESTONES.find((x) => x.id === e.id);
      if (m) say(V81T_TEXT.rankUp(m.name), { ms: 6000 });
    }
  };
  if (!run) return { ...base, onEvents(events) { moments.onEvents(events); rankUps(events); }, destroy() { moments.destroy(); unmountScribe(); } };

  const { world, store, root, settings } = ctx;
  const doc = root.ownerDocument || document, win = doc.defaultView || window;
  const underBar = root.querySelector('#under-bar');
  const phoneNow = () => store.get().layout !== 'wide';

  // ── the row: Ipi's docked bubble ──
  const label = el('span', { class: 'label small muted' });
  const ipiWhy = el('span', { class: 'ipi-why' });
  const text = el('span', { class: 'text' });
  const why = el('span', { class: 'why small muted' });
  const chip = el('span', { class: 'chip small', role: 'img' });
  const more = el('button', { type: 'button', class: 'more quiet', 'aria-expanded': 'false', hidden: true });
  const beatLine = el('span', { class: 'beat-line' });   // Ipi's reaction to the step just done takes the why's place for its beat (ruling 1206); the next step's do stays in sight
  const body = el('span', { class: 'body', onClick: () => { if (!more.hidden) toggleOpen(); } }, [label, beatLine, text, ' ', chip, ' ', ipiWhy, why, more]);   // the do leads (ruling 822: a phone cuts the row at three lines), then Ipi's why
  const showMe = button(T.showMe, { class: 'show-me quiet', onClick: () => doShowMe() });
  const newCity = button(D2_TEXT.endNew, { class: 'lesson-new primary', hidden: true, onClick: () => run.finish() });
  const face = portrait(36);
  face.classList.add('lesson-face');
  const row = el('div', { id: 'lesson', class: 'lesson-row', role: 'region', 'aria-label': D2_TEXT.region }, [face, body, showMe, newCity]);
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
  // Version 8.1 (ruling 1210): a finger counts as down only while the browser says so: a press whose lift never reached the page (a pinch the browser took, a tab hidden
  // mid-press) is forgotten at the next press anywhere and after TOUCH_STALE_MS, so a card can never wait for ever behind a stale press.
  const TOUCH_STALE_MS = 4000;
  let touching = false, touchedAt = 0, cardWaits = false;
  const pressed = () => touching && Date.now() - touchedAt < TOUCH_STALE_MS;
  const midAction = () => { const s = store.get(); return pressed() || Boolean(s.line || s.area || s.plan); };
  const mapOf = (ev) => Boolean(ev.target && typeof ev.target.closest === 'function' && ev.target.closest('#map'));
  const onDown = (ev) => { touching = mapOf(ev); touchedAt = Date.now(); };
  const onUp = () => { touching = false; };
  doc.addEventListener('pointerdown', onDown, true);
  doc.addEventListener('pointerup', onUp, true);
  doc.addEventListener('pointercancel', onUp, true);
  let cardAt = -1, held = null, actBase = null, actResumed = false, showing = false;
  // The reaction (ruling 1206): what it says, the place it glows on, and its timer; leadBeat is a reaction carried into the next chapter's card (ruling 1207).
  let beatSpot = null, beatTimer = 0, leadBeat = '';

  const persist = () => { if (!settings.get().lessonDone) settings.set({ lessonStep: Math.min(at, LESSON_LENGTH) }); };

  // A step coming up is said once to a screen reader, politely (the alerts' own announcer, #live); the row's words change every day (a count, the days to a raid), so the row itself is not a live region.
  const live = root.querySelector('#live');
  function announce(words = `${label.textContent} ${ipiWhy.textContent} ${text.textContent}`) { if (live) live.textContent = words.trim(); }
  function toggleOpen() { open = !open; paintOpen(); }
  function paintOpen() {
    row.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    measure();
  }
  // "More ▾" shows while a phone cuts the words (css/ui.css cuts the label, the words and the count together at three lines), "Less ▴" while open; measured with the control hidden, so it never decides its own need.
  // Version 8.1: Ipi's why and do lead the row; the long reason (the lesson's 7.0 words, with the sim's numbers) follows them on a wide screen and behind More on a phone.
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
    store.set({ confirmDialog: { text: toTitle ? V711_TEXT.skipConfirmTitle : V711_TEXT.skipConfirm, confirmLabel: V711_TEXT.skip, destructive: false, onConfirm: () => run.skip() } });   // nothing is lost: primary, not coral (Version 8.0, ruling 1176)
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

  // Ruling 1115: a placing, road or demolish tool still on from the step just done (it stays on after a placement) is put away as Cancel does, so the bar never shows a
  // refusal for the plot just laid; the step's own Show me starts its tool afresh. Version 8.1: the step's own tool, already in hand, is kept.
  function putAwayTool() {
    const s = store.get();
    if (!isToolMode(s.mode) || typeof ctx.cancelPlacing !== 'function') return;
    const t = targetOf();
    if (t && toolIs(s.tool, t.item)) return;
    ctx.cancelPlacing();
  }

  // A chapter begins: its card says the chapter's name and why, then the step's do (a step that waits on the game asks for Play, the rest for Show me, or Got it with
  // nothing to show), and the game waits behind it. The reaction to the chapter just finished leads it (ruling 1207).
  function showCard(building) {
    if (!step || finished) return;
    cardAt = at; actBase = actionBase(world); actResumed = false;
    const mode = playWhen(world, step);
    showing = true;
    try { holdForCard(building); } finally { showing = false; }
    const t = targetOf();
    const ch = chapterAt(at), chapter = V81T_TEXT.chapters[ch.id];
    const words = V81T_TEXT.steps[step.id](lessonFacts(world, step));   // a waiting step says "Press Play" (the game is held, lessonFacts.paused): its button is Play
    putAwayTool();
    if (ctx.toasts && typeof ctx.toasts.dropLoose === 'function') ctx.toasts.dropLoose();   // ruling 1100: no timed toast stays up under a card
    hush(); endBeat(false);
    const first = at === 0;   // ruling 1110: the first card opens with the game's goal, and offers Skip, I've played before
    const said = (first ? [V711_TEXT.goal(), words.do] : [chapter.why, words.do]).join(' ');   // the first card: the story's goal is its why
    const beat = leadBeat;
    leadBeat = '';
    card.show({ label: V81T_TEXT.chapterLabel(ch.index + 1, LESSON_CHAPTER_COUNT, chapter.name), text: said, beat, skipOffered: first && typeof run.skip === 'function', goLabel: mode === 'card' ? P_TEXT.card.play : t ? P_TEXT.card.showMe : P_TEXT.card.gotIt, picture: pictureOf(step) });
    announceNext = false;   // the dialog is read as it takes focus
  }
  // A step inside a chapter begins without a card and without a pause (design 7b): Ipi's bubble says it, and an 'act' step counts its part from now.
  function enterMicro() {
    cardAt = at; actBase = actionBase(world); actResumed = false;
    if (!midAction()) putAwayTool();
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
    // Focus goes to Show me, else to the step's own target when that is a button (the month's gold), never to the menu beside the bar's stats (8.1 integration).
    const own = step && step.dom ? root.querySelector(step.dom) : null;
    const focus = row.querySelector('.show-me:not([hidden])') || (own && own.tagName === 'BUTTON' ? own : null);
    if (focus && focus.offsetParent !== null) focus.focus();
  }

  // ── the reaction (ruling 1206) ──
  function startBeat(done) {
    const words = beatText(world, done);
    if (!words) return;
    const next = chapterAt(at);
    if (at < LESSON_LENGTH && next && next.first) { leadBeat = words; return; }   // the next chapter's card leads with it (ruling 1207)
    clearTimeout(beatTimer);
    setText(beatLine, words);
    row.classList.add('beat-on');
    row.classList.remove('refused');
    beatSpot = stepSpot(world, done);
    announce(V81T_TEXT.scribeSays(words));
    announceNext = false;
    beatTimer = setTimeout(() => endBeat(true), BEAT_MS);
  }
  function endBeat(speak) {
    clearTimeout(beatTimer); beatTimer = 0;
    if (!row.classList.contains('beat-on')) return;
    row.classList.remove('beat-on', 'refused');
    beatSpot = null;
    if (speak && !destroyed && !finished) announce();
  }
  const beating = () => row.classList.contains('beat-on');

  // ── the lock (ruling 1200) ──
  // Integration (ruling 1263): Ipi speaks in one place at a time. The line for a dimmed control takes the why's place in the docked bubble for REFUSED_MS, as a reaction does
  // (the step's do stays in sight), then the why comes back; only where the row is not on screen does the line go to a bubble of its own beside the control.
  function onRefused(id, node) {
    const ch = chapterAt(Math.min(at, LESSON_LENGTH - 1));
    const words = V81T_TEXT.refused(ch ? ch.id : '');
    if (row.offsetParent === null || card.isUp()) { say(words, { anchor: node && node.isConnected ? node : null, ms: REFUSED_MS }); return; }
    hush();
    clearTimeout(beatTimer);
    setText(beatLine, words);
    row.classList.add('beat-on', 'refused');
    beatSpot = null;
    announce(V81T_TEXT.scribeSays(words));
    beatTimer = setTimeout(() => endBeat(false), REFUSED_MS);
  }
  function applyLock() {
    if (finished || destroyed || !step) { unlock(); return; }
    lockTo(lockFor(facts && facts.missing === 'bazaar' ? { ...step, show: { category: 'services', item: 'bazaar' } } : step), { root, onRefused });
  }

  // The dock's cards and categories, as the guided start marks them (src/ui/guide.js): the step's card ringed and tagged. Version 8.1: the dimming is the lock's (ruling 1200).
  function dim() {
    const t = finished ? null : targetOf();
    const item = t ? t.item : null, category = t ? t.category : null;
    for (const c of root.querySelectorAll('.card[data-item]')) {
      const on = Boolean(item) && c.dataset.item === item;
      c.classList.toggle('suggested', on);
      c.classList.toggle('lesson-pulse', on);   // Version 8.0 (ruling 1171): the same ring the map's target wears, pulsing under Full motion (css/ui.css, 8.0 N)
      c.classList.toggle('dimmed', Boolean(item) && !on);
      const tag = c.querySelector('.tag');
      if (on && !tag) c.append(el('span', { class: 'tag', text: T.suggested }));
      if (!on && tag) tag.remove();
    }
    for (const b of root.querySelectorAll('.cat[data-category], .tab[data-category]')) {
      const on = Boolean(category) && b.dataset.category === category;
      b.classList.toggle('suggested', on);
      b.classList.toggle('lesson-pulse', on);
      b.classList.toggle('dimmed', Boolean(category) && !on);
    }
  }
  // Integration (ruling 1261): the ringed card is scrolled into its tray's sight once each time the step, the category or the tray's state changes (a tray of all a city has
  // unlocked can hold it past the edge: the tower behind the walls), so the player sees the ring without hunting; between those the player's own scrolling is left alone.
  // Run from the frame, after the tray has drawn its cards.
  function cardInSight() {
    const t = finished ? null : targetOf(), item = t ? t.item : null;
    const s = store.get(), seen = `${at}|${item}|${s.category}|${s.dock}|${s.layout}|${s.mode}`;
    if (!item || seen === cardInSight.seen) return;
    const card = [...root.querySelectorAll(`.card.lesson-pulse[data-item="${item}"]`)].find((c) => c.getClientRects().length > 0);
    if (card) { cardInSight.seen = seen; bringIntoView(card); }
  }
  function bringIntoView(card) {
    const box = card.closest('#dock .tray, #panel .cards, #rail .drawer');
    if (!box) return;
    const a = box.getBoundingClientRect(), b = card.getBoundingClientRect(), pad = 8;
    // The phone's tray snaps each card's start to its scroll padding (css/ui.css #dock .tray): a card out of sight is brought to that place, which the snap keeps.
    if (b.left < a.left || b.right > a.right) box.scrollLeft += b.left - a.left - (parseFloat(win.getComputedStyle(box).scrollPaddingLeft) || 0);
    if (b.top < a.top) box.scrollTop -= a.top - b.top + pad; else if (b.bottom > a.bottom) box.scrollTop += b.bottom - a.bottom + pad;
  }

  // The words, the count and the buttons for the step the city is at.
  function paint() {
    step = at < LESSON_LENGTH ? LESSON_STEPS[at] : null;
    facts = lessonFacts(world, step);
    if (!step) {
      setText(label, ''); setText(ipiWhy, ''); setText(text, D2_TEXT.endRow); setText(why, ''); chip.hidden = true;
      showMe.hidden = true; paintEnd();
      row.dataset.step = 'end';
    } else {
      const words = V81T_TEXT.steps[step.id](facts);
      const ch = chapterAt(at);
      const p = stepProgress(world, step);
      setText(label, V81T_TEXT.stepLabel(V81T_TEXT.chapters[ch.id].name, ch.k, ch.of));
      setText(ipiWhy, words.why);
      setText(text, words.do);
      setText(why, D2_TEXT.steps[step.id](facts).why);
      chip.hidden = !p;
      if (p) { setText(chip, D2_TEXT.progress(p.n, p.of)); chip.setAttribute('aria-label', D2_TEXT.progress(p.n, p.of)); }
      const t = targetOf();
      showMe.hidden = !t;
      if (t) showMe.setAttribute('aria-label', `${T.showMe}: ${words.do}`);
      newCity.hidden = true;
      row.dataset.step = step.id;
    }
    root.classList.toggle('lesson-names-alert', Boolean(step) && NAMES_ALERT.has(step.id));
    dim();
    measure();
  }

  // Version 6.0.1 (ruling 821): a step begins on a clear map. The tool that finished the step before leaves things over the map: the overlay its card or Show me
  // turned on (a firehouse's Fire risk, a well's Water) with its legend, a second panel under the top bar beside the lesson's row, and on a phone the build tray it
  // was picked from. As a new step comes the overlay goes off, and a phone's tray folds when the step asks for no card (the fire, the months, the raid: steps that wait
  // on the sim and want the map). A step with a card keeps the tray, since its Show me opens it anyway. The player can turn either back on at once.
  function clearForStep() {
    const s = store.get(), next = at < LESSON_LENGTH ? LESSON_STEPS[at] : null;
    const patch = {};
    if (s.overlay) patch.overlay = null;
    if (phoneNow() && s.dock === 'tray' && !(next && next.show)) patch.dock = 'slim';
    if (Object.keys(patch).length) store.set(patch);
  }

  // The row's way out at the end ("Go to the title") is live only while the end sheet is not open (the replay of a device with a saved city, ruling 1209).
  const endSheetOpen = () => { const s = store.get().sheet; return Boolean(s) && s.kind === 'lessonEnd'; };
  function paintEnd() { newCity.hidden = !finished || endSheetOpen() || canAdopt(); }
  const canAdopt = () => typeof run.adopt === 'function' && (typeof run.canAdopt !== 'function' || run.canAdopt());

  // The end (ruling 1208): the lesson's city becomes the player's own. Handed over after the last reaction has been seen, from a timer, never from inside a command or a day
  // (boot builds a new interface for the city, and this one goes).
  let handing = 0;
  function handOver() {
    if (handing || destroyed) return;
    handing = setTimeout(() => { if (!destroyed) run.adopt(); }, BEAT_MS);
  }

  // Where the sim says the lesson is: moves on through every step it shows done, stages what the next one stages, reacts with a line and a chime, and ends.
  function sync(building = false) {
    if (destroyed) return;
    const next = lessonAt(world, at);
    if (next !== at) {
      const done = LESSON_STEPS[next - 1];
      at = next;
      persist();
      if (!building) clearForStep();
      if (ctx.sfx) { ctx.sfx.play('goal'); if (ctx.sfx.buzz) ctx.sfx.buzz(20); }
      open = false; paintOpen();
      shownAt = -1;
      announceNext = true;
      if (!building) startBeat(done);
    }
    if (at >= LESSON_LENGTH && !finished) {
      finished = true;
      needPause = !canAdopt();
      settings.set({ lessonDone: true, lessonStep: LESSON_LENGTH, cardsSeen: true });
    }
    if (needPause && !building && ctx.speedControl) { needPause = false; ctx.speedControl.set(0); }   // a command: not while the interface is still being built
    paint();
    applyLock();
    cardWaits = false;
    if (!finished && step && cardAt !== at) {
      const ch = chapterAt(at);
      // A step inside a chapter, reached by playing, starts in the docked bubble with no card (design 7b). A chapter's first step gets its card, and so does any step while
      // the interface is being built (a lesson opened or continued there opens with its chapter's card all the same, ruling 1213); a card waits for a stroke or press to end.
      if (!ch.first && !building) enterMicro();
      else if (midAction()) cardWaits = true;
      else showCard(building);
    } else if (finished && card.isUp()) card.hide();
    // The player's own part of a step that has one is done: the game plays again by itself (ruling 1002).
    if (!card.isUp() && !showing && step && !finished && !actResumed && playWhen(world, step) === 'act' && actionDone(world, step, actBase)) { actResumed = true; resumePlay(); }
    if (announceNext) { announceNext = false; announce(); }
    if (finished && !building && canAdopt()) handOver();
    // The end sheet (a replay on a device with a saved city) opens once nothing else is open, and never while the interface is still being built (its sheets are made after
    // its seams: a lesson begun at the end, a dev scene's, opens it at the first refresh instead).
    else if (finished && !building && !endShown && !store.get().sheet && !store.get().confirmDialog) { endShown = true; store.set(openSheet(store.get(), 'lessonEnd')); }
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

  // Version 8.0 (Track N, ruling 1170): the view follows each step's own target: every step that points at a place frames that place in the middle of the free map as it
  // begins, as Show me does (a step about the whole city leaves the view alone).
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

  // Once a frame: the ring and the dimming follow the camera, and the control's ring follows its element (the top bar draws its controls afresh). While Ipi reacts the
  // ring glows gold on what was just done (ruling 1206), then moves to the next step's place.
  function layout() {
    const glow = beatSpot && beating();
    const spot = glow ? beatSpot : step && !finished && !card.isUp() ? stepSpot(world, step) : null;   // under the step card the map is dimmed by the card's own layer
    ring.classList.toggle('beat', Boolean(glow));
    if (!spot || !run.cam) { scrim.hidden = true; ring.hidden = true; }
    else {
      const v = viewOf();
      const [sx, sy] = tileToScreen(run.cam, v, spot.x + spot.w / 2, spot.y + spot.d / 2);
      const { rx, ry } = ringHalf(spot, run.cam.zoom);
      const k2 = [Math.round(sx), Math.round(sy), Math.round(rx), Math.round(ry)].join(',');
      if (k2 !== key || scrim.hidden || ring.hidden) {
        key = k2;
        scrim.hidden = Boolean(glow); ring.hidden = false;
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
    cardInSight();
    if (cardWaits && !midAction() && !destroyed) sync();
  }
  let raf = win.requestAnimationFrame ? win.requestAnimationFrame(function frame() { raf = win.requestAnimationFrame(frame); layout(); }) : 0;

  // ── the end sheet (a replay on a device with a saved city, ruling 1209) ──
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
      clearTimeout(beatTimer); clearTimeout(handing);
      unlock();
      if (raf && win.cancelAnimationFrame) win.cancelAnimationFrame(raf);
      doc.removeEventListener('pointerdown', onDown, true); doc.removeEventListener('pointerup', onUp, true); doc.removeEventListener('pointercancel', onUp, true);
      row.remove(); scrim.remove(); ring.remove(); card.destroy();
      for (const n of root.querySelectorAll('.lesson-lit, .lesson-pulse')) n.classList.remove('lesson-lit', 'lesson-pulse');
      root.classList.remove('lesson-on', 'lesson-names-alert');
      unmountScribe();
    },
  };
}
