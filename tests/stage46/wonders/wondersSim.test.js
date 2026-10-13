// Stage 4.6, Wonders track (rulings 343, 393, 394): the styles in the sim. A style names a monument's look and, for Gilded, its price (+10% on all the
// gold it takes: founding, work gold, the gilding and the capstone) and its desirability (+1 at every distance, once finished). Every claim is checked
// with the world set up both ways (each style, each difficulty).
import { describe, it, expect } from '../../harness.js';
import { MONUMENTS, MONUMENT } from '../../../src/data/monuments.js';
import { MONUMENT_STYLES, MONUMENT_STYLE_IDS, PICKABLE_STYLES, MONUMENT_STYLE_DEFAULT, MONUMENT_STYLE_PICK_DEFAULT } from '../../../src/data/wonders.js';
import { costOf, workGoldPerUnit, extraGoldOf, styleGoldFactor } from '../../../src/sim/costs.js';
import { place, canPlace, demolishRefundFor, demolishAt } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { monumentDay } from '../../../src/sim/monuments.js';
import { desirabilityField, desirabilityPreview, desirabilityAt } from '../../../src/sim/desirability.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

function city(gold = 100000, difficulty = 'normal') {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  w.difficulty = difficulty;
  return w;
}
const near = (a, b) => Math.abs(a - b) < 1e-6;
const run = (w, days) => { for (let i = 0; i < days; i++) { monumentDay(w); w.day += 1; } };
const COST = { peaceful: 0.8, relaxed: 0.8, normal: 1, hard: 1.25 };   // DIFFICULTIES[..].cost, spelt out so the test reads the rule, not the table

describe('s46 wonders styles in the sim', () => {
  it('offers three styles and keeps classic for what was built before; a style the data does not know is the default (ruling 393)', () => {
    expect(MONUMENT_STYLE_IDS).toEqual(['classic', 'whitewashed', 'painted', 'gilded']);
    expect(PICKABLE_STYLES).toEqual(['whitewashed', 'painted', 'gilded']);
    expect([MONUMENT_STYLE_DEFAULT, MONUMENT_STYLE_PICK_DEFAULT]).toEqual(['classic', 'whitewashed']);
    const w = city();
    expect(makeBuilding(w, 'obelisk_small', 2, 2).style).toBe('classic');
    expect(makeBuilding(w, 'obelisk_small', 2, 2, 0, { style: 'tartan' }).style).toBe('classic');
    expect(place(w, 'obelisk_small', 20, 9, { style: 'painted' }).ok).toBe(true);
    expect(Object.values(w.buildings).find((b) => b.type === 'obelisk_small').style).toBe('painted');
  });

  it('prices Gilded 10% up on the founding at every difficulty, and no other style, no unknown style and no other building', () => {
    for (const [difficulty, f] of Object.entries(COST)) {
      const w = city(1e6, difficulty);
      for (const type of ['obelisk_small', 'colossus', 'pyramid_great', 'sun_temple']) {
        const base = Math.max(1, Math.round(MONUMENTS[type].founding * f));
        const gilded = Math.max(1, Math.round(MONUMENTS[type].founding * 1.1 * f));
        expect([difficulty, type, costOf(w, type, { style: 'gilded' }), costOf(w, type, { style: 'whitewashed' }), costOf(w, type, { style: 'painted' }), costOf(w, type, { style: 'classic' }), costOf(w, type, { style: 'tartan' }), costOf(w, type)])
          .toEqual([difficulty, type, gilded, base, base, base, base, base]);
      }
      expect(costOf(w, 'well', { style: 'gilded' })).toBe(costOf(w, 'well'));
    }
    expect([styleGoldFactor('gilded'), styleGoldFactor('painted'), styleGoldFactor(null), styleGoldFactor('tartan')]).toEqual([1.1, 1, 1, 1]);
  });

  it('charges the styled price on founding, refuses a Gilded one the treasury cannot found, and refunds the styled price in full on undo', () => {
    const w = city(2600);
    expect(canPlace(w, 'sun_temple', 12, 7, { style: 'whitewashed' }).ok).toBe(true);                  // 2,500
    expect([canPlace(w, 'sun_temple', 12, 7, { style: 'gilded' }).ok, canPlace(w, 'sun_temple', 12, 7, { style: 'gilded' }).reason]).toEqual([false, 'no_gold']);   // 2,750
    w.gold = 2750;
    const r = place(w, 'sun_temple', 12, 7, { style: 'gilded' });
    expect([r.ok, w.gold, w.buildings[r.id].style]).toEqual([true, 0, 'gilded']);
    expect([undo(w).ok, w.gold]).toEqual([true, 2750]);
  });

  it('refunds a quarter of what the style cost on demolishing, and says so (the refund the sheet quotes is the one paid)', () => {
    for (const [style, founding] of [['whitewashed', 3000], ['gilded', 3300]]) {
      const w = city();
      const b = addRaw(w, 'pyramid_small', 12, 6);
      b.style = style;
      const quote = demolishRefundFor(w, b), before = w.gold;
      expect([style, quote]).toEqual([style, Math.floor(founding / 4)]);
      expect(demolishAt(w, 12, 6).ok).toBe(true);
      expect(w.gold - before).toBe(quote);
    }
  });

  it('pays Gilded crews 10% more a unit laid (143 a crew-month at Normal), in whole gold with the fraction carried, and no other style more', () => {
    for (const [style, month] of [['whitewashed', 130], ['painted', 130], ['classic', 130], ['gilded', 143]]) {
      const w = city(10000);
      addRaw(w, 'builders_guild', 16, 11, { staff: 16 });
      const s = addRaw(w, 'obelisk_large', 20, 9);
      s.style = style;
      s.site.stock.stone = 80;
      expect([style, near(workGoldPerUnit(w, style), MONUMENT.goldPerUnit * styleGoldFactor(style))]).toEqual([style, true]);
      run(w, 30);                                                                   // a month: 20 units
      expect([style, 10000 - w.gold, s.site.month.gold, near(s.site.laid.stone, 20)]).toEqual([style, month, month, true]);
    }
  });

  it('scales the gilding and the capstone by the style too (1,100 and 5,500 at Normal), and pays the style\'s sum before the last course', () => {
    const w = city(0);
    expect([extraGoldOf(w, 'obelisk_large'), extraGoldOf(w, 'obelisk_large', 'gilded'), extraGoldOf(w, 'pyramid_great', 'gilded'), extraGoldOf(w, 'pyramid_great', 'painted'), extraGoldOf(w, 'colossus', 'gilded')]).toEqual([1000, 1100, 5500, 5000, 0]);
    const v = city(1050);
    addRaw(v, 'builders_guild', 16, 11, { staff: 16 });
    const s = addRaw(v, 'obelisk_large', 20, 9);
    s.style = 'gilded';
    Object.assign(s.site, { course: 3, laid: { stone: 0, bricks: 0 }, stock: { stone: 90, bricks: 0 } });
    run(v, 1);
    expect([s.site.extraPaid, s.site.reason]).toEqual([false, 'waiting_gilding']);   // 1,050 is below the 1,100 a Gilded one pays
    v.gold = 1200;
    run(v, 1);
    expect([s.site.extraPaid, 1200 - v.gold >= 1100, 1200 - v.gold < 1110]).toEqual([true, true, true]);   // the 1,100 and the crew's day
  });

  it('adds +1 desirability at every distance a finished Gilded monument reaches, and nothing for a site or another style', () => {
    const field = (style, done) => {
      const w = city();
      const b = insertBuilding(w, makeBuilding(w, 'colossus', 14, 8, 0, { style }));   // rows 8-9, the road along y = 10 touches it
      if (done) Object.assign(b.site, { course: MONUMENTS.colossus.courses.length, done: 0, extraPaid: true });
      return { w, b };
    };
    const { w: plain } = field('whitewashed', true), { w: gilded } = field('gilded', true), { w: site } = field('gilded', false);
    // the colossus stands on 14..15 x 8..9: distance d from its footprint is tile (15 + d, 8)
    MONUMENTS.colossus.desirability.forEach((v, i) => {
      const d = i + 1;
      expect([d, desirabilityAt(plain, 15 + d, 8), desirabilityAt(gilded, 15 + d, 8)]).toEqual([d, v, v + MONUMENT_STYLES.gilded.desirability]);
    });
    expect(desirabilityAt(gilded, 15 + 7, 8)).toBe(0);                              // past the kind's reach: nothing, the style adds no reach
    expect(desirabilityAt(site, 16, 8)).toBe(-3);                                   // a site under way: its dust and noise, whatever the style
    expect([desirabilityAt(field('painted', true).w, 16, 8), desirabilityAt(field('classic', true).w, 16, 8)]).toEqual([MONUMENTS.colossus.desirability[0], MONUMENTS.colossus.desirability[0]]);
  });

  it('rebuilds the desirability field when a monument\'s style changes, and previews a placing with the style it will have', () => {
    const w = city();
    const b = insertBuilding(w, makeBuilding(w, 'obelisk_large', 14, 6, 0, { style: 'whitewashed' }));
    Object.assign(b.site, { course: 4, done: 0, extraPaid: true });
    const was = desirabilityAt(w, 15, 6);
    b.style = 'gilded';
    expect(desirabilityAt(w, 15, 6)).toBe(was + 1);
    const empty = city();
    const a = desirabilityPreview(empty, 'sun_temple', 10, 10, { style: 'gilded' }), c = desirabilityPreview(empty, 'sun_temple', 10, 10, { style: 'whitewashed' });
    expect(a.tiles.length).toBe(c.tiles.length);
    a.tiles.forEach((t, i) => expect(t.v).toBe(c.tiles[i].v + 1));
    expect(desirabilityPreview(empty, 'sun_temple', 10, 10, { style: 'gilded', site: true }).tiles.every((t) => t.v < 0)).toBe(true);
    expect(desirabilityField(w) === desirabilityField(w)).toBe(true);               // still memoised between changes
  });

  it('keeps the style through a save and a load, and in the same world from the same commands (no randomness)', () => {
    const make = () => {
      const w = city();
      addRaw(w, 'builders_guild', 16, 11, { staff: 16 });
      const r = place(w, 'colossus', 20, 8, { style: 'gilded' });
      w.buildings[r.id].site.stock.stone = 120;
      run(w, 40);
      return w;
    };
    const a = make(), b = make();
    expect(serialize(a)).toBe(serialize(b));
    const back = deserialize(serialize(a));
    expect(Object.values(back.buildings).find((x) => x.type === 'colossus').style).toBe('gilded');
  });
});
