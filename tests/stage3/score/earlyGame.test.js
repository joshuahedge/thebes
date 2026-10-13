import { describe, it, expect } from '../../harness.js';
import { GOALS, FOUNDED, OPENING_LAST } from '../../../src/data/goals.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { REMARK_EVERY_MONTHS, SEASONS } from '../../../src/data/tips.js';
import { openingProgress } from '../../../src/sim/goals.js';
import { scoreOf } from '../../../src/sim/score.js';
import { createWorld } from '../../../src/sim/world.js';
import { createGoalsStrip, goalsSheet, thresholdFor } from '../../../src/ui/goalsList.js';
import { createCelebrations, remarkFor } from '../../../src/ui/celebrate.js';
import { T, CITIZEN_REMARKS, goalsProgressText, thresholdMilestoneText, thresholdMedalText } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { mount } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { setGuide } from '../../../src/sim/commands.js';
import { openSheet, closeSheet } from '../../../src/ui/modes.js';

const opening = GOALS.slice(0, GOALS.findIndex((g) => g.id === OPENING_LAST) + 1).map((g) => g.id);

describe('s3 score founded thebes', () => {
  it('counts Founded Thebes as done from the start, so the opening chain opens at 1 of 11', () => {
    const w = createWorld({ seed: 3 });
    expect([FOUNDED.text, opening.length + 1, GOALS.some((g) => g.id === FOUNDED.id)]).toEqual(['Founded Thebes', 11, false]);
    expect(openingProgress(w)).toEqual({ done: 1, of: 11 });
    w.goals.completed.push('road', 'plots');
    expect(openingProgress(w)).toEqual({ done: 3, of: 11 });
    w.goals.completed.push(...opening);
    expect(openingProgress(w)).toBe(null);
  });
  it('shows the count in the strip\'s label through the opening chain, then "Goal"', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      const strip = createGoalsStrip({ container: root, world, onShowMe() {}, onOpen() {} });
      expect(root.querySelector('.goal-strip .label').textContent).toBe('1 of 11');
      world.goals.completed.push('road');
      strip.render();
      expect(root.querySelector('.goal-strip .label').textContent).toBe('2 of 11');
      world.goals.completed.push(...opening);
      strip.render();
      expect(root.querySelector('.goal-strip .label').textContent).toBe(T.goal);
    } finally { cleanup(); }
  });
  it('ticks Founded Thebes at the head of its chapter in the goals sheet, and counts it', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      goalsSheet(world, { onShowMe() {} })(root, { close() {} });
      expect(root.textContent).toContain(goalsProgressText(1, GOALS.length + 1));
      const first = root.querySelector('ul.goals').firstElementChild;
      expect([first.className, first.textContent]).toEqual(['founded done', `${FOUNDED.text} ${T.doneMark} ${T.done}`]);
      expect(first.querySelector('[aria-hidden="true"]').textContent).toBe(`${T.doneMark} `);
      expect(root.querySelectorAll('.goal').length).toBe(3);                 // three open goals beside it
    } finally { cleanup(); }
  });
});

describe('s3 score next threshold', () => {
  it('names the next milestone by the people the city has had, as the milestone counts them', () => {
    const w = makeTestWorld();
    const home = addRaw(w, 'house', 0, 0, { tier: 1, residents: 83 });
    expect(thresholdFor(w)).toEqual({ kind: 'milestone', text: 'Town: 83 of 150 people', share: 83 / 150 });
    w.tally.peakPeople = 90;                                              // 90 had: Town comes at 150 had, not 150 now
    expect(thresholdFor(w).text).toBe(thresholdMilestoneText('Town', 90, 150));
    w.milestone = 'town'; home.residents = 200; w.tally.peakPeople = 200;
    expect(thresholdFor(w)).toEqual({ kind: 'milestone', text: 'Market town: 200 of 250 people', share: 0.5 });
  });
  it('names the next medal from Capital, and nothing at gold', () => {
    const w = makeTestWorld();
    w.milestone = 'capital';
    const s = scoreOf(w);
    expect([s.raw, s.next]).toEqual([210, { medal: 'silver', points: 90 }]);   // score v2: silver at 300   // an empty capital: growth full, jobs, treasury, safety
    expect(thresholdFor(w)).toEqual({ kind: 'medal', text: 'Silver: 90 points to go', share: (210 - 200) / (300 - 200) });
    expect(thresholdMedalText({ medal: 'silver', points: 38 })).toBe('Silver: 38 points to go');
    expect(thresholdMedalText({ medal: 'gold', points: 1 })).toBe('Gold: 1 point to go');
  });
  it('shows a slim bar under the strip, with words and a meter that repeats them, and on its own at Capital', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#goals .threshold');
      expect(bar.previousElementSibling.classList.contains('goal-strip')).toBe(true);
      expect([bar.hidden, bar.querySelector('.threshold-text').textContent]).toEqual([false, thresholdFor(r.world).text]);
      const meter = bar.querySelector('[role="progressbar"]');
      expect([meter.getAttribute('aria-label'), meter.getAttribute('aria-valuenow')]).toEqual([thresholdFor(r.world).text, String(Math.round(thresholdFor(r.world).share * 100))]);
      r.world.goals.completed.push(...GOALS.map((g) => g.id));
      r.ui.refresh();
      expect([r.root.querySelector('#goals .goal-strip').hidden, bar.hidden, r.root.querySelector('#goals').hidden]).toEqual([true, true, true]);   // below Capital with nothing open: no row
      r.world.milestone = 'capital';
      r.ui.refresh();
      expect([bar.hidden, r.root.querySelector('#goals').hidden, bar.textContent]).toEqual([false, false, thresholdFor(r.world).text]);
    } finally { r.cleanup(); }
  });
  it('shows the bar on a phone only in calm portrait play: not while the guide runs, nor with a banner, a tip, a caption, a sheet or a tool, nor held sideways', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const bar = r.root.querySelector('#goals .threshold');
      const shows = () => bar.getBoundingClientRect().height > 2;
      setGuide(r.world, true);
      r.ui.refresh();
      expect(['guide', shows()]).toEqual(['guide', false]);                    // spec 4.1: never while the guide runs
      setGuide(r.world, false);
      r.ui.refresh();
      expect(['calm', shows()]).toEqual(['calm', true]);
      r.ui.celebrations.show({ tier: 'first', text: 'Something' });
      expect(['caption', shows()]).toEqual(['caption', false]);                // the caption has the guidance row
      r.ui.celebrations.clear();
      expect(['calm', shows()]).toEqual(['calm', true]);
      r.world.gold = -5;                                                       // debt: the alert row
      r.ui.refresh();
      expect(['banner', shows()]).toEqual(['banner', false]);
      r.world.gold = 500;
      r.ui.refresh();
      expect(['calm', shows()]).toEqual(['calm', true]);
      r.ui.placement.start({ kind: 'road' });
      expect(['tool', shows()]).toEqual(['tool', false]);
      r.ui.placement.cancel();
      expect(['calm', shows()]).toEqual(['calm', true]);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(['sheet', shows()]).toEqual(['sheet', false]);
      r.store.set(closeSheet(r.store.get()));
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      expect(['tip', shows()]).toEqual(['tip', false]);
      r.ui.tips.dismiss();
      expect(['calm', shows()]).toEqual(['calm', true]);
      r.resize(844, 390);
      expect(['sideways', r.store.get().layout, shows()]).toEqual(['sideways', 'compact', false]);
      r.resize(390, 844);
      expect(['calm', shows()]).toEqual(['calm', true]);
    } finally { r.cleanup(); }
  });

  it('keeps the bar under a banner on a wide screen, which has room for both', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#goals .threshold');
      expect([document.body.dataset.layout, getComputedStyle(bar).display]).toEqual(['wide', 'flex']);
      document.body.classList.add('has-banner');
      expect(getComputedStyle(bar).display).toBe('flex');
    } finally { document.body.classList.remove('has-banner'); r.cleanup(); }
  });
});

describe('s3 score citizen remarks', () => {
  it('keeps at least 24 remarks, eight a season, each tied to a building', () => {
    expect(CITIZEN_REMARKS.length).toBeGreaterThanOrEqual(24);
    for (const s of ['akhet', 'peret', 'shemu']) expect([s, CITIZEN_REMARKS.filter((r) => r.season === s).length >= 8]).toEqual([s, true]);
    for (const r of CITIZEN_REMARKS) expect([r.text, Boolean(BUILDINGS[r.type])]).toEqual([r.text, true]);
    expect(new Set(CITIZEN_REMARKS.map((r) => r.text)).size).toBe(CITIZEN_REMARKS.length);
    expect(SEASONS.map((s, i) => `${i + 1}:${s}`).join(' ')).toBe('1:shemu 2:shemu 3:shemu 4:shemu 5:shemu 6:shemu 7:akhet 8:akhet 9:akhet 10:akhet 11:peret 12:peret');   // Stage 4.6 (ruling 346): the flood is months 7-10
  });
  it('picks one every third month from the season\'s remarks whose building the city has, the same each time', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 5 });
    addRaw(w, 'well', 2, 0);
    w.day = 3 * 30;                                                         // month index 3: the 4th month, Shemu (Stage 4.6: months 3-6)
    const r = remarkFor(w);
    expect(CITIZEN_REMARKS.filter((x) => x.season === 'shemu' && ['house', 'well'].includes(x.type)).map((x) => x.text)).toContain(r);
    expect(remarkFor(w)).toBe(r);
    w.day = 4 * 30;
    expect(remarkFor(w)).toBe(null);                                        // not a third month
    w.day = 6 * 30;                                                         // the 7th month, Akhet: only the house's remark (the well's speaks of the river rising, heard only in a Fair or better flood year)
    expect(remarkFor(w)).toBe(CITIZEN_REMARKS.find((x) => x.season === 'akhet' && x.type === 'house').text);
    w.milestone = 'town';
    w.flood = { year: 1, level: 'good', forecast: null, from: 180, to: 269, applied: null, risen: false };
    const heard = new Set();
    for (let seed = 1; seed <= 40; seed++) { w.seed = seed; heard.add(remarkFor(w)); }
    expect([...heard].sort()).toEqual(CITIZEN_REMARKS.filter((x) => x.season === 'akhet' && ['house', 'well'].includes(x.type)).map((x) => x.text).sort());   // a Good year: both are heard
    w.flood.level = 'low';
    for (let seed = 1; seed <= 40; seed++) { w.seed = seed; expect(remarkFor(w)).toBe(CITIZEN_REMARKS.find((x) => x.season === 'akhet' && x.type === 'house').text); }   // a Low year: the river did not rise as it should
    expect(REMARK_EVERY_MONTHS).toBe(3);
    const bare = makeTestWorld();
    bare.day = 90;
    expect(remarkFor(bare)).toBe(null);                                     // no buildings, no remark
  });
  it('says it in the caption row at a month end only when the row is free and Help is not Off', async () => {
    const r = await rigUI();
    try {
      r.world.day = 90;
      const want = remarkFor(r.world);
      expect(typeof want).toBe('string');
      r.ui.celebrations.clear();
      r.ui.scoreUi.onEvents([{ type: 'month' }]);
      const cheer = r.root.querySelector('#cheer .cheer');
      expect([cheer.className, cheer.querySelector('.text').textContent, cheer.querySelector('.icon').textContent, cheer.querySelector('.reward')]).toEqual(['cheer remark', want, '❝', null]);
      r.ui.celebrations.clear();
      r.ui.celebrations.show({ tier: 'first', text: 'Goal done' });
      r.ui.scoreUi.onEvents([{ type: 'month' }]);
      expect(r.ui.celebrations.pending()).toBe(0);                          // the row was taken: no remark queued
      r.ui.celebrations.clear();
      r.ui.settings.set({ help: 'off' });
      r.ui.scoreUi.onEvents([{ type: 'month' }]);
      expect(r.root.querySelector('#cheer .cheer')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('tells whether the caption row is taken', () => {
    const { root, cleanup } = mount();
    try {
      const timers = [];
      const c = createCelebrations({ container: root, setTimer: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimer() {} });
      expect(c.busy()).toBe(false);
      c.show({ tier: 'first', text: 'A' });
      expect(c.busy()).toBe(true);
      c.clear();
      expect(c.busy()).toBe(false);
    } finally { cleanup(); }
  });
});
