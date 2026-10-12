// Corner buttons (spec 6.3): pause and speed bottom-left; minimap with the alert badge and the overlay toggle
// bottom-right (the overlay button opens the Layers picker, ui/layersPicker.js). Each says what it is in a word under its icon (early-game pass 2.9). They ride above the dock at
// every height, except that in portrait they step out of sight over an open tray that would lift them above half the
// screen (ruling 173), so they never sit in the middle of the map.
import { el, iconButton, setText } from './components.js';
import { T, plural, layersText, OVERLAY_NAMES } from './text.js';
import { isToolMode } from './modes.js';

// An icon button with its word underneath. The aria-label leads with the same word, so the name matches the label.
function labelled(label, glyph, props) {
  const b = iconButton(label, glyph, props);
  b.classList.add('labelled');
  const word = el('span', { class: 'label', text: label });
  b.append(word);
  return { b, word };
}

// viewHeight: the screen's height in px (0 when unknown). With the portrait tray open, the corners ride on its top edge; at
// 125% text and more that edge is above the middle of the map, where nothing may float (spec 6.3, ruling 173), so then
// they step out of sight (the class "over-half": visibility hidden, which keeps their place so they can be measured again)
// until the tray closes. A tool, a wide screen or a compact one never hides them this way.
export function createCorners({ container, store, speedControl, onMinimap, onOverlay, pickerNode = null, alertCount = () => 0, viewHeight = () => 0 }) {
  const left = el('div', { class: 'group left' });
  speedControl.mountCorner(left);
  const map = labelled(T.mapButton, '▣', { class: 'minimap-button has-badge', onClick: onMinimap });
  const badge = el('span', { class: 'badge', hidden: true });
  map.b.append(badge);
  const layers = labelled(T.layers, '◑', { class: 'overlay-button', 'aria-pressed': 'false', onClick: onOverlay });
  layers.b.setAttribute('aria-expanded', 'false');
  // The Layers picker's popover (ui/layersPicker.js) rides on this group, above the Layers button.
  const right = el('div', { class: 'group right' }, [map.b, layers.b, pickerNode]);
  container.append(left, right);

  function overHalf() {
    const s = store.get(), h = viewHeight();
    if (!h || s.layout !== 'portrait' || s.dock !== 'tray' || isToolMode(s.mode)) return false;
    const bottom = parseFloat(getComputedStyle(container).bottom);              // px from the screen's foot (css/ui.css, by the dock height)
    return Number.isFinite(bottom) && h - bottom - container.offsetHeight < h / 2;
  }

  function render() {
    container.classList.toggle('over-half', overHalf());
    const n = alertCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    map.b.setAttribute('aria-label', n ? `${T.mapButton}, ${plural(n, 'alert', 'alerts')}` : T.mapButton);
    const kind = store.get().overlay;
    setText(layers.word, kind ? OVERLAY_NAMES[kind] : T.layers);
    layers.b.setAttribute('aria-label', layersText(kind));
    layers.b.setAttribute('aria-pressed', String(Boolean(kind)));
    layers.b.setAttribute('aria-expanded', String(store.get().layersOpen));
    speedControl.render();
  }
  render();
  store.subscribe(render);
  return { render, layersButton: layers.b };
}
