// Version 6.0, Track A's dev scenes (src/dev/v60/index.js joins them): the court's demands and the great work. Track 0 left minimal
// worlds; Track A owns this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v60-demand     { state: 'offered' | 'open' } opens the demand sheet on a demand for 400 linen (offered: Accept and Decline with what each
//                  does; open: accepted, due in 12 months, Send); with no state, Track 0's world (the record pushed, no sheet).
//   v60-greatwork  { state: 'rising' | 'won' } makes the sample city the Seat of the Two Lands with the great temple founded (rising: stage 3
//                  of 5 waiting for its offering, the great work's sheet open; won: finished, the closing scene open); with no state,
//                  Track 0's world (a Capital, nothing founded).
import { courtDemands, greatWorkOf, acceptDemand, demandDay } from '../../sim/demands.js';
import { canPlace, place } from '../../sim/commands.js';
import { allBuildings } from '../../sim/world.js';
import { GREAT_WORK, DEMANDS, newDemandState } from '../../data/reign.js';
import { MONUMENTS } from '../../data/monuments.js';
import { openSheet } from '../../ui/modes.js';
import { sampleCity, look, wait } from './base.js';

// The seed-11 sample city (a Capital) with one demand: 400 linen within 12 months. options: gold, quick, state.
export async function demandScene(api, options = {}) {
  const world = sampleCity(api, 'v60-demand', options);
  world.demands = newDemandState();                          // the sample city's own demands set aside: this scene's is demand 1
  const d = world.demands;
  if (!options.state) {
    d.open.push({ id: d.nextId++, kind: 'goods', good: 'linen', amount: 400, day: world.day, due: world.day + 12 * 30, accepted: false });
  } else {
    const F = DEMANDS.favour;
    d.open.push({
      id: d.nextId++, kind: 'goods', good: 'linen', type: null, amount: 400, reward: 3360, day: world.day, accepted: false,
      offerDue: world.day + DEMANDS.offerMonths * 30, due: world.day + DEMANDS.offerMonths * 30, months: 12, met: 10, failed: F.failed[1], declined: F.declined, had: null,
    });
    if (options.state === 'open') acceptDemand(world, d.open[0].id);
    const g = api.game();
    g.ui.store.set(openSheet(g.ui.store.get(), 'demand'));
  }
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const open = courtDemands(world)[0];
  return `v60-demand: demand ${open.id} (${open.kind}, ${open.amount} ${open.good}, ${open.monthsLeft} months left, ${open.accepted ? 'accepted' : 'offered'})`;
}

// The first spot from the city's focus outwards (rings of tiles) where the great temple's footprint may go, a road to come.
function templeSpot(world) {
  const m = MONUMENTS[GREAT_WORK.type];
  for (let r = 0; r < world.size; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.round(world.focus.x) + dx - Math.floor(m.w / 2), y = Math.round(world.focus.y) + dy - Math.floor(m.d / 2);
        if (canPlace(world, GREAT_WORK.type, x, y, { roadLater: true }).ok) return { x, y };
      }
    }
  }
  return null;
}

// The seed-11 sample city (a Capital), no great work founded yet; with a state, the Seat with the great temple rising or finished.
// options: gold, quick, state.
export async function greatWorkScene(api, options = {}) {
  const world = sampleCity(api, 'v60-greatwork', options.state ? { gold: 60000, ...options } : options);
  if (options.state) {
    world.milestone = 'seat';
    const at = templeSpot(world);
    const r = at ? place(world, GREAT_WORK.type, at.x, at.y, { roadLater: true }) : { ok: false };
    if (r.ok) {
      const b = world.buildings[r.id];
      world.reign.greatWork = b.id;
      if (options.state === 'won') {
        b.site.course = MONUMENTS[b.type].courses.length;
        b.site.done = world.day;
        world.reign.offered = GREAT_WORK.stages.length;
        demandDay(world, []);                  // the reign is won: the sealed score
      } else {
        b.site.course = 2 * GREAT_WORK.perStage;   // stages 1 and 2 stand; stage 3's offering is owed
        world.reign.offered = 2;
        b.site.reason = 'waiting_offering';
        b.site.idle = 4;
      }
      look(api, b.x + b.w / 2, b.y + b.d / 2, 0.9);
      const g = api.game();
      g.ui.store.set(openSheet(g.ui.store.get(), options.state === 'won' ? 'reignWon' : 'greatWork'));
    }
  } else look(api, world.focus.x, world.focus.y, 0.7);
  if (!options.quick) await wait(300);
  const gw = greatWorkOf(world) || allBuildings(world).find((b) => b.type === GREAT_WORK.type) || null;
  return `v60-greatwork: ${world.milestone}, ${gw ? `great work ${gw.id}` : 'no great work founded'}, reign ${world.reign.won === null ? 'not won' : 'won'}`;
}
