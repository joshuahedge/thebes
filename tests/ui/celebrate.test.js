import { describe, it, expect } from '../harness.js';
import { createCelebrations } from '../../src/ui/celebrate.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { GOLD } from '../../src/render/art/palette.js';
import { CHEER_MS, CHEER_GAP_MS, CHEER_OPEN_MIN_MS, CHEER_WAITING_MAX, CHEER_HELD_MAX_MS, CHEER_RECENT_MAX } from '../../src/data/ui.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL, DAILY_REWARD } from '../../src/data/daily.js';
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD } from '../../src/data/goals.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive, goalById } from '../../src/sim/goals.js';
import { FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, milestoneText, cheerReward, rewardText, T } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';
import { openSheet } from '../../src/ui/modes.js';
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
  it('shows one caption at a time, each for its tier\'s time, the next as the last one hides', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: () => 0 });
      const texts = () => [...root.querySelectorAll('.cheer .text')].map((n) => n.textContent);
      expect(CHEER_MS).toEqual({ first: 4000, remark: 4000, milestone: 5000, info: 6000 });   // ruling 165
      expect(Math.min(...Object.values(CHEER_MS)) >= CHEER_GAP_MS).toBe(true);   // every caption outlasts the 3 s gap, so the next waits for it to hide
      cheers.show({ tier: 'first', text: 'One', reward: 10 });
      cheers.show({ tier: 'first', text: 'Two' });
      expect(texts()).toEqual(['One']);
      expect(cheers.pending()).toBe(1);
      clock.advance(CHEER_MS.first - 1);
      expect(texts()).toEqual(['One']);
      clock.advance(1);
      expect(texts()).toEqual(['Two']);                              // One hid at 4 s and Two went up at once
      expect(cheers.pending()).toBe(0);
      cheers.show({ tier: 'remark', text: 'Three' });
      clock.advance(CHEER_MS.first);
      expect(texts()).toEqual(['Three']);
      clock.advance(CHEER_MS.remark - 1);
      expect(texts()).toEqual(['Three']);                            // a remark stays 4 s too (it fell back to 2.5 s before)
      clock.advance(1);
      expect(texts()).toEqual([]);
      expect(cheers.pending()).toBe(0);
      cheers.show({ tier: 'first', text: 'Later' });                 // the row is free: at once
      expect(texts()).toEqual(['Later']);
      cheers.show({ tier: 'first', text: 'Dropped' });
      cheers.clear();
      expect(root.children.length).toBe(0);
      expect(cheers.pending()).toBe(0);
      clock.advance(60000);
      expect(root.children.length).toBe(0);                          // clear cancelled the timers and the queue
    } finally { cleanup(); }
  });
  it('lets at most two wait, writes every caption to Recent (the last ten, newest first, in full) and tells onChange', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      let changes = 0;
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: () => 0, onChange: () => { changes += 1; } });
      const texts = () => [...root.querySelectorAll('.cheer .text')].map((n) => n.textContent);
      expect([CHEER_WAITING_MAX, CHEER_RECENT_MAX]).toEqual([2, 10]);
      cheers.show({ tier: 'first', lead: 'Goal done: ', text: 'Lay a road', reward: 25 });
      expect([changes, cheers.showing()]).toEqual([1, true]);
      for (const t of ['B', 'C', 'D']) cheers.show({ tier: 'first', text: t, why: `${t} why` });
      expect(cheers.pending()).toBe(2);                              // B went straight to Recent: C and D wait
      clock.advance(CHEER_MS.first);
      expect(texts()).toEqual(['C']);
      expect(changes).toBe(3);                                       // Lay a road hid, C went up
      clock.advance(CHEER_MS.first);
      expect(texts()).toEqual(['D']);
      clock.advance(CHEER_MS.first);
      expect([texts(), cheers.showing()]).toEqual([[], false]);
      expect(cheers.recent().map((c) => c.text)).toEqual(['D', 'C', 'B', 'Goal done: Lay a road']);   // B too: it never showed
      expect(cheers.recent()[3]).toEqual({ tier: 'first', text: 'Goal done: Lay a road', why: '', reward: 25 });
      expect(cheers.recent()[2].why).toBe('B why');
      for (let i = 0; i < 12; i++) cheers.show({ tier: 'info', text: `N${i}` });
      expect(cheers.recent().length).toBe(10);
      expect(cheers.recent()[0].text).toBe('N11');
      const copy = cheers.recent();
      copy.length = 0;
      expect(cheers.recent().length).toBe(10);                       // a copy: the list is the interface's own
    } finally { cleanup(); }
  });
  it('sends a caption skip() turns away to Recent only, when it is shown and when its turn comes', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      let banner = true;
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: () => 0, skip: (item) => banner && item.tier !== 'info' });
      const texts = () => [...root.querySelectorAll('.cheer .text')].map((n) => n.textContent);
      cheers.show({ tier: 'first', text: 'Goal' });
      expect([texts(), cheers.pending()]).toEqual([[], 0]);          // under a banner only info captions show
      cheers.show({ tier: 'info', text: 'Report' });
      expect(texts()).toEqual(['Report']);
      banner = false;
      cheers.show({ tier: 'first', text: 'Waits' });
      banner = true;                                                 // a banner came up while it waited
      clock.advance(CHEER_MS.info);
      expect([texts(), cheers.pending()]).toEqual([[], 0]);
      expect(cheers.recent().map((c) => c.text)).toEqual(['Waits', 'Report', 'Goal']);
    } finally { cleanup(); }
  });
  it('writes the star, the words and the gold, holds a milestone for 5 s, and runs onShow when a caption appears', () => {
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
      clock.advance(CHEER_MS.first);
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
  it('keeps every caption above 45% of the screen on a phone at every text size, in the goal\'s place, with the why beneath only where it fits', async () => {
    const captions = [
      ...FIRSTS.map((f) => ({ text: FIRST_TEXT[f.id].head, why: FIRST_TEXT[f.id].why, reward: FIRST_REWARD })),
      ...[...GOALS, ...EVENT_GOALS].map((g) => ({ text: `${T.goalDone}: ${g.text}`, reward: g.reward })),
      ...ACHIEVEMENTS.map((a) => ({ text: `${T.achievement}: ${ACHIEVEMENT_NAMES[a.id]}`, why: ACHIEVEMENT_TEXT[a.id] })),
      ...DAILY_POOL.map((d) => ({ text: `${T.dailyDone}: ${DAILY_TEXT[d.id]}`, reward: DAILY_REWARD })),
      { text: T.guideDone, reward: GUIDE_REWARD },
      { tier: 'milestone', text: milestoneText('Town') },
      { tier: 'info', text: 'Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 building burned, 40 gold stolen.' },
    ];
    const tooLow = [];
    for (const [w, h] of [[360, 640], [390, 844]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          setGuide(r.world, true);
          r.world.guide.done = false;
          r.ui.refresh();
          for (const c of captions) {
            r.ui.celebrations.clear();
            r.ui.celebrations.show({ tier: 'first', ...c });
            expect(getComputedStyle(r.root.querySelector('#goals')).display).toBe('none');   // the caption has the guidance row (ruling 164)
            const box = r.root.querySelector('#cheer .cheer').getBoundingClientRect();
            if (box.bottom >= h * 0.45) tooLow.push(`${w}x${h} at ${size}%: ${c.text} ends at ${Math.round(box.bottom)}`);
          }
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', text: FIRST_TEXT.first_shack.head, why: FIRST_TEXT.first_shack.why, reward: FIRST_REWARD });
          const why = r.root.querySelector('#cheer .why');
          expect(why.textContent).toBe(FIRST_TEXT.first_shack.why);            // the live region always has it
          expect(why.getBoundingClientRect().width > 2).toBe(size === 100);     // and a phone at larger text shows only the head and the gold
        } finally { r.cleanup(); }
      }
    }
    expect(tooLow).toEqual([]);
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
      clock.advance(CHEER_MS.first);
      expect(root.children.length).toBe(0);                          // One hid on time; Two waits while held
      expect(cheers.pending()).toBe(1);
      held = false;
      cheers.resume();
      expect(root.querySelector('.cheer .text').textContent).toBe('Two');
      cheers.resume();                                               // the row is busy: resume does nothing
      expect(root.querySelectorAll('.cheer').length).toBe(1);
    } finally { cleanup(); }
  });
  it('stops a caption opened in place, keeps it at least 2 s once it is closed, and makes the next caption wait (P8)', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      let t = 0;
      const advance = (ms) => { t += ms; clock.advance(ms); };
      const log = [];
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: () => t, onToggle: () => log.push('toggle'), onChange: () => log.push('change') });
      expect(CHEER_OPEN_MIN_MS).toBe(2000);
      cheers.show({ tier: 'first', text: 'One', why: 'Because.' });
      cheers.show({ tier: 'first', text: 'Two' });
      const node = root.querySelector('.cheer'), more = node.querySelector('.more');
      expect([more.tagName, more.hidden, more.getAttribute('aria-expanded')]).toEqual(['BUTTON', true, 'false']);   // nothing is cut here: no More
      fire(node, 'click');
      expect(log.includes('toggle')).toBe(false);                      // not cut: a tap on the caption does nothing
      advance(1000);
      cheers.setOpen(true);                                            // 3 s of its 4 left
      expect([node.classList.contains('open'), more.hidden, more.getAttribute('aria-expanded'), more.textContent.trim().startsWith(T.less)]).toEqual([true, false, 'true', true]);
      fire(node, 'click');
      fire(more, 'click');
      expect(log.filter((x) => x === 'toggle').length).toBe(2);        // the caption and More both ask (More's click reaches the caption once)
      advance(60000);
      cheers.resume();
      expect([root.querySelectorAll('.cheer').length, root.querySelector('.cheer .text').textContent, cheers.pending()]).toEqual([1, 'One', 1]);   // still up, Two waiting
      expect(cheers.busy()).toBe(true);
      cheers.setOpen(false);
      advance(2999);
      expect(root.querySelector('.cheer .text').textContent).toBe('One');   // the 3 s it had left, more than the 2 s minimum
      advance(1);
      expect(root.querySelector('.cheer .text').textContent).toBe('Two');  // it hid and Two began as it hid
      advance(CHEER_MS.first - 500);
      cheers.setOpen(true);                                            // 0.5 s left when opened
      cheers.setOpen(false);
      advance(CHEER_OPEN_MIN_MS - 1);
      expect(root.querySelectorAll('.cheer').length).toBe(1);          // at least 2 s once closed
      advance(1);
      expect(root.querySelectorAll('.cheer').length).toBe(0);
      cheers.setOpen(true);                                            // nothing on screen: nothing to open
      expect(cheers.busy()).toBe(false);
      cheers.show({ tier: 'first', text: 'Three' });
      cheers.setOpen(true);
      cheers.clear();
      expect([root.children.length, cheers.busy()]).toEqual([0, false]);
      cheers.show({ tier: 'first', text: 'Four' });
      expect(root.querySelector('.cheer').classList.contains('open')).toBe(false);   // clear() left nothing open
    } finally { cleanup(); }
  });
  it('sends a caption held back behind a sheet for more than 10 s to Recent only, and keeps one held by anything else', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      let held = true, sheet = false, t = 0;
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: () => t, hold: () => held, dropHeld: () => sheet });
      cheers.show({ tier: 'first', text: 'Old' });
      t = 5000;
      cheers.show({ tier: 'first', text: 'Newer' });
      t = CHEER_HELD_MAX_MS + 1;
      cheers.resume();
      expect(cheers.pending()).toBe(2);                              // held by a tip or the legend: they wait as long as it takes
      sheet = true;
      cheers.resume();                                               // behind a sheet: Old has waited too long, Newer has not
      expect(cheers.pending()).toBe(1);
      held = false;
      cheers.resume();
      expect(root.querySelector('.cheer .text').textContent).toBe('Newer');
      expect(cheers.recent().map((c) => c.text)).toEqual(['Newer', 'Old']);
      expect(CHEER_HELD_MAX_MS).toBe(10000);
    } finally { cleanup(); }
  });
  it('on a phone writes each caption in two lines at most, at larger text as one flow of words', async () => {
    const captions = [
      ...FIRSTS.map((f) => ({ text: FIRST_TEXT[f.id].head, why: FIRST_TEXT[f.id].why, reward: FIRST_REWARD })),
      ...[...GOALS, ...EVENT_GOALS].map((g) => ({ text: `${T.goalDone}: ${g.text}`, reward: g.reward })),
      ...ACHIEVEMENTS.map((a) => ({ text: `${T.achievement}: ${ACHIEVEMENT_NAMES[a.id]}`, why: ACHIEVEMENT_TEXT[a.id] })),
      ...DAILY_POOL.map((d) => ({ text: `${T.dailyDone}: ${DAILY_TEXT[d.id]}`, reward: DAILY_REWARD })),
      { text: T.guideDone, reward: GUIDE_REWARD },
      { tier: 'milestone', text: milestoneText('Town') },
      { tier: 'info', text: 'Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 building burned, 40 gold stolen.' },
    ];
    const tooTall = [];
    for (const [w, h] of [[360, 640], [390, 844], [740, 360], [844, 390]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          for (const c of captions) {
            r.ui.celebrations.clear();
            r.ui.celebrations.show({ tier: 'first', ...c });
            const node = r.root.querySelector('#cheer .cheer');
            const cs = getComputedStyle(node);
            const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((n, k) => n + parseFloat(cs[k]), 0);
            if (size > 100) {
              expect([cs.display === 'grid', cs.webkitLineClamp]).toEqual([false, '2']);   // one flow of words, cut at two lines
              const lines = (node.getBoundingClientRect().height - chrome) / parseFloat(cs.lineHeight);
              if (lines > 2.05) tooTall.push(`${w}x${h} at ${size}%: ${c.text} is ${lines.toFixed(1)} lines`);
            } else {
              const text = node.querySelector('.text'), why = node.querySelector('.why');
              const lh = (n) => parseFloat(getComputedStyle(n).lineHeight);
              if (text.getBoundingClientRect().height > 2 * lh(text) + 1) tooTall.push(`${w}x${h} at ${size}%: ${c.text} has a head of more than two lines`);
              if (why && why.getBoundingClientRect().height > lh(why) + 1) tooTall.push(`${w}x${h} at ${size}%: ${c.text} has a why of more than one line`);
            }
            if (c.reward) expect(node.querySelector('.reward').getBoundingClientRect().right).toBeLessThanOrEqual(node.getBoundingClientRect().right);
            expect(node.textContent).toContain(c.text);                         // cut on screen, whole in the live region
          }
        } finally { r.cleanup(); }
      }
    }
    expect(tooTall).toEqual([]);
  });
  it('on a phone a caption waits while a tip has the guidance row, and goes up once the tip has closed; a wide screen shows both', async () => {
    for (const [w, h, size, waits] of [[360, 640, 150, true], [390, 844, 125, true], [740, 360, 150, true], [740, 360, 100, true], [844, 390, 100, true], [360, 640, 100, true], [390, 844, 100, true], [1280, 800, 150, false]]) {
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
        expect([w, h, size, shown()]).toEqual([w, h, size, 1]);                 // up as soon as the row is free
        expect(r.ui.celebrations.recent().some((c) => c.text.startsWith(T.goalDone))).toBe(true);   // the goal's caption, or in Recent if two newer ones queued behind it
      } finally { r.cleanup(); }
    }
  });
  // The rows under the top bar together (final review; spec 6.1, nothing over the middle of the map). On a phone the goals
  // strip, a tip and a caption share one guidance row (rulings 163 and 164), so the tallest of them alone counts; a wide
  // screen stacks all three.
  it('shows one of the goals strip, a tip and a caption at a time on a phone, so the rows end above the middle of the screen', async () => {
    const over = [];
    for (const [w, h] of [[360, 640], [390, 844], [740, 360], [844, 390], [1280, 800]]) {
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
            const bottom = r.root.querySelector('#under-bar').getBoundingClientRect().bottom;
            if (bottom > worst) { worst = bottom; worstAt = i; }
          });
          r.world.goals.completed = GUIDE_GOALS.slice(0, worstAt);
          r.ui.refresh();
          const key = `${w}x${h} at ${size}%`;
          const phone = r.store.get().layout !== 'wide';
          const shownRows = () => ['#goals .goal-strip', '#tip .tip-row', '#cheer .cheer'].filter((sel) => { const n = r.root.querySelector(sel); return n && n.getBoundingClientRect().height > 2; });
          const end = () => (r.root.querySelector('#under-bar').getBoundingClientRect().bottom / h) * 100;
          if (!(end() < 50)) over.push(`${key} with the goal: ends at ${end().toFixed(1)}%`);
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', lead: `${T.goalDone}: `, text: goalById('plots').text, reward: goalById('plots').reward });
          expect([key, shownRows()]).toEqual([key, phone ? ['#cheer .cheer'] : ['#goals .goal-strip', '#cheer .cheer']]);
          if (!(end() < 50)) over.push(`${key} with a caption: ends at ${end().toFixed(1)}%`);
          expect(r.ui.tips.trigger('plotsPaused')).toBe(true);                // the tip arrives while the caption is up: it takes the row
          expect([key, shownRows()]).toEqual([key, phone ? ['#tip .tip-row'] : ['#goals .goal-strip', '#tip .tip-row', '#cheer .cheer']]);
          if (phone && !(end() < 50)) over.push(`${key} with a tip: ends at ${end().toFixed(1)}%`);
        } finally { r.cleanup(); }
      }
    }
    expect(over).toEqual([]);
  });
  it('in the game: a phone words a goal\'s caption as the strip changing, shows only info captions under a banner, and lists every caption under Recent', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        const phone = w < 900, cheer = r.root.querySelector('#cheer');
        r.ui.celebrations.clear();
        r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
        const node = cheer.querySelector('.cheer');
        expect(node.querySelector('.text').textContent).toBe(`${T.goalDone}: ${GOALS[0].text}`);   // whole for screen readers
        expect([w, node.querySelector('.icon').textContent, node.querySelector('.lead').getBoundingClientRect().width > 2]).toEqual([w, phone ? T.doneMark : '★', !phone]);   // "✓ Lay a road +25 gold" on a phone
        r.ui.celebrations.clear();
        r.world.gold = -5;                                                     // debt: a banner
        r.ui.refresh();
        r.ui.onEvents([{ type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
        expect([w, cheer.querySelectorAll('.cheer').length]).toEqual([w, phone ? 0 : 1]);   // a phone under a banner: to Recent only
        r.ui.celebrations.clear();
        r.ui.celebrations.show({ tier: 'info', text: 'The blaze at the potter is out.' });
        expect([w, cheer.querySelectorAll('.cheer.info').length]).toEqual([w, 1]);   // info captions still show
        r.store.set(openSheet(r.store.get(), 'goals'));
        const recent = [...r.root.querySelectorAll('#sheet .recent li .text')].map((n) => n.firstChild.textContent);
        expect(recent).toEqual(['The blaze at the potter is out.', FIRST_TEXT.first_family.head, `${T.goalDone}: ${GOALS[0].text}`]);   // newest first
      } finally { r.cleanup(); }
    }
  });
  it('in the game: a caption with its why hidden or its words cut shows More, and a tap opens it in place with every word in sight, to 40% of the screen at most (P8)', async () => {
    const longWhy = Array.from({ length: 14 }, () => FIRST_TEXT.first_cottage.why).join(' ');
    for (const [w, h, size] of [[360, 640, 150], [390, 844, 125], [360, 640, 100], [844, 390, 150], [1280, 800, 100]]) {
      const r = await rigUI({ width: w, height: h });
      r.renderer.renderFrame = () => {};
      const at = `${w}x${h} at ${size}%`;
      try {
        r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
        const wide = w >= 1000;
        const canvas = r.root.querySelector('#map').getBoundingClientRect();
        // First Shack: the why is the whole of what is cut at larger text; a very long why is cut at any phone size.
        for (const [c, expectMore] of [[{ text: FIRST_TEXT.first_shack.head, why: FIRST_TEXT.first_shack.why }, !wide && size > 100], [{ text: 'First Cottage', why: longWhy }, !wide]]) {
          r.ui.celebrations.clear();
          r.ui.celebrations.show({ tier: 'first', ...c });
          r.frame(1000 * (1 + size));
          const node = r.root.querySelector('#cheer .cheer'), more = node.querySelector('.more');
          expect([at, c.text, more.hidden]).toEqual([at, c.text, !expectMore]);
          if (!expectMore) continue;
          fire(node, 'click');                                             // a tap on the caption: it asks, createUI opens it
          r.frame(1000 * (2 + size));
          const why = node.querySelector('.why');
          expect([at, r.store.get().guidanceOpen, node.classList.contains('open'), more.getAttribute('aria-expanded')]).toEqual([at, true, true, 'true']);
          expect([at, why.offsetWidth > 1, why.getBoundingClientRect().height > 0]).toEqual([at, true, true]);   // the why is back in sight at every size
          expect([at, node.getBoundingClientRect().bottom - canvas.top <= 0.4 * h + 1]).toEqual([at, true]);
          if (c.why === longWhy) expect([at, node.scrollHeight > node.clientHeight, getComputedStyle(node).overflowY]).toEqual([at, true, 'auto']);   // longer than 40% scrolls inside
          fire(r.root, 'keydown', { key: 'Escape' });
          expect([at, r.store.get().guidanceOpen, node.classList.contains('open'), r.ui.celebrations.showing()]).toEqual([at, false, false, true]);   // Esc closes the row, the caption stays
        }
        if (wide) expect([r.ui.setGuidanceOpen(true), r.store.get().guidanceOpen]).toEqual([false, false]);     // a wide screen has no row to open
      } finally { r.cleanup(); }
    }
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
