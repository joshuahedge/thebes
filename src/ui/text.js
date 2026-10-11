// Every string the interface shows. Plain English, sentence case, no jargon. Components import from here
// and never carry literal game text.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { FIRSTS } from '../data/firsts.js';
import { GOODS } from '../data/goods.js';
import { PARTNERS } from '../data/trade.js';
import { TRADE_KEEP_STEP, DESIRABILITY_STEPS } from '../data/ui.js';
import { ECONOMY } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';
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
  const buyers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].buys[good]).map(partnerName);
  const sellers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].sells[good]).map(partnerName);
  if (buyers.length) parts.push(`sold to ${listText(buyers)}`);
  if (sellers.length) parts.push(`bought from ${listText(sellers)}`);
  return parts.length ? `${goodName(good)}: ${parts.join('; ')}` : goodName(good);
}

// A producer's status line on its sheet: "Making pottery from clay", "Growing figs", "Digging clay", or, when a
// workshop has nothing to work, "Waiting for clay".
const MAKE_VERBS = { clay: 'Digging', gems: 'Mining' };
export function workingText(type) {
  const def = BUILDINGS[type];
  const good = goodWord(def.produces.good);
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
  bazaar_empty: { cause: 'The bazaar has no grain', fix: `Build a granary within ${BUILDINGS.bazaar.supplyReach} road tiles of it` },
  granary_empty: { cause: 'Its granary is empty', fix: 'Grain farms fill granaries' },
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

// What a service will do from the ghost's spot (early-game pass 2.6), counted by homesServedFrom.
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}`, booth: (homes) => `Entertains ${homes}` };
export function effectText(type, n) {
  if (!EFFECTS[type]) return '';
  return n > 0 ? EFFECTS[type](plural(n, 'home', 'homes')) : T.noHomesInReach;
}

export function unlockText(type) {
  const m = MILESTONES.find((ms) => ms.unlocks.includes(type));
  return m ? `Unlocks at ${m.name}` : 'Comes later';
}

export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Stage 3: the tracks' alert words, filled in their own sections below with Object.assign: code -> (alert, world, b,
// name) => { title, fix }, where b is the alert's building (or null) and name its name ('A building' without one).
export const ALERT_TEXT = {};

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  if (ALERT_TEXT[alert.code]) return ALERT_TEXT[alert.code](alert, world, b, name);
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
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
    case 'bazaar_empty': return { title: 'Bazaar has no food', fix: `Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles` };
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
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', goods: 'Goods', entertainment: 'Entertainment', desirability: 'Desirability', housing: 'Housing' };
// The corner buttons' accessible names (early-game pass 2.9); each starts with or contains the word it shows.
export const pauseSpeedText = (speed) => `${T.pause}, ${T.speed.toLowerCase()} ${SPEED_LABELS[speed]}`;
export const layersText = (kind) => (kind ? `${T.layers}: ${OVERLAY_NAMES[kind]}` : T.layers);
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'],
  goods: ['Has its goods', 'Goods missing'], entertainment: ['Has entertainment', 'No entertainment'], housing: ['Ready to grow', 'Next need missing'],
};

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
export const showMeLabel = (text) => `${T.showMe}: ${text}`;   // a goal's Show me names its goal, so several of them stay apart
export const viewLabel = (what) => `${T.view}: ${what}`;         // a View names its alert or building, so several of them stay apart

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', goods: 'Goods', grand: 'A grand city', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Harvest 100 grain',
  pottery30: 'Make 30 pottery', gardens3: 'Build 3 gardens', sell20: 'Sell 20 goods to caravans', statue1: 'Build a statue', booth1: 'Build a booth',
};
export const milestoneText = (name) => `Your city is now a ${name}`;

// Difficulty on the title card (spec 4.18): what the chosen level changes, from the data. Buildings and trade routes
// scale by the level's cost multiplier ("about": each price is rounded to whole gold); a road is only 2 gold, so its
// rounded price per tile is given as it is, on a line of its own (the title card shows the hint with white-space:
// pre-line). Fire and raids (the risk multiplier) arrive in Stage 3 and are not promised.
export function difficultyHint(level) {
  const pct = Math.round((DIFFICULTIES[level].cost - 1) * 100);
  const roads = `Roads: ${roadCostOf({ difficulty: level })} gold a tile.`;
  const rest = pct === 0 ? 'at their usual cost' : `cost about ${Math.abs(pct)}% ${pct < 0 ? 'less' : 'more'}`;
  return `Buildings and trade routes ${rest}.\n${roads}`;
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
  skipGuide: 'Skip guide', today: 'Today', swap: 'Swap', done: 'Done', doneMark: '✓',   // doneMark is decorative: its row says Done in words
  welcome: 'Welcome back', lastPlayed: 'Last played', justNow: 'just now', aWhileAgo: 'a while ago', upFrom: 'up from', downFrom: 'down from', steadyAt: 'steady at', carryOn: 'Carry on', stayPaused: 'Stay paused',
  goalsHelp: 'Goals show under the top bar. Show me opens the right card and points at the place.',
  grain: 'Grain', lasts: 'Lasts', working: 'Working', jobs: 'Jobs',
  workers: 'Workers', stock: 'Stock', problems: 'Problems', noProblems: 'No problems', reach: 'Reach', view: 'View',
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
  hasIt: 'Has it', missing: 'Missing',
  alerts: 'Alerts', noAlerts: 'All quiet', zoomIn: 'Zoom in', zoomOut: 'Zoom out', jumpTo: 'Jump to',
  newCity: 'New city', continueGame: 'Continue', exportCity: 'Export city', importCity: 'Import city', settings: 'Settings', howToPlay: 'How to play', about: 'About',
  startNewCity: 'Start new city', newCityConfirm: 'Start a new city? The current one will be lost.', notYet: 'Not available yet', comingLater: 'Coming later',
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
  helpLevel: 'Help', suggested: 'Suggested', resumeGuide: 'Resume guide',
  difficultyForNewCities: 'Difficulty for new cities', difficultyNote: 'A city keeps the level it started with. This one changes the next new city.',
  guideHelp: 'While the guide runs, the card for the next step says Suggested and a ring marks the place. Skip guide in the goals strip turns it off.',
  updateReady: 'Update ready', restart: 'Restart', updateSaveFailed: "Couldn't save, so the update will wait",
  playWithSound: 'Play with sound', playMuted: 'Play muted', install: 'Install', tagline: 'Build a city on the Nile', restoredBackup: 'Restored the previous autosave',
  installMenu: 'Install on this device', bringCity: 'Bring a city from Safari', bringCityHelp: 'If you saved a city in Safari, open the menu there and choose Export city. Then import that file here.', installWhy: 'Installed on the home screen, the game works offline and keeps your city safe.', installIosSteps: ['Tap Share (the square with an arrow)', 'Scroll down and tap Add to Home Screen', 'Tap Add'], installExportFirst: 'Export your city first: the installed app keeps its own storage. Then import the file from the home-screen app.', installNow: 'Install now', installNotOffered: 'Your browser did not offer to install. Look for Install app or Add to Home screen in its menu.', openInSafari: 'Open in Safari to keep your city', openInChrome: 'Open in Chrome to keep your city', saveNewer: 'This city was saved by a newer version of the game', saveUnreadable: "This save can't be read",
  exported: 'City file downloaded', exportFailed: "Couldn't export the city", exportFirst: 'Export first', replaceCityConfirm: 'Replace the current city with the imported one?', fileUnreadable: "Couldn't read that file",
  paused: 'Paused', resumed: 'Resumed', pausedHidden: 'Paused while you were away', placed: 'Placed', demolished: 'Demolished', roadLaid: 'Road laid', plotsPainted: 'Plots painted',
  tapStart: 'Tap where it starts', tapEnd: 'Tap where it ends', tapCorner: 'Tap the far corner', refund: 'Refund',
  shortcuts: 'Keyboard shortcuts', openSummary: 'Open the city summary', overlayOff: 'Turn the overlay off',
  rotate: 'Rotate', housingPlots: 'Housing plots',
  noWorkersNeeded: 'No workers needed', help: 'How to play',
  on: 'On', off: 'Off', version: 'Version', keyHead: 'Key', doesHead: 'Does', gestures: 'Touch',
  leaveMode: 'To leave any mode: ✕, Back, Esc or right-click.',
  shortcutsOff: 'Single-key shortcuts can be turned off in settings. Esc, Enter and Ctrl+Z always work.',
  gesturesHelp: 'One finger pans. Two fingers pan or zoom. Tap to select, or to move the ghost. Double-tap zooms in. Tap a start and an end to draw a road or paint plots.',
  aboutText: 'A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders. A personal hobby project with original, code-drawn art.',
  undoOccupiedConfirm: 'Undo this? People who moved in will leave.', undone: 'Undone',
  hoverHint: 'Hover a building or pick a card',
  play: 'Play', mapButton: 'Map', layers: 'Layers',
  noHomesInReach: 'No homes in reach yet',
  achievement: 'Achievement', dailyDone: 'Daily goal done', guideDone: "You've got the basics",
  tip: 'Tip', gotIt: 'Got it', tips: 'Tips', tipsHelp: 'Each tip shows once, under the goals. Help in Settings turns them off.', next: 'Next',
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
  press_play: 'Press Play so people can move in. Plots stay empty while the game is paused.',
  arrivals: 'Place more plots: families arrive a few times a month while there is room.',
  house_needs: 'Read what this home needs to grow, then tap Show me for the fix.',
  service_reach: 'Look at the coloured tiles: they are the homes this reaches by road.',
  problem_marker: 'Tap a building with a red ! badge to see what is wrong and how to fix it.',
  month_summary: "Tap the numbers in the top bar to see this month's taxes, wages and food.",
  more_workers: 'Place more homes: buildings need workers, and homes provide them.',
  undo_demolish: 'Press Undo to bring back what you just removed, if you change your mind.',
  goals_list: 'Open Goals to see what comes next, your progress and the gold each pays.',
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
    covered: 'A firehouse reaches it',
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
    return `Build ${plural(q.buildN, 'tower', 'towers')} facing ${RAID_TEXT.dirs[world.raid.warning.dir]} (≈ ${q.buildCost} gold)`;
  },
};
// The raid alerts (raidAlerts). raid_warning: what is coming and the defence that would beat it. raid: the band on the map
// by its phase (raid.active.phase): fighting its way in or striking, leaving after its strikes, or falling back once half
// have fallen; towers (DEFENCE.towerRange tiles of a tower) and soldiers (DEFENCE.patrol tiles of their barracks) fight it
// in every phase.
Object.assign(ALERT_TEXT, {
  raid_warning: (alert, world) => {
    const w = world.raid.warning;
    return { title: `Raiders from the ${RAID_TEXT.dirs[alert.dir]} are after your ${RAID_TEXT.targets(w ? w.target : 'building')}`, fix: RAID_TEXT.towers(world) };
  },
  raid: (alert, world) => {
    const a = world.raid.active;
    const dir = RAID_TEXT.dirs[a ? a.dir : ''] || '';
    const phase = a ? a.phase : 'attack';
    const raiders = plural(alert.left, 'raider', 'raiders');
    if (phase === 'retreat') return { title: `Raid from the ${dir}: ${raiders} falling back`, fix: 'Towers keep shooting as they go' };
    const fix = `Towers hit raiders within ${raidsData.DEFENCE.towerRange} tiles; soldiers fight within ${raidsData.DEFENCE.patrol} tiles of their barracks`;
    return { title: phase === 'leave' ? `Raid from the ${dir}: ${raiders} leaving` : `Raid from the ${dir}: ${raiders}`, fix };
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
export const ART_TEXT = {};
// ── end s3 art ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 ui (Track D) ──────────────────────────────────────────────────────────────────────────────────────────
// Track D's words for the danger interface: banners, the countdown chip, the tribute sheet, settings rows, the fire overlay and its legend. Add new lines just above the end marker.
export const DANGER_UI_TEXT = {};
// ── end s3 ui ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 score (Track E) ──────────────────────────────────────────────────────────────────────────────────────────
// Track E's words for scoring: parts, reasons, medals, splits, records, sharing, feats, remarks, and the danger goals, firsts, achievements, daily goals and tips. Add new lines just above the end marker.
export const SCORE_TEXT = {};
// ── end s3 score ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 balance (Track F) ──────────────────────────────────────────────────────────────────────────────────────────
// Track F's words for the integrator: anything balance needs words for (difficultyHint is edited in place). Add new lines just above the end marker.
export const BALANCE_TEXT = {};
// ── end s3 balance ───────────────────────────────────────────────────────────────────────────────────────────────────
