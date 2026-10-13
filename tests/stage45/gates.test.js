// Task 1b (ruling 309): a road may cross a wall; each wall or breach tile it crosses becomes a gate at the gate price, undo
// restores the wall, and a Gate card in Defence runs the road tool in a mode that takes wall tiles only.
import { describe, it, expect } from '../harness.js';
import { previewRoad, drawRoad, previewRoadTiles, drawRoadTiles } from '../../src/sim/commands.js';
import { drawWallTiles, isGate } from '../../src/sim/defence.js';
import { undo } from '../../src/sim/undo.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { isUnlocked } from '../../src/sim/progression.js';
import { idx } from '../../src/sim/grid.js';
import { DEFENCE } from '../../src/data/raids.js';
import { CATEGORIES, toolForItem } from '../../src/data/ui.js';
import { toolPreview, ghostsFor } from '../../src/ui/placement.js';
import { cardShown, cardInfo, activeItemOf, shownItems } from '../../src/ui/cards.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { S45_TEXT, reasonText } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';

// A wall down x = 10 (y 5..15) in a 32x32 test world at Market town; no roads.
function walled(gold = 1000) {
  const w = makeTestWorld({ gold });
  w.milestone = 'market_town';
  const tiles = [];
  for (let y = 5; y <= 15; y++) tiles.push([10, y]);
  expect(drawWallTiles(w, tiles).ok).toBe(true);
  w.undo = [];
  w.gold = gold;
  return w;
}
const at = (w, x, y) => idx(w.size, x, y);

describe('s45 gates (sim)', () => {
  it('lets a road cross a wall, making a gate at the gate price on each wall tile it crosses', () => {
    const w = walled();
    const p = previewRoad(w, 6, 8, 14, 8);
    expect(p.ok).toBe(true);
    expect(p.gates).toEqual([at(w, 10, 8)]);
    expect(p.tiles.length).toBe(9);
    expect(p.cost).toBe(8 * roadCostOf(w) + costOf(w, 'gate'));
    w.wall[at(w, 10, 8)] = 17;                                         // a damaged wall tile
    const wallVersion = w.wallVersion, roadVersion = w.roadVersion, gold = w.gold;
    const r = drawRoad(w, 6, 8, 14, 8);
    expect(r.ok).toBe(true);
    expect(w.road[at(w, 10, 8)]).toBe(1);
    expect(isGate(w, at(w, 10, 8))).toBe(true);
    expect(w.wall[at(w, 10, 8)]).toBe(DEFENCE.gateHp);
    expect([w.wallVersion > wallVersion, w.roadVersion > roadVersion, w.gold]).toEqual([true, true, gold - r.cost]);
    expect(w.wall[at(w, 10, 7)]).toBe(DEFENCE.wallHp);                 // its neighbours stay wall
    expect(w.road[at(w, 10, 7)]).toBe(0);
  });

  it('prices a gate from the difficulty, in the sim\'s own number', () => {
    for (const level of ['peaceful', 'relaxed', 'normal', 'hard']) {
      const w = walled();
      w.difficulty = level;
      const p = previewRoad(w, 10, 5, 10, 7);                          // along the wall: three gates
      expect([level, p.gates.length, p.cost]).toEqual([level, 3, 3 * costOf(w, 'gate')]);
    }
  });

  it('undo takes the road off and puts the wall back as it was, with the gold', () => {
    const w = walled();
    w.wall[at(w, 10, 8)] = 17;
    w.wall[at(w, 10, 9)] = -1;                                          // a breach on the line too
    const gold = w.gold, before = [...w.wall];
    const r = drawRoad(w, 8, 8, 12, 8);
    const q = drawRoad(w, 10, 9, 10, 10);
    expect([r.ok, q.ok]).toEqual([true, true]);
    expect(undo(w).ok).toBe(true);
    expect(undo(w).ok).toBe(true);
    expect([...w.wall]).toEqual(before);
    expect([...w.road].every((v) => v === 0)).toBe(true);
    expect(w.gold).toBe(gold);
  });

  it('turns a breach into a gate the same way (standing, with a road), and undo breaks it again', () => {
    const w = walled();
    w.wall[at(w, 10, 9)] = -1;
    w.road[at(w, 10, 9)] = 1;                                           // a breach on a road: broken stone, not a gate
    const p = previewRoadTiles(w, [[10, 9]]);
    expect([p.ok, p.gates, p.tiles, p.cost]).toEqual([true, [at(w, 10, 9)], [at(w, 10, 9)], costOf(w, 'gate')]);
    drawRoadTiles(w, [[10, 9]]);
    expect([isGate(w, at(w, 10, 9)), w.wall[at(w, 10, 9)]]).toEqual([true, DEFENCE.gateHp]);
    undo(w);
    expect([w.wall[at(w, 10, 9)], w.road[at(w, 10, 9)]]).toEqual([-1, 1]);  // the road was there before, so it stays
  });

  it('charges nothing for a tile that is already a gate, and nothing changes', () => {
    const w = walled();
    drawRoad(w, 10, 8, 10, 8, false, { gateOnly: true });
    const gold = w.gold;
    const p = previewRoad(w, 8, 8, 12, 8);
    expect([p.gates, p.tiles.length]).toEqual([[], 4]);
    expect(p.cost).toBe(4 * roadCostOf(w));
    expect(drawRoad(w, 10, 8, 10, 8).tiles).toEqual([]);
    expect(w.gold).toBe(gold);
  });

  it('refuses a road through a tile a building stands on (a tower on a wall), as before', () => {
    const w = walled();
    expect(previewRoad(w, 8, 8, 12, 8).ok).toBe(true);
    w.occ[at(w, 10, 8)] = 99;
    expect(previewRoad(w, 8, 8, 12, 8).reason).toBe('blocked');
  });

  it('keeps gold short for the gates from drawing: below the debt floor refuses', () => {
    const w = walled();
    w.gold = -499;
    const p = previewRoad(w, 10, 5, 10, 6);
    expect([p.ok, p.reason, p.gates.length]).toEqual([false, 'no_gold', 2]);
  });

  it('gate mode accepts wall tiles only: a mouse line with a plain tile is refused whole, a touch plan skips it', () => {
    const w = walled();
    const refused = previewRoad(w, 8, 8, 12, 8, false, { gateOnly: true });
    expect([refused.ok, refused.reason]).toEqual([false, 'not_wall']);
    const plan = previewRoadTiles(w, [[9, 8], [10, 8], [11, 8]], { skipBlocked: true, gateOnly: true });
    expect([plan.ok, plan.tiles, plan.gates, plan.skipped.map((s) => [s.x, s.y, s.reason])]).toEqual([true, [at(w, 10, 8)], [at(w, 10, 8)], [[9, 8, 'not_wall'], [11, 8, 'not_wall']]]);
    expect(plan.cost).toBe(costOf(w, 'gate'));                          // the road tile on a wall tile comes with the gate
    const r = drawRoadTiles(w, [[9, 8], [10, 8], [11, 8]], { skipBlocked: true, gateOnly: true });
    expect([r.ok, w.road[at(w, 10, 8)], w.road[at(w, 9, 8)], isGate(w, at(w, 10, 8))]).toEqual([true, 1, 0, true]);
  });
});

describe('s45 gates (interface)', () => {
  const store = (tool, extra = {}) => createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, ...extra });

  it('puts a Gate card in Defence after Wall, shown and unlocked with the wall, and starts the road tool in gate mode', () => {
    expect(CATEGORIES.find((c) => c.id === 'defence').items).toEqual(['wall', 'gate', 'tower', 'barracks', 'archery_range', 'stables']);   // Stage 4.6: the Armies track's two
    expect(toolForItem('gate')).toEqual({ kind: 'road', gate: true });
    expect(activeItemOf(toolForItem('gate'))).toBe('gate');
    expect(activeItemOf({ kind: 'road' })).toBe('road');
    const w = makeTestWorld();
    w.milestone = 'town';
    expect([isUnlocked(w, 'gate'), cardShown(w, 'gate'), shownItems(w, 'defence')]).toEqual([false, true, ['wall', 'gate', 'tower', 'barracks', 'archery_range', 'stables']]);   // the next milestone's: greyed
    expect(cardInfo(w, 'gate').locked).toBe(true);
    expect(cardInfo(w, 'gate').lockText).toBe(cardInfo(w, 'wall').lockText);
    w.milestone = 'market_town';
    const info = cardInfo(w, 'gate');
    expect([isUnlocked(w, 'gate'), info.locked, info.cost, info.costText]).toEqual([true, false, costOf(w, 'gate'), `${costOf(w, 'gate')} gold`]);
  });

  it('words a road through a wall with the sim\'s gate price, both ways (one gate, several, a different level)', () => {
    const w = walled();
    const line = { x0: 6, y0: 8, x1: 14, y1: 8, flip: false };
    const one = toolPreview(w, store({ kind: 'road' }, { line }).get());
    expect([one.state, one.text]).toEqual(['ok', `8 tiles · Gate through the wall: ${costOf(w, 'gate')} gold`]);
    expect(one.text).toBe(`8 tiles · ${S45_TEXT.gateNote(1, 20)}`);
    expect(one.cost).toBe(8 * roadCostOf(w) + costOf(w, 'gate'));
    const along = toolPreview(w, store({ kind: 'road' }, { line: { x0: 10, y0: 5, x1: 10, y1: 7, flip: false } }).get());
    expect(along.text).toBe(S45_TEXT.gateNote(3, costOf(w, 'gate')));
    w.difficulty = 'hard';
    expect(toolPreview(w, store({ kind: 'road' }, { line }).get()).text).toBe('8 tiles · Gate through the wall: 25 gold');
    w.difficulty = 'normal';
    const plain = toolPreview(w, store({ kind: 'road' }, { line: { x0: 1, y0: 1, x1: 4, y1: 1, flip: false } }).get());
    expect(plain.text).toBe('4 tiles');                                   // no wall crossed: no gate note
  });

  it('marks the gate tile in the ghost, and the Gate tool says "Gate through the wall" alone, refusing a plain line in words', () => {
    const w = walled();
    const s = store({ kind: 'road', gate: true }, { line: { x0: 10, y0: 8, x1: 10, y1: 8, flip: false } });
    const p = toolPreview(w, s.get());
    expect([p.state, p.text, p.cost]).toEqual(['ok', S45_TEXT.gateNote(1, costOf(w, 'gate')), costOf(w, 'gate')]);
    expect(ghostsFor(w, s.get(), p).map((g) => g.state)).toEqual(['gate']);
    const bad = toolPreview(w, store({ kind: 'road', gate: true }, { line: { x0: 6, y0: 8, x1: 14, y1: 8, flip: false } }).get());
    expect([bad.state, bad.text]).toEqual(['bad', reasonText('not_wall')]);
    const plan = toolPreview(w, store({ kind: 'road', gate: true }, { plan: { tiles: [[9, 8], [10, 8], [11, 8]] } }).get());
    expect([plan.state, plan.count, plan.skipped.length]).toEqual(['ok', 1, 2]);
  });
});
