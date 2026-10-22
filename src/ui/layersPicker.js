// The Layers picker (placement review P2, spec 6.3): a small popover of every overlay plus Off, opened by the Layers corner button
// on a phone and by the Layers button under the minimap on a wide screen (two nodes, one open flag: the layout's own host shows
// the one that counts). One tap picks and closes; the current one turns it off. It is a popover, not a sheet, so it never
// cancels a tool or deselects. Back, Esc (modes.back: store.layersOpen), a tap outside, a sheet or a dialog opening close it.
// O still cycles the overlays.
// Version 5.0 (Task 3): with a world, Home progress, Goods supply and Workers appear only once the city has reached their milestone (src/data/layers.js LAYER_UNLOCK);
// a hidden choice is out of the tab order and the screen reader's list, and the one in use stays shown whatever the city has.
import { OVERLAYS, OVERLAY_HUE, LAYER_OVERLAYS } from '../render/overlays.js';
import { layerUnlocked } from '../sim/layers.js';
import { OVERLAY_NAMES, LAYERS_LOCKED_TEXT, T } from './text.js';
import { el, button } from './components.js';

// store: the interface's store. restoreFocus: called when the popover closes with keyboard focus inside it (the button just
// pressed is hidden by then), so focus goes back to the Layers button instead of dropping to the page.
// Version 6.0 (Track C, ruling 706): a layer the city has not reached yet is not left out (ruling 541) but shown greyed, with the rank that unlocks it ("Unlocks at Town"), so a
// player can know Goods supply and Workers exist before Town. It cannot be picked; it stays in the tab order as a disabled choice (aria-disabled) with its words for a screen reader.
export function createLayersPicker({ store, world = null, restoreFocus = () => {}, doc = document }) {
  const offered = (kind, current) => !world || !LAYER_OVERLAYS.includes(kind) || kind === current || layerUnlocked(world, kind);
  const swatch = (hue) => el('span', { class: 'hue', style: { background: hue }, 'aria-hidden': 'true' });
  const choices = OVERLAYS.map((kind) => button('', { class: 'layer', dataset: { layer: kind }, 'aria-pressed': 'false' }));
  const locks = OVERLAYS.map(() => el('span', { class: 'lock small', hidden: true }));
  OVERLAYS.forEach((kind, i) => { choices[i].append(swatch(OVERLAY_HUE[kind]), el('span', { class: 'words' }, [el('span', { class: 'name', text: OVERLAY_NAMES[kind] }), locks[i]])); });
  const off = button(T.layersOff, { class: 'layer off', dataset: { layer: 'off' }, 'aria-pressed': 'false' });
  const node = el('div', { class: 'layers-picker', role: 'group', 'aria-label': T.layers, hidden: true }, [...choices, off]);

  function pick(kind) {
    const s = store.get();
    store.set({ overlay: kind === null || kind === s.overlay ? null : kind, layersOpen: false });
  }
  choices.forEach((b, i) => b.addEventListener('click', () => { if (!b.classList.contains('locked')) pick(OVERLAYS[i]); }));
  off.addEventListener('click', () => pick(null));

  let wasOpen = false;
  // A pointer down anywhere outside the popover and the Layers buttons (which toggle it themselves) closes it; the press goes
  // on to do its own work (a map tap still selects or places).
  const onDown = (e) => {
    if (e.target && e.target.closest && e.target.closest('.layers-picker, .overlay-button, .layers-button')) return;
    if (store.get().layersOpen) store.set({ layersOpen: false });
  };

  function render() {
    const s = store.get();
    // A sheet, a dialog or screenshot mode takes the screen: the popover does not stay behind them.
    if (s.layersOpen && (s.sheet || s.confirmDialog || s.screenshot)) { store.set({ layersOpen: false }); return; }
    const open = s.layersOpen;
    node.hidden = !open;
    choices.forEach((b, i) => {
      const locked = !offered(OVERLAYS[i], s.overlay);
      b.setAttribute('aria-pressed', String(s.overlay === OVERLAYS[i]));
      b.classList.toggle('locked', locked);
      if (locked) { b.setAttribute('aria-disabled', 'true'); b.title = LAYERS_LOCKED_TEXT.words(OVERLAYS[i]); } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
      if (locked) b.setAttribute('aria-label', LAYERS_LOCKED_TEXT.aria(OVERLAY_NAMES[OVERLAYS[i]], OVERLAYS[i])); else b.removeAttribute('aria-label');
      locks[i].hidden = !locked;
      locks[i].textContent = locked ? LAYERS_LOCKED_TEXT.rank(OVERLAYS[i]) : '';
    });
    off.setAttribute('aria-pressed', String(!s.overlay));
    if (open === wasOpen) return;
    wasOpen = open;
    if (open) {
      doc.addEventListener('pointerdown', onDown, true);
      const first = choices.find((b) => b.getAttribute('aria-pressed') === 'true') || off;
      if (node.offsetParent !== null) {                                                // only the host the layout shows takes focus
        first.focus({ preventScroll: true });
        // On a small screen the popover scrolls: show the current choice (or Off) instead of leaving it below the cut.
        if (first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
      }
    } else {
      doc.removeEventListener('pointerdown', onDown, true);
      if (node.contains(doc.activeElement)) restoreFocus();
    }
  }
  render();
  const stop = store.subscribe(render);
  return { node, render, destroy() { stop(); doc.removeEventListener('pointerdown', onDown, true); } };
}
