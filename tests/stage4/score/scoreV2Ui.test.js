import { describe, it, expect } from '../../harness.js';
import { scoreOf } from '../../../src/sim/score.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { createRecords } from '../../../src/save/records.js';
import { shareCheck } from '../../../src/ui/share.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { titleDecor } from '../../../src/ui/scoreUi.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { SCORE_TEXT, SCORE4_TEXT, TITLE_SCORE_TEXT, T, score4ReasonText, score4SplitText } from '../../../src/ui/text.js';

const H = 3600 * 1000;
function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const summary = (r) => { r.store.set(openSheet(r.store.get(), 'summary')); return r.root.querySelector('#sheet .score-section'); };
function card(records, shared = '') {
  const m = mount('<div id="title" hidden></div>');
  const container = m.root.querySelector('#title');
  createTitleCard({ container, hasSave: true, onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty() {},
    decorate: titleDecor({ records, shared, startSeed() {}, clock: () => new Date(2026, 9, 11, 12).getTime(), dpr: 1 }) });
  return { container, cleanup: m.cleanup };
}
const t1Link = (seed, parts, splits) => { const body = `t1.${seed}.n.${parts}.${splits}`; return `#${body}.${shareCheck(body)}`; };

describe('s4 score summary and title card', () => {
  it('shows the Monuments part\'s next step and the seven splits in the summary', async () => {
    const r = await rigUI();
    try {
      r.world.milestone = 'capital';
      r.world.splits = { town: 400, market_town: 700, city: 1000, great_city: 1500, capital: 2000, pyramids: 4000, great_pyramid: 9000 };
      r.ui.refresh();                                                   // the score is measured once per refresh
      const sec = summary(r);
      const s = scoreOf(r.world);
      expect(sec.querySelector('[data-part="monuments"] .reason').textContent).toBe(score4ReasonText(s.reasons.monuments));
      expect(sec.querySelector('[data-part="monuments"] .reason').textContent).toBe('No monument yet: found a small obelisk (City)');
      const splits = [...sec.querySelectorAll('.split')];
      expect(splits.map((li) => li.dataset.id)).toEqual(['town', 'market_town', 'city', 'great_city', 'capital', 'pyramids', 'great_pyramid']);
      expect(splits[5].textContent).toBe(score4SplitText('pyramids', 4000, null));
      expect(splits[6].textContent.startsWith(SCORE4_TEXT.splitNames.great_pyramid)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('compares a t1 link only with your best from score v1, and says it is older scoring', () => {
    const records = createRecords({ storage: memory({ version: 1, cities: [
      { id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 210, bestDay: 900, medal: 'bronze', splits: {}, updated: 2, older: { best: 300, bestDay: 30, medal: 'gold', scoreVersion: 1 } },
    ], chronicle: [] }) });
    const c = card(records, t1Link(11, '70-60-50-40', '3-x-x-x-x'));
    try {
      expect(c.container.querySelector('.friend-older').textContent).toBe(SCORE4_TEXT.olderLink);
      expect(c.container.querySelector('.your-best').textContent).toBe('Your best here under older scoring: 300');
      expect([...c.container.querySelectorAll('.best-line')].map((p) => p.textContent)).toEqual(['Best: 300, gold, seed 11, Normal, older scoring', 'Best: 210, bronze, seed 11, Normal']);
    } finally { c.cleanup(); }
    const none = card(createRecords({ storage: memory() }), t1Link(11, '70-60-50-40', '3-x-x-x-x'));
    try {
      expect(none.container.querySelector('.your-best').textContent).toBe('You have no older-scoring score on this seed and level');
    } finally { none.cleanup(); }
  });
  it('draws a glyph on a stamp for each mastaba and pyramid finished, and names them', () => {
    const entry = (id, date, built) => ({ id, cityId: 'c', seed: 5, difficulty: 'normal', day: 1, score: 330, parts: {}, splits: {}, medal: 'silver', feats: [], version: 2, date, ...(built ? { built } : {}) });
    const records = createRecords({ storage: memory({ version: 1, cities: [], chronicle: [entry('x', 2, ['mastaba_small', 'pyramid_small', 'pyramid_small']), entry('y', 1, null)] }) });
    const c = card(records);
    try {
      const [withGlyphs, plain] = [...c.container.querySelectorAll('.stamp')];
      expect([withGlyphs.getAttribute('aria-label'), plain.getAttribute('aria-label')])
        .toEqual([`${TITLE_SCORE_TEXT.stampLabel(entry('x', 2))}, with a small mastaba and 2 small pyramids`, TITLE_SCORE_TEXT.stampLabel(entry('y', 1))]);
      const ink = (canvas) => { const d = canvas.getContext('2d').getImageData(20, 31, 1, 1).data; return d[0] + d[1] + d[2]; };
      expect(ink(withGlyphs)).toBeLessThan(ink(plain));                 // a dark glyph at the stamp's foot, where the plain one shows map
    } finally { c.cleanup(); }
  });
  it('compares the score trend in Welcome back only with rows of this score version', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      const now = scoreOf(r.world).total;
      r.world.history = [{ day: 60, people: 4, gold: 0, mood: 60, score: now + 40, parts: { people: 25, prosperity: 25, culture: 25, safety: 25 } }];   // a v1 row
      r.ui.refresh();
      let row = [...r.root.querySelectorAll('#sheet .trends li')][3];
      expect([row.textContent, row.querySelector('.trend')]).toEqual([`${SCORE_TEXT.score} ${now}`, null]);   // no drop shown against v1
      r.world.history.push({ day: 90, people: 4, gold: 0, mood: 60, score: now - 5, parts: { people: 0, prosperity: 0, culture: 0, safety: 0, monuments: 0 }, version: 2 });
      r.ui.refresh();
      row = [...r.root.querySelectorAll('#sheet .trends li')][3];
      expect(row.textContent).toContain(`${SCORE_TEXT.score} ${now}, ${T.upFrom} ${now - 5}`);
    } finally { r.cleanup(); }
  });
});
