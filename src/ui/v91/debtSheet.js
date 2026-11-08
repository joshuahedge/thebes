// Version 9.1 "First hours" (Track R, design 3c, rulings 1681-1684): Back to gold, the sheet the debt alert's View opens. Everything on it is the sim's own: the month's
// figures are monthFigures', a building's cost is its upkeep plus its staff's wages as monthFigures charges them, the months are those figures run forward, and a lever is
// listed only while the sim would honour it (a palace stands to set the rate; an open route's caravan or boat will take the good). Pause and Show me are the only controls.
import { monthFigures, taxesAt } from '../../sim/economy.js';
import { setPaused } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { costScale } from '../../sim/costs.js';
import { lacksRoad } from '../../sim/reach.js';
import { allBuildings, housesOf, isFinished } from '../../sim/world.js';
import { palaceOf, taxRateOf } from '../../sim/palace.js';
import { arrivalAt, byRiver, tradePrices, tradeStock, monthsToNextArrival } from '../../sim/trade.js';
import { tradeAllowed, heldBack } from '../../sim/tradeRules.js';
import { TAX_RATES } from '../../data/palace.js';
import { PARTNERS, FLOOR_STEP } from '../../data/trade.js';
import { BUILDINGS } from '../../data/buildings.js';
import { GOODS } from '../../data/goods.js';
import { ECONOMY } from '../../data/economy.js';
import { openSheet } from '../modes.js';
import { el, button } from '../components.js';
import { buildingName, goodName, partnerName, reasonText, T, V91_R_TEXT as W } from '../text.js';

export const TOP_COSTS = 3;
export const SELL_MIN = 10;          // a sale worth less than this many gold is not offered
export const SELL_RESERVE_MONTHS = 3; // the homes' own use of a good the sale leaves, in months

const taxRates = ['low', 'normal', 'high'];

// A building's monthly cost as monthFigures charges it (a paused building or one no road touches costs nothing there), or 0.
function costOf(world, scale, b) {
  if (b.paused || lacksRoad(world, b)) return 0;
  const def = BUILDINGS[b.type];
  return Math.round(def.upkeep * scale.upkeep) + Math.round(b.staff * ECONOMY.wagePerWorker * scale.wages);
}

// The costliest buildings Pause could stop, the lowest id first on a tie. A finished monument and a building with no staff and no upkeep have nothing to pause (setPaused).
export function topCosts(world, n = TOP_COSTS) {
  const scale = costScale(world), rows = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (isFinished(b) || (!def.workers && !def.upkeep && !def.monument)) continue;
    const cost = costOf(world, scale, b);
    if (cost > 0) rows.push({ id: b.id, type: b.type, cost });
  }
  // Fix wave (ruling 1739): buildings of one kind are one row ("2 Builders' guilds: 152 a month"), so no two rows read alike; id is the lowest of them, ids all of them.
  const kinds = new Map();
  for (const r of rows) {
    const k = kinds.get(r.type);
    if (k) { k.cost += r.cost; k.count += 1; k.ids.push(r.id); } else kinds.set(r.type, { id: r.id, ids: [r.id], type: r.type, cost: r.cost, count: 1 });
  }
  const merged = [...kinds.values()];
  merged.sort((a, b) => b.cost - a.cost || a.id - b.id);
  // Freed workers go to jobs that were short of them, so the wages come off in full only while no level of work is short (assignLabour's shortLevels).
  const exact = !(world.labour && world.labour.shortLevels && world.labour.shortLevels.length);
  return merged.slice(0, n).map((r) => ({ ...r, exact }));
}

// The tax lever: one step up from the palace's rate, with what it brings and what it costs in mood. None without a palace (the rate lives there), at High, or when the step brings nothing.
export function taxLever(world, f = monthFigures(world)) {
  const palace = palaceOf(world);
  if (!palace) return null;
  const now = taxRateOf(world), next = taxRates[taxRates.indexOf(now) + 1];
  if (!next) return null;
  const gain = taxesAt(world, next, f.taxesNormal) - f.taxes;
  return gain > 0 ? { rate: next, gain, mood: TAX_RATES[next].mood - TAX_RATES[now].mood, palace: palace.id } : null;
}

// The sale lever: the goods a partner pays for that homes do not need in bulk (household goods and luxuries; never food, which the homes eat, nor raw goods, which workshops
// use), above the homes' use for SELL_RESERVE_MONTHS months and what the temple and the court are owed. With the good on Sell and Keep at least `keep`, the next caravan or boat takes
// exactly the surplus its quota and room let it (src/sim/trade.js caravan). Best by gold, the lowest good then partner on a tie; null when nothing is worth SELL_MIN gold.
export function sellLever(world) {
  let residents = 0;
  for (const h of housesOf(world)) residents += h.residents;
  let best = null;
  for (const id of Object.keys(PARTNERS)) {
    if (!world.trade.routes[id]) continue;
    const site = arrivalAt(world, id);
    if (!site) continue;
    const prices = tradePrices(world, id).buys, used = world.trade.used[id] || {};
    for (const good of Object.keys(PARTNERS[id].buys)) {
      const g = GOODS[good];
      if (!g || !(g.kind === 'household' || g.luxury) || prices[good] === undefined || !tradeAllowed(world, id, good, 'buys')) continue;
      const reserve = Math.ceil((residents * (g.perResidentPerMonth || 0) * SELL_RESERVE_MONTHS) / FLOOR_STEP) * FLOOR_STEP;
      const keep = Math.max(reserve, heldBack(world, good).units);
      const quota = PARTNERS[id].buys[good].quota, room = Math.max(0, Math.min(Math.floor(quota / 4), quota - (used[good] || 0)));
      const n = Math.min(room, Math.max(0, tradeStock(world, good, site) - keep));
      const gold = n * prices[good];
      if (gold >= SELL_MIN && (!best || gold > best.gold)) best = { good, partner: id, keep, n, gold, boat: byRiver(id), post: site.id };
    }
  }
  return best && { ...best, months: monthsToNextArrival(world) };
}

// Everything the sheet says, as numbers.
export function debtModel(world) {
  const f = monthFigures(world), gold = world.gold;
  const costs = f.wages + f.upkeep + f.soldiers;
  const room = gold - ECONOMY.debtFloor;   // gold left before nothing new can be bought (negative: already past)
  return {
    gold, inDebt: gold < 0, taxes: f.taxes, wages: f.wages, upkeep: f.upkeep, soldiers: f.soldiers, costs, net: f.net,
    // Months until the treasury is back above 0: whole months of this month's net (the month end pays it), null when it never gets there.
    monthsToClear: gold >= 0 ? 0 : f.net > 0 ? Math.ceil(-gold / f.net) : null,
    room, monthsToLimit: room > 0 && f.net < 0 ? Math.floor(room / -f.net) : null, pastLimit: room < 0,
    top: topCosts(world), taxLever: taxLever(world, f), sellLever: sellLever(world),
  };
}

// The custom sheet 'backToGold' (createUI registers it). ctx is the interface's seam context: world, store, afterCommand, selectBuilding, toasts, root.
export function createDebtSheets(ctx) {
  const { world, store } = ctx;
  let note = null;   // what a Pause just did, shown once on the redraw it causes
  const list = (cls, rows) => el('ul', { class: cls, style: { listStyle: 'none', margin: '0', padding: '0' } }, rows);

  function pause(row) {
    let r = null;
    const done = [];
    for (const id of row.ids) { r = setPaused(world, id, true); if (!r.ok) break; done.push(id); }   // every building of the row's kind
    if (!r.ok) {
      for (const id of done) setPaused(world, id, false);   // all or none (fix wave re-review): a refusal part-way leaves the row as it was, so the toast's reason is the whole story
      assignLabour(world); if (ctx.toasts) ctx.toasts.show(reasonText(r.reason)); return;
    }
    assignLabour(world);
    note = W.pausedNote(W.kindName(row.type, row.count), row.cost);
    ctx.afterCommand({ kind: 'pause', result: r, text: T.paused, undoable: false });
    note = null;
    const said = (ctx.root || document).querySelector('#sheet .debt-note');
    if (said) said.focus();
  }

  function costRow(row) {
    const name = W.kindName(row.type, row.count);
    return el('li', { class: 'debt-cost', dataset: { id: String(row.id) } }, [
      el('div', { class: 'debt-cost-words' }, [
        el('strong', { text: W.costRow(name, row.cost) }),
        el('p', { class: 'small muted', text: (row.exact ? W.pauseSaves : W.pauseSavesUpTo)(row.cost, row.count) }),
      ]),
      button(W.pause, { class: 'debt-pause', 'aria-label': W.pauseLabel(name), onClick: () => pause(row) }),
    ]);
  }

  function leverRow(text, label, onShow) {
    return el('li', { class: 'debt-lever' }, [el('p', { text }), button(T.showMe, { class: 'debt-show', 'aria-label': label, onClick: onShow })]);
  }

  function sheet(body, { setTitle } = {}) {
    if (typeof setTitle === 'function') setTitle(W.debtTitle);
    const m = debtModel(world);
    const figures = [W.income(m.taxes), W.wages(m.wages), W.upkeep(m.upkeep), ...(m.soldiers ? [W.soldiers(m.soldiers)] : [])];
    const rate = m.gold >= 0 ? null : m.monthsToClear === null ? (m.net === 0 ? W.breaksEven : W.keepsFalling(-m.net)) : W.climbs(m.monthsToClear);
    const limit = m.pastLimit ? W.limitAt : [W.limitAhead(m.room), m.monthsToLimit === null ? '' : W.limitIn(m.monthsToLimit)].filter(Boolean).join(' ');
    const levers = [];
    if (m.taxLever) levers.push(leverRow(W.taxLever(m.taxLever.rate, m.taxLever.gain, m.taxLever.mood), W.taxLeverLabel(m.taxLever.rate), () => ctx.selectBuilding(m.taxLever.palace)));
    if (m.sellLever) {
      const s = m.sellLever;
      levers.push(leverRow(W.sellLever(goodName(s.good), partnerName(s.partner), s.gold, s.months, s.boat, s.keep), W.sellLeverLabel(goodName(s.good)),
        () => store.set(openSheet(store.get(), 'trade', s.post))));
    }
    body.append(el('section', { class: 'debt-sheet' }, [
      note ? el('p', { class: 'debt-note', role: 'status', tabindex: '-1', text: note }) : null,
      el('p', { class: 'debt-head', text: m.inDebt ? W.inDebt(m.gold) : W.notInDebt(m.gold) }),
      el('h3', { text: W.figuresHead }),
      list('debt-figures', figures.map((t) => el('li', { text: t }))),
      el('p', { class: 'debt-net', text: W.net(m.net) }),
      el('h3', { text: W.costsHead }),
      m.top.length ? list('debt-costs', m.top.map(costRow)) : el('p', { class: 'muted', text: W.costsNone }),
      el('h3', { text: W.rateHead }),
      rate ? el('p', { class: 'debt-rate', text: rate }) : null,
      el('p', { class: 'debt-limit', text: limit }),
      el('h3', { text: W.leversHead }),
      levers.length ? list('debt-levers', levers) : el('p', { class: 'muted', text: W.leversNone }),
    ]));
  }
  return { backToGold: sheet };
}
