// Version 8.2, Track G (rulings 1300-1311): the words for the Great oasis and the new-city card's preview. A leaf: it imports only data, so
// src/ui/text.js can import it.
//
// Words per map (ruling 1307): the Nile's yearly flood keeps its name everywhere (the great lake rises with it), but on a map with no river the
// words that put a thing on the river say the great lake instead. RIVER_SWAPS is the one list, applied in order (the longer phrases first) by
// forMap at the sheets, captions, explainers, refusals and How to play; tests/v82/g/flood.test.js holds that every phrase still occurs in the
// river words, so a rewording there cannot silently undo a swap.
import { hasRiver, MAP } from '../../data/map.js';

export const RIVER_SWAPS = [
  ['no river beside it (an oasis pool does not count)', 'no great lake beside it (a spring pool does not count)'],
  ['on the river bank', "on the great lake's bank"],
  ['The Nile is rising', 'The great lake is rising'],
  // Version 8.2 integration (ruling 1335): the words joined to "river" go first, or "the riverbank" would read "the great lakebank".
  ['the riverbanks', "the lake's banks"],
  ['the riverbank', "the lake's bank"],
  ['the river mud', "the lake's mud"],
  ['The river', 'The great lake'],
  ['the river', 'the great lake'],
];

// The new-city card's map preview (rulings 1310-1311).
export const PREVIEW_TEXT = {
  another: 'Another',
  anotherLabel: 'Another map: draw a new one',
  caption: (layout, size, surprise) => `${surprise ? 'Surprise me: ' : ''}${layout}, ${size}`,
  alt: (layout, size) => `The map you will get: ${layout} layout, ${size} map. A ring marks where your city starts and a dot where the trade road comes in.`,
};

// Whether a world's map has no river (the Great oasis).
export const riverless = (world) => Boolean(world) && !hasRiver(world.mapVariant);

// The text as this world's map should say it.
export function forMap(world, text) {
  if (!riverless(world) || typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of RIVER_SWAPS) out = out.split(from).join(to);
  return out;
}

// The same, on nodes the interface has built (every text node under them): for sheet parts that are lists of elements.
export function forMapNodes(world, nodes) {
  if (!riverless(world)) return nodes;
  for (const n of nodes || []) {
    if (!n || typeof n !== 'object') continue;
    if (n.nodeType === 3) { n.nodeValue = forMap(world, n.nodeValue); continue; }
    if (!n.ownerDocument) continue;
    const walk = n.ownerDocument.createTreeWalker(n, 4);   // NodeFilter.SHOW_TEXT
    for (let t = walk.nextNode(); t; t = walk.nextNode()) t.nodeValue = forMap(world, t.nodeValue);
    for (const a of ['aria-label', 'title']) if (n.getAttribute && n.getAttribute(a)) n.setAttribute(a, forMap(world, n.getAttribute(a)));
  }
  return nodes;
}

const G = MAP.greatOasis;
export const OASIS_TEXT = {
  // The Trade sheet and the placing refusals (ruling 1306).
  noRiver: 'No river reaches this oasis: no boat can come',
  noRiverRoute: (id, name) => `No river reaches this oasis: ${name}'s ${id === 'punt' ? 'ships' : 'boats'} cannot come`,
  noQuay: 'No river reaches this oasis: no boat can land here',
  // How to play: the Maps note's line for the Great oasis, and a paragraph at the top on a city of it.
  layoutLine: `no river at all: one great lake in the desert, about ${Math.round(2 * G.r[0])} to ${Math.round(2 * G.r[1])} tiles across, ringed by farmland and palms, with ${G.springs[0]} to ${G.springs[1]} spring pools and a dry wadi; the lake rises with the yearly flood, and trade comes by caravan only`,
  helpHead: 'This city: the Oasis',
  help: 'No river reaches this oasis. The great lake rises with the Nile\'s yearly flood, so the farms on its fertile ring flood and harvest as river farms do, and a Nilometer or a fishing wharf stands on its bank (not by a small spring pool). Nubia\'s boats and Punt\'s ships cannot come: trade comes by caravan only.',
};
