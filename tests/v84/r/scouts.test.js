// Version 8.4 Track R (ruling 1487): the scouts on the horizon. They are read from the state, stand where the warning will enter for the 30 days before it, never move it, and the
// lesson's raid, a Peaceful city and a city whose clock has not started have none.
import { describe, it, expect } from '../../harness.js';
import { RAIDS, SCOUTS } from '../../../src/data/raids.js';
import { raidDay, raidAlerts, nextRaidEntry } from '../../../src/sim/raids.js';
import { scoutsAt, scoutCount } from '../../../src/sim/scouts.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { scoutWalkers, SCOUT_ID_BASE } from '../../../src/render/scouts.js';
import { unitsAt, UNIT_ID_BASE } from '../../../src/render/units.js';
import { CRITICAL } from '../../../src/ui/alerts.js';
import { alertText, V84R_TEXT } from '../../../src/ui/text.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { serialize } from '../../../src/save/serialize.js';
import { at84, raidCity } from './helpers.js';

const FOUR = [{ x: 31, y: 16 }, { x: 0, y: 12 }, { x: 14, y: 0 }, { x: 18, y: 31 }];
// A raid city with the clock started and the next warning on `warn` (the raid index `index`).
function waiting({ warn = 1000, index = 3, entries = FOUR, seed = 1 } = {}) {
  const w = raidCity({ entries, towers: 2 });
  w.seed = seed;
  w.raid.clockDay = 0;
  w.raid.nextWarnDay = warn;
  w.raid.index = index;
  return w;
}

describe('v84 r scouts: the window and the entry are the warning\'s own', () => {
  it('stands for the SCOUTS.days before the warning, at the entry the warning will use, and no other day', () => {
    expect([SCOUTS.days, SCOUTS.min, SCOUTS.max]).toEqual([30, 2, 3]);
    const w = waiting();
    w.day = 1000 - SCOUTS.days - 1;
    expect(scoutsAt(w)).toBe(null);
    w.day += 1;
    const s = scoutsAt(w);
    expect([s.days, s.entry, s.dir]).toEqual([30, nextRaidEntry(w, 3), s.dir]);
    expect(['north', 'east', 'south', 'west'].includes(s.dir)).toBe(true);
    w.day = 999;
    expect(scoutsAt(w).days).toBe(1);
    w.day = 1000;
    expect(scoutsAt(w)).toBe(null);
  });
  it('is the very entry and side of the warning raised on the day, for the first raid too, across seeds and indexes', () => {
    let first = 0;
    for (const index of [0, 1, 2, 5]) {
      for (let seed = 1; seed <= 12; seed++) {
        const w = waiting({ seed, index, warn: 500 });
        w.day = 499;
        const s = scoutsAt(w);
        expect(Boolean(s)).toBe(true);
        w.day = 500;
        const events = [];
        raidDay(w, events);
        const warn = events.find((e) => e.type === 'raid_warning');
        expect([warn.index, warn.entry, warn.dir]).toEqual([index, s.entry, s.dir]);
        if (index === 0) first += 1;
      }
    }
    expect(first).toBe(12);
  });
  it('never moves the warning: the same city played with and without the scouts looked at keeps every warning day', () => {
    const play = (look) => {
      const w = raidCity({ entries: FOUR.slice(0, 2), towers: 3 });
      w.seed = 7;
      w.tally.peakPeople = RAIDS.clockPeople;
      const warned = [];
      for (let d = 0; d < 3000; d++) {
        w.day = d;
        const events = [];
        raidDay(w, events);
        if (look) { scoutsAt(w); raidAlerts(w); scoutWalkers(w, d, null); alertsFor(w); }
        for (const e of events) if (e.type === 'raid_warning') warned.push([d, e.index, e.dir]);
      }
      return { warned, state: serialize(w) };
    };
    at84(() => {
      const a = play(false), b = play(true);
      expect(a.warned.length).toBeGreaterThan(3);
      expect(b).toEqual(a);
    });
  });
  it('says so once a raid, on the day the scouts appear, the first raid included', () => {
    at84(() => {
      const w = raidCity({ entries: FOUR.slice(0, 2), towers: 3 });
      w.seed = 7;
      w.tally.peakPeople = RAIDS.clockPeople;
      const seen = [], warned = [];
      for (let d = 0; d < 3000; d++) {
        w.day = d;
        const events = [];
        raidDay(w, events);
        for (const e of events) {
          if (e.type === 'raid_scouts') seen.push({ d, index: e.index, days: e.days, dir: e.dir });
          if (e.type === 'raid_warning') warned.push({ d, index: e.index, dir: e.dir });
        }
      }
      expect(warned.length).toBeGreaterThan(3);
      expect(seen.map((s) => s.index)).toEqual(warned.map((x) => x.index));              // one for each raid warned, the first included, in order
      for (let k = 0; k < seen.length; k++) expect([seen[k].d, seen[k].days, seen[k].dir]).toEqual([warned[k].d - SCOUTS.days, SCOUTS.days, warned[k].dir]);
    });
  });
});

describe('v84 r scouts: none where there should be none', () => {
  it('has none on Peaceful, before the clock starts, with a warning up or a raid under way, with no entry, or in the lesson', () => {
    const w = waiting();
    w.day = 990;
    expect(Boolean(scoutsAt(w))).toBe(true);
    const peaceful = waiting(); peaceful.day = 990; peaceful.difficulty = 'peaceful';
    const early = waiting(); early.day = 990; early.raid.clockDay = null; early.raid.nextWarnDay = null;
    const warned = waiting(); warned.day = 990; warned.raid.warning = { index: 2, entry: { ...FOUR[0] }, dir: 'east', size: 3, arrives: 1080, first: false };
    const active = waiting(); active.day = 990; active.raid.active = { index: 2, raiders: [], entry: { ...FOUR[0] }, x: FOUR[0].x, y: FOUR[0].y, phase: 'attack' };
    const nowhere = waiting({ entries: [] }); nowhere.day = 990;
    const lesson = waiting(); lesson.day = 990; lesson.lesson = true;
    for (const [name, c] of [['peaceful', peaceful], ['no clock', early], ['warning up', warned], ['raid under way', active], ['no entry', nowhere], ['lesson', lesson]]) expect([name, scoutsAt(c), raidAlerts(c).some((a) => a.code === 'raid_scouts'), scoutWalkers(c, 990, null)]).toEqual([name, null, false, []]);
  });
  it('has none for a raid staged to warn today, as the lesson stages it', () => {
    const w = waiting({ warn: 400 });
    w.raid.nextWarnDay = w.day = 400;       // STAGES.raid: nextWarnDay = today
    expect(scoutsAt(w)).toBe(null);
    w.day = 401;
    expect(scoutsAt(w)).toBe(null);          // the window is the 30 days before a day already come: the day only goes on from there
  });
});

describe('v84 r scouts: the alert and its words', () => {
  it('adds a raid_scouts alert at the entry, never critical, with the side and the days to the warning in its words', () => {
    const w = waiting();
    w.day = 985;
    const s = scoutsAt(w);
    const a = raidAlerts(w).find((x) => x.code === 'raid_scouts');
    expect(a).toEqual({ code: 'raid_scouts', x: s.entry.x, y: s.entry.y, dir: s.dir, days: 15 });
    expect(CRITICAL.has('raid_scouts')).toBe(false);
    expect(alertsFor(w).filter((x) => x.code === 'raid_scouts').length).toBe(1);
    const t = alertText(a, w);
    expect([t.title, t.fix]).toEqual([`Scouts on the ${V84R_TEXT.sides[s.dir]} horizon`, 'A raid warning may follow within 15 days']);
    for (const [dir, side] of [['north', 'northern'], ['east', 'eastern'], ['south', 'southern'], ['west', 'western']]) expect(alertText({ code: 'raid_scouts', dir, days: 30 }, w).title).toBe(`Scouts on the ${side} horizon`);
    expect(V84R_TEXT.scoutsCaption('east')).toBe('Scouts on the eastern horizon: raiders may come within a month');
    expect(alertText({ ...a, days: 30 }, w).fix).toBe('A raid warning may follow within a month');
  });
  it('shows the caption once, when the sim says the scouts have appeared, in the caption row', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      rig.ui.onEvents([{ type: 'raid_scouts', index: 0, entry: { x: 31, y: 16 }, dir: 'east', days: 30 }]);
      const shown = () => { const n = rig.root.querySelector('#cheer .cheer .text'); return n ? n.textContent.trim() : null; };
      expect(shown()).toBe('Scouts on the eastern horizon: raiders may come within a month');
      expect(rig.root.querySelector('#cheer .cheer').classList.contains('info')).toBe(true);
      expect(rig.root.querySelector('#modal, .modal, .lesson-card')).toBe(null);          // never a card
    } finally { rig.cleanup(); }
  });
});

describe('v84 r scouts: the drawing', () => {
  it('draws two or three raiders on foot at the entry, facing in, only while they stand', () => {
    const w = waiting();
    const counts = new Set();
    for (let seed = 1; seed <= 30; seed++) { w.seed = seed; w.day = 980; const n = scoutWalkers(w, 980, null).length; counts.add(n); expect(n).toBe(scoutCount(w)); }
    expect([...counts].sort()).toEqual([2, 3]);
    w.seed = 1;
    w.day = 980;
    const s = scoutsAt(w), walkers = scoutWalkers(w, 980, null);
    const facing = { east: 3, west: 1, north: 2, south: 0 }[s.dir];
    expect(walkers.length).toBeGreaterThanOrEqual(2);
    for (const k of walkers) {
      expect([k.kind, k.dir, k.id >= SCOUT_ID_BASE, k.id < SCOUT_ID_BASE + 3]).toEqual(['raider', facing, true, true]);
      expect([Math.abs(k.x - (s.entry.x + 0.5)) <= 0.3, Math.abs(k.y - (s.entry.y + 0.5)) <= 0.3]).toEqual([true, true]);
    }
    expect(new Set(walkers.map((k) => k.id)).size).toBe(walkers.length);
    expect(SCOUT_ID_BASE).toBeGreaterThan(UNIT_ID_BASE + 99999);                         // no unit's id (UNIT_ID_BASE + an id) can meet one
    expect(scoutWalkers(w, 980, { x0: 0, y0: 0, x1: 5, y1: 5 })).toEqual([]);            // out of the view: not drawn
    expect(unitsAt(w, 980, null, { now: 0 }).filter((u) => u.id >= SCOUT_ID_BASE).map((u) => u.id)).toEqual(walkers.map((k) => k.id));   // unitsAt joins them to the list
    w.day = 1000;
    expect(scoutWalkers(w, 1000, null)).toEqual([]);
    expect(unitsAt(w, 1000, null, { now: 0 })).toEqual([]);
  });
  it('draws the same at every motion level: they stand still', () => {
    const w = waiting();
    w.day = 985;
    const full = unitsAt(w, 985, null, { now: 0, motion: 'full' }), still = unitsAt(w, 985.6, null, { now: 5000, motion: 'still' });
    expect(still).toEqual(full);
  });
});
