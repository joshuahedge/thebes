// Every string the interface shows. Plain English, sentence case, no jargon. Components import from here
// and never carry literal game text.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { FIRSTS } from '../data/firsts.js';
import { GOODS } from '../data/goods.js';

export const CATEGORY_NAMES = { roads: 'Roads', homes: 'Homes', food: 'Food', industry: 'Industry', services: 'Services', defence: 'Defence', monuments: 'Monuments' };

export function buildingName(type) {
  if (type === 'road') return 'Road';
  if (type === 'demolish') return 'Demolish';
  return BUILDINGS[type] ? BUILDINGS[type].name : type;
}

export const NEED_NAMES = { road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple' };

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
};

// The words for one needCause result: { cause, fix }. An idle provider reads its own building's state.
export function causeText(cause, world) {
  const t = CAUSE_TEXT[cause.code];
  if (!t.paused) return t;
  const b = world.buildings[cause.id];
  return b && b.paused ? t.paused : t.short;
}

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
export const warningText = (code) => WARNINGS[code] || "Won't work yet";

// What a service will do from the ghost's spot (early-game pass 2.6), counted by homesServedFrom.
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}` };
export function effectText(type, n) {
  if (!EFFECTS[type]) return '';
  return n > 0 ? EFFECTS[type](plural(n, 'home', 'homes')) : T.noHomesInReach;
}

export function unlockText(type) {
  const m = MILESTONES.find((ms) => ms.unlocks.includes(type));
  return m ? `Unlocks at ${m.name}` : 'Comes later';
}

export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
    case 'no_storage': return { title: `${name} has nowhere to store its grain`, fix: `Build a granary within ${b ? BUILDINGS[b.type].producerReach : 12} road tiles` };
    case 'storage_full': return { title: `${name} has no room left in storage`, fix: 'Build another granary nearby' };
    case 'understaffed': return { title: `${name} is short of workers`, fix: 'More homes bring more workers' };
    case 'bazaar_empty': return { title: 'Bazaar is empty', fix: `Build a granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles` };
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
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
// The corner buttons' accessible names (early-game pass 2.9); each starts with or contains the word it shows.
export const pauseSpeedText = (speed) => `${T.pause}, ${T.speed.toLowerCase()} ${SPEED_LABELS[speed]}`;
export const layersText = (kind) => (kind ? `${T.layers}: ${OVERLAY_NAMES[kind]}` : T.layers);
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'], housing: ['Ready to grow', 'Next need missing'],
};

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

const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples' };
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
  storehouse_choices: 'Tap a storehouse to choose its goods: a refused good goes to other storage.',
  trade_orders: 'Tap the trading post, open a route, then pick what to buy, sell and keep.',
  merging_homes: 'Keep the plots beside a Townhouse free: four in a square become a Manor.',
};

// Achievements on the summary and the Welcome back card (early-game pass 3.8, 3.9). Counts read as progressText does.
export const achievementsHeading = (done, total) => `${T.achievements}, ${done} of ${total}`;
export const closestAchievementText = (name, n, of, condition = '') => `${T.closestAchievement}: ${name}, ${progressText(n, of)}${condition ? `. ${condition}` : ''}`;   // "...: Neighbours, 7 of 10. Have 10 homes"
export const achievementBarLabel = (name, n, of) => `${name}: ${progressText(n, of)}`;   // a progress bar's accessible name
// The arrows beside a trend's words; decoration only (aria-hidden), the words say which way it went.
export const TREND_MARKS = { up: '▲', down: '▼' };
