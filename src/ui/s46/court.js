// Stage 4.6, the Court track's interface seam (rulings 336-339, 370-379). createUI makes it once a game with the seam context
// (src/ui/danger.js lists ctx) through src/ui/s46/index.js, and calls it only through the seam's shape (src/ui/s46/seam.js):
//   sheets       letter (the oldest waiting letter: a request to send or refuse, or a card with two choices), court (favour, the open
//                request, units away, past letters)
//   sheetParts   summary: the court's row (favour with its icon, number and words), a button to read a waiting letter, and one to open the court
//   onEvents     captions for what the court did (a request met, refused or missed; a gift; a card answered; a letter that is no longer needed)
//   onAlertAction / refresh / onCommand / destroy: none needed (the banner's View on a court letter opens the letter: see openFromBanner)
// Every sentence comes from the sim's own data and functions (src/sim/court.js, src/data/court.js), through the words in src/ui/text.js
// (S46_COURT_TEXT): a choice's consequence is the very list of effects the sim carries out. One panel at a time: a letter opens as a sheet,
// and nothing floats over the map. An open sheet does not pause the game (createUI's sheets never do); the letter on show is pinned once
// chosen (ruling 381), so a new letter arriving mid-read never swaps the buttons under a finger.
import { BUILDINGS } from '../../data/buildings.js';
import { FAVOUR } from '../../data/court.js';
import { allBuildings } from '../../sim/world.js';
import {
  courtOpen, favourBand, requestStatus, sendRequest, refuseRequest, readLetter, cardChoices, answerCard, monthsLeft, stockOf,
} from '../../sim/court.js';
import { unitsAway } from '../../sim/armies.js';
import { openSheet } from '../modes.js';
import { el, button } from '../components.js';
import { S46_COURT_TEXT as C, buildingName, plural } from '../text.js';
import { seamBase } from './seam.js';

const line = (text, cls = 'small muted') => el('p', { class: cls, text });
const row = (label, value, cls = '') => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { class: cls, text: value })]);

// The favour meter: a bar with ticks at the two thresholds, and always the number and the words beside it (never colour alone).
function favourMeter(world) {
  const f = world.court.favour;
  const band = favourBand(world);
  return el('div', { class: `favour-meter ${band}`, role: 'progressbar', 'aria-valuemin': String(FAVOUR.min), 'aria-valuemax': String(FAVOUR.max), 'aria-valuenow': String(f), 'aria-label': `${C.favour} ${C.favourOf(f)}, ${C.band[band]}` }, [
    el('span', { class: 'fill', style: { width: `${f}%` } }),
    el('span', { class: 'tick low', style: { left: `${FAVOUR.low}%` }, 'aria-hidden': 'true' }),
    el('span', { class: 'tick high', style: { left: `${FAVOUR.high}%` }, 'aria-hidden': 'true' }),
  ]);
}
const favourLine = (world) => {
  const band = favourBand(world);
  return `${C.favourMark[band]} ${world.court.favour} · ${C.band[band]}`;
};

// The first building that holds some of a good (a store the player can View), or null.
const storeOf = (world, good) => allBuildings(world).find((b) => (BUILDINGS[b.type].stores || []).includes(good) && (b.store[good] || 0) > 0) || null;
const firstOf = (world, type) => allBuildings(world).find((b) => b.type === type) || null;

export function createCourtUi(ctx) {
  if (!ctx || !ctx.world) return seamBase();   // no city to speak for (the contract's empty-seam test makes one with no context)
  const world = ctx.world;
  let focusId = null;                          // the letter the sheet shows (null: the first unread, else the oldest)
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });

  // The letter the sheet shows: the one chosen (by "Next letter"), else the first not yet read, else the oldest waiting.
  const shownLetter = () => {
    const letters = world.court.letters.filter((l) => l.kind !== 'request' || world.court.request);   // a request letter with no request open is a stale record
    return letters.find((l) => l.id === focusId) || letters.find((l) => !l.read) || letters[0] || null;
  };
  const openLetter = (id = null) => { focusId = id; ctx.store.set(openSheet(ctx.store.get(), 'letter')); };
  const openCourtSheet = () => ctx.store.set(openSheet(ctx.store.get(), 'court'));

  // Captions for what the court did, whoever caused it (the sim's loop or the player's tap); the sim pushes the events, never reads them.
  function onEvents(events) {
    for (const e of events) {
      if (e.type === 'court_letter') { if (ctx.fireTip) ctx.fireTip('courtLetter'); }
      else if (e.type === 'court_request') caption(e.result === 'met' ? C.captionMet(e) : e.result === 'refused' ? C.captionRefused(e) : C.captionMissed(e));
      else if (e.type === 'court_gift') caption(C.captionGift(e));
      else if (e.type === 'court_card') caption(C.captionCard(e));
      else if (e.type === 'court_letter_gone') caption(C.captionGone(e));
    }
  }
  // After the player answered: the same captions, then the chrome (the alert row, the numbers) and any goal the answer finished.
  function answered(events, text) {
    onEvents(events);
    ctx.afterCommand({ kind: 'court', result: { ok: true }, text, undoable: false });
  }

  // A letter stops being news once it is read: the alert row stops raising it (the sim's courtAlerts), and the first read is a first.
  function markRead(id) {
    if (readLetter(world, id)) queueMicrotask(() => ctx.refresh());
  }

  // ── The letter sheet ──
  // A choice: its button, then what it does in words (the sim's own list of effects), then why not when it cannot be made.
  function choice({ label, primary = false, consequence, problem = '', onPick, cls = '' }) {
    return el('div', { class: `court-choice ${cls}` }, [
      button(label, { class: primary ? 'primary' : '', disabled: Boolean(problem), onClick: onPick }),
      el('p', { class: 'small muted consequence', text: consequence }),
      problem ? el('p', { class: 'small coral why-not', text: problem }) : null,
    ]);
  }
  const viewButton = (b, what) => (b ? button(`View ${what.toLowerCase()}`, { class: 'view quiet', onClick: () => ctx.selectBuilding(b.id) }) : null);

  function requestLetter(body, close) {
    const r = world.court.request;
    const st = requestStatus(world, r);
    body.append(el('h3', { class: 'letter-ask', text: C.requestTitle(r) }));
    if (r.guided) body.append(line(C.guidedNote));
    body.append(
      row(C.deadline, C.deadlineText(r, st.monthsLeft)),
      row(C.reward, C.rewardText(r, world)),
      row(C.ifRefused, C.refusedText(r, world)),
    );
    if (r.kind === 'soldiers') body.append(line(C.soldiersNote));
    const sendProblem = st.ok ? '' : C.problem(st.reason, { have: st.have, need: st.need, kind: r.kind, good: r.good }, world, st.have);
    body.append(el('div', { class: 'court-choices' }, [
      choice({
        label: C.sendLabel(r), primary: true, cls: 'send', consequence: C.sendConsequence(r, world), problem: sendProblem,
        onPick: () => {
          const events = [];
          const res = sendRequest(world, events);
          if (!res.ok) { ctx.refresh(); return; }
          focusId = null;
          close();
          answered(events, C.captionMet({ request: r, favour: res.favour }));
        },
      }),
      choice({
        label: C.refuseLabel(r, world), cls: 'refuse', consequence: C.refuseConsequence(r, world),
        onPick: () => {
          const events = [];
          const res = refuseRequest(world, events);
          focusId = null;
          close();
          answered(events, C.captionRefused({ favour: res.favour }));
        },
      }),
    ]), row(C.have, C.haveText(r, st), st.ok ? 'teal' : 'coral'));   // the choices come first, so Send shows without scrolling at the largest text (ruling 385)
    return r.kind === 'soldiers' ? viewButton(firstOf(world, 'barracks'), buildingName('barracks')) : r.kind === 'gold' ? null : viewButton(storeOf(world, r.good), buildingName(storeOf(world, r.good) ? storeOf(world, r.good).type : 'storehouse'));
  }

  function cardLetter(body, letter, close) {
    const choices = cardChoices(world, letter);
    // What the card read off the city for its words: the sick homes in its district, the workshop in dispute.
    const view = {
      sick: letter.card === 'sickness' ? (choices[0].effects.find((e) => e.kind === 'faster') || { ids: [] }).ids.length : 0,
      shop: letter.card === 'craftsmen_dispute' && world.buildings[letter.args.id] ? buildingName(world.buildings[letter.args.id].type).toLowerCase() : '',
    };
    body.append(el('h3', { class: 'letter-ask', text: C.cardTitle(letter.card) }), el('p', { class: 'letter-body', text: C.cardBody(letter, view) }));
    body.append(el('div', { class: 'court-choices' }, choices.map((c, i) => {
      const bad = c.effects.find((e) => problemEffect(c, e));
      return choice({
        label: C.choiceLabel(letter.card, c.id), primary: i === 0, cls: c.id, consequence: C.consequence(c.effects, world),
        problem: c.problem ? C.problem(c.problem, bad || null, world, bad && bad.good ? stockOf(world, bad.good) : 0) : '',
        onPick: () => {
          const events = [];
          const res = answerCard(world, letter.id, c.id, events);
          if (!res.ok) { ctx.refresh(); return; }
          focusId = null;
          close();
          answered(events, C.captionCard({ card: letter.card, choice: c.id }));
        },
      });
    })));
    if (letter.card === 'sickness') { const sick = (choices[0].effects.find((e) => e.kind === 'faster') || { ids: [] }).ids[0]; return viewButton(sick ? world.buildings[sick] : null, 'a sick home'); }
    if (letter.card === 'craftsmen_dispute') return viewButton(world.buildings[letter.args.id] || null, view.shop);
    if (letter.card === 'temple_gift' || letter.card === 'caravan') return viewButton(storeOf(world, letter.args.good), buildingName(storeOf(world, letter.args.good) ? storeOf(world, letter.args.good).type : 'storehouse'));
    return null;
  }
  // The effect a failed choice's reason is about (the first the sim found it for).
  const problemEffect = (c, e) => ({
    no_gold: e.kind === 'gold' && e.n < 0, short: e.kind === 'goods' && e.n < 0, no_room: (e.kind === 'goods' && e.n > 0) || e.kind === 'people',
    too_soon: e.kind === 'mood', none: ['pause', 'faster', 'cure'].includes(e.kind), unavailable: e.kind === 'herd' || e.kind === 'forecast',
  })[c.problem];

  function letterSheet(body, { close }) {
    const letter = shownLetter();
    if (letter) focusId = letter.id;   // pinned (ruling 381): the daily rebuild keeps showing this letter until it is answered, put off or closed
    if (!letter) {
      body.append(line(C.noLetters, 'muted'), el('div', { class: 'actions' }, [button(C.openCourt, { class: 'open-court', onClick: openCourtSheet })]));
      return;
    }
    markRead(letter.id);
    const wrap = el('div', { class: `letter letter-${letter.kind}`, dataset: { letter: String(letter.id), kind: letter.kind } });
    body.append(wrap);
    const extra = letter.kind === 'request' ? requestLetter(wrap, close) : cardLetter(wrap, letter, close);
    const waiting = world.court.letters.length;
    const foot = [
      extra,
      waiting > 1 ? button(`Next letter (${waiting} waiting)`, { class: 'next-letter quiet', onClick: () => { const l = world.court.letters; focusId = l[(l.findIndex((x) => x.id === letter.id) + 1) % l.length].id; ctx.refresh(); } }) : null,
      button(C.openCourt, { class: 'open-court quiet', onClick: openCourtSheet }),
      button(C.later, { class: 'later quiet', onClick: () => { focusId = null; close(); } }),
    ].filter(Boolean);
    body.append(el('div', { class: 'actions letter-foot' }, foot));
  }

  // ── The court sheet ──
  function courtSheet(body, { close }) {
    const c = world.court;
    if (!courtOpen(world)) { body.append(line(C.closed(), 'muted')); return; }
    const band = favourBand(world);
    body.append(
      el('div', { class: `favour-head ${band}` }, [
        el('span', { class: 'favour-mark', 'aria-hidden': 'true', text: C.favourMark[band] }),
        el('strong', { class: 'favour-number', text: String(c.favour) }),
        el('span', { class: 'muted small favour-of', text: `of ${FAVOUR.max}` }),
        el('span', { class: 'favour-band', text: C.band[band] }),
      ]),
      favourMeter(world),
      el('p', { class: 'favour-now', text: `${C.bandNow[band]}.` }),
      line(`${C.drift}.`),
    );
    // The rules of the other bands (the band in effect is the line above), then the gift clock whenever it runs (ruling 375).
    if (band !== 'high') body.append(line(`${C.ruleHigh}.`));
    if (band !== 'low') body.append(line(`${C.ruleLow}.`));
    if (c.nextGiftDay !== null) {
      const left = monthsLeft(world, c.nextGiftDay);
      body.append(line(`${left > 0 ? C.nextGift(left) : C.giftWaiting}.`, 'small muted gift-due'));
    }
    // Letters waiting, and the request open.
    body.append(el('h3', { text: C.waiting }));
    if (!c.letters.length) body.append(line(C.noLetters));
    else body.append(el('ul', { class: 'letters-waiting' }, c.letters.map((l) => el('li', {}, [
      el('span', { text: l.kind === 'request' && c.request ? `${C.requestTitle(c.request)}, ${C.deadlineText(c.request, monthsLeft(world, c.request.due))}` : C.cardTitle(l.card) }),
      ' ', button('Open', { class: 'open-letter quiet', 'aria-label': `Open: ${l.kind === 'request' && c.request ? C.requestTitle(c.request) : C.cardTitle(l.card)}`, onClick: () => openLetter(l.id) }),
    ]))));
    body.append(line(C.cadence));
    const away = unitsAway(world);
    if (away.length) body.append(el('h3', { text: C.awayHead }), el('ul', { class: 'units-away' }, away.map((a) => el('li', { text: C.awayLine(a) }))));
    body.append(el('h3', { text: C.pastLetters }));
    if (!c.log.length) body.append(line(C.noPast));
    else body.append(el('ul', { class: 'letters-past' }, [...c.log].reverse().map((e) => el('li', {}, [el('span', { class: 'small muted', text: `${C.logDate(e.day)}: ` }), C.logLine(e)]))));
  }

  // ── The summary's row ──
  function summary() {
    if (!courtOpen(world)) return [];
    const c = world.court;
    const nodes = [el('h3', { text: C.courtHead, dataset: { section: 'court' } }), row(C.favour, favourLine(world))];
    const actions = [];
    if (c.letters.length) {
      const unread = c.letters.some((l) => !l.read);
      nodes.push(line(unread ? `${plural(c.letters.length, 'letter waits', 'letters wait')} for you.` : `${plural(c.letters.length, 'letter is', 'letters are')} open.`, 'small'));
      actions.push(button(C.readLetter, { class: 'read-letter primary', onClick: () => openLetter() }));
    }
    actions.push(button(C.openCourt, { class: 'open-court', onClick: openCourtSheet }));
    nodes.push(el('div', { class: 'actions court-actions' }, actions));
    return nodes;
  }

  // ── The alert row's View ──
  // A court letter is not about a place or a building, so the banner's own View would open the summary. The seam takes the tap first
  // and opens the letter instead (one panel at a time: it replaces whatever sheet is open). Only the banner's View on a court letter.
  const openFromBanner = (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('#banner .view') : null;
    if (!t) return;
    const top = ctx.alerts.critical()[0];
    if (!top || top.code !== 'court_letter') return;
    ev.stopPropagation();
    const l = world.court.letters.find((x) => x.id === top.letter);
    openLetter(l ? l.id : null);
  };
  if (ctx.root && ctx.root.addEventListener) ctx.root.addEventListener('click', openFromBanner, true);

  return {
    sheets: { letter: letterSheet, court: courtSheet },
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary },
    onEvents,
    refresh() {},
    onAlertAction() {},
    onCommand() {},
    destroy() { if (ctx.root && ctx.root.removeEventListener) ctx.root.removeEventListener('click', openFromBanner, true); focusId = null; },
  };
}
