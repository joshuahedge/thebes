import { describe, it, expect } from '../../harness.js';
import { FEATS } from '../../../src/data/feats.js';
import { checkFeats, featStatus, featsFor } from '../../../src/sim/feats.js';
import { runMonth } from '../../../src/sim/clock.js';
import { settle } from '../../../src/sim/settle.js';
import { place, demolishAt } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { openSheet, closeSheet } from '../../../src/ui/modes.js';
import { FEAT_TEXT, SCORE_TEXT, featsHeading, sealFeatsText, T } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

const feat = (id) => FEATS.find((f) => f.id === id);
const status = (w, id) => featStatus(w, feat(id));
function city() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('s3 score feats', () => {
  it('lists the ten feats of spec 4.19, the raid ones marked, each with a name and its exact condition', () => {
    expect(FEATS.slice(0, 10).map((f) => [f.id, Boolean(f.raids)])).toEqual([   // Stage 4's two: tests/stage4/score
      ['debt_free', false], ['well_fed', false], ['grain_alone', false], ['firewise', false], ['untouched', true],
      ['never_bowed', true], ['garden_city', false], ['full_hands', false], ['merchant_prince', false], ['swift_town', false],
    ]);
    expect(FEATS.slice(0, 10).map((f) => [FEAT_TEXT[f.id].name, FEAT_TEXT[f.id].condition])).toEqual([
      ['Debt-free founder', 'Become a Town without the treasury ever going below 0'],
      ['Well fed', 'Feed every home at Cottage or better for 12 months in a row, with 100 people or more'],
      ['Grain alone', 'Become a Market town without building a fig orchard'],
      ['Firewise', 'Lose no building to fire for 5 years after becoming a Town'],
      ['Untouched', 'Beat a raid with no building burned and no gold stolen'],
      ['Never bowed', 'Become the Capital without paying tribute'],
      ['Garden city', 'Have 20 gardens and statues at once'],
      ['Full hands', 'Have 400 people or more with 5% or fewer out of work'],
      ['Merchant prince', 'Sell 1,000 goods to caravans'],
      ['Swift Town', 'Become a Town before year 3 begins'],
    ]);
  });
  it('changes nothing for a plain city, and earns each feat once, with its event', () => {
    const w = city();
    w.milestone = 'market_town';                                           // passed before the world kept its milestone days
    const before = JSON.stringify(w);
    expect(checkFeats(w, [])).toEqual([]);
    expect(JSON.stringify(w)).toBe(before);
    expect(['debt_free', 'grain_alone', 'swift_town', 'firewise'].map((id) => status(w, id))).toEqual(['lost', 'lost', 'lost', 'lost']);   // it can no longer earn them
    for (let i = 0; i < 20; i++) addRaw(w, i % 2 ? 'garden' : 'statue', i, 2);
    const events = [];
    expect(checkFeats(w, events)).toEqual(['garden_city']);
    expect(events).toEqual([{ type: 'feat', id: 'garden_city' }]);
    expect(checkFeats(w, [])).toEqual([]);
    expect([w.feats.earned, status(w, 'garden_city')]).toEqual([['garden_city'], 'earned']);
  });
  it('judges Debt-free founder, Grain alone and Swift Town on the day the city became each milestone', () => {
    const w = city();
    expect(checkFeats(w)).toEqual([]);
    w.milestone = 'town'; w.splits.town = 690;
    expect(checkFeats(w)).toEqual(['debt_free', 'swift_town']);            // Town in year 2, month 12: before year 3
    w.gold = -5;
    addRaw(w, 'farm_fig', 2, 11);
    checkFeats(w);
    expect([status(w, 'grain_alone'), status(w, 'debt_free')]).toEqual(['lost', 'earned']);   // an earned feat stays earned
    const late = city();
    late.day = 720;
    checkFeats(late);
    expect(status(late, 'swift_town')).toBe('lost');                        // year 3 began before Town
    const debt = city();
    debt.gold = -1;
    checkFeats(debt);
    debt.gold = 50; debt.milestone = 'town'; debt.splits.town = 300;
    checkFeats(debt);
    expect(status(debt, 'debt_free')).toBe('lost');
    const grain = city();
    grain.milestone = 'market_town'; grain.splits = { town: 300, market_town: 600 };
    expect(checkFeats(grain).includes('grain_alone')).toBe(true);
  });
  it('counts Well fed\'s months once each, from month ends, and starts again after a hungry one', () => {
    const w = city();
    for (let i = 0; i < 10; i++) addRaw(w, 'house', 10 + i, 9, { tier: 3, residents: 12, met: { food: true } });   // 120 people
    for (let m = 1; m <= 11; m++) { w.day = m * 30; checkFeats(w); checkFeats(w); }                              // each month end once, however often checked
    expect([w.feats.counters, status(w, 'well_fed')]).toEqual([{ fedMonth: 11, fedRun: 11 }, 'open']);
    w.buildings[1].met = { food: false };
    w.day = 360; checkFeats(w);
    expect(w.feats.counters.fedRun).toBe(0);
    w.buildings[1].met = { food: true };
    for (let m = 13; m <= 24; m++) { w.day = m * 30; checkFeats(w); }
    w.day = 725; checkFeats(w);                                             // mid-month: nothing counted
    expect([w.feats.counters.fedRun, status(w, 'well_fed')]).toEqual([12, 'earned']);
  });
  it('judges Firewise five years on from Town, lost to any building burned before then', () => {
    const w = city();
    w.milestone = 'town'; w.splits.town = 100;
    w.day = 1899;
    checkFeats(w);
    expect(status(w, 'firewise')).toBe('open');
    w.day = 1900;
    expect(checkFeats(w).includes('firewise')).toBe(true);
    const burnt = city();
    burnt.milestone = 'town'; burnt.splits.town = 100; burnt.day = 500; burnt.tally.burned = 1;
    checkFeats(burnt);
    expect(status(burnt, 'firewise')).toBe('lost');
  });
  it('judges the raid feats from the raid report and the tributes, and leaves them out on Peaceful', () => {
    const w = city();
    w.raid.last = { index: 1, dir: 'east', size: 4, won: true, byTowers: 4, bySoldiers: 0, towers: 2, burned: 0, stolen: 12, day: 900 };
    checkFeats(w);
    expect(status(w, 'untouched')).toBe('open');                            // gold was stolen
    w.raid.last = { ...w.raid.last, index: 2, stolen: 0 };
    expect(checkFeats(w).includes('untouched')).toBe(true);
    w.tally.tributes = 1;
    checkFeats(w);
    expect(status(w, 'never_bowed')).toBe('lost');
    const p = city();
    p.difficulty = 'peaceful';
    p.raid.last = { index: 1, dir: 'east', size: 4, won: true, byTowers: 4, bySoldiers: 0, towers: 2, burned: 0, stolen: 0, day: 900 };
    p.milestone = 'capital'; p.splits.capital = 2000;
    expect(checkFeats(p).includes('untouched')).toBe(false);
    expect(featsFor(p).map((f) => f.id).includes('never_bowed')).toBe(false);
    const c = city();
    c.milestone = 'capital'; c.splits = { town: 200, market_town: 400, city: 600, great_city: 800, capital: 1000 };
    expect(checkFeats(c).includes('never_bowed')).toBe(true);
  });
  it('does not hold an undone fig orchard against Grain alone, only one kept past the month it was placed', () => {
    const figCity = () => { const c = city(); c.milestone = 'town'; c.splits.town = 300; return c; };   // fig orchards open at Town
    const w = figCity();
    expect(place(w, 'farm_fig', 2, 11).ok).toBe(true);
    settle(w, []);
    expect(status(w, 'grain_alone')).toBe('open');                          // it can still be undone
    undo(w);
    settle(w, []);
    w.milestone = 'market_town'; w.splits = { town: 300, market_town: 600 };
    expect(checkFeats(w).includes('grain_alone')).toBe(true);
    const gone = figCity();
    place(gone, 'farm_fig', 2, 11);
    demolishAt(gone, 2, 11);
    checkFeats(gone);
    expect(status(gone, 'grain_alone')).toBe('open');                       // demolished in the month it was placed
    const kept = figCity();
    place(kept, 'farm_fig', 2, 11);
    runMonth(kept, []);                                                     // the month ends: undo is cleared
    settle(kept, []);
    expect(status(kept, 'grain_alone')).toBe('lost');
    const reached = figCity();
    place(reached, 'farm_fig', 2, 11);
    reached.milestone = 'market_town'; reached.splits = { town: 300, market_town: 600 };
    checkFeats(reached);
    expect(status(reached, 'grain_alone')).toBe('open');                    // Market town with an orchard that can still be undone
    undo(reached);
    expect(checkFeats(reached).includes('grain_alone')).toBe(true);
  });
  it("waits for a raid's fires to burn out before judging Untouched", () => {
    const w = city();
    w.raid.last = { index: 1, dir: 'east', size: 4, won: true, byTowers: 4, bySoldiers: 0, towers: 2, burned: 0, stolen: 0, day: 900, fires: [{ id: 7, type: 'house' }], burnedKinds: [] };
    checkFeats(w);
    expect(status(w, 'untouched')).toBe('open');                            // a fire the raid set is still burning
    w.raid.last = { ...w.raid.last, fires: [], burned: 1 };
    checkFeats(w);
    expect(status(w, 'untouched')).toBe('open');                            // it burned the building down
    w.raid.last = { ...w.raid.last, index: 2, fires: [], burned: 0 };
    expect(checkFeats(w).includes('untouched')).toBe(true);
  });
  it('judges Full hands and Merchant prince from the labour count and the sales', () => {
    const w = city();
    addRaw(w, 'house', 0, 0, { tier: 1, residents: 400 });
    w.labour = { workforce: 200, employed: 189, jobs: 189, shortLevels: [] };
    expect(checkFeats(w).includes('full_hands')).toBe(false);                // 5.5% out of work
    w.labour.employed = 190;
    expect(checkFeats(w).includes('full_hands')).toBe(true);
    w.tally.sold = 999;
    expect(checkFeats(w).includes('merchant_prince')).toBe(false);
    w.tally.sold = 1000;
    expect(checkFeats(w).includes('merchant_prince')).toBe(true);
  });
  it('is checked at each month end and after every command', () => {
    const w = city();
    for (let i = 0; i < 20; i++) addRaw(w, 'garden', i, 2);
    expect(settle(w, []).filter((e) => e.type === 'feat')).toEqual([{ type: 'feat', id: 'garden_city' }]);
    const m = city();
    m.tally.sold = 1000;
    const events = [];
    runMonth(m, events);
    expect(events.filter((e) => e.type === 'feat')).toEqual([{ type: 'feat', id: 'merchant_prince' }]);
  });
});

describe('s3 score feats in the interface', () => {
  it('lists the feats in their own group in the summary, each with its state in words', async () => {
    const r = await rigUI();
    try {
      r.world.feats = { earned: ['garden_city'], lost: ['grain_alone'], counters: {} };
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('.feats-heading').textContent).toBe(featsHeading(1, 12));   // Stage 4 adds two
      const rows = [...sheet.querySelectorAll('.feat')];
      const row = (id) => rows.find((li) => li.dataset.id === id);
      expect(rows.length).toBe(12);
      expect(row('garden_city').querySelector('.status').textContent).toBe(`${T.doneMark} ${SCORE_TEXT.featEarned}`);
      expect(row('garden_city').querySelector('.tick').getAttribute('aria-hidden')).toBe('true');
      expect(row('grain_alone').querySelector('.status').textContent).toBe(SCORE_TEXT.featMissed);
      expect(row('well_fed').querySelector('.status').textContent).toBe(SCORE_TEXT.featOpen);
      expect(row('well_fed').textContent).toContain(FEAT_TEXT.well_fed.condition);
      expect(sheet.querySelector('.feats-section').nextElementSibling.textContent.startsWith(T.achievements)).toBe(true);   // just above the achievements
      r.world.difficulty = 'peaceful';
      r.ui.refresh();
      expect(r.root.querySelectorAll('#sheet .feat').length).toBe(10);
      expect(r.root.querySelector('#sheet .feats-heading').textContent).toBe(featsHeading(1, 10));
    } finally { r.cleanup(); }
  });
  it('shows the feats earned when sealing, and a caption when one is earned', async () => {
    const r = await rigUI();
    try {
      r.world.feats.earned.push('swift_town', 'garden_city');
      r.store.set(openSheet(r.store.get(), 'sealReign'));
      expect(r.root.querySelector('#sheet .seal-feats').textContent).toBe('Feats this reign: Garden city and Swift Town.');
      expect(sealFeatsText([])).toBe(SCORE_TEXT.noFeats);
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'feat', id: 'well_fed' }]);
      expect(r.root.querySelector('#cheer .cheer')).toBe(null);                // a phone: the caption waits while the sheet is open
      r.store.set(closeSheet(r.store.get()));
      const cheer = r.root.querySelector('#cheer .cheer');
      expect([cheer.querySelector('.text').textContent, cheer.querySelector('.why').textContent]).toEqual([`${SCORE_TEXT.feat}: ${FEAT_TEXT.well_fed.name}`, FEAT_TEXT.well_fed.condition]);
    } finally { r.cleanup(); }
  });
});
