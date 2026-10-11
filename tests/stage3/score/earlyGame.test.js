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

const opening = GOALS.slice(0, GOALS.findIndex((g) => g.id === OPENING_LAST) + 1).map((g) => g.id);

describe('s3 score founded thebes', () => {
  it('counts Founded Thebes as done from the start, so the opening chain opens at 1 of 10', () => {
    const w = createWorld({ seed: 3 });
    expect([FOUNDED.text, opening.length + 1, GOALS.some((g) => g.id === FOUNDED.id)]).toEqual(['Founded Thebes', 10, false]);
    expect(openingProgress(w)).toEqual({ done: 1, of: 10 });
    w.goals.completed.push('road', 'plots');
    expect(openingProgress(w)).toEqual({ done: 3, of: 10 });
    w.goals.completed.push(...opening);
    expect(openingProgress(w)).toBe(null);
  });
  it('shows the count in the strip\'s label through the opening chain, then "Goal"', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      const strip = createGoalsStrip({ container: root, world, onShowMe() {}, onOpen() {} });
      expect(root.querySelector('.goal-strip .label').textContent).toBe('1 of 10');
      world.goals.completed.push('road');
      strip.render();
      expect(root.querySelector('.goal-strip .label').textContent).toBe('2 of 10');
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
    expect([s.raw, s.next]).toEqual([210, { medal: 'silver', points: 30 }]);   // an empty capital: growth full, jobs, treasury, safety
    expect(thresholdFor(w)).toEqual({ kind: 'medal', text: 'Silver: 30 points to go', share: (210 - 160) / (240 - 160) });
    expect(thresholdMedalText({ medal: 'silver', points: 38 })).toBe('Silver: 38 points to go');
    expect(thresholdMedalText({ medal: 'gold', points: 1 })).toBe('Gold: 1 point to go');
  });
  it('shows a slim bar under the strip, with words and a meter that repeats them, and on its own at Capital', async () => {
    const r = await rigUI();
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
  it('steps the bar aside on a phone while a banner, a tip or a caption is up, so the rows end above the middle', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const bar = r.root.querySelector('#goals .threshold');
      expect(getComputedStyle(bar).display).toBe('flex');                      // shown (a flex item of #goals)
      r.ui.celebrations.show({ tier: 'first', text: 'Something' });
      expect(getComputedStyle(bar).display).toBe('none');
      r.ui.celebrations.clear();
      document.body.classList.add('has-banner');
      expect(getComputedStyle(bar).display).toBe('none');
      document.body.classList.remove('has-banner');
      expect(getComputedStyle(bar).display).toBe('flex');                      // shown (a flex item of #goals)
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
    expect(SEASONS.map((s, i) => `${i + 1}:${s}`).join(' ')).toBe('1:akhet 2:akhet 3:akhet 4:akhet 5:peret 6:peret 7:peret 8:peret 9:shemu 10:shemu 11:shemu 12:shemu');
  });
  it('picks one every third month from the season\'s remarks whose building the city has, the same each time', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 5 });
    addRaw(w, 'well', 2, 0);
    w.day = 3 * 30;                                                         // month index 3: the 4th month, Akhet
    const r = remarkFor(w);
    expect(CITIZEN_REMARKS.filter((x) => x.season === 'akhet' && ['house', 'well'].includes(x.type)).map((x) => x.text)).toContain(r);
    expect(remarkFor(w)).toBe(r);
    w.day = 4 * 30;
    expect(remarkFor(w)).toBe(null);                                        // not a third month
    w.day = 6 * 30;                                                         // the 7th month, Peret: only the house's remark
    expect(remarkFor(w)).toBe(CITIZEN_REMARKS.find((x) => x.season === 'peret' && x.type === 'house').text);
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
