// Version 9.0 Track L (rulings 1588-1590): rivals. A link with a name is kept as a rival on its map (the same name there replaces the older row, at most 50), the title
// card's panel names it, and at a new split the newest rival on the map is compared in a toast: months ahead or behind, silent in the lesson. The Pass sheet's side by
// side is passSheetExtras, tested on its own body element.
import { describe, it, expect } from '../../harness.js';
import { createRecords, RIVALS_MAX } from '../../../src/save/records.js';
import { RECORDS_KEY, SCORE_FACTOR } from '../../../src/data/scoring.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { titleDecor } from '../../../src/ui/scoreUi.js';
import { shareLink } from '../../../src/ui/share.js';
import { onSplit, rivalSplitText } from '../../../src/ui/v90/rivalToast.js';
import { passSheetExtras } from '../../../src/ui/v90/passSheet.js';
import { createWorld } from '../../../src/sim/world.js';
import { scoreOf } from '../../../src/sim/score.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { V90_L_TEXT, TITLE_SCORE_TEXT } from '../../../src/ui/text.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { mount, fire } from '../../helpers/dom.js';

function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const PARTS = { people: 80, prosperity: 60, culture: 40, safety: 50, monuments: 30 };
const RIVAL_SCORE = Math.round(Object.values(PARTS).reduce((a, b) => a + b, 0) * SCORE_FACTOR.normal);   // addRival's own sum for a link that carries no score
const linkHash = (o = {}) => { const t = shareLink({ seed: 11, difficulty: 'normal', parts: PARTS, splits: { town: 6, city: 20 }, ...o }); return t.slice(t.indexOf('#')); };

// The title card decorated by titleDecor with the page's hash.
function title({ records, shared }) {
  const m = mount('<div id="title" hidden></div>');
  const container = m.root.querySelector('#title');
  createTitleCard({ container, hasSave: false, onContinue() {}, onNewCity() {}, decorate: titleDecor({ records, shared, startSeed() {}, setDifficulty() {}, clock: () => 777, dpr: 1 }) });
  return { container, cleanup: m.cleanup };
}

describe('v90 l rivals: kept from a link', () => {
  it('keeps a link with a name as a rival and says so on the title card, naming the heir', () => {
    const storage = memory(), records = createRecords({ storage });
    const t = title({ records, shared: linkHash({ name: 'Ana', heir: 'merchant' }) });
    try {
      const card = t.container.querySelector('.shared-score');
      expect(card.querySelector('.rival-line').textContent).toBe(`Ana (heir of the Merchant): ${RIVAL_SCORE}`);
      expect(card.querySelector('.rival-kept').textContent).toBe('Kept as your rival on this map');
      expect(card.querySelector('.beat').nextElementSibling.classList.contains('rival-line')).toBe(true);   // under "Beat N?"
      const kept = records.rivalsFor(11, 'normal');
      expect([kept.length, kept[0].name, kept[0].heir, kept[0].added, kept[0].splits.town, kept[0].splits.city, kept[0].splits.pyramids === undefined]).toEqual([1, 'Ana', 'merchant', 777, 6, 20, true]);
    } finally { t.cleanup(); }
  });
  it('shows nothing about a rival for a link without a name, and keeps none', () => {
    const records = createRecords({ storage: memory() });
    const t = title({ records, shared: linkHash() });
    try {
      expect(t.container.querySelector('.shared-score .friend-line')).toBeTruthy();
      expect([t.container.querySelector('.rival-line'), t.container.querySelector('.rival-kept')]).toEqual([null, null]);
      expect(records.rivalsFor(11, 'normal')).toEqual([]);
    } finally { t.cleanup(); }
  });
  it('replaces the same name on the same map, and keeps the same name on another map as another rival', () => {
    const records = createRecords({ storage: memory() });
    const open = (hash, now) => { const m = title({ records, shared: hash }); m.cleanup(); return now; };
    open(linkHash({ name: 'Ana', heir: 'merchant' }));
    open(linkHash({ name: 'Ana', heir: 'builder', parts: { ...PARTS, people: 99 } }));
    const kept = records.rivalsFor(11, 'normal');
    expect([kept.length, kept[0].heir, kept[0].parts.people]).toEqual([1, 'builder', 99]);
    open(linkHash({ name: 'Ana', heir: 'builder', seed: 12 }));
    open(linkHash({ name: 'Ana', heir: 'builder', variant: 'east' }));
    open(linkHash({ name: 'Bo', heir: 'steady' }));
    expect([records.rivalsFor(11, 'normal').length, records.rivalsFor(12, 'normal').length, records.rivalsFor(11, 'normal', 'east').length]).toEqual([2, 1, 1]);
  });
  it('keeps at most 50 rivals, the oldest added going first, and never one on the map being played', () => {
    const records = createRecords({ storage: memory() });
    const link = (i) => ({ ok: true, name: `Rival${i}`, heir: 'steady', seed: 100 + i, difficulty: 'normal', variant: 'classic', parts: PARTS });
    const playing = createWorld({ seed: 100, difficulty: 'normal' });                  // Rival0's map: the oldest, but it is being played
    for (let i = 0; i < 60; i++) records.addRival(link(i), 1000 + i, { playing });
    const names = (seed) => records.rivalsFor(seed, 'normal').map((v) => v.name);
    const all = [...Array(60).keys()].map((i) => names(100 + i)).flat();
    expect([RIVALS_MAX, all.length]).toEqual([50, 50]);
    expect(names(100)).toEqual(['Rival0']);
    expect([all.includes('Rival1'), all.includes('Rival10'), all.includes('Rival11'), all.includes('Rival59')]).toEqual([false, false, true, true]);
  });
});

describe('v90 l rivals: the toast at a new split', () => {
  const rivalOn = (records, world, over = {}, now = 10) => records.addRival({ ok: true, name: 'Ana', heir: 'merchant', seed: world.seed, difficulty: world.difficulty, variant: world.mapVariant, size: world.mapSize, parts: PARTS, splits: { town: 6, city: 20, pyramids: 40, ...over } }, now);
  const ctxOf = (records) => { const shown = []; return { shown, ctx: { hooks: { records }, toasts: { show: (t) => shown.push(t) } } }; };
  const worldWith = (splits) => { const w = createWorld({ seed: 11, difficulty: 'normal' }); w.splits = { ...w.splits, ...splits }; return w; };

  it('says how many months ahead of or behind the newest rival on the map, level, or that they have not got there', () => {
    const records = createRecords({ storage: memory() });
    const w = worldWith({ town: 4 * 30, city: 20 * 30 + 5, pyramids: 40 * 30, great_pyramid: 50 * 30 });
    rivalOn(records, w);
    const { shown, ctx } = ctxOf(records);
    onSplit(w, 'town', ctx);          // their month 6, mine 4: two months ahead of Ana
    onSplit(w, 'city', ctx);          // their 20, mine 20 (day 605 is month 20): level
    onSplit(w, 'pyramids', ctx);      // their 40, mine 40: level, with the pyramids' own name
    onSplit(w, 'great_pyramid', ctx); // Ana's link never reached it
    expect(shown).toEqual(['Town: 2 months ahead of Ana', 'City: level with Ana', 'Pyramids unlocked: level with Ana', 'Great pyramid finished: Ana has not got there yet']);
    const late = worldWith({ town: 9 * 30 });
    expect(rivalSplitText(late, 'town', rivalOn(records, late, {}, 20))).toBe('Town: 3 months behind Ana');
    expect(rivalSplitText(worldWith({}), 'town', { name: 'Ana', splits: { town: 6 } })).toBe(null);   // the city has not recorded it
  });
  it('compares only the newest rival added on the map, and a map with none is silent', () => {
    const records = createRecords({ storage: memory() });
    const w = worldWith({ town: 4 * 30 });
    rivalOn(records, w, { town: 6 }, 10);
    records.addRival({ ok: true, name: 'Bo', heir: 'steady', seed: 11, difficulty: 'normal', variant: w.mapVariant, size: w.mapSize, parts: PARTS, splits: { town: 3 } }, 20);
    const { shown, ctx } = ctxOf(records);
    onSplit(w, 'town', ctx);
    expect(shown).toEqual(['Town: 1 month behind Bo']);
    const other = createWorld({ seed: 12, difficulty: 'normal' }); other.splits.town = 100;
    const a = ctxOf(records); onSplit(other, 'town', a.ctx);
    expect(a.shown).toEqual([]);
    const none = ctxOf(createRecords({ storage: memory() })); onSplit(w, 'town', none.ctx);
    expect(none.shown).toEqual([]);
  });
  it('is silent in the lesson, even on a device that keeps a rival on seed 7', () => {
    const records = createRecords({ storage: memory() });
    const lesson = createWorld({ seed: 7, difficulty: 'normal' }); lesson.lesson = { step: 1 }; lesson.splits.town = 30;
    rivalOn(records, lesson, { town: 6 });
    const { shown, ctx } = ctxOf(records);
    onSplit(lesson, 'town', ctx);
    delete lesson.lesson;
    expect(shown).toEqual([]);
    onSplit(lesson, 'town', ctx);                                                      // the same city, no longer the lesson, does toast: the silence is the lesson's
    expect(shown.length).toBe(1);
  });
  it('reaches the interface: a split recorded after it opened toasts once, one a loaded city already had never does', async () => {
    const records = createRecords({ storage: memory() });
    const world = uiWorld();
    world.splits.town = 100;                                                           // the city already had Town when the interface opened
    rivalOn(records, world, { town: 6 });
    const rig = await rigUI({ world, hooks: { records } });
    try {
      const texts = () => [...rig.root.querySelectorAll('#toasts .toast .text')].map((n) => n.textContent);
      rig.ui.onEvents([]);
      expect(texts().filter((t) => /Ana/.test(t))).toEqual([]);
      world.splits.city = 5 * 30;
      rig.ui.onEvents([]);
      rig.ui.onEvents([]);
      expect(texts().filter((t) => /Ana/.test(t))).toEqual(['City: 15 months ahead of Ana']);
    } finally { rig.cleanup(); }
  });
});

describe('v90 l rivals: the side by side', () => {
  const city = () => { const w = createWorld({ seed: 11, difficulty: 'normal', heir: 'builder' }); buildSampleCity(w); return w; };
  it('draws two scores, five paired bars with numbers and each side\'s heir into a body of its own', () => {
    const records = createRecords({ storage: memory() }), w = city();
    records.addRival({ ok: true, name: 'Ana', heir: 'merchant', seed: 11, difficulty: 'normal', variant: w.mapVariant, size: w.mapSize, parts: PARTS, splits: {} }, 1);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      passSheetExtras(body, w, { records });
      const mine = scoreOf(w);
      expect(body.querySelector('h3').textContent).toBe('Side by side with Ana');
      expect([...body.querySelectorAll('.sbs-side')].map((p) => p.textContent.replace(/\s+/g, ' ').trim())).toEqual([`You ${mine.total} Heir of the Builder`, `Ana ${RIVAL_SCORE} Heir of the Merchant`]);
      const rows = [...body.querySelectorAll('.sbs-part')];
      expect(rows.length).toBe(5);
      rows.forEach((li) => {
        const part = li.dataset.part;
        const nums = [...li.querySelectorAll('.sbs-number')].map((n) => n.textContent);
        expect(nums).toEqual([String(mine.parts[part]), String(PARTS[part])]);
        expect([...li.querySelectorAll('.sbs-name')].map((n) => n.textContent)).toEqual(['You', 'Ana']);   // the side is named in words, beside its bar
        expect([...li.querySelectorAll('.fill')].map((f) => f.style.width)).toEqual([`${mine.parts[part]}%`, `${PARTS[part]}%`]);
      });
    } finally { cleanup(); }
  });
  it('draws nothing for a map with no rival, and the same for the Steady as for an heir', () => {
    const records = createRecords({ storage: memory() });
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      passSheetExtras(body, city(), { records });
      passSheetExtras(body, city(), {});
      expect(body.childNodes.length).toBe(0);
      const steady = createWorld({ seed: 11, difficulty: 'normal' }); buildSampleCity(steady);
      records.addRival({ ok: true, name: 'Ana', heir: 'steady', seed: 11, difficulty: 'normal', variant: steady.mapVariant, size: steady.mapSize, parts: { people: 50, prosperity: 50, culture: 50, safety: 50 }, version: 1, splits: {} }, 1);
      passSheetExtras(body, steady, { records });
      expect(body.querySelector('.sbs-side.you .sbs-heir').textContent).toBe('Heir of the Steady');
      const old = body.querySelector('.sbs-part[data-part="monuments"] .sbs-line.rival .sbs-number');
      expect(old.textContent).toBe('not scored');                                    // a score v1 rival has four parts
    } finally { cleanup(); }
    expect(TITLE_SCORE_TEXT.beat(1)).toBe('Beat 1?');
    expect(V90_L_TEXT.sideHead('Ana')).toBe('Side by side with Ana');
  });
});
