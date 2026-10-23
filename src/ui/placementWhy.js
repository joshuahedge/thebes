// Version 7.0, Track P (ruling 1008): why a building's ghost is blue, amber or coral, and what it needs. Josh played 6.0.1 and found the whole ghost going yellow or red with no way to
// tell why ("a farm needs green ground, but can its road be one tile away?"). The sim already judges every rule on its own (src/sim/commands.js conditionsFor: the ground tile by
// tile, the road, the store in reach, the gold) and this file only words that judgement, never a second copy of it:
//   coral  (state 'cant')   it cannot be placed here: at least one rule is broken, and every broken rule is named with its count;
//   amber  (state 'later')  it can be placed but will not work yet (no road touching it, no store in reach): the rules that are not met yet are named;
//   blue   (state 'ok')     everything is met, and the line says what the building needs, so the player learns it before a refusal.
// placementWhy(c, type, chips) -> { state, lead, parts: [{ key, state, text }], text, needs }. `c` is conditionsFor's answer for the spot, `chips` the confirm bar's chips by key (the
// store, crew, supply and gold sentences are the chips' own words: one set of words for the same rule). A refusal before any tile has no conditions: its own words stand.
import { BUILDINGS } from '../data/buildings.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { P_TEXT, S46_MAP_TEXT, UI4_TEXT, buildingName } from './text.js';
import { storeFor } from '../sim/advice.js';

const W = P_TEXT.place;

// The ground rule's clauses, one for each way the footprint fails, counted over its squares.
function groundParts(c, def) {
  const ground = c.conditions.find((k) => k.key === 'ground');
  if (!ground || ground.state === 'met') return [];
  const of = c.tiles.length, count = (r) => c.tiles.filter((t) => t.reason === r).length;
  const out = [];
  const taken = count('occupied'), water = count('water'), hills = count('hills'), off = count('out_of_bounds');
  // The terrain rule counted as the sim counts it (conditionsFor's fit, of and need: every square for the fertile and rocky ground, fewer for the clay pit).
  if (def.terrain && ground.terrain && ground.fit < (Number.isInteger(ground.need) ? ground.need : ground.of)) out.push(W.terrain(ground.terrain, ground.fit, ground.of, Number.isInteger(ground.need) ? ground.need : ground.of));
  if (taken) out.push(W.taken(taken, of));
  if (water) out.push(W.inWater(water, of));
  if (hills) out.push(W.hills(hills, of));
  if (off) out.push(W.offMap(off, of));
  const fields = count('not_on_fields');
  if (fields) out.push(UI4_TEXT.notOnFields(ground.fertile, ground.of));
  // The whole-footprint water rule, judged once every square is free.
  if (!out.length && ground.reason === 'needs_river') out.push(W.water.river);
  else if (!out.length && ground.reason === 'needs_water') out.push(W.water[ground.water] || S46_MAP_TEXT.water[ground.water]);
  if (!out.length) out.push(S46_MAP_TEXT.refusalLine(ground.reason, ground, def) || '');
  return out.filter(Boolean);
}

// The road rule's clause (a plot's own words for it), with the way out when free squares beside it can take one.
function roadPart(c, def, type, plot, short = false) {
  const road = c.conditions.find((k) => k.key === 'road');
  if (!road || road.state === 'met') return null;
  const near = Boolean(c.more && c.more.near) && !short;       // the short form (a rule listed after a refusal) leaves out the aside about a road one tile off
  const base = plot ? (near ? W.roadPlot.near : W.roadPlot.none) : (near ? W.road.near : W.road.none);
  return !near && !short && road.joins && road.joins.length ? `${base}: ${W.road.joins}` : base;   // the marked squares are where a road would touch; with one close by, the words about touching are enough
}

export function placementWhy(c, type, chips = {}) {
  if (!c || !c.conditions || !c.conditions.length) return { state: c ? c.state : 'cant', lead: '', parts: [], text: '', needs: '' };
  const def = BUILDINGS[type] || {};
  const plot = type === 'house' || type === LARGE_PLOT.type;
  const parts = [];
  for (const k of c.conditions) {
    if (k.state === 'met') continue;
    if (k.key === 'ground') for (const text of groundParts(c, def)) parts.push({ key: 'ground', state: k.state, text, short: text });
    else if (k.key === 'road') parts.push({ key: 'road', state: k.state, text: roadPart(c, def, type, plot), short: roadPart(c, def, type, plot, true) });
    else if (chips[k.key] && chips[k.key].text) parts.push({ key: k.key, state: k.state, text: chips[k.key].text, short: chips[k.key].text });
  }
  const cant = parts.filter((p) => p.state === 'cant'), later = parts.filter((p) => p.state === 'later');
  const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);                       // the lead and a colon come first: "Won't work yet: no granary within reach"
  const join = (list, field = 'text') => list.map((p) => low(p[field])).join(W.and);
  // A refusal says its broken rules first and names the rest after it in their short forms ("and no road touching a side"), so two lines of a phone's bar hold both.
  let text = '';
  if (cant.length) text = `${W.leadCant}: ${join(cant)}${later.length ? `${W.also} ${join(later, 'short')}` : ''}`;
  else if (later.length) text = `${W.leadLater}: ${join(later)}`;
  return { state: c.state, lead: cant.length ? W.leadCant : later.length ? W.leadLater : '', parts, text, needs: text ? '' : needsLine(type, c) };
}

// What a building needs, from its own row: its terrain rule (every square, or at least some), its water rule, a road, and the store its work reaches. '' when it needs nothing.
export function needsLine(type, c = null) {
  const def = BUILDINGS[type];
  if (!def || def.monument) return '';                                   // a monument's own line says what it needs (its crew, its stone)
  const list = [];
  const of = def.w * def.d;
  if (def.terrain) {
    const ground = c && c.conditions ? c.conditions.find((k) => k.key === 'ground') : null;
    const need = ground && Number.isInteger(ground.need) ? ground.need : Number.isInteger(def.terrainMin) ? Math.min(def.terrainMin, of) : of;
    list.push(W.needsTerrain(def.terrain, need, ground && ground.of ? ground.of : of));
  }
  if (def.water) list.push(W.needsWater[def.water] || W.needsWater.touch);
  if (def.needsRoad || type === 'house' || type === LARGE_PLOT.type) list.push(W.needsRoad);   // a plot asks for no road to be laid, but no one moves in without one
  if (def.produces && def.producerReach) list.push(W.needsStore(buildingName(storeFor(def.produces.good)).toLowerCase(), def.producerReach));
  if (def.sells && def.supplyReach) list.push(W.needsSupply(buildingName('granary').toLowerCase(), def.supplyReach));   // the bazaar's food comes from a granary (warningText's no_supply)
  if (!list.length) return '';
  const last = list.length > 1 ? ` and ${list[list.length - 1]}` : '';
  return `${W.needsHead} ${list.length > 1 ? list.slice(0, -1).join(', ') : list[0]}${last}`;
}
