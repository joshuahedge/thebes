// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
export const CATEGORIES = [
  { id: 'roads', items: ['road', 'demolish'] },
  { id: 'homes', items: ['house'] },
  { id: 'food', items: ['farm_grain', 'granary'] },
  { id: 'industry', items: [] },
  { id: 'services', items: ['well', 'bazaar', 'temple'] },
  { id: 'defence', items: [] },
  { id: 'monuments', items: [] },
];

export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };

export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
  return { kind: 'building', type: item };
}

// Placing a service shows its overlay together with the reach preview (spec 4.5).
export const SHOW_ME_PULSES = 2;
export const SHOW_ME_PULSE_MS = 400;
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' };

// Picking a card or Show me puts a building ghost on the nearest tile where it fits, at most this many tiles
// out (early-game pass 2.6). Only when nothing fits does it stay on the point itself.
export const NEAREST_FIT_RADIUS = 10;

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
