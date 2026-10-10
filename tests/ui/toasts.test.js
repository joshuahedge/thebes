import { describe, it, expect } from '../harness.js';
import { createToasts } from '../../src/ui/toasts.js';
import { TOAST_MS } from '../../src/data/ui.js';
import { mount, fire } from '../helpers/dom.js';

function fakeTimers() {
  const timers = [];
  return {
    timers,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: (id) => { timers[id - 1] = null; },
    fire: (id) => { const t = timers[id - 1]; if (t) { timers[id - 1] = null; t.fn(); } },
  };
}

describe('ui toasts', () => {
  it('shows a toast that times out, an action that runs and dismisses, and keeps at most two', () => {
    const { root, cleanup } = mount();
    const ft = fakeTimers();
    const toasts = createToasts({ container: root, setTimer: ft.setTimer, clearTimer: ft.clearTimer });
    toasts.show('Placed');
    expect(root.querySelectorAll('.toast').length).toBe(1);
    expect(ft.timers[0].ms).toBe(TOAST_MS);
    ft.fire(1);
    expect(root.querySelectorAll('.toast').length).toBe(0);
    let undone = 0;
    const t = toasts.show('Road laid', { action: 'Undo', onAction: () => undone++, ms: 6000 });
    expect(t.querySelector('button').textContent).toBe('Undo');
    expect(ft.timers[1].ms).toBe(6000);
    fire(t.querySelector('button'), 'click');
    expect(undone).toBe(1);
    expect(root.querySelectorAll('.toast').length).toBe(0);
    expect(ft.timers[1]).toBe(null);                 // the timer was cleared with the toast
    toasts.show('one'); toasts.show('two'); toasts.show('three');
    const texts = [...root.querySelectorAll('.toast')].map((n) => n.textContent);
    expect(texts).toEqual(['two', 'three']);
    toasts.clear();
    expect(root.querySelectorAll('.toast').length).toBe(0);
    cleanup();
  });
});
