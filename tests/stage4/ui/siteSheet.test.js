// Track C, Task C2: the site sheet (spec 6.3, 4.16; rulings 210, 245, 252). Every row is checked against the sim's own function
// with the world set up both ways. Track A's state (site.crews, site.reason, site.last, siteStatus's makers and stores) is set
// by hand to the contract's shapes.
import { describe, it, expect } from '../../harness.js';
import { siteRows, causeText, causeFix } from '../../../src/ui/monumentSheet.js';
import { siteStatus, siteProgress, paceOf, prestigeOfBuilding } from '../../../src/sim/monuments.js';
import { workGoldPerUnit, extraGoldOf } from '../../../src/sim/costs.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { UI4_TEXT } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

// A Capital with a road along y = 10 and a small pyramid site touching it.
function city() {
  const w = makeTestWorld({ gold: 20000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  w.prestigeUnlocks.pyramid_small = 0;
  w.prestigeUnlocks.pyramid_great = 0;
  return w;
}
const rowsOf = (w, b, s) => Object.fromEntries(siteRows(w, b, s).map((r) => [r.key, r.text]));

describe('s4 ui the site sheet', () => {
  it('says the course under way and the share done, from siteProgress', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    expect(rowsOf(w, b).progress).toBe('Course 1 of 8 · 0% done');
    Object.assign(b.site, { course: 3, laid: { stone: 408, bricks: 72 } });       // half the fourth course (816 + 144)
    const p = siteProgress(b);
    expect(rowsOf(w, b).progress).toBe(UI4_TEXT.progress(p.course, p.courses, p.done));
    expect(rowsOf(w, b).progress).toBe('Course 4 of 8 · 43% done');
    expect(siteRows(w, b)[0].share).toBe(p.done);
  });

  it('counts the crews at work against the most the kind takes', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    expect(rowsOf(w, b).crews).toBe('Crews: 0 of 4.');
    const g1 = addRaw(w, 'builders_guild', 20, 11), g2 = addRaw(w, 'builders_guild', 23, 11);
    b.site.crews = [g1.id];
    expect(rowsOf(w, b).crews).toBe("Crews: 1 of 4. 1 builders' guild works here.");
    b.site.crews = [g1.id, g2.id];
    expect(rowsOf(w, b).crews).toBe("Crews: 2 of 4. 2 builders' guilds work here.");
  });

  it('names the cause of a day without work and its fix, in ruling 245\'s words, or nothing after a day of work', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    const cause = () => siteRows(w, b).find((r) => r.key === 'cause') || null;
    expect(cause()).toBe(null);
    b.site.reason = 'no_crew';
    expect([cause().text, cause().fix]).toEqual(["No crew: build a builders' guild within 12 road tiles", { showMe: { category: 'monuments', item: 'builders_guild', x: 14, y: 13 } }]);
    b.site.reason = 'no_bricks';
    expect([cause().text, cause().fix.showMe.item]).toEqual(['Waiting for bricks: no brickworks or storehouse with bricks within reach', 'brickworks']);
    b.site.reason = 'no_stone';
    expect([cause().text, cause().fix.showMe.item]).toEqual(['Waiting for stone: no quarry or storehouse with stone within reach', 'quarry']);
    b.site.reason = 'no_gold';
    expect([cause().text, cause().fix]).toEqual(['No gold for the crews: work waits until the treasury is above 0', null]);
    const g = addRaw(w, 'builders_guild', 20, 11);
    b.site.reason = 'crew_short'; b.site.crews = [g.id];
    expect([cause().text, cause().fix]).toEqual(["The builders' guild is short of workers", { view: g.id }]);
    b.site.reason = 'crew_burning';
    expect(cause().text).toBe("The builders' guild is on fire");
    b.paused = true;
    expect([cause().text, siteStatus(w, b).reason]).toEqual(['Paused: no work and no work gold until you resume it', 'paused']);
  });

  it('words a material stall by what reaches the site: the spec sentence only when nothing does', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    const s = siteStatus(w, b);
    const reach = (stone, bricks) => ({ ...s, materials: { stone: { ...s.materials.stone, ...stone }, bricks: { ...s.materials.bricks, ...bricks } } });
    const cause = (status, reason) => siteRows(w, b, { ...status, reason }).find((r) => r.key === 'cause').text;
    expect(cause(reach({ makers: [], stores: [] }, {}), 'no_stone')).toBe('Waiting for stone: no quarry or storehouse with stone within reach');
    // A working quarry in reach that has not delivered yet: the sentence must not say none is within reach.
    expect(cause(reach({ makers: [5], stores: [] }, {}), 'no_stone')).toBe('Waiting for stone: 1 quarry reaches this site, but none has arrived yet');
    expect(cause(reach({ makers: [5, 6], stores: [7] }, {}), 'no_stone')).toBe('Waiting for stone: 2 quarries and 1 storehouse reach this site, but none has arrived yet');
    expect(cause(reach({}, { makers: [], stores: [8] }), 'no_bricks')).toBe('Waiting for bricks: 1 storehouse reaches this site, but none has arrived yet');
    expect(causeText(w, b, 'no_bricks', reach({}, { makers: [8], stores: [] }))).toBe('Waiting for bricks: 1 brickworks reaches this site, but none has arrived yet');
    expect(causeText(w, b, 'no_stone')).toBe('Waiting for stone: no quarry or storehouse with stone within reach');     // taken from siteStatus when not given
  });

  it('waits for the gilding or the capstone in the city\'s own gold', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_great', 12, 11);
    expect(causeText(w, b, 'waiting_capstone')).toBe(`Waiting for 5,000 gold for the capstone`);
    w.difficulty = 'hard';
    expect(causeText(w, b, 'waiting_capstone')).toBe(UI4_TEXT.cause.waiting_capstone(extraGoldOf(w, 'pyramid_great')));
    expect(causeText(w, b, 'waiting_capstone')).toBe('Waiting for 6,250 gold for the capstone');
    expect(causeText(w, addRaw(w, 'obelisk_large', 25, 11), 'waiting_gilding')).toBe('Waiting for 1,250 gold for the gilding');
  });

  it('says a site with no road needs one, with the road tool, and shows no pace', () => {
    const w = city();
    const b = addRaw(w, 'obelisk_small', 20, 14);
    const rows = siteRows(w, b);
    const cause = rows.find((r) => r.key === 'cause');
    expect([cause.text, cause.fix.showMe.item, rows.some((r) => r.key === 'pace')]).toEqual(['No road yet: crews and stone come by road', 'road', false]);
  });

  it('says each material on site and what reaches the site, from siteStatus', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    b.site.stock.stone = 46.6;
    const s = siteStatus(w, b);
    expect(rowsOf(w, b, s)['material-stone']).toBe(UI4_TEXT.material('stone', s.materials.stone.onSite, s.materials.stone.makers.length, s.materials.stone.stores.length));
    const none = { ...s, materials: { stone: { ...s.materials.stone, makers: [], stores: [] }, bricks: { ...s.materials.bricks, makers: [], stores: [] } } };
    expect(rowsOf(w, b, none)['material-stone']).toBe('Stone: 46 on site. No quarry or storehouse reaches this site.');
    const some = { ...s, materials: { stone: { ...s.materials.stone, makers: [5, 6], stores: [7] }, bricks: { ...s.materials.bricks, makers: [8], stores: [] } } };
    expect([rowsOf(w, b, some)['material-stone'], rowsOf(w, b, some)['material-bricks']]).toEqual(['Stone: 46 on site. 2 quarries and 1 storehouse reach this site.', 'Bricks: 0 on site. 1 brickworks reaches this site.']);
    expect(rowsOf(w, addRaw(w, 'obelisk_small', 25, 11))['material-bricks']).toBe(undefined);   // only the materials the kind uses
  });

  it('gives the pace at last month\'s rate, says when it is not progressing, and waits for a month at first', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    Object.assign(b.site, { course: 3, laid: { stone: 408, bricks: 72 } });
    expect(rowsOf(w, b).pace).toBe('Pace shows after a month of work');
    b.site.last = { units: 40, gold: 200, crews: 2 };
    expect([paceOf(w, b), rowsOf(w, b).pace]).toEqual([3240, 'At last month\'s pace, about 9 years to finish']);
    b.site.last = { units: 300, gold: 1500, crews: 4 };
    expect([paceOf(w, b), rowsOf(w, b).pace]).toEqual([432, UI4_TEXT.pace(432)]);
    expect(rowsOf(w, b).pace).toBe('At last month\'s pace, about 1 year 3 months to finish');
    b.site.last = { units: 0, gold: 0, crews: 0 };
    b.site.reason = 'no_stone';
    expect(rowsOf(w, b).pace).toBe('Not progressing: no stone');
    b.site.reason = null;                                                            // a crew that came this month: working today, no month of work yet
    expect(rowsOf(w, b).pace).toBe('Pace shows after a month of work');
    b.site.reason = 'no_crew';
    expect(rowsOf(w, b).pace).toBe('Not progressing: no crew');
    b.paused = true;
    expect(rowsOf(w, b).pace).toBe(undefined);
  });

  it('says last month\'s gold, or the work gold a crew is paid before then', () => {
    const w = city();
    const b = addRaw(w, 'colossus', 12, 11);
    expect(rowsOf(w, b).gold).toBe(`Work gold: ${workGoldPerUnit(w) * 20} gold a crew a month. Work stops if gold would go below 0.`);
    w.difficulty = 'hard';
    expect(rowsOf(w, b).gold).toBe('Work gold: 163 gold a crew a month. Work stops if gold would go below 0.');
    b.site.last = { units: 60, gold: 300, crews: 3 };
    expect(rowsOf(w, b).gold).toBe('Last month: 300 gold for 3 crews. Work stops if gold would go below 0.');
  });

  it('says its prestige so far and to come, or that another of its kind holds it', () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    b.site.course = 3;
    expect([prestigeOfBuilding(b), rowsOf(w, b).prestige]).toEqual([30, 'Prestige 30 so far; +130 when finished']);
    const other = addRaw(w, 'pyramid_small', 20, 11);
    other.site.course = 5;
    expect(rowsOf(w, b).prestige).toBe('One of each kind counts: the other small pyramid holds its prestige');
    expect(rowsOf(w, other).prestige).toBe(`Prestige ${prestigeOfBuilding(other)} so far; +${160 - prestigeOfBuilding(other)} when finished`);
  });

  it('opens as its own sheet with a bar, the fix buttons, Pause, View and Demolish, and no workers row', async () => {
    const w = city();
    const b = addRaw(w, 'pyramid_small', 12, 11);
    b.site.reason = 'no_crew';
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', b.id));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('h2').textContent).toBe('Small pyramid');
      expect([...sheet.querySelectorAll('.s4-rows.site li')].map((li) => li.dataset.row)).toEqual(['progress', 'crews', 'cause', 'material-stone', 'material-bricks', 'pace', 'gold', 'prestige']);
      expect(sheet.querySelector('.s4-rows .meter').getAttribute('aria-valuenow')).toBe('0');
      expect(sheet.textContent.includes('Workers')).toBe(false);
      expect([...sheet.querySelectorAll('.actions button')].map((x) => x.textContent)).toEqual(['Pause', 'View', 'Demolish']);
      fire(sheet.querySelector('.actions .pause'), 'click');
      expect([b.paused, r.root.querySelector('#sheet .row-cause .text').textContent]).toEqual([true, UI4_TEXT.cause.paused]);
      fire(r.root.querySelector('#sheet .actions .pause'), 'click');
      expect(b.paused).toBe(false);
      fire(r.root.querySelector('#sheet .row-cause .show-me'), 'click');
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'builders_guild']);
    } finally { r.cleanup(); }
  });
});
