import { describe, it, expect } from '../../harness.js';
import { FIRSTS, FIRST_REWARD } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { FEATS } from '../../../src/data/feats.js';
import { DAILY_POOL } from '../../../src/data/daily.js';
import { TIPS } from '../../../src/data/tips.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT, PRESTIGE } from '../../../src/data/monuments.js';
import { PRIORITY_LEVELS } from '../../../src/data/labour.js';
import { checkFirsts, firstMet } from '../../../src/sim/firsts.js';
import { achievementProgress, checkAchievements } from '../../../src/sim/achievements.js';
import { checkFeats, featStatus } from '../../../src/sim/feats.js';
import { dailyOrder, dailyMeasure, siteUnderWay } from '../../../src/sim/daily.js';
import { prestigeOf, monumentMood, holdsPrestige } from '../../../src/sim/monuments.js';
import { desirabilityContributors } from '../../../src/sim/desirability.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { setPaused } from '../../../src/sim/commands.js';
import { monumentCaptions } from '../../../src/ui/celebrate.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import {
  FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, FEAT_TEXT, DAILY_TEXT, TIP_TEXT, CITIZEN_REMARKS, SCORE4_TEXT,
  score4CourseText, score4FinishText, score4FinishWhy, score4PalaceText,
} from '../../../src/ui/text.js';

const ids = (list) => list.map((x) => x.id);
function city(milestone = 'city') {
  const w = makeTestWorld();
  setRoad(w, 8, 10, 31, 10);
  w.milestone = milestone;
  return w;
}
const finish = (w, type, x, y, extra = {}) => { const b = addRaw(w, type, x, y); Object.assign(b.site, { course: MONUMENTS[type].courses.length, done: 30 }, extra); return b; };

describe('s4 score firsts and achievements', () => {
  it('celebrates the first guild, course, monument, the pyramids unlocked and the first palace, each once, at 10 gold', () => {
    expect(ids(FIRSTS.slice(20, 25))).toEqual(['first_guild', 'first_course', 'first_monument', 'pyramids_unlocked', 'first_palace']);   // Stage 4.5 adds the physician and police post after them (tests/stage45/threatsUi.test.js)
    const w = city();
    w.firsts = ids([...FIRSTS.slice(0, 20), ...FIRSTS.slice(25)]);
    expect(checkFirsts(w)).toEqual([]);
    addRaw(w, 'builders_guild', 12, 11);
    const site = addRaw(w, 'obelisk_small', 16, 11);
    site.site.course = 1;
    w.tally.courses = 1;
    addRaw(w, 'palace', 20, 11);
    const gold = w.gold, events = [];
    expect(checkFirsts(w, events)).toEqual(['first_guild', 'first_course', 'first_palace']);
    expect([w.gold - gold, events[1]]).toEqual([3 * FIRST_REWARD, { type: 'first', id: 'first_course', reward: FIRST_REWARD, x: 16.5, y: 11.5 }]);   // on the site
    site.site.done = 60; site.site.course = 3; w.tally.monumentsDone = 1;
    w.prestigeUnlocks.pyramid_small = 700;
    expect(checkFirsts(w)).toEqual(['first_monument', 'pyramids_unlocked']);
    expect(firstMet(w, FIRSTS.find((f) => f.id === 'first_monument'))).toEqual({ x: 16.5, y: 11.5 });
    expect(checkFirsts(w)).toEqual([]);
  });
  it('words each first as the monument rules have it', () => {
    for (const f of FIRSTS.slice(20, 25)) expect([f.id, FIRST_TEXT[f.id].head.length < 30, FIRST_TEXT[f.id].why.length > 20]).toEqual([f.id, true, true]);
    expect(FIRST_TEXT.first_guild.why).toBe(`Its crew builds a monument site up to ${MONUMENT.crewReach} road tiles away.`);
    for (const k of MONUMENT_KINDS) expect([k, MONUMENTS[k].prestige.courses]).toEqual([k, MONUMENTS[k].prestige.done]);   // "Half ... half"
    const w = city();
    finish(w, 'mastaba_large', 12, 11);                                // 110 prestige: +1 mood for every 70
    expect([prestigeOf(w), monumentMood(w), FIRST_TEXT.first_monument.why.includes(`every ${PRESTIGE.moodPer}`)]).toEqual([110, 1, true]);
    expect(FIRST_TEXT.pyramids_unlocked.why).toContain(`${MONUMENTS.pyramid_small.unlock.prestige} prestige`);
    // M5 (final review): the first fires on the small pyramid's unlock alone, the great one still locked: it names the small one,
    // and its milestone comes from the data.
    const u = city('capital');
    u.prestigeUnlocks.pyramid_small = 10;
    expect([checkFirsts(u).includes('pyramids_unlocked'), Number.isInteger(u.prestigeUnlocks.pyramid_great)]).toEqual([true, false]);
    expect(FIRST_TEXT.pyramids_unlocked).toEqual({
      head: 'The small pyramid is unlocked',
      why: `A ${MILESTONES.find((m) => m.id === MONUMENTS.pyramid_small.unlock.milestone).name} with ${MONUMENTS.pyramid_small.unlock.prestige} prestige can found the small pyramid.`,
    });
    expect(FIRST_TEXT.pyramids_unlocked.why).toBe('A Capital with 100 prestige can found the small pyramid.');
  });
  it('counts the six new achievements from the city\'s state, Lapis and gold by the palace\'s style', () => {
    const six = ACHIEVEMENTS.slice(36, 42);                                  // Stage 4.6's achievements follow these (src/data/s46.js)
    expect(ids(six)).toEqual(['monument_builder', 'renowned', 'seven_wonders', 'stone_upon_stone', 'gilded_tip', 'lapis_and_gold']);
    expect(six.map((a) => [ACHIEVEMENT_NAMES[a.id], ACHIEVEMENT_TEXT[a.id]])).toEqual([
      ['Monument builder', 'Finish 3 monuments'], ['Renowned', 'Reach 300 prestige'], ['Seven wonders', 'Finish 7 different kinds of monument (there are 11)'],
      ['Stone upon stone', 'Lay 5,000 stone on monuments'], ['Gilded tip', 'Finish the large obelisk with its gilded tip'], ['Lapis and gold', 'Enlarge the palace to lapis and gold'],
    ]);
    const w = city('capital');
    const progress = () => six.map((a) => achievementProgress(w, a));
    expect(progress()).toEqual([{ n: 0, of: 3 }, { n: 0, of: 300 }, { n: 0, of: 7 }, { n: 0, of: 5000 }, { n: 0, of: 1 }, { n: 0, of: 4 }]);
    finish(w, 'obelisk_large', 12, 11);
    finish(w, 'obelisk_large', 13, 11);                                // a second of a kind: one kind, no more prestige
    addRaw(w, 'mastaba_large', 16, 11).site.course = 3;                // 33 of its 55 course prestige so far
    Object.assign(w.tally, { monumentsDone: 2, stoneLaid: 900.67 });   // a sum of fractions: counted whole
    addRaw(w, 'palace', 22, 11, { style: 2 });
    expect(progress()).toEqual([{ n: 2, of: 3 }, { n: 30 + 33, of: 300 }, { n: 1, of: 7 }, { n: 900, of: 5000 }, { n: 1, of: 1 }, { n: 2, of: 4 }]);
    w.achievements = ids(ACHIEVEMENTS.slice(0, 36));
    expect(checkAchievements(w)).toEqual(['gilded_tip']);
    w.buildings[Object.keys(w.buildings).find((id) => w.buildings[id].type === 'palace')].style = 4;
    expect(checkAchievements(w)).toEqual(['lapis_and_gold']);
  });
});

describe('s4 score feats and daily goals', () => {
  it('earns Steady hands for a mastaba or pyramid whose crews never waited for material, and Swift pyramid before year 25', () => {
    expect(FEATS.slice(10).map((f) => [f.id, FEAT_TEXT[f.id].name, FEAT_TEXT[f.id].condition])).toEqual([
      ['steady_hands', 'Steady hands', 'Finish a mastaba or pyramid with no month in which its crews stood idle for lack of material'],
      ['swift_pyramid', 'Swift pyramid', 'Finish the great pyramid before year 25 begins'],
    ]);
    const w = city('capital');
    const steady = FEATS.find((f) => f.id === 'steady_hands'), swift = FEATS.find((f) => f.id === 'swift_pyramid');
    finish(w, 'colossus', 10, 11);                                     // not a mastaba or pyramid
    const starved = finish(w, 'mastaba_small', 13, 11, { starved: true });
    const late = finish(w, 'mastaba_large', 17, 11);
    late.site.month.starvedDays = 2;                                   // idle for material this month, before the month's roll marks it
    checkFeats(w);
    expect(featStatus(w, steady)).toBe('open');
    late.site.month.starvedDays = 0;
    expect([checkFeats(w), starved.site.starved]).toEqual([['steady_hands'], true]);
    w.splits.great_pyramid = 24 * 360 - 1;
    expect([checkFeats(w), featStatus(w, swift)]).toEqual([['swift_pyramid'], 'earned']);
    const v = city('capital');
    v.day = 24 * 360;                                                  // year 25 has begun with no great pyramid finished
    checkFeats(v);
    expect(featStatus(v, swift)).toBe('lost');
  });
  it('draws the three monument daily goals from City only while a site is under way, and counts the stone brought to sites', () => {
    expect(DAILY_POOL.slice(17).map((d) => [d.id, DAILY_TEXT[d.id]])).toEqual([
      ['course1', 'Lay a course on any monument'], ['quarry1', 'Build a quarry'], ['stone100', 'Bring 100 stone to a monument site'],
    ]);
    const w = city('market_town');
    const drawn = () => dailyOrder(w, '2026-10-12').filter((id) => ['course1', 'quarry1', 'stone100'].includes(id)).sort();
    const site = addRaw(w, 'obelisk_large', 12, 11);
    expect([siteUnderWay(w), drawn()]).toEqual([true, []]);            // before City
    w.milestone = 'city';
    expect(drawn()).toEqual(['course1', 'quarry1', 'stone100']);
    expect(setPaused(w, site.id, true).ok).toBe(true);
    expect([siteUnderWay(w), drawn()]).toEqual([false, []]);           // paused: not under way
    setPaused(w, site.id, false);
    site.site.done = 90;
    expect(drawn()).toEqual([]);                                       // finished
    w.tally.stoneDelivered = 140.5;
    expect(dailyMeasure(w, DAILY_POOL.find((d) => d.id === 'stone100'))).toBe(140);   // whole units
  });
});

describe('s4 score tips, remarks and captions', () => {
  it('keeps each Monuments tip true to the rules it states', () => {
    expect(TIPS.filter((t) => t.id in SCORE_TIPS_WORDS).length).toBe(6);
    for (const [id, words] of Object.entries(SCORE_TIPS_WORDS)) expect([id, TIP_TEXT[id]]).toEqual([id, words]);
    expect(PRIORITY_LEVELS[PRIORITY_LEVELS.length - 1]).toBe('monuments');   // "come last for workers"
    expect(['builders_guild', 'quarry', 'brickworks'].map((t) => BUILDINGS[t].priority)).toEqual(['monuments', 'monuments', 'monuments']);
    expect([BUILDINGS.quarry.producerReach, BUILDINGS.brickworks.producerReach]).toEqual([MONUMENT.producerReach, MONUMENT.producerReach]);
    expect(BUILDINGS.storehouse.stores).toContain('stone');            // so it can refuse stone
  });
  // M6 (final review): one_each fires when a second of a kind is founded, so its words must hold while that second is a site.
  it('words one_each as the rules play a second of a kind: the one furthest along counts; its site, then the finished one', () => {
    const w = city('capital');
    const first = addRaw(w, 'obelisk_small', 12, 11);
    first.site.course = 1;
    const home = addRaw(w, 'house', 14, 11, { tier: 2 });
    const second = addRaw(w, 'obelisk_small', 15, 11);                 // founded: a site beside the home
    const from = (b) => desirabilityContributors(w, home, Infinity).find((c) => c.id === b.id);
    expect([holdsPrestige(w, first), holdsPrestige(w, second), from(second).value < 0]).toEqual([true, false, true]);   // less pleasant
    second.site.course = 2;                                             // further along: it is the one that counts
    expect([holdsPrestige(w, first), holdsPrestige(w, second)]).toEqual([false, true]);
    Object.assign(second.site, { course: 3, done: 30 });
    expect(from(second).value > 0).toBe(true);                          // finished: nicer
  });
  it('asks for each Monuments tip when its lesson is news', async () => {
    const r = await rigUI();
    try {
      const asked = [];
      r.ui.tips.trigger = (key) => { asked.push(key); return false; };
      const s = r.ui.scoreUi, w = r.world;
      const built = (b) => s.onCommand({ kind: 'building', result: { ok: true, id: b.id }, undoable: true });
      built(addRaw(w, 'builders_guild', 40, 40));
      built(addRaw(w, 'quarry', 44, 40));
      built(addRaw(w, 'obelisk_small', 48, 40));                       // the first site: nothing yet
      built(addRaw(w, 'colossus', 50, 40));                            // another site under way
      built(addRaw(w, 'colossus', 54, 40));                            // and one of its kind
      s.onEvents([{ type: 'site_stalled', id: 1, kind: 'colossus', reason: 'no_crew' }, { type: 'site_stalled', id: 1, kind: 'colossus', reason: 'no_bricks' }]);
      const store = addRaw(w, 'storehouse', 58, 40);
      s.onEvents([{ type: 'month' }]);
      Object.assign(store.store, { stone: 20, clay: 10 });
      s.onEvents([{ type: 'month' }]);
      expect(asked).toEqual(['guildPlaced', 'supplyPlaced', 'secondSite', 'secondOfKind', 'secondSite', 'siteStarved', 'stoneStored']);
      for (const key of new Set(asked)) expect([key, TIPS.some((t) => t.trigger === key)]).toEqual([key, true]);
    } finally { r.cleanup(); }
  });
  it('adds remarks for the masons, haulers and brickmakers, by season', () => {
    const mine = CITIZEN_REMARKS.filter((x) => ['builders_guild', 'quarry', 'brickworks'].includes(x.type));
    expect(['builders_guild', 'quarry', 'brickworks'].map((t) => mine.filter((x) => x.type === t).length)).toEqual([4, 3, 3]);
    for (const t of ['builders_guild', 'quarry', 'brickworks']) expect([t, new Set(mine.filter((x) => x.type === t).map((x) => x.season)).size]).toEqual([t, 3]);
  });
  it('captions a course with the city\'s gain the event carries, a finish as a milestone with the last course\'s gain in it, and the palace\'s new style', () => {
    const w = city('great_city');
    const a = addRaw(w, 'colossus', 10, 11);
    expect(monumentCaptions(w, [{ type: 'course_done', id: a.id, kind: 'colossus', course: 2, prestige: 4 }]))
      .toEqual([{ tier: 'first', text: 'Colossus: course 2 of 6 · +4 prestige', why: '', sound: 'goal' }]);
    expect(monumentCaptions(w, [{ type: 'course_done', id: a.id, kind: 'colossus', course: 3, prestige: 0 }])[0].text).toBe('Colossus: course 3 of 6');   // a second of a kind adds none
    expect(score4CourseText('colossus', 3, 6, 0)).toBe('Colossus: course 3 of 6');
    const o = addRaw(w, 'obelisk_small', 18, 11);
    Object.assign(o.site, { course: 3, done: 90 });                    // its last course (+2) and the completion (+5) on one day
    const total = prestigeOf(w);
    const caps = monumentCaptions(w, [{ type: 'course_done', id: o.id, kind: 'obelisk_small', course: 3, prestige: 2 }, { type: 'monument_done', id: o.id, kind: 'obelisk_small', prestige: 5 }]);
    expect(caps).toEqual([{ tier: 'milestone', text: score4FinishText('obelisk_small'), why: score4FinishWhy(7, total), sound: 'milestone' }]);
    expect([caps[0].text, caps[0].why]).toEqual(['The small obelisk is finished', `+7 prestige: the city now has ${total}`]);
    expect(monumentCaptions(w, [{ type: 'monument_done', id: o.id, kind: 'obelisk_small', prestige: 0 }])[0].why).toBe(SCORE4_TEXT.secondOfKind);
    expect(monumentCaptions(w, [{ type: 'palace_done', id: 99, style: 1 }])).toEqual([{ tier: 'first', text: 'The palace is now a columned hall', why: '', sound: 'goal' }]);
    expect(score4PalaceText(4)).toBe('The palace is now a palace of lapis and gold');
  });
  it('shows the captions in the caption row in the game', async () => {
    const r = await rigUI();
    try {
      const o = addRaw(r.world, 'obelisk_small', 40, 40);
      o.site.course = 1;
      r.ui.scoreUi.onEvents([{ type: 'course_done', id: o.id, kind: 'obelisk_small', course: 1, prestige: 1 }]);
      expect(r.ui.celebrations.recent()[0]).toEqual({ tier: 'first', text: 'Small obelisk: course 1 of 3 · +1 prestige', why: '', reward: 0 });
    } finally { r.cleanup(); }
  });
});

const SCORE_TIPS_WORDS = {
  monuments_last: 'Monuments come last for workers: guilds, quarries and brickworks hire after every other building.',
  straight_to_site: `Quarries and brickworks send straight to a monument site within ${MONUMENT.producerReach} road tiles, before any storehouse.`,
  storehouse_bridge: `A site draws from storehouses within ${MONUMENT.supplyReach} road tiles: one between quarry and site bridges a long way.`,
  refuse_stone: 'Tap the storehouse your potters use and refuse stone, so its clay keeps its room.',
  pause_site: 'Pause a site on its sheet to send its crews to another site in reach.',
  one_each: "One of each kind counts for prestige, the furthest along. A second's site makes homes less pleasant; finished, nicer.",
};
