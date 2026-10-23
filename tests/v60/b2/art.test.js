// Version 6.0 Track B2: the art of battles you can see: the shells burned and wrecked buildings leave (rubble that remembers what stood there, drawn per
// tile of its footprint) and the fighting poses, the chieftain and the raider with a sack.
import { describe, it, expect } from '../../harness.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { shell } from '../../../src/render/art/defence.js';
import { fightFigure, chieftain, raiderWithSack } from '../../../src/render/art/armies.js';
import { raider } from '../../../src/render/art/figures.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { SHELL, SHELL_CLASS, SHELL_VARIANTS, FIGHTERS, POSES, FACES, shellHeightClass } from '../../../src/data/battle.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeCanvas } from '../../helpers/canvas.js';

// A drawing alone on a canvas (feet at 80, 150, 3 px per art px): its alpha mask, mean colour and inked rows.
function ink(draw) {
  const c = makeCanvas(200, 190), ctx = c.getContext('2d');
  ctx.translate(100, 150);
  draw(makeDraw(ctx, 3));
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const on = new Uint8Array(c.width * c.height);
  let top = c.height, bottom = 0, left = c.width, right = 0, lum = 0, n = 0;
  for (let i = 0; i < on.length; i++) {
    if (d[i * 4 + 3] <= 100) continue;
    on[i] = 1; n++;
    const x = i % c.width, y = Math.floor(i / c.width);
    top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
    lum += d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  }
  return { on, n, top, bottom, left, right, width: c.width, height: c.height, lum: n ? lum / n : 0 };
}
const differ = (a, b) => { let x = 0, either = 0; for (let i = 0; i < a.on.length; i++) { if (a.on[i] !== b.on[i]) x++; if (a.on[i] || b.on[i]) either++; } return either ? x / either : 0; };

const NOT_SHELLED = (t) => t === 'house' || t === 'rubble' || t === 'bridge' || t === 'large_plot' || BUILDINGS[t].monument || BUILDINGS[t].palace;

describe('v60 b2 art shells', () => {
  it('shows rubble that remembers what stood there as that building\'s shell, by cause, edges and height, and old rubble as it was', () => {
    const w = makeTestWorld();
    const was = { type: 'granary', x: 10, y: 10, w: 2, d: 2, rot: 0, day: 5, cause: 'wreck' };
    const tiles = [[10, 10], [11, 10], [10, 11], [11, 11]].map(([x, y]) => { const r = makeBuilding(w, 'rubble', x, y); r.was = { ...was }; return insertBuilding(w, r); });
    // back walls on x = was.x and y = was.y (bits 1, 2), front walls on y = was.y + d - 1 and x = was.x + w - 1 (bits 4, 8)
    expect(tiles.map((r) => slotFor(r, w).replace(/\.v\d$/, ''))).toEqual(['rubble.wreck.m3.h2', 'rubble.wreck.m10.h2', 'rubble.wreck.m5.h2', 'rubble.wreck.m12.h2']);
    expect(tiles.every((r) => slotFor(r, w).endsWith(`.v${r.id % SHELL_VARIANTS}`))).toBe(true);
    const one = makeBuilding(w, 'rubble', 20, 20);
    one.was = { type: 'tower', x: 20, y: 20, w: 1, d: 1, rot: 0, day: 5, cause: 'fire' };
    insertBuilding(w, one);
    expect(slotFor(one, w).replace(/\.v\d$/, '')).toBe('rubble.fire.m15.h2');                       // a lone tile has all four edges
    const old = insertBuilding(w, makeBuilding(w, 'rubble', 22, 22));
    expect(slotFor(old, w)).toBe(`rubble.v${old.id % 3}`);                                           // old rubble: the heap it always was
    expect(slotFor(old, w) in ART).toBe(true);
  });

  it('has the height class of every building that can be wrecked or burned, matching the art\'s own height', () => {
    const classOf = (h) => (h >= SHELL.tallFrom ? 2 : h >= SHELL.midFrom ? 1 : 0);
    const types = Object.keys(BUILDINGS).filter((t) => !NOT_SHELLED(t));
    for (const t of types) {
      const d = BUILDINGS[t], slot = slotFor({ type: t, id: 1, x: 0, y: 0, w: d.w || 1, d: d.d || 1, tier: 0, stage: 0 }, null);
      const def = ART[slot] || ART[t];
      expect([t, Boolean(def), def ? classOf(def.height) : null, SHELL_CLASS[t]]).toEqual([t, true, SHELL_CLASS[t], SHELL_CLASS[t]]);
      expect([t, shellHeightClass({ type: t, w: 1, d: 1 })]).toEqual([t, SHELL_CLASS[t]]);
    }
    expect(Object.keys(SHELL_CLASS).filter((t) => !types.includes(t))).toEqual([]);                  // no row for a type that is not there
    expect(shellHeightClass({ type: 'unheard_of', w: 1, d: 1 })).toBe(0);                            // an unknown type: by footprint
    expect(shellHeightClass({ type: 'unheard_of', w: 2, d: 2 })).toBe(1);
    expect(shellHeightClass({ type: 'unheard_of', w: 3, d: 3 })).toBe(2);
  });

  it('registers every shell slot, each drawing something inside its bounds', () => {
    let n = 0;
    for (const cause of ['fire', 'wreck']) for (let mask = 0; mask < 16; mask++) for (let h = 0; h < 3; h++) for (let v = 0; v < SHELL_VARIANTS; v++) {
      const slot = `rubble.${cause}.m${mask}.h${h}.v${v}`, def = ART[slot];
      expect([slot, Boolean(def && def.draw)]).toEqual([slot, true]);
      n++;
    }
    expect(n).toBe(2 * 16 * 3 * SHELL_VARIANTS);
    // a tall four-walled shell of each cause: ink inside the sprite's bounds on every side
    for (const cause of ['fire', 'wreck']) {
      const def = ART[`rubble.${cause}.m15.h2.v0`], [l, t, r, b] = def.bounds;
      const i = ink((g) => def.draw(g, 0, 0));
      expect([cause, i.n > 800, i.left >= 100 + l * 3, i.right <= 100 + r * 3, i.top >= 150 + t * 3, i.bottom <= 150 + b * 3]).toEqual([cause, true, true, true, true, true]);
    }
  });

  it('draws a burned-out shell charred and a wreck pulled down, and taller stubs for a taller building', () => {
    const fire = ink((g) => shell(g, 0, 0, 'fire', 15, 1, 0)), wreck = ink((g) => shell(g, 0, 0, 'wreck', 15, 1, 0));
    expect(fire.lum).toBeLessThan(wreck.lum - 20);                                                    // dark mudbrick and soot against light brick and dust
    expect(differ(fire, wreck)).toBeGreaterThan(0.15);                                                // a different shape too, not only a different colour
    const low = ink((g) => shell(g, 0, 0, 'fire', 3, 0, 0)), tall = ink((g) => shell(g, 0, 0, 'fire', 3, 2, 0));
    expect(150 - tall.top).toBeGreaterThan(150 - low.top + 6);                                        // the back walls stand higher
    const bare = ink((g) => shell(g, 0, 0, 'fire', 0, 1, 0));
    expect(bare.n).toBeLessThan(fire.n);                                                              // no walls on an inner tile: a heap alone
  });
});

describe('v60 b2 art figures', () => {
  it('has a slot for every fighter, pose and facing, the chieftain standing and a raider with a sack', () => {
    expect([FIGHTERS, POSES, FACES]).toEqual([['soldier', 'raider', 'chief'], ['a', 'b'], ['r', 'l']]);
    for (const who of FIGHTERS) for (const pose of POSES) for (const face of FACES) {
      const def = ART[`fig.${who}_${pose}_${face}`];
      expect([who, pose, face, Boolean(def && def.draw)]).toEqual([who, pose, face, true]);
      const [l, t, r, b] = def.bounds, i = ink((g) => def.draw(g, 0, 0));
      expect([who, pose, face, i.n > 400, i.left >= 100 + l * 3, i.right <= 100 + r * 3, i.top >= 150 + t * 3, i.bottom <= 150 + b * 3]).toEqual([who, pose, face, true, true, true, true, true]);
    }
    for (const slot of ['fig.chief', 'fig.raider_sack']) expect([slot, Boolean(ART[slot] && ART[slot].draw)]).toEqual([slot, true]);
  });

  it('draws the left-facing pose as the right-facing one turned about the feet', () => {
    for (const who of FIGHTERS) for (const pose of POSES) {
      const r = ink((g) => fightFigure(g, 0, 0, who, pose, 1)), l = ink((g) => fightFigure(g, 0, 0, who, pose, -1));
      let wrong = 0;
      for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (r.on[y * r.width + x] !== l.on[y * l.width + (199 - x)]) wrong++;   // mirrored about x = 99.5, the feet
      expect([who, pose, wrong / r.n < 0.02]).toEqual([who, pose, true]);
    }
  });

  it('tells the guard from the blow, and the two sides apart by shape and not only colour', () => {
    for (const who of FIGHTERS) {
      const a = ink((g) => fightFigure(g, 0, 0, who, 'a', 1)), b = ink((g) => fightFigure(g, 0, 0, who, 'b', 1));
      expect([who, differ(a, b) > 0.08]).toEqual([who, true]);                                       // a change a player can see
    }
    const s = ink((g) => fightFigure(g, 0, 0, 'soldier', 'a', 1)), r = ink((g) => fightFigure(g, 0, 0, 'raider', 'a', 1));
    expect(differ(s, r)).toBeGreaterThan(0.4);                                                         // silhouettes differ, not just their colours
  });

  it('draws the chieftain taller than a raider on foot, and a raider\'s sack as a shape of its own', () => {
    const plain = ink((g) => raider(g, 0, 0)), chief = ink((g) => chieftain(g, 0, 0)), sack = ink((g) => raiderWithSack(g, 0, 0));
    expect(150 - chief.top).toBeGreaterThan(150 - plain.top + 6);
    expect(chief.n).toBeGreaterThan(plain.n);
    expect(differ(sack, ink((g) => fightFigure(g, 0, 0, 'raider', 'a', 1)))).toBeGreaterThan(0.2);
    expect(sack.n).toBeGreaterThan(0);
  });
});
