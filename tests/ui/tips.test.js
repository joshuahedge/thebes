import { describe, it, expect } from '../harness.js';
import { createTips } from '../../src/ui/tips.js';
import { createSettings } from '../../src/ui/settings.js';
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS, TIP_HELD_MAX_MS, TIP_AUTO_CLOSE_MS } from '../../src/data/tips.js';
import { GUIDE_GOALS } from '../../src/data/goals.js';
import { settle } from '../../src/sim/settle.js';
import { setGuide } from '../../src/sim/commands.js';
import { buildingAt, housesOf } from '../../src/sim/world.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { TIP_TEXT, T } from '../../src/ui/text.js';
import { TOKENS } from '../../src/ui/theme.js';
import { fakeLocal } from '../helpers/fakeStorage.js';
import { mount, fire } from '../helpers/dom.js';
import { addRaw, staffAll } from '../helpers/testWorld.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';

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
    expect(TIPS.length).toBe(14);
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
    const r = await rigUI({ now: () => t });
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
  it('in the game: arrivals, a month end, a goal, a demolish and a labour shortage each bring their tip, three minutes of play apart', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
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
    const r = await rigUI({ now: () => t });
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
  it('in the game: on a phone at 125% and 150% text every tip is three lines or fewer, with the Tip label kept for screen readers only', async () => {
    const worst = [];
    for (const [w, h] of [[360, 640], [740, 360]]) {
      for (const size of [125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          setGuide(r.world, true);
          r.world.guide.done = false;
          let tallest = 0, tallestAt = 0;                                      // the tallest guide strip: each guided step in turn
          GUIDE_GOALS.forEach((id, i) => {
            r.world.goals.completed = GUIDE_GOALS.slice(0, i);
            r.ui.refresh();
            const bottom = r.root.querySelector('#goals').getBoundingClientRect().bottom;
            if (bottom > tallest) { tallest = bottom; tallestAt = i; }
          });
          r.world.goals.completed = GUIDE_GOALS.slice(0, tallestAt);
          r.ui.refresh();
          const settings = r.ui.settings;
          const clock = { t: 0 };
          const tips = createTips({ container: r.root.querySelector('#tip'), settings, now: () => clock.t });
          for (const tip of TIPS) {
            settings.set({ seenTips: [] });
            clock.t += 3600 * 1000;
            expect(tips.trigger(tip.trigger)).toBe(true);
            const row = r.root.querySelector('#tip .tip-row'), text = row.querySelector('.text'), label = row.querySelector('.label');
            const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
            const lines = Math.round(text.getBoundingClientRect().height / lineHeight);
            const cs = getComputedStyle(row);
            const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((n, k) => n + parseFloat(cs[k]), 0);
            if (lines > 3 || row.getBoundingClientRect().height - chrome > 3 * lineHeight + 1) worst.push(`${w}x${h} at ${size}%: ${tip.id} is ${lines} lines`);
            expect(parseFloat(getComputedStyle(text).fontSize)).toBeLessThan(16 * size / 100);   // 14 px scaled, not the body size
            expect(label.textContent).toBe(T.tip);                             // still in the live region
            expect(label.getBoundingClientRect().width).toBeLessThan(2);       // but not on screen
            expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(w);
            expect(row.querySelector('.got-it').getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
            tips.dismiss();
          }
        } finally { r.cleanup(); }
      }
    }
    expect(worst).toEqual([]);
  });
  it('in the game: a tip closes itself after 15 s on a phone at 125% or 150% text, and nowhere else', async () => {
    expect(TIP_AUTO_CLOSE_MS).toBe(15000);
    for (const [w, h, size, closes] of [[360, 640, 125, true], [360, 640, 150, true], [740, 360, 125, true], [740, 360, 150, true], [360, 640, 100, false], [740, 360, 100, false], [1280, 800, 125, false], [1280, 800, 150, false]]) {
      const r = await rigUI({ width: w, height: h });
      const frames = quietFrames(r);                                           // frames a second apart, as the game draws them
      try {
        r.ui.settings.set({ textSize: size });
        expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
        frames(TIP_AUTO_CLOSE_MS - 1000);
        expect(r.ui.tips.current()).toBe('press_play');                        // not yet, anywhere
        frames(1000);
        expect(r.ui.tips.current()).toBe(closes ? null : 'press_play');
        expect(r.ui.settings.get().seenTips).toEqual(['press_play']);          // closed or not, it stays seen
        frames(10 * 60 * 1000);
        expect(r.ui.tips.current()).toBe(closes ? null : 'press_play');
        expect(document.body.classList.contains('nudge-play')).toBe(!closes);  // the test city has people: the Play ring goes with the tip
      } finally { r.cleanup(); }
    }
  });
  it('in the game: a hidden tab never closes an unread tip, since only the frames drawn count towards its 15 s', async () => {
    let t = 0;                                                                 // the page clock and the frame times agree, as in a browser
    const r = await rigUI({ width: 360, height: 640, now: () => t });
    r.renderer.renderFrame = () => {};
    const frameAt = (ms) => { t = ms; r.frame(t); };
    try {
      r.ui.settings.set({ textSize: 150 });
      frameAt(0);
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      frameAt(1000); frameAt(2000);                                            // two seconds on screen
      frameAt(2000 + 10 * 60 * 1000);                                          // then the tab is hidden for ten minutes: no frames, one late one
      expect(r.ui.tips.current()).toBe('press_play');                          // that late frame counts a second, no more
      for (let i = 0; i < 11; i++) frameAt(t + 1000);
      expect(r.ui.tips.current()).toBe('press_play');                          // 14 s seen
      frameAt(t + 1000);
      expect(r.ui.tips.current()).toBe(null);                                  // 15 s seen: now it closes
    } finally { r.cleanup(); }
  });
  it('in the game: once the Play tip has closed itself unread, the Play ring stays while the game is paused with plots and no family', async () => {
    const emptyPlots = () => { const w = uiWorld(); for (const h of housesOf(w)) { h.residents = 0; h.tier = 0; } return w; };
    const ring = () => document.body.classList.contains('nudge-play');
    let r = await rigUI({ width: 360, height: 640, world: emptyPlots() });
    let frames = quietFrames(r);
    try {
      r.ui.settings.set({ textSize: 125 });
      expect(r.ui.tips.trigger('plotsPaused')).toBe(true);
      frames(TIP_AUTO_CLOSE_MS);
      expect(r.ui.tips.current()).toBe(null);                                  // closed itself, unread
      expect(ring()).toBe(true);                                               // but Play still asks to be pressed
      frames(5 * 60 * 1000);
      expect(ring()).toBe(true);                                               // as long as nothing changes
      r.ui.speedControl.set(1);
      frames(1000);
      expect(ring()).toBe(false);                                              // Play pressed: it goes
      r.ui.speedControl.set(0);
      frames(1000);
      expect(ring()).toBe(false);                                              // and never comes back to nag
    } finally { r.cleanup(); }
    r = await rigUI({ width: 360, height: 640, world: emptyPlots() });
    frames = quietFrames(r);
    try {
      r.ui.settings.set({ textSize: 150 });
      r.ui.tips.trigger('plotsPaused');
      frames(TIP_AUTO_CLOSE_MS);
      expect(ring()).toBe(true);
      housesOf(r.world)[0].residents = 2;                                      // a family arrived (as a day's arrivals would bring)
      frames(1000);
      expect(ring()).toBe(false);
    } finally { r.cleanup(); }
    r = await rigUI({ width: 360, height: 640, world: emptyPlots() });
    frames = quietFrames(r);
    try {
      r.ui.settings.set({ textSize: 150 });
      r.ui.tips.trigger('plotsPaused');
      frames(2000);
      r.ui.tips.dismiss();                                                     // read and closed with Got it: no ring held
      frames(1000);
      expect(ring()).toBe(false);
      r.ui.settings.set({ seenTips: [] });
      r.ui.tips.trigger('plotsPaused');
      frames(TIP_AUTO_CLOSE_MS);
      expect(ring()).toBe(true);
      r.ui.settings.set({ help: 'off' });                                      // Help: Off silences it
      frames(1000);
      expect(ring()).toBe(false);
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
