// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. A graded overlay (desirability) shows its scale instead: a swatch and a label per
// band, hatched below zero as on the map. Overlays combine with browsing, so the strip never changes the mode.
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, DESIRABILITY_ALPHA } from '../render/overlays.js';
import { rgba } from '../render/art/ctx.js';
import { UI, TERRAIN } from '../render/art/palette.js';
import { DESIRABILITY_STEPS } from '../data/ui.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, T } from './text.js';
import { el, iconButton, clear } from './components.js';

// A band's swatch looks as the map does: the hue at the band's strength over sand, or coral hatching below zero.
function swatchStyle(kind, k) {
  if (k < 0) return { backgroundImage: `repeating-linear-gradient(135deg, ${UI.bad} 0 1.5px, ${TERRAIN.sand} 1.5px 4px)` };
  const c = rgba(OVERLAY_HUE[kind], DESIRABILITY_ALPHA[k]);
  return { backgroundImage: `linear-gradient(${c}, ${c})`, backgroundColor: TERRAIN.sand };
}

function scale(kind) {
  const bands = [-1, ...DESIRABILITY_STEPS.map((_, k) => k)];
  return el('span', { class: 'scale', role: 'list' }, bands.map((k) => {
    const b = desirabilityBand(k);
    return el('span', { class: 'band', role: 'listitem', 'aria-label': b.words, title: b.words, dataset: { band: String(k) } }, [
      el('span', { class: k < 0 ? 'swatch hatch' : 'swatch', style: swatchStyle(kind, k), 'aria-hidden': 'true' }),
      el('span', { class: 'text small', 'aria-hidden': 'true', text: b.label }),
    ]);
  }));
}

export function createOverlayLegend({ container, store }) {
  let lastKind = undefined;

  function render() {
    const kind = store.get().overlay;
    if (kind === lastKind) return;
    lastKind = kind;
    clear(container);
    if (!kind) return;
    const graded = GRADED_OVERLAYS.includes(kind);
    const name = el('strong', { class: 'text', text: OVERLAY_NAMES[kind] });
    const close = iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) });
    let keys;
    if (graded) keys = [scale(kind)];
    else {
      const [has, missing] = OVERLAY_LEGEND[kind];
      const colour = { color: OVERLAY_HUE[kind] };
      keys = [
        el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
        el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
      ];
    }
    container.append(el('div', { class: graded ? 'strip graded' : 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [name, ...keys, close]));
  }
  render();
  store.subscribe(render);
  return { render, cycle: () => store.set(cycleOverlay(store.get(), OVERLAYS)) };
}
