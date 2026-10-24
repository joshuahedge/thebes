// Version 7.1, fix batch A (rulings 1060-1066), the events' sim half: a paid choice is refused once what it protects is gone (every one set up both ways), the outcome record
// applyChoice returns is the city_event (a fever pushes illnesses first), and a pause the player makes during a strike or quarrel outlives the event.
import { describe, it, expect } from '../../harness.js';
import { eventWorld, offer, idsOf, YEAR } from '../../v70/e/helpers.js';
import { eventChoices, applyChoice, eventDay } from '../../../src/sim/cityEvents.js';
import { setPaused, eventHoldUntil } from '../../../src/sim/commands.js';
import { courtDay } from '../../../src/sim/court.js';
import { allBuildings } from '../../../src/sim/world.js';
import { fallIll } from '../../../src/sim/health.js';

const city = (kind, o = {}) => { const w = eventWorld({ gold: 100000, ill: 3, ...o }); w.day = 3 * YEAR; w.speed = 0; offer(w, kind); return w; };
const choiceOf = (w, id) => eventChoices(w, w.cityEvents.waiting).find((c) => c.id === id);
const empty = (w, good) => { for (const b of allBuildings(w)) if (b.store && b.store[good]) delete b.store[good]; };

// What each paid choice protects, how the test takes it away, and the paid choice's id.
const CASES = [
  ['quarry_strike', 'raise_wages', (w) => { for (const id of idsOf(w, 'quarry')) w.buildings[id].paused = true; }],
  ['workshop_quarrel', 'settle_it', (w) => { for (const id of w.cityEvents.waiting.figs.ids) w.buildings[id].paused = true; }],
  ['fever', 'gate', (w) => { for (const id of w.cityEvents.waiting.figs.ids) fallIll(w, id); }],
  ['thief', 'watch', (w) => { const f = w.cityEvents.waiting.figs; delete w.buildings[f.store].store[f.good]; }],
  ['sandstorm', 'sweep', (w) => empty(w, w.cityEvents.waiting.figs.good)],
  ['lost_caravan', 'search', (w) => empty(w, w.cityEvents.waiting.figs.good)],
];

describe('v71 fa events: a paid choice that spares nothing is refused (ruling 1061)', () => {
  for (const [kind, paid, takeAway] of CASES) {
    it(`${kind}: ${paid} is on offer while there is something to spare, and refused with 'none', not charged, once there is not`, () => {
      const w = city(kind);
      expect([kind, choiceOf(w, paid).ok, choiceOf(w, paid).reason]).toEqual([kind, true, null]);
      takeAway(w);
      const c = choiceOf(w, paid);
      expect([kind, c.ok, c.reason]).toEqual([kind, false, 'none']);
      const free = eventChoices(w, w.cityEvents.waiting).find((x) => x.default);
      expect([kind, free.ok]).toEqual([kind, true]);                                   // the free choice is untouched
      const gold = w.gold;
      const res = applyChoice(w, w.cityEvents.waiting, paid, null, c.effects);
      expect([kind, res.ok, res.reason, w.gold]).toEqual([kind, false, 'none', gold]);
      expect(w.cityEvents.waiting !== null).toBe(true);                                   // nothing was taken, the event still waits
    });
  }

  it('a refusal for nothing to spare is named before one for no gold, so the card never says "not enough gold" for a choice that is no use anyway', () => {
    const w = city('quarry_strike');
    for (const id of idsOf(w, 'quarry')) w.buildings[id].paused = true;
    w.gold = 0;
    expect(choiceOf(w, 'raise_wages').reason).toBe('none');
  });

  it('a sandstorm\'s sweep is also refused when so little is left that the weather would take no more than the sweep (it would spare none)', () => {
    const w = city('sandstorm');
    const f = w.cityEvents.waiting.figs;
    expect(f.saved > 0).toBe(true);
    empty(w, f.good);
    const house = allBuildings(w).find((b) => b.type === 'storehouse');
    house.store[f.good] = f.n - f.saved;                                               // what the sweep would lose anyway: nothing is spared
    expect(choiceOf(w, 'sweep').reason).toBe('none');
    house.store[f.good] = f.n;                            // the stock the offer saw: the sweep spares `saved`
    expect(choiceOf(w, 'sweep').ok).toBe(true);
  });
});

describe('v71 fa events: applyChoice names the outcome', () => {
  it('returns the city_event record, not the first thing pushed: a fever let in pushes illnesses first', () => {
    const w = city('fever');
    const events = [];
    const res = applyChoice(w, w.cityEvents.waiting, 'let_in', events, choiceOf(w, 'let_in').effects);
    expect(res.ok).toBe(true);
    expect(events[0].type !== 'city_event').toBe(true);                                   // the illnesses came first: events[0] was never the outcome
    expect([res.event.type, res.event.kind, res.event.choice, res.event.result]).toEqual(['city_event', 'fever', 'let_in', 'answered']);
    expect(events.includes(res.event)).toBe(true);
  });
});

describe('v71 fa events: the player\'s own pause outlives a strike or quarrel (ruling 1062, ruling 423)', () => {
  function struck(kind = 'workshop_quarrel') {
    const w = city(kind);
    const ids = w.cityEvents.waiting.figs.ids.slice();
    w.day = w.cityEvents.waiting.due;
    eventDay(w);                                                                       // no answer: the default, the buildings are held
    const entry = w.court.effects.find((e) => e.event === true);
    return { w, ids, until: entry.until };
  }

  it('a pause the player makes during the hold is still there when the event\'s days end, and still not resumable until then', () => {
    const { w, ids, until } = struck();
    expect(ids.every((id) => w.buildings[id].paused)).toBe(true);
    expect(setPaused(w, ids[0], true).ok).toBe(true);                                  // the player pauses what is already stopped
    expect(eventHoldUntil(w, ids[0])).toBe(until);                                     // the hold still counts: Resume is still refused until the day
    expect(setPaused(w, ids[0], false).reason).toBe('event_hold');
    while (w.day <= until + 1) { eventDay(w); w.day += 1; }
    expect(w.buildings[ids[0]].paused).toBe(true);                                     // his own pause stays
    for (const id of ids.slice(1)) expect([id, w.buildings[id].paused]).toEqual([id, false]);   // the ones he did not touch are let go
    expect([eventHoldUntil(w, ids[0]), setPaused(w, ids[0], false).ok]).toEqual([null, true]);
  });

  it('the court\'s own end of effects (an awake court lets go of its list) leaves it paused too', () => {
    const { w, ids, until } = struck();
    expect(w.court.awake).toBe(true);
    setPaused(w, ids[0], true);
    w.day = until;
    courtDay(w);
    expect(w.buildings[ids[0]].paused).toBe(true);
  });

  it('a pause he did not make is still let go when the days end (the strike without his hand)', () => {
    const { w, ids, until } = struck('quarry_strike');
    while (w.day <= until + 1) { eventDay(w); w.day += 1; }
    expect(ids.every((id) => !w.buildings[id].paused)).toBe(true);
  });
});
