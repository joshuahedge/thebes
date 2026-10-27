// Version 6.0, Track C: the Estate trick (ruling 586) said by the advice, set up both ways. A workshop (the weaver, taking flax from a store within 12 road tiles) with no room
// beside the store that holds its input is named as a store of its own in the open, then the workshop beside it, set to Fetch the input; with room beside the holder the fix is the
// plain one it was; once the store and the workshop stand there is nothing more to build. Every name, price and clause is the sim's (openWorkshop, roomBeside, costOf, BUILDINGS).
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TIERS } from '../../../src/data/housing.js';
import { unmadeFix, moreOf, roomBeside, roomFor, openWorkshop, buildFixFor, priceOf, causeFix } from '../../../src/sim/advice.js';
import { place } from '../../../src/sim/commands.js';
import { costOf } from '../../../src/sim/costs.js';
import { canAfford } from '../../../src/sim/money.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { OPEN_TEXT } from '../../../src/ui/text.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const lay = (w, terrain, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(w.size, x, y)] = terrain; };
const GOOD = { good: 'linen' };

// A road along y = 10 across a world that is all water but: the flax farm (2, 11), the storehouse holding the flax (10, 11), the bazaar (6, 8) and a dry patch far down the road
// (x 30-35, y 11-16, beyond the weaver's reach of 12 road tiles from the storehouse). `near` lays a dry 2x2 beside the storehouse too: room for the weaver where it takes the flax.
function world({ near = false } = {}) {
  const w = makeTestWorld({ size: 40, fertile: [], gold: 5000 });
  w.milestone = 'capital';
  lay(w, T.WATER, 0, 0, 39, 39);
  lay(w, T.DESERT, 0, 10, 39, 10);
  lay(w, T.FERTILE, 2, 11, 3, 12);
  lay(w, T.DESERT, 10, 11, 11, 12);
  lay(w, T.DESERT, 6, 8, 7, 9);
  lay(w, T.DESERT, 30, 11, 35, 16);
  if (near) lay(w, T.DESERT, 13, 11, 14, 12);
  setRoad(w, 0, 10, 39, 10);
  addRaw(w, 'farm_flax', 2, 11);
  const holder = addRaw(w, 'storehouse', 10, 11, { store: { flax: 80 } });
  const bazaar = addRaw(w, 'bazaar', 6, 8);
  staffAll(w);
  return { w, holder, bazaar };
}

describe('v60 c the Estate trick: room beside the store that holds the input', () => {
  it('finds room only where a free spot touches a road within the workshop\'s producer reach of the holder', () => {
    const none = world();
    expect(roomBeside(none.w, 'weaver', none.holder)).toBe(false);                      // water all round: nothing is free in reach
    const some = world({ near: true });
    expect(roomBeside(some.w, 'weaver', some.holder)).toBe(true);                       // a 2x2 beside the holder
    expect(BUILDINGS.weaver.producerReach).toBe(12);
    const far = world();
    lay(far.w, T.DESERT, 24, 11, 25, 12);                                               // 13 road tiles from the holder's road tile: one tile too far
    expect(roomBeside(far.w, 'weaver', far.holder)).toBe(false);
    const inside = world();                                                              // (a fresh world: the answer is kept while the buildings and roads stand as they are, and the ground never moves in play)
    lay(inside.w, T.DESERT, 22, 11, 23, 12);                                            // 11 from it: inside
    expect(roomBeside(inside.w, 'weaver', inside.holder)).toBe(true);
    expect(roomFor(inside.w, 'weaver', inside.holder)).toEqual({ x: 22, y: 11 });       // the spot Show me aims at
    expect(roomFor(inside.w, 'weaver', inside.holder)).toBe(roomFor(inside.w, 'weaver', inside.holder));   // asked twice, worked out once
    addRaw(inside.w, 'garden', 22, 11);                                                  // a building on it: the answer is worked out again, and the room is gone
    expect(roomFor(inside.w, 'weaver', inside.holder)).toBe(null);
    const roadless = world();
    lay(roadless.w, T.DESERT, 12, 14, 13, 15);                                          // dry, in reach in a straight line, but no road touches it
    expect(roomBeside(roadless.w, 'weaver', roadless.holder)).toBe(false);
  });
});

describe('v60 c the Estate trick: the fix and its words', () => {
  it('names the store in the open first, then the workshop beside it, then nothing more once both stand; the plain fix with room beside the holder', () => {
    const { w, holder } = world();
    const step1 = unmadeFix(w, GOOD);
    expect(step1).toEqual({ item: 'storehouse', at: 'building', near: holder.id, open: { maker: 'weaver', input: 'flax', store: 'storehouse', holder: holder.id, step: 'store' } });
    const r = place(w, 'storehouse', 30, 11, { roadLater: true });                       // the player lays it where Show me finds room: far down the road
    expect(r.ok).toBe(true);
    const store = w.buildings[r.id];
    const step2 = unmadeFix(w, GOOD);
    expect(step2).toEqual({ item: 'weaver', at: 'building', near: store.id, open: { maker: 'weaver', input: 'flax', store: 'storehouse', holder: holder.id, step: 'maker', by: store.id } });
    const weaver = addRaw(w, 'weaver', 32, 11, { blocked: 'no_input' });                 // laid beside it: idle until the Fetch order brings flax
    staffAll(w);
    expect([unmadeFix(w, GOOD), moreOf(w, 'linen')]).toEqual([null, null]);              // both stand: nothing more to build (the Fetch order is the player's)
    store.store.flax = 10;                                                                // the cart has begun to fill it: the store now holds flax itself
    expect(openWorkshop(w, 'weaver', store.id)).toBe(undefined);                          // and there is room beside it: the plain fix would apply to a new one
    expect(weaver.type).toBe('weaver');
    const room = world({ near: true });
    expect(unmadeFix(room.w, GOOD)).toEqual({ item: 'weaver', at: 'building', near: room.holder.id });   // room beside the holder: the workshop goes there, as before
  });
  it('says both steps in the house sheet\'s line with both buildings named and priced, and ends on the Fetch order', () => {
    const { w, holder, bazaar } = world();
    const home = addRaw(w, 'house', 20, 11, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 });
    const cause = { code: 'good_unmade', good: 'linen', id: bazaar.id };
    expect(causeFix(w, cause)).toEqual(unmadeFix(w, GOOD));
    const fix = buildFixFor(w, home, cause, 'linen');
    expect([fix.item, fix.near, fix.open.step]).toEqual(['storehouse', holder.id, 'store']);
    const cost = priceOf(w, fix);
    expect(cost).toBe(costOf(w, 'storehouse'));
    const words = stepWords(w, home, { reason: null, need: 'linen', cause, fix, cost, afford: canAfford(w, cost) });
    expect(words.rest).toBe(`a storehouse in the open (${costOf(w, 'storehouse')} gold), then a weaver beside it (${costOf(w, 'weaver')} gold), with the storehouse set to keep flax stocked: no room beside the storehouse that holds it`);   // Version 8.3: Keep stocked
    expect(words.rest).toBe(OPEN_TEXT.stepStore(fix.open, `(${cost} gold)`, costOf(w, 'weaver'), 'storehouse'));
    expect([words.action.label, words.action.build.item]).toEqual(['Show me', 'storehouse']);   // Show me starts the store's card, the first thing to build
    const laid = w.buildings[place(w, 'storehouse', 30, 11, { roadLater: true }).id];
    const fix2 = buildFixFor(w, home, cause, 'linen');
    const words2 = stepWords(w, home, { reason: null, need: 'linen', cause, fix: fix2, cost: priceOf(w, fix2), afford: true });
    expect(words2.rest).toBe(`a weaver beside the storehouse you laid (${costOf(w, 'weaver')} gold), then set that storehouse to keep flax stocked`);
    expect(fix2.near).toBe(laid.id);
  });
  it('words the advice card the same way, pricing every building it names, and the plain words when there is room', () => {
    const { w, holder, bazaar } = world();
    const home = addRaw(w, 'house', 20, 11, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 });
    const cause = { code: 'good_unmade', good: 'linen', id: bazaar.id };
    const fix = buildFixFor(w, home, cause, 'linen');
    const item = { key: 'home_need:linen:good_unmade:' + bazaar.id, kind: 'home_need', weight: 7, count: 1, id: home.id, data: { need: 'linen', cause, homes: [home.id], points: 7, locked: null }, fix, cost: priceOf(w, fix), afford: true };
    const t = adviceWords(item, w);
    expect(t.fix).toBe(`Make linen: ${OPEN_TEXT.adviceStore(fix.open, 'storehouse')}`);
    expect(t.fix).toBe('Make linen: a storehouse in the open, then a weaver beside it, the storehouse set to keep flax stocked: no room beside the storehouse that holds it');   // Version 8.3: Keep stocked
    expect(t.cost).toBe(`Storehouse and weaver: ${costOf(w, 'storehouse') + costOf(w, 'weaver')} gold`);   // both named, both priced
    expect(t.action.label).toBe('Show me');
    w.gold = -400;                                                                        // the placing rule's debt floor: the sum is more than the treasury can take
    expect(adviceWords({ ...item, cost: priceOf(w, fix), afford: canAfford(w, priceOf(w, fix)) }, w).short).toBe(true);
    const room = world({ near: true });
    const rhome = addRaw(room.w, 'house', 20, 11, { tier: 6, w: 2, d: 2, residents: 100, stockedFor: 100 });
    const rcause = { code: 'good_unmade', good: 'linen', id: room.bazaar.id };
    const rfix = buildFixFor(room.w, rhome, rcause, 'linen');
    expect(rfix.open).toBe(undefined);
    const rt = adviceWords({ key: 'k', kind: 'home_need', weight: 7, count: 1, id: rhome.id, data: { need: 'linen', cause: rcause, homes: [rhome.id], points: 7, locked: null }, fix: rfix, cost: priceOf(room.w, rfix), afford: true }, room.w);
    expect(rt.fix.startsWith('Make linen: a weaver near the storehouse')).toBe(true);
    expect(rt.cost).toBe(`Weaver: ${costOf(room.w, 'weaver')} gold`);
    expect(TIERS[8].needs.includes('linen')).toBe(true);                                  // the want is a Villa's, as the home's row names it
  });
});
