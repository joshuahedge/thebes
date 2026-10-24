// Version 7.0, wave 3 (the final review's fixes, Batch 2: sim truths and words). A strike or quarrel holds for the days its card says (ruling 987): the free Resume is
// refused with its reason on the sheet, while a court card's hold keeps ruling 423; Opet offers the full festival only when incense can reach the city (ruling 988);
// and the small words of the Placing and Keyboard help are built from the sim's and the keys' own data.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { eventWorld, offer, storehouseOf, idsOf, YEAR } from './helpers.js';
import { eventDay, eventChoices, incenseReaches } from '../../../src/sim/cityEvents.js';
import { setPaused, eventHoldUntil } from '../../../src/sim/commands.js';
import { select } from '../../../src/ui/modes.js';
import { CITY_EVENT_TEXT as C, reasonText, P_TEXT, V70_HELP, HELP_ROWS } from '../../../src/ui/text.js';
import { KEYS } from '../../../src/data/ui.js';
import { INCENSE_GOOD } from '../../../src/data/trade.js';

const fresh = (kind, o = {}) => { const w = eventWorld({ gold: 5000, ...o }); w.day = 3 * YEAR; w.speed = 0; offer(w, kind); return w; };
const rigs = [];
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
// The waiting quarrel or strike let run to its default: the buildings are held. Returns the world and the held ids.
function held(kind, o = {}) {
  const w = fresh(kind, o);
  const ids = w.cityEvents.waiting.figs.ids.slice();
  w.day = w.cityEvents.waiting.due;
  eventDay(w);
  return { w, ids };
}

describe('v70 e review: a strike or quarrel holds for its days (ruling 987)', () => {
  it('refuses the free Resume while the hold lasts and leaves the building paused; after the days it works again', () => {
    const { w, ids } = held('workshop_quarrel');
    const until = w.court.effects.find((e) => e.event === true).until;
    expect(ids.length > 0 && ids.every((id) => w.buildings[id].paused)).toBe(true);
    expect([eventHoldUntil(w, ids[0]), eventHoldUntil(w, 999999)]).toEqual([until, null]);
    const r = setPaused(w, ids[0], false);
    expect([r.ok, r.reason, r.until]).toEqual([false, 'event_hold', until]);
    expect(w.buildings[ids[0]].paused).toBe(true);
    expect(eventHoldUntil(w, ids[0])).toBe(until);                              // the refusal let nothing go
    w.day = until - 1;
    expect(setPaused(w, ids[0], false).reason).toBe('event_hold');             // the last day still holds
    w.day = until;
    expect(setPaused(w, ids[0], false).ok).toBe(true);                         // the days are up (the tick has not run yet): it works
    expect([w.buildings[ids[0]].paused, eventHoldUntil(w, ids[0])]).toEqual([false, null]);
  });

  it('the strike holds the quarries the same way, and paying it off holds nothing', () => {
    const { w, ids } = held('quarry_strike', { milestone: 'city' });
    expect(ids).toEqual(idsOf(w, 'quarry'));
    expect(setPaused(w, ids[0], false).reason).toBe('event_hold');
    const p = fresh('quarry_strike', { milestone: 'city' });
    expect(eventChoices(p, p.cityEvents.waiting).find((c) => c.id === 'raise_wages').ok).toBe(true);
    expect(p.court.effects.length).toBe(0);
    expect(setPaused(p, idsOf(p, 'quarry')[0], true).ok).toBe(true);           // an ordinary pause and resume are the player's
    expect(setPaused(p, idsOf(p, 'quarry')[0], false).ok).toBe(true);
  });

  it('a court card\'s strike and a scare\'s pause still resume (ruling 423): the effect lets go of the building', () => {
    const w = eventWorld();
    const quarry = idsOf(w, 'quarry')[0];
    w.buildings[quarry].paused = true;
    w.court.effects.push({ kind: 'pause', ids: [quarry], until: w.day + 60 });          // a court card's pause: no event flag
    expect(eventHoldUntil(w, quarry)).toBe(null);
    expect(setPaused(w, quarry, false).ok).toBe(true);
    expect([w.buildings[quarry].paused, w.court.effects[0].ids]).toEqual([false, []]);
  });

  test('the building sheet disables Resume with the reason and the day under it; the sheet of an ordinary pause is untouched', async () => {
    const { w, ids } = held('workshop_quarrel');
    const until = w.court.effects.find((e) => e.event === true).until;
    const r = await rigUI({ world: w });
    rigs.push(r);
    r.store.set(select(r.store.get(), ids[0]));
    r.ui.refresh();
    const pause = () => r.root.querySelector('#sheet .actions .pause');
    expect([pause().textContent, pause().disabled]).toEqual(['Resume', true]);
    const why = r.root.querySelector('#sheet .event-hold');
    const type = w.buildings[ids[0]].type;
    expect(why.textContent).toBe(`${C.hold(until, type)}.`);
    expect(/^Stopped by a quarrel until year \d+, month \d+; work starts again by itself\.$/.test(why.textContent)).toBe(true);   // (7.1, ruling 1063: no choice is left to make by then)
    expect(pause().getAttribute('aria-describedby')).toBe(why.id);
    expect(reasonText('event_hold')).toBe('Held until the event ends; work starts again by itself');
    // the hold over: Resume is on and the line is gone
    w.day = until;
    r.ui.refresh();
    expect([pause().disabled, r.root.querySelector('#sheet .event-hold')]).toEqual([false, null]);
    // a plain pause by the player: no reason line
    setPaused(w, ids[0], false);
    setPaused(w, ids[0], true);
    r.ui.refresh();
    expect([pause().textContent, pause().disabled, r.root.querySelector('#sheet .event-hold')]).toEqual(['Resume', false, null]);
  });

  it('words a quarry\'s strike as a strike', () => {
    expect(C.hold(90, 'quarry')).toBe('On strike until year 1, month 4; work starts again by itself');
    expect(C.hold(90, 'potter')).toBe('Stopped by a quarrel until year 1, month 4; work starts again by itself');
  });
});

describe('v70 e review: Opet offers the full festival only when incense can reach the city (ruling 988)', () => {
  const ids = (w) => eventChoices(w, w.cityEvents.waiting).map((c) => c.id);

  it('at Town with no Punt route and no incense stored there is no full festival, and the card says why; with Punt open, or a store holding incense, it is offered', () => {
    const w = fresh('opet', { milestone: 'town' });
    expect(incenseReaches(w)).toBe(false);
    expect(ids(w)).toEqual(['small', 'decline']);
    expect(C.body(w.cityEvents.waiting, w)).toContain('No incense reaches the city yet, so it can only be held without favour, with beer alone.');
    expect(C.body(w.cityEvents.waiting, w).includes('It takes beer and incense.')).toBe(false);
    // Punt's route open
    w.trade.routes.punt = { since: 0, gifted: true };
    expect(incenseReaches(w)).toBe(true);
    expect(ids(w)).toEqual(['full', 'small', 'decline']);
    expect(C.body(w.cityEvents.waiting, w)).toContain('It takes beer and incense.');
    // or incense already in a store with the route shut
    delete w.trade.routes.punt;
    expect(ids(w)).toEqual(['small', 'decline']);
    storehouseOf(w).store[INCENSE_GOOD] = 3;
    expect(incenseReaches(w)).toBe(true);
    expect(ids(w)).toEqual(['full', 'small', 'decline']);
    expect(C.body(w.cityEvents.waiting, w)).toContain('It takes beer and incense.');
    delete storehouseOf(w).store[INCENSE_GOOD];
    expect(ids(w)).toEqual(['small', 'decline']);
  });
});

describe('v70 e review: the placing and keyboard words match the rules (rulings 985, 986)', () => {
  it('counts squares in the singular: one square is, several are', () => {
    for (const k of ['taken', 'inWater', 'hills', 'offMap']) {
      expect([k, P_TEXT.place[k](1, 4).startsWith('1 of 4 squares is ')]).toEqual([k, true]);
      expect([k, P_TEXT.place[k](2, 4).startsWith('2 of 4 squares are ')]).toEqual([k, true]);
    }
    expect(P_TEXT.place.taken(1, 4)).toBe('1 of 4 squares is taken');
    expect(P_TEXT.place.offMap(3, 4)).toBe('3 of 4 squares are off the map');
  });

  it('the Keyboard help quotes punctuation keys, says what Delete does and that Space closes a lesson card, all from KEYS and P_TEXT', () => {
    const kb = V70_HELP.p.find((p) => p.head === 'Keyboard').text;
    const quoted = KEYS.speedUp.concat(KEYS.speedDown).filter((k) => !/[a-z0-9]/i.test(k));
    expect(quoted.length).toBe(4);
    for (const k of quoted) expect([k, kb.includes(`"${k}"`)]).toEqual([k, true]);
    expect(kb).toContain('"]" or "."');
    expect(kb).toContain('"[" or ","');
    expect(kb.includes('] or .')).toBe(false);                                   // never bare
    expect(kb.toLowerCase()).toContain(P_TEXT.removeRow.toLowerCase());
    expect(P_TEXT.removeRow).toBe('Demolish the building whose sheet is open; with no sheet open, take back what you just placed while its Undo is offered');
    expect(kb).toContain('Space closes a lesson card');
    expect(kb).toContain('Delete or Backspace');
    expect(HELP_ROWS.find((row) => row[0] === 'remove')[1]).toBe(P_TEXT.removeRow);
  });

  it('the colours help names the faint dashed square', () => {
    const colours = V70_HELP.p.find((p) => p.head === 'Placing a building: the squares and the colours').text;
    expect(colours).toContain(P_TEXT.place.squarePlain);
    expect(colours).toContain(`a faint dashed square is ${P_TEXT.place.squarePlain}`);
  });
});
