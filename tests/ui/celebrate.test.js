import { describe, it, expect } from '../harness.js';
import { createCelebrations } from '../../src/ui/celebrate.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { GOLD } from '../../src/render/art/palette.js';
import { CHEER_MS, CHEER_GAP_MS } from '../../src/data/ui.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL, DAILY_REWARD } from '../../src/data/daily.js';
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD } from '../../src/data/goals.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive, goalById } from '../../src/sim/goals.js';
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
      cheers.show({ tier: 'first', text: FIRST_TEXT.first_harvest.head, why: FIRST_TEXT.first_harvest.why, reward: 10 });
      const node = root.querySelector('.cheer');
      expect(node.classList.contains('first')).toBe(true);
      expect(node.querySelector('.icon').textContent).toBe('★');
      expect(node.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      expect(node.querySelector('.text').textContent).toBe(FIRST_TEXT.first_harvest.head);
      expect(node.querySelector('.why').textContent).toBe(FIRST_TEXT.first_harvest.why);       // the head says what, the why says why it matters
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
      expect(town.querySelector('.why')).toBe(null);                  // nothing to say beneath a milestone
      cheers.show({ tier: 'first', text: 'Next' });
      clock.advance(CHEER_MS.milestone - 1);
      expect(root.querySelector('.cheer .text').textContent).toBe(milestoneText('Town'));
      clock.advance(1);
      expect(root.querySelector('.cheer .text').textContent).toBe('Next');   // straight after the milestone hides
      expect(root.querySelectorAll('.cheer').length).toBe(1);
    } finally { cleanup(); }
  });
  it('says what happened for every first, names every achievement with its exact condition, and never says XP', () => {
    for (const f of FIRSTS) {
      expect(FIRST_TEXT[f.id].head.length).toBeGreaterThan(8);
      expect(FIRST_TEXT[f.id].head.length).toBeLessThan(30);          // a head is short: it stays on the first line beside the gold
      expect(FIRST_TEXT[f.id].why.length).toBeGreaterThan(20);
    }
    expect(Object.keys(ACHIEVEMENT_NAMES).length).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_NAMES[a.id].length).toBeGreaterThan(2);
      expect(ACHIEVEMENT_TEXT[a.id].length).toBeGreaterThan(8);
    }
    expect(FIRST_TEXT.first_shack.head).toBe('First Shack');
    expect(FIRST_TEXT.first_shack.why).toBe('Water let a hut grow. Shacks hold 8 people.');   // names and numbers come from TIERS
    expect(FIRST_TEXT.first_cottage.why).toBe('Food let a home grow. Cottages hold 12 people and pay more tax.');
    expect(FIRST_TEXT.first_house.why).toBe('A temple let a home grow. Houses hold 16 people.');
    expect(FIRST_TEXT.people_100.head).toBe('100 people live here');                           // the count comes from FIRSTS
    expect(FIRST_TEXT.people_100.why).toBe('At 150 people the city becomes a Town.');
    expect(ACHIEVEMENT_TEXT.way_in).toBe('Lay 10 road tiles beyond the starting road');
    expect(ACHIEVEMENT_TEXT.street).toBe('Have 25 homes');
    expect(ACHIEVEMENT_TEXT.water_bearer).toBe('Have 5 wells');
    expect(ACHIEVEMENT_TEXT.breadbasket).toBe('Have 3 grain farms');
    expect(ACHIEVEMENT_TEXT.plenty).toBe('Have 2 granaries');
    expect(ACHIEVEMENT_TEXT.cottage_lane).toBe('Have 20 homes at Cottage or better');
    expect(ACHIEVEMENT_TEXT.bustling).toBe('Reach 300 people');
    expect(ACHIEVEMENT_TEXT.granary_of_the_river).toBe('Harvest 2000 grain');
    expect(ACHIEVEMENT_TEXT.prosperous).toBe('End 24 months in profit');
    expect(ACHIEVEMENT_TEXT.no_one_hungry).toBe('Reach 100 people with every Cottage or better home fed');
    expect(ACHIEVEMENT_TEXT.water_for_all).toBe('Have 30 lived-in homes, all with water');
    expect(ACHIEVEMENT_TEXT.busy_hands).toBe('Reach 150 people with 5% or fewer out of work');
    expect(ACHIEVEMENT_TEXT.on_course).toBe('Finish 9 goals');
    expect(ACHIEVEMENT_TEXT.day_by_day).toBe('Finish 10 daily goals');
    const all = [...Object.values(FIRST_TEXT).flatMap((f) => [f.head, f.why]), ...Object.values(ACHIEVEMENT_NAMES), ...Object.values(ACHIEVEMENT_TEXT), T.guideDone, T.dailyDone, T.achievement].join(' ');
    expect(/\bXP\b/i.test(all)).toBe(false);
  });
  it('celebrates goals, firsts, achievements, daily goals, the guide and milestones in the caption row, not as toasts', async () => {
    const played = [], buzzed = [];
    const sfx = { play: (n) => { played.push(n); return true; }, buzz: (ms) => { buzzed.push(ms); return true; }, unlock: () => false };
    const r = await rigUI({ sfx });
    try {
      const cheer = r.root.querySelector('#cheer');
      expect(cheer.previousElementSibling.id).toBe('tip');                   // the last row of #under-bar (after the goals and the tip row), so nothing above it moves
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
      played.length = 0; buzzed.length = 0;
      r.ui.onEvents([{ type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
      expect(cheer.querySelector('.text').textContent).toBe(FIRST_TEXT.first_family.head);   // the head and the gold, then the why beneath
      expect(cheer.querySelector('.why').textContent).toBe(FIRST_TEXT.first_family.why);
      expect(cheer.textContent).toContain('+10 gold');
      expect(r.ui.effects.active(0).some((e) => e.kind === 'sparkle')).toBe(true);   // a burst, or a still ring under reduced motion
      expect(played).toEqual(['goal']);
      expect(buzzed).toEqual([20]);
      r.ui.celebrations.clear();
      played.length = 0;
      const sparkles = () => r.ui.effects.active(0).filter((e) => e.kind === 'sparkle').length;
      const before = sparkles();
      r.ui.onEvents([{ type: 'first', id: 'first_profit', reward: 10, x: null, y: null }]);   // a first with no place (profit)
      expect(cheer.textContent).toContain(FIRST_TEXT.first_profit.head);
      expect(sparkles()).toBe(before);                                       // a caption and the sound, but nothing to sparkle on
      expect(played).toEqual(['goal']);
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
      played.length = 0; buzzed.length = 0;
      r.ui.onEvents([{ type: 'achievement', id: 'way_in' }]);
      expect(cheer.querySelector('.text').textContent).toBe(`${T.achievement}: ${ACHIEVEMENT_NAMES.way_in}`);
      expect(cheer.querySelector('.why').textContent).toBe(ACHIEVEMENT_TEXT.way_in);   // its exact condition
      expect(played).toEqual(['goal']);
      expect(buzzed).toEqual([20]);
      r.ui.celebrations.clear();
      played.length = 0;
      const daily = DAILY_POOL[0].id;
      r.ui.onEvents([{ type: 'daily', id: daily, reward: 25 }]);
      expect(cheer.textContent).toContain(`${T.dailyDone}: ${DAILY_TEXT[daily]}`);
      expect(played).toEqual(['goal']);
      r.ui.celebrations.clear();
      played.length = 0;
      r.ui.onEvents([{ type: 'guide_done', reward: 50 }]);
      expect(cheer.textContent).toContain(T.guideDone);
      expect(cheer.textContent).toContain('+50 gold');
      expect(played).toEqual(['goal']);
      r.ui.celebrations.clear();
      // Town brings a goal, the milestone and an achievement together: the achievement stays in the summary list.
      r.ui.onEvents([{ type: 'goal', id: 'town', reward: 25 }, { type: 'milestone', id: 'town' }, { type: 'achievement', id: 'town' }]);
      expect(cheer.querySelector('.text').textContent).toBe(`${T.goalDone}: ${goalById('town').text}`);
      expect(r.ui.celebrations.pending()).toBe(1);                           // the milestone waits; no achievement caption queued
      r.ui.destroy();
      expect(cheer.children.length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('keeps every caption above 45% of the screen on a phone at every text size, with the why beneath only where it fits', async () => {
    const captions = [
      ...FIRSTS.map((f) => ({ text: FIRST_TEXT[f.id].head, why: FIRST_TEXT[f.id].why, reward: FIRST_REWARD })),
      ...[...GOALS, ...EVENT_GOALS].map((g) => ({ text: `${T.goalDone}: ${g.text}`, reward: g.reward })),
      ...ACHIEVEMENTS.map((a) => ({ text: `${T.achievement}: ${ACHIEVEMENT_NAMES[a.id]}`, why: ACHIEVEMENT_TEXT[a.id] })),
      ...DAILY_POOL.map((d) => ({ text: `${T.dailyDone}: ${DAILY_TEXT[d.id]}`, reward: DAILY_REWARD })),
      { text: T.guideDone, reward: GUIDE_REWARD },
      { tier: 'milestone', text: milestoneText('Town') },
    ];
    const tooLow = [], crampedAt = [];
    for (const [w, h] of [[360, 640], [390, 844]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });          // no slide-in, so the box is where it will rest
          setGuide(r.world, true);
          r.world.guide.done = false;
          let worst = 0, worstAt = 0;                                          // the tallest guide strip: each guided step in turn
          GUIDE_GOALS.forEach((id, i) => {
            r.world.goals.completed = GUIDE_GOALS.slice(0, i);
            r.ui.refresh();
            const bottom = r.root.querySelector('#goals').getBoundingClientRect().bottom;
            if (bottom > worst) { worst = bottom; worstAt = i; }
          });
          r.world.goals.completed = GUIDE_GOALS.slice(0, worstAt);
          r.ui.refresh();
          const shape = () => r.root.querySelector('#cheer .cheer').getBoundingClientRect();
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', text: FIRST_TEXT.first_shack.head, reward: FIRST_REWARD });
          const line = shape().height;                                         // one line of head and gold
          // Where the strip alone leaves no room for even one line under the 45% mark (360x640 at 150%: the tallest strip
          // ends at 42% of the screen), no caption can keep clear of it. The caption then only has to stay short.
          const cramped = worst + 6 + line >= h * 0.45;
          for (const c of captions) {
            r.ui.celebrations.clear();
            r.ui.celebrations.show({ tier: 'first', ...c });
            const box = shape();
            if (cramped ? box.height > 4 * line : box.bottom >= h * 0.45) tooLow.push(`${w}x${h} at ${size}%: ${c.text} ends at ${Math.round(box.bottom)}`);
          }
          if (cramped) crampedAt.push(`${w}x${h} at ${size}%`);
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', text: FIRST_TEXT.first_shack.head, why: FIRST_TEXT.first_shack.why, reward: FIRST_REWARD });
          const why = r.root.querySelector('#cheer .why');
          expect(why.textContent).toBe(FIRST_TEXT.first_shack.why);            // the live region always has it
          expect(why.getBoundingClientRect().width > 2).toBe(size === 100);     // and a phone at larger text shows only the head and the gold
        } finally { r.cleanup(); }
      }
    }
    expect(tooLow).toEqual([]);
    expect(crampedAt).toEqual(['360x640 at 150%']);                          // the one phone and size where the strip leaves no room
  });
  it('shows the why beneath on a wide screen at any text size, and drops it in the compact layout at larger text', async () => {
    for (const [w, h, size, shown] of [[1280, 800, 150, true], [740, 360, 100, true], [740, 360, 125, false], [740, 360, 150, false]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
        r.ui.celebrations.clear();
        r.ui.celebrations.show({ tier: 'first', text: FIRST_TEXT.first_shack.head, why: FIRST_TEXT.first_shack.why, reward: FIRST_REWARD });
        const why = r.root.querySelector('#cheer .why');
        expect(why.textContent).toBe(FIRST_TEXT.first_shack.why);
        expect(why.getBoundingClientRect().width > 2).toBe(shown);
      } finally { r.cleanup(); }
    }
  });
  it('holds the next caption while hold() says so, and shows it on resume() once nothing holds it', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      let held = true;
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, hold: () => held });
      const ran = [];
      cheers.show({ tier: 'first', text: 'One', onShow: () => ran.push('one') });
      expect(root.children.length).toBe(0);
      expect(cheers.pending()).toBe(1);
      cheers.resume();
      expect(root.children.length).toBe(0);                          // still held
      clock.advance(60000);
      expect(ran).toEqual([]);                                       // waiting is not a timer: nothing drains it unseen
      held = false;
      cheers.resume();
      expect(root.querySelector('.cheer .text').textContent).toBe('One');
      expect(ran).toEqual(['one']);                                  // its sound and sparkle come when it shows
      cheers.show({ tier: 'first', text: 'Two' });
      held = true;
      clock.advance(CHEER_GAP_MS);
      expect(root.children.length).toBe(0);                          // One hid on time; Two waits while held
      expect(cheers.pending()).toBe(1);
      held = false;
      cheers.resume();
      expect(root.querySelector('.cheer .text').textContent).toBe('Two');
      cheers.resume();                                               // the row is busy: resume does nothing
      expect(root.querySelectorAll('.cheer').length).toBe(1);
    } finally { cleanup(); }
  });
  it('on a phone at larger text writes each caption as one flow of words, two lines at most', async () => {
    const captions = [
      ...FIRSTS.map((f) => ({ text: FIRST_TEXT[f.id].head, why: FIRST_TEXT[f.id].why, reward: FIRST_REWARD })),
      ...[...GOALS, ...EVENT_GOALS].map((g) => ({ text: `${T.goalDone}: ${g.text}`, reward: g.reward })),
      ...ACHIEVEMENTS.map((a) => ({ text: `${T.achievement}: ${ACHIEVEMENT_NAMES[a.id]}`, why: ACHIEVEMENT_TEXT[a.id] })),
      ...DAILY_POOL.map((d) => ({ text: `${T.dailyDone}: ${DAILY_TEXT[d.id]}`, reward: DAILY_REWARD })),
      { text: T.guideDone, reward: GUIDE_REWARD },
      { tier: 'milestone', text: milestoneText('Town') },
    ];
    const tooTall = [];
    for (const [w, h] of [[360, 640], [390, 844], [740, 360], [844, 390]]) {
      for (const size of [125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          for (const c of captions) {
            r.ui.celebrations.clear();
            r.ui.celebrations.show({ tier: 'first', ...c });
            const node = r.root.querySelector('#cheer .cheer');
            expect(getComputedStyle(node).display).toBe('block');
            const cs = getComputedStyle(node);
            const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((n, k) => n + parseFloat(cs[k]), 0);
            const lines = (node.getBoundingClientRect().height - chrome) / parseFloat(cs.lineHeight);
            if (lines > 2.05) tooTall.push(`${w}x${h} at ${size}%: ${c.text} is ${lines.toFixed(1)} lines`);
            if (c.reward) expect(node.querySelector('.reward').getBoundingClientRect().right).toBeLessThanOrEqual(node.getBoundingClientRect().right);
          }
        } finally { r.cleanup(); }
      }
    }
    expect(tooTall).toEqual([]);
  });
  it('on a phone at larger text a caption waits while a tip shows, and goes up once the tip has closed', async () => {
    for (const [w, h, size, waits] of [[360, 640, 150, true], [390, 844, 125, true], [740, 360, 150, true], [360, 640, 100, false], [740, 360, 100, false], [1280, 800, 150, false]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
        r.ui.placement.start({ kind: 'houses' });                            // six plots painted while paused: the Play tip, then the goal
        r.ui.placement.pointAt(16, 11); r.ui.placement.pointAt(21, 11);
        expect(r.ui.placement.confirm().ok).toBe(true);
        r.ui.placement.cancel();
        expect(r.ui.tips.current()).toBe('press_play');
        const shown = () => r.root.querySelectorAll('#cheer .cheer').length;
        expect([w, h, size, shown()]).toEqual([w, h, size, waits ? 0 : 1]);
        r.frame(16);
        expect([w, h, size, shown()]).toEqual([w, h, size, waits ? 0 : 1]);     // still waiting while the tip is up
        r.ui.tips.dismiss();
        r.frame(32);
        expect([w, h, size, shown()]).toEqual([w, h, size, 1]);
        expect(r.root.querySelector('#cheer .text').textContent.startsWith(T.goalDone)).toBe(true);
      } finally { r.cleanup(); }
    }
  });
  // The rows under the top bar together (final review): the goals strip at its tallest guided step, the Play tip and a
  // goal caption, all showing at once. Spec 6.1: nothing over the middle of the map. Where the screen is too short for
  // three rows, the measured end is pinned (so it cannot creep further) and the reason written down.
  it('keeps the goals strip, a tip and a caption together above the middle of the screen', async () => {
    const TIGHT = 'On a phone at larger text a caption waits while a tip shows (the test above), so in play these rows meet only when a tip arrives during the 2.5 s of a caption, and the tip closes itself after 15 s';
    const EXCEPTIONS = {
      '360x640 at 150%': [68, `the tallest guide strip alone ends at 42% here. ${TIGHT}`],
      '740x360 at 100%': [54, 'a 360 px tall phone held sideways: the top bar and three rows with 44 px tap targets need more than half of it. The rows clear themselves: a caption after 2.5 s'],
      '740x360 at 125%': [63, `a 360 px tall phone held sideways. ${TIGHT}`],
      '740x360 at 150%': [71, `a 360 px tall phone held sideways. ${TIGHT}`],
      '844x390 at 150%': [65, `a 390 px tall phone held sideways. ${TIGHT}`],
    };
    const over = [];
    for (const [w, h] of [[360, 640], [390, 844], [740, 360], [844, 390]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          setGuide(r.world, true);
          r.world.guide.done = false;
          let worst = 0, worstAt = 0;                                          // the tallest guide strip: each guided step in turn
          GUIDE_GOALS.forEach((id, i) => {
            r.world.goals.completed = GUIDE_GOALS.slice(0, i);
            r.ui.refresh();
            const bottom = r.root.querySelector('#goals').getBoundingClientRect().bottom;
            if (bottom > worst) { worst = bottom; worstAt = i; }
          });
          r.world.goals.completed = GUIDE_GOALS.slice(0, worstAt);
          r.ui.refresh();
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', text: `${T.goalDone}: ${goalById('plots').text}`, reward: goalById('plots').reward });
          expect(r.ui.tips.trigger('plotsPaused')).toBe(true);                // the tip arrives while the caption is up
          for (const sel of ['#goals .goal-strip', '#tip .tip-row', '#cheer .cheer']) expect([sel, r.root.querySelector(sel) !== null]).toEqual([sel, true]);
          const end = (r.root.querySelector('#under-bar').getBoundingClientRect().bottom / h) * 100;
          const key = `${w}x${h} at ${size}%`;
          const allowed = EXCEPTIONS[key] ? EXCEPTIONS[key][0] : 50;
          if (!(end < allowed)) over.push(`${key}: ends at ${end.toFixed(1)}%`);
          if (EXCEPTIONS[key] && end < 50) over.push(`${key}: ends at ${end.toFixed(1)}%, so it needs no exception`);
        } finally { r.cleanup(); }
      }
    }
    expect(over).toEqual([]);
    for (const [, reason] of Object.values(EXCEPTIONS)) expect(reason.length).toBeGreaterThan(40);
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
    let edge = 0;                                                            // a darker amber edge on the gold, so the burst reads on sand
    for (let x = 0; x < a.c.width; x++) for (let y = 0; y < a.c.height; y++) { const px = pixelAt(a.c, x, y); if (px[3] > 120 && px[0] < 205) edge++; }
    expect(edge).toBeGreaterThan(6);
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
