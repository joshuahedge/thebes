import { describe, it, expect } from '../../harness.js';
import { scoreOf, splitMonths } from '../../../src/sim/score.js';
import { createRecords } from '../../../src/save/records.js';
import { shareLink, emojiRow, parseShareLink } from '../../../src/ui/share.js';
import { openSheet } from '../../../src/ui/modes.js';
import { fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { SCORE_TEXT, SHARE_TEXT, sealQuestion, sealedText, splitCompareText, T } from '../../../src/ui/text.js';

function memory() {
  const data = {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const sheet = (r) => r.root.querySelector('#sheet');
const openSummary = (r) => r.store.set(openSheet(r.store.get(), 'summary'));
const tick = () => new Promise((res) => setTimeout(res, 20));
// Waits up to 6 s for a condition: a loaded machine makes the picture slowly.
async function until(test, tries = 300) { for (let i = 0; i < tries && !test(); i++) await tick(); return test(); }

describe('s3 score seal this reign', () => {
  it('puts Seal this reign, Share score and Screenshot mode in the score section; Screenshot mode hides everything', async () => {
    const r = await rigUI();
    try {
      openSummary(r);
      const buttons = [...sheet(r).querySelectorAll('.score-actions button')].map((b) => b.textContent);
      expect(buttons).toEqual([SCORE_TEXT.sealReign, SCORE_TEXT.shareScore, T.screenshotMode]);
      fire(sheet(r).querySelector('.score-actions .screenshot-mode'), 'click');
      expect([r.store.get().screenshot, r.store.get().sheet]).toEqual([true, null]);
    } finally { r.cleanup(); }
  });
  it('asks first in words that say what sealing does, and Not yet leaves everything as it was', async () => {
    const r = await rigUI();
    try {
      openSummary(r);
      fire(sheet(r).querySelector('.seal-reign'), 'click');
      const s = scoreOf(r.world);
      expect([r.store.get().sheet.kind, sheet(r).querySelector('h2').textContent]).toEqual(['sealReign', T.sealReign]);
      expect(sheet(r).querySelector('.seal-question').textContent).toBe(sealQuestion(s.total, s.medal));
      expect([...sheet(r).querySelectorAll('.actions button')].map((b) => b.textContent)).toEqual([SCORE_TEXT.sealConfirm, SCORE_TEXT.notYet]);
      fire(sheet(r).querySelector('.seal-not-yet'), 'click');
      expect([r.store.get().sheet.kind, r.world.seals.length]).toEqual(['summary', 0]);
    } finally { r.cleanup(); }
  });
  it('words the question with the medal when there is one', () => {
    expect(sealQuestion(247, 'silver')).toBe('Seal this reign? Your chronicle gets score 247 (Silver) for this city. The city carries on.');
    expect(sealQuestion(90, null)).toBe('Seal this reign? Your chronicle gets score 90 for this city. The city carries on.');
  });
  it('seals the reign in the world, writes the chronicle entry, says so, and the city carries on', async () => {
    const records = createRecords({ storage: memory() });
    const r = await rigUI({ hooks: { records }, clock: () => 1760000000000 });
    try {
      r.world.cityId = 'abc';
      r.world.day = 400;
      const s = scoreOf(r.world);
      r.store.set(openSheet(r.store.get(), 'sealReign'));
      fire(sheet(r).querySelector('.seal-confirm'), 'click');
      expect(r.world.seals).toEqual([{ day: 400, score: s.total, parts: s.parts, medal: s.medal, version: 2 }]);
      const [entry] = records.stamps();
      expect([entry.cityId, entry.score, entry.day, entry.date, entry.seed]).toEqual(['abc', s.total, 400, 1760000000000, r.world.seed]);
      expect(r.store.get().sheet.kind).toBe('summary');
      expect(r.root.querySelector('#toasts').textContent).toContain(sealedText(r.world.seals[0]));
      r.store.set(openSheet(r.store.get(), 'sealReign'));
      fire(sheet(r).querySelector('.seal-confirm'), 'click');                         // again: a new entry and a new stamp
      expect([r.world.seals.length, records.stamps().length]).toEqual([2, 2]);
    } finally { r.cleanup(); }
  });
  it('compares each split with the best on this seed and level from the device\'s other cities', async () => {
    const records = createRecords({ storage: memory() });
    const r = await rigUI({ hooks: { records } });
    try {
      r.world.cityId = 'mine';
      const other = { cityId: 'theirs', seed: r.world.seed, difficulty: r.world.difficulty, history: [], splits: { town: 600, market_town: 600 } };
      records.noteCity(other, 1);
      records.noteCity({ ...other, cityId: 'hard-one', difficulty: 'hard', splits: { town: 30 } }, 2);   // another level: not compared
      r.world.splits = { town: 480, market_town: 600, city: 700 };
      openSummary(r);
      const rows = [...sheet(r).querySelectorAll('.split')].map((li) => li.textContent);
      expect(rows).toEqual([splitCompareText('town', 480, 600), splitCompareText('market_town', 600, 600), splitCompareText('city', 700, null)]);
      expect(rows).toEqual(['Town in year 2, month 5: 4 months faster than your best', 'Market town in year 2, month 9: level with your best', 'City in year 2, month 12']);
      expect(splitCompareText('town', 660, 600)).toBe('Town in year 2, month 11: 2 months slower than your best');
    } finally { r.cleanup(); }
  });
});

describe('s3 score share score', () => {
  it('shows the link, the emoji row and friends\' honour, made from the score now', async () => {
    const r = await rigUI();
    try {
      r.world.splits = { town: 420 };
      r.store.set(openSheet(r.store.get(), 'shareScore'));
      const s = scoreOf(r.world);
      const link = shareLink({ seed: r.world.seed, difficulty: r.world.difficulty, parts: s.parts, splits: splitMonths(r.world) });
      expect(sheet(r).querySelector('h2').textContent).toBe(T.shareScore);
      expect(sheet(r).querySelector('.share-link-text').value).toBe(link);
      expect(parseShareLink(new URL(link).hash)).toEqual({ ok: true, seed: r.world.seed, difficulty: 'normal', parts: s.parts, splits: { ...splitMonths(r.world) }, version: 2, older: false, variant: r.world.mapVariant });
      expect(sheet(r).querySelector('.emoji-row').textContent).toBe(emojiRow(s.parts));
      expect(sheet(r).querySelector('.honour').textContent).toBe(SHARE_TEXT.honourHelp);
    } finally { r.cleanup(); }
  });
  it('makes the picture before the tap, then shares it as a file with the words, or downloads it where sharing files is not offered', async () => {
    const shared = [], downloaded = [];
    let filesOk = true;
    const hooks = { share: (d) => { shared.push(d); return Promise.resolve(); }, canShare: () => filesOk, download: (f) => downloaded.push(f) };
    const r = await rigUI({ hooks });
    try {
      r.store.set(openSheet(r.store.get(), 'shareScore'));
      const button = () => sheet(r).querySelector('.share-picture');
      expect(await until(() => !button().disabled)).toBe(true);
      expect(button().textContent).toBe(SHARE_TEXT.sharePicture);
      fire(button(), 'click');
      await until(() => shared.length > 0);
      expect([shared.length, shared[0].files[0].name, shared[0].files[0].type, shared[0].text]).toEqual([1, SHARE_TEXT.fileName, 'image/png', SHARE_TEXT.text(scoreOf(r.world).total, emojiRow(scoreOf(r.world).parts), sheet(r).querySelector('.share-link-text').value)]);
      filesOk = false;
      fire(button(), 'click');
      await until(() => downloaded.length > 0);
      expect([shared.length, downloaded.length, downloaded[0].name]).toEqual([1, 1, SHARE_TEXT.fileName]);
      expect(r.root.querySelector('#toasts').textContent).toContain(SHARE_TEXT.pictureSaved);
    } finally { r.cleanup(); }
  });
  it('shares the link and the rows as words, or copies them where there is no share sheet', async () => {
    const shared = [], copied = [];
    const r = await rigUI({ hooks: { share: (d) => { shared.push(d); return Promise.resolve(); } } });
    try {
      r.store.set(openSheet(r.store.get(), 'shareScore'));
      fire(sheet(r).querySelector('.share-link'), 'click');
      await tick();
      expect(shared[0].text).toContain(sheet(r).querySelector('.share-link-text').value);
      expect(shared[0].text).toContain("friends' honour");
    } finally { r.cleanup(); }
    const c = await rigUI({ hooks: { share: null, clipboard: { writeText: (t) => { copied.push(t); return Promise.resolve(); } } } });
    try {
      c.store.set(openSheet(c.store.get(), 'shareScore'));
      fire(sheet(c).querySelector('.share-link'), 'click');
      await tick();
      expect(copied[0]).toContain(sheet(c).querySelector('.share-link-text').value);
      expect(c.root.querySelector('#toasts').textContent).toContain(SHARE_TEXT.copied);
    } finally { c.cleanup(); }
  });
});
