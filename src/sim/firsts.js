// Firsts (spec 3.6): each is recorded once per city, pays FIRST_REWARD and reports where it happened so the
// interface can put a sparkle on the building. Pure checks against the world; data in src/data/firsts.js.
import { FIRSTS, FIRST_REWARD } from '../data/firsts.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIERS } from '../data/housing.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf, population, isFinished } from './world.js';
import { lacksRoad } from './reach.js';
import { builtNearOasis } from './oases.js';

const centre = (b) => (b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : { x: null, y: null });
const isFull = (h) => h.tier >= 1 && h.residents >= TIERS[h.tier].capacity;
const holdsFood = (b) => (BUILDINGS[b.type].stores || []).some((g) => FOOD_GOODS.includes(g) && (b.store[g] || 0) > 0);
const holds = (good) => (b) => (BUILDINGS[b.type].stores || []).includes(good) && (b.store[good] || 0) > 0;
const makes = (good) => (b) => Boolean(BUILDINGS[b.type].produces && BUILDINGS[b.type].produces.good === good);
// The building a tally's first shows on: the first granary holding food for a harvest, the trading post for a caravan.
const TALLY_PLACE = { harvested: holdsFood, caravans: (b) => b.type === 'trading_post' };
// Stage 4: the first course shows on the first site with a course laid, the first monument on the first finished one.
Object.assign(TALLY_PLACE, { courses: (b) => Boolean(b.site) && b.site.course > 0, monumentsDone: isFinished });
// Stage 4.7: the first building within reach of an oasis (its place takes the world too).
Object.assign(TALLY_PLACE, { oasisBuilds: (b, world) => builtNearOasis(world, b) });
// Stage 4.7 (Task 5): the first cart trip shows on the first store with an order.
Object.assign(TALLY_PLACE, { cartTrips: (b) => Boolean(b.orders) && Object.keys(b.orders).length > 0 });

// null when the first has not happened; otherwise where it happened: the centre of the building that shows
// it (the first lived-in home, the first full home, the first granary holding food, the first home at the
// tier, the first trading post for a caravan, the first store holding a good made, else the first building
// that makes it), or { x: null, y: null } when nothing on the map shows it (a month in profit). def is a
// FIRSTS entry.
export function firstMet(world, def) {
  const c = def.check || def;
  switch (c.kind) {
    case 'people':
      return population(world) >= c.n ? centre(housesOf(world).find((h) => h.residents > 0)) : null;
    case 'fullHome': {
      const h = housesOf(world).find(isFull);
      return h ? centre(h) : null;
    }
    case 'tier': {
      const houses = housesOf(world);
      const at = houses.find((h) => h.tier === c.tier) || houses.find((h) => h.tier >= c.tier);
      return at ? centre(at) : null;
    }
    case 'tally':
      if ((world.tally[c.key] || 0) < c.n) return null;
      return centre(TALLY_PLACE[c.key] ? allBuildings(world).find((b) => TALLY_PLACE[c.key](b, world)) : null);
    case 'made': {
      if (((world.tally.made || {})[c.good] || 0) < c.n) return null;
      const all = allBuildings(world);
      return centre(all.find(holds(c.good)) || all.find(makes(c.good)));
    }
    case 'building': {                                                   // Stage 3: the first one of a type a road touches (P11), where it stands
      const b = allBuildings(world).find((x) => x.type === c.type && !lacksRoad(world, x));
      return b ? centre(b) : null;
    }
    case 'tallies':                                                      // Stage 3: tallies added together (blazes and fires put out)
      return c.keys.reduce((s, k) => s + (world.tally[k] || 0), 0) >= c.n ? centre(null) : null;
    case 'unlocked':                                                     // Stage 4: a prestige unlock reached (nothing on the map shows it)
      return Number.isInteger(world.prestigeUnlocks[c.type]) ? centre(null) : null;
    default:
      return null;
  }
}

// Records every first that has happened and is not yet recorded. A world whose firsts are null (a city
// migrated from version 1) has its already-true firsts marked silently: no events, no gold.
// Returns the ids recorded with a celebration by this call.
export function checkFirsts(world, events = null) {
  if (world.firsts === null) {
    world.firsts = FIRSTS.filter((f) => firstMet(world, f)).map((f) => f.id);
    return [];
  }
  const added = [];
  for (const f of FIRSTS) {
    if (world.firsts.includes(f.id)) continue;
    const at = firstMet(world, f);
    if (!at) continue;
    world.firsts.push(f.id);
    world.gold += FIRST_REWARD;
    added.push(f.id);
    if (events) events.push({ type: 'first', id: f.id, reward: FIRST_REWARD, x: at.x, y: at.y });
  }
  return added;
}
