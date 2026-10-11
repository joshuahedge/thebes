import { describe, it, expect } from '../harness.js';
import { createGoalsStrip, goalsSheet, showMeTarget } from '../../src/ui/goalsList.js';
import { GOALS } from '../../src/data/goals.js';
import { goalById } from '../../src/sim/goals.js';
import { T } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

describe('ui goals', () => {
  it('shows the first open goal in the strip with Show me, and hides when all are done', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    const shown = [], opened = [];
    const strip = createGoalsStrip({ container: root, world, onShowMe: (g) => shown.push(g.id), onOpen: () => opened.push(1) });
    expect(root.textContent).toContain(GOALS[0].text);
    expect(root.textContent).toContain('+25');
    fire(root.querySelector('.show-me'), 'click');
    expect(shown).toEqual(['road']);
    fire(root.querySelector('.open-goals'), 'click');
    expect(opened).toEqual([1]);
    world.goals.completed.push('road');
    strip.render();
    expect(root.textContent).toContain(GOALS[1].text);
    world.goals.completed = GOALS.map((g) => g.id);
    strip.render();
    expect(root.querySelector('.goal-strip').hidden).toBe(true);
    cleanup();
  });
  it('renders the goals sheet with progress and up to three goals', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    world.goals.completed.push('road');
    const shown = [];
    goalsSheet(world, { onShowMe: (g) => shown.push(g.id) })(root, { close: () => {} });
    expect(root.textContent).toContain('1 of 9 done');
    const rows = root.querySelectorAll('.goal');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain(GOALS[1].text);
    fire(rows[2].querySelector('.show-me'), 'click');
    expect(shown).toEqual(['food']);
    world.goals.completed = GOALS.map((g) => g.id);
    root.innerHTML = '';
    goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
    expect(root.textContent).toContain(T.goalsDone);
    cleanup();
  });
  it('finds the Show me target for each kind', () => {
    const world = makeTestWorld();
    world.startRoad = [[31, 31], [31, 30], [31, 29]];
    expect(showMeTarget(world, goalById('road'))).toEqual({ x: 31.5, y: 29.5 });
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: world.focus.x, y: world.focus.y });
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no homes yet
    addRaw(world, 'house', 10, 10); addRaw(world, 'house', 12, 10);
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: 11.5, y: 10.5 });
  });
  it('wires Show me into the game: the right card starts, the camera moves, and done goals toast', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.ui.settings.set({ reducedMotion: 'off' });
    expect(r.root.querySelector('#goals .goal-strip').hidden).toBe(false);
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const s = r.store.get();
    expect(s.category).toBe('roads');
    expect(s.mode).toBe('drawing');
    expect(s.sheet).toBe(null);
    expect(r.ui.cameraControl.animating).toBe(true);
    r.store.set(openSheet(r.store.get(), 'goals'));
    expect(r.root.querySelectorAll('#sheet .goal').length).toBe(3);
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(GOALS[0].text);
    r.store.set(openSheet(r.store.get(), 'summary'));
    expect(r.root.querySelector('#sheet').textContent).toContain(GOALS[0].text);
    r.store.set({ overlay: 'water' });
    expect(document.body.classList.contains('has-overlay')).toBe(true);
    r.cleanup();
  });
  it('keeps keyboard focus on the strip across refreshes', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    const btn = r.root.querySelector('#goals .show-me');
    btn.focus();
    expect(document.activeElement).toBe(btn);
    r.ui.refresh();
    expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));
    r.world.goals.completed.push('road');         // a new goal rebuilds the strip; focus goes back to the same button
    r.ui.refresh();
    expect(r.root.querySelector('#goals').textContent).toContain(GOALS[1].text);
    expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));
    r.cleanup();
  });
  it('stacks under the banner and the legend, and Show me puts a building ghost on the target', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.world.gold = -30; r.ui.alerts.refresh();
    r.store.set({ overlay: 'water' });
    const top = (sel) => r.root.querySelector(sel).getBoundingClientRect().top;
    const bottom = (sel) => r.root.querySelector(sel).getBoundingClientRect().bottom;
    expect(bottom('#banner')).toBeGreaterThan(top('#banner'));
    expect(bottom('#legend')).toBeGreaterThan(top('#legend'));
    expect(top('#legend') >= bottom('#banner')).toBe(true);
    expect(top('#goals .goal-strip') >= bottom('#legend')).toBe(true);
    r.world.goals.completed.push('road', 'plots');
    r.ui.refresh();
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const t = showMeTarget(r.world, goalById('well'));
    expect(r.store.get().tool.type).toBe('well');
    expect(r.store.get().ghost).toEqual({ x: Math.floor(t.x), y: Math.floor(t.y) });
    r.cleanup();
  });
});
