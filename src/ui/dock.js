// The portrait build dock (spec 6.3): slim bar of categories, a tray of cards, or tucked to a "Build" pill.
// Tapping a category opens its tray; tapping it again closes it; the handle toggles; swipes move one step.
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon } from './components.js';

const SWIPE_PX = 30;

export function createDock({ container, store, world, onPick }) {
  const handle = el('button', { type: 'button', class: 'handle', 'aria-label': T.build });
  const cats = el('div', { class: 'cats' });
  const tray = el('div', { class: 'tray cards' });
  const pill = button(T.build, { class: 'pill primary' });
  const catButtons = CATEGORIES.map((c) => {
    const b = el('button', { type: 'button', class: 'cat', 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
    b.addEventListener('click', () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set(pickCategory(s, c.id));
    });
    return b;
  });
  cats.append(...catButtons);
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
    const s = store.get();
    container.dataset.height = s.dock;
    document.body.dataset.dock = s.dock;
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === CATEGORIES[i].id)));
    const key = `${s.category}|${activeItemOf(s.tool)}|${world.gold}|${world.milestone}`;
    if (s.dock === 'tray' && key !== lastCards) {
      renderCards(tray, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
