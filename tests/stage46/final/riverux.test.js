// Stage 4.6 final review, the River and UX fixes (rulings 450-460). Each rule is tested both ways: the words follow the sim and the data, and
// change when they do. Describe names start with 's46 final', so tests/run-tests.ps1 -Grep "s46 final" runs them.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { makeTestWorld, addRaw as addTestRaw } from '../../helpers/testWorld.js';
import { fire } from '../../helpers/dom.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { FOOD_GOODS } from '../../../src/data/goods.js';
import { FLOOD, FLOOD_LEVELS, HUNTING, WILDLIFE } from '../../../src/data/river.js';
import { SEASONS } from '../../../src/data/tips.js';
import { RELEASES, releaseDateText } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { crocSpots, crocsNear, scareable, scareOf, huntRest, huntingOutlook, herdsInReach } from '../../../src/sim/wildlife.js';
import { produceDay } from '../../../src/sim/production.js';
import { allBuildings } from '../../../src/sim/world.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { remarkFor } from '../../../src/ui/celebrate.js';
import { renderWhatsNew } from '../../../src/ui/s46/whatsNew.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { select } from '../../../src/ui/modes.js';
import { wildlifeIds, WILDLIFE_ID_BASE } from '../../../src/render/wildlife.js';
import { CAUSE_TEXT, CITIZEN_REMARKS, S46_RIVER_TEXT as R, S46_UX_TEXT, T, alertText, foodMakers, workingText } from '../../../src/ui/text.js';
import { riverWorld, addRaw, stepRiver, dayOf, MONTH, YEAR } from '../river/riverHelpers.js';

const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
// A potter beside one of the map's crocodile spots (riverWorld seed 4, as the River track's own test).
const potterByCroc = (w) => {
  const [sx, sy] = crocSpots(w).find(([x, y]) => y >= 14 && y <= 40);
  return addRaw(w, 'potter', sx === 21 ? 22 : 18, sy);
};

describe('s46 final river: the crocodile line (ruling 451)', () => {
  it('says nothing of crocodiles on a Village workplace beside a spot, where no scare can happen, and warns from the Town on', () => {
    const v = riverWorld({ seed: 4, milestone: 'village' });
    const vp = potterByCroc(v);
    expect([crocsNear(v, vp).length > 0, scareable(v, vp), text(riverRows(v, vp)).includes(R.crocNear)]).toEqual([true, false, false]);
    const t = riverWorld({ seed: 4 });
    const tp = potterByCroc(t);
    expect([scareable(t, tp), text(riverRows(t, tp)).includes(R.crocNear)]).toEqual([true, true]);
  });
  it('opens a riverside workplace sheet of a wave 1 save (no scares list yet) before the first day, and reads no scare', () => {
    const w = riverWorld({ seed: 4 });
    const p = potterByCroc(w);
    delete w.wildlife.scares;                                                 // a wave 1 v7 save, before the first day's tidy
    expect([scareOf(w, p), text(riverRows(w, p)).includes(R.crocNear)]).toEqual([null, true]);
    w.wildlife.scares = [{ id: p.id, until: w.day + 1 }];
    expect(text(riverRows(w, p)).includes(R.crocNow)).toBe(true);
  });
});

describe('s46 final words: food is food, not grain (ruling 452)', () => {
  it('names every maker of a food from the data, and a new food maker joins the words', () => {
    const makers = Object.keys(BUILDINGS).filter((t) => BUILDINGS[t].produces && FOOD_GOODS.includes(BUILDINGS[t].produces.good));
    expect(foodMakers()).toEqual(makers);
    expect(makers.includes('hunting_lodge') && makers.includes('fishing_wharf')).toBe(true);
    expect(CAUSE_TEXT.bazaar_empty.cause).toBe('The bazaar has no food');
    expect(CAUSE_TEXT.granary_empty.fix).toBe('Grain farms, fig orchards, hunting lodges and fishing wharves fill granaries');
    const w = makeTestWorld();
    const bazaar = addTestRaw(w, 'bazaar', 10, 10);
    const fix = alertText({ code: 'bazaar_empty', id: bazaar.id }, w).fix;
    expect([fix.includes('grain farms, fig orchards, hunting lodges and fishing wharves'), fix.includes('with grain')]).toEqual([true, false]);
    BUILDINGS.test_bakery = { name: 'Bakery', produces: { good: 'figs', perMonth: 1 } };   // the other way: a new food maker is named at once
    try {
      expect(CAUSE_TEXT.granary_empty.fix.includes('bakery')).toBe(true);
    } finally { delete BUILDINGS.test_bakery; }
    expect(CAUSE_TEXT.granary_empty.fix.includes('bakery')).toBe(false);
  });
});

describe('s46 final words: flood remarks after a flood (ruling 453)', () => {
  // A Town at the start of month 7 (Akhet, a remark month) with the buildings of every flood remark.
  const akhetCity = (flood) => {
    const w = makeTestWorld();
    ['house', 'well', 'granary', 'temple', 'bazaar', 'booth', 'farm_grain', 'builders_guild'].forEach((t, i) => addTestRaw(w, t, (i % 4) * 6, 12 + Math.floor(i / 4) * 6, t === 'house' ? { tier: 1, residents: 4 } : {}));
    w.milestone = 'town';
    w.day = 6 * MONTH;
    w.flood = { year: 1, level: 'good', forecast: null, from: 6 * MONTH + 3, to: 9 * MONTH - 1, applied: null, risen: false, ...flood };
    return w;
  };
  const heard = (w) => { const s = new Set(); for (let seed = 1; seed <= 80; seed++) { w.seed = seed; s.add(remarkFor(w)); } return s; };
  const fair = CITIZEN_REMARKS.filter((r) => r.flood === 'fair').map((r) => r.text);
  const past = CITIZEN_REMARKS.filter((r) => r.flood === 'past').map((r) => r.text);
  it('marks the booth\'s flood song, the priests\' first rise and the masons\' flood months as needing a flood', () => {
    expect(past.length).toBe(3);
    expect(past.every((t) => /flood|rise/.test(t))).toBe(true);
  });
  it('hears no river talk in a Good year before the water rises, nor flood talk before the first flood; both once it has', () => {
    const before = heard(akhetCity({}));
    expect([...before].filter((t) => fair.includes(t) || past.includes(t))).toEqual([]);
    const after = heard(akhetCity({ risen: true, applied: 'good' }));
    expect([fair.some((t) => after.has(t)), past.some((t) => after.has(t))]).toEqual([true, true]);
    const low = heard(akhetCity({ risen: true, level: 'low', applied: 'low' }));      // a Low flood rose: no talk of a fine rise, but a flood happened
    expect([fair.some((t) => low.has(t)), past.some((t) => low.has(t))]).toEqual([false, true]);
  });
});

describe('s46 final words: the floodplain outlook (ruling 454)', () => {
  it('says "without the flood" for the farms at 100%; since Stage 4.7 (ruling 473) only a Fair flood gives 100%, and the words never call it a plain year', () => {
    expect(FLOOD_LEVELS.filter((l) => l.harvest === 1).map((l) => l.id)).toEqual(['fair']);
    const line = R.outlookLine({ farms: 2, now: 66, plain: 60 }, false);
    expect([line.includes('(60 without the flood)'), line.includes('plain year')]).toEqual([true, false]);
  });
});

describe('s46 final render: wildlife ids and the seasons (ruling 455)', () => {
  it('gives herd animals, tile animals and lodge and wharf figures ranges that never meet, below the next id base', () => {
    expect(wildlifeIds.hunter(5000, 0) === wildlifeIds.boat(0)).toBe(false);   // the final review's collision (60000 + 5000 x 4 = 80000 + 0)
    const ids = new Set();
    let n = 0;
    for (let b = 0; b < 20000; b++) { ids.add(wildlifeIds.hunter(b, 0)); ids.add(wildlifeIds.hunter(b, 1)); ids.add(wildlifeIds.boat(b)); n += 3; }
    expect(ids.size).toBe(n);
    const herdTop = wildlifeIds.herd(12499, 15), tileLow = wildlifeIds.tile('bird', 0), tileTop = wildlifeIds.tile('leap', 158 * 158 - 1);
    const figLow = wildlifeIds.hunter(0, 0), figTop = wildlifeIds.boat(99999);
    expect([herdTop < tileLow, tileTop < figLow, figTop < WILDLIFE_ID_BASE + 600000, wildlifeIds.herd(0, 0) >= WILDLIFE_ID_BASE]).toEqual([true, true, true, true]);
    const kinds = ['bird', 'hippo', 'croc', 'leap'].map((k) => wildlifeIds.tile(k, 77));
    expect(new Set(kinds).size).toBe(4);
  });
  it('builds the seasons from FLOOD: Akhet the flood and drain months, Peret the four after, Shemu the rest', () => {
    const akhet = [...FLOOD.months, ...FLOOD.drainMonths];
    expect(SEASONS.length).toBe(12);
    expect(SEASONS.map((s, i) => (s === 'akhet') === akhet.includes(i + 1)).every(Boolean)).toBe(true);
    const last = Math.max(...akhet);
    const peret = [1, 2, 3, 4].map((k) => ((last - 1 + k) % 12) + 1);
    expect(SEASONS.map((s, i) => (s === 'peret') === peret.includes(i + 1)).every(Boolean)).toBe(true);
    expect(SEASONS.filter((s) => s === 'shemu').length).toBe(12 - akhet.length - 4);
  });
});

describe('s46 final ui: the lodge and wharf sheets (ruling 456)', () => {
  it('says what the crew does, and labels the road reach as where it stores, for these two only', async () => {
    expect([workingText('hunting_lodge'), workingText('fishing_wharf'), workingText('farm_grain')]).toEqual(['Hunting the herds', 'Fishing the river', 'Growing grain']);
    const w = riverWorld();
    const lodge = addRaw(w, 'hunting_lodge', 32, 11, { staff: BUILDINGS.hunting_lodge.workers });
    const bazaar = addRaw(w, 'bazaar', 24, 11, { staff: BUILDINGS.bazaar.workers });
    w.speed = 0;
    const r = await rigUI({ world: w });
    const labels = () => [...r.root.querySelectorAll('#sheet .row > span.muted')].map((n) => n.textContent);
    try {
      r.store.set(select(r.store.get(), lodge.id));
      expect([labels().includes(T.storesWithin), labels().includes(T.reach)]).toEqual([true, false]);
      expect(r.root.querySelector('#sheet').textContent).toContain(`${BUILDINGS.hunting_lodge.producerReach} road tiles`);
      r.store.set(select(r.store.get(), bazaar.id));                         // another building keeps its plain Reach
      expect([labels().includes(T.storesWithin), labels().includes(T.reach)]).toEqual([false, true]);
    } finally { r.cleanup(); }
  });
});

describe('s46 final ui: the speed steps name keys only when they work (ruling 457)', () => {
  it('says Space, ] and [ with Keyboard shortcuts on, and no key with them off, at once', async () => {
    expect([S46_UX_TEXT.speedStepTitle(0, false), S46_UX_TEXT.speedStepTitle(2, false).includes('+')]).toEqual(['Pause', false]);
    const r = await rigUI({ width: 1280, height: 800 });
    const titles = () => [...r.root.querySelectorAll('#topbar .speed-bar .speed-step')].map((b) => b.title);
    try {
      expect(titles()[0]).toBe('Pause (Space)');
      expect(titles().slice(1).every((t) => t.includes('(] and [ change it)'))).toBe(true);
      r.ui.settings.set({ keyboardShortcuts: false });
      expect(titles().some((t) => /Space|\+/.test(t))).toBe(false);
      r.ui.settings.set({ keyboardShortcuts: true });
      expect(titles()[0]).toBe('Pause (Space)');
    } finally { r.cleanup(); }
  });
});

describe('s46 final placement: the map-wide fit search on Large (ruling 458)', () => {
  it('finds no fit on an 80-tile map with none, in good time, for a building in one turn and in two', () => {
    const w = makeTestWorld({ size: 80, fertile: [] });                     // no clay and no water anywhere
    const time = (tool) => { const t0 = performance.now(); const at = nearestFit(w, tool, 40, 40, null, w.size); return [performance.now() - t0, at]; };
    time({ kind: 'building', type: 'clay_pit' });                           // warm up
    const [clay] = time({ kind: 'building', type: 'clay_pit' });
    const [wharf, at] = time({ kind: 'building', type: 'fishing_wharf' });
    expect([at.x, at.y].every(Number.isInteger)).toBe(true);                 // the snapped point stays: the bar says why
    expect([clay < 100, wharf < 100]).toEqual([true, true]);                 // measured 6 and 14 ms; generous for a loaded machine
  });
});

describe('s46 final releases: every version has its build (ruling 459)', () => {
  it('the newest is the running build, and every heading shows its build', async () => {
    expect([RELEASES[0].version, RELEASES[0].build]).toEqual([APP_VERSION, 'live']);
    expect(RELEASES.every((r) => typeof r.build === 'string' && r.build.length >= 4)).toBe(true);
    const host = document.createElement('div');
    renderWhatsNew(host, () => {}, RELEASES, { stamp: 'abc1234' });
    const heads = [...host.querySelectorAll('.release h3')].map((h) => h.textContent);
    expect(heads[0].startsWith(S46_UX_TEXT.releaseHead(RELEASES[0].version, releaseDateText(RELEASES[0].date), 'abc1234'))).toBe(true);
    expect(heads[1].startsWith(`Version 7.1 · ${releaseDateText(RELEASES[1].date)} · build e032f2c`)).toBe(true);   // Version 7.1.1: 7.1 gets its merge commit
    expect(heads[2].startsWith(`Version 7.0 · ${releaseDateText(RELEASES[2].date)} · build 16cda04`)).toBe(true);   // Version 7.1: 7.0 gets its merge commit
    expect(heads[3].startsWith(`Version 6.0.1 · ${releaseDateText(RELEASES[3].date)} · build 4502f53`)).toBe(true);   // Version 7.0: 6.0.1 gets its merge commit
    expect(heads[4].startsWith(`Version 6.0 · ${releaseDateText(RELEASES[4].date)} · build 01da086`)).toBe(true);   // Version 6.0.1: 6.0 gets its merge commit
    expect(heads[5].startsWith(`Version 5.0 · ${releaseDateText(RELEASES[5].date)} · build 486006a`)).toBe(true);   // Version 6.0: 5.0 gets its merge commit
    expect(heads[6].startsWith(`Version 4.7 · ${releaseDateText(RELEASES[6].date)} · build b541f9e`)).toBe(true);   // Version 5.0: 4.7 gets its merge commit
    expect(heads[7].startsWith(`Version 4.6 · ${releaseDateText(RELEASES[7].date)} · build 5bb08e5`)).toBe(true);
    expect(heads[8].startsWith(`Version 4.5 · ${releaseDateText(RELEASES[8].date)} · build b2a5757`)).toBe(true);
    const later = document.createElement('div');                              // the stamp read a moment later
    renderWhatsNew(later, () => {}, RELEASES, { read: async () => 'def5678' });
    expect(later.querySelector('.release h3').textContent.includes('build')).toBe(false);
    await new Promise((res) => setTimeout(res, 0));
    expect(later.querySelector('.release h3').textContent.includes('build def5678')).toBe(true);
    const none = document.createElement('div');                               // and none when it cannot be read
    renderWhatsNew(none, () => {}, RELEASES, { read: async () => null });
    await new Promise((res) => setTimeout(res, 0));
    expect(none.querySelector('.release h3').textContent.includes('build')).toBe(false);
  });
  it('says the 4.6 flood and speed lines as the game does them', () => {
    const r46 = RELEASES.find((r) => r.version === '4.6');   // Version 5.0: the newest entry is 5.0
    const notes = r46.new.join(' ');
    expect(notes.includes('grow more in a high flood and less in a low one')).toBe(true);
    expect(notes.includes('the one in use also says its word')).toBe(true);
    expect(r46.fixed.join(' ').includes('2 of its 4 tiles')).toBe(true);
    expect(BUILDINGS.clay_pit.terrainMin).toBe(2);
  });
});

describe('s46 final river: hunting a lodge can live on (ruling 460)', () => {
  const herd = (w, o) => {
    const h = { id: w.wildlife.nextId++, kind: 'gazelle', size: 6, max: 6, regrow: null, moved: 0, hunted: 0, dir: 1, ...o };
    Object.assign(h, { hx: h.x, hy: h.y, px: h.x, py: h.y });
    w.wildlife.herds.push(h);
    return h;
  };
  it('takes one animal from a herd for 6 game, one a herd a month, never below 2, and says why it rests', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    const lodge = addRaw(w, 'hunting_lodge', 32, 11, { staff: BUILDINGS.hunting_lodge.workers });
    addRaw(w, 'granary', 28, 11, { store: {}, staff: BUILDINGS.granary.workers });
    const h = herd(w, { x: 32, y: 18, size: 3, max: 6 });
    for (let d = 0; d < MONTH; d++) produceDay(w);
    expect([h.size, w.tally.hunted, w.tally.made.game]).toEqual([2, 1, HUNTING.gamePerAnimal]);
    expect([huntingOutlook(w, lodge).left, huntRest(w, lodge)]).toEqual([0, 'herds']);
    h.hunted = 0;                                                             // a new month: the herd is at 2, so the hunters let it be
    for (let d = 0; d < MONTH; d++) produceDay(w);
    expect([h.size, w.tally.made.game, huntRest(w, lodge)]).toEqual([HUNTING.keepAtLeast, HUNTING.gamePerAnimal, 'small']);
    expect(text(riverRows(w, lodge))).toContain(R.huntRest('small'));
    expect(R.huntRule).toContain(`1 animal for ${HUNTING.gamePerAnimal} game`);
    expect(R.huntRule).toContain(`below ${HUNTING.keepAtLeast}`);
    expect(R.huntRule).toContain(WILDLIFE.regrowMonths === 1 ? 'regrows 1 a month' : `every ${WILDLIFE.regrowMonths} months`);
  });
  it('brings at least 10 game a month on average over 5 years from two herds in reach', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    const lodge = addRaw(w, 'hunting_lodge', 32, 11, { staff: BUILDINGS.hunting_lodge.workers });
    const granary = addRaw(w, 'granary', 28, 11, { store: {}, staff: BUILDINGS.granary.workers });
    herd(w, { x: 31, y: 18, size: 5, max: 6 });
    herd(w, { x: 36, y: 18, size: 6, max: 7 });
    expect(herdsInReach(w, lodge).length).toBe(2);
    let game = 0;
    for (let d = 0; d < 5 * YEAR; d++) {
      produceDay(w);
      stepRiver(w, 1);
      game += granary.store.game || 0;
      granary.store.game = 0;                                                // eaten: the granary never fills
    }
    expect(game / 60 >= 10).toBe(true);
    expect(w.wildlife.herds.every((x) => x.size >= HUNTING.keepAtLeast)).toBe(true);
  });
});
