// Stage 4.7, Task 7 (rulings 469-471): late-game pressure on screen.
//   quotaNodes(world, act)  the yearly tribute's standing letter on the court sheet (src/ui/s46/court.js calls it): the ask, a progress bar with
//                           its words (never the bar alone), a row per good, the deadline in game months, what meeting and missing it do, and
//                           Send with its exact consequence before the tap (or why not); in the year before the first, the warning with what
//                           would be asked at today's output; once met, when and the next one's date.
//   createPressureUi(ctx)   the seam (src/ui/s46/seam.js shape): captions for the quota, its warning and the raids' warning a year ahead; the
//                           tips (tribute_quota, raids_wealth, upper_tiers); and the house sheet's "Uses a month" row for the tougher tiers.
// Every number comes from the sim: src/sim/pressure.js (quotaStatus, quotaAsk, nextQuotaDay), src/sim/distribution.js monthlyNeed and the
// housing data, through S47_PRESSURE_TEXT (src/ui/text.js).
import { BUILDINGS } from '../../data/buildings.js';
import { QUOTA } from '../../data/s47.js';
import { HOUSEHOLD_GOODS } from '../../data/goods.js';
import { MAX_TIER } from '../../data/housing.js';
import { allBuildings } from '../../sim/world.js';
import { quotaStatus, quotaAsk, nextQuotaDay, quotaOf } from '../../sim/pressure.js';
import { courtOpen, monthsLeft, dateOfDay } from '../../sim/court.js';
import { needsOf, farHeld } from '../../sim/housing.js';
import { monthlyNeed } from '../../sim/distribution.js';
import { el, button } from '../components.js';
import { S47_PRESSURE_TEXT as P, tierName, goodName } from '../text.js';
import { seamBase } from '../s46/seam.js';

const line = (text, cls = 'small muted') => el('p', { class: cls, text });
// A labelled line ("If met: favour +8 ..."): the label in bold, then the words, wrapping as one paragraph so a long consequence never squeezes the label.
const rule = (label, value, cls) => el('p', { class: `small quota-rule ${cls}` }, [el('strong', { text: `${label}: ` }), `${value}.`]);
// The first store that holds some of a good (for Show me), or null.
const storeWith = (world, good) => allBuildings(world).find((b) => (BUILDINGS[b.type].stores || []).includes(good) && (b.store[good] || 0) > 0) || null;

// A good still owed that the stores hold only far from every bazaar (the house sheet's good_far, src/sim/housing.js farHeld): its row says so, names
// Fetch, and its Show me selects that store.
function farRow(world, g, act) {
  if (g.sent >= g.amount || g.have < 1) return [];
  const cause = farHeld(world, g.good);
  if (!cause) return [];
  const words = P.goodFar(cause, world);
  return [
    el('p', { class: 'small muted quota-far' }, [`${words.cause}. ${words.fix}.`]),
    el('div', { class: 'actions quota-far-actions' }, [button(P.showMe, { class: 'show-me quiet', 'aria-label': P.showFar(cause, world), onClick: () => act.select(cause.id) })]),
  ];
}

// The quota's bar: the share sent, with the numbers beside it and as its name (colour is never the only cue).
function quotaBar(st) {
  const pct = Math.round(st.share * 100);
  return el('div', { class: 'quota-progress' }, [
    el('span', { class: 'meter quota-meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(st.total), 'aria-valuenow': String(st.sent), 'aria-label': P.progressLabel(st) }, [
      el('span', { class: 'fill', style: { width: `${pct}%` } }),
    ]),
    el('span', { class: 'small quota-sent', text: P.progress(st) }),
  ]);
}

// The court sheet's section. act: { send(): result, select(id) } (the court seam answers through these, so the sheet's own captions and
// refresh run as for a request).
export function quotaNodes(world, act) {
  if (!courtOpen(world)) return [];
  const year = dateOfDay(world.day).year;
  const q = quotaOf(world);
  const st = quotaStatus(world, q);
  if (!st) {
    if (year < QUOTA.warnYear) return [];   // progressive disclosure: nothing about it until the year before the first
    const next = nextQuotaDay(world);
    const nodes = [el('h3', { class: 'quota-head', text: P.quotaHead })];
    if (year < QUOTA.fromYear) nodes.push(el('p', { class: 'quota-warning', text: `${P.warning(quotaAsk(world))}.` }));
    else nodes.push(line(`${P.quotaIntro(world.difficulty)}.`));
    if (next !== null) nodes.push(line(`${P.nextLine(dateOfDay(next).year, monthsLeft(world, next))}.`, 'small muted quota-next'));
    return nodes;
  }
  const nodes = [el('h3', { class: 'quota-head', text: P.quotaHead }), el('p', { class: 'quota-title', text: P.quotaTitle(st) }), quotaBar(st)];
  if (st.result === 'met') {
    const next = nextQuotaDay(world);
    nodes.push(line(`${P.metLine(st)}.`, 'small teal quota-met'));
    if (next !== null) nodes.push(line(`${P.nextLine(dateOfDay(next).year, monthsLeft(world, next))}.`, 'small muted quota-next'));
    return nodes;
  }
  nodes.push(el('ul', { class: 'quota-goods' }, st.goods.map((g) => {
    const done = g.sent >= g.amount;
    return el('li', { class: done ? 'met' : 'owed', dataset: { good: g.good } }, [
      el('span', { class: done ? 'tick' : 'cross', 'aria-hidden': 'true', text: done ? '✓' : '·' }), ' ',
      el('span', { class: 'name', text: goodName(g.good) }), ' ', el('span', { class: 'small', text: P.goodRow(g) }),
      ...farRow(world, g, act),
    ]);
  })));
  nodes.push(rule(P.due, P.dueText(st), 'quota-due'), rule(P.ifMet, P.ifMetText(st), 'quota-if-met'), rule(P.ifMissed, P.ifMissedText(st), 'quota-if-missed'));
  nodes.push(el('div', { class: 'court-choice quota-send' }, [
    button(P.sendLabel(st), { class: st.completes ? 'primary' : '', disabled: st.shipNow <= 0, onClick: () => act.send() }),
    el('p', { class: 'small muted consequence', text: `${P.sendConsequence(st)}.` }),
  ]));
  // Show me a store that holds an owed good the stores still have (the first such good), so the player can see where it lies.
  const shown = st.goods.find((g) => g.left > 0 && g.have > 0);
  const store = shown ? storeWith(world, shown.good) : null;
  if (store) nodes.push(el('div', { class: 'actions quota-actions' }, [button(P.showStore(shown.good), { class: 'show-me quiet', onClick: () => act.select(store.id) })]));
  return nodes;
}

// The household goods a tier uses a month in this home, from the housing data: [{ good, amount }] (monthlyNeed at that tier's use).
export function tierUse(house, tier) {
  return HOUSEHOLD_GOODS.filter((g) => needsOf(tier).includes(g)).map((good) => ({ good, amount: monthlyNeed(house, good, tier) }));
}
// The tier whose use the house sheet states: the next tier for a Fine manor (it is growing into a Villa), else the home's own; null for a home
// below that (its goods are the usual and its checklist says them).
export function useTierOf(house) {
  if (house.tier >= MAX_TIER - 1) return house.tier;
  if (house.tier === MAX_TIER - 2) return house.tier + 1;
  return null;
}

export function createPressureUi(ctx) {
  if (!ctx || !ctx.world) return seamBase();
  const world = ctx.world;
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });
  const tip = (key) => { if (ctx.fireTip) ctx.fireTip(key); };
  function onEvents(events) {
    for (const e of events || []) {
      if (e.type === 'court_quota') {
        if (e.result === 'asked') { caption(P.captionAsked(e)); tip('quotaAsked'); }
        else if (e.result === 'met') caption(P.captionMet(e));
        else if (e.result === 'missed') caption(P.captionMissed(e));
      } else if (e.type === 'quota_warning') caption(P.captionWarning);
      else if (e.type === 'quota_reminder') caption(P.captionReminder(e));
      else if (e.type === 'raids_grow') { caption(P.raidsGrow(e)); tip('raidsGrow'); }
      else if (e.type === 'raid_warning' && e.wealth) tip('raidsGrow');
      else if (e.type === 'upgrade' && e.to >= MAX_TIER - 2) tip('upperTiers');
    }
  }
  // The house sheet's row for the tougher tiers: what the tier uses a month, from the housing data.
  function house(h) {
    const tier = useTierOf(h);
    if (tier === null || h.residents < 1) return [];
    tip('upperTiers');
    const label = tier === h.tier ? P.useHead : `${P.useHead} as a ${tierName(tier).toLowerCase()}`;
    return [el('div', { class: 'row tier-use', dataset: { tier: String(tier) } }, [el('span', { class: 'muted', text: label }), el('span', { class: 'small', text: P.useLine(tier, tierUse(h, tier)) })])];
  }
  return { ...seamBase(), sheetParts: { ...seamBase().sheetParts, house }, onEvents };
}
