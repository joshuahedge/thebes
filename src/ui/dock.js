// The portrait build dock (spec 6.3): slim bar of categories, a tray of cards, or tucked to a "Build" pill.
// Tapping a category opens its tray; tapping it again closes it; the handle toggles; swipes move one step.
import { CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon, clear } from './components.js';

const SWIPE_PX = 30;

// Version 8.1 (Track D): `layers` (src/ui/v81/trayLayers.js) makes the tray layered (the main cards, More, the suggested card glowing) and hides what is locked; without it the tray is 8.0's.
export function createDock({ container, store, world, onPick, layers = null }) {
  const handle = el('button', { type: 'button', class: 'handle', 'aria-label': T.buildTray, 'aria-expanded': 'false', 'data-lock': 'tray-handle' });
  const cats = el('div', { class: 'cats' });
  const tray = el('div', { class: 'tray cards' });
  const pill = button(T.build, { class: 'pill primary', 'data-lock': 'tray-pill' });
  // Ruling 300: a tray with more cards than the phone shows (the Monuments tray holds ten) says so: an edge fade with a
  // chevron over its right end while there is more to see that way, gone at the end. It sits over the cards (no height of
  // its own, so the mobile budget is untouched), lets taps through, and does not move (css/ui.css, s4 ui).
  const more = el('span', { class: 'tray-more', 'aria-hidden': 'true', hidden: true }, [el('span', { class: 'chev', text: '›' })]);
  // Only categories with a card to show have a button (spec 4.14). The set can grow at a milestone, so it is
  // rebuilt when it changes, keeping keyboard focus on the same category.
  let shown = [], shownKey = null, catButtons = [];
  function buildCats() {
    const next = layers ? layers.categories() : shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = cats.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    catButtons = shown.map((c) => {
      const b = el('button', { type: 'button', class: 'cat', dataset: { category: c.id }, 'data-lock': `tray-cat-${c.id}`, 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
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
  container.append(handle, cats, tray, more, pill);
  function updateMore() {
    const on = store.get().dock === 'tray' && tray.scrollLeft + tray.clientWidth < tray.scrollWidth - 2;
    if (on) { more.style.top = `${tray.offsetTop}px`; more.style.height = `${tray.offsetHeight}px`; }
    more.hidden = !on;
  }
  tray.addEventListener('scroll', updateMore, { passive: true });
  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(updateMore) : null;
  if (watch) watch.observe(tray);

  let lastCards = null;
  function render() {
    buildCats();
    const s = store.get();
    container.dataset.height = s.dock;
    document.body.dataset.dock = s.dock;
    handle.setAttribute('aria-expanded', String(s.dock === 'tray'));
    const advisedCat = layers ? layers.advisedCategory() : null;
    catButtons.forEach((b, i) => { b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === shown[i].id)); b.classList.toggle('advised', shown[i].id === advisedCat); });
    const key = cardsKey(world, s.category, activeItemOf(s.tool), layers);
    if (s.dock === 'tray' && key !== lastCards) {
      renderCards(tray, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, layers });
      lastCards = key;
    }
    updateMore();
  }
  render();
  store.subscribe(render);
  return { render, updateMore };
}
