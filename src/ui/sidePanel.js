// The wide layout's right-hand panel (spec 6.2): minimap, category tabs, the card grid and a details area.
import { CATEGORY_TINT } from '../data/ui.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

export function createSidePanel({ container, store, world, onPick, minimapNode = null, detailsNode = null }) {
  const fold = iconButton(T.fold, '‹', { class: 'fold' });
  const foldbar = el('div', { class: 'foldbar' }, [fold]);
  const minimap = el('div', { class: 'minimap' });
  if (minimapNode) minimap.append(minimapNode);
  const tabs = el('div', { class: 'tabs' });
  // A tab per category with a card to show (spec 4.14), rebuilt when that set changes at a milestone.
  let shown = [], shownKey = null, tabButtons = [];
  function buildTabs() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = tabs.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    tabButtons = shown.map((c) => {
      const b = button(CATEGORY_NAMES[c.id], { class: 'tab', dataset: { category: c.id }, 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) });
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      return b;
    });
    clear(tabs);
    tabs.append(...tabButtons);
    const again = focused && tabButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }
  const cards = el('div', { class: 'cards grid' });
  const details = el('div', { class: 'details' });
  if (detailsNode) details.append(detailsNode);
  fold.addEventListener('click', () => store.set({ panelFolded: !store.get().panelFolded }));
  container.append(foldbar, minimap, tabs, cards, details);

  let lastCards = null;
  function render() {
    buildTabs();
    const s = store.get();
    document.body.classList.toggle('panel-folded', s.panelFolded);
    fold.setAttribute('aria-label', s.panelFolded ? T.unfold : T.fold);
    fold.querySelector('.icon').textContent = s.panelFolded ? '›' : '‹';
    tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.category === shown[i].id)));
    const key = cardsKey(world, s.category, activeItemOf(s.tool));
    if (key !== lastCards) {
      renderCards(cards, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, grid: true });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render, details };
}
