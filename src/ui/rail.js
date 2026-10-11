// The compact landscape rail (spec 6.2): category icons open a drawer of cards; x and tick live at the bottom.
import { CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { setDock, isToolMode } from './modes.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, iconButton } from './components.js';

export function createRail({ container, store, world, onPick, onConfirm, onCancel, placement = null }) {
  const drawer = el('div', { class: 'drawer cards', hidden: true });
  const cancel = iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel });
  const ok = iconButton(T.confirm, '✓', { class: 'ok primary', onClick: onConfirm });
  const bottom = el('div', { class: 'bottom', hidden: true }, [cancel, ok]);
  container.append(bottom, drawer);
  // A button per category with a card to show (spec 4.14), above x and tick; rebuilt when that set changes.
  let shown = [], shownKey = null, catButtons = [];
  function buildCats() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = catButtons.includes(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    for (const b of catButtons) b.remove();
    catButtons = shown.map((c) => {
      const b = iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
        class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false',
        onClick: () => {
          const s = store.get();
          if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
          else store.set({ category: c.id, dock: 'tray' });
        },
      });
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      container.insertBefore(b, bottom);
      return b;
    });
    const again = focused && catButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }

  let lastCards = null;
  function render() {
    buildCats();
    const s = store.get();
    const open = s.dock === 'tray' && !isToolMode(s.mode) && !s.sheet;
    drawer.hidden = !open;
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(open && s.category === shown[i].id)));
    const tool = isToolMode(s.mode);
    bottom.hidden = !tool;
    if (tool && placement) { const p = placement.preview(); ok.disabled = !p || p.state === 'bad' || p.state === 'idle'; }
    const key = cardsKey(world, s.category, activeItemOf(s.tool));
    if (open && key !== lastCards) {
      renderCards(drawer, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, grid: true });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
