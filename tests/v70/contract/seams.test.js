// Version 7.0 Track 0 (the contract, rulings 858-869): the seams the tracks fill, each a named function whose stub keeps 6.0.1's game.
// tradeAllowed and heldBack (T) are wired into the caravan and read only the switches and floors no command writes yet; drawEvent,
// eventChoices and applyChoice (E) draw nothing; seasonAt (S) is the month's season with no blend and lightAt (S) full daylight;
// towerSpotsFor and strandedFix (A) are not called yet. The lists, words, salts, settings and interface and render hooks are joined once.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { ART } from '../../../src/render/art/registry.js';
import { V70_ART, v70Slot } from '../../../src/render/art/v70.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { setTradeOrder, tradeMonth } from '../../../src/sim/trade.js';
import { tradeAllowed, heldBack, tradeAlerts } from '../../../src/sim/tradeRules.js';
import { drawEvent, eventChoices, applyChoice, eventAlerts } from '../../../src/sim/cityEvents.js';
import { seasonAt } from '../../../src/sim/seasons.js';
import { towerSpotsFor, strandedFix } from '../../../src/sim/adviceFixes.js';
import { v70Alerts } from '../../../src/sim/v70.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { ADVICE_KINDS } from '../../../src/data/advice.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { V70_HELP, V70_ADVICE_WORDS, V60_ADVICE_WORDS } from '../../../src/ui/text.js';
import { PARTNERS, QUAY_TYPE, QUAY_SIZE, INCENSE_GOOD, TRADE_SALT } from '../../../src/data/trade.js';
import { EVENT_SALT } from '../../../src/data/cityEvents.js';
import { SEASON_IDS, SEASON_SALT, LIGHT, LIGHT_PHASES } from '../../../src/data/seasons.js';
import { ADVICE_FIX_SALT } from '../../../src/data/adviceFixes.js';
import { SEASONS, TIPS, REMARK_SALT } from '../../../src/data/tips.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { GOODS } from '../../../src/data/goods.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { GOALS, EVENT_GOALS } from '../../../src/data/goals.js';
import { V70_TIPS, V70_FIRSTS, V70_ACHIEVEMENTS, V70_GOALS, V70_EVENT_GOALS, V70_BUILDINGS, V70_GOODS } from '../../../src/data/v70.js';
import { lightAt, drawLight } from '../../../src/render/light.js';
import { v70Ground, v70Walkers, v70Light } from '../../../src/render/v70.js';
import { createV70Seams } from '../../../src/ui/v70/index.js';
import { DEFAULT_SETTINGS, MUSIC_VOLUMES, createSettings } from '../../../src/ui/settings.js';
import { FIRE_SALT } from '../../../src/data/fire.js';
import { HEALTH_SALT } from '../../../src/data/health.js';
import { CRIME_SALT } from '../../../src/data/crime.js';
import { RAID_SALT } from '../../../src/data/raids.js';
import { RIVER_SALT } from '../../../src/data/river.js';
import { COURT_SALT } from '../../../src/data/court.js';
import { WONDER_SALT } from '../../../src/data/wonders.js';
import { S47_SALT } from '../../../src/data/s47.js';
import { MAP, MAP_SALT, HUGE_SALT } from '../../../src/data/map.js';
import { REIGN_SALT } from '../../../src/data/reign.js';
import { HAZARD_SALT } from '../../../src/data/hazards.js';
import { LARGE_SALT } from '../../../src/data/largePlots.js';
import { BATTLE_SALT } from '../../../src/data/battle.js';

const NEW_KINDS = ['event', 'quay', 'trade_floor'];

function sample() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  return w;
}

// A Market town on a 32-tile map with the Memphis route open (its gift given), a trading post joined to the trade entry and a storehouse
// in its reach, on the first caravan day (as tests/sim/trade.test.js).
function market() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  w.milestone = 'market_town';
  const store = addRaw(w, 'storehouse', 16, 8);
  addRaw(w, 'trading_post', 20, 8);
  staffAll(w);
  w.trade.routes.memphis = { since: 0, gifted: true };
  w.day = 90;
  return { w, store };
}

describe('v70 contract trade rules', () => {
  it('allows every good on both sides of every route, and holds nothing back, while no switch or floor is set', () => {
    const w = sample();
    for (const id of Object.keys(PARTNERS)) {
      for (const side of ['buys', 'sells']) for (const good of Object.keys(PARTNERS[id][side])) expect([id, side, good, tradeAllowed(w, id, good, side)]).toEqual([id, side, good, true]);
    }
    expect(tradeAllowed(w, 'memphis', 'grain', 'both')).toBe(false);
    for (const good of Object.keys(GOODS)) expect([good, heldBack(w, good)]).toEqual([good, { units: 0, floor: 0, temple: 0, court: 0 }]);
    expect(tradeAlerts(w)).toEqual([]);
  });

  it('is what the caravan obeys: a switch off stops the good on that side, a floor is never sold below, and with neither it trades as before', () => {
    const run = (set) => {
      const { w, store } = market();
      store.store = { pottery: 60, clay: 10 };
      setTradeOrder(w, 'pottery', 'sell', 20);
      setTradeOrder(w, 'clay', 'buy', 30);
      set(w);
      const events = [];
      tradeMonth(w, events);
      return [events[0].sold, events[0].bought, store.store];
    };
    expect(run(() => {})).toEqual([{ pottery: 40 }, { clay: 20 }, { pottery: 20, clay: 30 }]);       // 6.0.1's caravan (tests/sim/trade.test.js)
    expect(run((w) => { w.trade.switches.memphis = { buys: { pottery: false } }; })).toEqual([{}, { clay: 20 }, { pottery: 60, clay: 30 }]);
    expect(run((w) => { w.trade.switches.memphis = { sells: { clay: false } }; })).toEqual([{ pottery: 40 }, {}, { pottery: 20, clay: 10 }]);
    expect(run((w) => { w.trade.switches.byblos = { buys: { pottery: false } }; })).toEqual([{ pottery: 40 }, { clay: 20 }, { pottery: 20, clay: 30 }]);   // another route's switch
    expect(run((w) => { w.trade.floors.pottery = 50; })).toEqual([{ pottery: 10 }, { clay: 20 }, { pottery: 50, clay: 30 }]);
    expect(run((w) => { w.trade.floors.pottery = 10; })).toEqual([{ pottery: 40 }, { clay: 20 }, { pottery: 20, clay: 30 }]);   // the order's keep is higher
    expect(heldBack({ trade: { floors: { pottery: 50 } } }, 'pottery')).toEqual({ units: 50, floor: 50, temple: 0, court: 0 });
  });

  it('reserves the Quay\'s and incense\'s ids; Track T adds their rows', () => {
    expect([QUAY_TYPE, QUAY_SIZE, INCENSE_GOOD]).toEqual(['quay', { w: 2, d: 1 }, 'incense']);
    for (const [id, row] of Object.entries(V70_BUILDINGS)) expect(BUILDINGS[id]).toBe(row);
    for (const [id, row] of Object.entries(V70_GOODS)) expect(GOODS[id]).toBe(row);
  });
});

describe('v70 contract city events', () => {
  it('draws no event, offers no choice and applies none, so a year of play leaves the record as it was', () => {
    const w = sample();
    w.milestone = 'capital';
    expect([drawEvent(w), eventChoices(w, { kind: 'envoy', day: 0, due: 60 })]).toEqual([null, []]);
    expect(applyChoice(w, { kind: 'envoy', day: 0, due: 60 }, 'accept')).toEqual({ ok: false, reason: 'no_event', warnings: [] });
    expect(eventAlerts(w)).toEqual([]);
    const before = JSON.stringify(w.cityEvents);
    advanceDays(w, 360);
    expect(JSON.stringify(w.cityEvents)).toBe(before);
    expect(v70Alerts(w)).toEqual([]);
    expect(alertsFor(w).some((a) => /event/.test(a.code))).toBe(false);
  });
});

describe('v70 contract seasons and light', () => {
  it('reads the month\'s season from the flood calendar with no blend yet, the same for the same day', () => {
    expect(SEASON_IDS).toEqual(['akhet', 'peret', 'shemu']);
    const w = createWorld({ seed: 2 });
    const seen = [];
    for (let m = 0; m < 24; m++) {
      w.day = m * 30 + 7;
      const s = seasonAt(w);
      expect([m, s]).toEqual([m, { season: SEASONS[m % 12], next: SEASONS[m % 12], blend: 0 }]);
      expect(seasonAt(w)).toEqual(s);
      seen.push(s.season);
    }
    // Akhet is the flood's months and its drain month (7-10), Peret the four after (11-2), Shemu the rest (3-6): src/data/tips.js SEASONS.
    expect(seen.slice(0, 12)).toEqual(['peret', 'peret', 'shemu', 'shemu', 'shemu', 'shemu', 'akhet', 'akhet', 'akhet', 'akhet', 'peret', 'peret']);
    expect([...new Set(seen)].sort()).toEqual([...SEASON_IDS].sort());
  });

  it('keeps full daylight on the real clock, with the loop\'s length and phases named for Track S', () => {
    expect([LIGHT.cycleMs, LIGHT_PHASES]).toEqual([360000, ['dawn', 'day', 'dusk', 'night']]);
    for (const t of [0, 90000, 180000, 270000, 359999, 1e9]) expect([t, lightAt(t)]).toEqual([t, { phase: 'day', dark: 0, lamps: 0 }]);
    const calls = [];
    const g = new Proxy({}, { get: (o, k) => () => calls.push(k) });           // any draw call is recorded
    const w = sample();
    v70Ground(g, w, { x0: 0, y0: 0, x1: 10, y1: 10 }, 0, 'gentle');
    v70Light(g, w, { x0: 0, y0: 0, x1: 10, y1: 10 }, { ctx: g, W: 100, H: 100, ox: 0, oy: 0, dpr: 1 }, 0, 'gentle', DEFAULT_SETTINGS);
    drawLight(g, w);
    expect(calls).toEqual([]);                                                  // nothing drawn yet
    expect(v70Walkers(w, 0, { x0: 0, y0: 0, x1: 63, y1: 63 }, 'full')).toEqual([]);
  });

  it('keeps Day and night (on) and the effects\' volume (today\'s, 100) in the device\'s settings, checked like the others', () => {
    expect([DEFAULT_SETTINGS.dayNight, DEFAULT_SETTINGS.effectsVolume, DEFAULT_SETTINGS.musicVolume]).toEqual([true, 100, 30]);
    expect(MUSIC_VOLUMES).toContain(100);
    const stored = {};
    const storage = { getItem: (k) => stored[k] || null, setItem: (k, v) => { stored[k] = v; } };
    const s = createSettings({ storage, root: document.createElement('div'), watchSystem: () => () => {} });
    s.set({ dayNight: 'off', effectsVolume: 35 });
    expect([s.get().dayNight, s.get().effectsVolume]).toEqual([true, 100]);   // refused: not a boolean, not a volume step
    s.set({ dayNight: false, effectsVolume: 40 });
    const again = createSettings({ storage, root: document.createElement('div'), watchSystem: () => () => {} });
    expect([again.get().dayNight, again.get().effectsVolume]).toEqual([false, 40]);
    s.destroy(); again.destroy();
  });
});

describe('v70 contract advice', () => {
  it('reserves the new kinds after the court\'s demand, keeps every 6.0.1 kind in its order, and adds no item yet', () => {
    const OLD = ['raid_towers', 'plague', 'fire', 'locusts', 'drought', 'treasury', 'demand', 'illness', 'crime', 'home_need', 'stranded', 'running_out', 'workers_short', 'jobless'];
    expect(ADVICE_KINDS.filter((k) => OLD.includes(k))).toEqual(OLD);
    expect(ADVICE_KINDS.slice(ADVICE_KINDS.indexOf('demand') + 1, ADVICE_KINDS.indexOf('demand') + 4)).toEqual(NEW_KINDS);
    const w = sample();
    advanceDays(w, 60);
    for (const a of cityAdvice(w)) expect([a.kind, NEW_KINDS.includes(a.kind)]).toEqual([a.kind, false]);
    expect([towerSpotsFor(w, null), strandedFix(w, 'pottery', null)]).toEqual([[], null]);
  });

  it('words a new kind from V70_ADVICE_WORDS, and How to play\'s paragraphs come from V70_HELP in track order', () => {
    expect(Object.keys(V70_HELP)).toEqual(['t', 'e', 's', 'a']);
    for (const list of Object.values(V70_HELP)) for (const p of list) expect([typeof p.head, typeof p.text]).toEqual(['string', 'string']);
    const w = createWorld({ seed: 6 });
    const item = { key: 'event:1', kind: 'event', weight: 5, count: 1, id: null, data: {}, fix: null, cost: null, afford: null };
    const before = V70_ADVICE_WORDS.event;
    expect(V60_ADVICE_WORDS.event).toBe(undefined);
    delete V70_ADVICE_WORDS.event;
    try {
      expect(adviceWords(item, w).what).toBe('');
      V70_ADVICE_WORDS.event = (a) => ({ what: `An envoy waits (${a.key})`, why: 'Answer within 2 months', fix: '' });
      expect(adviceWords(item, w)).toEqual({ what: 'An envoy waits (event:1)', why: 'Answer within 2 months', fix: '', cost: '', short: false, action: null });
    } finally { if (before) V70_ADVICE_WORDS.event = before; else delete V70_ADVICE_WORDS.event; }
  });
});

describe('v70 contract lists, seams and salts', () => {
  it('joins each track\'s rows into the shared lists', () => {
    for (const t of V70_TIPS) expect(TIPS).toContain(t);
    for (const f of V70_FIRSTS) expect(FIRSTS).toContain(f);
    for (const a of V70_ACHIEVEMENTS) expect(ACHIEVEMENTS).toContain(a);
    for (const g of V70_GOALS) expect(GOALS).toContain(g);
    for (const g of V70_EVENT_GOALS) expect(EVENT_GOALS).toContain(g);
  });

  it('joins the tracks\' art into the registry, and no building\'s slot moves while it is empty', () => {
    for (const [slot, entry] of Object.entries(V70_ART)) expect(ART[slot]).toBe(entry);
    const w = sample();
    expect(allBuildings(w).filter((b) => v70Slot(b, w) !== null)).toEqual([]);
  });

  it('makes the four interface seams in track order, each the seam\'s shape and empty', () => {
    const seams = createV70Seams(null);
    expect(seams.length).toBe(4);
    for (const s of seams) {
      expect([Object.keys(s.sheets), Object.keys(s.sheetParts).sort()]).toEqual([[], ['actions', 'building', 'house', 'summary']]);
      for (const part of Object.values(s.sheetParts)) expect(part({})).toEqual([]);
      for (const k of ['onEvents', 'refresh', 'onAlertAction', 'onCommand', 'destroy']) expect(typeof s[k]).toBe('function');
    }
  });

  it('registers each track its own salt range, unique across the game: T 6101-6119, E 6121-6149, S 6151-6159, A 6161-6169', () => {
    const TABLE = {
      fire: FIRE_SALT, health: HEALTH_SALT, crime: CRIME_SALT, raid: RAID_SALT, remark: { remark: REMARK_SALT }, drift: { drift: 7349 },
      map: { variant: MAP.variantSalt, clay: MAP.clay.salt, ...MAP_SALT }, river: RIVER_SALT, court: COURT_SALT, wonders: WONDER_SALT,
      s47: S47_SALT, reign: REIGN_SALT, hazard: HAZARD_SALT, large: LARGE_SALT, battle: BATTLE_SALT, huge: HUGE_SALT,
      trade: TRADE_SALT, events: EVENT_SALT, seasons: SEASON_SALT, advice: ADVICE_FIX_SALT,
    };
    const all = Object.entries(TABLE).flatMap(([t, o]) => Object.entries(o).map(([k, v]) => [`${t}.${k}`, v]));
    const seen = new Map();
    for (const [name, v] of all) {
      expect([name, Number.isInteger(v)]).toEqual([name, true]);
      if (seen.has(v)) expect([name, v]).toEqual([seen.get(v), 'unique']);
      seen.set(v, name);
    }
    const within = (o, lo, hi) => Object.values(o).every((v) => v >= lo && v <= hi);
    expect([within(TRADE_SALT, 6101, 6119), within(EVENT_SALT, 6121, 6149), within(SEASON_SALT, 6151, 6159), within(ADVICE_FIX_SALT, 6161, 6169)])
      .toEqual([true, true, true, true]);
  });
});
