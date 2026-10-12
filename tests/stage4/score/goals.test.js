import { describe, it, expect } from '../../harness.js';
import { GOALS, EVENT_GOALS, OPENING_LAST, GOAL_REWARD } from '../../../src/data/goals.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { goalById, goalMet, goalProgress, openGoals, openingProgress, triggerEventGoals, checkGoals } from '../../../src/sim/goals.js';
import { assignLabour, isWorking } from '../../../src/sim/labour.js';
import { vacancies } from '../../../src/sim/immigration.js';
import { coveredBy } from '../../../src/sim/housing.js';
import { canPlace } from '../../../src/sim/commands.js';
import { createWorld } from '../../../src/sim/world.js';
import { showMeTarget } from '../../../src/ui/goalsList.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { CHAPTER_NAMES, OVERLAY_NAMES, OVERLAY_LEGEND, T } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const MONUMENT_GOALS = ['found_obelisk', 'guild_near', 'quarry', 'finish_obelisk', 'found_colossus', 'brickworks', 'prestige_pyramids', 'found_pyramid', 'found_great_pyramid'];
// A desert street on y = 10 at City, every goal before the Monuments chapter done.
function city(milestone = 'city') {
  const w = makeTestWorld();
  setRoad(w, 8, 10, 31, 10);
  w.milestone = milestone;
  w.guide = { on: false, done: true };
  w.goals.completed.push(...GOALS.filter((g) => g.chapter !== 'monuments').map((g) => g.id));
  return w;
}
const ids = (list) => list.map((g) => g.id);

describe('s4 score opening goals', () => {
  it('says the road rule and the fertile-land rule in the opening four, each with its why, and still opens at 1 of 10', () => {
    expect(GOALS.slice(0, 4).map((g) => [g.id, g.text])).toEqual([
      ['road', 'Lay a road: buildings need one'], ['plots', 'Place 6 housing plots by the road'],
      ['well', "Build a well by the homes' road"], ['food', 'Farm on fertile land, granary, bazaar'],
    ]);
    for (const g of GOALS.slice(0, 4)) expect([g.id, g.text.length <= 37, typeof g.why, g.why.endsWith('.')]).toEqual([g.id, true, 'string', true]);
    expect(GOALS.findIndex((g) => g.id === OPENING_LAST)).toBe(8);
    expect(openingProgress(createWorld({ seed: 3 }))).toEqual({ done: 1, of: 10 });
  });
  it('words each why as the sim plays it: no road, no work and no family; a well\'s water along the road; farms on fertile land', () => {
    const w = makeTestWorld();
    setRoad(w, 8, 10, 20, 10);
    const on = addRaw(w, 'granary', 10, 11), off = addRaw(w, 'granary', 10, 20);
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 40 });               // people to work
    assignLabour(w);
    expect(['work', isWorking(w, on), isWorking(w, off)]).toEqual(['work', true, false]);   // "Homes and workplaces work only when they touch a road"
    const plot = addRaw(w, 'house', 14, 11), far = addRaw(w, 'house', 14, 14);
    expect([vacancies(w).some((v) => v.h === plot), vacancies(w).some((v) => v.h === far)]).toEqual([true, false]);   // "Plots off the road stay empty"
    const reach = BUILDINGS.well.reach;
    expect(goalById('well').why).toBe(`A well gives water along the road for ${reach} tiles, so huts become shacks.`);
    addRaw(w, 'well', 8, 11);                                          // its road tile is (8, 10)
    const near = addRaw(w, 'house', 8 + reach - 1, 11), beyond = addRaw(w, 'house', 8 + reach, 11);   // the well's own road tile is the first of its 5
    expect(['water', coveredBy(w, near, 'water'), coveredBy(w, beyond, 'water')]).toEqual(['water', true, false]);
    expect([canPlace(w, 'farm_grain', 3, 11, { roadLater: true }).ok, canPlace(w, 'farm_grain', 22, 11, { roadLater: true }).ok]).toEqual([true, false]);   // x < 8 is fertile in the test world
    expect(goalById('food').why).toContain(`${T.layers} → ${OVERLAY_NAMES.ground}`);
    expect(OVERLAY_LEGEND.ground[0].startsWith('Fertile')).toBe(true);
  });
});

describe('s4 score Monuments goals', () => {
  it('adds the Monuments chapter: its goals, words, cards and Show me targets', () => {
    const chain = GOALS.filter((g) => g.chapter === 'monuments');
    expect(ids(chain)).toEqual(MONUMENT_GOALS);
    expect(CHAPTER_NAMES.monuments).toBe('Monuments');
    const items = CATEGORIES.find((c) => c.id === 'monuments').items;
    for (const g of chain) expect([g.id, g.reward, items.includes(g.showMe.item)]).toEqual([g.id, GOAL_REWARD, true]);
    expect(goalById('prestige_pyramids').text).toBe(`Reach ${MONUMENTS.pyramid_small.unlock.prestige} prestige to unlock the small pyramid`);
    expect(goalById('prestige_pyramids').why).toBe(`The great pyramid unlocks at ${MONUMENTS.pyramid_great.unlock.prestige} prestige.`);   // the great pyramid's 300 is told, not 100 for both
    expect(chain.map((g) => g.from)).toEqual(['city', 'city', 'city', 'city', 'great_city', 'great_city', 'capital', 'capital', 'capital']);
  });
  it('counts a guild near the only open site even when it is planned to that site or paused (a reach-only test, not guildsNear)', () => {
    const w = city('market_town');
    w.milestone = 'city';
    const site = addRaw(w, 'obelisk_small', 30, 12);
    setRoad(w, 30, 11, 30, 11);
    const guild = addRaw(w, 'builders_guild', 24, 11);                 // 5 road tiles along: within MONUMENT.crewReach
    site.site.crews.push(guild.id);                                    // on today's crew plan: the site has this guild
    expect(goalMet(w, goalById('guild_near').need)).toBe(true);
    guild.paused = true;
    expect(goalMet(w, goalById('guild_near').need)).toBe(true);        // the goal asks for a guild in reach, not a free one
  });
  it('lists the City goals from City, counts a site only once a road touches it, and a guild only within its crew reach', () => {
    const w = city('market_town');
    expect(ids(openGoals(w, 9))).toEqual([]);                          // they wait for City
    w.milestone = 'city';
    expect(ids(openGoals(w, 9))).toEqual(['found_obelisk', 'guild_near', 'quarry', 'finish_obelisk']);
    const site = addRaw(w, 'obelisk_small', 30, 12);
    expect(goalMet(w, goalById('found_obelisk').need)).toBe(false);     // no road touches it yet (ruling 226)
    setRoad(w, 30, 11, 30, 11);
    expect(goalMet(w, goalById('found_obelisk').need)).toBe(true);
    addRaw(w, 'builders_guild', 8, 11);                                // 21 road tiles from the site's road: beyond its crew reach
    expect(goalMet(w, goalById('guild_near').need)).toBe(false);
    addRaw(w, 'builders_guild', 24, 11);                               // 5 road tiles along: within MONUMENT.crewReach
    expect(goalMet(w, goalById('guild_near').need)).toBe(true);
    expect(goalProgress(w, goalById('finish_obelisk'))).toEqual({ n: 0, of: 1 });
    Object.assign(site.site, { course: 3, done: 90 });
    expect([goalMet(w, goalById('finish_obelisk').need), goalProgress(w, goalById('finish_obelisk'))]).toEqual([true, { n: 1, of: 1 }]);
  });
  it('asks for the brickworks only once a mastaba is founded, without holding up the goals after it', () => {
    const w = city('great_city');
    w.goals.completed.push('found_obelisk', 'guild_near', 'quarry', 'finish_obelisk');
    expect(ids(openGoals(w, 9))).toEqual(['found_colossus']);
    addRaw(w, 'colossus', 12, 11);
    expect([goalMet(w, goalById('found_colossus').need), ids(openGoals(w, 9))]).toEqual([true, ['found_colossus']]);
    addRaw(w, 'mastaba_small', 16, 11);
    expect(ids(openGoals(w, 9))).toEqual(['found_colossus', 'brickworks']);
    w.milestone = 'capital';
    w.goals.completed.push('found_colossus', 'brickworks');
    expect(ids(openGoals(w, 9))).toEqual(['prestige_pyramids']);       // each pyramid waits for its prestige unlock
    expect(goalProgress(w, goalById('prestige_pyramids'))).toEqual({ n: 0, of: 100 });
    w.prestigeUnlocks.pyramid_small = 4000;
    expect([goalMet(w, goalById('prestige_pyramids').need), ids(openGoals(w, 9))]).toEqual([true, ['prestige_pyramids', 'found_pyramid']]);
    w.prestigeUnlocks.pyramid_great = 6000;
    expect(ids(openGoals(w, 9))).toEqual(['prestige_pyramids', 'found_pyramid', 'found_great_pyramid']);
  });
  it('aims the guild and brickworks goals\' Show me at the newest site', () => {
    const w = city();
    expect(showMeTarget(w, goalById('guild_near'))).toEqual(w.focus);
    addRaw(w, 'obelisk_small', 12, 11);
    const newest = addRaw(w, 'colossus', 20, 11);
    addRaw(w, 'obelisk_large', 26, 11).site.done = 30;                  // finished: not a site
    expect(showMeTarget(w, goalById('guild_near'))).toEqual({ x: newest.x + 1, y: newest.y + 1 });
  });
});

describe('s4 score first stall', () => {
  it('becomes a goal the first time a site stalls, worded and aimed by its cause, and is done once no site is stalled', () => {
    const w = city();
    w.goals.completed.push(...MONUMENT_GOALS);
    setRoad(w, 12, 11, 12, 11);
    const site = addRaw(w, 'obelisk_small', 12, 12);
    Object.assign(site.site, { idle: MONUMENT.stallDays - 1, reason: 'no_stone' });
    expect(triggerEventGoals(w)).toEqual([]);                          // not stalled yet
    site.site.idle = MONUMENT.stallDays;
    expect(triggerEventGoals(w)).toEqual(['fix_site']);
    const words = () => openGoals(w, 1)[0];
    const cases = [
      ['no_stone', 'Get stone to the small obelisk', 'quarry'], ['no_bricks', 'Get bricks to the small obelisk', 'brickworks'],
      ['no_crew', 'Get a crew to the small obelisk', 'builders_guild'], ['crew_short', "Find workers for the small obelisk's guild", 'house'],
      ['crew_burning', "Save the small obelisk's guild from the fire", 'firehouse'], ['no_gold', 'Find gold for the small obelisk', null],
      ['waiting_gilding', 'Find gold for the small obelisk', null],
    ];
    for (const [reason, text, item] of cases) {
      site.site.reason = reason;
      const g = words();
      expect([reason, g.id, g.text, g.showMe ? g.showMe.item : null]).toEqual([reason, 'fix_site', text, item]);
    }
    expect(Object.keys(goalById('fix_site').causeText).sort()).toEqual(['crew_burning', 'crew_short', 'no_bricks', 'no_crew', 'no_gold', 'no_stone', 'waiting_capstone', 'waiting_gilding']);
    site.site.reason = 'no_stone';
    expect(showMeTarget(w, words())).toEqual({ x: 12.5, y: 12.5 });
    expect(checkGoals(w)).toBe(null);
    site.site.idle = 0;                                                // it worked a day: no longer stalled
    expect([checkGoals(w).id, w.goals.completed.includes('fix_site')]).toEqual(['fix_site', true]);
    site.site.idle = MONUMENT.stallDays;
    expect(triggerEventGoals(w)).toEqual([]);                          // once per city
    expect(EVENT_GOALS.find((g) => g.id === 'fix_site').text).toBe('Get the monument site working again');
  });
});
