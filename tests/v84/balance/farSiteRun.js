// Version 8.4, wave 2 (design section 7 B9, ruling 1524): the far-site run. The capital run's year-6 city (a save round trip of the shared run, so it is never
// changed) founds a great sphinx far down a new road south-east of the works quarter, where its two guilds walk 36 to 47 road tiles to it, and measures three
// months at its sheet's choices: as founded, with the workers' camp set up, and with the camp and the course rushed. The monuments under way are paused (their
// sheets' Pause) so the guilds' crews go to the sphinx, the nearest two of the four taking its two places. A storehouse beside the site is kept full of stone
// (topped up each day, as a supply line would), so the site is always fully stocked and the crews' pace is all that is measured.
import { capitalRun } from '../../stage4/balance/capitalRun.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place, drawRoad, setPaused } from '../../../src/sim/commands.js';
import { allBuildings, isSite } from '../../../src/sim/world.js';
import { costOf, workGoldPerUnit, rushGoldPerUnit } from '../../../src/sim/costs.js';
import { crewDistance, campQuote, setCamp, setRush } from '../../../src/sim/monuments.js';
import { staffRatio } from '../../../src/sim/labour.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';

export const FAR = { road: [[34, 26, 34, 44], [20, 44, 33, 44]], sphinx: { x: 22, y: 42 }, store: { x: 26, y: 42 } };

// One month to the next month end, the store topped up with stone each day; then the sphinx's month (site.last): units per crew, gold per unit.
function month(w, s, st) {
  for (let d = 0; d < DAYS_PER_MONTH; d++) {
    st.store.stone = 400;
    advanceDays(w, 1);
  }
  const last = s.site.last;
  return { units: last.units, crews: last.crews, perCrew: last.crews ? Math.round((last.units / last.crews) * 100) / 100 : 0, perUnit: last.units ? Math.round((last.gold / last.units) * 100) / 100 : 0 };
}

export function runFarSite() {
  const w = deserialize(serialize(capitalRun().w));
  w.gold = Math.max(w.gold, 20000);
  const paused = allBuildings(w).filter((b) => isSite(b) && b.site.done === null && setPaused(w, b.id, true).ok).map((b) => b.type);
  const roads = FAR.road.map(([x0, y0, x1, y1]) => drawRoad(w, x0, y0, x1, y1).ok);
  const founding = costOf(w, 'great_sphinx');
  const before = w.gold;
  const sr = place(w, 'great_sphinx', FAR.sphinx.x, FAR.sphinx.y);
  const paid = before - w.gold;
  const str = place(w, 'storehouse', FAR.store.x, FAR.store.y);
  if (!sr.ok || !str.ok) return { failed: { sphinx: sr.reason || null, store: str.reason || null, roads } };
  const s = w.buildings[sr.id], st = w.buildings[str.id];
  // Line the start up with a month end, with a month to settle (the stockpile fills, the guilds take on their workers).
  advanceDays(w, DAYS_PER_MONTH - (w.day % DAYS_PER_MONTH));
  month(w, s, st);
  const guilds = allBuildings(w).filter((b) => b.type === 'builders_guild').map((g) => ({ id: g.id, dist: crewDistance(w, g, s), staff: staffRatio(w, g), crew: s.site.crews.includes(g.id) }));
  const plain = month(w, s, st);
  const camp = campQuote(w, s.id);
  const campSet = setCamp(w, s.id);
  const withCamp = month(w, s, st);
  // Rush covers the course under way only, so it is set the day a course begins and measured over the days it lasts (a month end's day is left out:
  // the site's month is closed that day).
  for (let d = 0; d < 60 && s.site.laid.stone > 0; d++) { st.store.stone = 400; advanceDays(w, 1); }
  const rushOk = setRush(w, s.id, true).ok;
  const rushed = { units: 0, gold: 0, days: 0, crews: s.site.crews.length };
  for (let d = 0; d < 90 && s.site.rush; d++) {
    st.store.stone = 400;
    const u = s.site.month.units, g = s.site.month.gold;
    advanceDays(w, 1);
    if (w.day % DAYS_PER_MONTH === 0) continue;
    rushed.units += s.site.month.units - u;
    rushed.gold += s.site.month.gold - g;
    rushed.days += 1;
  }
  rushed.perCrew = Math.round((rushed.units / rushed.days / rushed.crews) * DAYS_PER_MONTH * 100) / 100;
  rushed.perUnit = Math.round((rushed.gold / rushed.units) * 100) / 100;
  return { paused, roads, founding, paid, camp: camp.price, campSet: campSet.ok, guilds, plain, withCamp, rushOk, rushed, stock: { ...s.site.stock }, work: workGoldPerUnit(w, s.style), rush: rushGoldPerUnit(w, s.style), reason: s.site.reason };
}
