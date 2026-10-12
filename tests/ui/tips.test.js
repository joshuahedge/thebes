import { describe, it, expect } from '../harness.js';
import { createTips } from '../../src/ui/tips.js';
import { createSettings } from '../../src/ui/settings.js';
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS, TIP_HELD_MAX_MS, TIP_AUTO_CLOSE_MS } from '../../src/data/tips.js';
import { GUIDE_GOALS } from '../../src/data/goals.js';
import { settle } from '../../src/sim/settle.js';
import { setGuide } from '../../src/sim/commands.js';
import { buildingAt, housesOf } from '../../src/sim/world.js';
import { select, openSheet, back } from '../../src/ui/modes.js';
import { TIP_TEXT, T } from '../../src/ui/text.js';
import { TOKENS } from '../../src/ui/theme.js';
import { fakeLocal } from '../helpers/fakeStorage.js';
import { mount, fire } from '../helpers/dom.js';
import { addRaw, staffAll } from '../helpers/testWorld.js';
import { rigUI, uiWorld, runningUiWorld } from '../helpers/uiWorld.js';

// Tips on a clock the test moves; the session starts at t = 0.
function rig(storage = fakeLocal()) {
  const { root, cleanup } = mount();
  const settings = createSettings({ storage, root, systemReducedMotion: () => false });
  const clock = { t: 0 };
  const tips = createTips({ container: root, settings, now: () => clock.t });
  return { root, settings, storage, clock, tips, cleanup };
}
const shownText = (root) => { const n = root.querySelector('.tip-row .text'); return n ? n.textContent : null; };

// Frames for the game tests, cheap because the drawing is stubbed. play(ms) runs frames a second apart, so the game's play
// clock (which the tips' gap and hourly cap count) moves only while the speed is above zero.
function quietFrames(r) {
  r.renderer.renderFrame = () => {};
  let ft = 0;
  r.frame(ft);
  return (ms) => { const end = ft + ms; while (ft < end) { ft += 1000; r.frame(ft); } };
}

describe('ui tips', () => {
  it('shows a tip on its trigger with Got it, once per device, without taking focus', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('no_such_trigger')).toBe(false);
      expect(r.tips.trigger('arrivals')).toBe(true);
      expect(r.tips.current()).toBe('arrivals');
      expect(shownText(r.root)).toBe(TIP_TEXT.arrivals);
      expect(r.settings.get().seenTips).toEqual(['arrivals']);                // showing marks it seen
      const gotIt = r.root.querySelector('.got-it');
      expect(gotIt.textContent).toBe(T.gotIt);
      expect(document.activeElement === gotIt).toBe(false);
      fire(gotIt, 'click');
      expect(r.tips.current()).toBe(null);
      expect(r.root.children.length).toBe(0);
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('arrivals')).toBe(false);                         // seen
      const c2 = { t: 0 };
      const again = createTips({ container: r.root, settings: createSettings({ storage: r.storage, root: r.root, systemReducedMotion: () => false }), now: () => c2.t });
      c2.t = TIP_FIRST_DELAY_MS;
      expect(again.trigger('arrivals')).toBe(false);                          // seen on this device, in a new session too
      expect(again.trigger('monthEnd')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('hands focus on when Got it had it, and never takes it when a tip appears', () => {
    const { root, cleanup } = mount();
    const settings = createSettings({ storage: fakeLocal(), root, systemReducedMotion: () => false });
    const other = mount();                                                     // a button beside the tip row, not inside it
    const outside = document.createElement('button');
    other.root.append(outside);
    let handed = 0;
    const clock = { t: 0 };
    const tips = createTips({ container: root, settings, now: () => clock.t, restoreFocus: () => { handed++; outside.focus(); } });
    try {
      clock.t = TIP_FIRST_DELAY_MS;
      outside.focus();
      expect(tips.trigger('arrivals')).toBe(true);
      expect(document.activeElement).toBe(outside);                            // a tip appears without taking focus
      tips.dismiss();
      expect(handed).toBe(0);                                                  // focus was elsewhere: nothing to hand on
      clock.t += TIP_GAP_MS;
      expect(tips.trigger('monthEnd')).toBe(true);
      root.querySelector('.got-it').focus();
      fire(root.querySelector('.got-it'), 'click');
      expect(handed).toBe(1);                                                  // the focused button is gone: focus goes back to the page
      expect(document.activeElement).toBe(outside);
    } finally { cleanup(); other.cleanup(); }
  });
  it('waits out the first 10 s, keeps 3 minutes between tips and shows at most five an hour', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS - 1;
      expect(r.tips.trigger('arrivals')).toBe(false);
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('arrivals')).toBe(true);
      r.tips.dismiss();
      r.clock.t += TIP_GAP_MS - 1;
      expect(r.tips.trigger('monthEnd')).toBe(false);
      r.clock.t += 1;
      for (const key of ['monthEnd', 'goalDone', 'overlayOn', 'problemMarker']) {
        expect(r.tips.trigger(key)).toBe(true);
        r.tips.dismiss();
        r.clock.t += TIP_GAP_MS;
      }
      expect(TIP_HOURLY_MAX).toBe(5);
      expect(r.tips.trigger('houseSheet')).toBe(false);                        // a sixth inside the hour
      r.clock.t = TIP_FIRST_DELAY_MS + 3600 * 1000;                             // an hour after the first
      expect(r.tips.trigger('houseSheet')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('never holds a tip whose words are about what is on screen as it fires: busy, it is dropped unseen and can fire again', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(TIPS.filter((t) => t.waits === false).map((t) => t.id)).toEqual(['house_needs', 'overlay_keys']);
      for (const key of ['houseSheet', 'overlayOn']) {
        expect(r.tips.trigger(key, { busy: true })).toBe(false);
        expect(r.tips.flush({ busy: false })).toBe(false);                     // nothing was held
        expect([r.tips.current(), r.settings.get().seenTips || []]).toEqual([null, []]);
      }
      expect(r.tips.trigger('servicePlaced', { busy: true })).toBe(false);    // another tip still takes the slot,
      expect(r.tips.trigger('houseSheet', { busy: true })).toBe(false);       // and a dropped one does not disturb it
      expect(r.tips.flush({ busy: false })).toBe(true);
      expect(r.tips.current()).toBe('service_reach');
      r.tips.dismiss();
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('houseSheet')).toBe(true);                         // free to show, it does
      expect(r.tips.current()).toBe('house_needs');
    } finally { r.cleanup(); }
  });
  it('holds a tip while a tool is active, shows one at a time, and lets the Play tip jump the queue', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('servicePlaced', { busy: true })).toBe(false);
      expect(r.tips.flush({ busy: true })).toBe(false);
      expect(r.tips.flush({ busy: false })).toBe(true);
      expect(r.tips.current()).toBe('service_reach');
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('monthEnd')).toBe(false);                          // one at a time
      expect(r.tips.trigger('plotsPaused', { busy: true })).toBe(true);        // priority: past a tool, and it replaces the tip
      expect(r.tips.current()).toBe('press_play');
      expect(TIPS.filter((t) => t.priority).map((t) => t.id)).toEqual(['press_play']);
    } finally { r.cleanup(); }
    const early = rig();
    try { expect(early.tips.trigger('plotsPaused')).toBe(true); }             // and before the first delay
    finally { early.cleanup(); }
  });
  it('drops a tip that waited more than a minute for the tool to close, and shows one that waited less', () => {
    expect(TIP_HELD_MAX_MS).toBe(60000);
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('demolished', { busy: true })).toBe(false);          // held while a tool is active
      r.clock.t += TIP_HELD_MAX_MS;
      expect(r.tips.flush({ busy: false })).toBe(true);                          // exactly a minute: still fresh
      r.tips.dismiss();
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('servicePlaced', { busy: true })).toBe(false);
      r.clock.t += TIP_HELD_MAX_MS + 1;
      expect(r.tips.flush({ busy: false })).toBe(false);                         // "what you just removed" is not news now
      expect(r.tips.current()).toBe(null);
      expect(r.settings.get().seenTips).toEqual(['undo_demolish']);              // and it is not marked seen: its next trigger shows it
      expect(r.tips.trigger('servicePlaced')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('keeps the 3-minute gap and the five-an-hour cap on play time, and the first 10 s on the clock', () => {
    const { root, cleanup } = mount();
    const settings = createSettings({ storage: fakeLocal(), root, systemReducedMotion: () => false });
    const wall = { t: 0 }, play = { t: 0 };
    const tips = createTips({ container: root, settings, now: () => wall.t, playNow: () => play.t });
    try {
      wall.t = TIP_FIRST_DELAY_MS - 1;
      expect(tips.trigger('arrivals')).toBe(false);                              // the first delay is on the wall clock
      wall.t = TIP_FIRST_DELAY_MS;
      expect(tips.trigger('arrivals')).toBe(true);
      tips.dismiss();
      wall.t += 3600 * 1000;                                                     // an hour passes with the game paused
      expect(tips.trigger('monthEnd')).toBe(false);                              // and none of it counts toward the gap
      play.t += TIP_GAP_MS - 1;
      expect(tips.trigger('monthEnd')).toBe(false);
      play.t += 1;
      expect(tips.trigger('monthEnd')).toBe(true);
      tips.dismiss();
      for (const key of ['goalDone', 'overlayOn', 'problemMarker']) {
        play.t += TIP_GAP_MS;
        expect(tips.trigger(key)).toBe(true);
        tips.dismiss();
      }
      play.t += TIP_GAP_MS;
      expect(tips.trigger('houseSheet')).toBe(false);                            // a sixth in an hour of play
      play.t = 3600 * 1000;                                                      // an hour of play after the first (it began at play time 0)
      expect(tips.trigger('houseSheet')).toBe(true);
    } finally { cleanup(); }
  });
  it('closes a tip by itself only while autoCloseMs asks for it, and the tip stays seen', () => {
    const { root, cleanup } = mount();
    const settings = createSettings({ storage: fakeLocal(), root, systemReducedMotion: () => false });
    const clock = { t: 0 };
    let autoClose = 0;
    const tips = createTips({ container: root, settings, now: () => clock.t, autoCloseMs: () => autoClose });
    try {
      clock.t = TIP_FIRST_DELAY_MS;
      expect(tips.trigger('arrivals')).toBe(true);
      clock.t += 10 * 60 * 1000;
      expect(tips.tick()).toBe(false);                                           // not asked for: the tip stays until Got it
      expect(tips.current()).toBe('arrivals');
      tips.dismiss();
      clock.t += TIP_GAP_MS;
      autoClose = TIP_AUTO_CLOSE_MS;
      expect(tips.trigger('monthEnd')).toBe(true);
      clock.t += TIP_AUTO_CLOSE_MS - 1;
      expect(tips.tick()).toBe(false);
      expect(tips.current()).toBe('month_summary');
      clock.t += 1;
      expect(tips.tick()).toBe(true);
      expect(tips.current()).toBe(null);
      expect(root.children.length).toBe(0);
      expect(settings.get().seenTips).toEqual(['arrivals', 'month_summary']);
    } finally { cleanup(); }
  });
  it('shows nothing under Help: Off and still shows tips under Tips only', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      r.settings.set({ help: 'off' });
      expect(r.tips.trigger('arrivals')).toBe(false);
      expect(r.tips.trigger('plotsPaused')).toBe(false);
      expect(r.settings.get().seenTips).toEqual([]);
      r.settings.set({ help: 'tips' });
      expect(r.tips.trigger('arrivals')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('keeps every tip short and unique, and lists them all in How to play', async () => {
    const ids = TIPS.map((t) => t.id), triggers = TIPS.map((t) => t.trigger);
    expect(TIPS.length).toBe(20);                                          // Stage 3 adds danger's six
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const t of TIPS) {
      expect(typeof TIP_TEXT[t.id]).toBe('string');
      expect(TIP_TEXT[t.id].split(/\s+/).length).toBeLessThanOrEqual(20);
    }
    const r = await rigUI();
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const items = [...r.root.querySelectorAll('#sheet .tips-list li')].map((li) => li.textContent);
      expect(items).toEqual(TIPS.map((t) => TIP_TEXT[t.id]));
      expect([...r.root.querySelectorAll('#sheet h3')].some((h) => h.textContent === T.tips)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('in the game: plots placed while paused bring the Play tip, and Play pulses until the game runs', async () => {
    const r = await rigUI();
    try {
      const row = r.root.querySelector('#tip');
      expect(r.root.querySelector('#goals').nextElementSibling).toBe(row);
      expect(row.getAttribute('role')).toBe('status');
      expect(r.world.speed).toBe(0);
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9);
      r.ui.placement.pointAt(15, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe('press_play');
      expect(row.textContent).toContain(TIP_TEXT.press_play);
      r.frame(16);
      expect(document.body.classList.contains('nudge-play')).toBe(true);
      r.ui.speedControl.set(1);
      r.frame(32);
      expect(r.ui.tips.current()).toBe(null);                                   // its condition cleared
      expect(document.body.classList.contains('nudge-play')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('in the game: a house sheet, a service placed and an overlay each bring their tip, a held one once the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ width: 1280, height: 800, now: () => t });
    const play = quietFrames(r);
    try {
      settle(r.world, []);                                                     // finish what the test city already meets, so placing raises no goal events
      r.ui.speedControl.set(1);
      t = TIP_FIRST_DELAY_MS;
      r.store.set(select(r.store.get(), buildingAt(r.world, 12, 9).id));
      expect(r.ui.tips.current()).toBe('house_needs');
      r.ui.tips.dismiss();
      play(TIP_GAP_MS);
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe(null);                                   // held while the tool is active
      r.ui.placement.cancel();
      expect(r.ui.tips.current()).toBe('service_reach');
      r.ui.tips.dismiss();
      play(TIP_GAP_MS);
      r.store.set({ overlay: null });
      r.store.set({ overlay: 'food' });
      expect(r.ui.tips.current()).toBe('overlay_keys');
    } finally { r.cleanup(); }
  });
  it('in the game: on a phone a tip about a sheet or the overlay is dropped unseen while that has the guidance row, another tip waits for the row, and one already up steps off the screen until the row is free', async () => {
    let t = 0;
    const r = await rigUI({ width: 390, height: 844, now: () => t, world: runningUiWorld() });
    const play = quietFrames(r);
    const seenTip = (id) => (r.ui.settings.get().seenTips || []).includes(id);
    try {
      settle(r.world, []);
      r.ui.speedControl.set(1);
      t = TIP_FIRST_DELAY_MS;
      r.store.set(select(r.store.get(), buildingAt(r.world, 12, 9).id));
      expect(r.ui.tips.current()).toBe(null);                                   // the house sheet has the screen (spec 6.3)
      r.store.set(back(r.store.get()));
      expect(r.store.get().sheet).toBe(null);
      expect([r.ui.tips.current(), seenTip('house_needs')]).toEqual([null, false]);   // its words are about the sheet: dropped, not shown after it, and still unseen
      r.store.set(openSheet(r.store.get(), 'summary'));
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe(null);                                   // a tip whose words hold without the sheet waits for the row
      r.store.set(back(r.store.get()));
      expect([r.ui.tips.current(), document.body.dataset.guidance]).toEqual(['month_summary', 'tip']);
      r.store.set(openSheet(r.store.get(), 'summary'));                        // a sheet over a tip that is up: off the screen, still current
      expect([r.ui.tips.current(), r.root.querySelector('#tip').children.length, document.body.dataset.guidance]).toEqual(['month_summary', 0, 'none']);
      r.store.set(back(r.store.get()));
      expect([r.root.querySelector('#tip .tip-row .text').textContent, document.body.dataset.guidance]).toEqual([TIP_TEXT.month_summary, 'tip']);   // written again, so it is read again
      r.ui.tips.dismiss();
      play(TIP_GAP_MS);
      r.store.set({ overlay: 'food' });
      expect(r.ui.tips.current()).toBe(null);                                   // the legend has the row
      expect(document.body.dataset.guidance).toBe('legend');
      r.store.set({ overlay: null });
      expect([r.ui.tips.current(), seenTip('overlay_keys')]).toEqual([null, false]);   // not shown once the overlay is off ("Tap ✕ to close" would be false), and still unseen
      expect(r.root.querySelector('#tip').children.length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('in the game: on a paused phone a goal tip waits, so the goal and Show me stay on screen; it shows once the game runs (ruling 176)', async () => {
    let t = 0;
    const calm = uiWorld();                                                    // no problem marker or labour shortage, so only the goal brings a tip
    settle(calm, []);
    Object.values(calm.buildings).find((b) => b.type === 'bazaar').store.grain = 10;
    staffAll(calm);
    calm.labour.shortLevels = [];
    const r = await rigUI({ width: 375, height: 667, now: () => t, world: calm });
    r.renderer.renderFrame = () => {};
    try {
      expect(r.ui.alerts.list().filter((a) => a.id !== undefined || a.code === 'labour_shortage')).toEqual([]);
      t = TIP_FIRST_DELAY_MS;
      expect(r.world.speed).toBe(0);                                           // a new city starts paused (spec 4.1)
      r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
      expect(r.ui.tips.current()).toBe(null);                                   // the goal tip waits
      expect(document.body.dataset.guidance).toBe('caption');                  // the goal's caption has the row for its few seconds
      r.ui.celebrations.clear();
      r.frame(t);
      expect(document.body.dataset.guidance).toBe('goal');
      const showMe = r.root.querySelector('#goals .show-me');
      expect(showMe.getClientRects().length > 0).toBe(true);                   // the goal and Show me are on screen
      r.frame(t + 1000);
      expect(r.ui.tips.current()).toBe(null);                                   // still paused: still waiting
      r.ui.speedControl.set(1);
      r.frame(t + 2000);
      expect([r.ui.tips.current(), document.body.dataset.guidance]).toEqual(['goals_list', 'tip']);   // Play pressed: it shows
    } finally { r.cleanup(); }
    const plots = await rigUI({ width: 375, height: 667 });
    try {
      plots.ui.placement.start({ kind: 'houses' });
      plots.ui.placement.pointAt(14, 9);
      plots.ui.placement.pointAt(15, 9);
      expect(plots.ui.placement.confirm().ok).toBe(true);
      expect(plots.ui.tips.current()).toBe('press_play');                       // the Play tip still shows while paused
    } finally { plots.cleanup(); }
    let tw = 0;
    const wide = await rigUI({ width: 1280, height: 800, now: () => tw });
    try {
      tw = TIP_FIRST_DELAY_MS;
      wide.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
      expect(wide.ui.tips.current()).toBe('goals_list');                        // a wide screen keeps every row: no wait
    } finally { wide.cleanup(); }
  });
  it('in the game: arrivals, a month end, a goal, a demolish and a labour shortage each bring their tip, three minutes of play apart', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t, world: runningUiWorld() });
    const play = quietFrames(r);
    try {
      settle(r.world, []);
      r.ui.speedControl.set(1);
      t = TIP_FIRST_DELAY_MS;
      const brings = (id, act) => { play(TIP_GAP_MS); act(); expect(r.ui.tips.current()).toBe(id); r.ui.tips.dismiss(); };
      brings('arrivals', () => r.ui.onEvents([{ type: 'arrivals', count: 2 }]));
      brings('month_summary', () => r.ui.onEvents([{ type: 'month' }]));
      brings('goals_list', () => r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]));
      brings('undo_demolish', () => expect(r.ui.placement.demolishOne(24, 11).ok).toBe(true));
      const bazaar = Object.values(r.world.buildings).find((b) => b.type === 'bazaar');
      bazaar.store.grain = 10;                                                 // the empty bazaar's and the short-staffed buildings' badges go,
      staffAll(r.world);                                                       // so the labour shortage is the only thing that can bring a tip
      brings('more_workers', () => { r.world.labour.shortLevels = ['essential']; r.ui.refresh(); });
    } finally { r.cleanup(); }
  });
  it('in the game: the first problem marker and the labour shortage still bring their tip when they came inside the gap and are still there', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    const play = quietFrames(r);
    try {
      settle(r.world, []);
      Object.values(r.world.buildings).find((b) => b.type === 'bazaar').store.grain = 10;
      staffAll(r.world);
      r.world.labour.shortLevels = [];
      r.ui.refresh();                                                          // a clean city: no marker, no shortage yet
      expect(r.ui.alerts.list().filter((a) => a.id !== undefined)).toEqual([]);
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9);
      r.ui.placement.pointAt(15, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe('press_play');                          // the Play tip starts the 3-minute gap
      r.ui.speedControl.set(1);
      expect(r.ui.tips.current()).toBe(null);
      r.ui.placement.cancel();                                                 // the plots tool stays active after a ✓: a tip waits for it to close
      play(60000);
      addRaw(r.world, 'well', 20, 20);                                         // a well with no road beside it: a marker appears inside the gap
      r.world.labour.shortLevels = ['essential'];                              // and so does a labour shortage
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe(null);
      play(TIP_GAP_MS - 60000 - 1000);
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe(null);                                  // one second of the gap left
      play(1000);
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe('problem_marker');                      // the gap is over and the marker is still there
      r.ui.tips.dismiss();
      play(TIP_GAP_MS);
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe('more_workers');                        // and so is the shortage
    } finally { r.cleanup(); }
  });
  it('in the game: time with the game paused does not count toward the gap between tips', async () => {
    let t = 0;
    const r = await rigUI({ width: 1280, height: 800, now: () => t });          // wide: on a paused phone the tip would wait for Play (ruling 176)
    const play = quietFrames(r);
    try {
      t = TIP_FIRST_DELAY_MS;
      r.ui.onEvents([{ type: 'arrivals', count: 2 }]);
      expect(r.ui.tips.current()).toBe('arrivals');
      r.ui.tips.dismiss();
      t += 60 * 60 * 1000;                                                     // an hour on the wall clock, paused
      play(10 * 60 * 1000);
      expect(r.world.speed).toBe(0);
      expect(r.ui.tips.trigger('monthEnd')).toBe(false);
      r.ui.speedControl.set(1);
      play(TIP_GAP_MS - 1000);
      expect(r.ui.tips.trigger('monthEnd')).toBe(false);                       // three minutes less a second of play
      play(1000);
      expect(r.ui.tips.trigger('monthEnd')).toBe(true);
      r.ui.tips.dismiss();
      r.ui.speedControl.set(0);
      play(TIP_GAP_MS);                                                        // paused again: the count stops again
      expect(r.ui.tips.trigger('goalDone')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('in the game: Help: Off takes a tip that is showing away, and nothing shows until Help is on again', async () => {
    const r = await rigUI();
    try {
      r.ui.tips.trigger('plotsPaused');
      r.frame(16);
      expect(r.ui.tips.current()).toBe('press_play');
      expect(document.body.classList.contains('nudge-play')).toBe(true);
      r.ui.settings.set({ help: 'off' });
      r.frame(32);
      expect(r.ui.tips.current()).toBe(null);
      expect(r.root.querySelector('#tip').children.length).toBe(0);
      expect(document.body.classList.contains('nudge-play')).toBe(false);
      expect(r.ui.tips.trigger('plotsPaused')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('in the game: the tip row is a live region with no height until a tip shows, then stays above the middle of the map', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        const tip = r.root.querySelector('#tip'), bar = r.root.querySelector('#under-bar'), goals = r.root.querySelector('#goals');
        expect(tip.getAttribute('aria-live')).toBe('polite');
        expect(getComputedStyle(tip).display === 'none').toBe(false);          // rendered while empty, so a screen reader announces the first tip
        expect(tip.getBoundingClientRect().height).toBeLessThan(2);
        expect(Math.abs(bar.getBoundingClientRect().bottom - goals.getBoundingClientRect().bottom)).toBeLessThan(0.5);   // no gap while empty
        const before = document.activeElement;
        expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
        expect(document.activeElement).toBe(before);                           // announced, never focused
        const row = tip.querySelector('.tip-row');
        expect(row.getBoundingClientRect().top).toBeGreaterThanOrEqual(goals.getBoundingClientRect().bottom);   // under the goals strip
        expect(bar.getBoundingClientRect().bottom).toBeLessThan(h * 0.45);     // nothing over the middle of the map
        const got = row.querySelector('.got-it').getBoundingClientRect();
        expect(got.width).toBeGreaterThanOrEqual(44);
        expect(got.height).toBeGreaterThanOrEqual(44);
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(w);
        expect(getComputedStyle(row).backgroundColor).toBe('rgb(207, 230, 226)');   // ink and the muted label on teal-soft: both pairs are in TEXT_PAIRS (4.5:1)
        expect(getComputedStyle(row.querySelector('.text')).color).toBe('rgb(43, 31, 14)');
        expect(getComputedStyle(row.querySelector('.label')).color).toBe('rgb(90, 72, 50)');
        expect(TOKENS.tealSoft).toBe('#CFE6E2');
      } finally { r.cleanup(); }
    }
  });
  it('in the game: Got it with keyboard focus hands it to Show me in the strip', async () => {
    const r = await rigUI();
    try {
      r.ui.tips.trigger('plotsPaused');
      const gotIt = r.root.querySelector('#tip .got-it');
      gotIt.focus();
      expect(document.activeElement).toBe(gotIt);
      fire(gotIt, 'click');
      expect(r.ui.tips.current()).toBe(null);
      expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));
    } finally { r.cleanup(); }
  });
  it('in the game: on a phone every tip is two lines at most on screen, whole in the live region, with the Tip label kept for screen readers only at larger text', async () => {
    const worst = [];
    for (const [w, h] of [[360, 640], [390, 844], [740, 360]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          const settings = r.ui.settings;
          const clock = { t: 0 };
          const tips = createTips({ container: r.root.querySelector('#tip'), settings, now: () => clock.t });
          document.body.dataset.guidance = 'tip';                              // as createUI names the row while a tip has it
          for (const tip of TIPS) {
            settings.set({ seenTips: [] });
            clock.t += 3600 * 1000;
            expect(tips.trigger(tip.trigger)).toBe(true);
            const row = r.root.querySelector('#tip .tip-row'), text = row.querySelector('.text'), label = row.querySelector('.label');
            const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
            const lines = Math.round(text.getBoundingClientRect().height / lineHeight);
            if (lines > 2) worst.push(`${w}x${h} at ${size}%: ${tip.id} is ${lines} lines`);
            expect(text.textContent).toBe(TIP_TEXT[tip.id]);                    // cut on screen at most, whole for screen readers (How to play lists it too)
            if (size > 100) {
              expect(parseFloat(getComputedStyle(text).fontSize)).toBeLessThan(16 * size / 100);   // 14 px scaled, not the body size
              expect(label.textContent).toBe(T.tip);                           // still in the live region
              expect(label.getBoundingClientRect().width).toBeLessThan(2);     // but not on screen
            }
            expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(w);
            expect(row.querySelector('.got-it').getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            tips.dismiss();
          }
        } finally { r.cleanup(); }
      }
    }
    expect(worst).toEqual([]);
  });
  it('in the game: a tip closes itself after 20 s of unpaused play on a phone, at any text size, and nowhere else', async () => {
    expect(TIP_AUTO_CLOSE_MS).toBe(20000);
    for (const [w, h, size, closes] of [[360, 640, 100, true], [360, 640, 150, true], [740, 360, 100, true], [740, 360, 125, true], [390, 844, 125, true], [1280, 800, 100, false], [1280, 800, 150, false]]) {
      let t = 0;
      const r = await rigUI({ width: w, height: h, now: () => t });
      const frames = quietFrames(r);                                           // frames a second apart, as the game draws them
      try {
        r.ui.settings.set({ textSize: size });
        t = TIP_FIRST_DELAY_MS;
        r.world.speed = 1;                                                     // running (set directly: a speed command would count as an action)
        expect(r.ui.tips.trigger('arrivals')).toBe(true);
        frames(TIP_AUTO_CLOSE_MS - 1000);
        expect(r.ui.tips.current()).toBe('arrivals');                          // not yet, anywhere
        frames(1000);
        expect([w, size, r.ui.tips.current()]).toEqual([w, size, closes ? null : 'arrivals']);
        expect(r.ui.settings.get().seenTips).toEqual(['arrivals']);            // closed or not, it stays seen
      } finally { r.cleanup(); }
    }
  });
  it('in the game: a paused game, a sheet over the tip or a hidden tab never closes a tip unread, since only unpaused frames with it on screen count', async () => {
    let t = 0;                                                                 // the page clock and the frame times agree, as in a browser
    const r = await rigUI({ width: 360, height: 640, now: () => t });
    r.renderer.renderFrame = () => {};
    const frameAt = (ms) => { t = ms; r.frame(t); };
    try {
      frameAt(TIP_FIRST_DELAY_MS);
      expect(r.ui.tips.trigger('arrivals')).toBe(true);
      for (let i = 0; i < 60; i++) frameAt(t + 1000);                          // a minute paused
      expect(r.ui.tips.current()).toBe('arrivals');
      r.world.speed = 1;
      frameAt(t + 1000); frameAt(t + 1000);                                    // two seconds running
      frameAt(t + 10 * 60 * 1000);                                             // then the tab is hidden for ten minutes: no frames, one late one
      expect(r.ui.tips.current()).toBe('arrivals');                            // that late frame counts a second, no more
      r.store.set(openSheet(r.store.get(), 'summary'));
      for (let i = 0; i < 60; i++) frameAt(t + 1000);                          // a minute running with a sheet over the tip
      expect(r.ui.tips.current()).toBe('arrivals');
      r.store.set(back(r.store.get()));
      for (let i = 0; i < 16; i++) frameAt(t + 1000);
      expect(r.ui.tips.current()).toBe('arrivals');                            // 19 s on screen and running
      frameAt(t + 1000);
      expect(r.ui.tips.current()).toBe(null);                                  // 20 s: now it closes
    } finally { r.cleanup(); }
  });
  it('in the game: the Play tip stays while the game is paused, however long, and its ring with it until Play is pressed', async () => {
    const emptyPlots = () => { const w = uiWorld(); for (const h of housesOf(w)) { h.residents = 0; h.tier = 0; } return w; };
    const ring = () => document.body.classList.contains('nudge-play');
    for (const [w, h] of [[360, 640], [844, 390]]) {
      const r = await rigUI({ width: w, height: h, world: emptyPlots() });
      const frames = quietFrames(r);
      try {
        r.ui.settings.set({ textSize: 150 });
        expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
        frames(5 * 60 * 1000);
        expect([w, r.ui.tips.current(), ring()]).toEqual([w, 'press_play', true]);   // paused: no play time passes, so it never closes itself
        r.ui.speedControl.set(1);
        frames(1000);
        expect([w, r.ui.tips.current(), ring()]).toEqual([w, null, false]);          // Play pressed: its condition cleared
      } finally { r.cleanup(); }
    }
  });
  it('in the game: on a phone Esc closes a tip on screen first, and goes Back after that; never ahead of an open sheet', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      r.store.set({ dock: 'tray' });
      fire(r.root, 'keydown', { key: 'Escape' });
      expect([r.ui.tips.current(), r.store.get().dock]).toEqual([null, 'tray']);   // the tip went, the tray stayed
      fire(r.root, 'keydown', { key: 'Escape' });
      expect(r.store.get().dock === 'tray').toBe(false);                       // then Back closes the tray
      expect(r.ui.settings.get().seenTips).toEqual(['press_play']);
      r.ui.settings.set({ seenTips: [] });
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      r.store.set(openSheet(r.store.get(), 'summary'));                        // the tip is off the screen under the sheet
      fire(r.root, 'keydown', { key: 'Escape' });
      expect([r.store.get().sheet, r.ui.tips.current()]).toEqual([null, 'press_play']);   // Esc closed the sheet; the tip is back
    } finally { r.cleanup(); }
  });
  it('in the game: on a wide screen Esc goes Back as it always did, and leaves a tip to Got it', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      r.store.set(openSheet(r.store.get(), 'summary'));
      fire(r.root, 'keydown', { key: 'Escape' });
      expect([r.store.get().sheet, r.ui.tips.current()]).toEqual([null, 'press_play']);   // the sheet went first, the tip stayed
      fire(r.root, 'keydown', { key: 'Escape' });
      expect(r.ui.tips.current()).toBe('press_play');
    } finally { r.cleanup(); }
  });
  it('in the game: on a phone keyboard focus follows the guidance row when a caption, a tip, the legend or a sheet takes it, and comes back to Show me', async () => {
    let t = 0;
    const r = await rigUI({ width: 375, height: 667, now: () => t, world: runningUiWorld() });
    r.renderer.renderFrame = () => {};
    const visible = (n) => Boolean(n) && n !== document.body && n.isConnected && n.getClientRects().length > 0;
    const showMe = () => r.root.querySelector('#goals .show-me');
    try {
      settle(r.world, []);
      showMe().focus();
      expect(document.activeElement).toBe(showMe());
      r.ui.celebrations.show({ tier: 'first', text: 'Lay a road', reward: 25 });   // a caption takes the row: the strip hides
      expect(document.body.dataset.guidance).toBe('caption');
      expect(visible(document.activeElement)).toBe(true);                      // focus went somewhere on screen, not to the page
      expect(r.root.querySelector('#goals').contains(document.activeElement)).toBe(false);
      r.ui.celebrations.clear();                                               // the caption ends: the goal is back, and focus with it
      expect([document.body.dataset.guidance, document.activeElement === showMe()]).toEqual(['goal', true]);
      t = TIP_FIRST_DELAY_MS;
      r.ui.onEvents([{ type: 'arrivals', count: 2 }]);                         // a tip takes the row: focus goes to its Got it
      expect(r.ui.tips.current()).toBe('arrivals');
      expect(['got it', document.activeElement === r.root.querySelector('#tip .got-it')]).toEqual(['got it', true]);
      r.ui.celebrations.show({ tier: 'first', text: 'Place 6 housing plots', reward: 25 });   // waits behind the tip
      fire(document.activeElement, 'click');                                  // Got it: the caption comes first,
      expect(document.body.dataset.guidance).toBe('caption');
      expect(visible(document.activeElement)).toBe(true);                      // and focus is somewhere on screen
      r.ui.celebrations.clear();
      expect(['after the caption', document.activeElement === showMe()]).toEqual(['after the caption', true]);   // then the goal, and Show me has it again
      r.store.set({ overlay: 'food' });                                        // the legend takes the row: its ✕ has focus
      expect(['legend', document.activeElement === r.root.querySelector('#legend .close')]).toEqual(['legend', true]);
      r.store.set({ overlay: null });
      expect(['legend off', document.activeElement === showMe()]).toEqual(['legend off', true]);
      fire(r.root.querySelector('#goals .open-goals'), 'click');               // the words open the Goals sheet: focus goes into it
      expect(r.store.get().sheet.kind).toBe('goals');
      expect(r.root.querySelector('#sheet').contains(document.activeElement)).toBe(true);
      r.store.set(back(r.store.get()));
      expect(['sheet closed', document.activeElement === showMe()]).toEqual(['sheet closed', true]);
    } finally { r.cleanup(); }
  });
  it('in the game: destroying the interface empties the tip row and the Play ring', async () => {
    const r = await rigUI();
    try {
      r.ui.tips.trigger('plotsPaused');
      r.frame(16);
      expect(r.root.querySelector('#tip').children.length).toBe(1);
      r.ui.destroy();
      expect(r.root.querySelector('#tip').children.length).toBe(0);
      expect(r.root.querySelector('#goals').children.length).toBe(0);          // the strip and the nudge line
      expect(document.body.classList.contains('nudge-play')).toBe(false);
    } finally { r.cleanup(); }
  });
});
