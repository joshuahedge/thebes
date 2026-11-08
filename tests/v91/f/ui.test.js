// Version 9.1 Track F, the page (design 2d, 2e, 2f, 2g, 3a, 3b; rulings 1657-1669): in the lesson the banner carries only the step's own alert; the road step's
// diamond and ghost stand above the dimming; the months light the gold and the mood; the raid step plays at 2x and says so before its raiders come, and the game is
// back at 1x for the hand-over; the hand-over's first month holds a tip while an alert and a goal are both up; Messages keep news, not the player's own taps (P7);
// the first own city starts on the classic river at Normal; I've played before starts a city in one tap; the story is told once.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, LESSON_PLACES, LESSON_RAID_LEAD, LESSON_RAID_SPEED, LESSON_RAID_WAIT_SPEED } from '../../../src/data/lesson.js';
import { spotsOn } from '../../../src/ui/s47/spots.js';
import { LESSON_SCRIPT, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { paintHouses } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { DEFAULT_MAP_SIZE } from '../../../src/data/map.js';
import { BEAT_MS, OWN_ALERTS } from '../../../src/ui/v60/lesson.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { V91F_TEXT, T } from '../../../src/ui/text.js';
import { createTips } from '../../../src/ui/tips.js';
import { dueCards } from '../../../src/ui/cardMoments.js';
import { firstCityLayout, showcaseFrame, showcaseBox, driftPoints } from '../../../src/ui/titleCard.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { TITLE_SEED } from '../../../src/data/ui.js';
import { createCamera, tileToScreen } from '../../../src/render/camera.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { dockCard, stepCard } from '../../helpers/lesson.js';
import { pageAt, frame, memory } from '../../v711/lessonPage.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { for (let t = 0; t < ms; t += 50) { if (fn()) return true; await wait(50); } return fn(); }
const shown = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
const bannerRows = (root) => [...root.querySelectorAll('#banner > .critical')].filter(shown);
const step = (id) => LESSON_STEPS.find((s) => s.id === id);
// Version 9.2 (Track L, ruling 1755): the lesson ends on a card; Keep building this city is what hands the city over (it was a timer).
async function keepIt(s) {
  await waitFor(() => Boolean(s.root.querySelector('#sheet .lesson-keep')), 3000);
  const k = s.root.querySelector('#sheet .lesson-keep');
  if (k) k.click();
}

describe('v91 f ui: the banner in the lesson (ruling 1658)', () => {
  it('a city whose root names no lesson alerts shows every critical as before; an empty list shows none, and the alert stays in the list', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.gold = -20;                                                                // debt: a critical alert
      r.ui.refresh();
      expect(bannerRows(document.body).map((n) => n.dataset.code)).toEqual(['debt']);
      document.body.dataset.lessonAlerts = '';
      r.ui.refresh();
      expect([bannerRows(document.body).length, r.ui.alerts.list().some((a) => a.code === 'debt')]).toEqual([0, true]);
      document.body.dataset.lessonAlerts = 'debt';
      r.ui.refresh();
      expect(bannerRows(document.body).length).toBe(1);
    } finally { delete document.body.dataset.lessonAlerts; r.cleanup(); }
  });

  it('names only the step\'s own codes on the root, at every step: the fire\'s at the fire step, the raid\'s in the defence chapter, none elsewhere', async () => {
    const s = await pageAt('road', { width: 1280, height: 800 });
    try {
      const g = s.g();
      const seen = [];
      for (let i = 0; i < LESSON_LENGTH; i++) {
        const st = LESSON_STEPS[i];
        seen.push([st.id, document.body.dataset.lessonAlerts, bannerRows(s.root).length <= 1]);
        dockCard(s.root);
        await frame();
        g.ui.placement.cancel();
        LESSON_SCRIPT[st.id](g.world, s.io);
        await frame();
      }
      expect(seen).toEqual(LESSON_STEPS.map((st) => [st.id, (OWN_ALERTS[st.id] || []).join(' '), true]));
    } finally { s.cleanup(); }
  });
});

describe('v91 f ui: where the road begins (ruling 1664)', () => {
  it('at 375x667 the road step\'s diamond and ghost stand above the dimming, on the screen with the ring, and hide under the card', async () => {
    const s = await pageAt('road', { width: 375, height: 667 });
    try {
      const mark = s.root.querySelector('.lesson-road-mark');
      expect([Boolean(stepCard(s.root)), Boolean(mark), mark && mark.style.display]).toEqual([true, true, 'none']);
      dockCard(s.root);
      s.g().ui.placement.cancel();
      s.g().ui.cameraControl.tick(1e9);                                                  // (the rig's game loop does not run: let the step's glide end)
      await frame(); await frame();
      const ring = s.root.querySelector('.lesson-ring'), scrim = s.root.querySelector('.lesson-scrim');
      const kids = [...mark.parentElement.children];
      expect([mark.style.display, shown(ring), kids.indexOf(mark) > kids.indexOf(scrim)]).toEqual(['', true, true]);
      const [halo, line, dHalo, diamond] = mark.querySelectorAll('polygon');
      // In the page's own box (the test shell stands off the screen): the diamond whole under the top bar, the ring's middle on the screen (at 375 px it is nearly as wide).
      const o = s.root.getBoundingClientRect(), rel = (n) => { const b = n.getBoundingClientRect(); return { left: b.left - o.left, right: b.right - o.left, top: b.top - o.top, bottom: b.bottom - o.top, width: b.width }; };
      const box = rel(diamond), r = rel(ring), bar = rel(s.root.querySelector('#topbar'));
      const inView = (b) => (b.width > 0 && b.left >= 0 && b.right <= 375 && b.top >= bar.bottom && b.bottom <= 667) || `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}`;
      const midIn = (b) => { const x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2; return (x > 0 && x < 375 && y > bar.bottom && y < 667) || `${Math.round(x)},${Math.round(y)}`; };
      expect([r.left >= -0.5 && r.right <= 375.5 || `${Math.round(r.left)}..${Math.round(r.right)}`]).toEqual([true]);   // the long ring whole too (ruling 821)
      expect([inView(box), midIn(r), line.getAttribute('stroke-dasharray'), halo.getAttribute('points') === line.getAttribute('points'), dHalo.getAttribute('points') === diamond.getAttribute('points')]).toEqual([true, true, '7 5', true, true]);
      expect(s.root.querySelector('#lesson .text').textContent).toBe(V91F_TEXT.roadDo);
      LESSON_SCRIPT.road(s.g().world, s.io);
      await frame();
      expect(mark.style.display).toBe('none');                                           // gone with the step
    } finally { s.cleanup(); }
  });

  it('the first card says its chapter\'s why, not the title\'s story again (ruling 1667), and still offers I\'ve played before', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const card = stepCard(s.root);
      expect([card.querySelector('.lc-words').textContent, card.querySelector('.lc-skip').hidden]).toEqual([`${V81T_TEXT.chapters.roads.why} ${V91F_TEXT.roadDo}`, false]);
    } finally { s.cleanup(); }
  });
});

describe('v91 f ui: the months and the raid (rulings 1657, 1665)', () => {
  it('the month step lights the gold and the mood, both live, and Ipi says where mood\'s why is', async () => {
    const s = await pageAt('month', { width: 390, height: 844 });
    try {
      dockCard(s.root);
      await frame(); await frame();
      const gold = s.root.querySelector('#topbar .stat.gold'), mood = s.root.querySelector('#topbar .stat.mood');
      expect([gold.classList.contains('lesson-lit'), mood.classList.contains('lesson-lit'), gold.hasAttribute('data-locked'), mood.hasAttribute('data-locked')]).toEqual([true, true, false, false]);
      expect(s.root.querySelector('#lesson .ipi-why').textContent).toBe(V91F_TEXT.monthWhy);
    } finally { s.cleanup(); }
  });

  // Ruling 1671: the raid step's wait at 3x until the raiders arrive, the fight at 2x, then 1x for the hand-over; each said before Play.
  const toRaid = async (s) => {
    const g = s.g();
    dockCard(s.root);
    await frame();
    g.ui.placement.cancel();
    LESSON_SCRIPT.tower(g.world, s.io);
    await frame();
    return g;
  };
  it('the raid step plays its wait at 3x and its fight at 2x and says so before its raiders come; the raid over, the game is at 1x and the city is handed over at the rank its people earned', async () => {
    const s = await pageAt('tower', { width: 390, height: 844 });
    try {
      const g = await toRaid(s);
      const w = g.world.raid.warning;
      expect([s.root.querySelector('#lesson').dataset.step, g.world.speed, w.arrives - w.day, s.root.querySelector('#lesson .ipi-why').textContent]).toEqual(['raid', LESSON_RAID_WAIT_SPEED, LESSON_RAID_LEAD, V91F_TEXT.raidFast]);
      for (let d = 0; d < 200 && !g.world.raid.active && !g.world.raid.last; d++) s.io.tick();
      expect([Boolean(g.world.raid.active), g.world.speed]).toEqual([true, LESSON_RAID_SPEED]);   // the raiders are on the map: 2x
      for (let d = 0; d < 200 && !g.world.raid.last; d++) s.io.tick();
      await frame();
      expect([Boolean(g.world.raid.last), g.world.speed <= 1]).toEqual([true, true]);   // Version 9.2 (ruling 1755): the end card holds the game (was: 1x, then the timed hand-over)
      await keepIt(s);
      expect(await waitFor(() => !s.api.game().lesson, BEAT_MS + 3000)).toBe(true);
      const h = s.api.game();
      expect([h.world.milestone, h.world.lessonCards, h.world.raid.clockDay, Number.isInteger(h.world.handOverDay), h.world.speed <= 1]).toEqual(['village', ['tower'], null, true, true]);
      expect([document.body.classList.contains('handover-month'), h.ui.tray.unread(), document.body.dataset.lessonAlerts]).toEqual([true, 0, undefined]);
      expect(dueCards(h.world, JSON.parse(s.storage.data['thebes.settings']).seenTips)).toEqual([]);   // no picture card the lesson taught opens over the hand-over (the Large plot's)
    } finally { s.cleanup(); }
  });

  it('a speed the player picks during the raid is theirs: kept through the change of phase and at the step\'s end', async () => {
    const s = await pageAt('tower', { width: 390, height: 844 });
    try {
      const g = await toRaid(s);
      g.ui.speedControl.set(1);                                                          // the player slows the wait down
      for (let d = 0; d < 200 && !g.world.raid.active && !g.world.raid.last; d++) s.io.tick();
      expect(g.world.speed).toBe(1);                                                     // not raised to 2x at the raiders' arrival
      g.ui.speedControl.set(3);                                                          // then picks 3x for the fight
      for (let d = 0; d < 200 && !g.world.raid.last; d++) s.io.tick();
      await frame();
      // Version 9.2 (Track L, ruling 1755): was [true, 3] (their own 3x left at the end): the end card now holds the game, so the clock is stopped behind it; the lesson's own speed is not what stopped it
      expect([Boolean(g.world.raid.last), g.world.speed, g.ui.store.get().sheet && g.ui.store.get().sheet.kind]).toEqual([true, 0, 'lessonEnd']);
    } finally { s.cleanup(); }
  });

  it('leaving mid-raid (the interface goes) takes the lesson\'s own speed back to 1x; the player\'s own is left', async () => {
    for (const [own, after] of [[null, 1], [2, 2]]) {
      const s = await pageAt('tower', { width: 390, height: 844 });
      try {
        const g = await toRaid(s);
        if (own) g.ui.speedControl.set(own);
        const world = g.world;
        expect(world.speed).toBe(own || LESSON_RAID_WAIT_SPEED);
        s.api.hooks.lesson({ step: 0 });                                                  // the lesson again (as Leave, Skip or a reload): this lesson's interface is destroyed
        expect(s.api.game().world === world).toBe(false);
        expect([own, world.speed]).toEqual([own, after]);
      } finally { s.cleanup(); }
    }
  });
});

describe('v91 f ui: the Good plots row under a lesson card (ruling 1672)', () => {
  it('the house tool\'s spots are off while a lesson card is up and back once it closes', async () => {
    const s = await pageAt('workers', { width: 390, height: 844 });
    try {
      const g = s.g();
      g.ui.store.set({ tool: { kind: 'houses' } });
      expect([Boolean(stepCard(s.root)), g.ui.store.get().lessonCardUp, spotsOn(g.ui.store.get(), g.world)]).toEqual([true, true, false]);
      dockCard(s.root);
      await frame();
      g.ui.store.set({ tool: { kind: 'houses' }, overlay: null });
      expect([g.ui.store.get().lessonCardUp, spotsOn(g.ui.store.get(), g.world)]).toEqual([false, true]);
    } finally { s.cleanup(); }
  });
});

describe('v91 f ui: the hand-over\'s first ten minutes (P7, rulings 1659, 1663)', () => {
  it('a scripted player\'s first 10 game minutes: Messages count nothing the player did and 5 at most; at most two rows under the top bar; no fire risk on a lesson building', async () => {
    const s = await pageAt('raid', { width: 1280, height: 800 });
    try {
      for (let d = 0; d < 300 && s.api.game().lesson; d++) { s.io.tick(); if (s.g().world.raid.last) break; }
      await keepIt(s);                                                                     // Version 9.2 (ruling 1755): Keep building this city is the hand-over
      expect(await waitFor(() => !s.api.game().lesson, BEAT_MS + 3000)).toBe(true);
      const h = s.api.game(), world = h.world, ui = h.ui;
      ui.speedControl.set(1);
      const rows = () => ['#banner > .critical', '#goals', '#tip .tip-row', '#cheer > *'].map((q) => [...s.root.querySelectorAll(q)].filter(shown).length).reduce((a, b) => a + b, 0);
      let most = 0, x = 23;
      const days = 600;                                                                    // 10 minutes at 1x (DAYS_PER_SECOND 1)
      for (let d = 0; d < days; d++) {
        const ev = [];
        tickDay(world, ev);
        if (world.speed === 0) ui.speedControl.set(1);
        ui.onEvents(ev); ui.refresh();
        if (d % 60 === 30 && x < 30) {                                                     // the player lays plots now and then, with the toast and Undo a placement gives
          const r = paintHouses(world, x, 41, x, 42); x += 1;
          ui.afterCommand({ kind: 'houses', result: r, text: 'Plots placed', undoable: true });
        }
        most = Math.max(most, rows());
      }
      const texts = ui.tray.list().map((m) => m.text);
      const lessonIds = new Set(Object.values(world.buildings).filter((b) => b.x <= 22 && b.y >= 37).map((b) => b.id));
      const risk = ui.alerts.list().filter((a) => a.code === 'fire_risk' && lessonIds.has(a.id));
      // Measured: 1 message (a goal done), 2 rows at the most (the goals strip and one more); 9.0 counted every "Plots placed" as well.
      expect([texts.includes('Plots placed'), ui.tray.unread() <= 5, most <= 2, risk.length]).toEqual([false, true, true, 0]);
    } finally { s.cleanup(); }
  });

  it('a placement\'s toast and an Undo\'s show but are not kept; a message that is news is kept and counted', async () => {
    const r = await rigUI();
    try {
      r.ui.afterCommand({ kind: 'building', result: { ok: true }, text: 'Well placed', undoable: true });
      r.ui.afterCommand({ kind: 'undo', result: { ok: true }, text: '' });
      const texts = r.ui.tray.list().map((m) => m.text), before = r.ui.tray.unread();
      expect([texts.includes('Well placed'), texts.includes(T.undone)]).toEqual([false, false]);
      r.ui.toasts.show('Caravan arrived');
      expect([r.ui.tray.list()[0].text, r.ui.tray.unread()]).toEqual(['Caravan arrived', before + 1]);
    } finally { r.cleanup(); }
  });

  it('in the lesson a message is kept read: the count stays at nothing', async () => {
    const s = await pageAt('workers', { width: 390, height: 844 });
    try {
      s.g().ui.toasts.show('Families arrived', { at: { x: 5, y: 5 } });
      s.g().ui.celebrations.show({ tier: 'first', lead: `${T.goalDone}: `, text: 'Lay a road' });
      expect([s.g().ui.tray.list().length, s.g().ui.tray.unread()]).toEqual([2, 0]);
    } finally { s.cleanup(); }
  });

  it('the hand-over\'s first month holds a tip while an alert and a goal are both up, and only then', () => {
    const m = mount('<div id="r" class="handover-month has-banner"><div id="goals">Goal</div><div id="tip"></div></div>');
    try {
      let t = 0;
      const settings = { v: { help: 'full', seenTips: [] }, get() { return this.v; }, set(p) { this.v = { ...this.v, ...p }; } };
      const tips = createTips({ container: m.root.querySelector('#tip'), settings, now: () => t });
      t = 1e9;
      expect([tips.trigger('problemMarker'), tips.current()]).toEqual([false, null]);
      m.root.querySelector('#r').classList.remove('has-banner');
      expect(tips.flush()).toBe(true);
      expect(tips.current() !== null).toBe(true);
    } finally { m.cleanup(); }
  });
});

// The game booted on the title with this device's settings and records (pageAt's boot, with the records store filled as given).
async function titleWith({ settings = {}, cities = [], width = 390, height = 844 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, motion: 'still', ...settings }), [RECORDS_KEY]: JSON.stringify({ version: 2, cities, chronicle: [], rulers: [], rivals: [] }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  await frame();
  return { api, root: shell.root, storage, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-card-up'); delete window.__thebes; } };
}

describe('v91 f ui: the first own city (rulings 1660, 1668, 1669)', () => {
  it('firstCityLayout: the classic river with no city in the records, Surprise me with one', () => {
    const rec = (cities) => ({ load: () => ({ cities }) });
    expect([firstCityLayout(rec([])), firstCityLayout(rec([{ id: 'a' }])), firstCityLayout(null), firstCityLayout({ load() { throw new Error('x'); } })]).toEqual(['classic', 'auto', 'classic', 'classic']);
  });

  it('the title\'s new-city card starts on the classic river at Normal on a device with no city, and on Surprise me once one is kept', async () => {
    for (const [cities, layout] of [[[], 'classic'], [[{ id: 'c1', seed: 3, difficulty: 'normal', best: 10 }], 'auto']]) {
      const t = await titleWith({ settings: { lessonDone: true }, cities });
      try {
        t.root.querySelector('.title-card .new-city').click();
        await frame();
        const select = t.root.querySelector('#title-layout');
        expect([cities.length, select && select.value]).toEqual([cities.length, layout]);
        t.root.querySelector('.title-card .start-city').click();
        await frame();
        const w = t.api.game() && t.api.game().world;
        expect([cities.length, Boolean(w), w && (layout === 'classic' ? w.mapVariant === 'classic' : true), w && w.size]).toEqual([cities.length, true, true, DEFAULT_MAP_SIZE]);
      } finally { t.cleanup(); }
    }
  });

  it('I\'ve played before starts the city in one tap, the lesson marked done, on the classic river', async () => {
    const t = await titleWith({});
    try {
      const skip = t.root.querySelector('.title-card .lesson-skip');
      expect(Boolean(skip)).toBe(true);
      skip.click();
      await frame();
      const g = t.api.game();
      expect([Boolean(g), g && g.lesson, g && g.world.mapVariant, JSON.parse(t.storage.data['thebes.settings']).lessonDone]).toEqual([true, false, 'classic', true]);
    } finally { t.cleanup(); }
  });

  it('at 1920x1080 the title draws its showcase at 1.5, whole on the screen and clear of the card; a laptop keeps 8.2\'s zooms (ruling 1673)', () => {
    const w = buildSampleCity(createWorld({ seed: TITLE_SEED }));
    const shown = ['obelisk_small', 'colossus', 'palace'].map((t) => allBuildings(w).find((b) => b.type === t));
    for (const [width, height, zoom] of [[1920, 1080, 1.5], [1280, 800, 1]]) {
      const view = { width, height }, card = { left: (width - 440) / 2, right: (width + 440) / 2, top: (height - 440) / 2, bottom: (height + 440) / 2 };
      const frame = showcaseFrame(showcaseBox(w), view, card);
      const [x, y] = driftPoints(w, frame, view)[0];
      const spots = shown.map((b) => tileToScreen(createCamera({ x, y, zoom: frame.zoom }), view, b.x + b.w / 2, b.y + b.d / 2));
      expect([width, frame.zoom, spots.every(([sx, sy]) => sx > 0 && sx < width && sy > 0 && sy < height && (sx < card.left || sx > card.right || sy < card.top || sy > card.bottom))]).toEqual([width, zoom, true]);
    }
  });

  it('the Housing plot bar\'s first line says a tap lays a plot (with a mouse); the road\'s keeps Tap where it starts', async () => {
    const r = await rigUI();
    try {
      r.store.set({ inputType: 'mouse' });
      r.ui.placement.start({ kind: 'houses' });
      expect(r.ui.placement.preview().text).toBe(V91F_TEXT.plotsIdle);
      r.ui.placement.start({ kind: 'road' });
      expect(r.ui.placement.preview().text).toBe(T.tapStart);
    } finally { r.cleanup(); }
  });
});
