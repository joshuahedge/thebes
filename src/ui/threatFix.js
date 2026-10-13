// Show me on a disease or crime alert (Stage 4.5): the alert's own cause (src/sim/health.js healthCause, crime.js crimeCause, the one
// its words say) decides what to build. With no physician or police post in road reach, the card for one, ghost by the home; with no
// road beside the home, the road tool there; any other cause (short of workers, paused, burning) is for View, so no Show me.
import { healthCause } from '../sim/health.js';
import { crimeCause } from '../sim/crime.js';

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
