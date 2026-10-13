// Stage 4.6 wave 2 integration: the fixes the wave's reviewers left after the River, Wonders and UX tracks merged (rulings 419 on).
// Describe names start with 's46 wave2'.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { S46_UX_TEXT, SPEED_LABELS, T } from '../../../src/ui/text.js';

const rect = (node) => node.getBoundingClientRect();

// ── Play and pause read at a glance (ruling 419, Josh's ask) ──
describe('s46 wave2 play and pause', () => {
  // The pause picture: two bars, each clearly apart (a gap at least as wide as a bar's third), as tall as the play triangle beside it.
  const pauseBarsApart = (picture) => {
    const bars = [...picture.querySelectorAll('.bar')].map(rect);
    if (bars.length !== 2) return false;
    const gap = bars[1].left - bars[0].right;
    return gap >= 2 && gap >= bars[0].width * 0.5 && bars[0].height >= 8 && Math.abs(bars[0].height - bars[1].height) < 0.5;
  };
  it('draws pause as two clear bars as tall as play, in the wide bar at 1280x800 and on the phone corner at 390x844', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const steps = [...r.root.querySelectorAll('#topbar .speed-bar .speed-step')];
      const pause = steps[0].querySelector('.speed-picture'), play = steps[1].querySelector('.speed-picture');
      expect(pauseBarsApart(pause)).toBe(true);
      expect(Math.abs(rect(pause.querySelector('svg')).height - rect(play.querySelector('svg')).height) < 0.5).toBe(true);   // same weight
      expect(rect(pause.querySelector('svg')).height >= 13).toBe(true);           // not the old 0.75em glyph
      expect(steps.map((b) => b.querySelector('.speed-picture').dataset.glyph)).toEqual(S46_UX_TEXT.speedGlyphs);
    } finally { r.cleanup(); }
    const p = await rigUI({ width: 390, height: 844 });
    try {
      p.ui.speedControl.set(2);
      const main = p.root.querySelector('#corners .speed-main');
      const pause = main.querySelector('.face .speed-picture');
      expect(pause.dataset.glyph).toBe(S46_UX_TEXT.speedGlyphs[0]);
      expect(pauseBarsApart(pause)).toBe(true);
      const pauseH = rect(pause.querySelector('svg')).height;
      p.ui.speedControl.set(0);
      const play = main.querySelector('.face .speed-picture');
      expect(play.dataset.glyph).toBe(S46_UX_TEXT.speedGlyphs[1]);
      expect(Math.abs(rect(play.querySelector('svg')).height - pauseH) < 0.5).toBe(true);
    } finally { p.cleanup(); }
  });
  it('says the state on the phone as well as the action: paused is amber with a Paused tag, playing lapis; both in the description', async () => {
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        const main = r.root.querySelector('#corners .speed-main');
        const tag = r.root.querySelector(`#${main.getAttribute('aria-describedby')}`);
        r.ui.speedControl.set(0);
        const pausedFill = getComputedStyle(main).backgroundColor;
        const shown = (node) => getComputedStyle(node).display !== 'none' && rect(node).width > 2;
        expect([size, main.dataset.state, tag.textContent, shown(tag), main.getAttribute('aria-label')]).toEqual([size, 'paused', S46_UX_TEXT.pausedWord, true, T.play]);
        const t = rect(tag), m = rect(main), shell = r.root.getBoundingClientRect();
        expect([size, t.left >= shell.left, t.right <= m.right + 0.5 || t.right <= shell.right, t.bottom > m.top, t.top < m.top]).toEqual([size, true, true, true, true]);   // on the button's top edge, on screen
        const heightPaused = m.height;
        r.ui.speedControl.set(3);
        expect([size, main.dataset.state, tag.textContent, shown(tag)]).toEqual([size, 'playing', S46_UX_TEXT.playingState(SPEED_LABELS[3]), false]);
        expect(getComputedStyle(main).backgroundColor === pausedFill).toBe(false);   // a different fill, as well as the picture and the word
        expect(Math.abs(rect(main).height - heightPaused) < 0.5).toBe(true);           // the tag costs the corner row no height
      } finally { r.cleanup(); }
    }
  });
  it('gives the wide bar its state for a screen reader, paused and playing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#topbar .speed-bar');
      r.ui.speedControl.set(0);
      expect(bar.getAttribute('aria-description')).toBe(S46_UX_TEXT.pausedWord);
      r.ui.speedControl.set(2);
      expect(bar.getAttribute('aria-description')).toBe(S46_UX_TEXT.playingState(SPEED_LABELS[2]));
    } finally { r.cleanup(); }
  });
});
