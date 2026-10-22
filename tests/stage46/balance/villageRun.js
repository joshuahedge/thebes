// Stage 4.6 balance pass (rulings 430-437): the 10-year village of tests/sim/longrun.test.js, on the same 48-tile map with a side
// channel of the river north of its farms (so the farms stand on the floodplain and a wharf has water), run through the same
// commands. extras: what a steady player adds from Stage 4.6: at Town a fishing wharf on the channel and a hunting lodge by the
// granary (a lodge delivers to a store within its producer reach); at Market town an archery range and the court (the village has no
// trading post, so the trading goal is marked done as courtWorld does in tests/stage46/court/courtHelpers.js; a route's own income is
// left out). Ruling 430: the Stage 4.6 village is farms 2 and towers 2, as the wharf and lodge do the third farm's work and the
// archers the third tower's; farms 3 and towers 3 with extras is everything on top. The player reads every letter at the month's
// end, sends a request as soon as the stores and treasury hold enough, and answers a card with its first choice that can be made.
// lowYears forces those years' floods Low (the Low-year check): a list of game years, or 'all'.
// Stage 4.7 (Task 8): the player also sends the capital's yearly tribute (ruling 469; asked from year 8, sent as soon as the stores hold it all and, from
// month 10, whatever they hold), and with the extras at Market town lays a second granary at the east end of the street (beside the last homes) that
// Fetches fish from the first (the wharf's catch piles up there; the village's grain is eaten as it is made and never rests in a store) (ruling 466): one fetch order, with its store's wages and upkeep, so the 60-70% check covers the carts' cost.
import { advanceDays } from '../../../src/sim/clock.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { COURT } from '../../../src/data/court.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';
import { housesOf, population, allBuildings } from '../../../src/sim/world.js';
import { atLeast } from '../../../src/sim/progression.js';
import { floodplainOf } from '../../../src/sim/flood.js';
import { readLetter, requestStatus, sendRequest, cardChoices, answerCard, outputPerMonth } from '../../../src/sim/court.js';
import { quotaOf, quotaStatus, sendQuota } from '../../../src/sim/pressure.js';
import { setFetch } from '../../../src/sim/carts.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { noNewDangers } from '../../v60/b1/grace.js';

const RAIDER_ENTRIES_48 = [{ x: 47, y: 24 }, { x: 24, y: 0 }];
// The channel: rows 6-7, x 0-13 (the fertile strip is x 0-7), so the farms' north row (y 10) is 3 tiles from the water.
const CHANNEL = [0, 6, 14, 2];

function village({ channel, farms }) {
  const w = noNewDangers(makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: ECONOMY.startGold, raiderEntries: RAIDER_ENTRIES_48 }));   // Version 6.0: the run measures the game before the new dangers (tests/v60/b1/grace.js)
  if (channel) {
    const [cx, cy, cw, cd] = CHANNEL;
    for (let y = cy; y < cy + cd; y++) for (let x = cx; x < cx + cw; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
    w.floodplain = floodplainOf(w.terrain, w.size);
  }
  const steps = [
    () => drawRoad(w, 0, 12, 27, 12),
    () => paintHouses(w, 10, 13, 26, 13),
    () => place(w, 'well', 12, 11),
    () => place(w, 'well', 18, 11),
    () => place(w, 'well', 24, 11),
    () => place(w, 'farm_grain', 0, 10),
    () => place(w, 'farm_grain', 2, 10),
    ...(farms >= 3 ? [() => place(w, 'farm_grain', 4, 10)] : []),
    () => place(w, 'granary', 6, 10),
    () => place(w, 'bazaar', 16, 10),
    () => place(w, 'temple', 19, 10),
  ];
  for (const s of steps) { const r = s(); if (!r.ok) throw new Error(`village step refused: ${r.reason}`); }
  return w;
}

// longrun.test.js's LATER (towers: 3 there), and Stage 4.6's additions (extras).
const later = (towers) => [
  { milestone: 'town', steps: [['firehouse', 8, 11], ['firehouse', 21, 11], ['physician', 15, 11]] },
  { milestone: 'market_town', steps: [['tower', 14, 11], ['tower', 22, 11], ...(towers >= 3 ? [['tower', 26, 11]] : []), ['police_post', 23, 11]] },
];
const FETCH = { milestone: 'market_town', steps: [['granary', 27, 10], ['fetch', 'fish', 100]] };
const EXTRAS = [
  { milestone: 'town', steps: [['road', 9, 8, 9, 11], ['fishing_wharf', 10, 8], ['hunting_lodge', 8, 13]] },
  { milestone: 'market_town', steps: [['archery_range', 10, 9]], court: true },

];

const homesUnfed = (w) => housesOf(w).filter((h) => h.tier > 0 && h.met && h.met.food === false && h.residents > 0).length;
const foodStock = (w) => allBuildings(w).reduce((n, b) => n + (b.type === 'granary' ? Object.values(b.store).reduce((a, v) => a + v, 0) : 0), 0);

function courtTurn(w, log) {
  const c = w.court;
  if (!c.awake) return;
  for (const l of c.letters) readLetter(w, l.id);
  if (c.request && !log.requests.some((r) => r.id === c.request.id)) {
    const r = c.request;
    const made = r.kind === 'gold' ? monthFigures(w).taxes : r.kind === 'soldiers' ? null : outputPerMonth(w, r.good);
    log.requests.push({ id: r.id, kind: r.kind, good: r.good, amount: r.amount, perMonth: made, reward: r.gold, day: r.day, due: r.due, guided: r.guided, taxes: monthFigures(w).taxes, result: null, metDay: null });
  }
  if (c.request && requestStatus(w).ok) {
    const id = c.request.id;
    const done = sendRequest(w);
    if (done.ok) Object.assign(log.requests.find((r) => r.id === id), { result: 'met', metDay: w.day });
  }
  // The yearly tribute (Stage 4.7): sent once the stores hold all of it, and from month 10 whatever they hold.
  const q = quotaOf(w);
  if (q && q.result === null) {
    const st = quotaStatus(w);
    const monthOfYear = (Math.floor(w.day / 30) % 12) + 1;
    if (st.completes || (monthOfYear >= 10 && st.shipNow > 0)) {
      const r = sendQuota(w);
      if (r.met) log.quotas.push({ year: q.year, goods: q.goods.map((g) => `${g.amount} ${g.good}`).join(', '), early: r.early, favour: r.favour, gift: r.gift });
    }
  }
  for (const l of c.letters.filter((x) => x.kind === 'card')) {
    const choice = cardChoices(w, l).find((x) => !x.problem);
    if (!choice) continue;
    const before = w.gold;
    if (answerCard(w, l.id, choice.id).ok) log.cards.push({ card: l.card, choice: choice.id, gold: w.gold - before });
  }
}

// This year's flood made Low before the water rises, in the years asked for.
const forceLow = (w, years) => {
  const f = w.flood;
  if (f.year !== null && !f.risen && (years === 'all' || years.includes(f.year))) f.level = 'low';
};

// Runs the village month by month for `years`; returns the world, each month's figures and the court's log.
export function runVillage46({ extras = true, channel = true, lowYears = [], years = 10, farms = 3, towers = 3, fetch = false } = {}) {
  const w = village({ channel, farms });
  const plans = [...later(towers), ...(extras ? EXTRAS : []), ...(extras && fetch ? [FETCH] : [])].map((l) => ({ ...l, done: false }));
  const months = [];
  const log = { requests: [], cards: [], gifts: [], quotas: [], asked: [] };
  const fetches = [];
  let lowestGold = w.gold;
  for (let month = 0; month < years * 12; month++) {
    forceLow(w, lowYears);
    const events = [];
    const giftsBefore = w.tally.gifts;
    advanceDays(w, 30, events);
    forceLow(w, lowYears);
    lowestGold = Math.min(lowestGold, w.gold);
    const s = w.stats.lastMonth;
    for (const e of events) if (e.type === 'court_quota' && e.result === 'asked') log.asked.push({ year: e.quota.year, goods: e.quota.goods.map((g) => `${g.amount} ${g.good}`).join(', '), gift: e.quota.gift });
    for (const e of events) if (e.type === 'court_quota' && e.result === 'missed') log.asked.push({ year: e.quota.year, missed: true });
    for (const e of events) if (e.type === 'court_gift') log.gifts.push({ gold: e.gold, good: e.good, n: e.n, taxes: s.taxes, month });
    months.push({
      spent: s.wages + s.upkeep + s.soldiers, taxes: s.taxes, wages: s.wages, upkeep: s.upkeep, soldiers: s.soldiers,
      unfed: homesUnfed(w), food: foodStock(w), applied: w.flood.applied, favour: w.court.favour, gold: w.gold,
      made: { ...(s.made || {}) }, gifts: w.tally.gifts - giftsBefore,
    });
    courtTurn(w, log);
    for (let i = fetches.length - 1; i >= 0; i--) if (setFetch(w, fetches[i].id, fetches[i].good, fetches[i].amount).ok) fetches.splice(i, 1);
    for (const l of plans) {
      if (l.done || !atLeast(w, l.milestone)) continue;
      let last = null;
      for (const st of l.steps) {
        if (st[0] === 'fetch') { fetches.push({ id: last, good: st[1], amount: st[2] }); continue; }   // set as soon as a store can be drawn on
        const r = st[0] === 'road' ? drawRoad(w, st[1], st[2], st[3], st[4]) : place(w, st[0], st[1], st[2]);
        if (!r.ok) throw new Error(`${st[0]} refused at ${st[1]},${st[2]}: ${r.reason}`);
        if (r.id !== undefined) last = r.id;
      }
      if (l.court && !w.goals.completed.includes(COURT.afterGoal)) w.goals.completed.push(COURT.afterGoal);
      l.done = true;
    }
  }
  return { w, months, lowestGold, log, people: population(w) };
}

const cache = new Map();
export const villageRun46 = (opts = {}) => {
  const key = JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, runVillage46(opts));
  return cache.get(key);
};
