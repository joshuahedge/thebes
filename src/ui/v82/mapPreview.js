// Version 8.2, Track G (rulings 1310-1311): the new-city card's map preview. A small picture of the map the player will get, drawn from the
// generator itself (generateMap(seed, size, layout): the same call createWorld makes, so the city that starts is the map shown) in the minimap's
// colours (src/ui/minimap.js drawGround), with the start area ringed and the trade road's entry dotted, and the layout's name and the size under it.
// Surprise me shows the layout the seed picks (variantFor). The map is drawn after a frame, over a soft sand placeholder, so the card opens at
// once even for a Huge map; a picture already drawn for the same (seed, size, layout) is reused.
import { generateMap, variantFor } from '../../sim/mapgen.js';
import { MAP_VARIANTS, MAP_SIZES, MAP_SIZE_IDS } from '../../data/map.js';
import { drawGround } from '../minimap.js';
import { el } from '../components.js';
import { V80_U_TEXT, S46_MAP_TEXT } from '../text.js';
import { PREVIEW_TEXT } from './oasisText.js';

// The layout a city of this pick gets: the named one, or the seed's own for Surprise me ('auto').
export const previewLayout = (seed, layout) => (MAP_VARIANTS.includes(layout) ? layout : variantFor(seed));

// The last few maps drawn, by (seed, size, layout): a card drawn again (the game's sheet is rebuilt as the interface changes) does not generate them again.
const MAPS = new Map();
export function previewMap(seed, size, layout) {
  const key = `${seed}:${size}:${layout}`;
  if (!MAPS.has(key)) { MAPS.set(key, generateMap(seed, size, layout)); while (MAPS.size > 4) MAPS.delete(MAPS.keys().next().value); }
  return MAPS.get(key);
}

// A random seed for a new city's card (the interface's, never the sim's: the sim never reads Math.random).
export const rollSeed = () => Math.floor(Math.random() * 1e9);

// px: the picture's side in CSS px; defer(fn): how the drawing waits a frame (tests pass one that runs at once).
export function createMapPreview({ px = 160, defer = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => fn()) : setTimeout(fn, 0)), dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1 } = {}) {
  const side = Math.round(px * Math.min(2, dpr));
  const canvas = el('canvas', { class: 'map-preview-canvas', width: side, height: side, role: 'img' });
  const caption = el('p', { class: 'map-preview-name small', id: 'map-preview-name' });
  const element = el('figure', { class: 'map-preview pending' }, [canvas, caption]);
  element.style.setProperty('--preview-px', `${px}px`);
  let want = null, drawn = null, pending = false;
  const paint = () => {
    pending = false;
    if (!want || (drawn && drawn.key === want.key)) { element.classList.remove('pending'); return; }
    const { seed, size, layout, key } = want;
    const map = previewMap(seed, size, layout);
    const ctx = canvas.getContext('2d'), scale = side / size;
    ctx.clearRect(0, 0, side, side);
    drawGround(ctx, { size, terrain: map.terrain, mapParams: map.params }, scale);
    // the start area: a ring round its 7 x 7 tiles; the trade road's entry: a dot on the south edge
    ctx.lineWidth = Math.max(2, side / 70);
    ctx.strokeStyle = '#FFF8E7';
    ctx.beginPath(); ctx.arc((map.focus.x + 0.5) * scale, (map.focus.y + 0.5) * scale, Math.max(5, 4.2 * scale), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#2B1F0E'; ctx.lineWidth /= 2;
    ctx.beginPath(); ctx.arc((map.focus.x + 0.5) * scale, (map.focus.y + 0.5) * scale, Math.max(5, 4.2 * scale), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2B1F0E';
    ctx.beginPath(); ctx.arc((map.tradeEntry.x + 0.5) * scale, (map.tradeEntry.y + 0.5) * scale, Math.max(2.5, 1.4 * scale), 0, Math.PI * 2); ctx.fill();
    drawn = { key, map };
    element.classList.remove('pending');
  };
  return {
    element,
    // Shows the map for this pick: the words at once, the picture after a frame. Returns the layout shown.
    show({ seed, size, layout }) {
      const v = previewLayout(seed, layout), sizeName = S46_MAP_TEXT.sizeNames[MAP_SIZE_IDS.find((k) => MAP_SIZES[k] === size)] || String(size);
      const name = V80_U_TEXT.layoutName(v);
      caption.textContent = PREVIEW_TEXT.caption(name, sizeName, layout === 'auto');
      canvas.setAttribute('aria-label', PREVIEW_TEXT.alt(name, sizeName));
      element.dataset.layout = v; element.dataset.seed = String(seed); element.dataset.size = String(size);
      want = { seed, size, layout: v, key: `${seed}:${size}:${v}` };
      if (!drawn || drawn.key !== want.key) element.classList.add('pending');
      if (!pending) { pending = true; defer(paint); }
      return v;
    },
    // The map last drawn (for tests): { key, map } or null.
    drawn: () => drawn,
  };
}
