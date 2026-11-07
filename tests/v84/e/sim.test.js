// Version 8.4, Track E (rulings 1500-1519): war elephants in the sim. The enemy row and the matchups (src/data/armies.js), the mix and the
// upriver entry (src/sim/armies.js, src/sim/raids.js nextRaidEntry), the strength that prices towers and tribute, the fight (src/sim/combat.js),
// the panic, the stampede and the ivory (src/sim/elephants.js), the report, old mixes, and the lesson's raid. Each rule is set up both ways.
import { describe, it, expect } from '../../harness.js';
import { ENEMY_TYPES, ENEMY_KINDS, MIX_KINDS, MIX, ELEPHANTS, MATCHUPS, TOWER_VS, SHUNS, footMix, matchup } from '../../../src/data/armies.js';
import { RAIDS, RAID_SALT, DEFENCE } from '../../../src/data/raids.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { raidDay, nextRaidEntry, tributeFor, tributeQuote, towersNeeded } from '../../../src/sim/raids.js';
import { drawMix, elephantRaid, elephantsIn, raidStrength, upriverEntry, raiderKinds, isMixed, counterModel } from '../../../src/sim/armies.js';
import { combatDay, unitDamage, raiderHp } from '../../../src/sim/combat.js';
import { raidReportExtras, ivoryStore, wouldStampede } from '../../../src/sim/elephants.js';
import { lessonWorld, LESSON_SCRIPT, LESSON_LENGTH, lessonAt, stepDone } from '../../../src/sim/lesson.js';
import { createWorld } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { tickDay } from '../../../src/sim/clock.js';
import { hash2 } from '../../../src/sim/rng.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };
const sum = (mix) => ENEMY_KINDS.reduce((s, k) => s + (mix[k] || 0), 0);
// The first raid indexes from `from` on that do and do not draw elephants on this world's seed.
const indexWhere = (w, yes, from = 7) => { for (let i = from; i < from + 200; i++) if (elephantRaid(w, i) === yes) return i; return -1; };

function city() {
  const w = makeTestWorld({ gold: 100000, raiderEntries: [EAST] });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  return w;
}

// A raid under way with these raiders (each [kind, x, y, hp?, band?]) and no warning; tiles are free desert.
function raidOf(w, list, extra = {}) {
  const raiders = list.map(([kind, x, y, hp, band]) => ({ id: w.nextUnitId++, kind, x, y, hp: hp === undefined ? raiderHp(kind) : hp, hit: false, ...(band ? { band: 1 } : {}) }));
  const mix = footMix(0);
  for (const r of raiders) mix[r.kind] = (mix[r.kind] || 0) + 1;
  w.raid.clockDay = 0;
  w.raid.active = {
    index: 9, entry: { ...EAST }, dir: 'east', size: raiders.length, mix, target: 'storehouse', day: w.day, raiders, phase: 'attack', targetId: null, struck: [], wait: 0,
    byTowers: 0, bySoldiers: 0, byArchers: 0, byChariots: 0, burned: 0, stolen: 0, shots: [], x: 20, y: 16, blocked: null, towerIds: [], fires: [], burnedKinds: [], ...extra,
  };
  return w.raid.active;
}
const unitAt = (w, kind, b, x, y, hp) => { const u = { id: w.nextUnitId++, kind, barracks: b.id, x, y, hp: hp || { soldier: 12, archer: 8, chariot: 16 }[kind], hit: false, task: 'wait' }; w.soldiers.push(u); return u; };

describe('v84 e data: the war elephant is a fifth row of the enemy table', () => {
  // Version 8.4 wave 2 (ruling 1531): fromRaid counts 8.3's raids (the raid's stage), as every row does: 4, about 12 years after the clock starts (it was 8 of 8.4's raids).
  it('has 60 hit points, a raider\'s pace, 6 a day to walls, a trample of 3, and comes from stage 3 (8.3\'s 4th raid, 8.4\'s 8th)', () => {
    expect(ENEMY_TYPES.elephant).toEqual({ fromRaid: 4, hp: 60, damage: 3, speed: 1, breaksWalls: true, wallDamage: 6, trample: true });
    expect(ENEMY_KINDS).toEqual(['foot', 'archer', 'chariot', 'boat', 'elephant']);
    expect(ELEPHANTS).toEqual({ chance: 0.5, per: 8, max: 3, weight: 4, ivory: 10, panicChance: 0.5 });
    expect([ENEMY_TYPES.elephant.hp / ENEMY_TYPES.foot.hp, ENEMY_TYPES.elephant.wallDamage / ENEMY_TYPES.foot.damage, ENEMY_TYPES.elephant.speed === ENEMY_TYPES.foot.speed]).toEqual([6, 3, true]);
  });
  it('suits archers and towers: archers 2x at range and half in melee, towers 1.5x, soldiers half in melee; chariots shun them', () => {
    expect(MATCHUPS.archer.elephant).toEqual({ open: 2, nearWall: 2, melee: 0.5 });
    expect(MATCHUPS.soldier.elephant).toEqual({ melee: 0.5, gate: 1.5 });
    expect([TOWER_VS, SHUNS.chariot, matchup('chariot', 'elephant', 'open')]).toEqual([{ elephant: 1.5 }, ['elephant'], 1]);
  });
  it('keeps a mix\'s 8.3 shape: elephant is a key only when the raid brings any', () => {
    expect(MIX_KINDS).toEqual(['foot', 'archer', 'chariot', 'boat']);
    expect(footMix(5)).toEqual({ foot: 5, archer: 0, chariot: 0, boat: 0 });
  });
});

describe('v84 e mix: from stage 3, half of raids bring floor(size / 8) elephants, 1 to 3, taken from the foot', () => {
  it('never draws them before stage 3 (a city with no clock: the index), nor on the first, and draws about half the raids after, by the index alone', () => {
    for (const seed of [1, 7, 11, 2024]) {
      const w = createWorld({ seed, size: 32 });
      for (let i = 0; i < ENEMY_TYPES.elephant.fromRaid - 1; i++) expect([seed, i, elephantRaid(w, i)]).toEqual([seed, i, false]);
      let n = 0;
      for (let i = 7; i < 407; i++) { const yes = elephantRaid(w, i); n += yes ? 1 : 0; expect(yes).toBe(hash2(seed, i, RAID_SALT.elephant) < ELEPHANTS.chance); }
      expect([seed, n >= 160 && n <= 240]).toEqual([seed, true]);
    }
  });
  it('brings min(3, floor(size / 8)) from the foot (with them the wall-breakers keep MIX.footMin); under 8 raiders none; no other kind moves', () => {
    const w = city();
    const e = indexWhere(w, true, 9), plain = indexWhere(w, false, 9);
    const keep = ELEPHANTS.chance;
    try {
      for (const size of [5, 7, 8, 12, 16, 20, 24, 30]) {
        for (const difficulty of ['relaxed', 'normal', 'hard']) {
          w.difficulty = difficulty;
          ELEPHANTS.chance = 0;
          const without = drawMix(w, e, size);
          ELEPHANTS.chance = keep;
          const m = drawMix(w, e, size);
          const n = Math.min(ELEPHANTS.max, Math.floor(size / ELEPHANTS.per));
          expect([size, m.elephant || 0, 'elephant' in m, m.archer, m.chariot, m.boat, m.foot + (m.elephant || 0), sum(m)]).toEqual([size, n, n > 0, without.archer, without.chariot, without.boat, without.foot, size]);
          expect([size, m.foot >= 1, m.foot + (m.elephant || 0) >= Math.ceil(size * MIX.footMin)]).toEqual([size, true, true]);
          expect('elephant' in drawMix(w, plain, size)).toBe(false);
        }
      }
    } finally { ELEPHANTS.chance = keep; w.difficulty = 'normal'; }
    expect([drawMix(w, e, 8).elephant, drawMix(w, e, 16).elephant, drawMix(w, e, 24).elephant, drawMix(w, e, 40).elephant]).toEqual([1, 2, 3, 3]);
  });
  it('makes the elephants raiders of their own kind with 60 hit points', () => {
    expect(raiderKinds({ foot: 5, archer: 1, chariot: 0, boat: 0, elephant: 2 }).filter((k) => k === 'elephant').length).toBe(2);
    expect(raiderKinds({ foot: 5, archer: 1, chariot: 0, boat: 0 })).toEqual(raiderKinds({ foot: 5, archer: 1, chariot: 0, boat: 0, elephant: 0 }));
    expect(raiderHp('elephant')).toBe(60);
  });
});

describe('v84 e entry: an elephant raid comes in from upriver, decided by its index alone', () => {
  // The rule restated: the entry nearest a south-edge mouth, else nearest any edge water, else none.
  const expected = (w) => {
    const n = w.size, mouths = [];
    for (let k = 0; k < n; k++) for (const [x, y] of [[k, 0], [k, n - 1], [0, k], [n - 1, k]]) if (w.terrain[idx(n, x, y)] === T.WATER) mouths.push({ x, y });
    if (!mouths.length) return null;
    const south = mouths.filter((t) => t.y === n - 1 && t.x > 0 && t.x < n - 1), pool = south.length ? south : mouths;
    const d = (e) => Math.min(...pool.map((t) => Math.hypot(t.x - e.x, t.y - e.y)));
    return w.raiderEntries.reduce((b, e) => (!b || d(e) < d(b) ? e : b), null);
  };
  for (const variant of ['classic', 'lake-fed', 'delta', 'great-oasis']) {
    it(`on the ${variant} map: the upriver entry for an elephant index, the 8.3 draw for any other`, () => {
      const w = createWorld({ seed: 11, mapVariant: variant });
      const up = upriverEntry(w), want = expected(w);
      expect(up).toEqual(want ? { ...want } : null);
      if (variant === 'great-oasis') expect(up).toBe(null);
      else expect(w.raiderEntries.some((e) => e.x === up.x && e.y === up.y)).toBe(true);
      const draw = (i) => ({ ...w.raiderEntries[Math.floor(hash2(w.seed, i, RAID_SALT.entry) * w.raiderEntries.length)] });
      for (let i = 0; i < 40; i++) expect([i, nextRaidEntry(w, i)]).toEqual([i, elephantRaid(w, i) && up ? up : draw(i)]);
    });
  }
  it('has the warning come in where nextRaidEntry said, and says how many elephants come', () => {
    const w = city();
    w.raiderEntries = [EAST, { x: 16, y: 31 }, { x: 0, y: 16 }];
    for (let x = 20; x <= 22; x++) for (let y = 20; y < 32; y++) w.terrain[idx(w.size, x, y)] = T.WATER;   // a river reaching the south edge
    const e = indexWhere(w, true, 9);
    expect(nextRaidEntry(w, e)).toEqual({ x: 16, y: 31 });
    addRaw(w, 'house', 2, 2, { tier: 3, residents: 200 });                     // people enough, with ten years of the clock, for a raid of 8 or more
    w.raid.clockDay = -3600;
    w.raid.index = e;
    w.raid.nextWarnDay = w.day = 1000;
    const events = [];
    raidDay(w, events);
    const wn = w.raid.warning, ev = events.find((x) => x.type === 'raid_warning');
    expect(wn.size >= 8).toBe(true);
    expect([wn.entry, wn.elephants, wn.elephants === wn.mix.elephant, ev.elephants, wn.elephants >= 1]).toEqual([{ x: 16, y: 31 }, wn.mix.elephant, true, wn.mix.elephant, true]);
    // The tribute and the towers price its strength: each elephant counts as four raiders.
    expect(raidStrength(wn)).toBe(wn.size + 3 * wn.elephants);
    expect(wn.tribute).toBe(tributeFor(w, wn.size + 3 * wn.elephants));
    const q = tributeQuote(w);
    expect([q.size, q.towersNeeded, q.elephants]).toEqual([wn.size, towersNeeded(wn.size + 3 * wn.elephants), wn.elephants]);
  });
  it('prices a raid without elephants exactly as 8.3: its size', () => {
    const w = city();
    const plain = indexWhere(w, false, 9);
    w.raid.clockDay = -3600; w.raid.index = plain; w.raid.nextWarnDay = w.day = 1000;
    const events = [];
    raidDay(w, events);
    const wn = w.raid.warning;
    expect(['elephants' in wn, 'elephant' in wn.mix, 'elephants' in events[0], wn.tribute, raidStrength(wn)]).toEqual([false, false, false, tributeFor(w, wn.size), wn.size]);
    expect('elephants' in tributeQuote(w)).toBe(false);
  });
  it('brings none on Peaceful, which has no raids: the elephant index the other test warns raises nothing', () => {
    const w = city();
    w.difficulty = 'peaceful';
    addRaw(w, 'house', 2, 2, { tier: 3, residents: 200 });
    const e = indexWhere(w, true, 9);
    w.raid.clockDay = -3600; w.raid.index = e; w.raid.nextWarnDay = w.day = 1000;
    const events = [];
    raidDay(w, events);
    expect([w.raid.warning, events.some((x) => x.type === 'raid_warning'), w.tally.elephantsMet]).toEqual([null, false, 0]);
  });
});

describe('v84 e arrival: the elephants come with the first band', () => {
  it('puts every elephant in band 0 of a two-band raid, splitting the rest as before, and counts them met', () => {
    const w = city();
    w.raiderEntries = [EAST, { x: 0, y: 16 }];
    const mix = { foot: 6, archer: 2, chariot: 1, boat: 0, elephant: 2 };
    w.raid.index = 10;
    w.raid.warning = { index: 9, entry: { ...EAST }, dir: 'east', size: 11, tribute: 100, target: 'storehouse', day: 900, arrives: 1000, first: false, mix, elephants: 2, second: { entry: { x: 0, y: 16 }, dir: 'west', size: 5 } };
    w.day = 1000;
    raidDay(w, []);
    const a = w.raid.active, band = (k) => a.raiders.filter((r) => (r.band ? 1 : 0) === k);
    const kinds = (list) => list.map((r) => r.kind).sort();
    expect([band(0).length, band(1).length, band(0).filter((r) => r.kind === 'elephant').length, band(1).some((r) => r.kind === 'elephant')]).toEqual([6, 5, 2, false]);
    expect(kinds(a.raiders)).toEqual(['archer', 'archer', 'chariot', 'elephant', 'elephant', 'foot', 'foot', 'foot', 'foot', 'foot', 'foot']);
    expect(a.raiders.filter((r) => r.kind === 'elephant').map((r) => r.hp)).toEqual([60, 60]);
    expect([w.tally.elephantsMet, a.mix.elephant]).toEqual([2, 2]);
  });
  it('splits a two-band raid with no elephants as 8.3 did (odd places to band 1)', () => {
    const w = city();
    w.raiderEntries = [EAST, { x: 0, y: 16 }];
    const mix = { foot: 5, archer: 3, chariot: 1, boat: 0 };
    w.raid.index = 10;
    w.raid.warning = { index: 9, entry: { ...EAST }, dir: 'east', size: 9, tribute: 100, target: 'storehouse', day: 900, arrives: 1000, first: false, mix, second: { entry: { x: 0, y: 16 }, dir: 'west', size: 4 } };
    w.day = 1000;
    raidDay(w, []);
    const land = raiderKinds(mix), a = w.raid.active;
    expect(a.raiders.filter((r) => r.band).map((r) => r.kind)).toEqual(land.filter((k, j) => j % 2 === 1));
    expect(w.tally.elephantsMet).toBe(0);
  });
});

describe('v84 e combat: towers, walls, trample and the matchups', () => {
  it('has a working tower deal 1.5x to an elephant (6 a day) and 4 to a raider on foot', () => {
    const w = city();
    addRaw(w, 'tower', 20, 15);
    staffAll(w);
    const a = raidOf(w, [['elephant', 21, 15.5]]);
    combatDay(w, []);
    expect(a.raiders[0].hp).toBe(60 - DEFENCE.towerDamage * 1.5);
    const w2 = city();
    addRaw(w2, 'tower', 20, 15);
    staffAll(w2);
    const b = raidOf(w2, [['foot', 21, 15.5]]);
    combatDay(w2, []);
    expect(b.raiders[0].hp).toBe(10 - DEFENCE.towerDamage);
  });
  it('has an elephant break a wall 3x as fast as a raider on foot', () => {
    for (const [kind, hit] of [['elephant', 6], ['foot', 2]]) {
      const w = city();
      const i = idx(w.size, 19, 16);
      w.wall[i] = DEFENCE.wallHp;
      raidOf(w, [[kind, 20.5, 16.5]], { blocked: i });
      combatDay(w, []);
      expect([kind, w.wall[i]]).toEqual([kind, DEFENCE.wallHp - hit]);
    }
  });
  it('tramples every unit beside an elephant; a raider on foot hits only the nearest', () => {
    for (const [kind, hurt] of [['elephant', [9, 9]], ['foot', [10, 12]]]) {
      const w = city();
      const bk = addRaw(w, 'barracks', 22, 20);
      const s1 = unitAt(w, 'soldier', bk, 20.6, 16.5), s2 = unitAt(w, 'soldier', bk, 20.5, 17.2);
      raidOf(w, [[kind, 20.5, 16.5]]);
      combatDay(w, []);
      expect([kind, s1.hp, s2.hp]).toEqual([kind, ...hurt]);
    }
  });
  it('reads each matchup: archers at range 2x and in melee half of that, soldiers half (0.75 at a gate)', () => {
    const w = city();
    const bk = addRaw(w, 'barracks', 22, 26), rg = addRaw(w, 'archery_range', 22, 22);
    const foe = { kind: 'elephant', x: 10.5, y: 5.5, hp: 60 };
    const archer = { kind: 'archer', barracks: rg.id, x: 13.5, y: 5.5 }, close = { kind: 'archer', barracks: rg.id, x: 11.2, y: 5.5 }, soldier = { kind: 'soldier', barracks: bk.id, x: 11.2, y: 5.5 };
    expect([unitDamage(w, archer, foe), unitDamage(w, close, foe), unitDamage(w, soldier, foe)]).toEqual([4, 2, 1.5]);
    w.wall[idx(w.size, 11, 6)] = -1;                                              // a breach beside the soldier: he holds it
    expect(unitDamage(w, soldier, foe)).toBe(3 * 0.5 * 1.5);
    expect(unitDamage(w, archer, { ...foe, kind: 'foot' })).toBe(2);                // a raider on foot in the open: as 8.3
  });
  it('never sends your chariots out to an elephant: they take the nearest other raider, or wait', () => {
    const w = city();
    const st = addRaw(w, 'stables', 18, 20);
    staffAll(w);
    const c = unitAt(w, 'chariot', st, 19, 21.5);
    raidOf(w, [['elephant', 19.5, 17.5]]);
    combatDay(w, []);
    expect([c.task, c.x, c.y]).toEqual(['wait', 19, 21.5]);
    const w2 = city();
    const st2 = addRaw(w2, 'stables', 18, 20);
    const c2 = unitAt(w2, 'chariot', st2, 19, 21.5);
    const a2 = raidOf(w2, [['elephant', 19.5, 17.5], ['foot', 12.5, 21.5]]);
    combatDay(w2, []);
    expect([c2.task, c2.x < 19]).toEqual(['out', true]);                          // it rides west, at the raider on foot
    expect(a2.raiders.length).toBe(2);
  });
});

describe('v84 e panic: an arrow below half may send an elephant back through its band, once', () => {
  // Elephants whose one draw says stampede, and says not.
  const ids = (w, yes) => { for (let id = 5000; id < 6000; id++) if (wouldStampede(w, { id }) === yes) return id; return -1; };
  function setUp(yes, by = 'tower') {
    const w = city();
    if (by === 'tower') addRaw(w, 'tower', 20, 15);
    const bk = by === 'soldier' ? addRaw(w, 'barracks', 22, 20) : null;
    staffAll(w);
    // 33 hit points: a tower's 6 takes it to 27, below half; a soldier's 1.5 (half in melee) from 31 to 29.5.
    const a = raidOf(w, [['elephant', 21, 15.5, by === 'tower' ? 33 : 31], ['foot', 25, 16.5], ['foot', 25.5, 16.5, 2], ['foot', 4, 4, 10, true]]);
    a.second = { entry: { x: 0, y: 16 }, dir: 'west', x: 4, y: 4, phase: 'attack', targetId: null, struck: [], wait: 0, blocked: null };
    a.raiders[0].id = ids(w, yes);
    if (bk) unitAt(w, 'soldier', bk, 21.4, 15.5);
    return { w, a };
  }
  it('stampedes when the draw says so: 3 to each raider of its band (the fallen counted trampled), then it leaves', () => {
    const { w, a } = setUp(true);
    const el = a.raiders[0], events = [];
    combatDay(w, events);
    expect([a.raiders.some((r) => r.id === el.id), a.stampeded, a.trampled, a.raiders.map((r) => r.hp)]).toEqual([false, 1, 1, [7, 10]]);
    expect([a.gone, a.left, w.tally.elephantsStampeded, a.byTowers]).toEqual([undefined, undefined, 1, 0]);
    expect(events.filter((e) => e.type === 'stampede')).toEqual([{ type: 'stampede', id: el.id, x: 21, y: 15.5, to: { ...EAST } }]);
  });
  it('keeps going when the draw says not, and is never drawn again', () => {
    const { w, a } = setUp(false);
    const el = a.raiders[0];
    combatDay(w, []);
    expect([el.hp, el.panicChecked, a.stampeded, a.raiders.length]).toEqual([27, true, undefined, 4]);
    el.id = ids(w, true);                                                         // even an elephant whose draw would say yes: it was drawn
    combatDay(w, []);
    expect([a.stampeded, a.raiders.includes(el)]).toEqual([undefined, true]);
  });
  it('does not stampede when a soldier\'s blow took it below half', () => {
    const { w, a } = setUp(true, 'soldier');
    const el = a.raiders[0];
    combatDay(w, []);
    expect([el.hp < 30, el.panicChecked, a.stampeded, a.raiders.includes(el)]).toEqual([true, undefined, undefined, true]);   // ruling 1536: a melee blow leaves the check for a later arrow
  });
  it('counts as fallen for the retreat, drops no ivory, and never makes a raid lost: the last raider stampeding beats it', () => {
    const w = city();
    addRaw(w, 'tower', 20, 15);
    addRaw(w, 'storehouse', 14, 16);
    staffAll(w);
    const a = raidOf(w, [['elephant', 21, 15.5, 33]]);
    a.raiders[0].id = ids(w, true);
    w.day += 1;
    const events = [];
    raidDay(w, events);
    const end = events.find((e) => e.type === 'raid_end');
    expect([Boolean(end), end && end.won, w.raid.active, w.tally.raidsBeaten, w.tally.raidsLost]).toEqual([true, true, null, 1, 0]);
    expect([w.raid.last.elephants, w.raid.last.stampeded, w.raid.last.ivory, w.raid.last.felled, w.tally.ivoryTaken]).toEqual([1, 1, undefined, undefined, 0]);
  });
});

describe('v84 e ivory: a felled elephant leaves 10 in the nearest working store with room', () => {
  function felled(stores) {
    const w = city();
    addRaw(w, 'tower', 20, 15);
    const made = stores.map(([x, y, extra]) => addRaw(w, 'storehouse', x, y, extra || {}));
    staffAll(w);
    for (const [k, [, , extra]] of stores.entries()) if (extra && extra.staff !== undefined) made[k].staff = extra.staff;
    const a = raidOf(w, [['elephant', 21, 15.5, 5], ['foot', 28, 28]]);
    const events = [];
    combatDay(w, events);
    return { w, a, made, events };
  }
  it('puts it in the nearest working store, by straight line from where it fell', () => {
    const { w, a, made, events } = felled([[24, 15], [10, 15]]);
    expect([made[0].store.ivory, made[1].store.ivory || 0, a.ivory, a.felled, w.tally.ivoryTaken, w.tally.elephantsFelled]).toEqual([10, 0, 10, 1, 10, 1]);
    expect(events.find((e) => e.type === 'ivory')).toEqual({ type: 'ivory', id: made[0].id, n: 10, lost: 0, x: 21, y: 15.5 });
    expect(a.byTowers).toBe(1);
  });
  it('passes over a store with no workers or no room', () => {
    const { made } = felled([[24, 15, { staff: 0 }], [10, 15]]);
    expect([made[0].store.ivory || 0, made[1].store.ivory]).toEqual([0, 10]);
    const full = felled([[24, 15, { store: { stone: 800 } }], [10, 15]]);
    expect([full.made[0].store.ivory || 0, full.made[1].store.ivory]).toEqual([0, 10]);
  });
  it('stores what fits and loses the rest; with no store at all it is lost, and the report says so', () => {
    const part = felled([[24, 15, { store: { stone: 796 } }]]);
    expect([part.made[0].store.ivory, part.a.ivory, part.a.ivoryLost]).toEqual([4, 4, 6]);
    const none = felled([]);
    expect([none.a.ivory, none.a.ivoryLost, none.w.tally.ivoryTaken, none.events.find((e) => e.type === 'ivory').id]).toEqual([undefined, 10, 0, null]);
    expect(raidReportExtras(none.a)).toEqual({ elephants: 1, felled: 1, ivoryLost: 10 });
    expect(ivoryStore(none.w, { x: 0, y: 0 })).toBe(null);
  });
  it('reports the elephants, each count absent when 0, and nothing for a raid without them', () => {
    expect(raidReportExtras({ mix: { foot: 4, archer: 0, chariot: 0, boat: 0 }, ivory: 0 })).toEqual({});
    expect(raidReportExtras({ raiders: [] })).toEqual({});
    expect(raidReportExtras({ mix: { foot: 4, archer: 0, chariot: 0, boat: 0, elephant: 2 }, felled: 1, stampeded: 1, trampled: 2, ivory: 10 })).toEqual({ elephants: 2, felled: 1, stampeded: 1, trampled: 2, ivory: 10 });
  });
});

describe('v84 e old mixes: a raid from before 8.4 has no elephant key and reads as it did', () => {
  it('reads a missing mix.elephant as 0 everywhere', () => {
    const old = { foot: 6, archer: 2, chariot: 1, boat: 0 };
    expect([elephantsIn(old), elephantsIn(undefined), raidStrength({ size: 9, mix: old }), raidStrength({ size: 9 }), isMixed(old)]).toEqual([0, 0, 9, 9, true]);
    expect(counterModel(old).map((c) => c.kind)).toEqual(['foot', 'archer', 'chariot']);
    expect(raiderKinds(old).length).toBe(9);
  });
});

describe('v84 e save: an elephant raid warned, under way and reported saves and loads as it stands', () => {
  it('keeps the warning\'s elephants, a raider\'s panic drawn and a report\'s stampede through a save', () => {
    const w = city();
    w.raid.warning = { index: 9, entry: { ...EAST }, dir: 'east', size: 10, tribute: 500, target: 'storehouse', day: 900, arrives: 1000, first: false, mix: { foot: 6, archer: 2, chariot: 0, boat: 0, elephant: 2 }, elephants: 2 };
    w.raid.last = { index: 8, dir: 'east', size: 9, mix: { foot: 7, archer: 1, chariot: 0, boat: 0, elephant: 1 }, won: true, byTowers: 6, bySoldiers: 2, towers: 2, burned: 0, stolen: 0, day: 800, burnedKinds: [], fires: [], elephants: 1, stampeded: 1, trampled: 1 };
    w.tally.elephantsMet = 1; w.tally.elephantsStampeded = 1;
    const back = deserialize(serialize(w));
    expect([back.raid.warning, back.raid.last, back.tally.elephantsStampeded]).toEqual([w.raid.warning, w.raid.last, 1]);
    const u = city();
    const a = raidOf(u, [['elephant', 21, 15.5, 20], ['foot', 25, 16.5]]);
    a.raiders[0].panicChecked = true;
    Object.assign(a, { stampeded: 1, trampled: 1, felled: 1, ivory: 10 });
    expect(deserialize(serialize(u)).raid.active).toEqual(a);
  });
});

describe('v84 e lesson: the staged raid brings no elephants, and its words still match', () => {
  it('walks the lesson with the raid all on foot at index 0, its entry the 8.3 draw and its towers its size, even were every raid an elephant raid', () => {
    for (const chance of [ELEPHANTS.chance, 1]) {
      const keep = ELEPHANTS.chance;
      ELEPHANTS.chance = chance;
      try {
        const w = lessonWorld();
        const seen = [];
        const quotes = [];
        const io = { tick: () => {
          tickDay(w);
          if (!w.raid.warning) return;
          seen.push(JSON.parse(JSON.stringify(w.raid.warning)));
          const q = tributeQuote(w);
          quotes.push([q.towersNeeded, towersNeeded(w.raid.warning.size), 'elephants' in q]);   // the words' towers (the lesson's own count) and the quote's agree
        }, did() {} };
        let at = lessonAt(w, 0);
        while (at < LESSON_LENGTH) {
          const step = LESSON_STEPS[at];
          LESSON_SCRIPT[step.id](w, io);
          expect([step.id, stepDone(w, step)]).toEqual([step.id, true]);
          at = lessonAt(w, at + 1);
        }
        const wn = seen[0];
        expect([quotes.length > 0, quotes.every(([q, own, el]) => q === own && !el)]).toEqual([true, true]);
        expect([chance, wn.index, wn.first, wn.mix, 'elephants' in wn, elephantRaid(w, 0)]).toEqual([chance, 0, true, footMix(RAIDS.firstSize), false, false]);
        expect(wn.entry).toEqual({ ...w.raiderEntries[Math.floor(hash2(w.seed, 0, RAID_SALT.entry) * w.raiderEntries.length)] });
        expect([w.tally.elephantsMet, w.tally.elephantsFelled, w.tally.ivoryTaken, w.raid.last.elephants]).toEqual([0, 0, 0, undefined]);
      } finally { ELEPHANTS.chance = keep; }
    }
  });
});
