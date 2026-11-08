// Version 9.1 Track F, the hand-over (design 2a; rulings 1655, 1661, 1662, 1663): the lesson's city becomes the player's own at the rank its people earned (a Village at
// about 94 people), with the staged ranks' splits cleared, the raid clock stopped until a real city's 250 people and its next raid its first, and the cards the lesson
// put in the player's hands kept unlocked (world.lessonCards), never announced as new when their rank comes. Target P6: the rank, and the next one at most twice away.
import { describe, it, expect } from '../../harness.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { RAIDS } from '../../../src/data/raids.js';
import { handOverWorld, lessonCardsOf } from '../../../src/sim/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { population } from '../../../src/sim/world.js';
import { setSpeed, place } from '../../../src/sim/commands.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { cardShown, isCardLocked } from '../../../src/ui/cards.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { handOverMonth } from '../../../src/ui/lesson.js';
import { walkLesson } from './lesson.test.js';

const handed = () => { const { world } = walkLesson(); handOverWorld(world); return world; };
const unlocksOf = (id) => MILESTONES.find((m) => m.id === id).unlocks;

describe('v91 f hand-over: the rank the people earned (P6)', () => {
  it('the lesson leaves a Market town at about 94 people; the hand-over makes it a Village, Town next and at most twice away', () => {
    const { world } = walkLesson();
    const people = population(world);
    expect([world.milestone, Number.isInteger(world.splits.town), Number.isInteger(world.splits.market_town), world.raid.clockDay]).toEqual(['market_town', true, true, 63]);
    handOverWorld(world);
    const next = MILESTONES[1];
    expect([world.milestone, next.id, people, next.population / people <= 2]).toEqual(['village', 'town', 94, true]);
    expect([world.splits.town, world.splits.market_town]).toEqual([undefined, undefined]);
  });

  it('stops the raid clock as a real city\'s before 250 people, keeps the report of the raid beaten, and makes the next raid its first', () => {
    const w = handed();
    expect([w.raid.clockDay, w.raid.nextWarnDay, w.raid.index, w.raid.warning, w.raid.active, w.raid.adaptation]).toEqual([null, null, 0, null, null, 1]);
    expect([Boolean(w.raid.last), w.raid.last.won]).toEqual([true, true]);
    setSpeed(w, 1);
    for (let d = 0; d < 400; d++) { tickDay(w); if (w.speed === 0) setSpeed(w, 1); }
    expect([w.raid.clockDay, w.raid.warning, population(w) < RAIDS.clockPeople]).toEqual([null, null, true]);   // no raid drawn while the people are under 250
  });

  it('keeps the cards the lesson put in the player\'s hands unlocked (the tower), and only those: the rest of Town and Market town wait for their ranks', () => {
    const w = handed();
    expect(w.lessonCards).toEqual(['tower']);
    expect([isUnlocked(w, 'tower'), isCardLocked(w, 'tower'), cardShown(w, 'tower')]).toEqual([true, false, true]);
    for (const t of [...unlocksOf('town'), ...unlocksOf('market_town')].filter((x) => x !== 'tower')) expect([t, isUnlocked(w, t), w.newItems.includes(t)]).toEqual([t, false, false]);
    expect(place(w, 'palace', 30, 30).ok).toBe(false);                               // a Town's card is a Town's again
  });

  it('a kind the player built from the staged tray is kept too (a wall): lessonCardsOf reads the city as it stands', () => {
    const { world } = walkLesson();
    world.milestone = 'village';
    world.buildings[9999] = { id: 9999, type: 'gate', x: 0, y: 0, w: 1, d: 1 };
    expect(lessonCardsOf(world)).toEqual(['tower', 'wall']);
    delete world.buildings[9999];
  });

  it('Town arrives for real at 150 people, its split that day, its cards new; Market town at 250 does not call the tower new, and its clock starts', () => {
    const w = handed();
    const month = (peak) => { const ev = []; w.tally.peakPeople = peak; for (let d = 0; d < 30; d++) { tickDay(w, ev); if (w.speed === 0) setSpeed(w, 1); } return ev; };   // the rank is settled at the month's end
    setSpeed(w, 1);
    const ev = month(MILESTONES[1].population);
    expect([w.milestone, ev.filter((e) => e.type === 'milestone').map((e) => e.id)]).toEqual(['town', ['town']]);
    expect(Number.isInteger(w.splits.town) && w.splits.town > w.handOverDay).toBe(true);
    expect(unlocksOf('town').every((t) => w.newItems.includes(t))).toBe(true);
    const ev2 = month(MILESTONES[2].population);
    expect([w.milestone, ev2.filter((e) => e.type === 'milestone').map((e) => e.id), w.newItems.includes('tower'), w.newItems.includes('wall')]).toEqual(['market_town', ['market_town'], false, true]);
    expect(Number.isInteger(w.raid.clockDay) && w.raid.clockDay > w.handOverDay).toBe(true);   // the raid clock starts at its 250 people, as a real city's
  });

  it('saves and reloads as handed over: the rank, the cards, the clock and the hand-over\'s day', () => {
    const w = handed();
    const again = deserialize(serialize(w));
    expect([again.milestone, again.lessonCards, again.raid.clockDay, again.handOverDay, isUnlocked(again, 'tower')]).toEqual(['village', ['tower'], null, w.handOverDay, true]);
  });

  it('marks its first game month (handOverMonth), and no other city', () => {
    const w = handed();
    expect(handOverMonth(w)).toBe(true);
    w.day = w.handOverDay + 29;
    expect(handOverMonth(w)).toBe(true);
    w.day = w.handOverDay + 30;
    expect([handOverMonth(w), handOverMonth(walkLesson().world)]).toEqual([false, false]);
  });
});
