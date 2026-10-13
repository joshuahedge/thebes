// The River track's interface tests (rulings 334-335, 361): the farm sheet's floodplain row, the Nilometer, lodge and wharf sheets, the summary,
// the captions and tips, the cards (unlock, dock, refusals), and the Court's Lost herd and Flood omen cards end to end. Every number on a sheet
// is the sim's own: tests change the world and read the words again.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { FLOOD, FLOOD_LEVELS, HUNTING, FISHING, WILDLIFE, RIVER_FIRSTS, RIVER_TIPS, RIVER_UNLOCKS, RIVER_DOCK, floodLevelRow } from '../../../src/data/river.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { CARD_NUMBERS } from '../../../src/data/court.js';
import { riverRows, riverSummary, createRiverUi } from '../../../src/ui/s46/river.js';
import { createS46Seams } from '../../../src/ui/s46/index.js';
import { S46_RIVER_TEXT as R, S46_MAP_TEXT, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT, alertText } from '../../../src/ui/text.js';
import { cardInfo, shownItems } from '../../../src/ui/cards.js';
import { openSheet, select } from '../../../src/ui/modes.js';
import { canPlace } from '../../../src/sim/commands.js';
import { fitOf } from '../../../src/sim/fit.js';
import { floodLook, floodOutlook, seasonDays, buyForecast } from '../../../src/sim/flood.js';
import { huntingOutlook, crocSpots, crocsNear, herdArrives } from '../../../src/sim/wildlife.js';
import { eligibleCards, cardChoices, answerCard, courtDay, RIVER_HOOKS } from '../../../src/sim/court.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { allBuildings } from '../../../src/sim/world.js';
import { riverWorld, addFarm, addGranary, addRaw, stepRiver, dayOf, MONTH, YEAR } from './riverHelpers.js';
import { courtWorld } from '../court/courtHelpers.js';

const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
const pct = (id) => `${Math.round(floodLevelRow(id).harvest * 100)}%`;
const setFlood = (w, level, o = {}) => { const s = seasonDays(2); w.flood = { year: 2, level, forecast: level, from: s.from, to: s.to, applied: level, risen: true, ...o }; };
const herd = (w, o = {}) => {
  const h = { id: w.wildlife.nextId++, kind: 'gazelle', x: 34, y: 20, size: 6, max: 6, regrow: null, hx: 34, hy: 20, px: 34, py: 20, moved: 0, hunted: 0, dir: 1, ...o };
  w.wildlife.herds.push(h);
  return h;
};
// A fake seam context.
function fakeCtx(world) {
  const captions = [], tips = [];
  return { ctx: { world, celebrations: { show: (c) => captions.push(c.text) }, fireTip: (t) => tips.push(t) }, captions, tips };
}

describe('s46 river ui: the farm sheet\'s floodplain row (ruling 334)', () => {
  it('says this year\'s flood and what it gives, from the sim, for every level', () => {
    const w = riverWorld();
    const on = addFarm(w, 22, 11), off = addFarm(w, 26, 11);
    w.day = dayOf(2, 8);
    for (const l of FLOOD_LEVELS) {
      setFlood(w, l.id);
      const t = text(riverRows(w, on));
      expect([l.id, t.includes('Floodplain'), t.includes(`${Math.round(l.harvest * 100)}%`), t.includes(`${l.id[0].toUpperCase()}${l.id.slice(1)}`)]).toEqual([l.id, true, true, true]);
      expect(t).toContain(`until the next flood in month ${FLOOD.months[0]}`);
      expect(text(riverRows(w, off))).toBe(R.farmOff);                                      // a farm off the floodplain says the flood does not change it
    }
  });
  it('says what a flood may give before the first one, and nothing before the river floods', () => {
    const w = riverWorld();
    const on = addFarm(w, 22, 11);
    w.day = dayOf(2, 2);
    stepRiver(w, 1);
    const t = text(riverRows(w, on));
    expect(t).toContain('60%');
    expect(t).toContain('125%');                                                            // the range of the levels, from the data
    expect(t).toContain(`month ${FLOOD.months[0]}`);
    const v = riverWorld({ milestone: 'village' });
    expect(riverRows(v, addFarm(v, 22, 11)).length).toBe(0);
  });
  it('gives the number the sim gives: a farm shown 110% makes 110% of a plain farm\'s harvest', async () => {
    const { produceDay } = await import('../../../src/sim/production.js');
    const w = riverWorld();
    const on = addFarm(w, 22, 11);
    addGranary(w, 24, 11);
    setFlood(w, 'good');
    w.day = dayOf(2, 8);
    const shown = Number(text(riverRows(w, on)).match(/(\d+)%/)[1]) / 100;
    for (let i = 0; i < MONTH; i++) produceDay(w);
    expect(Math.abs(allBuildings(w).find((b) => b.type === 'granary').store.grain - 30 * shown) <= 1).toBe(true);
  });
});

describe('s46 river ui: the Nilometer, the lodge and the wharf', () => {
  it('shows the Nilometer\'s forecast once known, when it is known from, and why it reads nothing without workers', () => {
    const w = riverWorld();
    const n = addRaw(w, 'nilometer', 19, 12);
    n.staff = 2;
    w.day = dayOf(2, 2);
    stepRiver(w, 1);
    expect(text(riverRows(w, n))).toContain(R.nilometerWaiting(5));
    expect(text(riverRows(w, n))).toContain(`from month ${FLOOD.months[0] - FLOOD.forecastMonths}`);
    w.day = dayOf(2, 4);
    stepRiver(w, 2);
    const level = w.flood.level;
    expect(text(riverRows(w, n))).toContain(R.nilometerKnown(level));
    expect(text(riverRows(w, n))).toContain(pct(level));
    n.staff = 0;
    expect(text(riverRows(w, n))).toContain(R.nilometerIdle);
  });
  it('shows the lodge\'s herds in reach and the game it can bring from them, and says plainly when no herd is in reach', () => {
    const w = riverWorld();
    const lodge = addRaw(w, 'hunting_lodge', 32, 11);
    w.wildlife.seeded = true;
    expect(text(riverRows(w, lodge))).toContain(R.noHerds);
    expect(text(riverRows(w, lodge))).toContain(`${HUNTING.reach} tiles`);
    herd(w, { size: 8 });
    herd(w, { x: 30, y: 21, size: 3 });
    const o = huntingOutlook(w, lodge);
    const t = text(riverRows(w, lodge));
    expect([t.includes(R.herdsLine(2, 11)), t.includes(R.gameLine(o.left, o.taken)), o.month, o.left]).toEqual([true, true, 12, 12]);   // ruling 460: one animal (6 game) from each herd
    expect(t).toContain(`${HUNTING.perHerdMonth} a herd`);
    expect(t).toContain(`at most ${HUNTING.maxMonth}`);
    expect(t.includes(R.noHerds)).toBe(false);
  });
  it('shows the wharf\'s catch, and the higher catch while the water is up', () => {
    const w = riverWorld();
    const wh = addRaw(w, 'fishing_wharf', 22, 11);
    wh.rot = 1; wh.w = 1; wh.d = 2;
    expect(text(riverRows(w, wh))).toContain(`${FISHING.perMonth}, or ${FISHING.floodPerMonth} in the flood months`);
    setFlood(w, 'fair');
    w.day = dayOf(2, 8);
    expect(text(riverRows(w, wh))).toContain(`${FISHING.floodPerMonth} now`);
    expect(text(riverRows(w, wh))).toContain(R.catchRule);
    expect(text(riverRows(w, wh)).includes('tiles')).toBe(false);          // ruling 422: no sim reads a fishing distance, so the sheet names none
  });
  it('warns a workplace near a crocodile spot (not on Peaceful), says when it is scared, and leaves a home alone', () => {
    const w = riverWorld({ seed: 4 });
    const [sx, sy] = crocSpots(w).find(([x, y]) => y >= 14 && y <= 40);
    const x = sx === 21 ? 22 : 18;
    const potter = addRaw(w, 'potter', x, sy);
    expect(crocsNear(w, potter).length).toBeGreaterThan(0);
    expect(text(riverRows(w, potter))).toContain(R.crocNear);
    expect(R.crocNear).toContain(`${WILDLIFE.scareDays} day`);
    w.wildlife.scares.push({ id: potter.id, until: w.day + 1 });
    expect(text(riverRows(w, potter))).toContain(R.crocNow);
    w.wildlife.scares = [];
    expect(text(riverRows(w, addRaw(w, 'house', x, sy + 4, { tier: 1, residents: 3 })))).toBe('');
    w.difficulty = 'peaceful';
    expect(text(riverRows(w, potter)).includes('Crocodiles')).toBe(false);
  });
  it('is part of the real sheets: a floodplain farm\'s, a lodge\'s and the summary carry the River rows, once', async () => {
    const w = riverWorld();
    const farm = addFarm(w, 22, 11);
    const lodge = addRaw(w, 'hunting_lodge', 32, 11);
    setFlood(w, 'high');
    w.day = dayOf(2, 8);
    w.speed = 0;
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.store.set(select(r.store.get(), farm.id));
      let sheet = r.root.querySelector('#sheet').textContent;
      expect(sheet).toContain('Floodplain');
      expect(sheet).toContain('125%');
      expect(sheet.split('Floodplain').length).toBe(2);
      r.store.set(select(r.store.get(), lodge.id));
      sheet = r.root.querySelector('#sheet').textContent;
      expect(sheet).toContain(R.herdsLabel);
      r.store.set(openSheet(r.store.get(), 'summary'));
      sheet = r.root.querySelector('#sheet').textContent;
      expect(sheet).toContain(R.summaryHead);
      expect(sheet).toContain(R.floodLine(floodLook(w)));
    } finally { r.cleanup(); }
  });
});

describe('s46 river ui: the summary', () => {
  it('says nothing before the river floods in the city, then the flood in each phase', () => {
    const v = riverWorld({ milestone: 'village' });
    expect(riverSummary(v)).toEqual([]);
    const w = riverWorld();
    w.day = dayOf(2, 2);
    stepRiver(w, 1);
    let t = text(riverSummary(w));
    expect(t).toContain(R.summaryHead);
    expect(t).toContain(R.floodLine(floodLook(w)));
    expect(t).toContain('not known yet');
    expect(t).toContain(`${FLOOD.forecastMonths} months ahead`);
    buyForecast(w);
    t = text(riverSummary(w));
    expect(t).toContain(`Next flood: ${w.flood.level[0].toUpperCase()}${w.flood.level.slice(1)}`);
    expect(t).toContain(pct(w.flood.level));
    w.day = dayOf(2, 8);
    stepRiver(w, 1);
    t = text(riverSummary(w));
    expect(t).toContain('The river is up');
    w.day = dayOf(2, 10) + 3;
    expect(text(riverSummary(w))).toContain('The water is draining');
    w.day = dayOf(2, 12);
    expect(text(riverSummary(w))).toContain('Last flood');
  });
  it('forecasts the floodplain farms\' food from the sim: this flood and a plain year, and what the flood to come will give', () => {
    const w = riverWorld();
    addFarm(w, 22, 11);
    addFarm(w, 26, 11);
    w.day = dayOf(2, 8);
    setFlood(w, 'low');
    let o = floodOutlook(w);
    let t = text(riverSummary(w));
    expect([o.farms, o.plain, o.now]).toEqual([1, 30, 18]);
    expect(t).toContain(R.outlookLine(o, false));
    expect(t).toContain('about 18 food a month (30 without the flood)');
    w.day = dayOf(2, 2);
    w.flood = { year: 2, level: 'high', forecast: 'high', from: seasonDays(2).from, to: seasonDays(2).to, applied: 'low', risen: false };
    o = floodOutlook(w, floodLevelRow('high'));
    t = text(riverSummary(w));
    expect(t).toContain(R.outlookLine(o, true));
    expect(t).toContain('When the flood comes');
    expect(t).toContain('about 38 food a month');
  });
  it('counts the herds and the animals hunted, once there are herds or a lodge', () => {
    const w = riverWorld();
    w.day = dayOf(2, 2);
    stepRiver(w, 1);
    const n = w.wildlife.herds.length, animals = w.wildlife.herds.reduce((s, h) => s + h.size, 0);
    expect(text(riverSummary(w))).toContain(R.herdsLine2(n, animals, 0));
    w.tally.hunted = 14;
    expect(text(riverSummary(w))).toContain('14 hunted so far');
  });
});

describe('s46 river ui: captions and tips (UX rule 5)', () => {
  it('captions the forecast and the water\'s rise with the level and what the farms grow, in the words the plan gave', () => {
    const w = riverWorld();
    const { ctx, captions, tips } = fakeCtx(w);
    const seam = createRiverUi(ctx);
    seam.onEvents([{ type: 'flood_forecast', level: 'low', how: 'nilometer' }]);
    expect(captions).toEqual(['The flood will be Low: farms on the floodplain grow 60%']);
    seam.onEvents([{ type: 'flood_rise', level: 'high' }]);
    expect(captions[1]).toBe('The Nile is rising: a High flood. Farms on the floodplain grow 125%');
    expect(tips).toEqual(['floodRose']);
    for (const l of FLOOD_LEVELS) expect(R.forecastCaption(l.id)).toBe(`The flood will be ${l.id[0].toUpperCase()}${l.id.slice(1)}: farms on the floodplain grow ${Math.round(l.harvest * 100)}%`);
  });
  it('captions a forecast bought from the priests once, when the city next refreshes', () => {
    const w = riverWorld();
    w.day = dayOf(2, 2);
    stepRiver(w, 1);
    const { ctx, captions } = fakeCtx(w);
    const seam = createRiverUi(ctx);
    seam.refresh();
    expect(captions).toEqual([]);
    buyForecast(w);
    seam.refresh();
    seam.refresh();
    expect(captions).toEqual([R.forecastCaption(w.flood.level)]);
  });
  it('captions a crocodile scare with the workplace and the day it works again, and a herd wandering in', () => {
    const w = riverWorld();
    const potter = addRaw(w, 'potter', 22, 14);
    const { ctx, captions } = fakeCtx(w);
    createRiverUi(ctx).onEvents([{ type: 'croc_scare', id: potter.id, kind: 'potter', days: 1 }, { type: 'herd_arrived', id: 3, kind: 'ostrich', size: 5 }]);
    expect(captions).toEqual(['A crocodile scares the workers at the potter: they are back to work in 1 day', 'A herd of 5 ostriches wanders in from the edge of the map']);
  });
  it('fires one tip for each new building when it is placed, and has words for every tip and first', () => {
    const w = riverWorld();
    const { ctx, tips } = fakeCtx(w);
    const seam = createRiverUi(ctx);
    for (const t of ['nilometer', 'hunting_lodge', 'fishing_wharf']) {
      const b = addRaw(w, t, t === 'nilometer' ? 19 : 32, t === 'fishing_wharf' ? 14 : 11 + (t === 'nilometer' ? 1 : 0));
      seam.onCommand({ kind: 'building', result: { ok: true, id: b.id } });
    }
    expect(tips).toEqual(['nilometerPlaced', 'huntingLodgePlaced', 'fishingWharfPlaced']);
    for (const tip of RIVER_TIPS) {
      expect([tip.id, TIPS.includes(tip), typeof TIP_TEXT[tip.id], TIP_TEXT[tip.id].split(/\s+/).length <= 20, typeof TIP_HELP_TEXT[tip.id]]).toEqual([tip.id, true, 'string', true, 'string']);
    }
    for (const f of RIVER_FIRSTS) expect([f.id, FIRSTS.includes(f), typeof FIRST_TEXT[f.id].head, typeof FIRST_TEXT[f.id].why]).toEqual([f.id, true, 'string', 'string']);
    expect(TIP_TEXT.flood_rhythm).toContain(`months ${FLOOD.months[0]} to ${FLOOD.months[FLOOD.months.length - 1]}`);
    expect(TIP_HELP_TEXT.flood_rhythm).toContain(R.levelsLine);
  });
  it('is one of the six Stage 4.6 seams with the River track\'s parts filled in', () => {
    const w = riverWorld();
    const { ctx } = fakeCtx(w);
    const seams = createS46Seams(ctx);
    expect(seams.length).toBe(6);
    expect(createRiverUi({}).sheetParts.summary()).toEqual([]);                           // no city: the empty seam, as the contract's test expects
  });
});

describe('s46 river ui: the cards, the dock and the refusals (rulings 348, 361)', () => {
  it('unlocks the three with the Town, locked and previewed from the Village, in the dock where they belong', () => {
    expect(RIVER_UNLOCKS).toEqual({ town: ['nilometer', 'hunting_lodge', 'fishing_wharf'] });
    expect(MILESTONES.find((m) => m.id === 'town').unlocks.slice(-3)).toEqual(['nilometer', 'hunting_lodge', 'fishing_wharf']);
    const w = riverWorld({ milestone: 'village' });
    for (const t of ['nilometer', 'hunting_lodge', 'fishing_wharf']) expect([t, isUnlocked(w, t), cardInfo(w, t).lockText]).toEqual([t, false, 'Unlocks at Town']);
    w.milestone = 'town';
    for (const t of ['nilometer', 'hunting_lodge', 'fishing_wharf']) expect([t, isUnlocked(w, t), cardInfo(w, t).locked]).toEqual([t, true, false]);
    expect(CATEGORIES.find((c) => c.id === 'food').items.slice(-2)).toEqual(RIVER_DOCK.food);
    expect(CATEGORIES.find((c) => c.id === 'services').items).toContain('nilometer');
    expect(shownItems(w, 'food').slice(-2)).toEqual(['hunting_lodge', 'fishing_wharf']);
  });
  it('prices them as the plan says: 80, 70 and 80 gold, upkeep 3, 4 and 4, 2, 2 and 3 workers (ruling 434: the lodge had 3)', () => {
    const rows = ['nilometer', 'hunting_lodge', 'fishing_wharf'].map((t) => [BUILDINGS[t].cost, BUILDINGS[t].upkeep, BUILDINGS[t].workers, BUILDINGS[t].w, BUILDINGS[t].d, BUILDINGS[t].category]);
    expect(rows).toEqual([[80, 3, 2, 1, 1, 'services'], [70, 4, 2, 2, 2, 'food'], [80, 4, 3, 2, 1, 'food']]);
  });
  it('refuses a wharf away from the water or with only its short end on it, and a Nilometer away from the water, with Map\'s one line, and offers the nearest fit', () => {
    const w = riverWorld();
    expect(canPlace(w, 'nilometer', 30, 20).reason).toBe('needs_water');
    expect(canPlace(w, 'fishing_wharf', 30, 20).reason).toBe('needs_water');
    expect(S46_MAP_TEXT.water.touch).toBe('Must touch water');
    expect(S46_MAP_TEXT.water.longSide).toContain('long side');
    expect(canPlace(w, 'nilometer', 22, 11).reason || 'ok').toBe('ok');                       // beside the river's east bank, a road above
    expect(canPlace(w, 'fishing_wharf', 22, 11, { rot: 1 }).reason || 'ok').toBe('ok');      // turned: its long side along the water
    expect(canPlace(w, 'fishing_wharf', 22, 11).reason).toBe('needs_water');                 // lying: only its short end touches the river
    expect(fitOf(w, 'fishing_wharf', 22, 11, 1).wet).toBe(2);
    expect(fitOf(w, 'fishing_wharf', 22, 11, 0).ok).toBe(false);
    expect(BUILDINGS.fishing_wharf.rotates).toBe(true);                                      // so the player can turn it to a river that runs north to south
  });
  it('words the lodge\'s refusal-free placing and its card: no ground rule, the hunters need herds within reach', () => {
    const w = riverWorld();
    expect(BUILDINGS.hunting_lodge.terrain).toBe(undefined);
    expect(BUILDINGS.hunting_lodge.water).toBe(undefined);
    expect(canPlace(w, 'hunting_lodge', 32, 11).ok).toBe(true);
    expect(R.huntRule).toContain(`${HUNTING.reach} tiles`);
  });
});

describe('s46 river ui: the Court\'s two River cards, end to end (rulings 334, 335, 338)', () => {
  const ready = (o = {}) => { const w = courtWorld({ ...o, open: true }); w.court.guided = 'answered'; return w; };
  it('turns the Flood omen on once the real hook can act, and the priests\' fee buys the level once, whatever the card does', () => {
    const w = ready({ seed: 3 });
    expect(RIVER_HOOKS.canForecast(w)).toBe(true);
    const found = eligibleCards(w).find((e) => e.card === 'flood_omen');
    expect(Boolean(found)).toBe(true);
    const letter = { id: w.court.nextId++, kind: 'card', card: 'flood_omen', day: w.day, read: false, args: found.args };
    w.court.letters.push(letter);
    const gold = w.gold, day = w.day;
    const choices = cardChoices(w, letter);
    expect(choices.map((c) => [c.id, c.problem])).toEqual([['pay_priests', null], ['pass', null]]);
    const done = answerCard(w, letter.id, 'pay_priests');
    expect(done.ok).toBe(true);
    expect([w.gold, w.flood.forecast === w.flood.level && w.flood.level !== null]).toEqual([gold - CARD_NUMBERS.flood_omen.price, true]);   // 80 gold, once
    expect(w.court.letters.some((l) => l.id === letter.id)).toBe(false);
    expect(buyForecast(w).ok).toBe(false);                                                   // known: another letter would not be drawn
    w.day += 1;                                                                              // (the court's probe of the hooks is kept for the day)
    expect(eligibleCards(w).some((e) => e.card === 'flood_omen')).toBe(false);
    expect(w.court.cards.at(-1)).toEqual({ id: 'flood_omen', day, choice: 'pay_priests' });
  });
  it('turns the Flood omen off with a Nilometer reading the year, in a village, and once the water is up', () => {
    const nil = ready({ seed: 3 });
    addRaw(nil, 'nilometer', 19, 12).staff = 2;
    expect(eligibleCards(nil).some((e) => e.card === 'flood_omen')).toBe(false);
    const village = ready({ seed: 3 });
    village.milestone = 'village';
    expect(eligibleCards(village).some((e) => e.card === 'flood_omen')).toBe(false);
    const up = ready({ seed: 3 });
    up.day = dayOf(2, 8);
    expect(eligibleCards(up).some((e) => e.card === 'flood_omen')).toBe(false);
  });
  it('turns the Lost herd on when a herd can leave and another arrive, and each choice does what it says', () => {
    const w = ready({ seed: 6 });
    expect(RIVER_HOOKS.canLeave(w)).toBe(false);                                             // no herd to send yet
    expect(eligibleCards(w).some((e) => e.card === 'lost_herd')).toBe(false);
    w.wildlife.seeded = true;
    herd(w, { x: 34, y: 30 });
    w.day += 1;                                                                              // (the court's probe of the hooks is kept for the day)
    expect(RIVER_HOOKS.canArrive(w) && RIVER_HOOKS.canLeave(w)).toBe(true);
    const found = eligibleCards(w).find((e) => e.card === 'lost_herd');
    expect(Boolean(found)).toBe(true);
    const mk = () => { const l = { id: w.court.nextId++, kind: 'card', card: 'lost_herd', day: w.day, read: false, args: found.args }; w.court.letters.push(l); return l; };
    const before = w.wildlife.herds.length;
    const welcome = mk(), events = [];
    expect(answerCard(w, welcome.id, 'welcome', events).ok).toBe(true);
    expect(w.wildlife.herds.length).toBe(before + 1);
    expect(events.some((e) => e.type === 'herd_arrived')).toBe(true);
    const away = mk(), favour = w.court.favour;
    expect(answerCard(w, away.id, 'send_away', []).ok).toBe(true);
    expect([w.wildlife.herds.length, w.court.favour]).toEqual([before, Math.min(100, favour + CARD_NUMBERS.lost_herd.sendFavour)]);
  });
  it('draws the cards in a court run over the years when they can happen, never one that cannot', () => {
    const w = ready({ seed: 8 });
    w.wildlife.seeded = true;
    herd(w, { x: 20, y: 30 });
    const seen = new Set();
    for (let d = 0; d < YEAR * 6; d++) {
      courtDay(w);
      for (const l of w.court.letters) if (l.kind === 'card') { seen.add(l.card); w.court.letters = w.court.letters.filter((x) => x !== l); }
      w.day += 1;
      if (w.day % 30 === 0) w.court.favour = 50;
    }
    expect(seen.size).toBeGreaterThan(2);
    for (const c of seen) expect(['sickness', 'festival', 'caravan', 'deserters', 'temple_gift', 'lost_herd', 'craftsmen_dispute', 'flood_omen'].includes(c)).toBe(true);
  });
});
