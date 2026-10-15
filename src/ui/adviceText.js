// Version 5.0 (Task 1): the words of the City advice sheet. Every sentence is built from one cityAdvice item (src/sim/advice.js) and the
// sim's own words for the same thing (the house sheet's causes, the danger and raid words, the forecast's), so a number said here is the sim's
// number: how many homes, how many months, how much the fix costs and whether the treasury can pay it. A fix is only ever named once it is
// unlocked (the item's fix is null otherwise, and the words say which milestone brings it).
import { MILESTONES } from '../data/progression.js';
import { allBuildings } from '../sim/world.js';
import {
  NEED_NAMES, buildingName, goodName, plural, causeText, alertText, tierName,
  S45_TEXT, S47_PRESSURE_TEXT, FIRE_TEXT, HEALTH_TEXT, CRIME_TEXT, RAID_TEXT,
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
  next: (milestone, people) => `Next: ${milestone.name}, at ${plural(milestone.population, 'person', 'people')} (you have ${people})`,
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
  noRoom: (item, reason) => `No place for ${an(buildingName(item).toLowerCase())} near there: ${reason.toLowerCase()}`,
};

// What the fix builds, "a well", or "another grain farm" when the city already has one (the running-out fix when a maker already stands).
const builds = (world, fix) => {
  const name = buildingName(fix.item).toLowerCase();
  const have = fix.item !== 'road' && fix.item !== 'house' && allBuildings(world).some((b) => b.type === fix.item);
  return have ? `another ${name}` : an(name);
};

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
      const n = a.count, c = causeText(d.cause, world, d.need) || { cause: '', fix: '' };
      out.what = `${homesText(n)} ${n === 1 ? 'is' : 'are'} held back by ${NEED_NAMES[d.need].toLowerCase()}`;
      out.why = forMany(c.cause, n);
      out.fix = a.fix ? forMany(c.fix, n) : '';
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
      out.fix = a.fix ? `Build ${builds(world, a.fix)} to make more` : '';
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
    default: break;
  }
  // The price of the fix, and the button.
  const f = a.fix;
  if (f && f.item) {
    out.cost = f.item === 'road' ? ADVICE_TEXT.costRoad(a.cost)
      : a.kind === 'raid_towers' && d.buildN > 1 ? ADVICE_TEXT.costEach(buildingName(f.item), a.cost) : ADVICE_TEXT.cost(buildingName(f.item), a.cost);
    out.short = a.afford === false;
    if (out.short) out.cost = ADVICE_TEXT.short(out.cost, world.gold);
    if (!out.fix && !DANGER.includes(a.kind)) out.fix = `Build ${builds(world, f)}`;
    out.action = { label: ADVICE_TEXT.show, aria: `${ADVICE_TEXT.show}: ${out.what}` };
  } else if (f && f.select !== undefined) {
    // Show me for the far store (Fetch is set up there); View for a provider that is idle, roadless or short, and for the danger services.
    const far = f.why === 'good_far';
    out.action = far ? { label: ADVICE_TEXT.show, aria: S47_PRESSURE_TEXT.showFar(d.cause, world) } : { label: ADVICE_TEXT.view, aria: `${ADVICE_TEXT.view}: ${out.what}` };
  } else if (f && f.view) {
    out.action = { label: ADVICE_TEXT.view, aria: `${ADVICE_TEXT.view}: ${f.section === 'forecast' ? ADVICE_TEXT.seeForecast : ADVICE_TEXT.seeEmployment}` };
  } else if (d && d.locked) {
    out.fix = ADVICE_TEXT.locked(d.locked.item, d.locked.milestone);
  }
  return out;
}
