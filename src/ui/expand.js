// The guidance row opened in place on a phone (placement review P8, spec 6.3): a goal, a tip or a caption whose words a
// phone cuts at two lines shows "More ▾" at its end, and a tap shows the whole of it. These are the two pieces the three rows
// share: measuring whether the words are cut, and writing the More or Less words.
import { el, clear } from './components.js';
import { T } from './text.js';

// Whether a clamped box holds more than it shows (css/ui.css cuts the rows' words with "…"). A row that is not on the
// screen has no height at all, so it is never cut.
export const isCut = (node) => node.scrollHeight > node.clientHeight + 1;

// "More ▾" while the row is closed, "Less ▴" while it is open. The arrow is decoration: aria-expanded says which it is.
export function writeMore(node, open) {
  clear(node);
  node.append(open ? T.less : T.more, el('span', { 'aria-hidden': 'true', text: open ? ' ▴' : ' ▾' }));
}
