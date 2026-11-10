// Version 9.3 wave 0 (ruling 1889): the look sheet. looksheet.html?nosw=1 draws it: today's art beside the four looks (village, town, city, capital) at the new
// bar (spec sections 2, 4, 5 and 6): a home of tiers 1, 3 (three variants), 6 and 9; the bazaar, the granary and a kiln working and shut; a palm and street
// furniture; the figures; and a patch of ground with yards, paths, a road and a grass edge. Josh approves it before the tracks draw the rest.
//   ?look=N      only today and look N (0 village .. 3 capital), larger: the shape used on a phone and for the zoomed crops
//   ?rows=a,b    only those rows (homes, services, world, ground; or a row id)
// The sheet is drawn straight onto one canvas through the game's own drawing helper, so what it shows is what the primitives and materials give.
import { makeDraw } from '../render/art/ctx.js';
import { ART } from '../render/art/registry.js';
import { HOUSE_TODAY } from '../render/art/housing.js';
import { p } from '../render/art/primitives.js';
import { palmAt, acacia } from '../render/art/nature.js';
import { fig } from '../render/art/figures.js';
import {
  hut, cottage, manor, yard, granaryRef, kilnRef, bazaarRef, palmNew, lamp, streetTree, figNew, groundToday, groundNew,
} from './looksheetArt.js';

const LOOK_NAMES = ['Village', 'Town', 'City', 'Capital'];
const LOOK_RANKS = ['Village', 'Town, Market town', 'City, Great City', 'Capital, Great Capital, Seat'];


// A row is { id, group, label, h (art px), oy (where the footprint's top vertex sits in the row), cell(g, look) } and a look of -1 means today.
// Each cell is drawn with the art's origin at the cell's horizontal centre and at oy down from the row's top.
const at = (g, dx, dy, fn) => { g.ctx.save(); g.ctx.translate(dx * g.scale, dy * g.scale); fn(); g.ctx.restore(); };

function homesRow(id, label, h, oy, items) {
  return { id, group: 'homes', label, h, oy, cell: (g, look) => items.forEach(([dx, fn]) => at(g, dx, 0, () => fn(g, look))) };
}

const ROWS = [
  homesRow('t1', 'Tier 1', 40, 18, [[0, (g, l) => (l < 0 ? HOUSE_TODAY['house.t1'].draw(g, 0, 0) : (yard(g, 0, 0, 1, 1, l), hut(g, 0, 0, l)))]]),
  homesRow('t3', 'Tier 3\nthree variants', 50, 26, [-40, 0, 40].map((dx, v) => [dx, (g, l) => (l < 0 ? HOUSE_TODAY['house.t3'].draw(g, 0, 0) : (yard(g, 0, 0, 1, 1, l), cottage(g, 0, 0, l, v)))])),
  homesRow('t6', 'Tier 6', 70, 34, [[0, (g, l) => (l < 0 ? HOUSE_TODAY['house.t6'].draw(g, 0, 0) : (yard(g, 0, 0, 2, 2, l, 0.3), manor(g, 0, 0, l, 6)))]]),
  homesRow('t9', 'Tier 9', 80, 44, [[0, (g, l) => (l < 0 ? HOUSE_TODAY['house.t9'].draw(g, 0, 0) : (yard(g, 0, 0, 2, 2, l, 0.3), manor(g, 0, 0, l, 9)))]]),
  {
    id: 'bazaar', group: 'services', label: 'Bazaar\nworking | shut', h: 68, oy: 32,
    cell(g, look) {
      if (look < 0) { at(g, -36, 0, () => ART['bazaar.s2'].draw(g, 0, 0)); at(g, 36, 0, () => ART['bazaar.s0'].draw(g, 0, 0)); return; }
      for (const [dx, st] of [[-36, 'work'], [36, 'shut']]) at(g, dx, 0, () => { yard(g, 0, 0, 2, 2, look, 0.25); bazaarRef(g, 0, 0, look, st); });
    },
  },
  {
    id: 'granary', group: 'services', label: 'Granary\nworking | shut', h: 70, oy: 36,
    cell(g, look) {
      if (look < 0) { at(g, -36, 0, () => ART['granary.s3'].draw(g, 0, 0)); at(g, 36, 0, () => ART['granary.s0'].draw(g, 0, 0)); return; }
      for (const [dx, st] of [[-36, 'work'], [36, 'shut']]) at(g, dx, 0, () => { yard(g, 0, 0, 2, 2, look, 0.25); granaryRef(g, 0, 0, look, st); });
    },
  },
  {
    id: 'kiln', group: 'services', label: 'Kiln\nworking | shut', h: 70, oy: 34,
    cell(g, look) {
      if (look < 0) { at(g, -36, 0, () => ART.potter.draw(g, 0, 0)); at(g, 36, 0, () => ART.potter.draw(g, 0, 0)); return; }
      for (const [dx, st] of [[-36, 'work'], [36, 'shut']]) at(g, dx, 0, () => { yard(g, 0, 0, 2, 2, look, 0.25); grow(g, 1.14, () => kilnRef(g, 0, 0, look, st)); });
    },
  },
  {
    id: 'palm', group: 'world', label: 'Palm and\nstreet', h: 44, oy: 34,
    cell(g, look) {
      if (look < 0) { at(g, -20, 0, () => palmAt(g, 0, 0)); at(g, 24, 0, () => acacia(g, 0, 0)); return; }
      if (look === 0) { at(g, -20, 0, () => palmNew(g, 0, 0)); at(g, 24, 0, () => palmNew(g, 0, 0, 0.75)); }
      if (look === 1) { at(g, -22, 0, () => palmNew(g, 0, 0)); at(g, 20, 4, () => jarsBench(g)); }
      if (look === 2) { at(g, -34, 0, () => streetTree(g, 0, 0)); at(g, 0, 0, () => lamp(g, 0, 0)); at(g, 34, 0, () => streetTree(g, 0, 0)); }
      if (look === 3) { at(g, -36, 0, () => palmNew(g, 0, 0)); at(g, -6, 0, () => lamp(g, 0, 0)); at(g, 24, 0, () => palmNew(g, 0, 0)); at(g, 54, 0, () => lamp(g, 0, 0)); }
    },
  },
  {
    id: 'figures', group: 'world', label: 'Figures', h: 28, oy: 20,
    cell(g, look) {
      [[-36, 'citizen'], [0, 'woman'], [36, 'water']].forEach(([dx, k]) => at(g, dx, 0, () => (look < 0 ? fig(g, 0, 0, k, 0, 1.3) : figNew(g, 0, 0, k, 1.3))));
    },
  },
  {
    id: 'ground', group: 'ground', label: 'Ground\nyard, path, road', h: 112, oy: 6, panel: false,
    cell(g, look, cw) {
      const fit = Math.min(1, (cw - 6) / 192);
      g.ctx.save(); g.ctx.scale(fit, fit);
      const house = (gg, x, y) => (look < 0 ? HOUSE_TODAY['house.t3'].draw(gg, x, y) : cottage(gg, x, y, look, Math.floor(x) % 3));
      if (look < 0) groundToday(g, 6, house); else groundNew(g, 6, look, house);
      g.ctx.restore();
    },
  },
];
// Draws fn grown by k about the footprint's front corner, so a workshop that sits small in its footprint stands level with the homes beside it.
function grow(g, k, fn) { const y = 28 * g.scale; g.ctx.save(); g.ctx.translate(0, y); g.ctx.scale(k, k); g.ctx.translate(0, -y); fn(); g.ctx.restore(); }
function jarsBench(g) {
  const c = p(0, 0);
  g.poly([[c[0] - 8, c[1] - 2], [c[0] + 8, c[1] - 2], [c[0] + 8, c[1] - 4], [c[0] - 8, c[1] - 4]], '#CCA463', { outline: true });
  g.poly([[c[0] - 7, c[1] - 2], [c[0] - 6, c[1] - 2], [c[0] - 6, c[1] + 1.4], [c[0] - 7, c[1] + 1.4]], '#8A6A4A');
  g.poly([[c[0] + 6, c[1] - 2], [c[0] + 7, c[1] - 2], [c[0] + 7, c[1] + 1.4], [c[0] + 6, c[1] + 1.4]], '#8A6A4A');
}

// Draws the sheet onto `canvas` for a viewport of width x height css px. Returns { scale, columns } for the tests and the shots.
export function drawLookSheet(canvas, { width, height, dpr = 1, look = null, rows = null } = {}) {
  const narrow = width < 700 || look !== null;
  const cols = look !== null ? [-1, look] : [-1, 0, 1, 2, 3];
  const list = ROWS.filter((r) => !rows || rows.includes(r.id) || rows.includes(r.group));
  const HEAD = 30, GAP = narrow ? 7 : 4, LABEL = narrow ? 0 : 62;
  const rowsH = list.reduce((n, r) => n + r.h + GAP + (narrow ? 0 : 0), 0);
  const need = HEAD + 14 + rowsH;
  const cwMin = narrow ? 120 : 175;
  const scale = Math.min(width / (LABEL + cols.length * cwMin), height / need, 3.4);
  const cw = (width / scale - LABEL) / cols.length;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F6EDD8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const S = scale * dpr;
  const text = (x, y, str, size, o = {}) => { const g = makeDraw(ctx, S); g.text([x, y], str, { size, ...o }); };
  const ox = (width / scale - (LABEL + cols.length * cw)) / 2;   // centre the sheet
  text(width / scale / 2, 11, `Thebes 9.3 · the look sheet${look !== null ? ` · ${LOOK_NAMES[look]}` : ''}`, 10.5, { weight: '700' });
  text(width / scale / 2, 22, 'Today beside each look · the look sets materials, the tier sets shape · warm lit faces, cool shade, no textures', 6.2, { color: '#6B5A48', weight: '500' });
  cols.forEach((c, i) => {
    const x0 = ox + LABEL + i * cw;
    ctx.fillStyle = c < 0 ? 'rgba(176,160,158,0.42)' : 'rgba(235,214,168,0.42)';   // today on a cooler sand, the looks on the game's own
    roundRect(ctx, x0 * S + 2, HEAD * S - 2 * S, (cw * S) - 4, (rowsH + 2) * S, 6 * S);
    ctx.fill();
    text(x0 + cw / 2, HEAD + 3.5, c < 0 ? 'Today' : LOOK_NAMES[c], 8, { weight: '700', color: c < 0 ? '#6B5A48' : '#3B2A14' });
    if (c >= 0) text(x0 + cw / 2, HEAD + 11, LOOK_RANKS[c], 5.2, { color: '#6B5A48', weight: '500' });
  });
  let y = HEAD + 12;
  for (const r of list) {
    if (narrow) text(ox + 6, y + 3, r.label.replace('\n', ' · '), 6.2, { align: 'left', color: '#6B5A48', weight: '700' });
    else r.label.split('\n').forEach((ln, i) => text(ox + 4, y + r.h / 2 - 3 + i * 8, ln, i ? 5.4 : 7, { align: 'left', color: i ? '#8A7A64' : '#3B2A14', weight: i ? '500' : '700' }));
    cols.forEach((c, i) => {
      const cx = ox + LABEL + i * cw + cw / 2;
      ctx.save();
      ctx.beginPath(); ctx.rect((ox + LABEL + i * cw + 1) * S, (y - 2) * S, (cw - 2) * S, (r.h + GAP) * S); ctx.clip();
      ctx.translate(cx * S, (y + r.oy + (narrow ? 4 : 0)) * S);
      r.cell(makeDraw(ctx, S), c, cw);
      ctx.restore();
    });
    y += r.h + GAP;
  }
  return { scale, columns: cols.length, cw };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function bootLookSheet(doc = document, win = window) {
  const q = new URLSearchParams(win.location.search);
  const look = q.has('look') ? Math.max(0, Math.min(3, Number(q.get('look')))) : null;
  const rows = q.has('rows') ? q.get('rows').split(',') : null;
  const canvas = doc.getElementById('sheet');
  const paint = () => drawLookSheet(canvas, { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio || 1, look: look !== null ? look : (win.innerWidth < 700 ? 2 : null), rows });
  paint();
  win.addEventListener('resize', paint);
  win.__lookSheet = { paint };
}
