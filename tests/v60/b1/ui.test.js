// Version 6.0 Track B1: the words and sheets of the dangers. Every sentence says what the sim does (the numbers are the sim's own), each choice says its
// consequence before the tap, each refusal says why, and each danger has its alert, its Advice item, a first or tip and How to play words.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { plagueParts, cropRows, actionButtons, dangerSummary, createHazardsUi } from '../../../src/ui/v60/hazards.js';
import { startPlague, quarantines, plagueDay } from '../../../src/sim/plague.js';
import { hazardAlerts } from '../../../src/sim/hazards.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { STRIKES, wreckFate } from '../../../src/sim/strikes.js';
import { burnBuilding } from '../../../src/sim/fire.js';
import { harvestQuote } from '../../../src/sim/production.js';
import { seasonDays } from '../../../src/sim/flood.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { alertText, B1_TEXT, V60_HELP, V60_ADVICE_WORDS, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT, DANGER_UI_TEXT } from '../../../src/ui/text.js';
import { summaryParts, tributeSheet } from '../../../src/ui/dangerSheets.js';
import { HAZARD_TIPS, HAZARD_FIRSTS, HAZARD_ADVICE, PLAGUE, DROUGHT, CROPS, HARVEST_NOW, GRACE_DAYS } from '../../../src/data/hazards.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { footMix } from '../../../src/data/armies.js';
import { drawPlague, dashesOf, PLAGUE_HUE } from '../../../src/render/plague.js';
import { districtOf, districtKey } from '../../../src/sim/plague.js';
import { locustsMonth } from '../../../src/sim/crops.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { fullestHome } from '../../../src/dev/v60/base.js';

const OPEN = GRACE_DAYS + 30;
const texts = (nodes) => nodes.map((n) => n.textContent);
const find = (nodes, cls) => nodes.flatMap((n) => [n, ...n.querySelectorAll('*')]).find((n) => n.classList && n.classList.contains(cls)) || null;

function ctxOf(w) {
  const log = { toasts: [], commands: [], shown: [], selected: [], viewed: [] };
  return { log, world: w, toasts: { show: (t) => log.toasts.push(t) }, afterCommand: (e) => log.commands.push(e), showMeAt: (t) => log.shown.push(t), celebrations: { show: (c) => log.toasts.push(c.text) }, fireTip: () => {},
    selectBuilding: (id) => { log.selected.push(id); return true; }, onView: (a) => log.viewed.push(a.code) };
}

function town({ n = 12, residents = 20, day = OPEN } = {}) {
  const w = makeTestWorld();
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'town';
  w.day = day;
  const homes = [];
  for (let k = 0; k < n; k++) homes.push(addRaw(w, 'house', 2 + k, 14, { tier: 3, residents }));
  return { w, homes };
}

const FARM_SPOTS = [[0, 14], [2, 14], [4, 14], [6, 14]];
function farms(w) {
  setRoad(w, 0, 19, 9, 19);
  const granary = addRaw(w, 'granary', 10, 11, { store: { grain: 100 }, staff: BUILDINGS.granary.workers });
  return { granary, list: FARM_SPOTS.map(([x, y]) => addRaw(w, 'farm_grain', x, y, { staff: BUILDINGS.farm_grain.workers })) };
}

describe('v60 b1 ui the raid report', () => {
  it('words what the band wrecked and took and its chieftain, and a report from before 6.0 reads as it always did', () => {
    const base = { index: 2, dir: 'east', size: 9, mix: footMix(9), won: false, byTowers: 2, bySoldiers: 0, towers: 1, burned: 1, stolen: 40, day: 100, burnedKinds: ['temple'], fires: [] };
    const old = DANGER_UI_TEXT.raidReport(base);
    expect(old).toBe('Raid from the east: raiders burned 1 building and took 40 gold. Towers stopped 2 of 9.');
    const lost = DANGER_UI_TEXT.raidReport({ ...base, wrecked: 3, wreckedKinds: ['storehouse', 'storehouse', 'temple'], taken: { pottery: 12, grain: 30 }, chiefs: 1, chiefsFell: 0 });
    expect(lost).toBe('Raid from the east: raiders left 1 building burned, 2 storehouses and a temple wrecked, 40 gold stolen, 12 pottery and 30 grain taken. Towers stopped 2 of 9. The chieftain got away.');
    const won = DANGER_UI_TEXT.raidReport({ ...base, won: true, burned: 0, stolen: 0, wrecked: 1, wreckedKinds: ['well'], chiefs: 1, chiefsFell: 1 });
    expect(won).toBe('Raid from the east beaten: 1 tower stopped 2 of 9; a well wrecked. The chieftain fell and his band turned back.');
    expect(DANGER_UI_TEXT.raidReport({ ...base, won: true, burned: 0, stolen: 0, chiefs: 2, chiefsFell: 1 }).endsWith('1 of 2 chieftains fell.')).toBe(true);
  });

  it('shows it in the summary after the goals, with the old paragraph as it was, and says the chieftain leads a warned band', () => {
    const { w } = town();
    w.raid.last = { index: 1, dir: 'north', size: 10, mix: footMix(10), won: false, byTowers: 0, bySoldiers: 0, towers: 0, burned: 0, stolen: 0, day: w.day - 3, burnedKinds: [], fires: [],
      wrecked: 1, wreckedKinds: ['bazaar'], taken: { linen: 8 }, chiefs: 1, chiefsFell: 0 };
    const nodes = summaryParts({ world: w });
    expect(nodes.map((n) => n.textContent).some((t) => t === 'Raid from the north: raiders left a bazaar wrecked, 8 linen taken. The chieftain got away.')).toBe(true);
  });

  it('says on the raid sheet that a chieftain leads the warned band and what his fall does, and nothing of the kind otherwise', () => {
    const { w } = town();
    const sheet = (warning) => {
      w.raid.warning = warning;
      const body = document.createElement('div');
      tributeSheet({ world: w, store: { get: () => ({ layout: 'wide' }) }, toasts: { show() {} }, afterCommand() {} })(body, { close() {}, setTitle() {} });
      return body.textContent;
    };
    const warning = { index: 3, entry: { x: 31, y: 16 }, dir: 'east', size: 10, tribute: 300, target: 'storehouse', day: w.day, arrives: w.day + 90, first: false, mix: footMix(10) };
    expect(sheet(warning).includes(B1_TEXT.chiefWarning)).toBe(false);
    expect(sheet({ ...warning, chiefs: [0] }).includes(B1_TEXT.chiefWarning)).toBe(true);
    expect(B1_TEXT.chiefWarning).toBe('A chieftain leads the band: he has 2 times a raider\'s strength and hits 1.5 times as hard, and when he falls the band turns back.');
  });
});

describe('v60 b1 ui rubble and rebuilding', () => {
  it('says what stood on rubble that remembers, and rebuilds it in one tap at the price it states', () => {
    const { w } = town();
    const store = addRaw(w, 'storehouse', 6, 16);
    w.day = OPEN;
    for (let d = OPEN; d < OPEN + 200 && !wreckFate(w, store); d++) w.day = d;
    const to = STRIKES.wreck(w, { fires: [] }, store, []);
    const ctx = ctxOf(w);
    const b = w.buildings[to[0]];
    const built = createHazardsUi(ctx).sheetParts.building(b);
    expect(texts(built)).toEqual(['Rubble of a storehouse, wrecked by raiders']);
    const buttons = actionButtons(ctx, b);
    const btn = find(buttons, 'rebuild');
    const price = 4 * 5 + BUILDINGS.storehouse.cost;
    expect([btn.textContent, btn.disabled, buttons[0].textContent.includes(`Clearing the rubble 20 gold, the storehouse ${BUILDINGS.storehouse.cost} gold`)]).toEqual([`Rebuild the storehouse: ${price} gold`, false, true]);
    btn.click();
    expect([ctx.log.toasts, ctx.log.commands.map((c) => [c.kind, c.undoable]), w.tally.rebuilt, w.buildings[Object.keys(w.buildings).find((id) => w.buildings[id].type === 'storehouse')].x]).toEqual([['Rebuilt the storehouse'], [['rebuild', false]], 1, 6]);
  });

  it('names a burned building the same way, and refuses with the reason when the treasury cannot pay', () => {
    const { w } = town();
    const t = addRaw(w, 'temple', 6, 16);
    const to = burnBuilding(w, t.id);
    const ctx = ctxOf(w);
    expect(texts(createHazardsUi(ctx).sheetParts.building(w.buildings[to[0]]))).toEqual(['Rubble of a temple, burned down']);
    w.gold = -480;
    const group = actionButtons(ctx, w.buildings[to[0]])[0];
    expect(find([group], 'rebuild').disabled).toBe(true);
    expect(group.textContent.includes('would put the treasury over 500 gold in debt')).toBe(true);
    const costs = find([group], 'show-me');
    expect(costs.getAttribute('aria-label')).toBe('Show me: what each month costs');
    costs.click();
    expect(ctx.log.viewed).toEqual(['no_gold']);
    expect(actionButtons(ctx, addRaw(w, 'rubble', 20, 20))).toEqual([]);                  // old rubble: only the Clear the danger interface gives
  });
});

describe('v60 b1 ui plague', () => {
  it('warns the home it will start in, with the counter, and says the same in the alert, the advice and the caption', () => {
    const { w, homes } = town();
    w.hazards.plague.warning = { day: w.day, strikes: w.day + 60, origin: homes[3].id };
    const ctx = ctxOf(w);
    const parts = plagueParts(ctx, homes[3]);
    expect(texts(parts)[0]).toContain('A plague is warned to start in this home in 2 months');
    expect(find(parts, 'show-me')).toBeTruthy();                                         // no physician reaches it: Show me one
    find(parts, 'show-me').click();
    expect(ctx.log.shown[0].item).toBe('physician');
    expect(plagueParts(ctx, homes[0])).toEqual([]);
    const alert = hazardAlerts(w)[0];
    expect(alertText(alert, w)).toEqual({ title: 'Plague in 2 months, starting in a cottage', fix: 'Build a physician nearby' });
    const item = cityAdvice(w).find((a) => a.kind === 'plague');
    const words = adviceWords(item, w);
    expect([words.what, words.action && words.action.label, item.fix.item]).toEqual(['A plague is warned: it starts in a cottage in 2 months', 'Show me', 'physician']);
    expect(words.fix.includes(`quarantine a district for ${PLAGUE.quarantine.months} months`)).toBe(true);
    expect(cityAdvice(w).indexOf(item)).toBeLessThan(6);
    createHazardsUi(ctx).onEvents([{ type: 'plague_warning', id: homes[3].id, strikes: w.day + 60 }]);
    expect(ctx.log.toasts).toEqual(['A plague is warned: it starts in a cottage in 2 months']);
  });

  it('offers the quarantine on a sick home\'s sheet with its fee, months and what stops said first, and pays it', () => {
    const { w, homes } = town();
    w.gold = 1000;
    addRaw(w, 'farm_grain', 3, 16, { staff: 5 });
    startPlague(w, homes[0].id, []);
    const ctx = ctxOf(w);
    const parts = plagueParts(ctx, homes[0]);
    const t = texts(parts);
    expect(t[0]).toContain('Sick with plague:');
    expect(t[0]).toContain('No staffed physician reaches it');
    const fee = Math.max(PLAGUE.quarantine.feeMin, 10 * PLAGUE.quarantine.feePerHome);   // the ten homes of the first district (x 2 to 11)
    const group = parts[1];
    expect(group.querySelector('p').textContent).toBe(`Holds 2 months. The plague cannot cross the district's edge and spreads at 25% of its pace inside it. 1 farm or workshop there stops work until it ends. The fee is ${fee} gold.`);
    const go = find(parts, 'quarantine');
    expect([go.textContent, go.disabled, go.getAttribute('aria-label').startsWith(go.textContent)]).toEqual([`Quarantine this district: ${fee} gold`, false, true]);
    go.click();
    expect([w.gold, quarantines(w).size, ctx.log.toasts, ctx.log.commands.map((c) => c.kind)]).toEqual([1000 - fee, 1, [`District quarantined for ${fee} gold`], ['quarantine']]);
    const after = texts(plagueParts(ctx, homes[1]));
    expect(after.length).toBe(1);
    expect(after[0]).toBe('Quarantined: ends in 2 months. Work in the district has stopped');
  });

  it('says why the quarantine cannot be paid with a Show me to the month\'s costs, and on a home in a district with no sick home says so with a Show me to a sick one', () => {
    const { w, homes } = town();
    w.gold = -450;
    startPlague(w, homes[0].id, []);
    const ctx = ctxOf(w);
    const parts = plagueParts(ctx, homes[1]);
    const go = find(parts, 'quarantine');
    expect(go.disabled).toBe(true);
    const group = parts[parts.length - 1];
    expect(group.textContent.includes('would put the treasury over 500 gold in debt')).toBe(true);
    const costs = find([group], 'show-me');
    expect(costs.getAttribute('aria-label')).toBe('Show me: what each month costs');
    costs.click();
    expect(ctx.log.viewed).toEqual(['no_gold']);
    const far = addRaw(w, 'house', 26, 20, { tier: 3, residents: 10 });
    const farParts = plagueParts(ctx, far);
    expect(texts(farParts).slice(0, 1)).toEqual(['No home in this district is sick: there is nothing to quarantine']);
    expect(find(farParts, 'quarantine')).toBe(null);
    const sick = find(farParts, 'show-me');
    expect(sick.getAttribute('aria-label')).toBe('Show me: a sick home to quarantine');
    sick.click();
    expect(ctx.log.selected).toEqual([homes[0].id]);
    expect(texts(dangerSummary(w))).toEqual(['Dangers', 'Plague: 1 home is sick, 0 people lost so far']);
  });

  it('says on a stopped workplace why its work stopped, and the sick-home alert and advice name the homes and what to do', () => {
    const { w, homes } = town({ n: 4 });
    const farm = addRaw(w, 'farm_grain', 3, 16, { staff: 5 });
    startPlague(w, homes[0].id, []);
    plagueDay(w, []);
    const ctx = ctxOf(w);
    expect(texts(cropRows(ctx, farm))).toEqual([B1_TEXT.haltedPlague]);
    expect(alertText(hazardAlerts(w)[0], w)).toEqual({ title: 'Plague in 1 home', fix: 'Open a sick home to quarantine its district, or put a physician near them' });
    const item = cityAdvice(w).find((a) => a.kind === 'plague');
    const words = adviceWords(item, w);
    expect([words.what, words.action.label, item.fix.select]).toEqual(['1 home is sick with plague: 1 no staffed physician reaches', 'View', homes[0].id]);
  });
});

describe('v60 b1 ui drought', () => {
  it('warns the low Nile with its months, what it does to the farms and whether the stores carry the city, in the alert and the advice', () => {
    const { w } = town();
    const { granary } = farms(w);
    w.stats.lastMonth = { used: { grain: 100 }, made: { grain: 80 } };
    const from = seasonDays(5).from;
    w.hazards.drought.warning = { day: w.day, strikes: from, year: 5 };
    const months = Math.ceil((from - w.day) / 30);
    const a = hazardAlerts(w)[0];
    expect(alertText(a, w).title).toBe(`The Nile will run low in ${DANGER_UI_TEXT.duration(from - w.day)}`);
    expect(alertText(a, w).fix).toBe('Farms will give about 50% of their crop for a year: fill your granaries');
    const item = cityAdvice(w).find((i) => i.kind === 'drought');
    const words = adviceWords(item, w);
    expect(words.what).toBe(`Low Nile in ${DANGER_UI_TEXT.duration(from - w.day)}: every farm then gives 50% of its crop for ${DROUGHT.months} months`);
    expect(words.why).toBe(`The stores hold 100 food. The farms will fall short by 60 a month (${60 * DROUGHT.months} over ${DROUGHT.months} months): the city is short by ${60 * DROUGHT.months - 100}, about ${Math.ceil((60 * DROUGHT.months - 100) / 60)} months without food`);
    // A warned danger goes first: its points on top of the heaviest ordinary item (the points are the data's: more when the stores will not carry the city).
    const lead = () => Math.max(0, ...cityAdvice(w).filter((i) => i.kind !== 'drought').map((i) => i.weight));
    expect(item.weight).toBe(lead() + HAZARD_ADVICE.droughtWarned + HAZARD_ADVICE.droughtShortMonth * Math.ceil((60 * DROUGHT.months - 100) / 60));
    expect(cityAdvice(w)[0].kind).toBe('drought');
    granary.store.grain = 800;
    const calm = cityAdvice(w).find((i) => i.kind === 'drought');
    expect([calm.weight, adviceWords(calm, w).why.includes('the stores carry the city')]).toEqual([lead() + HAZARD_ADVICE.droughtCovered, true]);
    expect(months).toBeGreaterThan(0);
    expect(texts(dangerSummary(w))[0]).toBe('Dangers');
  });

  it('says on a farm that it gives half its crop during the lean year, and the alert and caption say the same when the water fails', () => {
    const { w } = town();
    const { list } = farms(w);
    w.hazards.drought.active = { day: w.day, year: 4, until: w.day + 360, factor: 0.5 };
    const ctx = ctxOf(w);
    expect(texts(cropRows(ctx, list[0]))).toEqual(['Drought: this farm gives 50% of its crop for 12 months more']);
    expect(alertText(hazardAlerts(w)[0], w)).toEqual({ title: 'Low Nile: farms give 50% of their crop', fix: 'The lean year ends in 12 months: eat from the stores' });
    createHazardsUi(ctx).onEvents([{ type: 'drought_start', until: w.day + 360, factor: 0.5 }, { type: 'drought_end' }]);
    expect(ctx.log.toasts).toEqual(['The Nile ran low: farms give 50% of their crop for a year', 'The lean year is over: the farms yield in full again']);
  });
});

describe('v60 b1 ui locusts and blight', () => {
  function warned(kind = 'locusts') {
    const { w } = town();
    const f = farms(w);
    w.hazards.locusts.warning = { day: w.day, strikes: w.day + 30, kind, farms: f.list.slice(0, 3).map((b) => b.id), centre: { x: 3, y: 15 }, early: [] };
    return { w, ...f };
  }

  it('names the band in the alert and the advice, and puts Harvest now on each farm\'s sheet with what it does before the tap', () => {
    const { w, list } = warned();
    const ctx = ctxOf(w);
    expect(alertText(hazardAlerts(w)[0], w)).toEqual({ title: 'Locusts in 1 month: 3 farms named', fix: 'Open a named farm and Harvest now for extra grain' });
    const item = cityAdvice(w).find((a) => a.kind === 'locusts');
    const words = adviceWords(item, w);
    expect([words.what, words.action.label, item.fix.select]).toEqual(['Locusts will fall on 3 farms in 1 month', 'View', list[0].id]);
    expect(words.why).toBe(`Harvest now takes 40% of a month's crop at once, extra to what the farm makes until it comes; the farm then rests ${HARVEST_NOW.restDays} days from the day after`);
    const rows = texts(cropRows(ctx, list[0]));
    const q = harvestQuote(w, list[0]);
    expect(rows).toEqual(['Locusts warned for this farm, due in 1 month', `Takes ${q.units} grain into the stores today, extra to what the farm goes on making until the locusts come. It then rests 15 days from the day after, while the locusts eat the crop for 1 month: the rest costs less than the grain gives`]);
    const btn = find(actionButtons(ctx, list[0]), 'harvest');
    expect([btn.textContent, btn.disabled]).toEqual(['Harvest now', false]);
    btn.click();
    expect([ctx.log.toasts, w.tally.harvestsEarly, list[0].restUntil]).toEqual([[`Harvested ${q.units} grain early`], 1, w.day + 30 + 1 + 15]);   // the rest begins the day after the strike
    expect(texts(cropRows(ctx, list[0]))).toEqual(['Locusts warned for this farm, due in 1 month', 'Harvested early already: it rests when the danger comes']);
    w.day += 31;                                                                          // the rest has begun
    expect(texts(cropRows(ctx, list[0]))[0]).toBe(`Resting after Harvest now: ${HARVEST_NOW.restDays} days left`);
    w.day -= 31;
    expect(find(actionButtons(ctx, list[0]), 'harvest').disabled).toBe(true);
    expect(actionButtons(ctx, list[3])).toEqual([]);                                     // a farm outside the band has none
  });

  it('says why a farm cannot be harvested, and what blight does differently from locusts', () => {
    const { w, list, granary } = warned('blight');
    const ctx = ctxOf(w);
    granary.store.grain = BUILDINGS.granary.capacity;
    const rows = texts(cropRows(ctx, list[0]));
    expect(rows[rows.length - 2]).toBe('No granary or storehouse in reach has room for the crop: empty one or build another');
    expect(find(actionButtons(ctx, list[0]), 'harvest').disabled).toBe(true);
    const show = find(cropRows(ctx, list[0]), 'show-me');                                // a refusal says why and shows where
    expect([show.textContent, show.getAttribute('aria-label')]).toEqual(['Show me', 'Show me: where to build a granary']);
    show.click();
    expect(ctx.log.shown).toEqual([{ item: 'granary', x: list[0].x + list[0].w / 2, y: list[0].y + list[0].d / 2 }]);
    granary.store.grain = 0;
    expect(texts(cropRows(ctx, list[0]))[0]).toBe('Blight warned for this farm, due in 1 month');
  });

  it('shows what the swarm did on a farm of the band while it lasts, and the caption and tip fire', () => {
    const { w, list } = warned();
    const ctx = ctxOf(w);
    w.hazards.locusts.warning = null;
    w.hazards.locusts.active = { day: w.day, kind: 'locusts', farms: list.slice(0, 3).map((b) => b.id), until: w.day + CROPS.locusts.days, factor: 0, early: [] };
    expect(texts(cropRows(ctx, list[0]))).toEqual(['Locusts: this farm makes nothing for 1 month more']);
    expect(texts(dangerSummary(w)).slice(-1)).toEqual(['Locusts on 3 farms: no crop for 1 month more']);
    const tips = [];
    ctx.fireTip = (t) => tips.push(t);
    createHazardsUi(ctx).onEvents([{ type: 'locusts_warning', kind: 'locusts', farms: [1, 2, 3], strikes: w.day + 30 }, { type: 'raid_wreck', id: 9, kind: 'bazaar', to: [] }]);
    expect(tips).toEqual(['locustsWarned', 'rubbleWrecked']);
    expect(ctx.log.toasts).toEqual(['Locusts are coming for 3 farms in 1 month', 'Raiders wrecked a bazaar']);
  });
});

describe('v60 b1 ui first, tips and how to play', () => {
  it('has a tip with words of at most twenty for each danger, a first for each thing the player does, and How to play paragraphs', () => {
    expect(HAZARD_TIPS.map((t) => t.trigger)).toEqual(['plagueWarned', 'plagueStruck', 'droughtWarned', 'locustsWarned', 'rubbleWrecked']);
    for (const t of HAZARD_TIPS) {
      expect(TIPS).toContain(t);
      expect([t.id, typeof TIP_TEXT[t.id], TIP_TEXT[t.id].split(/\s+/).length <= 20]).toEqual([t.id, 'string', true]);
    }
    for (const f of HAZARD_FIRSTS) {
      expect(FIRSTS).toContain(f);
      expect([f.id, typeof FIRST_TEXT[f.id].head, typeof FIRST_TEXT[f.id].why]).toEqual([f.id, 'string', 'string']);
    }
    // (Version 6.0.1, ruling 800: the dangers' ease while the great temple rises follows them: tests/v60/balance/v601.test.js.)
    expect(V60_HELP.b1.map((p) => p.head)).toEqual(['Raiders that wreck and loot', 'Plague', 'Drought and the low Nile', 'Locusts and blight', 'While the great temple rises']);
    for (const kind of ['plague', 'drought', 'locusts']) expect(typeof V60_ADVICE_WORDS[kind]).toBe('function');
    expect(typeof TIP_HELP_TEXT.plague_coming).toBe('string');
  });

  it('keeps the numbers in the words the data\'s: the months, fee and share a paragraph says come from hazards.js', () => {
    const help = V60_HELP.b1.map((p) => p.text).join(' ');
    expect(help.includes(`${PLAGUE.quarantine.months} months`)).toBe(true);
    expect(help.includes(`${Math.round((1 - DROUGHT.cut) * 100)}%`)).toBe(true);
    expect(help.includes(`${Math.round(HARVEST_NOW.share * 100)}%`)).toBe(true);
    expect(help.includes(`${HARVEST_NOW.restDays} days`)).toBe(true);
  });
});

describe('v60 b1 ui the health layer\'s plague marks', () => {
  it('rings each sick home and dashes a quarantined district\'s edge, and draws nothing with no plague', () => {
    const { w, homes } = town();
    const calls = [];
    const g = { circ: (...a) => calls.push(['circ', a[3] && a[3].stroke]), line: (a, b, color) => calls.push(['line', color]), scale: 1 };
    drawPlague(g, w);
    expect(calls).toEqual([]);
    startPlague(w, homes[0].id, []);
    w.hazards.plague.active.quarantines.push({ key: districtKey(homes[0]), from: w.day, until: w.day + 60, fee: 0, homes: 0 });
    drawPlague(g, w);
    const rings = calls.filter((c) => c[0] === 'circ'), lines = calls.filter((c) => c[0] === 'line' && c[1] === PLAGUE_HUE);
    expect(rings.length).toBe(3);                                                           // halo, dark ring, crimson ring
    const dashes = dashesOf(districtOf(districtKey(homes[0])), w.size);
    expect(lines.length).toBe(dashes.length + 2);                                          // the dashes, and the cross inside the ring
    expect(dashes.length).toBeGreaterThan(8);
    expect(PLAGUE_HUE).toBe('#8E1B3A');
  });
});

describe('v60 b1 ui the City advice', () => {
  it('puts each warned danger in the top five of a busy city, over its ordinary worries, and leaves them out of a city with none', () => {
    const w = buildSampleCity(createWorld({ seed: 11 }));
    w.hazards.graceUntil = w.day;
    const rank = (kind) => cityAdvice(w).findIndex((a) => a.kind === kind);
    expect(['plague', 'drought', 'locusts'].map(rank)).toEqual([-1, -1, -1]);
    w.hazards.locusts.nextDay = w.day;
    locustsMonth(w, null);
    expect(w.hazards.locusts.warning).toBeTruthy();
    expect(['locusts', rank('locusts') < 5]).toEqual(['locusts', true]);
    w.hazards.locusts.warning = null;
    const home = fullestHome(w);
    w.hazards.plague.warning = { day: w.day, strikes: w.day + 60, origin: home.id };
    expect(['plague', rank('plague') < 5]).toEqual(['plague', true]);
    w.hazards.plague.warning = null;
    w.hazards.drought.warning = { day: w.day, strikes: w.day + 200, year: 5 };
    expect(['drought', rank('drought'), rank('drought') < 5]).toEqual(['drought', rank('drought'), true]);
  });
});
