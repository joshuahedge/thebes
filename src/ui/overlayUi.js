// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. A graded overlay (desirability, fire risk) shows its scale instead: a swatch and a
// label per band, hatched as on the map. Overlays combine with browsing, so the strip never changes the mode.
// Stage 3 (Track D): the scale is general (GRADED, one entry per graded overlay); fire risk's adds the dot and ring for
// "a firehouse reaches it" and a line on what never burns.
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, DESIRABILITY_ALPHA, FIRE_ALPHA } from '../render/overlays.js';
import { rgba } from '../render/art/ctx.js';
import { UI, TERRAIN } from '../render/art/palette.js';
import { DESIRABILITY_STEPS } from '../data/ui.js';
import { FIRE_BANDS } from '../data/fire.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, T, DANGER_UI_TEXT } from './text.js';
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

// Stage 3 (spec 6.3, ruling 111): on a phone (portrait or compact) with a critical banner up, the strip shrinks to one
// icon button beside the banner (css/ui.css, Track D), so the goals strip stays above the middle of the screen; tapping
// it opens the full legend (the container's 'open' class) and tapping it again shrinks it. The icon is always in the
// strip's place in the DOM; the stylesheet shows one or the other.
export function createOverlayLegend({ container, store }) {
  let lastKind = undefined;

  function render() {
    const kind = store.get().overlay;
    if (kind === lastKind) return;
    lastKind = kind;
    clear(container);
    container.classList.remove('open');
    if (!kind) return;
    const toggle = iconButton(DANGER_UI_TEXT.legendOpen(OVERLAY_NAMES[kind]), '◧', { class: 'legend-icon', 'aria-expanded': 'false' });
    toggle.addEventListener('click', () => {
      const open = container.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? DANGER_UI_TEXT.legendClose : DANGER_UI_TEXT.legendOpen(OVERLAY_NAMES[kind]));
      toggle.title = toggle.getAttribute('aria-label');
    });
    container.append(toggle);
    const graded = GRADED_OVERLAYS.includes(kind);
    const name = el('strong', { class: 'text', text: OVERLAY_NAMES[kind] });
    const close = iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) });
    let keys;
    if (kind === 'fire') keys = [scale(kind), el('span', { class: 'fire-keys' }, [...dotKeys(kind), el('span', { class: 'text small never-burn', text: DANGER_UI_TEXT.neverBurnNote })])];
    else if (graded) keys = [scale(kind)];
    else keys = dotKeys(kind);
    container.append(el('div', { class: graded ? 'strip graded' : 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [name, ...keys, close]));
  }
  render();
  store.subscribe(render);
  return { render, cycle: () => store.set(cycleOverlay(store.get(), OVERLAYS)) };
}
