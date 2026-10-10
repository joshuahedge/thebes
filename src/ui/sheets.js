// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
import { BUILDINGS } from '../data/buildings.js';
import { houseStatus } from '../sim/housing.js';
import { setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { openGoals } from '../sim/goals.js';
import { closeSheet } from './modes.js';
import { summaryData } from './hud.js';
import { ZOOM_STEP } from '../data/ui.js';
import { buildingName, tierName, NEED_NAMES, alertText, plural, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, afterCommand = () => {}, custom = {} }) {
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

  function houseSheet(h) {
    const s = houseStatus(world, h);
    const body = el('div', { class: 'body' });
    if (s.tier === 0) body.append(el('p', { class: 'muted', text: T.emptyPlot }));
    body.append(row(T.residents, `${s.residents} of ${s.capacity}`));
    if (s.next) {
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, s.checklist.map((c) => el('li', {}, [
        el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓ ' : '✕ ' }),
        el('span', { class: 'sr-only', text: c.met ? 'Has ' : 'Missing ' }), NEED_NAMES[c.need],
      ]))));
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
    body.append(el('h3', { text: T.foodInStore }), row('Grain', `${d.foodStored}`), row('Lasts', d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    body.append(el('h3', { text: T.employment }), row('Working', `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row('Jobs', `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(k, (v >= 0 ? '+' : '') + v));
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
  }

  render();
  store.subscribe(render);
  return { render };
}
