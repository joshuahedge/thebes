// Version 10.0.1 (Track U, rulings 2343-2346): keys you can see. While a tab's cards are open, the digit keys pick its cards in order; each tab's key shows on its button and each
// card's on the card (a desktop with a fine pointer only). The numbering is read from the cards on screen, so what is badged is exactly what a key picks.
import { CATEGORIES } from '../../data/ui.js';
import { CATEGORY_NAMES, V1001U_TEXT } from '../text.js';
import { effectiveKeys, keyName } from './keymap.js';
import { isToolMode } from '../modes.js';

// Whether a tab's cards are open, so a card key picks a card. A phone's tray is the dock's 'tray' state; the compact rail's drawer is the tray with no tool or sheet over it; the wide panel
// always shows its cards, so there the cards are "open" for keys from the moment a tab was chosen (by its key or a click) until Esc (state.cardKeys).
export function trayOpenOf(s) {
  if (!s || s.screenshot || s.confirmDialog) return false;   // Version 10.0.1 (Track U, ruling 2357): nothing behind a modal is picked by a key
  if (s.layout === 'wide') return Boolean(s.cardKeys) && !s.panelFolded && !s.sheet;
  if (s.layout === 'compact') return s.dock === 'tray' && !isToolMode(s.mode) && !s.sheet;
  return s.dock === 'tray' && !s.sheet;
}

const CARD_HOST = { wide: '#panel .cards', compact: '#rail .drawer', portrait: '#dock .tray' };
export const cardHostOf = (root, layout) => root.querySelector(CARD_HOST[layout] || CARD_HOST.portrait);

// The cards a key can pick, in the order the tray shows them: not the locked ones (they cannot be picked, so they are not numbered), at most as many as there are card keys.
export function pickableCards(host, max = 9) {
  if (!host) return [];
  return [...host.querySelectorAll('.card')].filter((b) => !b.classList.contains('locked') && b.getAttribute('aria-disabled') !== 'true').slice(0, max);
}

// A card key's pick: the i-th pickable card behaves as a click on it. Returns whether there was one.
export function pickCard(root, layout, i) {
  const b = pickableCards(cardHostOf(root, layout))[i];
  if (!b) return false;
  b.click();
  return true;
}

const FINE = '(any-pointer: fine) and (any-hover: hover)';
function defaultFine(win) {
  try { return Boolean(win && typeof win.matchMedia === 'function' && win.matchMedia(FINE).matches); } catch (e) { return false; }
}

// The badges: a number on each tab's button (and in its tooltip), and on each card while the cards are open for keys. Hidden on touch, and while Single keys is off. Kept up to date from the
// store, the settings and the containers' own redraws (a tray rebuilds its cards without a store change).
export function createKeyBadges({ root, store, settings, win = typeof window !== 'undefined' ? window : null, fine = null }) {
  const doc = root.ownerDocument || document;
  const isFine = () => (typeof fine === 'function' ? fine() : defaultFine(win));
  const tabSel = '#dock .cat, #rail .cat, #panel .tab';
  const hostSels = ['#dock .tray', '#panel .cards', '#rail .drawer'];
  const badge = (text, cls) => { const s = doc.createElement('span'); s.className = `key-badge ${cls}`; s.setAttribute('aria-hidden', 'true'); s.textContent = text; return s; };
  const clearBadges = (node) => { for (const b of node.querySelectorAll(':scope > .key-badge')) b.remove(); };
  let busy = false;

  function decorate() {
    if (busy) return;
    busy = true;
    try {
      const s = store.get(), set = settings.get();
      const on = isFine() && set.keyboardShortcuts !== false;
      const map = effectiveKeys(set.keyBindings);
      for (const b of root.querySelectorAll(tabSel)) {
        clearBadges(b);
        const idx = CATEGORIES.findIndex((c) => c.id === b.dataset.category);
        const key = on && idx >= 0 ? map.category[idx] : null;
        if (key) {
          b.append(badge(keyName(key), 'tab-key'));
          b.title = V1001U_TEXT.tabTitle(CATEGORY_NAMES[b.dataset.category] || b.dataset.category, keyName(key));
          b.dataset.keyTitle = '1';
          b.setAttribute('aria-keyshortcuts', key);
        } else {
          if (b.dataset.keyTitle) { b.removeAttribute('title'); delete b.dataset.keyTitle; }   // only the tooltip this set
          b.removeAttribute('aria-keyshortcuts');
        }
      }
      for (const sel of hostSels) {
        const host = root.querySelector(sel);
        if (!host) continue;
        for (const c of host.querySelectorAll('.card')) clearBadges(c);
      }
      if (on && trayOpenOf(s)) {
        pickableCards(cardHostOf(root, s.layout), map.card.length).forEach((c, i) => c.append(badge(keyName(map.card[i]), 'card-key')));
      }
    } finally { busy = false; }
  }

  let queued = false;
  const later = () => { if (queued) return; queued = true; Promise.resolve().then(() => { queued = false; decorate(); }); };
  const offStore = store.subscribe(later);
  // No settings subscription of its own (the interface holds one shared watch, and createUI's calls decorate() from it): a change of the keys or of Single keys is repainted from there.
  let observer = null;
  if (typeof MutationObserver === 'function') {
    observer = new MutationObserver(later);
    for (const sel of ['#dock .cats', '#dock .tray', '#panel .tabs', '#panel .cards', '#rail', '#rail .drawer']) {
      const n = root.querySelector(sel);
      if (n) observer.observe(n, { childList: true });
    }
  }
  decorate();
  return { decorate, destroy() { offStore(); if (observer) observer.disconnect(); } };
}
