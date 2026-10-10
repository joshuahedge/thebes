// The compact landscape rail (spec 6.2): category icons open a drawer of cards; x and tick live at the bottom.
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
import { setDock, isToolMode } from './modes.js';
import { renderCards, activeItemOf } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, iconButton } from './components.js';

export function createRail({ container, store, world, onPick, onConfirm, onCancel, placement = null }) {
  const catButtons = CATEGORIES.map((c) => iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
    class: 'cat', 'aria-pressed': 'false',
    onClick: () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set({ category: c.id, dock: 'tray' });
    },
  }));
  const drawer = el('div', { class: 'drawer cards', hidden: true });
  const cancel = iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel });
  const ok = iconButton(T.confirm, '✓', { class: 'ok primary', onClick: onConfirm });
  const bottom = el('div', { class: 'bottom', hidden: true }, [cancel, ok]);
  container.append(...catButtons, bottom, drawer);

  let lastCards = null;
  function render() {
    const s = store.get();
    const open = s.dock === 'tray';
    drawer.hidden = !open;
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(open && s.category === CATEGORIES[i].id)));
    const tool = isToolMode(s.mode);
    bottom.hidden = !tool;
    if (tool && placement) { const p = placement.preview(); ok.disabled = !p || p.state === 'bad' || p.state === 'idle'; }
    const key = `${s.category}|${activeItemOf(s.tool)}|${world.gold}|${world.milestone}`;
    if (open && key !== lastCards) {
      renderCards(drawer, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, grid: true });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
