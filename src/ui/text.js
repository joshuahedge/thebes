// Every string the interface shows. Plain English, sentence case, no jargon. Components import from here
// and never carry literal game text.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';

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
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
// The corner buttons' accessible names (early-game pass 2.9); each starts with or contains the word it shows.
export const pauseSpeedText = (speed) => `${T.pause}, ${T.speed.toLowerCase()} ${SPEED_LABELS[speed]}`;
export const layersText = (kind) => (kind ? `${T.layers}: ${OVERLAY_NAMES[kind]}` : T.layers);
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'], housing: ['Ready to grow', 'Next need missing'],
};

export const dateText = ({ year, month, day }) => `Year ${year}, month ${month}, day ${day}`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const progressText = (n, of) => `${n} of ${of}`;
export const goalsProgressText = (done, total) => `${done} of ${total} done`;
export const rewardText = (n) => `+${n} gold`;
export const progressLabel = (n, of) => `Progress ${progressText(n, of)}`;
export const dailyDoneText = (n) => plural(n, 'daily goal done', 'daily goals done');
export const swapLabel = (text) => `Swap: ${text}`;
export const showMeLabel = (text) => `${T.showMe}: ${text}`;   // a goal's Show me names its goal, so several of them stay apart

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Store 100 grain',
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
};

export const importErrorText = (code) => (code === 'newer_version' ? T.saveNewer : code === 'read_failed' ? T.fileUnreadable : T.saveUnreadable);

// The help sheet's shortcut table: [KEYS name, what it does, optional display override].
export const HELP_ROWS = [
  ['pause', 'Pause or resume'], ['speedUp', 'Faster'], ['speedDown', 'Slower'],
  ['category', 'Pick a build category', '1 to 7'], ['panLeft', 'Move the view', 'Arrows or WASD'],
  ['rotate', 'Rotate, once something can rotate'], ['minimap', 'Open the minimap'], ['overlay', 'Cycle the overlays'],
  ['confirm', 'Confirm'], ['back', 'Back one step'], ['undo', 'Undo', 'Ctrl+Z or Cmd+Z'], ['help', 'Show this list'],
];
