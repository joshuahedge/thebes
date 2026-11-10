// Version 9.3 Track R (rulings 1955-1964): each decree lever moves its one number with the decree and leaves it alone without.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { ruleFactor, capacityOf } from '../../../src/sim/rules.js';
import { costOf, soldiersPayOf } from '../../../src/sim/costs.js';
import { heirRate, produceDay, hasSpace, storeTotal } from '../../../src/sim/production.js';
import { tradePrices } from '../../../src/sim/trade.js';
import { levelOfYear } from '../../../src/sim/flood.js';
import { FLOOD_LEVELS } from '../../../src/data/river.js';
import { raidSize, laterWarnDay, raidDay } from '../../../src/sim/raids.js';
import { elephantRaid, drawMix } from '../../../src/sim/armies.js';
import { RAIDS } from '../../../src/data/raids.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { healthDay } from '../../../src/sim/health.js';
import { fireDay, fireCoverage } from '../../../src/sim/fire.js';
import { FIRE } from '../../../src/data/fire.js';
import { courtDay } from '../../../src/sim/court.js';
import { courtWorld, YEAR } from '../../stage46/court/courtHelpers.js';
import { canPlace } from '../../../src/sim/commands.js';
import { previewWallTiles } from '../../../src/sim/defence.js';

const dec = (w, ...ids) => { w.decree = { week: '2026-47', ids, endDay: 2160, ended: false }; return w; };
const last = MILESTONES[MILESTONES.length - 1].id;

describe('v93 r heir levers', () => {
  it('reads Low Nile\'s farms (0.7) and Golden caravans\' buys (2) and workshops (0.5), and nothing without them', () => {
    const w = makeTestWorld(), farm = addRaw(w, 'farm_grain', 2, 8), potter = addRaw(w, 'potter', 12, 11);
    expect([heirRate(w, farm), heirRate(w, potter)]).toEqual([1, 1]);
    dec(w, 'low_nile');
    expect(heirRate(w, farm)).toBe(0.7);
    dec(w, 'golden_caravans');
    expect(heirRate(w, potter)).toBe(0.5);
    expect(ruleFactor(w, 'buys')).toBe(2);
    const plain = makeTestWorld(); plain.milestone = last; w.milestone = last;
    const a = tradePrices(plain, 'memphis').buys, b = tradePrices(w, 'memphis').buys;
    const goods = Object.keys(a);
    expect(goods.length > 0).toBe(true);
    for (const g of goods) expect(b[g] >= a[g] * 2 - 1 && b[g] > a[g]).toBe(true);
    expect(tradePrices(w, 'memphis').sells).toEqual(tradePrices(plain, 'memphis').sells);
  });
});

describe('v93 r costs and pay', () => {
  it('halves the wall, gate, physician and archery range with the right decrees, and nothing else', () => {
    const w = makeTestWorld();
    const base = Object.fromEntries(['wall', 'gate', 'physician', 'archery_range', 'well'].map((t) => [t, costOf(w, t)]));
    dec(w, 'sea_peoples');
    expect(costOf(w, 'wall')).toBe(Math.max(1, Math.round(base.wall / 2)));
    expect(costOf(w, 'gate')).toBe(Math.max(1, Math.round(base.gate / 2)));
    expect(costOf(w, 'physician')).toBe(base.physician);
    dec(w, 'plague');
    expect(costOf(w, 'physician')).toBe(Math.round(base.physician / 2));
    expect(costOf(w, 'wall')).toBe(base.wall);
    dec(w, 'southern_host');
    expect(costOf(w, 'archery_range')).toBe(Math.round(base.archery_range / 2));
    expect(costOf(w, 'well')).toBe(base.well);
  });
  it('halves an archer\'s pay under the Southern Host and not a soldier\'s', () => {
    const w = makeTestWorld();
    w.soldiers = [{ id: 1, kind: 'archer' }, { id: 2, kind: 'archer' }, { id: 3, kind: 'soldier' }];
    const plain = soldiersPayOf(w);
    dec(w, 'southern_host');
    expect(soldiersPayOf(w) < plain).toBe(true);
    w.soldiers = [{ id: 3, kind: 'soldier' }];
    const soldierOnly = soldiersPayOf(w);
    dec(w);
    expect(soldiersPayOf(w)).toBe(soldierOnly);
  });
});

describe('v93 r rates and holds', () => {
  const quarryWorld = (...ids) => {
    const w = makeTestWorld({ gold: 100000 });
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'capital';
    const q = addRaw(w, 'quarry', 2, 11, { staff: 10 });
    addRaw(w, 'obelisk_small', 8, 9);
    if (ids.length) dec(w, ...ids);
    return { w, q };
  };
  it("halves the quarry's daily rate under the Stone famine and leaves it alone without", () => {
    const a = quarryWorld(), b = quarryWorld('stone_famine');
    produceDay(a.w); produceDay(b.w);
    expect([a.q.blocked, b.q.blocked]).toEqual([null, null]);
    expect([a.w.tally.made.stone, b.w.tally.made.stone || 0]).toEqual([1, 0]);
    expect(Math.abs(b.q.progress - 0.5) < 1e-9).toBe(true);
    produceDay(b.w);
    expect(b.w.tally.made.stone).toBe(1);
  });
  it('doubles a granary\'s hold under Low Nile (and only the granary)', () => {
    const w = makeTestWorld(), g = addRaw(w, 'granary', 5, 8, { store: { grain: 700 } });
    const cap = capacityOf(w, 'granary'), plainStore = capacityOf(makeTestWorld(), 'storehouse');
    expect([hasSpace(g, w), capacityOf(w, 'storehouse')]).toEqual([false, plainStore]);
    dec(w, 'low_nile');
    expect([capacityOf(w, 'granary'), hasSpace(g, w), storeTotal(g)]).toEqual([cap * 2, true, 700]);
    expect(capacityOf(w, 'storehouse')).toBe(plainStore);
  });
});

describe('v93 r raids', () => {
  const raidWorld = (seed, ...ids) => { const w = makeTestWorld({ size: 40 }); w.seed = seed; if (ids.length) dec(w, ...ids); w.raid.index = 1; w.tally.peakPeople = RAIDS.clockPeople + 10; return w; };
  it('halves the gap to a later warning and to the first', () => {
    for (const seed of [1, 2, 3]) {
      const a = laterWarnDay(raidWorld(seed), 0), b = laterWarnDay(raidWorld(seed, 'sea_peoples'), 0);
      expect(a >= RAIDS.laterMin).toBe(true);
      expect(b < a).toBe(true);
    }
    const p = raidWorld(1), s = raidWorld(1, 'sea_peoples');
    for (const w of [p, s]) { w.raid.index = 0; w.raid.clockDay = null; w.day = 10; raidDay(w); }
    expect(p.raid.nextWarnDay).toBe(10 + RAIDS.firstWarnAfter);
    expect(s.raid.nextWarnDay).toBe(10 + Math.round(RAIDS.firstWarnAfter / 2));
  });
  it('makes the band half again as big, capped at RAIDS.maxSize, and leaves the first raid alone', () => {
    const a = raidSize(raidWorld(1)), b = raidSize(raidWorld(1, 'sea_peoples'));
    expect(b).toBe(Math.min(RAIDS.maxSize, Math.round(a * 1.5)));
    const first = raidWorld(1, 'sea_peoples'); first.raid.index = 0;
    expect(raidSize(first)).toBe(RAIDS.firstSize);
  });
  it('brings war elephants from the 2nd raid under the Southern Host, and not without', () => {
    let seen = false;
    for (let seed = 1; seed <= 30; seed++) {
      expect(elephantRaid(raidWorld(seed), 1)).toBe(false);
      if (elephantRaid(raidWorld(seed, 'southern_host'), 1)) seen = true;
    }
    expect(seen).toBe(true);
  });
  it('lands more of a raid by boat under Sea Peoples', () => {
    let more = 0, fewer = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const a = drawMix(raidWorld(seed), 8, 40, { boats: true }).boat, b = drawMix(raidWorld(seed, 'sea_peoples'), 8, 40, { boats: true }).boat;
      if (b > a) more++;
      if (b < a) fewer++;
    }
    expect(more > 0 && fewer === 0).toBe(true);
  });
});

describe('v93 r sickness, fire and the court', () => {
  const homesWorld = (...ids) => {
    const w = makeTestWorld({ size: 40 });
    w.milestone = last; w.seed = 3;
    setRoad(w, 0, 10, 39, 10);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 12; x++) addRaw(w, 'house', 4 + x, 12 + y, { tier: 2, residents: 5 });
    if (ids.length) dec(w, ...ids);
    return w;
  };
  it('spreads sickness faster under the Plague, and not otherwise', () => {
    const run = (...ids) => {
      let n = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const w = homesWorld(...ids); w.seed = seed;
        Object.values(w.buildings).find((b) => b.type === 'house').illness = { start: 0, days: 500, left: 500, lost: 0, cap: 0 };
        for (let i = 0; i < 12; i++) { healthDay(w); w.day += 1; }
        n += Object.values(w.buildings).filter((b) => b.illness).length;
      }
      return n;
    };
    expect(run('plague') > run()).toBe(true);
  });
  it('starts fires more often under Fire season', () => {
    const run = (...ids) => {
      const w = homesWorld(...ids);
      for (let i = 0; i < 20; i++) {
        for (const b of Object.values(w.buildings)) if (!b.fire) b.risk = FIRE.threshold + 1;
        fireDay(w); w.day += 1;
      }
      return w.tally.fires + w.tally.burned;
    };
    expect(run('fire_season') > run()).toBe(true);
  });
  it('reaches 12 road tiles from a firehouse under Fire season, not 8', () => {
    const mk = (...ids) => {
      const w = makeTestWorld({ size: 40 });
      w.milestone = last;
      setRoad(w, 0, 10, 39, 10);
      addRaw(w, 'firehouse', 1, 11).staff = 100;
      const far = addRaw(w, 'house', 12, 11, { tier: 2, residents: 5 });
      if (ids.length) dec(w, ...ids);
      return { w, far };
    };
    const a = mk(), b = mk('fire_season');
    expect((fireCoverage(a.w).get(a.far.id) || 0) > 0).toBe(false);
    expect((fireCoverage(b.w).get(b.far.id) || 0) > 0).toBe(true);
  });
  it('asks more and pays more under the Vizier\'s Levy', () => {
    const ask = (...ids) => {
      const out = [];
      for (let seed = 1; seed <= 30; seed++) {
        const w = courtWorld({ seed });
        if (ids.length) dec(w, ...ids);
        w.court.awake = true; w.court.guided = 'answered'; w.court.nextRequestDay = YEAR; w.day = YEAR;
        courtDay(w);
        const r = w.court.request;
        out.push(r ? [r.kind, r.amount, r.gold] : null);
      }
      return out;
    };
    const a = ask(), b = ask('vizier_levy');
    let n = 0;
    a.forEach((x, i) => {
      if (!x || !b[i] || x[0] !== b[i][0] || x[0] === 'soldiers') return;
      n++;
      expect(b[i][1] > x[1]).toBe(true);
      expect(b[i][2] > x[2]).toBe(true);
    });
    expect(n > 5).toBe(true);
  });
});

describe('v93 r the flood', () => {
  it('moves each year\'s level one place weaker under Low Nile, kept to the levels that exist', () => {
    const ids = FLOOD_LEVELS.map((l) => l.id);
    const plain = createWorld({ seed: 11 }), low = createWorld({ seed: 11, decree: { week: '2026-47', ids: ['low_nile'] } });
    for (let year = 1; year <= 40; year++) {
      const a = ids.indexOf(levelOfYear(plain, year)), b = ids.indexOf(levelOfYear(low, year));
      expect(b).toBe(Math.max(0, a - 1));
    }
  });
});

describe('v93 r forbidden builds', () => {
  it('refuses walls and gates under Open city with the reason decree, and nothing else', () => {
    const w = makeTestWorld(); w.milestone = last;
    expect(canPlace(w, 'plaza', 20, 20).reason || null).toBe(null);
    dec(w, 'open_city');
    for (const t of ['wall', 'gate']) expect(canPlace(w, t, 20, 20).reason).toBe('decree');
    const r = previewWallTiles(w, [[20, 20], [21, 20]]);
    expect([r.ok, r.reason]).toEqual([false, 'decree']);
    expect(canPlace(w, 'plaza', 20, 20).reason || null).toBe(null);
    const p = makeTestWorld(); p.milestone = last;
    expect(previewWallTiles(p, [[20, 20], [21, 20]]).reason === 'decree').toBe(false);
  });
});
