// Version 5.0 (Task 4, rulings 550-559): the words of drag areas (farms, gardens and statues laid as a rectangle) and of Build another. Every number is the
// sim's: an area's count, price and the skipped tiles come from previewAreaTiles (src/sim/areas.js), a refusal's numbers from anotherOf (src/sim/another.js).
import { buildingName, plural, reasonText, warningText, S45_TEXT } from './text.js';
import { ECONOMY } from '../data/economy.js';
import { lockTextOf } from './cards.js';
import { GROUND } from './nextStepText.js';
import { BUILDINGS } from '../data/buildings.js';

const WORDS = { farm_grain: ['farm', 'farms'], farm_barley: ['farm', 'farms'], farm_flax: ['farm', 'farms'], farm_fig: ['orchard', 'orchards'], garden: ['garden', 'gardens'], statue: ['statue', 'statues'] };
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export const areaCount = (type, n) => { const w = WORDS[type] || [buildingName(type).toLowerCase(), `${buildingName(type).toLowerCase()}s`]; return plural(n, w[0], w[1]); };
// Short names for the reasons a tile is skipped (the sim's own tile reasons): "24 not fertile, 7 water".
const TILE_WHY = { needs_fertile: 'not fertile', needs_rocky: 'not rocky', needs_clay: 'not clay', water: 'water', hills: 'hills', occupied: 'taken', out_of_bounds: 'off the map', not_on_fields: 'fields' };
const whyOf = (code) => TILE_WHY[code] || lower(reasonText(code));

export const SPACING_NAMES = { 1: 'Every tile', 2: 'Every 2nd', 3: 'Every 3rd' };

export const AREA_TEXT = {
  title: (type) => `${buildingName(type)} area`,
  // The cost line: what the whole area costs, with how many it lays ("6 farms · 240 gold").
  costLine: (type, n, cost) => `${areaCount(type, n)} · ${cost} gold`,
  // The tiles skipped and why, the two commonest reasons: "31 tiles skipped: 24 not fertile, 7 water".
  skipped(skipped) {
    const by = new Map();
    for (const s of skipped) by.set(s.reason, (by.get(s.reason) || 0) + 1);
    const top = [...by.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2).map(([code, n]) => `${n} ${whyOf(code)}`);
    return `${plural(skipped.length, 'tile', 'tiles')} skipped: ${top.join(', ')}${by.size > 2 ? ', other' : ''}`;
  },
  // Version 6.0 (Track C): ground the area has but too little of for one more farm, marked and counted apart from the ground the sim refuses ("3 left over: too small for another farm").
  leftover: (type, n) => { const word = (WORDS[type] || [buildingName(type).toLowerCase()])[0]; return `${n} left over, too small for ${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`; },
  nothing: (type, skipped) => `No ${buildingName(type).toLowerCase()} fits here${skipped.length ? `: ${AREA_TEXT.skipped(skipped).replace(/^\d+ tiles? skipped: /, '')}` : ''}`,
  // The treasury rule, as the sim applies it (previewAreaTiles 'no_gold'): the whole area is refused, and the bar says how many the treasury can pay for.
  noGold: (type, r) => `The treasury can pay for ${r.afford} of ${r.positions.length} (debt stops at ${-ECONOMY.debtFloor}): nothing is laid`,
  warning: (code, type) => warningText(code, type),
  laid: (type, n) => `${areaCount(type, n)} laid`,
  upkeepFor: (bill, n) => S45_TEXT.upkeepLine({ bill: bill.bill * n, workers: bill.workers * n }),
  // The bar's buttons.
  area: 'Drag an area', one: 'Place one',
  areaLabel: (type) => `Drag an area of ${areaCount(type, 2).replace(/^2 /, '')}`,
  oneLabel: (type) => `Place one ${buildingName(type).toLowerCase()}`,
  spacingGroup: 'Spacing',
  // One spacing's button name for a screen reader (it starts with the button's visible words, 'Every 2nd'): what it would lay in the area drawn now, or the rule when nothing is drawn.
  spacingLabel: (gap, type, r) => `${SPACING_NAMES[gap]}${gap === 1 ? '' : ' tile'}: ${r ? (r.positions.length ? `${areaCount(type, r.positions.length)}, ${r.cost} gold` : 'nothing fits') : `one ${buildingName(type).toLowerCase()} every ${gap === 1 ? 'tile' : `${gap} tiles`} each way`}`,
};

// Build another: the button, its refusal and the line that says what a copy takes with it (shown before the tick, ruling 505).
export const ANOTHER_TEXT = {
  button: 'Build another',
  label: (type) => `Build another ${buildingName(type).toLowerCase()}`,
  // The refusal for the sim's reasons (anotherOf) and the UI's one (no tile fits): "Can't build another well: another costs 30 gold; you have 10 ...".
  refusal(world, r, why = null) {
    const name = lower(buildingName(r.type));
    const head = `Can't build another ${name}`;
    if (r.reason === 'locked') return `${head}: ${lockTextOf(world, r.type)}`;
    if (r.reason === 'one_only') return `${head}: ${lower(reasonText('one_only'))}`;
    if (r.reason === 'no_gold') return `${head}: it costs ${r.cost} gold and the treasury has ${r.have}${r.monument ? ' (founding never takes it below 0)' : `, with debt stopping at ${-ECONOMY.debtFloor}`}`;
    if (r.reason === 'no_room') return `${head}: ${why}`;
    return `${head}: ${lower(reasonText(r.reason))}`;
  },
  noRoomWhy: (type, reason) => (BUILDINGS[type].terrain ? `no ${GROUND[BUILDINGS[type].terrain] || 'ground'} with room for it` : lower(reasonText(reason))),
  // What the copy takes along, one short line: "Copies Fetch: pottery 100, linen 40 · refuses beer".
  copy(copy, goodName) {
    if (!copy) return '';
    const parts = [];
    if (copy.fetch && copy.fetch.length) parts.push(`Copies Fetch: ${copy.fetch.map((o) => `${goodName(o.good)} ${o.fetch}`).join(', ')}`);
    if (copy.refuses && copy.refuses.length) parts.push(`${parts.length ? '' : 'Copies settings: '}refuses ${copy.refuses.map((g) => goodName(g).toLowerCase()).join(', ')}`);
    return parts.join(' · ');
  },
  copiedToast: (name) => `${name} placed with the same settings`,
};
