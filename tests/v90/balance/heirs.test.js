// Version 9.0 wave 2, the balance check (design section 9, T4, T5 and T7; rulings 1620-1629): each heir's strength and weakness measured on the capital run's
// year-6 city, the score at year 6 under every heir, and the lesson's days with any heir on the device.
// Measured (the 9.0 probe, every heir's capital run from day 0): Capital on day 600 for every heir but the Generous (day 510: its 20% more newcomers),
// the score at year 6 357-364 against the Steady's 360, never below 0 (the Generous's lowest 62).
import { describe, it, expect } from '../../harness.js';
import { capitalRun, runCapital, CAPITAL_YEARS } from '../../stage4/balance/capitalRun.js';
import { HEIRS } from '../../../src/data/v90.js';
import { RAIDS } from '../../../src/data/raids.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { floodLevelRow } from '../../../src/data/river.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { firstWarnAfterOf } from '../../../src/sim/dynasty.js';
import { rushQuote, remainingNeed } from '../../../src/sim/monuments.js';
import { monthFigures, taxesAt } from '../../../src/sim/economy.js';
import { taxFactorOf } from '../../../src/sim/palace.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { produceDay } from '../../../src/sim/production.js';
import { levelHarvest } from '../../../src/sim/flood.js';
import { tradePrices, partnerUnlocked } from '../../../src/sim/trade.js';
import { monthlyArrivals } from '../../../src/sim/immigration.js';
import { scoreOf } from '../../../src/sim/score.js';
import { allBuildings } from '../../../src/sim/world.js';
import { isFarm } from '../../../src/sim/crops.js';
import { tickDay } from '../../../src/sim/clock.js';
import { lessonAt, LESSON_SCRIPT, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
// The capital run's year-6 city, copied, under `heir`: the two copies differ in nothing but the trait.
const year6 = (heir) => { const w = deserialize(serialize(capitalRun().w)); w.heir = heir; return w; };
// Each heir's own capital run from day 0 (once a page), with the day of each raid warning.
const runs = new Map();
function capitalOf(heir) {
  if (runs.has(heir)) return runs.get(heir);
  const warns = [];
  const r = runCapital(CAPITAL_YEARS * 12, { heir, onMonth: (w, events) => { for (const e of events || []) if (e.type === 'raid_warning') warns.push(e.arrives - RAIDS.warningDays); } });
  const out = { r, warns };
  runs.set(heir, out);
  return out;
}
// What one day of production adds to each producer `pick` takes, no unit made (progress started far below 1, so the sim's own rate line is all
// that moves it): the sum over them.
function dayOfMaking(w, pick) {
  const chosen = allBuildings(w).filter((b) => BUILDINGS[b.type].produces && pick(b));
  for (const b of allBuildings(w)) if (BUILDINGS[b.type].produces) b.progress = -100;
  produceDay(w);
  return chosen.reduce((n, b) => n + (b.progress + 100), 0);
}

describe('v90 balance T4 each strength and each weakness shows, on the capital run\'s year-6 city', () => {
  it('the Builder: the large mastaba finishes 13% sooner (1/1.15) at the same crews, with 5% less tax and the score\'s taxes whole', () => {
    const s = year6('steady'), b = year6('builder');
    const site = allBuildings(s).find((x) => x.type === 'mastaba_large');
    expect([Boolean(site), site.site && site.site.done]).toEqual([true, null]);    // still rising at year 6
    const units = (w) => { const need = remainingNeed(w.buildings[site.id]); return need.stone + need.bricks; };
    const days = (w) => units(w) / rushQuote(w, site.id).rate;
    expect(rushQuote(s, site.id).rate).toBeGreaterThan(0);
    expect(near(days(b) / days(s), 1 / 1.15)).toBe(true);
    const fs = monthFigures(s), fb = monthFigures(b);
    expect(fs.taxes).toBeGreaterThan(1000);
    expect(Math.abs(fb.taxes - fs.taxes * 0.95)).toBeLessThanOrEqual(1);
    expect(fb.taxesNormal).toBe(fs.taxesNormal);
  });
  it('the Unconquered: soldiers\' pay 20% lower, and the first warning on the clock\'s day + 200 (the capital run\'s, beaten)', () => {
    const s = year6('steady'), u = year6('unconquered');
    expect(soldiersPayOf(s)).toBeGreaterThan(0);
    expect(Math.abs(soldiersPayOf(u) - soldiersPayOf(s) * 0.8)).toBeLessThanOrEqual(1);
    expect([firstWarnAfterOf(s), firstWarnAfterOf(u)]).toEqual([300, 270]);   // WAVE2-PIN 9.2 Track S (ruling 1802): was [300, 200], the first warning 100 days sooner; now 30 days, and every later warning too
    const steady = capitalOf('steady'), heir = capitalOf('unconquered');
    expect([steady.warns[0] - steady.r.w.raid.clockDay, heir.warns[0] - heir.r.w.raid.clockDay]).toEqual([300, 270]);   // WAVE2-PIN 9.2 Track S (ruling 1802): was [300, 200]
    expect([heir.r.w.tally.raidsLost, heir.r.w.tally.raidsBeaten >= steady.r.w.tally.raidsBeaten]).toEqual([0, true]);
  });
  it('the Bountiful: the farms make 15% more in a good flood, and a low flood\'s loss is half again as deep', () => {
    const s = year6('steady'), f = year6('bountiful');
    for (const w of [s, f]) w.flood.applied = 'good';
    const farms = (b) => isFarm(b.type);
    const made = dayOfMaking(s, farms);
    expect(made).toBeGreaterThan(1);
    expect(near(dayOfMaking(f, farms), made * 1.15)).toBe(true);
    const low = floodLevelRow('low');
    expect(near(1 - levelHarvest(f, low), (1 - levelHarvest(s, low)) * 1.5)).toBe(true);
    expect(levelHarvest(f, floodLevelRow('good'))).toBe(levelHarvest(s, floodLevelRow('good')));
  });
  it('the Merchant: what partners buy pays 15% more, and the workshops make 15% less', () => {
    const s = year6('steady'), m = year6('merchant');
    let paid = 0, paidM = 0;
    for (const id of Object.keys(PARTNERS).filter((p) => partnerUnlocked(s, p))) {
      const ps = tradePrices(s, id), pm = tradePrices(m, id);
      for (const good of Object.keys(ps.buys)) { paid += ps.buys[good]; paidM += pm.buys[good]; }
      expect(pm.sells).toEqual(ps.sells);
    }
    expect(paid).toBeGreaterThan(0);
    expect(Math.abs(paidM / paid - 1.15)).toBeLessThan(0.02);                      // each price rounded once
    const workshops = (b) => Boolean(BUILDINGS[b.type].consumes);
    const made = dayOfMaking(s, workshops);
    expect(made).toBeGreaterThan(1);
    expect(near(dayOfMaking(m, workshops), made * 0.85)).toBe(true);
  });
  it('the Generous: 20% more arrivals at the same mood, and High at x1.15 (not x1.25)', () => {
    const s = year6('steady'), g = year6('generous');
    for (const w of [s, g]) w.mood = 70;
    expect(monthlyArrivals(s)).toBeGreaterThan(5);
    expect(Math.abs(monthlyArrivals(g) - monthlyArrivals(s) * 1.2)).toBeLessThanOrEqual(1.2);
    expect([taxFactorOf(s, 'high'), taxFactorOf(g, 'high')]).toEqual([1.25, 1.15]);
    const normal = monthFigures(s).taxesNormal;
    expect(Math.abs(taxesAt(g, 'high', normal) - taxesAt(s, 'high', normal) * (1.15 * 0.95 / 1.25))).toBeLessThanOrEqual(1);   // 9.2 (Track S): the Generous's taxes x0.95
  });
});

describe('v90 balance T5 the score at year 6 of the capital run', () => {
  it('scores every heir\'s own run within 8% of the Steady\'s, never below 0 gold', () => {
    const steady = scoreOf(capitalOf('steady').r.w).total;
    expect(steady).toBe(341);   // WAVE2-PIN 9.2 Track S (rulings 1795, 1800): was 360 (score v2; v3 counts the terms that have started, and the capital run's shorter mastaba and colossus change the city)
    for (const heir of HEIRS) {
      const { r } = capitalOf(heir);
      const total = scoreOf(r.w).total;
      expect([heir, Math.abs(total - steady) <= 0.08 * steady]).toEqual([heir, true]);
      expect([heir, r.lowestGold >= 0, r.insane]).toEqual([heir, true, []]);
    }
  });
  it('scores one city the same under every heir (the score never reads the trait)', () => {
    const totals = HEIRS.map((h) => scoreOf(year6(h)).total);
    expect(new Set(totals).size).toBe(1);
  });
});

// 8.4's walk-through (tests/v84/r/lesson.test.js DAYS_83, measured on 8.3 and pinned through 8.4): each step's first and last day.
// Version 9.1 (Track F, ruling 1657): the staged raid's raiders come LESSON_RAID_LEAD days after its warning, so the raid step ends on day 139.
const DAYS_84 = ['road:0>0', 'homes:0>0', 'largeplot:0>0', 'well:0>0', 'families:0>20', 'farm:20>20', 'granary:20>20', 'bazaar:20>20', 'workers:20>51', 'month:51>60', 'firehouse:60>61', 'fire:61>63', 'tower:63>65', 'raid:65>139'];   // 9.1 balance (ruling 1728): was 'raid:65>199'

describe('v90 balance T7 the lesson keeps 8.4\'s days whatever heir the device holds', () => {
  const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  async function lessonOn(heir) {
    const width = 390, height = 844;
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const dynasty = { name: 'Ana', heir };
    const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true }), [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty }) });
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      expect(api.records.dynasty().heir).toBe(heir);
      api.hooks.lesson({ step: 0 });
      await frame();
      return api.game().world;
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on'); delete window.__thebes; }
  }
  it('builds the lesson as the Steady and reaches every step on 8.4\'s day, with each heir on the device', async () => {
    for (const heir of HEIRS) {
      const world = await lessonOn(heir);   // the booted lesson's own world, walked as the scripted player walks it
      expect([heir, world.lesson, world.heir]).toEqual([heir, true, 'steady']);
      const steps = [];
      const io = { tick() { tickDay(world, []); }, did() {} };
      let at = lessonAt(world, 0);
      while (at < LESSON_LENGTH) {
        const step = LESSON_STEPS[at], begin = world.day;
        LESSON_SCRIPT[step.id](world, io);
        steps.push(`${step.id}:${begin}>${world.day}`);
        at = lessonAt(world, at + 1);
      }
      expect([heir, steps]).toEqual([heir, DAYS_84]);
      expect([heir, world.raid.clockDay, world.raid.last && world.raid.last.won]).toEqual([heir, 63, true]);
    }
  });
});
