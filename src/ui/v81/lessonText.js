// Version 8.1 "The vizier", Track T (rulings 1200-1219): the story's and Ipi's words. The king has named the player vizier and sent them to the village at Thebes; Ipi, the king's
// scribe, goes with them and speaks: the lesson's chapters and steps, the reaction after each step, the line for a dimmed control, the hand-over, the rank-ups and the
// Advice sheet ("Ipi suggests"). Every line Ipi says is at most two short sentences (tests/v81/t/words.test.js), and every number in it is the sim's own.
import { BUILDINGS } from '../../data/buildings.js';
import { MILESTONES } from '../../data/progression.js';
import { LARGE_PLOT } from '../../data/largePlots.js';
import { LESSON_STEPS, LESSON_CHAPTERS } from '../../data/lesson.js';
import { GREAT_WORK } from '../../data/reign.js';
import { plural, buildingName, DANGER_UI_TEXT } from '../text.js';

const stepOf = (id) => LESSON_STEPS.find((s) => s.id === id);
const time = (days) => DANGER_UI_TEXT.duration(Math.max(0, days));
const site = (type) => buildingName(type).toLowerCase();
const LAST_RANK = () => MILESTONES[MILESTONES.length - 1];

export const SCRIBE_NAME = 'Ipi';

export const V81T_TEXT = {
  scribe: SCRIBE_NAME,
  scribeSays: (line) => `${SCRIBE_NAME}: ${line}`,   // a screen reader hears who speaks
  // The chapter card's head and the docked bubble's label: "Chapter 2 of 7 · Homes".
  chapterLabel: (i, n, name) => `Chapter ${i} of ${n} · ${name}`,
  stepLabel: (name, k, of) => (of > 1 ? `${name} · ${k} of ${of}` : name),
  // Each chapter: its name, and the why Ipi opens it with on its card (the step's own do line follows it there).
  chapters: {
    roads: { name: 'Roads', why: 'Every building needs a road: it is how people and goods move.' },
    homes: { name: 'Homes', why: 'Families settle in homes that stand on a road.' },
    water: { name: 'Water', why: 'A home with water near it fills with a family and grows.' },
    food: { name: 'Food', why: 'The green land floods each year, and farms there feed the city.' },
    work: { name: 'Work and trade', why: 'Buildings need workers from the homes, and homes pay taxes.' },
    fire: { name: 'Fire', why: 'A growing town catches fire; a firehouse keeps it safe.' },
    defence: { name: 'Defence', why: 'A rich city draws raiders, and towers stop them.' },
  },
  // Each step: Ipi's why and the do line, (f) => { why, do }; f is src/ui/lesson.js lessonFacts. Two short sentences together.
  steps: {
    road: () => ({ why: 'A road joins your village to the green land.', do: `Lay ${stepOf('road').check.n} tiles of road west from the gate.` }),
    homes: () => ({ why: 'Plots off the road stay empty.', do: `Place ${stepOf('homes').check.n} housing plots beside the road.` }),
    largeplot: () => ({ why: 'A Large plot grows into a grander house than a small one.', do: `Place one, ${LARGE_PLOT.size} by ${LARGE_PLOT.size}, beside the road.` }),
    well: () => ({ why: `A well waters the homes within ${BUILDINGS.well.reach} road tiles.`, do: `Build a well that reaches ${stepOf('well').check.homes} homes.` }),
    families: (f) => ({ why: 'Time passes only while the game plays.', do: f.paused ? `Press Play, and wait for ${stepOf('families').check.n} people.` : `Wait for ${stepOf('families').check.n} people to move in.` }),
    farm: () => ({ why: 'Farms grow only on the green land by the river.', do: 'Build a farm there, touching the road.' }),
    granary: () => ({ why: "A granary keeps the farm's grain.", do: 'Build a granary beside the road.' }),
    bazaar: () => ({ why: `A bazaar sells food to homes within ${BUILDINGS.bazaar.reach} road tiles.`, do: `Build one that reaches ${stepOf('bazaar').check.homes} homes.` }),
    workers: (f) => ({ why: `Buildings want ${f.labour.jobs} workers; ${f.labour.workforce} can work.`, do: 'Place more homes until all three work.' }),
    month: (f) => ({ why: 'Homes pay taxes each month, and buildings cost upkeep.', do: `${f.paused ? 'Press Play and let' : 'Let'} ${stepOf('month').check.n} months pass, and watch your gold.` }),
    firehouse: (f) => (f.missing ? { why: `The ${site(f.missing)} is gone.`, do: 'Build it again first.' }
      : { why: `A firehouse with a crew guards ${BUILDINGS.firehouse.reach} road tiles around it.`, do: 'Build a firehouse near the bazaar.' }),
    fire: (f) => (f.missing ? { why: `The ${site(f.missing)} is gone.`, do: 'Build it again first.' }
      : { why: 'I lit a small fire in the bazaar, for practice.', do: f.crew === false ? `${f.paused ? 'Press Play: it' : 'It'} goes out by itself this time.` : `${f.paused ? 'Press Play and watch' : 'Watch'} the crew put it out.` }),
    tower: (f) => (f.warning
      ? { why: `${f.warning.size} raiders come from the ${f.warning.dir} in ${time(f.warning.daysLeft)}.`, do: `Build ${f.warning.need - f.warning.have > 1 ? `${f.warning.need - f.warning.have} towers` : 'a tower'} near the bazaar.` }
      : { why: 'Raiders are coming; I opened the tower card early.', do: f.paused ? 'Press Play to hear the warning.' : 'Wait for the warning.' }),
    raid: (f) => (f.raidOn
      ? { why: `${plural(f.raidOn.left, 'raider is', 'raiders are')} on the map.`, do: f.towers > 0 ? `Watch your ${f.towers > 1 ? 'towers' : 'tower'} stop them.` : 'Watch what they do.' }
      : { why: 'The raiders are on their way.', do: f.paused ? 'Press Play and watch them come.' : f.warning ? `They arrive in ${time(f.warning.daysLeft)}.` : 'Watch them come.' }),
  },
  // The reaction after a step, naming what was done (r: src/ui/v60/lesson.js beatFacts, the sim's own counts). One sentence.
  beats: {
    road: (r) => `The road reaches the green land: ${r.roads} new tiles.`,
    homes: (r) => `${plural(r.homes, 'plot stands', 'plots stand')} on the road, ready for families.`,
    largeplot: () => 'The Large plot is marked out beside the road.',
    well: (r) => `The well waters ${plural(r.well, 'home', 'homes')}.`,
    families: (r) => `${plural(r.people, 'person lives', 'people live')} in Thebes now.`,
    farm: () => 'The farm is sown on the green land.',
    granary: () => 'The granary is ready for the harvest.',
    bazaar: (r) => `The bazaar reaches ${plural(r.bazaar, 'home', 'homes')}.`,
    workers: () => 'The farm, the granary and the bazaar all have workers.',
    month: (r) => `${r.months} months have passed, and you have ${r.gold} gold.`,
    firehouse: () => 'The firehouse crew has taken its post.',
    fire: (r) => (r.burned ? 'The fire is over.' : 'The fire is out.'),
    tower: (r) => `${r.towers > 1 ? 'Your towers stand' : 'Your tower stands'} ready.`,
    raid: (r) => (r.won ? 'The raiders turned back: Thebes is safe.' : 'The raiders got through; more towers would stop them.'),
  },
  // A tap on a dimmed control (design 7b: "First the road; the rest comes soon.").
  refused: (chapter) => `First the ${V81T_TEXT.refusedNoun[chapter] || 'lesson'}; the rest comes soon.`,
  refusedNoun: { roads: 'road', homes: 'homes', water: 'water', food: 'food', work: 'workers', fire: 'firehouse', defence: 'towers' },
  // The hand-over: the lesson's city becomes the player's own (ruling 1208).
  handover: 'From here, Thebes is yours. I will keep an eye out.',
  handoverGoal: (goal) => `From here, Thebes is yours. Your first goal: ${goal}`,
  // The end when the lesson cannot hand its city over: a saved city is in the slot, which the lesson's city must not take the place of (ruling 1209).
  replayEnd: 'Well done, vizier. Your own city waits on the title screen.',
  // Rank-ups (design 2): one line from Ipi.
  rankUp: (name) => (name === LAST_RANK().name
    ? `The king names Thebes the ${name}. Now crown your service with the ${site(GREAT_WORK.type)}.`
    : `The king has heard of Thebes: it is a ${name.toLowerCase()} now.`),
  // The Advice sheet's head and lead, in Ipi's voice (its ranking is the Advice engine's own).
  adviceHead: `${SCRIBE_NAME} suggests`,
  adviceLead: 'What I would see to first, the most pressing at the top.',
  // The first-time tips are Ipi's too: the row carries Ipi's portrait and name.
  tipVoice: `${SCRIBE_NAME}, the king's scribe`,
};


// Every chapter has its words (tests hold it).
export const CHAPTER_IDS = LESSON_CHAPTERS.map((c) => c.id);
