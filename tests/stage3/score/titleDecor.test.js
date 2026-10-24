import { describe, it, expect } from '../../harness.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { titleDecor } from '../../../src/ui/scoreUi.js';
import { createRecords } from '../../../src/save/records.js';
import { shareLink, sharedTotal, parseShareLink } from '../../../src/ui/share.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { mount, fire } from '../../helpers/dom.js';
import { mountShell } from '../../helpers/uiWorld.js';
import { TITLE_SCORE_TEXT, T } from '../../../src/ui/text.js';

const OCT_11_2026 = new Date(2026, 9, 11, 12).getTime();
function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const row = (id, seed, difficulty, best, medal, updated = 1) => ({ id, seed, difficulty, scoreVersion: 2, best, bestDay: 900, medal, splits: {}, updated });
const entry = (n, seed, score, medal) => ({ id: `c:${n}:1`, cityId: 'c', seed, difficulty: 'normal', day: 1, score, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 }, splits: {}, medal, feats: [], version: 1, date: n });
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };   // Stage 4: a t2 link's five parts

// A title card decorated by titleDecor; started records the seeds Start this seed and This week's Nile asked for.
function card({ hasSave = true, records = null, shared = '', root = null } = {}) {
  const m = root ? { root, cleanup() {} } : mount('<div id="title" hidden></div>');
  const container = m.root.querySelector('#title');
  const started = [], levels = [];
  createTitleCard({ container, hasSave, onContinue() {}, onNewCity() {}, onSound() {},
    decorate: titleDecor({ records, shared, startSeed: (s) => started.push(s), setDifficulty: (l) => levels.push(l), clock: () => OCT_11_2026, dpr: 1 }) });   // Version 8.0: the level tiles are on the new-city card, so Start this seed keeps the link's level through setDifficulty alone
  return { container, started, levels, cleanup: m.cleanup };
}

describe('s3 score title card', () => {
  it('lists the three highest bests under Continue, and a stamp per sealed reign', () => {
    const records = createRecords({ storage: memory({ version: 1, cities: [
      row('a', 11, 'normal', 312, 'gold'), row('b', 7, 'hard', 250, 'bronze'), row('c', 9, 'relaxed', 120, null), row('d', 3, 'normal', 90, null),
    ], chronicle: [entry(1, 11, 247, 'silver'), entry(2, 7, 300, 'gold')] }) });
    const c = card({ records });
    try {
      const box = c.container.querySelector('.title-records');
      expect(box.previousElementSibling.classList.contains('continue')).toBe(true);
      expect([...box.querySelectorAll('.best-line')].map((p) => p.textContent)).toEqual(['Best: 312, gold, seed 11, Normal', 'Best: 250, bronze, seed 7, Hard', 'Best: 120, seed 9, Relaxed']);
      const stamps = [...box.querySelectorAll('.stamp')];
      expect(stamps.map((s) => s.getAttribute('aria-label'))).toEqual(['Sealed reign: score 300, gold, seed 7', 'Sealed reign: score 247, silver, seed 11']);
      expect([stamps[0].getAttribute('role'), stamps[0].width]).toEqual(['img', 40]);
    } finally { c.cleanup(); }
  });
  it('says a best made under an older score version is older scoring, and shows the newest eight stamps then how many more', () => {
    const chronicle = [];
    for (let i = 1; i <= 10; i++) chronicle.push(entry(i, 5, 100 + i, null));
    const records = createRecords({ storage: memory({ version: 1, cities: [{ ...row('a', 5, 'normal', 200, 'bronze'), scoreVersion: 0 }], chronicle }) });
    const c = card({ records });
    try {
      expect(c.container.querySelector('.best-line').textContent).toBe('Best: 200, bronze, seed 5, Normal, older scoring');
      expect(c.container.querySelectorAll('.stamp').length).toBe(8);
      expect(c.container.querySelector('.stamp').getAttribute('aria-label')).toBe('Sealed reign: score 110, seed 5');
      expect(c.container.querySelector('.more-stamps').textContent).toBe('+2 more');
    } finally { c.cleanup(); }
  });
  it('shows no records block on a device with none, and on one whose storage is blocked', () => {
    const blocked = createRecords({ storage: { getItem: () => { throw new Error('no'); }, setItem() {} } });
    for (const records of [null, createRecords({ storage: memory() }), blocked]) {
      const c = card({ records });
      try { expect(c.container.querySelector('.title-records')).toBe(null); } finally { c.cleanup(); }
    }
  });
  it('no longer offers This week\'s Nile (Version 6.0, ruling 742): no weekly button, hint or seed on the card', () => {
    const c = card({ hasSave: false });
    try {
      expect([c.container.querySelector('.weekly'), c.container.querySelector('.title-weekly'), c.container.querySelector('.weekly-hint')]).toEqual([null, null, null]);
      expect(c.container.textContent.includes('This week')).toBe(false);
      expect(c.started).toEqual([]);
    } finally { c.cleanup(); }
  });
  it('opens a shared score: the friend\'s score and parts, the best on that seed and level, Beat N? and Start this seed on its level', () => {
    const link = shareLink({ seed: 202641, difficulty: 'hard', parts: PARTS, splits: {} });
    const total = sharedTotal(parseShareLink(new URL(link).hash));
    const records = createRecords({ storage: memory({ version: 1, cities: [row('a', 202641, 'hard', 230, 'bronze'), row('b', 202641, 'normal', 280, 'silver')], chronicle: [] }) });
    const c = card({ records, shared: new URL(link).hash });
    try {
      const sec = c.container.querySelector('.shared-score');
      expect(sec.nextElementSibling.classList.contains('title-buttons')).toBe(true);
      expect([...sec.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
        `${total} on seed 202641, Hard. Friends' honour`, 'People 72 · Prosperity 65 · Culture 58 · Safety 40 · Monuments 36', 'Your best here: 230', `Beat ${total}?`,
        'It starts on Hard, the level of the shared score.',
      ]);
      expect(total).toBe(Math.round(271 * 1.25));
      fire(sec.querySelector('.start-seed'), 'click');
      expect([c.levels, c.started]).toEqual([['hard'], [202641]]);
    } finally { c.cleanup(); }
    const none = card({ shared: new URL(link).hash });
    try { expect(none.container.querySelector('.your-best').textContent).toBe(TITLE_SCORE_TEXT.yourBest(null)); } finally { none.cleanup(); }
  });
  it('says a bad or newer link cannot be read and opens the card as usual; any other hash does nothing', () => {
    const hash = new URL(shareLink({ seed: 4, difficulty: 'normal', parts: PARTS, splits: {} })).hash;
    for (const [shared, words] of [[hash.replace('72-65', '71-65'), TITLE_SCORE_TEXT.badLink], [hash.replace('#t2', '#t9'), TITLE_SCORE_TEXT.newerLink], ['#t1.junk', TITLE_SCORE_TEXT.badLink]]) {
      const c = card({ shared });
      try {
        expect([c.container.querySelector('.shared-bad').textContent, c.container.querySelector('.shared-score')]).toEqual([words, null]);
        expect(c.container.querySelector('.new-city')).toBeTruthy();
      } finally { c.cleanup(); }
    }
    const plain = card({ shared: '#welcome' });
    try { expect([plain.container.querySelector('.shared-bad'), plain.container.querySelector('.shared-score')]).toEqual([null, null]); } finally { plain.cleanup(); }
  });
  it('hides the friend\'s score while a panel (the new-city question or the install guide) takes the buttons\' place', async () => {
    const hash = new URL(shareLink({ seed: 9, difficulty: 'normal', parts: PARTS, splits: {} })).hash;
    const shell = await mountShell(390, 844);
    const container = shell.root.querySelector('#title');
    const tc = createTitleCard({ container, hasSave: true, onContinue() {}, onNewCity() {}, onSound() {},
      decorate: titleDecor({ shared: hash, clock: () => OCT_11_2026, dpr: 1 }) });
    try {
      const sec = container.querySelector('.shared-score');
      expect(getComputedStyle(sec).display).toBe('flex');
      tc.showPanel((body) => body.append('Start a new city?'));
      expect(getComputedStyle(sec).display).toBe('none');
      tc.showCard();
      expect(getComputedStyle(sec).display).toBe('flex');
    } finally { tc.destroy(); shell.cleanup(); }
  });
  it('keeps the whole card reachable and every button 44 px on small phones, with a shared score and records', async () => {
    const link = new URL(shareLink({ seed: 202641, difficulty: 'normal', parts: PARTS, splits: {} })).hash;
    const records = createRecords({ storage: memory({ version: 1, cities: [row('a', 11, 'normal', 312, 'gold'), row('b', 7, 'hard', 250, 'bronze'), row('c', 9, 'relaxed', 120, null)], chronicle: [entry(1, 11, 247, 'silver')] }) });
    for (const [w, h, size] of [[360, 640, 100], [360, 640, 150], [844, 390, 100], [390, 844, 125]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const c = card({ records, shared: link, root: shell.root });
      try {
        const box = shell.root.querySelector('.title-card').getBoundingClientRect();
        const outer = shell.root.getBoundingClientRect();
        const cardEl = shell.root.querySelector('.title-card');
        const at = `${w}x${h} at ${size}%`;
        expect([at, box.top >= outer.top - 0.5, box.bottom <= outer.bottom + 0.5, cardEl.scrollHeight <= cardEl.clientHeight + 1 || getComputedStyle(cardEl).overflowY === 'auto'])
          .toEqual([at, true, true, true]);
        for (const b of cardEl.querySelectorAll('button:not([hidden])')) {
          const r = b.getBoundingClientRect();
          expect([at, b.textContent, r.width >= 44, r.height >= 44]).toEqual([at, b.textContent, true, true]);
        }
      } finally { c.cleanup(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
  });
});
