import { describe, it, expect } from '../harness.js';
import { createGoalsStrip, goalsSheet, dateKeyOf } from '../../src/ui/goalsList.js';
import { GOALS, EVENT_GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD } from '../../src/data/daily.js';
import { goalById } from '../../src/sim/goals.js';
import { settle } from '../../src/sim/settle.js';
import { tickDay } from '../../src/sim/clock.js';
import { T, CHAPTER_NAMES, DAILY_TEXT, goalsProgressText, rewardText, progressText, progressLabel, dailyDoneText, showMeLabel } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const DAY_MS = 24 * 3600 * 1000;
const FIXED = new Date(2026, 9, 11, 12, 0, 0).getTime();   // local noon on 11 October 2026

// Every visible button of the strip is whole: its label on one line, not clipped, inside the strip, which sits
// inside #under-bar. A button that wrapped its label ("Show me" on two lines) or ran off the edge fails.
function expectWholeButtons(r) {
  const bar = r.root.querySelector('#under-bar').getBoundingClientRect();
  const strip = r.root.querySelector('#goals .goal-strip');
  const box = strip.getBoundingClientRect();
  expect(box.left >= bar.left - 0.5).toBe(true);
  expect(box.right <= bar.right + 0.5).toBe(true);
  const buttons = [...strip.querySelectorAll('button')].filter((b) => !b.hidden);
  expect(buttons.length).toBeGreaterThanOrEqual(3);                // Show me, Goals and Skip guide
  for (const b of buttons) {
    const rb = b.getBoundingClientRect();
    expect(rb.height).toBeGreaterThanOrEqual(44);
    expect(rb.left >= box.left - 0.5).toBe(true);
    expect(rb.right <= box.right + 0.5).toBe(true);
    expect(b.scrollWidth <= b.clientWidth + 1).toBe(true);        // the label is not clipped
    const range = document.createRange();
    range.selectNodeContents(b);
    expect(range.getClientRects().length).toBe(1);                // ...and sits on a single line
  }
}

describe('ui goals v2', () => {
  it('reads the local date as YYYY-MM-DD, zero padded', () => {
    expect(dateKeyOf(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05');
    expect(dateKeyOf(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
    expect(dateKeyOf(FIXED)).toBe('2026-10-11');
  });
  it('names every chapter and every daily goal, and words rewards in gold', () => {
    for (const g of [...GOALS, ...EVENT_GOALS]) expect(typeof CHAPTER_NAMES[g.chapter]).toBe('string');
    for (const d of DAILY_POOL) expect(typeof DAILY_TEXT[d.id]).toBe('string');
    expect(rewardText(25)).toBe('+25 gold');
    expect(progressText(2, 6)).toBe('2 of 6');
    expect(showMeLabel('Lay a road')).toBe('Show me: Lay a road');
  });
  it('shows a progress chip that counts, the reward in gold and a filled Show me', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.goals.completed.push('road');
      const strip = createGoalsStrip({ container: root, world, onShowMe: () => {}, onOpen: () => {} });
      const chip = root.querySelector('.goal-strip .chip');
      expect(chip.textContent).toBe(progressText(0, 6));
      expect(chip.getAttribute('aria-label')).toBe(progressLabel(0, 6));
      expect(root.querySelector('.goal-strip .reward').textContent).toBe(rewardText(GOAL_REWARD));
      expect(root.querySelector('.goal-strip .show-me').classList.contains('primary')).toBe(true);
      addRaw(world, 'house', 3, 3);
      strip.render();
      expect(root.querySelector('.goal-strip .chip').textContent).toBe(progressText(1, 6));
      world.goals.completed.length = 0;                            // the road goal counts nothing: no chip
      strip.render();
      expect(root.querySelector('.goal-strip .chip').hidden).toBe(true);
    } finally { cleanup(); }
  });
  it('names its goal on every Show me, in the strip and in the sheet, so several of them stay apart', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      createGoalsStrip({ container: root, world, onShowMe: () => {}, onOpen: () => {} });
      const strip = root.querySelector('.goal-strip .show-me');
      expect(strip.getAttribute('aria-label')).toBe(showMeLabel(GOALS[0].text));
      expect(strip.getAttribute('aria-label').startsWith(strip.textContent)).toBe(true);   // starts with the visible words
      world.goals.triggered.push('fix_bazaar');                    // an event goal in front, with its own words
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      const labels = [...root.querySelectorAll('.goals .show-me')].map((b) => b.getAttribute('aria-label'));
      expect(labels).toEqual(['fix_bazaar', 'road', 'plots'].map((id) => showMeLabel(goalById(id).text)));
      expect(new Set(labels).size).toBe(3);
    } finally { cleanup(); }
  });
  it('groups the goals sheet by chapter, with progress and the reward unit on every row, event goals first', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.goals.completed.push('road');
      addRaw(world, 'house', 3, 3); addRaw(world, 'house', 4, 3);
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([CHAPTER_NAMES.first_homes, CHAPTER_NAMES.feed]);
      const rows = [...root.querySelectorAll('.goal')];
      expect(rows[0].textContent).toContain(progressText(2, 6));
      for (const row of rows) expect(row.textContent).toContain(rewardText(GOAL_REWARD));
      for (const row of rows) expect(row.querySelector('.show-me').classList.contains('primary')).toBe(true);
      world.goals.triggered.push('fix_bazaar');
      root.innerHTML = '';
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect(root.querySelector('h3').textContent).toBe(CHAPTER_NAMES.event);
      expect(root.querySelector('.goal').textContent).toContain(goalById('fix_bazaar').text);
      expect(root.querySelector('.goal').textContent).toContain(rewardText(goalById('fix_bazaar').reward));
      world.goals.completed.push('fix_bazaar');                    // event goals never count against the chain
      root.innerHTML = '';
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect(root.textContent).toContain(goalsProgressText(2, GOALS.length + 1));   // Stage 3: Founded Thebes counts, done from the start
    } finally { cleanup(); }
  });
  it('settles goals after every command, so plots placed while paused finish the step without a game day', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const day = r.world.day, gold = r.world.gold;
      expect(r.world.speed).toBe(0);
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9); r.ui.placement.pointAt(17, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);               // 4 plots beside the rig's 2 huts: 6
      expect(r.world.goals.completed).toContain('plots');
      expect(r.world.day).toBe(day);
      expect(r.world.guide.done).toBe(true);                         // road, plots, well, food and temple all done
      expect(r.world.gold).toBeGreaterThan(gold);
      expect(r.root.querySelector('#goals .text').textContent).toBe(goalById('homes_cottage').text);
      expect(r.root.querySelector('#goals .chip').textContent).toBe(progressText(0, 8));
      expect(r.root.querySelector('#goals .skip-guide').hidden).toBe(true);
    } finally { r.cleanup(); }
  });
  it('puts the Undo toast last, so goals finished by the same command never push it out', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(5, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);               // road, well, food and temple goals finish now
      const toasts = [...r.root.querySelectorAll('#toasts .toast')];
      const undo = toasts.find((t) => t.querySelector('.action'));
      expect(Boolean(undo)).toBe(true);
      expect(undo.querySelector('.action').textContent).toBe(T.undo);
      expect(toasts[toasts.length - 1]).toBe(undo);
    } finally { r.cleanup(); }
  });
  it('offers Skip guide while the guide runs; one tap turns it off and hides the button', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const skip = r.root.querySelector('#goals .skip-guide');
      expect(skip.hidden).toBe(false);
      expect(skip.textContent).toBe(T.skipGuide);
      fire(skip, 'click');
      expect(r.world.guide.on).toBe(false);
      expect(r.root.querySelector('#goals .skip-guide').hidden).toBe(true);
      expect(r.root.querySelector('#goals .goal-strip').hidden).toBe(false);   // the goals carry on without the guide
    } finally { r.cleanup(); }
  });
  it('hides the whole goals row when nothing is open, so #under-bar keeps no gap for it', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.goals.completed.push(...GOALS.map((g) => g.id));
      r.ui.refresh();
      expect(getComputedStyle(r.root.querySelector('#goals')).display).toBe('none');
    } finally { r.cleanup(); }
  });
  it('fits the strip on a phone at 150% text: 44 px buttons, nothing past the edge, the goal not cut off', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      const strip = r.root.querySelector('#goals .goal-strip');
      expectWholeButtons(r);
      const text = strip.querySelector('.text');
      expect(text.scrollWidth <= text.clientWidth + 1).toBe(true);   // 'Lay a road' fits on its own line
      expect(getComputedStyle(strip.querySelector('.reward')).display).toBe('none');   // portrait: the reward reads in the sheet
    } finally { r.cleanup(); }
  });
  it('keeps every strip button whole on 360 and 390 px phones at each text size, with the longest goal and a progress chip showing', async () => {
    for (const [width, height] of [[390, 844], [360, 740]]) {
      const r = await rigUI({ width, height });
      try {
        r.world.goals.completed.push('road', 'plots');                 // 'Build a well so huts become shacks', 0 of 1
        r.ui.refresh();
        for (const size of [100, 125, 150]) {
          r.ui.settings.set({ textSize: size });
          expectWholeButtons(r);
          const strip = r.root.querySelector('#goals .goal-strip');
          expect(strip.querySelector('.chip').hidden).toBe(false);
          expect(strip.textContent).toContain(goalById('well').text);
          const text = strip.querySelector('.text');
          expect(text.scrollWidth <= text.clientWidth + 1).toBe(true); // the goal's words are all there, none cut off
          const bar = r.root.querySelector('#under-bar').getBoundingClientRect();
          expect(strip.querySelector('.chip').getBoundingClientRect().right <= bar.right + 0.5).toBe(true);
        }
      } finally { r.cleanup(); }
    }
  });
  it('keeps the strip whole on a wide screen too, with the reward in gold showing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expectWholeButtons(r);
      const reward = r.root.querySelector('#goals .goal-strip .reward');
      expect(getComputedStyle(reward).display === 'none').toBe(false);
      expect(reward.textContent).toBe(rewardText(GOAL_REWARD));
    } finally { r.cleanup(); }
  });
  it('keeps the goal readable in every layout at each text size: a text column of 8em or more, a strip of at most two lines and a button row, near the top', async () => {
    const layouts = [['wide', 1280, 800], ['compact', 740, 360], ['compact', 844, 390], ['portrait', 390, 844]];
    for (const [layout, width, height] of layouts) {
      const r = await rigUI({ width, height });
      try {
        expect(r.store.get().layout).toBe(layout);
        r.world.goals.completed.push('road', 'plots');                // the longest chain goal with its chip: 'Build a well so huts become shacks', 0 of 1
        r.ui.refresh();
        for (const size of [100, 125, 150]) {
          r.ui.settings.set({ textSize: size });
          const where = `${layout} ${width}x${height} at ${size}%`;
          const strip = r.root.querySelector('#goals .goal-strip');
          const text = strip.querySelector('.text');
          const em = parseFloat(getComputedStyle(text).fontSize);
          const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
          const line = Number.isFinite(lineHeight) ? lineHeight : em * 1.4;
          const top = r.root.getBoundingClientRect().top;
          const box = strip.getBoundingClientRect();
          expect(`${where}: text column ${text.getBoundingClientRect().width >= 8 * em}`).toBe(`${where}: text column true`);
          expect(`${where}: strip height ${box.height <= 2 * line + 44 + 8}`).toBe(`${where}: strip height true`);   // wrapping happens by rows, never inside the words
          // never over the middle of the map: the top third, or in a landscape phone, where the top bar alone takes
          // a sixth of the screen at large text, above the middle
          const limit = (layout === 'compact' ? 0.5 : 1 / 3) * height;
          expect(`${where}: bottom ${box.bottom - top <= limit}`).toBe(`${where}: bottom true`);
          expectWholeButtons(r);
        }
      } finally { r.cleanup(); }
    }
  });
  it('shows the reward in the strip on wide screens only, not on phones in either orientation', async () => {
    for (const [layout, width, height] of [['wide', 1280, 800], ['compact', 740, 360], ['portrait', 390, 844]]) {
      const r = await rigUI({ width, height });
      try {
        expect(r.store.get().layout).toBe(layout);
        const shown = getComputedStyle(r.root.querySelector('#goals .goal-strip .reward')).display !== 'none';
        expect(`${layout}: reward ${shown}`).toBe(`${layout}: reward ${layout === 'wide'}`);
      } finally { r.cleanup(); }
    }
  });
  it('words a finished daily goal as Done with no reward, and an open one with its progress and reward', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.daily = { date: '2026-10-11', picks: ['plots4', 'well1', 'roads10'], base: { plots4: 0, well1: 0, roads10: 0 }, done: ['well1'], swapped: false };
      world.tally.dailyDone = 1;
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      const [open, done, open2] = [...root.querySelectorAll('.daily')];
      expect(done.textContent).toContain(T.done);
      expect(done.textContent).toContain(DAILY_TEXT.well1);
      expect(done.textContent.includes('gold')).toBe(false);           // the reward is paid: nothing left to promise
      expect(done.querySelector('.swap')).toBe(null);
      for (const row of [open, open2]) expect(row.textContent).toContain(rewardText(DAILY_REWARD));
      expect(root.textContent).toContain(dailyDoneText(1));
    } finally { cleanup(); }
  });
  it('hands focus to Show me when Skip guide hides itself, and to the Today heading when a swap removes its button', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const skip = r.root.querySelector('#goals .skip-guide');
      skip.focus();
      expect(document.activeElement).toBe(skip);
      fire(skip, 'click');
      expect(r.root.querySelector('#goals .skip-guide').hidden).toBe(true);
      expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));   // focus stays in the strip
      settle(r.world);
      r.ui.afterCommand({ kind: 'check', undoable: false });
      r.store.set(openSheet(r.store.get(), 'goals'));
      const swap = r.root.querySelector('#sheet .daily .swap');
      swap.focus();
      expect(document.activeElement).toBe(swap);
      fire(swap, 'click');
      expect(r.world.daily.swapped).toBe(true);
      expect(r.root.querySelector('#sheet .daily .swap')).toBe(null);
      expect(document.activeElement).toBe(r.root.querySelector('#sheet .today'));
    } finally { r.cleanup(); }
  });
  it('keeps every button in the goals sheet whole on a phone at each text size: Show me and Swap on one line, inside the sheet', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      settle(r.world);
      r.world.goals.triggered.push('more_workers');                  // a long event goal in front, with Today below
      r.ui.afterCommand({ kind: 'check', undoable: false });
      r.store.set(openSheet(r.store.get(), 'goals'));
      for (const size of [100, 125, 150]) {
        r.ui.settings.set({ textSize: size });
        const sheet = r.root.querySelector('#sheet').getBoundingClientRect();
        const buttons = [...r.root.querySelectorAll('#sheet .goals button')];
        expect(buttons.some((b) => b.classList.contains('show-me'))).toBe(true);
        expect(buttons.some((b) => b.classList.contains('swap'))).toBe(true);
        for (const b of buttons) {
          const rb = b.getBoundingClientRect();
          expect(rb.height).toBeGreaterThanOrEqual(44);
          expect(rb.left >= sheet.left - 0.5 && rb.right <= sheet.right + 0.5).toBe(true);
          const range = document.createRange();
          range.selectNodeContents(b);
          expect(range.getClientRects().length).toBe(1);             // 'Show me' never breaks over two lines
        }
        for (const reward of r.root.querySelectorAll('#sheet .goals .reward')) {
          const range = document.createRange();
          range.selectNodeContents(reward);
          expect(range.getClientRects().length).toBe(1);             // '+25 gold' stays together
        }
      }
    } finally { r.cleanup(); }
  });
  it('shows Today after the temple goal: three daily goals with progress, one swap, the lifetime count, a new draw each day', async () => {
    let now = FIXED;
    const r = await rigUI({ width: 1280, height: 800, clock: () => now });
    try {
      expect(r.world.daily).toBe(null);                              // not before the temple goal
      settle(r.world);                                               // the rig's city meets road, well, food and temple
      expect(r.world.goals.completed).toContain('temple');
      r.ui.afterCommand({ kind: 'check', undoable: false });         // any command draws the day's goals
      expect(r.world.daily.date).toBe('2026-10-11');
      r.store.set(openSheet(r.store.get(), 'goals'));
      const sheet = r.root.querySelector('#sheet');
      expect([...sheet.querySelectorAll('h3')].map((h) => h.textContent)).toContain(T.today);
      const rows = [...sheet.querySelectorAll('.daily')];
      expect(rows.length).toBe(DAILY_COUNT);
      r.world.daily.picks.forEach((id, i) => expect(rows[i].textContent).toContain(DAILY_TEXT[id]));
      expect(rows[0].textContent).toContain(rewardText(DAILY_REWARD));
      const firstPick = DAILY_POOL.find((d) => d.id === r.world.daily.picks[0]);
      expect(rows[0].querySelector('.chip').textContent).toBe(progressText(0, firstPick.n));   // counted from the draw's snapshot
      expect(sheet.textContent).toContain(dailyDoneText(r.world.tally.dailyDone));
      const swaps = sheet.querySelectorAll('.daily .swap');
      expect(swaps.length).toBe(DAILY_COUNT);
      const before = r.world.daily.picks.slice();
      fire(swaps[0], 'click');
      expect(r.world.daily.swapped).toBe(true);
      expect(r.world.daily.picks[0] === before[0]).toBe(false);
      expect(new Set(r.world.daily.picks).size).toBe(DAILY_COUNT);
      expect(r.root.querySelector('#sheet .daily').textContent).toContain(DAILY_TEXT[r.world.daily.picks[0]]);
      expect(r.root.querySelectorAll('#sheet .daily .swap').length).toBe(0);   // one swap a day
    } finally { r.cleanup(); }
  });
  it('keeps the session\'s goals when the clock passes midnight, and the next start draws the new day', async () => {
    let now = FIXED;
    const r = await rigUI({ width: 1280, height: 800, clock: () => now });
    let yesterday;
    try {
      settle(r.world);
      r.ui.afterCommand({ kind: 'check', undoable: false });
      const picks = r.world.daily.picks.slice();
      r.store.set(openSheet(r.store.get(), 'goals'));
      fire(r.root.querySelector('#sheet .daily .swap'), 'click');    // use the day's swap
      const swapped = r.world.daily.picks.slice();
      now += DAY_MS;                                                  // midnight passes mid-session
      tickDay(r.world);
      r.frame(16);                                                    // a rendered game day: syncDaily runs
      r.ui.afterCommand({ kind: 'check', undoable: false });
      expect(r.world.daily.date).toBe('2026-10-11');                 // nothing expires: same goals, same swap
      expect(r.world.daily.picks).toEqual(swapped);
      expect(r.world.daily.swapped).toBe(true);
      expect(swapped.join() === picks.join()).toBe(false);
      yesterday = JSON.parse(JSON.stringify(r.world.daily));
    } finally { r.cleanup(); }
    const next = await rigUI({ width: 1280, height: 800, clock: () => now });   // the next start, on the new day
    try {
      settle(next.world);
      next.world.daily = yesterday;                                   // the city carried yesterday's goals in its save
      next.ui.afterCommand({ kind: 'check', undoable: false });
      expect(next.world.daily.date).toBe(dateKeyOf(now));
      expect(next.world.daily.date === '2026-10-11').toBe(false);
      expect(next.world.daily.swapped).toBe(false);
      expect(next.world.daily.done).toEqual([]);
    } finally { next.cleanup(); }
  });
});
