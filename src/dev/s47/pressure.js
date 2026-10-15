// Stage 4.7 Task 7 (rulings 469-471): the dev scenes for the late-game pressure (src/dev/s47/index.js joins them). Each sets the moment up through the
// sim's own functions, so what a shot shows is the real quota, raid and house with their real numbers. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   s47-quota       the court sheet with the yearly tribute open: year 8, two months in, part of it sent (options: state 'open' (default) | 'met' |
//                   'warning' (year 7: the warning and today's ask), sent (true: the first good shipped), quick)
//   s47-raid-wealth the raid sheet of a year-11 raid whose size carries the wealth term (the treasury at 40,000): "N raiders: your wealth draws k more"
//   s47-estate      the Stage 4.7 carts city (src/dev/s47/carts.js: pottery held only in a far district) with an Estate by the bazaars that has two
//                   kinds of food and no pottery: its sheet lists what keeps it, the third food and Show me to the far store (options: quick)
import { buildSampleCity } from '../sampleCity.js';
import { setGuide, previewHouses, paintHouses, canPlace, place } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { allBuildings, housesOf } from '../../sim/world.js';
import { courtDay, outputPerMonth } from '../../sim/court.js';
import { pressureMonth, quotaOf, sendQuota } from '../../sim/pressure.js';
import { raidDay, wealthDraw } from '../../sim/raids.js';
import { mergeSquare, mergeHouses } from '../../sim/merge.js';
import { touchesRoad } from '../../sim/reach.js';
import { coveredBy } from '../../sim/housing.js';
import { COURT } from '../../data/court.js';
import { QUOTA } from '../../data/s47.js';
import { RAIDS } from '../../data/raids.js';
import { MAX_TIER } from '../../data/housing.js';
import { BUILDINGS } from '../../data/buildings.js';
import { openSheet, select } from '../../ui/modes.js';
import { buildCartsCity } from './carts.js';
import { wait, inGame } from '../s46/base.js';

const YEAR = 360, MONTH = 30;

// Opens the court on the open city (Market town, the trading goal done) as the s46 court scenes do, with no letter waiting.
function openCourtOn(w) {
  if (!['market_town', 'city', 'great_city', 'capital'].includes(w.milestone)) w.milestone = COURT.from;
  if (!w.goals.completed.includes(COURT.afterGoal)) w.goals.completed.push(COURT.afterGoal);
  courtDay(w);
  w.court.letters = [];
  w.court.request = null;
  w.court.nextRequestDay = w.day + 6 * MONTH;
  w.court.nextCardDay = w.day + 12 * MONTH;
}

const storeFor = (w, good) => allBuildings(w).find((b) => (BUILDINGS[b.type].stores || []).includes(good) && b.staff > 0) || allBuildings(w).find((b) => (BUILDINGS[b.type].stores || []).includes(good));

export const quotaScene = async (api, options = {}) => {
  const g = inGame(api, 's47-quota');
  const w = g.world;
  const state = options.state || 'open';
  w.speed = 0;
  w.day = Math.max(w.day, (QUOTA.warnYear - 1) * YEAR);
  openCourtOn(w);
  if (state === 'warning') {
    w.day = (QUOTA.warnYear - 1) * YEAR + 2 * MONTH;
  } else {
    w.day = (QUOTA.fromYear - 1) * YEAR;
    w.court.yearMade = null;                                     // a year's output from the court's own outputPerMonth (no snapshot a year old)
    pressureMonth(w);                                            // asks year 8's quota, as the month end that begins the year does
    const q = quotaOf(w);
    w.day += 2 * MONTH;
    if (q && state === 'met') {
      for (const r of q.goods) { const s = storeFor(w, r.good); if (s) s.store[r.good] = (s.store[r.good] || 0) + r.amount; }
      sendQuota(w);
    } else if (q && options.sent !== false) {
      const [first, ...rest] = q.goods;
      const s = storeFor(w, first.good);
      if (s) s.store[first.good] = Math.max(s.store[first.good] || 0, first.amount);   // staged: the first good is in store and shipped
      sendQuota(w);
      for (const r of rest) { const t = storeFor(w, r.good); if (t) t.store[r.good] = Math.max(t.store[r.good] || 0, Math.round(r.amount * 0.4)); }   // the rest part in store
    }
  }
  g.ui.store.set(openSheet(g.ui.store.get(), 'court'));
  g.ui.refresh();
  await wait(options.quick ? 50 : 400);
  const sheet = document.querySelector('#sheet .quota-head');
  if (sheet && !options.quick) sheet.scrollIntoView({ block: 'center' });
  const q = quotaOf(w);
  return q ? `s47-quota: year ${q.year} ${q.goods.map((r) => `${r.sent}/${r.amount} ${r.good}`).join(', ')}, gift ${q.gift}, ${q.result || 'open'}` : `s47-quota: no quota (${state}), pottery a month ${outputPerMonth(w, 'pottery')}`;
};

export const raidWealthScene = async (api, options = {}) => {
  const g = inGame(api, 's47-raid-wealth');
  const w = g.world;
  w.speed = 0;
  w.day = 10 * YEAR + 2 * MONTH;                                 // year 11
  w.gold = Number.isFinite(options.gold) ? options.gold : 40000;
  const r = w.raid;
  r.clockDay = 0;
  r.index = Number.isInteger(options.index) ? options.index : 4;
  r.warning = null;
  r.active = null;
  r.last = { index: r.index - 1, dir: 'east', size: RAIDS.firstSize, won: true, byTowers: RAIDS.firstSize, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: w.day - 400 };
  r.nextWarnDay = w.day;
  raidDay(w);                                                    // the sim raises the warning: its size, wealth term and tribute fixed now
  w.speed = 0;
  g.ui.refresh();
  if (w.raid.warning) g.ui.store.set(openSheet(g.ui.store.get(), 'tribute'));
  await wait(options.quick ? 50 : 400);
  const warn = w.raid.warning;
  return warn ? `s47-raid-wealth: ${warn.size} raiders, wealth ${warn.wealth || 0} (now ${wealthDraw(w)}), tribute ${warn.tribute}, ${warn.second ? 'two bands' : 'one band'}` : 's47-raid-wealth: no warning';
};

export const estateScene = async (api, options = {}) => {
  inGame(api, 's47-estate');
  const world = api.freshWorld({ seed: 11, variant: 'classic', size: 64 });
  if (!allBuildings(world).length) buildSampleCity(world);
  setGuide(world, false);
  const info = buildCartsCity(world);
  const waiting = new Set(info.tip ? info.tip.homes : []);
  // Lift the plots round a home to Townhouses so a 2x2 square can form (a home that waits on the far pottery first), then join it and raise
  // it to an Estate. Plots lifted for a square that does not form go back to their tier.
  let estate = null;
  const homes = housesOf(world).filter((x) => x.w === 1 && x.residents > 0);
  for (const h of [...homes.filter((x) => waiting.has(x.id)), ...homes.filter((x) => !waiting.has(x.id))]) {
    const lifted = housesOf(world).filter((o) => o.w === 1 && Math.abs(o.x - h.x) <= 1 && Math.abs(o.y - h.y) <= 1).map((o) => [o, o.tier]);
    for (const [o] of lifted) o.tier = Math.max(o.tier, MAX_TIER - 4);
    const origin = mergeSquare(world, h);
    if (origin) { estate = mergeHouses(world, h, origin); if (estate) break; }
    for (const [o, t] of lifted) if (world.buildings[o.id] === o) o.tier = t;
  }
  // The sample city's plots stand in single rows: lay four plots in a free 2x2 beside a road near a bazaar instead (a fixture: not paid for).
  if (!estate) {
    const gold = world.gold;
    world.gold = 1e9;
    const served = (x, y) => ['water', 'religion', 'entertainment'].every((need) => coveredBy(world, { x, y, w: 2, d: 2 }, need));
    for (const strict of [true, false]) for (const bz of allBuildings(world).filter((b) => b.type === 'bazaar')) {
      for (let r = 2; r <= 16 && !estate; r++) {
        for (let dy = -r; dy <= r && !estate; dy++) {
          for (let dx = -r; dx <= r && !estate; dx++) {
            const x = bz.x + dx, y = bz.y + dy;
            const p = previewHouses(world, x, y, x + 1, y + 1);
            if (!p.ok || p.positions.length !== 4 || !touchesRoad(world, { x, y, w: 2, d: 2 }) || (strict && !served(x, y))) continue;
            if (!paintHouses(world, x, y, x + 1, y + 1).ok) continue;
            const plots = housesOf(world).filter((o) => o.x >= x && o.x <= x + 1 && o.y >= y && o.y <= y + 1);
            for (const o of plots) Object.assign(o, { tier: MAX_TIER - 4, residents: 20 });
            estate = mergeHouses(world, plots[0], mergeSquare(world, plots[0]));
          }
        }
      }
      if (estate) break;
    }
    // Its services, where none reaches it yet: a well, a temple and a booth beside the roads near it (fixtures too).
    for (const [type, need] of [['well', 'water'], ['temple', 'religion'], ['booth', 'entertainment']]) {
      if (!estate || coveredBy(world, estate, need)) continue;
      let done = false;
      for (let r = 1; r <= 8 && !done; r++) for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) {
        if (canPlace(world, type, estate.x + dx, estate.y + dy).ok) done = place(world, type, estate.x + dx, estate.y + dy).ok;
      }
    }
    assignLabour(world);
    world.gold = gold;
  }
  if (estate) {
    Object.assign(estate, { tier: MAX_TIER, residents: 160, stockedFor: 160, downTimer: 0, stock: { grain: 25, figs: 20, beer: 20, linen: 0, jewellery: 10 } });
  }
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.cam.zoom = 1;
  if (estate) {
    g.ui.cameraControl.jumpTo(estate.x + 1, estate.y + 3);
    g.ui.store.set(select(g.ui.store.get(), estate.id));
  }
  await wait(options.quick ? 50 : 400);
  const row = document.querySelector('#sheet .keep-list li[data-need="threeFoods"]');
  if (row && !options.quick) row.scrollIntoView({ block: 'center' });
  return estate ? `s47-estate: estate #${estate.id} at ${estate.x},${estate.y}, far store #${info.far}` : 's47-estate: no 2x2 square could form';
};
