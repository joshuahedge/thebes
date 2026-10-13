// Task 1a: a tree is hidden wherever the tile is used: a wall, a breach, a plot, rubble, a plaza and a 2x2 building.
import { describe, it, expect } from '../harness.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { decorAt } from '../../src/render/renderer.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

function meadow() {
  const w = makeTestWorld({ size: 40 });
  w.terrain.fill(T.MEADOW);
  return w;
}
// The first free tiles (in scan order) that show a tree, each with room for a 2x2 to its east and south.
function treeTiles(w, n) {
  const out = [];
  for (let y = 2; y < 36 && out.length < n; y += 3) for (let x = 2; x < 36 && out.length < n; x++) {
    if (decorAt(w, x, y) && !out.some(([ox, oy]) => Math.abs(ox - x) < 3 && Math.abs(oy - y) < 3)) out.push([x, y]);
  }
  return out;
}

describe('s45 trees', () => {
  it('shows a tree on free meadow, then hides it under a wall, a breach, a plot, rubble, a plaza or a 2x2 building', () => {
    const w = meadow();
    const t = treeTiles(w, 6);
    expect(t.length).toBe(6);
    for (const [x, y] of t) expect(decorAt(w, x, y) !== null).toBe(true);
    w.wall[idx(w.size, t[0][0], t[0][1])] = 40;                  // a standing wall
    w.wall[idx(w.size, t[1][0], t[1][1])] = -1;                  // a breach
    addRaw(w, 'house', t[2][0], t[2][1]);                        // a plot
    addRaw(w, 'rubble', t[3][0], t[3][1]);
    addRaw(w, 'plaza', t[4][0], t[4][1]);
    addRaw(w, 'barracks', t[5][0], t[5][1]);                     // 2x2: the tile itself is its north corner
    for (const [x, y] of t) expect([x, y, decorAt(w, x, y)]).toEqual([x, y, null]);
  });
  it('hides a tree under a wall and brings it back when the wall goes', () => {
    const w = meadow();
    const [x, y] = treeTiles(w, 1)[0];
    const i = idx(w.size, x, y);
    const before = decorAt(w, x, y);
    w.wall[i] = 40;
    expect(decorAt(w, x, y)).toBe(null);
    w.wall[i] = 0;
    expect(decorAt(w, x, y)).toBe(before);
  });
  it('covers each tile of a big building, not just its corner', () => {
    const w = meadow();
    addRaw(w, 'barracks', 10, 10);
    for (const [x, y] of [[10, 10], [11, 10], [10, 11], [11, 11]]) expect([x, y, decorAt(w, x, y)]).toEqual([x, y, null]);
  });
});
