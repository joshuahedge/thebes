// Version 7.1, fix batch G (rulings 1080-1089), the final review's findings: a walker's loop crosses a running ferry instead of starting on the far bank; Ctrl+Z waits behind the lesson
// card; the Keyboard help says so; the ferries tip shows on the first too-wide refusal; Show me is named for where it goes; no Flip for the ferry tool; a short accepted ferry bar
// on a phone; and a help line about the boat that is true under every Motion level.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_PLACES } from '../../../src/data/lesson.js';
import { place } from '../../../src/sim/commands.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../../helpers/uiWorld.js';
import { key } from '../../helpers/dom.js';
import { addRaw } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../f/helpers.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { ferryEdges } from '../../../src/sim/ferries.js';
import { adjacentRoadTiles } from '../../../src/sim/reach.js';
import { walkerLoop } from '../../../src/render/walkers.js';
import { ferryWalkers } from '../../../src/render/ferries.js';
import { FERRY_TEXT } from '../../../src/ui/v71/ferryText.js';
import { P_TEXT, V70_HELP, S46_MAP_TEXT } from '../../../src/ui/text.js';
import { toolPreview } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { stepCard } from '../../helpers/lesson.js';

// ── 1. walkers cross by the ferry ──

// A well on each bank beside its road, a ferry between them, everything settled.
function wellsAndFerry() {
  const w = ferryWorld(7);
  const west = addRaw(w, 'well', 6, ROW + 1), east = addRaw(w, 'well', RIVER_X + 10, ROW + 1);
  const [a, b] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
  settle(w);
  return { w, west, east, a, b };
}
const MAX = 60;
const tileOf = (w, t) => ({ x: t % w.size, y: Math.floor(t / w.size) });
const stepOk = (w, p, q, links) => {
  if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1) return true;
  const from = p.x + p.y * w.size, to = q.x + q.y * w.size;
  return (links.get(from) || []).some((e) => e.to === to);
};

describe('v71 fg walkers: a loop begins beside its building and crosses a running ferry', () => {
  it('with a running ferry, every loop\'s first tile is beside its well and every step is to a neighbour or a ferry hop; the loops do cross', () => {
    const { w, west, east } = wellsAndFerry();
    const links = ferryEdges(w);
    expect(links.size).toBeGreaterThan(0);
    for (const [name, b] of [['west', west], ['east', east]]) {
      const loop = walkerLoop(w, b, MAX);
      expect([name, loop.length > 0]).toEqual([name, true]);
      const beside = adjacentRoadTiles(w, b).map((t) => tileOf(w, t));
      expect([name, beside.some((t) => t.x === loop[0].x && t.y === loop[0].y)]).toEqual([name, true]);
      for (let i = 1; i < loop.length; i++) expect([name, i, stepOk(w, loop[i - 1], loop[i], links)]).toEqual([name, i, true]);
      const banks = new Set(loop.map((t) => t.x < RIVER_X));
      expect([name, banks.size]).toEqual([name, 2]);                                     // it walks over the water to the other bank
    }
  });

  it('a stopped ferry gives no hop: the loop stays on its own bank, every step to a neighbour', () => {
    const { w, west, east, a } = wellsAndFerry();
    a.paused = true;
    settle(w);
    expect(ferryEdges(w).size).toBe(0);
    for (const [name, b, onWest] of [['west', west, true], ['east', east, false]]) {
      const loop = walkerLoop(w, b, MAX);
      expect([name, loop.length > 0, loop.every((t) => (t.x < RIVER_X) === onWest)]).toEqual([name, true, true]);
      for (let i = 1; i < loop.length; i++) expect([name, i, Math.abs(loop[i].x - loop[i - 1].x) + Math.abs(loop[i].y - loop[i - 1].y)]).toEqual([name, i, 1]);
    }
  });
});

// ── 2 and 3. Ctrl+Z waits behind the lesson card, and the help says every game key waits ──

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

describe('v71 fg lesson card: Ctrl+Z', () => {
  it('with the card up Ctrl+Z, Cmd+Z, Ctrl+Y and Ctrl+Shift+Z leave the undo list alone; with the card gone Ctrl+Z undoes', async () => {
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, textSize: 100, motion: 'still' }) });
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      api.hooks.lesson({ step: LESSON_STEPS.findIndex((s) => s.id === 'road') });
      await frame();
      const g = api.game();
      expect(Boolean(stepCard(shell.root))).toBe(true);
      expect(place(g.world, 'firehouse', ...LESSON_PLACES.firehouse).ok).toBe(true);     // a placement to take back
      const n = g.world.undo.length;
      expect(n).toBeGreaterThan(0);
      key(shell.root, 'z', { ctrlKey: true });
      key(shell.root, 'z', { metaKey: true });
      key(shell.root, 'y', { ctrlKey: true });
      key(shell.root, 'Z', { ctrlKey: true, shiftKey: true });
      expect(g.world.undo.length).toBe(n);
      shell.root.querySelector('.lesson-card .lc-go').click();                           // the card closes
      expect(stepCard(shell.root)).toBe(null);
      key(shell.root, 'z', { ctrlKey: true });
      expect(g.world.undo.length).toBe(n - 1);                                           // the control: with no card the same chord undoes
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on', 'lesson-names-alert', 'lesson-card-up'); delete window.__thebes; }
  });
});

describe('v71 fg help: the Keyboard entry', () => {
  it('says in one sentence that over a lesson card every game key waits until it is closed, and that Enter, Space or Esc closes it', () => {
    const kb = V70_HELP.p.find((p) => p.head === 'Keyboard').text;
    expect(P_TEXT.lessonKeys).toBe('Over a lesson card every game key waits until the card is closed (Enter, Space or Esc closes it).');
    expect(kb.includes(P_TEXT.lessonKeys)).toBe(true);
    expect(kb.includes('nothing happens over a dialog or a lesson card')).toBe(false);
  });
});

// ── 4. the first too-wide refusal shows the ferries tip ──

describe('v71 fg tips: a too-wide refusal', () => {
  it('shows the ferries tip first: the first too-wide refusal does not give the 3-minute slot to the bridges tip', async () => {
    const clock = { t: 0 };
    const r = await rigUI({ world: ferryWorld(7), width: 1000, height: 700, now: () => clock.t });
    try {
      r.ui.settings.set({ seenTips: ['gentle_motion'] });                                // the device's own Gentle tip is not the one under test
      clock.t = 20000;                                                                   // past the first 10 s, when no tip shows
      if (r.ui.tips.current()) r.ui.tips.dismiss();
      const pl = r.ui.placement;
      pl.start({ kind: 'road' });
      pl.pointAt(RIVER_X - 4, ROW); pl.pointAt(RIVER_X + 10, ROW);                       // while a tool is on, a tip is held: the first one held keeps the slot
      expect([toolPreview(r.world, r.store.get()).reason, r.ui.tips.current()]).toEqual(['too_wide', null]);
      pl.cancel();                                                                       // the tool ends: the held tip shows
      r.frame(0);
      expect(r.ui.tips.current()).toBe('ferries');
    } finally { r.cleanup(); }
  });
});

// ── 5 and 6. the ferry bar: Show me's name, and no Flip ──

const ferryBar = async (width, line, { textSize = null, tool = 'ferry', w = ferryWorld(7), height = 667 } = {}) => {
  const r = await rigUI({ world: w, width, height });
  if (textSize) r.ui.settings.set({ textSize });
  const pl = r.ui.placement;
  pl.start({ kind: tool });
  pl.pointAt(line[0], line[1]); pl.pointAt(line[2], line[3]);
  r.frame(0);
  return r;
};

describe('v71 fg ferry bar: Show me is named for where it goes', () => {
  it('after a ferry_bridge refusal it is named for a bridge; after the other refusals for a ferry; a road\'s refusals keep theirs', async () => {
    const cases = [
      ['ferry_bridge', 4, 'ferry', 'a bridge'], ['ferry_too_wide', 13, 'ferry', 'a ferry'], ['too_wide', 7, 'road', 'a ferry'], ['bridge_shape', 7, 'road', 'a bridge'],
    ];
    for (const [reason, width, tool, what] of cases) {
      const w = ferryWorld(width);
      const line = reason === 'bridge_shape' ? [RIVER_X - 3, ROW, RIVER_X + 1, ROW] : [RIVER_X - 2, ROW, RIVER_X + width + 1, ROW];
      const r = await ferryBar(1000, line, { tool, w, height: 700 });
      try {
        const p = toolPreview(r.world, r.store.get());
        const btn = r.root.querySelector('#confirm .show-fit');
        expect([reason, p.reason, Boolean(btn) && btn.getAttribute('aria-label')]).toEqual([reason, reason, S46_MAP_TEXT.showFitLabel(what)]);
      } finally { r.cleanup(); }
    }
    expect(FERRY_TEXT.showFitWhat).toEqual({ ferry: 'a ferry', bridge: 'a bridge' });
  });
});

describe('v71 fg ferry bar: no Flip', () => {
  it('the ferry tool has no Flip, since a bent line is refused; the road tool still has it', async () => {
    const line = [RIVER_X - 2, ROW, RIVER_X + 8, ROW + 2];
    const f = await ferryBar(1000, line, { height: 700 });
    try {
      expect([Boolean(f.root.querySelector('#confirm .ok')), Boolean(f.root.querySelector('#confirm .flip'))]).toEqual([true, false]);
    } finally { f.cleanup(); }
    const r = await ferryBar(1000, [3, 3, 8, 6], { tool: 'road', height: 700 });
    try { expect(Boolean(r.root.querySelector('#confirm .flip'))).toBe(true); } finally { r.cleanup(); }
  });
});

// ── 7. a short accepted ferry bar on a phone ──

describe('v71 fg ferry bar: on a phone', () => {
  it('an accepted ferry at 375x667 and 150% text is no taller than 200 px, and its line is the water and the monthly bill', async () => {
    const r = await ferryBar(375, [RIVER_X - 2, ROW, RIVER_X + 8, ROW], { textSize: 150 });
    try {
      const p = toolPreview(r.world, r.store.get());
      expect(p.state).toBe('ok');
      expect(p.text).toBe(FERRY_TEXT.summary(r.world, p.ferry));
      expect(p.text.split(' · ').length).toBeLessThanOrEqual(2);
      const bar = r.root.querySelector('#confirm .confirm');
      expect(bar.getBoundingClientRect().height).toBeLessThanOrEqual(200);
    } finally { r.cleanup(); }
  });
});

// ── 8. the boat line in help is true under every Motion level ──

describe('v71 fg help: the boat', () => {
  it('says the boat goes to and fro under Full motion and rests at a landing under Gentle, and the renderer does both', () => {
    const text = FERRY_TEXT.help.text;
    expect(text.includes('it goes to and fro under Full motion and rests at a landing under Gentle')).toBe(true);
    expect(text.includes('and a small boat goes to and fro.')).toBe(false);
    const { w } = wellsAndFerry();
    const at = (t, motion) => ferryWalkers(w, t, null, motion).map((f) => [f.x, f.y]);
    expect(JSON.stringify(at(0.1, 'full')) === JSON.stringify(at(0.5, 'full'))).toBe(false);   // Full: the boat moves
    expect(at(0.1, 'still')).toEqual(at(0.5, 'still'));                                  // Gentle: it rests
  });
});
