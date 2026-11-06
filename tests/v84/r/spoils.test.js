// Version 8.4 Track R (rulings 1488, 1489): what a beaten raid leaves: captured weapons (every unit's pay 25% less for 360 days, restarted by the next win), a Victory mood row (+4 for
// 90 days, where a beaten raid was -3 for 180), the celebration in the alert row with a fanfare, and the words that say each from the sim's own numbers.
import { describe, it, expect } from '../../harness.js';
import { SPOILS } from '../../../src/data/raids.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { SFX } from '../../../src/audio/sfx.js';
import { raidMood, raidMonth, payTribute } from '../../../src/sim/raids.js';
import { raidSpoils, spoilsLeft, spoilsSaving, soldiersPayFull } from '../../../src/sim/spoils.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { monthForecast } from '../../../src/sim/economy.js';
import { runMonth } from '../../../src/sim/clock.js';
import { updateMood } from '../../../src/sim/mood.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { footMix } from '../../../src/data/armies.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { openSheet } from '../../../src/ui/modes.js';
import { momentWords } from '../../../src/ui/v60/battle.js';
import { B2_TEXT, MOOD_NAMES, V84R_TEXT } from '../../../src/ui/text.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { raidCity, arriveNow, runRaid, EAST } from './helpers.js';

// 3 archers (6 each) and a soldier (8): 26 a month, 19.5 with the weapons, which is 20 rounded once (rounding each unit would say 21).
const unit = (w, kind) => ({ id: w.nextUnitId++, kind, barracks: 0, x: 3, y: 3, hp: 8, hit: false, task: 'wait' });
const army = (w) => { w.soldiers = [unit(w, 'archer'), unit(w, 'archer'), unit(w, 'archer'), unit(w, 'soldier')]; };
// A raid that ends beaten (two staffed towers) or lost (none) on `day`; returns the world.
function ended(won, day = 1000, w = raidCity({ towers: won ? 2 : 0 })) {
  arriveNow(w, 3, { day, first: true });
  runRaid(w);
  expect(w.raid.last.won).toBe(won);
  return w;
}

describe('v84 r captured weapons: the rule', () => {
  it('keeps the numbers in data: 25% for 360 days; a beaten raid +4 mood for 90 days, a lost one -8 for 180', () => {
    expect([SPOILS.share, SPOILS.days]).toEqual([0.25, 360]);
    expect([DANGER_MOOD.raidBeaten, DANGER_MOOD.victoryDays, DANGER_MOOD.raidLost, DANGER_MOOD.raidDays]).toEqual([4, 90, -8, 180]);
  });
  it('leaves captured weapons after a beaten raid: pay 25% less for 360 days, rounded once, then whole again', () => {
    const w = ended(true);
    const day = w.raid.last.day;
    expect(w.raid.spoils).toEqual({ until: day + 360 });
    expect(w.raid.last.spoils).toEqual({ until: day + 360 });
    army(w);
    expect([soldiersPayFull(w), soldiersPayOf(w)]).toEqual([26, 20]);
    expect(monthForecast(w).soldiers).toBe(20);
    expect(spoilsLeft(w)).toBe(360 - (w.day - day));
    w.day = day + 359;
    expect([soldiersPayOf(w), spoilsLeft(w)]).toEqual([20, 1]);
    w.day = day + 360;
    expect([soldiersPayOf(w), spoilsLeft(w), spoilsSaving(w)]).toEqual([26, 0, null]);
  });
  it('restarts the year at the next beaten raid, and does not add the old days to it', () => {
    const w = ended(true, 1000);
    const first = w.raid.spoils.until;
    arriveNow(w, 3, { day: 1200, first: true });
    runRaid(w);
    expect(w.raid.last.won).toBe(true);
    expect(w.raid.spoils.until).toBe(w.raid.last.day + 360);
    expect(w.raid.spoils.until).toBeGreaterThan(first);
    expect(w.raid.spoils.until).toBeLessThan(first + 360);       // a restart, not a sum
  });
  it('leaves none after a lost raid, keeps what an earlier win left, and a tribute paid leaves none', () => {
    const lost = ended(false);
    expect([lost.raid.spoils, lost.raid.last.spoils]).toEqual([undefined, undefined]);
    const w = ended(true, 1000);
    const until = w.raid.spoils.until;
    w.raid.adaptation = 1;
    raidSpoils(w, { won: false }, false, []);
    expect(w.raid.spoils.until).toBe(until);                      // a lost raid changes nothing already held
    const paid = raidCity();
    paid.raid.index = 2;
    paid.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size: 5, tribute: 100, target: 'storehouse', day: 910, arrives: 1000, first: false, mix: footMix(5) };
    expect(payTribute(paid).ok).toBe(true);
    expect([paid.raid.spoils, paid.raid.last]).toEqual([undefined, null]);
  });
  it('counts the pay it saved at each month end in tally.spoilsGold, and a month with none saves none', () => {
    const w = ended(true);
    army(w);
    raidMonth(w, []);
    expect(w.tally.spoilsGold).toBe(6);                            // 26 - 20
    raidMonth(w, []);
    expect(w.tally.spoilsGold).toBe(12);
    const plain = raidCity();
    army(plain);
    raidMonth(plain, []);
    expect(plain.tally.spoilsGold).toBe(0);
  });
  it('charges the discounted pay at the month end: lastMonth.soldiers is what the forecast said', () => {
    const w = ended(true);
    army(w);
    const said = monthForecast(w).soldiers;
    runMonth(w, []);
    expect([w.stats.lastMonth.soldiers, said, w.tally.spoilsGold]).toEqual([20, 20, 6]);
  });
  it('is absent in an old save and in a city that never won: the pay is whole and nothing is said', () => {
    const w = raidCity();
    army(w);
    expect([w.raid.spoils, soldiersPayOf(w), spoilsSaving(w), spoilsLeft(w)]).toEqual([undefined, 26, null, 0]);
    const kept = ended(true);
    army(kept);
    const back = deserialize(serialize(kept));
    expect([back.raid.spoils, soldiersPayOf(back)]).toEqual([kept.raid.spoils, 20]);       // a saved city keeps its weapons
    const old = JSON.parse(serialize(kept));
    delete old.raid.spoils;
    delete old.raid.last.spoils;
    const loaded = deserialize(JSON.stringify(old));
    expect([loaded.raid.spoils, soldiersPayOf(loaded), spoilsSaving(loaded)]).toEqual([undefined, 26, null]);
  });
  it('has no discount to say for a city that pays no one', () => {
    const w = ended(true);
    expect([w.soldiers.length, spoilsSaving(w)]).toEqual([0, null]);
  });
});

describe('v84 r captured weapons: the words are the sim\'s own', () => {
  it('says the discount and the days left from spoilsSaving, on the forecast\'s soldiers row and in the gold explainer, and nothing without weapons', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      const w = rig.world;
      w.soldiers = [unit(w, 'archer'), unit(w, 'archer'), unit(w, 'archer'), unit(w, 'soldier')];
      const sheetText = () => { rig.store.set(openSheet(rig.store.get(), 'summary')); return rig.root.querySelector('#sheet').textContent; };
      expect(sheetText().includes('Captured weapons')).toBe(false);
      expect(explainStat(w, 'gold').notes.some((n) => n.includes('Captured weapons'))).toBe(false);
      w.raid.spoils = { until: w.day + 140 };
      const s = spoilsSaving(w);
      expect(s).toEqual({ less: 6, daysLeft: 140 });
      const note = V84R_TEXT.weaponsNote(s);
      expect(note).toBe('Captured weapons: 6 less, 140 days left');
      expect(sheetText()).toContain(note);
      expect(sheetText()).toContain('−20');                                           // the row beside it shows the discounted pay
      expect(explainStat(w, 'gold').notes).toContain(note);
      w.day += 139;
      expect(V84R_TEXT.weaponsNote(spoilsSaving(w))).toBe('Captured weapons: 6 less, 1 day left');
    } finally { rig.cleanup(); }
  });
  it('words the celebration\'s line from SPOILS, on a beaten raid that left weapons only', () => {
    const WON = { index: 2, dir: 'east', size: 9, mix: footMix(9), won: true, byTowers: 3, bySoldiers: 5, towers: 1, burned: 0, stolen: 0, day: 100, burnedKinds: [], fires: [] };
    expect(V84R_TEXT.weaponsLine()).toBe("Captured weapons: soldiers' pay 25% less for a year.");
    expect(momentWords(WON)).toEqual(B2_TEXT.moment(WON));                              // no spoils on the report (an old save's): the old words
    const t = momentWords({ ...WON, spoils: { until: 460 } });
    expect([t.title, t.detail]).toEqual(['Raid beaten', `8 of 9 raiders stopped. ${V84R_TEXT.weaponsLine()}`]);
    expect(momentWords({ ...WON, spoils: { until: 460 }, towersLost: 1 }).detail).toBe(`8 of 9 raiders stopped. Lost: 1 tower fell. ${V84R_TEXT.weaponsLine()}`);
    expect(momentWords({ ...WON, won: false, spoils: { until: 460 } }).detail.includes('Captured')).toBe(false);
  });
});

describe('v84 r the celebration: the alert row, a fanfare, never a pause or a card', () => {
  const WON = { index: 2, dir: 'east', size: 9, mix: footMix(9), won: true, byTowers: 3, bySoldiers: 5, towers: 1, burned: 0, stolen: 0, day: 100, burnedKinds: [], fires: [], spoils: { until: 460 } };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  it('puts the line in the alert row\'s beaten moment and plays the fanfare, a lost raid with neither', async () => {
    const played = [];
    const rig = await rigUI({ width: 1280, height: 800, sfx: { play: (n) => { played.push(n); return true; }, unlock: () => true, buzz: () => false } });
    try {
      const speed = rig.world.speed;
      rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
      await tick();
      const row = rig.root.querySelector('#banner .moment');
      expect(row.dataset.code).toBe('raid_beaten');
      expect(row.querySelector('.small').textContent).toContain(V84R_TEXT.weaponsLine());
      expect(rig.root.querySelector('#live').textContent).toContain(V84R_TEXT.weaponsLine());
      expect(played.filter((n) => n === 'fanfare')).toEqual(['fanfare']);
      expect(rig.world.speed).toBe(speed);                                              // never a pause
      expect(rig.root.querySelector('.lesson-card, .card.modal, #card')).toBe(null);    // never a card
      rig.ui.onEvents([{ type: 'raid_end', won: false, report: { ...WON, won: false, byTowers: 0, bySoldiers: 0, spoils: undefined } }]);
      await tick();
      expect(played.filter((n) => n === 'fanfare').length).toBe(1);
      expect(rig.root.querySelector('#banner .moment').dataset.code).toBe('raid_lost');
    } finally { rig.cleanup(); }
  });
  it('says the weapons line whole in the caption row on a phone, where the alert row is one line that cuts it, and not twice on a wide screen', async () => {
    const shown = (rig) => { const n = rig.root.querySelector('#cheer .cheer .text'); return n ? n.textContent.trim() : null; };
    const phone = await rigUI({ width: 390, height: 844 });
    try {
      phone.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
      await tick();
      expect(shown(phone)).toBe(V84R_TEXT.weaponsLine());
      expect(phone.root.querySelectorAll('#banner .moment').length).toBe(1);             // still the one alert row
    } finally { phone.cleanup(); }
    const wide = await rigUI({ width: 1280, height: 800 });
    try {
      wide.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
      await tick();
      expect(shown(wide) === V84R_TEXT.weaponsLine()).toBe(false);
    } finally { wide.cleanup(); }
  });
  it('carries the spoils on the raid_end event of a real raid, so the moment can say them', () => {
    const w = raidCity({ towers: 2 });
    arriveNow(w, 3, { day: 1000, first: true });
    const events = runRaid(w);
    const end = events.find((e) => e.type === 'raid_end');
    expect([end.won, end.report.spoils]).toEqual([true, { until: w.raid.last.day + 360 }]);
  });
  it('has a fanfare of rising notes, under a second and a half, softer than the milestone\'s', () => {
    const notes = SFX.fanfare;
    expect(notes.length).toBeGreaterThan(3);
    expect(Math.max(...notes.map((n) => n.t + n.d))).toBeLessThan(1.5);
    expect(Math.max(...notes.map((n) => n.g))).toBeLessThanOrEqual(Math.max(...SFX.milestone.map((n) => n.g)));
    for (const n of notes) expect([typeof n.f, typeof n.type, n.d > 0, n.g > 0]).toEqual(['number', 'string', true, true]);
    const tops = notes.filter((n) => n.type === 'triangle').map((n) => n.f);
    expect(tops.slice(0, 4)).toEqual([...tops.slice(0, 4)].sort((a, b) => a - b));
  });
});

describe('v84 r the Victory mood row', () => {
  it('is +4 for 90 days after a beaten raid, named Victory, and gone on the 90th day', () => {
    const w = raidCity();
    w.raid.last = { index: 0, won: true, day: 500 };
    for (const [d, row] of [[500, { victory: 4 }], [589, { victory: 4 }], [590, {}], [900, {}]]) { w.day = d; expect([d, raidMood(w)]).toEqual([d, row]); }
    expect(MOOD_NAMES.victory).toBe('Victory');
  });
  it('keeps a lost raid\'s row as it was: raid -8 for 180 days', () => {
    const w = raidCity();
    w.raid.last = { index: 0, won: false, day: 500 };
    for (const [d, row] of [[500, { raid: -8 }], [679, { raid: -8 }], [680, {}]]) { w.day = d; expect([d, raidMood(w)]).toEqual([d, row]); }
  });
  it('shows in the mood breakdown and moves the mood by +4, where a beaten raid used to take 3', () => {
    const base = raidCity();
    base.day = 520;
    const calm = updateMood(base);
    const w = raidCity();
    w.day = 520;
    w.raid.last = { index: 0, won: true, day: 500 };
    expect(updateMood(w)).toBe(calm + 4);
    expect([w.moodBreakdown.victory, w.moodBreakdown.raid]).toEqual([4, undefined]);
    w.day = 600;
    expect(updateMood(w)).toBe(calm);
    expect(w.moodBreakdown.victory).toBe(undefined);
  });
  it('is the row a real beaten raid gives, then none once the raid has been over 90 days', () => {
    const w = ended(true);
    expect(raidMood(w)).toEqual({ victory: 4 });
    w.day = w.raid.last.day + 90;
    expect(raidMood(w)).toEqual({});
  });
});
