// Version 8.3, Track C (rulings 1434-1441): the site sheet's crew lines, the camp's button and its question, the "keep a storehouse stocked" line and its
// Show me, the placing chip, and the guild's own line. Every number on screen is the sim's own, set up both ways.
import { describe, it, expect } from '../../harness.js';
import { siteRows, keepRows, campModel, supplyLine } from '../../../src/ui/monumentSheet.js';
import { siteCrews, crewSpeed, crewDistance, campQuote, siteStatus, monumentDay } from '../../../src/sim/monuments.js';
import { checkTiles, setAccept, conditionsFor } from '../../../src/sim/commands.js';
import { siteKeepFix } from '../../../src/sim/adviceFixes.js';
import { newSite } from '../../../src/sim/world.js';
import { roadReach, reachDistance } from '../../../src/sim/reach.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { UI4_TEXT, V83_C_TEXT, ui4ConditionText } from '../../../src/ui/text.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { categoryOfItem } from '../../../src/data/ui.js';
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
    const lines = () => siteRows(w, s).filter((r) => r.key.startsWith('crew-')).map((r) => r.key);
    expect(lines().includes(`crew-${nearOne.id}`)).toBe(false);                   // a crew at full speed has no line of its own (ruling 1447)
    expect(lines().length).toBe(siteCrews(w, s).filter((c) => c.speed < 1).length);
    s.site.camp = true;
    const far = siteCrews(w, s).find((c) => c.walk < 1);
    expect(far.speed).toBe(1);
    expect(siteCrews(w, s).every((c) => c.speed === 1)).toBe(true);
    expect(lines()).toEqual([]);                                                  // with the camp every crew is at full speed: the camp's row says so
  });

  it('gives a near crew and a site with no crew no crew line: "Crews: n of m" says it, and a slowed crew\'s line is "1 road tile" for one tile', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    expect(Object.keys(rowsOf(w, s)).filter((k) => k.startsWith('crew-'))).toEqual([]);
    const g = guildAt(w, 58);                                                    // its tiles (58, 10) and (59, 10): beside the site's ring
    expect(crewDistance(w, g, s)).toBeLessThanOrEqual(12);
    expect(Object.keys(rowsOf(w, s)).filter((k) => k.startsWith('crew-'))).toEqual([]);
    const st = siteStatus(w, s);
    expect(rowsOf(w, s).crews.text).toBe(UI4_TEXT.crews(st.crews.guilds.length, st.crews.max));
    expect(V83_C_TEXT.crewLine({ dist: 1, speed: 0.9 })).toBe('Crew from the guild 1 road tile away: works at 90% (the walk)');
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
      expect(sheet().querySelector(`.row-crew-${g.id}`)).toBe(null);               // at full speed with the camp: no crew line, the camp's row says so
    } finally { r.cleanup(); }
  });
});

// A storehouse far from the site (beyond 16 road tiles) holding something to spare: what a site short of it is supplied from (Advice's own fix, siteKeepFix).
const holderAt = (w, store = { stone: 90 }) => addRaw(w, 'storehouse', 110, 11, { staff: 6, store });
const keepKeys = (w, s) => siteRows(w, s).map((r) => r.key).filter((k) => k.startsWith('keep-'));

describe('v83 c "keep a storehouse stocked" on the site sheet', () => {
  it('shows a row only for the goods the sim\'s Advice fix (siteKeepFix) names, and none where no store can spare one', () => {
    const w = longCity();
    const s = addRaw(w, 'pyramid_small', 60, 6);                                  // 4 x 4: its tiles are y 6 to 9, beside the road
    w.prestigeUnlocks.pyramid_small = 0;
    expect(keepKeys(w, s)).toEqual([]);                                           // short of stone and bricks, but no store anywhere has any: no row, no Show me
    const h = holderAt(w);                                                        // a store can spare stone: its row, for stone only
    staffAll(w);
    let rows = keepRows(w, s);
    expect(rows.map((r) => [r.key, r.goods, r.text])).toEqual([['keep-stocked', ['stone'], 'Build a storehouse near the site, then keep it stocked with stone']]);
    const f = siteKeepFix(w, s, 'stone');
    expect([f.from, Boolean(f.build)]).toEqual([h.id, true]);
    expect(rows[0].fix).toEqual({ showMe: { category: categoryOfItem('storehouse'), item: 'storehouse', x: f.build.x, y: f.build.y } });
    expect(siteKeepFix(w, s, 'bricks')).toBe(null);
    h.store.bricks = 60;                                                          // and bricks too: one row for both, as both are one storehouse to build
    rows = keepRows(w, s);
    expect(rows.map((r) => [r.key, r.goods, r.text])).toEqual([['keep-stocked', ['stone', 'bricks'], 'Build a storehouse near the site, then keep it stocked with stone and bricks']]);
    addRaw(w, 'quarry', 70, 11);                                                  // a quarry reaches it: stone is covered, bricks are not
    expect(keepRows(w, s).map((r) => [r.goods, r.text])).toEqual([[['bricks'], 'Build a storehouse near the site, then keep it stocked with bricks']]);
    addRaw(w, 'brickworks', 56, 11);                                              // and now both are
    expect(keepKeys(w, s)).toEqual([]);
  });

  it('aims Show me at the nearest storehouse within 16 road tiles that can keep the good, as Advice does, and none when none can', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    holderAt(w);
    addRaw(w, 'storehouse', 100, 11, { staff: 6, store: {} });                    // beyond 16 road tiles: not the answer
    const mid = addRaw(w, 'storehouse', 70, 11, { staff: 6, store: {} });
    const nearer = addRaw(w, 'storehouse', 62, 11, { staff: 6, store: {} });
    staffAll(w);
    let row = keepRows(w, s)[0];
    expect([row.text, row.fix]).toEqual(['Keep a storehouse within 16 road tiles stocked with stone', { select: nearer.id, keep: { good: 'stone' } }]);
    expect(siteKeepFix(w, s, 'stone').store).toBe(nearer.id);                     // the row is the Advice fix
    expect(setAccept(w, nearer.id, 'stone', false).ok).toBe(true);                // the sim would refuse a stone order there: the next one is named
    row = keepRows(w, s)[0];
    expect([row.fix.select, siteKeepFix(w, s, 'stone').store]).toEqual([mid.id, mid.id]);
    expect(setAccept(w, mid.id, 'stone', false).ok).toBe(true);                   // none can keep it: no row at all
    expect([siteKeepFix(w, s, 'stone'), keepRows(w, s), keepKeys(w, s)]).toEqual([null, [], []]);
  });

  it('aims at a free spot the placing rule accepts and a site can draw from (within 16 road tiles), the nearest to the site', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);
    holderAt(w);
    staffAll(w);
    const spot = keepRows(w, s)[0].fix.showMe;
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

  it('has no row while the storehouse is locked, or when there is no free spot, or no store has any to spare', () => {
    const w = longCity();
    w.milestone = 'village';
    const s = addRaw(w, 'obelisk_small', 60, 9);
    holderAt(w);
    expect(keepKeys(w, s)).toEqual([]);                                           // locked
    w.milestone = 'capital';
    expect(keepKeys(w, s)).toEqual(['keep-stocked']);
    for (let x = 40; x < 90; x++) for (let y = 0; y < 128; y++) if (y !== 10 && !(x >= 60 && x < 61 && y >= 9 && y < 10)) w.wall[y * w.size + x] = 1;   // walled in: nothing is free
    w.wallVersion = (w.wallVersion || 0) + 1;
    expect([siteKeepFix(w, s, 'stone'), keepKeys(w, s)]).toEqual([null, []]);
  });

  it('leaves a stall\'s Show me to the keep row (one stall, one Show me), and keeps the cause\'s own where there is no keep row', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9, { site: { ...newSite(), idle: MONUMENT.stallDays, reason: 'no_stone' } });
    const cause = () => siteRows(w, s).find((r) => r.key === 'cause');
    expect(cause().reason).toBe('no_stone');
    expect(cause().fix.showMe.item).toBe('quarry');                               // no store has stone to spare: the cause's own fix stays
    holderAt(w);
    staffAll(w);
    expect([cause().fix, keepKeys(w, s)]).toEqual([null, ['keep-stocked']]);      // a store can: the keep row carries it
    expect(siteRows(w, s).filter((r) => r.fix).map((r) => r.key)).toEqual(['keep-stocked']);
  });

  it('shows the Show me button on the sheet, and it aims at the storehouse card or opens the storehouse\'s sheet (390 x 844)', async () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9, { site: { ...newSite(), idle: MONUMENT.stallDays, reason: 'no_stone' } });
    holderAt(w);
    staffAll(w);
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      const keep = () => r.root.querySelector('#sheet .row-keep-stocked');
      const words = 'Build a storehouse near the site, then keep it stocked with stone';
      expect(keep().querySelector('.text').textContent).toBe(words);
      expect(keep().querySelector('.show-me').getAttribute('aria-label')).toBe(`Show me: ${words}`);
      expect(r.root.querySelectorAll('#sheet .s4-rows.site .show-me').length).toBe(1);   // the stall has one Show me, not two
      fire(keep().querySelector('.show-me'), 'click');
      expect([r.store.get().mode, r.store.get().tool.type]).toEqual(['placing', 'storehouse']);
      r.store.set({ tool: null, mode: 'browse', ghost: null });
      const house = addRaw(w, 'storehouse', 66, 11, { staff: 6, store: {} });
      staffAll(w);
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      r.ui.refresh();
      expect(keep().querySelector('.text').textContent).toBe('Keep a storehouse within 16 road tiles stocked with stone');
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
    expect(ui4ConditionText({ key: 'crew', state: 'later', reason: 'no_crew', n: 0, busy: 0 }, 'colossus')).toBe("No builders' guild yet");
    expect(ui4ConditionText({ key: 'crew', state: 'later', reason: 'no_crew', n: 0, busy: 2 }, 'colossus')).toBe("No free builders' guild");
  });

  it('says "No free builders\' guild" when every guild its roads reach is at work, and "No builders\' guild yet" when there is none, from the sim', () => {
    const w = longCity();
    const chip = (x) => ui4ConditionText(conditionsFor(w, 'obelisk_small', x, 9).conditions.find((c) => c.key === 'crew'), 'obelisk_small');
    expect(chip(90)).toBe("No builders' guild yet");                               // none stands
    guildAt(w, 58);
    expect(chip(90).startsWith("Builders' guild: ")).toBe(true);                    // one, free: its walk and speed
    addRaw(w, 'obelisk_small', 60, 9);                                             // the guild's crew goes to this site
    const cond = conditionsFor(w, 'obelisk_small', 90, 9).conditions.find((c) => c.key === 'crew');
    expect([cond.n, cond.busy, chip(90)]).toEqual([0, 1, "No free builders' guild"]);
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
