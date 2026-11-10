// Version 9.1 fix wave (rulings 1735-1737): a lesson player's first own city starts on the classic river as the device's first; the raid's card says its speed before
// Play; goals the city already meets at the hand-over complete quietly.
import { describe, it, expect } from '../../harness.js';
import { firstCityLayout } from '../../../src/ui/titleCard.js';
import { tickDay } from '../../../src/sim/clock.js';
import { BEAT_MS } from '../../../src/ui/v60/lesson.js';
import { V91F_TEXT, T } from '../../../src/ui/text.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { for (let t = 0; t < ms; t += 50) { if (fn()) return true; await wait(50); } return fn(); }
const settingsOf = (s) => JSON.parse(s.storage.data['thebes.settings']);
const recordsOf = (s) => JSON.parse(s.storage.data[RECORDS_KEY] || '{"cities":[]}');

// The lesson played to its end and handed over (the raid step's script), the city then its own.
async function handedOver() {
  const s = await pageAt('raid', { width: 1280, height: 800 });
  for (let d = 0; d < 300 && s.api.game().lesson; d++) { s.io.tick(); if (s.g().world.raid.last) break; }
  // Version 9.2 (Track L, ruling 1755): the end card's Keep building this city hands the city over (it was a timer)
  await waitFor(() => Boolean(s.root.querySelector('#sheet .lesson-keep')), 3000);
  const keep = s.root.querySelector('#sheet .lesson-keep');
  if (keep) keep.click();
  await waitFor(() => !s.api.game().lesson, BEAT_MS + 3000);
  return s;
}

describe('v91 fix first: the lesson\'s adopted city is not one the player started (ruling 1735)', () => {
  it('firstCityLayout skips the adopted city\'s row: classic with only it, Surprise me with another', () => {
    const rec = (ids) => ({ load: () => ({ cities: ids.map((id) => ({ id })) }) });
    expect([firstCityLayout(rec(['a']), 'a'), firstCityLayout(rec(['a', 'b']), 'a'), firstCityLayout(rec(['a']), ''), firstCityLayout(rec([]), 'a')]).toEqual(['classic', 'auto', 'auto', 'classic']);
  });

  it('lesson, hand-over, a save: New city opens on the classic river; once that city is saved, the next opens on Surprise me', async () => {
    const s = await handedOver();
    try {
      const own = s.api.game().world;
      expect([Boolean(s.api.game().lesson), settingsOf(s).lessonCityId]).toEqual([false, own.cityId]);
      expect(await s.api.hooks.save()).toBe(true);
      expect(recordsOf(s).cities.map((c) => c.id)).toEqual([own.cityId]);   // the adopted city is in the records now
      expect(firstCityLayout(s.api.records, settingsOf(s).lessonCityId)).toBe('classic');
      s.api.hooks.newCity();
      await frame();
      const second = s.api.game().world;
      expect([second.cityId !== own.cityId, second.mapVariant]).toEqual([true, 'classic']);   // the first city of its own
      expect(await s.api.hooks.save()).toBe(true);
      expect(firstCityLayout(s.api.records, settingsOf(s).lessonCityId)).toBe('auto');       // the second city of its own
    } finally { s.cleanup(); }
  });

  it('I\'ve played before still starts the first city on the classic river, and a city saved then makes the next one Surprise me', async () => {
    const s = await pageAt(null, { width: 390, height: 844 });
    try {
      const skip = s.root.querySelector('.title-card .lesson-skip');
      expect(Boolean(skip)).toBe(true);
      skip.click();
      await frame();
      const own = s.api.game();
      // The city is saved as it starts, so it is the device's first own city and the next New city is its second: Surprise me.
      expect([Boolean(own), own.lesson, own.world.mapVariant, settingsOf(s).lessonCityId || '', firstCityLayout(s.api.records, settingsOf(s).lessonCityId)]).toEqual([true, false, 'classic', '', 'auto']);
    } finally { s.cleanup(); }
  });
});

describe('v91 fix first: the raid card says its speed before Play (ruling 1736)', () => {
  it('a lesson resumed at the raid step: the card says triple speed until the raiders arrive, and a step with no speed of its own does not', async () => {
    const s = await pageAt('raid', { width: 390, height: 844 });
    try {
      const card = s.root.querySelector('.lesson-card');
      expect(Boolean(card) && card.textContent.includes(V91F_TEXT.raidFast)).toBe(true);
    } finally { s.cleanup(); }
    const t = await pageAt('road', { width: 390, height: 844 });
    try {
      const card = t.root.querySelector('.lesson-card');
      expect(Boolean(card) && card.textContent.includes(V91F_TEXT.raidFast)).toBe(false);
    } finally { t.cleanup(); }
  });
});

describe('v91 fix first: goals met at the hand-over complete quietly (ruling 1737)', () => {
  it('the hand-over\'s goals are done at once, with no toast and no message counted, and the next tick adds none', async () => {
    const s = await handedOver();
    try {
      const h = s.api.game(), done = h.world.goals.completed.length;
      expect(done > 0).toBe(true);
      const unread = h.ui.tray.unread();
      const ev = [];
      tickDay(h.world, ev);
      expect([ev.some((e) => e.type === 'goal'), h.world.goals.completed.length]).toEqual([false, done]);
      expect([h.ui.tray.list().some((m) => m.text.startsWith(T.goalDone)), h.ui.tray.unread()]).toEqual([false, unread]);
    } finally { s.cleanup(); }
  });
});
