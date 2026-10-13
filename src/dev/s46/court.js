// Stage 4.6, the Court track's dev scenes (window.__thebes.devScene(name, options), on the seed-11 sample city:
// /?skipTitle=1&nosw=1&seed=11&sample=1). Each opens the court the way a city would (the milestone and the trading goal, then the sim's own
// courtDay writes the letter), so what a shot shows is the real request or card with the real numbers.
//   s46-court-letter  a court letter open as a sheet: a request with its amount, deadline, reward and the cost of refusing
//                     options: kind ('goods' by default; 'food', 'gold', 'soldiers'), guided (the first, easy letter), short (the
//                     stores hold too little), alert (leave it unread, no sheet: the alert row shows it)
//   s46-court-card    an event card open as a sheet (options: card, one of COURT_CARD_IDS; 'caravan' by default)
//   s46-court         the court sheet: favour, the letters waiting, past letters (options: favour)
import { inGame, wait } from './base.js';
import { openSheet } from '../../ui/modes.js';
import { atLeast } from '../../sim/progression.js';
import { courtDay, eligibleCards } from '../../sim/court.js';
import { COURT, REQUESTS, FAVOUR } from '../../data/court.js';
import { makeBuilding, insertBuilding, allBuildings } from '../../sim/world.js';
import { BUILDINGS } from '../../data/buildings.js';

const YEAR_DAYS = 360;

// A sample city with the court open and nothing waiting: Market town, the trading goal done, in year 2 or later, paused.
function openedCourt(g) {
  const w = g.world;
  if (!atLeast(w, COURT.from)) w.milestone = COURT.from;
  if (!w.goals.completed.includes(COURT.afterGoal)) w.goals.completed.push(COURT.afterGoal);
  w.day = Math.max(w.day, (REQUESTS.firstYear - 1) * YEAR_DAYS);
  w.speed = 0;
  w.court.letters = [];
  w.court.request = null;
  w.court.cards = [];
  courtDay(w);                                  // opens it (guided pending)
  return w;
}

// Draws requests day by day until one of the wanted kind comes (the same days give the same request every time).
function requestOf(w, kind, guided) {
  w.court.guided = guided ? 'pending' : 'answered';
  for (let tries = 0; tries < 90; tries++) {
    w.court.letters = [];
    w.court.request = null;
    w.court.nextRequestDay = w.day;
    if (guided) w.court.guided = 'pending';
    courtDay(w);
    if (w.court.request && (guided || w.court.request.kind === kind)) return w.court.request;
    w.day += 1;
  }
  return w.court.request;
}

async function show(g, sheet) {
  const ui = g.ui;
  ui.store.set(openSheet(ui.store.get(), sheet));
  ui.refresh();
  await wait(400);
}

export const COURT_SCENES = {
  's46-court-letter': async (api, options = {}) => {
    const g = inGame(api, 's46-court-letter');
    const w = openedCourt(g);
    if (options.kind === 'soldiers') {
      const bar = insertBuilding(w, makeBuilding(w, 'barracks', 2, 2));
      for (let i = 0; i < 5; i++) w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: 3, y: 3, hp: 12, hit: false, task: 'wait' });
    }
    const r = requestOf(w, options.kind || 'goods', Boolean(options.guided));
    // Staged: the stores hold what it asks (unless options.short), so Send is live, as in a city that has been saving up.
    if (r && r.good && !options.short) {
      const store = allBuildings(w).find((b) => (BUILDINGS[b.type].stores || []).includes(r.good));
      if (store) store.store[r.good] = Math.max(store.store[r.good] || 0, r.amount + 25);
    }
    if (options.alert) { g.ui.store.set({ sheet: null }); g.ui.refresh(); await wait(400); }   // unread: the alert row carries it, no sheet
    else await show(g, 'letter');
    return r ? `court letter: ${r.kind} ${r.good || ''} ${r.amount}, due day ${r.due}, favour +${r.met}/-${r.missed}, reward ${r.gold}` : 'court letter: no request could be drawn';
  },
  's46-court-card': async (api, options = {}) => {
    const g = inGame(api, 's46-court-card');
    const w = openedCourt(g);
    const want = options.card || 'caravan';
    const found = eligibleCards(w, { canArrive: () => true, canLeave: () => true, canForecast: () => true }).find((e) => e.card === want);
    if (!found) return `court card: ${want} cannot come in this city`;
    w.court.letters.push({ id: w.court.nextId++, kind: 'card', card: found.card, day: w.day, read: false, args: found.args });
    await show(g, 'letter');
    return `court card: ${found.card}`;
  },
  's46-court': async (api, options = {}) => {
    const g = inGame(api, 's46-court');
    const w = openedCourt(g);
    w.court.favour = Number.isFinite(options.favour) ? options.favour : 74;
    w.court.nextGiftDay = w.day + 4 * 30;
    requestOf(w, options.kind || 'goods', false);
    w.court.log.push({ day: w.day - 200, kind: 'request', result: 'met', request: { kind: 'gold', good: null, amount: 150 }, favour: 12, gold: 40 });
    w.court.log.push({ day: w.day - 120, kind: 'gift', gold: 120, good: null, n: 0 });
    await show(g, 'court');
    return `court sheet: favour ${w.court.favour} of ${FAVOUR.max}`;
  },
};
