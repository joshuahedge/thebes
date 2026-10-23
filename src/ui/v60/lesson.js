// Version 6.0, Track D2: the lesson's in-game part (the guided first city). The seam (src/ui/s46/seam.js shape); Track D2 owns this file.
//
// In a normal game it does only one thing: the picture cards' first moments (src/ui/cardMoments.js). In the lesson (src/boot.js gives the game
// hooks.lessonRun: its starting step, its camera, how to leave and how to finish) it runs the guided first city:
//  - one row in the guidance place under the top bar says the step, its instruction (two or three lines on a phone, with More for the rest and the
//    reason), how far the step has got (a count the sim's own), Show me and Leave. The goals strip, tips and captions are out of the way (css/ui.css
//    body.lesson-on); alerts stay;
//  - the step's target is lit: the card it asks for and its category carry the guide's "Suggested" tag and ring and every other card is dimmed (still
//    usable), a place on the map is ringed with the rest of the map dimmed round it, and a control (the speed buttons, the gold chip) gets a ring;
//  - it asks the sim (src/sim/lesson.js lessonAt) after every command and every day, and moves on only when the sim shows the step done;
//  - the lesson's end is a sheet, "Your first city stands", and the row's New city button.
// The step reached is kept in the device's settings (lessonStep), never in the world; the lesson's city is never saved (src/boot.js).
import { seamBase } from '../s46/seam.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../data/lesson.js';
import { LESSON_LENGTH, lessonAt, stepSpot, stepProgress } from '../../sim/lesson.js';
import { lessonFacts } from '../lesson.js';
import { createCardMoments } from '../cardMoments.js';
import { D2_TEXT, T } from '../text.js';
import { el, button, iconButton, setText } from '../components.js';
import { isCut, writeMore } from '../expand.js';
import { tileToScreen } from '../../render/camera.js';
import { openSheet } from '../modes.js';

// The lit ring's reach round a footprint: the footprint's diamond (a tile is 64 px wide and 32 tall at zoom 1, so w + d tiles are (w + d) x 32 px wide and
// (w + d) x 16 tall, and the ring's half-axes are half of that) with this much to spare, in px.
const RING_PAD = 14;
const RING_MIN = { x: 44, y: 30 };

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
  const leave = iconButton(D2_TEXT.leave, '✕', { class: 'leave quiet', onClick: () => askLeave() });
  const row = el('div', { id: 'lesson', class: 'lesson-row', role: 'region', 'aria-label': D2_TEXT.region }, [body, showMe, newCity, leave]);
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

  function askLeave() {
    store.set({ confirmDialog: { text: D2_TEXT.leaveConfirm, confirmLabel: D2_TEXT.leave, onConfirm: () => run.leave() } });
  }

  // The dock's cards and categories, as the guided start marks them (src/ui/guide.js): the step's card ringed and tagged, the rest dimmed.
  function dim() {
    const t = finished ? null : targetOf();
    const item = t ? t.item : null, category = t ? t.category : null;
    for (const card of root.querySelectorAll('.card[data-item]')) {
      const on = Boolean(item) && card.dataset.item === item;
      card.classList.toggle('suggested', on);
      card.classList.toggle('dimmed', Boolean(item) && !on);
      const tag = card.querySelector('.tag');
      if (on && !tag) card.append(el('span', { class: 'tag', text: T.suggested }));
      if (!on && tag) tag.remove();
    }
    for (const b of root.querySelectorAll('.cat[data-category], .tab[data-category]')) {
      const on = Boolean(category) && b.dataset.category === category;
      b.classList.toggle('suggested', on);
      b.classList.toggle('dimmed', Boolean(category) && !on);
    }
  }

  // The words, the count and the buttons for the step the city is at.
  function paint() {
    step = at < LESSON_LENGTH ? LESSON_STEPS[at] : null;
    facts = lessonFacts(world, step);
    if (!step) {
      setText(label, ''); setText(text, D2_TEXT.endRow); setText(why, ''); chip.hidden = true;
      showMe.hidden = true; leave.hidden = true; newCity.hidden = false;
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
      leave.hidden = false; newCity.hidden = true;
      row.dataset.step = step.id;
    }
    dim();
    measure();
  }

  // Where the sim says the lesson is: moves on through every step it shows done, stages what the next one stages, says so with a sound, and ends.
  function sync(building = false) {
    if (destroyed) return;
    const next = lessonAt(world, at);
    if (next !== at) {
      at = next;
      persist();
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
    if (announceNext) { announceNext = false; announce(); }
    // The end sheet opens once nothing else is open, and never while the interface is still being built (its sheets are made after its seams: a lesson begun
    // at the end, a dev scene's, opens it at the first refresh instead).
    if (finished && !building && !endShown && !store.get().sheet && !store.get().confirmDialog) { endShown = true; store.set(openSheet(store.get(), 'lessonEnd')); }
    ensureVisible();
  }

  // A step's target is brought into the middle of the map once, when the step begins, if it is not already well inside the free band (the rows above and the dock
  // below take about a quarter of a phone's height each): a glide, as Show me's is (a jump under Still).
  function ensureVisible() {
    if (finished || shownAt === at || !step || !ctx.cameraControl) return;
    const spot = stepSpot(world, step);
    shownAt = at;
    if (!spot || !run.cam) return;
    const v = viewOf(), [sx, sy] = tileToScreen(run.cam, v, spot.x + spot.w / 2, spot.y + spot.d / 2);
    if (sx < v.width * 0.15 || sx > v.width * 0.85 || sy < v.height * 0.3 || sy > v.height * 0.66) {
      const cx = spot.x + spot.w / 2, cy = spot.y + spot.d / 2;
      if (typeof ctx.cameraControl.glide === 'function') ctx.cameraControl.glide(() => ctx.cameraControl.panTo(cx, cy)); else ctx.cameraControl.panTo(cx, cy);
    }
  }

  const viewOf = () => { const c = ctx.cameraControl.centre(); return { width: c.x * 2, height: c.y * 2 }; };

  // Once a frame: the ring and the dimming follow the camera, and the control's ring follows its element (the top bar draws its controls afresh).
  function layout() {
    const spot = step && !finished ? stepSpot(world, step) : null;
    if (!spot || !run.cam) { scrim.hidden = true; ring.hidden = true; }
    else {
      const v = viewOf(), k = run.cam.zoom, span = spot.w + spot.d;
      const [sx, sy] = tileToScreen(run.cam, v, spot.x + spot.w / 2, spot.y + spot.d / 2);
      const rx = Math.max(RING_MIN.x, span * 16 * k + RING_PAD), ry = Math.max(RING_MIN.y, span * 8 * k + RING_PAD);
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

  const stop = store.subscribe(() => { if (!destroyed) dim(); });
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
      row.remove(); scrim.remove(); ring.remove();
      for (const n of root.querySelectorAll('.lesson-lit')) n.classList.remove('lesson-lit');
      root.classList.remove('lesson-on');
    },
  };
}
