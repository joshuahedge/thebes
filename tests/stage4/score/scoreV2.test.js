import { describe, it, expect } from '../../harness.js';
import { scoreOf, monumentPreview, medalFor } from '../../../src/sim/score.js';
import { prestigeOf, updatePrestigeUnlocks } from '../../../src/sim/monuments.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { scoreLineFor } from '../../../src/ui/scoreUi.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { score4ReasonText, score4MonumentLine, score4SplitText, splitCompareText } from '../../../src/ui/text.js';

// A desert street on y = 10 at the given milestone (fertile land is x < 8 in the test world).
function street(milestone = 'city') {
  const w = makeTestWorld({ gold: 100000 });
  setRoad(w, 8, 10, 31, 10);
  w.milestone = milestone;
  return w;
}
// A monument standing by hand: `course` courses laid, finished on day `done` (or a site under way when done is null).
function monument(w, type, x, y, course, done = null) {
  const b = addRaw(w, type, x, y);
  Object.assign(b.site, { course, done });
  return b;
}
const finished = (w, type, x, y) => monument(w, type, x, y, MONUMENTS[type].courses.length, 30);
const reason = (w) => scoreOf(w).reasons.monuments;
const words = (w) => score4ReasonText(reason(w));

describe('s4 score Monuments part', () => {
  it('names the next step before City, at City and with every kind but the pyramids standing', () => {
    const w = street('market_town');
    expect([reason(w), words(w)]).toEqual([{ code: 'locked', type: 'obelisk_small', first: true, milestone: 'city' }, 'Monuments come with City']);
    w.milestone = 'city';
    expect([reason(w), words(w)]).toEqual([{ code: 'found', type: 'obelisk_small', first: true, more: 10, milestone: 'city' }, 'No monument yet: found a small obelisk (City)']);
    finished(w, 'obelisk_small', 10, 11);
    expect(words(w)).toBe('Found a large obelisk: +30 prestige when finished');
    finished(w, 'obelisk_large', 12, 11);
    expect([reason(w), words(w)]).toEqual([{ code: 'locked', type: 'colossus', first: false, milestone: 'great_city' }, 'The colossus comes with Great city']);
    w.milestone = 'capital';
    for (const [k, x] of [['colossus', 14], ['mastaba_small', 17], ['mastaba_large', 21]]) finished(w, k, x, 11);
    expect(prestigeOf(w)).toBe(270);
    expect(words(w)).toBe('The small pyramid needs 100 prestige (you have 270)');   // the day before updatePrestigeUnlocks records it
    updatePrestigeUnlocks(w);
    expect(words(w)).toBe('Found a small pyramid: +160 prestige when finished');
  });
  it('asks to finish the most advanced site holding its kind, and the prestige it names is what finishing it adds', () => {
    const w = street('great_city');
    finished(w, 'obelisk_small', 10, 11);
    const large = monument(w, 'obelisk_large', 12, 11, 2);            // 2 of 4 courses: 7 of 15 course prestige
    const colossus = monument(w, 'colossus', 14, 11, 1);              // 1 of 6: less far along
    expect([reason(w), words(w)]).toEqual([{ code: 'finish', type: 'obelisk_large', id: large.id, more: 23 }, 'Finish the large obelisk: +23 prestige']);
    const before = prestigeOf(w);
    Object.assign(large.site, { course: 4, done: 90 });
    expect(prestigeOf(w) - before).toBe(23);                          // the words follow prestigeOf
    expect(words(w)).toBe(`Finish the colossus: +${50 - Math.floor((25 * 1) / 6)} prestige`);
    expect(reason(w).id).toBe(colossus.id);
    const second = monument(w, 'colossus', 18, 11, 5);                // a second colossus further along holds the kind now
    expect([reason(w).id, reason(w).more]).toEqual([second.id, 50 - Math.floor((25 * 5) / 6)]);
  });
  it('has no reason once the part is 100, and scores the curve of spec 4.19', () => {
    const w = street('capital');
    const at = [['obelisk_small', 8, 11, 12], ['obelisk_large', 10, 11, 24], ['colossus', 12, 11, 36], ['mastaba_small', 15, 11, 48],
      ['mastaba_large', 19, 11, 62], ['pyramid_small', 8, 18, 78], ['pyramid_great', 14, 18, 100]];
    for (const [k, x, y, part] of at) {
      finished(w, k, x, y);
      expect([k, scoreOf(w).parts.monuments]).toEqual([k, part]);
    }
    expect(reason(w)).toBe(null);
  });
  it('previews "+N Monuments when finished" as the part will count it, and nothing for a second of a kind', () => {
    const w = street('city');
    expect(monumentPreview(w, 'obelisk_small')).toEqual({ gain: 12, second: false });
    expect([monumentPreview(w, 'well'), score4MonumentLine(monumentPreview(w, 'obelisk_small'))]).toEqual([null, '+12 Monuments when finished']);
    expect(scoreLineFor(w, 'obelisk_small', 12, 11)).toBe('+12 Monuments when finished');
    const site = monument(w, 'obelisk_small', 10, 11, 0);
    expect([monumentPreview(w, 'obelisk_small'), scoreLineFor(w, 'obelisk_small', 12, 11)]).toEqual([{ gain: 0, second: true }, '']);
    Object.assign(site.site, { course: 3, done: 60 });
    const before = scoreOf(w).parts.monuments;
    const gain = monumentPreview(w, 'obelisk_large').gain;
    expect([before, gain, score4MonumentLine({ gain: 0, second: false })]).toEqual([12, 12, '']);
    monument(w, 'obelisk_large', 12, 11, 4, 90);
    expect(scoreOf(w).parts.monuments - before).toBe(gain);           // the preview came true
  });
  it('reads a medal on its own version\'s scale: 240 is silver under v1 and bronze under v2', () => {
    expect([medalFor(240, 1), medalFor(240, 2), medalFor(240), medalFor(159, 1), medalFor(320, 1), medalFor(399)]).toEqual(['silver', 'bronze', 'bronze', null, 'gold', 'silver']);
  });
  it('words the two new splits by name, and the five milestones as before', () => {
    expect(score4SplitText('pyramids', 30 * 12 * 11 + 60, null)).toBe('Pyramids unlocked in year 12, month 3');
    expect(score4SplitText('great_pyramid', 360 * 20, 360 * 20 + 90)).toBe('Great pyramid finished in year 21, month 1: 3 months faster than your best');
    expect(score4SplitText('town', 400, 460)).toBe(splitCompareText('town', 400, 460));
  });
});
