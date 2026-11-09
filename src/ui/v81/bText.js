// Version 8.1 "The vizier", Track B (rulings 1220-1239): the words of the top bar's stats, their explainers and the City page. Every number or rule a sentence
// states comes from the sim's own function or data, passed in by src/ui/v81/stats.js or read here from the data.
import { MOOD } from '../../data/mood.js';
import { FLOOD, floodLevelRow } from '../../data/river.js';
import { levelHarvest } from '../../sim/flood.js';
import { heirLoss } from '../../sim/dynasty.js';
import { MILESTONES } from '../../data/progression.js';
import { T, S45_TEXT, SEASON_TEXT, S46_RIVER_TEXT, plural, seasonMonths, dateText } from '../text.js';

const signed = S45_TEXT.signed;
const months = (n) => plural(n, 'month', 'months');
const levelName = (l) => S46_RIVER_TEXT.levelName(l.id);
const milestoneName = (id) => (MILESTONES.find((m) => m.id === id) || { name: id }).name;
const lowHarvest = floodLevelRow('low').harvest;
const pctWhole = (factor) => `${Math.round(factor * 100)}%`;

// The mood's face (ruling 1224): the bands come from the sim's own thresholds. Below MOOD.departuresBelow people leave; from MOOD.arrivalsMin newcomers may
// come; MOOD.base is where a city starts. 'joyful' is the top band, 20 above the start.
export const MOOD_FACES = ['leaving', 'uneasy', 'content', 'joyful'];
export const moodFace = (mood) => (mood < MOOD.departuresBelow ? 'leaving' : mood < MOOD.base ? 'uneasy' : mood < MOOD.base + 20 ? 'content' : 'joyful');

export const V81_B_TEXT = {
  names: { gold: T.gold, people: T.people, mood: T.mood, date: T.date, score: 'Score' },
  statsGroup: 'City numbers',
  monthShort: ({ month }) => `M${month}`,   // a phone's date (ruling 1227)
  // The words each stat's state adds to its name, so a picture's state is never the only cue (colour and shape both have words).
  goldFalling: 'spending more than taxes bring in',
  goldRunsOut: (f) => (f.gold < 0 ? 'the treasury is below 0' : `the treasury runs out in about ${months(f.monthsLeft)}`),
  faceWords: { leaving: 'people are leaving', uneasy: 'uneasy', content: 'content', joyful: 'joyful' },
  floodNext: (n) => (n.level ? `next flood ${levelName(n.level)}` : ''),
  // The stat button's accessible name: "Gold 2493: spending more than taxes bring in. Explain".
  statName: (name, value, state) => `${name} ${value}${state ? `: ${state}` : ''}. Explain`,
  // The explainers (ruling 1225): a heading, what it is, why it moves (lines), a note, and one action.
  close: 'Close',
  closeLabel: (name) => `Close the ${name.toLowerCase()} explainer`,
  explainerLabel: (name) => `${name}: what it is and why it moves`,
  gold: {
    what: 'The treasury. Taxes come in, and wages, upkeep and army pay go out, at each month\'s end.',
    none: 'Nothing comes in or goes out yet: homes pay taxes once people live in them.',
    head: 'This month, as the city stands',
    taxes: T.taxes, wages: T.wages, upkeep: T.upkeep, soldiers: T.soldiersPay, net: S45_TEXT.monthlyBalance,   // the City page's own row names
    ok: S45_TEXT.forecastHeadOk, short: S45_TEXT.forecastHeadShort,
    runsOut: (monthsLeft) => `${S45_TEXT.runsOutIn(monthsLeft)}.`,
    below: `${S45_TEXT.belowZero}.`,
    costliest: (name, cost) => `The costliest building: ${name}, ${cost} a month`,
  },
  people: {
    what: `People in the city's homes. At mood ${MOOD.arrivalsMin} or more newcomers arrive; below ${MOOD.departuresBelow} people leave.`,
    homes: 'Homes', workforce: 'Workforce', working: T.working, jobless: T.jobless, jobs: 'Jobs in workplaces',
    workingOf: (a, b) => `${a} of ${b}`,
  },
  mood: {
    what: `How content people are, 0 to 100. Below ${MOOD.departuresBelow} they leave; at ${MOOD.arrivalsMin} or more newcomers arrive.`,
    head: 'What moves it now',
    none: 'Nothing moves it from the starting mood yet.',
    face: (face) => `Now: ${V81_B_TEXT.faceWords[face]}`,
  },
  date: {
    what: (season) => `${SEASON_TEXT.names[season]} season, months ${seasonMonths(season)}.`,
    long: dateText,
    off: `The Nile floods every year from the ${milestoneName(FLOOD.from)} on, in months ${FLOOD.months[0]} to ${FLOOD.months[FLOOD.months.length - 1]}.`,
    nextKnown: (n) => `Next flood: ${levelName(n.level)}, ${n.monthsTo > 0 ? `in ${months(n.monthsTo)}` : 'this month'}. Floodplain farms will grow ${Math.round(n.harvest * 100)}%${n.prepared ? ', prepared' : ''}.`,
    nextUnknown: (n) => `Next flood: month ${FLOOD.months[0]}, ${n.monthsTo > 0 ? `in ${months(n.monthsTo)}` : 'this month'}. Its level is not known: a staffed Nilometer shows it here all year.`,
    // Version 9.0 (fix wave, Track D): this city's figures, the Bountiful's deeper loss in both (levelHarvest is the prepared one, heirLoss the unprepared).
    nilometer: (world) => `A staffed Nilometer stands, so the farms prepare: a Low flood gives floodplain farms ${pctWhole(levelHarvest(world, floodLevelRow('low')))}, not ${pctWhole(heirLoss(world, lowHarvest))}.`,
    idle: 'The Nilometer has no workers: it reads nothing.',
  },
  score: {
    what: 'The city as it stands, from five parts of 100 each. It never changes what you can build.',
    of: (n, cap = 100) => `${n} of ${cap}`,   // Version 9.2 (Track S, ruling 1795): a part's ceiling leaves out the terms that have not started
    // What counts next, one line for each term that has not started (score.js waitingOf: from is a milestone id, { people } or null).
    waiting: (w) => {
      if (w.term === 'fire') return `Fire safety counts from ${milestoneName(w.from)}`;
      if (w.from === null) return 'Defence does not count on this level: no raids come';
      return `Defence counts once the city has ${w.from.people} people and raids can begin`;
    },
    weakest: (name, reason) => `Weakest: ${name}${reason ? `. ${reason}` : ''}`,
  },
  // The one action: the city's own advice when it has some for this stat, else the City page at its section.
  cityPage: 'City page',
  cityPageLabel: (name) => `Open the City page at ${name.toLowerCase()}`,
  showCostliest: (name) => `Show me the ${name.toLowerCase()}`,
  nilometerBuild: (cost) => `Build a Nilometer (${cost} gold) on the river bank: Show me`,
  nilometerIdleFix: 'Show me the Nilometer that needs workers',
  // The City page (ruling 1226): the tabs, and the year's trends.
  tabs: 'Messages and City',
  tabMessages: 'Messages',
  tabCity: 'City',
  trendHead: 'The last year',
  trendNote: (n) => `Sampled at each month's end: ${plural(n, 'month', 'months')} so far.`,
  trendNone: 'The trend starts at the first month\'s end.',
  trendLine: (name, from, to) => `${name}: ${from} to ${to}`,
  trendLabel: (name, from, to, n) => `${name} over the last ${months(n)}: from ${from} to ${to}`,
  signed,
};
