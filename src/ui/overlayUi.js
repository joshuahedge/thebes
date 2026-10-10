// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. Overlays combine with browsing, so the strip never changes the mode.
import { OVERLAYS, OVERLAY_HUE } from '../render/overlays.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, T } from './text.js';
import { el, iconButton, clear } from './components.js';

export function createOverlayLegend({ container, store }) {
  function render() {
    const kind = store.get().overlay;
    clear(container);
    if (!kind) return;
    const [has, missing] = OVERLAY_LEGEND[kind];
    const colour = { color: OVERLAY_HUE[kind] };
    container.append(el('div', { class: 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [
      el('strong', { class: 'text', text: OVERLAY_NAMES[kind] }),
      el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
      el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
      iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) }),
    ]));
  }
  render();
  store.subscribe(render);
  return { render, cycle: () => store.set(cycleOverlay(store.get(), OVERLAYS)) };
}
