// Pause and speed (spec 4.3, 6.3): a corner button in portrait and compact, buttons in the wide top bar.
// The page pauses when hidden and reopens paused; the UI says so when it comes back.
import { setSpeed } from '../sim/commands.js';
import { el, button, iconButton, icon, setText, clear } from './components.js';
import { SPEED_LABELS, T, pauseSpeedText, S46_UX_TEXT } from './text.js';

export function createSpeedControl({ world, store, afterCommand = () => {}, onPausedHidden = () => {}, doc = document }) {
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
      const glyph = icon('▶');
      const word = el('span', { class: 'word' });
      const states = [['▶', T.play], ...[1, 2, 3].map((s) => ['❚❚', SPEED_LABELS[s]])];
      const sizers = states.map(([g, w]) => el('span', { class: 'sizer', 'aria-hidden': 'true' }, [icon(g), el('span', { text: w })]));
      const main = el('button', { type: 'button', class: 'speed-main primary' }, [el('span', { class: 'face' }, [glyph, word]), ...sizers]);
      // The chevron says its word like the other corner buttons (ruling 174): a bare ▴ read as "scroll up". Its name is the same word.
      const chevron = iconButton(T.speed, '▴', { class: 'speed-chevron labelled', 'aria-expanded': 'false' });   // ▴ renders in every system font
      chevron.append(el('span', { class: 'label', text: T.speed }));
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; chevron.setAttribute('aria-expanded', 'false'); } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; chevron.setAttribute('aria-expanded', String(!options.hidden)); });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      const paint = () => {
        const running = world.speed > 0;
        setText(glyph, running ? '❚❚' : '▶');
        setText(word, running ? SPEED_LABELS[world.speed] : T.play);
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
      const buttons = [0, 1, 2, 3].map((s) => el('button', { type: 'button', class: `speed-step step-${s}`, 'aria-label': S46_UX_TEXT.speedStepLabel(s), title: S46_UX_TEXT.speedStepTitle(s), 'aria-pressed': String(world.speed === s), onClick: () => api.set(s) },
        [el('span', { class: 'icon', 'aria-hidden': 'true', text: S46_UX_TEXT.speedGlyphs[s] }), el('span', { class: 'word', 'aria-hidden': 'true', text: s === 0 ? S46_UX_TEXT.pausedWord : SPEED_LABELS[s] })]));
      clear(container);
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', S46_UX_TEXT.speedGroup);
      container.append(...buttons);
      const paint = () => {
        container.dataset.state = world.speed === 0 ? 'paused' : 'playing';
        buttons.forEach((b, s) => b.setAttribute('aria-pressed', String(world.speed === s)));
      };
      paint();
      mounted.push(paint);
    },
    render() { for (const fn of mounted) fn(); },
  };
  return api;
}
