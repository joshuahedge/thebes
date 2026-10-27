// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
import { TIERS } from './housing.js';
import { MONUMENT_KINDS } from './monuments.js';
import { S46_DOCK } from './s46.js';
export const CATEGORIES = [
  { id: 'roads', items: ['road', 'ferry', 'demolish'] },   // Version 7.1 (Track F): the Ferry tool; Version 8.3 (Track X): named Crossing, it shows bridges and ferries (its id stays 'ferry', for saves and keys)
  { id: 'homes', items: ['house', 'large_plot', 'garden', 'statue', 'plaza', 'sphinx'] },   // Version 6.0 (Track C): the Large plot card, shown from the first Townhouse (src/ui/cards.js)
  { id: 'food', items: ['farm_grain', 'farm_fig', 'granary'] },
  { id: 'industry', items: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post', 'quay'] },
  { id: 'services', items: ['well', 'bazaar', 'temple', 'booth', 'firehouse', 'physician', 'police_post', 'palace'] },
  { id: 'defence', items: ['wall', 'gate', 'tower', 'barracks'] },
  // Stage 4 (spec 4.14, ruling 207): everything a monument needs, in order, then the seven from the small obelisk up.
  { id: 'monuments', items: ['builders_guild', 'quarry', 'brickworks', ...MONUMENT_KINDS] },
];
// Stage 4.6: each track's dock items (src/data/s46.js S46_DOCK: category id -> items) after the category's own.
for (const c of CATEGORIES) if (S46_DOCK[c.id]) c.items.push(...S46_DOCK[c.id].filter((t) => !c.items.includes(t)));

export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };

// A thin band on each category button and tab in its buildings' emblem colour (early-game pass 2.5).
export const CATEGORY_TINT = { roads: '#B39466', homes: '#C9552F', food: '#6AA83A', industry: '#8E7470', services: '#2F6FA8', defence: '#9A3A30', monuments: '#E2B13C' };

// The categories a stage has filled. Which of them show in a city, and which of their cards, depends on its
// milestone (src/ui/cards.js: shownCategories, shownItems); the number keys keep their own mapping.
export const visibleCategories = () => CATEGORIES.filter((c) => c.items.length > 0);

export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'wall') return { kind: 'wall' };       // drawn as a line, like a road (spec 6.4 Drawing mode)
  if (item === 'ferry') return { kind: 'ferry' };   // Version 7.1 (Track F): drawn as a line like a road, but straight across the water; lays two landings (8.3: or a bridge, the Crossing card)
  if (item === 'gate') return { kind: 'road', gate: true };   // Stage 4.5 (ruling 309): the road tool, taking only wall tiles
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
  if (item === 'plaza') return { kind: 'plazas' };     // Stage 4 (ruling 250): painted like plots
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
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion', booth: 'entertainment', garden: 'desirability', statue: 'desirability', firehouse: 'fire', physician: 'health', police_post: 'crime',
  farm_grain: 'ground', farm_fig: 'ground', farm_barley: 'ground', farm_flax: 'ground', gem_mine: 'ground', quarry: 'ground', clay_pit: 'ground',   // placement review P1: the buildings that need fertile or rocky ground show it
  ...Object.fromEntries(MONUMENT_KINDS.map((k) => [k, 'ground'])) };   // Stage 4 (Track C, ruling 229): picking a monument turns Ground on, with its gold room

// The desirability overlay's bands (spec 4.7, 6.3): where each starts. Below the first is unpleasant (hatched); the
// rest are the "to rise" values of the tiers that need desirability (Manor 20, Fine manor 35, Villa 50, Estate 65), so a
// band says which home a tile is pleasant enough for, and the overlay follows the data when those are tuned.
export const DESIRABILITY_STEPS = [0, ...TIERS.filter((t) => t && t.desirability).map((t) => t.desirability.rise)];

// Picking a card or Show me puts a building ghost on the nearest tile where it fits, at most this many tiles
// out (early-game pass 2.6). Only when nothing fits does it stay on the point itself.
export const NEAREST_FIT_RADIUS = 10;   // Stage 4: MONUMENT_PLACING.fitRadius (16) for footprints of bigArea tiles and up (src/data/monuments.js)

// The trade sheet's level to keep moves in steps of this many units (spec 4.15).
export const TRADE_KEEP_STEP = 10;

// Spec 6.7. Letters are listed in both cases; `undo` needs Ctrl or Cmd.
export const KEYS = {
  pause: [' '],
  // Version 6.0 (Track D1, ruling 744): + and - zoom the map (the desktop's own habit); the speed steps moved to ] and [ (and . and , beside them, the
  // keys of > and <) so neither loses a key.
  speedUp: [']', '.'],
  speedDown: ['[', ','],
  zoomIn: ['+', '='],
  zoomOut: ['-', '_'],
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
  // Version 7.0 (Track P, ruling 1001): Delete or Backspace takes back what was just placed while its Undo is offered, else removes the building whose sheet is open.
  remove: ['Delete', 'Backspace'],
};

export const DRAG_THRESHOLD_PX = 8;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 24;
export const PAN_STEP_PX = 48;
export const ZOOM_STEP = 1.25;
export const WHEEL_ZOOM_STEP = 1.1;
export const CAMERA_PAN_MS = 350;
// Version 5.0 (Task 6, rulings 570-579): the smoother camera.
// Fling: a touch or pen swipe lifted still moving keeps panning, its speed (screen px a second) dying away exponentially with the time constant for the Motion level (Full
// glides about 0.35 s, Gentle about a third of that, Still not at all); it stops below FLING_STOP_PX_S, and any touch stops it. The speed is read from the last
// FLING_WINDOW_MS of the drag, and a finger that rested FLING_REST_MS before lifting leaves none.
export const FLING_MIN_PX_S = 400;
export const FLING_MAX_PX_S = 3500;
export const FLING_STOP_PX_S = 30;
export const FLING_WINDOW_MS = 100;
export const FLING_REST_MS = 80;
export const FLING_TAU_MS = { full: 350, gentle: 110 };
// Show me's glide to the place it frames: at least SHOW_ME_GLIDE_MS (Full) growing with the distance, SHOW_ME_GENTLE_MS under Gentle, a jump under Still. It also
// comes in to SHOW_ME_MIN_ZOOM when the view is further out (a place is framed to be seen, not to be a speck).
export const SHOW_ME_GLIDE_MS = 380;
export const SHOW_ME_GLIDE_MAX_MS = 800;
export const SHOW_ME_GLIDE_MS_PER_TILE = 14;
export const SHOW_ME_GENTLE_MS = 170;
export const SHOW_ME_MIN_ZOOM = 0.75;
// A two-finger tap (both down and up within TWO_TAP_MS, neither moving more than DRAG_THRESHOLD_PX); two within DOUBLE_TAP_MS zoom out a step.
export const TWO_TAP_MS = 250;
export const TOAST_MS = 4000;
export const UNDO_TOAST_MS = 6000;
export const GHOST_FINGER_OFFSET_PX = 48;

// The version the about sheet shows.
export const APP_VERSION = '8.2.1';   // the version follows the stages (ruling 401): the one constant; the newest entry of RELEASES (src/data/releases.js) must match

// The offline cache's worker (spec 7.1) and how long the "update ready" toast stays up (spec 6.3).
export const SW_PATH = './sw.js';
export const UPDATE_TOAST_MS = 20000;

export const TITLE_SEED = 11;          // the sample city behind the title card
export const TITLE_DRIFT_MS = 9000;    // one slow camera drift between two points of it
export const TITLE_HOLD_MS = 8000;     // under Full, how long the backdrop holds the showcase before it first drifts

// Celebration captions (early-game pass 3.6; spec 6.3, ruling 165): how long each tier's caption shows, and the least
// time between two captions starting. Goals, firsts, feats and achievements are the 'first' tier; citizen remarks
// 'remark'. A caption showing longer than the gap holds the next one until it hides. An info caption (a blaze put out, a
// raid's report of about 100 characters) shows long enough to read at a phone's 150% text.
export const CHEER_MS = { first: 4000, remark: 4000, milestone: 5000, info: 6000 };
export const CHEER_GAP_MS = 3000;
export const CHEER_OPEN_MIN_MS = 2000;     // a caption opened in place (placement review P8) stays at least this long once it is closed again
export const CHEER_WAITING_MAX = 2;        // at most two captions wait their turn; an older one goes straight to Recent
export const CHEER_HELD_MAX_MS = 10000;    // a caption held back this long behind a sheet on a phone goes to Recent (spec 6.3)
export const CHEER_RECENT_MAX = 10;        // the Goals sheet's Recent list keeps the last ten captions

// The idle nudge (early-game pass 3.5): Show me glows after this much idle running play, and one Next line follows this much later.
export const NUDGE_GLOW_MS = 45000;
export const NUDGE_LINE_MS = 60000;

// Stage 4 (Track C, spec 6.3, ruling 281): View outlines the building it frames for holdMs, then fades it over fadeMs under
// Full motion (under Gentle and Still it holds, then goes at once).
export const VIEW_OUTLINE = { holdMs: 2500, fadeMs: 500 };
