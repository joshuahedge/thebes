// Version 9.3 Track P (rulings 1938, 1939; spec sections 6 and 8): the bar's contract. Every building and asset drawing reaches the new bar through
// the primitives (shadeWall, contactLine, insetOpening where it has openings), which count their calls (PRIMITIVE_CALLS, art/primitives.js). The
// test draws every slot in the registry once and lists any that called none. Each one left must be named: EXEMPT (ruling 1938: no wall face and no
// opening, so the bar has nothing to draw on) or OWED (ruling 1939: a building with walls that does not reach the bar yet, Track B's art, for the
// wave 3 fix wave). OWED may only shrink: a slot that reaches the bar is simply no longer listed, and a new slot without it fails the test.
import { describe, it, expect } from '../../harness.js';
import { ART } from '../../../src/render/art/registry.js';
import { PRIMITIVE_CALLS } from '../../../src/render/art/primitives.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { PALACE_ART } from '../../../src/render/art/palace.js';
import { MONUMENT_ART } from '../../../src/render/art/monuments.js';
import { makeCanvas } from '../../helpers/canvas.js';

const total = () => PRIMITIVE_CALLS.shadeWall + PRIMITIVE_CALLS.contactLine + PRIMITIVE_CALLS.insetOpening;

// A slot's pattern: its numbers (look, variant, stage, frame) folded to '#'.
const pattern = (slot) => slot.replace(/-?\d+/g, '#');

// Ruling 1938: drawings with no wall face and no opening.
const EXEMPT = [
  /^fig\./,                                   // figures, animals, carts, boats and units: a few art px tall, no walls, and they move (no ground line)
  /^farm_/,                                   // fields and their crops
  /^(palm|acacia)(\.|$)/,                     // trees
  /^hill\./,                                  // hills, registered as a map draws them (hills.js): rock, not walls
  /^rubble(\.|$)/,                            // ruins and wrecks: no wall left standing
  /^house\.lot$/,                             // an empty plot
  /^(well|booth|clay_pit|quarry|fishing_wharf|ferry_landing|garden|statue|plaza)(\.|$)/,   // open works: a well's kerb, a stall on posts, pits, decks, a garden, a statue, a paved square
];

// Ruling 1939: buildings with walls that reach none of the three primitives yet. All Track B's (services.js, industry.js, supply.js, defence.js,
// trade.js): the plain keys kept for cards (ui/thumbs.js) are the 9.2 drawings; a shut building's barred door replaces its inset doorway, and
// nothing else in it calls the bar; the trading post, the Quay, the brickworks and the gem mine never call it.
// 9.3 fix wave, group xb (ruling 2005): the list is paid off. Every shut state, the plain card keys, the trading post, the Quay, the brickworks, the gem mine
// and the wall and gate cards now draw through the bar, so OWED is empty and stays empty (a new slot without the bar fails the test below).
const OWED = [];

export function slotsWithoutTheBar(registry = ART) {
  const none = [];
  const ctx = makeCanvas(64, 64).getContext('2d');
  for (const [slot, def] of Object.entries(registry)) {
    if (!def.draw) continue;
    const before = total();
    ctx.save();
    def.draw(makeDraw(ctx, 1), 0, 0);
    ctx.restore();
    if (total() === before) none.push(slot);
  }
  return none;
}

describe('v93 p bar', () => {
  it('counts each primitive of the bar as it draws', () => {
    const fake = { a: { draw: () => {} }, b: { draw: (g) => ART['house.t3.v0.l2'].draw(g, 0, 0) } };
    expect(slotsWithoutTheBar(fake)).toEqual(['a']);
  });
  it('names every slot that draws through none of the bar\'s primitives: exempt by ruling 1938 or owed by ruling 1939', () => {
    const none = slotsWithoutTheBar();
    const owed = new Set(OWED);
    const unnamed = none.filter((s) => !EXEMPT.some((re) => re.test(s)) && !owed.has(pattern(s)));
    expect(unnamed).toEqual([]);
  });
  it('reaches the bar in every home, palace, monument and plaza drawing, and every working service but the owed', () => {
    const none = new Set(slotsWithoutTheBar());
    const keys = Object.keys(ART);
    const homes = keys.filter((k) => /^house\.t\d+\.v\d\.l\d$/.test(k));
    expect(homes.length).toBeGreaterThan(0);
    expect(homes.filter((k) => none.has(k))).toEqual([]);
    const bar = [...Object.keys(PALACE_ART), ...Object.keys(MONUMENT_ART)].filter((k) => ART[k] && ART[k].draw);
    expect(bar.length).toBeGreaterThan(5);
    expect(bar.filter((k) => none.has(k))).toEqual([]);
    const working = keys.filter((k) => /\.l\d\.work$/.test(k) && !OWED.includes(pattern(k)) && !EXEMPT.some((re) => re.test(k)));
    expect(working.length).toBeGreaterThan(20);
    expect(working.filter((k) => none.has(k))).toEqual([]);
  });
});
