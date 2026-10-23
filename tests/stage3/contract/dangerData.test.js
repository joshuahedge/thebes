import { describe, it, expect } from '../../harness.js';
import { BUILDINGS, BUILDABLE } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { TIERS } from '../../../src/data/housing.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { FIRE, FIRE_SALT, FIRE_RISK, HOUSE_RISK, FIRE_BANDS, FIRE_BAND_IDS } from '../../../src/data/fire.js';
import { RAIDS, RAID_SALT, UNITS, DEFENCE, FESTIVAL } from '../../../src/data/raids.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { SCORE_VERSION, SCORE_PARTS, SCORE_WEIGHTS, SCORE_TERMS, SCORE_FACTOR, MEDALS, SPLIT_MILESTONES, RECORDS_KEY, RECORDS_MAX, SHARE } from '../../../src/data/scoring.js';
import { FEATS } from '../../../src/data/feats.js';
import { AMBIENT } from '../../../src/data/ambient.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { ART } from '../../../src/render/art/registry.js';
import { costOf, rubbleCostOf, festivalCostOf, riskOf, raidsOn, soldiersPayOf } from '../../../src/sim/costs.js';
import { makeTestWorld } from '../../helpers/testWorld.js';

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const byLevel = (fn) => DIFFICULTY_ORDER.map((d) => { const w = makeTestWorld(); w.difficulty = d; return fn(w); });

describe('s3 contract data', () => {
  it('adds the firehouse, tower and barracks as buildings, and the wall, gate and rubble with the spec 4.11-4.13 numbers', () => {
    const KEYS = ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'priority', 'category', 'needsRoad'];
    expect(pick(BUILDINGS.firehouse, [...KEYS, 'reach'])).toEqual({ name: 'Firehouse', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'safety', category: 'services', needsRoad: true, reach: 8 });
    expect(pick(BUILDINGS.tower, KEYS)).toEqual({ name: 'Tower', w: 1, d: 1, cost: 150, upkeep: 8, workers: 4, priority: 'safety', category: 'defence', needsRoad: true });
    expect(pick(BUILDINGS.barracks, KEYS)).toEqual({ name: 'Barracks', w: 2, d: 2, cost: 200, upkeep: 12, workers: 6, priority: 'safety', category: 'defence', needsRoad: true });
    expect(pick(BUILDINGS.wall, [...KEYS.filter((k) => k !== 'priority'), 'tile'])).toEqual({ name: 'Wall', w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'defence', needsRoad: false, tile: true });
    expect(pick(BUILDINGS.gate, ['name', 'cost', 'upkeep', 'tile', 'buildable'])).toEqual({ name: 'Gate', cost: 20, upkeep: 0, tile: true, buildable: false });
    expect(pick(BUILDINGS.rubble, ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'needsRoad', 'buildable'])).toEqual({ name: 'Rubble', w: 1, d: 1, cost: 0, upkeep: 0, workers: 0, needsRoad: false, buildable: false });
    expect(BUILDABLE).toEqual(Object.keys(BUILDINGS).filter((t) => t !== 'gate' && t !== 'rubble' && t !== 'bridge' && t !== 'large_plot'));   // Version 6.0: the Large plot card lays a house, so it is not a type the world holds
    expect(BUILDINGS.firehouse.reach).toBe(FIRE.reach);
  });
  it('unlocks the firehouse with the Village and the wall, tower and barracks with Market town, and gives each a card', () => {
    const at = (type) => MILESTONES.find((m) => m.unlocks.includes(type)).id;
    expect(['firehouse', 'wall', 'tower', 'barracks'].map(at)).toEqual(['village', 'market_town', 'market_town', 'market_town']);
    expect(CATEGORIES.find((c) => c.id === 'services').items.slice(-5)).toEqual(['firehouse', 'physician', 'police_post', 'palace', 'nilometer']);   // Stage 4: the palace comes last; Stage 4.5: the physician and police post before it; Stage 4.6: the River track's Nilometer after it
    expect(CATEGORIES.find((c) => c.id === 'defence').items).toEqual(['wall', 'gate', 'tower', 'barracks', 'archery_range', 'stables']);   // Stage 4.5: the Gate card (ruling 309); Stage 4.6: the Armies track's two
    for (const slot of ['firehouse', 'tower', 'barracks', 'wall', 'gate', 'rubble']) expect([slot, typeof (ART[slot] && ART[slot].draw)]).toEqual([slot, 'function']);
  });
  it('sets the fire numbers of spec 4.12', () => {
    expect(FIRE).toEqual({
      startsAt: 'town', threshold: 100, ignitionChance: 0.03, cut: 0.8, staffedAt: 0.5, blazeDays: 3, putOutDays: [1, 2],
      fireDays: [10, 15], spreadChance: 0.06, outChance: 0.25, rubbleCost: 5, reach: 8,
    });
    expect(new Set(Object.values(FIRE_SALT)).size).toBe(Object.keys(FIRE_SALT).length);
    expect(FIRE_BANDS).toEqual([0, 25, 60, 100]);
    expect(FIRE_BAND_IDS.length).toBe(FIRE_BANDS.length);
  });
  it('gives every building that burns its risk a day, and none to those that never burn', () => {
    expect(FIRE_RISK).toEqual({
      potter: 1.0, brewery: 1.0, weaver: 0.5, jeweller: 0.5, granary: 0.5, storehouse: 0.5, trading_post: 0.5,
      bazaar: 0.3, booth: 0.3, barracks: 0.3, farm_grain: 0.15, farm_fig: 0.15, farm_barley: 0.15, farm_flax: 0.15, clay_pit: 0.15, gem_mine: 0.15,
      temple: 0.1, firehouse: 0.1, quarry: 0.15, brickworks: 1.0, builders_guild: 0.3,   // Stage 4's three supply buildings
      hunting_lodge: 0.3, fishing_wharf: 0.3,   // Stage 4.6 (River track, ruling 365)
      quay: 0.3,   // Version 7.0 (Track T, ruling 871)
      archery_range: 0.3, stables: 0.5,   // Stage 4.6 (ruling 416): the range as the barracks, the stables higher for hay
    });
    for (const never of ['garden', 'statue', 'well', 'wall', 'gate', 'tower', 'rubble', 'house']) expect([never, FIRE_RISK[never]]).toEqual([never, undefined]);
    for (const t of Object.keys(FIRE_RISK)) expect([t, Boolean(BUILDINGS[t])]).toEqual([t, true]);
    expect(HOUSE_RISK).toEqual([0, 0.3, 0.3, 0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.2]);
    expect(HOUSE_RISK.length).toBe(TIERS.length);
    expect(Math.round(FIRE.threshold / HOUSE_RISK[4])).toBe(400);                   // an uncovered House: about 13 months
  });
  it('sets the raid, unit, defence and festival numbers of spec 4.13', () => {
    expect(RAIDS).toEqual({
      clockPeople: 250, firstWarnAfter: 720, warningDays: 90, laterMin: 720, laterMax: 1440, firstSize: 3, minSize: 2, maxSize: 18, growthPerYear: 0.1, growthMax: 1.5,
      peoplePerRaider: 125, wealthBase: 5000, wealthStep: 5000, wealthMax: 4, adaptLost: 0.6, adaptStep: 0.2, raidersPerTower: 3,
      tributeShare: 0.8, strikes: 3, strikeDays: 2, stealShare: 0.01, stealMin: 5, stealMax: 50, retreatShare: 0.5,
      twoSidedFrom: 3, twoSidedChance: 0.35, pillage: [null, 'granary', 'house'], foodShare: 0.5, fleeShare: 0.25,
      targets: ['trading_post', 'storehouse', 'bazaar', 'temple'],
    });
    for (const t of RAIDS.targets) expect(Boolean(BUILDINGS[t])).toBe(true);
    expect(new Set(Object.values(RAID_SALT)).size).toBe(Object.keys(RAID_SALT).length);
    expect(UNITS).toEqual({ raider: { hp: 10, speed: 1, damage: 2 }, soldier: { hp: 12, speed: 2, damage: 3 } });
    expect(DEFENCE).toEqual({ wallHp: 40, gateHp: 40, towerOnWallHp: 80, towerRange: 4, towerDamage: 4, patrol: 8, soldiersPerBarracks: 4, trainDays: 30, soldierPay: 8 });
    expect(FESTIVAL).toEqual({ from: 'town', cost: 200, mood: 6, days: 90, every: 360 });
  });
  it('sets the danger mood terms of spec 4.9', () => {
    expect(DANGER_MOOD).toEqual({ fireLastMonth: -4, burnedEach: -2, burnedMax: -10, burnedDays: 180, raidBeaten: -3, raidLost: -8, raidDays: 180 });
  });
  it('sets the score (score v2 from Stage 4: tests/stage4/contract): parts whose weights add up to 100, a factor per level, medals and the share link', () => {
    expect(SCORE_VERSION).toBe(2);
    expect(SCORE_PARTS).toEqual(['people', 'prosperity', 'culture', 'safety', 'monuments']);
    expect(Object.keys(SCORE_WEIGHTS)).toEqual(SCORE_PARTS);
    for (const part of SCORE_PARTS) expect([part, Object.values(SCORE_WEIGHTS[part]).reduce((a, b) => a + b, 0)]).toEqual([part, 100]);
    expect(SCORE_TERMS).toEqual({ growthSteps: 5, homesSpan: 8, taxPerPerson: 5, jobsFull: 0.05, jobsZero: 0.30, treasuryZero: -500, routes: 2, pleasant: 50, burnedPenalty: 0.2, raidLostPenalty: 0.5, recordDays: 360, prestigeFull: 700 });
    expect(SCORE_FACTOR).toEqual({ peaceful: 0.7, relaxed: 0.8, normal: 1, hard: 1.25 });
    expect(Object.keys(SCORE_FACTOR).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(MEDALS).toEqual([{ id: 'bronze', at: 200 }, { id: 'silver', at: 300 }, { id: 'gold', at: 400 }]);
    expect(SPLIT_MILESTONES).toEqual(MILESTONES.slice(1, 6).map((m) => m.id));       // Version 6.0 (Track A): the ranks beyond Capital are not score splits
    expect([RECORDS_KEY, RECORDS_MAX]).toEqual(['thebes.records', 200]);
    expect([SHARE.base, SHARE.format, SHARE.difficulty, SHARE.checkLength]).toEqual(['https://joshuahedge.github.io/thebes/', 't2', { peaceful: 'p', relaxed: 'r', normal: 'n', hard: 'h' }, 4]);
    expect(FEATS.length).toBe(12);                                                   // Track E fills it, with its words (tests/stage3/score/feats.test.js); Stage 4 adds two
  });
  it('sets the ambient numbers of ruling 133', () => {
    expect(pick(AMBIENT, ['glintDriftTilesPerSecond', 'reedSwayDeg', 'treeSwayDeg', 'cropBandEveryMs', 'budgetMs', 'idleFpsCap', 'idleAfterMs', 'maxChangeHz'])).toEqual({
      glintDriftTilesPerSecond: 0.2, reedSwayDeg: 3, treeSwayDeg: 2, cropBandEveryMs: 6000, budgetMs: 2, idleFpsCap: 30, idleAfterMs: 2000, maxChangeHz: 1,
    });
    expect([AMBIENT.glintFadeMs, AMBIENT.reedSwayPeriodMs, AMBIENT.treeSwayPeriodMs, AMBIENT.smokeEveryMs, AMBIENT.rareEveryMs]).toEqual([[4000, 7000], [3000, 6000], [4000, 6000], [2000, 3000], [45000, 90000]]);   // Stage 4: rare life every 45-90 s (ruling 219)
    expect(AMBIENT.dropOrder).toEqual(['rare', 'smoke', 'sway']);
  });
});

describe('s3 contract costs', () => {
  it('scales walls, gates, towers, barracks, rubble clearing and festivals by the difficulty, never soldiers\' pay', () => {
    expect(byLevel((w) => costOf(w, 'wall'))).toEqual([6, 6, 8, 10]);
    expect(byLevel((w) => costOf(w, 'gate'))).toEqual([16, 16, 20, 25]);
    expect(byLevel((w) => costOf(w, 'tower'))).toEqual([120, 120, 150, 188]);         // 187.5 rounds up
    expect(byLevel((w) => costOf(w, 'barracks'))).toEqual([160, 160, 200, 250]);
    expect(byLevel((w) => costOf(w, 'firehouse'))).toEqual([40, 40, 50, 63]);
    expect(byLevel(rubbleCostOf)).toEqual([4, 4, 5, 6]);                             // 6.25 rounds down
    expect(byLevel(festivalCostOf)).toEqual([160, 160, 200, 250]);
    const w = makeTestWorld();
    w.soldiers.push({ id: 1 }, { id: 2 }, { id: 3 });
    for (const d of DIFFICULTY_ORDER) { w.difficulty = d; expect([d, soldiersPayOf(w)]).toEqual([d, 3 * DEFENCE.soldierPay]); }
  });
  it('reads the risk multiplier and whether raids come from the level', () => {
    expect(byLevel(riskOf)).toEqual([0.5, 0.5, 1, 1.5]);
    expect(byLevel(raidsOn)).toEqual([false, true, true, true]);
    expect(DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].raids)).toEqual([false, true, true, true]);
  });
});
