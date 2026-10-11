import { describe, it, expect } from '../harness.js';
import { createCelebrations } from '../../src/ui/celebrate.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { GOLD } from '../../src/render/art/palette.js';
import { CHEER_MS, CHEER_GAP_MS } from '../../src/data/ui.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { GOALS } from '../../src/data/goals.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive } from '../../src/sim/goals.js';
import { FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, milestoneText, cheerReward, rewardText, T } from '../../src/ui/text.js';
import { mount } from '../helpers/dom.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';
import { rigUI } from '../helpers/uiWorld.js';

// setTimeout on a clock the test moves: due timers fire in time order (then in the order they were set).
function fakeClock() {
  let t = 0, seq = 0;
  const timers = new Map();
  return {
    setTimer(fn, ms) { seq += 1; timers.set(seq, { fn, at: t + ms, id: seq }); return seq; },
    clearTimer(id) { timers.delete(id); },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let due = null;
        for (const x of timers.values()) if (x.at <= end && (!due || x.at < due.at || (x.at === due.at && x.id < due.id))) due = x;
        if (!due) break;
        timers.delete(due.id);
        t = due.at;
        due.fn();
      }
      t = end;
    },
  };
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};
function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

describe('ui celebrate', () => {
  it('shows one caption at a time, 3 s apart, each hidden after its time', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
      const texts = () => [...root.querySelectorAll('.cheer .text')].map((n) => n.textContent);
      cheers.show({ tier: 'first', text: 'One', reward: 10 });
      cheers.show({ tier: 'first', text: 'Two' });
      cheers.show({ tier: 'first', text: 'Three' });
      expect(texts()).toEqual(['One']);
      expect(cheers.pending()).toBe(2);
      clock.advance(CHEER_MS.first - 1);
      expect(texts()).toEqual(['One']);
      clock.advance(1);
      expect(texts()).toEqual([]);                                   // hidden at 2.5 s
      clock.advance(CHEER_GAP_MS - CHEER_MS.first - 1);
      expect(texts()).toEqual([]);                                   // and nothing until the gap is up
      clock.advance(1);
      expect(texts()).toEqual(['Two']);                              // 3 s after the first one started
      expect(cheers.pending()).toBe(1);
      clock.advance(CHEER_GAP_MS);
      expect(texts()).toEqual(['Three']);
      clock.advance(CHEER_GAP_MS);
      expect(texts()).toEqual([]);
      expect(cheers.pending()).toBe(0);
      cheers.show({ tier: 'first', text: 'Later' });                 // the gap has long passed: at once
      expect(texts()).toEqual(['Later']);
      cheers.show({ tier: 'first', text: 'Dropped' });
      cheers.clear();
      expect(root.children.length).toBe(0);
      expect(cheers.pending()).toBe(0);
      clock.advance(60000);
      expect(root.children.length).toBe(0);                          // clear cancelled the timers and the queue
    } finally { cleanup(); }
  });
  it('writes the star, the words and the gold, holds a milestone for 4 s, and runs onShow when a caption appears', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
      cheers.show({ tier: 'first', text: FIRST_TEXT.first_harvest, reward: 10 });
      const node = root.querySelector('.cheer');
      expect(node.classList.contains('first')).toBe(true);
      expect(node.querySelector('.icon').textContent).toBe('★');
      expect(node.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      expect(node.querySelector('.text').textContent).toBe(FIRST_TEXT.first_harvest);
      expect(node.querySelector('.reward').textContent).toBe('+10 gold');
      expect(cheerReward(25)).toBe('+25 gold');
      expect(cheerReward(25)).toBe(rewardText(25));                   // one wording for the strip, the sheets and the captions
      const ran = [];
      cheers.show({ tier: 'milestone', text: milestoneText('Town'), onShow: () => ran.push('town') });
      expect(ran).toEqual([]);                                       // still waiting its turn
      clock.advance(CHEER_GAP_MS);
      expect(ran).toEqual(['town']);
      const town = root.querySelector('.cheer');
      expect(town.classList.contains('milestone')).toBe(true);
      expect(town.querySelector('.reward')).toBe(null);
      cheers.show({ tier: 'first', text: 'Next' });
      clock.advance(CHEER_MS.milestone - 1);
      expect(root.querySelector('.cheer .text').textContent).toBe(milestoneText('Town'));
      clock.advance(1);
      expect(root.querySelector('.cheer .text').textContent).toBe('Next');   // straight after the milestone hides
      expect(root.querySelectorAll('.cheer').length).toBe(1);
    } finally { cleanup(); }
  });
  it('says what happened for every first, names every achievement with its exact condition, and never says XP', () => {
    for (const f of FIRSTS) expect(FIRST_TEXT[f.id].length).toBeGreaterThan(20);
    expect(Object.keys(ACHIEVEMENT_NAMES).length).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_NAMES[a.id].length).toBeGreaterThan(2);
      expect(ACHIEVEMENT_TEXT[a.id].length).toBeGreaterThan(8);
    }
    expect(FIRST_TEXT.first_shack).toContain('Shack');
    expect(ACHIEVEMENT_TEXT.way_in).toBe('Lay 10 road tiles beyond the starting road');
    expect(ACHIEVEMENT_TEXT.street).toBe('Have 25 homes');
    expect(ACHIEVEMENT_TEXT.water_bearer).toBe('Have 5 wells');
    expect(ACHIEVEMENT_TEXT.breadbasket).toBe('Have 3 grain farms');
    expect(ACHIEVEMENT_TEXT.plenty).toBe('Have 2 granaries');
    expect(ACHIEVEMENT_TEXT.cottage_lane).toBe('Have 20 homes at Cottage or better');
    expect(ACHIEVEMENT_TEXT.bustling).toBe('Reach 300 people');
    expect(ACHIEVEMENT_TEXT.granary_of_the_river).toBe('Harvest 2000 food');
    expect(ACHIEVEMENT_TEXT.prosperous).toBe('End 24 months in profit');
    expect(ACHIEVEMENT_TEXT.no_one_hungry).toBe('Reach 100 people with every Cottage or better home fed');
    expect(ACHIEVEMENT_TEXT.water_for_all).toBe('Have 30 lived-in homes, all with water');
    expect(ACHIEVEMENT_TEXT.busy_hands).toBe('Reach 150 people with 5% or fewer out of work');
    expect(ACHIEVEMENT_TEXT.on_course).toBe('Finish 9 goals');
    expect(ACHIEVEMENT_TEXT.day_by_day).toBe('Finish 10 daily goals');
    const all = [...Object.values(FIRST_TEXT), ...Object.values(ACHIEVEMENT_NAMES), ...Object.values(ACHIEVEMENT_TEXT), T.guideDone, T.dailyDone, T.achievement].join(' ');
    expect(/\bXP\b/i.test(all)).toBe(false);
  });
  it('celebrates goals, firsts, achievements, daily goals, the guide and milestones in the caption row, not as toasts', async () => {
    const played = [], buzzed = [];
    const sfx = { play: (n) => { played.push(n); return true; }, buzz: (ms) => { buzzed.push(ms); return true; }, unlock: () => false };
    const r = await rigUI({ sfx });
    try {
      const cheer = r.root.querySelector('#cheer');
      expect(cheer.previousElementSibling.id).toBe('goals');                 // the last row of #under-bar, so nothing above it moves
      expect(cheer.nextElementSibling).toBe(null);
      expect(cheer.getAttribute('role')).toBe('status');
      expect(cheer.getAttribute('aria-live')).toBe('polite');
      r.ui.celebrations.clear();                                             // anything construction queued
      // The live region stays rendered while empty (collapsed to nothing, no gap in #under-bar), so a screen reader
      // already has it when a caption arrives: a region that appears together with its words can go unannounced.
      expect(getComputedStyle(cheer).display === 'none').toBe(false);
      expect(cheer.getBoundingClientRect().height).toBeLessThan(2);
      expect(Math.abs(r.root.querySelector('#under-bar').getBoundingClientRect().bottom - r.root.querySelector('#goals').getBoundingClientRect().bottom)).toBeLessThan(0.5);
      played.length = 0; buzzed.length = 0;
      r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }, { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
      expect(cheer.querySelector('.cheer .text').textContent).toBe(`${T.goalDone}: ${GOALS[0].text}`);   // the goal first, then the first
      expect(cheer.querySelector('.cheer .reward').textContent).toBe('+25 gold');
      expect(r.ui.celebrations.pending()).toBe(1);
      expect(played).toEqual(['goal']);                                       // sound and buzz come with the caption
      expect(buzzed).toEqual([20]);
      expect(r.root.querySelector('#toasts').textContent.includes(GOALS[0].text)).toBe(false);
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
      expect(cheer.textContent).toContain(FIRST_TEXT.first_family);
      expect(cheer.textContent).toContain('+10 gold');
      expect(r.ui.effects.active(0).some((e) => e.kind === 'sparkle')).toBe(true);   // a burst, or a still ring under reduced motion
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'milestone', id: 'town' }]);
      expect(cheer.querySelector('.cheer').classList.contains('milestone')).toBe(true);
      expect(cheer.textContent).toContain(milestoneText('Town'));
      expect(played[played.length - 1]).toBe('milestone');
      expect(r.root.querySelector('#toasts').textContent.includes(milestoneText('Town'))).toBe(false);
      r.ui.celebrations.clear();
      setGuide(r.world, true);
      expect(guideActive(r.world)).toBe(true);                               // the plots goal is open in the test city
      r.ui.onEvents([{ type: 'achievement', id: 'way_in' }]);
      expect(cheer.children.length).toBe(0);                                // achievements stay quiet while the guide runs
      setGuide(r.world, false);
      r.ui.onEvents([{ type: 'achievement', id: 'way_in' }]);
      expect(cheer.textContent).toContain(`${T.achievement}: ${ACHIEVEMENT_NAMES.way_in}`);
      r.ui.celebrations.clear();
      const daily = DAILY_POOL[0].id;
      r.ui.onEvents([{ type: 'daily', id: daily, reward: 25 }]);
      expect(cheer.textContent).toContain(`${T.dailyDone}: ${DAILY_TEXT[daily]}`);
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'guide_done', reward: 50 }]);
      expect(cheer.textContent).toContain(T.guideDone);
      expect(cheer.textContent).toContain('+50 gold');
      r.ui.destroy();
      expect(cheer.children.length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('bursts a sparkle of diamonds, or a still ring under reduced motion, gone after 1.2 s', () => {
    expect(EFFECT_MS.sparkle).toBe(1200);
    const fx = createEffects({ reducedMotion: false });
    fx.sparkle(0, 0, GOLD, 0);
    expect(fx.active(0)[0].kind).toBe('sparkle');
    expect(fx.active(0)[0].still).toBe(false);
    const a = scene();
    fx.draw(a.g, 300);
    expect(inked(a.c)).toBeGreaterThan(8);
    expect(fx.count(EFFECT_MS.sparkle - 1)).toBe(1);
    expect(fx.count(EFFECT_MS.sparkle + 1)).toBe(0);
    const still = createEffects({ reducedMotion: true });
    still.sparkle(0, 0, GOLD, 0);
    expect(still.count(0)).toBe(1);                                          // unlike a puff, it stays, as a still ring
    expect(still.active(0)[0].still).toBe(true);
    const b = scene();
    still.draw(b.g, 300);
    expect(inked(b.c)).toBeGreaterThan(0);
  });
});
