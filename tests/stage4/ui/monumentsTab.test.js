// Track C, Task C1: the Monuments tab and its cards (spec 4.4, 4.14, 6.3; rulings 207, 243). Every lock's words are the sim's
// own count (prestigeOf, isUnlocked), checked with the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { cardShown, cardInfo, cardsKey, shownItems, lockTextOf } from '../../../src/ui/cards.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { MONUMENTS, MONUMENT_KINDS } from '../../../src/data/monuments.js';
import { prestigeOf } from '../../../src/sim/prestige.js';
import { UI4_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

// A finished monument of a kind, set by hand to the contract's site shape.
function finished(w, type, x, y) {
  const b = addRaw(w, type, x, y);
  Object.assign(b.site, { course: MONUMENTS[type].courses.length, done: 1 });
  return b;
}

describe('s4 ui the Monuments tab', () => {
  it('holds the guild, quarry, brickworks and the seven monuments in order, shown greyed while City is next', () => {
    const w = makeTestWorld();
    expect(CATEGORIES.find((c) => c.id === 'monuments').items).toEqual(['builders_guild', 'quarry', 'brickworks', ...MONUMENT_KINDS]);
    w.milestone = 'town';
    expect(shownItems(w, 'monuments')).toEqual([]);
    w.milestone = 'market_town';
    expect(shownItems(w, 'monuments')).toEqual(['builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large']);
    expect(shownItems(w, 'monuments').every((t) => cardInfo(w, t).locked)).toBe(true);
    w.milestone = 'city';
    expect(shownItems(w, 'monuments').map((t) => cardInfo(w, t).locked)).toEqual([false, false, false, false, false, true, true]);
  });

  it('shows the small pyramid greyed from Great city and the great pyramid once the small one unlocks (ruling 243)', () => {
    const w = makeTestWorld();
    w.milestone = 'city';
    expect([cardShown(w, 'pyramid_small'), cardShown(w, 'pyramid_great')]).toEqual([false, false]);
    w.milestone = 'great_city';
    expect([cardShown(w, 'pyramid_small'), cardShown(w, 'pyramid_great')]).toEqual([true, false]);
    w.milestone = 'capital';
    expect([cardShown(w, 'pyramid_small'), cardShown(w, 'pyramid_great')]).toEqual([true, false]);
    w.prestigeUnlocks.pyramid_small = 40;
    expect([cardShown(w, 'pyramid_small'), cardInfo(w, 'pyramid_small').locked, cardShown(w, 'pyramid_great'), cardInfo(w, 'pyramid_great').locked]).toEqual([true, false, true, true]);
  });

  it('words a prestige lock with the city\'s own count, and the milestone with it until that is reached', () => {
    const w = makeTestWorld();
    w.milestone = 'great_city';
    expect(cardInfo(w, 'pyramid_small').lockText).toBe('Needs Capital and 100 prestige');
    w.milestone = 'capital';
    expect(cardInfo(w, 'pyramid_small').lockText).toBe('Needs 100 prestige (you have 0)');
    finished(w, 'colossus', 20, 20);
    finished(w, 'obelisk_small', 25, 25);
    expect([prestigeOf(w), cardInfo(w, 'pyramid_small').lockText]).toEqual([60, UI4_TEXT.needsPrestige(100, prestigeOf(w))]);
    expect(cardInfo(w, 'pyramid_small').lockText).toBe('Needs 100 prestige (you have 60)');
    const before = cardsKey(w, 'monuments', null);
    finished(w, 'obelisk_large', 28, 28);                                          // +30: the count moves, so the card is built again
    expect(cardInfo(w, 'pyramid_small').lockText).toBe('Needs 100 prestige (you have 90)');
    expect(cardsKey(w, 'monuments', null) === before).toBe(false);
    w.prestigeUnlocks.pyramid_small = 10;
    expect(lockTextOf(w, 'pyramid_great')).toBe('Needs 300 prestige (you have 90)');
    expect(lockTextOf(w, 'colossus')).toBe('Unlocks at Great city');
  });

  it('says a monument stands anywhere but the fields, on its card and in its tooltip (ruling 299)', async () => {
    const w = makeTestWorld();
    w.milestone = 'city';
    expect([cardInfo(w, 'obelisk_small').terrainText, cardInfo(w, 'quarry').terrainText, cardInfo(w, 'builders_guild').terrainText]).toEqual(['Not on the fields', 'Rocky ground', '']);
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'city';
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="monuments"]'), 'click');
      const card = r.root.querySelector('#dock .tray .card[data-item="obelisk_small"]');
      expect([card.querySelector('.terrain').textContent, card.getAttribute('title')]).toEqual(['Not on the fields', 'Small obelisk: on dry ground, not the fields']);
      expect(r.root.querySelector('#dock .tray .card[data-item="quarry"]').getAttribute('title')).toBe(null);
      // At 150% text the card's line takes no more room than the quarry's "Rocky ground" (two lines in the 124 px card): the
      // monument's card is no taller than the quarry's and its words fit inside it.
      document.body.dataset.textSize = '150';
      const quarry = r.root.querySelector('#dock .tray .card[data-item="quarry"]');
      const line = card.querySelector('.terrain');
      const lines = (n) => Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight));
      expect([parseFloat(getComputedStyle(line).fontSize), lines(line) <= lines(quarry.querySelector('.terrain')), card.scrollHeight <= card.clientHeight, card.getBoundingClientRect().height <= quarry.getBoundingClientRect().height]).toEqual([18, true, true, true]);
    } finally { r.cleanup(); }
  });

  it('hints on a phone that the Monuments tray scrolls on, over its right end, and drops the hint at the end (ruling 300)', async () => {
    const w = makeTestWorld();
    w.milestone = 'capital';
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.ui.refresh();
      const hint = r.root.querySelector('#dock .tray-more');
      expect([hint.hidden, hint.getAttribute('aria-hidden')]).toEqual([true, 'true']);   // slim dock: no tray, no hint
      fire(r.root.querySelector('#dock .cat[data-category="monuments"]'), 'click');
      const tray = r.root.querySelector('#dock .tray');
      expect([tray.scrollWidth > tray.clientWidth, hint.hidden]).toEqual([true, false]);
      const t = tray.getBoundingClientRect(), h = hint.getBoundingClientRect();
      const near = (a, b) => Math.abs(a - b) <= 1;                                   // whole px: offsetTop rounds
      expect([near(h.right, t.right), near(h.top, t.top), near(h.height, t.height), h.width < 60]).toEqual([true, true, true, true]);
      expect(getComputedStyle(hint).pointerEvents).toBe('none');                   // taps reach the card under it
      const dockHeight = r.root.querySelector('#dock').getBoundingClientRect().height;
      hint.hidden = true;
      expect(r.root.querySelector('#dock').getBoundingClientRect().height).toBe(dockHeight);   // no height of its own
      tray.scrollLeft = tray.scrollWidth;
      fire(tray, 'scroll');
      expect(hint.hidden).toBe(true);                                               // at the end: nothing more that way
      tray.scrollLeft = 0;
      fire(tray, 'scroll');
      expect(hint.hidden).toBe(false);
    } finally { r.cleanup(); }
  });
});
