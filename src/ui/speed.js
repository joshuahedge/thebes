// Pause and speed (spec 4.3, 6.3): a corner button in portrait and compact, buttons in the wide top bar.
// The page pauses when hidden and reopens paused; the UI says so when it comes back.
import { setSpeed } from '../sim/commands.js';
import { el, button, iconButton, icon, setText, clear } from './components.js';
import { SPEED_LABELS, T, pauseSpeedText } from './text.js';

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
      const chevron = iconButton(T.speed, '▴', { class: 'speed-chevron', 'aria-expanded': 'false' });   // ▴ renders in every system font
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
    mountBar(container) {
      const buttons = [0, 1, 2, 3].map((s) => button(SPEED_LABELS[s], { 'aria-pressed': String(world.speed === s), onClick: () => api.set(s) }));
      clear(container);
      container.append(...buttons);
      mounted.push(() => buttons.forEach((b, s) => b.setAttribute('aria-pressed', String(world.speed === s))));
    },
    render() { for (const fn of mounted) fn(); },
  };
  return api;
}
