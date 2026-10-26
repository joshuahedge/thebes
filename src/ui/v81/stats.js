// Version 8.1 "The vizier", Track B (rulings 1220-1239): what the top bar's stats say when tapped, and the City page's trends.
//   statState(world)            each stat's number, picture state and the words of that state (src/ui/hud.js draws them every frame)
//   explainStat(world, kind, d) one stat's explainer: what it is, why it moves (from the sim's own breakdown) and one action (d: the interface's hands)
//   createExplainer(...)        the small popover pinned under a stat: a second tap, a tap elsewhere or Esc closes it; one panel at a time
//   cityTabs(active, ...)       the Messages | City tabs on the papyrus's sheets (Messages is the advice sheet, City the city summary)
//   trendSection(world)         the City page's last year: gold, people and mood at each month's end (world.history, the sim's own record)
// Every number comes from the sim: summaryData and monthForecast (the money), the labour count, world.moodBreakdown, nextFlood (src/sim/flood.js), scoreOf.
import { FLOOD_LEVEL_IDS } from '../../data/river.js';
import { categoryOfItem } from '../../data/ui.js';
import { monthForecast, biggestCost } from '../../sim/economy.js';
import { cityAdvice } from '../../sim/advice.js';
import { nextFlood } from '../../sim/flood.js';
import { isUnlocked } from '../../sim/progression.js';
import { seasonAt } from '../../sim/seasons.js';
import { costOf } from '../../sim/costs.js';
import { housesOf, buildingsVersion } from '../../sim/world.js';
import { scoreOf } from '../../sim/score.js';
import { SCORE_PARTS } from '../../data/scoring.js';
import { summaryData } from '../hud.js';
import { adviceWords } from '../adviceText.js';
import { T as TILE } from '../../sim/terrain.js';
import { closeSheet } from '../modes.js';
import { el, button, clear } from '../components.js';
import { MOOD_NAMES, SCORE_TEXT, SEASON_TEXT, buildingName, dateText, shortDateText, score4ReasonText, T } from '../text.js';
import { V81_B_TEXT as B, moodFace } from './bText.js';
import { goldPile, peopleCrowd } from './statIcons.js';
import { forMap } from '../v82/oasisText.js';

export const STAT_KINDS = ['gold', 'people', 'mood', 'date', 'score'];

// The score for the top bar, measured by the sim's scoreOf at most once per game day, building change and treasury change (the bar reads it every frame;
// the summary's own section measures it the same way: src/ui/scoreUi.js).
export function createScoreReader(world) {
  let key = null, score = null;
  return () => {
    const k = `${world.day}|${buildingsVersion(world)}|${world.gold}`;
    if (k !== key) { key = k; score = scoreOf(world); }
    return score;
  };
}

// The advice kinds each explainer may offer as its one action (src/data/advice.js ADVICE_KINDS), the city's own ranking deciding among them. Mood takes the
// city's top problem of any kind: every one of them is a reason homes are unhappy or leave.
// Gold's are the fixes that earn it (a trade floor, a quay), never the court's letter (integration, ruling 1267).
const ADVICE_FOR = { gold: ['trade_floor', 'quay'], people: ['workers_short', 'jobless', 'home_need', 'stranded'], mood: null };
// The City page's section each explainer opens when the city has no advice for it (data-section in src/ui/sheets.js and the score's own section).
export const CITY_SECTION = { gold: 'forecast', people: 'employment', mood: 'mood', date: 'river', score: 'score' };

// Abbreviates a big number for a phone's bar (the explainer and the name always say it whole): 12500 -> "12.5k", 123456 -> "123k".
export function compact(n) {
  const a = Math.abs(n), sign = n < 0 ? '−' : '';
  if (a < 10000) return `${sign}${a}`;
  if (a < 100000) return `${sign}${(Math.floor(a / 100) / 10).toString()}k`;
  if (a < 1e6) return `${sign}${Math.floor(a / 1000)}k`;
  return `${sign}${(Math.floor(a / 1e5) / 10).toString()}M`;
}

// Each stat as the bar shows it: { value (the words on the bar), full (the whole number), state (the picture's), words (the state said) }.
// score is null while scoreUi has not given one (it measures the score at most once per command and game day).
// date: 'long' ("Year 2, month 1, day 1"), 'short' ("Y2 M1") or 'month' ("M1": a phone's bar, ruling 1227: the year is in its name and explainer).
export function statState(world, { date: form = 'short', score = null } = {}) {
  const d = summaryData(world), f = monthForecast(world), n = nextFlood(world), season = seasonAt(world).season;
  const falling = f.active && f.net < 0;
  const face = moodFace(d.mood);
  const level = n.level ? FLOOD_LEVEL_IDS.indexOf(n.level.id) : -1;
  return {
    gold: { value: compact(d.gold), full: d.gold, coins: goldPile(d.gold), falling, words: falling ? (f.runsOut ? B.goldRunsOut(f) : B.goldFalling) : '' },
    people: { value: compact(d.people), full: d.people, figures: peopleCrowd(d.people), words: '' },
    mood: { value: String(d.mood), full: d.mood, face, words: B.faceWords[face] },
    date: { value: form === 'long' ? dateText(d.date) : form === 'month' ? B.monthShort(d.date) : shortDateText(d.date), full: dateText(d.date), season, level, words: [SEASON_TEXT.names[season], B.floodNext(n)].filter(Boolean).join(', ') },
    score: { value: score === null ? '' : compact(score), full: score, words: '' },
  };
}

// The river tile nearest the city's focus, where a Nilometer's Show me aims (the placing search then finds a tile beside it that takes one, or says why not).
function nearestWater(world, from) {
  let best = null, bestD = Infinity;
  for (let i = 0; i < world.terrain.length; i++) {
    if (world.terrain[i] !== TILE.WATER) continue;
    const x = (i % world.size) + 0.5, y = Math.floor(i / world.size) + 0.5, d = (x - from.x) ** 2 + (y - from.y) ** 2;
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

// The action that opens the City page at a stat's section.
const cityAction = (kind, deps) => ({ label: B.cityPage, aria: B.cityPageLabel(B.names[kind]), run: () => deps.openSummary(CITY_SECTION[kind]), kind: 'city' });

// The city's top advice of the given kinds (any kind for null) as an action, with the line that says what it is about; null when there is none.
function adviceAction(world, kinds, deps) {
  if (!deps.advice) return null;
  const a = cityAdvice(world).find((x) => !kinds || kinds.includes(x.kind));
  if (!a) return null;
  const w = adviceWords(a, world);
  if (!w.action) return null;
  return { label: w.action.label, aria: w.action.aria, line: w.what, run: () => deps.advice.fix(a), kind: 'advice', key: a.key };
}

// One stat's explainer: { name, title, what, head, lines: [[label, value]], notes: [text], action: { label, aria, line, run } }.
// deps: { advice: { fix, showMe }, openSummary(section), selectBuilding(id), score() -> scoreOf's result or null }.
export function explainStat(world, kind, deps = {}) {
  const name = B.names[kind];
  const d = summaryData(world);
  const out = { kind, name, title: '', what: '', head: '', lines: [], notes: [], action: null };
  if (kind === 'gold') {
    const f = monthForecast(world);
    Object.assign(out, { title: `${name} ${d.gold}`, what: B.gold.what });
    if (!f.active) out.notes.push(B.gold.none);
    else {
      out.head = B.gold.head;
      out.lines.push([B.gold.taxes, B.signed(f.taxes)], [B.gold.wages, B.signed(-f.wages)], [B.gold.upkeep, B.signed(-f.upkeep)]);
      if (f.soldiers > 0) out.lines.push([B.gold.soldiers, B.signed(-f.soldiers)]);
      out.lines.push([B.gold.net, B.signed(f.net)]);
      out.notes.push(f.gold < 0 && f.net < 0 ? B.gold.below : f.monthsLeft !== null ? B.gold.runsOut(f.monthsLeft) : f.net < 0 ? `${B.gold.short}.` : `${B.gold.ok}.`);
    }
    // The one action is about gold and says Show me (ruling 1267): the costliest building while the month runs at a loss, else a fix that earns gold (the city's top
    // trade floor or quay advice that builds), else the costliest building all the same; the City page's forecast when there is none of these.
    const big = f.active && deps.selectBuilding ? biggestCost(world) : null;
    const costliest = big ? { label: T.showMe, aria: B.showCostliest(buildingName(big.type)), line: B.gold.costliest(buildingName(big.type), big.cost), run: () => deps.selectBuilding(big.id), kind: 'select' } : null;
    const earn = adviceAction(world, ADVICE_FOR.gold, deps);
    out.action = costliest && f.net < 0 ? costliest : earn && earn.label === T.showMe ? earn : costliest;
  } else if (kind === 'people') {
    Object.assign(out, { title: `${name} ${d.people}`, what: B.people.what });
    out.lines.push([B.people.homes, String(housesOf(world).length)], [B.people.workforce, String(d.workforce)], [B.people.working, B.people.workingOf(d.working, d.workforce)], [B.people.jobless, String(d.jobless)], [B.people.jobs, String(d.jobs)]);
    out.action = adviceAction(world, ADVICE_FOR.people, deps);
  } else if (kind === 'mood') {
    Object.assign(out, { title: `${name} ${d.mood}`, what: B.mood.what });
    out.notes.push(B.mood.face(moodFace(d.mood)));
    // The causes that move it, the biggest first (the summary's own rows: the starting mood is a level, the rest swings from it).
    const causes = Object.entries(d.moodBreakdown || {}).filter(([k, v]) => k !== 'base' && v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    if (causes.length) {
      out.head = B.mood.head;
      out.lines.push([MOOD_NAMES.base, String((d.moodBreakdown || {}).base)]);
      for (const [k, v] of causes.slice(0, 5)) out.lines.push([MOOD_NAMES[k] || k, B.signed(v)]);
    } else out.notes.push(B.mood.none);
    out.action = adviceAction(world, ADVICE_FOR.mood, deps);
  } else if (kind === 'date') {
    const season = seasonAt(world).season, n = nextFlood(world);
    Object.assign(out, { title: dateText(d.date), what: B.date.what(season) });
    if (!n.on) out.notes.push(B.date.off);
    else {
      out.notes.push(n.level ? B.date.nextKnown(n) : B.date.nextUnknown(n));
      if (n.nilometer) out.notes.push(B.date.nilometer);
      const standing = Object.values(world.buildings).filter((b) => b.type === 'nilometer');
      const idle = standing.length && !n.nilometer ? standing[0] : null;
      if (idle) {
        out.notes.push(B.date.idle);
        if (deps.selectBuilding) out.action = { label: B.nilometerIdleFix, aria: B.nilometerIdleFix, run: () => deps.selectBuilding(idle.id), kind: 'select' };
      } else if (!standing.length && isUnlocked(world, 'nilometer') && deps.advice) {
        const at = nearestWater(world, world.focus) || world.focus;
        const label = forMap(world, B.nilometerBuild(costOf(world, 'nilometer')));   // Version 8.2: "on the great lake's bank" on the Great oasis
        out.action = { label, aria: label, run: () => deps.advice.showMe({ category: categoryOfItem('nilometer'), item: 'nilometer', x: at.x, y: at.y }), kind: 'build' };
      }
    }
  } else if (kind === 'score') {
    const s = deps.score ? deps.score() : null;
    Object.assign(out, { title: s ? `${name} ${s.total}` : name, what: B.score.what });
    if (s) {
      for (const p of SCORE_PARTS) out.lines.push([SCORE_TEXT.parts[p], B.score.of(Math.round(s.parts[p]))]);
      const weakest = SCORE_PARTS.reduce((a, p) => (s.parts[p] < s.parts[a] ? p : a), SCORE_PARTS[0]);
      out.notes.push(B.score.weakest(SCORE_TEXT.parts[weakest], score4ReasonText(s.reasons[weakest])));
    }
  }
  if (!out.action && deps.openSummary) out.action = cityAction(kind, deps);
  return out;
}

// The popover. host: the top bar (the popover is pinned under it, beside the stat); store: to close a sheet that is open and to close when one opens.
// explain(kind) -> explainStat's result. Returns { toggle(kind, anchor, byKeyboard), close(), openKind(), refresh() }.
export function createExplainer({ host, store, explain, doc = document }) {
  let kind = null, anchor = null;
  const box = el('div', { class: 'stat-explainer', role: 'dialog', hidden: true });
  host.append(box);

  function render() {
    const m = explain(kind);
    clear(box);
    box.setAttribute('aria-label', B.explainerLabel(m.name));
    box.dataset.kind = kind;
    const closer = button('×', { class: 'explainer-close quiet', 'aria-label': B.closeLabel(m.name), title: B.close, onClick: () => close(true) });
    box.append(el('div', { class: 'explainer-head' }, [el('h2', { text: m.title }), closer]));
    box.append(el('p', { class: 'explainer-what', text: m.what }));
    if (m.lines.length) {
      if (m.head) box.append(el('h3', { text: m.head }));
      box.append(el('dl', { class: 'explainer-lines' }, m.lines.map(([k, v]) => el('div', { class: 'row' }, [el('dt', { text: k }), el('dd', { text: v })]))));
    }
    for (const n of m.notes) box.append(el('p', { class: 'explainer-note', text: n }));
    if (m.action) {
      const a = m.action;
      if (a.line) box.append(el('p', { class: 'explainer-do', text: a.line }));
      box.append(el('div', { class: 'explainer-actions' }, [button(a.label, { class: `explainer-action ${a.kind === 'city' ? 'secondary' : 'primary'}`, 'aria-label': a.aria, dataset: { action: a.kind }, onClick: () => { close(false); a.run(); } })]));
    }
  }
  function place() {
    if (!anchor) return;
    const bar = host.getBoundingClientRect(), at = anchor.getBoundingClientRect();
    const w = box.offsetWidth, room = bar.width;
    const left = Math.max(4, Math.min(at.left - bar.left - 6, room - w - 4));
    box.style.left = `${Math.round(left)}px`;
  }
  function open(k, a, byKeyboard) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));               // one panel at a time
    kind = k; anchor = a;
    box.hidden = false;
    render();
    place();
    for (const b of host.querySelectorAll('[aria-controls="stat-explainer"]')) b.setAttribute('aria-expanded', String(b === a));
    if (byKeyboard) { const first = box.querySelector('.explainer-action') || box.querySelector('.explainer-close'); if (first) first.focus(); }
  }
  function close(refocus = false) {
    if (kind === null) return;
    const was = anchor;
    kind = null; anchor = null;
    box.hidden = true;
    clear(box);
    for (const b of host.querySelectorAll('[aria-controls="stat-explainer"]')) b.setAttribute('aria-expanded', 'false');
    if (refocus && was && was.focus) was.focus();
  }
  box.id = 'stat-explainer';
  // A tap anywhere else closes it (the stat's own tap toggles it: its click does that); Esc closes it and gives the focus back to its stat.
  const onDown = (e) => { if (kind !== null && !box.contains(e.target) && !(anchor && anchor.contains(e.target))) close(false); };
  const onKey = (e) => { if (kind !== null && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } };
  doc.addEventListener('pointerdown', onDown, true);
  doc.addEventListener('keydown', onKey, true);
  const unsubscribe = store.subscribe(() => { if (kind !== null && store.get().sheet) close(false); });
  return {
    toggle(k, a, byKeyboard = false) { if (kind === k) close(byKeyboard); else open(k, a, byKeyboard); },
    close,
    openKind: () => kind,
    refresh() { if (kind !== null) { render(); place(); } },
    destroy() { doc.removeEventListener('pointerdown', onDown, true); doc.removeEventListener('keydown', onKey, true); unsubscribe(); box.remove(); },
  };
}

// The tabs at the top of the papyrus's sheets: Messages (the advice sheet) and City (the city summary). active: 'messages' or 'city'.
// Integration (ruling 1268): the tabs sit above the sheet's body, and the active tab controls it: markTabPanel makes the body its tabpanel, labelled by the tab. The other tab
// opens the other sheet.
export function cityTabs(active, { onMessages, onCity }) {
  const tab = (id, label, run) => button(label, { class: `sheet-tab${active === id ? ' active' : ''}`, id: `sheet-tab-${id}`, role: 'tab', 'aria-selected': String(active === id), 'aria-controls': active === id ? `sheet-panel-${id}` : null, dataset: { tab: id }, onClick: () => { if (active !== id) run(); } });
  return el('div', { class: 'sheet-tabs', role: 'tablist', 'aria-label': B.tabs }, [tab('messages', B.tabMessages, onMessages), tab('city', B.tabCity, onCity)]);
}
export function markTabPanel(body, active) {
  body.id = `sheet-panel-${active}`;
  body.setAttribute('role', 'tabpanel');
  body.setAttribute('aria-labelledby', `sheet-tab-${active}`);
  return body;
}

// A sparkline of values (the oldest first), 96 x 24, its line in currentColor and a dot on the last: decoration, its words beside it.
function sparkline(values) {
  const NS = 'http://www.w3.org/2000/svg', W = 96, H = 24, pad = 2;
  const s = document.createElementNS(NS, 'svg');
  for (const [k, v] of [['viewBox', `0 0 ${W} ${H}`], ['width', String(W)], ['height', String(H)], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', 'sparkline']]) s.setAttribute(k, v);
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => [pad + (values.length === 1 ? (W - 2 * pad) : (i * (W - 2 * pad)) / (values.length - 1)), H - pad - ((v - lo) / span) * (H - 2 * pad)]);
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  line.setAttribute('class', 'spark-line');
  const dot = document.createElementNS(NS, 'circle');
  const [lx, ly] = pts[pts.length - 1];
  for (const [k, v] of [['cx', lx.toFixed(1)], ['cy', ly.toFixed(1)], ['r', '2.2'], ['class', 'spark-dot']]) dot.setAttribute(k, v);
  s.append(line, dot);
  return s;
}

// The City page's last year: one row each for gold, people and mood, from world.history (the month-end rows the sim keeps, HISTORY_MONTHS of them, saved
// with the city: ruling 1226), with its first and last values in words.
export function trendSection(world) {
  const rows = (world.history || []).filter((r) => r && Number.isFinite(r.gold));
  const nodes = [el('h3', { text: B.trendHead, dataset: { section: 'trend' } })];
  if (!rows.length) { nodes.push(el('p', { class: 'muted small trend-none', text: B.trendNone })); return nodes; }
  nodes.push(el('p', { class: 'muted small', text: B.trendNote(rows.length) }));
  const list = el('ul', { class: 'trend-list' });
  for (const k of ['gold', 'people', 'mood']) {
    const values = rows.map((r) => r[k]);
    const from = values[0], to = values[values.length - 1];
    list.append(el('li', { class: `trend ${k}`, 'aria-label': B.trendLabel(B.names[k], from, to, values.length) }, [
      el('span', { class: 'trend-name', 'aria-hidden': 'true', text: B.names[k] }),
      sparkline(values),
      el('span', { class: 'trend-words small', 'aria-hidden': 'true', text: `${from} → ${to}` }),
    ]));
  }
  nodes.push(list);
  return nodes;
}

