// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. A graded overlay (desirability, fire risk) shows its scale instead: a swatch and a
// label per band, hatched as on the map. Overlays combine with browsing, so the strip never changes the mode.
// Stage 3 (Track D): the scale is general (GRADED, one entry per graded overlay); fire risk's adds the dot and ring for
// "a firehouse reaches it" and a line on what never burns.
import { OVERLAYS, OVERLAY_HUE, GROUND_HUE, GRADED_OVERLAYS, DESIRABILITY_ALPHA, FIRE_ALPHA, roomTiles } from '../render/overlays.js';
import { rgba } from '../render/art/ctx.js';
import { UI, TERRAIN } from '../render/art/palette.js';
import { DESIRABILITY_STEPS } from '../data/ui.js';
import { FIRE_BANDS } from '../data/fire.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, groundThing, groundRoomText, T, DANGER_UI_TEXT } from './text.js';
import { el, iconButton, clear } from './components.js';

const tint = (c) => `linear-gradient(${c}, ${c})`;
// One graded overlay's legend: its bands in order, each band's { label, words }, and its swatch as the map draws it.
const GRADED = {
  desirability: {
    bands: () => [-1, ...DESIRABILITY_STEPS.map((_, k) => k)],
    band: desirabilityBand,
    hatched: (k) => k < 0,
    swatch: (k) => (k < 0
      ? { backgroundImage: `repeating-linear-gradient(135deg, ${UI.bad} 0 1.5px, ${TERRAIN.sand} 1.5px 4px)` }
      : { backgroundImage: tint(rgba(OVERLAY_HUE.desirability, DESIRABILITY_ALPHA[k])), backgroundColor: TERRAIN.sand }),
  },
  fire: {
    bands: () => FIRE_BANDS.map((_, k) => k),
    band: (k) => DANGER_UI_TEXT.fireBand(k),
    hatched: (k) => k >= 2,
    // High: light diagonal stripes; Can catch fire: dense stripes both ways (src/render/overlays.js drawFireRisk).
    swatch: (k) => {
      const hue = OVERLAY_HUE.fire, base = tint(rgba(hue, FIRE_ALPHA[k]));
      const one = `repeating-linear-gradient(135deg, ${rgba(hue, 0.6)} 0 1px, transparent 1px 5px)`;
      const two = `repeating-linear-gradient(135deg, ${rgba(hue, 0.85)} 0 1px, transparent 1px 3px), repeating-linear-gradient(45deg, ${rgba(hue, 0.85)} 0 1px, transparent 1px 3px)`;
      return { backgroundImage: k === 3 ? `${two}, ${base}` : k === 2 ? `${one}, ${base}` : base, backgroundColor: TERRAIN.sand };
    },
  },
};

function scale(kind) {
  const g = GRADED[kind];
  return el('span', { class: 'scale', role: 'list' }, g.bands().map((k) => {
    const b = g.band(k);
    return el('span', { class: 'band', role: 'listitem', 'aria-label': b.words, title: b.words, dataset: { band: String(k) } }, [
      el('span', { class: g.hatched(k) ? 'swatch hatch' : 'swatch', style: g.swatch(k), 'aria-hidden': 'true' }),
      el('span', { class: 'text small', 'aria-hidden': 'true', text: b.label }),
    ]);
  }));
}

function dotKeys(kind) {
  const [has, missing] = OVERLAY_LEGEND[kind];
  const colour = { color: OVERLAY_HUE[kind] };
  return [
    el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
    el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
  ];
}

// The Ground overlay's keys (placement review P1): a swatch as the map draws it (leaf green with dots, grey hatched) and its
// words, then, while a farm, orchard or mine is being placed, what the brighter tiles mean (or that none is left).
const GROUND_SWATCH = {
  fertile: { backgroundColor: TERRAIN.fertile, backgroundImage: `radial-gradient(#0B3D1A 1.1px, transparent 1.5px), radial-gradient(#0B3D1A 1.1px, transparent 1.5px), ${tint(rgba(GROUND_HUE.fertile, 0.4))}`, backgroundSize: '13px 12px, 13px 12px, auto', backgroundPosition: '3px 6px, 9px 6px, 0 0' },
  rocky: { backgroundColor: TERRAIN.sand, backgroundImage: `repeating-linear-gradient(135deg, ${rgba(GROUND_HUE.rocky, 0.85)} 0 1.5px, ${rgba(GROUND_HUE.rocky, 0.28)} 1.5px 4px)` },
};
function groundKeys(room) {
  const [fertile, rocky] = OVERLAY_LEGEND.ground;
  const key = (kind, words) => el('span', { class: 'key' }, [el('span', { class: 'swatch', style: GROUND_SWATCH[kind], 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: words })]);
  // The keys wrap among themselves under the name and the x, so the x never lands alone on a row of its own.
  return el('span', { class: 'ground-keys' }, [key('fertile', fertile), key('rocky', rocky), ...(room ? [el('span', { class: 'text small room', text: room })] : [])]);
}

// The strip is the legend everywhere. Under a critical banner a wide screen keeps the dot and ring keys' words for
// screen readers only (css/ui.css); on a phone (portrait or compact) the legend takes the guidance row while an overlay is
// on, in place of the goal, so it reads in full under a banner too (spec 6.3, ruling 164).
export function createOverlayLegend({ container, store, world = null }) {
  let lastKey = undefined;

  // The Ground overlay's third line, while a farm, orchard or mine is being placed: where its brighter tiles are.
  function roomWords(s) {
    if (s.overlay !== 'ground' || !s.tool || s.tool.kind !== 'building' || !groundThing(s.tool.type)) return null;
    return groundRoomText(s.tool.type, world ? roomTiles(world, s.tool.type).size > 0 : true);
  }

  function render() {
    const s = store.get(), kind = s.overlay, room = roomWords(s);
    const key = `${kind}|${room}`;
    if (key === lastKey) return;
    lastKey = key;
    clear(container);
    if (!kind) return;
    const graded = GRADED_OVERLAYS.includes(kind);
    const name = el('strong', { class: 'text', text: OVERLAY_NAMES[kind] });
    const close = iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) });
    let keys;
    if (kind === 'fire') keys = [scale(kind), el('span', { class: 'fire-keys' }, [...dotKeys(kind), el('span', { class: 'text small never-burn', text: DANGER_UI_TEXT.neverBurnNote })])];
    else if (graded) keys = [scale(kind)];
    else if (kind === 'ground') keys = [groundKeys(room)];
    else keys = dotKeys(kind);
    container.append(el('div', { class: graded ? 'strip graded' : kind === 'ground' ? 'strip ground' : 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, kind === 'ground' ? [name, close, ...keys] : [name, ...keys, close]));
  }
  render();
  store.subscribe(render);
  return { render, cycle: () => store.set(cycleOverlay(store.get(), OVERLAYS)) };
}
