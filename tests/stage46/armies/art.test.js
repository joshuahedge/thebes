// Stage 4.6, the Armies track's art: the two buildings, each unit kind's figure told apart by shape (UX rule 4), the units' slots and
// health bars by kind, and archers' arrows from the shooter.
import { describe, it, expect } from '../../harness.js';
import { ARMY_ART, archer, chariot, raiderArcher, raiderChariot, raiderBoat } from '../../../src/render/art/armies.js';
import { raider, soldier } from '../../../src/render/art/figures.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { unitsAt, drawUnitMarks, UNIT_ID_BASE } from '../../../src/render/units.js';
import { drawThumb } from '../../../src/ui/thumbs.js';
import { UNIT_TYPES, ENEMY_TYPES } from '../../../src/data/armies.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

function mask(draw) {
  const c = makeCanvas(200, 200), ctx = c.getContext('2d');
  ctx.translate(100, 160);
  draw(makeDraw(ctx, 3));
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const on = new Uint8Array(c.width * c.height);
  let n = 0;
  for (let i = 0; i < on.length; i++) if (d[i * 4 + 3] > 100) { on[i] = 1; n++; }
  return { on, n };
}
const apart = (a, b) => {
  let differ = 0, either = 0;
  for (let i = 0; i < a.on.length; i++) { if (a.on[i] !== b.on[i]) differ++; if (a.on[i] || b.on[i]) either++; }
  return differ / either;
};

describe('s46 armies art', () => {
  it('draws the archery range and the stables, on their cards too', () => {
    for (const t of ['archery_range', 'stables']) {
      expect([t, ART[t] === ARMY_ART[t], ART[t].w, ART[t].d]).toEqual([t, true, 2, t === 'stables' ? 3 : 2]);
      expect([t, mask((g) => ART[t].draw(g, 0, 0)).n > 2000]).toEqual([t, true]);
      const c = drawThumb(document.createElement('canvas'), t, 1);
      expect([t, c.width > 0]).toEqual([t, true]);
    }
  });
  it('tells every unit kind apart by its silhouette, not only its colour', () => {
    const figs = { soldier: mask((g) => soldier(g, 0, 0)), archer: mask((g) => archer(g, 0, 0)), chariot: mask((g) => chariot(g, 0, 0)),
      raider: mask((g) => raider(g, 0, 0)), raider_archer: mask((g) => raiderArcher(g, 0, 0)), raider_chariot: mask((g) => raiderChariot(g, 0, 0)), raider_boat: mask((g) => raiderBoat(g, 0, 0)) };
    const names = Object.keys(figs);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const pair = `${names[i]}/${names[j]}`;
      // Your chariot and the enemy's share parts (horse and car), but drive opposite ways, and the enemy's carries a spear and shield.
      expect([pair, apart(figs[names[i]], figs[names[j]]) > 0.2]).toEqual([pair, true]);
    }
    for (const k of ['archer', 'chariot', 'raider_archer', 'raider_chariot', 'raider_boat']) expect([k, typeof ART[`fig.${k}`].draw]).toEqual([k, 'function']);
  });
  it('draws each unit and raider as its kind\'s figure, with a health bar against its kind\'s hit points', () => {
    const w = makeTestWorld({ fertile: [] });
    const range = addRaw(w, 'archery_range', 2, 2), stab = addRaw(w, 'stables', 6, 2);
    w.soldiers.push({ id: 1, kind: 'archer', barracks: range.id, x: 12, y: 12, hp: 2, hit: true, task: 'out' }, { id: 2, kind: 'chariot', barracks: stab.id, x: 14, y: 12, hp: 16, hit: false, task: 'out' });
    w.raid.active = { index: 6, entry: { x: 31, y: 10 }, dir: 'east', size: 3, target: 'building', day: 0, phase: 'attack', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0,
      shots: [{ from: { x: 12, y: 12 }, to: { x: 12, y: 9 }, by: 'archer' }],
      raiders: [{ id: 3, kind: 'foot', x: 12, y: 9, hp: 10, hit: false }, { id: 4, kind: 'archer', x: 13, y: 9, hp: 4, hit: true }, { id: 5, kind: 'chariot', x: 14, y: 8, hp: 14, hit: false }] };
    const kinds = Object.fromEntries(unitsAt(w, 0).map((u) => [u.id - UNIT_ID_BASE, u.kind]));
    expect(kinds).toEqual({ 1: 'archer', 2: 'chariot', 3: 'raider', 4: 'raider_archer', 5: 'raider_chariot' });
    const ctx = makeCanvas(64, 64).getContext('2d'), g = makeDraw(ctx, 1), polys = [], lines = [];
    const { poly, line } = g;
    g.poly = (pts, fill, o) => { polys.push({ pts, fill }); return poly(pts, fill, o); };
    g.line = (a, b, c, wd, al) => { lines.push({ a, b }); return line(a, b, c, wd, al); };
    drawUnitMarks(g, w, null, 0, 0, { reducedMotion: true });
    const widths = polys.filter((q) => q.fill !== '#2A2230').map((q) => q.pts[1][0] - q.pts[0][0]);
    expect(widths.map((x) => Math.round(x * 100) / 100)).toEqual([9 * 4 / ENEMY_TYPES.archer.hp, 9 * 2 / UNIT_TYPES.archer.hp]);   // raiders first, each against its own kind
    expect(widths.length).toBe(2);
    expect(lines.length).toBe(1);                                                    // the archer's arrow, from the archer
  });
});
