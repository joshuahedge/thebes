// Version 5.0 (Task 1): the words of the City advice sheet. Every sentence is built from one cityAdvice item (src/sim/advice.js) and the
// sim's own words for the same thing (the house sheet's causes, the danger and raid words, the forecast's), so a number said here is the sim's
// number: how many homes, how many months, how much the fix costs and whether the treasury can pay it. A fix is only ever named once it is
// unlocked (the item's fix is null otherwise, and the words say which milestone brings it).
import { MILESTONES } from '../data/progression.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings } from '../sim/world.js';
import { goodMakers, moreOf, inputHolder, herdNear, unmadeFix } from '../sim/advice.js';
import { goodStoresFor } from '../sim/housing.js';
import { GROUND, STEP_TEXT } from './nextStepText.js';
import { costOf } from '../sim/costs.js';
import { canAfford } from '../sim/money.js';
import {
  NEED_NAMES, LARGE_TEXT, OPEN_TEXT, buildingName, goodName, plural, causeText, alertText, tierName, listText,
  S45_TEXT, S47_PRESSURE_TEXT, FIRE_TEXT, HEALTH_TEXT, CRIME_TEXT, RAID_TEXT, V60_ADVICE_WORDS, V70_ADVICE_WORDS, V60_REIGN_TEXT,
} from './text.js';

const homesText = (n) => plural(n, 'home', 'homes');
// A group's cause says "it" for the home ("No road beside it"); for several homes it says "them".
const forMany = (s, n) => (n > 1 ? s.replace(/\bit\b/g, 'them') : s);
const goodWord = (good) => goodName(good).toLowerCase();
const monthWord = (m) => `${m} ${m === 1 ? 'month' : 'months'}`;
const milestoneName = (id) => (MILESTONES.find((m) => m.id === id) || { name: 'a later milestone' }).name;
const an = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

export const ADVICE_TEXT = {
  allWell: 'All is well: nothing is holding your city back.',
  // The next milestone, in place of problems: "Next: Town, at 150 people (you have 112)". At the last one there is none.
  // Version 6.0 (review): a rank that needs a home of a tier too says so (the reign sheet's words, V60_REIGN_TEXT.nextRank), as the sim's milestoneNeedsMet asks.
  next: (milestone, people, met = true) => (milestone.needs ? V60_REIGN_TEXT.nextRank(milestone, people, met)
    : `Next: ${milestone.name}, at ${plural(milestone.population, 'person', 'people')} (you have ${people})`),
  last: (milestone) => `You have reached ${milestone.name}, the last milestone.`,
  more: (n) => `${plural(n, 'more problem is', 'more problems are')} not shown: fix these first.`,
  show: 'Show me', view: 'View',
  // The cost line: what the fix builds and its price; an unaffordable one says so in words (colour is never the only cue).
  cost: (what, gold) => `${what}: ${gold} gold`,
  costRoad: (gold) => `Road: ${gold} gold a tile`,
  costEach: (what, gold) => `${what}: ${gold} gold each`,
  short: (cost, have) => `${cost}. Not enough gold: you have ${have}`,
  locked: (item, milestone) => `${buildingName(item)} comes with ${milestoneName(milestone)}`,
  seeEmployment: 'See who works where', seeForecast: "See this month's money",
  // A Show me with no tile to show (the fix's ground or room is gone): the toast says why.
  // Task 7: "Place a statue beside the first of them: it raises its desirability from 22 to 30 (it needs 35)".
  decor: (f, n) => `Place ${an(buildingName(f.item).toLowerCase())} ${f.dist <= 1 ? 'beside' : `${f.dist} tiles from`} ${n > 1 ? 'the first of them' : 'it'}: it ${STEP_TEXT.lifts(f.from, f.to, f.needs)}`,
  noRoom: (item, reason) => `No place for ${an(buildingName(item).toLowerCase())} near there: ${reason.toLowerCase()}`,
};

// What the fix builds, "a well", or "another grain farm" when the city already has one (the running-out fix when a maker already stands).
const builds = (world, fix) => {
  const name = buildingName(fix.item).toLowerCase();
  const have = fix.item !== 'road' && fix.item !== 'house' && allBuildings(world).some((b) => b.type === fix.item);
  return have ? `another ${name}` : an(name);
};

// What the fix for a good nothing makes builds, as the words name it: the makers the city lacks, in the order they are built (a clay pit, then a
// potter), or "another potter" when every maker stands. The cost line prices exactly these (every building named is priced, none unnamed), and
// Show me starts the first. Version 5.0 review: the house sheet's cause words name every maker, so a price for one of them was a half truth.
// Version 5.0 (Task 3 review): each maker says where it goes, as the fix does: a maker bound to ground (the clay pit) on that ground, any other near the
// building the cause names (the bazaar that would sell the good), never "near it" for the home.
export function unmadeBuilds(world, good, cause = null) {
  // Version 6.0 (Track C, ruling 586): no room beside the store that holds the input, so the Estate trick: the store of its own first (both buildings named and priced), then the workshop.
  const trick = unmadeFix(world, { good });
  if (trick && trick.open) return openBuilds(world, trick.open);
  const makers = goodMakers(good);
  const missing = makers.filter((t) => !allBuildings(world).some((b) => b.type === t));
  const at = cause && cause.id !== null && cause.id !== undefined ? world.buildings[cause.id] : null;
  const [store] = at && BUILDINGS[at.type].sells ? goodStoresFor(world, at, good) : [];   // Task 7: a workshop goes by the store the bazaar draws the good from (the fix's target)
  const near = store || at;
  const place = (t) => (BUILDINGS[t].terrain ? ` on ${GROUND[BUILDINGS[t].terrain] || 'the right ground'}` : near ? ` near the ${buildingName(near.type).toLowerCase()}` : '');
  // A workshop goes by the store holding its input when one does (the fix's own place: unmadeFix), else as place says.
  const holder = (t) => (BUILDINGS[t].terrain || inputHolder(world, t) === null ? null : world.buildings[inputHolder(world, t)]);
  const where = (t) => (BUILDINGS[t].hunts && herdNear(world, world.focus) ? ` ${STEP_TEXT.herd}` : holder(t) ? ` near the ${buildingName(holder(t).type).toLowerCase()}` : place(t));
  if (missing.length) return { types: missing, words: listText(missing.map((t) => `${an(buildingName(t).toLowerCase())}${where(t)}`)) };
  // Version 5.0 (Task 7): every maker stands, so the words name the one step the chain lacks (src/sim/advice.js moreOf: a store by a stuck maker,
  // more of the input, another workshop by the store holding it), the one priced and the one Show me starts, by the building it goes beside.
  const more = moreOf(world, good);
  if (!more) return { types: [], words: '' };
  const by = more.near !== null ? world.buildings[more.near] : null;
  const name = buildingName(more.item).toLowerCase();
  const word = allBuildings(world).some((b) => b.type === more.item) ? `another ${name}` : an(name);
  return { types: [more.item], words: `${word}${BUILDINGS[more.item].terrain ? place(more.item) : by ? ` near the ${buildingName(by.type).toLowerCase()}` : place(more.item)}` };
}
// The Estate trick's buildings and words for a fix's `open` (src/sim/advice.js openWorkshop): step 'store' names and prices the store and the workshop, step 'maker' the workshop.
const openBuilds = (world, o) => (o.step === 'store'
  ? { types: [o.store, o.maker], words: OPEN_TEXT.adviceStore(o, world.buildings[o.holder] ? world.buildings[o.holder].type : o.store) }
  : { types: [o.maker], words: OPEN_TEXT.adviceMaker(o, world.buildings[o.by] ? world.buildings[o.by].type : o.store) });
// The price of a list of buildings (the sum of costOf; the placing rule's debt floor for the whole sum) and how it reads: "Clay pit and potter: 160 gold".
const priceList = (world, types) => ({ gold: types.reduce((s, t) => s + costOf(world, t), 0), what: capitalised(listText(types.map((t) => buildingName(t).toLowerCase()))) });
const capitalised = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The danger kinds' cause lines already say what to do ("No firehouse within 12 road tiles: build one near it"), so their fix line stays empty.
const DANGER = ['fire', 'illness', 'crime'];

// The advice item as one card's words: { what, why, fix, cost, short, action }.
//   what    the problem, in one sentence with its numbers
//   why     its cause, the way the house sheet or the alert words it (may be '')
//   fix     what to do ('' when the cause line says it, or when nothing can be done yet)
//   cost    the fix's price line, or '' when it builds nothing; short: true when the treasury cannot pay it
//   action  { label, aria }: the button, Show me or View, with its name for a screen reader; null when there is none
export function adviceWords(a, world) {
  const d = a.data;
  const out = { what: '', why: '', fix: '', cost: '', short: false, action: null };
  switch (a.kind) {
    case 'home_need': {
      if (d.need === 'large') {   // Version 6.0 (Track C): Townhouses with every need met and no Large plot yet: a Large plot is where a Manor grows
        out.what = LARGE_TEXT.adviceWhat(a.count);
        out.why = LARGE_TEXT.adviceWhy;
        out.fix = a.fix ? LARGE_TEXT.adviceFix : '';
        break;
      }
      const n = a.count, c = causeText(d.cause, world, d.need) || { cause: '', fix: '' };
      out.what = `${homesText(n)} ${n === 1 ? 'is' : 'are'} held back by ${NEED_NAMES[d.need].toLowerCase()}`;
      out.why = forMany(c.cause, n);
      out.fix = a.fix ? forMany(c.fix, n) : '';
      // A good nothing makes: the words name the makers the city lacks, and the cost line below prices all of them.
      if (a.fix && d.cause.code === 'good_unmade') {
        const good = d.cause.good || d.need, verb = goodMakers(good).some((t) => BUILDINGS[t].consumes) ? 'Make' : 'Grow';
        out.fix = forMany(`${verb} ${goodWord(good)}: ${unmadeBuilds(world, good, d.cause).words}`, n);
      }
      // Version 5.0 (Task 7): a low street names the decoration and its place, for the first home (the one Show me goes to).
      if (a.fix && a.fix.from !== undefined) out.fix = ADVICE_TEXT.decor(a.fix, n);
      break;
    }
    case 'stranded': {
      const n = a.count, c = S47_PRESSURE_TEXT.goodFar(d.cause, world);
      out.what = `${homesText(n)} ${n === 1 ? 'is' : 'are'} held back by ${goodWord(d.good)} kept too far away`;
      out.why = c.cause;
      out.fix = c.fix;
      break;
    }
    case 'running_out': {
      const drain = d.used - d.made, goods = d.need === 'food' ? 'food' : goodWord(d.need);
      out.what = `${d.need === 'food' ? 'Food' : goodName(d.need)} runs out in about ${monthWord(d.monthsLeft)}`;
      out.why = `The city holds ${d.held} ${goods}; ${drain} more ${drain === 1 ? 'was' : 'were'} used than made last month, and ${homesText(a.count)} need${a.count === 1 ? 's' : ''} it`;
      // A store makes nothing: when the fix is a store (the maker has nowhere to put what it makes) the words say it gives room, beside the maker it goes by.
      const by = a.fix && a.fix.near !== undefined ? world.buildings[a.fix.near] : null;
      out.fix = !a.fix ? '' : a.fix.open ? `Make ${goodWord(d.need)}: ${openBuilds(world, a.fix.open).words}`   // Version 6.0: the Estate trick (both buildings named, both priced below)
        : BUILDINGS[a.fix.item].stores
          ? `Build ${builds(world, a.fix)}${by ? ` near the ${buildingName(by.type).toLowerCase()}` : ''} so there is room to keep more`
          : `Build ${builds(world, a.fix)} to make more`;
      break;
    }
    case 'workers_short': {
      out.what = `${plural(d.short, 'job has', 'jobs have')} no worker`;
      out.why = `${plural(d.jobs, 'job', 'jobs')} for ${plural(d.workforce, 'worker', 'workers')}`;
      out.fix = alertText({ code: 'labour_shortage', level: (d.levels && d.levels[0]) || null }, world).fix;
      break;
    }
    case 'jobless': {
      out.what = `${d.jobless} of ${plural(d.workforce, 'worker', 'workers')} have no work`;
      out.why = `${plural(d.jobs, 'job', 'jobs')} for ${plural(d.workforce, 'worker', 'workers')}`;
      out.fix = alertText({ code: 'unemployment' }, world).fix;
      break;
    }
    case 'treasury': {
      out.what = d.gold < 0 ? 'The treasury is below 0' : S45_TEXT.runsOutIn(d.monthsLeft);
      out.why = `${d.gold} gold, ${S45_TEXT.signed(d.net)} a month${d.biggest ? `; ${buildingName(d.biggest.type)} costs the most: ${d.biggest.cost} a month` : ''}`;
      out.fix = alertText({ code: 'debt' }, world).fix;
      break;
    }
    case 'fire': {
      const burning = d.burning ? plural(d.burning, 'building is', 'buildings are') + ' burning' : '';
      const risk = d.atRisk ? `${d.burning ? `${d.atRisk} at` : `${plural(d.atRisk, 'building is', 'buildings are')} at`} fire risk` : '';
      out.what = d.burning && d.atRisk ? `${burning} and ${risk}` : burning || risk;
      out.why = FIRE_TEXT.cause[d.cause] || '';
      break;
    }
    case 'illness': {
      const b = a.id !== null ? world.buildings[a.id] : null;
      out.what = a.count > 1 ? HEALTH_TEXT.sickMany(a.count) : HEALTH_TEXT.sick(b ? tierName(b.tier) : 'home');
      out.why = HEALTH_TEXT.cause[d.cause] || '';
      break;
    }
    case 'crime': {
      out.what = CRIME_TEXT.title(a.count);
      out.why = CRIME_TEXT.cause[d.cause] || '';
      break;
    }
    case 'raid_towers': {
      out.what = `${d.warned ? `A raid of ${plural(d.size, 'raider', 'raiders')}` : `The next raid will be about ${plural(d.size, 'raider', 'raiders')} and`} needs ${plural(d.need, 'tower', 'towers')}; ${d.have} ${d.have === 1 ? 'is' : 'are'} working`;
      out.fix = d.warned ? RAID_TEXT.towers(world) : `Build ${plural(d.buildN, 'tower', 'towers')} (≈ ${d.buildCost} gold)`;
      break;
    }
    default: {
      // Version 6.0 (contract section 9): a new kind's words come from its track's V60_ADVICE_WORDS entry (src/ui/text.js).
      const words = V60_ADVICE_WORDS[a.kind] || V70_ADVICE_WORDS[a.kind];   // Version 7.0: its kinds' words from V70_ADVICE_WORDS
      if (words) Object.assign(out, words(a, world));
      break;
    }
  }
  // The price of the fix, and the button.
  const f = a.fix;
  if (f && f.item) {
    out.cost = f.item === 'road' ? ADVICE_TEXT.costRoad(a.cost)
      : a.kind === 'raid_towers' && d.buildN > 1 ? ADVICE_TEXT.costEach(buildingName(f.item), a.cost) : ADVICE_TEXT.cost(buildingName(f.item), a.cost);
    let afford = a.afford;
    if (a.kind === 'home_need' && d.cause.code === 'good_unmade') {          // every maker the words name, priced (the sum)
      const p = priceList(world, unmadeBuilds(world, d.cause.good || d.need).types);
      out.cost = ADVICE_TEXT.cost(p.what, p.gold);
      afford = canAfford(world, p.gold);
    } else if (a.kind === 'running_out' && f.open) {                          // Version 6.0: the Estate trick's buildings, priced together
      const p = priceList(world, openBuilds(world, f.open).types);
      out.cost = ADVICE_TEXT.cost(p.what, p.gold);
      afford = canAfford(world, p.gold);
    }
    out.short = afford === false;
    if (out.short) out.cost = ADVICE_TEXT.short(out.cost, world.gold);
    if (!out.fix && !DANGER.includes(a.kind)) out.fix = `Build ${builds(world, f)}`;
    out.action = { label: ADVICE_TEXT.show, aria: `${ADVICE_TEXT.show}: ${out.what}` };
  } else if (f && f.select !== undefined) {
    // Show me for the far store (Fetch is set up there); View for a provider that is idle, roadless or short, and for the danger services.
    const far = f.why === 'good_far';
    out.action = far ? { label: ADVICE_TEXT.show, aria: S47_PRESSURE_TEXT.showFar(d.cause, world) } : { label: ADVICE_TEXT.view, aria: `${ADVICE_TEXT.view}: ${out.what}` };
  } else if (f && f.view) {
    // Version 7.0 (Track A, wave 1 minor): only the summary's money and employment sections have a name of their own; a View for anything else (a waiting event, the Trade sheet) is named by its item.
    const section = f.section === 'forecast' ? ADVICE_TEXT.seeForecast : f.section === 'employment' ? ADVICE_TEXT.seeEmployment : out.what;
    out.action = { label: ADVICE_TEXT.view, aria: `${ADVICE_TEXT.view}: ${section}` };
  } else if (d && d.locked) {
    out.fix = ADVICE_TEXT.locked(d.locked.item, d.locked.milestone);
  }
  return out;
}
