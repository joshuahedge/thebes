// Version 9.0 Track D (design section 4, rulings 1567, 1568, 1572): the heir's trait. Each lever on (its heir) and off (the Steady and every other heir), read
// in its one function, and every number the interface quotes from it set up both ways; the score is the same for two heirs in one state.
import { describe, it, expect } from '../../harness.js';
import { TRAITS, FACTOR_LEVERS, deeperLoss } from '../../../src/data/dynasty.js';
import { HEIRS } from '../../../src/data/v90.js';
import { RAIDS, SPOILS } from '../../../src/data/raids.js';
import { UNIT_TYPES } from '../../../src/data/armies.js';
import { MOOD } from '../../../src/data/mood.js';
import { floodLevelRow } from '../../../src/data/river.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { heirFactor, firstWarnAfterOf, heirHighFactor, heirLoss } from '../../../src/sim/dynasty.js';
import { crewDayUnits, rushQuote } from '../../../src/sim/monuments.js';
import { monthFigures, monthForecast, taxesAt } from '../../../src/sim/economy.js';
import { setTaxRate, taxFactorOf } from '../../../src/sim/palace.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { raidDay } from '../../../src/sim/raids.js';
import { produceDay, heirRate, harvestFactor } from '../../../src/sim/production.js';
import { levelHarvest, floodHarvestFactor, floodOutlook, floodLook } from '../../../src/sim/flood.js';
import { tradePrices } from '../../../src/sim/trade.js';
import { monthlyArrivals } from '../../../src/sim/immigration.js';
import { scoreOf } from '../../../src/sim/score.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';
import { createWorld, population } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { idx } from '../../../src/sim/grid.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { siteRows, taxModel } from '../../../src/ui/monumentSheet.js';
import { V84_G_TEXT, V90_D_TEXT } from '../../../src/ui/text.js';
import { rushCity } from '../../v84/g/fixtures.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const as = (w, heir) => { w.heir = heir; return w; };
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const others = (heir) => HEIRS.filter((h) => h !== heir);

describe('v90 d traits: the data and heirFactor', () => {
  it('has the design\'s strengths and weaknesses (Q5)', () => {
    expect(TRAITS).toEqual({
      builder: { crews: 1.15, taxes: 0.95 },
      unconquered: { pay: 0.8, sooner: 100 },
      bountiful: { farms: 1.15, floodLoss: 1.5 },
      merchant: { buys: 1.15, workshops: 0.85 },
      generous: { arrivals: 1.2, high: 1.15 },
      steady: {},
    });
  });
  it('gives each lever\'s factor to its heir only, and 1 everywhere else', () => {
    const w = createWorld({ seed: 3 });
    for (const heir of HEIRS) {
      as(w, heir);
      for (const lever of FACTOR_LEVERS) expect([heir, lever, heirFactor(w, lever)]).toEqual([heir, lever, TRAITS[heir][lever] || 1]);
      expect([heir, heirFactor(w, 'sooner'), heirFactor(w, 'high')]).toEqual([heir, 1, 1]);   // days and a replaced factor have their own helpers
      expect([heir, firstWarnAfterOf(w)]).toEqual([heir, heir === 'unconquered' ? RAIDS.firstWarnAfter - 100 : RAIDS.firstWarnAfter]);
      expect([heir, heirHighFactor(w)]).toEqual([heir, heir === 'generous' ? 1.15 : null]);
    }
  });
  it('makes a loss deeper only for the Bountiful, and hands every other factor back untouched', () => {
    expect([deeperLoss(0.6, 1.5), deeperLoss(0.2, 1.5), deeperLoss(1.1, 1.5), deeperLoss(0.7333333333333334, 1)]).toEqual([1 - 0.4 * 1.5, 0, 1.1, 0.7333333333333334]);
    const w = createWorld({ seed: 3 });
    for (const h of others('bountiful')) expect([h, heirLoss(as(w, h), 0.6)]).toEqual([h, 0.6]);
    expect(heirLoss(as(w, 'bountiful'), 0.6)).toBe(1 - 0.4 * 1.5);
  });
});

describe('v90 d traits: the Builder', () => {
  it('lays 15% more a day, and the site\'s Rush quote counts its days at that pace', () => {
    const steady = rushCity({ stone: 2000 }), builder = rushCity({ stone: 2000 });
    as(builder.w, 'builder');
    const g0 = steady.guilds[0], g1 = builder.guilds[0];
    expect(near(crewDayUnits(builder.w, g1, builder.site), crewDayUnits(steady.w, g0, steady.site) * 1.15)).toBe(true);
    const q0 = rushQuote(steady.w, steady.site.id), q1 = rushQuote(builder.w, builder.site.id);
    expect(near(q1.rate, q0.rate * 1.15)).toBe(true);
    expect(q1.days < q0.days).toBe(true);
    for (const [w, site, q] of [[steady.w, steady.site, q0], [builder.w, builder.site, q1]]) {
      const row = siteRows(w, site).find((r) => r.key === 'rush-how');
      expect(row.text).toContain(V84_G_TEXT.rushQuoteNote(q));
    }
  });
  it('takes 5% less in taxes after the rate, while taxesNormal (the score\'s) stays whole, and the palace\'s choices say so', () => {
    const town = (heir) => {
      const w = makeTestWorld({ size: 32, gold: 5000 });
      setRoad(w, 0, 10, 31, 10);
      w.milestone = 'town';
      addRaw(w, 'house', 10, 11, { tier: 3, residents: 7 });
      addRaw(w, 'house', 11, 11, { tier: 2, residents: 5 });
      addRaw(w, 'house', 12, 11, { tier: 4, residents: 11 });   // 41 at Normal
      const p = addRaw(w, 'palace', 14, 11, { style: 0, works: null });
      return { w: as(w, heir), p };
    };
    const s = town('steady'), b = town('builder');
    expect([monthFigures(s.w).taxes, monthFigures(s.w).taxesNormal]).toEqual([41, 41]);
    expect([monthFigures(b.w).taxes, monthFigures(b.w).taxesNormal]).toEqual([Math.round(41 * 0.95), 41]);
    expect(monthForecast(b.w).taxes).toBe(39);
    expect(taxModel(s.w).choices.map((c) => c.line)).toEqual(['10 gold a month less, mood +8', '41 gold a month in taxes, no change to mood', '10 gold a month more, mood −8']);
    expect(taxModel(b.w).at).toEqual({ low: Math.round(41 * 0.75 * 0.95), normal: 39, high: Math.round(41 * 1.25 * 0.95) });
    expect(taxModel(b.w).choices.map((c) => c.line)).toEqual(['10 gold a month less, mood +8', '39 gold a month in taxes, no change to mood', '10 gold a month more, mood −8']);
    setTaxRate(b.w, b.p.id, 'low');
    expect(monthFigures(b.w).taxes).toBe(taxModel(b.w).at.low);
  });
});

describe('v90 d traits: the Unconquered', () => {
  const army = (heir, n = 7) => { const w = as(createWorld({ seed: 3 }), heir); w.soldiers = Array.from({ length: n }, (_, i) => ({ id: i + 1, kind: 'soldier' })); return w; };
  it('pays its units 20% less, before the captured weapons\' share, rounded once (ruling 1568)', () => {
    const full = 7 * UNIT_TYPES.soldier.pay;
    expect(soldiersPayOf(army('steady'))).toBe(full);
    expect(soldiersPayOf(army('unconquered'))).toBe(Math.round(full * 0.8));
    for (const h of others('unconquered')) expect([h, soldiersPayOf(army(h))]).toEqual([h, full]);
    const s = army('steady'), u = army('unconquered');
    s.raid.spoils = { until: s.day + 100 }; u.raid.spoils = { until: u.day + 100 };
    expect(soldiersPayOf(s)).toBe(Math.round(full * (1 - SPOILS.share)));
    expect(soldiersPayOf(u)).toBe(Math.round(full * 0.8 * (1 - SPOILS.share)));
    expect([monthFigures(u).soldiers, monthForecast(u).soldiers]).toEqual([soldiersPayOf(u), soldiersPayOf(u)]);
  });
  it('is warned first 100 days sooner after the clock starts (200, not 300)', () => {
    for (const heir of HEIRS) {
      const w = as(createWorld({ seed: 8 }), heir);
      w.tally.peakPeople = RAIDS.clockPeople;
      w.day = 700;
      raidDay(w, []);
      expect([heir, w.raid.clockDay, w.raid.nextWarnDay]).toEqual([heir, 700, 700 + (heir === 'unconquered' ? 200 : 300)]);
    }
  });
});

describe('v90 d traits: the Bountiful', () => {
  // A staffed grain farm on the floodplain (its four tiles marked) beside a granary, last flood Low.
  function farmCity(heir) {
    const w = as(makeTestWorld({ size: 32 }), heir);
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'town';
    const farm = addRaw(w, 'farm_grain', 2, 8, { staff: 6 });   // 0.6 of a unit a day: none made in the first day, so progress shows the rate
    addRaw(w, 'granary', 5, 8, { staff: 6 });
    for (let y = 8; y < 10; y++) for (let x = 2; x < 4; x++) w.floodplain[idx(w.size, x, y)] = 1;
    return { w, farm };
  }
  it('grows 15% more on a farm, and nothing changes for a workshop or a store', () => {
    const s = farmCity('steady'), b = farmCity('bountiful');
    expect([heirRate(s.w, s.farm), heirRate(b.w, b.farm)]).toEqual([1, 1.15]);
    produceDay(s.w); produceDay(b.w);
    expect([s.farm.progress > 0, near(b.farm.progress, s.farm.progress * 1.15)]).toEqual([true, true]);
    const potter = addRaw(b.w, 'potter', 20, 11, { staff: 6 });
    expect(heirRate(b.w, potter)).toBe(1);
  });
  it('loses half again as much to a low flood, and the flood\'s words and the food forecast say the deeper loss', () => {
    const s = farmCity('steady'), b = farmCity('bountiful');
    for (const c of [s, b]) c.w.flood.applied = 'low';
    const low = floodLevelRow('low').harvest;
    expect([levelHarvest(s.w, floodLevelRow('low')), levelHarvest(b.w, floodLevelRow('low'))]).toEqual([low, 1 - (1 - low) * 1.5]);
    expect([floodHarvestFactor(s.w, s.farm), harvestFactor(b.w, b.farm)]).toEqual([low, 1 - (1 - low) * 1.5]);
    expect([levelHarvest(b.w, floodLevelRow('good')), levelHarvest(b.w, floodLevelRow('high'))]).toEqual([floodLevelRow('good').harvest, floodLevelRow('high').harvest]);   // a good flood is the same
    expect([floodLook(s.w).factor, floodLook(b.w).factor]).toEqual([low, 1 - (1 - low) * 1.5]);
    const monthly = 30 * 0.6;   // a grain farm's 30 a month at 6 of its 10 workers
    expect(floodOutlook(s.w)).toEqual({ farms: 1, plain: Math.round(monthly), now: Math.round(monthly * low), level: floodLevelRow('low') });
    expect(floodOutlook(b.w)).toEqual({ farms: 1, plain: Math.round(monthly * 1.15), now: Math.round(monthly * 1.15 * (1 - (1 - low) * 1.5)), level: floodLevelRow('low') });
  });
});

describe('v90 d traits: the Merchant', () => {
  it('is paid 15% more for what partners buy, and asked the same for what they sell', () => {
    const s = createWorld({ seed: 4 }), m = as(createWorld({ seed: 4 }), 'merchant');
    for (const w of [s, m]) w.milestone = 'capital';
    for (const id of ['memphis', 'byblos']) {
      const ps = tradePrices(s, id), pm = tradePrices(m, id);
      expect(pm.sells).toEqual(ps.sells);
      expect(Object.keys(pm.buys)).toEqual(Object.keys(ps.buys));
      for (const good of Object.keys(ps.buys)) {
        const drift = (s.trade.drift[id] || {})[good] || 0, base = PARTNERS[id].buys[good].price;
        expect([id, good, ps.buys[good], pm.buys[good]]).toEqual([id, good, Math.max(1, Math.round(base * (1 + drift))), Math.max(1, Math.round(base * (1 + drift) * 1.15))]);
      }
    }
  });
  it('makes 15% less in a workshop, and nothing changes on a farm', () => {
    const w = as(makeTestWorld({ size: 32 }), 'merchant');
    expect(heirRate(w, addRaw(w, 'potter', 20, 11, { staff: 6 }))).toBe(0.85);
    expect(heirRate(w, addRaw(w, 'farm_grain', 2, 2, { staff: 10 }))).toBe(1);
    expect(heirRate(as(w, 'steady'), addRaw(w, 'brewery', 24, 11, { staff: 6 }))).toBe(1);
  });
});

describe('v90 d traits: the Generous', () => {
  it('draws 20% more newcomers at the same mood', () => {
    const s = createWorld({ seed: 11 }), g = createWorld({ seed: 11 });
    buildSampleCity(s); buildSampleCity(g);
    as(g, 'generous');
    for (const w of [s, g]) w.mood = 70;
    const base = ((MOOD.arrivalBase + MOOD.arrivalPerPop * population(s)) * 70) / MOOD.arrivalMoodDivisor;
    expect([monthlyArrivals(s), monthlyArrivals(g)]).toEqual([Math.round(base), Math.round(base * 1.2)]);
    for (const w of [s, g]) w.mood = MOOD.arrivalsMin - 1;
    expect([monthlyArrivals(s), monthlyArrivals(g)]).toEqual([0, 0]);
  });
  it('takes x1.15 at High, not x1.25, and the palace\'s High choice says so', () => {
    const s = createWorld({ seed: 3 }), g = as(createWorld({ seed: 3 }), 'generous');
    expect([taxFactorOf(s, 'high'), taxFactorOf(g, 'high'), taxFactorOf(g, 'low'), taxFactorOf(g, 'normal')]).toEqual([1.25, 1.15, 0.75, 1]);
    expect([taxesAt(s, 'high', 100), taxesAt(g, 'high', 100)]).toEqual([125, 115]);
    expect(V84_G_TEXT.rateLine('high', 100, { low: 75, normal: 100, high: 115 })).toBe('15 gold a month more, mood −8');
    expect(V84_G_TEXT.rateLine('high', 100)).toBe('25 gold a month more, mood −8');   // 8.4's words when no city is quoted
  });
});

describe('v90 d traits: the score never reads the trait', () => {
  it('scores one state the same under every heir', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    advanceDays(w, 30);
    const steady = scoreOf(w);
    for (const h of HEIRS) expect([h, scoreOf(as(w, h))]).toEqual([h, steady]);
  });
  it('scores a Builder heir\'s month the same as the Steady\'s (taxes counted at Normal, untraited)', () => {
    const a = createWorld({ seed: 11 }), b = createWorld({ seed: 11 });
    buildSampleCity(a); buildSampleCity(b);
    as(b, 'builder');
    monthlyEconomy(a); monthlyEconomy(b);
    expect(b.stats.lastMonth.taxes < a.stats.lastMonth.taxes).toBe(true);
    expect(b.stats.lastMonth.taxesNormal).toBe(a.stats.lastMonth.taxesNormal);
    expect(scoreOf(b).parts).toEqual(scoreOf(a).parts);
  });
  it('words each trait from the data', () => {
    expect(V90_D_TEXT.heirLine('builder')).toBe('Heir of the Builder: monuments rise 15% faster; taxes 5% lower');
    expect(V90_D_TEXT.traitLine('unconquered')).toBe("soldiers' pay 20% lower; the first raid warning comes 100 days sooner");
    expect(V90_D_TEXT.traitLine('bountiful')).toBe('farms yield 15% more; a low flood takes half again as much of the harvest');
    expect(V90_D_TEXT.traitLine('merchant')).toBe('partners pay 15% more for what they buy; workshops make 15% less');
    expect(V90_D_TEXT.traitLine('generous')).toBe('20% more newcomers; High taxes take 1.15x, not 1.25x');
    expect(V90_D_TEXT.traitLine('steady')).toBe('a plain start, with no strength and no weakness');
  });
});
