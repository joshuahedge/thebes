// Version 6.0, Track A, review round 1: the words that disagreed with the sim, each set up both ways. The due's relief says what the sim does
// (a quarter), the next rank in Advice says the home it needs (milestoneNeedsMet), favour's note says raids only where raids are on, the
// costs line says it is an average, the closing scene is marked seen when it opens (not while it renders) and a loaded city meets the due's tip.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { openSheet } from '../../../src/ui/modes.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { courtDue } from '../../../src/sim/pressure.js';
import { costScale } from '../../../src/sim/costs.js';
import { updateMilestone, milestoneNeedsMet } from '../../../src/sim/progression.js';
import { population } from '../../../src/sim/world.js';
import { nextMilestone } from '../../../src/ui/adviceSheet.js';
import { ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { createReignUi } from '../../../src/ui/v60/reign.js';
import { V60_REIGN_TEXT as R } from '../../../src/ui/text.js';
import { TIERS } from '../../../src/data/housing.js';
import { COURT_DUE, GREAT_WORK } from '../../../src/data/reign.js';
import { QUOTA } from '../../../src/data/s47.js';
import { MONUMENTS } from '../../../src/data/monuments.js';

// A road with a working well, temple and bazaar and a home that has all it needs, as the v50 advice tests build one.
function street(tier = 3) {
  const w = makeTestWorld({ size: 64 });
  setRoad(w, 0, 10, 63, 10);
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  addRaw(w, 'bazaar', 9, 8);
  addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, stockedFor: TIERS[tier].capacity, stock: { grain: 30 } });
  staffAll(w);
  return w;
}
const rigs = [];
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const quietStore = { get: () => ({ sheet: null }), set() {} };

describe('v60 a review: the court\'s due says what the sim does', () => {
  it('says the great work cuts the due to a quarter (from COURT_DUE.greatWork), and only while it rises', () => {
    const w = courtWorld({ open: true });
    w.milestone = 'capital';
    w.gold = 40000;
    w.court.favour = 50;
    w.day = (QUOTA.fromYear - 2) * YEAR + 6 * MONTH;
    const plain = courtDue(w);
    expect(R.dueParts(plain, w.gold).includes('great temple')).toBe(false);
    addRaw(w, GREAT_WORK.type, 22, 12);
    const rising = courtDue(w);
    expect(rising.greatWork).toBe(true);
    expect(COURT_DUE.greatWork).toBe(0.25);
    expect(rising.gold).toBeLessThanOrEqual(plain.gold * COURT_DUE.greatWork + COURT_DUE.step);
    const words = R.dueParts(rising, w.gold);
    expect(words).toContain('cut to a quarter while the great temple rises');
    expect(words.includes('halved')).toBe(false);
  });

  it('says the costs line is an average, as per-building rounding makes it', () => {
    const w = courtWorld({ open: true });
    w.milestone = 'capital';
    expect(R.costsLine(costScale(w))).toContain('on average');
  });
});

describe('v60 a review: Advice names the home the next rank needs', () => {
  test('at 1,300 people without a Villa the next line says none yet and the sim does not advance; with one it says so and the sim does', async () => {
    const w = street();
    w.milestone = 'capital';
    w.tally.peakPeople = 1300;
    updateMilestone(w);
    expect(w.milestone).toBe('capital');                                         // the people are there, the Villa is not
    const next = nextMilestone(w);
    expect([next.id, milestoneNeedsMet(w, next)]).toEqual(['great_capital', false]);
    expect(cityAdvice(w)).toEqual([]);
    const r = await rigUI({ world: w }); rigs.push(r);
    r.store.set(openSheet(r.store.get(), 'advice'));
    const line = () => r.root.querySelector('#sheet .advice-next').textContent;
    expect(line()).toBe(R.nextRank(next, 1300, false));
    expect(line()).toContain('none yet');
    addRaw(w, 'house', 13, 11, { tier: next.needs.tier, residents: TIERS[next.needs.tier].capacity, stockedFor: TIERS[next.needs.tier].capacity, stock: { grain: 30 } });
    expect(milestoneNeedsMet(w, next)).toBe(true);
    const people = Math.max(w.tally.peakPeople, population(w));                  // the Villa itself brings problems to fix, so Advice lists those first: the words are read straight
    expect(ADVICE_TEXT.next(next, people, milestoneNeedsMet(w, next))).toBe(R.nextRank(next, people, true));
    expect(ADVICE_TEXT.next(next, people, true)).toContain('you have one');
    updateMilestone(w);
    expect(w.milestone).toBe('great_capital');
  });

  it('keeps the plain wording for a rank with no needs', () => {
    const town = { id: 'town', name: 'Town', population: 150 };
    expect(ADVICE_TEXT.next(town, 112)).toBe('Next: Town, at 150 people (you have 112)');
  });
});

describe('v60 a review: favour\'s note says raids only where raids are on', () => {
  it('words the raids clause only when raids are on', () => {
    expect(R.favourWhy(true)).toContain('raids');
    expect(R.favourWhy(false).includes('raid')).toBe(false);
    expect(R.favourWhy(false)).toContain('court\'s due');
  });

  test('an accepted demand\'s sheet in a Peaceful city leaves it out, a Normal one keeps it', async () => {
    for (const [difficulty, raids] of [['peaceful', false], ['normal', true]]) {
      const w = uiWorld();
      w.difficulty = difficulty;
      w.demands.open.push({ id: w.demands.nextId++, kind: 'gold', good: null, type: null, amount: 300, reward: 100, day: w.day, accepted: true, offerDue: w.day, due: w.day + 5 * MONTH, months: 5, met: 10, failed: 16, declined: 5, had: null });
      const r = await rigUI({ world: w }); rigs.push(r);
      r.store.set(openSheet(r.store.get(), 'demand'));
      expect([difficulty, r.root.querySelector('#sheet .favour-why').textContent.includes('raids')]).toEqual([difficulty, raids]);
      sweep();
    }
  });
});

describe('v60 a review: the reign\'s UI and the sim', () => {
  test('rendering the closing scene changes nothing in the world; the reign\'s own path marks it seen', async () => {
    const w = uiWorld();
    w.milestone = 'seat';
    const gw = addRaw(w, GREAT_WORK.type, 20, 4);
    gw.site.course = MONUMENTS.great_temple.courses.length;
    gw.site.done = w.day;
    const r = await rigUI({ world: w }); rigs.push(r);
    w.reign.won = w.day;                                                          // won after the city is up (the rig's own refresh would show it at once)
    r.store.set(openSheet(r.store.get(), 'reignWon'));
    expect(r.root.querySelector('#sheet .reign-won')).toBeTruthy();
    expect(w.reign.closed).toBe(false);                                           // a render is not a command
    r.store.set({ ...r.store.get(), sheet: null });
    r.ui.refresh();                                                              // the unseen scene opens itself, once
    expect([r.store.get().sheet && r.store.get().sheet.kind, w.reign.closed]).toEqual(['reignWon', true]);
  });

  it('shows the due\'s tip once to a city loaded after the warning\'s year, not before it, not twice, not with the court shut', () => {
    const w = courtWorld({ open: true });
    const fired = [];
    const ui = createReignUi({ world: w, store: quietStore, fireTip: (id) => { fired.push(id); return true; } });
    w.day = (QUOTA.warnYear - 3) * YEAR;
    ui.refresh();
    expect(fired).toEqual([]);                                                    // years before the warning: the sim's own event will say it
    w.day = (QUOTA.fromYear - 1) * YEAR + 2 * MONTH;                              // loaded in the due's year: nothing else would say it
    ui.refresh();
    ui.refresh();
    expect(fired).toEqual(['dueWarned']);
    const w2 = courtWorld();                                                      // court not open: no due, no tip
    const fired2 = [];
    const ui2 = createReignUi({ world: w2, store: quietStore, fireTip: (id) => { fired2.push(id); return true; } });
    w2.day = (QUOTA.fromYear - 1) * YEAR;
    ui2.refresh();
    expect(fired2).toEqual([]);
  });
});
