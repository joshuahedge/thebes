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
    case 'bazaar_empty': return { title: 'Bazaar is empty', fix: `No granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles` };
    case 'labour_shortage': return { title: `Not enough workers for ${LEVEL_NAMES[alert.level] || alert.level}`, fix: "More homes, or pause buildings you don't need" };
    case 'unemployment': return { title: 'Too many people have no work', fix: 'Build farms, granaries, bazaars or temples' };
    case 'debt': return { title: 'The treasury is in debt', fix: "Pause buildings you don't need; taxes rise as homes grow" };
    default: return { title: 'Something needs attention', fix: 'Have a look' };
  }
}

export const SPEED_LABELS = ['Paused', '1×', '2×', '3×'];
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'], housing: ['Ready to grow', 'Next need missing'],
};

export const dateText = ({ year, month, day }) => `Year ${year}, month ${month}, day ${day}`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const T = {
  place: 'Place', cancel: 'Cancel', undo: 'Undo', back: 'Back', close: 'Close', demolish: 'Demolish', pause: 'Pause', resume: 'Resume',
  confirm: 'Confirm', flip: 'Flip', build: 'Build', menu: 'Menu', minimap: 'Minimap', overlay: 'Overlay', speed: 'Speed',
  gold: 'Gold', people: 'People', mood: 'Mood', date: 'Date', income: 'Income', jobless: 'Jobless', food: 'Food',
  summary: 'City summary', incomeVsSpending: 'Income against spending', taxes: 'Taxes', wages: 'Wages', upkeep: 'Upkeep', net: 'Net',
  foodInStore: 'Food in store', employment: 'Employment', moodBreakdown: 'Mood', goals: 'Goals', goalsLater: 'Goals arrive with the next update',
  workers: 'Workers', stock: 'Stock', problems: 'Problems', noProblems: 'No problems', reach: 'Reach', view: 'View',
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
  alerts: 'Alerts', noAlerts: 'All quiet', zoomIn: 'Zoom in', zoomOut: 'Zoom out', jumpTo: 'Jump to',
  newCity: 'New city', continueGame: 'Continue', exportCity: 'Export city', importCity: 'Import city', settings: 'Settings', howToPlay: 'How to play', about: 'About',
  newCityConfirm: 'Start a new city? The current one will be lost.', notYet: 'Not available yet', comingLater: 'Coming later',
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
  paused: 'Paused', pausedHidden: 'Paused while you were away', placed: 'Placed', demolished: 'Demolished', roadLaid: 'Road laid', plotsPainted: 'Plots painted',
  tapStart: 'Tap where it starts', tapEnd: 'Tap where it ends', tapCorner: 'Tap the far corner', refund: 'Refund',
  shortcuts: 'Keyboard shortcuts', openSummary: 'Open the city summary',
};
