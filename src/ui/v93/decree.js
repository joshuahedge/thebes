// Version 9.3, Track U (the decree's interface; rulings 1975-1984): the decree card (title and first screen), the HUD chip and the end card, and the small readers
// they share (the week's best, its rivals, the gate). A decree game runs as hooks.decreeRun ({ week, ids, again, back, noteEnd, best, rivals, ... }, built by src/boot.js
// the way the lesson's hooks.lessonRun is); createDecreeUi is the seam (src/ui/s46/seam.js shape) createUI plugs in when it is there.
import { SCORE_PARTS } from '../../data/scoring.js';
import { DECREES } from '../../data/decrees.js';
import { decreeEnded } from '../../sim/rules.js';
import { decreeScore, decreeMedals, decreeMeasure, splitMonths } from '../../sim/score.js';   // decreeScore and decreeMedals: Track R
import { scoreTotalLine, scorePartRow } from '../scoreUi.js';   // the score sheet's own total line and part rows
import { decreeLink, decreeShareText } from '../share.js';   // Track S
import { dateParts } from '../../sim/clock.js';
import { setSpeed } from '../../sim/commands.js';
import { el, button } from '../components.js';
import { seamBase } from '../s46/seam.js';
import { openSheet } from '../modes.js';
import { U93_TEXT as U, T, SCORE_TEXT, progressText } from '../text.js';
import { sideBySide } from '../v90/sideBySide.js';

const PART_IDS = [...SCORE_PARTS, 'bonus'];
const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

// ---- readers -------------------------------------------------------------------------------------------------------------------------------------------------

// The six parts as one object, whatever shape the score gives them (an object by part id, or an array in SCORE_PARTS order then the bonus).
export function partsObject(parts) {
  if (Array.isArray(parts)) return Object.fromEntries(PART_IDS.map((p, i) => [p, Number.isFinite(parts[i]) ? parts[i] : 0]));
  const o = {};
  for (const p of PART_IDS) o[p] = parts && Number.isFinite(parts[p]) ? parts[p] : 0;
  return o;
}

// The run's score on the last day: { total (out of 600), parts, medal }, from Track R's decreeScore.
export function decreeResult(world) {
  const s = decreeScore(world);
  const parts = partsObject(s.parts);
  const total = Number.isFinite(s.total) ? s.total : PART_IDS.reduce((n, p) => n + parts[p], 0);
  return { total, parts, medal: s.medal || null };
}

export const yearOf = (world) => Math.min(6, dateParts(world).year);
export const markOf = (decree) => U.markOf(decree.ids, decree.week);

// The device's best for a week: its decree row, or null. Rivals on a week: the records' rival rows that carry it, best first.
export function weekBest(records, week) {
  const rows = records && typeof records.decrees === 'function' ? safe(() => records.decrees(), []) : [];
  return (Array.isArray(rows) ? rows : []).find((r) => r && r.week === week) || null;
}
export function weekRivals(records, week) {
  const all = records && typeof records.load === 'function' ? safe(() => records.load().rivals, []) : [];
  return (Array.isArray(all) ? all : []).filter((r) => r && r.week === week).sort((a, b) => b.score - a.score);
}

// The title card's gate (spec 2): a city row with a Town split in the records, or any ruler row.
export function decreeUnlocked(records) {
  if (!records || typeof records.load !== 'function') return false;
  const r = safe(() => records.load(), null);
  if (!r) return false;
  return (Array.isArray(r.rulers) && r.rulers.length > 0) || (Array.isArray(r.cities) && r.cities.some((c) => c && c.splits && Number.isInteger(c.splits.town)));
}

// ---- the card --------------------------------------------------------------------------------------------------------------------------------------------------

// What the decree does and what its bonus counts: the mark, each decree's twist, the bonus line. mark: the mark's own node (the sheet's h3, the title panel's strong line).
// plain: the title panel's lines (the friend's-score panel's): small, with the mark the panel's only bold line, so the name leads the twist in the same weight.
export function decreeFacts({ ids, week, mark = (text) => el('h3', { class: 'decree-mark', text }), plain = false }) {
  return [
    mark(U.markOf(ids, week).replace(/ week (\d+)$/, ' week $1')),   // fix wave (U10): "week 46" stays together on a phone
    el('ul', { class: 'decree-twists' }, ids.filter((id) => DECREES[id]).map((id) => el('li', { class: plain ? 'decree-twist small' : 'decree-twist', dataset: { decree: id } }, [
      plain ? el('span', { class: 'twist-name', text: `${U.names[id]}. ` }) : el('strong', { text: `${U.names[id]}. ` }), el('span', { text: U.twists[id] }),
    ]))),
    el('p', { class: 'decree-counts small muted', text: U.counts(ids) }),
  ];
}

// The title's card: the mark, the twists, the bonus, your best, the best rival, and the button (Start, Continue or Try again). slot: the decree slot's run ({ week, ended })
// or null; records: for the best and the rivals. onStart(): a new run of this week (boot asks first when the slot holds another week's); onContinue(slot): the slot's run.
export function decreeTitleCard({ week, ids, records = null, slot = null, onStart, onContinue }) {
  const best = weekBest(records, week), rival = weekRivals(records, week)[0] || null;
  const sameWeek = Boolean(slot) && slot.week === week;
  const live = Boolean(slot) && !slot.ended;
  const otherLive = live && !sameWeek;
  const label = sameWeek && live ? U.continue : (sameWeek && slot.ended) || best ? U.again : U.start;
  // The go button is a plain button, as the Lesson and Options row are (fix wave U7): Play stays the title's one primary.
  const go = button(label, { class: `decree-go ${sameWeek && live ? 'continue-decree' : best || (sameWeek && slot.ended) ? 'again-decree' : 'start-decree'}`, onClick: () => (sameWeek && live ? onContinue(slot) : onStart()) });
  const id = 'decree-card-head';
  // The title's panel look is the friend's-score panel's (.shared-score in css/ui.css, which lists .decree-card beside it): a small heading, plain lines, small muted notes.
  return el('section', { class: 'decree-card', role: 'group', 'aria-labelledby': id }, [
    el('h2', { id, class: 'small', text: U.cardTitle }),
    ...decreeFacts({ ids, week, plain: true, mark: (text) => el('p', { class: 'decree-mark' }, [el('strong', { text })]) }),
    el('p', { class: 'decree-best your-best small', text: best ? U.yourBest(best.score, best.medal) : U.noBest }),
    rival ? el('p', { class: 'decree-rival rival-line', text: U.rivalLine(rival.name, rival.score) }) : null,
    otherLive ? el('p', { class: 'decree-unfinished small', text: U.unfinished(slot.week) }) : null,
    go,
    otherLive ? button(U.continue, { class: 'decree-continue-old', 'aria-label': `${U.continue}: ${U.unfinished(slot.week)}`, onClick: () => onContinue(slot) }) : null,
  ]);
}

// ---- the share -------------------------------------------------------------------------------------------------------------------------------------------------

function shareText(world, result, hooks) {
  const decree = world.decree, mark = markOf(decree);
  const who = safe(() => (hooks.records ? hooks.records.dynasty() : null), null);
  const splits = safe(() => splitMonths(world), {});
  const link = safe(() => decreeLink({ week: decree.week, parts: result.parts, splits, name: who ? who.name : '', heir: 'steady' }), '');
  return decreeShareText({ mark, total: result.total, medal: result.medal, parts: result.parts, link });
}

// ---- the seam --------------------------------------------------------------------------------------------------------------------------------------------------

export function createDecreeUi(ctx) {
  const base = seamBase();
  const run = ctx && ctx.hooks && ctx.hooks.decreeRun;
  if (!run || !ctx.world || !ctx.world.decree) return base;
  const { world, store, root, toasts } = ctx;
  const decree = world.decree;
  const mark = markOf(decree);
  const nav = () => (typeof navigator !== 'undefined' ? navigator : {});
  const given = (name, fallback) => (ctx.hooks && name in ctx.hooks ? ctx.hooks[name] : fallback());

  // The chip, beside the date: the first row under the top bar. Its tap opens the card again (the end card once the run is over).
  const chip = el('button', { type: 'button', class: 'decree-chip small', dataset: { lock: 'decree-chip' } }, [el('span', { class: 'chip-year' }), el('span', { class: 'chip-sep', 'aria-hidden': 'true', text: '·' }), el('span', { class: 'chip-mark' })]);   // the dot keeps the year and the mark apart on a phone (known 8)
  const underBar = root.querySelector('#under-bar');
  if (underBar) underBar.insertBefore(chip, underBar.firstChild);
  chip.querySelector('.chip-mark').textContent = mark;
  let chipKey = '';
  const paintChip = () => {
    const y = yearOf(world), key = `${y}|${decreeEnded(world)}`;
    if (key === chipKey) return;
    chipKey = key;
    root.classList.toggle('decree-over', decreeEnded(world));   // fix wave (U8): the debt alert, the tips and the scribe stop nudging a city that can no longer act (css/v93.css)
    chip.querySelector('.chip-year').textContent = U.chip(y);
    chip.setAttribute('aria-label', U.chipLabel(mark, y));
  };
  chip.addEventListener('click', () => store.set(openSheet(store.get(), decreeEnded(world) ? 'decreeEnd' : 'decree')));
  root.classList.add('decree-on');
  paintChip();

  // After the end the clock is refused every speed (fix wave U2): Play, the speed buttons and the keys open the end card instead of doing nothing.
  const sc = ctx.speedControl, setSpeedControl = sc && sc.set;
  if (sc) sc.set = (speed) => {
    const r = setSpeedControl.call(sc, speed);
    if (!r.ok && r.reason === 'decree_ended' && !somethingUp()) store.set(openSheet(store.get(), 'decreeEnd'));
    return r;
  };

  // The decree card: the first screen (Begin starts the clock) and, from the chip, a reminder (Close).
  let begun = false;
  function cardSheet(body, { close, setTitle }) {
    setTitle(U.cardTitle);
    const first = !begun;
    const go = button(first ? U.begin : U.close, { class: 'decree-begin primary', onClick: () => { begun = true; close(); if (first && ctx.speedControl) ctx.speedControl.set(1); } });
    body.append(el('div', { class: 'decree-sheet' }, [
      ...decreeFacts({ ids: decree.ids, week: decree.week }),
      el('p', { class: 'decree-length small muted', text: U.length }),
      el('div', { class: 'actions' }, [go]),
    ]));
  }

  // The end card, in the shape of 9.2's lesson end card: the numbers, the choices, then the lines under them.
  let result = null, noted = null;
  // The end is written to the records the moment it arrives (fix wave U1), not when the card first draws: a player who leaves under a waiting sheet still has the run noted.
  function noteEnd() {
    if (!result) result = decreeResult(world);
    if (!noted) noted = typeof run.noteEnd === 'function' ? run.noteEnd(result) : { best: null, isBest: false };
  }
  function endSheet(body, { close, setTitle }) {
    setTitle(U.endTitle);
    noteEnd();
    const best = (noted && noted.best) || weekBest(run.records, decree.week) || { score: result.total, medal: result.medal };
    const rivals = typeof run.rivals === 'function' ? run.rivals() : [];
    const share = button(U.share, { class: 'decree-share', onClick: () => {
      const text = shareText(world, result, { records: run.records });
      const fn = given('share', () => (typeof nav().share === 'function' ? (d) => nav().share(d) : null));
      if (fn) { Promise.resolve().then(() => fn({ text })).catch(() => {}); return; }
      const clip = given('clipboard', () => nav().clipboard || null);
      if (clip && clip.writeText) clip.writeText(text).then(() => toasts.show(U.shared), () => {});
    } });
    const again = button(U.again, { class: 'decree-again primary', onClick: () => { close(); run.again(); } });
    const back = button(U.backToCity, { class: 'decree-back', onClick: () => run.back() });
    const top = rivals[0] || null;
    // The score sheet's own parts (src/ui/scoreUi.js scoreTotalLine and scorePartRow, in a .score-section): the total and its medal, the medal bars, your best,
    // the choices in an .actions row as the score sheet's Seal and Share are, then the six parts and the rivals under h4s, as the score sheet's Splits are.
    body.append(el('section', { class: 'score-section decree-end' }, [
      el('p', { class: 'decree-lead', text: U.endLead(mark) }),
      scoreTotalLine(result.total, result.medal, U.medalWords(result.medal)),   // the run is over: "No medal", not the running score's "No medal yet"
      el('p', { class: 'next-medal small muted', text: U.scale(decreeMedals(world)) }),
      el('p', { class: 'decree-best your-best small', text: best ? U.yourBest(best.score, best.medal) : U.noBest }),
      // A new best is marked as an earned feat is on the score sheet: the done tick (teal in a sheet) before the words (scoreUi.js featsSection, sheets.js's done status).
      noted && noted.isBest ? el('p', { class: 'decree-new-best small' }, [el('span', { class: 'tick', 'aria-hidden': 'true', text: `${T.doneMark} ` }), U.newBest]) : null,
      el('div', { class: 'actions decree-end-actions' }, [again, back, share]),   // Version 9.3.1 (Track T, ruling 2028): the court letter's pattern: the first choice filled and first, full-width buttons stacked (css/v93.css)
      el('h4', { text: U.partsHead }),
      el('ul', { class: 'score-parts' }, PART_IDS.map((p) => (p === 'bonus'
        ? scorePartRow(p, result.parts[p], { name: U.bonusPart, label: `${U.bonusPart}: ${progressText(result.parts[p], 100)}` })
        : scorePartRow(p, result.parts[p])))),
      el('p', { class: 'decree-counts small muted', text: U.counts(decree.ids) }),
      // A pair week's bonus is the mean of two parts; each decree's own part shows under it (fix wave U9).
      decree.ids.length > 1 ? el('ul', { class: 'decree-own-parts small muted' }, decree.ids.filter((id) => DECREES[id]).map((id) => el('li', { dataset: { decree: id }, text: U.partLine(id, Math.min(100, Math.round((100 * decreeMeasure(world, id)) / DECREES[id].bar))) }))) : null,
      el('h4', { text: U.rivalsHead }),
      top ? sideBySide({ score: result.total, parts: result.parts, heir: 'steady' }, { name: top.name, score: top.score, parts: top.parts || {}, heir: top.heir || 'steady' }, { id: 'decree-side', ids: PART_IDS, names: { ...SCORE_TEXT.parts, bonus: U.bonusPart } }) : null,
      rivals.length ? el('ul', { class: 'decree-rivals small' }, rivals.slice(0, 5).map((r) => el('li', { class: 'decree-rival', text: U.rivalRow(r.name, r.score) }))) : el('p', { class: 'decree-no-rivals small muted', text: U.noRivals }),
    ]));
  }

  // The end opens by itself once, over nothing else (a dialog or sheet up waits).
  let opened = false;
  const somethingUp = () => { const s = store.get(); return Boolean(s.confirmDialog) || Boolean(s.sheet); };
  function tryEnd() {
    if (!decreeEnded(world)) return;
    noteEnd();
    if (opened) return;
    paintChip();
    if (somethingUp()) return;
    opened = true;
    store.set(openSheet(store.get(), 'decreeEnd'));
  }
  const stop = store.subscribe(() => { if (!opened) tryEnd(); });
  // The first screen: the card, the game held behind it. The sim is held at once; the sheet opens once createUI has finished building its own (its store's listeners are not all there yet).
  let gone = false;
  if (!decreeEnded(world)) setSpeed(world, 0);
  Promise.resolve().then(() => {
    if (gone) return;
    if (decreeEnded(world)) { begun = true; tryEnd(); return; }
    if (ctx.speedControl) ctx.speedControl.set(0);
    store.set(openSheet(store.get(), 'decree'));
  });

  return {
    ...base,
    sheets: { decree: cardSheet, decreeEnd: endSheet },
    onEvents() { paintChip(); tryEnd(); },
    onCommand() { paintChip(); },
    refresh() { paintChip(); tryEnd(); },
    destroy() { gone = true; stop(); chip.remove(); root.classList.remove('decree-on', 'decree-over'); if (sc) sc.set = setSpeedControl; },
  };
}
