// The next-house spots' interface (Stage 4.7, Task 4, ruling 465): when the spots are on, and the one-line legend for the guidance row (src/ui/overlayUi.js
// puts it in #legend). The spots themselves are painted by src/render/spots.js from src/sim/spots.js.
import { spotsUnlocked, houseSpots } from '../../sim/spots.js';
import { SPOT_HUE, SPOT_ALPHA, ICONS, iconPath } from '../../render/spots.js';
import { S47_SPOTS_TEXT as W } from '../text.js';
import { el } from '../components.js';

// The spots show while the house tool is active, once a plot has been laid, and no overlay is on (an overlay is the player's own lens; the spots would fight it).
export const spotsOn = (state, world) => Boolean(state && state.tool && state.tool.kind === 'houses' && !state.overlay && world && spotsUnlocked(world));

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, kids = []) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  for (const c of kids) n.append(c);
  return n;
};
// One icon as the map draws it (a white halo, the shape, a dark outline), 10 x 10 units at (x, y) scaled by s.
function iconNode(kind, x, y, s) {
  const icon = ICONS[kind], d = iconPath(icon.segs);
  const g = svg('g', { transform: `translate(${x} ${y}) scale(${s})` });
  for (const h of icon.strokes) g.append(svg('path', { d: iconPath(h), fill: 'none', stroke: SPOT_HUE.icon, 'stroke-width': 3.4, 'stroke-linecap': 'round' }));
  g.append(svg('path', { d, fill: SPOT_HUE.icon, stroke: SPOT_HUE.icon, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }));
  for (const h of icon.strokes) g.append(svg('path', { d: iconPath(h), fill: 'none', stroke: '#3B2A14', 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
  g.append(svg('path', { d, fill: icon.fill, stroke: '#3B2A14', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }));
  return g;
}
// A tile as the map draws it, with its icons: Good is the bright wash with two icons, Fair the hatching with one.
function swatch(kind) {
  const good = kind === 'good', id = 'spot-hatch';
  const tile = '17,1 33,8 17,15 1,8';
  const root = svg('svg', { class: `spot-swatch ${kind}`, viewBox: '0 0 34 16', width: 36, height: 17, 'aria-hidden': 'true', focusable: 'false' });
  if (good) root.append(svg('polygon', { points: tile, fill: SPOT_HUE.wash, 'fill-opacity': SPOT_ALPHA.good }));
  else {
    root.append(svg('defs', {}, [svg('pattern', { id, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      svg('rect', { width: 4, height: 4, fill: SPOT_HUE.wash, 'fill-opacity': SPOT_ALPHA.fairFill }),
      svg('rect', { width: 1.6, height: 4, fill: SPOT_HUE.wash, 'fill-opacity': SPOT_ALPHA.fairLine })])]));
    root.append(svg('polygon', { points: tile, fill: `url(#${id})` }));
  }
  root.append(svg('polygon', { points: tile, fill: 'none', stroke: SPOT_HUE.edge, 'stroke-width': good ? 1.2 : 0.8, 'stroke-opacity': good ? 0.95 : 0.6 }));
  if (good) { root.append(iconNode('water', 7.2, 3.4, 0.9)); root.append(iconNode('market', 18.6, 3.4, 0.9)); }
  else root.append(iconNode('water', 12.6, 4.4, 0.72));   // the map draws one icon on a Fair tile (the one it has), so the key shows one (its words say water or a bazaar)
  return root;
}

// No tile is marked right now: the legend says so (and what would make a Good plot) instead of keying marks that are not on the map.
export const spotsEmpty = (world) => houseSpots(world).list.length === 0;

// The legend strip: the Good key and the Fair key, each with the swatch the map draws and its words (the sim's rules in words), as one group for screen readers.
export function spotsLegend(world = null) {
  if (world && spotsEmpty(world)) return el('div', { class: 'strip spots none', role: 'group', 'aria-label': W.group }, [el('span', { class: 'text small', text: W.none() })]);
  const key = (kind, head, words, label) => el('span', { class: 'key', 'aria-label': label, role: 'img' }, [swatch(kind), ' ', el('span', { class: 'text small', 'aria-hidden': 'true', text: `${head}: ${words}` })]);
  return el('div', { class: 'strip spots', role: 'group', 'aria-label': W.group }, [key('good', W.good, W.goodWords, W.goodLabel), key('fair', W.fair, W.fairWords, W.fairLabel)]);
}
