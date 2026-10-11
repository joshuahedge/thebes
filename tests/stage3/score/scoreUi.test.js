import { describe, it, expect } from '../../harness.js';
import { housesOf } from '../../../src/sim/world.js';
import { scoreOf, scorePreview } from '../../../src/sim/score.js';
import { place } from '../../../src/sim/commands.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { scoreLineFor } from '../../../src/ui/scoreUi.js';
import { openSheet } from '../../../src/ui/modes.js';
import { addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import {
  SCORE_TEXT, scoreReasonText, scoreChipText, medalText, nextMedalText, partBarLabel, factorText, scoreLineText, splitDateText, T,
} from '../../../src/ui/text.js';

const H = 3600 * 1000;
const summary = (r) => { r.store.set(openSheet(r.store.get(), 'summary')); return r.root.querySelector('#sheet .score-section'); };

describe('s3 score words', () => {
  it('words every reason from its fields', () => {
    expect([
      scoreReasonText({ code: 'growth', milestone: 'town', people: 83, of: 150 }),
      scoreReasonText({ code: 'homes', tier: 5 }),
      scoreReasonText({ code: 'jobless', percent: 12 }),
      scoreReasonText({ code: 'routes', n: 0 }),
      scoreReasonText({ code: 'routes', n: 1 }),
      scoreReasonText({ code: 'no_booth', n: 4 }),
      scoreReasonText({ code: 'no_temple', n: 1 }),
      scoreReasonText({ code: 'fire_cover', n: 3, dir: 'east' }),
      scoreReasonText({ code: 'fire_cover', n: 1, dir: null }),
      scoreReasonText({ code: 'towers', need: 3, towers: 1, soldiers: 0 }),
      scoreReasonText({ code: 'towers', need: 1, towers: 0, soldiers: 2 }),
      scoreReasonText({ code: 'burned', n: 1 }),
      scoreReasonText({ code: 'debt', gold: 120 }),
      scoreReasonText(null),
    ]).toEqual([
      'Town: 83 of 150 people', 'Most homes are Townhouses', '12% of workers have no job', 'No trade route yet', 'Only 1 trade route is open',
      '4 homes have no entertainment', '1 home has no temple', 'No staffed firehouse reaches the east streets', 'No staffed firehouse reaches 1 building',
      'A raid this size needs 3 towers; you have 1 working', 'A raid this size needs 1 tower; you have 0 working and 2 soldiers',
      '1 building burned in the last year', 'The treasury is 120 gold in debt', '',
    ]);
    expect([scoreChipText(247), medalText('silver'), medalText(null), nextMedalText({ medal: 'gold', points: 38 }), nextMedalText({ medal: 'bronze', points: 1 }), nextMedalText(null)])
      .toEqual(['Score 247', 'Silver medal', 'No medal yet', '38 points to Gold', '1 point to Bronze', 'The highest medal']);
    expect([partBarLabel('people', 72), factorText(309, 0.8, 'relaxed'), splitDateText('town', 30 * 14), splitDateText('capital', 0)])
      .toEqual(['People: 72 of 100', 'Parts 309 × 0.8 on Relaxed', 'Town in year 2, month 3', 'Capital in year 1, month 1']);
    expect([scoreLineText({ people: 0, prosperity: 0, culture: 3, safety: -1 }), scoreLineText({ people: 0, prosperity: 0, culture: 0, safety: 0 })]).toEqual(['+3 Culture, −1 Safety', '']);
  });
});

describe('s3 score summary and chip', () => {
  it('shows the score, its medal, the points to the next and each part with its bar and reason, as scoreOf has them', async () => {
    const r = await rigUI();
    try {
      const sec = summary(r);
      const s = scoreOf(r.world);
      expect(sec.querySelector('.score-number').textContent).toBe(String(s.total));
      expect(sec.querySelector('.medal').textContent).toBe(medalText(s.medal));
      expect(sec.querySelector('.next-medal').textContent).toBe(nextMedalText(s.next));
      expect(sec.querySelector('.factor')).toBe(null);                                  // Normal: no factor line
      const rows = [...sec.querySelectorAll('.score-part')];
      expect(rows.map((li) => li.dataset.part)).toEqual(['people', 'prosperity', 'culture', 'safety']);
      for (const li of rows) {
        const part = li.dataset.part;
        expect([part, li.querySelector('.part-number').textContent]).toEqual([part, String(s.parts[part])]);
        const bar = li.querySelector('[role="progressbar"]');
        expect([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-label')]).toEqual([String(s.parts[part]), partBarLabel(part, s.parts[part])]);
        const reason = li.querySelector('.reason');
        expect([part, reason ? reason.textContent : '']).toEqual([part, scoreReasonText(s.reasons[part])]);
      }
      expect(sec.querySelector('.splits')).toBe(null);
      expect(sec.textContent).toContain(SCORE_TEXT.noSplits);
    } finally { r.cleanup(); }
  });
  it('follows the city: homes that lose their bazaar change Culture\'s number and its reason, and the level shows its factor', async () => {
    const r = await rigUI();
    try {
      const bazaar = Object.values(r.world.buildings).find((b) => b.type === 'bazaar');   // it reaches both homes
      let sec = summary(r);
      const before = sec.querySelector('[data-part="culture"] .part-number').textContent;
      bazaar.paused = true;
      r.ui.afterCommand({ kind: 'pause', result: { ok: true }, undoable: false });
      sec = r.root.querySelector('#sheet .score-section');
      const s = scoreOf(r.world);
      expect(sec.querySelector('[data-part="culture"] .part-number').textContent).toBe(String(s.parts.culture));
      expect(Number(before) > s.parts.culture).toBe(true);
      expect(sec.querySelector('[data-part="culture"] .reason').textContent).toBe(scoreReasonText(s.reasons.culture));
      r.world.difficulty = 'relaxed';
      r.ui.afterCommand({ kind: 'pause', result: { ok: true }, undoable: false });
      sec = r.root.querySelector('#sheet .score-section');
      const t = scoreOf(r.world);
      expect(sec.querySelector('.factor').textContent).toBe(factorText(t.raw, 0.8, 'relaxed'));
      expect(sec.querySelector('.score-number').textContent).toBe(String(t.total));
    } finally { r.cleanup(); }
  });
  it('lists the milestones reached as game dates', async () => {
    const r = await rigUI();
    try {
      r.world.splits = { town: 400, market_town: 700 };
      const sec = summary(r);
      expect([...sec.querySelectorAll('.split')].map((li) => li.textContent)).toEqual([splitDateText('town', 400), splitDateText('market_town', 700)]);
    } finally { r.cleanup(); }
  });
  it('keeps the live total in a chip on the summary button, refreshed after a command and a game day', async () => {
    const r = await rigUI();
    try {
      const chip = r.root.querySelector('#topbar .stats .score-chip');
      expect([chip.hidden, chip.textContent]).toEqual([false, scoreChipText(scoreOf(r.world).total)]);
      place(r.world, 'temple', 8, 11);
      assignLabour(r.world);
      r.ui.afterCommand({ kind: 'building', result: { ok: true }, undoable: false });
      expect(chip.textContent).toBe(scoreChipText(scoreOf(r.world).total));
      for (const h of housesOf(r.world)) h.residents = 0;
      r.world.day += 1;
      r.frame(1);
      expect(chip.textContent).toBe(scoreChipText(scoreOf(r.world).total));
    } finally { r.cleanup(); }
  });
  it('keeps the chip inside the top bar and off the numbers, on a phone and a laptop, at every text size', async () => {
    for (const [w, h] of [[360, 640], [390, 844], [844, 390], [1280, 800]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          r.world.gold = 2493;
          r.ui.refresh();
          const bar = r.root.querySelector('#topbar').getBoundingClientRect();
          const chip = r.root.querySelector('#topbar .score-chip').getBoundingClientRect();
          const hits = [...r.root.querySelectorAll('#topbar .stat')].filter((st) => getComputedStyle(st).display !== 'none').filter((st) => {
            const q = st.getBoundingClientRect();
            return q.left < chip.right && chip.left < q.right && q.top < chip.bottom && chip.top < q.bottom;
          }).map((st) => st.className);
          const at = `${w}x${h} at ${size}%`;
          expect([at, chip.top >= bar.top, chip.bottom <= bar.bottom, hits]).toEqual([at, true, true, []]);
        } finally { r.cleanup(); }
      }
    }
  });
});

describe('s3 score previews in the confirm bar', () => {
  it('gives the bar the parts a ghost would change, as scorePreview counts them, and memoises them', async () => {
    const r = await rigUI();
    try {
      for (const h of housesOf(r.world)) { h.tier = 3; h.residents = 10; }
      addRaw(r.world, 'house', 18, 9, { tier: 3, residents: 10 });
      r.world.buildings[Object.values(r.world.buildings).find((b) => b.type === 'temple').id].paused = true;
      const want = scoreLineText(scorePreview(r.world, 'temple', 16, 11));
      expect(want.startsWith('+')).toBe(true);
      expect(scoreLineFor(r.world, 'temple', 16, 11)).toBe(want);
      expect(scoreLineFor(r.world, 'temple', 16, 11)).toBe(want);                       // from the memo
      r.ui.placement.start({ kind: 'building', type: 'temple' }, { x: 16, y: 11 });
      r.ui.placement.moveGhost(16, 11);
      expect(r.ui.placement.preview().score).toBe(want);
      expect(r.root.querySelector('.confirm .effect').textContent).toContain(want);
    } finally { r.cleanup(); }
  });
});

describe('s3 score welcome back', () => {
  it('shows the score and its trend against month-end rows that hold one', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      const now = scoreOf(r.world).total;
      r.world.history = [
        { day: 30, people: 4, gold: 0, mood: 60 },                                       // from a version 3 save: no score
        { day: 60, people: 4, gold: 0, mood: 60, score: now - 20, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 } },
      ];
      r.ui.refresh();
      const rows = [...r.root.querySelectorAll('#sheet .trends li')];
      expect(rows.length).toBe(4);
      expect(rows[3].textContent).toContain(`${SCORE_TEXT.score} ${now}, ${T.upFrom} ${now - 20}`);
      expect(rows[3].querySelector('.trend.up').textContent).toBe('▲');
    } finally { r.cleanup(); }
  });
});
