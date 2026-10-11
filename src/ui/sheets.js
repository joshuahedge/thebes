// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
// A home's sheet says why it is not growing: each missing need names its cause and its fix, with Show me
// (early-game pass 2.10). Show me itself lives in createUI (showMeAt); this file only hands it a target.
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { desirabilityContributors } from '../sim/desirability.js';
import { isUnlocked } from '../sim/progression.js';
import { allBuildings } from '../sim/world.js';
import { setPaused, setAccept } from '../sim/commands.js';
import { assignLabour, isWorking } from '../sim/labour.js';
import { storeTotal, storeAccepts } from '../sim/production.js';
import { openGoals, guideActive } from '../sim/goals.js';
import { achievementProgress } from '../sim/achievements.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { closeSheet, openSheet } from './modes.js';
import { summaryData } from './hud.js';
import { nearestTerrainTile } from './goalsList.js';
import { ZOOM_STEP, categoryOfItem } from '../data/ui.js';
import { buildingName, tierName, NEED_NAMES, MOOD_NAMES, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, causeText, alertText, plural, progressText, achievementsHeading, achievementBarLabel, viewLabel, goodName, goodLine, workingText, waitingText,
  goodMakers, makerOf, storeFor, contributorText, desirabilityText, keepWarningText, madeUsedText, DIFFICULTY_NAMES, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

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
  // beyond the ghost's search around the bazaar. Neither while the building is not unlocked yet (the words then name the
  // milestone).
  no_good: (cause, world) => {
    const item = storeFor(cause.good);
    return item && isUnlocked(world, item) ? { category: categoryOfItem(item), item, at: 'building' } : null;
  },
  good_unmade: (cause, world) => {
    const makers = goodMakers(cause.good);
    if (!makers.length || makers.some((t) => !isUnlocked(world, t))) return null;
    const item = makers.find((t) => !allBuildings(world).some((b) => b.type === t)) || makerOf(cause.good);
    return { category: categoryOfItem(item), item, at: BUILDINGS[item].terrain ? 'terrain' : 'building' };
  },
};
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, onSelect = () => {}, afterCommand = () => {}, custom = {} }) {
  const close = () => store.set(closeSheet(store.get()));

  function head(title) {
    return el('div', { class: 'head' }, [el('h2', { text: title }), iconButton(T.close, '✕', { class: 'close', onClick: close })]);
  }

  function problems(id) {
    const list = getAlerts().filter((a) => a.id === id);
    if (!list.length) return el('p', { class: 'muted', text: T.noProblems });
    return el('ul', { class: 'problems' }, list.map((a) => {
      const t = alertText(a, world);
      return el('li', { class: 'problem' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', 'aria-label': viewLabel(t.title), onClick: () => onView(a) })]);
    }));
  }

  // A producer says what it is doing in words: making, growing or digging its good, waiting for its input, or not
  // working (the problems below say why).
  function workLine(b) {
    const def = BUILDINGS[b.type];
    if (!def.produces) return null;
    let text = T.notWorking;
    if (isWorking(world, b) && b.blocked === 'no_input') text = waitingText(def.consumes);
    else if (isWorking(world, b) && !b.blocked) text = workingText(b.type);
    return el('p', { class: 'work-status', text });
  }

  // Storage (spec 4.10): how full it is, then a row per good it can hold with its count and the good's line (what
  // makes it, what uses it). A storehouse's rows are switches that accept or refuse the good (setAccept); the state
  // is a word beside the good, so the switch never relies on colour.
  function storeSection(b) {
    const def = BUILDINGS[b.type];
    const switches = b.type === 'storehouse';
    const out = [row(T.stored, progressText(storeTotal(b), def.capacity)), el('h3', { text: T.stock })];
    if (switches) out.push(el('p', { class: 'small muted', text: T.acceptHelp }));
    out.push(el('ul', { class: 'store-goods' }, def.stores.map((good) => {
      const n = String(b.store[good] || 0);
      const line = el('p', { class: 'good-line small muted', text: goodLine(good) });
      if (!switches) return el('li', { dataset: { good } }, [el('div', { class: 'row' }, [el('span', { text: goodName(good) }), el('span', { text: n })]), line]);
      const on = storeAccepts(b, good);
      const sw = el('button', { type: 'button', role: 'switch', class: 'switch accept', 'aria-checked': String(on), dataset: { good } }, [
        el('span', { class: 'good' }, [goodName(good), ' ', el('span', { class: 'count small muted', text: n })]),
        el('span', { class: 'state small', text: on ? T.accepted : T.refused }),
      ]);
      sw.addEventListener('click', () => {
        const r = setAccept(world, b.id, good, !on);
        if (r.ok) { afterCommand({ kind: 'accept', result: r, undoable: false }); render(); }
      });
      return el('li', { dataset: { good } }, [sw, line]);
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
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' });
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
    if (def.workers || def.upkeep) {
      actions.append(button(b.paused ? T.resume : T.pause, { class: 'pause', onClick: () => {
        const r = setPaused(world, b.id, !b.paused);
        if (r.ok) { assignLabour(world); afterCommand({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resumed, undoable: false }); render(); }
      } }));
    }
    actions.append(button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(b.x, b.y); if (r.ok) close(); } }));
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
    if (fix.view) {
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
    }
    // The warning month (spec 4.6): a need running out names the need; a street below the tier's keep value names the tier.
    const lost = s.missingNow.find((n) => n !== 'desirability');
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (s.missingNow.includes('desirability')) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
  }

  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(row(T.tradeIncome, `+${d.tradeIncome}`));
    // Food in store by kind: grain always, other foods once there are some.
    body.append(el('h3', { text: T.foodInStore }), ...FOOD_GOODS.filter((g, i) => i === 0 || d.foodByGood[g] > 0).map((g) => row(goodName(g), `${d.foodByGood[g]}`)));
    body.append(row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    // Each good made against used last month (spec 4.10), in the data's order; only goods that moved.
    const moved = Object.keys(GOODS).filter((g) => d.made[g] || d.used[g]);
    body.append(el('h3', { text: T.goodsLastMonth }), ...(moved.length ? moved.map((g) => row(goodName(g), madeUsedText(d.made[g] || 0, d.used[g] || 0))) : [el('p', { class: 'muted', text: T.noGoodsYet })]));
    body.append(el('h3', { text: T.employment }), row(T.working, `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row(T.jobs, `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    // The starting mood is a level, the rest are swings from it (early-game pass 2.10: plain English rows).
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(MOOD_NAMES[k] || k, k === 'base' ? String(v) : (v >= 0 ? '+' : '') + v));
    body.append(el('h3', { text: T.goals }));
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    body.append(...achievementsSection());
    return [head(T.summary), body];
  }

  // Achievements (spec 3.8): every one with its exact condition and its progress, at the end of the summary.
  // Hidden while the guide runs, so they never compete with it.
  function achievementsSection() {
    if (guideActive(world)) return [el('h3', { text: T.achievements }), el('p', { class: 'muted', text: T.achievementsLater })];
    const done = new Set(world.achievements || []);
    const count = ACHIEVEMENTS.filter((a) => done.has(a.id)).length;
    return [
      el('h3', { text: achievementsHeading(count, ACHIEVEMENTS.length) }),
      el('ul', { class: 'achievements' }, ACHIEVEMENTS.map((a) => achievementRow(a, done.has(a.id)))),
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

  function minimapSheet() {
    const body = el('div', { class: 'body' });
    const canvas = minimap.canvas;
    canvas.onclick = (ev) => { const r = canvas.getBoundingClientRect(); const t = minimap.tileFromPoint(ev.clientX - r.left, ev.clientY - r.top); cameraControl.panTo(t.x + 0.5, t.y + 0.5); };
    const zoomIn = iconButton(T.zoomIn, '+', { class: 'zoom-in', onClick: () => cameraControl.zoomStep(ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    const zoomOut = iconButton(T.zoomOut, '−', { class: 'zoom-out', onClick: () => cameraControl.zoomStep(1 / ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    body.append(el('div', { class: 'minimap-wrap' }, [canvas]), el('div', { class: 'actions' }, [zoomIn, zoomOut]));
    const list = getAlerts();
    body.append(el('h3', { text: T.alerts }));
    if (!list.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, list.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', 'aria-label': viewLabel(t.title), onClick: () => onView(a) })]); })));
    minimap.render(list);
    return [head(T.minimap), body];
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
      if (!b) { store.set(closeSheet(s)); container.hidden = true; return; }
      parts = b.type === 'house' ? houseSheet(b) : buildingSheet(b);
    } else if (s.sheet.kind === 'summary') parts = summarySheet();
    else if (s.sheet.kind === 'minimap') parts = minimapSheet();
    else if (custom[s.sheet.kind]) { const body = el('div', { class: 'body' }); custom[s.sheet.kind](body, { close }); parts = [head(T[s.sheet.kind] || s.sheet.kind), body]; }
    else { container.hidden = true; return; }
    container.hidden = false;
    container.append(...parts);
    if (focusIndex >= 0) {
      const again = container.querySelectorAll('button')[focusIndex];
      if (again && again.className === focusClass && !again.disabled) again.focus();
    }
  }

  render();
  store.subscribe(render);
  return { render };
}
