// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
import { TIERS } from './housing.js';
export const CATEGORIES = [
  { id: 'roads', items: ['road', 'demolish'] },
  { id: 'homes', items: ['house', 'garden', 'statue'] },
  { id: 'food', items: ['farm_grain', 'farm_fig', 'granary'] },
  { id: 'industry', items: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'] },
  { id: 'services', items: ['well', 'bazaar', 'temple', 'booth', 'firehouse'] },
  { id: 'defence', items: ['wall', 'tower', 'barracks'] },
  { id: 'monuments', items: [] },
];

export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };

// A thin band on each category button and tab in its buildings' emblem colour (early-game pass 2.5).
export const CATEGORY_TINT = { roads: '#B39466', homes: '#C9552F', food: '#6AA83A', industry: '#8E7470', services: '#2F6FA8', defence: '#9A3A30', monuments: '#E2B13C' };

// The categories a stage has filled. Which of them show in a city, and which of their cards, depends on its
// milestone (src/ui/cards.js: shownCategories, shownItems); the number keys keep their own mapping.
export const visibleCategories = () => CATEGORIES.filter((c) => c.items.length > 0);

export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'wall') return { kind: 'wall' };       // drawn as a line, like a road (spec 6.4 Drawing mode)
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
  return { kind: 'building', type: item };
}

// The build category an item's card sits in (Show me and the guide open it); null for an unknown item.
export function categoryOfItem(item) {
  const c = CATEGORIES.find((cat) => cat.items.includes(item));
  return c ? c.id : null;
}

// Placing a service shows its overlay together with the reach preview (spec 4.5).
export const SHOW_ME_PULSES = 2;
export const SHOW_ME_PULSE_MS = 400;
export const GUIDE_PULSES = 2;          // the guide's map ring pulses twice when its step changes, then stays still (spec 3.2)
export const GUIDE_PULSE_MS = 600;      // one pulse: under 3 flashes a second, done well within 5 s (spec 5.4)
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion', booth: 'entertainment', garden: 'desirability', statue: 'desirability', firehouse: 'fire' };

// The desirability overlay's bands (spec 4.7, 6.3): where each starts. Below the first is unpleasant (hatched); the
// rest are the "to rise" values of the tiers that need desirability (Manor 20, Fine manor 35, Villa 50, Estate 65), so a
// band says which home a tile is pleasant enough for, and the overlay follows the data when those are tuned.
export const DESIRABILITY_STEPS = [0, ...TIERS.filter((t) => t && t.desirability).map((t) => t.desirability.rise)];

// Picking a card or Show me puts a building ghost on the nearest tile where it fits, at most this many tiles
// out (early-game pass 2.6). Only when nothing fits does it stay on the point itself.
export const NEAREST_FIT_RADIUS = 10;

// The trade sheet's level to keep moves in steps of this many units (spec 4.15).
export const TRADE_KEEP_STEP = 10;

// Spec 6.7. Letters are listed in both cases; `undo` needs Ctrl or Cmd.
export const KEYS = {
  pause: [' '],
  speedUp: ['+', '='],
  speedDown: ['-', '_'],
  category: ['1', '2', '3', '4', '5', '6', '7'],
  panLeft: ['ArrowLeft', 'a', 'A'],
  panRight: ['ArrowRight', 'd', 'D'],
  panUp: ['ArrowUp', 'w', 'W'],
  panDown: ['ArrowDown', 's', 'S'],
  rotate: ['r', 'R'],
  minimap: ['m', 'M'],
  overlay: ['o', 'O'],
  confirm: ['Enter'],
  back: ['Escape'],
  undo: ['z', 'Z'],
  help: ['?'],
};

export const DRAG_THRESHOLD_PX = 8;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 24;
export const PAN_STEP_PX = 48;
export const ZOOM_STEP = 1.25;
export const WHEEL_ZOOM_STEP = 1.1;
export const CAMERA_PAN_MS = 350;
export const TOAST_MS = 4000;
export const UNDO_TOAST_MS = 6000;
export const GHOST_FINGER_OFFSET_PX = 48;

// The version the about sheet shows.
export const APP_VERSION = '0.1';

// The offline cache's worker (spec 7.1) and how long the "update ready" toast stays up (spec 6.3).
export const SW_PATH = './sw.js';
export const UPDATE_TOAST_MS = 20000;

export const TITLE_SEED = 11;          // the sample city behind the title card
export const TITLE_DRIFT_MS = 9000;    // one slow camera drift between two points of it

// Celebration captions (early-game pass 3.6): how long each tier's caption shows, and the least time between two
// captions starting. A milestone shows longer than the gap, so the next caption waits until it hides. Stage 3 (Track D,
// spec 4.13 and 6.3): an info caption (a blaze put out, a raid's report of about 100 characters) shows long enough to read
// at a phone's 150% text.
export const CHEER_MS = { first: 2500, milestone: 4000, info: 6000 };
export const CHEER_GAP_MS = 3000;

// The idle nudge (early-game pass 3.5): Show me glows after this much idle running play, and one Next line follows this much later.
export const NUDGE_GLOW_MS = 45000;
export const NUDGE_LINE_MS = 60000;
