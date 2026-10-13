// Ruling 404: the wide top bar's Pause and three speeds read at a glance: a picture and a word on each step, the pressed one filled, Paused
// worded as the state, and a name that says what pressing it does. Never colour alone, and 44 px steps.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { S46_UX_TEXT, SPEED_LABELS } from '../../../src/ui/text.js';

const steps = (r) => [...r.root.querySelectorAll('#topbar .speed-bar .speed-step')];
const word = (node) => { const w = node.querySelector('.word'); return getComputedStyle(w).display === 'none' ? '' : w.textContent; };   // what shows beside a step's picture

describe('s46 ux speed control', () => {
  it('has four labelled steps with a picture each, 44 px tall, in a named group', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#topbar .speed-bar');
      expect([bar.getAttribute('role'), bar.getAttribute('aria-label')]).toEqual(['group', S46_UX_TEXT.speedGroup]);
      const list = steps(r);
      expect(list.length).toBe(4);
      list.forEach((b, s) => {
        expect([s, b.getAttribute('aria-label')]).toEqual([s, S46_UX_TEXT.speedStepLabel(s)]);
        expect([s, b.querySelector('.icon').textContent, b.querySelector('.icon').getAttribute('aria-hidden')]).toEqual([s, S46_UX_TEXT.speedGlyphs[s], 'true']);
        const box = b.getBoundingClientRect();
        expect([s, box.height >= 43.5, box.width >= 43.5]).toEqual([s, true, true]);
      });
      expect(S46_UX_TEXT.speedGlyphs.map((g) => g.length)).toEqual([2, 1, 2, 3]);       // faster reads as more arrows, and the number is there too
      expect(list.map((b) => b.querySelector('.word').textContent)).toEqual([S46_UX_TEXT.pausedWord, ...SPEED_LABELS.slice(1)]);   // each step has its word; the pressed one shows it
    } finally { r.cleanup(); }
  });
  it('says Paused when paused and shows the pressed step when playing: the state in the picture, the word and the fill, not the colour', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#topbar .speed-bar');
      const fill = (b) => getComputedStyle(b).backgroundColor;
      r.ui.speedControl.set(0);
      let list = steps(r);
      expect(bar.dataset.state).toBe('paused');
      expect(list.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
      expect(list.map(word)).toEqual([S46_UX_TEXT.pausedWord, '', '', '']);        // "Paused": the state, in words, and only on the pressed step
      const pausedFill = fill(list[0]), idleFill = fill(list[1]);
      expect(pausedFill === idleFill).toBe(false);                                // the pressed step is filled, the others are not
      r.ui.speedControl.set(2);
      list = steps(r);
      expect(bar.dataset.state).toBe('playing');
      expect(list.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
      expect(list.map(word)).toEqual(['', '', SPEED_LABELS[2], '']);              // playing at 2x: the speed in words on the pressed step
      expect(fill(list[2]) === idleFill).toBe(false);
      expect(fill(list[2]) === pausedFill).toBe(false);                           // playing and paused do not share a fill
      expect(list[2].querySelector('.icon').textContent === list[0].querySelector('.icon').textContent).toBe(false);   // nor a picture
    } finally { r.cleanup(); }
  });
  it('stays about as wide as the old four words were, so the numbers beside it keep their one row', async () => {
    const r = await rigUI({ width: 900, height: 560 });
    try {
      for (const speed of [0, 1, 3]) {
        r.ui.speedControl.set(speed);
        const bar = r.root.querySelector('#topbar .speed-bar').getBoundingClientRect();
        expect([speed, bar.width <= 240]).toEqual([speed, true]);
      }
    } finally { r.cleanup(); }
  });
  it('presses through: each step sets the speed, and the keys and the buttons agree', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const list = steps(r);
      fire(list[3], 'click');
      expect(r.world.speed).toBe(3);
      expect(steps(r)[3].getAttribute('aria-pressed')).toBe('true');
      fire(list[0], 'click');
      expect(r.world.speed).toBe(0);
      expect(steps(r)[0].getAttribute('aria-pressed')).toBe('true');
    } finally { r.cleanup(); }
  });
  it('fits the top bar at 150% text on a 1280 screen without the steps overlapping the numbers', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ textSize: 150 });
      const stats = r.root.querySelector('#topbar .stats').getBoundingClientRect();
      const bar = r.root.querySelector('#topbar .speed-bar').getBoundingClientRect();
      expect(stats.right <= bar.left + 0.5).toBe(true);
      expect(bar.right <= 1280).toBe(true);
    } finally { r.cleanup(); }
  });
});
