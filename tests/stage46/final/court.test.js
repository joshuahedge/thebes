// Stage 4.6 final review, the court and the units it borrows (rulings 440-449): every rule a sentence states is set up both ways, and the
// words are read against what the sim does.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { addRaw, makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { allBuildings, removeBuilding, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { hash2 } from '../../../src/sim/rng.js';
import { openSheet } from '../../../src/ui/modes.js';
import {
  courtDay, courtMonth, addFavour, cardChoices, answerCard, eligibleCards, outputPerMonth, roomFor, stockOf, sendRequest, RIVER_HOOKS,
} from '../../../src/sim/court.js';
import { FAVOUR, COURT, COURT_SALT, REQUESTS } from '../../../src/data/court.js';
import { HUNTING, FISHING } from '../../../src/data/river.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { raidSize, baseRaidSize, raidDay, tributeQuote } from '../../../src/sim/raids.js';
import { scoreOf } from '../../../src/sim/score.js';
import { raidsOn } from '../../../src/sim/costs.js';
import { sendUnits, armyDay, unitsAway, boatLanding } from '../../../src/sim/armies.js';
import { huntingOutlook } from '../../../src/sim/wildlife.js';
import { tickDay } from '../../../src/sim/clock.js';
import { toolPreview } from '../../../src/ui/placement.js';
import { demolishQuestion } from '../../../src/ui/monumentSheet.js';
import { S46_COURT_TEXT as C, FIRST_TEXT, TIP_HELP_TEXT } from '../../../src/ui/text.js';
import { courtWorld, MONTH, YEAR } from '../court/courtHelpers.js';

const withBarracks = (w, n, x = 20, y = 12) => {
  const bar = insertBuilding(w, makeBuilding(w, 'barracks', x, y));
  bar.staff = BUILDINGS.barracks.workers;
  for (let i = 0; i < n; i++) w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: x + 1, y: y + 1, hp: 12, hit: false, task: 'wait' });
  return bar;
};
const askSoldiers = (w, amount) => {
  const id = w.court.nextId++;
  w.court.guided = 'answered';
  w.court.request = { id, kind: 'soldiers', good: null, amount, day: w.day, due: w.day + 8 * MONTH, gold: 40, met: 10, missed: 12, guided: false };
  w.court.letters.push({ id, kind: 'request', day: w.day, read: false });
  return w.court.request;
};

describe('s46 final court: the gift reads favour before it drifts (ruling 440)', () => {
  it('gives the gift to a city held at exactly 70, and none at 69', () => {
    for (const [favour, gifts] of [[FAVOUR.high, 1], [FAVOUR.high - 1, 0]]) {
      const w = courtWorld({ open: true });
      w.court.nextGiftDay = w.day;
      w.court.favour = favour;
      courtMonth(w, []);
      expect([favour, w.tally.gifts, w.court.favour]).toEqual([favour, gifts, favour - FAVOUR.drift]);
    }
  });
  it('starts the gift clock at exactly 70 at a month\'s end, and not at 69', () => {
    for (const [favour, started] of [[FAVOUR.high, true], [FAVOUR.high - 1, false]]) {
      const w = courtWorld({ open: true });
      w.court.favour = favour;
      courtMonth(w);
      expect([favour, w.court.nextGiftDay !== null]).toEqual([favour, started]);
    }
  });
});

describe('s46 final court: favour never moves the score (ruling 441)', () => {
  it('scores a city the same at favour 20 and 50, though favour 20 makes the raid bigger', () => {
    const at = (favour) => {
      const w = courtWorld({ open: true });
      w.raid.clockDay = 0;
      w.raid.index = 4;
      w.court.favour = favour;
      return { size: raidSize(w), base: baseRaidSize(w), score: scoreOf(w) };
    };
    const low = at(20), mid = at(50);
    expect(low.size > mid.size).toBe(true);                                   // favour still grows the raid itself
    expect(low.base).toBe(mid.base);
    expect([low.score.parts.safety, low.score.total]).toEqual([mid.score.parts.safety, mid.score.total]);
    expect(low.score.reasons.safety).toEqual(mid.score.reasons.safety);
  });
});

describe('s46 final court: words true on every difficulty (ruling 442)', () => {
  it('says only gifts in the first letter\'s why and the How to play line, and the sim gives a gift at 70 on Peaceful and on Normal', () => {
    for (const words of [FIRST_TEXT.first_letter.why, TIP_HELP_TEXT.court_letters]) {
      expect(/tribute|raid/i.test(words)).toBe(false);
      expect(words).toContain(`${FAVOUR.high} or more, the court sends gifts`);
    }
    for (const difficulty of ['peaceful', 'normal']) {
      const w = courtWorld({ open: true, difficulty });
      w.court.nextGiftDay = w.day;
      w.court.favour = FAVOUR.high;
      courtMonth(w);
      expect([difficulty, w.tally.gifts]).toEqual([difficulty, 1]);
    }
    expect(raidsOn(courtWorld({ difficulty: 'peaceful' }))).toBe(false);   // so a tribute line would be untrue there
  });
  it('says a warned raid keeps the tribute set at its warning, which favour since does not change', async () => {
    const w = courtWorld({ open: true });
    w.raid.clockDay = 0;
    w.raid.index = 3;
    w.raid.nextWarnDay = w.day;
    w.raiderEntries = [{ x: 39, y: 10 }];
    raidDay(w, []);
    const warned = w.raid.warning;
    expect(Boolean(warned) && warned.tribute > 0).toBe(true);
    const before = warned.tribute;
    addFavour(w, FAVOUR.high - w.court.favour);                               // favour reaches the cheaper-tribute band after the warning
    expect([w.raid.warning.tribute, tributeQuote(w).cost]).toEqual([before, before]);
    expect(C.warnedRaid(warned)).toBe(`The raid already warned keeps the size and tribute (${before} gold) set at its warning`);
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'court'));
      expect(r.root.querySelector('#sheet .warned-raid').textContent).toBe(`${C.warnedRaid(warned)}.`);
      w.raid.warning = null;
      r.ui.refresh();
      expect(r.root.querySelector('#sheet .warned-raid')).toBe(null);
    } finally { r.cleanup(); }
  });
});

describe('s46 final court: units away (ruling 443)', () => {
  it('marks units whose barracks is gone, pushes units_lost on their return day, and they leave service; with it standing they come back', () => {
    for (const demolish of [true, false]) {
      const w = courtWorld({ open: true });
      const bar = withBarracks(w, 3);
      expect(sendUnits(w, 2, 30).ok).toBe(true);
      if (demolish) removeBuilding(w, bar.id);
      const [group] = unitsAway(w);
      expect(Boolean(group.gone)).toBe(demolish);
      expect(C.awayLine(group).includes('will leave service: their barracks is gone')).toBe(demolish);
      const events = [];
      w.day += 30;
      armyDay(w, events);
      expect(events.map((e) => e.type)).toEqual([demolish ? 'units_lost' : 'units_back']);
      expect(w.soldiers.length).toBe(demolish ? 1 : 3);
      if (demolish) expect(C.captionUnitsLost(events[0])).toBe('2 trained units back from the capital left service: their barracks is gone');
    }
  });
  it('words units lost to a burned barracks (rubble on its id) the same way, and captions it on the real shell', async () => {
    const w = courtWorld({ open: true });
    const bar = withBarracks(w, 2);
    sendUnits(w, 1, 30);
    w.buildings[bar.id].type = 'rubble';
    expect(unitsAway(w)[0].gone).toBe(true);
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'court'));
      expect(r.root.querySelector('#sheet .units-away').textContent).toContain('1 trained unit due back in');
      expect(r.root.querySelector('#sheet .units-away').textContent).toContain('will leave service: their barracks is gone');
      const events = [];
      w.day += 30;
      armyDay(w, events);
      r.ui.onEvents(events);
      expect(r.ui.celebrations.recent()[0].text).toBe('1 trained unit back from the capital left service: their barracks is gone');   // held in Recent while the sheet is open
    } finally { r.cleanup(); }
  });
  it('warns on Demolish of a barracks with units away, at the sheet\'s question and on the demolish tool\'s bar, and not without', () => {
    const w = courtWorld({ open: true });
    const bar = withBarracks(w, 3);
    const area = { x0: bar.x, y0: bar.y, x1: bar.x, y1: bar.y };
    expect(demolishQuestion(w, bar)).toBe(null);
    expect(toolPreview(w, { tool: { kind: 'demolish' }, area }).state).toBe('ok');
    sendUnits(w, 2, 30);
    expect(demolishQuestion(w, bar)).toBe('Tear down the barracks? 2 trained units away at the capital come back to it: with it gone, they leave service.');
    const p = toolPreview(w, { tool: { kind: 'demolish' }, area });
    expect([p.state, p.text.endsWith('2 trained units away at the capital will leave service')]).toEqual(['warn', true]);
  });
  it('says a raid already warned comes while lent units are away, and they are indeed gone when it comes; no line with no warning', () => {
    for (const warned of [true, false]) {
      const w = courtWorld({ open: true });
      withBarracks(w, 4);
      const r = askSoldiers(w, 2);
      if (warned) w.raid.warning = { index: 2, entry: { x: 39, y: 10 }, dir: 'east', size: 6, tribute: 90, target: 'granary', day: w.day, arrives: w.day + 12, first: false, mix: { foot: 6, archer: 0, chariot: 0, boat: 0 } };
      const words = C.sendConsequence(r, w);
      expect(words.includes('A raid arrives in 12 days: these units will not fight it')).toBe(warned);
      expect(sendRequest(w).ok).toBe(true);                                 // a warning is not a raid under way: they can go
      expect([w.soldiers.length, w.army.away.length, w.army.away[0].back > w.day + 12]).toEqual([2, 2, true]);
    }
  });
});

describe('s46 final court: what a card applies is what it showed (ruling 444)', () => {
  const caravanWorld = () => {
    const w = courtWorld({ open: true });
    const room = roomFor(w, 'pottery');
    w.court.letters.push({ id: 50, kind: 'card', card: 'caravan', day: w.day, read: false, args: { good: 'pottery', units: room, price: 2 } });
    return { w, room };
  };
  it('refuses with changed when the room fell since the letter was drawn on screen, doing nothing; with the same numbers it buys', () => {
    const { w, room } = caravanWorld();
    const shown = cardChoices(w, w.court.letters[0])[0].effects;
    const store = allBuildings(w).find((b) => b.type === 'storehouse');
    store.store.pottery += 30;                                                  // the city changes while the letter is open
    const gold = w.gold, pottery = stockOf(w, 'pottery');
    const res = answerCard(w, 50, 'buy', [], undefined, shown);
    expect([res.ok, res.reason, w.gold, stockOf(w, 'pottery'), w.court.letters.length]).toEqual([false, 'changed', gold, pottery, 1]);
    const now = cardChoices(w, w.court.letters[0])[0].effects;
    expect(now.find((e) => e.kind === 'goods').n).toBe(room - 30);
    const ok = answerCard(w, 50, 'buy', [], undefined, now);
    expect([ok.ok, w.gold, stockOf(w, 'pottery')]).toEqual([true, gold - (room - 30) * 2, pottery + room - 30]);
  });
  it('on the shell: a tap after the city changed buys nothing, says the numbers changed and shows the new ones, with the room said in the body', async () => {
    const { w, room } = caravanWorld();
    w.court.request = null;
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'letter'));
      const body = () => r.root.querySelector('#sheet .letter-body').textContent;
      expect(body().includes('have room for')).toBe(false);                    // the caravan fits: no room line
      allBuildings(w).find((b) => b.type === 'storehouse').store.pottery += 30;   // no rebuild: as when focus is inside the sheet
      const gold = w.gold;
      fire(r.root.querySelector('#sheet .court-choice.buy button'), 'click');
      expect([w.gold, w.court.letters.length]).toEqual([gold, 1]);
      expect(r.ui.celebrations.recent().some((c) => c.text === C.captionChanged)).toBe(true);
      expect(body()).toContain(`The stores have room for ${room - 30}.`);
      expect(r.root.querySelector('#sheet .court-choice.buy').textContent).toContain(`${room - 30} pottery arrive in the stores`);
      fire(r.root.querySelector('#sheet .court-choice.buy button'), 'click');
      expect([w.court.letters.length, w.court.cards[0].choice, roomFor(w, 'pottery')]).toEqual([0, 'buy', 0]);   // bought what it showed: the stores are full (a first may pay gold)
    } finally { r.cleanup(); }
  });
  it('words the deserters\' body from the room in homes when it is less than their number, and not when it is not', () => {
    const letter = { card: 'deserters', args: { n: 12 } };
    expect(C.cardBody(letter, { room: 5 })).toBe("12 soldiers who left the capital's army ask to settle in Thebes. The homes have room for 5.");
    expect(C.cardBody(letter, { room: 12 })).toBe("12 soldiers who left the capital's army ask to settle in Thebes.");
  });
});

describe('s46 final court: the River hooks are asked afresh (ruling 445)', () => {
  it('turns the flood omen off the moment a Nilometer is built, the same day', () => {
    const w = courtWorld({ open: true });
    w.day = YEAR + 5;                                                           // year 2, month 1: before the flood months
    expect(RIVER_HOOKS.canForecast(w)).toBe(true);
    addRaw(w, 'nilometer', 30, 11, { staff: BUILDINGS.nilometer.workers });
    expect(RIVER_HOOKS.canForecast(w)).toBe(false);
  });
  it('drops a flood omen letter that can no longer happen, and a lost herd only when no herd can come or go', () => {
    const w = courtWorld({ open: true });
    w.court.nextRequestDay = w.court.nextCardDay = null;
    w.court.letters.push({ id: 60, kind: 'card', card: 'flood_omen', day: w.day, read: false, args: {} }, { id: 61, kind: 'card', card: 'lost_herd', day: w.day, read: false, args: {} });
    const hooks = (arrive, leave, forecast) => ({ canArrive: () => arrive, canLeave: () => leave, canForecast: () => forecast });
    courtDay(w, [], hooks(false, true, true));
    expect(w.court.letters.map((l) => l.id)).toEqual([60, 61]);
    const events = [];
    courtDay(w, events, hooks(false, false, false));
    expect([w.court.letters.length, events.map((e) => e.card)]).toEqual([0, ['flood_omen', 'lost_herd']]);
  });
  it('leaves the world as it was when asked, and a headless run matches one where the interface asks before every day', () => {
    const make = () => {
      const w = courtWorld({ open: true, seed: 7 });
      w.court.guided = 'answered';
      w.court.nextCardDay = w.day + 3;
      w.wildlife.herds.push({ id: w.wildlife.nextId++, kind: 'gazelle', x: 30, y: 30, size: 6, max: 6, regrow: null, hx: 30, hy: 30, px: 30, py: 30, moved: 0, hunted: 0, dir: 1 });
      return w;
    };
    const quiet = make(), asked = make();
    const snap = JSON.stringify(asked);
    RIVER_HOOKS.canArrive(asked); RIVER_HOOKS.canLeave(asked); RIVER_HOOKS.canForecast(asked);
    expect(JSON.stringify(asked)).toBe(snap);
    for (let d = 0; d < 200; d++) {
      eligibleCards(asked);
      for (const l of asked.court.letters) if (l.kind === 'card') cardChoices(asked, l);
      tickDay(quiet, []);
      tickDay(asked, []);
    }
    expect(JSON.stringify(asked)).toBe(JSON.stringify(quiet));
  });
  it('draws the dispute\'s workshop with its own salt, not the card pick\'s', () => {
    const w = courtWorld({ open: true, seed: 3 });
    addRaw(w, 'potter', 22, 11, { staff: BUILDINGS.potter.workers });
    addRaw(w, 'potter', 25, 11, { staff: BUILDINGS.potter.workers });
    const shops = allBuildings(w).filter((b) => BUILDINGS[b.type].consumes && BUILDINGS[b.type].produces);
    const id = w.court.nextId;
    const want = shops[Math.floor(hash2(id, w.day, (w.seed + COURT_SALT.spare1) | 0) * shops.length)].id;
    const got = eligibleCards(w).find((e) => e.card === 'craftsmen_dispute');
    expect(got.args.id).toBe(want);
  });
});

describe('s46 final court: an old v7 court record (ruling 446)', () => {
  it('fills a Track-0-only record\'s missing fields and runs its days and months', () => {
    const w = courtWorld();
    w.court = { favour: 50, letters: [], request: null, cards: [], nextRequestDay: null, nextCardDay: null, nextId: 1 };
    w.day = YEAR;
    courtDay(w, []);
    expect([w.court.awake, Array.isArray(w.court.effects), Array.isArray(w.court.log), w.court.nextGiftDay, w.court.lastCard]).toEqual([true, true, true, null, null]);
    w.court = { favour: 50, letters: [], request: null, cards: [], nextRequestDay: null, nextCardDay: null, nextId: 1, awake: true, guided: 'answered' };
    courtMonth(w, []);
    for (let d = 0; d < 3 * MONTH; d++) { courtDay(w, []); w.day += 1; }
    expect([Array.isArray(w.court.effects), Array.isArray(w.court.log)]).toEqual([true, true]);
  });
});

describe('s46 final court: a letter that closes while it is on show (ruling 447)', () => {
  it('says the letter is closed when its deadline passes with the sheet open, with only the court and Close, and swaps nothing in', async () => {
    const w = courtWorld({ open: true });
    w.court.nextRequestDay = w.court.nextCardDay = null;
    const id = w.court.nextId++;
    w.court.guided = 'answered';
    w.court.request = { id, kind: 'gold', good: null, amount: 100, day: w.day, due: w.day + 2, gold: 30, met: 10, missed: 12, guided: false };
    w.court.letters.push({ id, kind: 'request', day: w.day, read: false });
    w.court.letters.push({ id: 70, kind: 'card', card: 'festival', day: w.day, read: false, args: {} });
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'letter'));
      const sheet = () => r.root.querySelector('#sheet');
      expect(sheet().textContent).toContain('Send 100 gold');                  // before the deadline: the request
      w.day += 1; courtDay(w, []); r.ui.refresh();
      expect(sheet().textContent).toContain('Send 100 gold');
      w.day += 1; courtDay(w, []); r.ui.refresh();                            // the deadline passes
      expect(sheet().querySelector('.letter-closed').textContent).toBe('This letter is closed: its deadline passed.');
      expect(sheet().querySelector('.letter')).toBe(null);                     // the festival card is not swapped in
      expect([...sheet().querySelectorAll('.letter-foot button')].map((b) => b.className.split(' ')[0])).toEqual(['open-court', 'close-letter']);
      fire(sheet().querySelector('.close-letter'), 'click');
      expect(r.store.get().sheet === null || r.store.get().sheet.kind !== 'letter').toBe(true);
      r.store.set(openSheet(r.store.get(), 'letter'));                         // opened again: the waiting card
      expect(sheet().querySelector('.letter').getAttribute('data-letter')).toBe('70');
      expect(C.letterClosed('card')).toBe('This letter is closed: it is no longer needed.');
    } finally { r.cleanup(); }
  });
});

describe('s46 final court: food requests size a lodge and a wharf as they make food (ruling 448)', () => {
  it('counts a lodge by the game its herds can give this month, not its ceiling, and none with no herd', () => {
    const w = courtWorld({ open: true });
    const lodge = addRaw(w, 'hunting_lodge', 26, 11, { staff: BUILDINGS.hunting_lodge.workers });
    expect(outputPerMonth(w, 'game')).toBe(0);
    w.wildlife.herds.push({ id: w.wildlife.nextId++, kind: 'gazelle', x: 28, y: 14, size: 4, max: 6, regrow: null, hx: 28, hy: 14, px: 28, py: 14, moved: 0, hunted: 0, dir: 1 });
    // Read the herd's month from the hunting rule itself (ruling 460 changed it), never a typed number.
    const month = huntingOutlook(w, lodge).month;
    expect(month > 0).toBe(true);
    expect(outputPerMonth(w, 'game')).toBe(month);
    expect(outputPerMonth(w, 'game') < HUNTING.maxMonth).toBe(true);
    lodge.staff = 1;
    expect(outputPerMonth(w, 'game')).toBe(month * 1 / BUILDINGS.hunting_lodge.workers);
  });
  it('counts a wharf\'s flood-month catch while the water is up, and its usual catch otherwise', () => {
    const w = courtWorld({ open: true });
    addRaw(w, 'fishing_wharf', 26, 12, { staff: BUILDINGS.fishing_wharf.workers });
    w.flood.risen = false;
    expect(outputPerMonth(w, 'fish')).toBe(FISHING.perMonth);
    Object.assign(w.flood, { risen: true, from: w.day - 5, to: w.day + 50 });
    expect(outputPerMonth(w, 'fish')).toBe(FISHING.floodPerMonth);
  });
});

describe('s46 final court: boats whose bank was built on (ruling 449)', () => {
  const EAST = { x: 31, y: 16 };
  // The Armies track's boat city (tests/stage46/armies/raids.test.js): a river from the north edge to the south at x = 20, a granary near it.
  const riverCity = () => {
    const w = makeTestWorld({ gold: 1000, raiderEntries: [EAST] });
    for (let y = 0; y < w.size; y++) w.terrain[idx(w.size, 20, y)] = TERRAIN.WATER;
    setRoad(w, 0, 13, 19, 13);
    w.milestone = 'market_town';
    addRaw(w, 'storehouse', 6, 15);
    const granary = addRaw(w, 'granary', 16, 15);
    w.raid.clockDay = 0;
    w.raid.index = 4;
    w.raid.nextWarnDay = w.day = 1000;
    raidDay(w, []);
    const wn = w.raid.warning;
    expect([wn.mix.boat > 0, Boolean(wn.second && wn.second.boat)]).toEqual([true, true]);
    return { w, granary };
  };
  it('lands on a new bank with its own mouth and edge when one is left', () => {
    const { w } = riverCity();
    const wn = w.raid.warning;
    w.wall[idx(w.size, wn.second.entry.x, wn.second.entry.y)] = 1;            // the bank is walled since the warning
    const again = boatLanding(w, wn.index);
    expect(again !== null).toBe(true);
    w.day = wn.arrives;
    raidDay(w, []);
    expect([w.raid.warning, wn.second.entry, wn.second.dir, wn.second.from]).toEqual([null, again.bank, again.dir, again.from]);
    expect(w.raid.active.second.entry).toEqual(again.bank);
  });
  it('folds the boats into the land band on foot when no bank is left', () => {
    const { w, granary } = riverCity();
    const wn = w.raid.warning;
    const boats = wn.mix.boat, foot = wn.mix.foot;
    w.wall[idx(w.size, wn.second.entry.x, wn.second.entry.y)] = 1;
    removeBuilding(w, granary.id);                                             // no building near the river: no bank anywhere
    expect(boatLanding(w, wn.index)).toBe(null);
    w.day = wn.arrives;
    raidDay(w, []);
    const a = w.raid.active;
    expect([Boolean(a.second), a.raiders.length, a.raiders.some((u) => u.kind === 'boat' || u.band === 1), a.mix.boat, a.mix.foot]).toEqual([false, wn.size, false, 0, foot + boats]);
  });
});
