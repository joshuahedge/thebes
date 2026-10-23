// Version 6.0, Track A: how a steady player answers the court in the balance runs (the late run's `answer` policy, tests/stage47/pressure/lateRun.js,
// and the great-work run, ./greatWorkRun.js). Each month end: every letter is read and the open request sent once the stores or the treasury hold it
// (the Stage 4.6 village's rule); a demand offered is accepted when the city can meet it now or will by its deadline at this month's output (goods),
// when the treasury holds it with `reserve` to spare (gold) or when the units are at home (soldiers), and declined otherwise (a building demand is
// declined: the driver lays nothing it did not plan); an accepted demand is sent as soon as it can be. Returns what it did, for the record.
import { readLetter, requestStatus, sendRequest, outputPerMonth, stockOf } from '../../../src/sim/court.js';
import { courtDemands, acceptDemand, declineDemand, meetDemand, demandStatus } from '../../../src/sim/demands.js';
import { unitsAtHome } from '../../../src/sim/armies.js';

const unitsHome = (w) => Object.values(unitsAtHome(w)).reduce((a, b) => a + b, 0);

function canMeet(w, d, reserve) {
  if (d.kind === 'goods') return stockOf(w, d.good) + outputPerMonth(w, d.good) * (d.months - 1) >= d.amount;
  if (d.kind === 'gold') return w.gold - d.amount >= reserve;
  if (d.kind === 'soldiers') return unitsHome(w) >= d.amount && !w.raid.active && !w.raid.warning;   // never with raiders on the way
  return false;
}

export function answerCourt(w, { reserve = 400 } = {}) {
  const done = [];
  const c = w.court;
  if (c.awake) {
    for (const l of c.letters) readLetter(w, l.id);
    if (c.request && requestStatus(w).ok && (c.request.kind !== 'gold' || w.gold - c.request.amount >= reserve) && (c.request.kind !== 'soldiers' || !w.raid.warning)) {
      const r = c.request;
      if (sendRequest(w).ok) done.push({ day: w.day, request: r.kind, good: r.good, amount: r.amount });
    }
  }
  for (const d of courtDemands(w)) {
    if (!d.accepted) {
      if (canMeet(w, d, reserve)) { acceptDemand(w, d.id); done.push({ day: w.day, demand: d.id, kind: d.kind, accepted: true }); }
      else { declineDemand(w, d.id); done.push({ day: w.day, demand: d.id, kind: d.kind, accepted: false }); continue; }
    }
    const open = w.demands.open.find((x) => x.id === d.id);
    if (!open || !demandStatus(w, open).ok || (open.kind === 'gold' && w.gold - open.amount < reserve) || (open.kind === 'soldiers' && w.raid.warning)) continue;
    if (meetDemand(w, d.id).ok) done.push({ day: w.day, demand: d.id, kind: d.kind, met: true });
  }
  return done;
}
