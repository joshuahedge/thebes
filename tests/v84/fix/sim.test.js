// Version 8.4 fix wave, Agent A (rulings 1535-1537): the luxuries' order and the festival's incense, a rush that saves under a day, the elephant's panic
// drawn only after an arrow, the elephants-met tally on an old world. Each rule is set up both ways.
import { describe, it, expect } from '../../harness.js';
import { LUXURY_GOODS } from '../../../src/data/goods.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { EVENT_NUMBERS } from '../../../src/data/cityEvents.js';
import { allBuildings } from '../../../src/sim/world.js';
import { LUXURY_ORDER, restockBazaars } from '../../../src/sim/distribution.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { panicDay } from '../../../src/sim/elephants.js';
import { V84_G_TEXT } from '../../../src/ui/text.js';
import { luxuryStreet, rushCity } from '../g/fixtures.js';

describe('v84 fix incense: the festival keeps its incense', () => {
  it('puts incense last in the order a home spends the luxuries', () => {
    expect(LUXURY_ORDER).toEqual(['cedar', 'ivory', 'incense']);
    expect(LUXURY_GOODS.slice().sort()).toEqual(LUXURY_ORDER.slice().sort());
  });

  it('leaves the festival\'s incense in the stores when a Fine manor wants luxuries and a temple could be offered the festival', () => {
    const need = EVENT_NUMBERS.opet.incense;
    const { world, home, bazaar } = luxuryStreet({ tier: 7 });
    const store = allBuildings(world).find((b) => b.type === 'storehouse');
    store.store.incense = need + 5;
    restockBazaars(world);
    expect([bazaar.store.incense || 0, store.store.incense]).toEqual([5, need]);
    restockBazaars(world);
    expect([bazaar.store.incense || 0, store.store.incense]).toEqual([5, need]);   // nothing more: the rest is the festival's
    // No temple, or a festival lately held: the whole stock may go to the bazaar.
    const b2 = luxuryStreet({ tier: 7 });
    for (const t of allBuildings(b2.world).filter((b) => b.type === 'temple')) t.paused = true;   // no working temple
    const s2 = allBuildings(b2.world).find((b) => b.type === 'storehouse');
    s2.store.incense = need + 5;
    restockBazaars(b2.world);
    expect([b2.bazaar.store.incense, s2.store.incense]).toEqual([need + 5, 0]);
    const b3 = luxuryStreet({ tier: 7 });
    b3.world.danger.festivalDay = b3.world.day;
    const s3 = allBuildings(b3.world).find((b) => b.type === 'storehouse');
    s3.store.incense = need + 5;
    restockBazaars(b3.world);
    expect([b3.bazaar.store.incense, s3.store.incense]).toEqual([need + 5, 0]);
    expect(home.tier).toBe(7);
  });
});

describe('v84 fix rush: a rush that saves under a day is refused', () => {
  it('says too_short when the days saved are under 1, and quotes it as before when they are not', () => {
    const { w, site } = rushCity();
    expect(rushQuote(w, site.id).ok).toBe(true);
    const total = MONUMENTS.colossus.courses[0].stone;
    site.site.laid.stone = total - 0.5;                                            // half a unit left: a day either way
    const q = rushQuote(w, site.id);
    expect([q.ok, q.reason, q.saved]).toEqual([false, 'too_short', 0]);
    expect(setRush(w, site.id, true).ok).toBe(false);
    expect(typeof V84_G_TEXT.rushWhy.too_short).toBe('string');
    expect(V84_G_TEXT.rushWhy.too_short).toBe('Rush would save less than a day');
  });
});

describe('v84 fix panic: the check is used up by an arrow only', () => {
  const elephant = (id, hp) => ({ id, kind: 'elephant', hp, x: 5, y: 5 });
  function day(by) {
    const w = { seed: 1, tally: {} };
    // An elephant below half, whose draw would say stampede: found by id.
    let id = 1;
    const el = elephant(0, 10);
    for (; id < 2000; id++) { el.id = id; if (hashSays(w, el)) break; }
    const a = { raiders: [el], entry: { x: 0, y: 0 } };
    panicDay(w, a, new Map([[el.id, by]]), () => {});
    return { el, a };
  }
  const hashSays = (w, el) => { const x = { id: el.id }; return panicProbe(w, x); };
  it('a melee blow does not use up the check; a later arrow still draws it', () => {
    const m = day('soldier');
    expect([m.el.panicChecked, !!m.el.stampede]).toEqual([undefined, false]);
    const w = { seed: 1, tally: {} };
    panicDay(w, m.a, new Map([[m.el.id, 'tower']]), () => {});
    expect([m.el.panicChecked, m.el.stampede]).toEqual([true, true]);
  });
  it('an arrow uses it up whether the draw says yes or not', () => {
    const t = day('tower');
    expect([t.el.panicChecked, t.el.stampede]).toEqual([true, true]);
    const w = { seed: 1, tally: {} };
    const el = elephant(0, 10);
    for (let id = 1; id < 2000; id++) { el.id = id; if (!panicProbe(w, el)) break; }
    panicDay(w, { raiders: [el], entry: { x: 0, y: 0 } }, new Map([[el.id, 'archer']]), () => {});
    expect([el.panicChecked, el.stampede]).toEqual([true, undefined]);
  });
});
import { wouldStampede } from '../../../src/sim/elephants.js';
const panicProbe = (w, r) => wouldStampede(w, r);
