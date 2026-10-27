// Version 8.3, Track C (rulings 1434-1441): the site sheet's crew lines, the camp's button and its question, the "keep a storehouse stocked" line and its
// Show me, the placing chip, and the guild's own line. Every number on screen is the sim's own, set up both ways.
import { describe, it, expect } from '../../harness.js';
import { siteRows, campModel, keepStockedFix, storehouseSpotFor, supplyLine } from '../../../src/ui/monumentSheet.js';
import { siteCrews, crewSpeed, crewDistance, campQuote, siteStatus, monumentDay } from '../../../src/sim/monuments.js';
import { checkTiles } from '../../../src/sim/commands.js';
import { roadReach, reachDistance } from '../../../src/sim/reach.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { UI4_TEXT, V83_C_TEXT, ui4ConditionText } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { createMonumentUi } from '../../../src/ui/monumentSheet.js';
import { TIPS } from '../../../src/data/tips.js';
import { TIP_TEXT } from '../../../src/ui/text.js';

function longCity(gold = 100000) {
  const w = makeTestWorld({ size: 128, gold });
  setRoad(w, 0, 10, 127, 10);
  w.milestone = 'capital';
  return w;
}
const rowsOf = (w, b) => Object.fromEntries(siteRows(w, b).map((r) => [r.key, r]));
const guildAt = (w, x) => addRaw(w, 'builders_guild', x, 11, { staff: 16 });

describe('v83 c the site sheet\'s crew lines', () => {
  it('says each crew\'s walk and speed from the sim: full, a far crew at its percentage "(the walk)", and "(the workers\' camp)" once set up', () => {
    const w = longCity();
    const g1 = guildAt(w, 2), g2 = guildAt(w, 20);
    const s = addRaw(w, 'colossus', 60, 8);                                       // two crews
    const [a, b] = siteCrews(w, s);
    const rows = rowsOf(w, s);
    expect(rows[`crew-${a.id}`].text).toBe(`Crew from the guild ${a.dist} road tiles away: works at ${Math.round(a.speed * 100)}% (the walk)`);
    expect([a.dist, a.speed, b.dist, b.speed]).toEqual([crewDistance(w, w.buildings[a.id], s), crewSpeed(a.dist), crewDistance(w, w.buildings[b.id], s), crewSpeed(b.dist)]);
    expect([g1.id, g2.id].sort()).toEqual([a.id, b.id].sort());
    const nearOne = guildAt(w, 52);
    const text = (id) => siteRows(w, s).find((r) => r.key === `crew-${id}`).text;
    expect(/^Crew from the guild \d+ road tiles away: works at (full speed|\d+% \(the walk\))$/.test(text(nearOne.id))).toBe(true);
    s.site.camp = true;
    const far = siteCrews(w, s).find((c) => c.walk < 1);
    expect(far.speed).toBe(1);
    expect(text(far.id)).toBe(`Crew from the guild ${far.dist} road tiles away: works at full speed`);
    expect(siteCrews(w, s).every((c) => c.speed === 1)).toBe(true);
  });

  it('words a near crew as full speed, one tile as "1 road tile", and gives a site with no crew no crew line', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    expect(Object.keys(rowsOf(w, s)).filter((k) => k.startsWith('crew-'))).toEqual([]);
    const g = guildAt(w, 58);                                                    // its tiles (58, 10) and (59, 10): beside the site's ring
    const d = crewDistance(w, g, s);
    expect(d).toBeLessThanOrEqual(12);
    expect(rowsOf(w, s)[`crew-${g.id}`].text).toBe(`Crew from the guild ${d === 1 ? '1 road tile' : `${d} road tiles`} away: works at full speed`);
  });

  it('does not list a crew line on a finished monument', () => {
    const w = longCity();
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 20, 9);
    Object.assign(s.site, { course: 3, done: 4 });
    expect(Object.keys(rowsOf(w, s)).some((k) => k.startsWith('crew-'))).toBe(false);
    expect(g.id).toBeGreaterThan(0);
  });
});

describe('v83 c the camp\'s offer', () => {
  it('shows only once a crew is slowed, with its price and effect, and says why it cannot be paid', () => {
    const w = longCity(1000);
    const s = addRaw(w, 'obelisk_small', 60, 9);
    expect(campModel(w, s).show).toBe(false);                                     // no crew yet
    guildAt(w, 58);
    expect(campModel(w, s).show).toBe(false);                                     // a near crew: full speed anyway
    const w2 = longCity(1000);
    const s2 = addRaw(w2, 'obelisk_small', 60, 9);
    guildAt(w2, 2);                                                              // a far one: slowed
    const m = campModel(w2, s2);
    expect([m.show, m.ok, m.text, m.quote.price]).toEqual([true, true, `Set up a workers' camp: 15 gold. Far crews work at full speed`, 15]);
    w2.gold = 10;
    const poor = campModel(w2, s2);
    expect([poor.show, poor.ok, poor.text]).toEqual([true, false, `Workers' camp: 15 gold. You have 10 gold: it can't put the treasury below 0`]);
    w2.gold = 1000;
    s2.site.camp = true;
    const done = campModel(w2, s2);
    expect([done.show, done.ok, done.done, done.text]).toEqual([true, false, true, "Workers' camp: crews at full speed"]);
  });

  it('opens the question with the price, takes it on yes, and then shows the camp as set up (390 x 844)', async () => {
    const w = longCity(1000);
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      const sheet = () => r.root.querySelector('#sheet');
      const camp = () => sheet().querySelector('.row-camp .camp');
      expect(camp().textContent).toBe("Set up a workers' camp: 15 gold. Far crews work at full speed");
      expect([...sheet().querySelectorAll('.actions button')].map((x) => x.textContent)).toEqual(['Pause', 'View', 'Build another', 'Demolish']);
      expect([...sheet().querySelectorAll('.s4-rows.site li')].map((li) => li.dataset.row).slice(0, 4)).toEqual(['progress', 'crews', `crew-${g.id}`, 'camp']);   // the offer sits under the crew it speeds up
      expect(sheet().querySelector(`.row-crew-${g.id} .text`).textContent).toBe(V83_C_TEXT.crewLine(siteCrews(w, s)[0], false));
      const gold = w.gold;
      fire(camp(), 'click');
      const d = r.store.get().confirmDialog;
      expect(d.text).toBe("Set up a workers' camp at the small obelisk for 15 gold? Every crew there works at full speed until it is finished. It is paid at once and cannot be undone.");
      expect([d.confirmLabel, w.gold, s.site.camp]).toEqual(['Set up the camp', gold, undefined]);           // nothing happens until it is confirmed
      d.onConfirm();
      expect(s.site.camp).toBe(true);                                             // (the gold itself is the sim test's: a goal's reward lands in the same settle)
      expect(camp()).toBe(null);                                                  // no button once it is set up: the row says so
      expect(sheet().querySelector('.row-camp .text').textContent).toBe("Workers' camp: crews at full speed");
      expect(sheet().querySelector(`.row-crew-${g.id} .text`).textContent).toBe("Crew from the guild 58 road tiles away: works at full speed");
    } finally { r.cleanup(); }
  });
});

describe('v83 c "keep a storehouse stocked" on the site sheet', () => {
  it('adds the line, with Show me, where nothing reaches the site with a material it needs, and not where something does', () => {
    const w = longCity();
    const s = addRaw(w, 'pyramid_small', 60, 6);                                  // 4 x 4: its tiles are y 6 to 9, beside the road
    w.prestigeUnlocks.pyramid_small = 0;
    const rows = rowsOf(w, s);
    expect(rows['keep-stocked'].text).toBe('Keep a storehouse within 16 road tiles stocked with stone and bricks');   // short of both: one line, one fix
    expect(rows['keep-stocked'].fix).toEqual(keepStockedFix(w, s));
    addRaw(w, 'quarry', 70, 11);                                                  // a quarry reaches it: stone is covered, bricks are not
    expect(rowsOf(w, s)['keep-stocked'].text).toBe('Keep a storehouse within 16 road tiles stocked with bricks');
    addRaw(w, 'brickworks', 56, 11);                                              // and now both are
    expect(rowsOf(w, s)['keep-stocked']).toBe(undefined);
  });

  it('aims Show me at a storehouse already within 16 road tiles of the site, nearest first, and opens its sheet', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const far = addRaw(w, 'storehouse', 100, 11);                                 // beyond 16 road tiles: not the answer
    const mid = addRaw(w, 'storehouse', 70, 11);
    const nearer = addRaw(w, 'storehouse', 62, 11);
    expect(keepStockedFix(w, s)).toEqual({ open: nearer.id });
    nearer.x = 0;                                                                // (kept for the id): take it out of play
    delete w.buildings[nearer.id];
    expect(keepStockedFix(w, s)).toEqual({ open: mid.id });
    delete w.buildings[mid.id];
    const spot = keepStockedFix(w, s);
    expect(spot.open).toBe(undefined);
    expect(spot.showMe.item).toBe('storehouse');
    expect(far.id).toBeGreaterThan(0);
  });

  it('aims at a free spot the placing rule accepts and a site can draw from (within 16 road tiles), the nearest to the site', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const spot = storehouseSpotFor(w, s);
    const x = spot.x - 1, y = spot.y - 1;                                         // the 2x2 storehouse's origin, from its middle
    expect(checkTiles(w, 'storehouse', x, y)).toBe(null);
    expect(reachDistance(roadReach(w, s, MONUMENT.supplyReach), w, { x, y, w: 2, d: 2 })).toBeLessThanOrEqual(MONUMENT.supplyReach);
    // the nearest: no free tile with a road beside it is nearer the site's middle
    const c = { x: 60.5, y: 9.5 };
    const dist = (px, py) => (px + 1 - c.x) ** 2 + (py + 1 - c.y) ** 2;
    for (let yy = 7; yy <= 12; yy++) for (let xx = 54; xx <= 66; xx++) if (checkTiles(w, 'storehouse', xx, yy) === null) expect(dist(xx, yy) >= dist(x, y) - 1e-9).toBe(true);
    // a storehouse built there is within the site's supply reach: the line's promise holds
    const built = addRaw(w, 'storehouse', x, y);
    built.store.stone = 40;
    s.site.stock.stone = 0;
    expect(siteStatus(w, s).materials.stone.stores).toEqual([built.id]);          // the site reaches it, holding stone
    monumentDay(w);
    expect(s.site.stock.stone > 0).toBe(true);                                    // and drew stone from it
  });

  it('has no Show me when there is no free spot, and no line at all while the storehouse is locked', () => {
    const w = longCity();
    w.milestone = 'village';
    const s = addRaw(w, 'obelisk_small', 60, 9);
    expect(Object.keys(rowsOf(w, s)).some((k) => k.startsWith('keep-'))).toBe(false);
    w.milestone = 'capital';
    for (let x = 40; x < 90; x++) for (let y = 0; y < 128; y++) if (y !== 10 && !(x >= 60 && x < 61 && y >= 9 && y < 10)) w.wall[y * w.size + x] = 1;   // walled in: nothing is free
    w.wallVersion = (w.wallVersion || 0) + 1;
    expect(storehouseSpotFor(w, s)).toBe(null);
    expect(keepStockedFix(w, s)).toBe(null);
    expect(rowsOf(w, s)['keep-stocked'].fix).toBe(null);
  });

  it('shows the Show me button on the sheet, and it aims at the storehouse card or opens the storehouse\'s sheet (390 x 844)', async () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      const keep = () => r.root.querySelector('#sheet .row-keep-stocked');
      expect(keep().querySelector('.text').textContent).toBe('Keep a storehouse within 16 road tiles stocked with stone');
      expect(keep().querySelector('.show-me').getAttribute('aria-label')).toBe('Show me: Keep a storehouse within 16 road tiles stocked with stone');
      fire(keep().querySelector('.show-me'), 'click');
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'storehouse']);
      r.store.set({ tool: null, mode: 'browse', ghost: null });
      const house = addRaw(w, 'storehouse', 66, 11);
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      r.ui.refresh();
      fire(keep().querySelector('.show-me'), 'click');
      expect(r.store.get().selectedId).toBe(house.id);
    } finally { r.cleanup(); }
  });
});

describe('v83 c the placing chip and the guild\'s own line', () => {
  it('words the chip as "Builders\' guild: 40 road tiles (80%)" or "No builders\' guild yet", from the sim\'s cond', () => {
    const met = { key: 'crew', state: 'met', reason: null, n: 2, dist: 40, speed: crewSpeed(40) };
    expect(ui4ConditionText(met, 'colossus')).toBe("Builders' guild: 40 road tiles (80%)");
    expect(ui4ConditionText({ ...met, dist: 1, speed: 1 }, 'colossus')).toBe("Builders' guild: 1 road tile (100%)");
    expect(ui4ConditionText({ key: 'crew', state: 'later', reason: 'no_crew', n: 0 }, 'colossus')).toBe("No builders' guild yet");
  });

  it('says on a guild\'s sheet where its far crew works and how fast, and nothing extra for a near one', () => {
    const w = longCity();
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 40, 9);
    s.site.stock.stone = 20;
    monumentDay(w);                                                              // the crew goes to work: the site's crews hold it
    const sim = { crewPlan: () => new Map([[g.id, s.id]]), guildSite: () => s.id };
    const d = crewDistance(w, g, s);
    expect(supplyLine(w, g, sim)).toBe(`Crew at work on the small obelisk: ${d} road tiles away, works at ${Math.round(crewSpeed(d) * 100)}%`);
    s.site.camp = true;
    expect(supplyLine(w, g, sim)).toBe('Crew at work on the small obelisk');
  });

  it('keeps the idle guild\'s and the no-crew words free of the old 12-tile reach', () => {
    expect(UI4_TEXT.guildIdle()).toBe('Idle: no monument site its roads reach has room for a crew');
    expect(UI4_TEXT.cause.no_crew()).toBe("No crew: build a builders' guild on a road that reaches this site");
    expect(campQuote(longCity(), -1).reason).toBe('not_site');
  });
});

describe('v83 c the far-crew tip', () => {
  it('fires once a crew walks far enough to be slowed on a site with no camp, and not for a near crew or a site with a camp', () => {
    const fired = [];
    const tipFor = (w) => { fired.length = 0; createMonumentUi({ world: w, store: null, fireTip: (t) => fired.push(t) }).refresh(); return fired.slice(); };
    const near = longCity();
    guildAt(near, 58);
    addRaw(near, 'obelisk_small', 60, 9);
    expect(tipFor(near)).toEqual([]);
    const far = longCity();
    guildAt(far, 2);
    const s = addRaw(far, 'obelisk_small', 60, 9);
    expect(tipFor(far)).toEqual(['farCrew']);
    s.site.camp = true;
    expect(tipFor(far)).toEqual([]);                                              // the camp is already set up
    expect(TIPS.find((t) => t.id === 'far_crew').trigger).toBe('farCrew');
    expect(TIP_TEXT.far_crew.split(/\s+/).length).toBeLessThanOrEqual(20);        // a tip keeps to 20 words
  });
});

describe('v83 c the camp\'s tap', () => {
  it('judges and prices the camp again when the question is answered: a refusal says why, and the price is the one then', () => {
    const w = longCity(1000);
    guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const asked = {}, shown = [];
    const ui = createMonumentUi({ world: w, store: { set: (v) => Object.assign(asked, v), get: () => ({}) }, toasts: { show: (t) => shown.push(t) } });
    fire(ui.sheetParts.building(s)[0].querySelector('.camp'), 'click');
    expect(asked.confirmDialog.text.includes('for 15 gold?')).toBe(true);
    w.gold = 0;                                                                   // the treasury emptied while the question was open
    asked.confirmDialog.onConfirm();
    expect([s.site.camp, shown]).toEqual([undefined, ["Not enough gold for the workers' camp: it can't put the treasury below 0"]]);
    w.gold = 1000;
    w.milestone = 'great_capital';                                                // and the city grew: monuments cost 10% more, so the camp is 17
    asked.confirmDialog.onConfirm();
    expect([s.site.camp, w.gold, shown[1]]).toEqual([true, 983, "Workers' camp set up at the small obelisk: 17 gold"]);
  });
});
