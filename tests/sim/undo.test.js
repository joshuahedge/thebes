import { describe, it, expect } from '../harness.js';
import { pushUndo, undo, clearUndo, UNDO_LIMIT } from '../../src/sim/undo.js';
import { buildingAt } from '../../src/sim/world.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

describe('undo', () => {
  it('reports when there is nothing to undo', () => {
    expect(undo(makeTestWorld()).reason).toBe('nothing_to_undo');
  });
  it('undoes a placement with a full refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const b = addRaw(w, 'well', 3, 3);
    w.gold -= 30;
    pushUndo(w, { kind: 'place', ids: [b.id], cost: 30 });
    expect(undo(w).ok).toBe(true);
    expect(buildingAt(w, 3, 3)).toBe(null);
    expect(w.gold).toBe(1000);
  });
  it('undoes roads with a refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const t = idx(w.size, 4, 4);
    w.road[t] = 1; w.gold -= 2;
    pushUndo(w, { kind: 'road', tiles: [t], cost: 2 });
    undo(w);
    expect(w.road[t]).toBe(0);
    expect(w.gold).toBe(1000);
  });
  it('restores demolished buildings exactly and takes back the refund', () => {
    const w = makeTestWorld({ gold: 1000 });
    const h = addRaw(w, 'house', 6, 6, { tier: 3, residents: 9, stock: { grain: 2 } });
    const snap = JSON.parse(JSON.stringify(h));
    delete w.buildings[h.id];
    w.occ[idx(w.size, 6, 6)] = 0;
    w.gold += 15;
    pushUndo(w, { kind: 'demolish', buildings: [snap], roads: [], refund: 15 });
    undo(w);
    expect(buildingAt(w, 6, 6)).toEqual(snap);
    expect(w.gold).toBe(1000);
  });
  it('keeps only the last 10 actions and can be cleared', () => {
    const w = makeTestWorld();
    for (let i = 0; i < 12; i++) pushUndo(w, { kind: 'road', tiles: [], cost: 0 });
    expect(w.undo.length).toBe(UNDO_LIMIT);
    clearUndo(w);
    expect(w.undo.length).toBe(0);
  });
});
