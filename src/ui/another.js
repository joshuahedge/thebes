// Version 5.0 (Task 4, ruling 505): Build another's decision for a building sheet. anotherFor(world, b) asks the sim (anotherOf, src/sim/another.js: unlocked, only one of a
// kind, a price the treasury can pay) and then the one thing only the map knows, a tile where it fits (nearestFit over the whole map and the sim's canPlace, the search Show me
// runs). { ok: true, tool, item, at } carries the tool to start (the same type, turn and style, with the settings it copies); { ok: false, reason, text, fix } says why not in the
// sim's numbers, with the fix a Show me button runs (the advice's fix shapes: select, view, or a card near a target).
import { BUILDINGS } from '../data/buildings.js';
import { anotherOf } from '../sim/another.js';
import { canPlace } from '../sim/commands.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { isLargePlot } from '../sim/largePlots.js';
import { costOf } from '../sim/costs.js';
import { canAfford } from '../sim/money.js';
import { nearestFit } from './placement.js';
import { ANOTHER_TEXT } from './areaText.js';

export const canCopy = (b) => Boolean(b) && Boolean(BUILDINGS[b.type]) && BUILDINGS[b.type].buildable !== false && !BUILDINGS[b.type].tile;

export function anotherFor(world, b) {
  const centre = { x: b.x + b.w / 2, y: b.y + b.d / 2 };
  const r = anotherOf(world, b);
  const refuse = (why, extra = {}) => ({ ok: false, reason: why.reason, text: ANOTHER_TEXT.refusal(world, why, extra.why), fix: extra.fix || null });
  if (!r.ok) {
    const fix = r.reason === 'no_gold' ? { view: 'summary', section: 'forecast' }
      : r.reason === 'locked' ? { view: 'summary', section: null }
        : r.reason === 'one_only' && r.id !== b.id ? { select: r.id } : null;
    return refuse(r, { fix });
  }
  if (isLargePlot(b)) {   // Version 6.0 (Track C): another of a Large plot is the Large plot card, at the nearest tile where a lot fits, at its own price
    const lot = { kind: 'building', type: LARGE_PLOT.type }, cost = costOf(world, LARGE_PLOT.type);
    if (!canAfford(world, cost)) return refuse({ reason: 'no_gold', type: LARGE_PLOT.type, cost, have: world.gold, monument: false }, { fix: { view: 'summary', section: 'forecast' } });
    const spot = nearestFit(world, lot, centre.x - LARGE_PLOT.size / 2, centre.y - LARGE_PLOT.size / 2, null, world.size);
    const fit = canPlace(world, LARGE_PLOT.type, spot.x, spot.y, { roadLater: true });
    if (!fit.ok) return refuse({ reason: 'no_room', type: LARGE_PLOT.type }, { why: ANOTHER_TEXT.noRoomWhy(LARGE_PLOT.type, fit.reason) });
    return { ok: true, tool: lot, item: LARGE_PLOT.type, at: centre, cost, copy: null };
  }
  if (b.type === 'house') return { ok: true, tool: { kind: 'houses' }, item: 'house', at: centre, cost: r.cost, copy: null };
  const tool = { kind: 'building', type: b.type, ...(r.rot ? { rot: r.rot } : {}), ...(r.style ? { style: r.style } : {}), ...(r.copy ? { copy: r.copy } : {}) };
  const def = BUILDINGS[b.type];
  const spot = nearestFit(world, tool, centre.x - def.w / 2, centre.y - def.d / 2, null, world.size);
  const turn = spot.rot === undefined ? r.rot : spot.rot;
  const fit = canPlace(world, b.type, spot.x, spot.y, { roadLater: true, rot: turn, style: r.style });
  if (!fit.ok) {
    const why = ANOTHER_TEXT.noRoomWhy(b.type, fit.reason);
    return refuse({ reason: 'no_room', type: b.type }, { why, fix: def.terrain ? { item: b.type, at: 'terrain', target: centre } : null });
  }
  return { ok: true, tool: turn ? { ...tool, rot: turn } : tool, item: b.type, at: centre, cost: r.cost, copy: r.copy };
}
