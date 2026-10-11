// The portrait build dock (spec 6.3): slim bar of categories, a tray of cards, or tucked to a "Build" pill.
// Tapping a category opens its tray; tapping it again closes it; the handle toggles; swipes move one step.
import { CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon, clear } from './components.js';

const SWIPE_PX = 30;

export function createDock({ container, store, world, onPick }) {
  const handle = el('button', { type: 'button', class: 'handle', 'aria-label': T.buildTray, 'aria-expanded': 'false' });
  const cats = el('div', { class: 'cats' });
  const tray = el('div', { class: 'tray cards' });
  const pill = button(T.build, { class: 'pill primary' });
  // Only categories with a card to show have a button (spec 4.14). The set can grow at a milestone, so it is
  // rebuilt when it changes, keeping keyboard focus on the same category.
  let shown = [], shownKey = null, catButtons = [];
  function buildCats() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = cats.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    catButtons = shown.map((c) => {
      const b = el('button', { type: 'button', class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      b.addEventListener('click', () => {
        const s = store.get();
        if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
        else store.set(pickCategory(s, c.id));
      });
      return b;
    });
    clear(cats);
    cats.append(...catButtons);
    const again = focused && catButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }
  handle.addEventListener('click', () => { const s = store.get(); store.set(setDock(s, s.dock === 'tray' ? 'slim' : 'tray')); });
  let swipeStart = null;
  handle.addEventListener('pointerdown', (ev) => {
    swipeStart = ev.clientY;
    // Keep the drag on the handle even if the finger strays; synthetic events have no active pointer to capture.
    try { handle.setPointerCapture(ev.pointerId); } catch {}
  });
  // A browser that takes a vertical drag for scrolling fires pointercancel, not pointerup: drop the swipe.
  handle.addEventListener('pointercancel', () => { swipeStart = null; });
  handle.addEventListener('pointerleave', () => { swipeStart = null; });
  handle.addEventListener('pointerup', (ev) => {
    if (swipeStart === null) return;
    const dy = ev.clientY - swipeStart;
    swipeStart = null;
    const s = store.get();
    if (dy <= -SWIPE_PX) store.set(setDock(s, 'tray'));
    else if (dy >= SWIPE_PX) store.set(setDock(s, s.dock === 'tray' ? 'slim' : 'tucked'));
  });
  pill.addEventListener('click', () => store.set(setDock(store.get(), 'slim')));
  container.append(handle, cats, tray, pill);

  let lastCards = null;
  function render() {
    buildCats();
    const s = store.get();
    container.dataset.height = s.dock;
    document.body.dataset.dock = s.dock;
    handle.setAttribute('aria-expanded', String(s.dock === 'tray'));
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === shown[i].id)));
    const key = cardsKey(world, s.category, activeItemOf(s.tool));
    if (s.dock === 'tray' && key !== lastCards) {
      renderCards(tray, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
