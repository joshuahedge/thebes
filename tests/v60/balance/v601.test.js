// Version 6.0.1: plague, the low Nile, locusts and blight ease while the great temple rises (rulings 800-801), and the great temple's waiting offering names a producer
// that stands (ruling 805). Each set up both ways (the temple rising and not), with every number or rule a sentence says read back from the sim.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { demandItems } from '../../../src/sim/demands.js';
import { offeringOf, offeringSource } from '../../../src/sim/monuments.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { costOf } from '../../../src/sim/costs.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { causeFix } from '../../../src/ui/monumentSheet.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { dangerDraws } from '../../../src/sim/draws.js';
import { hazardDay, hazardMonth, hazardAlerts } from '../../../src/sim/hazards.js';
import { lowNileShare, cropShare, foodOutlook } from '../../../src/sim/crops.js';
import { plagueContext, catchChance } from '../../../src/sim/plague.js';
import { createHazardsUi } from '../../../src/ui/v60/hazards.js';
import { V601_TEXT, V60_HELP, alertText } from '../../../src/ui/text.js';
import { GREAT_WORK_EASE, HAZARD_LEVELS, HAZARD_KINDS, DROUGHT, CROPS, WRECK } from '../../../src/data/hazards.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';

// ── Rulings 800-801: plague, the low Nile, locusts and blight ease while the great temple rises ──
// A Normal city past the grace with homes side by side, farms and a granary; with `temple` the great temple founded and rising, with `done` finished.
function eased({ temple = true, done = false } = {}) {
  const w = makeTestWorld({ size: 40, gold: 50000 });
  w.milestone = 'seat';
  w.hazards.graceUntil = 0;
  w.day = 5 * 360 + 30;
  setRoad(w, 0, 20, 39, 20);
  const homes = [];
  for (let x = 10; x < 22; x++) homes.push(addRaw(w, 'house', x, 19, { tier: 2, residents: 10 }));
  const farms = [0, 2, 4].map((x) => addRaw(w, 'farm_grain', x, 21));
  addRaw(w, 'granary', 6, 21);
  staffAll(w);
  if (temple) {
    const gw = addRaw(w, GREAT_WORK.type, 24, 14);
    w.reign.greatWork = gw.id;
    if (done) gw.site.done = w.day;
  }
  return { w, homes, farm: farms[0], farms };
}
const sev = HAZARD_LEVELS.normal.severity, ease = GREAT_WORK_EASE.severity, none = ease <= 0;
const ctxOf = (w) => { const log = []; return { log, world: w, celebrations: { show: (c) => log.push(c.text) }, toasts: { show: () => {} }, fireTip: () => {}, afterCommand: () => {}, showMeAt: () => {}, selectBuilding: () => true, onView: () => {} }; };
// Every kind's next draw due today, so a month end would warn it if it may be drawn.
const dueNow = (w) => { for (const k of HAZARD_KINDS) w.hazards[k].nextDay = w.day; };

describe('v60 balance 6.0.1: the dangers ease while the great temple rises (rulings 800-801)', () => {
  it('dangerDraws: harm is the level\'s severity times the ease only while the temple rises; raids and fire keep the severity, and a finished temple ends it', () => {
    const on = eased().w, off = eased({ temple: false }).w, fin = eased({ done: true }).w;
    expect([dangerDraws(on).temple, dangerDraws(on).harm, dangerDraws(on).severity]).toEqual([true, sev * ease, sev]);
    expect([dangerDraws(off).temple, dangerDraws(off).harm]).toEqual([false, sev]);
    expect([dangerDraws(fin).temple, dangerDraws(fin).harm]).toEqual([false, sev]);
    expect(WRECK.chance * dangerDraws(on).severity).toBe(WRECK.chance * dangerDraws(off).severity);   // raids strike as hard
    expect(dangerDraws(on).raids).toBe(dangerDraws(off).raids);
    expect(ease >= 0 && ease < 1).toBe(true);
  });

  it('the draws: while it rises the three are drawn only above no strength; without the temple they are warned as ever', () => {
    const on = eased(), off = eased({ temple: false });
    for (const k of [on, off]) { dueNow(k.w); hazardMonth(k.w, []); }
    const warned = (w) => HAZARD_KINDS.filter((k) => w.hazards[k].warning).length;
    expect([dangerDraws(on.w).plague, dangerDraws(on.w).drought, dangerDraws(on.w).locusts]).toEqual([!none, !none, !none]);
    expect([dangerDraws(off.w).plague, dangerDraws(off.w).drought, dangerDraws(off.w).locusts]).toEqual([true, true, true]);
    expect(warned(off.w) > 0).toBe(true);                                          // one warning at a time: the first kind due is warned
    expect([none, warned(on.w)]).toEqual([none, none ? 0 : warned(off.w)]);
  });

  it('a warning given before the founding: it lapses the next day at no strength (with its caption), and strikes as ever without the temple', () => {
    for (const temple of [true, false]) {
      const { w, farms } = eased({ temple: false });
      w.hazards.locusts.warning = { day: w.day, strikes: w.day + 30, kind: 'locusts', farms: farms.map((f) => f.id), centre: { x: 3, y: 22 }, early: [] };
      w.hazards.drought.warning = { day: w.day, strikes: w.day + 90, year: 6 };
      if (temple) addRaw(w, GREAT_WORK.type, 24, 14);
      const events = [];
      hazardDay(w, events);
      const spared = events.filter((e) => e.type === 'hazard_spared').map((e) => e.kind);
      if (temple && none) {
        expect([spared, w.hazards.locusts.warning, w.hazards.drought.warning, w.hazards.locusts.nextDay, hazardAlerts(w).length]).toEqual([['drought', 'locusts'], null, null, null, 0]);
        const ctx = ctxOf(w);
        createHazardsUi(ctx).onEvents(events);
        expect(ctx.log).toEqual([V601_TEXT.spared('drought'), V601_TEXT.spared('locusts')]);
      } else {
        expect([temple, spared, Boolean(w.hazards.locusts.warning), Boolean(w.hazards.drought.warning)]).toEqual([temple, [], true, true]);
      }
    }
    expect(new Set(HAZARD_KINDS.map(V601_TEXT.spared)).size).toBe(3);
  });

  it('one under way keeps its strength, and the shares the sim would strike with now are the level\'s outside the temple', () => {
    const { w } = eased({ temple: false });
    expect([lowNileShare(w), cropShare(w, 'locusts'), cropShare(w, 'blight')]).toEqual([Math.max(DROUGHT.floor, 1 - DROUGHT.cut * sev), Math.max(0, 1 - CROPS.locusts.loss * sev), Math.max(0, 1 - CROPS.blight.loss * sev)]);
    w.hazards.drought.active = { day: w.day, year: 6, until: w.day + 360, factor: lowNileShare(w) };
    addRaw(w, GREAT_WORK.type, 24, 14);
    expect(foodOutlook(w).factor).toBe(Math.max(DROUGHT.floor, 1 - DROUGHT.cut * sev));     // the lean year founded into keeps its cut
    expect([lowNileShare(w), cropShare(w, 'locusts')]).toEqual([Math.max(DROUGHT.floor, 1 - DROUGHT.cut * sev * ease), Math.max(0, 1 - CROPS.locusts.loss * sev * ease)]);
    expect(alertText(hazardAlerts(w).find((a) => a.code === 'drought'), w).title).toContain(`${Math.round(Math.max(DROUGHT.floor, 1 - DROUGHT.cut * sev) * 100)}%`);
  });

  it('a plague spreads at the eased pace while it rises (not at all at no strength)', () => {
    const on = eased(), off = eased({ temple: false });
    expect(plagueContext(on.w).severity).toBe(sev * ease);
    expect(plagueContext(off.w).severity).toBe(sev);
    expect(catchChance(on.w, on.homes[0], on.homes[1])).toBe(catchChance(off.w, off.homes[0], off.homes[1]) * ease);
    expect(catchChance(off.w, off.homes[0], off.homes[1]) > 0).toBe(true);
  });

  it('How to play has the rule right after the dangers\' own entries, as the sim does it', () => {
    const all = Object.values(V60_HELP).flat();
    const i = all.indexOf(V601_TEXT.help);
    expect([V601_TEXT.help.head, all[i - 1].head]).toEqual(['While the great temple rises', 'Locusts and blight']);
    const t = V601_TEXT.help.text;
    expect(t).toContain(none ? 'no plague, low Nile, locusts or blight comes' : (ease === 0.5 ? 'half their strength' : `${Math.round(ease * 100)}% of their strength`));
    if (none) for (const s of ['none is warned', 'one warned before the founding does not strike', 'One already under way runs its course']) expect([s, t.includes(s)]).toEqual([s, true]);
    expect(t).toContain('Raids and fire do not ease');
  });

  it('the great-work sheet says the rule before the founding, and that it holds now while the temple rises', async () => {
    for (const temple of [false, true]) {
      const { w } = eased({ temple });
      w.speed = 0;
      const r = await rigUI({ world: w });
      try {
        r.ui.refresh();
        r.store.set(openSheet(r.store.get(), 'greatWork'));
        const row = r.root.querySelector('#sheet .great-ease');
        expect([temple, dangerDraws(w).temple, row ? row.textContent : null]).toEqual([temple, temple, V601_TEXT.easeLine(temple)]);
      } finally { r.cleanup(); }
    }
    expect(V601_TEXT.easeLine(true)).toContain(none ? 'none is warned until it is finished' : 'they do now');
    expect(V601_TEXT.easeLine(false)).toContain('Once it is founded');
    for (const rising of [true, false]) expect(V601_TEXT.easeLine(rising)).toContain('Raids and fire do not ease');
  });
});

// ── Ruling 805: the great temple's waiting offering ──
// The Seat with the great temple at stage 3's first course (its offering: beer), a storehouse holding none, and a brewery when asked.
function beerStage({ brewery = true, beer = 0 } = {}) {
  const w = makeTestWorld({ size: 40, gold: 50000 });
  w.milestone = 'seat';
  setRoad(w, 0, 20, 39, 20);
  const gw = addRaw(w, GREAT_WORK.type, 10, 15);
  addRaw(w, 'storehouse', 20, 21, { store: beer ? { beer } : {} });
  const maker = brewery ? addRaw(w, 'brewery', 26, 21, { blocked: null }) : null;
  staffAll(w);
  gw.site.course = 3 * GREAT_WORK.perStage;
  gw.site.reason = 'waiting_offering';
  w.reign.greatWork = gw.id;
  w.reign.offered = 3;
  return { w, gw, maker };
}
const offeringItem = (w) => { const out = []; demandItems(w, [], out); return out.find((i) => i.key === 'great_offering') || null; };

describe('v60 balance 6.0.1: a waiting offering names the producer that stands (ruling 805)', () => {
  it('a brewery at work and no beer in the stores: View the brewery and wait for the offering, no build offered', () => {
    const { w, gw, maker } = beerStage();
    const o = offeringOf(w, 3);
    expect(o.good).toBe('beer');
    expect(offeringSource(w, 'beer')).toEqual({ store: null, producer: 'brewery', maker: maker.id });
    const a = offeringItem(w);
    expect(a.fix).toEqual({ select: maker.id, target: { x: maker.x + maker.w / 2, y: maker.y + maker.d / 2 }, why: 'great_offering' });
    expect([a.data.held, a.data.maker, a.data.makerIdle, a.cost, a.afford]).toEqual([false, maker.id, false, null, null]);
    const words = adviceWords(a, w);
    expect(words.fix).toBe(`No store holds any beer yet: your brewery makes it. Wait for ${o.n - a.data.have} to reach the stores`);
    expect(words.fix.includes('build')).toBe(false);
    expect(words.action.label).toBe('View');
    expect(causeFix(w, gw, 'waiting_offering')).toEqual({ view: maker.id });
  });

  it('a brewery standing idle: its sheet says why; a store holding some beer still comes first', () => {
    const { w, maker } = beerStage();
    maker.blocked = 'no_input';
    const a = offeringItem(w);
    expect([a.fix.select, a.data.makerIdle]).toEqual([maker.id, true]);
    expect(adviceWords(a, w).fix).toBe('No store holds any beer: your brewery is not working. Its sheet says why');
    const held = beerStage({ beer: 40 });
    const store = Object.values(held.w.buildings).find((b) => b.type === 'storehouse');
    const h = offeringItem(held.w);
    expect([h.fix.select, h.data.held, h.data.maker]).toEqual([store.id, true, null]);
    expect(adviceWords(h, held.w).fix).toBe('Keep more beer in the stores: the one holding most is shown');
  });

  it('no brewery: the brewery\'s card is offered with its price, and goes once one stands', () => {
    const { w, gw } = beerStage({ brewery: false });
    const a = offeringItem(w);
    expect([a.fix.item, a.data.maker, a.cost]).toEqual(['brewery', null, costOf(w, 'brewery')]);
    expect(adviceWords(a, w).fix).toBe('No store holds any beer: build a brewery to make it');
    expect(adviceWords(a, w).action.label).toBe('Show me');
    const c = { x: gw.x + gw.w / 2, y: gw.y + gw.d / 2 };
    expect(causeFix(w, gw, 'waiting_offering')).toEqual({ showMe: { category: 'industry', item: 'brewery', x: c.x, y: c.y } });   // a brewery needs no ground: near the site
    const b = addRaw(w, 'brewery', 26, 21, { blocked: null });
    expect(offeringItem(w).fix.select).toBe(b.id);
    removeBuilding(w, b.id);
    expect(offeringItem(w).fix.item).toBe('brewery');
  });
});
