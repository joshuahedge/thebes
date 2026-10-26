// Version 8.1 Track T (ruling 1201): Ipi, the king's scribe. The portrait is drawn in code and reads at 48 px; say(text, { anchor, ms, onDone }) is the one bubble Tracks B and D
// call: docked under the top bar, or pinned beside a control and kept inside the screen; it fades by itself, a new line replaces it, and onDone runs once each way.
import { describe, it, expect } from '../../harness.js';
import { portrait, mountScribe, unmountScribe, say, hush, speaking, bubbleOf, SAY_MS } from '../../../src/ui/v81/scribe.js';
import { mountShell } from '../../helpers/uiWorld.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rect = (n) => n.getBoundingClientRect();

describe('v81 t scribe: Ipi\'s portrait', () => {
  it('is an SVG drawn in the game\'s own colours, decoration only, at the size asked for, with a disc and a gold rim', () => {
    const p = portrait(48);
    expect([p.tagName.toLowerCase(), p.getAttribute('width'), p.getAttribute('viewBox'), p.getAttribute('aria-hidden')]).toEqual(['svg', '48', '0 0 48 48', 'true']);
    const fills = [...p.querySelectorAll('[fill]')].map((n) => n.getAttribute('fill').toUpperCase());
    const strokes = [...p.querySelectorAll('[stroke]')].map((n) => n.getAttribute('stroke').toUpperCase());
    for (const c of ['#1C3768', '#2B1F0E']) expect([c, fills.includes(c)]).toEqual([c, true]);   // the lapis disc, the black wig
    for (const c of ['#E2B13C', '#3A9E96']) expect([c, strokes.includes(c)]).toEqual([c, true]); // the gold rim and pen, the turquoise collar
    const a = portrait(36), b = portrait(36);
    expect(a.querySelector('clipPath').id === b.querySelector('clipPath').id).toBe(false);       // two on one page never share a clip
  });
});

describe('v81 t scribe: say()', () => {
  it('does nothing before the interface mounts the scribe, and its handle is safe to close', () => {
    unmountScribe();
    const h = say('Hello');
    h.close();
    expect([speaking(), bubbleOf()]).toEqual([false, null]);
  });

  it('docks under the top bar as the guidance place\'s first row, a polite status with the portrait, and fades by itself, calling onDone once', async () => {
    const shell = await mountShell(390, 844);
    try {
      mountScribe(shell.root);
      let done = 0;
      say('The road reaches the green land.', { ms: 120, onDone: () => { done++; } });
      const b = bubbleOf();
      expect([b.parentElement.id, b.parentElement.firstElementChild === b, b.getAttribute('role'), b.getAttribute('aria-live'), b.hidden, b.textContent]).toEqual(['under-bar', true, 'status', 'polite', false, 'The road reaches the green land.']);
      expect([Boolean(b.querySelector('svg.scribe-portrait')), b.classList.contains('pinned'), getComputedStyle(b).pointerEvents]).toEqual([true, false, 'none']);
      const bar = rect(shell.root.querySelector('#topbar')), r = rect(b);
      expect(r.top >= bar.bottom - 1).toBe(true);
      await wait(520);
      expect([b.hidden, done, speaking()]).toEqual([true, 1, false]);
      expect(SAY_MS >= 2000 && SAY_MS <= 3000).toBe(true);                                       // the design's 2 to 3 seconds
    } finally { unmountScribe(); shell.cleanup(); }
  });

  it('one line at a time: a new line replaces the one showing (its onDone runs then), close() and hush() end it, and ms 0 stays until then', async () => {
    const shell = await mountShell(390, 844);
    try {
      mountScribe(shell.root);
      const log = [];
      const first = say('One', { ms: 0, onDone: () => log.push('one') });
      await wait(60);
      expect([speaking(), bubbleOf().textContent]).toEqual([true, 'One']);
      say('Two', { ms: 0, onDone: () => log.push('two') });
      expect([log, bubbleOf().textContent]).toEqual([['one'], 'Two']);
      first.close();                                                                             // an old handle no longer closes the new line
      expect(speaking()).toBe(true);
      hush();
      expect([log, speaking(), bubbleOf().hidden]).toEqual([['one', 'two'], false, true]);
    } finally { unmountScribe(); shell.cleanup(); }
  });

  it('pinned to a control, it sits beside it (above when there is room, else below), inside the screen by 16 px', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const shell = await mountShell(w, h);
      try {
        mountScribe(shell.root);
        const box = rect(shell.root);
        const low = document.createElement('button'), high = document.createElement('button');
        low.style.cssText = `position:absolute;left:${w - 60}px;top:${h - 70}px;width:44px;height:44px;`;
        high.style.cssText = 'position:absolute;left:4px;top:4px;width:44px;height:44px;';
        shell.root.querySelector('#ui').append(low, high);
        say('First the road; the rest comes soon.', { anchor: low, ms: 0 });
        let b = rect(bubbleOf());
        expect([`${w}x${h}`, bubbleOf().dataset.side, b.bottom <= rect(low).top + 0.5, b.left >= box.left + 15.5, b.right <= box.right - 15.5, b.top >= box.top + 15.5]).toEqual([`${w}x${h}`, 'above', true, true, true, true]);
        say('First the road; the rest comes soon.', { anchor: high, ms: 0 });
        b = rect(bubbleOf());
        expect([`${w}x${h}`, bubbleOf().dataset.side, b.top >= rect(high).bottom - 0.5, b.left >= box.left + 15.5]).toEqual([`${w}x${h}`, 'below', true, true]);
        hush();
        expect(bubbleOf().hasAttribute('style')).toBe(false);                                    // docked again next time
      } finally { unmountScribe(); shell.cleanup(); }
    }
  });
});
