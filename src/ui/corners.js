// Corner buttons (spec 6.3): pause and speed bottom-left; minimap with the alert badge and the overlay
// toggle bottom-right. They show at every dock height and never sit in the middle of the map.
import { el, iconButton } from './components.js';
import { T } from './text.js';

export function createCorners({ container, store, speedControl, onMinimap, onOverlay, alertCount = () => 0 }) {
  const left = el('div', { class: 'group left' });
  speedControl.mountCorner(left);
  const minimap = iconButton(T.minimap, '▣', { class: 'minimap-button has-badge', onClick: onMinimap });
  const badge = el('span', { class: 'badge', hidden: true });
  minimap.append(badge);
  const overlay = iconButton(T.overlay, '◑', { class: 'overlay-button', 'aria-pressed': 'false', onClick: onOverlay });
  const right = el('div', { class: 'group right' }, [minimap, overlay]);
  container.append(left, right);

  function render() {
    const n = alertCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    minimap.setAttribute('aria-label', n ? `${T.minimap}, ${n} ${T.alerts.toLowerCase()}` : T.minimap);
    overlay.setAttribute('aria-pressed', String(Boolean(store.get().overlay)));
    speedControl.render();
  }
  render();
  store.subscribe(render);
  return { render };
}
