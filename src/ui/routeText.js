// Version 5.0 (Task 5, rulings 560-569): the words of the routed road. Every number is the sim's: the tiles, the price and the bridges come from routeRoad
// (src/sim/route.js, whose cost is previewRoadTiles' own), the reach of a bridge from BRIDGE_MAX, and a refusal's reason and place from the search that failed.
import { BRIDGE_MAX } from '../sim/bridges.js';
import { FERRY } from '../data/ferries.js';
import { buildingName, plural, reasonText } from './text.js';

export const ROUTE_MODES = ['route', 'straight'];

export const ROUTE_TEXT = {
  group: 'Road shape',
  route: 'Route', straight: 'Straight',
  // Each button's name for a screen reader; it starts with the button's visible word, then says what the shape does.
  routeLabel: 'Route: the road finds the cheapest way round hills, buildings and water, with a bridge where one fits',
  straightLabel: 'Straight: the road goes where you point or drag, in an L you can flip',
  // Before a start is set (the bar's first line): how to choose the two ends.
  idleTouch: 'Tap the start, then the end: the road finds its way',
  idleMouse: 'Click the start, then the end: the road finds its way',
  // The bridges a route would build, with their tiles and price (the sim's count and cost): "1 bridge (3 tiles, 75 gold)".
  bridges: (n, tiles, cost) => `${plural(n, 'bridge', 'bridges')} (${plural(tiles, 'tile', 'tiles')}, ${cost} gold)`,
  // A gate laid in a standing wall or a breach: what it does is the sim's (a gate keeps the wall's hit points, and raiders path it as wall: defence.js, wallHpFor).
  gates: (n) => (n === 1 ? '1 gate in your wall (raiders still treat it as wall)' : `${n} gates in your wall (raiders still treat them as wall)`),
  used: (n) => `${plural(n, 'tile', 'tiles')} of road already there`,
  // The route's line: "14 tiles · 1 bridge (3 tiles, 75 gold) · 6 tiles of road already there".
  summary(r) {
    const gates = (r.gates || []).length, bridges = (r.bridges || []).length, roads = r.tiles.length - gates - bridges;
    const parts = [plural(roads + gates + bridges, 'tile', 'tiles')];
    if (bridges) parts.push(ROUTE_TEXT.bridges(r.crossings, bridges, r.bridgeCost));
    if (gates) parts.push(ROUTE_TEXT.gates(gates));
    if (r.used) parts.push(ROUTE_TEXT.used(r.used));
    return parts.join(' · ');
  },
  // Why there is no way, in the search's own findings (route.js explain): the water's width against what a bridge spans, the first building in the way.
  refusal(world, r) {
    if (r.reason === 'too_wide') return `No way across: the water is too wide here (${plural(r.water, 'tile', 'tiles')}; a bridge spans up to ${BRIDGE_MAX})${r.water <= FERRY.max ? ': lay a ferry with the Crossing card' : ''}`;   // Version 7.1 (Track F): up to a ferry's width the way on is the Ferry tool; 8.3 (ruling 1403): the Crossing card (Route lays bridges only)
    if (r.reason === 'boxed_in') {
      const b = r.at ? world.buildings[world.occ[r.at[1] * world.size + r.at[0]]] : null;
      return `No way there: buildings close it off${b ? ` (${buildingName(b.type).toLowerCase()} in the way)` : ''}`;
    }
    if (r.reason === 'hemmed_in') return 'No way there: hills close it off';
    if (r.reason === 'no_way') return 'No way there: hills, buildings and water close it off';
    if (r.reason === 'too_far') return 'Too far to find a way from here: pick an end nearer the start';
    return reasonText(r.reason);
  },
  // The refusals that have a place to show, and what Show me says it shows.
  showMeLabel: 'Show me where the way is blocked',
  // Named as roadDoneText names a road's bridges and gates (the bridges built, then the gates laid in a wall): "Road laid · 1 bridge · 2 gates".
  laid(r) {
    const parts = ['Road laid'], gates = (r.gates || []).length;
    if (r.crossings) parts.push(plural(r.crossings, 'bridge', 'bridges'));
    if (gates) parts.push(plural(gates, 'gate', 'gates'));
    return parts.join(' · ');
  },
};
