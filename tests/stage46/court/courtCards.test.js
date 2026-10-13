// The Court track's card tests (ruling 338): when a card comes, what each of the eight does, and that a choice's list of effects is
// both what it is worded from and what it does.
import { describe, it, expect } from '../../harness.js';
import { allBuildings, housesOf } from '../../../src/sim/world.js';
import { addRaw } from '../../helpers/testWorld.js';
import { COURT_CARDS, COURT_CARD_IDS, CARDS, CARD_NUMBERS, FAVOUR } from '../../../src/data/court.js';
import { FESTIVAL } from '../../../src/data/raids.js';
import { HEALTH } from '../../../src/data/health.js';
import {
  courtDay, courtMonth, eligibleCards, cardChoices, answerCard, applyEffects, effectProblem, cardStale, stockOf, letterOf, roomFor,
} from '../../../src/sim/court.js';
import { festivalMood, festivalStatus } from '../../../src/sim/festival.js';
import { festivalCostOf } from '../../../src/sim/costs.js';
import { fallIll, illHomes } from '../../../src/sim/health.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { courtWorld, MONTH, YEAR } from './courtHelpers.js';

const NO_HOOKS = { canArrive: () => false, canLeave: () => false, canForecast: () => false };
const ALL_HOOKS = { canArrive: () => true, canLeave: () => true, canForecast: () => true };

// Pushes a card letter built the way the court draws it (its args from the state), and returns it.
function letterFor(w, card, hooks = ALL_HOOKS) {
  const found = eligibleCards(w, hooks).find((e) => e.card === card);
  if (!found) return null;
  const letter = { id: w.court.nextId++, kind: 'card', card, day: w.day, read: false, args: found.args };
  w.court.letters.push(letter);
  return letter;
}
const choiceOf = (w, letter, id, hooks = ALL_HOOKS) => cardChoices(w, letter, hooks).find((c) => c.id === id);
const ready = (opts) => { const w = courtWorld({ ...opts, open: true }); w.court.guided = 'answered'; return w; };
const sicken = (w, n = 3) => { for (const h of housesOf(w).slice(0, n)) fallIll(w, h.id); };

describe('s46 court cards: the set', () => {
  it('has at least eight cards, each with two choices, and only the sickness a threat', () => {
    expect(COURT_CARDS.length).toBeGreaterThanOrEqual(8);
    expect(COURT_CARD_IDS).toEqual(['sickness', 'festival', 'caravan', 'deserters', 'temple_gift', 'lost_herd', 'craftsmen_dispute', 'flood_omen']);
    for (const c of COURT_CARDS) expect([c.id, c.choices.length]).toEqual([c.id, 2]);
    expect(COURT_CARDS.filter((c) => c.threat).map((c) => c.id)).toEqual(['sickness']);
  });
});

describe('s46 court cards: when they come', () => {
  it('comes every 12-18 months, and never twice in a row while another can come', () => {
    const w = ready({ seed: 4 });
    expect(w.court.nextCardDay - YEAR >= 12 * MONTH && w.court.nextCardDay - YEAR <= 18 * MONTH).toBe(true);
    const seen = [];
    for (let i = 0; i < 6; i++) {
      w.day = w.court.nextCardDay;
      courtDay(w);
      const l = w.court.letters.filter((x) => x.kind === 'card').pop();
      seen.push(l.card);
      expect(w.court.nextCardDay - w.day >= 12 * MONTH && w.court.nextCardDay - w.day <= 18 * MONTH).toBe(true);
      answerCard(w, l.id, cardChoices(w, l, NO_HOOKS).find((c) => !c.problem).id, null, NO_HOOKS);
      w.gold = 4000;
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i] === seen[i - 1]).toBe(false);
    expect(new Set(seen).size).toBeGreaterThan(2);
  });
  it('waits while a raid is under way and while another card waits to be answered', () => {
    const w = ready({ seed: 4 });
    w.raid.active = { size: 4 };
    w.day = w.court.nextCardDay;
    courtDay(w);
    expect([w.court.letters.some((l) => l.kind === 'card'), w.court.nextCardDay]).toEqual([false, w.day + CARDS.raidRetryDays]);
    w.raid.active = null;
    w.day = w.court.nextCardDay;
    courtDay(w);
    expect(w.court.letters.filter((l) => l.kind === 'card').length).toBe(1);
    w.day = w.court.nextCardDay;
    courtDay(w);
    expect(w.court.letters.filter((l) => l.kind === 'card').length).toBe(1);
    expect(w.court.nextCardDay).toBe(w.day + CARDS.retryDays);
  });
  it('is the same card for the same city and day, and draws only what can happen', () => {
    const a = ready({ seed: 9 }), b = ready({ seed: 9 });
    a.day = a.court.nextCardDay; b.day = b.court.nextCardDay;
    courtDay(a); courtDay(b);
    expect(a.court.letters).toEqual(b.court.letters);
    expect(a.court.letters.filter((l) => l.kind === 'card').every((l) => l.card !== 'lost_herd' && l.card !== 'flood_omen')).toBe(true);
  });
  it('does not draw the lost herd or the flood omen until the River hooks can act, and draws them when they can (both ways)', () => {
    const w = ready();
    const off = eligibleCards(w, NO_HOOKS).map((e) => e.card);
    expect([off.includes('lost_herd'), off.includes('flood_omen')]).toEqual([false, false]);
    const on = eligibleCards(w, ALL_HOOKS).map((e) => e.card);
    expect([on.includes('lost_herd'), on.includes('flood_omen')]).toEqual([true, true]);
    const half = eligibleCards(w, { ...ALL_HOOKS, canLeave: () => false }).map((e) => e.card);
    expect(half.includes('lost_herd')).toBe(false);                            // both choices must be able to happen
    expect(eligibleCards(w).map((e) => e.card).filter((c) => c === 'lost_herd' || c === 'flood_omen')).toEqual([]);   // the stubs say no
  });
  it('is off on Peaceful for the sickness, and the other cards stay', () => {
    const w = ready({ difficulty: 'peaceful' });
    sicken(w);
    expect(illHomes(w).length).toBe(3);
    const cards = eligibleCards(w, NO_HOOKS).map((e) => e.card);
    expect(cards.includes('sickness')).toBe(false);
    expect(cards.includes('caravan')).toBe(true);
    const n = ready({ difficulty: 'normal' });
    sicken(n);
    expect(eligibleCards(n, NO_HOOKS).map((e) => e.card).includes('sickness')).toBe(true);
  });
});

describe('s46 court cards: festival', () => {
  it('offers a festival only from Town and a year after the last, and says it counts as the year\'s festival', () => {
    const w = ready();
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'festival')).toBe(true);
    w.danger.festivalDay = w.day - FESTIVAL.every + 1;
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'festival')).toBe(false);
    w.danger.festivalDay = w.day - FESTIVAL.every;
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'festival')).toBe(true);
    w.milestone = 'village';
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'festival')).toBe(false);
  });
  it('holding it costs the festival price, gives the festival mood for its length and locks the temple\'s next festival', () => {
    const w = ready();
    const l = letterFor(w, 'festival');
    const hold = choiceOf(w, l, 'hold');
    expect(hold.effects).toEqual([{ kind: 'gold', n: -festivalCostOf(w) }, { kind: 'mood', n: FESTIVAL.mood, days: FESTIVAL.days, every: FESTIVAL.every }]);
    const gold = w.gold;
    expect(answerCard(w, l.id, 'hold').ok).toBe(true);
    expect([w.gold, w.danger.festivalDay, w.tally.festivals, festivalMood(w), festivalStatus(w).nextIn, festivalStatus(w).activeFor]).toEqual([gold - festivalCostOf(w), w.day, 1, { festival: FESTIVAL.mood }, FESTIVAL.every, FESTIVAL.days]);
    expect([w.court.letters.length, w.tally.cardsPlayed, w.court.cards[0].choice, w.court.log[0].card]).toEqual([0, 1, 'hold', 'festival']);
  });
  it('declining costs the small favour the card names, and nothing else', () => {
    const w = ready();
    const l = letterFor(w, 'festival');
    const gold = w.gold;
    answerCard(w, l.id, 'decline');
    expect([w.court.favour, w.gold, w.danger.festivalDay]).toEqual([FAVOUR.start - CARD_NUMBERS.festival.declineFavour, gold, null]);
  });
  it('cannot be held without the gold, or after a temple festival has been held since the letter came', () => {
    const w = ready();
    const l = letterFor(w, 'festival');
    w.gold = festivalCostOf(w) - 1;
    expect(choiceOf(w, l, 'hold').problem).toBe('no_gold');
    expect(answerCard(w, l.id, 'hold')).toEqual({ ok: false, reason: 'no_gold' });
    w.gold = 3000;
    w.danger.festivalDay = w.day;
    expect(choiceOf(w, l, 'hold').problem).toBe('too_soon');
    expect(choiceOf(w, l, 'decline').problem).toBe(null);
  });
});

describe('s46 court cards: sickness in a district', () => {
  it('draws the district with the most sick homes and offers quarantine and physicians', () => {
    const w = ready();
    sicken(w, 4);
    const l = letterFor(w, 'sickness');
    expect(l.args).toEqual({ cx: 1, cy: 0 });
    expect(COURT_CARDS[0].choices.map((c) => c.id)).toEqual(['quarantine', 'physicians']);
  });
  it('quarantine closes the district\'s workplaces for a month, spares the safety services, and halves the sick homes\' days left', () => {
    const w = ready();
    sicken(w, 3);
    const l = letterFor(w, 'sickness');
    const potter = allBuildings(w).find((b) => b.type === 'potter');
    const physician = allBuildings(w).find((b) => b.type === 'physician');
    const farm = allBuildings(w).find((b) => b.type === 'farm_grain');
    const left = illHomes(w).map((h) => h.illness.left);
    const q = choiceOf(w, l, 'quarantine');
    expect(q.effects).toEqual([{ kind: 'pause', ids: [potter.id], days: CARD_NUMBERS.sickness.quarantineDays }, { kind: 'faster', ids: illHomes(w).map((h) => h.id), factor: HEALTH.coverFactor }]);
    answerCard(w, l.id, 'quarantine');
    expect([potter.paused, physician.paused, farm.paused]).toEqual([true, false, false]);
    expect(illHomes(w).map((h) => h.illness.left)).toEqual(left.map((n) => Math.max(1, Math.ceil(n / HEALTH.coverFactor))));
    const day = w.day;
    w.day = day + 29;
    courtDay(w);
    expect(potter.paused).toBe(true);
    w.day = day + 30;
    courtDay(w);
    expect([potter.paused, w.court.effects]).toEqual([false, []]);
  });
  it('quarantine leaves a building the player had already paused paused', () => {
    const w = ready();
    sicken(w, 3);
    const potter = allBuildings(w).find((b) => b.type === 'potter');
    potter.paused = true;
    const l = letterFor(w, 'sickness');
    expect(choiceOf(w, l, 'quarantine').problem).toBe('none');                 // nothing left to close: the choice is off, not a silent no-op
    const weaver = addRaw(w, 'weaver', 17, 11);
    weaver.staff = 8;
    expect(choiceOf(w, l, 'quarantine').effects[0].ids).toEqual([weaver.id]);
    answerCard(w, l.id, 'quarantine');
    w.day += 31;
    courtDay(w);
    expect([potter.paused, weaver.paused]).toEqual([true, false]);
  });
  it('physicians cost a fee per sick home (at least the minimum, by difficulty) and cure them at once', () => {
    const w = ready();
    sicken(w, 3);
    const l = letterFor(w, 'sickness');
    const fee = Math.max(CARD_NUMBERS.sickness.feeMin, CARD_NUMBERS.sickness.feePerHome * 3);
    const p = choiceOf(w, l, 'physicians');
    expect(p.effects[0]).toEqual({ kind: 'gold', n: -fee });
    const gold = w.gold;
    answerCard(w, l.id, 'physicians');
    expect([w.gold, illHomes(w).length, w.tally.illnessesCured]).toEqual([gold - fee, 0, 3]);
    const hard = ready({ difficulty: 'hard' });
    sicken(hard, 3);
    expect(choiceOf(hard, letterFor(hard, 'sickness'), 'physicians').effects[0].n).toBe(-Math.max(CARD_NUMBERS.sickness.feeMin, Math.round(CARD_NUMBERS.sickness.feePerHome * 3 * 1.25)));
    const poor = ready();
    sicken(poor, 3);
    const pl = letterFor(poor, 'sickness');
    poor.gold = fee - 1;
    expect([choiceOf(poor, pl, 'physicians').problem, choiceOf(poor, pl, 'quarantine').problem]).toEqual(['no_gold', null]);
  });
  it('goes stale and is dropped when the sickness has passed', () => {
    const w = ready();
    sicken(w, 2);
    const l = letterFor(w, 'sickness');
    expect(cardStale(w, l)).toBe(false);
    for (const h of illHomes(w)) h.illness = null;
    expect(cardStale(w, l)).toBe(true);
    const events = [];
    courtDay(w, events);
    expect([w.court.letters.length, events.some((e) => e.type === 'court_letter_gone' && e.card === 'sickness')]).toEqual([0, true]);
  });
});

describe('s46 court cards: merchant caravan', () => {
  it('offers a rare good at a discount to the city\'s price, in units that fit the stores, and buys exactly that', () => {
    const w = ready({ seed: 6 });
    const l = letterFor(w, 'caravan');
    expect(CARD_NUMBERS.caravan.goods).toContain(l.args.good);
    expect(l.args.units >= 20 && l.args.units <= 40).toBe(true);
    const buy = choiceOf(w, l, 'buy');
    expect(buy.effects).toEqual([{ kind: 'gold', n: -l.args.units * l.args.price }, { kind: 'goods', good: l.args.good, n: l.args.units }]);
    const gold = w.gold, stock = stockOf(w, l.args.good);
    expect(answerCard(w, l.id, 'buy').ok).toBe(true);
    expect([w.gold, stockOf(w, l.args.good)]).toEqual([gold - l.args.units * l.args.price, stock + l.args.units]);
  });
  it('passing changes nothing; buying needs the gold and room in the stores', () => {
    const w = ready({ seed: 6 });
    const l = letterFor(w, 'caravan');
    const gold = w.gold, favour = w.court.favour;
    w.gold = 1;
    expect(choiceOf(w, l, 'buy').problem).toBe('no_gold');
    w.gold = gold;
    for (const b of allBuildings(w)) if (b.type === 'storehouse') b.store = { pottery: 800 };
    expect(roomFor(w, l.args.good)).toBe(0);
    expect(choiceOf(w, l, 'buy').problem).toBe('no_room');
    expect(answerCard(w, l.id, 'pass').ok).toBe(true);
    expect([w.gold, w.court.favour]).toEqual([gold, favour]);
    const full = ready({ seed: 6 });
    for (const b of allBuildings(full)) if (b.type === 'storehouse') b.store = { pottery: 800 };
    expect(eligibleCards(full, NO_HOOKS).some((e) => e.card === 'caravan')).toBe(false);
  });
});

describe('s46 court cards: deserters', () => {
  it('lets a small band settle into homes with room (a favour cost), or drives them off (a favour gain)', () => {
    const w = ready({ seed: 2 });
    for (const h of housesOf(w)) h.residents = 4;                            // room to spare
    const l = letterFor(w, 'deserters');
    const N = CARD_NUMBERS.deserters;
    expect(l.args.n >= N.band[0] && l.args.n <= N.band[1]).toBe(true);
    const settle = choiceOf(w, l, 'settle');
    expect(settle.effects).toEqual([{ kind: 'people', n: l.args.n }, { kind: 'favour', n: N.settleFavour }]);
    const before = housesOf(w).reduce((s, h) => s + h.residents, 0);
    answerCard(w, l.id, 'settle');
    expect([housesOf(w).reduce((s, h) => s + h.residents, 0), w.court.favour]).toEqual([before + l.args.n, FAVOUR.start + N.settleFavour]);
    const v = ready({ seed: 2 });
    for (const h of housesOf(v)) h.residents = 4;
    const m = letterFor(v, 'deserters');
    answerCard(v, m.id, 'drive_off');
    expect([housesOf(v).reduce((s, h) => s + h.residents, 0), v.court.favour]).toEqual([24, FAVOUR.start + N.driveFavour]);
  });
  it('is not drawn when there is no room for a band, and settles only as many as fit if the room shrinks', () => {
    const w = ready({ seed: 2 });
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'deserters')).toBe(false);   // every home is full
    const v = ready({ seed: 2 });
    for (const h of housesOf(v)) h.residents = 10;                                       // 2 free in each of six homes
    const l = letterFor(v, 'deserters');
    for (const h of housesOf(v)) h.residents = 12;
    housesOf(v)[0].residents = 10;
    expect(choiceOf(v, l, 'settle').effects[0]).toEqual({ kind: 'people', n: 2 });
    for (const h of housesOf(v)) h.residents = 12;
    expect(choiceOf(v, l, 'settle').problem).toBe('no_room');
  });
});

describe('s46 court cards: temple gift', () => {
  it('donates a quarter of the most-held good for favour, or keeps it', () => {
    const w = ready();
    const l = letterFor(w, 'temple_gift');
    expect(l.args).toEqual({ good: 'grain', n: 150 });
    const gift = choiceOf(w, l, 'donate');
    expect(gift.effects).toEqual([{ kind: 'goods', good: 'grain', n: -150 }, { kind: 'favour', n: CARD_NUMBERS.temple_gift.donateFavour }]);
    answerCard(w, l.id, 'donate');
    expect([stockOf(w, 'grain'), w.court.favour]).toEqual([450, FAVOUR.start + CARD_NUMBERS.temple_gift.donateFavour]);
    const v = ready();
    const m = letterFor(v, 'temple_gift');
    answerCard(v, m.id, 'keep');
    expect([stockOf(v, 'grain'), v.court.favour]).toEqual([600, FAVOUR.start]);
  });
  it('is not drawn for a city with little in store, and cannot donate what has since gone', () => {
    const w = ready();
    for (const b of allBuildings(w)) b.store = { grain: 30 };
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'temple_gift')).toBe(false);
    const v = ready();
    const l = letterFor(v, 'temple_gift');
    for (const b of allBuildings(v)) b.store = { grain: 100 };
    expect(choiceOf(v, l, 'donate').problem).toBe('short');
  });
});

describe('s46 court cards: the River hooks', () => {
  it('a choice that needs a hook is off when the hook cannot act, and fails without charging if the hook then does nothing', () => {
    const w = ready();
    const herd = letterFor(w, 'lost_herd', ALL_HOOKS);
    expect([choiceOf(w, herd, 'welcome', NO_HOOKS).problem, choiceOf(w, herd, 'send_away', NO_HOOKS).problem]).toEqual(['unavailable', 'unavailable']);
    expect(choiceOf(w, herd, 'welcome').effects).toEqual([{ kind: 'herd', how: 'arrive' }]);
    expect(choiceOf(w, herd, 'send_away').effects).toEqual([{ kind: 'herd', how: 'leave' }, { kind: 'favour', n: CARD_NUMBERS.lost_herd.sendFavour }]);
    const favour = w.court.favour;
    expect(answerCard(w, herd.id, 'send_away', null, ALL_HOOKS)).toEqual({ ok: false, reason: 'unavailable' });   // the stub hook does nothing: no favour is given
    expect(w.court.favour).toBe(favour);
    expect(w.court.letters.some((l) => l.id === herd.id)).toBe(true);
    const omen = letterFor(w, 'flood_omen', ALL_HOOKS);
    const gold = w.gold;
    expect(choiceOf(w, omen, 'pay_priests').effects).toEqual([{ kind: 'forecast' }, { kind: 'gold', n: -CARD_NUMBERS.flood_omen.price }]);
    expect(answerCard(w, omen.id, 'pay_priests', null, ALL_HOOKS)).toEqual({ ok: false, reason: 'unavailable' });
    expect(w.gold).toBe(gold);
    expect(answerCard(w, omen.id, 'pass', null, ALL_HOOKS).ok).toBe(true);
  });
  it('prices the priests by the difficulty', () => {
    const w = ready({ difficulty: 'hard' });
    const omen = letterFor(w, 'flood_omen');
    expect(choiceOf(w, omen, 'pay_priests').effects[1].n).toBe(-Math.round(CARD_NUMBERS.flood_omen.price * 1.25));
  });
});

describe('s46 court cards: craftsmen\'s dispute', () => {
  it('raising wages costs a tenth of last month\'s wages (at least the minimum) every month for a year, then stops', () => {
    const w = ready();
    const l = letterFor(w, 'craftsmen_dispute');
    const N = CARD_NUMBERS.craftsmen_dispute;
    const perMonth = Math.max(N.raiseMin, Math.round(N.raiseShare * monthFigures(w).wages));
    expect(choiceOf(w, l, 'raise_wages').effects).toEqual([{ kind: 'wages', perMonth, months: N.raiseMonths }]);
    answerCard(w, l.id, 'raise_wages');
    const gold = w.gold;
    for (let m = 0; m < N.raiseMonths; m++) { w.day += MONTH; courtMonth(w); }
    expect(w.gold).toBe(gold - perMonth * N.raiseMonths);
    expect(w.court.effects).toEqual([]);
    w.day += MONTH;
    courtMonth(w);
    expect(w.gold).toBe(gold - perMonth * N.raiseMonths);
  });
  it('letting it stand stops the named workshop for a month, then it works again', () => {
    const w = ready();
    const l = letterFor(w, 'craftsmen_dispute');
    const shop = w.buildings[l.args.id];
    expect(shop.type).toBe('potter');
    answerCard(w, l.id, 'let_it_stand');
    expect(shop.paused).toBe(true);
    w.day += CARD_NUMBERS.craftsmen_dispute.strikeDays;
    courtDay(w);
    expect(shop.paused).toBe(false);
  });
  it('is not drawn without a working workshop, and drops when its workshop is gone', () => {
    const w = ready();
    for (const b of allBuildings(w)) if (b.type === 'potter') b.staff = 0;
    expect(eligibleCards(w, NO_HOOKS).some((e) => e.card === 'craftsmen_dispute')).toBe(false);
    const v = ready();
    const l = letterFor(v, 'craftsmen_dispute');
    delete v.buildings[l.args.id];
    expect(cardStale(v, l)).toBe(true);
  });
});

describe('s46 court cards: effects are what they say', () => {
  it('carries out each effect kind as listed, and nothing when the list is empty', () => {
    const w = ready();
    const gold = w.gold;
    expect(applyEffects(w, [{ kind: 'gold', n: -25 }, { kind: 'favour', n: 7 }, { kind: 'goods', good: 'grain', n: -10 }])).toEqual({ ok: true, reason: null });
    expect([w.gold, w.court.favour, stockOf(w, 'grain')]).toEqual([gold - 25, 57, 590]);
    applyEffects(w, []);
    expect([w.gold, w.court.favour]).toEqual([gold - 25, 57]);
    expect([effectProblem(w, { kind: 'gold', n: -999999 }), effectProblem(w, { kind: 'goods', good: 'gems', n: -41 }), effectProblem(w, { kind: 'goods', good: 'gems', n: -40 })]).toEqual(['no_gold', 'short', null]);
  });
  it('finds a letter by its id', () => {
    const w = ready();
    const l = letterFor(w, 'festival');
    expect(letterOf(w, l.id)).toBe(l);
    expect(letterOf(w, 999)).toBe(null);
  });
});
