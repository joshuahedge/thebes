// Show me on a disease or crime alert (Stage 4.5): the alert's own cause (src/sim/health.js healthCause, crime.js crimeCause, the one
// its words say) decides what to build. With no physician or police post in road reach, the card for one, ghost by the home; with no
// road beside the home, the road tool there; any other cause (short of workers, paused, burning) is for View, so no Show me.
import { healthCause } from '../sim/health.js';
import { crimeCause } from '../sim/crime.js';

// Version 8.2.1 (ruling 1366): Show me on the bazaar's food alerts, aimed by the sim's reason (src/sim/housing.js bazaarFoodProblem): { view: id }
// selects the building to fix (a granary that is paused, short of workers or not joined by road; a farm that fills it and is not working), and
// { showMe } opens the card it needs: a granary by the bazaar (no store near it), a farm by the granary (nothing fills it, or too little), a second
// bazaar (it sells out). null for any other alert.
export function bazaarFix(world, alert) {
  const b = world.buildings[alert.id];
  if (!b || (alert.code !== 'bazaar_empty' && alert.code !== 'bazaar_sold_out')) return null;
  const at = (o) => ({ x: o.x + o.w / 2, y: o.y + o.d / 2 });
  if (alert.code === 'bazaar_sold_out') return { showMe: { category: 'services', item: 'bazaar', ...at(b) } };
  const store = alert.store ? world.buildings[alert.store] : null;
  if (!alert.reason || !store) return { showMe: { category: 'food', item: 'granary', ...at(b) } };
  if (alert.reason === 'granary_idle' || alert.reason === 'granary_apart') return { view: store.id };
  if (alert.maker === 'idle') return { view: alert.makerId };
  return { showMe: { category: 'food', item: 'farm_grain', ...at(store) } };
}

// { category, item, x, y } for createUI's showMeAt, or null.
export function alertShowMe(world, alert) {
  if (alert.code !== 'illness' && alert.code !== 'crime_risk') return null;
  const b = world.buildings[alert.id];
  if (!b) return null;
  const c = alert.code === 'illness' ? healthCause(world, b) : crimeCause(world, b);
  const at = { x: b.x + b.w / 2, y: b.y + b.d / 2 };
  if (c.cause === 'none') return { category: 'services', item: alert.code === 'illness' ? 'physician' : 'police_post', ...at };
  if (c.cause === 'no_road') return { category: 'roads', item: 'road', ...at };
  return null;
}
