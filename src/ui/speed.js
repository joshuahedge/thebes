// Pause and speed (spec 4.3, 6.3): a corner button in portrait and compact, buttons in the wide top bar.
// The page pauses when hidden and reopens paused; the UI says so when it comes back.
import { setSpeed } from '../sim/commands.js';
import { el, button, iconButton, setText, clear } from './components.js';
import { SPEED_LABELS, T } from './text.js';

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
        if (doc.hidden) { pausedByUs = api.pauseForHidden(); return; }
        if (pausedByUs) { pausedByUs = false; onPausedHidden(); }
      };
      doc.addEventListener('visibilitychange', onChange);
      return () => doc.removeEventListener('visibilitychange', onChange);
    },
    mountCorner(container) {
      const main = button(SPEED_LABELS[world.speed], { class: 'speed-main primary', 'aria-label': `${T.speed}: ${SPEED_LABELS[world.speed]}` });
      const chevron = iconButton(T.speed, '⌄', { class: 'speed-chevron' });
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      mounted.push(() => { setText(main, SPEED_LABELS[world.speed]); main.setAttribute('aria-label', `${T.speed}: ${SPEED_LABELS[world.speed]}`); });
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
