import { describe, it, expect } from '../harness.js';
import { createToasts } from '../../src/ui/toasts.js';
import { TOAST_MS } from '../../src/data/ui.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

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
  it('keeps as many as it is told: one makes the newest replace the last, a function is asked each time', () => {
    const { root, cleanup } = mount();
    let max = 1;
    const toasts = createToasts({ container: root, max: () => max });
    toasts.show('Road laid', { action: 'Undo' });
    toasts.show('Plots laid', { action: 'Undo' });
    expect([...root.querySelectorAll('.toast')].map((n) => n.querySelector('.text').textContent)).toEqual(['Plots laid']);
    max = 2;
    toasts.show('Undone');
    expect([...root.querySelectorAll('.toast')].map((n) => n.querySelector('.text').textContent)).toEqual(['Plots laid', 'Undone']);
    cleanup();
  });
  it('shows one toast at a time on a phone and two on a wide screen', async () => {
    for (const [w, h, count] of [[390, 844, 1], [375, 667, 1], [667, 375, 1], [1280, 800, 2]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.toasts.show('Road laid', { action: 'Undo' });
        r.ui.toasts.show('Plots laid', { action: 'Undo' });
        r.ui.toasts.show('Undone');
        const texts = [...r.root.querySelectorAll('#toasts .toast .text')].map((n) => n.textContent);
        expect([w, texts]).toEqual([w, ['Road laid', 'Plots laid', 'Undone'].slice(3 - count)]);
      } finally { r.cleanup(); }
    }
  });
  it('lets a toast use the phone screen width up to 420 px, with 16 px at each side, at every text size', async () => {
    const words = 'Housing plots: 6, 60 gold';
    for (const [w, h] of [[375, 667], [390, 844], [360, 640]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.ui.toasts.show(words, { action: 'Undo' });
          const at = `${w}x${h} at ${size}%`, shell = r.root.getBoundingClientRect(), t = r.root.querySelector('#toasts .toast').getBoundingClientRect();
          const lineH = parseFloat(getComputedStyle(r.root.querySelector('#toasts .toast .text')).lineHeight) || 24 * size / 100;
          expect([at, t.left >= shell.left + 15.5, t.right <= shell.right - 15.5, t.width <= 420.5]).toEqual([at, true, true, true]);
          expect([at, t.width > w / 2 + 40]).toEqual([at, true]);                     // more than the old half-screen box
          expect([at, r.root.querySelector('#toasts .toast .text').getBoundingClientRect().height <= lineH * 2.5]).toEqual([at, true]);   // a few lines, not a word a line
          expect([at, Math.abs((t.left + t.right) / 2 - (shell.left + shell.right) / 2) < 1]).toEqual([at, true]);
        } finally { r.cleanup(); }
      }
    }
    const wide = await rigUI({ width: 1280, height: 800 });                       // wide stays as it was: centred over the map beside the panel
    try {
      wide.ui.toasts.show('Placed');
      const t = wide.root.querySelector('#toasts .toast').getBoundingClientRect(), panel = wide.root.querySelector('#panel').getBoundingClientRect();
      expect([t.right <= panel.left, t.width < 200]).toEqual([true, true]);
    } finally { wide.cleanup(); }
  });
  it('keeps a phone toast above the corner buttons, whatever the text size (spec 6.3)', async () => {
    for (const [w, h] of [[375, 667], [390, 844], [360, 640]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.ui.toasts.show('Housing plots: 6 laid for 60 gold', { action: 'Undo' });
          const at = `${w}x${h} at ${size}%`, t = r.root.querySelector('#toasts .toast').getBoundingClientRect();
          const tops = [...r.root.querySelectorAll('#corners button')].map((b) => b.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.top);
          expect([at, tops.length > 0]).toEqual([at, true]);
          expect([at, t.bottom <= Math.min(...tops) + 0.5]).toEqual([at, true]);      // the Speed label makes the corner row taller as the text grows
        } finally { r.cleanup(); }
      }
    }
  });
  it('keeps a compact toast on the map side of the rail', async () => {
    const r = await rigUI({ width: 667, height: 375 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.ui.toasts.show('Housing plots: 6 laid for 60 gold', { action: 'Undo' });
      const t = r.root.querySelector('#toasts .toast').getBoundingClientRect(), rail = r.root.querySelector('#rail').getBoundingClientRect(), shell = r.root.getBoundingClientRect();
      expect([t.left >= shell.left + 15.5, t.right <= rail.left - 15.5, t.width <= 420.5]).toEqual([true, true, true]);
    } finally { r.cleanup(); }
  });
});
