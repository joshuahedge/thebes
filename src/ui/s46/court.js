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
import { raidsOn } from '../../sim/costs.js';
import {
  courtOpen, favourBand, requestStatus, sendRequest, refuseRequest, readLetter, cardChoices, answerCard, monthsLeft, stockOf,
} from '../../sim/court.js';
import { unitsAway } from '../../sim/armies.js';
import { openSheet } from '../modes.js';
import { el, button } from '../components.js';
import { S46_COURT_TEXT as C, buildingName, plural } from '../text.js';
import { seamBase } from './seam.js';
import { quotaNodes } from '../s47/pressure.js';
import { sendQuota, quotaStatus } from '../../sim/pressure.js';
import { S47_PRESSURE_TEXT } from '../text.js';
import { V60_REIGN_TEXT as R } from '../text.js';
import { courtDemands, demandStatus, demandsOn } from '../../sim/demands.js';
import { courtDue, dueComing } from '../../sim/pressure.js';
import { costScale } from '../../sim/costs.js';
import { dateOfDay } from '../../sim/court.js';

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

// Version 6.0 (Track A, rulings 642, 643, 640): the court's due on the court sheet: what it takes now, how, and when; and the rank's running costs.
export function dueNodes(world) {
  const out = [el('h3', { text: R.dueHead })];
  if (!dueComing(world)) { out.push(line(R.dueBefore)); return out; }
  const due = courtDue(world);
  const parts = R.dueParts(due, world.gold);
  out.push(el('p', { class: 'due-now', text: `${R.dueNow(due, dateOfDay(due.day).year)}${parts ? ` ${parts}.` : ''}` }));
  if (due.gold > 0 && due.gold > world.gold) out.push(line(R.dueShort(due, world.gold), 'small coral due-short'));
  out.push(line(R.dueRule(due)), line(R.costsLine(costScale(world)), 'small muted costs-line'));
  return out;
}
// Version 6.0 (Track A, rulings 644-650): the court's demand on the court sheet: what it asks, where it stands, and the way to its sheet.
export function demandNodes(world, openDemand) {
  const out = [el('h3', { text: R.demandHead })];
  const d = courtDemands(world)[0];
  if (!d) {
    out.push(line(R.noDemand));
    if (world.demands.nextDay !== null) out.push(line(R.next(Math.ceil((world.demands.nextDay - world.day) / 30)), 'small muted next-demand'));
  } else {
    const st = demandStatus(world, d);
    out.push(el('p', { class: 'demand-line', text: `${R.demandTitle(d)}. ${d.accepted ? `${R.dueIn(d)} ${R.have(d, st)}.` : R.answerBy(d.monthsLeft)}` }));
    out.push(el('div', { class: 'actions' }, [button(R.open, { class: 'open-demand primary', onClick: openDemand })]));
  }
  if (world.demands.log.length) out.push(el('ul', { class: 'demands-past' }, [...world.demands.log].reverse().slice(0, 4).map((e) => el('li', { class: 'small', text: R.logLine(e) }))));
  return out;
}

export function createCourtUi(ctx) {
  if (!ctx || !ctx.world) return seamBase();   // no city to speak for (the contract's empty-seam test makes one with no context)
  const world = ctx.world;
  let focusId = null;                          // the letter the sheet shows (null: the first unread, else the oldest)
  let focusKind = null;                        // that letter's kind, kept to say why it closed if it goes while on show (ruling 447)
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });

  // The letters the sheet can show: a request letter with no request open is a stale record.
  const openLetters = () => world.court.letters.filter((l) => l.kind !== 'request' || world.court.request);
  // The letter the sheet shows: the one chosen (by "Next letter"), else the first not yet read, else the oldest waiting.
  const shownLetter = () => {
    const letters = openLetters();
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
      else if (e.type === 'units_lost') caption(C.captionUnitsLost(e));   // units back from the capital to a building that is gone (ruling 443)
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
    // A caravan's or the deserters' first choice takes no more than there is room for (ruling 444): the body says so from that effect.
    const capped = { caravan: 'goods', deserters: 'people' }[letter.card];
    const roomEffect = capped ? choices[0].effects.find((e) => e.kind === capped) : null;
    const view = {
      sick: letter.card === 'sickness' ? (choices[0].effects.find((e) => e.kind === 'faster') || { ids: [] }).ids.length : 0,
      shop: letter.card === 'craftsmen_dispute' && world.buildings[letter.args.id] ? buildingName(world.buildings[letter.args.id].type).toLowerCase() : '',
      room: roomEffect ? roomEffect.n : undefined,
    };
    body.append(el('h3', { class: 'letter-ask', text: C.cardTitle(letter.card) }), el('p', { class: 'letter-body', text: C.cardBody(letter, view) }));
    body.append(el('div', { class: 'court-choices' }, choices.map((c, i) => {
      const bad = c.effects.find((e) => problemEffect(c, e));
      return choice({
        label: C.choiceLabel(letter.card, c.id), primary: i === 0, cls: c.id, consequence: C.consequence(c.effects, world),
        problem: c.problem ? C.problem(c.problem, bad || null, world, bad && bad.good ? stockOf(world, bad.good) : 0) : '',
        onPick: () => {
          const events = [];
          // The effects shown go with the answer: if the city changed since the sheet was drawn, nothing happens and the sheet shows the
          // new numbers (ruling 444).
          const res = answerCard(world, letter.id, c.id, events, undefined, c.effects);
          if (!res.ok) { if (res.reason === 'changed') caption(C.captionChanged); ctx.refresh(); return; }
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
    // The letter on show closed while it was open (a request past its deadline, a card the court dropped): the sheet says so, rather than
    // swapping another letter in under the reader's finger (ruling 447). Only the court and Close remain.
    if (focusId !== null && !openLetters().some((l) => l.id === focusId)) {
      body.append(line(C.letterClosed(focusKind), 'letter-closed'), el('div', { class: 'actions letter-foot' }, [
        button(C.openCourt, { class: 'open-court quiet', onClick: () => { focusId = null; openCourtSheet(); } }),
        button(C.close, { class: 'close-letter quiet', onClick: () => { focusId = null; close(); } }),
      ]));
      return;
    }
    const letter = shownLetter();
    if (letter) { focusId = letter.id; focusKind = letter.kind; }   // pinned (ruling 381): the daily rebuild keeps showing this letter until it is answered, put off or closed
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
    const openDemand = () => ctx.store.set(openSheet(ctx.store.get(), 'demand'));
    // Version 6.0: the demands come from Town, before the court's letters open (ruling 645): a closed court still shows them.
    if (!courtOpen(world)) { body.append(line(C.closed(), 'muted')); if (demandsOn(world)) body.append(...demandNodes(world, openDemand)); return; }
    const band = favourBand(world);
    const raids = raidsOn(world);
    body.append(
      el('div', { class: `favour-head ${band}` }, [
        el('span', { class: 'favour-mark', 'aria-hidden': 'true', text: C.favourMark[band] }),
        el('strong', { class: 'favour-number', text: String(c.favour) }),
        el('span', { class: 'muted small favour-of', text: `of ${FAVOUR.max}` }),
        el('span', { class: 'favour-band', text: C.band[band] }),
      ]),
      favourMeter(world),
      el('p', { class: 'favour-now', text: `${C.bandNowOf(band, raids)}.` }),
      line(`${C.drift}.`),
    );
    if (!raids) body.append(line(C.peacefulNote));
    else if (world.raid.warning) body.append(line(`${C.warnedRaid(world.raid.warning)}.`, 'small muted warned-raid'));   // fixed at its warning (ruling 442)
    // The rules of the other bands (the band in effect is the line above), then the gift clock whenever it runs (ruling 375).
    if (band !== 'high') body.append(line(`${C.ruleHighOf(raids)}.`));
    if (band !== 'low' && raids) body.append(line(`${C.ruleLowOf(raids)}.`));
    if (c.nextGiftDay !== null) {
      const left = monthsLeft(world, c.nextGiftDay);
      body.append(line(`${left > 0 ? C.nextGift(left) : C.giftWaiting}.`, 'small muted gift-due'));
    }
    // Stage 4.7 (Task 7, ruling 469): the yearly tribute, a standing letter (src/ui/s47/pressure.js). Send ships from the stores; the sim's
    // events give the captions (the tribute met), and a part shipment says what left.
    body.append(...quotaNodes(world, {
      send: () => {
        const events = [];
        const res = sendQuota(world, events);
        if (!res.ok) { caption(S47_PRESSURE_TEXT.empty); ctx.refresh(); return; }
        const text = res.met ? S47_PRESSURE_TEXT.captionMet(res) : S47_PRESSURE_TEXT.captionShipped(res.shipped);
        caption(text);
        answered(events, text);
      },
      select: (id) => ctx.selectBuilding(id),
      showMeAt: (target) => ctx.showMeAt(target),
    }));
    // Version 6.0 (Track A, rulings 642-650): the court's due (what it would take now and when, and its rule) and the court's demand.
    body.append(...dueNodes(world), ...demandNodes(world, openDemand));
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
    if (!courtOpen(world)) {
      // Version 6.0 (ruling 645): a demand made before the court's letters open still has its row and its button.
      const d = courtDemands(world)[0];
      return d ? [el('h3', { text: C.courtHead, dataset: { section: 'court' } }), row(R.demandHead, R.demandTitle(d), 'demand-summary'),
        el('div', { class: 'actions court-actions' }, [button(R.open, { class: 'open-demand primary', onClick: () => ctx.store.set(openSheet(ctx.store.get(), 'demand')) })])] : [];
    }
    const c = world.court;
    const nodes = [el('h3', { text: C.courtHead, dataset: { section: 'court' } }), row(C.favour, favourLine(world))];
    // Stage 4.7 (Task 7, ruling 469): the yearly tribute while one is owed: what is sent and the months left (the court sheet has the rest).
    const qs = quotaStatus(world);
    if (qs && qs.result === null) nodes.push(row(S47_PRESSURE_TEXT.quotaHead, S47_PRESSURE_TEXT.summaryLine(qs), 'quota-summary'));
    // Version 6.0: the court's demand (open) and the due when it comes within its warning.
    const d = courtDemands(world)[0];
    if (d) nodes.push(row(R.demandHead, d.accepted ? `${R.demandTitle(d)}: ${R.dueIn(d)}` : `${R.demandTitle(d)}: ${R.offered.toLowerCase()}`, 'demand-summary'));
    if (dueComing(world)) { const due = courtDue(world); nodes.push(row(R.dueHead, R.dueSummary(due), due.gold > 0 && due.gold > world.gold ? 'coral due-summary' : 'due-summary')); }
    const actions = [];
    if (d) actions.push(button(R.open, { class: 'open-demand', onClick: () => ctx.store.set(openSheet(ctx.store.get(), 'demand')) }));
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
