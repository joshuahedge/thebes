// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
// A home's sheet says why it is not growing: each missing need names its cause and its fix, with Show me
// (early-game pass 2.10). Show me itself lives in createUI (showMeAt); this file only hands it a target.
import { alertShowMe } from './threatFix.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { causeFix as needFix, unmadeFix as simUnmadeFix, nextStep, fetchStoreFor, buildFixFor, lockedFixFor, priceOf } from '../sim/advice.js';
import { desirabilityContributors } from '../sim/desirability.js';
import { setPaused, setAccept, eventHoldUntil } from '../sim/commands.js';
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
import { stepWords } from './nextStepText.js';
import { canAfford } from '../sim/money.js';
import { noteView } from '../render/overlays.js';
import { supplyNeeded } from '../sim/monuments.js';
import { huntRest } from '../sim/wildlife.js';
import { ZOOM_STEP, categoryOfItem } from '../data/ui.js';
import { seasonAt } from '../sim/seasons.js';
import { SEASON_TEXT, seasonMonths, P_TEXT, CITY_EVENT_TEXT } from './text.js';
import { LARGE_TEXT, S47_PRESSURE_TEXT, buildingName, tierName, NEED_NAMES, MOOD_NAMES, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, causeText, alertText, plural, progressText, achievementsHeading, achievementBarLabel, viewLabel, goodName, goodLine, workingText, waitingText,
  contributorText, desirabilityText, keepWarningText, madeUsedText, DIFFICULTY_NAMES, T, UI4_TEXT , S45_TEXT, S47_CARTS_TEXT as CART_W } from './text.js';
import { ANOTHER_TEXT } from './areaText.js';
import { canCopy } from './another.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
// Criticals first, in the banner's rank (CRITICAL_RANK), then the rest in their own order (the sort is stable).
const rankOf = (a) => { const i = CRITICAL_RANK.indexOf(a.code); return i < 0 ? CRITICAL_RANK.length : i; };
export const criticalFirst = (list) => [...list].sort((a, b) => rankOf(a) - rankOf(b));

// What each cause's button does (Version 5.0: the table is the sim's, src/sim/advice.js causeFix, so a house sheet's rows and its next step
// and the city advice agree). Show me opens a card and aims at the home or at the building the cause names (an empty bazaar wants a granary
// beside it, an empty granary a farm beside it); View selects the building that is in reach but not working, or near but without a road (its
// own sheet then says how to fix it); select (a good held only in a far store) selects that store, whose sheet holds Fetch. next_delivery
// needs nothing from the player, so it has neither; nor has a good whose store or makers are not unlocked yet (the words name the milestone).
const withCategory = (f) => (f && f.item ? { ...f, category: categoryOfItem(f.item) } : f);
const fixOf = (cause, world) => withCategory(needFix(world, cause));
// The fix for a good nothing makes: its first maker the city has none of (else its last), or null while a maker is locked. The quota's Show me uses it too (src/ui/s47/pressure.js).
export const unmadeFix = (cause, world) => withCategory(simUnmadeFix(world, cause));
// The alerts that carry a fix button in the list besides View (Show me opens the tool and aims at the place): many plots with no
// road want the road tool (placement review P13). onFixAlert aims it, at the plot nearest the view.
const ALERT_FIX = new Set(['plots_no_road']);
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// Three kinds of food includes two, so a list that has the first leaves the second out (never "Two kinds of food ✓" beside "Three kinds of food ✗").
const withoutTwoFoods = (rows) => (rows.some((c) => c.need === 'threeFoods') ? rows.filter((c) => c.need !== 'twoFoods') : rows);

// parts (Stage 3): the danger and score interfaces' sheet parts (src/ui/danger.js), each { building(b), house(h),
// actions(b), summary() } returning arrays of nodes, added in the list's order at fixed places in the sheets below.
export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, onShowMeBuild = onShowMe, onFixAlert = () => {}, onSelect = () => {}, onBuildAnother = () => ({ ok: true }), onAnotherFix = () => {}, onOpenAdvice = () => {}, adviceOn = () => false, afterCommand = () => {}, custom = {}, parts = [], keys = () => true }) {
  const close = () => store.set(closeSheet(store.get()));
  // Version 7.0 (Track P, ruling 1001): Delete or Backspace presses this button (createUI removeByKey); the tooltip and aria-keyshortcuts say so while Keyboard shortcuts is on.
  const demolishButton = (onClick) => button(T.demolish, { class: 'demolish danger', title: keys() ? P_TEXT.demolishTitle : null, 'aria-keyshortcuts': keys() ? 'Delete Backspace' : null, onClick });
  const extra = (kind, ...args) => parts.flatMap((p) => (p && typeof p[kind] === 'function' ? p[kind](...args) || [] : []));

  // Build another (Version 5.0, Task 4, ruling 505): the button on a building's sheet. When the sim says no, the sheet says why under its buttons, with Show me where there is something to show;
  // the note belongs to the sheet it was said on (it goes with that sheet). When it says yes the tool starts and the sheet closes.
  let anotherNote = null;
  const anotherButton = (b) => (canCopy(b) ? button(ANOTHER_TEXT.button, { class: 'another', 'aria-label': ANOTHER_TEXT.label(b.type), onClick: () => {
    const r = onBuildAnother(b.id);
    if (r && !r.ok) { anotherNote = { sheet: store.get().sheet, id: b.id, text: r.text, fix: r.fix }; render(); }
  } }) : null);
  const anotherLine = (b) => (anotherNote && anotherNote.id === b.id ? el('p', { class: 'another-note coral small', role: 'status' }, [anotherNote.text, anotherNote.fix ? button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${anotherNote.text}`, onClick: () => onAnotherFix(anotherNote.fix) }) : null]) : null);

  function head(title) {
    return el('div', { class: 'head' }, [el('h2', { text: title }), iconButton(T.close, '✕', { class: 'close', onClick: close })]);
  }

  function problems(id) {
    const list = getAlerts().filter((a) => a.id === id);
    if (!list.length) return el('p', { class: 'muted', text: T.noProblems });
    return el('ul', { class: 'problems' }, list.map((a) => {
      const t = alertText(a, world);
      // (Wave 4 fix) The words in one block and View beside it, never wrapped across the line: the button stays one word on one line, under it when the words fill the row.
      return el('li', { class: 'problem', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px' } }, [
        el('span', { class: 'problem-text', style: { flex: '1 1 12em', minWidth: '0' } }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix })]),
        button(T.view, { class: 'view quiet', style: { flex: 'none', whiteSpace: 'nowrap' }, 'aria-label': viewLabel(t.title), onClick: () => { noteView(world, a.id); onView(a); } })]);
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
    body.append(el('div', { class: 'actions' }, [...extra('actions', b), anotherButton(b), demolishButton(() => demolishNow(b))].filter(Boolean)), ...[anotherLine(b)].filter(Boolean));
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
    // (Wave 4 fix) Harvest now sits right under the rows that explain it, not at the foot of the sheet below the problems (below the fold on a phone's farm sheet).
    const sheetActions = extra('actions', b), harvest = sheetActions.filter((n) => n && n.classList && n.classList.contains('harvest'));
    if (harvest.length) body.append(el('div', { class: 'actions harvest-actions' }, harvest));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' }, sheetActions.filter((n) => !harvest.includes(n)));
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
    let holdLine = null;
    if (def.workers || def.upkeep) {
      // A strike or quarrel a city event started holds until its day (ruling 987): Resume is off, with the reason and the day under it.
      const hold = b.paused ? eventHoldUntil(world, b.id) : null;
      actions.append(button(b.paused ? T.resume : T.pause, { class: 'pause', disabled: hold !== null, ...(hold !== null ? { 'aria-describedby': `hold-${b.id}` } : {}), onClick: () => {
        const r = setPaused(world, b.id, !b.paused);
        if (r.ok) { assignLabour(world); afterCommand({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resumed, undoable: false }); render(); }
      } }));
      if (hold !== null) holdLine = (el('p', { class: 'small coral event-hold', id: `hold-${b.id}`, text: `${CITY_EVENT_TEXT.hold(hold, b.type)}.` }));
    }
    // Rubble's Clear (Stage 3, src/ui/dangerSheets.js) is its demolish, with the price in its name.
    if (b.type !== 'rubble') actions.append(...[anotherButton(b), demolishButton(() => demolishNow(b))].filter(Boolean));
    body.append(actions, ...[holdLine, anotherLine(b)].filter(Boolean));
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
    const fix = fixOf(cause, world);
    // Nothing to build or view (goods on their way, a building not unlocked yet): the fix's words alone, when it has any.
    if (!fix) { if (words.fix) li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix })])); return li; }
    const building = cause.id !== null ? world.buildings[cause.id] : null;
    let action, said = words.fix;
    if (fix.select) {
      if (!building) return li;
      const target = fetchStoreFor(world, cause) || building;   // the store near the bazaar that should set the Fetch order, else the one that holds the good
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': S47_PRESSURE_TEXT.showFar(cause, world), onClick: () => onSelect(target.id) });
    } else if (fix.view) {
      if (!building) return li;
      action = button(T.view, { class: 'view quiet', 'aria-label': viewLabel(buildingName(building.type)), onClick: () => onSelect(building.id) });
    } else {
      // Version 5.0 (Task 7): the item and the place are the next step's (buildFixFor): a low street's decoration at its tile, a workshop by its store.
      const step = buildFixFor(world, h, cause, c.need);
      if (!step) {   // an item not unlocked yet: the step line's own Locked words, and no Show me the sim would refuse (final review)
        const locked = lockedFixFor(world, h, cause, c.need);
        if (locked) {
          const rest = stepWords(world, h, { reason: 'locked', need: c.need, cause, locked }).rest;
          li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: rest.charAt(0).toUpperCase() + rest.slice(1) })]));
          return li;
        }
      }
      const item = step ? step.item : fix.item;
      const near = step ? step.target : centreOf(fix.at !== 'home' && building ? building : h);
      const at = (step ? step.at : fix.at) === 'terrain' ? nearestTerrainTile(world, BUILDINGS[item].terrain, near) || near : near;
      const target = { category: categoryOfItem(item), item, x: at.x, y: at.y };
      // A low street's decoration, a workshop by its store and a hunting lodge by the herd are said as the next step says them (which building, where, its price, what it gives),
      // not the general line, so the words and the aria-label name what Show me starts.
      const named = step && (step.from !== undefined || step.herd || step.near !== undefined || step.store !== undefined);
      const rest = named ? stepWords(world, h, { reason: null, need: c.need, cause, fix: step, cost: priceOf(world, step), afford: canAfford(world, priceOf(world, step)) }).rest : null;
      if (rest) said = rest.charAt(0).toUpperCase() + rest.slice(1);
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${said}`, onClick: () => onShowMeBuild(target) });
    }
    li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: said }), action]));
    return li;
  }

  // A building that changes a home's desirability, by name: a home by its tier ("+2 manor"), anything else by its type.
  function contributorName(d) {
    const b = world.buildings[d.id];
    return (b && b.type === 'house' ? tierName(b.tier) : buildingName(d.type)).toLowerCase();
  }

  // Version 5.0 (Task 2): the line at the top of a home's sheet from the sim's nextStep: the one thing to do next with its price and a Show me (or View), or
  // why there is nothing to do (waiting on a delivery, locked behind a milestone, ready to grow, kept, an empty plot). The full checklist stays below.
  function stepLine(h, step) {
    const w = stepWords(world, h, step);
    const text = el('span', { class: 'step-text' }, [el('strong', { class: 'step-label', text: w.label }), ' ' + w.rest]);
    const a = w.action;
    const act = !a ? null : button(a.label, { class: a.select !== undefined && a.label === T.view ? 'view quiet' : 'show-me primary', 'aria-label': a.aria, onClick: () => (a.select !== undefined ? onSelect(a.select) : onShowMeBuild(a.build)) });
    return el('div', { class: w.short ? 'step-line short' : 'step-line', dataset: { reason: step.reason === null ? 'next' : step.reason } }, [text, act]);
  }

  function houseSheet(h) {
    const s = houseStatus(world, h);
    const step = nextStep(world, h);
    const body = el('div', { class: 'body' });
    body.append(stepLine(h, step));
    if (s.tier === 0 && step.reason !== 'empty') body.append(el('p', { class: 'muted', text: s.lot ? LARGE_TEXT.waiting : T.emptyPlot }));   // Version 6.0 (Track C): an empty Large plot says what it waits on
    const share = s.capacity ? Math.min(1, s.residents / s.capacity) : 0;
    body.append(el('div', { class: 'row residents' }, [
      el('span', { class: 'muted', text: T.residents }),
      el('span', { class: 'value' }, [
        progressText(s.residents, s.capacity),
        el('span', { class: 'meter', 'aria-hidden': 'true' }, [el('span', { class: 'fill', style: { width: `${Math.round(share * 100)}%` } })]),
      ]),
    ]));
    if (s.next) {
      const rows = withoutTwoFoods(s.merge.needed ? [...s.checklist, { need: 'merge', met: s.merge.ready }] : s.checklist);
      // Version 6.0 (Track C): an empty Large plot lists what it opens on ("Opens when"), the Manor's rows read from the same rules a home's are.
      body.append(el('h3', { class: s.lot ? 'opens-head' : '', text: s.lot ? LARGE_TEXT.opensHead : `${T.nextTier} (${s.next.name})` }));
      if (s.lot) body.append(el('p', { class: 'muted small opens-note', text: LARGE_TEXT.opensNote }));
      body.append(el('ul', { class: s.lot ? 'checklist opens-list' : 'checklist' }, rows.map((c) => needRow(h, c))));
      if (s.tier >= 1 && rows.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    } else if (s.tier >= 1) {
      // Stage 4.7 (Task 7, ruling 471): the top tier has no next one, so its sheet lists what keeps it (its own needs, the street's "to keep"
      // value), each with its cause and Show me as a checklist row does.
      body.append(el('h3', { class: 'keep-head', text: S47_PRESSURE_TEXT.keepHead(s.name) }));
      body.append(el('ul', { class: 'checklist keep-list' }, withoutTwoFoods(s.checklist).map((c) => needRow(h, c))));
    }
    // The warning month (spec 4.6): a need running out names the need; a street below the tier's keep value names the tier.
    const lost = s.missingNow.find((n) => n !== 'desirability');
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (s.missingNow.includes('desirability')) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
    body.append(...extra('house', h));
    body.append(el('div', { class: 'actions' }, [anotherButton(h), demolishButton(() => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); })].filter(Boolean)), ...[anotherLine(h)].filter(Boolean));
    return [head(s.large ? LARGE_TEXT.title(s) : tierName(s.tier)), body];
  }

  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    // Version 7.0 (Track S, ruling 933): the season by name, with its months, here too: the top bar's line under the date hides where the numbers wrap
    // (a phone with a big treasury), so the summary a tap on the bar opens always says it.
    const season = seasonAt(world).season;
    body.append(row(SEASON_TEXT.row, SEASON_TEXT.rowValue(SEASON_TEXT.names[season], seasonMonths(season))));
    // Version 5.0 (Task 1): the figures stay here; what holds the city back is its own sheet, one tap away (from the first home).
    if (adviceOn()) body.append(el('div', { class: 'actions advice-link' }, [button(T.advice, { class: 'open-advice', 'aria-label': `${T.advice}: ${T.adviceLead.toLowerCase()}`, onClick: () => onOpenAdvice() })]));
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
    body.append(el('h3', { text: T.employment, dataset: { section: 'employment' } }), row(T.working, `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row(T.jobs, `${d.jobs}`));
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
    if (anotherNote && anotherNote.sheet !== s.sheet) anotherNote = null;   // Build another's refusal goes with the sheet it was said on
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
      const target = s.sheet.kind === 'summary' && (s.sheet.id === 'forecast' || s.sheet.id === 'employment') ? container.querySelector(`[data-section="${s.sheet.id}"]`) : null;
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
