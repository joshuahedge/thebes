// The danger interface's sheets and sheet parts (spec 4.12, 4.13, 6.3), for src/ui/danger.js: the tribute confirmation
// sheet, the fire row on every building and home sheet, the firehouse, tower, barracks and rubble rows, the temple's
// Hold a festival, and the last raid's report in the summary. Every sentence is computed from the sim's own rules
// (src/sim/fire.js coverage, src/sim/raids.js tributeQuote and raid.last, src/sim/festival.js festivalStatus), so the
// words say what the sim does. Each function takes the danger interface's context (ctx) and returns DOM nodes.
import { BUILDINGS } from '../data/buildings.js';
import { FIRE } from '../data/fire.js';
import { DEFENCE, FESTIVAL } from '../data/raids.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { ECONOMY } from '../data/economy.js';
import { allBuildings } from '../sim/world.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { isWorking, staffRatio } from '../sim/labour.js';
import { canBurn, fireStarted, fireRiskOf, fireBand, fireCause, clearRubble } from '../sim/fire.js';
import { tributeQuote, payTribute } from '../sim/raids.js';
import { festivalStatus, holdFestival } from '../sim/festival.js';
import { rubbleCostOf } from '../sim/costs.js';
import { canAfford } from '../sim/money.js';
import { dateParts } from '../sim/clock.js';
import { idx } from '../sim/grid.js';
import { el, button } from './components.js';
import { alertText, dateText, plural, viewLabel, T, DANGER_UI_TEXT } from './text.js';

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

function barracksRows(world, b) {
  const n = world.soldiers.filter((s) => s.barracks === b.id).length;
  const out = [row(D.soldiers, `${n} of ${DEFENCE.soldiersPerBarracks}`), row(D.patrol, D.tiles(DEFENCE.patrol))];
  if (n >= DEFENCE.soldiersPerBarracks) out.push(line(D.barracksFull(n, DEFENCE.soldiersPerBarracks)));   // a full barracks trains none
  else if (inFireStage(b)) out.push(line(D.notTrainingBurning));
  else if (b.paused) out.push(line(D.notTrainingPaused));
  else if (!isWorking(world, b)) out.push(line(D.notTrainingUntil(needed('barracks'), BUILDINGS.barracks.workers)));
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
    const arrives = el('p', { class: 'arrives', text: phone || q.hidden ? D.withArrival(title, left) : D.arrivalLine(left) });   // as the banner says it
    if (q.hidden) { setTitle(D.raidSheetTitle); body.append(arrives, el('p', { text: D.capital(D.defenceLine(q, q.dirs)) })); return; }
    body.append(
      el('p', { class: 'tribute-cost', text: D.tributeCost(q.cost) }),
      arrives,
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
    body.append(el('div', { class: 'actions tribute-actions' }, [pay, button(D.keepGold, { class: 'keep', onClick: close })]));
  };
}
