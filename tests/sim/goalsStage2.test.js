import { describe, it, expect } from '../harness.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { TIPS } from '../../src/data/tips.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { goalById, goalMet, goalProgress, openGoals, settleGoals } from '../../src/sim/goals.js';
import { firstMet, checkFirsts } from '../../src/sim/firsts.js';
import { achievementProgress } from '../../src/sim/achievements.js';
import { dailyOrder, dailyMeasure } from '../../src/sim/daily.js';
import { milestoneIndex, isUnlocked } from '../../src/sim/progression.js';
import { population } from '../../src/sim/world.js';
import { tickDay } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { houseDesirability } from '../../src/sim/desirability.js';
import { desirabilityFix } from '../../src/sim/advice.js';
import { TIERS } from '../../src/data/housing.js';

const STAGE1 = ['road', 'plots', 'well', 'food', 'temple', 'profit', 'homes_cottage', 'people100', 'homes_house', 'town'];   // Stage 4.5 added profit after the temple
const STAGE2 = ['pottery', 'homes_townhouse', 'booth_gardens', 'manor', 'market_town', 'trade_route', 'city', 'beer', 'fine_manors',
  'great_city', 'linen', 'third_food', 'villa_street', 'villas', 'capital', 'jewellery', 'estate_street', 'estate'];   // Version 5.0 (Task 7): a third food and the two streets
const DANGER = ['firehouse', 'physician', 'defences', 'police_post'];   // Stage 3's chain goals, after Town and after the trade route (tests/stage3/score/dangerGoals.test.js), and Stage 4.5's physician and police post (tests/stage45/threatsUi.test.js)
const MONUMENTS4 = GOALS.filter((g) => g.chapter === 'monuments').map((g) => g.id);   // Stage 4's chain goals (tests/stage4/score/goals.test.js)
const REIGN = GOALS.filter((g) => g.chapter === 'reign').map((g) => g.id);   // Version 6.0 (Track A)'s goals beyond Capital (tests/v60/a)
const notDanger = (g) => !DANGER.includes(g.id) && !MONUMENTS4.includes(g.id) && !REIGN.includes(g.id);
const first = (id) => FIRSTS.find((f) => f.id === id);
const achievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);
const pool = (id) => DAILY_POOL.find((d) => d.id === id);
const typesIn = (need) => (need.kind === 'all' ? need.of.flatMap(typesIn) : need.kind === 'building' ? [need.type] : []);

// A city that has finished the opening chain and the guide, at Town (and Stage 3's danger goals, so the Stage 2 chain reads as before).
function town() {
  const w = makeTestWorld();
  w.goals.completed.push(...STAGE1, ...DANGER, ...MONUMENTS4);
  w.guide = { on: false, done: true };
  w.milestone = 'town';
  return w;
}

describe('sim goals and rewards for Stage 2', () => {
  it('keeps the opening chain and goes on from Town in two chapters, one new need at a time', () => {
    expect(GOALS.filter(notDanger).map((g) => g.id)).toEqual([...STAGE1, ...STAGE2]);
    expect(GOALS.filter(notDanger).slice(10).map((g) => g.chapter)).toEqual([...Array(6).fill('goods'), ...Array(12).fill('grand')]);
    expect(goalById('pottery').need).toEqual({ kind: 'all', of: [{ kind: 'building', type: 'clay_pit', n: 1 }, { kind: 'building', type: 'storehouse', n: 1 }, { kind: 'building', type: 'potter', n: 1 }] });
    expect(goalById('trade_route').need).toEqual({ kind: 'all', of: [{ kind: 'building', type: 'trading_post', n: 1 }, { kind: 'routes', n: 1 }] });
    expect([goalById('market_town').need, goalById('capital').need, goalById('estate').need]).toEqual([{ kind: 'people', n: 250 }, { kind: 'people', n: 1000 }, { kind: 'tier', tier: 9, n: 1 }]);
    // Every building a goal asks for is unlocked by the milestone the goals before it reached (people goals mark
    // them), and by the milestone the goal is listed from: its `from`, or Town for the goals without one.
    let reached = milestoneIndex('town');
    for (const g of GOALS.slice(10).filter((x) => !MONUMENTS4.includes(x.id))) {   // Stage 4's pyramids unlock by prestige: tests/stage4/score
      if (g.need.kind === 'people') reached = MILESTONES.findIndex((m) => m.population === g.need.n);
      expect(reached).toBeGreaterThan(0);
      const listed = milestoneIndex(g.from || 'town');
      for (const type of typesIn(g.need)) {
        const at = MILESTONES.findIndex((m) => m.unlocks.includes(type));
        expect([g.id, type, at >= 0 && at <= reached, at <= listed]).toEqual([g.id, type, true, true]);
      }
      expect([g.id, g.reward, g.text.length > 0, Boolean(BUILDINGS[g.showMe.item]) || g.showMe.item === 'house']).toEqual([g.id, GOAL_REWARD, true, true]);
    }
  });
  it('lists the chain only as far as the milestone the city has reached, so no later goal shows ahead of a waiting one', () => {
    const waiting = [['pottery', 'town'], ['homes_townhouse', 'town'], ['booth_gardens', 'town'], ['trade_route', 'market_town'], ['defences', 'market_town'], ['beer', 'city'],
      ['fine_manors', 'city'], ['linen', 'great_city'], ['third_food', 'great_city'], ['villa_street', 'great_city'], ['villas', 'great_city'], ['jewellery', 'capital'], ['estate_street', 'capital'], ['estate', 'capital']];
    expect(GOALS.filter((g) => g.from && !MONUMENTS4.includes(g.id) && !DANGER.includes(g.id) && !REIGN.includes(g.id)).map((g) => [g.id, g.from])).toEqual(waiting.filter((x) => x[0] !== 'defences'));   // defences, like the physician and police post, is a danger goal (tests/stage3/score/dangerGoals.test.js)
    const w = town();
    const open = () => openGoals(w, Infinity).map((g) => g.id).filter((id) => !REIGN.includes(id));
    const endsAt = { village: 'pottery', town: 'trade_route', market_town: 'beer', city: 'linen', great_city: 'jewellery', capital: null, great_capital: null, seat: null };
    for (const m of MILESTONES) {                                          // the list ends before the first goal whose milestone is not reached
      w.milestone = m.id;
      expect([m.id, open()]).toEqual([m.id, STAGE2.slice(0, endsAt[m.id] ? STAGE2.indexOf(endsAt[m.id]) : STAGE2.length)]);
    }
    w.milestone = 'town';
    w.goals.completed.push('pottery', 'homes_townhouse', 'booth_gardens', 'manor');
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 249 });
    expect(open()).toEqual(['market_town']);                               // 249 people: no trading post goal, and no City or Great city beside Market town
    crowd.residents = 250;
    expect(settleGoals(w).map((g) => g.id)).toEqual(['market_town']);
    expect(open()).toEqual(['trade_route', 'city']);                       // the milestone moves at month end; the people for it are enough to list the next goal
    w.milestone = 'market_town';
    expect(open()).toEqual(['trade_route', 'city']);
  });
  it('completes a goal that waits for a milestone only once the city has the people for it', () => {
    const w = town();
    w.goals.completed.push('pottery', 'homes_townhouse', 'booth_gardens', 'manor', 'market_town');
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 100 });
    setRoad(w, 0, 10, 31, 10);                                             // a building counts once a road touches it (ruling P11)
    addRaw(w, 'trading_post', 20, 8);
    w.trade.routes.memphis = { since: 0, gifted: false };
    expect(goalMet(w, goalById('trade_route').need)).toBe(true);           // everything it asks for is there...
    expect(settleGoals(w)).toEqual([]);                                    // ...but it is not listed, so it does not pay out
    crowd.residents = 250;
    expect(settleGoals(w).map((g) => g.id)).toEqual(['trade_route']);
  });
  it('keeps listing the goals after a people goal pays, when a few people leave before the month end', () => {
    const w = makeTestWorld();
    w.goals.completed.push(...STAGE1.filter((id) => id !== 'town'));
    w.guide = { on: false, done: true };
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 150 });
    w.day = 5;
    tickDay(w);                                                            // mid-month: the Town goal pays, the milestone waits for the month end
    expect([w.goals.completed.includes('town'), w.milestone]).toEqual([true, 'village']);
    expect(openGoals(w).map((g) => g.id)).toEqual(['firehouse', 'physician', 'pottery']);   // Stage 3: the firehouse comes right after Town; Stage 4.5: and the physician
    crowd.residents = 140;                                                 // some leave before the month turns
    expect(openGoals(w).map((g) => g.id)).toEqual(['firehouse', 'physician', 'pottery']);   // Stage 3: the firehouse comes right after Town; Stage 4.5: and the physician
  });
  it('makes a city that had 150 people this month a Town at the month end, even if a few left before it', () => {
    const w = makeTestWorld();
    w.goals.completed.push(...STAGE1.filter((id) => id !== 'town'));
    w.guide = { on: false, done: true };
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 150 });
    w.day = 5;
    tickDay(w);                                                            // mid-month: 150 people, the Town goal pays
    crowd.residents = 148;
    w.day = 29;
    tickDay(w);                                                            // the month end
    expect([w.day % 30, w.milestone, population(w) < 150]).toEqual([0, 'town', true]);
    const pottery = goalById('pottery');
    expect(openGoals(w, Infinity).map((g) => g.id)).toContain('pottery');   // after any first-time trouble the Town brings (unemployment here) and the physician
    for (const t of typesIn(pottery.need)) expect([t, isUnlocked(w, t)]).toEqual([t, true]);   // its buildings can be placed now
  });
  it('lists no goal with locked buildings once the month has turned, at every people milestone', () => {
    const steps = GOALS.filter((g) => g.need.kind === 'people' && MILESTONES.some((m) => m.population === g.need.n));
    expect(steps.map((g) => g.id)).toEqual(['town', 'market_town', 'city', 'great_city', 'capital']);
    for (const g of steps) {
      const target = MILESTONES.find((m) => m.population === g.need.n);
      const w = makeTestWorld();
      w.goals.completed.push(...GOALS.slice(0, GOALS.indexOf(g)).map((x) => x.id));
      w.guide = { on: false, done: true };
      w.milestone = MILESTONES[MILESTONES.indexOf(target) - 1].id;
      const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: target.population });
      w.day = 5;
      tickDay(w);                                                          // the people goal pays mid-month
      expect([g.id, w.goals.completed.includes(g.id)]).toEqual([g.id, true]);
      crowd.residents = target.population - 2;                             // a few leave
      w.day = 29;
      tickDay(w);                                                          // the month turns
      expect([g.id, w.milestone]).toEqual([g.id, target.id]);
      for (const open of openGoals(w, Infinity)) {
        for (const t of typesIn(open.need)) expect([g.id, open.id, t, isUnlocked(w, t)]).toEqual([g.id, open.id, t, true]);
      }
    }
  });
  it('counts open trade routes', () => {
    const w = town();
    const need = goalById('trade_route').need;
    expect(goalMet(w, { kind: 'routes', n: 1 })).toBe(false);
    expect(goalProgress(w, { need: { kind: 'routes', n: 2 } })).toEqual({ n: 0, of: 2 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'trading_post', 20, 8);
    expect([goalMet(w, need), goalProgress(w, goalById('trade_route'))]).toEqual([false, { n: 1, of: 2 }]);
    w.trade.routes.memphis = { since: 0, gifted: false };
    expect([goalMet(w, need), goalProgress(w, goalById('trade_route'))]).toEqual([true, { n: 2, of: 2 }]);
    w.trade.routes.byblos = { since: 0, gifted: false };
    expect(goalProgress(w, { need: { kind: 'routes', n: 1 } })).toEqual({ n: 1, of: 1 });   // clamped
  });
  it('completes the Stage 2 goals in order as a scripted city grows to an Estate', () => {
    const w = town();
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 150 });  // stands in for the city's people
    let hx = 0, bx = 0;                                                     // homes along y = 20, buildings along y = 24
    setRoad(w, 0, 23, 31, 23);                                             // above the buildings: each counts once a road touches it
    const home = (tier) => { const h = addRaw(w, 'house', hx, 20, tier >= 6 ? { tier, w: 2, d: 2, residents: 1 } : { tier, residents: 1 }); hx += 2; return h; };
    // Version 5.0 (Task 7): the street goal's decorations, each where the house sheet names it, until the home scores the tier's rise.
    const decorate = (h, tier) => { while (houseDesirability(w, h) < TIERS[tier].desirability.rise) { const f = desirabilityFix(w, h); addRaw(w, f.item, f.spot.x, f.spot.y); } };
    let fine = null, villa = null;
    const build = (...types) => { for (const t of types) { addRaw(w, t, bx, 24); bx += 2; } };
    const people = (n) => { crowd.residents += n - population(w); };
    const steps = [
      [() => build('clay_pit', 'storehouse'), []],
      [() => build('potter'), ['pottery']],
      [() => { for (let i = 0; i < 8; i++) home(5); }, ['homes_townhouse']],
      [() => build('booth', 'garden'), []],
      [() => build('garden'), ['booth_gardens']],
      [() => home(6), ['manor']],
      [() => { people(250); w.milestone = 'market_town'; }, ['market_town']],
      [() => build('trading_post'), []],
      [() => { w.trade.routes.memphis = { since: w.day, gifted: false }; }, ['trade_route']],
      [() => { people(400); w.milestone = 'city'; }, ['city']],
      [() => build('farm_barley', 'brewery', 'farm_fig'), ['beer']],
      [() => { home(7); fine = home(7); }, ['fine_manors']],
      [() => { people(650); w.milestone = 'great_city'; }, ['great_city']],
      [() => build('farm_flax', 'weaver'), ['linen']],
      [() => build('farm_grain', 'hunting_lodge'), []],                                // makers alone are not a food: the home must hold it
      [() => { fine.stock = { ...fine.stock, grain: 20, figs: 20, game: 20 }; }, ['third_food']],   // grain, figs and game in stock: three kinds
      [() => decorate(fine, 8), ['villa_street']],
      [() => { home(8); villa = home(8); }, ['villas']],
      [() => { people(1000); w.milestone = 'capital'; }, ['capital']],
      [() => build('gem_mine', 'jeweller'), ['jewellery']],
      [() => decorate(villa, 9), ['estate_street']],
      [() => home(9), ['estate']],
    ];
    const gold = w.gold;
    for (const [step, expected] of steps) {
      step();
      expect(settleGoals(w).map((g) => g.id)).toEqual(expected);
    }
    expect(w.goals.completed).toEqual([...STAGE1, ...DANGER, ...MONUMENTS4, ...STAGE2]);
    expect(openGoals(w).map((g) => g.id)).toEqual(['great_capital']);             // Version 6.0 (Track A): the reign's goals go on beyond Capital
    expect(w.gold).toBe(gold + STAGE2.length * GOAL_REWARD);
  });
  it('adds firsts for pottery made, the first caravan and each new tier, each shown where it happened', () => {
    expect(FIRSTS.slice(8, 15).map((f) => [f.id, f.check])).toEqual([
      ['first_pottery', { kind: 'made', good: 'pottery', n: 1 }],
      ['first_townhouse', { kind: 'tier', tier: 5 }],
      ['first_manor', { kind: 'tier', tier: 6 }],
      ['first_caravan', { kind: 'tally', key: 'caravans', n: 1 }],
      ['first_fine_manor', { kind: 'tier', tier: 7 }],
      ['first_villa', { kind: 'tier', tier: 8 }],
      ['first_estate', { kind: 'tier', tier: 9 }],
    ]);
    const w = town();
    expect(firstMet(w, first('first_pottery'))).toBe(null);
    w.tally.made.pottery = 1;
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: null, y: null });   // gone on already, nothing makes it
    addRaw(w, 'potter', 10, 4);
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: 11, y: 5 });        // the potter that made it
    addRaw(w, 'storehouse', 20, 4, { store: { pottery: 1 } });
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: 21, y: 5 });        // the store holding it
    expect(firstMet(w, first('first_caravan'))).toBe(null);
    w.tally.caravans = 1;
    addRaw(w, 'trading_post', 4, 12);
    expect(firstMet(w, first('first_caravan'))).toEqual({ x: 5, y: 13 });
    addRaw(w, 'house', 14, 14, { tier: 7, w: 2, d: 2, residents: 100 });
    expect(firstMet(w, first('first_fine_manor'))).toEqual({ x: 15, y: 15 });
    expect(firstMet(w, first('first_manor'))).toEqual({ x: 15, y: 15 });         // nothing at exactly tier 6: the first above
    expect(firstMet(w, first('first_villa'))).toBe(null);
    const events = [];
    expect(checkFirsts(w, events)).toEqual(['first_family', 'first_shack', 'first_cottage', 'first_house', 'people_100', 'first_pottery', 'first_townhouse', 'first_manor', 'first_caravan', 'first_fine_manor']);
    expect(events.find((e) => e.id === 'first_caravan')).toEqual({ type: 'first', id: 'first_caravan', reward: 10, x: 5, y: 13 });
  });
  it('adds eight achievements, counting goods made, trade income, upper tiers, gardens, statues and people', () => {
    expect(ACHIEVEMENTS.slice(24, 32).map((a) => [a.id, a.measure])).toEqual([
      ['potters_wheel', { kind: 'made', good: 'pottery', n: 500 }],
      ['merchant_city', { kind: 'tally', key: 'tradeIncome', n: 2000 }],
      ['townhouse_terrace', { kind: 'tier', tier: 5, n: 20 }],
      ['manor_row', { kind: 'tier', tier: 6, n: 5 }],
      ['green_city', { kind: 'buildings', type: 'garden', n: 20 }],
      ['sculpture_garden', { kind: 'buildings', type: 'statue', n: 10 }],
      ['estate_life', { kind: 'tier', tier: 9, n: 1 }],
      ['thousand', { kind: 'people', n: 1000 }],
    ]);
    const w = town();
    const p = (id) => achievementProgress(w, achievement(id));
    w.tally.made = { pottery: 120, clay: 900 };
    w.tally.tradeIncome = 2400;
    expect([p('potters_wheel'), p('merchant_city')]).toEqual([{ n: 120, of: 500 }, { n: 2000, of: 2000 }]);
    for (let i = 0; i < 3; i++) addRaw(w, 'garden', i, 2);
    addRaw(w, 'statue', 5, 2);
    addRaw(w, 'house', 8, 8, { tier: 5, residents: 22 });
    addRaw(w, 'house', 10, 8, { tier: 6, w: 2, d: 2, residents: 100 });
    expect([p('green_city'), p('sculpture_garden'), p('townhouse_terrace'), p('manor_row'), p('estate_life')]).toEqual([
      { n: 3, of: 20 }, { n: 1, of: 10 }, { n: 2, of: 20 }, { n: 1, of: 5 }, { n: 0, of: 1 },
    ]);
    w.tally.peakPeople = 640;
    expect(p('thousand')).toEqual({ n: 640, of: 1000 });
  });
  it('draws the Stage 2 daily goals only from Town; the selling one was dropped (Stage 4.5: it waited 8-10 minutes for the first caravan)', () => {
    expect(DAILY_POOL.slice(10, 14).map((d) => d.id)).toEqual(['pottery30', 'gardens3', 'statue1', 'booth1']);
    expect(DAILY_POOL.some((d) => d.id === 'sell20')).toBe(false);
    expect([pool('pottery30').measure, pool('gardens3').n]).toEqual([{ kind: 'made', good: 'pottery' }, 3]);
    const w = town();
    w.milestone = 'village';
    expect(dailyOrder(w, '2026-10-11').length).toBe(10);                   // a village draws exactly as before
    w.milestone = 'town';
    const atTown = dailyOrder(w, '2026-10-11');
    expect(atTown.length).toBe(15);                                       // with Stage 3's firehouse goal
    w.trade.routes.memphis = { since: 0, gifted: false };
    expect(dailyOrder(w, '2026-10-11').length).toBe(15);                  // a trade route adds no goal now
    w.tally.made.pottery = 42;
    expect(dailyMeasure(w, pool('pottery30'))).toBe(42);
    for (const d of DAILY_POOL) if (d.measure.kind === 'made') expect(Boolean(GOODS[d.measure.good])).toBe(true);
  });
  it('adds tips for desirability, storehouse choices, trade and merges, each with its own trigger', () => {
    expect(TIPS.slice(10, 14).map((t) => [t.id, t.trigger, t.priority])).toEqual([
      ['nicer_streets', 'desirabilityShown', false],
      ['storehouse_choices', 'storehousePlaced', false],
      ['trade_orders', 'tradingPostPlaced', false],
      ['merging_homes', 'townhouseSheet', false],
    ]);
  });
});
