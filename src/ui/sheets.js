// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
// A home's sheet says why it is not growing: each missing need names its cause and its fix, with Show me
// (early-game pass 2.10). Show me itself lives in createUI (showMeAt); this file only hands it a target.
import { alertShowMe } from './threatFix.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { desirabilityContributors } from '../sim/desirability.js';
import { isUnlocked } from '../sim/progression.js';
import { allBuildings } from '../sim/world.js';
import { setPaused, setAccept } from '../sim/commands.js';
import { assignLabour, isWorking } from '../sim/labour.js';
import { storeTotal, storeAccepts } from '../sim/production.js';
import { roadGoods } from '../sim/carts.js';
import { openGoals, guideActive } from '../sim/goals.js';
import { achievementProgress, achievementsFor } from '../sim/achievements.js';
import { closeSheet, openSheet } from './modes.js';
import { CRITICAL_RANK } from './alerts.js';
import { summaryData } from './hud.js';
import { monthForecast } from '../sim/economy.js';
import { jobsPenalty } from '../sim/mood.js';
import { nearestTerrainTile } from './goalsList.js';
import { demolishQuestion, causeFix } from './monumentSheet.js';
import { noteView } from '../render/overlays.js';
import { supplyNeeded } from '../sim/monuments.js';
import { huntRest } from '../sim/wildlife.js';
import { ZOOM_STEP, categoryOfItem } from '../data/ui.js';
import { S47_PRESSURE_TEXT, buildingName, tierName, NEED_NAMES, MOOD_NAMES, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, causeText, alertText, plural, progressText, achievementsHeading, achievementBarLabel, viewLabel, goodName, goodLine, workingText, waitingText,
  goodMakers, makerOf, storeFor, contributorText, desirabilityText, keepWarningText, madeUsedText, DIFFICULTY_NAMES, T, UI4_TEXT , S45_TEXT, S47_CARTS_TEXT as CART_W } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
// Criticals first, in the banner's rank (CRITICAL_RANK), then the rest in their own order (the sort is stable).
const rankOf = (a) => { const i = CRITICAL_RANK.indexOf(a.code); return i < 0 ? CRITICAL_RANK.length : i; };
export const criticalFirst = (list) => [...list].sort((a, b) => rankOf(a) - rankOf(b));

// What each cause's button does. Show me opens a card and aims at the home or at the building the cause names (an
// empty bazaar wants a granary beside it, an empty granary a farm beside it); View selects the building that is in
// reach but not working, or near but without a road (its own sheet then says how to fix it). next_delivery needs
// nothing from the player, so it has neither.
const CAUSE_FIX = {
  no_road: { category: 'roads', item: 'road', at: 'home' },
  no_well: { category: 'services', item: 'well', at: 'home' },
  no_bazaar: { category: 'services', item: 'bazaar', at: 'home' },
  bazaar_empty: { category: 'food', item: 'granary', at: 'building' },
  granary_empty: { category: 'food', item: 'farm_grain', at: 'building' },
  no_temple: { category: 'services', item: 'temple', at: 'home' },
  well_idle: { view: true },
  granary_idle: { view: true },
  bazaar_idle: { view: true },
  temple_idle: { view: true },
  well_no_road: { view: true },
  bazaar_no_road: { view: true },
  temple_no_road: { view: true },
  no_booth: { category: 'services', item: 'booth', at: 'home' },
  booth_idle: { view: true },
  booth_no_road: { view: true },
  low_desirability: { category: 'homes', item: 'garden', at: 'home' },
  no_square: { category: 'homes', item: 'house', at: 'home' },
  // No store for the good near the bazaar: Show me that store beside the bazaar. Nothing makes it there: Show me the
  // first of its makers the city has none of (a clay pit, then a potter), else the workshop, beside the bazaar; a maker
  // that needs fertile or rocky ground aims at the nearest free tile of it instead (at: 'terrain'), which can lie well
  // beyond the ghost's search around the bazaar. Neither while the building, or any of the good's makers, is not
  // unlocked yet (the words then name the milestone; a store would stay empty).
  no_good: (cause, world) => {
    const item = storeFor(cause.good);
    const usable = item && isUnlocked(world, item) && goodMakers(cause.good).every((t) => isUnlocked(world, t));
    return usable ? { category: categoryOfItem(item), item, at: 'building' } : null;
  },
  // Stage 4.7 (Task 7, ruling 471): the good is held only in a store beyond the bazaars' supply reach: Show me selects that store (its own
  // sheet holds the Fetch control's source side), and the words name Fetch as the remedy.
  good_far: { select: true },
  good_unmade: (cause, world) => {
    const makers = goodMakers(cause.good);
    if (!makers.length || makers.some((t) => !isUnlocked(world, t))) return null;
    const item = makers.find((t) => !allBuildings(world).some((b) => b.type === t)) || makerOf(cause.good);
    return { category: categoryOfItem(item), item, at: BUILDINGS[item].terrain ? 'terrain' : 'building' };
  },
};
// The alerts that carry a fix button in the list besides View (Show me opens the tool and aims at the place): many plots with no
// road want the road tool (placement review P13). onFixAlert aims it, at the plot nearest the view.
const ALERT_FIX = new Set(['plots_no_road']);
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// parts (Stage 3): the danger and score interfaces' sheet parts (src/ui/danger.js), each { building(b), house(h),
// actions(b), summary() } returning arrays of nodes, added in the list's order at fixed places in the sheets below.
export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, onFixAlert = () => {}, onSelect = () => {}, afterCommand = () => {}, custom = {}, parts = [] }) {
  const close = () => store.set(closeSheet(store.get()));
  const extra = (kind, ...args) => parts.flatMap((p) => (p && typeof p[kind] === 'function' ? p[kind](...args) || [] : []));

  function head(title) {
    return el('div', { class: 'head' }, [el('h2', { text: title }), iconButton(T.close, '✕', { class: 'close', onClick: close })]);
  }

  function problems(id) {
    const list = getAlerts().filter((a) => a.id === id);
    if (!list.length) return el('p', { class: 'muted', text: T.noProblems });
    return el('ul', { class: 'problems' }, list.map((a) => {
      const t = alertText(a, world);
      return el('li', { class: 'problem' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', 'aria-label': viewLabel(t.title), onClick: () => { noteView(world, a.id); onView(a); } })]);
    }));
  }

  // A producer says what it is doing in words: making, growing or digging its good, waiting for its input, or not
  // working (the problems below say why).
  // Stage 4 (Track C): a quarry cuts stone, and a quarry or brickworks no site needs says why it is idle in the monuments
  // interface's line instead (src/ui/monumentSheet.js supplyLine), so this line is left out.
  function workLine(b) {
    const def = BUILDINGS[b.type];
    if (!def.produces) return null;
    if (!b.paused && (b.blocked === 'idle' || !supplyNeeded(world, b))) return null;
    if (b.blocked === 'no_game' && isWorking(world, b) && huntRest(world, b)) return null;   // Stage 4.6 (ruling 369): a lodge that has had its share is resting, not broken: the River rows say why
    let text = T.notWorking;
    if (isWorking(world, b) && b.blocked === 'no_input') text = waitingText(def.consumes);
    else if (isWorking(world, b) && !b.blocked) text = def.produces.good === 'stone' ? UI4_TEXT.cuttingStone : workingText(b.type);
    return el('p', { class: 'work-status', text });
  }

  // Demolish (spec 4.16, 4.20): a monument or the palace asks first, with what is lost and the refund in words; anything else
  // goes at once, as before.
  function demolishNow(b) {
    const go = () => { const r = placement.demolishOne(b.x, b.y); if (r.ok) close(); };
    const question = demolishQuestion(world, b);
    if (question) store.set({ confirmDialog: { text: question, confirmLabel: T.demolish, onConfirm: go } });
    else go();
  }

  // Stage 4 (Track C, spec 6.3): a monument's sheet is its own: the monuments interface's rows (progress, crews, materials, pace,
  // gold, prestige, or a finished monument's), its actions (Pause, View) and Demolish, with no workers row or problem list (the
  // site's cause row says what holds it up).
  function monumentSheet(b) {
    const body = el('div', { class: 'body monument' });
    body.append(...extra('building', b));
    body.append(el('div', { class: 'actions' }, [...extra('actions', b), button(T.demolish, { class: 'demolish danger', onClick: () => demolishNow(b) })]));
    return [head(buildingName(b.type)), body];
  }

  // Storage (spec 4.10): how full it is, then a row per good it can hold with its count and the good's line (what
  // makes it, what uses it). A storehouse's rows are switches that accept or refuse the good (setAccept); the state
  // is a word beside the good, so the switch never relies on colour.
  function storeSection(b) {
    const def = BUILDINGS[b.type];
    const switches = b.type === 'storehouse';
    // Stage 4.7 (Task 6): the Fetch control (src/ui/s47/carts.js, the seam's `store` part) sits right under how full the store is, so it is not buried under the stock rows.
    const out = [row(T.stored, progressText(storeTotal(b), def.capacity)), ...extra('store', b), el('h3', { text: T.stock })];
    if (switches) out.push(el('p', { class: 'small muted', text: T.acceptHelp }));
    // Stage 4.7 (Task 6): goods a cart has taken out of this store, or is bringing to it, are said under their row so they never seem to vanish.
    const road = roadGoods(world, b.id);
    const onRoad = (good) => [...road.leaving.filter((r) => r.good === good).map((r) => CART_W.road(r, 'leaving')), ...road.arriving.filter((r) => r.good === good).map((r) => CART_W.road(r, 'arriving'))]
      .map((text) => el('p', { class: 'road-line small teal', text }));
    out.push(el('ul', { class: 'store-goods' }, def.stores.map((good) => {
      const n = String(b.store[good] || 0);
      const line = el('p', { class: 'good-line small muted', text: goodLine(good) });
      if (!switches) return el('li', { dataset: { good } }, [el('div', { class: 'row' }, [el('span', { text: goodName(good) }), el('span', { text: n })]), ...onRoad(good), line]);
      const on = storeAccepts(b, good);
      const sw = el('button', { type: 'button', role: 'switch', class: 'switch accept', 'aria-checked': String(on), dataset: { good } }, [
        el('span', { class: 'good' }, [goodName(good), ' ', el('span', { class: 'count small muted', text: n })]),
        el('span', { class: 'state small', text: on ? T.accepted : T.refused }),
      ]);
      sw.addEventListener('click', () => {
        const r = setAccept(world, b.id, good, !on);
        if (r.ok) { afterCommand({ kind: 'accept', result: r, undoable: false }); render(); }
      });
      return el('li', { dataset: { good } }, [sw, ...onRoad(good), line]);
    })));
    return out;
  }

  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    const work = workLine(b);
    if (work) body.append(work);
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    if (def.stores) body.append(...storeSection(b));
    else for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${goodName(good)}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
    // A lodge's or wharf's reach is where it delivers, not where its crew goes (that is the River rows' straight-line tiles): said so (final review).
    if (reach) body.append(row(def.hunts || def.fishes ? T.storesWithin : T.reach, `${reach} road tiles`));
    body.append(...extra('building', b));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' }, extra('actions', b));
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
    if (def.workers || def.upkeep) {
      actions.append(button(b.paused ? T.resume : T.pause, { class: 'pause', onClick: () => {
        const r = setPaused(world, b.id, !b.paused);
        if (r.ok) { assignLabour(world); afterCommand({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resumed, undoable: false }); render(); }
      } }));
    }
    // Rubble's Clear (Stage 3, src/ui/dangerSheets.js) is its demolish, with the price in its name.
    if (b.type !== 'rubble') actions.append(button(T.demolish, { class: 'demolish danger', onClick: () => demolishNow(b) }));
    body.append(actions);
    return [head(buildingName(b.type)), body];
  }

  // One row of the next-tier checklist: a mark, the need, a status in words (meaning never by colour alone);
  // a missing need adds its cause, then its fix: Show me when there is something to build, View when the
  // building that would serve it is already in reach and only needs resuming or workers. The desirability row also
  // shows its score and three biggest causes; the merge row (a Townhouse) asks for a 2x2 square.
  function needRow(h, c) {
    const li = el('li', { class: c.met ? 'met' : 'missing', dataset: { need: c.need } }, [el('div', { class: 'need' }, [
      el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓' : '✕' }),
      el('span', { class: 'name', text: NEED_NAMES[c.need] }),
      el('span', { class: `status small ${c.met ? 'teal' : 'coral'}`, text: c.met ? T.hasIt : T.missing }),
    ])]);
    if (c.need === 'desirability') {
      const parts = desirabilityContributors(world, h, 3).map((d) => contributorText(d.value, contributorName(d)));
      li.append(el('p', { class: 'desirability small', text: desirabilityText(c.value, c.target, parts) }));
    }
    const cause = c.met ? null : needCause(world, h, c.need);
    const words = cause ? causeText(cause, world, c.need) : null;
    if (!words) return li;
    li.append(el('p', { class: 'cause small', text: words.cause }));
    const fix = typeof CAUSE_FIX[cause.code] === 'function' ? CAUSE_FIX[cause.code](cause, world) : CAUSE_FIX[cause.code];
    // Nothing to build or view (goods on their way, a building not unlocked yet): the fix's words alone, when it has any.
    if (!fix) { if (words.fix) li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix })])); return li; }
    const building = cause.id !== null ? world.buildings[cause.id] : null;
    let action;
    if (fix.select) {
      if (!building) return li;
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': S47_PRESSURE_TEXT.showFar(cause, world), onClick: () => onSelect(building.id) });
    } else if (fix.view) {
      if (!building) return li;
      action = button(T.view, { class: 'view quiet', 'aria-label': viewLabel(buildingName(building.type)), onClick: () => onSelect(building.id) });
    } else {
      const near = centreOf(fix.at !== 'home' && building ? building : h);
      const at = fix.at === 'terrain' ? nearestTerrainTile(world, BUILDINGS[fix.item].terrain, near) || near : near;
      const target = { category: fix.category, item: fix.item, x: at.x, y: at.y };
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${words.fix}`, onClick: () => onShowMe(target) });
    }
    li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix }), action]));
    return li;
  }

  // A building that changes a home's desirability, by name: a home by its tier ("+2 manor"), anything else by its type.
  function contributorName(d) {
    const b = world.buildings[d.id];
    return (b && b.type === 'house' ? tierName(b.tier) : buildingName(d.type)).toLowerCase();
  }

  function houseSheet(h) {
    const s = houseStatus(world, h);
    const body = el('div', { class: 'body' });
    if (s.tier === 0) body.append(el('p', { class: 'muted', text: T.emptyPlot }));
    const share = s.capacity ? Math.min(1, s.residents / s.capacity) : 0;
    body.append(el('div', { class: 'row residents' }, [
      el('span', { class: 'muted', text: T.residents }),
      el('span', { class: 'value' }, [
        progressText(s.residents, s.capacity),
        el('span', { class: 'meter', 'aria-hidden': 'true' }, [el('span', { class: 'fill', style: { width: `${Math.round(share * 100)}%` } })]),
      ]),
    ]));
    if (s.next) {
      const rows = s.merge.needed ? [...s.checklist, { need: 'merge', met: s.merge.ready }] : s.checklist;
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, rows.map((c) => needRow(h, c))));
      if (s.tier >= 1 && rows.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    } else if (s.tier >= 1) {
      // Stage 4.7 (Task 7, ruling 471): the top tier has no next one, so its sheet lists what keeps it (its own needs, the street's "to keep"
      // value), each with its cause and Show me as a checklist row does.
      body.append(el('h3', { class: 'keep-head', text: S47_PRESSURE_TEXT.keepHead(s.name) }));
      body.append(el('ul', { class: 'checklist keep-list' }, s.checklist.map((c) => needRow(h, c))));
    }
    // The warning month (spec 4.6): a need running out names the need; a street below the tier's keep value names the tier.
    const lost = s.missingNow.find((n) => n !== 'desirability');
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (s.missingNow.includes('desirability')) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
    body.append(...extra('house', h));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
  }

  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    // Stage 4.5 (Task 4b): the month ahead, as the city stands now (the sim's forecast): headed by what the balance is, so the gold
    // chip's tap lands on "Spending more than taxes bring in" when the treasury is shrinking.
    const f = monthForecast(world);
    if (f.active) {
      body.append(el('h3', { text: f.net < 0 ? S45_TEXT.forecastHeadShort : S45_TEXT.forecastHeadOk, dataset: { section: 'forecast' } }), el('p', { class: 'muted small', text: S45_TEXT.forecastNote }),
        row(T.taxes, `+${f.taxes}`), row(T.wages, `−${f.wages}`), row(T.upkeep, `−${f.upkeep}`));
      if (f.soldiers > 0) body.append(row(T.soldiersPay, `−${f.soldiers}`));
      body.append(row(S45_TEXT.monthlyBalance, S45_TEXT.signed(f.net)));
      if (f.gold < 0 && f.net < 0) body.append(el('p', { class: 'coral', text: `${S45_TEXT.belowZero}.` }));
      else if (f.monthsLeft !== null) body.append(el('p', { class: f.runsOut ? 'amber' : 'muted', text: `${S45_TEXT.runsOutIn(f.monthsLeft)}.` }));
    }
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`));
    if (d.soldiers > 0) body.append(row(T.soldiersPay, `−${d.soldiers}`));       // spec 6.3: soldiers' pay on its own row
    body.append(row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    // Trade under its own heading, as Net above leaves it out: what caravans paid the city and what it paid them.
    body.append(el('h3', { text: T.tradeLastMonth }), row(T.tradeSales, `+${d.tradeIncome}`), row(T.tradeBought, `−${d.tradeSpent}`));
    // Food in store by kind: grain always, other foods once there are some.
    // Stage 4 (spec 6.3, contract note 17): monument gold, paid daily, is not in Net either: its own row once there is some (a v4
    // save has none until its first month end).
    const monumentGold = Math.floor((world.stats.lastMonth && world.stats.lastMonth.monuments) || 0);
    if (monumentGold > 0) body.append(el('h3', { text: UI4_TEXT.spendingHead }), row(UI4_TEXT.spendingRow, `−${monumentGold}`));
    body.append(el('h3', { text: T.foodInStore }), ...FOOD_GOODS.filter((g, i) => i === 0 || d.foodByGood[g] > 0).map((g) => row(goodName(g), `${d.foodByGood[g]}`)));
    body.append(row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    // Each good made against used last month (spec 4.10), in the data's order; only goods that moved.
    const moved = Object.keys(GOODS).filter((g) => d.made[g] || d.used[g]);
    body.append(el('h3', { text: T.goodsLastMonth }), ...(moved.length ? moved.map((g) => row(goodName(g), madeUsedText(d.made[g] || 0, d.used[g] || 0))) : [el('p', { class: 'muted', text: T.noGoodsYet })]));
    body.append(el('h3', { text: T.employment }), row(T.working, `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row(T.jobs, `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    // The starting mood is a level, the rest are swings from it (early-game pass 2.10: plain English rows).
    // Stage 4.5 (ruling 325): while the Town unemployment penalty is being phased in, the Jobs row says what comes at the end of it.
    const jobs = jobsPenalty(world);
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(k === 'jobs' && jobs.monthsLeft > 0 && jobs.full < v ? S45_TEXT.jobsPhasing(jobs.full, jobs.monthsLeft) : MOOD_NAMES[k] || k, k === 'base' ? String(v) : (v >= 0 ? '+' : '') + v));
    body.append(el('h3', { text: T.goals }));
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    body.append(...extra('summary'));
    body.append(...achievementsSection());
    return [head(T.summary), body];
  }

  // Achievements (spec 3.8): every one with its exact condition and its progress, at the end of the summary.
  // Hidden while the guide runs, so they never compete with it.
  function achievementsSection() {
    if (guideActive(world)) return [el('h3', { text: T.achievements }), el('p', { class: 'muted', text: T.achievementsLater })];
    const done = new Set(world.achievements || []);
    const earnable = achievementsFor(world);         // Stage 3: a Peaceful city is not shown the raid ones it can never earn
    const count = earnable.filter((a) => done.has(a.id)).length;
    return [
      el('h3', { text: achievementsHeading(count, earnable.length) }),
      el('ul', { class: 'achievements' }, earnable.map((a) => achievementRow(a, done.has(a.id)))),
    ];
  }

  // The status is words first (Done, "n of m", Not yet); the bar repeats a count and never stands alone. An
  // achievement whose progress is out of 1 is met or not (every home fed, say), so it has no count to show.
  function achievementRow(a, isDone) {
    const name = ACHIEVEMENT_NAMES[a.id];
    const p = isDone ? null : achievementProgress(world, a);
    let status;
    if (isDone) status = el('span', { class: 'status' }, [el('span', { class: 'tick', 'aria-hidden': 'true', text: `${T.doneMark} ` }), T.done]);
    else if (p.of === 1) status = el('span', { class: 'status muted', text: T.notYetMet });
    else {
      const words = progressText(p.n, p.of);
      status = el('span', { class: 'status' }, [
        el('span', { class: 'ach-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(p.of), 'aria-valuenow': String(p.n), 'aria-label': achievementBarLabel(name, p.n, p.of) }, [
          el('span', { class: 'fill', style: { width: `${Math.round((p.n / p.of) * 100)}%` } }),
        ]),
        el('span', { class: 'small', 'aria-hidden': 'true', text: words }),     // the bar's label already says it
      ]);
    }
    return el('li', { class: isDone ? 'achievement done' : 'achievement', dataset: { id: a.id } }, [
      el('span', { class: 'what' }, [el('strong', { text: name }), el('span', { class: 'small muted', text: ACHIEVEMENT_TEXT[a.id] })]),
      status,
    ]);
  }

  // The minimap sheet: the map, then the alert list. On phones the list comes first, criticals first in the banner's
  // rank, as the Map badge counts the criticals the one-line banner is not showing (ruling 167); wide screens keep the
  // map first and the list in the sim's order.
  function minimapSheet() {
    const body = el('div', { class: 'body' });
    const canvas = minimap.canvas;
    canvas.onclick = (ev) => { const r = canvas.getBoundingClientRect(); const t = minimap.tileFromPoint(ev.clientX - r.left, ev.clientY - r.top); cameraControl.panTo(t.x + 0.5, t.y + 0.5); };
    const zoomIn = iconButton(T.zoomIn, '+', { class: 'zoom-in', onClick: () => cameraControl.zoomStep(ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    const zoomOut = iconButton(T.zoomOut, '−', { class: 'zoom-out', onClick: () => cameraControl.zoomStep(1 / ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    const map = [el('div', { class: 'minimap-wrap' }, [canvas]), el('div', { class: 'actions' }, [zoomIn, zoomOut])];
    const phone = store.get().layout !== 'wide';
    const list = phone ? criticalFirst(getAlerts()) : getAlerts();
    const alerts = [el('h3', { text: T.alerts })];
    if (!list.length) alerts.push(el('p', { class: 'muted', text: T.noAlerts }));
    else alerts.push(el('ul', { class: 'alert-list' }, list.map((a) => {
      const t = alertText(a, world);
      // Stage 4 (spec 4.16): a stalled site's fix is Show me for a missing guild or material (the card, its ghost near the site).
      const stall = a.code === 'site_stalled' && world.buildings[a.id] ? causeFix(world, world.buildings[a.id], a.reason) : null;
      const threat = alertShowMe(world, a);
      const fix = ALERT_FIX.has(a.code) ? [' ', button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${t.fix}`, onClick: () => onFixAlert(a) })]
        : stall && stall.showMe ? [' ', button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${t.fix}`, onClick: () => onShowMe(stall.showMe) })]
        : threat ? [' ', button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${t.fix}`, onClick: () => onShowMe(threat) })] : [];   // Stage 4.5: an illness or crime alert with no physician or police post in reach
      return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', 'aria-label': viewLabel(t.title), onClick: () => viewInList(a) }), ...fix]);
    })));
    body.append(...(phone ? [...alerts, ...map] : [...map, ...alerts]));
    minimap.render(list);
    return [head(T.minimap), body];
  }

  // View in the alert list: a building's alert goes through onView (it selects the building); a raid's alert sits at a
  // map point (Stage 3), so the sheet closes and the camera goes there.
  // Stage 4: View outlines what it frames (ruling 281); a site stalled because its guild is short of workers or burning views
  // that guild (spec 4.16 Stalls).
  function viewInList(a) {
    if ((a.id === undefined || a.id === null) && Number.isFinite(a.x) && Number.isFinite(a.y)) { close(); cameraControl.panTo(a.x + 0.5, a.y + 0.5); return; }
    const stall = a.code === 'site_stalled' && world.buildings[a.id] ? causeFix(world, world.buildings[a.id], a.reason) : null;
    if (stall && stall.view) { noteView(world, stall.view); onSelect(stall.view); return; }
    noteView(world, a.id);
    onView(a);
  }

  // Store re-entrancy (1c follow-up, Stage 3): a building can vanish on the daily tick (it burned down). When the sheet
  // is rebuilt inside a store notification, closing it there would hand the subscribers after this one an older state,
  // so the close waits for a microtask and checks again; outside a notification it closes at once.
  let notifying = false;
  let scrolledFor = null;     // the sheet state a scroll to a section was last done for
  function closeGone() {
    const now = store.get();
    if (now.sheet && now.sheet.kind === 'info' && !world.buildings[now.sheet.id]) store.set(closeSheet(now));
  }

  function render() {
    const s = store.get();
    // A rebuild drops keyboard focus: put it back on the button at the same position when its class matches (spec 6.8).
    const buttons = [...container.querySelectorAll('button')];
    const focusIndex = buttons.indexOf(document.activeElement);
    const focusClass = focusIndex >= 0 ? buttons[focusIndex].className : null;
    clear(container);
    if (!s.sheet) { container.hidden = true; return; }
    let parts;
    if (s.sheet.kind === 'info') {
      const b = world.buildings[s.sheet.id];
      if (!b) { container.hidden = true; if (notifying) queueMicrotask(closeGone); else closeGone(); return; }
      parts = b.type === 'house' ? houseSheet(b) : BUILDINGS[b.type].monument ? monumentSheet(b) : buildingSheet(b);
    } else if (s.sheet.kind === 'summary') parts = summarySheet();
    else if (s.sheet.kind === 'minimap') parts = minimapSheet();
    else if (custom[s.sheet.kind]) {
      // A custom sheet is headed T[kind] unless it names its own heading for what it shows (setTitle: the raid sheet).
      const body = el('div', { class: 'body' });
      let title = T[s.sheet.kind] || s.sheet.kind;
      custom[s.sheet.kind](body, { close, setTitle: (t) => { title = t; } });
      parts = [head(title), body];
    }
    else { container.hidden = true; return; }
    container.hidden = false;
    container.append(...parts);
    // The gold chip's tap opens the summary at its forecast section (once per opening, so a later redraw leaves the scroll alone).
    if (s.sheet !== scrolledFor) {
      scrolledFor = s.sheet;
      const target = s.sheet.kind === 'summary' && s.sheet.id === 'forecast' ? container.querySelector('[data-section="forecast"]') : null;
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
    }
    if (focusIndex >= 0) {
      const again = container.querySelectorAll('button')[focusIndex];
      if (again && again.className === focusClass && !again.disabled) again.focus();
    }
  }

  render();
  store.subscribe(() => { notifying = true; try { render(); } finally { notifying = false; } });
  return { render };
}
