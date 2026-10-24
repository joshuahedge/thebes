// Version 7.0, Track E: the interface of city events (rulings 900-929), the seam (src/ui/s46/seam.js shape) createV70Seams makes once a game.
//   sheets       cityEvent: the card for the event that waits: its story, at most three choices, each a button with what it costs and does under it (the
//                sim's own list of effects: src/sim/cityEvents.js eventChoices), why not and Show me when one is off, and what is taken if nothing is
//                chosen. A bottom sheet on a phone and the side panel on a wide screen (createUI's sheets); it fits without scrolling at 390x844 and
//                100% text, and every button is 44 px with its words as its name (tests/v70/e).
//   sheetParts   summary: the Events section (the waiting event and a button to read it)
//   onEvents     the offer's caption and tip (the first-moment picture card is src/ui/cardMoments.js's), the outcome's caption (kept in Recent)
// Opened from the alert list's entry for the waiting event and from the Advice item's button (a click taken at the root, as the court's letter is: the list's
// View would open the summary), and from the summary's section. One panel at a time: it replaces whatever sheet is open, and nothing floats over the map. The
// card on show is pinned to its event (a later event never swaps the buttons under a finger); one answered or taken by default shows what became of it.
import { seamBase } from '../s46/seam.js';
import { allBuildings } from '../../sim/world.js';
import { isWorking } from '../../sim/labour.js';
import { BUILDINGS } from '../../data/buildings.js';
import { eventChoices, applyChoice, waitingEvent } from '../../sim/cityEvents.js';
import { openSheet } from '../modes.js';
import { el, button } from '../components.js';
import { CITY_EVENT_TEXT as C, alertText, T } from '../text.js';

const line = (text, cls = 'small muted') => el('p', { class: cls, text });

export function createCityEventsUi(ctx) {
  if (!ctx || !ctx.world) return seamBase();   // no city to speak for (the contract's empty-seam test makes one with no context)
  const world = ctx.world;
  let pinned = null;       // the event on show: { kind, day }
  let outcome = null;      // what became of it once it is over: its caption
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });
  const tip = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  const open = () => ctx.store.set(openSheet(ctx.store.get(), 'cityEvent'));

  // The store holding most of a good, or null.
  const storeOf = (good) => {
    let best = null;
    for (const b of allBuildings(world)) if ((BUILDINGS[b.type].stores || []).includes(good) && (b.store[good] || 0) > (best ? best.store[good] : 0)) best = b;
    return best;
  };
  // A store that keeps a good, held or not: the one holding most of it, else a working one, else any (a refusal about a good has somewhere to look even when nothing is stocked).
  const storeFor = (good) => {
    const keeps = allBuildings(world).filter((b) => (BUILDINGS[b.type].stores || []).includes(good));
    return storeOf(good) || keeps.find((b) => isWorking(world, b)) || keeps[0] || null;
  };
  // The home with the most people in it, or any home, or null (where "no home has room" can be looked at).
  const fullestHome = () => allBuildings(world).filter((b) => b.type === 'house').reduce((best, b) => (!best || (b.residents || 0) > (best.residents || 0) ? b : best), null);
  // The building a paid choice that would do nothing is about: what the event named (its workplaces, homes or store) if one stands, else the store of its good, else a building
  // of its kind, else a home.
  function concerned(w) {
    const figs = w.figs || {};
    const ids = [...(figs.ids || []), ...(figs.store !== undefined ? [figs.store] : [])];
    const named = ids.map((id) => world.buildings[id]).find(Boolean);
    if (named) return named;
    const type = figs.type || (w.kind === 'quarry_strike' ? 'quarry' : null);
    return (figs.good ? storeFor(figs.good) : null) || (type ? allBuildings(world).find((b) => b.type === type) : null) || fullestHome();
  }
  // A refusal's Show me: where the reason can be looked at (the money, the store that holds the good or would keep it, the home with no room, the temple of the year's festival, the
  // building a choice that would do nothing is about), or null when nothing of the kind stands at all. Every refusal has one that can (Version 7.1, ruling 1064).
  function showMeFor(c, w) {
    const bad = c.bad || {};
    const at = (b) => (b ? () => ctx.selectBuilding(b.id) : null);
    if (c.reason === 'no_gold') return () => ctx.onView({ code: 'no_gold' });
    if (c.reason === 'short') return at(storeFor(bad.good));
    if (c.reason === 'no_room') return at(bad.kind === 'goods' ? storeFor(bad.good) : fullestHome());
    if (c.reason === 'none') return at(concerned(w));
    if (c.reason === 'too_soon') return at(allBuildings(world).find((b) => b.type === 'temple' && isWorking(world, b)));
    return null;
  }

  // Captions for what happened, whoever caused it (the sim's day or the player's tap); the sim pushes the events, never reads them.
  function onEvents(events) {
    for (const e of events || []) {
      if (e.type === 'city_event_offered') { tip('cityEvent'); caption(C.captionOffered(e.kind, e.months)); }
      else if (e.type === 'city_event') {
        const text = C.captionOutcome(e, world);
        caption(text);
        if (pinned && pinned.kind === e.kind) outcome = text;
      }
    }
  }

  function answer(w, c, close) {
    const events = [];
    // The effects shown go with the answer: if the city changed since the card was drawn, nothing happens and the card shows the new figures.
    const res = applyChoice(world, w, c.id, events, c.effects);
    if (!res.ok) { if (res.reason === 'changed') caption(C.changed); ctx.refresh(); return; }
    onEvents(events);
    ctx.afterCommand({ kind: 'cityEvent', result: res, text: C.captionOutcome(res.event, world), undoable: false });   // (res.event: the outcome, not events[0], which a fever's illnesses come before)
    close();
  }

  function choiceNode(w, c, i, close) {
    const label = C.label(w.kind, c.id), note = C.consequence(c.effects, world, w.kind, c.id), why = c.ok ? '' : C.problem(c, world), sid = `event-${c.id}`;
    const go = showMeFor(c, w);
    return el('div', { class: `event-choice${c.default ? ' is-default' : ''}`, dataset: { choice: c.id } }, [   // (the id is data, never a class: a choice named "small" would take .small's type size)
      button(label, {
        class: i === 0 ? 'primary' : '', disabled: !c.ok, 'aria-describedby': why ? `${sid}-note ${sid}-why` : `${sid}-note`,
        'aria-label': `${label}. ${note}${why ? ` Not possible: ${why}.` : ''}`, onClick: () => answer(w, c, close),
      }),
      el('p', { class: 'small muted consequence', id: `${sid}-note`, text: note }),
      why ? el('p', { class: 'small coral why-not', id: `${sid}-why`, text: `${why}.` }) : null,
      why && go ? el('div', { class: 'fix refusal-fix' }, [button(T.showMe, { class: 'show-me', 'aria-label': `${T.showMe}: ${why}`, onClick: go })]) : null,
    ]);
  }

  function cardSheet(body, { close, setTitle }) {
    const w = waitingEvent(world);
    if (!w) {
      // The event on show is over (answered, or taken by default while the card was open): say what became of it, never swap another in.
      if (pinned && outcome) { setTitle(C.title(pinned.kind)); body.append(el('p', { class: 'event-over', text: outcome })); return; }
      body.append(el('p', { class: 'muted event-none', text: C.none }));
      return;
    }
    if (!pinned || pinned.kind !== w.kind || pinned.day !== w.day) { pinned = { kind: w.kind, day: w.day }; outcome = null; }
    setTitle(C.title(w.kind));
    const choices = eventChoices(world, w);
    const def = choices.find((c) => c.default);
    body.append(
      el('p', { class: 'event-body', text: C.body(w, world) }),
      // What is taken if the player waits comes straight after the story, before the choices (Version 7.1, ruling 1065): at 375x667 and 150% text the card scrolls, and this is the line to read first.
      def ? line(C.defaultLine(w.monthsLeft, C.label(w.kind, def.id), def.effects, world, w.kind), 'small muted event-default') : null,
      el('div', { class: 'event-choices' }, choices.map((c, i) => choiceNode(w, c, i, close))),
    );
  }

  // The summary's section while an event waits.
  function summary() {
    const w = waitingEvent(world);
    if (!w) return [];
    const title = C.title(w.kind);
    return [
      el('h3', { text: C.summaryHead, dataset: { section: 'events' } }),
      el('div', { class: 'row' }, [el('span', { class: 'muted', text: C.waitingLabel }), el('span', { class: 'event-summary', text: `${title}: ${C.answerBy(w.monthsLeft).toLowerCase()}` })]),
      el('div', { class: 'actions event-actions' }, [button(C.read, { class: 'read-event primary', 'aria-label': C.readLabel(title), onClick: open })]),
    ];
  }

  // The alert list's View on the event's entry, and the Advice item's button: the card, not the summary. Taken at the root before the button's own handler.
  const onClick = (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if (!t) return;
    const w = waitingEvent(world);
    if (!w) return;
    const li = t.closest('.alert-list li');
    const entry = li && t.classList.contains('view') && li.querySelector('strong');
    if (entry && entry.textContent === alertText({ code: 'city_event', kind: w.kind, months: w.monthsLeft }, world).title) { ev.stopPropagation(); open(); return; }
    if (t.closest('.advice-item[data-kind="event"]')) { ev.stopPropagation(); open(); }
  };
  if (ctx.root && ctx.root.addEventListener) ctx.root.addEventListener('click', onClick, true);

  return {
    ...seamBase(),
    sheets: { cityEvent: cardSheet },
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary },
    onEvents,
    destroy() { if (ctx.root && ctx.root.removeEventListener) ctx.root.removeEventListener('click', onClick, true); pinned = null; outcome = null; },
  };
}
