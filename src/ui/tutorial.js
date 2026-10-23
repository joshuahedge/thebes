// The picture cards (spec 4.1, rulings 261-265): the cards (src/data/tutorial.js lists them), each a real game screenshot with one ring or arrow drawn
// live over it, a title and one or two sentences, read before the first city and any time from How to play. Stage 4
// contract: Track 0 fixed the name and the wiring; Track G implements it (with src/data/tutorial.js, assets/tutorial/ and
// tools/tutorial.ps1) and owns this file.
//
// showPictureCards({ root, doc, settings, onDone }) shows the cards as a modal dialog over whatever is behind it (the
// title card, or a paused game), with focus kept inside and handed back on close. onDone() is called once, when the
// player reaches Start building, skips, or closes them (Back, Esc, X). It returns { close() }, which closes the cards
// without calling onDone (a page torn down under them). Under Full motion the cards slide; under Gentle and Still they
// change at once (settings.motionLevel()).
//
// The wiring (src/boot.js): New city shows them first when settings.get().cardsSeen is false, then
// set cardsSeen (seen or skipped, ruling 262) and start the city; hooks.pictureCards(onDone) shows them any time (the title
// card's How to play button and the How to play sheet's "Show the picture cards", both Track G's).
//
// Track G: the dialog is appended to root (the page's body) and is its own size container, so it lays out as a
// full-screen sheet on a phone, the picture beside the words on a landscape phone and a centred card of at most 560 px on
// a wide screen (css/ui.css, s4 cards), whatever box holds it. Moving: Next and Back, a swipe on the picture, the arrow
// keys, the dots (each a button), Skip, the X, Esc and the phone's Back (one history entry of its own, taken back when
// the cards close another way; its popstate is caught first and goes no further, so the sheet under the cards stays
// open). Every key pressed inside stops there, so the game's shortcuts never act behind the cards. The marks come from
// assets/tutorial/cards.json (fetched once a page; until then, or offline without it, the pictures show without one).
// Options for tests: cards, marks (the cards.json "cards" object, given instead of fetched), fetchMarks, history,
// addListener and removeListener (the window's popstate, capturing), base (where the pictures are).
import { TUTORIAL_CARDS, TUTORIAL } from '../data/tutorial.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { CARDS4_TEXT, cards4Ahead } from './text.js';
import { el, button } from './components.js';

const SVG = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}
const round = (v) => Math.round(v * 10) / 10;
const MAX_DOTS = 8;   // a set of more cards than this has no row of dots (Version 6.0, Track D2: How to play's thirteen)

// The mark as SVG in picture px (TUTORIAL.size square, scaled with the picture): a white halo under a teal line, a
// rounded ring around a box or an arrow to a point (src/data/tutorial.js gives the shapes). An empty SVG for no mark.
export function markSvg(mark, size = TUTORIAL.size) {
  const svg = svgEl('svg', { class: 'pc-mark', viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', focusable: 'false' });
  if (!mark) return svg;
  let shape = null;
  if (mark.kind === 'ring') {
    const pad = Number.isFinite(mark.pad) ? mark.pad : TUTORIAL.ringPad;
    const w = mark.w + 2 * pad, h = mark.h + 2 * pad;
    const r = Number.isFinite(mark.radius) ? Math.min(mark.radius, w / 2, h / 2) : Math.min(w, h) / 2;   // a pill unless the mark gives its own corner radius
    shape = { tag: 'rect', attrs: { x: round(mark.x - w / 2), y: round(mark.y - h / 2), width: round(w), height: round(h), rx: round(r), ry: round(r) } };
  } else if (mark.kind === 'arrow') {
    const a = (mark.angle * Math.PI) / 180, L = TUTORIAL.arrowLength, H = TUTORIAL.arrowHead;
    const tail = [mark.x - Math.cos(a) * L, mark.y - Math.sin(a) * L];
    const wing = (s) => [mark.x - Math.cos(a + s) * H, mark.y - Math.sin(a + s) * H];
    const [w1, w2] = [wing(0.5), wing(-0.5)];
    shape = { tag: 'path', attrs: { d: `M${round(tail[0])} ${round(tail[1])} L${round(mark.x)} ${round(mark.y)} M${round(w1[0])} ${round(w1[1])} L${round(mark.x)} ${round(mark.y)} L${round(w2[0])} ${round(w2[1])}` } };
  }
  if (shape) for (const cls of ['halo', 'line']) svg.append(svgEl(shape.tag, { class: cls, ...shape.attrs }));
  svg.dataset.kind = shape ? mark.kind : '';
  return svg;
}

// The marks (assets/tutorial/cards.json's "cards"), fetched once a page and kept (marksNow: drawn at once by every later
// show); a failed fetch is tried again next time.
let marksOnce = null, marksNow = null;
export function loadMarks(fetchMarks = (url) => fetch(url)) {
  if (!marksOnce) {
    marksOnce = Promise.resolve()
      .then(() => fetchMarks(TUTORIAL.dir + TUTORIAL.marks))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((json) => { if (!json || !json.cards) throw new Error('no_marks'); marksNow = json.cards; return json.cards; })
      .catch(() => { marksOnce = null; return {}; });
  }
  return marksOnce;
}

// For tests: forget the fetched marks, so the next show fetches them again.
export function forgetMarks() { marksOnce = null; marksNow = null; }

const defaultHistory = () => { try { return typeof window !== 'undefined' ? window.history : null; } catch (e) { return null; } };

export function showPictureCards({
  root = null, doc = null, settings = null, onDone = () => {},
  cards = TUTORIAL_CARDS, marks = null, fetchMarks = undefined, history = defaultHistory(),
  addListener = (type, fn) => window.addEventListener(type, fn, true), removeListener = (type, fn) => window.removeEventListener(type, fn, true),
  base = TUTORIAL.dir, difficulty = null, finishLabel = null,
} = {}) {
  const C = CARDS4_TEXT, n = cards.length;
  const host = root || document.body;
  const opener = (doc && doc.activeElement) || document.activeElement;
  // A sheet that rebuilds while the cards show replaces its buttons: focus then goes back to its twin (the same classes).
  const openerClasses = opener && typeof opener.className === 'string' && opener.className.trim() ? `${opener.tagName.toLowerCase()}.${opener.className.trim().split(/\s+/).join('.')}` : null;
  const motion = () => (settings && typeof settings.motionLevel === 'function' ? settings.motionLevel() : 'still');
  let index = 0, closed = false, known = marks || marksNow;
  // Words follow the sim: Peaceful never starts a raid clock (src/data/difficulty.js raids: false), so the last card (What lies ahead) does not
  // promise it raiders there. No level given (or an unknown one) reads as a level with raids.
  const raids = !difficulty || !Object.hasOwn(DIFFICULTIES, difficulty) || DIFFICULTIES[difficulty].raids !== false;

  // The dialog.
  const count = el('span', { class: 'pc-count small muted' });
  const skip = button(C.skip, { class: 'pc-skip quiet' });
  const shut = button('✕', { class: 'pc-close quiet', 'aria-label': C.close, title: C.close });
  const picture = el('img', { class: 'pc-picture', width: TUTORIAL.size, height: TUTORIAL.size, decoding: 'async', alt: '' });
  const figure = el('figure', { class: 'pc-figure' }, [picture, markSvg(null)]);
  const stage = el('div', { class: 'pc-stage' }, [figure]);
  const title = el('h2', { id: 'pc-title' });
  const words = el('p', { id: 'pc-words' });
  const text = el('div', { class: 'pc-text', 'aria-live': 'polite' }, [title, words]);
  const dots = cards.map((c, i) => button('', { class: 'pc-dot', 'aria-label': C.dot(i + 1, n), dataset: { index: String(i) } }));
  const back = button(C.back, { class: 'pc-back' });
  const next = button(C.next, { class: 'pc-next primary' });
  const box = el('div', { class: 'pc-box' }, [
    el('div', { class: 'pc-top' }, [count, skip, shut]),
    stage, text,
    el('div', { class: 'pc-dots', role: 'group', 'aria-label': C.dots }, dots),
    el('div', { class: 'pc-nav' }, [back, next]),
  ]);
  const dialog = el('div', { class: 'picture-cards', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pc-title', 'aria-describedby': 'pc-words', tabindex: '-1' }, [box]);
  // Version 6.0 (Track D2): one card on its own (a first moment's) has nothing to count, skip back to or turn to: only the picture, its words and one button.
  if (n === 1) for (const node of [count, skip, back, box.querySelector('.pc-dots')]) node.hidden = true;
  else if (n > MAX_DOTS) box.querySelector('.pc-dots').hidden = true;   // thirteen 44 px dots would not fit a phone: the count, Next, Back, a swipe and the arrow keys move the cards

  function render(dir = null) {
    const card = cards[index], words4 = C.cards[card.id] || { title: card.id, words: '', alt: '' };
    count.textContent = C.count(index + 1, n);
    picture.src = `${base}${card.id}.webp`;
    picture.alt = words4.alt;
    figure.replaceChild(markSvg(known && known[card.id] ? known[card.id].mark : null), figure.lastChild);
    title.textContent = words4.title;
    words.textContent = card.id === 'ahead' ? cards4Ahead(raids) : words4.words;
    text.scrollTop = 0;
    dots.forEach((d, i) => { if (i === index) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    back.disabled = index === 0;
    next.textContent = index === n - 1 ? (finishLabel || C.start) : C.next;
    // Under Full the new card slides in from the side it came from; under Gentle and Still it is simply there (spec 5.4).
    for (const node of [figure, text]) {
      node.classList.remove('pc-in-next', 'pc-in-back');
      if (dir && motion() === 'full') { void node.offsetWidth; node.classList.add(dir === 'next' ? 'pc-in-next' : 'pc-in-back'); }
    }
    if (back.disabled && doc4Active() === back) next.focus();
    if (index + 1 < n) { const pre = new Image(); pre.src = `${base}${cards[index + 1].id}.webp`; }
  }
  const doc4Active = () => (doc && doc.activeElement) || document.activeElement;
  function go(i) {
    if (closed || i < 0 || i >= n || i === index) return;
    const dir = i > index ? 'next' : 'back';
    index = i;
    render(dir);
  }

  // The phone's Back: one history entry while the cards show.
  let pushed = false, popping = false, listening = false;
  function onPop(e) {
    if (popping) { popping = false; e.stopImmediatePropagation(); unlisten(); return; }   // our own entry, taken back
    if (closed) return;
    pushed = false;
    e.stopImmediatePropagation();
    unlisten();
    finish();
  }
  function unlisten() { if (listening) { listening = false; removeListener('popstate', onPop); } }
  if (history && typeof history.pushState === 'function') {
    try { history.pushState({ thebesCards: true }, ''); pushed = true; addListener('popstate', onPop); listening = true; } catch (e) { pushed = false; }
  }

  function teardown() {
    closed = true;
    document.removeEventListener('keydown', guard, true);
    dialog.remove();
    if (pushed) {
      pushed = false;
      popping = true;
      try { history.back(); } catch (e) { popping = false; unlisten(); }
    } else unlisten();
    const to = opener && opener.isConnected ? opener : (openerClasses ? host.querySelector(openerClasses) : null);
    if (to && typeof to.focus === 'function') to.focus();
  }
  function finish() {
    if (closed) return;
    teardown();
    onDone();
  }

  // Moving.
  next.addEventListener('click', () => { if (index === n - 1) finish(); else go(index + 1); });
  back.addEventListener('click', () => go(index - 1));
  skip.addEventListener('click', finish);
  shut.addEventListener('click', finish);
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  let swipe = null;
  stage.addEventListener('pointerdown', (e) => { swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= TUTORIAL.swipePx && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { swipe = null; });
  // Keys: the arrows, Esc and Tab are the cards'; nothing else gets past them to the game.
  function route(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'Tab') {                            // focus stays inside
      const stops = [...dialog.querySelectorAll('button')].filter((b) => !b.disabled && !b.closest('[hidden]'));
      const at = stops.indexOf(doc4Active());
      const to = e.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at < 0 || at === stops.length - 1 ? 0 : at + 1);
      e.preventDefault();
      stops[to].focus();
    }
  }
  dialog.addEventListener('keydown', (e) => {
    e.stopPropagation();                                   // a modal: the game's shortcuts never act behind it
    route(e);
  });
  // A click or tap on the picture, the words or the backdrop moves focus off Next (onto the dialog itself, tabindex -1), and
  // a page that blurs it leaves it on the body: keys then reach the page, not the dialog. While the cards show, a key
  // whose target is outside them is caught first (capturing, on the document) and is the cards' too.
  const guard = (e) => {
    if (closed || dialog.contains(e.target)) return;
    e.stopImmediatePropagation();
    route(e);
  };
  document.addEventListener('keydown', guard, true);

  host.append(dialog);
  render();
  next.focus();
  if (!known) {
    loadMarks(fetchMarks).then((m) => { known = m; if (!closed) figure.replaceChild(markSvg(m[cards[index].id] ? m[cards[index].id].mark : null), figure.lastChild); });
  }

  return {
    element: dialog,
    index: () => index,
    go,
    close() { if (!closed) teardown(); },
  };
}
