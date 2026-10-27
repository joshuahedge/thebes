// Version 5.0 (Task 3, rulings 540-549): the legend row of Home progress, Goods supply and Workers (src/ui/overlayUi.js puts it in #legend). Each key is a swatch drawn as the
// map draws it (an inline SVG from the same icon paths and strengths as src/render/layers.js) with a short label, and the whole key has its full words for a screen reader.
// Goods supply adds the good picker: one button per good the city can make (pottery from Town, beer, linen, jewellery as their makers unlock) and foods, each at least 44 px.
// Version 8.3 (Track K, ruling 1416): Supply lines' keys: a moving line (dashes and a chevron, in its navy), a stuck one (amber, long dashes) and how to open a line's store.
import { OVERLAY_NAMES, V50_LAYERS_TEXT as W, LARGE_TEXT, T, LINES_TEXT } from './text.js';
import { OVERLAY_HUE } from '../render/overlays.js';
import { NEED_ICONS, PROGRESS_ALPHA, SUPPLY_ALPHA, WORKERS_ALPHA, JOBLESS_ALPHA, STUCK_HUE } from '../render/layers.js';
import { LINES } from '../data/layers.js';
import { iconPath } from '../render/spots.js';
import { supplyGoods, resolveSupplyGood } from '../sim/layers.js';
import { el, iconButton, button } from './components.js';
import { toggleOverlay } from './modes.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, kids = []) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  for (const c of kids) n.append(c);
  return n;
};
const TILE = '17,1 33,8 17,15 1,8';
const INK = '#3A2E5A', WHITE = '#FFFFFF';
let patternId = 0;

// The tile every swatch stands on: a wash at `alpha` and, when hatched, diagonal stripes of the hue over it.
function tile(hue, alpha, hatched = false) {
  const out = [], id = `lay-hatch-${patternId++}`;
  if (hatched) {
    out.push(svg('defs', {}, [svg('pattern', { id, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      svg('rect', { width: 4, height: 4, fill: hue, 'fill-opacity': alpha }), svg('rect', { width: 1.6, height: 4, fill: hue, 'fill-opacity': 0.85 })])]));
  }
  out.push(svg('polygon', { points: TILE, fill: hatched ? `url(#${id})` : hue, 'fill-opacity': hatched ? 1 : alpha }));
  out.push(svg('polygon', { points: TILE, fill: 'none', stroke: hue, 'stroke-width': 0.8, 'stroke-opacity': 0.7 }));
  return out;
}
// A need's icon in a disc, as the map draws it (a white halo, a ring in the hue, the icon, an ink outline), centred at (cx, cy) with radius r.
function disc(cx, cy, r, hue, { need = null, tick = false, count = 0, heavy = false } = {}) {
  const g = svg('g');
  g.append(svg('circle', { cx, cy, r: r + 1, fill: WHITE, 'fill-opacity': 0.95 }));
  g.append(svg('circle', { cx, cy, r, fill: tick ? hue : WHITE, stroke: hue, 'stroke-width': heavy ? 1.7 : 1.2 }));
  if (tick) g.append(svg('path', { d: `M${cx - 0.46 * r} ${cy + 0.04 * r} L${cx - 0.1 * r} ${cy + 0.4 * r} L${cx + 0.5 * r} ${cy - 0.38 * r}`, fill: 'none', stroke: WHITE, 'stroke-width': Math.max(1, 0.3 * r), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  else if (need) {
    const ic = NEED_ICONS[need], sc = (1.35 * r) / 10;
    g.append(svg('path', { d: iconPath(ic.segs), fill: ic.fill, stroke: INK, 'stroke-width': 0.6 / sc, 'stroke-linejoin': 'round', transform: `translate(${cx - 5 * sc} ${cy - 5 * sc}) scale(${sc})` }));
  }
  if (count > 1) {
    g.append(svg('circle', { cx: cx + 0.78 * r, cy: cy + 0.78 * r, r: 0.5 * r, fill: INK, stroke: WHITE, 'stroke-width': 0.6 }));
    const t = svg('text', { x: cx + 0.78 * r, y: cy + 0.78 * r + 0.28 * r, 'text-anchor': 'middle', 'font-size': 0.78 * r, 'font-weight': 700, fill: WHITE });
    t.textContent = String(count);
    g.append(t);
  }
  return g;
}
// A rounded label with a number, a person ahead of it when `person`: white with a rim in the hue (outline), or filled with white text.
function label(cx, cy, text, hue, { person = false, outline = false } = {}) {
  const w = (person ? 15 : 10) + 4.5 * text.length, h = 9, x = cx - w / 2, y = cy - h / 2, ink = outline ? hue : WHITE;
  const g = svg('g');
  g.append(svg('rect', { x: x - 1, y: y - 1, width: w + 2, height: h + 2, rx: h / 2 + 1, fill: WHITE, 'fill-opacity': 0.95 }));
  g.append(svg('rect', { x, y, width: w, height: h, rx: h / 2, fill: outline ? WHITE : hue, stroke: outline ? hue : INK, 'stroke-width': outline ? 1 : 0.5 }));
  let tx = cx;
  if (person) {
    const px = x + 5.2;
    g.append(svg('circle', { cx: px, cy: cy - 1.6, r: 1.4, fill: ink }));
    g.append(svg('path', { d: `M${px - 2.5} ${cy + 3} Q${px - 2.5} ${cy + 0.2} ${px} ${cy + 0.2} Q${px + 2.5} ${cy + 0.2} ${px + 2.5} ${cy + 3} Z`, fill: ink }));
    tx = x + 10 + (w - 10) / 2;
  }
  const t = svg('text', { x: tx, y: cy + 2.7, 'text-anchor': 'middle', 'font-size': 7.4, 'font-weight': 700, fill: ink });
  t.textContent = text;
  g.append(t);
  return g;
}
const swatch = (kids) => svg('svg', { class: 'layer-swatch', viewBox: '0 0 34 17', width: 36, height: 18, 'aria-hidden': 'true', focusable: 'false' }, kids);

// One key: its swatch, a short label (hidden from a screen reader: the words say it) and the words.
const key = (sw, words, label) => el('span', { class: 'key', role: 'img', 'aria-label': words }, [sw, ' ', el('span', { class: 'text small', 'aria-hidden': 'true', text: label })]);

// A key with no swatch: a short note on how the layer counts.
const note = (words, label) => el('span', { class: 'key note', role: 'img', 'aria-label': words }, [el('span', { class: 'text small', 'aria-hidden': 'true', text: label })]);

const KEYS = {
  progress: (hue) => [
    key(swatch([...tile(hue, PROGRESS_ALPHA.ready), disc(17, 8.5, 5.2, hue, { tick: true })]), W.ready.words, W.ready.label),
    key(swatch([...tile(hue, PROGRESS_ALPHA.one), disc(17, 8.5, 5.2, hue, { need: 'water' })]), W.one.words, W.one.label),
    key(swatch([...tile(hue, PROGRESS_ALPHA.many, true), disc(15.5, 8, 5.2, hue, { need: 'water', count: 2, heavy: true })]), W.many.words, W.many.label),
    note(LARGE_TEXT.progress.words, LARGE_TEXT.progress.label),   // Version 6.0 (Track C): an empty Large plot is shown like a home, its Opens-when rows as the needs
  ],
  supply: (hue) => [
    key(swatch([...tile(hue, 0), svg('circle', { cx: 17, cy: 8.5, r: 4.8, fill: INK, 'fill-opacity': 0.6 }), svg('circle', { cx: 17, cy: 8.5, r: 4.2, fill: WHITE, 'fill-opacity': 0.9 }), svg('circle', { cx: 17, cy: 8.5, r: 3, fill: hue })]), W.has.words, W.has.label),
    key(swatch([...tile(hue, SUPPLY_ALPHA.lacks * 2, true), svg('circle', { cx: 17, cy: 8.5, r: 3.6, fill: 'none', stroke: WHITE, 'stroke-width': 3.2, 'stroke-opacity': 0.9 }), svg('circle', { cx: 17, cy: 8.5, r: 3.6, fill: 'none', stroke: hue, 'stroke-width': 1.6 })]), W.lacks.words, W.lacks.label),
    key(swatch([...tile(hue, SUPPLY_ALPHA.holds), label(17, 8.5, '40', hue)]), W.holds.words, W.holds.label),
  ],
  workers: (hue) => [
    key(swatch([...tile(hue, WORKERS_ALPHA.short), label(17, 8.5, '−3', hue, { person: true })]), W.short.words, W.short.label),
    key(swatch([...tile(hue, WORKERS_ALPHA.stopped, true)]), W.stopped.words, W.stopped.label),
    key(swatch([...tile(hue, JOBLESS_ALPHA[1]), label(17, 8.5, '5', hue, { person: true, outline: true })]), W.jobless.words, W.jobless.label),
    note(W.newcomer.words, W.newcomer.label),
  ],
  lines: (hue) => [
    key(swatch(lineSwatch(hue, [LINES.dash, LINES.gap])), LINES_TEXT.moving.words, LINES_TEXT.moving.label),
    key(swatch(lineSwatch(STUCK_HUE, [LINES.stuckDash, LINES.stuckGap])), LINES_TEXT.stuck.words, LINES_TEXT.stuck.label),
    note(LINES_TEXT.tap.words, LINES_TEXT.tap.label),
  ],
};
// A supply line on its tile: a white halo, the dashed line and the chevron at its store's end.
function lineSwatch(hue, dash) {
  const d = 'M3 13 L17 6 L30 9';
  return [
    svg('path', { d, fill: 'none', stroke: WHITE, 'stroke-width': 4.2, 'stroke-opacity': 0.8 }),
    svg('path', { d, fill: 'none', stroke: hue, 'stroke-width': 2.4, 'stroke-dasharray': dash.join(' ') }),
    svg('path', { d: 'M26 6 L30 9 L26.4 12.4', fill: 'none', stroke: hue, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  ];
}

// The good picker: a group of buttons, the picked one pressed, each 44 px tall at least (css/ui.css .goods-pick).
function goodsPicker(store, world) {
  const picked = resolveSupplyGood(world, store.get().supplyGood);
  const buttons = supplyGoods(world).map((g) => button(W.pickName(g), {
    class: 'good', dataset: { good: g }, 'aria-pressed': String(g === picked), 'aria-label': W.pickAria(g),
    onClick: () => store.set({ supplyGood: g }),
  }));
  return el('div', { class: 'goods-pick', role: 'group', 'aria-label': W.pick }, buttons);
}

// What the strip's rebuild depends on besides the overlay: the picked good and the goods on offer.
export const layerKey = (kind, store, world) => (kind === 'supply' && world ? `${resolveSupplyGood(world, store.get().supplyGood)}|${supplyGoods(world).join(',')}` : '');

// The legend strip for one of the three layers: the name and the x, the keys, and for Goods supply the picker below them.
export function layerStrip(kind, store, world) {
  const name = el('strong', { class: 'text', text: OVERLAY_NAMES[kind] });
  const close = iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) });
  const keys = el('span', { class: 'layer-keys' }, KEYS[kind](OVERLAY_HUE[kind]));
  const kids = [name, keys, close];
  if (kind === 'supply' && world) kids.push(goodsPicker(store, world));
  return el('div', { class: `strip layer ${kind}`, role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, kids);
}
