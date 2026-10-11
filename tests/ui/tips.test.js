import { describe, it, expect } from '../harness.js';
import { createTips } from '../../src/ui/tips.js';
import { createSettings } from '../../src/ui/settings.js';
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { settle } from '../../src/sim/settle.js';
import { buildingAt } from '../../src/sim/world.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { TIP_TEXT, T } from '../../src/ui/text.js';
import { TOKENS } from '../../src/ui/theme.js';
import { fakeLocal } from '../helpers/fakeStorage.js';
import { mount, fire } from '../helpers/dom.js';
import { addRaw, staffAll } from '../helpers/testWorld.js';
import { rigUI } from '../helpers/uiWorld.js';

// Tips on a clock the test moves; the session starts at t = 0.
function rig(storage = fakeLocal()) {
  const { root, cleanup } = mount();
  const settings = createSettings({ storage, root, systemReducedMotion: () => false });
  const clock = { t: 0 };
  const tips = createTips({ container: root, settings, now: () => clock.t });
  return { root, settings, storage, clock, tips, cleanup };
}
const shownText = (root) => { const n = root.querySelector('.tip-row .text'); return n ? n.textContent : null; };

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
    expect(TIPS.length).toBe(10);
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
    try {
      settle(r.world, []);                                                     // finish what the test city already meets, so placing raises no goal events
      t = TIP_FIRST_DELAY_MS;
      r.store.set(select(r.store.get(), buildingAt(r.world, 12, 9).id));
      expect(r.ui.tips.current()).toBe('house_needs');
      r.ui.tips.dismiss();
      t += TIP_GAP_MS;
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe(null);                                   // held while the tool is active
      r.ui.placement.cancel();
      expect(r.ui.tips.current()).toBe('service_reach');
      r.ui.tips.dismiss();
      t += TIP_GAP_MS;
      r.store.set({ overlay: null });
      r.store.set({ overlay: 'food' });
      expect(r.ui.tips.current()).toBe('overlay_keys');
    } finally { r.cleanup(); }
  });
  it('in the game: arrivals, a month end, a goal, a demolish, a labour shortage and the first problem marker each bring their tip', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    try {
      settle(r.world, []);
      const hour = 3600 * 1000;                                                // an hour apart, so only the trigger decides
      const brings = (id, act) => { t += hour; act(); expect(r.ui.tips.current()).toBe(id); r.ui.tips.dismiss(); };
      brings('arrivals', () => r.ui.onEvents([{ type: 'arrivals', count: 2 }]));
      brings('month_summary', () => r.ui.onEvents([{ type: 'month' }]));
      brings('goals_list', () => r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]));
      brings('undo_demolish', () => expect(r.ui.placement.demolishOne(24, 11).ok).toBe(true));
      r.world.labour.shortLevels = [];                                         // the test city is short of workers from the start: clear it, so the next one is a first
      r.ui.refresh();
      brings('more_workers', () => { r.world.labour.shortLevels = ['essential']; r.ui.refresh(); });
      const bazaar = Object.values(r.world.buildings).find((b) => b.type === 'bazaar');
      bazaar.store.grain = 10;                                                 // the empty bazaar's and the short-staffed buildings' badges go,
      staffAll(r.world);                                                       // so the next one is a first
      r.ui.refresh();
      expect(r.ui.alerts.list().filter((a) => a.id !== undefined)).toEqual([]);
      brings('problem_marker', () => { addRaw(r.world, 'well', 20, 20); r.ui.refresh(); });   // a well with no road beside it
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
