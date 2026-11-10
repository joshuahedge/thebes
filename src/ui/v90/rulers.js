// Version 9.0 "Dynasty" (Track L, rulings 1585, 1591, 1592): the ruler list. A sheet in the game (the menu's Rulers) and a panel on the title card (the
// records box's button), both filled by renderRulers. One row a ruler, newest first and never capped: "Ramesses II the Builder", the rank reached,
// the years, the score with its medal in words, and the 32 x 32 map square the row kept. A row opens to its five parts, its feats, the heir it played
// under, the map's own words and, when it kept a rival, the two side by side; Play this map starts a new city on that seed, level, layout and size
// through New city's replace question (onPlay, which boot.js answers). The list's top line is the install ask while it is due.
import { PARTS_BY_VERSION, SCORE_PARTS } from '../../data/scoring.js';
import { MAP_SQUARE } from '../../save/records.js';
import { el, button, clear } from '../components.js';
import { drawMapString } from '../share.js';
import { SCORE_TEXT, FEAT_TEXT, V90_L_TEXT, V90_D_TEXT, T, U93_TEXT } from '../text.js';
import { partsObject } from '../v93/decree.js';   // Version 9.3 (Track U): the decree rows
import { decreeMapOf } from '../week.js';
import { DEFAULT_MAP_SIZE } from '../../data/map.js';
import { sideBySide } from './sideBySide.js';
import { rulerCartouche } from '../v92/cartouche.js';

// The row's picture: the map square on a 32 x 32 canvas the stylesheet scales. Version 9.2 (Track D): a row without a readable one (a ruler brought from a file that
// had none) has no square at all, not a blank tan one.
function mapCanvas(row) {
  const c = el('canvas', { class: 'ruler-map', width: MAP_SQUARE, height: MAP_SQUARE, 'aria-hidden': 'true' });
  const g = c.getContext && c.getContext('2d');
  if (!g) return c;
  g.fillStyle = '#EBD6A8'; g.fillRect(0, 0, MAP_SQUARE, MAP_SQUARE);
  return row.map && drawMapString(g, row.map, 0, 0, MAP_SQUARE) ? c : null;
}

const featName = (id) => (FEAT_TEXT[id] ? FEAT_TEXT[id].name : id);

// An opened row's parts: a bar with its number beside it (the number is the information; the bar is for sight).
// Version 9.3 (Track U): a decree row gives its six parts and their names (the bonus's) here, so its list is this one.
function partsList(row, { ids = PARTS_BY_VERSION[row.version] || SCORE_PARTS, names = SCORE_TEXT.parts } = {}) {
  return el('ul', { class: 'ruler-parts' }, ids.map((p) => el('li', { class: 'ruler-part', dataset: { part: p } }, [
    el('span', { class: 'ruler-part-name', text: names[p] || p }),
    el('span', { class: 'part-bar', 'aria-hidden': 'true' }, [el('span', { class: 'fill', style: { width: `${Math.max(0, Math.min(100, row.parts[p]))}%` } })]),
    el('strong', { class: 'part-number', text: String(row.parts[p]) }),
  ])));
}

// One row: the line (a button that opens it) and its parts, feats, heir, map and Play this map.
export function rulerRow(row, { onPlay = () => {} } = {}) {
  const L = V90_L_TEXT;
  const detailId = `ruler-detail-${row.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const toggle = el('button', { type: 'button', class: 'ruler-row', 'aria-expanded': 'false', 'aria-controls': detailId, 'aria-label': L.rowName(row) }, [
    // Version 9.2 (Track D, ruling 1818): the cartouche heads the row on its own line, the name and number on one line and the title under it; the rank and years
    // run under it, the score and the map square beside them.
    rulerCartouche(row),
    el('span', { class: 'ruler-text' }, [
      el('span', { class: 'ruler-sub small muted', text: `${L.rankWords(row.rank)} · ${L.years(row.day)}` }),
    ]),
    el('span', { class: 'ruler-score-box' }, [
      el('strong', { class: 'ruler-score', text: String(row.score) }),
      el('span', { class: 'ruler-medal small muted', text: L.medalWords(row.medal) }),
    ]),
    mapCanvas(row),
  ]);
  const detail = el('div', { class: 'ruler-detail', id: detailId, hidden: true }, [
    el('p', { class: 'ruler-heir', text: V90_D_TEXT.heirOf(row.heir) }),
    el('h4', { class: 'small', text: L.partsHead }),
    partsList(row),
    el('p', { class: 'ruler-feats small', text: `${L.featsHead}: ${row.feats.length ? row.feats.map(featName).join(', ') : L.noFeats}` }),
    row.rival ? sideBySide({ score: row.score, parts: row.parts, heir: row.heir }, row.rival, { id: `${detailId}-side` }) : null,
    el('p', { class: 'ruler-map-line small muted', text: L.mapLine(row) }),
    el('div', { class: 'actions' }, [button(L.playMap, { class: 'play-map', 'aria-describedby': `${detailId}-note`, onClick: () => onPlay(row) })]),
    el('p', { class: 'ruler-play-note small muted', id: `${detailId}-note`, text: L.playMapNote }),
  ]);
  toggle.addEventListener('click', () => {
    const open = detail.hidden;
    detail.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  return el('li', { class: 'ruler', dataset: { id: row.id } }, [toggle, detail]);
}

// Version 9.3 (Track U, ruling 1982): a decree row sits among the rulers by date. It has the mark and the medal, no regnal number and no trait; opened it shows the six parts and the tries,
// and Play this map starts a plain city on the week's map (the same New city question as a ruler's), not a decree run.
export function decreeRow(row, { onPlay = () => {} } = {}) {
  const detailId = `decree-detail-${String(row.id || row.week).replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const parts = partsObject(row.parts);
  const names = { ...SCORE_TEXT.parts, bonus: U93_TEXT.bonusPart };
  const toggle = el('button', { type: 'button', class: 'ruler-row decree-row', 'aria-expanded': 'false', 'aria-controls': detailId, 'aria-label': U93_TEXT.rowName(row) }, [
    // A ruler's own line parts: the name's place holds the mark, the rank-and-years line says Decree (no cartouche: a decree has no regnal number).
    el('span', { class: 'ruler-text' }, [
      el('span', { class: 'ruler-name decree-row-mark', text: row.mark }),
      el('span', { class: 'ruler-sub small muted', text: U93_TEXT.rowKind }),
    ]),
    el('span', { class: 'ruler-score-box' }, [
      el('strong', { class: 'ruler-score', text: String(row.score) }),
      el('span', { class: 'ruler-medal small muted', text: V90_L_TEXT.medalWords(row.medal) }),
    ]),
    mapCanvas(row),
  ]);
  const detail = el('div', { class: 'ruler-detail', id: detailId, hidden: true }, [
    el('h4', { class: 'small', text: V90_L_TEXT.partsHead }),
    partsList({ parts }, { ids: Object.keys(parts), names }),
    Number.isInteger(row.tries) ? el('p', { class: 'ruler-feats small', text: U93_TEXT.rowTries(row.tries) }) : null,
    el('div', { class: 'actions' }, [button(U93_TEXT.playMap, { class: 'play-map', 'aria-describedby': `${detailId}-note`, onClick: () => onPlay({ ...decreeMapOf(row.week), difficulty: 'normal', mapSize: DEFAULT_MAP_SIZE }) })]),
    el('p', { class: 'ruler-play-note small muted', id: `${detailId}-note`, text: U93_TEXT.playMapNote }),
  ]);
  toggle.addEventListener('click', () => {
    const open = detail.hidden;
    detail.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  return el('li', { class: 'ruler decree', dataset: { id: row.id || row.week, week: row.week } }, [toggle, detail]);
}

// Fills body with the list. records: the device's records (rulers()); onPlay(row): Play this map; installAsk: true while the install ask is due (a ruler is
// kept and the device can install), with onInstall for its button; onBack: a Back button at the foot (the title card's panel has no head to close it).
export function renderRulers(body, { records, onPlay = () => {}, installAsk = false, ios = false, onInstall = () => {}, onBack = null } = {}) {
  clear(body);
  let rulers = [];
  try { rulers = records ? records.rulers() : []; } catch (e) { rulers = []; }
  let decrees = [];
  try { decrees = records && typeof records.decrees === 'function' ? records.decrees() : []; } catch (e) { decrees = []; }   // Track S's records.decrees (a list's own records, as the tests give, may have none)
  // Version 9.3 (Track U, ruling 1982): decree rows and rulers together, newest date first. The rulers keep the order
  // they are given in (newest first, as since 9.0); each decree row, newest first, goes in before the first ruler older than it.
  const rows = rulers.map((r) => ({ at: r.date || 0, node: () => rulerRow(r, { onPlay }) }));
  const decreeRows = (Array.isArray(decrees) ? decrees : []).filter((d) => d && d.week).map((d) => ({ at: d.date || 0, node: () => decreeRow(d, { onPlay }) })).sort((a, b) => b.at - a.at);
  let from = 0;
  for (const d of decreeRows) {
    while (from < rows.length && (rows[from].decree || rows[from].at >= d.at)) from++;
    rows.splice(from, 0, { ...d, decree: true });
    from++;
  }
  const listed = rulers.length || rows.length;
  body.append(el('div', { class: 'rulers-body' }, [
    installAsk && rulers.length ? el('div', { class: 'rulers-install' }, [
      el('p', { class: 'install-ask small', role: 'note', text: V90_L_TEXT.installAsk(ios) }),
      button(V90_L_TEXT.installButton, { class: 'install-ask-button primary', onClick: onInstall }),
    ]) : null,
    listed ? el('ul', { class: 'rulers-list' }, rows.map((r) => r.node())) : el('p', { class: 'rulers-empty muted', text: V90_L_TEXT.empty }),
    onBack ? el('div', { class: 'actions' }, [button(T.back, { class: 'guide-back', onClick: onBack })]) : null,
  ]));
}
