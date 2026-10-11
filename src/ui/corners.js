// Corner buttons (spec 6.3): pause and speed bottom-left; minimap with the alert badge and the overlay toggle
// bottom-right. Each says what it is in a word under its icon (early-game pass 2.9). They show at every dock
// height and never sit in the middle of the map.
import { el, iconButton, setText } from './components.js';
import { T, plural, layersText, OVERLAY_NAMES } from './text.js';

// An icon button with its word underneath. The aria-label leads with the same word, so the name matches the label.
function labelled(label, glyph, props) {
  const b = iconButton(label, glyph, props);
  b.classList.add('labelled');
  const word = el('span', { class: 'label', text: label });
  b.append(word);
  return { b, word };
}

export function createCorners({ container, store, speedControl, onMinimap, onOverlay, alertCount = () => 0 }) {
  const left = el('div', { class: 'group left' });
  speedControl.mountCorner(left);
  const map = labelled(T.mapButton, '▣', { class: 'minimap-button has-badge', onClick: onMinimap });
  const badge = el('span', { class: 'badge', hidden: true });
  map.b.append(badge);
  const layers = labelled(T.layers, '◑', { class: 'overlay-button', 'aria-pressed': 'false', onClick: onOverlay });
  const right = el('div', { class: 'group right' }, [map.b, layers.b]);
  container.append(left, right);

  function render() {
    const n = alertCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    map.b.setAttribute('aria-label', n ? `${T.mapButton}, ${plural(n, 'alert', 'alerts')}` : T.mapButton);
    const kind = store.get().overlay;
    setText(layers.word, kind ? OVERLAY_NAMES[kind] : T.layers);
    layers.b.setAttribute('aria-label', layersText(kind));
    layers.b.setAttribute('aria-pressed', String(Boolean(kind)));
    speedControl.render();
  }
  render();
  store.subscribe(render);
  return { render };
}
