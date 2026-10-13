import { describe, it, expect } from '../../harness.js';
import { GOALS, EVENT_GOALS, EVENT_REWARD } from '../../../src/data/goals.js';
import { FIRSTS, FIRST_REWARD } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { DAILY_POOL } from '../../../src/data/daily.js';
import { TIPS } from '../../../src/data/tips.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { FIRE } from '../../../src/data/fire.js';
import { goalById, openGoals, settleGoals, triggerEventGoals, chainGoals } from '../../../src/sim/goals.js';
import { firstMet, checkFirsts } from '../../../src/sim/firsts.js';
import { achievementProgress, checkAchievements, achievementsFor } from '../../../src/sim/achievements.js';
import { dailyOrder, dailyMeasure } from '../../../src/sim/daily.js';
import { showMeTarget, createGoalsStrip } from '../../../src/ui/goalsList.js';
import { closestAchievement } from '../../../src/ui/welcomeBack.js';
import { CHAPTER_NAMES, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, TIP_TEXT, showMeLabel } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const ids = (list) => list.map((g) => g.id);
const STAGE1 = ['road', 'plots', 'well', 'food', 'temple', 'profit', 'homes_cottage', 'people100', 'homes_house', 'town'];
const pool = (id) => DAILY_POOL.find((d) => d.id === id);
const ach = (id) => ACHIEVEMENTS.find((a) => a.id === id);
// A city past its opening chain, guide done.
function city(milestone = 'town', difficulty = 'normal') {
  const w = makeTestWorld();
  w.difficulty = difficulty;
  w.goals.completed.push(...STAGE1);
  w.guide = { on: false, done: true };
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('s3 score danger goals', () => {
  it('puts "Build a firehouse" right after Town and "Build a tower and a barracks" right after the trade route, in a Danger chapter', () => {
    const at = (id) => ids(GOALS).indexOf(id);
    expect([at('firehouse'), at('defences')]).toEqual([at('town') + 1, at('trade_route') + 1]);
    expect([goalById('firehouse').text, goalById('defences').text, CHAPTER_NAMES.danger]).toEqual(['Build a firehouse', 'Build a tower and a barracks', 'Danger']);
    expect([goalById('firehouse').chapter, goalById('defences').chapter, goalById('defences').from, goalById('defences').raids]).toEqual(['danger', 'danger', 'market_town', true]);
    expect(goalById('defences').need).toEqual({ kind: 'all', of: [{ kind: 'building', type: 'tower', n: 1 }, { kind: 'building', type: 'barracks', n: 1 }] });
    const words = [...['firehouse', 'defences', 'fire_firehouse', 'raid_tower'].map((id) => goalById(id).text), ...Object.values(goalById('raid_tower').dirText)];
    for (const text of words) expect([text, text.length <= 36]).toEqual([text, true]);   // two lines of caption on a small phone (ruling 52)
  });
  it('lists the firehouse goal after Town, and the defences after the trade route, but never on Peaceful', () => {
    const w = city();
    expect(ids(openGoals(w))[0]).toBe('firehouse');
    addRaw(w, 'firehouse', 3, 11);
    expect(ids(settleGoals(w))).toEqual(['firehouse']);
    w.milestone = 'market_town';
    w.goals.completed.push('pottery', 'homes_townhouse', 'booth_gardens', 'manor', 'market_town', 'trade_route');
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 250 });
    expect(ids(openGoals(w))).toEqual(['physician', 'defences', 'police_post']);   // Stage 4.5: the physician (from Town) is still open, and the police post comes with the defences
    w.difficulty = 'peaceful';
    expect(ids(openGoals(w))).toEqual(['city']);                             // none of the three on Peaceful: Stage 4.5's disease and crime are off too
    w.difficulty = 'normal';
    w.goals.completed.push('physician', 'police_post');
    expect(ids(openGoals(w))).toEqual(['defences', 'city']);
    w.difficulty = 'peaceful';
    expect(ids(openGoals(w))).toEqual(['city']);
    expect(ids(chainGoals(w)).includes('defences')).toBe(false);
    addRaw(w, 'tower', 6, 11); addRaw(w, 'barracks', 8, 11);
    expect(ids(settleGoals(w)).includes('defences')).toBe(false);          // nothing to pay on Peaceful
  });
  it('adds a first-fire goal when a blaze or fire first appears in a city with no firehouse, done once one is built', () => {
    const w = city();
    const potter = addRaw(w, 'potter', 12, 11);
    expect(triggerEventGoals(w, [{ code: 'blaze', id: potter.id }])).toEqual(['fire_firehouse']);
    expect(ids(openGoals(w))[0]).toBe('fire_firehouse');
    expect(goalById('fire_firehouse').text).toBe('Build a firehouse near the fire');
    expect(showMeTarget(w, goalById('fire_firehouse'), [{ code: 'fire', id: potter.id }])).toEqual({ x: 13, y: 12 });   // at the fire
    addRaw(w, 'firehouse', 3, 11);
    const gold = w.gold;
    expect(ids(settleGoals(w))).toEqual(['fire_firehouse', 'firehouse']);
    expect(w.gold).toBe(gold + EVENT_REWARD + goalById('firehouse').reward);
    const covered = city();
    addRaw(covered, 'firehouse', 3, 11);
    expect(triggerEventGoals(covered, [{ code: 'fire', id: 1 }])).toEqual([]);   // a firehouse already stands: not news
    expect(covered.goals.triggered).toEqual([]);
  });
  it('adds a first-warning goal that names the raiders\' direction, never on Peaceful', () => {
    const w = city('market_town');
    const alert = { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 };
    expect(triggerEventGoals(w, [alert])).toEqual(['raid_tower']);
    expect(openGoals(w)[0].text).toBe('Build a tower facing the raiders');   // no warning in the world yet: the general words
    w.raid.warning = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 3, tribute: null, target: 'building', day: 0, arrives: 90, first: true };
    expect(openGoals(w)[0].text).toBe('Build a tower facing the east');
    expect(goalById('raid_tower').text).toBe('Build a tower facing the raiders');   // a caption reads the data's words
    w.raid.warning = null;
    w.raid.last = { index: 0, dir: 'north', size: 3, won: true, byTowers: 3, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: 100 };
    expect(openGoals(w)[0].text).toBe('Build a tower facing the north');
    const peaceful = city('market_town', 'peaceful');
    expect(triggerEventGoals(peaceful, [alert])).toEqual([]);
  });
  it('rewords the strip\'s tower goal when the raiders\' direction changes, without rebuilding it', () => {
    const w = city('market_town');
    triggerEventGoals(w, [{ code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }]);
    w.raid.warning = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 3, tribute: null, target: 'building', day: 0, arrives: 90, first: true };
    const { root, cleanup } = mount();
    try {
      const strip = createGoalsStrip({ container: root, world: w, onShowMe: () => {}, onOpen: () => {} });
      const text = root.querySelector('.goal-strip .text'), showMe = root.querySelector('.goal-strip .show-me');
      expect(text.textContent).toBe('Build a tower facing the east');
      w.raid.warning.dir = 'north';
      strip.render();
      expect(root.querySelector('.goal-strip .text')).toBe(text);              // the same goal: updated in place, so focus survives
      expect(text.textContent).toBe('Build a tower facing the north');
      expect(showMe.getAttribute('aria-label')).toBe(showMeLabel('Build a tower facing the north'));
    } finally { cleanup(); }
  });
  it('aims Show me for a tower at the homes\' side that faces the raid', () => {
    const w = city('market_town');
    for (let x = 10; x < 14; x++) addRaw(w, 'house', x, 9, { tier: 1, residents: 5 });   // centre (12, 9.5)
    expect(showMeTarget(w, goalById('defences'))).toEqual({ x: 12, y: 9.5 });           // no raid: the homes
    w.raid.warning = { index: 0, entry: { x: 31, y: 9 }, dir: 'east', size: 3, tribute: null, target: 'building', day: 0, arrives: 90, first: true };
    expect(showMeTarget(w, goalById('raid_tower'))).toEqual({ x: 18, y: 9.5 });         // 6 tiles towards the entry
  });
});

describe('s3 score danger rewards', () => {
  it('adds five firsts at 10 gold, each with words that follow the data', () => {
    expect(FIRSTS.slice(15, 20).map((f) => [f.id, f.check])).toEqual([
      ['first_firehouse', { kind: 'building', type: 'firehouse' }],
      ['first_fire_out', { kind: 'tallies', keys: ['blazesOut', 'firesOut'], n: 1 }],
      ['first_wall', { kind: 'tally', key: 'wallTiles', n: 1 }],
      ['first_tower', { kind: 'building', type: 'tower' }],
      ['first_raid_beaten', { kind: 'tally', key: 'raidsBeaten', n: 1 }],
    ]);
    expect(FIRST_TEXT.first_firehouse.why).toBe(`Staffed, it puts out blazes and slows fire risk up to ${FIRE.reach} road tiles away.`);
    expect(FIRST_TEXT.first_tower.why).toBe(`Staffed, it shoots raiders up to ${DEFENCE.towerRange} tiles away.`);
    const w = city();
    expect(FIRSTS.slice(15, 20).map((f) => firstMet(w, f))).toEqual([null, null, null, null, null]);
    addRaw(w, 'firehouse', 3, 11);
    w.tally.firesOut = 1; w.tally.wallTiles = 4; w.tally.raidsBeaten = 1;
    addRaw(w, 'tower', 6, 11);
    expect(FIRSTS.slice(15, 20).map((f) => firstMet(w, f))).toEqual([{ x: 3.5, y: 11.5 }, { x: null, y: null }, { x: null, y: null }, { x: 6.5, y: 11.5 }, { x: null, y: null }]);
    w.firsts = FIRSTS.slice(0, 15).map((f) => f.id);
    const gold = w.gold, events = [];
    expect(checkFirsts(w, events)).toEqual(['first_firehouse', 'first_fire_out', 'first_wall', 'first_tower', 'first_raid_beaten']);
    expect([w.gold - gold, events[0]]).toEqual([5 * FIRST_REWARD, { type: 'first', id: 'first_firehouse', reward: FIRST_REWARD, x: 3.5, y: 11.5 }]);
    const far = city();                                       // a firehouse and a tower no road touches earn no first (P11)
    addRaw(far, 'firehouse', 3, 20);
    addRaw(far, 'tower', 6, 20);
    expect([firstMet(far, FIRSTS[15]), firstMet(far, FIRSTS[18])]).toEqual([null, null]);
    far.firsts = FIRSTS.slice(0, 15).map((f) => f.id);
    const farGold = far.gold;
    expect([checkFirsts(far, []), far.gold - farGold]).toEqual([[], 0]);
    setRoad(far, 3, 21, 6, 21);                               // a road reaches both: now they count
    expect([firstMet(far, FIRSTS[15]), firstMet(far, FIRSTS[18])]).toEqual([{ x: 3.5, y: 20.5 }, { x: 6.5, y: 20.5 }]);
    const out = city();
    out.tally.blazesOut = 1;
    expect(firstMet(out, FIRSTS.find((f) => f.id === 'first_fire_out'))).toEqual({ x: null, y: null });   // a blaze counts as much as a fire
  });
  it('adds four achievements with exact words; the raid one is never earned or listed on Peaceful', () => {
    expect(ACHIEVEMENTS.slice(32, 36).map((a) => [a.id, a.measure])).toEqual([
      ['fire_brigade', { kind: 'buildings', type: 'firehouse', n: 3 }],
      ['safe_streets', { kind: 'safeYear', people: 500, days: 360 }],
      ['wall_builder', { kind: 'tally', key: 'wallTiles', n: 50 }],
      ['raid_breaker', { kind: 'tally', key: 'raidsBeaten', n: 3 }],
    ]);
    expect(ACHIEVEMENTS.slice(32, 36).map((a) => [ACHIEVEMENT_NAMES[a.id], ACHIEVEMENT_TEXT[a.id]])).toEqual([
      ['Fire brigade', 'Have 3 firehouses'], ['Safe streets', 'Reach 500 people with no building burned for a year'],
      ['Wall builder', 'Draw 50 wall tiles'], ['Raid breaker', 'Beat 3 raids'],
    ]);
    const w = city('market_town');
    w.tally.raidsBeaten = 3;
    w.difficulty = 'peaceful';
    expect(checkAchievements(w, []).includes('raid_breaker')).toBe(false);
    expect(ids(achievementsFor(w)).includes('raid_breaker')).toBe(false);
    w.tally.raidsBeaten = 2;
    expect(closestAchievement(w) && closestAchievement(w).def.id === 'raid_breaker').toBeFalsy();
    w.difficulty = 'normal';
    expect(checkAchievements(w, []).includes('raid_breaker')).toBe(false);
    w.tally.raidsBeaten = 3;
    expect(checkAchievements(w, []).includes('raid_breaker')).toBe(true);
  });
  it('earns Safe streets at 500 people with no building burned for a year, counted from Town where its day is known', () => {
    const w = city('city');
    const s = (world) => achievementProgress(world, ach('safe_streets'));
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 499 });
    w.day = 1000;
    w.splits.town = 500;
    expect(s(w)).toEqual({ n: 0, of: 1 });                                    // 499 people
    w.buildings[1].residents = 500;
    expect(s(w)).toEqual({ n: 1, of: 1 });
    w.danger.burnDays = [700];                                               // 300 days ago
    expect(s(w)).toEqual({ n: 0, of: 1 });
    w.danger.burnDays = [600];                                               // 400 days ago
    expect(s(w)).toEqual({ n: 1, of: 1 });
    w.splits.town = 800;                                                     // a Town for only 200 days
    expect(s(w)).toEqual({ n: 0, of: 1 });
  });
  it('adds three daily goals: a firehouse from Town, ten wall tiles and a tower from Market town, none of the defence ones on Peaceful', () => {
    expect(DAILY_POOL.slice(14, 17).map((d) => [d.id, d.measure, d.n, d.from, Boolean(d.raids)])).toEqual([
      ['firehouse1', { kind: 'buildings', type: 'firehouse' }, 1, 'town', false],
      ['wall10', { kind: 'tally', key: 'wallTiles' }, 10, 'market_town', true],
      ['tower1', { kind: 'buildings', type: 'tower' }, 1, 'market_town', true],
    ]);
    expect([DAILY_TEXT.firehouse1, DAILY_TEXT.wall10, DAILY_TEXT.tower1]).toEqual(['Build a firehouse', 'Draw 10 wall tiles', 'Build a tower']);
    const w = city('village');
    expect(dailyOrder(w, '2026-10-11').includes('firehouse1')).toBe(false);
    w.milestone = 'town';
    expect(dailyOrder(w, '2026-10-11').includes('firehouse1')).toBe(true);
    w.milestone = 'market_town';
    expect(['wall10', 'tower1'].map((id) => dailyOrder(w, '2026-10-11').includes(id))).toEqual([true, true]);
    w.difficulty = 'peaceful';
    expect(['firehouse1', 'wall10', 'tower1'].map((id) => dailyOrder(w, '2026-10-11').includes(id))).toEqual([true, false, false]);
    w.tally.wallTiles = 7;
    expect(dailyMeasure(w, pool('wall10'))).toBe(7);
  });
  it('adds six tips, each with its own trigger and words true to the rules', () => {   // (Stage 4's tips follow them)
    expect(TIPS.slice(14, 20).map((t) => [t.id, t.trigger, t.priority])).toEqual([
      ['fire_risk', 'fireRisk', false], ['firebreaks', 'fireGrew', false], ['clearing_rubble', 'rubbleLeft', false],
      ['raider_targets', 'raidWarned', false], ['tribute_once', 'tributeOffered', false], ['wall_ring', 'wallDrawn', false],
    ]);
    expect(TIP_TEXT.fire_risk).toBe(`Watch fire risk from Town: a staffed firehouse within ${BUILDINGS.firehouse.reach} road tiles slows it.`);
    for (const t of TIPS.slice(14, 20)) expect([t.id, TIP_TEXT[t.id].length > 20]).toEqual([t.id, true]);
  });
  it('asks for each danger tip when its lesson is news', async () => {
    const r = await rigUI();
    try {
      const asked = [];
      r.ui.tips.trigger = (key) => { asked.push(key); return false; };
      const s = r.ui.scoreUi;
      s.onEvents([{ type: 'milestone', id: 'town' }]);
      s.onEvents([{ type: 'fire_grow', id: 4, covered: false }]);
      s.onEvents([{ type: 'burned', id: 4, kind: 'house', to: [9] }]);       // a home leaves empty plots, no rubble
      s.onEvents([{ type: 'burned', id: 5, kind: 'potter', to: [10, 11, 12, 13] }]);
      s.onEvents([{ type: 'raid_warning', index: 0, first: true }]);         // the first raid cannot be paid off
      s.onEvents([{ type: 'raid_warning', index: 1, first: false }]);
      const fh = addRaw(r.world, 'firehouse', 3, 11);
      s.onCommand({ kind: 'building', result: { ok: true, id: fh.id }, undoable: true });
      s.onCommand({ kind: 'building', result: { ok: true, id: 1 }, undoable: true });   // not a firehouse
      s.onCommand({ kind: 'wall', result: { ok: true }, undoable: true });
      expect(asked).toEqual(['fireRisk', 'fireGrew', 'rubbleLeft', 'raidWarned', 'raidWarned', 'tributeOffered', 'fireRisk', 'wallDrawn']);
      for (const key of new Set(asked)) expect([key, TIPS.some((t) => t.trigger === key)]).toEqual([key, true]);
    } finally { r.cleanup(); }
  });
});
