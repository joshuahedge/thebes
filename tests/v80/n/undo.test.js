// Version 8.0 (Track N, ruling 1165): Undo is a safety net, not a time machine. It covers only the last action, and only until the next month starts; it never walks back through earlier progress.
// The sim half (undoLast, the month's end clearing the stack) is set up both ways; the toast's Undo, the bar's Undo, Ctrl+Z and Delete all follow it.
import { describe, it, expect } from '../../harness.js';
import { undoLast, undo, pushUndo } from '../../../src/sim/undo.js';
import { place, demolishAt } from '../../../src/sim/commands.js';
import { runMonth as tickMonth } from '../../../src/sim/clock.js';
import { buildingAt } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const world = () => { const w = makeTestWorld({ gold: 1000 }); setRoad(w, 0, 10, 31, 10); return w; };

describe('v80 n undo: the sim', () => {
  it('undoLast takes back the last action only; the earlier one cannot be walked back to', () => {
    const w = world();
    const a = place(w, 'well', 5, 9), b = place(w, 'well', 8, 9);
    expect([a.ok, b.ok, w.undo.length]).toEqual([true, true, 2]);
    const gold = w.gold;
    expect(undoLast(w).ok).toBe(true);
    expect([buildingAt(w, 8, 9), Boolean(buildingAt(w, 5, 9)), w.gold > gold, w.undo.length]).toEqual([null, true, true, 0]);
    expect(undoLast(w)).toEqual({ ok: false, reason: 'nothing_to_undo' });
    expect(Boolean(buildingAt(w, 5, 9))).toBe(true);                                      // the first well is progress now
  });
  it('a refused undo (something now stands where a demolished building was) still ends the stack: nothing older is offered after it', () => {
    const w = world();
    place(w, 'well', 5, 9);
    place(w, 'well', 8, 9);
    expect(demolishAt(w, 8, 9).ok).toBe(true);
    addRaw(w, 'house', 8, 9);                                                             // the tiles are taken: the demolish cannot go back
    expect(w.undo.length).toBe(3);
    expect(undoLast(w)).toEqual({ ok: false, reason: 'occupied' });
    expect([w.undo.length, Boolean(buildingAt(w, 5, 9)), buildingAt(w, 8, 9).type]).toEqual([0, true, 'house']);
  });
  it('the earlier step is still reachable by the one-step primitive scripts use (the balance runs roll back with undo)', () => {
    const w = world();
    place(w, 'well', 5, 9);
    place(w, 'well', 8, 9);
    expect(undo(w).ok).toBe(true);
    expect(undo(w).ok).toBe(true);
    expect([buildingAt(w, 5, 9), buildingAt(w, 8, 9)]).toEqual([null, null]);
  });
  it('the month ending clears it: the step lapses when the next month starts', () => {
    const w = world();
    place(w, 'well', 5, 9);
    expect(w.undo.length).toBe(1);
    tickMonth(w);
    expect([w.undo.length, undoLast(w).reason]).toEqual([0, 'nothing_to_undo']);
    expect(Boolean(buildingAt(w, 5, 9))).toBe(true);
  });
  it('pushUndo is as it was (a stack the scripts can read); only the player\'s Undo is the last step', () => {
    const w = world();
    for (let i = 0; i < 3; i++) pushUndo(w, { kind: 'road', tiles: [], cost: 0 });
    expect(w.undo.length).toBe(3);
  });
});

const lay = (r, x, y) => { r.ui.placement.start({ kind: 'houses' }); r.ui.placement.toggleTile(x, y); r.ui.placement.confirm(); };

describe('v80 n undo: the toast, the bar, Ctrl+Z and Delete follow it', () => {
  it('the toast\'s Undo takes back the last action and then nothing is offered: the bar\'s Undo is off, Ctrl+Z and Delete do nothing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      lay(r, 20, 9);
      lay(r, 22, 9);
      expect([Boolean(buildingAt(r.world, 20, 9)), Boolean(buildingAt(r.world, 22, 9))]).toEqual([true, true]);
      const toasts = [...r.root.querySelectorAll('#toasts .toast')].filter((t) => t.querySelector('.action'));
      expect(toasts.length).toBe(1);                                                      // the older action's Undo went when the next came up: its button would have taken the newer one back
      fire(toasts[0].querySelector('.action'), 'click');
      expect([buildingAt(r.world, 22, 9), Boolean(buildingAt(r.world, 20, 9))]).toEqual([null, true]);
      expect([r.ui.placement.canUndo(), r.root.querySelector('#confirm .undo').disabled]).toEqual([false, true]);
      key(r.root, 'z', { ctrlKey: true });
      key(r.root, 'Delete');
      key(r.root, 'Backspace');
      expect(Boolean(buildingAt(r.world, 20, 9))).toBe(true);                             // the first plot is progress
    } finally { r.cleanup(); }
  });

  it('Ctrl+Z takes back the last action once; a second Ctrl+Z does nothing', async () => {
    const r = await rigUI();
    try {
      lay(r, 20, 9);
      lay(r, 22, 9);
      key(r.root, 'z', { ctrlKey: true });
      expect([buildingAt(r.world, 22, 9), Boolean(buildingAt(r.world, 20, 9))]).toEqual([null, true]);
      key(r.root, 'z', { ctrlKey: true });
      expect(Boolean(buildingAt(r.world, 20, 9))).toBe(true);
    } finally { r.cleanup(); }
  });

  it('the bar\'s Undo (the house tool\'s icon) takes back the last action once, then is greyed', async () => {
    const r = await rigUI();
    try {
      lay(r, 20, 9);
      lay(r, 22, 9);
      const undoButton = () => r.root.querySelector('#confirm .undo');
      expect(undoButton().disabled).toBe(false);
      fire(undoButton(), 'click');
      expect([buildingAt(r.world, 22, 9), Boolean(buildingAt(r.world, 20, 9)), undoButton().disabled]).toEqual([null, true, true]);
    } finally { r.cleanup(); }
  });

  it('when the next month starts the toast\'s Undo goes and nothing can be undone', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      lay(r, 20, 9);
      expect(r.root.querySelector('#toasts .toast .action')).toBeTruthy();
      tickMonth(r.world);
      r.ui.refresh();
      expect([r.root.querySelector('#toasts .toast .action'), r.ui.placement.canUndo(), r.root.querySelector('#confirm .undo').disabled]).toEqual([null, false, true]);
      key(r.root, 'z', { ctrlKey: true });
      expect(Boolean(buildingAt(r.world, 20, 9))).toBe(true);
    } finally { r.cleanup(); }
  });
});
