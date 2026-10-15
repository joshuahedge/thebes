// The danger interface's sheets and sheet parts (spec 4.12, 4.13, 6.3), for src/ui/danger.js: the tribute confirmation
// sheet, the fire row on every building and home sheet, the firehouse, tower, barracks and rubble rows, the temple's
// Hold a festival, and the last raid's report in the summary. Every sentence is computed from the sim's own rules
// (src/sim/fire.js coverage, src/sim/raids.js tributeQuote and raid.last, src/sim/festival.js festivalStatus), so the
// words say what the sim does. Each function takes the danger interface's context (ctx) and returns DOM nodes.
import { BUILDINGS } from '../data/buildings.js';
import { FIRE } from '../data/fire.js';
import { HEALTH } from '../data/health.js';
import { CRIME } from '../data/crime.js';
import { DEFENCE, FESTIVAL } from '../data/raids.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { ECONOMY } from '../data/economy.js';
import { allBuildings } from '../sim/world.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { isWorking, staffRatio } from '../sim/labour.js';
import { canBurn, fireStarted, fireRiskOf, fireBand, fireCause, clearRubble } from '../sim/fire.js';
import { tributeQuote, payTribute, warningDirs } from '../sim/raids.js';
import { healthStarted, canFallIll, healthCause, healthFactors, healthBandOf, illnessDaysLeft, homesCoveredBy } from '../sim/health.js';
import { crimeStarted, canCommitCrime, crimeCause, crimeFactors, crimeBand, crimeRiskOf, crimeHomesCoveredBy } from '../sim/crime.js';
import { festivalStatus, holdFestival } from '../sim/festival.js';
import { rubbleCostOf } from '../sim/costs.js';
import { canAfford } from '../sim/money.js';
import { dateParts } from '../sim/clock.js';
import { idx } from '../sim/grid.js';
import { el, button } from './components.js';
import { armyRowsModel } from './s46/armies.js';
import { alertText, dateText, plural, viewLabel, T, DANGER_UI_TEXT, S46_ARMY_TEXT, S47_PRESSURE_TEXT } from './text.js';

const D = DANGER_UI_TEXT;
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// The fire row (spec 4.12) as { text, burning, action }: action null, { kind: 'showMe' } (the firehouse card with its
// ghost by the building) or { kind: 'view', id } (the firehouse that reaches it but is short of workers, paused or
// burning). The reason is fireCause's (src/sim/fire.js), the one the fire alerts word, so the row and the banner never
// disagree. On a firehouse's own sheet the firehouse named may be itself: the row says "this firehouse" and has no View.
export function fireRowModel(world, b) {
  if (!canBurn(b)) return { text: D.neverBurns, burning: false, action: null };
  if (!b.fire && !fireStarted(world)) return { text: D.riskStartsAtTown, burning: false, action: null };
  const c = fireCause(world, b);
  const staffed = c.cause === 'covered';                                   // staffedCover: coverage of FIRE.staffedAt or more
  const named = staffed ? null : c.firehouse;                              // null for 'none' and 'no_road'
  const own = named !== null && named === b.id;
  // Why no staffed firehouse covers it: none reaches it (Show me), or the best one that does is short of workers, paused or
  // burning (View it).
  const why = !named ? D.whyNone : own ? D.whySelf[c.cause] : { short: D.whyShort, paused: D.whyPaused, burning: D.whyBurning }[c.cause];
  const action = staffed || own ? null : named ? { kind: 'view', id: named } : { kind: 'showMe' };
  if (b.fire) {
    const head = b.fire.stage === 'fire' ? D.burningFor(b.fire.left) : D.blaze;
    const tail = staffed ? (b.fire.stage === 'fire' ? D.fighting : D.puttingOut) : named ? why : D.noneReaches;
    return { text: `${head}, ${tail}`, burning: true, action };
  }
  return { text: D.riskLine(fireBand(fireRiskOf(world, b)), staffed ? D.reaches : why), burning: false, action };
}

export function fireRow(ctx, b) {
  const m = fireRowModel(ctx.world, b);
  const out = [el('div', { class: 'row fire-row' }, [el('span', { class: 'muted', text: D.fireLabel }), el('span', { class: m.burning ? 'coral' : '', text: m.text })])];
  if (m.action && m.action.kind === 'showMe') {
    out.push(el('div', { class: 'fix fire-fix' }, [button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${D.buildFirehouse}`,
      onClick: () => ctx.showMeAt({ category: 'services', item: 'firehouse', ...centre(b) }) })]));
  } else if (m.action) {
    out.push(el('div', { class: 'fix fire-fix' }, [button(T.view, { class: 'view quiet', 'aria-label': viewLabel(BUILDINGS.firehouse.name), onClick: () => ctx.selectBuilding(m.action.id) })]));
  }
  return out;
}

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
const line = (text, cls = 'small muted') => el('p', { class: cls, text });
const needed = (type) => Math.ceil(BUILDINGS[type].workers * MIN_STAFF_RATIO);   // the fewest workers that make it work

// The firehouse: what it covers, or why it covers nothing; and whether it is staffed enough to put fires out.
// A building in the fire stage stops working (src/sim/labour.js isWorking) whatever its staff, so that comes first.
const inFireStage = (b) => Boolean(b.fire && b.fire.stage === 'fire');
function firehouseRows(world, b) {
  if (inFireStage(b)) return [line(D.coversNothingBurning)];
  if (b.paused) return [line(D.coversNothingPaused)];
  if (!isWorking(world, b)) return [line(D.coversNothingUntil(needed('firehouse'), BUILDINGS.firehouse.workers))];
  const reach = roadReach(world, b, FIRE.reach);
  const n = allBuildings(world).filter((x) => canBurn(x) && adjacentRoadTiles(world, x).some((t) => reach.has(t))).length;
  const out = [line(D.covers(n), 'small')];
  if (staffRatio(world, b) < FIRE.staffedAt) out.push(line(D.tooShortToFight(Math.ceil(BUILDINGS.firehouse.workers * FIRE.staffedAt), BUILDINGS.firehouse.workers), 'small coral'));
  return out;
}

// The health row and the crime row on a home's sheet (Stage 4.5, rulings 318, 319), each { text, action, factors } built from the
// sim's own reasons (src/sim/health.js, crime.js): the cause is healthCause's or crimeCause's (the one the alerts word), the band
// healthBandOf's or crimeBand's, the days left illnessDaysLeft's, the faster-building reasons healthFactors' and crimeFactors'.
// Nothing for an empty plot, a home with nobody in it, on Peaceful (no disease or crime there), or before Town (disease) or Market
// town (crime), when the risk has not started. action is null, { kind: 'showMe', item } or { kind: 'view', id }, as the fire row's.
const coverAction = (c, item) => (c.cause === 'none' ? { kind: 'showMe', item } : c.service !== null && ['short', 'paused', 'burning'].includes(c.cause) ? { kind: 'view', id: c.service } : null);
export function healthRowModel(world, b) {
  if (!healthStarted(world) || !canFallIll(b)) return null;
  const c = healthCause(world, b), covered = c.cause === 'covered';
  const tail = covered ? (b.illness ? D.healthMending : D.healthCovered) : D.healthWhy[c.cause];
  const band = healthBandOf(world, b);
  const head = b.illness ? D.illLeft(illnessDaysLeft(world, b)) : band >= 1 ? D.riskIs(D.healthBand(band).label) : '';
  const f = healthFactors(world, b);
  const why = [f.well ? D.healthFactor.well : '', f.crowded ? D.healthFactor.crowded(HEALTH.crowdedPerTile) : '', f.poor ? D.healthFactor.poor : ''].filter(Boolean);
  return { text: [head, tail].filter(Boolean).join(', '), action: coverAction(c, 'physician'), factors: !b.illness && why.length ? D.buildsFaster(D.healthNoun, why) : '' };
}
export function crimeRowModel(world, b) {
  if (!crimeStarted(world) || !canCommitCrime(b)) return null;
  const c = crimeCause(world, b), covered = c.cause === 'covered';
  const tail = covered ? D.crimeCovered : D.crimeWhy[c.cause];
  const band = crimeBand(crimeRiskOf(world, b));
  const f = crimeFactors(world, b);
  const why = [f.tier ? D.crimeFactor.tier : '', f.mood ? D.crimeFactor.mood(CRIME.moodBelow) : '', f.jobs ? D.crimeFactor.jobs(Math.round(CRIME.unemployedAbove * 100)) : ''].filter(Boolean);
  return { text: `${D.crimeBand(band).label}, ${tail}`, action: coverAction(c, 'police_post'), factors: why.length ? D.buildsFaster(D.crimeNoun, why) : '' };
}

function threatRow(ctx, b, m, label, item, buildWords, serviceName) {
  const out = [el('div', { class: 'row threat-row' }, [el('span', { class: 'muted', text: label }), el('span', { text: m.text })])];
  if (m.factors) out.push(el('p', { class: 'small muted threat-factors', text: m.factors }));
  if (m.action && m.action.kind === 'showMe') {
    out.push(el('div', { class: 'fix threat-fix' }, [button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${buildWords}`, onClick: () => ctx.showMeAt({ category: 'services', item, ...centre(b) }) })]));
  } else if (m.action) {
    out.push(el('div', { class: 'fix threat-fix' }, [button(T.view, { class: 'view quiet', 'aria-label': viewLabel(serviceName), onClick: () => ctx.selectBuilding(m.action.id) })]));
  }
  return out;
}

// Rows after a home's checklist for disease and crime (the fire row is fireRow's).
export function homeRows(ctx, b) {
  const out = [];
  const h = healthRowModel(ctx.world, b);
  if (h) out.push(...threatRow(ctx, b, h, D.healthLabel, 'physician', D.buildPhysician, BUILDINGS.physician.name));
  const c = crimeRowModel(ctx.world, b);
  if (c) out.push(...threatRow(ctx, b, c, D.crimeLabel, 'police_post', D.buildPolicePost, BUILDINGS.police_post.name));
  return out;
}

// The physician and the police post: how many homes with people in them they reach, or why they cover nothing.
function serviceRows(world, b, kind) {
  if (inFireStage(b)) return [line(D.coversNothingBurning)];
  if (b.paused) return [line(D.coversNothingPaused)];
  if (!isWorking(world, b)) return [line(D.coversNothingUntil(needed(b.type), BUILDINGS[b.type].workers))];
  return [line(kind === 'health' ? D.coversHomesHealth(homesCoveredBy(world, b)) : D.coversHomesCrime(crimeHomesCoveredBy(world, b)), 'small')];
}

// The tower: its range, whether it shoots (only a working tower does, src/sim/combat.js), and its wall tile's hit points.
// The tile is raised to DEFENCE.towerOnWallHp when raiders arrive and healed when the raid ends (ruling 8: the stored
// value may read a plain wall's between raids), so at peace the row gives the full hit points the tile fights with, and
// "N of 80" only while a raid is under way.
function towerRows(world, b) {
  const out = [row(D.range, D.tiles(DEFENCE.towerRange))];
  if (b.paused) out.push(line(D.notShootingPaused));
  else if (!isWorking(world, b)) out.push(line(D.notShootingUntil(needed('tower'), BUILDINGS.tower.workers)));
  else out.push(line(D.towerDoes(DEFENCE.towerRange)));
  const hp = world.wall[idx(world.size, b.x, b.y)];
  if (hp > 0) out.push(row(D.onTheWall, world.raid.active ? D.hitPoints(hp, DEFENCE.towerOnWallHp) : D.fullHitPoints(DEFENCE.towerOnWallHp)));
  if (world.raid.last) out.push(line(D.lastRaidTowers(world.raid.last)));
  return out;
}

// Stage 4.6 (Armies track, ruling 381): the barracks counts its soldiers away at the capital toward its four, as trainSoldiers
// does (src/sim/combat.js), so the rows read armyRowsModel's held count and status, the same as the archery range's and stables'.
function barracksRows(world, b) {
  const m = armyRowsModel(world, b);
  const awayN = m.away.reduce((s, g) => s + g.n, 0);
  const out = [row(D.soldiers, S46_ARMY_TEXT.ofCap(m.n, m.cap, awayN)), row(D.patrol, D.tiles(DEFENCE.patrol))];
  if (m.status === 'full') out.push(line(S46_ARMY_TEXT.full('soldier', m.n, m.cap, awayN)));   // a full barracks trains none
  else if (m.status === 'burning') out.push(line(D.notTrainingBurning));
  else if (m.status === 'paused') out.push(line(D.notTrainingPaused));
  else if (m.status === 'short') out.push(line(D.notTrainingUntil(m.short, BUILDINGS.barracks.workers)));
  else out.push(line(D.trains(DEFENCE.trainDays)));
  out.push(line(D.soldiersPay(DEFENCE.soldierPay)));
  if (world.raid.last) out.push(line(D.lastRaidSoldiers(world.raid.last)));
  return out;
}

// Rows after a building sheet's reach row: the fire row, then the danger buildings' own rows.
export function buildingParts(ctx, b) {
  const world = ctx.world;
  if (b.type === 'rubble') return [line(D.rubbleRow(rubbleCostOf(world)), 'small'), line(D.rubbleDrag)];
  const out = fireRow(ctx, b);
  if (b.type === 'firehouse') out.push(...firehouseRows(world, b));
  if (b.type === 'physician') out.push(...serviceRows(world, b, 'health'));
  if (b.type === 'police_post') out.push(...serviceRows(world, b, 'crime'));
  if (b.type === 'tower') out.push(...towerRows(world, b));
  if (b.type === 'barracks') out.push(...barracksRows(world, b));
  return out;
}

// Buttons at the front of a building sheet's actions: the temple's Hold a festival, rubble's Clear.
export function actionParts(ctx, b) {
  if (b.type === 'temple') return festivalParts(ctx);
  if (b.type === 'rubble') return rubbleParts(ctx, b);
  return [];
}

function festivalParts(ctx) {
  const s = festivalStatus(ctx.world);
  if (s.reason === 'locked') return [];                                   // festivals come with Town
  const hold = button(D.holdFestival(s.cost), { class: s.can ? 'festival primary' : 'festival', disabled: !s.can, onClick: () => {
    const r = holdFestival(ctx.world);
    if (!r.ok) return;
    ctx.toasts.show(D.festivalHeld);
    ctx.afterCommand({ kind: 'festival', result: r, text: D.festivalHeld, undoable: false });
  } });
  const notes = [];
  if (s.activeFor > 0) notes.push(D.festivalOn(FESTIVAL.mood, s.activeFor));
  if (s.reason === 'too_soon') notes.push(D.nextFestival(s.nextIn));
  else if (s.reason === 'no_temple') notes.push(D.festivalNeedsTemple);
  else if (s.reason === 'no_gold') notes.push(D.wouldPassDebt(-ECONOMY.debtFloor));
  else if (s.can) notes.push(D.festivalDoes(FESTIVAL.mood, FESTIVAL.days, FESTIVAL.every));
  return [el('div', { class: 'festival-group' }, [hold, ...notes.map((t) => line(t))])];
}

function rubbleParts(ctx, b) {
  const cost = rubbleCostOf(ctx.world);
  const can = canAfford(ctx.world, cost);
  const clear = button(D.clearFor(cost), { class: 'clear danger', disabled: !can, onClick: () => {
    const r = clearRubble(ctx.world, b.x, b.y);
    if (r.ok) ctx.afterCommand({ kind: 'demolish', result: r, text: D.cleared, undoable: true });
  } });
  return [el('div', { class: 'festival-group' }, [clear, can ? null : line(D.wouldPassDebt(-ECONOMY.debtFloor))])];
}

// The summary's last raid report (spec 4.13), after the goals: the report's words and the day it ended.
export function summaryParts(ctx) {
  const last = ctx.world.raid.last;
  if (!last) return [];
  return [el('h3', { text: D.lastRaid }), el('p', { class: 'raid-report', text: D.raidReport(last) }), line(D.endedOn(dateText(dateParts({ day: last.day }))))];
}

// Stage 4.6 (Armies track, rulings 341, 388, 388a): a raid that brings more than raiders on foot names its kinds in the sheet's
// arrival line, its first words under the cost (arrivalText), and lists, under its heading at the end, each kind it brings and what
// helps against it, read from the matchup table (S46_ARMY_TEXT.counters: src/sim/armies.js counterModel). An all-foot raid's sheet
// is as before.
const isMixed = (w) => Boolean(w && w.mix && S46_ARMY_TEXT.isMixedMix(w.mix));
export function counterParts(w) {
  if (!isMixed(w)) return [];
  return [
    el('h3', { class: 'raid-counters-head', text: S46_ARMY_TEXT.countersHead }),
    el('ul', { class: 'raid-counters' }, S46_ARMY_TEXT.counters(w.mix).map((t) => el('li', { text: t }))),
  ];
}
// The sheet's arrival line for warning w, `left` days out. On a phone (and on the first raid's sheet) it carries the warning's
// title, `title`, as the banner says it; on a wide screen, whose banner shows the title above, the arrival alone. A mixed raid's
// kinds join it once: "14 raiders from the east are after your storehouses: 8 on foot, 3 archers, 3 chariots. They arrive in 2
// months." on a phone, "14 raiders from the east: 8 on foot, 3 archers, 3 chariots. They arrive in 2 months." on a wide screen.
export function arrivalText(w, title, left, withTitle) {
  const D = DANGER_UI_TEXT;
  if (!isMixed(w)) return withTitle ? D.withArrival(title, left) : D.arrivalLine(left);
  if (withTitle) return D.withArrival(`${title}: ${S46_ARMY_TEXT.mixText(w.mix)}`, left);
  const from = `the ${[...new Set(warningDirs(w))].map((d) => D.dir(d)).join(' and ')}`;
  return D.withArrival(S46_ARMY_TEXT.mixLine(w.size, from, w.mix), left);
}

// The tribute confirmation sheet (spec 4.13): the cost, when the raiders arrive, the gold afterwards, what it cancels and
// what it does not, two buttons named for their outcome and neither the default; the rule's own words when it cannot be
// paid. On phones it is also the raid sheet (ruling 167): the countdown chip's words open it, so its arrival line carries
// the warning's own title ("Raiders from the east are after your storehouses. They arrive in 2 months."), which a wide
// screen's banner shows above it. On the first raid, which no tribute buys off, it is headed "Raid warning" and holds the
// arrival and the defence line only.
export function tributeSheet(ctx) {
  return (body, { close, setTitle = () => {} }) => {
    const world = ctx.world;
    const q = tributeQuote(world);
    if (!q) { body.append(el('p', { text: D.noWarning })); return; }
    const w = world.raid.warning;
    const left = Math.max(0, w.arrives - world.day);
    const phone = Boolean(ctx.store) && ctx.store.get().layout !== 'wide';
    const title = alertText({ code: 'raid_warning', dir: w.dir, dirs: q.dirs }, world).title;
    const arrives = el('p', { class: isMixed(w) ? 'arrives raid-mix' : 'arrives', text: arrivalText(w, title, left, phone || q.hidden) });   // as the banner says it
    // Stage 4.7 (Task 7, ruling 470): "14 raiders: your wealth draws 4 more", fixed at the warning (warning.wealth, src/sim/raids.js wealthDraw).
    const wealth = w.wealth ? el('p', { class: 'raid-wealth', text: `${S47_PRESSURE_TEXT.wealthLine(w)}.` }) : null;
    if (q.hidden) { setTitle(D.raidSheetTitle); body.append(arrives, el('p', { text: D.capital(D.defenceLine(q, q.dirs)) }), ...counterParts(w)); return; }
    body.append(
      el('p', { class: 'tribute-cost', text: D.tributeCost(q.cost) }),
      arrives,
      ...(wealth ? [wealth] : []),
      row(D.goldNow, String(world.gold)), row(D.goldAfter, String(world.gold - q.cost)),
      el('p', { class: 'cancels', text: D.cancels(q.dirs, q.size) }),
      el('p', { class: 'small muted', text: D.capital(D.defenceLine(q, q.dirs)) }),
    );
    if (!q.payable) body.append(el('p', { class: 'why-not coral', text: D.tributeBelowZero(world.gold) }));
    const pay = button(D.payGold(q.cost), { class: 'pay', disabled: !q.payable, onClick: () => {
      const r = payTribute(world);
      if (!r.ok) return;
      close();
      ctx.toasts.show(D.tributePaid(r.cost));
      ctx.afterCommand({ kind: 'tribute', result: r, text: D.tributePaid(r.cost), undoable: false });
    } });
    // The two buttons come before the counters list (UX rule 2): on a phone the list ran to a screen of its own and pushed them off it.
    body.append(el('div', { class: 'actions tribute-actions' }, [pay, button(D.keepGold, { class: 'keep', onClick: close })]), ...counterParts(w));
  };
}
