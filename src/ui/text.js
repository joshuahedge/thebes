// Every string the interface shows. Plain English, sentence case, no jargon. Components import from here
// and never carry literal game text.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { FIRSTS } from '../data/firsts.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { PARTNERS } from '../data/trade.js';
import { TRADE_KEEP_STEP, DESIRABILITY_STEPS } from '../data/ui.js';
import { ECONOMY, FORECAST } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { MAP } from '../data/map.js';
import { roadCostOf } from '../sim/costs.js';
import { producerRefused } from '../sim/production.js';
import { isUnlocked } from '../sim/progression.js';

export const CATEGORY_NAMES = { roads: 'Roads', homes: 'Homes', food: 'Food', industry: 'Industry', services: 'Services', defence: 'Defence', monuments: 'Monuments' };

export function buildingName(type) {
  if (type === 'road') return 'Road';
  if (type === 'demolish') return 'Demolish';
  return BUILDINGS[type] ? BUILDINGS[type].name : type;
}

export const NEED_NAMES = {
  road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple',
  pottery: 'Pottery', entertainment: 'Entertainment', beer: 'Beer', twoFoods: 'Two kinds of food', linen: 'Linen', jewellery: 'Jewellery',
  desirability: 'Desirability', merge: `Room to become a ${TIERS[6].name}`,
};

// Goods' names come from the data (GOODS[good].name), as buildings' do; inside a sentence they are lower case.
export const goodName = (good) => (GOODS[good] ? GOODS[good].name : good);
const goodWord = (good) => goodName(good).toLowerCase();

// Trade partners, keyed by the ids in src/data/trade.js.
export const PARTNER_NAMES = { memphis: 'Memphis', byblos: 'Byblos' };
export const partnerName = (id) => PARTNER_NAMES[id] || id;

// "a", "a and b", "a, b and c".
export function listText(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// The building that makes a good and the one that stores it, from the data (null when there is none).
export const makerOf = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good) || null;
export const storeFor = (good) => Object.keys(BUILDINGS).find((t) => (BUILDINGS[t].stores || []).includes(good)) || null;
const pluralName = (type) => BUILDING_PLURALS[type] || `${buildingName(type).toLowerCase()}s`;
// Every building that makes a food (FOOD_GOODS), in the data's order, and their names as a list: "grain farms, fig orchards, hunting lodges and
// fishing wharves". The food causes and fixes name these, never grain alone (final review: game and fish fill a granary too).
export const foodMakers = () => Object.keys(BUILDINGS).filter((t) => BUILDINGS[t].produces && FOOD_GOODS.includes(BUILDINGS[t].produces.good));
export const foodMakersText = () => listText(foodMakers().map(pluralName));

// Every good's line (spec 4.10): what makes it, what uses it and who trades it, built from the data so it never
// drifts: "Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis and Byblos".
export function goodLine(good) {
  const types = Object.keys(BUILDINGS);
  const makers = types.filter((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good);
  const users = types.filter((t) => BUILDINGS[t].consumes === good);
  const need = GOODS[good] && GOODS[good].kind === 'food' ? 'food' : good;
  const tier = TIERS.findIndex((t) => t && t.needs.includes(need));
  const parts = [];
  if (makers.length) {
    const from = BUILDINGS[makers[0]].consumes;
    parts.push(`made by ${listText(makers.map(pluralName))}${from ? ` from ${goodWord(from)}` : ''}`);
  }
  if (users.length) parts.push(`used by ${listText(users.map(pluralName))}`);
  else if (tier > 0) parts.push(`used by ${TIERS[tier].name}s and up`);
  else if (GOODS[good] && GOODS[good].kind === 'material') parts.push('used by monument sites');   // Stage 4 (spec 4.10)
  const buyers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].buys[good]).map(partnerName);
  const sellers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].sells[good]).map(partnerName);
  if (buyers.length) parts.push(`sold to ${listText(buyers)}`);
  if (sellers.length) parts.push(`bought from ${listText(sellers)}`);
  return parts.length ? `${goodName(good)}: ${parts.join('; ')}` : goodName(good);
}

// A producer's status line on its sheet: "Making pottery from clay", "Growing figs", "Digging clay", or, when a
// workshop has nothing to work, "Waiting for clay".
const MAKE_VERBS = { clay: 'Digging', gems: 'Mining' };
// Stage 4.6: the River track's two foods say what the crew does, not the good twice (final review: "Hunting game", "Fishing fish").
const MAKE_LINES = { game: 'Hunting the herds', fish: 'Fishing the river' };
export function workingText(type) {
  const def = BUILDINGS[type];
  const good = goodWord(def.produces.good);
  if (MAKE_LINES[def.produces.good]) return MAKE_LINES[def.produces.good];
  return def.consumes ? `Making ${good} from ${goodWord(def.consumes)}` : `${MAKE_VERBS[def.produces.good] || 'Growing'} ${good}`;
}
export const waitingText = (good) => `Waiting for ${goodWord(good)}`;

// The house sheet's causes and fixes (early-game pass 2.10), keyed by needCause codes. Reaches come from the data.
// A provider in reach that is not working (well_idle, bazaar_idle, temple_idle, granary_idle) words itself by the building's own
// state: causeText picks `paused` or `short`.
const idleWords = (type) => {
  const name = buildingName(type).toLowerCase();
  return {
    paused: { cause: `The ${name} is paused`, fix: 'Resume it' },
    short: { cause: `The ${name} is short of workers`, fix: 'More homes bring more workers' },
  };
};
// A provider near the home that touches no road (well_no_road, bazaar_no_road, temple_no_road): it needs a road, not a twin.
const roadlessWords = (type) => ({ cause: `The ${buildingName(type).toLowerCase()} has no road`, fix: 'Lay a road beside it' });
export const CAUSE_TEXT = {
  no_road: { cause: 'No road beside it', fix: 'Lay a road next to it' },
  no_well: { cause: `No well within ${BUILDINGS.well.reach} road tiles`, fix: 'Build a well near it' },
  no_bazaar: { cause: `No bazaar within ${BUILDINGS.bazaar.reach} road tiles`, fix: 'Build a bazaar near it' },
  bazaar_empty: { cause: 'The bazaar has no food', fix: `Build a granary within ${BUILDINGS.bazaar.supplyReach} road tiles of it` },
  granary_empty: { cause: 'Its granary is empty', get fix() { return `${capitalised(foodMakersText())} fill granaries`; } },   // a getter: the plurals are set further down
  next_delivery: { cause: 'Food arrives at the next delivery', fix: '' },
  no_temple: { cause: `No temple within ${BUILDINGS.temple.reach} road tiles`, fix: 'Build a temple near it' },
  well_idle: idleWords('well'),
  granary_idle: idleWords('granary'),
  bazaar_idle: idleWords('bazaar'),
  temple_idle: idleWords('temple'),
  well_no_road: roadlessWords('well'),
  bazaar_no_road: roadlessWords('bazaar'),
  temple_no_road: roadlessWords('temple'),
  no_booth: { cause: `No booth within ${BUILDINGS.booth.reach} road tiles`, fix: 'Build a booth near it' },
  booth_idle: idleWords('booth'),
  booth_no_road: roadlessWords('booth'),
  low_desirability: { cause: 'The street is not pleasant enough', fix: 'Place gardens or statues near it, or move workshops away' },
  no_square: { cause: 'No 2×2 square of plots around it', fix: `Make a square with three plots beside it, empty or ${TIERS[5].name}s` },
};

// The buildings that make a good, in the order they are built: the raw producer, then the workshop ("clay pit,
// potter"; figs: "fig orchard").
export function goodMakers(good) {
  const maker = makerOf(good);
  if (!maker) return [];
  const input = BUILDINGS[maker].consumes;
  return [input ? makerOf(input) : null, maker].filter(Boolean);
}
const milestoneOf = (type) => MILESTONES.find((m) => m.unlocks.includes(type)) || null;
const capitalised = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Words for the goods codes (spec 4.10), read as the food codes are: no_good, no store for the good within the
// bazaar's supply reach (like bazaar_empty), so the fix is that store; good_unmade, stores there but none holds any
// (like granary_empty), so the fix is what makes it. Buildings not unlocked yet are named with the milestone that
// brings them, so the fix is never a card the player cannot use; while the good's makers are locked, that is the fix
// for both codes, as a store would stay empty.
const comeWith = (types) => `${capitalised(listText(types.map(pluralName)))} come with ${milestoneOf(types[0]).name}`;
function goodWords(code, good, world) {
  const name = goodWord(good);
  const makers = goodMakers(good);
  const locked = makers.filter((t) => !isUnlocked(world, t));
  if (code === 'no_good') {
    const store = storeFor(good);
    const fix = locked.length ? comeWith(locked)
      : isUnlocked(world, store) ? `Build a ${buildingName(store).toLowerCase()} within ${BUILDINGS.bazaar.supplyReach} road tiles of it` : comeWith([store]);
    return { cause: `The bazaar has no ${name}`, fix };
  }
  const verb = makers.some((t) => BUILDINGS[t].consumes) ? 'Make' : 'Grow';
  return {
    cause: `Nothing ${verb.toLowerCase()}s ${name} near the bazaar`,
    fix: locked.length ? comeWith(locked) : `${verb} ${name} near it: ${listText(makers.map((t) => `a ${buildingName(t).toLowerCase()}`))}`,
  };
}

// The words for one needCause result: { cause, fix }, or null for a code with no words. An idle provider reads its own
// building's state; the goods codes word themselves by the good (cause.good, else the need when it is a good), and a
// delivery on its way names the good it brings.
export function causeText(cause, world, need = null) {
  const good = cause.good || (need && GOODS[need] ? need : null);
  if (cause.code === 'next_delivery' && need !== 'food' && (good || need === 'twoFoods')) return { cause: good ? `The next delivery brings ${goodWord(good)}` : T.bothFoodsComing, fix: '' };
  if ((cause.code === 'no_good' || cause.code === 'good_unmade') && good) return goodWords(cause.code, good, world);
  const t = CAUSE_TEXT[cause.code];
  if (!t) return null;
  if (!t.paused) return t;
  const b = world.buildings[cause.id];
  return b && b.paused ? t.paused : t.short;
}

// The desirability row (spec 4.7): "14 of 20: +6 temple, +3 garden, −4 potter", and the warning before a home drops a
// tier for it (spec 4.6): "Loses Manor in 1 month: the street is not pleasant enough".
export const contributorText = (value, name) => `${value > 0 ? '+' : '−'}${Math.abs(value)} ${name}`;
export const desirabilityText = (value, target, parts = []) => `${progressText(Math.round(value), target)}${parts.length ? `: ${parts.join(', ')}` : ''}`;
export const keepWarningText = (tier, months) => (months === null || months === undefined
  ? `The street is not pleasant enough to keep a ${tier}`
  : `Loses ${tier} in ${plural(months, 'month', 'months')}: the street is not pleasant enough`);

// The city summary's economy (spec 4.10, 4.18): the difficulty, each good made against used last month.
export const DIFFICULTY_NAMES = { relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' };
export const madeUsedText = (made, used) => `${made} made, ${used} used`;

// The city summary's mood rows, keyed by world.moodBreakdown.
export const MOOD_NAMES = { base: 'Starting mood', food: 'Food', jobs: 'Jobs', debt: 'Debt' };

export const tierName = (tier) => (tier >= 1 && TIERS[tier] ? TIERS[tier].name : 'Empty plot');

const REASONS = {
  unknown: "Can't build that",
  locked: 'Not unlocked yet',
  out_of_bounds: 'Off the edge of the map',
  water: "Can't build on water",
  occupied: 'Something is already here',
  blocked: 'Something is in the way',
  needs_fertile: 'Needs fertile land',
  needs_rocky: 'Needs rocky ground',
  needs_clay: 'Needs clay ground',
  needs_road: 'Must touch a road',
  no_gold: 'Not enough gold',
  nothing_to_place: 'Nothing to place here',
  nothing_here: 'Nothing here to demolish',
  bad_speed: 'That speed is not available',
  not_pausable: 'That cannot be paused',
  nothing_to_undo: 'Nothing to undo',
};
export const reasonText = (code) => REASONS[code] || "Can't place here";

const WARNINGS = { needs_road: 'No road touches it yet', no_storage: 'No granary within reach', no_supply: 'No granary to supply it' };
// A producer's warnings name its own storage and input: a potter's ghost says "No storehouse within reach". When a
// store in reach is built to hold the good but refuses it, the ghost says so instead (store_refuses, a wording of
// no_storage chosen by the placement preview): "No storehouse in reach accepts pottery".
export function warningText(code, type = null) {
  const def = type ? BUILDINGS[type] : null;
  if (code === 'no_storage' && def && def.produces) return `No ${buildingName(storeFor(def.produces.good)).toLowerCase()} within reach`;
  if (code === 'store_refuses' && def && def.produces) return `No ${buildingName(storeFor(def.produces.good)).toLowerCase()} in reach accepts ${goodWord(def.produces.good)}`;
  if (code === 'no_input' && def && def.consumes) return `No ${goodWord(def.consumes)} in reach yet`;
  return WARNINGS[code] || "Won't work yet";
}

// The placing preview's conditions (placement review P9, src/sim/commands.js conditionsFor): one chip each in the confirm
// bar, with a mark and words so the colour never says it alone. met, later (it can be placed, it will not work until this
// is met) and cant (it cannot be placed).
export const CONDITION_MARKS = { met: '✓', later: '!', cant: '✕' };
export const CONDITION_STATE_WORDS = { met: 'Met', later: 'Not yet', cant: "Can't" };
const TERRAIN_WORDS = { fertile: 'Fertile land', rocky: 'Rocky ground', clay: 'Clay ground' };
export const CONDITION_TEXT = {
  group: 'Conditions',
  free: 'Free ground',
  terrain: (terrain) => TERRAIN_WORDS[terrain] || 'Free ground',
  terrainCount: (terrain, fit, of) => `${TERRAIN_WORDS[terrain] || 'Free ground'}: ${fit} of ${of} tiles`,
  taken: 'Ground taken',
  water: 'Water here',
  offMap: 'Off the map',
  roadMet: 'Road beside it',
  roadLater: 'No road yet',
  roadCant: 'Must touch a road',
  roadHint: 'No road yet: draw one on a marked tile',
  suppliedMet: 'Supplied',
  goldShort: (cost, have) => `Not enough gold: ${cost} needed, you have ${have}`,
  placedNoRoad: 'needs a road',
  placedNoRoadYet: 'no road yet',
  onTerrain: { fertile: 'On fertile land', rocky: 'On rocky ground', clay: 'On clay ground' },
  // A building with this terrain in its definition: "On fertile land" for a tooltip, "Fertile land" (the chip's words, short enough
  // for a card at 150% text) for a card; '' for any other.
  terrainLine: (type, short = false) => (BUILDINGS[type] && BUILDINGS[type].terrain ? (short ? TERRAIN_WORDS[BUILDINGS[type].terrain] : CONDITION_TEXT.onTerrain[BUILDINGS[type].terrain]) || '' : ''),
};

// The toast after plots are painted (placement review P14): "6 plots placed", and, when the road is missing, "· no road yet" for
// all of them or "· 2 with no road yet" for some. total is how many were laid, roadless how many of those touch no road.
export function plotsPlacedText(total, roadless) {
  const base = `${plural(total, 'plot', 'plots')} placed`;
  if (!roadless) return base;
  return roadless >= total ? `${base} · ${CONDITION_TEXT.placedNoRoadYet}` : `${base} · ${roadless} with no road yet`;
}

// A touch plan's words (placement review P3, P5). The bar's first line before anything is drawn, and how many tiles the plan
// passes over and why: "2 skipped: something is in the way" (one reason's words when they all share it).
export const DRAW_TEXT = {
  idle: 'Drag or tap tiles · two fingers move the map',
  skipped(skipped) {
    const reasons = [...new Set(skipped.map((s) => s.reason))];
    const why = reasonText(reasons.length === 1 ? reasons[0] : 'blocked');
    return `${skipped.length} skipped: ${why.charAt(0).toLowerCase()}${why.slice(1)}`;
  },
};

// One condition's words for its chip. cond is a conditionsFor condition; refused says a store in reach is built to hold the good
// but turns it away (the placing preview works that out). Never invents a state: each sentence is the sim's own reason.
export function conditionText(cond, type, { refused = false } = {}) {
  const C = CONDITION_TEXT;
  const def = BUILDINGS[type];
  if (cond.key === 'ground') {
    const mapWords = S46_MAP_TEXT.groundChip(cond, def || {});   // Stage 4.6 (ruling 331): the one set of words for every ground and water rule (the s46 map section)
    if (mapWords) return mapWords;
    if (cond.state === 'met') return def && def.terrain ? C.terrain(def.terrain) : C.free;
    if (cond.reason === 'needs_fertile' || cond.reason === 'needs_rocky' || cond.reason === 'needs_clay') return C.terrainCount(cond.terrain, cond.fit, cond.of);
    if (cond.reason === 'occupied') return C.taken;
    if (cond.reason === 'water') return C.water;
    if (cond.reason === 'out_of_bounds') return C.offMap;
    return reasonText(cond.reason);
  }
  if (cond.key === 'road') return cond.state === 'met' ? C.roadMet : cond.state === 'later' ? C.roadLater : C.roadCant;
  if (cond.key === 'works') {
    if (cond.reason === 'no_storage' && def && def.produces) {
      const store = buildingName(storeFor(def.produces.good)).toLowerCase();
      return refused ? `No ${store} takes ${goodWord(def.produces.good)}` : `No ${store} near`;
    }
    if (cond.reason === 'no_supply') return WARNINGS.no_supply;
    if (cond.state === 'met' && def && def.produces) return `${buildingName(storeFor(def.produces.good))} near`;
    return cond.state === 'met' ? C.suppliedMet : "Won't work yet";
  }
  if (cond.key === 'gold') return C.goldShort(cond.cost, cond.have);
  return '';
}

// What a service will do from the ghost's spot (early-game pass 2.6), counted by homesServedFrom.
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}`, booth: (homes) => `Entertains ${homes}`, physician: (homes) => `Looks after ${homes}`, police_post: (homes) => `Watches over ${homes}` };
export function effectText(type, n) {
  if (!EFFECTS[type]) return '';
  return n > 0 ? EFFECTS[type](plural(n, 'home', 'homes')) : T.noHomesInReach;
}

export function unlockText(type) {
  const m = MILESTONES.find((ms) => ms.unlocks.includes(type === 'gate' ? 'wall' : type));   // the Gate card comes with the wall (Stage 4.5)
  return m ? `Unlocks at ${m.name}` : 'Comes later';
}

export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Stage 3: the tracks' alert words, filled in their own sections below with Object.assign: code -> (alert, world, b,
// name) => { title, fix }, where b is the alert's building (or null) and name its name ('A building' without one).
export const ALERT_TEXT = {};

// One warning for every home or plot with no road beside it (placement review P13): "6 plots have no road". Empty plots are
// plots and any with people in are homes; a mix says homes, since that is what the player would lose to it.
function plotsNoRoadWords(alert, world) {
  const n = alert.count;
  const empty = (alert.ids || []).every((id) => !world.buildings[id] || world.buildings[id].tier === 0);
  const [one, many] = empty ? ['plot', 'plots'] : ['home', 'homes'];
  return { title: `${plural(n, one, many)} ${n === 1 ? 'has' : 'have'} no road`, fix: n === 1 ? 'Draw a road beside it' : 'Draw a road beside them' };
}

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  if (ALERT_TEXT[alert.code]) return ALERT_TEXT[alert.code](alert, world, b, name);
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
    case 'plots_no_road': return plotsNoRoadWords(alert, world);
    case 'no_storage': {
      const def = b ? BUILDINGS[b.type] : null;
      const good = def && def.produces ? def.produces.good : 'grain';
      const store = buildingName(storeFor(good)).toLowerCase();
      // A store in reach that refuses the good is the likelier cause than a missing one: say how to let it accept.
      const fix = b && producerRefused(world, b) ? `Let a ${store} in reach accept ${goodWord(good)}, or build another` : `Build a ${store} within ${def ? def.producerReach : 12} road tiles`;
      return { title: `${name} has nowhere to store its ${goodWord(good)}`, fix };
    }
    case 'storage_full': {
      // Raised on a producer whose stores filled up, and on a store that is full itself.
      const def = b ? BUILDINGS[b.type] : null;
      const store = def && def.stores ? b.type : storeFor(def && def.produces ? def.produces.good : 'grain');
      return { title: def && def.stores ? `${name} is full` : `${name} has no room left in storage`, fix: `Build another ${buildingName(store).toLowerCase()} nearby` };
    }
    case 'no_input': {
      const def = b ? BUILDINGS[b.type] : null;
      const input = def && def.consumes ? def.consumes : null;
      if (!input) return { title: `${name} has nothing to work`, fix: 'Bring what it needs within reach' };
      const maker = makerOf(input), store = storeFor(input);
      return {
        title: `${name} has no ${goodWord(input)} in reach`,
        fix: `Store ${goodWord(input)} within ${def.producerReach} road tiles: a ${buildingName(maker).toLowerCase()} fills a ${buildingName(store).toLowerCase()}`,
      };
    }
    case 'understaffed': return { title: `${name} is short of workers`, fix: 'More homes bring more workers' };
    case 'bazaar_empty': return { title: 'Bazaar has no food', fix: `Build a granary within ${BUILDINGS.bazaar.supplyReach} road tiles: ${foodMakersText()} fill it` };
    case 'labour_shortage': return { title: `Not enough workers for ${LEVEL_NAMES[alert.level] || alert.level}`, fix: "More homes, or pause buildings you don't need" };
    case 'unemployment': return { title: 'Too many people have no work', fix: 'Build farms, granaries, bazaars or temples' };
    case 'debt': return { title: 'The treasury is in debt', fix: "Pause buildings you don't need; taxes rise as homes grow" };
    case 'save_failed': return { title: 'Progress is not being saved', fix: 'Free up storage, or export the city from the menu' };
    default: return { title: 'Something needs attention', fix: 'Have a look' };
  }
}

export const SPEED_LABELS = ['Paused', '1×', '2×', '3×'];
// The Help setting (early-game pass 3.1), keyed by settings.help.
export const HELP_NAMES = { full: 'Guide and tips', tips: 'Tips only', off: 'Off' };
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', goods: 'Goods', entertainment: 'Entertainment', desirability: 'Desirability', housing: 'Housing', ground: 'Ground' };
// The corner buttons' accessible names (early-game pass 2.9); each starts with or contains the word it shows.
export const pauseSpeedText = (speed) => `${T.pause}, ${T.speed.toLowerCase()} ${SPEED_LABELS[speed]}`;
export const layersText = (kind) => (kind ? `${T.layers}: ${OVERLAY_NAMES[kind]}` : T.layers);
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'],
  goods: ['Has its goods', 'Goods missing'], entertainment: ['Has entertainment', 'No entertainment'], housing: ['Ready to grow', 'Next need missing'],
  // Ground (placement review P1) has no dot and ring: its two keys are the land it shows, free fertile land (leaf green with
  // dots) and free rocky ground (grey, hatched).
  ground: ['Fertile: farms and orchards', 'Rocky: mines', 'Clay: pits'],
};
// What the Ground overlay's third line says while a farm, orchard or mine is being placed: its brighter tiles are where the whole
// building fits on its own ground (src/render/overlays.js roomTiles), or, with none left, that nothing is.
const GROUND_THING = { farm_grain: 'a farm', farm_barley: 'a farm', farm_flax: 'a farm', farm_fig: 'an orchard', gem_mine: 'a mine', clay_pit: 'a clay pit' };
export const groundThing = (type) => GROUND_THING[type] || null;
export const groundRoomText = (type, any) => (any && type === 'clay_pit' ? S46_MAP_TEXT.clayGuide : any ? `Bright: room for ${groundThing(type)}` : `No room left for ${groundThing(type)}`);   // Stage 4.6 (ruling 331): the clay pit's line says where clay lies

// The desirability legend (spec 4.7, 6.3): a short label under each band's swatch, and words for screen readers that say
// what the band is pleasant enough for. Band -1 is below zero; the others follow DESIRABILITY_STEPS (src/data/ui.js).
const PLEASANT_TIERS = TIERS.filter((t) => t && t.desirability);
export function desirabilityBand(k) {
  const s = DESIRABILITY_STEPS;
  if (k < 0) return { label: `<${s[0]}`, words: `Below ${s[0]}: unpleasant` };
  const last = k + 1 >= s.length;
  const label = last ? `${s[k]}+` : `${s[k]}–${s[k + 1] - 1}`;
  const spoken = last ? `${s[k]} or more` : `${s[k]} to ${s[k + 1] - 1}`;
  return { label, words: k === 0 ? `${spoken}: plain` : `${spoken}: pleasant enough for a ${PLEASANT_TIERS[k - 1].name}` };
}

// What a building would do to the homes around it while it is placed (spec 4.7), from desirabilityPreview's counts.
export function nicerText(better, worse) {
  const homes = (n) => plural(n, 'home', 'homes');
  if (better && worse) return `Makes ${homes(better)} nicer and ${worse} less pleasant`;
  if (better) return `Makes ${homes(better)} nicer`;
  if (worse) return `Makes ${homes(worse)} less pleasant`;
  return '';
}

export const dateText = ({ year, month, day }) => `Year ${year}, month ${month}, day ${day}`;
export const shortDateText = ({ year, month }) => `Y${year} M${month}`;   // the top bar's date where room is short
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const progressText = (n, of) => `${n} of ${of}`;
export const goalsProgressText = (done, total) => `${done} of ${total} done`;
export const rewardText = (n) => `+${n} gold`;
export const progressLabel = (n, of) => `Progress ${progressText(n, of)}`;
export const dailyDoneText = (n) => plural(n, 'daily goal done', 'daily goals done');
export const swapLabel = (text) => `Swap: ${text}`;
// The phone strip's words are one button that opens the goal in place (P8): its name carries the whole goal, since the words on
// screen may be cut at two lines. label is "Goal" or the opening chain's "2 of 11"; count the goal's own.
export const goalWordsLabel = (label, text, count) => `${label}: ${text}${count ? `, ${count}` : ''}`;
export const showMeLabel = (text) => `${T.showMe}: ${text}`;   // a goal's Show me names its goal, so several of them stay apart
export const viewLabel = (what) => `${T.view}: ${what}`;         // a View names its alert or building, so several of them stay apart

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', goods: 'Goods', grand: 'A grand city', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Harvest 100 grain',
  pottery30: 'Make 30 pottery', gardens3: 'Build 3 gardens', statue1: 'Build a statue', booth1: 'Build a booth',
};
export const milestoneText = (name) => `Your city is now a ${name}`;

// Difficulty on the title card (spec 4.18): what the chosen level changes, from the data, on three lines (the title
// card shows the hint with white-space: pre-line). First the danger: a level without raids never starts the raid clock
// (raidsOn) and, with it, has no sickness or thefts (threatsOn is raidsOn: healthStarted, crimeStarted); otherwise the
// level's risk multiplier scales the size of every raid after the first, which is RAIDS.firstSize at every level (raidSize;
// "about": a size is rounded and kept between RAIDS.minSize and RAIDS.maxSize), and the same multiplier scales how fast fire,
// sickness and theft risk build up (dailyRiskOf, dailyHealthRiskOf, dailyCrimeRiskOf: each multiplies by riskOf). Then buildings
// and trade routes, scaled by the level's cost multiplier ("about": each price is rounded to whole gold); a road is only 2
// gold, so its rounded price per tile is given as it is. The danger line stays short enough for one line on a landscape phone's
// title card.
export function difficultyHint(level) {
  const { cost, risk, raids } = DIFFICULTIES[level];
  const by = Math.abs(Math.round((risk - 1) * 100));
  const way = risk < 1 ? 'slower' : 'faster';
  const fire = risk === 1 ? 'Fire risk as usual.' : `Fire risk builds ${by}% ${way}.`;
  const danger = raids === false ? `No raids, sickness or thefts. ${fire}`
    : risk === 1 ? 'Raids, fire, sickness and theft risk as usual.'
      : `Later raids about ${by}% ${risk < 1 ? 'smaller' : 'bigger'}. Fire, sickness and theft risk build ${by}% ${way}.`;
  const pct = Math.round((cost - 1) * 100);
  const roads = `Roads: ${roadCostOf({ difficulty: level })} gold a tile.`;
  const rest = pct === 0 ? 'at their usual cost' : `cost about ${Math.abs(pct)}% ${pct < 0 ? 'less' : 'more'}`;
  return `${danger}
Buildings and trade routes ${rest}.
${roads}`;
}

// The trade sheet (spec 4.15): routes and why one cannot open yet, each good's prices, the three choices and the
// level to keep; then a caravan's caption.
export const TRADE_MODE_NAMES = { buy: 'Buy', sell: 'Sell', ignore: 'Ignore' };
export const openRouteText = (cost) => `Open route, ${cost} gold`;
export function routeBlockText(id, block) {
  if (block === 'locked') {
    const m = MILESTONES.find((x) => x.id === PARTNERS[id].milestone);
    return `Opens at ${m ? m.name : PARTNERS[id].milestone}`;
  }
  if (block === 'no_post') return 'Needs a trading post';
  if (block === 'no_gold') return `Would put the treasury over ${-ECONOMY.debtFloor} gold in debt`;   // the rule every purchase follows (canAfford)
  return '';
}
export const paysText = (name, price) => `${name} pays ${price}`;
export const asksText = (name, price) => `${name} asks ${price}`;
// Caravans count the stores within reach of the trading post, not every store in the city.
export const inStorageText = (n) => `${n} in storage near the post`;
export const keepText = (n) => `Keep ${n}`;
export const keepHelpText = (mode, n) => (mode === 'buy' ? `Buys until ${n} are in storage near the post` : `Sells what is over ${n} in storage near the post`);
export const keepStepText = (sign) => `${sign > 0 ? '+' : '−'}${TRADE_KEEP_STEP}`;
export const keepStepLabel = (sign, name) => `${keepStepText(sign)}: keep ${sign > 0 ? 'more' : 'less'} ${name.toLowerCase()}`;
export const tradeChoiceLabel = (name) => `${name}: buy, sell or ignore`;
const TRADE_REASONS = { no_post: 'Build a trading post first', already_open: 'That route is already open', locked: 'That partner trades with bigger cities', no_gold: 'Not enough gold' };
export const tradeReasonText = (code) => TRADE_REASONS[code] || "Can't do that yet";
// Why no caravan will come (caravanBlocker); a post no road joins to the trade entry has its own warning, T.postNotJoined.
const NO_CARAVAN = {
  no_post: 'No caravan will come without a trading post',
  paused: 'No caravan will come while the trading post is paused',
  short_staffed: 'No caravan will come while the trading post is short of workers',
};
export const noCaravanText = (code) => NO_CARAVAN[code] || '';

// A caravan's caption (spec 4.15): what it bought from the city and sold it, any first-visit gift, and the gold the
// treasury gained or lost: "A caravan from Memphis bought 30 pottery: +240 gold". A visit that both paid and charged
// says the net ("net +200 gold"), so the caption always matches the treasury. One that found nothing says so and why.
const goldChangeText = (n) => (n > 0 ? rewardText(n) : n < 0 ? `−${-n} gold` : '0 gold');
export function caravanText(e) {
  const goods = (m) => listText(Object.entries(m || {}).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${goodWord(g)}`));
  const from = partnerName(e.partner);
  const sold = goods(e.sold), bought = goods(e.bought);
  const parts = [];
  if (sold) parts.push(`bought ${sold}`);
  if (bought) parts.push(`sold you ${bought}`);
  if (e.gift && e.gift.n > 0) parts.push(`brought a gift of ${e.gift.n} ${goodWord(e.gift.good)}`);
  if (!parts.length) return { text: `A caravan from ${from} found nothing to trade`, why: T.caravanIdleWhy };
  const income = e.income || 0, spent = e.spent || 0;
  const gold = income > 0 && spent > 0 ? `net ${goldChangeText(income - spent)}` : goldChangeText(income - spent);
  return { text: `A caravan from ${from} ${listText(parts)}${income > 0 || spent > 0 ? `: ${gold}` : ''}`, why: '' };
}

export const T = {
  fold: 'Fold the panel', unfold: 'Unfold the panel',
  place: 'Place', cancel: 'Cancel', undo: 'Undo', back: 'Back', close: 'Close', demolish: 'Demolish', pause: 'Pause', resume: 'Resume',
  confirm: 'Confirm', flip: 'Flip', build: 'Build', buildTray: 'Build tray', menu: 'Menu', minimap: 'Minimap', overlay: 'Overlay', speed: 'Speed',
  gold: 'Gold', people: 'People', mood: 'Mood', date: 'Date', income: 'Income', jobless: 'Jobless', food: 'Food',
  summary: 'City summary', incomeVsSpending: 'Income against spending', taxes: 'Taxes', wages: 'Wages', upkeep: 'Upkeep', net: 'Net',
  foodInStore: 'Food in store', employment: 'Employment', moodBreakdown: 'Mood', goals: 'Goals', goal: 'Goal', showMe: 'Show me', goalsDone: 'All goals done', goalDone: 'Goal done', goalsNone: 'No goals open',
  skipGuide: 'Skip guide', recent: 'Recent', today: 'Today', swap: 'Swap', done: 'Done', doneMark: '✓',   // doneMark is decorative: its row says Done in words
  welcome: 'Welcome back', lastPlayed: 'Last played', justNow: 'just now', aWhileAgo: 'a while ago', upFrom: 'up from', downFrom: 'down from', steadyAt: 'steady at', carryOn: 'Carry on', stayPaused: 'Stay paused',
  goalsHelp: 'Goals show under the top bar. Show me opens the right card and points at the place.',
  grain: 'Grain', lasts: 'Lasts', working: 'Working', jobs: 'Jobs',
  workers: 'Workers', stock: 'Stock', problems: 'Problems', noProblems: 'No problems', reach: 'Reach', storesWithin: 'Stores within', view: 'View',   // storesWithin: a hunting lodge's and a fishing wharf's delivery reach (final review)
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
  hasIt: 'Has it', missing: 'Missing',
  alerts: 'Alerts', noAlerts: 'All quiet', zoomIn: 'Zoom in', zoomOut: 'Zoom out', jumpTo: 'Jump to',
  newCity: 'New city', continueGame: 'Continue', exportCity: 'Export city', importCity: 'Import city', settings: 'Settings', howToPlay: 'How to play', about: 'About',
  startNewCity: 'Start new city', newCityConfirm: 'Start a new city? The current one will be lost.', notYet: 'Not available yet', comingLater: 'Coming later',
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
  helpLevel: 'Help', suggested: 'Suggested', resumeGuide: 'Resume guide',
  difficultyForNewCities: 'Difficulty for new cities', difficultyNote: 'A city keeps the level it started with. This one changes the next new city.',
  guideHelp: 'While the guide runs, the card for the next step says Suggested and a ring marks the place. Skip guide turns it off: in the goals strip, or on a phone in the open goal or the goals list.',
  updateReady: 'Update ready', restart: 'Restart', updateSaveFailed: "Couldn't save, so the update will wait",
  playWithSound: 'Play with sound', playMuted: 'Play muted', install: 'Install', tagline: 'Build a city on the Nile', restoredBackup: 'Restored the previous autosave',
  installMenu: 'Install on this device', bringCity: 'Bring a city from Safari', bringCityHelp: 'If you saved a city in Safari, open the menu there and choose Export city. Then import that file here.', installWhy: 'Installed on the home screen, the game works offline and keeps your city safe.', installIosSteps: ['Tap Share (the square with an arrow)', 'Scroll down and tap Add to Home Screen', 'Tap Add'], installExportFirst: 'Export your city first: the installed app keeps its own storage. Then import the file from the home-screen app.', installNow: 'Install now', installNotOffered: 'Your browser did not offer to install. Look for Install app or Add to Home screen in its menu.', openInSafari: 'Open in Safari to keep your city', openInChrome: 'Open in Chrome to keep your city', saveNewer: 'This city was saved by a newer version of the game', saveUnreadable: "This save can't be read",
  exported: 'City file downloaded', exportFailed: "Couldn't export the city", exportFirst: 'Export first', replaceCityConfirm: 'Replace the current city with the imported one?', fileUnreadable: "Couldn't read that file",
  paused: 'Paused', resumed: 'Resumed', pausedHidden: 'Paused while you were away', placed: 'Placed', demolished: 'Demolished', roadLaid: 'Road laid',
  tapStart: 'Tap where it starts', tapEnd: 'Tap where it ends', tapCorner: 'Tap the far corner', refund: 'Refund',
  shortcuts: 'Keyboard shortcuts', openSummary: 'Open the city summary', overlayOff: 'Turn the overlay off',
  rotate: 'Rotate', housingPlots: 'Housing plots',
  noWorkersNeeded: 'No workers needed', help: 'How to play',
  on: 'On', off: 'Off', version: 'Version', keyHead: 'Key', doesHead: 'Does', gestures: 'Touch',
  leaveMode: 'To leave any mode: ✕, Back, Esc or right-click.',
  shortcutsOff: 'Single-key shortcuts can be turned off in settings. Esc, Enter and Ctrl+Z always work.',
  gesturesHelp: 'One finger pans, and two fingers pan or zoom. Tap to select, or to move the ghost. Double-tap zooms in when no tool is open. With a road, wall, plots or Demolish, drag one finger over tiles or tap them one by one (tap again to take one off), then tick.',
  aboutText: 'A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders. A personal hobby project with original, code-drawn art.',
  undoOccupiedConfirm: 'Undo this? People who moved in will leave.', undone: 'Undone',
  hoverHint: 'Hover a building or pick a card',
  play: 'Play', mapButton: 'Map', layers: 'Layers', layersOff: 'Off',
  noHomesInReach: 'No homes in reach yet',
  achievement: 'Achievement', dailyDone: 'Daily goal done', guideDone: "You've got the basics",
  tip: 'Tip', gotIt: 'Got it', more: 'More', less: 'Less', allGoals: 'All goals', tips: 'Tips', tipsHelp: 'Each tip shows once, under the goals or, on a phone, in their place. Help in Settings turns them off.', next: 'Next',
  achievements: 'Achievements', achievementsLater: 'Achievements show here once the guide is done.', notYetMet: 'Not yet', closestAchievement: 'Closest achievement',
  newBadge: 'New', stored: 'Stored', accepted: 'Accepted', refused: 'Refused', notWorking: 'Not working',
  acceptHelp: 'Tap a good to accept or refuse it here. A refused good goes to other storage, or production stops.',
  trade: 'Trade', routes: 'Trade routes', routeOpen: 'Route open', tradeGoods: 'Goods', nextCaravan: 'Next caravan', openRouteFirst: 'Open a route to trade goods.',
  tradeHelp: 'Choose what each caravan buys from you or sells you, and how many to keep in storage.',
  postNotJoined: "Caravans can't reach the trading post: no road joins it to the trade entry.", postNotJoinedFix: 'Lay a road from it to the trade entry',
  caravanIdleWhy: 'Set what to buy and sell at the trading post.',
  difficulty: 'Difficulty', tradeLastMonth: 'Trade last month', tradeSales: 'Sold to caravans', tradeBought: 'Bought from caravans', goodsLastMonth: 'Goods last month', noGoodsYet: 'Nothing made yet', bothFoodsComing: 'The next delivery brings both kinds of food',
};

export const importErrorText = (code) => (code === 'newer_version' ? T.saveNewer : code === 'read_failed' ? T.fileUnreadable : T.saveUnreadable);

// The help sheet's shortcut table: [KEYS name, what it does, optional display override].
export const HELP_ROWS = [
  ['pause', 'Pause or resume'], ['speedUp', 'Faster'], ['speedDown', 'Slower'],
  ['category', 'Pick a build category', '1 to 7'], ['panLeft', 'Move the view', 'Arrows or WASD'],
  ['rotate', 'Rotate, once something can rotate'], ['minimap', 'Open the minimap'], ['overlay', 'Cycle the overlays'],
  ['confirm', 'Confirm'], ['back', 'Back one step'], ['undo', 'Undo', 'Ctrl+Z or Cmd+Z'], ['help', 'Show this list'],
];

// Celebrations (early-game pass 3.6): what each first says, as a short head (what happened) and a why (why it
// matters). A phone at larger text shows the head and the gold only; the why stays for screen readers. Achievement
// names and their exact conditions follow, then the gold suffix on a caption. Names and numbers come from the data,
// so the words never drift.
const TOWN = MILESTONES.find((m) => m.id === 'town');
const PEOPLE_FIRST = FIRSTS.find((f) => f.id === 'people_100').check.n;
export const FIRST_TEXT = {
  first_family: { head: 'First family moved in', why: 'People work your buildings and pay taxes.' },
  first_full_home: { head: 'First full home', why: "Meet a home's needs and it grows to hold more people." },
  first_harvest: { head: 'First harvest', why: 'Grain reached the granary. Bazaars can now sell food.' },
  first_shack: { head: `First ${TIERS[2].name}`, why: `Water let a ${TIERS[1].name.toLowerCase()} grow. ${TIERS[2].name}s hold ${TIERS[2].capacity} people.` },
  first_cottage: { head: `First ${TIERS[3].name}`, why: `Food let a home grow. ${TIERS[3].name}s hold ${TIERS[3].capacity} people and pay more tax.` },
  first_house: { head: `First ${TIERS[4].name}`, why: `A temple let a home grow. ${TIERS[4].name}s hold ${TIERS[4].capacity} people.` },
  first_profit: { head: 'First month in profit', why: 'Taxes covered wages and upkeep, with gold to spare.' },
  people_100: { head: `${PEOPLE_FIRST} people live here`, why: `At ${TOWN.population} people the city becomes a ${TOWN.name}.` },
  first_pottery: { head: 'First pottery', why: `A potter turned clay into pots. ${TIERS[5].name}s need pottery.` },
  first_townhouse: { head: `First ${TIERS[5].name}`, why: `Pottery let a home grow. ${TIERS[5].name}s hold ${TIERS[5].capacity} people.` },
  first_manor: { head: `First ${TIERS[6].name}`, why: `Four homes became one. ${TIERS[6].name}s hold ${TIERS[6].capacity} people.` },
  first_caravan: { head: 'First caravan', why: 'Traders came to the trading post. Set what they buy and sell there.' },
  first_fine_manor: { head: `First ${TIERS[7].name}`, why: `Beer and two kinds of food let a ${TIERS[6].name.toLowerCase()} grow.` },
  first_villa: { head: `First ${TIERS[8].name}`, why: `Linen let a home grow. ${TIERS[8].name}s hold ${TIERS[8].capacity} people.` },
  first_estate: { head: `First ${TIERS[9].name}`, why: 'Jewellery let a home grow into the finest home in the city.' },
};

export const ACHIEVEMENT_NAMES = {
  way_in: 'Way in', neighbours: 'Neighbours', street: 'A proper street', busy_streets: 'Busy streets',
  water_bearer: 'Water bearer', breadbasket: 'Breadbasket', plenty: 'Plenty', market_day: 'Market day', faithful: 'Faithful',
  shack_row: 'Shack row', cottage_lane: 'Cottage lane', house_proud: 'House proud',
  hamlet: 'Hamlet', town: 'Town at last', bustling: 'Bustling',
  good_harvests: 'Good harvests', granary_of_the_river: 'Granary of the river',
  steady_books: 'Steady books', prosperous: 'Prosperous',
  no_one_hungry: 'No one hungry', water_for_all: 'Water for all', busy_hands: 'Busy hands',
  on_course: 'On course', day_by_day: 'Day by day',
  potters_wheel: "Potter's wheel", merchant_city: 'Merchant city', townhouse_terrace: 'Townhouse terrace', manor_row: 'Manor row',
  green_city: 'Green city', sculpture_garden: 'Sculpture garden', estate_life: 'Estate life', thousand: 'A thousand souls',
};

const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples', brewery: 'breweries' };
const TALLY_CONDITIONS = {
  harvested: (n) => `Harvest ${n} grain`,
  profitMonths: (n) => `End ${n} months in profit`,
  upgrades: (n) => `Grow homes ${n} times`,
  dailyDone: (n) => `Finish ${n} daily goals`,
  tradeIncome: (n) => `Earn ${n} gold from trade`,
  sold: (n) => `Sell ${n} goods to caravans`,
  bought: (n) => `Buy ${n} goods from caravans`,
  caravans: (n) => `Welcome ${n} caravans`,
};

// An achievement's exact condition, from its declarative measure ("Have 25 homes").
export function achievementCondition(m) {
  switch (m.kind) {
    case 'roads': return `Lay ${m.n} road tiles beyond the starting road`;
    case 'homes': return `Have ${m.n} homes`;
    case 'buildings': {
      const one = buildingName(m.type).toLowerCase();
      return `Have ${plural(m.n, one, BUILDING_PLURALS[m.type] || `${one}s`)}`;
    }
    case 'tier': return `Have ${plural(m.n, 'home', 'homes')} at ${tierName(m.tier)} or better`;
    case 'people': return `Reach ${m.n} people`;
    case 'tally': return TALLY_CONDITIONS[m.key] ? TALLY_CONDITIONS[m.key](m.n) : '';
    case 'made': return `Make ${m.n} ${GOODS[m.good].name.toLowerCase()}`;
    case 'goals': return `Finish ${m.n} goals`;
    case 'fedAll': return `Reach ${m.people} people with every ${tierName(3)} or better home fed`;
    case 'waterAll': return `Have ${m.homes} lived-in homes, all with water`;
    case 'jobs': return `Reach ${m.people} people with ${Math.round(m.rate * 100)}% or fewer out of work`;
    default: return '';
  }
}
export const ACHIEVEMENT_TEXT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, achievementCondition(a.measure)]));

// The gold on a caption reads exactly as it does on the goals strip and sheets.
export const cheerReward = (n) => rewardText(n);

// Tips (early-game pass 3.4): one line each, verb first, 20 words or fewer, keyed by the ids in src/data/tips.js. Each is short
// enough for three lines on a 360 px phone at 150% text (a test measures it).
export const TIP_TEXT = {
  press_play: 'Press Play so people can move in: plots stay empty while paused.',
  arrivals: 'Place more plots: families arrive a few times a month while there is room.',
  house_needs: 'Read what this home needs to grow, then tap Show me for the fix.',
  service_reach: 'Look at the coloured tiles: they are the homes this reaches by road.',
  problem_marker: 'Tap a building with a red badge to see what is wrong and how to fix it.',
  month_summary: "Tap the numbers in the top bar to see this month's taxes, wages and food.",
  more_workers: 'Place more homes: buildings need workers, and homes provide them.',
  undo_demolish: 'Press Undo to bring back what you just removed, if you change your mind.',
  goals_list: "Tap the goal, then All goals (wide: Goals), to see what's next and what each pays.",
  overlay_keys: 'Read the overlay: a filled dot has it, a hollow ring lacks it. Tap ✕ to close.',
  nicer_streets: 'Place gardens and statues near homes: Manors and up need a pleasant street.',
  storehouse_choices: 'Tap a storehouse to refuse goods. If no store takes one, production stops.',
  trade_orders: 'Tap the trading post, open a route, then pick what to buy, sell and keep.',
  merging_homes: 'Add three plots beside a Townhouse in a square: it can become a Manor.',
};

// Achievements on the summary and the Welcome back card (early-game pass 3.8, 3.9). Counts read as progressText does.
export const achievementsHeading = (done, total) => `${T.achievements}, ${done} of ${total}`;
export const closestAchievementText = (name, n, of, condition = '') => `${T.closestAchievement}: ${name}, ${progressText(n, of)}${condition ? `. ${condition}` : ''}`;   // "...: Neighbours, 7 of 10. Have 10 homes"
export const achievementBarLabel = (name, n, of) => `${name}: ${progressText(n, of)}`;   // a progress bar's accessible name
// The arrows beside a trend's words; decoration only (aria-hidden), the words say which way it went.
export const TREND_MARKS = { up: '▲', down: '▼' };

// ── s3 contract (Track 0) ────────────────────────────────────────────────────────────────────────────────────────
// Words for the Stage 3 contract's own additions. Each Stage 3 track keeps its words in its own section below, as its
// own exported objects (FIRE_TEXT, RAID_TEXT, ...), and adds to the shared tables above (FIRST_TEXT, MOOD_NAMES,
// REASONS, CHAPTER_NAMES, T, ...) only with Object.assign inside its own section, so no two tracks edit the same lines.
Object.assign(DIFFICULTY_NAMES, { peaceful: 'Peaceful' });
Object.assign(T, { soldiersPay: "Soldiers' pay", wallBuilt: 'Wall built', screenshotMode: 'Screenshot mode' });
Object.assign(REASONS, { no_rubble: 'No rubble here', bad_id: "Can't do that", has_id: "Can't do that" });
// ── end s3 contract ──────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 fire (Track A) ──────────────────────────────────────────────────────────────────────────────────────────
// Track A's words for fire: the fire row, alert titles and fixes for fire, blaze and fire_risk, the mood rows fire and burned, captions. Add new lines just above the end marker.
// (An import declaration is hoisted, so it may sit here, inside the section. The names are Track A's own, so another
// section importing fireCause, fireBand or FIRE under their plain names cannot clash with them.)
import { fireCause as fireCauseOf, fireBand as fireBandOf } from '../sim/fire.js';
import { FIRE as FIRE_NUMBERS } from '../data/fire.js';

// Every line follows src/sim/fire.js: fireAlerts picks the code, fireCause the reason no staffed firehouse reaches the
// building, b.fire.left the days a fire has before the building burns down (it burns on the day left reaches 0).
export const FIRE_TEXT = {
  caught: (name) => `${name} has caught fire`,                                    // a blaze
  burning: (name, left) => `${name} is burning: ${plural(left, 'day', 'days')} left`,   // the fire stage
  highRisk: (name) => `${name} has a high fire risk`,                             // fireBand 2 (High)
  canCatch: (name) => `${name} could catch fire`,                                 // fireBand 3 (Can catch fire): 3% a day
  fighting: {
    blaze: 'The firehouse is putting it out',                                     // it can still reach need before the blaze grows
    late: (days) => `The firehouse came too late: it grows into a fire in ${plural(days, 'day', 'days')}`,
    fire: 'The firehouse is fighting it',                                         // 25% x coverage a day
  },
  cause: {
    covered: 'A staffed firehouse reaches it',                                    // staffedCover, as the fire overlay's legend says
    no_road: 'No road beside it for a firehouse to reach: lay one',
    none: `No firehouse within ${FIRE_NUMBERS.reach} road tiles: build one near it`,
    short: 'Its firehouse is short of workers: more homes bring more workers',
    burning: 'Its firehouse is burning: build another near it',
    paused: 'Its firehouse is paused: resume it',
  },
};
// A home is named by its tier ("Hut has caught fire"), anything else by its type.
const fireAlertName = (b, name) => (b && b.type === 'house' ? tierName(b.tier) : name);
const fireAlertTitle = (b, name) => (b && b.fire && b.fire.stage === 'fire' ? FIRE_TEXT.burning(fireAlertName(b, name), b.fire.left) : FIRE_TEXT.caught(fireAlertName(b, name)));
const fireCauseFix = (world, b) => (b ? FIRE_TEXT.cause[fireCauseOf(world, b).cause] : FIRE_TEXT.cause.none);
// A covered blaze goes out when its fought days reach need before days reaches FIRE.blazeDays (fireDay counts the fought
// day first), so it is too late when more fought days are needed than blaze days are left.
function fireFightFix(b) {
  const f = b && b.fire;
  if (f && f.stage === 'fire') return FIRE_TEXT.fighting.fire;
  if (f && f.need - f.fought > FIRE_NUMBERS.blazeDays - f.days) return FIRE_TEXT.fighting.late(FIRE_NUMBERS.blazeDays - f.days);
  return FIRE_TEXT.fighting.blaze;
}
Object.assign(ALERT_TEXT, {
  fire: (alert, world, b, name) => ({ title: fireAlertTitle(b, name), fix: fireCauseFix(world, b) }),
  blaze: (alert, world, b, name) => ({ title: fireAlertTitle(b, name), fix: fireFightFix(b) }),
  fire_risk: (alert, world, b, name) => ({
    title: b && fireBandOf(b.risk || 0) >= 3 ? FIRE_TEXT.canCatch(fireAlertName(b, name)) : FIRE_TEXT.highRisk(fireAlertName(b, name)),
    fix: fireCauseFix(world, b),
  }),
});
// The summary's mood rows (fireMood's keys).
Object.assign(MOOD_NAMES, { fire: 'A fire last month', burned: 'Buildings burned, last 6 months' });
// ── end s3 fire ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 raids (Track B) ──────────────────────────────────────────────────────────────────────────────────────────
// Track B's words for raids: alert titles for raid_warning and raid, directions, the report, tribute and festival reasons, mood rows raid and festival. Add new lines just above the end marker.
// Track B imports under its own names (import declarations are hoisted, so they may sit in this section).
import * as raidsData from '../data/raids.js';
import * as raidsSim from '../sim/raids.js';
import * as raidsTime from '../sim/time.js';
export const RAID_TEXT = {
  // The edge a raid comes from, as the words say it: "Raiders from the east", "facing east".
  dirs: { north: 'north', east: 'east', south: 'south', west: 'west' },
  // What a raid is after, in the plural: "storehouses", "trading posts"; "buildings" for a raid after any building.
  targets: (kind) => (kind === 'building' ? 'buildings' : pluralName(kind)),
  // The defence that would beat the warned raid (spec 4.13, ruling 108), from tributeQuote: N is the towers it needs less
  // the working towers the city has, priced at this city's tower: "Build 2 towers facing east (≈ 300 gold)"; at 0 "Your
  // towers can beat this raid". '' with no warning up. The banner puts it beside Pay tribute (Track D).
  towers(world) {
    const q = raidsSim.tributeQuote(world);
    if (!q) return '';
    if (q.buildN === 0) return 'Your towers can beat this raid';
    return `Build ${plural(q.buildN, 'tower', 'towers')} facing ${duiFacing(q.dirs)} (≈ ${q.buildCost} gold)`;
  },
};
// The raid alerts (raidAlerts). raid_warning: what is coming and the defence that would beat it. raid: the band on the map
// by its phase (raid.active.phase): fighting its way in or striking, leaving after its strikes, or falling back once half
// have fallen; towers (DEFENCE.towerRange tiles of a tower) and soldiers (DEFENCE.patrol tiles of their barracks) fight it
// in every phase.
Object.assign(ALERT_TEXT, {
  raid_warning: (alert, world) => {
    const w = world.raid.warning;
    // Stage 4.6 (Armies track, rulings 341, 388): a raid with more than raiders on foot says how many come ("14 raiders from the east
    // are after ...", short enough for the wide banner's one line) and names its kinds where there is room: first in the fix (the
    // alert list) and in the raid sheet's arrival line (dangerSheets.js arrivalText).
    const mixed = w && w.mix && S46_ARMY_TEXT.isMixedMix(w.mix);
    const who = mixed ? `${w.size} raiders from ${duiFrom(alert.dirs || alert.dir)}` : `Raiders from ${duiFrom(alert.dirs || alert.dir)}`;
    const towers = RAID_TEXT.towers(world);
    return { title: `${who} are after your ${RAID_TEXT.targets(w ? w.target : 'building')}`, fix: mixed ? `${capitalised(S46_ARMY_TEXT.mixText(w.mix))}${towers ? `. ${towers}` : ''}` : towers };
  },
  raid: (alert, world) => {
    const a = world.raid.active;
    const dir = alert.dirs && alert.dirs.length ? duiFrom(alert.dirs) : `the ${RAID_TEXT.dirs[a ? a.dir : ''] || ''}`;
    const phase = alert.phase || (a ? a.phase : 'attack');
    const raiders = plural(alert.left, 'raider', 'raiders');
    if (phase === 'retreat') return { title: `Raid from ${dir}: ${raiders} falling back`, fix: 'Towers keep shooting as they go' };
    const fix = `Towers hit raiders within ${raidsData.DEFENCE.towerRange} tiles; soldiers fight within ${raidsData.DEFENCE.patrol} tiles of their barracks`;
    return { title: phase === 'leave' ? `Raid from ${dir}: ${raiders} leaving` : `Raid from ${dir}: ${raiders}`, fix };
  },
});
// The mood rows (spec 4.9): a raid in the last six months (raidMood), a festival (festivalMood).
Object.assign(MOOD_NAMES, { raid: 'Recent raid', festival: 'Festival' });
// payTribute's and holdFestival's refusals (spec 4.13).
Object.assign(REASONS, {
  no_warning: 'No raid is on its way',
  first_raid: "The first raid can't be paid off",
  below_zero: "Tribute can't put the treasury below 0",
  no_temple: 'Needs a working temple',
  too_soon: `One festival every ${Math.round(raidsData.FESTIVAL.every / raidsTime.DAYS_PER_MONTH)} months`,
});
// ── end s3 raids ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 art (Track C) ──────────────────────────────────────────────────────────────────────────────────────────
// Track C's words for art: words drawn on the map (the reduced-motion "Burning"). Add new lines just above the end marker.
export const ART_TEXT = {
  burning: 'Burning',          // under reduced motion, on a still flame over a burning building (spec 5.4)
};
// ── end s3 art ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 ui (Track D) ──────────────────────────────────────────────────────────────────────────────────────────
// Track D's words for the danger interface: banners, the countdown chip, the tribute sheet, settings rows, the fire overlay and its legend. Add new lines just above the end marker.
export const DANGER_UI_TEXT = {};
// Every track's section shares this module's top-level scope, so Track D's own names start with "dui" (its imports too,
// renamed with "as"; imports are hoisted, so they sit here in the section and the shared lines at the top stay as they are).
import { DAYS_PER_MONTH as duiMonthDays } from '../sim/time.js';
// Directions as raids name them (src/sim/raids.js entryDir), and a span of game days in words ("2 months 12 days") and
// as the countdown chip writes it ("2 m 12 d", and "2 months" when the days come out at 0, ruling 174). A game month is DAYS_PER_MONTH days (src/sim/time.js).
const duiDirWords = { north: 'north', east: 'east', south: 'south', west: 'west' };
const duiDir = (dir) => duiDirWords[dir] || dir;
// One direction or a list (a two-sided raid, Stage 4.5): "the east", "the east and south"; "east", "east and south" after "facing".
const duiDirsOf = (dirs) => [...new Set([].concat(dirs).map(duiDir))];
const duiFrom = (dirs) => `the ${duiDirsOf(dirs).join(' and ')}`;
const duiFacing = (dirs) => duiDirsOf(dirs).join(' and ');
function duiDuration(days) {
  const m = Math.floor(days / duiMonthDays), d = days % duiMonthDays;
  const parts = [m ? plural(m, 'month', 'months') : '', d || !m ? plural(d, 'day', 'days') : ''];
  return parts.filter(Boolean).join(' ');
}
const duiCountdown = (days) => {
  const m = Math.floor(days / duiMonthDays), d = days % duiMonthDays;
  if (!m) return `${d} d`;
  return d ? `${m} m ${d} d` : plural(m, 'month', 'months');
};
// D1: the one banner (spec 6.3). The defence line follows tributeQuote (src/sim/raids.js): buildN is the towers needed
// for the warned raid less the working towers, buildCost their price in this city; at 0 the towers can beat it (ruling 108).
Object.assign(DANGER_UI_TEXT, {
  dir: duiDir, duration: duiDuration, countdown: duiCountdown,
  firesTitle: (n) => `${n} buildings on fire`,
  firesFix: 'No staffed firehouse reaches them',             // the 'fire' code: a blaze or fire no staffed firehouse reaches
  more: (n) => `+${n} more`,
  moreLabel: (n) => `${plural(n, 'more critical alert', 'more critical alerts')}: open the alert list`,
  payTribute: 'Pay tribute',
  collapse: 'Shrink', collapseLabel: 'Shrink the raid warning to its countdown', expand: 'Show the whole warning',
  chip: (dir, days) => `Raid from ${duiFrom(dir)} · ${duiCountdown(days)}`,
  // A phone's chip (ruling 167): its words are the button that opens the raid sheet, where the whole warning is.
  chipOpenLabel: (chip) => `${chip}: show the whole warning`,
  // The days until a warned raid arrives (warning.arrives less today): raidDay brings the raiders in on the arrives day.
  arrivesIn: (days) => (days > 0 ? `They arrive in ${duiDuration(days)}` : 'They arrive today'),
  withArrival: (title, days) => `${title}. ${DANGER_UI_TEXT.arrivesIn(days)}.`,
  arrivalLine: (days) => `${DANGER_UI_TEXT.arrivesIn(days)}.`,                // the tribute sheet's line
  defenceLine: (q, dir) => (q.buildN > 0
    ? `${q.hidden ? 'Build' : 'or build'} ${plural(q.buildN, 'tower', 'towers')} facing ${duiFacing(dir)} (≈ ${q.buildCost} gold)`
    : 'Your towers can beat this raid'),
});
// D2: captions, the raid report and the Settings rows. A blaze or a fire goes out only where a firehouse reaches it
// (src/sim/fire.js: a covered and staffed blaze, a covered fire at 25% x coverage a day), so the caption names the
// firehouse. The report reads raid.last's fields (src/sim/raids.js): size, towers, byTowers, bySoldiers, burned, stolen.
// Stage 4.6 (Armies track): archers and chariots stopped, and towers enemy archers brought down (raid.last's byArchers, byChariots,
// towersLost, present only when not 0).
const duiUnitsStopped = (r) => [r.byArchers ? `archers stopped ${r.byArchers}` : '', r.byChariots ? `chariots stopped ${r.byChariots}` : ''];
const duiLosses = (r) => [r.burned ? plural(r.burned, 'building burned', 'buildings burned') : '', r.towersLost ? plural(r.towersLost, 'tower fell', 'towers fell') : '', r.stolen ? `${r.stolen} gold stolen` : '', r.foodStolen ? `${r.foodStolen} food stolen` : '', r.fled ? `${plural(r.fled, 'resident', 'residents')} fled` : ''].filter(Boolean).join(', ') || 'nothing lost';
function duiRaidReport(r) {
  const from = `Raid from ${duiFrom(r.dirs || r.dir)}`;
  if (r.won) {
    const stopped = [r.byTowers ? `${plural(r.towers, 'tower', 'towers')} stopped ${r.byTowers} of ${r.size}` : '', r.bySoldiers ? `soldiers stopped ${r.bySoldiers}` : '', ...duiUnitsStopped(r)].filter(Boolean);
    return `${from} beaten: ${stopped.length ? `${stopped.join(', ')}; ` : ''}${duiLosses(r)}.`;
  }
  const did = listText([r.burned ? `burned ${plural(r.burned, 'building', 'buildings')}` : '', r.stolen ? `took ${r.stolen} gold` : '', r.foodStolen ? `took ${r.foodStolen} food` : '', r.fled ? `drove out ${plural(r.fled, 'resident', 'residents')}` : ''].filter(Boolean));
  const stopped = [r.byTowers ? `Towers stopped ${r.byTowers} of ${r.size}` : '', r.bySoldiers ? `${r.byTowers ? 'soldiers' : 'Soldiers'} stopped ${r.bySoldiers}` : '', ...duiUnitsStopped(r)].filter(Boolean);
  return `${from}: ${did ? `raiders ${did}` : 'the raiders struck and left'}.${stopped.length ? ` ${stopped.join(', ')}.` : ''}`;
}
Object.assign(DANGER_UI_TEXT, {
  putOut: (stage, name) => `The firehouse put out a ${stage === 'fire' ? 'fire' : 'blaze'} at the ${name}`,
  raidReport: duiRaidReport,
  onAFire: 'On a fire', fireReactions: { pause: 'Pause', goto: 'Go to it', inform: 'Just tell me' },
  onAFireNote: "For a fire no staffed firehouse reaches. The city's first one always pauses the game.",
  ambient: 'Ambient motion', ambientReduced: 'Off while Reduce motion is on',
});
// D3: the danger sheets (src/ui/dangerSheets.js). The fire row reads src/sim/fire.js: "a firehouse reaches it" is
// staffedCover (coverage of FIRE.staffedAt or more); "short of workers", "paused" and "burning" are fireCause's reason
// for the firehouse whose road reach takes the building in but which does not cover it enough; the band is fireBand's. A blaze goes out only on covered and
// staffed days, so a firehouse under FIRE.staffedAt of its workers puts none out. The tribute words read tributeQuote and
// payTribute (src/sim/raids.js), the festival's festivalStatus (src/sim/festival.js).
import { FIRE as duiFire } from '../data/fire.js';
const duiFireFrom = MILESTONES.find((m) => m.id === duiFire.startsAt);
const duiBands = ['low', 'rising', 'high', 'can catch fire'];
Object.assign(T, { tribute: 'Pay tribute' });                     // the tribute sheet's heading (sheets use T[kind])
Object.assign(DANGER_UI_TEXT, {
  fireLabel: 'Fire', neverBurns: 'Never catches fire', riskStartsAtTown: `Fire risk starts at ${duiFireFrom ? duiFireFrom.name : duiFire.startsAt}`,
  riskLine: (band, tail) => (band >= 3 ? `Can catch fire, ${tail}` : `Fire risk: ${duiBands[band]}, ${tail}`),
  reaches: 'a firehouse reaches it', whyNone: `no firehouse within ${duiFire.reach} road tiles`, noneReaches: 'no firehouse reaches it',
  whyShort: 'the firehouse is short of workers', whyPaused: 'the firehouse is paused', whyBurning: 'the firehouse is burning',
  // On a firehouse's own sheet, when fireCause names the firehouse itself (a burning firehouse is not working, so it
  // covers nothing, itself included).
  whySelf: { short: 'this firehouse is short of workers', paused: 'this firehouse is paused', burning: 'it cannot fight its own fire' },
  blaze: 'Blaze', burningFor: (left) => `Burning, ${plural(left, 'day', 'days')} left`, puttingOut: 'the firehouse is putting it out', fighting: 'the firehouse is fighting it',
  buildFirehouse: 'Build a firehouse near it',
  covers: (n) => `Covers ${plural(n, 'building that can burn', 'buildings that can burn')}`,
  coversNothingPaused: 'Covers nothing while it is paused', coversNothingBurning: 'Covers nothing while it is burning',
  coversNothingUntil: (n, of) => `Covers nothing until it has ${n} of ${of} workers`,
  tooShortToFight: (n, of) => `Puts out blazes only with ${n} of ${of} workers or more`,
  range: 'Range', patrol: 'Patrol', soldiers: 'Soldiers', onTheWall: 'On the wall',
  tiles: (n) => plural(n, 'tile', 'tiles'), hitPoints: (hp, of) => `${hp} of ${of} hit points`, fullHitPoints: (hp) => `${hp} hit points`,
  towerDoes: (r) => `Shoots the nearest raider within ${r} tiles once a day`,
  notShootingPaused: 'Not shooting while it is paused', notShootingUntil: (n, of) => `Not shooting until it has ${n} of ${of} workers`,
  barracksFull: (n, of) => `Full: ${n} of ${of} soldiers; it trains another when one is wounded`,
  trains: (days) => `Trains one soldier every ${days} days at full staff, slower when short of workers`,
  notTrainingPaused: 'Not training while it is paused', notTrainingBurning: 'Not training while it is burning', notTrainingUntil: (n, of) => `Not training until it has ${n} of ${of} workers`,
  soldiersPay: (n) => `Each soldier is paid ${n} gold a month, in peace too`,
  lastRaidTowers: (r) => `Last raid: towers stopped ${r.byTowers} of ${r.size}`,
  lastRaidSoldiers: (r) => `Last raid: soldiers stopped ${r.bySoldiers} of ${r.size}`,
  rubbleRow: (cost) => `Rubble: clear it for ${cost} gold a tile`, rubbleDrag: 'Drag Demolish over rubble to clear many at once',
  clearFor: (cost) => `Clear, ${cost} gold`, cleared: 'Rubble cleared',
  holdFestival: (cost) => `Hold a festival, ${cost} gold`, festivalHeld: 'Festival held',
  festivalDoes: (mood, days, every) => `+${mood} mood for ${duiDuration(days)}; the next can follow ${duiDuration(every)} later`,
  festivalOn: (mood, days) => `Festival: +${mood} mood for ${duiDuration(days)} more`,
  nextFestival: (days) => `Next festival in ${duiDuration(days)}`,
  festivalNeedsTemple: 'A festival needs a working temple',
  wouldPassDebt: (n) => `Would put the treasury over ${n} gold in debt`,       // canAfford's floor (src/sim/money.js)
  lastRaid: 'Last raid', endedOn: (date) => `Ended ${date}`,
  noWarning: 'Tribute can be paid only while a raid is on its way',
  raidSheetTitle: 'Raid warning',                                  // the raid sheet's heading on the first raid, which no tribute buys off
  capital: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s),
  tributeCost: (cost) => `Pay ${cost} gold of tribute`, goldNow: 'Gold now', goldAfter: 'Gold afterwards',
  cancels: (dir, size) => `Cancels the raid from ${duiFrom(dir)} (${plural(size, 'raider', 'raiders')}${duiDirsOf(dir).length > 1 ? ' in two bands' : ''}). The next raid still comes.`,
  tributeBelowZero: (gold) => `You have ${gold} gold. Tribute can't put the treasury below 0.`,
  payGold: (cost) => `Pay ${cost} gold`, keepGold: 'Keep gold, defend', tributePaid: (cost) => `Tribute paid: ${cost} gold`,
});
// D4: tools and the fire-risk overlay. The bands start at FIRE_BANDS (src/data/fire.js); the dot is staffedCover, as on
// the fire row. The firehouse's line counts what fireCoverage would reach from the ghost (src/ui/placement.js); the wall
// line counts previewWall's tiles and gates (src/sim/defence.js); clearing rubble costs rubbleCostOf a tile and is
// refused below the debt floor (src/sim/commands.js previewDemolishArea).
import { FIRE_BANDS as duiBandStarts } from '../data/fire.js';
const duiBandNames = ['Low', 'Rising', 'High', 'Can catch fire'];
Object.assign(OVERLAY_NAMES, { fire: 'Fire risk' });
Object.assign(OVERLAY_LEGEND, { fire: ['A staffed firehouse reaches it', 'No staffed firehouse reaches it'] });
Object.assign(DANGER_UI_TEXT, {
  fireBand: (k) => {
    const from = duiBandStarts[k], next = duiBandStarts[k + 1];
    return { label: duiBandNames[k], words: `${duiBandNames[k]}: fire risk ${next === undefined ? `${from} or more` : `${from} to ${next - 1}`}` };
  },
  neverBurnNote: 'Roads, gardens, statues, wells and walls never burn',
  firehouseCovers: (n) => (n > 0 ? DANGER_UI_TEXT.covers(n) : 'No buildings that can burn in reach yet'),   // as the sheet's covers line
  wallCount: (tiles, gates) => `${plural(tiles, 'tile', 'tiles')}${gates ? `, ${plural(gates, 'gate', 'gates')} on roads` : ''}`,
  clearRubble: (n, cost) => `Clear ${n} rubble: ${cost} gold`,
  demolishCost: (gold) => `${gold} gold`,
});
// ── end s3 ui ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 score (Track E) ──────────────────────────────────────────────────────────────────────────────────────────
// Track E's words for scoring: parts, reasons, medals, splits, records, sharing, feats, remarks, and the danger goals, firsts, achievements, daily goals and tips. Add new lines just above the end marker.
// Imports for this section only, aliased so no other section's names can clash (import declarations are hoisted).
import { DAYS_PER_MONTH as SCORE_DAYS_PER_MONTH, MONTHS_PER_YEAR as SCORE_MONTHS_PER_YEAR } from '../sim/time.js';
import { DEFENCE as SCORE_DEFENCE } from '../data/raids.js';
import { DAILY_POOL as SCORE_DAILY_POOL } from '../data/daily.js';
import { FEATS as SCORE_FEATS } from '../data/feats.js';
// The score (spec 4.19): parts, reasons, medals, the chip, the confirm bar's "+3 Culture" and the summary's section. Every
// number comes from scoreOf (src/sim/score.js); the reason codes and their fields are listed there.
export const SCORE_TEXT = {
  score: 'Score', cityScore: 'City score', splits: 'Milestones', noSplits: 'No milestones yet',
  parts: { people: 'People', prosperity: 'Prosperity', culture: 'Culture', safety: 'Safety' },
  medals: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' },
  noMedal: 'No medal yet', topMedal: 'The highest medal',
  noHomes: 'No one lives here yet', noRoute: 'No trade route yet', raidLost: 'A raid was lost in the last year',
  scoreHelp: 'The score measures the city as it stands now. It never changes what you can build.',
};
const SCORE_SIDE_STREETS = { east: 'the east streets', west: 'the west streets', north: 'the north streets', south: 'the south streets' };
const scoreMilestoneName = (id) => (MILESTONES.find((m) => m.id === id) || { name: id }).name;
// One part's reason line, from scoreOf's reasons[part] ({ code, ... }); '' for none.
export function scoreReasonText(r) {
  if (!r) return '';
  switch (r.code) {
    case 'growth': return `${scoreMilestoneName(r.milestone)}: ${progressText(r.people, r.of)} people`;
    case 'homes': return `Most homes are ${TIERS[r.tier].name}s`;
    case 'no_homes': return SCORE_TEXT.noHomes;
    case 'taxes': return `Taxes bring ${r.perPerson} gold a person: bigger homes pay more`;
    case 'jobless': return `${r.percent}% of workers have no job`;
    case 'debt': return `The treasury is ${r.gold} gold in debt`;
    case 'routes': return r.n === 0 ? SCORE_TEXT.noRoute : `Only ${plural(r.n, 'trade route is', 'trade routes are')} open`;
    case 'no_temple': return `${plural(r.n, 'home has', 'homes have')} no temple`;
    case 'no_booth': return `${plural(r.n, 'home has', 'homes have')} no entertainment`;
    case 'no_bazaar': return `${plural(r.n, 'home has', 'homes have')} no bazaar`;
    case 'plain': return `Homes average ${r.value} of 50 desirability`;
    case 'fire_cover': return `No staffed firehouse reaches ${r.dir ? SCORE_SIDE_STREETS[r.dir] : plural(r.n, 'building', 'buildings')}`;
    case 'towers': return `A raid this size needs ${plural(r.need, 'tower', 'towers')}; you have ${r.towers} working${r.soldiers ? ` and ${plural(r.soldiers, 'army unit', 'army units')}` : ''}`;   // every unit kind (score.js, ruling 386)
    case 'burned': return `${plural(r.n, 'building', 'buildings')} burned in the last year`;
    case 'raid_lost': return SCORE_TEXT.raidLost;
    default: return '';
  }
}
export const scoreChipText = (total) => `${SCORE_TEXT.score} ${total}`;
export const medalText = (medal) => (medal ? `${SCORE_TEXT.medals[medal]} medal` : SCORE_TEXT.noMedal);
export const nextMedalText = (next) => (next ? `${plural(next.points, 'point', 'points')} to ${SCORE_TEXT.medals[next.medal]}` : SCORE_TEXT.topMedal);
export const partBarLabel = (part, n) => `${SCORE_TEXT.parts[part]}: ${progressText(n, 100)}`;
export const factorText = (raw, factor, level) => `Parts ${raw} × ${factor} on ${DIFFICULTY_NAMES[level] || level}`;
// The confirm bar's score line: the parts that would change by a whole point or more ("+3 Culture, −1 Safety"); '' for none.
export const scoreLineText = (delta) => Object.keys(SCORE_TEXT.parts).filter((p) => Math.abs(delta[p] || 0) >= 1)
  .map((p) => `${delta[p] > 0 ? '+' : '−'}${Math.abs(delta[p])} ${SCORE_TEXT.parts[p]}`).join(', ');
// A milestone split as a game date: "Town in year 2, month 3" (day 0 is year 1, month 1).
const SCORE_YEAR_DAYS = SCORE_DAYS_PER_MONTH * SCORE_MONTHS_PER_YEAR;
export const splitDateText = (id, day) => `${scoreMilestoneName(id)} in year ${Math.floor(day / SCORE_YEAR_DAYS) + 1}, month ${Math.floor((day % SCORE_YEAR_DAYS) / SCORE_DAYS_PER_MONTH) + 1}`;
// A split against the personal best on this seed and level (records' bestFor: the earliest day another city reached it),
// in whole game-months; just the date when no other city got there.
export function splitCompareText(id, day, bestDay) {
  const base = splitDateText(id, day);
  if (!Number.isInteger(bestDay)) return base;
  const diff = Math.floor(bestDay / SCORE_DAYS_PER_MONTH) - Math.floor(day / SCORE_DAYS_PER_MONTH);
  if (diff === 0) return `${base}: level with your best`;
  return `${base}: ${plural(Math.abs(diff), 'month', 'months')} ${diff > 0 ? 'faster' : 'slower'} than your best`;
}
// Seal this reign (spec 4.19): the confirmation says exactly what sealReign records and what it does not change.
Object.assign(SCORE_TEXT, { sealReign: 'Seal this reign', sealConfirm: 'Seal reign', notYet: 'Not yet', shareScore: 'Share score', stampNote: 'Its stamp shows on the title card.' });
export const sealQuestion = (total, medal) => `Seal this reign? Your chronicle gets score ${total}${medal ? ` (${SCORE_TEXT.medals[medal]})` : ''} for this city. The city carries on.`;
export const sealedText = (seal) => `Reign sealed with score ${seal.score}`;
// Sharing (spec 4.19): opt-in, and every shared score says friends' honour.
export const SHARE_TEXT = {
  honour: "Friends' honour", honourHelp: "Friends' honour: a link can't be checked without a server.",
  sharePicture: 'Share picture', shareLink: 'Share link', linkLabel: 'Link to this score', making: 'Making the picture…',
  pictureSaved: 'Picture downloaded', copied: 'Copied', fileName: 'thebes-score.png',
  seedLine: (seed, level) => `Seed ${seed} · ${level}`,
  text: (total, rows, link) => `Thebes: score ${total}, friends' honour\n${rows}\n${link}`,
};
Object.assign(T, { sealReign: SCORE_TEXT.sealReign, shareScore: SCORE_TEXT.shareScore });   // the two sheets' headings
// The title card (spec 4.1, 4.19): the device's bests and stamps, This week's Nile and a friend's shared score.
export const TITLE_SCORE_TEXT = {
  weekly: "This week's Nile", records: 'Your records', friend: "A friend's score", startSeed: 'Start this seed',
  badLink: "This score link can't be read", newerLink: 'This score link is from a newer version of Thebes',
  weeklyHint: (seed) => `Seed ${seed}: the same river for everyone this week`,
  bestLine: (b) => `Best: ${b.score}${b.medal ? `, ${SCORE_TEXT.medals[b.medal].toLowerCase()}` : ''}, seed ${b.seed}, ${DIFFICULTY_NAMES[b.difficulty] || b.difficulty}${b.mapSize && b.mapSize !== MAP.size ? `, ${S46_MAP_TEXT.sizeNote(b.mapSize)}` : ''}${b.older ? ', older scoring' : ''}`,   // Stage 4.6 (ruling 333): a record from a Small or Large map says so; Normal says nothing, as before
  stampLabel: (e) => `Sealed reign: score ${e.score}${e.medal ? `, ${SCORE_TEXT.medals[e.medal].toLowerCase()}` : ''}, seed ${e.seed}${e.mapSize && e.mapSize !== MAP.size ? `, ${S46_MAP_TEXT.sizeNote(e.mapSize)}` : ''}`,
  moreStamps: (n) => `+${n} more`,
  friendLine: (total, seed, level) => `${total} on seed ${seed}, ${DIFFICULTY_NAMES[level] || level}. ${SHARE_TEXT.honour}`,
  partsLine: (parts) => Object.keys(SCORE_TEXT.parts).filter((p) => p in parts).map((p) => `${SCORE_TEXT.parts[p]} ${parts[p]}`).join(' · '),
  yourBest: (score) => (score === null ? 'You have no score on this seed and level yet' : `Your best here: ${score}`),
  beat: (total) => `Beat ${total}?`,
  startOn: (level) => `It starts on ${DIFFICULTY_NAMES[level] || level}, the level of the shared score.`,
};
// Danger in the goals and rewards (spec 4.19): the chapter, five firsts, four achievements, three daily goals and six
// tips. Every number comes from the data, and every claim follows the rules of fire (spec 4.12) and raids (spec 4.13).
const scoreAchievement = (id) => ACHIEVEMENTS.find((a) => a.id === id).measure;
const scoreDaily = (id) => SCORE_DAILY_POOL.find((d) => d.id === id);
Object.assign(CHAPTER_NAMES, { danger: 'Danger' });
Object.assign(FIRST_TEXT, {
  // A staffed firehouse (coverage of half or more) puts blazes out; any working one in road reach slows the risk.
  first_firehouse: { head: 'First firehouse', why: `Staffed, it puts out blazes and slows fire risk up to ${BUILDINGS.firehouse.reach} road tiles away.` },
  // A blaze goes out only with a staffed firehouse in reach, a fire only with one reaching it: either way one reached it.
  first_fire_out: { head: 'First fire put out', why: 'A firehouse that reaches the building saved it.' },
  first_wall: { head: 'First wall', why: 'Raiders must break through a wall before they can pass it.' },
  first_tower: { head: 'First tower', why: `Staffed, it shoots raiders up to ${SCORE_DEFENCE.towerRange} tiles away.` },
  first_raid_beaten: { head: 'First raid beaten', why: 'Your defences turned the raiders back.' },
});
Object.assign(ACHIEVEMENT_NAMES, { fire_brigade: 'Fire brigade', safe_streets: 'Safe streets', wall_builder: 'Wall builder', raid_breaker: 'Raid breaker' });
Object.assign(ACHIEVEMENT_TEXT, {
  safe_streets: `Reach ${scoreAchievement('safe_streets').people} people with no building burned for a year`,
  wall_builder: `Draw ${scoreAchievement('wall_builder').n} wall tiles`,
  raid_breaker: `Beat ${scoreAchievement('raid_breaker').n} raids`,
});
Object.assign(DAILY_TEXT, { firehouse1: 'Build a firehouse', wall10: `Draw ${scoreDaily('wall10').n} wall tiles`, tower1: 'Build a tower' });
// The raider_targets tip says the order a band strikes in, from the sim (src/sim/raids.js pickTarget): strike k goes for RAIDS.pillage[k]
// (a granary, a home) when it has one, else the RAIDS.targets kinds in order; a band makes RAIDS.strikes strikes.
const PILLAGE_WORDS = { house: 'a home', granary: 'a granary' };
export function raiderTargetsTip(raids = raidsData.RAIDS) {
  const usual = `${listText(raids.targets.map(pluralName))}`;
  const parts = Array.from({ length: raids.strikes }, (_, k) => {
    const want = raids.pillage[k];
    return want ? (PILLAGE_WORDS[want] || `a ${buildingName(want).toLowerCase()}`) : usual;
  });
  return `Raiders hit ${parts[0]}${parts.length > 1 ? ' first' : ''}${parts.slice(1).map((p) => `, then ${p}`).join('')}: guard those.`;
}
Object.assign(TIP_TEXT, {
  fire_risk: `Watch fire risk from Town: a staffed firehouse within ${BUILDINGS.firehouse.reach} road tiles slows it.`,
  firebreaks: 'Leave roads between buildings: fire spreads only to buildings that touch.',
  clearing_rubble: 'Clear rubble with Demolish: tap it or drag over it. Clearing costs gold.',
  raider_targets: raiderTargetsTip(),
  tribute_once: 'Pay tribute only if you must: it cancels this raid, not the next one.',
  wall_ring: 'Close your wall into a ring and set towers on it: raiders must break through.',
});
// Feats (spec 4.19): a name and the exact condition each, numbers from the data (src/data/feats.js, src/sim/feats.js).
const scoreFeatCheck = (id) => SCORE_FEATS.find((f) => f.id === id).check;
const scoreFeatMilestone = (id) => scoreMilestoneName(scoreFeatCheck(id).milestone);
export const FEAT_TEXT = {
  debt_free: { name: 'Debt-free founder', condition: `Become a ${scoreFeatMilestone('debt_free')} without the treasury ever going below 0` },
  well_fed: { name: 'Well fed', condition: `Feed every home at ${tierName(3)} or better for ${scoreFeatCheck('well_fed').months} months in a row, with ${scoreFeatCheck('well_fed').people} people or more` },
  grain_alone: { name: 'Grain alone', condition: `Become a ${scoreFeatMilestone('grain_alone')} without building a ${buildingName(scoreFeatCheck('grain_alone').type).toLowerCase()}` },
  firewise: { name: 'Firewise', condition: `Lose no building to fire for ${scoreFeatCheck('firewise').days / SCORE_YEAR_DAYS} years after becoming a ${scoreFeatMilestone('firewise')}` },
  untouched: { name: 'Untouched', condition: 'Beat a raid with no building burned and no gold stolen' },
  never_bowed: { name: 'Never bowed', condition: `Become the ${scoreFeatMilestone('never_bowed')} without paying tribute` },
  garden_city: { name: 'Garden city', condition: `Have ${scoreFeatCheck('garden_city').n} gardens and statues at once` },
  full_hands: { name: 'Full hands', condition: `Have ${scoreFeatCheck('full_hands').people} people or more with ${Math.round(scoreFeatCheck('full_hands').rate * 100)}% or fewer out of work` },
  merchant_prince: { name: 'Merchant prince', condition: `Sell ${scoreFeatCheck('merchant_prince').n.toLocaleString('en-GB')} goods to caravans` },
  swift_town: { name: 'Swift Town', condition: `Become a ${scoreFeatMilestone('swift_town')} before year ${scoreFeatCheck('swift_town').day / SCORE_YEAR_DAYS + 1} begins` },
};
Object.assign(SCORE_TEXT, { feats: 'Feats', featEarned: 'Earned', featMissed: 'Missed', featOpen: 'Open', feat: 'Feat', noFeats: 'No feats yet.', featsHelp: 'Feats are optional: they pay nothing and never hold anything back.' });
export const featsHeading = (done, total) => `${SCORE_TEXT.feats}, ${progressText(done, total)}`;
export const sealFeatsText = (names) => (names.length ? `Feats this reign: ${listText(names)}.` : SCORE_TEXT.noFeats);
// The opening chain and the next-threshold bar (spec 4.1).
export const thresholdMilestoneText = (name, n, of) => `${name}: ${progressText(n, of)} people`;
export const thresholdMedalText = (next) => `${SCORE_TEXT.medals[next.medal]}: ${plural(next.points, 'point', 'points')} to go`;
// Citizen remarks (spec 4.19): at least 24, by season, each heard only in a city with its building (`type`).
export const CITIZEN_REMARKS = [
  { season: 'akhet', type: 'potter', text: 'The potters say the clay is good this year' },
  { season: 'akhet', type: 'farm_grain', text: 'The farmers say the flood left rich black soil', flood: 'fair' },   // Stage 4.6 (ruling 346): flood rows are heard only in a Fair or better year
  { season: 'akhet', type: 'well', text: 'The water carriers say the wells are full and sweet', flood: 'fair' },
  { season: 'akhet', type: 'granary', text: 'The granary keepers are sweeping out the bins' },
  { season: 'akhet', type: 'temple', text: 'The priests say the river rose just as it should', flood: 'fair' },
  { season: 'akhet', type: 'bazaar', text: 'At the bazaar they talk of how high the river came', flood: 'fair' },
  { season: 'akhet', type: 'house', text: 'Families mend their roofs while the fields lie under water', flood: 'fair' },
  { season: 'akhet', type: 'booth', text: 'The players at the booth are learning a flood song', flood: 'past' },   // final review: flood: 'past' rows wait for the city's first flood
  { season: 'peret', type: 'farm_grain', text: 'The young grain stands green and even in the fields' },
  { season: 'peret', type: 'farm_fig', text: 'The fig trees are heavy with fruit' },
  { season: 'peret', type: 'clay_pit', text: 'The diggers at the clay pit sing to keep time' },
  { season: 'peret', type: 'garden', text: 'Neighbours sit in the gardens in the cool of the evening' },
  { season: 'peret', type: 'weaver', text: 'The weavers say the flax is long and fine this year' },
  { season: 'peret', type: 'brewery', text: 'The brewers are trying a sweeter beer' },
  { season: 'peret', type: 'house', text: 'Children chase each other between the houses at dusk' },
  { season: 'peret', type: 'storehouse', text: 'The storehouse clerks count every jar twice' },
  { season: 'shemu', type: 'farm_grain', text: 'The harvesters are singing in the fields' },
  { season: 'shemu', type: 'granary', text: 'The granaries are filling with the new harvest' },
  { season: 'shemu', type: 'well', text: 'The water carriers rest in the shade at noon' },
  { season: 'shemu', type: 'trading_post', text: 'A trader says caravans pay well for Theban goods' },
  { season: 'shemu', type: 'jeweller', text: 'The jewellers are cutting stones for a wedding' },
  { season: 'shemu', type: 'temple', text: 'The priests watch the river for the first rise', flood: 'past' },
  { season: 'shemu', type: 'statue', text: 'People leave flowers at the foot of the statues' },
  { season: 'shemu', type: 'firehouse', text: 'The firefighters keep their jars full in the dry heat' },
];
// ── end s3 score ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 balance (Track F) ──────────────────────────────────────────────────────────────────────────────────────────
// Track F's words for the integrator: anything balance needs words for (difficultyHint is edited in place). Add new lines just above the end marker.
export const BALANCE_TEXT = {};
// ── end s3 balance ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 and Stage 4 sections: leave these lines as they are.)
//
// ── s4 contract (Track 0) ────────────────────────────────────────────────────────────────────────────────────────
// Words for the Stage 4 contract's own additions. Each Stage 4 track keeps its words in its own section below, as its own
// exported objects whose names carry its prefix (src/ui/text.js is one module), and adds to the shared tables above
// (T, REASONS, ALERT_TEXT, MOOD_NAMES, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, TIP_TEXT,
// CHAPTER_NAMES, SCORE_TEXT, BUILDING_PLURALS, CITIZEN_REMARKS, ...) only with Object.assign inside its own section.
// Prefixes: A sim4 / SIM4_, B art4 / ART4_, C ui4 / UI4_, D score4 / SCORE4_, E motion4 / MOTION4_, G cards4 / CARDS4_,
// H look4 / LOOK4_, F balance4 / BALANCE4_.
Object.assign(SCORE_TEXT.parts, { monuments: 'Monuments' });
Object.assign(BUILDING_PLURALS, { quarry: 'quarries', brickworks: 'brickworks', builders_guild: "builders' guilds", plaza: 'plazas', sphinx: 'sphinxes', palace: 'palaces' });
Object.assign(MOOD_NAMES, { monuments: 'Monuments', palace: 'Palace' });   // spec 4.9: "Monuments +4", "Palace +2"
// The Settings sheet's Motion row until Track E words it fully (spec 5.4).
export const CONTRACT4_TEXT = {
  motion: 'Motion',
  motionLevels: { system: 'Follow the device', full: 'Full', gentle: 'Gentle', still: 'Still' },
};
// ── end s4 contract ──────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 sim (Track A) ─────────────────────────────────────────────────────────────────────────────────────────────
// Track A's words: its REASONS (not_on_fields, one_only, work_begun, finished, the palace's), its ALERT_TEXT codes
// (site_stalled and its reason codes), the mood rows' names if they change, and the supply buildings' working lines.
// Add new lines just above the end marker.
// The refusals Track A's commands return (src/sim/commands.js place and setPaused, src/sim/palace.js palaceQuote and
// enlargePalace, src/sim/undo.js): reasonText(code) words each. work_begun's generic line is for callers that have no
// site to name; SIM4_TEXT.workBegun names it from undo's { type }.
Object.assign(REASONS, {
  not_on_fields: 'Monuments stand on dry ground, not the fields',
  one_only: 'The city has its palace: there is only one',
  work_begun: 'Work has begun on it: demolish it instead',
  finished: 'A finished monument has nothing to pause',
  not_palace: 'That is not the palace',
  works: 'The palace is already being enlarged',
  last_style: 'The palace is as grand as it gets',
  no_road: 'Must touch a road',
});
export const SIM4_TEXT = {
  // Undo refused once work has begun on a site (ruling 236): "Work has begun on the small obelisk: demolish it instead".
  workBegun: (type) => `Work has begun on the ${buildingName(type).toLowerCase()}: demolish it instead`,
};
// ── end s4 sim ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 art (Track B) ─────────────────────────────────────────────────────────────────────────────────────────────
// Track B's words: anything the drawing needs in words (the problem markers' screen-reader names). Add new lines just
// above the end marker.
export const ART4_TEXT = {};
// ── end s4 art ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 ui (Track C) ──────────────────────────────────────────────────────────────────────────────────────────────
// Track C's words: the Monuments tab's cards and locks, the monument chips and confirm-bar line, the site, guild, quarry,
// brickworks and palace sheets, the summary's Monuments section, Welcome back's site lines, the stall warnings' tier
// words and View's outline. Add new lines just above the end marker.
import { extraGoldOf as ui4ExtraGold } from '../sim/costs.js';
import { siteStatus as ui4SiteStatus } from '../sim/monuments.js';
// Whole gold with thousands marked, as the spec writes it ("1,000 gold").
export const ui4Gold = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ui4Lower = (type) => buildingName(type).toLowerCase();
const ui4Cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// What a monument's crews and materials are, for "come by road": the crews and every material its courses use (its recipe).
const ui4ByRoad = (type) => listText(['crews', ...['stone', 'bricks'].filter((g) => score4Monuments[type] && score4Monuments[type].courses.some((c) => c[g] > 0))]);
export const UI4_TEXT = {
  // The Monuments tab's cards (spec 4.4, 4.14, 6.3): the ground a monument stands on, and a prestige lock with its count. The
  // sim refuses only fertile land (ruling 299: desert, rocky, meadow and bank all take one), so the words say just that; the
  // card's line is the short form, one line in a 124 px card at 150% text.
  groundCard: 'Not on the fields',
  groundTip: 'on dry ground, not the fields',
  needsPrestige: (need, have) => `Needs ${need} prestige (you have ${have})`,
  needsMilestoneAndPrestige: (milestone, need) => `Needs ${milestone} and ${need} prestige`,
  // The monument chips (spec 6.5, ruling 230), each the sim's own condition in words.
  groundMet: 'Dry ground, not the fields',
  notOnFields: (fertile, of) => `Not on the fields: ${fertile} of ${of} tiles are fertile`,
  roadLater: (type) => `No road yet: ${ui4ByRoad(type)} come by road`,
  crewMet: (n) => `Crew: ${plural(n, "builders' guild", "builders' guilds")} near`,
  crewLater: "No builders' guild near",
  supplyMet: (goods) => `${ui4Cap(listText(goods.map((g) => goodName(g).toLowerCase())))} near`,
  // Every material the recipe takes that has no maker or storehouse near (ruling 300): "No bricks or stone near".
  supplyLater: (goods) => `No ${[].concat(goods).map((g) => goodName(g).toLowerCase()).join(' or ')} near`,
  founding: (cost, have) => `Founding ${ui4Gold(cost)} gold: you have ${ui4Gold(have)}`,
  // The confirm bar's line (spec 6.5, ruling 251), after the score's "+N Monuments when finished" (Track D).
  crewGold: (gold) => `then ${ui4Gold(gold)} gold a crew a month`,
  finishedNicer: (n) => `finished: ${plural(n, 'home', 'homes')} nicer`,
  whileBuilding: (n) => `while building: ${plural(n, 'home', 'homes')} less pleasant`,
  oneOfEach: 'One of each kind counts: no prestige',
  founded: (type) => `${buildingName(type)} founded`,
  // The Ground overlay while a monument is placed (spec 6.3, ruling 229).
  groundFertile: 'Fertile: no monuments here',
  roomFor: (type) => `Gold: room for a ${ui4Lower(type)}`,
  noRoomFor: (type) => `No room left for a ${ui4Lower(type)}`,
};
// One monument condition's chip words (src/sim/commands.js conditionsFor: ground, road, crew, supply, gold). The supply chip
// names the sim's own lists: every material the recipe takes when all are near (goods), else every one missing (missing).
// Ground refusals other than the fields keep the shared words (conditionText).
export function ui4ConditionText(cond, type) {
  const U = UI4_TEXT;
  if (cond.key === 'ground') {
    if (cond.state === 'met') return U.groundMet;
    if (cond.reason === 'not_on_fields') return U.notOnFields(cond.fertile, cond.of);
    return conditionText(cond, type);
  }
  if (cond.key === 'road') return cond.state === 'met' ? CONDITION_TEXT.roadMet : cond.state === 'later' ? U.roadLater(type) : CONDITION_TEXT.roadCant;
  if (cond.key === 'crew') return cond.state === 'met' ? U.crewMet(cond.n) : U.crewLater;
  if (cond.key === 'supply') return cond.state === 'met' ? U.supplyMet(cond.goods || []) : U.supplyLater(cond.missing || [cond.good]);
  if (cond.key === 'gold') return U.founding(cond.cost, cond.have);
  return conditionText(cond, type);
}

// Task C2: the sheets (spec 6.3, 4.16, 4.20; rulings 210, 236, 245, 258, 273, 275). Each row states what the sim's own function
// returned (siteStatus, crewsFor, paceOf, guildSite, supplyNeeded, palaceQuote, demolishRefundFor).
const ui4Months = (days) => {
  const months = Math.max(1, Math.ceil(days / 30));
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? plural(y, 'year', 'years') : '', m ? plural(m, 'month', 'months') : ''].filter(Boolean).join(' ');
};
const ui4MakerOf = { stone: 'quarry', bricks: 'brickworks' };
const ui4Count = (n, type) => plural(n, ui4Lower(type), BUILDING_PLURALS[type] || `${ui4Lower(type)}s`);
// Why a site is not progressing, short ("Not progressing: no stone"), by siteStatus's reason codes.
const UI4_STALL_SHORT = {
  no_road: 'no road', paused: 'paused', no_crew: 'no crew', crew_short: "its builders' guild is short of workers", crew_burning: "its builders' guild is on fire",
  no_gold: 'no gold', waiting_gilding: 'waiting for gold for the gilding', waiting_capstone: 'waiting for gold for the capstone', no_stone: 'no stone', no_bricks: 'no bricks',
};
Object.assign(UI4_TEXT, {
  progress: (course, courses, share) => `Course ${course + 1} of ${courses} · ${Math.floor(share * 100)}% done`,
  crews: (n, max) => `Crews: ${n} of ${max}.${n ? ` ${ui4Count(n, 'builders_guild')} ${n === 1 ? 'works' : 'work'} here.` : ''}`,
  // A stall's cause and its fix, the same words on the sheet, in the alert list and on Welcome back (spec 4.16 Stalls).
  cause: {
    no_road: (type) => UI4_TEXT.roadLater(type),
    paused: 'Paused: no work and no work gold until you resume it',
    no_crew: (reach) => `No crew: build a builders' guild within ${reach} road tiles`,
    crew_short: "The builders' guild is short of workers",
    crew_burning: "The builders' guild is on fire",
    no_gold: 'No gold for the crews: a crew works a day only when its pay leaves the treasury at 0 or more',
    waiting_gilding: (gold) => `Waiting for ${ui4Gold(gold)} gold for the gilding`,
    waiting_capstone: (gold) => `Waiting for ${ui4Gold(gold)} gold for the capstone`,
    // The spec's sentence only when nothing reaches the site; else what is true (a quarry that reaches it has not delivered yet).
    material: (good, makers = 0, stores = 0) => {
      const g = goodName(good).toLowerCase();
      if (!makers && !stores) return `Waiting for ${g}: no ${ui4Lower(ui4MakerOf[good])} or storehouse with ${g} within reach`;
      const parts = [makers ? ui4Count(makers, ui4MakerOf[good]) : '', stores ? ui4Count(stores, 'storehouse') : ''].filter(Boolean);
      return `Waiting for ${g}: ${listText(parts)} ${makers + stores === 1 ? 'reaches' : 'reach'} this site, but none has arrived yet`;
    },
  },
  stallShort: (reason) => UI4_STALL_SHORT[reason] || 'no work',
  material: (good, onSite, makers, stores) => {
    const parts = [makers ? ui4Count(makers, ui4MakerOf[good]) : '', stores ? ui4Count(stores, 'storehouse') : ''].filter(Boolean);
    const reach = parts.length ? `${listText(parts)} ${makers + stores === 1 ? 'reaches' : 'reach'} this site.` : `No ${ui4Lower(ui4MakerOf[good])} or storehouse reaches this site.`;
    return `${goodName(good)}: ${Math.floor(onSite)} on site. ${reach}`;
  },
  pace: (days) => `At last month's pace, about ${ui4Months(days)} to finish`,
  notProgressing: (reason) => `Not progressing: ${UI4_STALL_SHORT[reason] || 'no work'}`,
  paceLater: 'Pace shows after a month of work',
  lastMonth: (gold, crews) => `Last month: ${ui4Gold(Math.floor(gold))} gold for ${plural(crews, 'crew', 'crews')}. Work stops if gold would go below 0.`,
  workGold: (gold) => `Work gold: ${ui4Gold(gold)} gold a crew a month. Work stops if gold would go below 0.`,
  prestige: (now, more) => `Prestige ${now} so far; +${more} when finished`,
  otherHolds: (type) => `One of each kind counts: the other ${ui4Lower(type)} holds its prestige`,
  finishedOn: (year, month) => `Finished in year ${year}, month ${month}`,
  countsFor: (n) => `Counts for prestige: ${n}`,
  otherCounts: (type) => `The other ${ui4Lower(type)} counts for prestige`,
  homesNicer: (n) => (n ? `Makes ${plural(n, 'home', 'homes')} nicer` : 'Makes no homes nicer yet'),
  // The supply buildings (spec 6.3, ruling 258).
  crewAt: (type) => `Crew at work on the ${ui4Lower(type)}`,
  crewShort: (type) => `Short of workers: the crew for the ${ui4Lower(type)} cannot start`,
  crewBurning: (type) => `On fire: the crew for the ${ui4Lower(type)} cannot work`,
  guildIdle: (reach) => `Idle: no monument site within ${reach} road tiles has room for a crew`,
  sends: (good, type) => `Sends ${goodName(good).toLowerCase()} to the ${ui4Lower(type)}`,
  supplyIdle: (good) => `Idle: no monument site needs ${goodName(good).toLowerCase()} within reach`,
  cuttingStone: 'Cutting stone',
  // Demolish asks first (spec 4.16, 4.20).
  // lost: what the city's prestige loses (the best of each kind counts, so a second of the kind makes it less, or nothing).
  tearDownSite: (type, course, courses, lost, refund) => `Tear down the ${ui4Lower(type)}? ${course ? `${course} of ${courses} courses are lost. ` : ''}${lost ? `The city loses ${lost} prestige. ` : ''}Refunds ${ui4Gold(refund)} gold (a quarter of its founding).`,
  tearDownFinished: (type, lost, refund) => `Tear down the ${ui4Lower(type)}? ${lost ? `It is lost, and the city loses ${lost} prestige.` : 'It is lost; the city loses no prestige.'} Refunds ${ui4Gold(refund)} gold (a quarter of its founding).`,
  tearDownPalace: (n, refund) => `Tear down the palace? ${n ? `Its ${plural(n, 'enlargement', 'enlargements')} ${n === 1 ? 'is' : 'are'} lost. ` : ''}Refunds ${ui4Gold(refund)} gold.`,
  workBegun: (type) => `Work has begun on the ${ui4Lower(type)}: demolish it instead`,
  plazasLaid: (n) => `${plural(n, 'plaza', 'plazas')} laid`,
  // The palace (spec 4.20, rulings 271-275).
  palaceStands: 'Your palace stands: tap to visit it',
  palaceStyle: (name) => `Style: ${name}`,
  palaceNicer: (values) => `Makes homes nicer up to ${values.length} tiles away (+${values[0]} beside it)`,
  palaceMood: (n) => (n ? `Mood: +${n}` : 'Mood: none until it is enlarged'),
  palaceNoRoad: 'No road yet: no desirability or mood until a road touches it',
  palaceWorks: (to, days) => `Enlarging to ${to}: ${plural(days, 'day', 'days')} left`,
  enlarge: (to, gold) => `Enlarge to ${to}: ${ui4Gold(gold)} gold`,
  enlargeAsk: (to, gold) => `Enlarge the palace to ${to} for ${ui4Gold(gold)} gold? It is paid at once and cannot be undone.`,
  enlargeOk: 'Enlarge',
  enlarged: (to, days) => `Enlarging to ${to}: ready in ${plural(days, 'day', 'days')}`,
  palaceDone: (to) => `The palace is now ${to}`,
  enlargeWhy: {
    works: (days) => `One enlargement at a time: ${plural(days, 'day', 'days')} left`,
    last_style: 'The palace is at its grandest',
    locked: (comes, milestone) => `${comes} ${milestone}`,
    no_road: 'The palace needs a road first',
    no_gold: (have) => `You have ${ui4Gold(have)} gold: enlarging can't put the treasury below 0`,
  },
});
// A stall's cause in words (spec 4.16 Stalls, ruling 245), the same on the site sheet, in the alert list and on Welcome back,
// by siteStatus's reason codes; '' for none. extraGold: the gilding's or capstone's gold for the city (extraGoldOf).
export function ui4CauseText(reason, extraGold = 0, material = null, type = null) {
  const C = UI4_TEXT.cause;
  if (!reason) return '';
  if (reason === 'no_road') return C.no_road(type);                       // type: the monument, whose recipe names what comes by road
  if (reason === 'no_crew') return C.no_crew(BUILDINGS.builders_guild.reach);
  if (reason === 'waiting_gilding' || reason === 'waiting_capstone') return C[reason](extraGold);
  // material: { makers, stores }, the counts that reach the site (siteStatus); none given: nothing reaches it.
  if (reason === 'no_stone' || reason === 'no_bricks') return C.material(reason.slice(3), material ? material.makers : 0, material ? material.stores : 0);
  return typeof C[reason] === 'string' ? C[reason] : '';
}
// Task C3: the stall warning (a warning, never a critical: ruling 211), the summary's Monuments section and spending row,
// Welcome back's site lines and the palace's tip.
ALERT_TEXT.site_stalled = (alert, world, b, name) => {
  const good = alert.reason === 'no_stone' || alert.reason === 'no_bricks' ? alert.reason.slice(3) : null;
  const m = good && b ? ui4SiteStatus(world, b).materials[good] : null;
  return {
    title: `${name} is not progressing`,
    fix: ui4CauseText(alert.reason, b ? ui4ExtraGold(world, b.type, b.style) : 0, m ? { makers: m.makers.length, stores: m.stores.length } : null, b ? b.type : null) || 'Have a look',
  };
};
Object.assign(UI4_TEXT, {
  monuments: 'Monuments',
  siteLine: (type, course, courses) => `${buildingName(type)}: course ${course + 1} of ${courses}`,
  finishedLine: (type) => `${buildingName(type)}: finished`,
  noMonumentYet: 'No monument founded yet',
  prestigeNext: (prestige, type, need, milestone) => `Prestige ${prestige}: the ${ui4Lower(type)} unlocks at ${need}${milestone ? ` and ${milestone}` : ''}`,
  prestigeAll: (prestige, full) => `Prestige ${prestige} of ${full}`,
  spendingHead: 'Monuments last month',
  spendingRow: 'Work, gilding and capstone',
  // Welcome back (spec 4.17): "Small pyramid: course 6 of 8, about 3 years left at last month's pace".
  welcomeHead: 'Monument sites',
  welcomeSite: (type, course, courses, state) => `${buildingName(type)}: course ${course + 1} of ${courses}, ${state}`,
  welcomePace: (days) => `about ${ui4Months(days)} left at last month's pace`,
  welcomeStill: (reason) => (UI4_STALL_SHORT[reason] ? `not progressing: ${UI4_STALL_SHORT[reason]}` : 'not progressing'),   // no invented cause: the caller only asks with a reason set
  welcomePaused: 'paused',
  welcomeNoRoad: 'no road yet',
  welcomeFirst: 'pace shows after a month of work',
});
Object.assign(TIP_TEXT, { palace_grows: 'Your palace can grow: enlarge it on its sheet for more mood and nicer homes.' });
// The palace's five styles, by PALACE_STYLES id: the name its sheet shows, the words after "Enlarge to", and the start of
// "... come with City" while its milestone waits.
export const UI4_PALACE_TEXT = {
  courtyard: { name: 'Courtyard house', to: 'a courtyard house', comes: 'A courtyard house comes with' },
  columned: { name: 'Columned hall', to: 'a columned hall', comes: 'A columned hall comes with' },
  pylons: { name: 'Pylons and banners', to: 'pylons and banners', comes: 'Painted pylons come with' },
  gilded: { name: 'Gilded palace', to: 'a gilded palace', comes: 'Gilded cornices come with' },
  lapis: { name: 'Lapis and gold', to: 'lapis and gold', comes: 'Lapis and gold come with' },
};
// ── end s4 ui ────────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 score (Track D) ───────────────────────────────────────────────────────────────────────────────────────────
// Track D's words: score v2 (the Monuments part's reasons, the two new splits, older scoring), the Monuments chapter,
// goals, firsts, achievements, feats, daily goals, captions and citizen remarks. Add new lines just above the end marker.
export const SCORE4_TEXT = {
  splitNames: { pyramids: 'Pyramids unlocked', great_pyramid: 'Great pyramid finished' },
  olderLink: 'Older scoring: this link has four parts, so it is compared with your best from then.',
};
const score4Name = (type) => buildingName(type).toLowerCase();
const score4Milestone = (id) => (MILESTONES.find((m) => m.id === id) || { name: id }).name;
// The Monuments part's reason line (spec 4.19: the next step), from scoreOf's reasons.monuments (src/sim/score.js
// monumentsReason); any other part's reason as scoreReasonText words it.
export function score4ReasonText(r) {
  if (!r) return '';
  switch (r.code) {
    case 'finish': return `Finish the ${score4Name(r.type)}: +${r.more} prestige`;
    case 'found': return r.first ? `No monument yet: found a ${score4Name(r.type)} (${score4Milestone(r.milestone)})` : `Found a ${score4Name(r.type)}: +${r.more} prestige when finished`;
    case 'locked':
      if (r.milestone) return r.first ? `Monuments come with ${score4Milestone(r.milestone)}` : `The ${score4Name(r.type)} comes with ${score4Milestone(r.milestone)}`;
      return `The ${score4Name(r.type)} needs ${r.prestige} prestige (you have ${r.have})`;
    default: return scoreReasonText(r);
  }
}
// The confirm bar's score line for a monument (spec 4.19, ruling 251's first part), from monumentPreview: "+32 Monuments
// when finished"; '' for a second of a kind (one of each kind counts: Track C words that) or a gain under a point.
export const score4MonumentLine = (p) => (p && !p.second && p.gain >= 1 ? `+${p.gain} ${SCORE_TEXT.parts.monuments} when finished` : '');
// A split against the best on this seed and level, as splitCompareText words a milestone's, for all seven (score v2's two
// new ones by their own names: "Pyramids unlocked in year 12, month 3: 5 months faster than your best").
export function score4SplitText(id, day, bestDay) {
  const words = splitCompareText(id, day, bestDay);
  return SCORE4_TEXT.splitNames[id] ? `${SCORE4_TEXT.splitNames[id]}${words.slice(id.length)}` : words;
}
// A shared t1 link (ruling 259): the friend's score says it is older scoring, and "your best" is your best from then.
export const score4YourBest = (score, older) => (!older ? TITLE_SCORE_TEXT.yourBest(score)
  : score === null ? 'You have no older-scoring score on this seed and level' : `Your best here under older scoring: ${score}`);
// A stamp's name: the sealed reign and its glyphs' monuments ("with a small mastaba and 2 small pyramids").
export function score4StampLabel(e) {
  const counts = new Map();
  for (const k of e.built || []) counts.set(k, (counts.get(k) || 0) + 1);
  const names = [...counts].map(([k, n]) => (n === 1 ? `a ${score4Name(k)}` : `${n} ${score4Name(k)}s`));
  return `${TITLE_SCORE_TEXT.stampLabel(e)}${names.length ? `, with ${listText(names)}` : ''}`;
}
// The Monuments chapter of the goals (spec 4.19); its goals' words live in src/data/goals.js with every goal's.
Object.assign(CHAPTER_NAMES, { monuments: 'Monuments' });
// Monuments in the goals and rewards (spec 4.19, 4.20): five firsts, six achievements, two feats, three daily goals, six
// tips, ten citizen remarks and the course, finish and palace captions. Every number comes from the data, and every claim
// follows the monument rules (spec 4.16).
import { MONUMENT as score4Monument, MONUMENTS as score4Monuments, PRESTIGE as score4Prestige } from '../data/monuments.js';
import { FEATS as score4Feats } from '../data/feats.js';
import { DAILY_POOL as score4Daily } from '../data/daily.js';
import { PALACE_STYLES as score4PalaceStyles } from '../data/palace.js';
import { DAYS_PER_MONTH as score4MonthDays, MONTHS_PER_YEAR as score4YearMonths } from '../sim/time.js';
const score4Achievement = (id) => ACHIEVEMENTS.find((a) => a.id === id).measure;
const score4Count = (n) => n.toLocaleString('en-GB');
Object.assign(FIRST_TEXT, {
  first_guild: { head: "First builders' guild", why: `Its crew builds a monument site up to ${score4Monument.crewReach} road tiles away.` },
  first_course: { head: 'First course laid', why: "Half a monument's prestige comes course by course, half when it is finished." },
  first_monument: { head: 'First monument finished', why: `Prestige lifts the mood, +1 for every ${score4Prestige.moodPer}, and the Monuments score.` },
  pyramids_unlocked: { head: 'The small pyramid is unlocked', why: `A ${score4Milestone(score4Monuments.pyramid_small.unlock.milestone)} with ${score4Monuments.pyramid_small.unlock.prestige} prestige can found the small pyramid.` },
  first_palace: { head: 'First palace', why: 'Enlarge it on its sheet as the city grows grander.' },
});
Object.assign(ACHIEVEMENT_NAMES, {
  monument_builder: 'Monument builder', renowned: 'Renowned', seven_wonders: 'Seven wonders', stone_upon_stone: 'Stone upon stone',
  gilded_tip: 'Gilded tip', lapis_and_gold: 'Lapis and gold',
});
Object.assign(ACHIEVEMENT_TEXT, {
  monument_builder: `Finish ${score4Achievement('monument_builder').n} monuments`,
  renowned: `Reach ${score4Achievement('renowned').n} prestige`,
  seven_wonders: `Finish one of each of the ${score4Achievement('seven_wonders').n} monuments`,
  stone_upon_stone: `Lay ${score4Count(score4Achievement('stone_upon_stone').n)} stone on monuments`,
  gilded_tip: 'Finish the large obelisk with its gilded tip',
  lapis_and_gold: 'Enlarge the palace to lapis and gold',
});
const score4FeatCheck = (id) => score4Feats.find((f) => f.id === id).check;
Object.assign(FEAT_TEXT, {
  steady_hands: { name: 'Steady hands', condition: 'Finish a mastaba or pyramid with no month in which its crews stood idle for lack of material' },
  swift_pyramid: { name: 'Swift pyramid', condition: `Finish the great pyramid before year ${score4FeatCheck('swift_pyramid').day / (score4MonthDays * score4YearMonths) + 1} begins` },
});
Object.assign(DAILY_TEXT, {
  course1: 'Lay a course on any monument', quarry1: 'Build a quarry',
  stone100: `Bring ${score4Daily.find((d) => d.id === 'stone100').n} stone to a monument site`,
});
Object.assign(TIP_TEXT, {
  monuments_last: 'Monuments come last for workers: guilds, quarries and brickworks hire after every other building.',
  straight_to_site: `Quarries and brickworks send straight to a monument site within ${score4Monument.producerReach} road tiles, before any storehouse.`,
  storehouse_bridge: `A site draws from storehouses within ${score4Monument.supplyReach} road tiles: one between quarry and site bridges a long way.`,
  refuse_stone: 'Tap the storehouse your potters use and refuse stone, so its clay keeps its room.',
  pause_site: 'Pause a site on its sheet to send its crews to another site in reach.',
  one_each: "One of each kind counts for prestige, the furthest along. A second's site makes homes less pleasant; finished, nicer.",
});
// The masons (builders' guild), haulers (quarry) and brickmakers, by season, once the city has their building.
CITIZEN_REMARKS.push(
  { season: 'akhet', type: 'builders_guild', text: 'The masons say the flood months are the time to build', flood: 'past' },
  { season: 'akhet', type: 'builders_guild', text: 'The overseers check every course with a plumb line' },
  { season: 'peret', type: 'builders_guild', text: 'The masons are teaching their sons to dress a block' },
  { season: 'shemu', type: 'builders_guild', text: 'The masons sing as they haul the blocks up the ramp' },
  { season: 'akhet', type: 'quarry', text: 'The quarrymen say the stone here splits clean and true' },
  { season: 'peret', type: 'quarry', text: 'The haulers count the blocks they dragged today' },
  { season: 'shemu', type: 'quarry', text: 'The haulers wet the sand in front of the sleds to ease the way' },
  { season: 'akhet', type: 'brickworks', text: "The brickmakers stamp each brick with the city's mark" },
  { season: 'peret', type: 'brickworks', text: 'The brickmakers say the river mud makes strong bricks' },
  { season: 'shemu', type: 'brickworks', text: 'The brickmakers lay their bricks out to dry in the sun' },
);
// Captions (spec 6.3, rulings 212, 242): a course laid names the real gain in the city's prestige ("Small pyramid: course 3
// of 8 · +10 prestige", none for a second of a kind), a finished monument is a milestone caption, and the palace says its
// new style when its works end (spec 4.20). The gains are worked out by monumentCaptions (src/ui/celebrate.js).
Object.assign(SCORE4_TEXT, {
  palaceStyles: { courtyard: 'a courtyard house', columned: 'a columned hall', pylons: 'a palace of pylons and banners', gilded: 'a gilded palace', lapis: 'a palace of lapis and gold' },
  secondOfKind: 'One of each kind counts: no prestige',
});
export const score4CourseText = (type, course, of, gain) => `${buildingName(type)}: course ${course} of ${of}${gain > 0 ? ` · +${gain} prestige` : ''}`;
export const score4FinishText = (type) => `The ${score4Name(type)} is finished`;
export const score4FinishWhy = (gain, total) => (gain > 0 ? `+${gain} prestige: the city now has ${total}` : SCORE4_TEXT.secondOfKind);
export const score4PalaceText = (style) => `The palace is now ${SCORE4_TEXT.palaceStyles[score4PalaceStyles[style].id]}`;
// ── end s4 score ─────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 motion (Track E) ──────────────────────────────────────────────────────────────────────────────────────────
// Track E's words: the Motion row ("Motion: Gentle (your device asks for less motion)"), the Gentle tip and the
// processions. Add new lines just above the end marker.
export const MOTION4_TEXT = {
  motion: 'Motion',
  choices: { system: 'Follow the device', full: 'Full', gentle: 'Gentle', still: 'Still' },
  levels: { full: 'Full', gentle: 'Gentle', still: 'Still' },
  // What the row is doing (spec 5.4), from settings.js motionStatus: { level, device, asks }.
  status: ({ level, device, asks }) => {
    const name = MOTION4_TEXT.levels[level];
    if (asks) return `Motion: ${name} (your device asks for less motion)`;
    if (device) return `Motion: ${name} (your device's setting)`;
    return `Motion: ${name}`;
  },
  // What each level moves (spec 5.4's table), under the row.
  levelLines: {
    full: 'Everything moves: water drifts, trees sway, smoke rises, birds fly over and the camera glides.',
    gentle: 'People, sleds and processions walk; water and smoke fade in place. Nothing sways, drifts or pulses.',
    still: 'Only people, sleds and processions move. Everything else holds still.',
  },
};
Object.assign(TIP_TEXT, {
  gentle_motion: 'Your device asks for less motion, so the city moves gently. Settings → Motion changes it.',
});
// How to play lists every tip; a tip whose words hold only where it fires says there what is true on any device.
export const TIP_HELP_TEXT = {
  gentle_motion: 'While Settings → Motion follows the device, a device that asks for less motion moves the city gently.',
};
// ── end s4 motion ────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 cards (Track G) ───────────────────────────────────────────────────────────────────────────────────────────
// Track G's words: the picture cards (titles, words, alt text), How to play, the Music rows and the reworded opening
// goals and their whys (ruling 265). Add new lines just above the end marker.
// "About four in ten people work" (the food card) is the sim's own share (ECONOMY.workerShare, src/sim/labour.js).
const CARDS4_TENS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const cards4WorkShare = (share = ECONOMY.workerShare) => `About ${CARDS4_TENS[Math.max(0, Math.min(10, Math.round(share * 10)))]} in ten people work`;
// The last card's words: fires, raiders, sickness and thieves to guard against, but on Peaceful (raids: false, src/data/difficulty.js)
// the city never starts a raid clock and, with it (threatsOn is raidsOn, src/sim/costs.js), has no sickness or thieves either, so there
// it names fires alone. The pause sentence is the same at every level.
export const cards4Ahead = (raids = true) => `Later come fires${raids ? ', raiders, sickness and thieves' : ''} to guard against, and monuments to raise. Pause any time: nothing happens while you plan.`;
export const CARDS4_TEXT = {
  // The Settings sheet's Music rows (spec 5.5, ruling 269).
  music: 'Music', musicVolume: 'Music volume', quieter: 'Quieter music', louder: 'Louder music',
  // The picture cards (spec 4.1, rulings 261-264): How to play on the title card and at the top of the How to play sheet.
  howToPlay: 'How to play', showCards: 'Show the picture cards',
  count: (i, n) => `${i} of ${n}`, dots: 'Cards', dot: (i, n) => `Card ${i} of ${n}`,
  next: 'Next', back: 'Back', skip: 'Skip', close: 'Close', start: 'Start building',
  // Each card's title, words and picture's alt text, by its id in src/data/tutorial.js (spec 4.1's table).
  cards: {
    road: {
      title: 'Everything needs a road',
      words: 'Homes and workplaces work only when they touch a road. Lay a road first, then build beside it.',
      alt: 'A road running past homes, a well and a farm, with a ring around the road.',
    },
    homes: {
      title: 'Homes grow when served',
      words: 'Paint housing plots beside a road and people move in. A well near them, then food, lets them grow.',
      alt: 'Housing plots along a road and a well beside them, with a ring around the well.',
    },
    farm: {
      title: 'Farms need fertile land',
      words: 'Farms grow only on the fertile land by the river. Layers → Ground shows it in green.',
      alt: 'The map with the Ground layer on: the fertile land by the river shows green, a farm stands on it, and an arrow points to the Layers button.',
    },
    food: {
      title: 'Food and workers',
      words: `A farm fills a granary; a bazaar near homes sells its food. ${cards4WorkShare()}, and a building short of workers works slowly.`,
      alt: "A granary and a bazaar among the homes, and a building's sheet with a ring around its workers row.",
    },
    goals: {
      title: 'Follow the goals',
      words: 'The goal line shows what to do next. Show me opens the right card and puts it where it fits.',
      alt: 'The goals strip at the top of the screen, with a ring around its Show me button.',
    },
    gold: {
      title: 'Where gold comes from',
      words: `Homes pay taxes every month; every building costs upkeep and ${ECONOMY.wagePerWorker} gold for each worker. Build homes before luxuries.`,
      alt: 'The top bar with the gold chip showing a monthly forecast, a ring around it, above a village of homes, a well and a farm.',
    },
    ahead: {
      title: 'What lies ahead',
      words: cards4Ahead(),             // the level with raids; the dialog asks cards4Ahead(raids) for the city's own level
      alt: 'A pyramid being built, with a tower and a firehouse beyond it, and a ring around the pyramid.',
    },
  },
};
// ── end s4 cards ─────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 look (Track H) ────────────────────────────────────────────────────────────────────────────────────────────
// Track H's words: the ornaments' screen-reader text, if any (they are hidden from screen readers). Add new lines just
// above the end marker.
export const LOOK4_TEXT = {};
// ── end s4 look ──────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections: leave these lines as they are.)
//
// ── s4 balance (Track F) ─────────────────────────────────────────────────────────────────────────────────────────
// Track F's words for the integrator. Add new lines just above the end marker.
export const BALANCE4_TEXT = {};
// ── end s4 balance ───────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4 sections and Stage 4.5: leave these lines as they are.)
//
// ── s45 (Stage 4.5) ──────────────────────────────────────────────────────────────────────────────────────────────
// Stage 4.5's words. Every sentence that states a rule or a price is built from the sim's own numbers. Add new lines just
// above the end marker.
// Whole months for words: "about 4 months" (rounded up; a treasury with days left is still in its last month).
const monthsText = (monthsLeft) => Math.max(1, Math.ceil(monthsLeft));
export const S45_TEXT = {
  // The road tool's note when it crosses a wall (ruling 309): "Gate through the wall: 20 gold" (one gate), else "3 gates through the wall: 20 gold each".
  gateNote: (n, price) => (n === 1 ? `Gate through the wall: ${price} gold` : `${n} gates through the wall: ${price} gold each`),
  gateBuilt: 'Gate built',
  roadLaidGates: (n) => `Road laid · ${plural(n, 'gate', 'gates')}`,
  // Bridges (ruling 314): the bar's note "Bridge: 4 tiles, 100 gold" (the tiles of water crossed and what they cost together), the
  // refusal for a crossing past the limit, and the toast. Their numbers come from the road tool's preview (src/sim/commands.js).
  bridgeNote: (n, cost) => `Bridge: ${plural(n, 'tile', 'tiles')}, ${cost} gold`,
  tooWide: (n) => `Too wide to bridge here (${plural(n, 'tile', 'tiles')} of water)`,
  roadLaidBridge: (n) => `Road laid · bridge, ${plural(n, 'tile', 'tiles')}`,
  // The month's forecast (Task 4b, ruling 316). Every number is the sim's (src/sim/economy.js monthForecast, monthlyBill,
  // balanceWith, biggestCost), and a minus is a real minus sign. The top bar's gold chip says "+120 a month"; it adds the runway when the
  // treasury would run out within FORECAST.amberMonths. A card says what one building costs when fully staffed; the confirm bar adds the
  // balance with it. The summary's section is headed by what the balance is.
  signed: (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`,
  chipLabel: (f) => `Forecast ${f.net >= 0 ? 'plus' : 'minus'} ${Math.abs(f.net)} a month${f.runsOut ? `; ${f.gold < 0 ? 'the treasury is below 0' : `the treasury runs out in about ${plural(monthsText(f.monthsLeft), 'month', 'months')}`}` : ''}`,
  upkeepBill: (b) => `Costs ${b.bill} a month`,
  upkeepCrew: (b) => (b.workers ? ` · ${plural(b.workers, 'worker', 'workers')}` : ''),
  upkeepLine: (b) => `${S45_TEXT.upkeepBill(b)}${S45_TEXT.upkeepCrew(b)}`,
  upkeepTitle: (b) => `${b.upkeep} upkeep${b.workers ? `, and ${b.wages} in wages when all ${b.workers} workers are hired (${ECONOMY.wagePerWorker} each)` : ''}`,
  balanceLine: (net) => `Monthly balance becomes ${S45_TEXT.signed(net)}`,
  forecastHeadShort: 'Spending more than taxes bring in',
  forecastHeadOk: 'Taxes cover the spending',
  forecastNote: 'This month, as the city stands now.',
  monthlyBalance: 'Monthly balance',
  runsOutIn: (monthsLeft) => `At this rate the treasury runs out in about ${plural(monthsText(monthsLeft), 'month', 'months')}`,
  belowZero: 'The treasury is below 0',
  // The one-time warning tip (its Show me points at the building that costs the most a month).
  warnTip: (f, big) => `${f.gold < 0 ? 'The treasury is below 0' : S45_TEXT.runsOutIn(f.monthsLeft)}.${big ? ` ${buildingName(big.type)} costs the most: ${big.cost} a month.` : ''}`,
  warnTipHelp: `If the treasury would go below 0 within ${FORECAST.warnMonths} months, a tip names the building that costs the most.`,
  // The mood breakdown's Jobs row while the Town penalty is phased in (ruling 325): the value beside it is the phased one.
  jobsPhasing: (full, monthsLeft) => `Jobs (phasing in: ${S45_TEXT.signed(full)} in ${plural(monthsLeft, 'month', 'months')})`,
};
Object.assign(TIP_TEXT, { treasury_low: 'The treasury is heading below 0: tap the numbers in the top bar to see what each month costs.' });
TIP_HELP_TEXT.treasury_low = S45_TEXT.warnTipHelp;
Object.assign(REASONS, { not_wall: 'A gate goes on a wall', too_wide: 'Too wide to bridge here', bridge_shape: 'A bridge runs straight across, with land at both ends' });
// ── end s45 ──────────────────────────────────────────────────────────────────────────────────────────────────────

// ── s45 threats (Task 5b-5d: disease and crime) ──────────────────────────────────────────────────────────────────────
// Every line follows src/sim/health.js (and crime.js): healthAlerts picks the alert, healthCause the reason no staffed physician
// reaches the home, HEALTH_MOOD the mood row's numbers.
import { HEALTH as healthNumbers, HEALTH_MOOD as healthMood } from '../data/health.js';
import { healthCause as healthCauseOf } from '../sim/health.js';
const minus = (n) => `${n < 0 ? '−' : ''}${Math.abs(n)}`;
const anA = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
export const HEALTH_TEXT = {
  sick: (tier) => `Sickness in ${anA(tier)}`,                                      // the illness alert's title: "Sickness in a House"
  sickMany: (n) => `Sickness in ${n} homes`,                                       // one alert per district: "Sickness in 3 homes"
  cause: {
    covered: `A staffed physician reaches it: it mends ${healthNumbers.coverFactor === 2 ? 'twice' : `${healthNumbers.coverFactor} times`} as fast and does not spread`,
    no_road: 'No road beside it for a physician to reach: lay one',
    none: 'Build a physician nearby',
    short: 'Its physician is short of workers: more homes bring more workers',
    burning: 'Its physician is burning: build another near it',
    paused: 'Its physician is paused: resume it',
  },
  mood: `Illness (${minus(healthMood.each)} per ill home, at most ${minus(healthMood.max)})`,
};
Object.assign(ALERT_TEXT, {
  illness: (alert, world, b) => ({ title: (alert.count || 1) > 1 ? HEALTH_TEXT.sickMany(alert.count) : HEALTH_TEXT.sick(b ? tierName(b.tier) : 'home'), fix: b ? HEALTH_TEXT.cause[healthCauseOf(world, b).cause] : HEALTH_TEXT.cause.none }),
});
Object.assign(MOOD_NAMES, { illness: HEALTH_TEXT.mood });
import { CRIME as crimeNumbersRow, CRIME_MOOD as crimeMoodData } from '../data/crime.js';
import { crimeCause as crimeCauseOf } from '../sim/crime.js';
export const CRIME_TEXT = {
  // The crime_risk alert: one per district, the homes in it at High risk or more that no staffed police post reaches.
  title: (n) => `${plural(n, 'home', 'homes')} ${n === 1 ? 'has' : 'have'} a high crime risk`,
  cause: {
    covered: 'A staffed police post reaches it',
    no_road: 'No road beside it for a police post to reach: lay one',
    none: 'Build a police post nearby',
    short: 'Its police post is short of workers: more homes bring more workers',
    burning: 'Its police post is burning: build another near it',
    paused: 'Its police post is paused: resume it',
  },
  mood: `Thefts (${minus(crimeMoodData.each)} each in the last ${crimeMoodData.days} days, at most ${minus(crimeMoodData.max)})`,
  // The caption after a theft (the sim's 'theft' event): the treasury, or the store the goods came from.
  caption: (e) => (e.kind === 'gold'
    ? `A thief took ${e.amount} gold from the treasury${e.near ? ` near the ${buildingName(e.near).toLowerCase()}` : ''}`
    : `A thief took ${e.amount} ${goodWord(e.good)} from the ${buildingName(e.store).toLowerCase()}`),
};
Object.assign(ALERT_TEXT, {
  crime_risk: (alert, world, b) => ({ title: CRIME_TEXT.title(alert.count || 1), fix: b ? CRIME_TEXT.cause[crimeCauseOf(world, b).cause] : CRIME_TEXT.cause.none }),
});
Object.assign(MOOD_NAMES, { thefts: CRIME_TEXT.mood });
// The Health and Crime overlays' names, legends and bands (src/data/health.js, crime.js): a band says the risk points it starts at, as
// the fire overlay's do; the top band of Health is a home at the threshold that can fall ill (and an ill one), of Crime one that can cause a theft.
import { HEALTH_BANDS as healthBandStarts } from '../data/health.js';
import { CRIME_BANDS as crimeBandStarts } from '../data/crime.js';
const healthBandNames = ['Low', 'Rising', 'High', 'Can fall ill'];
const crimeBandNames = ['Low', 'Rising', 'High', 'Can cause a theft'];
const bandWords = (name, noun, starts, k) => {
  const from = starts[k], next = starts[k + 1];
  return { label: name, words: `${name}: ${noun} risk ${next === undefined ? `${from} or more` : `${from} to ${next - 1}`}` };
};
Object.assign(OVERLAY_NAMES, { health: 'Health', crime: 'Crime' });
Object.assign(OVERLAY_LEGEND, {
  health: ['A staffed physician reaches it', 'No staffed physician reaches it'],
  crime: ['A staffed police post reaches it', 'No staffed police post reaches it'],
});
Object.assign(DANGER_UI_TEXT, {
  // The top band holds an ill home as well (its risk points went back to 0 when it fell ill), then homes at HEALTH.threshold or more.
  healthBand: (k) => (k === healthBandStarts.length - 1
    ? { label: healthBandNames[k], words: `${healthBandNames[k]}: health risk ${healthNumbers.threshold} or more (a home already ill is marked here too)` }
    : bandWords(healthBandNames[k], 'health', healthBandStarts, k)),
  crimeBand: (k) => bandWords(crimeBandNames[k], 'crime', crimeBandStarts, k),
  homesOnlyNote: 'Homes with people in them',
  // The strip of a Health or Crime overlay before its threat has begun, or on Peaceful: nothing is drawn, and the strip says why.
  // The milestone is HEALTH.startsAt or CRIME.startsAt, named as the milestones are.
  threatNotStarted: (kind, peaceful) => {
    if (peaceful) return kind === 'health' ? 'There is no sickness on Peaceful' : 'There are no thieves on Peaceful';
    const m = MILESTONES.find((x) => x.id === (kind === 'health' ? healthNumbers.startsAt : crimeNumbersRow.startsAt));
    return kind === 'health' ? `Sickness starts when your city is a ${m.name}` : `Thieves start when your city is a ${m.name}`;
  },
});
// The health and crime rows on a home's sheet and the physician's and police post's own rows (src/ui/dangerSheets.js healthRowModel,
// crimeRowModel). Each reason is healthCause's or crimeCause's, the one the alerts word; "twice as fast" is HEALTH.coverFactor.
Object.assign(DANGER_UI_TEXT, {
  healthLabel: 'Health', crimeLabel: 'Crime risk',
  healthCovered: 'covered by the physician',
  healthMending: `covered by the physician, mending ${healthNumbers.coverFactor === 2 ? 'twice' : `${healthNumbers.coverFactor} times`} as fast`,
  healthWhy: {
    none: `no physician within ${healthNumbers.reach} road tiles`, no_road: 'no road beside it for a physician to reach',
    short: 'the physician is short of workers', paused: 'the physician is paused', burning: 'the physician is burning',
  },
  crimeCovered: 'a police post reaches it',
  crimeWhy: {
    none: `no police post within ${crimeNumbersRow.reach} road tiles`, no_road: 'no road beside it for a police post to reach',
    short: 'the police post is short of workers', paused: 'the police post is paused', burning: 'the police post is burning',
  },
  riskIs: (band) => `risk ${band.toLowerCase()}`,
  illLeft: (days) => `ill, ${plural(days, 'day', 'days')} left`,
  healthFactor: { well: 'no well reaches it', crowded: (n) => `more than ${n} people a tile`, poor: 'the street around it is unpleasant' },
  crimeFactor: { tier: 'it is a low tier of home', mood: (n) => `city mood is below ${n}`, jobs: (pct) => `unemployment is above ${pct}%` },
  healthNoun: 'Sickness risk', crimeNoun: 'Crime risk',
  buildsFaster: (noun, list) => `${noun} builds faster: ${list.join('; ')}`,
  buildPhysician: 'Build a physician near it', buildPolicePost: 'Build a police post near it',
  coversHomesHealth: (n) => (n > 0 ? `Covers ${plural(n, 'home', 'homes')}` : 'No homes with people in reach yet'),
  coversHomesCrime: (n) => (n > 0 ? `Covers ${plural(n, 'home', 'homes')}` : 'No homes with people in reach yet'),
});
// The tips (How to play lists them), the firsts: every number is the data's. The sickness tip says what a staffed physician does
// (HEALTH.cut is a cut in how fast risk builds; a covered home does not pass an illness on and mends coverFactor times as fast); the
// thieves tip what drives crime (CRIME's three things) and what a police post does to it: CRIME.cut is the cut of a fully staffed post,
// scaled by its staffing (riskToday), so the tip says "up to".
Object.assign(TIP_TEXT, {
  sickness_spreads: `Sickness spreads between touching homes: a staffed physician within ${healthNumbers.reach} road tiles stops that and cures it ${healthNumbers.coverFactor === 2 ? 'twice' : `${healthNumbers.coverFactor} times`} as fast.`,
  thieves_about: `Poor, unhappy or jobless homes breed thieves: a police post within ${crimeNumbersRow.reach} road tiles cuts risk by up to ${Math.round(crimeNumbersRow.cut * 100)}%.`,
});
Object.assign(FIRST_TEXT, {
  first_physician: { head: 'First physician', why: `Staffed, it slows sickness and ends it faster up to ${healthNumbers.reach} road tiles away.` },
  first_police_post: { head: 'First police post', why: `Staffed, it cuts the risk of thefts up to ${crimeNumbersRow.reach} road tiles away.` },
});
// ── end s45 threats ──────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 map (Map track) ─────────────────────────────────────────────────────────────────────────────────────────
// The Map track's words, and only the Map track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
// Terrain-bound refusals (ruling 331, "Why not here, everywhere"): one set of words for every building bound to its ground or to water
// (farms, orchards, mines, clay pits, and the River track's wharf, lodge and nilometer), built from the rule the sim applies (src/sim/fit.js:
// BUILDINGS[type].terrain / terrainMin / water) and from the spot's own count, so every refusal reads the same way.
const MAP_GROUND = { fertile: 'fertile land', rocky: 'rocky ground', clay: 'clay' };
export const S46_MAP_TEXT = {
  ground: MAP_GROUND,
  // "Needs 2 of 4 tiles on clay (this spot has 1)": the bar's line for a spot that is refused; the card's and the legend's use the rule alone.
  needsTiles: (terrain, need, of, fit) => `Needs ${need} of ${of} tiles on ${MAP_GROUND[terrain]} (this spot has ${fit})`,
  needsTilesRule: (terrain, need, of) => `Needs ${need} of ${of} tiles on ${MAP_GROUND[terrain]}`,
  water: { touch: 'Must touch water', longSide: 'Must touch water along its long side' },
  waterMet: 'Water beside it',
  // Where clay lies, said on the clay pit's card and in the Ground legend: along the banks (src/sim/mapgen.js addClay turns bank tiles and the dry land
  // beside them to clay, so every clay tile is within MAP.shapes.clay's reach of water; tests/stage46/map/clay.test.js holds it).
  clayWhere: 'Clay ground, along the riverbanks',
  clayGuide: 'Clay pits stand on clay: the reddish ground by the river',
  showFit: 'Show me',
  showFitLabel: (what) => `Show me where ${what} fits`,
  noFit: (what) => `No room left for ${what} on this map`,
  // The ground chip in the confirm bar: the rule met ("Clay ground", or "Clay ground: 3 of 4 tiles" when only part of the footprint is on it),
  // or why not. cond is conditionsFor's ground condition; def the building's row.
  groundChip(cond, def) {
    const C = CONDITION_TEXT;
    if (cond.water && cond.reason === 'needs_water') return S46_MAP_TEXT.water[cond.water];
    if (cond.water && cond.state === 'met' && !def.terrain) return S46_MAP_TEXT.waterMet;
    if (def && def.terrain && cond.terrain) {
      if (cond.state === 'cant' && /^needs_(fertile|rocky|clay)$/.test(cond.reason)) return S46_MAP_TEXT.needsTiles(cond.terrain, Number.isInteger(cond.need) ? cond.need : cond.of, cond.of, cond.fit);
      if (cond.state === 'met' && cond.fit < cond.of) return C.terrainCount(cond.terrain, cond.fit, cond.of);
    }
    return null;
  },
  // A bad building preview's first line (the bar's reason line): the ground chip's sentence for a ground or water refusal.
  refusalLine(reason, ground, def) {
    if (!ground || !def) return null;
    if (reason === 'needs_water') return S46_MAP_TEXT.water[def.water] || reasonText(reason);
    if (/^needs_(fertile|rocky|clay)$/.test(reason)) return S46_MAP_TEXT.needsTiles(ground.terrain, Number.isInteger(ground.need) ? ground.need : ground.of, ground.of, ground.fit);
    return null;
  },
  // The card's line under the cost: where the ground lies, short (the clay pit's), else the ground's name as before.
  cardLine: (type) => (type === 'clay_pit' ? S46_MAP_TEXT.clayWhere : ''),
  cardTitle: (type) => {
    const def = BUILDINGS[type];
    if (!def || !def.terrain) return null;
    const rule = S46_MAP_TEXT.needsTilesRule(def.terrain, Number.isInteger(def.terrainMin) ? def.terrainMin : def.w * def.d, def.w * def.d);
    return type === 'clay_pit' ? `${rule}. ${S46_MAP_TEXT.clayWhere}.` : `${rule}.`;
  },
  // Bridges (ruling 350): the road card's line and title, the road tool's first line, the tip and its How to play words. cost is
  // costOf(world, 'bridge'); max is MAP.bridgeMax (src/sim/bridges.js BRIDGE_MAX).
  bridgeCard: (cost) => `Bridges over water: ${cost} gold a tile`,
  bridgeCardTitle: (cost, max) => `A road crosses water on a bridge: ${cost} gold a tile, straight across at most ${max} tiles of water, with land at both ends.`,
  bridgeBar: (cost) => `Water: a bridge, ${cost} gold a tile`,
  bridgeTip: (max) => `Roads cross water on a bridge: straight across, up to ${max} tiles of water. The road bar shows the price.`,
  bridgeHelp: (max) => `Roads cross water on a bridge: straight across, up to ${max} tiles of water. The road bar shows the price.`,
  noBridge: 'No place on this map where a bridge fits',
  // The size picker on the title card (ruling 333): one line each, from MAP_SIZES.
  sizeLabel: 'Map size',
  sizeGroup: 'Map size for new cities',
  sizeNames: { small: 'Small', normal: 'Normal', large: 'Large' },
  sizeHints: { small: 'Small: a quick city', normal: 'Normal: the usual map', large: 'Large: room for every monument' },
  sizeWords: (id, size) => `${S46_MAP_TEXT.sizeNames[id]}, ${size} by ${size} tiles`,
  // A share link or record that names a size: "Large 80 x 80".
  sizeNote: (size) => `${size} x ${size} map`,
};
// The shared tables the words above join: a generic refusal for a water rule (the bar's line knows the rule; reasonText does not), the
// card's ground line and the Ground legend's room line for the clay pit, and the bridge tip's words (ruling 350).
Object.assign(REASONS, { needs_water: 'Must touch water' });
const baseTerrainLine = CONDITION_TEXT.terrainLine;
CONDITION_TEXT.terrainLine = (type, short = false) => (short && S46_MAP_TEXT.cardLine(type)) || baseTerrainLine(type, short);
Object.assign(TIP_TEXT, { bridges: S46_MAP_TEXT.bridgeTip(MAP.bridgeMax) });
TIP_HELP_TEXT.bridges = S46_MAP_TEXT.bridgeHelp(MAP.bridgeMax);
// ── end s46 map ──

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 river (River track) ─────────────────────────────────────────────────────────────────────────────────────────
// The River track's words, and only the River track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
import { FLOOD as rvFlood, FLOOD_LEVELS as rvLevels, HUNTING as rvHunting, FISHING as rvFishing, WILDLIFE as rvWildlife, floodLevelRow as rvLevelRow } from '../data/river.js';
const rvName = (id) => capitalised(id);
const rvPct = (id) => `${Math.round(rvLevelRow(id).harvest * 100)}%`;
const rvMonths = (n) => plural(n, 'month', 'months');
const rvRegrow = rvWildlife.regrowMonths === 1 ? 'a month' : `every ${rvMonths(rvWildlife.regrowMonths)}`;   // how fast a herd regrows (ruling 460)
const rvHerdName = { gazelle: ['gazelle', 'gazelles'], ostrich: ['ostrich', 'ostriches'] };
const rvFirstMonth = rvFlood.months[0], rvLastMonth = rvFlood.months[rvFlood.months.length - 1];
export const S46_RIVER_TEXT = {
  levelName: rvName,
  pct: rvPct,
  // The levels, as the sim draws them: "Low 60%, Fair 90%, Good 110%, High 125%".
  levelsLine: rvLevels.map((l) => `${rvName(l.id)} ${rvPct(l.id)}`).join(', '),
  // Captions (a celebration of tier info) when the forecast or the water arrives (ruling 334).
  forecastCaption: (id) => `The flood will be ${rvName(id)}: farms on the floodplain grow ${rvPct(id)}`,
  riseCaption: (id) => `The Nile is rising: a ${rvName(id)} flood. Farms on the floodplain grow ${rvPct(id)}`,
  scareCaption: (name, days) => `A crocodile scares the workers at the ${name.toLowerCase()}: they are back to work in ${plural(days, 'day', 'days')}`,
  herdCaption: (kind, size) => `A herd of ${size} ${(rvHerdName[kind] || [kind, kind])[size === 1 ? 0 : 1]} wanders in from the edge of the map`,
  // The farm sheet's floodplain row (ruling 334): "Floodplain: this year's flood gives 110%".
  floodRowLabel: 'Floodplain',
  // The level holds twelve months, from the rise (ruling 360): it is "this year's" only from the rise to the year's end, the last flood's before.
  farmRow: (look) => {
    if (look.applied) return `${look.phase === 'wait' || look.phase === 'forecast' ? 'The last flood' : "This year's flood"} (${rvName(look.applied.id)}) gives ${Math.round(look.applied.harvest * 100)}%, until the next flood in month ${rvFirstMonth}`;
    return `The flood decides this farm's harvest, from ${Math.round(Math.min(...rvLevels.map((l) => l.harvest)) * 100)}% to ${Math.round(Math.max(...rvLevels.map((l) => l.harvest)) * 100)}%; the first flood comes in month ${rvFirstMonth}`;
  },
  farmOff: 'Off the floodplain: the flood does not change its harvest',
  farmRowNext: (id) => `${rvName(id)} flood coming: ${rvPct(id)} from month ${rvFirstMonth}`,
  // The Nilometer's sheet.
  nilometerLabel: 'Next flood',
  nilometerLabelNow: 'The flood now',
  nilometerLabelLast: 'Last flood',
  nilometerNote: `Reads the flood ${rvMonths(rvFlood.forecastMonths)} ahead (from month ${rvFirstMonth - rvFlood.forecastMonths})`,
  nilometerKnown: (id) => `${rvName(id)}: floodplain farms ${rvPct(id)}`,
  nilometerWaiting: (monthsLeft) => (monthsLeft > 0 ? `Known from month ${rvFirstMonth - rvFlood.forecastMonths}` : 'Known when the water rises'),
  nilometerIdle: 'It needs workers to read the river',
  nilometerNone: 'The first flood has not come yet',
  // The Nilometer's row (floodLook's phase tells which flood is meant): the level it reads is the next flood's only before the rise; once the
  // water is up it is this flood's, after it the last's, and the next one is unknown until month 4 (ruling 360).
  nilometerRow: (look, working) => {
    const next = (value) => ({ label: S46_RIVER_TEXT.nilometerLabel, value });
    if (!working) return next(S46_RIVER_TEXT.nilometerIdle);
    if (!look.on) return next(S46_RIVER_TEXT.nilometerNone);
    if (look.phase === 'forecast' && look.level) return next(S46_RIVER_TEXT.nilometerKnown(look.level.id));
    if ((look.phase === 'rising' || look.phase === 'high') && look.applied) return { label: S46_RIVER_TEXT.nilometerLabelNow, value: S46_RIVER_TEXT.nilometerKnown(look.applied.id) };
    if (look.phase === 'draining' && look.applied) return { label: S46_RIVER_TEXT.nilometerLabelLast, value: S46_RIVER_TEXT.nilometerKnown(look.applied.id) };
    return next(S46_RIVER_TEXT.nilometerWaiting(look.monthsTo === null ? 0 : look.monthsTo));
  },
  // The hunting lodge's sheet.
  herdsLabel: 'Herds in reach',
  herdsLine: (herds, animals) => `${herds} (${plural(animals, 'animal', 'animals')})`,
  // Ruling 421: what the hunters may still take this month (huntingOutlook's left: each herd's share less what it has given, the lodge's most
  // less what it has taken), what it has taken, and the rule the two come from.
  gameLabel: 'Game this month',
  gameLine: (left, taken) => `${left} more${taken ? ` (${taken} taken)` : ''}; ${rvHunting.perHerdMonth} a herd a month, at most ${rvHunting.maxMonth}`,
  // A lodge that has taken what it may this month (huntRest, src/sim/wildlife.js): the sim's reason, with its numbers.
  huntRest: (why) => (why === 'month'
    ? `The lodge has taken its ${rvHunting.maxMonth} this month; hunting resumes next month`
    : why === 'small' ? `Its herds have given this month or are down to ${rvHunting.keepAtLeast} animals: the hunters leave them to regrow, 1 ${rvRegrow}`   // ruling 460
    : `Its herds have given their ${rvHunting.perHerdMonth} this month; hunting resumes next month`),
  noHerds: `No herd within ${rvHunting.reach} tiles: the hunters have nothing to hunt. Herds graze on desert and rocky ground`,
  // Ruling 460: one animal a hunt, for gamePerAnimal game; the animals a herd gives a month (perHerdMonth / gamePerAnimal, as the sim counts them).
  huntRule: `Hunters walk up to ${rvHunting.reach} tiles. Each hunt takes 1 animal for ${rvHunting.gamePerAnimal} game, ${Math.max(1, Math.floor(rvHunting.perHerdMonth / rvHunting.gamePerAnimal))} from a herd a month, and never takes a herd below ${rvHunting.keepAtLeast}; a herd regrows 1 ${rvRegrow}`,
  // The fishing wharf's sheet.
  catchLabel: 'Catch a month',
  catchLine: (flood) => (flood ? `${rvFishing.floodPerMonth} now (the water is up)` : `${rvFishing.perMonth}, or ${rvFishing.floodPerMonth} in the flood months`),
  // Ruling 422: what the sim does (src/sim/production.js): the catch is the wharf's monthly rate times its staffing, and the flood months' factor
  // (fishFactor); no sim reads a distance, so the words name none.
  catchRule: `The boat fishes the river off the pier: ${rvFishing.perMonth} a month with a full crew, ${rvFishing.floodPerMonth} in months ${rvFirstMonth} to ${rvLastMonth}; fewer hands land fewer`,
  // Crocodiles beside a workplace (not on Peaceful).
  crocLabel: 'Crocodiles',
  crocNear: `Crocodiles bask nearby: work may pause for ${plural(rvWildlife.scareDays, 'day', 'days')}, at most once a month`,
  crocNow: `Scared by a crocodile: back to work in ${plural(rvWildlife.scareDays, 'day', 'days')}`,
  // The summary's river section.
  summaryHead: 'The river',
  floodLine: (look) => {
    const lvl = look.level ? rvName(look.level.id) : null;
    if (look.phase === 'wait') return `Next flood: month ${rvFirstMonth}, in ${rvMonths(look.monthsTo)}. Its level is not known yet; a Nilometer reads it ${rvMonths(rvFlood.forecastMonths)} ahead`;
    if (look.phase === 'forecast') return `Next flood: ${lvl}, month ${rvFirstMonth}, in ${rvMonths(look.monthsTo)}. Floodplain farms will grow ${rvPct(look.level.id)}`;
    if (look.phase === 'rising' || look.phase === 'high') return `The river is up: a ${lvl || rvName(look.applied.id)} flood. Floodplain farms grow ${Math.round(look.applied.harvest * 100)}% until the next flood`;
    if (look.phase === 'draining') return `The water is draining: a ${rvName(look.applied.id)} flood. Floodplain farms grow ${Math.round(look.applied.harvest * 100)}% until the next flood`;
    return look.applied ? `Last flood: ${rvName(look.applied.id)}. Floodplain farms grow ${Math.round(look.applied.harvest * 100)}% until the next flood, in ${rvMonths(look.monthsTo)}` : `The first flood comes in month ${rvFirstMonth}`;
  },
  // Food from the floodplain: working floodplain farms' monthly food as they stand and without the flood (floodOutlook's plain: the farms at 100%).
  outlookLine: (o, coming) => `${coming ? 'When the flood comes' : 'Now'}, ${plural(o.farms, 'floodplain farm makes', 'floodplain farms make')} about ${o.now} food a month (${o.plain} without the flood)`,   // final review: no level gives 100%, so 'a plain year' named none
  herdsLine2: (n, animals, hunted) => `Herds: ${n} (${plural(animals, 'animal', 'animals')}); ${hunted} hunted so far`,
};
// The firsts, the tips (How to play lists them) and the building plurals.
Object.assign(BUILDING_PLURALS, { hunting_lodge: 'hunting lodges', fishing_wharf: 'fishing wharves', nilometer: 'nilometers' });
Object.assign(FIRST_TEXT, {
  first_nilometer: { head: 'First Nilometer', why: `Staffed, it reads the flood ${rvMonths(rvFlood.forecastMonths)} ahead, before the water rises.` },
  first_hunting_lodge: { head: 'First hunting lodge', why: `Its hunters bring game from herds up to ${rvHunting.reach} tiles away: game is a food.` },
  first_fishing_wharf: { head: 'First fishing wharf', why: `Its boat lands ${rvFishing.perMonth} fish a month, ${rvFishing.floodPerMonth} in the flood months: fish is a food.` },
  first_flood: { head: 'First flood', why: `The Nile rose for the first time. Farms on the floodplain follow its level: ${rvLevels.map((l) => `${rvName(l.id)} ${rvPct(l.id)}`).join(', ')}.` },
  first_game: { head: 'First game', why: 'Game reached a granary. Homes count it as a second kind of food.' },
  first_fish: { head: 'First fish', why: 'Fish reached a granary. Homes count it as a second kind of food.' },
});
Object.assign(TIP_TEXT, {
  nilometer_forecast: `A staffed Nilometer reads the flood ${rvMonths(rvFlood.forecastMonths)} ahead: stock grain before a Low year.`,
  hunters_range: `Hunters walk up to ${rvHunting.reach} tiles to herds on desert and rock, 1 animal a herd a month.`,
  wharf_floods: `A wharf lands ${rvFishing.perMonth} fish a month, ${rvFishing.floodPerMonth} in the flood. Its long side must touch water; Rotate turns it.`,
  flood_rhythm: `The flood comes every year, months ${rvFirstMonth} to ${rvLastMonth}. It does no harm: floodplain farms grow more or less.`,
});
Object.assign(TIP_HELP_TEXT, {
  nilometer_forecast: `The Nilometer reads the coming flood ${rvMonths(rvFlood.forecastMonths)} ahead.`,
  hunters_range: `Hunting lodges: hunters reach herds up to ${rvHunting.reach} tiles away.`,
  wharf_floods: `Fishing wharves land ${rvFishing.perMonth} fish a month, ${rvFishing.floodPerMonth} in the flood.`,
  flood_rhythm: `The Nile floods in months ${rvFirstMonth} to ${rvLastMonth}: ${S46_RIVER_TEXT.levelsLine} for floodplain farms.`,
});
// ── end s46 river ──

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 court (Court track) ─────────────────────────────────────────────────────────────────────────────────────────
// The Court track's words, and only the Court track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
import { FAVOUR as courtFavour, REQUESTS as courtRequests, COURT as courtRules, GOOD_VALUE as courtGoodValue } from '../data/court.js';
import { DAYS_PER_MONTH as courtMonthDays, MONTHS_PER_YEAR as courtYearMonths } from '../sim/time.js';
import { favourChange as courtFavourChange } from '../sim/court.js';
import { UNIT_TYPES as courtUnitTypes } from '../data/armies.js';

// Numbers and dates in the letters. Months are game months (30 days); a deadline is a game date, never a clock.
const courtSigned = (n) => (n < 0 ? `−${-n}` : `+${n}`);
const courtMonths = (n) => plural(n, 'month', 'months');
const courtDate = (day) => { const m = Math.floor(day / courtMonthDays); return `Year ${Math.floor(m / courtYearMonths) + 1}, month ${(m % courtYearMonths) + 1}`; };
const courtPct = (factor) => Math.round(Math.abs(1 - factor) * 100);
const courtDays = (days) => courtMonths(Math.round(days / courtMonthDays));

// What a request asks, in a phrase: "120 pottery", "400 gold", "3 trained units".
const courtAsk = (r) => (r.kind === 'gold' ? `${r.amount} gold` : r.kind === 'soldiers' ? `${r.amount} trained ${r.amount === 1 ? 'unit' : 'units'}` : `${r.amount} ${goodWord(r.good)}`);
const courtVerb = (r) => (r.kind === 'soldiers' ? 'Lend' : 'Send');
// A change of favour by n, as it would really happen now (ruling 376): favour stays inside 0..100, so at 95 a gain of 11 reads
// "Favour +5 (to 100)" and at 100 "Favour stays at 100". Without a world, the number as asked.
const courtFavourWords = (n, world) => {
  const real = world ? courtFavourChange(world, n) : n;
  if (real === n) return `Favour ${courtSigned(n)}`;
  const edge = n > 0 ? courtFavour.max : courtFavour.min;
  return real === 0 ? `Favour stays at ${edge}` : `Favour ${courtSigned(real)} (to ${edge})`;
};

// One effect of a card's choice as a sentence (src/sim/court.js cardChoices writes the list; this words it, and applyEffects carries it
// out). `world` names the buildings a pause closes.
export function courtEffect(e, world) {
  switch (e.kind) {
    case 'favour': return courtFavourWords(e.n, world);
    case 'gold': return e.n < 0 ? `${-e.n} gold leave the treasury` : `${e.n} gold join the treasury`;
    case 'goods': return e.n < 0 ? `${-e.n} ${goodWord(e.good)} leave the stores` : `${e.n} ${goodWord(e.good)} arrive in the stores`;
    case 'mood': return `Mood +${e.n} for ${courtDays(e.days)}, and the temple holds no festival for ${courtDays(e.every)}`;
    case 'pause': {
      if (e.ids.length === 1 && world.buildings[e.ids[0]]) return `The ${buildingName(world.buildings[e.ids[0]].type).toLowerCase()} stops work for ${courtDays(e.days)}`;
      return `${plural(e.ids.length, 'workplace', 'workplaces')} in the district close for ${courtDays(e.days)}: their workers stay home`;
    }
    case 'faster': return `The ${plural(e.ids.length, 'sick home', 'sick homes')} recover ${e.factor === 2 ? 'twice' : `${e.factor} times`} as fast`;
    case 'cure': return `The ${plural(e.ids.length, 'sick home', 'sick homes')} recover at once`;
    case 'people': return `${plural(e.n, 'person settles', 'people settle')} in homes with room`;
    case 'wages': return `Wages rise: ${e.perMonth} gold a month for ${courtMonths(e.months)} (${e.perMonth * e.months} in all)`;
    case 'herd': return e.how === 'arrive' ? 'A herd settles near the edge of the map' : "The nearest herd is sent to the capital's hunting grounds";
    case 'forecast': return "The priests tell you this year's flood level";
    default: return '';
  }
}
// A choice's whole consequence, before the tap: its effects in order, or "Nothing changes".
export const courtConsequence = (effects, world) => (effects.length ? `${effects.map((e) => courtEffect(e, world)).join('. ')}.` : 'Nothing changes.');

// Why a choice is off, in one line from the sim's own reasons (effectProblem, requestStatus): `e` is the effect that cannot happen, or
// for a request the status ({ have, need }).
export function courtProblem(problem, e, world, stock = 0) {
  const need = e ? (e.need !== undefined ? e.need : Math.abs(e.n || 0)) : 0;
  switch (problem) {
    case 'no_gold': return e ? `Needs ${need} gold, and the treasury holds ${Math.max(0, world.gold)}` : 'Not enough gold';
    case 'short': return e && e.good ? `Needs ${need} ${goodWord(e.good)}, and the stores hold ${stock}` : 'The stores do not hold enough';
    case 'no_room': return e && e.kind === 'people' ? 'No home has room for them' : 'There is no room in the stores';
    case 'too_soon': return 'A festival was held less than a year ago';
    case 'none': return 'Nothing is left in the district to close';
    case 'unavailable': return 'This cannot happen right now';
    case 'raid': return 'Units cannot leave while a raid is under way';
    case 'not_enough': return `${plural(e.have, 'trained unit is', 'trained units are')} at home, and this needs ${e.need}`;
    default: return '';
  }
}

// " (room for 25)" when a card's choice can take fewer than it drew (v.room, from the choice's own effect), else ''.
const courtRoom = (drawn, v, where = 'stores') => (v && Number.isFinite(v.room) && v.room < drawn ? ` The ${where} have room for ${v.room}.` : '');
// What units away come back to, by kind ("barracks", "archery range"): the building that trained them.
const courtHomeOf = (kind) => buildingName((courtUnitTypes[kind] || courtUnitTypes.soldier).building).toLowerCase();

// The eight cards' words: title, a body from what the card drew (its args) and a view (what the interface read off the city: sick homes,
// the workshop's name, the room a capped choice has), and each choice's button.
const COURT_CARD_WORDS = {
  sickness: { title: 'Sickness in a district', body: (a, v) => `${plural(v.sick, 'home is', 'homes are')} ill in one district. Sickness spreads between touching homes.`, choices: { quarantine: 'Quarantine the district', physicians: 'Pay the physicians' } },
  festival: { title: 'A festival for the capital', body: () => "The capital's priests ask Thebes to hold a festival.", choices: { hold: 'Hold the festival', decline: 'Decline' } },
  // v.room (ruling 444): what the choice can really take now (cardChoices caps the drawn number at the room in the stores or homes), said
  // whenever it is less than the number drawn.
  caravan: { title: 'A merchant caravan', body: (a, v) => `Traders offer ${a.units} ${goodWord(a.good)} at ${a.price} gold each. The usual price is ${courtGoodValue[a.good] || 3}.${courtRoom(a.units, v)}`, choices: { buy: 'Buy the goods', pass: 'Pass' } },
  deserters: { title: 'Deserters at the gate', body: (a, v) => `${a.n} soldiers who left the capital's army ask to settle in Thebes.${courtRoom(a.n, v, 'homes')}`, choices: { settle: 'Let them settle', drive_off: 'Drive them off' } },
  temple_gift: { title: 'An offering for the temple', body: (a) => `The priests ask for ${a.n} ${goodWord(a.good)} for the temple's feast.`, choices: { donate: 'Donate the goods', keep: 'Keep them' } },
  lost_herd: { title: 'A lost herd', body: () => 'A herd of wild animals has wandered close to your land.', choices: { welcome: 'Welcome the herd', send_away: 'Send a herd to the capital' } },
  craftsmen_dispute: { title: "Craftsmen's dispute", body: (a, v) => `The craftsmen at the ${v.shop} want better pay.`, choices: { raise_wages: 'Raise their wages', let_it_stand: 'Let the dispute run' } },
  flood_omen: { title: 'An omen on the river', body: () => "The priests have read the river's omens and can tell you how high this year's flood will be.", choices: { pay_priests: 'Pay the priests', pass: 'Pass' } },
};

// The low-favour rule from the favour numbers (ruling 384): the raid step as a percentage of the size, at least one raider more (favourRaidSize).
const courtLowEffect = (f) => `raids one size step bigger (${Math.round(f.raidStep * 100)}% more, at least 1 raider), and tribute costs ${courtPct(f.tributeLow)}% more`;
export const courtRuleLow = (f) => `At ${f.low} or less: ${courtLowEffect(f)}`;

export const S46_COURT_TEXT = {
  letterHead: 'A letter from the court', courtHead: 'The court', favour: 'Favour', favourOf: (n) => `${n} of ${courtFavour.max}`,
  // The favour's mark: an icon beside the number, and always the words (never colour alone).
  favourMark: { high: '▲', steady: '◆', low: '▼' },
  band: { high: 'The court is pleased', steady: 'The court is content', low: 'The court is displeased' },
  // The court sheet says what favour does now (bandNow), how it moves (drift), and the rules of the other bands (ruleHigh, ruleLow): the
  // band in effect is never stated twice.
  bandNow: {
    high: `Now: tribute costs ${courtPct(courtFavour.tributeHigh)}% less, and the court sends gifts`,
    steady: 'Now: no gifts, and raids and tribute as usual',
    low: `Now: ${courtLowEffect(courtFavour)}`,
  },
  // On Peaceful (raidsOn false, src/sim/costs.js) there are no raids and no tribute, so favour's raid-size and tribute effects are never
  // stated there: only what applies, the gifts. `raids` is the sim's own raidsOn(world).
  bandNowOf: (band, raids = true) => (raids ? S46_COURT_TEXT.bandNow[band] : band === 'high' ? 'Now: the court sends gifts' : 'Now: no gifts'),
  ruleHighOf: (raids = true) => (raids ? S46_COURT_TEXT.ruleHigh : `At ${courtFavour.high} or more: the court sends a gift, at most one every ${courtMonths(courtFavour.giftEveryMonths)}`),
  ruleLowOf: (raids = true) => (raids ? S46_COURT_TEXT.ruleLow : ''),
  peacefulNote: 'There are no raids or tribute on Peaceful, so favour only brings gifts.',
  drift: `Favour moves ${courtFavour.drift} a month toward ${courtFavour.start}`,
  ruleHigh: `At ${courtFavour.high} or more: tribute costs ${courtPct(courtFavour.tributeHigh)}% less, and the court sends a gift, at most one every ${courtMonths(courtFavour.giftEveryMonths)}`,
  ruleLow: courtRuleLow(courtFavour),
  // The gift clock (src/sim/court.js courtMonth, ruling 375): once started it runs on, and the gift comes at the first month's end on or
  // after its day with favour at FAVOUR.high or more.
  nextGift: (months) => `Next gift due in ${courtMonths(months)}: it comes at the first month's end from then with favour at ${courtFavour.high} or more`,
  giftWaiting: `A gift is due: it comes at the first month's end with favour at ${courtFavour.high} or more`,
  // Letters.
  ask: courtAsk, requestTitle: (r) => `${courtVerb(r)} ${courtAsk(r)}`, sendLabel: (r) => `${courtVerb(r)} ${courtAsk(r)}`,
  refuseLabel: (r, world) => {
    const real = world ? courtFavourChange(world, -r.missed) : -r.missed;
    return real === 0 ? `Refuse (favour stays at ${courtFavour.min})` : `Refuse (favour ${courtSigned(real)})`;
  },
  later: 'Decide later',
  asked: 'Asked', deadline: 'Deadline', reward: 'Reward', ifRefused: 'If refused or missed', have: 'You have',
  deadlineText: (r, left) => `${courtDate(r.due)} (${courtMonths(left)} left)`,
  rewardText: (r, world) => (r.gold > 0 ? `${courtFavourWords(r.met, world)} and ${r.gold} gold` : courtFavourWords(r.met, world)),
  refusedText: (r, world) => courtFavourWords(-r.missed, world),
  haveText: (r, st) => (r.kind === 'gold' ? `${st.have} gold in the treasury` : r.kind === 'soldiers' ? `${plural(st.have, 'trained unit', 'trained units')} at home` : `${st.have} ${goodWord(r.good)} in the stores`),
  soldiersNote: `They are away for ${courtRequests.soldiersMonths} months, unpaid, and do not fight.`,
  guidedNote: 'The first letter from the court is a small request, and an easy one to answer.',
  sendConsequence: (r, world) => {
    const out = r.kind === 'gold' ? [{ kind: 'gold', n: -r.amount }] : r.kind === 'soldiers' ? [] : [{ kind: 'goods', good: r.good, n: -r.amount }];
    const lines = out.map((e) => courtEffect(e, world));
    if (r.kind === 'soldiers') lines.push(`${courtAsk(r)} leave for ${courtMonths(courtRequests.soldiersMonths)}`);
    // A raid already warned comes while they are away (they are gone far longer than a warning's days): say so (ruling 443).
    const warned = world && world.raid && world.raid.warning;
    if (r.kind === 'soldiers' && warned) lines.push(`A raid arrives in ${plural(Math.max(0, warned.arrives - world.day), 'day', 'days')}: these units will not fight it`);
    lines.push(courtFavourWords(r.met, world));
    if (r.gold > 0) lines.push(`${r.gold} gold join the treasury`);
    return `${lines.join('. ')}.`;
  },
  refuseConsequence: (r, world) => `${courtFavourWords(-r.missed, world)}. The request is closed.`,
  problem: courtProblem, effect: courtEffect, consequence: courtConsequence,
  // Cards.
  cardTitle: (card) => COURT_CARD_WORDS[card].title,
  cardBody: (letter, view) => COURT_CARD_WORDS[letter.card].body(letter.args || {}, view || {}),
  choiceLabel: (card, choice) => COURT_CARD_WORDS[card].choices[choice],
  noLetters: 'No letters wait for you.', waiting: 'Waiting for you', pastLetters: 'Past letters', noPast: 'No past letters yet.',
  openRequest: 'Open request', noRequest: 'No request is open.',
  // A group whose building is gone (unitsAway's gone, ruling 443) leaves service on its return day (armyDay), and the line says so.
  awayHead: 'Away at the capital',
  awayLine: (a) => (a.gone
    ? `${plural(a.n, 'trained unit', 'trained units')} due back in ${courtDate(a.back)} will leave service: their ${courtHomeOf(a.kind)} is gone`
    : `${plural(a.n, 'trained unit', 'trained units')} back in ${courtDate(a.back)}`),
  captionUnitsLost: (e) => {
    const kinds = Object.keys(e.lost);
    const n = kinds.reduce((s, k) => s + e.lost[k], 0);
    const homes = [...new Set(kinds.map(courtHomeOf))].join(' and ');
    return `${plural(n, 'trained unit', 'trained units')} back from the capital left service: their ${homes} ${homes.includes(' and ') ? 'are' : 'is'} gone`;
  },
  // The demolish question for a building units away come back to (sheets.js asks it through monumentSheet.js demolishQuestion).
  demolishAway: (type, n) => `Tear down the ${buildingName(type).toLowerCase()}? ${plural(n, 'trained unit', 'trained units')} away at the capital come back to it: with it gone, they leave service.`,
  demolishAwayShort: (n) => `${plural(n, 'trained unit', 'trained units')} away at the capital will leave service`,
  // A raid already warned keeps the size and tribute fixed at its warning (raids.js raiseWarning), whatever favour does since (ruling 442).
  warnedRaid: (w) => `The raid already warned keeps the size${w.tribute ? ` and tribute (${w.tribute} gold)` : ''} set at its warning`,
  // The answer refused because the numbers on the letter changed while it was open (answerCard's 'changed', ruling 444).
  captionChanged: 'The numbers on the letter changed: read it again before you choose',
  // A letter that closed while it was on show (ruling 447): a request past its deadline, a card the court dropped as no longer needed.
  letterClosed: (kind) => (kind === 'request' ? 'This letter is closed: its deadline passed.' : 'This letter is closed: it is no longer needed.'),
  close: 'Close',
  cadence: `The court writes a request about every ${courtRequests.gapMonths[0]} to ${courtRequests.gapMonths[1]} months.`,
  closed: () => {
    const m = MILESTONES.find((x) => x.id === courtRules.from), c = MILESTONES.find((x) => x.id === courtRules.fallback);
    return `The court writes once a city is a ${m.name} and has opened a trade route (at the latest, a ${c.name}).`;
  },
  openCourt: 'Open the court', readLetter: 'Read the letter',
  // The log of past letters, newest first on the court sheet.
  logLine: (e) => {
    if (e.kind === 'gift') return e.good ? `A gift from the court: ${e.n} ${goodWord(e.good)}` : `A gift from the court: ${e.gold} gold`;
    if (e.kind === 'card') return `${COURT_CARD_WORDS[e.card].title}: ${COURT_CARD_WORDS[e.card].choices[e.choice].toLowerCase()}`;
    const ask = courtAsk(e.request);
    if (e.result === 'met') return `Sent ${ask}: favour ${courtSigned(e.favour)}${e.gold > 0 ? `, ${e.gold} gold` : ''}`;
    return `${e.result === 'refused' ? 'Refused' : 'Missed'} ${ask}: favour ${courtSigned(e.favour)}`;
  },
  logDate: (day) => courtDate(day),
  // Captions (the info tier) for what the court did.
  captionMet: (e) => `Sent ${courtAsk(e.request)} to the court: favour ${courtSigned(e.favour)}`,
  captionRefused: (e) => `Refused the court's request: favour ${courtSigned(e.favour)}`,
  captionMissed: (e) => `The court's request for ${courtAsk(e.request)} passed its deadline: favour ${courtSigned(e.favour)}`,
  captionGift: (e) => (e.good ? `A gift from the court: ${e.n} ${goodWord(e.good)}` : `A gift from the court: ${e.gold} gold`),
  captionCard: (e) => `${COURT_CARD_WORDS[e.card].title}: ${COURT_CARD_WORDS[e.card].choices[e.choice].toLowerCase()}`,
  captionGone: (e) => `The court's letter about ${COURT_CARD_WORDS[e.card].title.toLowerCase()} is no longer needed`,
  // The alert row's words are short on purpose: a phone's row shows two lines at most, and at 150% text about 35 characters, so the ask and
  // its deadline in game months must come first. The sheet it opens is headed "A letter from the court".
  alertDue: (r, left) => `Court: due in ${courtMonths(left)}, ${courtAsk(r)}`,
  alertRequest: (r, left) => `Court: ${courtAsk(r)} in ${courtMonths(left)}`,
  alertCard: (card) => `Court: ${COURT_CARD_WORDS[card].title.toLowerCase()}`,
  alertMore: (n) => ` (+${n - 1} more)`,
};

Object.assign(T, { letter: S46_COURT_TEXT.letterHead, court: S46_COURT_TEXT.courtHead });

// The alert row's words: the title carries the deadline in game months (ruling 337), the fix says what to do. The letter is found by id.
ALERT_TEXT.court_letter = (alert, world) => {
  const C = S46_COURT_TEXT;
  const letter = world.court.letters.find((l) => l.id === alert.letter);
  if (!letter) return { title: C.letterHead, fix: '' };
  const more = alert.count > 1 ? C.alertMore(alert.count) : '';
  if (letter.kind === 'request' && world.court.request) {
    const r = world.court.request;
    const left = Math.max(0, Math.ceil((r.due - world.day) / courtMonthDays));
    return alert.due
      ? { title: C.alertDue(r, left), fix: 'Send it or refuse it: the summary opens the court' }
      : { title: C.alertRequest(r, left) + more, fix: 'Open it to send what it asks, refuse it or decide later' };
  }
  if (letter.kind !== 'card' || !COURT_CARD_WORDS[letter.card]) return { title: C.letterHead + more, fix: '' };   // a stale or unknown record
  return { title: C.alertCard(letter.card) + more, fix: 'Open it to choose: each choice says what it does' };
};

Object.assign(FIRST_TEXT, {
  // Words true on every difficulty (ruling 442): Peaceful has no raids or tribute, so favour's tribute effect is left to the court sheet.
  first_letter: { head: 'First letter from the court', why: `Sending what it asks earns favour; at ${courtFavour.high} or more, the court sends gifts.` },
});
Object.assign(ACHIEVEMENT_NAMES, { friend_of_the_court: 'Friend of the court' });
ACHIEVEMENT_TEXT.friend_of_the_court = 'Send the court what it asks 5 times';
Object.assign(TIP_TEXT, {
  court_letters: 'A letter from the court asks for goods or gold: sending it earns favour, refusing or missing it costs favour.',
});
TIP_HELP_TEXT.court_letters = `The court writes from ${MILESTONES.find((x) => x.id === courtRules.from).name}: send what it asks for favour. At ${courtFavour.high} or more, the court sends gifts.`;
// ── end s46 court ──

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 armies (Armies track) ─────────────────────────────────────────────────────────────────────────────────────────
// The Armies track's words, and only the Armies track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
// Every track's section shares this module's top-level scope, so the Armies track's own names start with "arm" (its imports too,
// renamed with "as"; imports are hoisted, so they sit here in the section). Every number is the data's: UNIT_TYPES, ENEMY_TYPES,
// ARMY and the matchup table (src/data/armies.js), and the counters are counterModel's (src/sim/armies.js).
import { UNIT_TYPES as armUnits, ARMY as armArmy, ENEMY_KINDS as armEnemyKinds, matchup as armMatchup } from '../data/armies.js';
import { counterModel as armCounterModel, unitsAtHome as armUnitsAtHome, feedTypes as armFeedTypes } from '../sim/armies.js';
import { DAYS_PER_MONTH as armMonthDays } from '../sim/time.js';
const armCap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
// The enemy kinds as a mix names them ("8 on foot, 4 archers, 2 chariots, 3 by boat"), and the units as the counters name them.
const armEnemyWords = { foot: (n) => `${n} on foot`, archer: (n) => plural(n, 'archer', 'archers'), chariot: (n) => plural(n, 'chariot', 'chariots'), boat: (n) => `${n} by boat` };
const armUnitPlural = { soldier: 'soldiers', archer: 'archers', chariot: 'chariots' };
const armUnitOne = { soldier: 'soldier', archer: 'archer', chariot: 'chariot' };
// The situations of the matchup table (src/data/armies.js SITUATIONS), as the counters say them.
const armSituationWords = {
  wall: 'on a wall or tower', melee: 'in melee', open: 'in the open', nearWall: `within ${armArmy.wallNear} tiles of a wall`, gate: 'holding a gate or breach',
};
const armFactor = (f) => (f === 0.5 ? 'half' : `${f}x`);
const armMonths = (days) => Math.max(1, Math.round(days / armMonthDays));
const armA = (noun) => `${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun}`;
const armM = (u, e, s) => armFactor(armMatchup(u, e, s));
export const S46_ARMY_TEXT = {
  enemy: armEnemyWords, unitPlural: armUnitPlural, unitOne: armUnitOne, situation: armSituationWords, factor: armFactor,
  // A raid's mix, the kinds it has in ENEMY_KINDS order: "8 on foot, 4 archers, 2 chariots" ('' for an empty mix).
  mixText: (mix) => armEnemyKinds.filter((k) => mix && mix[k] > 0).map((k) => armEnemyWords[k](mix[k])).join(', '),
  // The warning's line (ruling 341): "14 raiders from the east: 8 on foot, 4 archers, 2 chariots".
  mixLine: (size, from, mix) => `${armCap(plural(size, 'raider', 'raiders'))} from ${from}: ${S46_ARMY_TEXT.mixText(mix)}`,
  isMixedMix: (mix) => armEnemyKinds.some((k) => k !== 'foot' && mix[k] > 0),
  countersHead: 'What helps against them',
  // One line per enemy kind in the mix, from counterModel (the matchup table and the enemy's row): "4 archers: they shoot towers
  // from 4 tiles, then your units. Your chariots in the open deal 2x; soldiers holding a gate or breach 1.5x."
  counterLine(c) {
    const t = c.traits, said = [];
    if (t.shootsTowers) said.push(`they shoot towers from ${t.range} tiles, then your units`);
    if (t.lands) said.push(`they land on a river bank within ${t.landWithin} tiles of the city`);
    // Their pace, from ENEMY_TYPES speeds as raids.js moves a band (ruling 383): a kind faster than the band it rides in keeps the
    // band's pace while slower raiders are with it; a band of it alone is faster than raiders on foot.
    const go = c.kind === 'chariot' ? 'ride' : 'move';
    if (t.speed > t.pace) said.push(`they ${go} ${plural(t.speed, 'tile', 'tiles')} a day alone, but keep pace with the slower raiders beside them (${t.pace} a day)`);
    else if (t.speed > t.footSpeed) said.push(`they ${go} ${plural(t.speed, 'tile', 'tiles')} a day, faster than raiders on foot (${t.footSpeed})`);
    if (t.turnedByWalls) said.push(`a wall${t.noRocky ? ' or rocky ground' : ''} turns them back once no raider on foot is with them`);
    const helps = c.helps.map((h, j) => (j ? `${armUnitPlural[h.unit]} ${armSituationWords[h.situation]} ${armFactor(h.factor)}` : `your ${armUnitPlural[h.unit]} ${armSituationWords[h.situation]} deal ${armFactor(h.factor)}`));
    const weak = c.weak.map((h) => `${armUnitPlural[h.unit]} ${armSituationWords[h.situation]} deal ${armFactor(h.factor)}`);
    const parts = [said.length ? `${armCap(said.join('; '))}.` : '', helps.length ? `${armCap(helps.join('; '))}.` : '', weak.length ? `But ${weak.join('; ')}.` : ''].filter(Boolean);
    return `${armEnemyWords[c.kind](c.n)}: ${parts.join(' ')}`;
  },
  counters: (mix) => armCounterModel(mix).map((c) => S46_ARMY_TEXT.counterLine(c)),
  // The building sheets (src/ui/s46/armies.js), from UNIT_TYPES and the sim.
  unitsLabel: { soldier: 'Soldiers', archer: 'Archers', chariot: 'Chariots' },
  // A building's units of its cap; units away at the capital count toward the cap (trainSoldiers, ruling 381), so the sheet says them.
  ofCap: (n, cap, away = 0) => (away > 0 ? `${n} here, ${away} away, of ${cap}` : `${n} of ${cap}`),
  full: (kind, n, cap, away = 0) => `Full: ${away > 0 ? `${n} here and ${away} away, of ${cap}` : `${n} of ${cap}`} ${armUnitPlural[kind]}; it trains another when one is wounded`,
  trains: (kind) => `Trains one ${armUnitOne[kind]} every ${armUnits[kind].trainDays} days at full staff, slower when short of workers`,
  pay: (kind) => `Each ${armUnitOne[kind]} is paid ${armUnits[kind].pay} gold a month at home, in peace too`,
  patrolLine: (kind) => `Goes out to raiders within ${armUnits[kind].patrol} tiles`,
  archerDoes: `Shoots a raider up to ${armUnits.archer.range} tiles away; on a wall or tower it deals ${armM('archer', 'foot', 'wall')} to raiders on foot, ${armM('archer', 'foot', 'melee')} in melee`,
  chariotDoes: `Deals ${armM('chariot', 'foot', 'open')} in the open (no wall within ${armArmy.wallNear} tiles), ${armM('chariot', 'foot', 'nearWall')} nearer a wall; it cannot pass a gate`,
  away: (kind, n, days) => `${plural(n, armUnitOne[kind], armUnitPlural[kind])} away at the capital, back in ${plural(armMonths(days), 'month', 'months')}`,
  horses: (each, now) => `Horses eat ${each} grain a chariot a month (${now} now), from ${listText(armFeedTypes().map(pluralName))}`,
  hungry: `The horses went hungry last month: chariots fight at ${Math.round(armArmy.hungry * 100)}% until a month's end feeds them`,
  grainHeld: (n) => `Grain in store: ${n}`,
  lastRaid: (kind, n, size) => `Last raid: ${armUnitPlural[kind]} stopped ${n} of ${size}`,
};
// The horses' alert (armyAlerts): an ordinary one on the first stables.
Object.assign(ALERT_TEXT, {
  horses_hungry: (alert) => ({ title: 'Chariot horses went hungry', fix: `Keep ${alert.need} grain a month in ${armFeedTypes().map((t) => armA(buildingName(t).toLowerCase())).join(' or ')}; until then chariots fight at ${Math.round(armArmy.hungry * 100)}%` }),
});
// The firsts and the tips (How to play lists the tips).
Object.assign(FIRST_TEXT, {
  first_archery_range: { head: 'First archery range', why: `Its archers shoot raiders up to ${armUnits.archer.range} tiles away, ${armM('archer', 'foot', 'wall')} from a wall or tower.` },
  first_stables: { head: 'First stables', why: `Its chariots deal ${armM('chariot', 'foot', 'open')} in the open; their horses eat ${armUnits.chariot.grain} grain each a month.` },
});
Object.assign(TIP_TEXT, {
  archers_on_walls: `Archers climb the nearest wall or tower on their own: from there they deal ${armM('archer', 'foot', 'wall')} to raiders on foot.`,
  chariots_in_open: `Chariots deal ${armM('chariot', 'foot', 'open')} with no wall within ${armArmy.wallNear} tiles, but cannot pass walls or gates: put stables beside it.`,
  mixed_raid: 'Open the raid warning: it lists the raiders coming and what helps against each kind.',
});
// The raid under way (Stage 3's raid alert): with archers or chariots at home, its fix gives the reach of the units the city has
// (UNIT_TYPES patrol, the nearest to the farthest: "your units go out within 8 to 12 tiles"; one kind alone by name), no longer than
// the soldiers' line so the wide banner keeps its buttons beside the side panel (ruling 389a); each kind's own patrol is on its
// building's sheet. A city of soldiers only reads as before.
const armRaidAlert = ALERT_TEXT.raid;
Object.assign(ALERT_TEXT, {
  raid: (alert, world) => {
    const out = armRaidAlert(alert, world);
    const a = world.raid.active, home = armUnitsAtHome(world);
    if ((alert.phase || (a ? a.phase : 'attack')) === 'retreat' || !(home.archer > 0 || home.chariot > 0)) return out;
    const kinds = Object.keys(armUnitPlural).filter((k) => home[k] > 0);
    const reaches = kinds.map((k) => armUnits[k].patrol), lo = Math.min(...reaches), hi = Math.max(...reaches);
    const who = kinds.length === 1 ? `your ${armUnitPlural[kinds[0]]}` : 'your units';
    return { ...out, fix: `Towers hit raiders within ${raidsData.DEFENCE.towerRange} tiles; ${who} go out within ${lo === hi ? lo : `${lo} to ${hi}`} tiles` };
  },
});
// The money sheets' row for every unit's pay (soldiersPayOf: soldiers, archers and chariots at home, ruling 386).
Object.assign(T, { soldiersPay: 'Army pay' });
// ── end s46 armies ──

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 wonders (Wonders track) ─────────────────────────────────────────────────────────────────────────────────────────
// The Wonders track's words, and only the Wonders track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
import { MONUMENTS as wondMonuments, MONUMENT_KINDS as wondKinds } from '../data/monuments.js';
import { MONUMENT_STYLES as wondStyles, NEW_MONUMENT_KINDS as wondNew } from '../data/wonders.js';
import { DAYS_PER_MONTH as wondMonthDays, DAYS_PER_SECOND as wondDaysPerSecond } from '../sim/time.js';
// Real time at a game speed, as the spec's table writes it: "9 min", "37 min 30 s", "1 min 30 s".
const wondClock = (seconds) => { const m = Math.floor(seconds / 60), r = Math.round(seconds - m * 60); return m ? `${m} min${r ? ` ${r} s` : ''}` : `${r} s`; };
const wondName = (id) => (id === 'classic' ? 'Classic' : id.charAt(0).toUpperCase() + id.slice(1));
const wondMilestone = (id) => MILESTONES.find((m) => m.id === id).name;
// The kind's facts, every one from MONUMENTS: the table pattern of spec 4.16 (gold, materials, crews, game time, real times at 1x and 3x).
export function wondFacts(type) {
  const m = wondMonuments[type], months = m.crewMonths / m.crews;
  const stone = m.courses.reduce((n, c) => n + c.stone, 0), bricks = m.courses.reduce((n, c) => n + c.bricks, 0);
  const seconds = (speed) => (months * wondMonthDays) / (speed * wondDaysPerSecond);
  return { gold: m.founding, stone, bricks, crews: m.crews, months, at1x: wondClock(seconds(1)), at3x: wondClock(seconds(3)), reach: m.desirability.length, best: m.desirability[0], size: `${m.w} by ${m.d}`, milestone: wondMilestone(m.unlock.milestone) };
}
const wondMaterials = (f) => listText([f.stone ? `${ui4Gold(f.stone)} stone` : '', f.bricks ? `${ui4Gold(f.bricks)} bricks` : ''].filter(Boolean));
// What each new kind is, in a few words (flavour, not a rule), for its first's line.
const WOND_KIND_WORDS = {
  great_sphinx: 'a lion of stone with the face of the king',
  sun_temple: 'two pylons round a tall sun pillar crowned by a gold disc',
  step_pyramid: 'a pyramid of five stone steps with a small chapel on top',
};
// The table of spec 4.16 for a kind in one sentence, every figure from MONUMENTS: gold, materials, crews, game time, the real times at 1x and 3x.
const wondKindLine = (type) => {
  const f = wondFacts(type);
  return `${buildingName(type)}: ${WOND_KIND_WORDS[type]}. ${f.size} tiles, ${ui4Gold(f.gold)} gold to found, ${wondMaterials(f)}. Up to ${f.crews} crews build it in ${f.months} game months: about ${f.at1x} at 1x, ${f.at3x} at 3x.`;
};
// The tip and its How to play line, short (a tip keeps to 20 words): gold, crews, the time at 1x, and what it does for homes.
const wondTip = (type, where) => { const f = wondFacts(type); return `${buildingName(type)} ${where}: ${ui4Gold(f.gold)} gold, ${f.crews} crews, ${f.at1x} at 1x. Homes within ${f.reach} tiles get nicer.`; };
export const S46_WONDER_TEXT = {
  styleNames: Object.fromEntries(Object.keys(wondStyles).map((id) => [id, wondName(id)])),
  styleGroup: 'Style of the monument',
  styleLabel: (name, line) => `${name}: ${line}`,
  // The bar's line for the style in force: what it costs and does, from MONUMENT_STYLES (goldFactor, desirability) and the sim's price for this kind.
  // The button beside it names the style, so the line does not (the button's accessible name is styleLabel: the name and this line).
  styleLine(style, price) {
    const S = wondStyles[style], more = Math.round((S.goldFactor - 1) * 100);
    const gold = more > 0 ? `${more}% more gold in all (${Math.round(price)} to found)` : 'no extra cost';
    const nicer = S.desirability > 0 ? `, homes in reach +${S.desirability} nicer` : '';
    const look = { whitewashed: 'Plain white limestone', painted: 'Teal and ochre bands', gilded: 'Gold leaf' }[style];
    return more > 0 ? `${look}: ${gold}${nicer}` : `${look}, ${gold}${nicer}`;
  },
  // The sheet's row for a monument founded in a style (a Classic one has none).
  styleRow(style, price) {
    const S = wondStyles[style], more = Math.round((S.goldFactor - 1) * 100);
    const parts = [more > 0 ? `${more}% more gold in all` : 'no extra cost'];
    if (S.desirability > 0) parts.push(`homes in reach +${S.desirability} nicer`);
    return `Style: ${wondName(style)} (${parts.join(', ')})`;
  },
  // The styles' tip (20 words at most): the offered styles that cost something say what they cost and do, from MONUMENT_STYLES.
  styleTip: (() => {
    const dear = Object.keys(wondStyles).filter((id) => wondStyles[id].pick && (wondStyles[id].goldFactor !== 1 || wondStyles[id].desirability));
    return `Pick a style on the bar. ${dear.map((id) => `${wondName(id)} costs ${Math.round((wondStyles[id].goldFactor - 1) * 100)}% more gold in all, and homes in reach get +${wondStyles[id].desirability} nicer`).join('; ')}.`;
  })(),
  kindLine: wondKindLine,
  kindTip: (type) => wondTip(type, 'unlocked'),
  kindHelp: (type) => wondTip(type, `(${wondFacts(type).milestone})`),
  sevenWonders: (n) => `Finish ${n} different kinds of monument (there are ${wondKinds.length})`,
};
Object.assign(FIRST_TEXT, Object.fromEntries(wondNew.map((type) => [`first_${type}`, { head: `First ${buildingName(type).toLowerCase()}`, why: `${wondMonuments[type].prestige.courses + wondMonuments[type].prestige.done} prestige when finished. ${wondFacts(type).crews} crews build it in ${wondFacts(type).months} game months: ${wondFacts(type).at1x} at 1x, ${wondFacts(type).at3x} at 3x.` }])));
Object.assign(TIP_TEXT, Object.fromEntries(wondNew.map((type) => [`wonder_${type}`, S46_WONDER_TEXT.kindTip(type)])), { monument_styles: S46_WONDER_TEXT.styleTip });
TIP_HELP_TEXT.monument_styles = S46_WONDER_TEXT.styleTip;
for (const type of wondNew) TIP_HELP_TEXT[`wonder_${type}`] = S46_WONDER_TEXT.kindHelp(type);
// "Seven wonders" still asks for seven kinds, now of ten (ruling 396): the words say so.
ACHIEVEMENT_TEXT.seven_wonders = S46_WONDER_TEXT.sevenWonders(score4Achievement('seven_wonders').n);
// ── end s46 wonders ──

//
// (A stable separator between the Stage 4.6 sections: leave these lines as they are.)
//
// ── s46 ux (UX track) ─────────────────────────────────────────────────────────────────────────────────────────
// The UX track's words, and only the UX track's: its own object below, and Object.assign into the shared tables (ALERT_TEXT,
// FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, TIP_TEXT, TIP_HELP_TEXT, REASONS, T, MOOD_NAMES, OVERLAY_NAMES, ...). Every sentence that
// states a rule, a number or a consequence is built from the sim's own function or data. Add new lines just above the end marker.
export const S46_UX_TEXT = {
  // Ruling 400: the key hints on the confirm bar (shown only where there is a keyboard).
  keyEnter: 'Enter', keyEsc: 'Esc',
  // Ruling 404: the wide top bar's play, pause and speed. Each step has a picture (never colour alone), a word, and a name for assistive
  // technology that says what pressing it does; the pressed one is the state, and only it shows its word ("Paused" or the speed).
  speedGlyphs: ['❚❚', '▶', '▶▶', '▶▶▶'],
  speedGroup: 'Game speed',
  pausedWord: 'Paused',
  playingState: (speedLabel) => `Playing at ${speedLabel}`,   // ruling 419: the state while running, beside the action the button names
  speedStepLabel: (s) => (s === 0 ? 'Pause' : `Play at ${SPEED_LABELS[s]} speed`),
  // keys: whether Keyboard shortcuts is on (Space, + and - only work then: src/ui/keyboard.js); off, the title names no key (final review).
  speedStepTitle: (s, keys = true) => (s === 0 ? (keys ? 'Pause (Space)' : 'Pause') : `Play at ${SPEED_LABELS[s]} speed${keys ? ' (+ and - change it)' : ''}`),
  // Rulings 401-403: the version and What's new on the title card. The notes themselves are src/data/releases.js.
  versionLine: (version, stamp = null) => `Version ${version}${stamp ? ` · build ${stamp}` : ''}`,
  whatsNew: 'What\'s new', whatsNewTitle: 'What\'s new in Thebes', newHead: 'New', fixedHead: 'Fixed', newestTag: 'newest',
  // build: the version's short build stamp (src/data/releases.js), or null while the running build's is still being read.
  releaseHead: (version, dateText, build = null) => `Version ${version} · ${dateText}${build ? ` · build ${build}` : ''}`,
};
// ── end s46 ux ──

// ── s47 (Stage 4.7) ──────────────────────────────────────────
// Stage 4.7's words. Task 0 adds only the refusal for the hills ground (src/sim/terrain.js groundRefusal); Task 3 owns the hills'
// other words (the Ground overlay legend, How to play). Later tasks add their own lines just above the end marker.
Object.assign(REASONS, { hills: 'Hills: nothing can be built here' });
// ── end s47 ──
