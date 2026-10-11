// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
// A home's sheet says why it is not growing: each missing need names its cause and its fix, with Show me
// (early-game pass 2.10). Show me itself lives in createUI (showMeAt); this file only hands it a target.
import { BUILDINGS } from '../data/buildings.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { openGoals } from '../sim/goals.js';
import { closeSheet } from './modes.js';
import { summaryData } from './hud.js';
import { ZOOM_STEP } from '../data/ui.js';
import { buildingName, tierName, NEED_NAMES, MOOD_NAMES, causeText, alertText, plural, progressText, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

// What each cause's button does. Show me opens a card and aims at the home or at the building the cause names (an
// empty bazaar wants a granary beside it, an empty granary a farm beside it); View selects the building that is in
// reach but not working. next_delivery needs nothing from the player, so it has neither.
const CAUSE_FIX = {
  no_road: { category: 'roads', item: 'road', at: 'home' },
  no_well: { category: 'services', item: 'well', at: 'home' },
  no_bazaar: { category: 'services', item: 'bazaar', at: 'home' },
  bazaar_empty: { category: 'food', item: 'granary', at: 'building' },
  granary_empty: { category: 'food', item: 'farm_grain', at: 'building' },
  no_temple: { category: 'services', item: 'temple', at: 'home' },
  well_idle: { view: true },
  bazaar_idle: { view: true },
  temple_idle: { view: true },
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
      return el('li', { class: 'problem' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]);
    }));
  }

  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${good}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' });
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
  // building that would serve it is already in reach and only needs resuming or workers.
  function needRow(h, c) {
    const li = el('li', { class: c.met ? 'met' : 'missing' }, [el('div', { class: 'need' }, [
      el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓' : '✕' }),
      el('span', { class: 'name', text: NEED_NAMES[c.need] }),
      el('span', { class: `status small ${c.met ? 'teal' : 'coral'}`, text: c.met ? T.hasIt : T.missing }),
    ])]);
    const cause = c.met ? null : needCause(world, h, c.need);
    if (!cause) return li;
    const words = causeText(cause, world);
    li.append(el('p', { class: 'cause small', text: words.cause }));
    const fix = CAUSE_FIX[cause.code];
    if (!fix) return li;
    const building = cause.id !== null ? world.buildings[cause.id] : null;
    let action;
    if (fix.view) {
      if (!building) return li;
      action = button(T.view, { class: 'view quiet', 'aria-label': `${T.view}: ${buildingName(building.type)}`, onClick: () => onSelect(building.id) });
    } else {
      const at = centreOf(fix.at === 'building' && building ? building : h);
      const target = { category: fix.category, item: fix.item, x: at.x, y: at.y };
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${words.fix}`, onClick: () => onShowMe(target) });
    }
    li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix }), action]));
    return li;
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
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, s.checklist.map((c) => needRow(h, c))));
      if (s.tier >= 1 && s.checklist.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    }
    if (s.downgradeIn !== null && s.missingNow.length) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[s.missingNow[0]].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
  }

  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(el('h3', { text: T.foodInStore }), row(T.grain, `${d.foodStored}`), row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    body.append(el('h3', { text: T.employment }), row(T.working, `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row(T.jobs, `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    // The starting mood is a level, the rest are swings from it (early-game pass 2.10: plain English rows).
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(MOOD_NAMES[k] || k, k === 'base' ? String(v) : (v >= 0 ? '+' : '') + v));
    body.append(el('h3', { text: T.goals }));
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    return [head(T.summary), body];
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
    else body.append(el('ul', { class: 'alert-list' }, list.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
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
