// Pause and speed (spec 4.3, 6.3): a corner button in portrait and compact, buttons in the wide top bar.
// The page pauses when hidden and reopens paused; the UI says so when it comes back.
import { setSpeed } from '../sim/commands.js';
import { el, button, iconButton, setText, clear } from './components.js';
import { SPEED_LABELS, T, pauseSpeedText, S46_UX_TEXT } from './text.js';

// Ruling 419 (Josh: "is it playing or paused?"): the pictures are drawn, not typed. The font's ❚❚ at the old 0.75em ran its two bars into one
// small square beside a full-size ▶. Every picture is one SVG of the same height in currentColor: pause is two solid bars with a clear gap
// (each bar a third of the picture's width, the gap as wide as a bar), play one triangle, the faster speeds two and three, so pause and play
// carry the same weight. data-glyph keeps the old character as the picture's name for tests and for anyone reading the DOM.
const SVG_NS = 'http://www.w3.org/2000/svg';
const PICTURE_H = 14;
export function speedPicture(speed) {
  const n = speed === 0 ? 0 : speed;
  const width = n === 0 ? 12 : 3 + 9 * n;                                   // pause 12 x 14; each triangle 12 wide, the next one 9 along
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${PICTURE_H}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(PICTURE_H));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shape = (tag, attrs) => { const node = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v)); node.setAttribute('fill', 'currentColor'); svg.append(node); };
  if (n === 0) {
    shape('rect', { class: 'bar', x: 0.5, y: 1, width: 4, height: 12, rx: 0.8 });
    shape('rect', { class: 'bar', x: 7.5, y: 1, width: 4, height: 12, rx: 0.8 });
  } else {
    for (let i = 0; i < n; i++) shape('path', { class: 'arrow', d: `M${0.5 + 9 * i} 1 L${12.5 + 9 * i} 7 L${0.5 + 9 * i} 13 Z` });
  }
  const span = el('span', { class: `icon speed-picture ${n === 0 ? 'pause' : 'play'}`, 'aria-hidden': 'true', dataset: { glyph: S46_UX_TEXT.speedGlyphs[n] } }, [svg]);
  return span;
}
let cornerCount = 0;                                                          // ids for the corner tags, one per mounted corner
const cornerPicture = (running) => speedPicture(running ? 0 : 1);           // the corner button shows what a tap does: pause while running, play while paused

// keys(): whether Keyboard shortcuts is on, so a step's title names Space, ] and [ only when they work (final review).
export function createSpeedControl({ world, store, afterCommand = () => {}, onPausedHidden = () => {}, doc = document, keys = () => true }) {
  const mounted = [];     // render callbacks
  const api = {
    set(speed) {
      const r = setSpeed(world, speed);
      if (r.ok) {
        if (speed > 0) store.set({ lastSpeed: speed });
        afterCommand({ kind: 'speed', result: r, text: SPEED_LABELS[speed], undoable: false });
        api.render();
      }
      return r;
    },
    toggle: () => api.set(world.speed === 0 ? store.get().lastSpeed : 0),
    faster: () => api.set(Math.min(3, world.speed + 1)),
    slower: () => api.set(Math.max(0, world.speed - 1)),
    pauseForHidden() { if (world.speed > 0) { api.set(0); return true; } return false; },
    watchVisibility() {
      let pausedByUs = false;
      const onChange = () => {
        if (doc.hidden) { pausedByUs = api.pauseForHidden() || pausedByUs; return; }
        if (pausedByUs) { pausedByUs = false; onPausedHidden(); }
      };
      doc.addEventListener('visibilitychange', onChange);
      return () => doc.removeEventListener('visibilitychange', onChange);
    },
    mountCorner(container) {
      // The main button says what a tap does (early-game pass 2.9): "▶ Play" when paused, "❚❚ 2×" (the speed) when running.
      // Hidden copies of every state it can show sit in the same grid cell as the face (css/ui.css), so the button is
      // always as wide as its widest state and the chevron beside it never slides from under a second tap.
      // Ruling 419: the state is said as well as the action. Paused, the button turns amber with a heavy edge (the wide bar's Paused step) and a
      // "Paused" tag sits on its top edge, outside the button's own height, so the corner row keeps its height; running it stays lapis. Its
      // name stays the action (Play, or Pause and the speed) and its description is the state, for a screen reader.
      const face = el('span', { class: 'face' });
      const word = el('span', { class: 'word' });
      const states = [[false, T.play], ...[1, 2, 3].map((s) => [true, SPEED_LABELS[s]])];
      const sizers = states.map(([running, w]) => el('span', { class: 'sizer', 'aria-hidden': 'true' }, [cornerPicture(running), el('span', { text: w })]));
      const stateId = `speed-state-${++cornerCount}`;
      const tag = el('span', { class: 'state-tag', id: stateId });
      const main = el('button', { type: 'button', class: 'speed-main primary', 'aria-describedby': stateId }, [face, ...sizers, tag]);
      // The chevron says its word like the other corner buttons (ruling 174): a bare ▴ read as "scroll up". Its name is the same word.
      const chevron = iconButton(T.speed, '▴', { class: 'speed-chevron labelled', 'aria-expanded': 'false' });   // ▴ renders in every system font
      chevron.append(el('span', { class: 'label', text: T.speed }));
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; chevron.setAttribute('aria-expanded', 'false'); } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; chevron.setAttribute('aria-expanded', String(!options.hidden)); });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      let shown = null;
      const paint = () => {
        const running = world.speed > 0;
        if (shown !== running) { shown = running; clear(face); face.append(cornerPicture(running), word); }
        setText(word, running ? SPEED_LABELS[world.speed] : T.play);
        setText(tag, running ? S46_UX_TEXT.playingState(SPEED_LABELS[world.speed]) : S46_UX_TEXT.pausedWord);
        main.dataset.state = running ? 'playing' : 'paused';
        main.setAttribute('aria-label', running ? pauseSpeedText(world.speed) : T.play);
      };
      paint();
      mounted.push(paint);
    },
    // The wide top bar (ruling 404): Pause and the three speeds as one row of steps. Every step has a picture and a name that says what pressing it
    // does; the pressed step is the state, and it can be read without colour: it is filled and it alone carries its word ("Paused", or the
    // speed "2×"), where the others are a picture alone, which keeps the whole row about as wide as the old four words were. data-state on the
    // bar says playing or paused, which the stylesheet uses to tell the two apart by more than the one step.
    mountBar(container) {
      const buttons = [0, 1, 2, 3].map((s) => el('button', { type: 'button', class: `speed-step step-${s}`, 'aria-label': S46_UX_TEXT.speedStepLabel(s), title: S46_UX_TEXT.speedStepTitle(s, keys()), 'aria-pressed': String(world.speed === s), onClick: () => api.set(s) },
        [speedPicture(s), el('span', { class: 'word', 'aria-hidden': 'true', text: s === 0 ? S46_UX_TEXT.pausedWord : SPEED_LABELS[s] })]));
      clear(container);
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', S46_UX_TEXT.speedGroup);
      container.append(...buttons);
      const paint = () => {
        container.dataset.state = world.speed === 0 ? 'paused' : 'playing';
        container.setAttribute('aria-description', world.speed === 0 ? S46_UX_TEXT.pausedWord : S46_UX_TEXT.playingState(SPEED_LABELS[world.speed]));   // ruling 419: the state, for a screen reader
        buttons.forEach((b, s) => { b.setAttribute('aria-pressed', String(world.speed === s)); b.title = S46_UX_TEXT.speedStepTitle(s, keys()); });
      };
      paint();
      mounted.push(paint);
    },
    render() { for (const fn of mounted) fn(); },
  };
  return api;
}
