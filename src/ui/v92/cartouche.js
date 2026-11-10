// Version 9.2, Track D (rulings 1815-1824; design 5.1, 5.4, 5.5): the dynasty's face. One cartouche, drawn in code (a rounded oval of gold lines with the tie bar
// at its end and a small sun), used twice: whole on the sealed-ruler card and, as its heading, at the top of every Rulers row.
//   rulerCartouche(row, { full })  row: { name, n, title, rank, day, score, medal, map } (a ruler row, or the numbers the Pass would seal).
//   The name and its regnal number are one line ("Ramesses II"), the title under it ("the Builder"). A name whose line is long
//   (LONG_NAME characters and over) gets the cartouche's full width, the title under it, and the numbers under that; a short one shares the row
//   with the facts. The words wrap or ellipsise by the stylesheet (css/v90.css .cartouche), never in the middle of the number.
import { el } from '../components.js';
import { V90_D_TEXT, D92_D_TEXT } from '../text.js';
import { MAP_SQUARE } from '../../save/records.js';
import { drawMapString } from '../share.js';

export const LONG_NAME = 16;   // the name and its number: from this many characters the cartouche takes the full row (D12, measured: a 320 px panel holds about 15 at 150%)
const SVG_NS = 'http://www.w3.org/2000/svg';

// The sun: a gold disc with eight terracotta rays, 20 px, decoration only.
function sun() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['class', 'cartouche-sun'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  const add = (tag, attrs) => { const n = document.createElementNS(SVG_NS, tag); for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]); svg.append(n); };
  add('circle', { cx: 12, cy: 12, r: 5, fill: '#E2B13C' });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, x = Math.cos(a), y = Math.sin(a);
    add('line', { x1: 12 + x * 7.5, y1: 12 + y * 7.5, x2: 12 + x * 10.5, y2: 12 + y * 10.5, stroke: '#B4502E', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
  }
  return svg;
}

// null when the row holds no readable map square (nothing blank is drawn).
function mapCanvas(map) {
  const c = el('canvas', { class: 'cartouche-map', width: MAP_SQUARE, height: MAP_SQUARE, 'aria-hidden': 'true' });
  const g = c.getContext && c.getContext('2d');
  if (!g) return c;
  g.fillStyle = '#EBD6A8'; g.fillRect(0, 0, MAP_SQUARE, MAP_SQUARE);
  return map && drawMapString(g, map, 0, 0, MAP_SQUARE) ? c : null;
}

export const rulerLine = (row) => V90_D_TEXT.regnal(row.name, row.n);
export const titleLine = (row) => V90_D_TEXT.titleNames[row.title] || V90_D_TEXT.titleNames.steady;
export const isLong = (row) => rulerLine(row).length >= LONG_NAME;

// The heading alone (a Rulers row's top), or whole with the facts and the map square (the sealed-ruler card).
export function rulerCartouche(row, { full = false } = {}) {
  const long = isLong(row);
  const head = [
    el('span', { class: 'cartouche-sun-wrap' }, [sun()]),
    el('span', { class: 'cartouche-words' }, [
      el('strong', { class: 'cartouche-ruler', text: rulerLine(row), title: rulerLine(row) }),
      el('span', { class: 'cartouche-title', text: titleLine(row) }),
    ]),
  ];
  const kids = [el('span', { class: 'cartouche-head' }, head)];
  if (full) {
    kids.push(el('span', { class: 'cartouche-facts' }, [
      el('span', { class: 'cartouche-facts-text' }, [
        el('span', { class: 'cartouche-fact', text: D92_D_TEXT.factsLine(row) }),
        el('strong', { class: 'cartouche-fact cartouche-score', text: D92_D_TEXT.scoreLine(row) }),
      ]),
      (() => { const m = mapCanvas(row.map); return m ? el('span', { class: 'cartouche-map-box' }, [m, el('span', { class: 'cartouche-map-caption small muted', text: D92_D_TEXT.mapCaption })]) : null; })(),
    ]));
  }
  return el('span', { class: `cartouche${full ? ' full' : ''}${long ? ' long' : ''}`, role: full ? 'group' : null, 'aria-label': full ? D92_D_TEXT.cartoucheLabel(row) : null }, kids);
}
