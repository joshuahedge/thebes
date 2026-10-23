// Version 6.0 Track D2 (rulings 760-779): the lesson's words come from the sim. Each line that carries a number or a fact is tested with the world set up both ways, and the title's
// rule (lessonDue, the step a lesson starts at) is tested on its own.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, replayTo, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { lessonDue, lessonStartStep, lessonPartWay, lessonFacts } from '../../../src/ui/lesson.js';
import { D2_TEXT, DANGER_UI_TEXT, cards4WorkShare } from '../../../src/ui/text.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { RAIDS } from '../../../src/data/raids.js';
import { setSpeed, place, paintHouses } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { towersNeeded, workingTowers } from '../../../src/sim/raids.js';

const idx = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const said = (w, id) => D2_TEXT.steps[id](lessonFacts(w, LESSON_STEPS[idx(id)]));
const at = (id) => { const w = lessonWorld(); replayTo(w, idx(id)); return w; };

describe('v60 d2 the lesson\'s device rule', () => {
  it('is due with no lesson finished and no saved city, and says Continue only for a lesson left part-way', () => {
    expect([lessonDue({ lessonDone: false }, false), lessonDue({ lessonDone: false }, true), lessonDue({ lessonDone: true }, false), lessonDue({ lessonDone: true }, true), lessonDue(undefined, false)]).toEqual([true, false, false, false, true]);
    expect([lessonPartWay({ lessonDone: false, lessonStep: 0 }), lessonPartWay({ lessonDone: false, lessonStep: 3 }), lessonPartWay({ lessonDone: true, lessonStep: 3 }), lessonPartWay(null)]).toEqual([false, true, false, false]);
  });
  it('starts a lesson at the step it left (kept inside the steps), and a finished lesson again at the first', () => {
    expect([lessonStartStep({ lessonDone: false, lessonStep: 0 }), lessonStartStep({ lessonDone: false, lessonStep: 5 }), lessonStartStep({ lessonDone: false, lessonStep: 99 }), lessonStartStep({ lessonDone: true, lessonStep: 5 }), lessonStartStep({ lessonDone: false, lessonStep: 2.5 }), lessonStartStep(null)])
      .toEqual([0, 5, LESSON_LENGTH - 1, 0, 0, 0]);
  });
});

describe('v60 d2 the lesson\'s words are the sim\'s', () => {
  it('gives every step an instruction and a reason, in the sim\'s numbers, at every step of the way', () => {
    const w = lessonWorld();
    let n = 0;
    for (const step of LESSON_STEPS) {
      const words = D2_TEXT.steps[step.id](lessonFacts(w, step));
      expect([step.id, words.text.length > 10, words.why.length > 10, /undefined|NaN|\[object/.test(words.text + words.why)]).toEqual([step.id, true, true, false]);
      n++;
    }
    expect(n).toBe(LESSON_LENGTH);
  });
  it('road, homes, well and bazaar say the numbers their checks use', () => {
    const w = lessonWorld();
    const step = (id) => LESSON_STEPS.find((s) => s.id === id);
    expect(said(w, 'road').why).toContain(`${step('road').check.n} tiles`);
    expect(said(w, 'homes').text).toContain(`${step('homes').check.n} housing plots`);
    expect(said(w, 'well').text).toContain(`${BUILDINGS.well.reach} road tiles of ${step('well').check.homes} homes`);
    expect(said(w, 'bazaar').text).toContain(`${BUILDINGS.bazaar.reach} road tiles of ${step('bazaar').check.homes} homes`);
    expect(said(w, 'families').text).toContain(`${step('families').check.n} people`);
  });
  it('families says Press Play while paused and not once it runs', () => {
    const w = at('families');
    expect(said(w, 'families').text.startsWith('Press Play')).toBe(true);
    setSpeed(w, 1);
    expect([said(w, 'families').text.startsWith('Families are arriving'), said(w, 'families').text.includes('Press Play')]).toEqual([true, false]);
  });
  it('workers names the jobs and the workers the sim counts, and follows them as homes are painted', () => {
    const w = at('workers');
    setSpeed(w, 1);
    for (let d = 0; d < 30; d++) tickDay(w);
    const before = said(w, 'workers').text;
    expect(before).toContain(`${w.labour.jobs} workers and ${w.labour.workforce} people work`);
    expect(w.labour.jobs).toBeGreaterThan(w.labour.workforce);
    expect(said(w, 'workers').why).toContain(cards4WorkShare());
    paintHouses(w, 21, 40, 21, 42);
    for (let d = 0; d < 60; d++) tickDay(w);
    expect(said(w, 'workers').text).toContain(`${w.labour.jobs} workers and ${w.labour.workforce} people work`);
    expect(said(w, 'workers').text !== before).toBe(true);
  });
  it('month names the wage and the forecast the sim gives', () => {
    const w = at('month');
    const words = said(w, 'month');
    expect(words.why).toContain(`${ECONOMY.wagePerWorker} gold for each worker`);
    const f = lessonFacts(w, LESSON_STEPS[idx('month')]);
    expect(Number.isFinite(f.forecast)).toBe(true);
    expect(words.why).toContain(`${f.forecast >= 0 ? '+' : '−'}${Math.abs(f.forecast)} a month now`);
  });
  it('firehouse and fire say the bazaar is gone when it is, and the firehouse\'s reach when it stands', () => {
    const w = at('firehouse');
    expect(said(w, 'firehouse').text.includes('gone')).toBe(false);
    expect(said(w, 'firehouse').why).toContain(`${BUILDINGS.firehouse.reach} road tiles`);
    const bazaar = Object.values(w.buildings).find((b) => b.type === 'bazaar');
    delete w.buildings[bazaar.id];
    expect(said(w, 'firehouse').text).toBe(D2_TEXT.gone('bazaar'));
    expect(said(w, 'fire').text).toBe(D2_TEXT.gone('bazaar'));
  });
  it('tower says what the raid warned is, in days and raiders and towers, and what is still needed', () => {
    const w = at('tower');
    expect(said(w, 'tower').text.startsWith('Press Play: the lesson brings a raid warning')).toBe(true);
    setSpeed(w, 1);
    for (let d = 0; d < 3 && !w.raid.warning; d++) tickDay(w);
    const warn = w.raid.warning;
    const f = lessonFacts(w, LESSON_STEPS[idx('tower')]);
    expect([f.warning.size, f.warning.dir, f.warning.need, f.warning.have, f.warning.daysLeft]).toEqual([warn.size, warn.dir, towersNeeded(warn.size), 0, warn.arrives - w.day]);
    const text = said(w, 'tower').text;
    expect(text).toContain(`${warn.size} of them`);
    expect(text).toContain(`in ${DANGER_UI_TEXT.duration(f.warning.daysLeft)}.`);                // game months, as the alert's own countdown says it ("2 months 29 days"), not "89 days"
    expect(DANGER_UI_TEXT.arrivesIn(f.warning.daysLeft)).toContain(DANGER_UI_TEXT.duration(f.warning.daysLeft));
    expect(text).toContain(`from the ${warn.dir}`);
    expect(text).toContain('Build a tower');
    expect(said(w, 'tower').why).toContain(`${RAIDS.raidersPerTower} raiders`);
    warn.size = 6;                                                                    // twice the band: two towers, said so
    expect(said(w, 'tower').text).toContain('Build 2 more towers');
    place(w, 'tower', 21, 39);
    setSpeed(w, 1); for (let d = 0; d < 3; d++) tickDay(w);
    expect(said(w, 'tower').text).toContain('Build a tower');                          // one working, two needed: one more
    expect(lessonFacts(w, LESSON_STEPS[idx('tower')]).warning.have).toBe(1);
  });
  it('raid counts the days to go, then the raiders on the map', () => {
    const w = at('raid');
    setSpeed(w, 1);
    for (let d = 0; d < 3 && !w.raid.warning; d++) tickDay(w);
    expect(said(w, 'raid').text).toContain(`${DANGER_UI_TEXT.duration(w.raid.warning.arrives - w.day)} to go`);
    for (let d = 0; d < 200 && !w.raid.active; d++) { tickDay(w); if (w.speed === 0) setSpeed(w, 1); }
    expect(w.raid.active.raiders.length).toBeGreaterThan(0);
    // Version 6.0.1 (ruling 822): what to do first, and the towers only when staffed towers stand (the sim's own count).
    const towers = workingTowers(w);
    expect(said(w, 'raid').text).toBe(towers > 0 ? `Watch ${towers > 1 ? 'your towers' : 'your tower'} stop the raiders: ${w.raid.active.raiders.length} on the map.` : `Watch what the raiders do: ${w.raid.active.raiders.length} on the map, and no staffed tower to stop them.`);
  });
  it('the end names the people and says the raid\'s result as the sim has it', () => {
    expect(D2_TEXT.endBody({ people: 93, won: true })).toContain('93 people live here');
    expect(D2_TEXT.endBody({ people: 93, won: true })).toContain('your tower beat the raid');
    expect(D2_TEXT.endBody({ people: 1, won: false })).toContain('1 person lives here');
    expect(D2_TEXT.endBody({ people: 1, won: false })).toContain('the raid got through');
  });
});
