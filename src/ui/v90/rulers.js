// Version 9.0 "Dynasty" (Track L, rulings 1585, 1591, 1592): the ruler list. A sheet in the game (the menu's Rulers) and a panel on the title card (the
// records box's button), both filled by renderRulers. One row a ruler, newest first and never capped: "Ramesses II the Builder", the rank reached,
// the years, the score with its medal in words, and the 32 x 32 map square the row kept. A row opens to its five parts, its feats, the heir it played
// under, the map's own words and, when it kept a rival, the two side by side; Play this map starts a new city on that seed, level, layout and size
// through New city's replace question (onPlay, which boot.js answers). The list's top line is the install ask while it is due.
import { PARTS_BY_VERSION, SCORE_PARTS } from '../../data/scoring.js';
import { MAP_SQUARE } from '../../save/records.js';
import { el, button, clear } from '../components.js';
import { drawMapString } from '../share.js';
import { SCORE_TEXT, FEAT_TEXT, V90_L_TEXT, V90_D_TEXT, T } from '../text.js';
import { sideBySide } from './sideBySide.js';

// The row's picture: the map square on a 32 x 32 canvas the stylesheet scales; a row without one (a ruler brought from a file that had none) gets a blank square.
function mapCanvas(row) {
  const c = el('canvas', { class: 'ruler-map', width: MAP_SQUARE, height: MAP_SQUARE, 'aria-hidden': 'true' });
  const g = c.getContext && c.getContext('2d');
  if (g) { g.fillStyle = '#EBD6A8'; g.fillRect(0, 0, MAP_SQUARE, MAP_SQUARE); if (row.map) drawMapString(g, row.map, 0, 0, MAP_SQUARE); }
  return c;
}

const featName = (id) => (FEAT_TEXT[id] ? FEAT_TEXT[id].name : id);

// An opened row's parts: a bar with its number beside it (the number is the information; the bar is for sight).
function partsList(row) {
  return el('ul', { class: 'ruler-parts' }, (PARTS_BY_VERSION[row.version] || SCORE_PARTS).map((p) => el('li', { class: 'ruler-part', dataset: { part: p } }, [
    el('span', { class: 'ruler-part-name', text: SCORE_TEXT.parts[p] || p }),
    el('span', { class: 'part-bar', 'aria-hidden': 'true' }, [el('span', { class: 'fill', style: { width: `${Math.max(0, Math.min(100, row.parts[p]))}%` } })]),
    el('strong', { class: 'part-number', text: String(row.parts[p]) }),
  ])));
}

// One row: the line (a button that opens it) and its parts, feats, heir, map and Play this map.
export function rulerRow(row, { onPlay = () => {} } = {}) {
  const L = V90_L_TEXT;
  const detailId = `ruler-detail-${row.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const toggle = el('button', { type: 'button', class: 'ruler-row', 'aria-expanded': 'false', 'aria-controls': detailId, 'aria-label': L.rowName(row) }, [
    el('span', { class: 'ruler-text' }, [
      el('span', { class: 'ruler-name', text: L.rulerName(row) }),
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

// Fills body with the list. records: the device's records (rulers()); onPlay(row): Play this map; installAsk: true while the install ask is due (a ruler is
// kept and the device can install), with onInstall for its button; onBack: a Back button at the foot (the title card's panel has no head to close it).
export function renderRulers(body, { records, onPlay = () => {}, installAsk = false, ios = false, onInstall = () => {}, onBack = null } = {}) {
  clear(body);
  let rulers = [];
  try { rulers = records ? records.rulers() : []; } catch (e) { rulers = []; }
  body.append(el('div', { class: 'rulers-body' }, [
    installAsk && rulers.length ? el('div', { class: 'rulers-install' }, [
      el('p', { class: 'install-ask small', role: 'note', text: V90_L_TEXT.installAsk(ios) }),
      button(V90_L_TEXT.installButton, { class: 'install-ask-button primary', onClick: onInstall }),
    ]) : null,
    rulers.length ? el('ul', { class: 'rulers-list' }, rulers.map((r) => rulerRow(r, { onPlay }))) : el('p', { class: 'rulers-empty muted', text: V90_L_TEXT.empty }),
    onBack ? el('div', { class: 'actions' }, [button(T.back, { class: 'guide-back', onClick: onBack })]) : null,
  ]));
}
