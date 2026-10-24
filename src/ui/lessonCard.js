// Version 7.0, Track P (ruling 1002): the lesson step's card. Josh played 6.0.1 for two minutes and found the lesson's instructions easy to ignore: they sat in a
// row under the top bar while the game ran. A step now opens as a card in the middle of the screen, the game paused behind it and the rest of the screen dimmed
// lightly: the step's words, a picture or an icon, one large button (Show me, Play or Got it) and, on the first step, Skip (Version 8.0: Leave the lesson is in the menu). The button, Enter, Space or Esc docks the step
// to its usual row (src/ui/v60/lesson.js decides what that does to the clock). This is the one card allowed over the middle of the map (ruling 1002).
//
// The card is a modal dialog (aria-modal, wave 3: the page behind is dimmed and takes no taps or keys, Tab stays on its two buttons); closing it hands focus back to what had it,
// or to the docked row's Show me. The dim layer takes the taps so nothing is placed or panned behind it,
// and the keys: Enter, Space and Esc dismiss it (a focused button keeps its own Enter and Space), Delete and Backspace do nothing, and so does every other key
// the game knows (7.1, ruling 1060: Ctrl, Cmd and Alt chords aside). A
// confirmation opened from it (Skip) sits above it and keeps every key it needs.
import { el, button, setText } from './components.js';
import { drawThumb } from './thumbs.js';
import { speedPicture } from './speed.js';
import { P_TEXT, V711_TEXT } from './text.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const THUMB_SCALE = 1.5;   // the card shows the card's own picture 1.5 times as large (css/ui.css .lesson-card .lc-thumb)

// The gold chip's picture for the months step: a coin, drawn (never a font glyph that may be missing).
function coinPicture() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('width', '40');
  svg.setAttribute('height', '40');
  svg.setAttribute('class', 'lc-coin');
  svg.setAttribute('aria-hidden', 'true');
  for (const [r, fill, stroke] of [[17, '#E2B13C', '#7A5200'], [11, 'none', '#7A5200']]) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', '20'); c.setAttribute('cy', '20'); c.setAttribute('r', String(r)); c.setAttribute('fill', fill); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', '2');
    svg.append(c);
  }
  return svg;
}

// The picture a step's card shows, from what the step points at: a building's own drawing (the card's thumb) for a step with a card to build, the speed picture for the
// step that waits on the families, the coin for the months. { item } | { speed } | { coin } | null.
export const CARD_PICTURES = { families: { speed: 2 }, month: { coin: true }, fire: { item: 'firehouse' }, raid: { item: 'tower' } };
export const pictureOf = (step) => (step && (step.show ? { item: step.show.item } : CARD_PICTURES[step.id])) || null;

// createLessonCard({ root, doc, store, onGo, onSkip }) -> { show({ label, words, goLabel, picture }), hide(), isUp(), element, go, skip, destroy() }
export function createLessonCard({ root, doc = document, store, onGo, onSkip = () => {}, keys = () => true }) {
  const win = doc.defaultView || window;
  const label = el('p', { class: 'lc-label small muted' });
  const pic = el('div', { class: 'lc-pic', 'aria-hidden': 'true' });
  const words = el('p', { class: 'lc-words', id: 'lesson-card-words' });
  const go = button('', { class: 'lc-go primary', onClick: () => onGo() });
  let asker = null;   // the button whose question is open, so answering No puts focus back on it
  // Version 8.0 (Track N, ruling 1171): Leave the lesson is no longer on the card or the docked row; it is in the menu while a lesson runs (src/ui/menu.js), so the card has one button to press.
  // Version 7.1.1 (ruling 1112): the first step's card also offers "Skip, I've played before" (shown only while show() is given skipOffered), now a tertiary text button under the one primary (Version 8.0).
  const skip = button(V711_TEXT.skip, { class: 'lc-skip quiet tertiary', hidden: true, onClick: () => { asker = skip; onSkip(); } });
  const card = el('div', { class: 'lesson-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': P_TEXT.card.region, 'aria-describedby': 'lesson-card-words' }, [label, pic, words, el('div', { class: 'lc-actions' }, [go, skip])]);
  const scrim = el('div', { class: 'lesson-card-scrim', hidden: true }, [card]);
  const ui = root.querySelector('#ui') || root;
  ui.insertBefore(scrim, root.querySelector('#toasts') || null);   // above the page, under the toasts and the confirm dialog (which sit later in the page)
  let up = false;
  let returnTo = null;   // wave 3: what had focus when the card came up, so closing it hands focus back (to the docked row's Show me when that is gone)

  function paintPicture(picture) {
    pic.replaceChildren();
    pic.hidden = !picture;
    if (!picture) return;
    if (picture.item) {
      const dpr = Math.max(1, Math.min(3, win.devicePixelRatio || 1));
      const canvas = drawThumb(el('canvas', { class: 'lc-thumb' }), picture.item, dpr * THUMB_SCALE);
      pic.append(canvas);
    } else if (picture.speed) pic.append(speedPicture(picture.speed));
    else if (picture.coin) pic.append(coinPicture());
  }

  // goLabel: the button's name (what it does); picture: pictureOf's answer.
  function show({ label: head, text, goLabel, picture, skipOffered = false }) {
    setText(label, head);
    setText(words, text);
    go.textContent = goLabel;
    skip.hidden = !skipOffered;
    go.title = P_TEXT.cardGoTitle(goLabel, keys());
    go.setAttribute('aria-keyshortcuts', 'Enter');
    paintPicture(picture);
    scrim.hidden = false;
    const was = doc.activeElement;
    if (!up && was && was !== doc.body && !card.contains(was)) returnTo = was;   // a step card that follows another keeps the first's place to return to
    up = true;
    root.classList.add('lesson-card-up');
    go.focus();
  }
  function hide() {
    if (!up) return;
    up = false;
    scrim.hidden = true;
    root.classList.remove('lesson-card-up');
    const back = returnTo;
    returnTo = null;
    if (!card.contains(doc.activeElement)) return;
    doc.activeElement.blur();
    const docked = root.querySelector('#lesson .show-me:not([hidden])');
    const live = (n) => Boolean(n) && n.isConnected && !n.disabled && n.getClientRects().length > 0;   // (a fixed-position button has no offsetParent, so it is measured)
    const target = live(back) ? back : docked;
    if (live(target)) target.focus();
  }

  // Captured first, so the game's own keys (Space pauses, Delete removes, Enter places) never act behind the card.
  function onKey(ev) {
    if (!up || ev.defaultPrevented) return;
    const s = store.get();
    if (s.confirmDialog) return;                                           // Leave the lesson's question has the keys now
    const k = ev.key, on = ev.target;
    if (k === 'Tab') {
      const order = skip.hidden ? [go] : [go, skip], i = order.indexOf(on);
      const next = i < 0 ? go : order[(i + (ev.shiftKey ? order.length - 1 : 1)) % order.length];
      ev.preventDefault(); ev.stopPropagation(); next.focus();
      return;
    }
    if ((k === 'Enter' || k === ' ') && (on === go || on === skip)) return;   // a focused button keeps its own Enter and Space
    if (k === 'Enter' || k === ' ' || k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); onGo(); return; }
    if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); ev.stopPropagation(); return; }
    // Version 7.1 (ruling 1060): every other game key stops here too (the clock, the minimap, Help, the layers, the categories, the pan keys), so the card is modal to the
    // keyboard as it is to the tap; the default is kept (a browser chord such as F5 still works), and Ctrl, Cmd and Alt chords go on to the page untouched.
    // Version 7.1 (ruling 1080): except Undo and Redo (Ctrl or Cmd with Z or Y, Shift+Z too), which would take back a placement behind the dimmed card.
    if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z' || k === 'y' || k === 'Y')) { ev.stopPropagation(); return; }
    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) ev.stopPropagation();
  }
  doc.addEventListener('keydown', onKey, true);

  // Version 7.1 (ruling 1060): Leave the lesson's question takes focus away from the card; when it closes without leaving (Cancel, Esc) the card is still the modal, so focus
  // goes back to Leave, the button that asked, instead of dropping to the page behind. (The dialog's own render runs first and has already let go of its button.)
  let questioned = false;
  const stop = typeof store.subscribe === 'function' ? store.subscribe(() => {
    const open = Boolean(store.get().confirmDialog);
    if (open === questioned) return;
    questioned = open;
    if (!open && up && !card.contains(doc.activeElement)) (asker || go).focus();
  }) : () => {};

  return {
    show, hide, isUp: () => up, element: scrim, card, go, skip,
    destroy() { stop(); doc.removeEventListener('keydown', onKey, true); root.classList.remove('lesson-card-up'); scrim.remove(); up = false; },
  };
}
