// Firsts (spec 3.6): each is recorded once per city, pays FIRST_REWARD and reports where it happened so the
// interface can put a sparkle on the building. Pure checks against the world; data in src/data/firsts.js.
import { FIRSTS, FIRST_REWARD } from '../data/firsts.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIERS } from '../data/housing.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf, population } from './world.js';

const centre = (b) => (b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : { x: null, y: null });
const isFull = (h) => h.tier >= 1 && h.residents >= TIERS[h.tier].capacity;
const holdsFood = (b) => (BUILDINGS[b.type].stores || []).some((g) => FOOD_GOODS.includes(g) && (b.store[g] || 0) > 0);

// null when the first has not happened; otherwise where it happened: the centre of the building that shows
// it (the first lived-in home, the first full home, the first granary holding food, the first home at the
// tier), or { x: null, y: null } when nothing on the map shows it (a month in profit). def is a FIRSTS entry.
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
      return centre(c.key === 'harvested' ? allBuildings(world).find(holdsFood) : null);
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
