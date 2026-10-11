import { describe, it, expect } from '../harness.js';
import { createNudge, nudgeLineText, NUDGE_MAX_STEP_MS } from '../../src/ui/nudge.js';
import { NUDGE_GLOW_MS, NUDGE_LINE_MS } from '../../src/data/ui.js';
import { GOALS } from '../../src/data/goals.js';
import { alertText, T } from '../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { openSheet, closeSheet } from '../../src/ui/modes.js';
import { tickDay } from '../../src/sim/clock.js';
import { rigUI } from '../helpers/uiWorld.js';

// The nudge on a clock the test moves, ticked every half second like a slow frame rate.
function machine() {
  const clock = { t: 0 };
  const nudge = createNudge({ now: () => clock.t });
  nudge.tick({ running: false, busy: false });
  const run = (ms, opts = { running: true, busy: false }) => {
    let state = 'none';
    for (let done = 0; done < ms; done += 500) { clock.t += 500; state = nudge.tick(opts); }
    return state;
  };
  return { clock, nudge, run };
}

describe('ui nudge', () => {
  it('glows after 45 s of idle play, shows one line 60 s later, then stays quiet until an action', () => {
    const m = machine();
    expect(NUDGE_GLOW_MS).toBe(45000);
    expect(NUDGE_LINE_MS).toBe(60000);
    expect(m.run(NUDGE_GLOW_MS - 500)).toBe('none');
    expect(m.run(500)).toBe('glow');
    expect(m.run(NUDGE_LINE_MS - 500)).toBe('glow');
    expect(m.run(500)).toBe('line');
    expect(m.run(10 * 60 * 1000)).toBe('line');                                // one line: no third stage, no repeat
    m.nudge.noteAction();
    expect(m.run(500)).toBe('none');
  });
  it('counts neither paused nor busy time, and a stalled frame counts one second at most', () => {
    const m = machine();
    expect(m.run(NUDGE_GLOW_MS * 3, { running: false, busy: false })).toBe('none');
    expect(m.run(NUDGE_GLOW_MS * 3, { running: true, busy: true })).toBe('none');
    m.clock.t += 10 * 60 * 1000;                                               // a hidden tab
    expect(m.nudge.tick({ running: true, busy: false })).toBe('none');
    expect(m.run(NUDGE_GLOW_MS - NUDGE_MAX_STEP_MS - 500)).toBe('none');
    expect(m.run(500)).toBe('glow');
  });
  it('starts again when goal progress moves, not when the same progress is noted', () => {
    const m = machine();
    m.nudge.noteProgress('0|road|0');
    expect(m.run(NUDGE_GLOW_MS)).toBe('glow');
    m.nudge.noteProgress('0|road|0');
    expect(m.run(500)).toBe('glow');
    m.nudge.noteProgress('1|plots|0');
    expect(m.run(500)).toBe('none');
  });
  it('names an affordable fix for the first problem, else the open goal', () => {
    const w = makeTestWorld({ gold: 100 });
    const well = addRaw(w, 'well', 20, 20);                                     // no road beside it
    const noRoad = { code: 'no_road', id: well.id };
    const goal = GOALS[0];
    const t = alertText(noRoad, w);
    expect(nudgeLineText(w, [noRoad], goal)).toBe(`${T.next}: ${t.title}. ${t.fix}`);
    w.gold = 0;
    expect(nudgeLineText(w, [noRoad, { code: 'bazaar_empty', id: well.id }], goal)).toBe(`${T.next}: ${goal.text}`);   // nothing it can pay for
    expect(nudgeLineText(w, [{ code: 'save_failed' }], null)).toBe('');
    w.gold = -10;
    const debt = alertText({ code: 'debt' }, w);
    expect(nudgeLineText(w, [{ code: 'debt' }], goal)).toBe(`${T.next}: ${debt.title}. ${debt.fix}`);   // getting out of debt costs nothing
  });
  it('in the game: Show me glows after 45 s of idle play, one Next line follows, and a command clears both', async () => {
    const r = await rigUI();
    try {
      r.ui.speedControl.set(1);
      const showMe = () => r.root.querySelector('#goals .show-me');
      const line = () => r.root.querySelector('#goals .nudge-line');
      let t = 0;
      const play = (ms) => { const end = t + ms; while (t < end) { t += 1000; r.frame(t); } };
      r.frame(0);
      play(NUDGE_GLOW_MS - 1000);
      expect(showMe().classList.contains('glow')).toBe(false);
      play(1000);
      expect(showMe().classList.contains('glow')).toBe(true);
      expect(line().hidden).toBe(true);
      play(NUDGE_LINE_MS);
      expect(showMe().classList.contains('glow')).toBe(false);
      expect(line().hidden).toBe(false);
      expect(line().textContent.startsWith(`${T.next}: `)).toBe(true);
      r.ui.speedControl.set(2);                                                 // any command is an action
      play(1000);
      expect(line().hidden).toBe(true);
      expect(showMe().classList.contains('glow')).toBe(false);
      r.ui.settings.set({ help: 'off' });
      play(NUDGE_GLOW_MS + 1000);
      expect(showMe().classList.contains('glow')).toBe(false);                  // Help: Off silences it
    } finally { r.cleanup(); }
  });
  it('in the game: the Next line sits under the strip in a polite live region that takes no height until the line shows', async () => {
    const r = await rigUI();
    try {
      const goals = r.root.querySelector('#goals'), strip = r.root.querySelector('#goals .goal-strip');
      const region = r.root.querySelector('#goals .nudge'), line = r.root.querySelector('#goals .nudge-line');
      expect(region.getAttribute('aria-live')).toBe('polite');                  // announced when the line appears, not stolen focus
      expect(line.parentElement).toBe(region);
      expect(getComputedStyle(region).display === 'none').toBe(false);          // rendered while the line is hidden, so the first line is announced
      expect(region.getBoundingClientRect().height).toBeLessThan(1);
      const above = r.root.querySelector('#goals .threshold:not([hidden])') || strip;   // Stage 3: the next-threshold bar sits between them
      expect(Math.abs(goals.getBoundingClientRect().bottom - above.getBoundingClientRect().bottom)).toBeLessThan(0.5);
      r.ui.speedControl.set(1);
      let t = 0;
      r.frame(0);
      while (t < NUDGE_GLOW_MS + NUDGE_LINE_MS) { t += 1000; r.frame(t); }
      expect(line.hidden).toBe(false);
      expect(line.getBoundingClientRect().top).toBeGreaterThanOrEqual(strip.getBoundingClientRect().bottom);
      expect(Math.abs(goals.getBoundingClientRect().bottom - line.getBoundingClientRect().bottom)).toBeLessThan(0.5);
      expect(r.root.querySelector('#under-bar').getBoundingClientRect().bottom).toBeLessThan(844 * 0.45);   // nothing over the middle of the map
      expect(getComputedStyle(line).pointerEvents).toBe('none');                // taps go through to the map
    } finally { r.cleanup(); }
  });
  it('in the game: opening a sheet or starting a tool is an action and neither counts as idle time, and Tips only keeps the nudge', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ help: 'tips' });
      r.ui.speedControl.set(1);
      const showMe = () => r.root.querySelector('#goals .show-me');
      let t = 0;
      const play = (ms) => { const end = t + ms; while (t < end) { t += 1000; r.frame(t); } };
      r.frame(0);
      play(30000);
      r.store.set(openSheet(r.store.get(), 'menu'));
      play(NUDGE_GLOW_MS * 3);
      expect(showMe().classList.contains('glow')).toBe(false);                  // a sheet is open: not idle time
      r.store.set(closeSheet(r.store.get()));
      play(NUDGE_GLOW_MS - 1000);
      expect(showMe().classList.contains('glow')).toBe(false);                  // opening it was an action: the count started again, not from the 30 s
      play(30000);                                                              // now glowing; a card picked is an action too
      expect(showMe().classList.contains('glow')).toBe(true);
      r.ui.placement.start({ kind: 'road' });
      play(NUDGE_GLOW_MS * 3);
      expect(showMe().classList.contains('glow')).toBe(false);                  // a tool is active: not idle time
      r.ui.placement.cancel();
      play(NUDGE_GLOW_MS - 1000);
      expect(showMe().classList.contains('glow')).toBe(false);
      play(1000);
      expect(showMe().classList.contains('glow')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('in the game: a goal that moves starts the count again, and the glow is a still gold ring', async () => {
    const r = await rigUI();
    try {
      r.ui.speedControl.set(1);
      const showMe = () => r.root.querySelector('#goals .show-me');
      const line = () => r.root.querySelector('#goals .nudge-line');
      let t = 0;
      const play = (ms) => { const end = t + ms; while (t < end) { t += 1000; r.frame(t); } };
      r.frame(0);
      play(NUDGE_GLOW_MS);
      expect(showMe().classList.contains('glow')).toBe(true);
      expect(getComputedStyle(showMe()).boxShadow.includes('226, 177, 60')).toBe(true);   // gold, whether the ring is pulsing or at rest
      const goal = showMe().getAttribute('aria-label');
      tickDay(r.world, []);                                                     // a game day finishes the road goal: progress, with no command to reset the count
      expect(r.world.goals.completed).toContain('road');
      play(NUDGE_LINE_MS + 10000);
      expect(showMe().getAttribute('aria-label') === goal).toBe(false);          // the strip moved on to the next goal
      expect(line().hidden).toBe(true);                                         // 70 s on, the old count would have shown its line at 60 s
      expect(showMe().classList.contains('glow')).toBe(true);                   // and the new count glowed 45 s after the goal moved
    } finally { r.cleanup(); }
  });
  it('draws the glow and the Play ring as a gold ring that pulses twice, under one flash a second, and only still under reduced motion', () => {
    // The authored rules, read from the stylesheet: the page's own reduced-motion media rule switches every animation off
    // in a browser that reports the preference (headless Edge does), so a computed animation name cannot show what they say.
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
    const styleOf = (selector) => rules.find((r) => r.selectorText && r.selectorText.split(', ').includes(selector)).style;
    for (const selector of ['.goal-strip .show-me.glow', 'body.nudge-play .speed-main', 'body.nudge-play #topbar .speed-bar']) {
      const s = styleOf(selector);
      expect(s.animationName).toBe('nudge-glow');
      expect(s.animationDuration).toBe('1.2s');                                 // a flash every 1.2 s
      expect(s.animationIterationCount).toBe('2');                              // two cycles, then the ring stays
      expect(s.boxShadow.includes('var(--gold)')).toBe(true);
    }
    for (const selector of ['body.reduce-motion .goal-strip .show-me.glow', 'body.reduce-motion.nudge-play .speed-main', 'body.reduce-motion.nudge-play #topbar .speed-bar']) {
      expect(styleOf(selector).animationName).toBe('none');
    }
    const keyframes = rules.find((r) => r.name === 'nudge-glow');
    expect(keyframes.cssRules.length).toBe(2);
  });
  it('in the game: the Play control wears the gold ring while the Play tip shows, on a phone and in the wide top bar', async () => {
    for (const [w, h, sel] of [[390, 844, '#corners .speed-main'], [1280, 800, '#topbar .speed-bar']]) {
      const r = await rigUI({ width: w, height: h });
      try {
        const control = r.root.querySelector(sel);
        expect(getComputedStyle(control).boxShadow.includes('226, 177, 60')).toBe(false);
        r.ui.tips.trigger('plotsPaused');
        r.frame(16);
        expect(getComputedStyle(control).boxShadow.includes('226, 177, 60')).toBe(true);
        r.ui.speedControl.set(1);
        r.frame(32);
        expect(getComputedStyle(control).boxShadow.includes('226, 177, 60')).toBe(false);
      } finally { r.cleanup(); }
    }
  });
});
