// Version 6.0, the balance pass (wave 4): a steady player's answers to the new dangers, and the record of what struck and when.
// dangerPlayer() gives `onMonth(w, events, month)`, the hook the balance runs take (runCapital, runGrand, runLate, runGreatWork: each calls it after the month end's own
// play), and `rec`, the record. Each month end the player does what Advice and the sheets say (the same Show me search the game runs, through the grand run's `act`):
//   - a plague warned or under way: the physician Advice names (the counter), then, with `quarantine` on, the district of a sick home no physician reaches, while the
//     treasury keeps `reserve` (the sheet's quarantine button and its fee);
//   - locusts or blight warned: Harvest now on every farm of the band (the farm sheet's button), at the first month end after the warning;
//   - a low Nile warned: the granary Advice names when the stores would not carry the city (the advice's own fix, if it has one);
//   - rubble that remembers what stood there (burned or wrecked: `was`): rebuilt, at most REBUILDS a month, while the treasury keeps `reserve`.
// A raid's towers are the run's own (the late run's meetWarning, the grand run's reading of Advice). With `defend` the player also builds them on the late run's tower spots (its
// meetWarning): the grand district run has only Advice's tower fix, which Show me puts beside the raid's entry on the map's edge, where its road cannot be routed and no workers
// reach (a tower there stands empty), so with the dangers on that run built its towers in the middle of the city and lost its raids. Fire's firehouses are the scripts'.
// The record: the days each kind struck (from the world's own records, so exact), the events seen with the month end they came in, the Advice list at the month end
// of each warning (is the warned danger's item in the top three?) and at the chosen years, and what the player did.
import { act } from '../../v50/grand/grandRun.js';
import { meetWarning } from '../../stage47/pressure/lateRun.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { harvestNow, harvestQuote } from '../../../src/sim/production.js';
import { quarantineDistrict, quarantineQuote, sickHomes } from '../../../src/sim/plague.js';
import { rebuild, rebuildQuote } from '../../../src/sim/strikes.js';
import { healthCoverage } from '../../../src/sim/health.js';
import { HEALTH } from '../../../src/data/health.js';
import { allBuildings } from '../../../src/sim/world.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const REBUILDS = 6;
const WATCHED = ['plague_warning', 'plague_start', 'plague_end', 'drought_warning', 'drought_start', 'drought_end', 'locusts_warning', 'locusts_strike', 'locusts_end',
  'raid_warning', 'raid_start', 'raid_end', 'raid_wreck', 'raid_loot', 'burned'];
const WARNING_KIND = { plague_warning: 'plague', drought_warning: 'drought', locusts_warning: 'locusts' };

// What the sim would refuse about an Advice item's fix, or null: the fix's building through Show me's own refusal, a farm's Harvest now through its quote (a
// farm already harvested for the warning is done, not refused), a selected building that is gone, an item that is not unlocked. Words must exist.
export function refusal(w, a) {
  if (!adviceWords(a, w).what) return 'no words';
  const f = a.fix;
  if (!f) return null;
  if (f.select !== undefined) {
    const b = w.buildings[f.select];
    if (!b) return 'gone';
    if (f.why === 'harvest') { const q = harvestQuote(w, b); return q.ok || q.reason === 'done' ? null : `harvest ${q.reason}`; }
    return null;
  }
  if (f.view) return null;
  if (f.item) return showMeRefusal(w, f.item, f.target);
  return null;
}

export const adviceRow = (w, a) => ({ kind: a.kind, weight: a.weight, count: a.count, fix: a.fix ? (a.fix.item || (a.fix.select !== undefined ? `select:${a.fix.why || ''}` : 'view')) : null, refused: refusal(w, a) });

export function dangerPlayer({ reserve = 400, quarantine = true, defend = false, snapshotYears = [] } = {}) {
  const rec = { strikes: [], seen: [], warnings: [], raids: [], snapshots: {}, did: { harvest: 0, quarantine: 0, rebuilt: 0, rebuildFailed: 0 } };
  const known = new Set();
  const noteStrike = (kind, day, extra = {}) => {
    const key = `${kind}:${day}`;
    if (known.has(key)) return;
    known.add(key);
    rec.strikes.push({ kind, day, year: Math.floor(day / YEAR_DAYS) + 1, ...extra });
  };

  function onMonth(w, events, month) {
    const h = w.hazards;
    // What struck: the world's own records of what is under way (the day it began).
    if (h.plague.active) noteStrike('plague', h.plague.active.day, { origin: h.plague.active.origin });
    if (h.drought.active) noteStrike('drought', h.drought.active.day, { factor: h.drought.active.factor });
    if (h.locusts.active) noteStrike(h.locusts.active.kind, h.locusts.active.day, { farms: h.locusts.active.farms.length });
    for (const e of events || []) {
      if (!WATCHED.includes(e.type)) continue;
      rec.seen.push({ type: e.type, monthEnd: w.day, year: Math.floor((w.day - 1) / YEAR_DAYS) + 1, ...(e.kind ? { kind: e.kind } : {}) });
      if (e.type === 'raid_end') rec.raids.push({ monthEnd: w.day, won: e.won, report: e.report });
      if (WARNING_KIND[e.type]) {
        const items = cityAdvice(w);
        const at = items.findIndex((a) => a.kind === WARNING_KIND[e.type]);
        rec.warnings.push({ type: e.type, monthEnd: w.day, rank: at, top: items.slice(0, 3).map((a) => adviceRow(w, a)) });
      }
    }
    // The player's answers.
    if (defend) meetWarning(w, []);
    const tried = new Set();
    const items = cityAdvice(w).filter((a) => ['plague', 'drought', 'locusts'].includes(a.kind));
    for (const a of items) {
      if (a.fix && a.fix.item && a.kind !== 'locusts') {
        const done = act(w, a.fix, null, tried);
        if (done) rec.did[a.fix.item] = (rec.did[a.fix.item] || 0) + 1;
      }
    }
    const lw = h.locusts.warning;
    if (lw) for (const id of lw.farms) { const b = w.buildings[id]; if (b && harvestQuote(w, b).ok && harvestNow(w, id).ok) rec.did.harvest += 1; }
    if (quarantine && h.plague.active) {
      const cover = healthCoverage(w);
      for (const home of sickHomes(w)) {
        if ((cover.get(home.id) || 0) >= HEALTH.staffedAt) continue;
        const q = quarantineQuote(w, home);
        if (q.ok && w.gold - q.fee >= reserve && quarantineDistrict(w, home.id).ok) rec.did.quarantine += 1;
      }
    }
    const seen = new Set();
    let n = 0;
    for (const b of allBuildings(w)) {
      if (n >= REBUILDS) break;
      if (b.type !== 'rubble' || !b.was) continue;
      const key = `${b.was.type}:${b.was.x},${b.was.y}:${b.was.day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const q = rebuildQuote(w, b.id);
      if (!q.ok || w.gold - q.cost < reserve) continue;
      if (rebuild(w, b.id).ok) { rec.did.rebuilt += 1; n++; } else rec.did.rebuildFailed += 1;
    }
    // Advice at the chosen year ends.
    if (w.day % YEAR_DAYS === 0) {
      const year = w.day / YEAR_DAYS;
      if (snapshotYears.includes(year)) rec.snapshots[year] = cityAdvice(w).slice(0, 4).map((a) => adviceRow(w, a));
    }
  }
  return { rec, onMonth };
}
