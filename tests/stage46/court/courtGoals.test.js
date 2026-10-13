// The Court track's place in the opening chapter and the celebrations (ruling 339): the guided letter's goal, the first, the tip, the achievement,
// and the world state's check.
import { describe, it, expect } from '../../harness.js';
import { EVENT_GOALS, EVENT_REWARD } from '../../../src/data/goals.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { COURT_TALLY, COURT_FIRSTS, COURT_ACHIEVEMENTS, COURT_TIPS, newCourtState, isCourtState, FAVOUR } from '../../../src/data/court.js';
import { triggerEventGoals, openGoals, checkGoals, goalMet, goalById } from '../../../src/sim/goals.js';
import { checkFirsts } from '../../../src/sim/firsts.js';
import { achievementProgress } from '../../../src/sim/achievements.js';
import { sendRequest, refuseRequest, readLetter, courtDay } from '../../../src/sim/court.js';
import { createWorld } from '../../../src/sim/world.js';
import { FIRST_TEXT, TIP_TEXT, TIP_HELP_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT } from '../../../src/ui/text.js';
import { courtWorld, openCourt, runCourt, MONTH } from './courtHelpers.js';

describe('s46 court goals and celebrations', () => {
  it('adds one first-time goal, at the front of the list, when the court\'s first letter comes, met once it is answered', () => {
    const w = courtWorld();
    expect(EVENT_GOALS.filter((g) => g.trigger === 'court_letter').length).toBe(1);
    openCourt(w);
    expect(triggerEventGoals(w)).toEqual([]);                                // the court is open but no letter has come
    runCourt(w, 12);
    expect(triggerEventGoals(w)).toEqual(['court_letter']);
    expect(openGoals(w)[0].id).toBe('court_letter');
    expect(openGoals(w)[0].text).toBe('Answer the letter from the court');
    expect(goalMet(w, goalById('court_letter').need)).toBe(false);
    for (let i = 0; i < 40 && checkGoals(w); i++);                          // the opening chain's own goals this city already meets
    expect(w.goals.completed.includes('court_letter')).toBe(false);
    const gold = w.gold;
    sendRequest(w);
    const done = checkGoals(w);
    expect([done.id, w.gold - gold >= EVENT_REWARD]).toEqual(['court_letter', true]);
    expect(triggerEventGoals(w)).toEqual([]);
  });
  it('is also met by refusing the first letter or letting it pass: answering is the goal, not saying yes', () => {
    const a = courtWorld();
    openCourt(a); runCourt(a, 12); triggerEventGoals(a);
    refuseRequest(a);
    expect(goalMet(a, goalById('court_letter').need)).toBe(true);
    const b = courtWorld();
    openCourt(b); runCourt(b, 12); triggerEventGoals(b);
    b.day = b.court.request.due;
    courtDay(b);
    expect(goalMet(b, goalById('court_letter').need)).toBe(true);
  });
  it('does not touch a Peaceful or young city: nothing triggers before the court opens', () => {
    const w = createWorld({ seed: 3 });
    for (let i = 0; i < 20; i++) w.day += MONTH;
    expect(triggerEventGoals(w)).toEqual([]);
  });
  it('celebrates the first letter read, with words from the data, and one tip with its How to play words', () => {
    const w = courtWorld();
    openCourt(w); runCourt(w, 12);
    const events = [];
    checkFirsts(w, events);
    expect(events.some((e) => e.id === 'first_letter')).toBe(false);
    readLetter(w, w.court.letters[0].id);
    checkFirsts(w, events);
    expect(events.some((e) => e.type === 'first' && e.id === 'first_letter')).toBe(true);
    expect(COURT_FIRSTS.every((f) => FIRSTS.includes(f))).toBe(true);
    expect(FIRST_TEXT.first_letter.head.length).toBeLessThan(40);
    expect(FIRST_TEXT.first_letter.why).toContain(String(FAVOUR.high));
    const tip = COURT_TIPS[0];
    expect([TIPS.includes(tip), tip.trigger]).toEqual([true, 'courtLetter']);
    expect(TIP_TEXT.court_letters.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIP_HELP_TEXT.court_letters.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIP_HELP_TEXT.court_letters).toContain(String(FAVOUR.high));
  });
  it('counts the achievement from the requests met, worded from the data', () => {
    const w = courtWorld({ open: true });
    const a = COURT_ACHIEVEMENTS[0];
    expect(ACHIEVEMENTS.includes(a)).toBe(true);
    expect([ACHIEVEMENT_NAMES[a.id], ACHIEVEMENT_TEXT[a.id]]).toEqual(['Friend of the court', 'Send the court what it asks 5 times']);
    expect(achievementProgress(w, a)).toEqual({ n: 0, of: 5 });
    w.tally.requestsMet = 3;
    expect(achievementProgress(w, a)).toEqual({ n: 3, of: 5 });
    expect(COURT_TALLY).toEqual(['requestsMet', 'requestsMissed', 'gifts', 'lettersRead', 'cardsPlayed']);
  });
  it('counts every letter read once, and answered cards and gifts in the tallies', () => {
    const w = courtWorld();
    openCourt(w); runCourt(w, 12);
    const id = w.court.letters[0].id;
    readLetter(w, id); readLetter(w, id);
    expect(w.tally.lettersRead).toBe(1);
    expect(Object.keys(w.tally)).toContain('cardsPlayed');
  });
  it('checks the court\'s record in the world: the new fields, lenient about their absence', () => {
    expect(isCourtState(newCourtState())).toBe(true);
    const { awake, guided, nextGiftDay, effects, log, lastCard, ...bare } = newCourtState();
    expect(isCourtState(bare)).toBe(true);
    for (const bad of [{ awake: 'yes' }, { guided: 'done' }, { nextGiftDay: 1.5 }, { effects: [3] }, { log: 'none' }, { favour: 101 }, { favour: -1 }]) expect([JSON.stringify(bad), isCourtState({ ...newCourtState(), ...bad })]).toEqual([JSON.stringify(bad), false]);
    expect(createWorld({ seed: 1 }).court).toEqual(newCourtState());
  });
});
