// Version 6.0, Track A: the interface of the court's demands, the ranks beyond Capital and the great work (the court sheet's demand,
// its reward and failure cost before Accept, the closing scene in a sheet). The seam (src/ui/s46/seam.js shape); Track A owns this file.
//   sheets       demand (the open demand: offered, with Accept and Decline and what each does; accepted, with Send or what to build, and
//                Give up), greatWork (the reign: the ranks beyond Capital, the great temple's stages and offerings, Found it, its progress),
//                reignWon (the closing scene: the reign won, the sealed score, Play on; once, when the great temple is finished)
//   sheetParts   summary: the reign's row from Capital (the next rank's needs, the great work); building: the great temple's stage and offering
//   onEvents     captions for demands offered, accepted and settled, the court's due taken and an offering made; the tips; the closing scene
// The court sheet (src/ui/s46/court.js) shows the demand and the due among the court's own rows. One panel at a time: each opens as a sheet,
// nothing floats over the map. Every sentence comes from the sim (src/sim/demands.js, pressure.js courtDue, monuments.js greatWorkStatus)
// through V60_REIGN_TEXT (src/ui/text.js, Track A's section).
import { seamBase } from '../s46/seam.js';
import { el, button } from '../components.js';
import { openSheet, closeSheet } from '../modes.js';
import { V60_REIGN_TEXT as R, buildingName, viewLabel, T } from '../text.js';
import { courtDemands, demandStatus, demandFavour, acceptDemand, declineDemand, meetDemand, greatWorkOf } from '../../sim/demands.js';
import { greatWorkStatus, offeringOf, siteProgress, isGreatWork } from '../../sim/monuments.js';
import { MILESTONES } from '../../data/progression.js';
import { GREAT_WORK } from '../../data/reign.js';
import { milestoneIndex, milestoneNeedsMet, isUnlocked, atLeast } from '../../sim/progression.js';
import { population, allBuildings, isSite } from '../../sim/world.js';
import { costOf, costScale } from '../../sim/costs.js';
import { drawThumb, THUMB_W, THUMB_H } from '../thumbs.js';

const line = (text, cls = 'small muted') => el('p', { class: cls, text });

// The open demand the sheet shows (the oldest), or null.
export const shownDemand = (world) => courtDemands(world)[0] || null;

// The rank after this city's, with what it needs: { m, people, met } or null at the last rank (or below Capital: the reign's row starts there).
export function nextRank(world) {
  const i = milestoneIndex(world.milestone);
  const m = MILESTONES[i + 1];
  if (!m || i < milestoneIndex('capital')) return null;
  return { m, people: Math.max(world.tally.peakPeople, population(world)), met: milestoneNeedsMet(world, { needs: m.needs }) };
}

// What the great work's sheet shows: 'locked' (before the Seat), 'ready' (unlocked, not founded), 'rising' (a site), 'won'.
export function greatWorkState(world) {
  if (world.reign.won !== null) return 'won';
  const gw = allBuildings(world).find((b) => isGreatWork(b));
  if (gw && isSite(gw)) return 'rising';
  return atLeast(world, MILESTONES[MILESTONES.length - 1].id) && isUnlocked(world, GREAT_WORK.type) ? 'ready' : 'locked';
}

export const createReignUi = (ctx) => {
  if (!ctx || !ctx.world) return seamBase();   // no city to speak for (the contract's empty-seam test makes one with no context)
  const world = ctx.world;
  const caption = (text) => { if (ctx.celebrations) ctx.celebrations.show({ tier: 'info', text }); };
  const tip = (id) => { if (ctx.fireTip) ctx.fireTip(id); };
  const open = (kind) => ctx.store.set(openSheet(ctx.store.get(), kind));
  const records = () => (ctx.hooks && ctx.hooks.records) || null;
  const clock = () => (typeof ctx.clock === 'function' ? ctx.clock() : Date.now());
  const done = (events, text) => { onEvents(events); ctx.afterCommand({ kind: 'demand', result: { ok: true }, text, undoable: false }); };

  // A choice: its button, then what it does in words, then why not when it cannot be made (as the court's letters).
  function choice({ label, primary = false, consequence, problem = '', onPick, cls = '' }) {
    return el('div', { class: `court-choice ${cls}` }, [
      button(label, { class: primary ? 'primary' : '', disabled: Boolean(problem), onClick: onPick }),
      el('p', { class: 'small muted consequence', text: consequence }),
      problem ? el('p', { class: 'small coral why-not', text: problem }) : null,
    ]);
  }
  const row = (label, value, cls = '') => el('div', { class: `row ${cls}` }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

  // ── The demand sheet ──
  function demandSheet(body, { close, setTitle }) {
    const d = shownDemand(world);
    setTitle(R.demandHead);
    if (!d) { body.append(line(R.noDemand, 'muted')); return; }
    const f = demandFavour(world, d), st = demandStatus(world, d);
    const wrap = el('div', { class: `demand demand-${d.kind} ${d.accepted ? 'accepted' : 'offered'}`, dataset: { demand: String(d.id) } });
    body.append(wrap);
    wrap.append(el('h3', { class: 'demand-ask', text: R.demandTitle(d) }));
    const act = (fn, after) => () => { const events = []; const r = fn(world, d.id, events); if (!r.ok) { ctx.refresh(); return; } after(events, r); };
    if (!d.accepted) {
      // Ruling 612: the reward, the failure cost and the refusal cost, all before the tap.
      wrap.append(line(R.answerBy(d.monthsLeft), 'answer-by'), line(R.deadlineIf(d), 'deadline'), line(R.reward(d, f), 'reward'), line(R.failed(f), 'if-failed'), line(R.declined(f), 'if-declined'));
      wrap.append(el('div', { class: 'court-choices' }, [
        choice({ label: R.accept, primary: true, cls: 'accept', consequence: R.acceptWhat(d), onPick: act(acceptDemand, (events) => done(events, R.captionAccepted(d))) }),
        choice({ label: R.decline, cls: 'decline', consequence: R.declined(f), onPick: act(declineDemand, (events) => { close(); done(events, ''); }) }),
      ]));
    } else {
      wrap.append(line(R.dueIn(d), 'due-in'), row(R.have(d, st), '', st.ok ? 'teal have' : 'coral have'), line(R.reward(d, f), 'reward'), line(R.failed(f), 'if-failed'));
      const choices = [];
      if (d.kind === 'building') {
        choices.push(el('div', { class: 'court-choice build' }, [
          button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${buildingName(d.type)}`, onClick: () => ctx.showMeAt({ item: d.type, x: world.focus.x, y: world.focus.y }) }),
          el('p', { class: 'small muted consequence', text: R.buildIt(d) }),
        ]));
      } else {
        choices.push(choice({ label: R.send(d), primary: true, cls: 'send', consequence: R.sendWhat(d, f), problem: st.ok ? '' : R.problem(st.reason, st, d), onPick: act(meetDemand, (events) => { close(); done(events, ''); }) }));
      }
      choices.push(choice({ label: R.giveUp, cls: 'give-up', consequence: R.failed(f), onPick: act(declineDemand, (events) => { close(); done(events, ''); }) }));
      wrap.append(el('div', { class: 'court-choices' }, choices));
    }
    wrap.append(line(R.favourWhy, 'small muted favour-why'));
    body.append(el('div', { class: 'actions letter-foot' }, [
      button(R.later, { class: 'later quiet', onClick: close }),
      button(R.openCourt, { class: 'open-court quiet', onClick: () => open('court') }),
    ]));
  }

  // ── The great work's sheet ──
  function greatWorkSheet(body, { setTitle }) {
    setTitle(R.reignHead);
    const next = nextRank(world);
    if (next) body.append(line(R.nextRank(next.m, next.people, next.met), 'next-rank'));
    const state = greatWorkState(world);
    body.append(el('h3', { text: R.greatHead }));
    if (state === 'locked') body.append(line(R.greatLocked, 'great-locked'));
    if (state === 'ready') {
      body.append(line(R.greatReady, 'great-ready'), line(R.greatCost(costOf(world, GREAT_WORK.type), costScale(world).monuments), 'great-cost'));
      body.append(el('ol', { class: 'offerings' }, R.offeringsList(world, offeringOf).map((t) => el('li', { class: 'small', text: t }))));
      body.append(el('div', { class: 'actions' }, [button(R.greatFound, { class: 'found primary', 'aria-label': `${R.greatFound}: ${buildingName(GREAT_WORK.type)}`, onClick: () => ctx.showMeAt({ category: 'monuments', item: GREAT_WORK.type, x: world.focus.x, y: world.focus.y }) })]));
    }
    if (state === 'rising') {
      const gw = allBuildings(world).find((b) => isGreatWork(b));
      const s = greatWorkStatus(world, gw), p = siteProgress(gw);
      body.append(line(R.stageLine(s), 'stage'), el('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.floor(p.done * 100)), 'aria-label': `${R.greatHead}: ${Math.floor(p.done * 100)}%` }, [
        el('span', { class: 'fill', style: { width: `${Math.floor(p.done * 100)}%` } })]));
      if (s.offering) body.append(line(R.offeringLine(s.offering), s.offering.have >= s.offering.n ? 'small offering' : 'small coral offering'));
      body.append(el('ol', { class: 'offerings' }, R.offeringsList(world, offeringOf).map((t, i) => el('li', { class: i < s.offered ? 'small muted done' : 'small', text: `${t}${i < s.offered ? ' ✓' : ''}` }))));
      body.append(el('div', { class: 'actions' }, [button(T.view, { class: 'view', 'aria-label': viewLabel(buildingName(gw.type)), onClick: () => ctx.selectBuilding(gw.id) })]));
    }
    if (state === 'won') {
      body.append(line(R.wonSummary(world.reign.won), 'won'), el('div', { class: 'actions' }, [button(R.seeAgain, { class: 'see-again', onClick: () => open('reignWon') })]));
    }
  }

  // The finished great temple, drawn as its card is (src/ui/thumbs.js) at twice the size: a still picture, the same under every Motion level.
  function picture() {
    try {
      const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
      return drawThumb(el('canvas', { class: 'won-picture', 'aria-hidden': 'true', style: { width: `${THUMB_W * 2}px`, height: `${THUMB_H * 2}px`, display: 'block', margin: '0 auto' } }), GREAT_WORK.type, dpr * 2);
    } catch (e) { return null; }   // no canvas (a test page without one): the words carry the scene
  }

  // ── The closing scene (ruling 658): in a sheet, never over the map; still under every Motion level ──
  function reignWonSheet(body, { close, setTitle }) {
    setTitle(R.wonTitle);
    world.reign.closed = true;
    const seal = world.reign.seal;
    body.append(el('div', { class: 'reign-won' }, [
      picture(),
      el('p', { class: 'won-lead', text: R.wonLead(world.reign.won === null ? world.day : world.reign.won) }),
      seal ? el('p', { class: 'won-seal', text: R.wonSeal(seal) }) : null,
      el('p', { class: 'small muted won-on', text: R.wonOn }),
    ]));
    body.append(el('div', { class: 'actions' }, [button(R.playOn, { class: 'play-on primary', onClick: close })]));
  }

  // ── The summary's row (from Capital) ──
  function summary() {
    if (!atLeast(world, 'capital')) return [];
    const nodes = [el('h3', { text: R.reignHead, dataset: { section: 'reign' } })];
    const next = nextRank(world);
    if (next) nodes.push(line(R.nextRank(next.m, next.people, next.met), 'small next-rank'));
    const state = greatWorkState(world);
    if (state === 'won') nodes.push(line(R.wonSummary(world.reign.won), 'small won'));
    else if (state === 'rising') { const gw = greatWorkOf(world) || allBuildings(world).find((b) => isGreatWork(b)); nodes.push(line(R.stageLine(greatWorkStatus(world, gw)), 'small stage')); }
    nodes.push(el('div', { class: 'actions' }, [button(R.greatOpen, { class: 'open-great-work', onClick: () => open('greatWork') })]));
    return nodes;
  }

  // ── The great temple's own sheet: its stage and the offering it waits for, and a way to the great work's sheet ──
  function buildingPart(b) {
    if (!isGreatWork(b) || !b.site) return [];
    const s = greatWorkStatus(world, b);
    return [el('div', { class: 'great-work-part' }, [
      s.offering && !s.waiting ? line(R.offeringLine(s.offering), s.offering.have >= s.offering.n ? 'small offering' : 'small coral offering') : null,   // waiting: the site's own cause row says it
      button(R.greatOpen, { class: 'open-great-work quiet', onClick: () => open('greatWork') }),
    ])];
  }

  function onEvents(events) {
    for (const e of events) {
      if (e.type === 'demand_offered') { tip('demandOffered'); caption(R.captionOffered(e.demand)); }
      else if (e.type === 'demand_settled') caption(R.captionSettled(e));
      else if (e.type === 'court_due') caption(R.dueCaption(e));
      else if (e.type === 'quota_warning') tip('dueWarned');
      else if (e.type === 'offering_made') caption(R.offeringMade(e));
      else if (e.type === 'milestone' && milestoneIndex(e.id) >= milestoneIndex('capital')) tip(e.id === MILESTONES[MILESTONES.length - 1].id ? 'greatWorkUnlocked' : 'beyondCapital');
      else if (e.type === 'reign_won') {
        try { if (records() && e.seal) records().addSeal(world, e.seal, clock()); } catch (err) { /* records never stop the closing scene */ }
        open('reignWon');
      }
    }
  }

  // The advice sheet's View on a demand item, and the alert list's View on a demand or due alert, open the demand's own sheet or the court
  // (the advice's own fix selects a store or opens the summary: the seam takes the tap first, as the court's letters do).
  const intercept = (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('.advice-item[data-kind="demand"] button') : null;
    if (!t) return;
    ev.stopPropagation();
    const item = t.closest('.advice-item');
    open(item && item.dataset.key === 'court_due' ? 'court' : 'demand');
  };
  if (ctx.root && ctx.root.addEventListener) ctx.root.addEventListener('click', intercept, true);

  return {
    ...seamBase(),
    sheets: { demand: demandSheet, greatWork: greatWorkSheet, reignWon: reignWonSheet },
    sheetParts: { building: buildingPart, house: () => [], actions: () => [], summary },
    onEvents,
    // A reign won while the closing scene was never seen (a city saved on that day): it opens once nothing else is open.
    refresh() { if (world.reign.won !== null && !world.reign.closed && !ctx.store.get().sheet) open('reignWon'); },
    destroy() { if (ctx.root && ctx.root.removeEventListener) ctx.root.removeEventListener('click', intercept, true); },
  };
};

// Closes any sheet (for tests and the dev scenes): re-exported so a scene need not reach into modes.js.
export { closeSheet };
