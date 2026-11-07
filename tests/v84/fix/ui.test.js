// Version 8.4 fix wave, Agent B (rulings 1538-1539): the interface's small faults the final review found. A rushed site with no crew, the countdown that never splits,
// the spoils discount in the soldiers' row's label, the phone's alert row, scouts for both bands of a two-sided raid, and the small words.
import { describe, it, expect } from '../../harness.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { rushRows, siteRows } from '../../../src/ui/monumentSheet.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { routeCostOf, costOf } from '../../../src/sim/costs.js';
import { raidDay, raidAlerts, comesTwoSided } from '../../../src/sim/raids.js';
import { scoutsAt, scoutCount } from '../../../src/sim/scouts.js';
import { scoutWalkers, SCOUT_ID_BASE } from '../../../src/render/scouts.js';
import { raidSpoils } from '../../../src/sim/spoils.js';
import { lessonWorld } from '../../../src/sim/lesson.js';
import { SPOILS } from '../../../src/data/raids.js';
import { DANGER_UI_TEXT as D, V84R_TEXT, V84_G_TEXT, D2_TEXT, alertText } from '../../../src/ui/text.js';
import { momentWords } from '../../../src/ui/v60/battle.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { openSheet } from '../../../src/ui/modes.js';
import { causeText } from '../../../src/ui/text.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { addRaw } from '../../helpers/testWorld.js';
import { rushCity, luxuryStreet } from '../g/fixtures.js';
import { raidCity } from '../r/helpers.js';

describe('v84 fix a rushed site with no crew', () => {
  it('says "Rushed: no crew today" when no crew works the course, and the days to go when one does', () => {
    const { w, site } = rushCity();
    setRush(w, site.id, true);
    expect(rushRows(w, site)[0].text).toBe(`Rushed: about ${rushQuote(w, site.id).daysRushed} days to go on this course`);
    const lone = addRaw(w, 'obelisk_small', 55, 9);          // no crew reaches it: the pace is 0
    lone.site.rush = true;
    expect(rushQuote(w, lone.id).daysRushed).toBe(0);
    expect(rushRows(w, lone)).toEqual([{ key: 'rush', text: 'Rushed: no crew today', cancel: true }]);
    expect(V84_G_TEXT.rushedNoCrew).toBe('Rushed: no crew today');
  });
  it('puts the Rush row below the cause ("Waiting for bricks") on the site\'s sheet', () => {
    const { w, site } = rushCity({ bricks: 0, stone: 0 });
    const keys = siteRows(w, site).map((r) => r.key);
    if (keys.includes('cause') && keys.includes('rush')) expect(keys.indexOf('rush') > keys.indexOf('cause')).toBe(true);
    const ok = rushCity();
    const k2 = siteRows(ok.w, ok.site).map((r) => r.key);
    expect(k2.includes('rush')).toBe(true);
    expect(k2.indexOf('rush') > k2.indexOf('crews')).toBe(true);
  });
});

describe('v84 fix the countdown never splits', () => {
  it('joins "2 m 10 d" and "7 d" with non-breaking spaces, in the countdown and in the chip', () => {
    expect(D.countdown(70)).toBe('2 m 10 d');
    expect(D.countdown(7)).toBe('7 d');
    expect(D.chip('east', 70)).toBe('Raid from the east\u00a0· 2 m 10 d');
    expect(D.countdown(60)).toBe('2 months');
    expect(/ [md]\b/.test(D.countdown(70))).toBe(false);          // no plain space beside an m or a d
  });
});

describe('v84 fix the spoils discount is part of the soldiers\' row', () => {
  it('folds the captured weapons into the row\'s label on the forecast and in the gold explainer, as no line of its own', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      const w = rig.world;
      w.soldiers = [1, 2, 3, 4].map(() => ({ id: w.nextUnitId++, kind: 'archer', barracks: null, x: 5, y: 5, hp: 12, hit: false, task: 'wait' }));
      w.raid.spoils = { until: w.day + 100 };
      rig.store.set(openSheet(rig.store.get(), 'summary'));
      const sheet = rig.root.querySelector('#sheet');
      const labels = [...sheet.querySelectorAll('.row > .muted')].map((n) => n.textContent);
      expect(labels.some((l) => l.includes('(captured weapons: '))).toBe(true);
      expect([...sheet.querySelectorAll('p')].some((p) => p.textContent.startsWith('Captured weapons'))).toBe(false);
      expect(explainStat(w, 'gold').lines.some((l) => l[0].includes('(captured weapons: '))).toBe(true);
      expect(explainStat(w, 'gold').notes.some((n) => n.includes('aptured weapons'))).toBe(false);
      w.raid.spoils = undefined;
      rig.store.set(openSheet(rig.store.get(), 'summary'));
      expect(rig.root.querySelector('#sheet').textContent.includes('aptured weapons')).toBe(false);
    } finally { rig.cleanup(); }
  });
});

describe('v84 fix the phone\'s alert row drops the weapons line', () => {
  const WON = { index: 2, dir: 'east', size: 9, mix: { foot: 9, archer: 0, chariot: 0, boat: 0 }, won: true, byTowers: 3, bySoldiers: 5, towers: 1, burned: 0, stolen: 0, day: 100, burnedKinds: [], fires: [], spoils: { until: 460 } };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  it('leaves the line out of the phone row\'s words, keeps it on a wide screen, and the caption says it whole', async () => {
    expect(momentWords(WON, true).detail.includes('Captured')).toBe(false);
    expect(momentWords(WON, false).detail.includes(V84R_TEXT.weaponsLine())).toBe(true);
    const phone = await rigUI({ width: 390, height: 844 });
    try {
      phone.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
      await tick();
      expect(phone.root.querySelector('#banner .moment').textContent.includes('Captured')).toBe(false);
      expect(phone.root.querySelector('#cheer .cheer .text').textContent.trim()).toBe(V84R_TEXT.weaponsLine());
    } finally { phone.cleanup(); }
  });
});

describe('v84 fix the celebration against the lesson\'s end card', () => {
  it('says the weapons only for a beaten raid, as the end card says the tower beat it, and a lost raid has neither', () => {
    const w = lessonWorld();
    const report = { index: 0, dir: 'east', size: 3, mix: { foot: 3, archer: 0, chariot: 0, boat: 0 }, won: true, byTowers: 3, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: 100, burnedKinds: [], fires: [] };
    raidSpoils(w, report, true, null);
    w.raid.last = report;
    expect(report.spoils.until).toBe(w.day + SPOILS.days);
    expect(D2_TEXT.endBody({ people: 12, won: Boolean(w.raid.last.won) })).toContain('your tower beat the raid');
    expect(momentWords(report).detail).toContain(V84R_TEXT.weaponsLine());
    const lost = { ...report, won: false, spoils: undefined };
    raidSpoils(w, lost, false, null);
    expect(lost.spoils).toBe(undefined);
    expect(D2_TEXT.endBody({ people: 12, won: false })).toContain('the raid got through');
    expect(momentWords(lost).detail.includes('Captured')).toBe(false);
  });
});

describe('v84 fix a two-sided raid\'s scouts', () => {
  const FOUR = [{ x: 31, y: 16 }, { x: 0, y: 12 }, { x: 14, y: 0 }, { x: 18, y: 31 }];
  const WARN = 20000;
  function waiting(seed) {
    const w = raidCity({ entries: FOUR, towers: 2 });
    w.seed = seed;
    w.raid.clockDay = 0;
    w.raid.nextWarnDay = WARN;
    w.raid.index = 5;
    w.day = WARN - 10;
    return w;
  }
  it('stands scouts at both entries and names both sides, exactly where the warning comes', () => {
    let two = 0, one = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const w = waiting(seed);
      const s = scoutsAt(w);
      const sided = comesTwoSided(w, 5);
      expect([seed, s.bands.length]).toEqual([seed, sided ? 2 : 1]);
      const n = scoutCount(w);
      const walkers = scoutWalkers(w, w.day, null);
      expect(walkers.length).toBe(n * s.bands.length);
      expect(new Set(walkers.map((x) => x.id)).size).toBe(walkers.length);
      expect(walkers.every((x) => x.id >= SCOUT_ID_BASE)).toBe(true);
      const alert = raidAlerts(w).find((a) => a.code === 'raid_scouts');
      if (sided) {
        two += 1;
        expect(alert.dirs).toEqual(s.dirs);
        expect(alertText(alert, w).title).toBe(`Scouts on the ${V84R_TEXT.sides[s.dirs[0]]} and ${V84R_TEXT.sides[s.dirs[1]]} horizon`);
        expect(V84R_TEXT.scoutsCaption(s.dirs)).toBe(`${alertText(alert, w).title}: raiders may come within a month`);
      } else {
        one += 1;
        expect('dirs' in alert).toBe(false);
        expect(alertText(alert, w).title).toBe(`Scouts on the ${V84R_TEXT.sides[s.dir]} horizon`);
      }
      w.day = WARN;
      const events = [];
      raidDay(w, events);
      const warn = events.find((e) => e.type === 'raid_warning');
      expect(sided ? warn.dirs : [warn.dir]).toEqual(s.dirs);          // the warning's sides are the scouts' sides
      if (sided) expect(warn.second.entry).toEqual(s.bands[1].entry);
    }
    expect(two > 0 && one > 0).toBe(true);        // the 40 seeds hold both kinds
  });
});

describe('v84 fix small words', () => {
  it('gives the price of the landing and the route in the luxury fix, and the route\'s alone when the landing stands', () => {
    const { world } = luxuryStreet();
    const c = { code: 'no_luxury_route', good: 'cedar', partner: 'byblos', price: 40, block: 'no_post' };
    const route = routeCostOf(world, 'byblos'), post = costOf(world, 'trading_post');
    expect(causeText(c, world).fix).toBe(`Build a trading post (${post} gold), then open a route to Byblos (${route} gold) and buy cedar (40 gold each)`);
    expect(causeText({ ...c, block: null }, world).fix).toBe(`Open a route to Byblos (${route} gold) and buy cedar (40 gold each)`);
  });
  it('says "rush a monument" in the gold advice only when a site stands', () => {
    const { w, site } = rushCity({ gold: 100000 });
    const a = { kind: 'gold_spare', data: { gold: 100000, months: 40 } };
    expect(adviceWords(a, w).fix).toBe('Lower taxes at the palace for mood, or rush a monument');
    expect(site.site.done).toBe(null);
    site.site.done = 100;                                           // finished: nothing to rush
    expect(adviceWords(a, w).fix).toBe('Lower taxes at the palace for mood');
  });
});
