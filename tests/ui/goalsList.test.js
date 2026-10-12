import { describe, it, expect } from '../harness.js';
import { nearestFit } from '../../src/ui/placement.js';
import { createGoalsStrip, goalsSheet, showMeTarget } from '../../src/ui/goalsList.js';
import { GOALS, GOAL_REWARD, EVENT_GOALS } from '../../src/data/goals.js';
import { goalById, guideActive, nextItemFor, chainGoals } from '../../src/sim/goals.js';
import { canPlace, setGuide } from '../../src/sim/commands.js';
import { T as TERRAIN } from '../../src/sim/terrain.js';
import { T, CHAPTER_NAMES, goalsProgressText, rewardText } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw, setRoad } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

describe('ui goals', () => {
  it('shows the first open goal in the strip with Show me, and hides the row when all are done', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    const shown = [], opened = [];
    const strip = createGoalsStrip({ container: root, world, onShowMe: (g) => shown.push(g.id), onOpen: () => opened.push(1) });
    expect(root.textContent).toContain(GOALS[0].text);
    expect(root.textContent).toContain(rewardText(GOAL_REWARD));
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
    expect(root.hidden).toBe(true);                                  // the whole row goes, so #under-bar keeps no gap for it
    cleanup();
  });
  it('on a phone the goal words are one button that asks onToggle and never opens the sheet; open, the strip adds the reward, All goals and Skip guide (placement review P8)', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      setGuide(world, true);
      const log = [];
      const strip = createGoalsStrip({
        container: root, world, phone: () => true, onShowMe: () => {}, onOpen: () => log.push('sheet'), onToggle: () => log.push('toggle'), onSkipGuide: () => log.push('skip'),
      });
      const words = root.querySelector('.main.open-goals'), box = root.querySelector('.goal-strip');
      const extras = () => [root.querySelector('.reward').hidden, root.querySelector('.all-goals').hidden, root.querySelector('.skip-guide').hidden];
      expect([words.getAttribute('aria-expanded'), extras()]).toEqual(['false', [true, true, true]]);
      fire(words, 'click');
      expect(log).toEqual(['toggle']);                                    // ruling 170's "opens the sheet" is now behind All goals
      strip.setOpen(true);
      expect([box.classList.contains('open'), words.getAttribute('aria-expanded'), extras()]).toEqual([true, 'true', [false, false, false]]);
      expect(root.querySelector('.reward').textContent).toBe(rewardText(GOALS[0].reward));
      expect(root.querySelector('.all-goals').textContent).toBe(`${T.allGoals} ›`);
      expect(root.querySelector('.more').textContent.trim().startsWith(T.less)).toBe(true);   // "Less ▴" while open
      fire(root.querySelector('.all-goals'), 'click');
      fire(root.querySelector('.skip-guide'), 'click');
      expect(log).toEqual(['toggle', 'sheet', 'skip']);
      world.goals.completed.push('road');
      strip.render();                                                      // another goal: the strip is built again, and stays as it was set
      expect([root.querySelector('.goal-strip').classList.contains('open'), root.querySelector('.main.open-goals').getAttribute('aria-expanded')]).toEqual([true, 'true']);
      strip.setOpen(false);
      expect([root.querySelector('.goal-strip').classList.contains('open'), root.querySelector('.main.open-goals').getAttribute('aria-expanded'), extras()]).toEqual([false, 'false', [true, true, true]]);
      expect(root.querySelector('.more').hidden).toBe(true);              // nothing is cut (no stylesheet here), so no More
    } finally { cleanup(); }
  });
  it('on a wide screen the strip is as it was: Goals opens the sheet, with the reward and Skip guide in sight, and no open state', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      setGuide(world, true);
      const log = [];
      const strip = createGoalsStrip({ container: root, world, phone: () => false, onShowMe: () => {}, onOpen: () => log.push('sheet'), onToggle: () => log.push('toggle') });
      expect([root.querySelector('.more'), root.querySelector('.all-goals')]).toEqual([null, null]);
      expect(root.querySelector('.skip-guide').hidden).toBe(false);
      fire(root.querySelector('.open-goals'), 'click');
      strip.setOpen(true);                                                 // meaningless on a wide strip: nothing changes
      expect([log, root.querySelector('.goal-strip').classList.contains('open')]).toEqual([['sheet'], false]);
    } finally { cleanup(); }
  });
  it('renders the goals sheet by chapter with the count and up to three goals', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    world.goals.completed.push('road');
    const shown = [];
    goalsSheet(world, { onShowMe: (g) => shown.push(g.id) })(root, { close: () => {} });
    expect(root.textContent).toContain(goalsProgressText(2, GOALS.length + 1));   // Stage 3: Founded Thebes counts, done from the start
    expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([CHAPTER_NAMES.first_homes, CHAPTER_NAMES.feed]);
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
  it('says No goals open, not All goals done, when the only goal left is hidden until its prestige unlock', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.milestone = 'capital';
      const chain = chainGoals(world);
      world.goals.completed = chain.filter((g) => g.id !== 'found_great_pyramid').map((g) => g.id);   // pyramid_great is not unlocked: its goal waits on `when`
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect(root.textContent).toContain(goalsProgressText(chain.length, chain.length + 1));          // 57 of 58 style: one goal is not done
      expect([root.textContent.includes(T.goalsNone), root.textContent.includes(T.goalsDone)]).toEqual([true, false]);
    } finally { cleanup(); }
  });
  it('lists the last captions under Recent in the goals sheet, newest first, and offers Skip guide there on a phone', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      setGuide(world, true);
      const skipped = [];
      const recent = [{ tier: 'first', text: `${T.goalDone}: ${GOALS[0].text}`, why: '', reward: 25 }, { tier: 'info', text: 'The blaze at the potter is out.', why: '', reward: 0 }];
      goalsSheet(world, { onShowMe: () => {}, recent: () => recent, skipHere: () => true, onSkipGuide: () => skipped.push(1) })(root, { close: () => {} });
      const heads = [...root.querySelectorAll('h3')].map((h) => h.textContent);
      expect(heads[heads.length - 1]).toBe(T.recent);
      const rows = [...root.querySelectorAll('.recent li')];
      expect(rows.map((li) => li.querySelector('.text').textContent)).toEqual(recent.map((c) => c.text));
      expect([rows[0].querySelector('.reward').textContent, rows[1].querySelector('.reward')]).toEqual([rewardText(25), null]);
      expect(guideActive(world)).toBe(true);
      fire(root.querySelector('.skip-guide'), 'click');
      expect(skipped).toEqual([1]);
      root.innerHTML = '';
      goalsSheet(world, { onShowMe: () => {}, recent: () => [], skipHere: () => false })(root, { close: () => {} });
      expect([root.querySelector('.skip-guide'), root.querySelector('.recent'), [...root.querySelectorAll('h3')].some((h) => h.textContent === T.recent)]).toEqual([null, null, false]);   // a wide screen's strip keeps Skip guide; no Recent until a caption
    } finally { cleanup(); }
  });
  it('finds the Show me target for each kind', () => {
    const world = makeTestWorld();
    world.startRoad = [[31, 31], [31, 30], [31, 29]];
    expect(showMeTarget(world, goalById('road'))).toEqual({ x: 31.5, y: 29.5 });
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: 7.5, y: world.focus.y - 0.5 });   // the farm goal aims at the fertile land (x < 8 here) nearest the focus
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no homes yet
    addRaw(world, 'house', 10, 10); addRaw(world, 'house', 12, 10);
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: 11.5, y: 10.5 });
  });
  it('aims every farm goal at the nearest free fertile tile while a farm is what is next, and at the focus once only a store or a mill is', () => {
    const world = makeTestWorld();                                                  // fertile land on x < 8, the focus at (16, 16)
    for (const id of ['food', 'beer', 'linen']) expect([id, goalById(id).showMe.target]).toEqual([id, 'fertile']);
    expect(EVENT_GOALS.find((g) => g.id === 'more_jobs').showMe.target).toBe('fertile');
    const fertile = { x: 7.5, y: world.focus.y - 0.5 };
    for (const id of ['food', 'beer', 'linen']) expect([id, showMeTarget(world, goalById(id))]).toEqual([id, fertile]);
    expect(showMeTarget(world, EVENT_GOALS.find((g) => g.id === 'more_jobs'))).toEqual(fertile);
    world.terrain.fill(TERRAIN.DESERT);
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no fertile land: the focus
    world.terrain.fill(TERRAIN.FERTILE);
    addRaw(world, 'farm_grain', 3, 3);
    setRoad(world, 0, 5, 10, 5);                                                     // a farm with no road counts for nothing yet (P11)
    expect(nextItemFor(world, goalById('food'))).toBe('granary');                   // the farm stands: the granary is next, and it goes with the town
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: world.focus.x, y: world.focus.y });
  });
  it('aims the jewellery goal at the rocky tile nearest the focus, and at the focus when none is rocky', () => {
    const world = makeTestWorld();
    const goal = goalById('jewellery');
    expect(goal.showMe.target).toBe('rocky');
    world.terrain.fill(TERRAIN.DESERT);
    expect(showMeTarget(world, goal)).toEqual({ x: world.focus.x, y: world.focus.y });
    const at = (x, y) => { world.terrain[y * world.size + x] = TERRAIN.ROCKY; };
    at(0, 0); at(world.focus.x + 9, world.focus.y - 2); at(world.focus.x - 3, world.focus.y + 4);
    expect(showMeTarget(world, goal)).toEqual({ x: world.focus.x - 3 + 0.5, y: world.focus.y + 4 + 0.5 });
    at(world.focus.x + 1, world.focus.y);                                          // one beside the focus beats the rest
    expect(showMeTarget(world, goal)).toEqual({ x: world.focus.x + 1.5, y: world.focus.y + 0.5 });
  });
  it('wires Show me into the game: the right card starts, the camera moves, and done goals celebrate', async () => {
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
    r.ui.celebrations.clear();
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: GOAL_REWARD }]);
    const caption = r.root.querySelector('#cheer .cheer');            // a caption now, not a toast (early-game pass 3.6)
    expect(caption.querySelector('.text').textContent).toBe(`${T.goalDone}: ${GOALS[0].text}`);
    expect(caption.querySelector('.reward').textContent).toBe(rewardText(GOAL_REWARD));
    expect(r.root.querySelector('#toasts').textContent.includes(GOALS[0].text)).toBe(false);
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
  it('stacks under the banner and the legend, and Show me puts a building ghost on a free tile near the target', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.world.gold = -30; r.ui.alerts.refresh();
    r.store.set({ overlay: 'water' });
    const top = (sel) => r.root.querySelector(sel).getBoundingClientRect().top;
    const bottom = (sel) => r.root.querySelector(sel).getBoundingClientRect().bottom;
    expect(bottom('#banner')).toBeGreaterThan(top('#banner'));
    expect(bottom('#legend')).toBeGreaterThan(top('#legend'));
    expect(top('#legend') >= bottom('#banner')).toBe(true);
    expect(top('#goals .goal-strip') >= bottom('#legend')).toBe(true);
    r.world.gold = 1000;                                              // out of debt, so the ghost's tile can be judged a fit
    r.world.goals.completed.push('road', 'plots');
    r.ui.refresh();
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const t = showMeTarget(r.world, goalById('well'));
    const ghost = r.store.get().ghost;
    expect(r.store.get().tool.type).toBe('well');
    expect(ghost).toEqual(nearestFit(r.world, { kind: 'building', type: 'well' }, Math.floor(t.x), Math.floor(t.y)));
    expect(Math.abs(ghost.x + 0.5 - t.x) <= 2 && Math.abs(ghost.y + 0.5 - t.y) <= 2).toBe(true);   // beside the homes, not on them
    expect(canPlace(r.world, 'well', ghost.x, ghost.y).ok).toBe(true);
    expect(r.ui.placement.preview().state).toBe('ok');             // the hut on the target tile is stepped around
    r.cleanup();
  });
});
