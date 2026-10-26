// Version 8.1 Track T (rulings 1202-1213): the lesson made foolproof, in the page. A chapter opens with its card and pauses; a step inside it is Ipi's docked bubble and does not;
// after each step Ipi reacts in one line with a gold glow, which fades by itself (or leads the next chapter's card); only the step's own controls are live and a tap on a dimmed
// one gets Ipi's line beside it, while the map still pans; each step reads the city, never the taps (Josh's road: tapped around, cancelled, laid, and the lesson moved on); every
// step can be done, undone and done again; and the lesson ends by handing its city over, so the title's main button is Continue.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT, LESSON_LENGTH, LESSON_CHAPTER_COUNT, lessonWorld, replayTo, lessonAt, stepDone, chapterAt, gateRoadTiles, homesReached } from '../../../src/sim/lesson.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { beatText, BEAT_MS, lockFor } from '../../../src/ui/v60/lesson.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { bubbleOf, speaking } from '../../../src/ui/v81/scribe.js';
import { T } from '../../../src/ui/text.js';
import { fire, key, mount } from '../../helpers/dom.js';
import { createTips } from '../../../src/ui/tips.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { stepCard, dockCard } from '../../helpers/lesson.js';
import { pageAt, frame, stepIndex } from '../../v711/lessonPage.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { for (let t = 0; t < ms; t += 50) { if (fn()) return true; await wait(50); } return fn(); }
const row = (s) => s.root.querySelector('#lesson');
const step = (id) => LESSON_STEPS[stepIndex(id)];
const shown = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
const locked = (n) => Boolean(n) && n.hasAttribute('data-locked');
const BUILD_STEPS = ['road', 'homes', 'largeplot', 'well', 'farm', 'granary', 'bazaar'];

describe('v81 t lesson: chapters, the card and Ipi\'s bubble', () => {
  it('a chapter opens with its card (Ipi, the chapter\'s name, its why and the step\'s do) and pauses; the step inside it has no card and does not pause', async () => {
    const s = await pageAt('well', { width: 390, height: 844 });
    try {
      const card = stepCard(s.root), g = s.g();
      const words = V81T_TEXT.steps.well(lessonFacts(g.world, step('well')));
      expect([Boolean(card), g.world.speed, card.querySelector('.lc-label').textContent, card.querySelector('.lc-words').textContent]).toEqual([true, 0, V81T_TEXT.chapterLabel(3, LESSON_CHAPTER_COUNT, 'Water'), `${V81T_TEXT.chapters.water.why} ${words.do}`]);
      expect([Boolean(card.querySelector('.lc-head svg.scribe-portrait')), card.querySelector('.lc-beat').hidden]).toEqual([true, true]);
      dockCard(s.root);
      await frame();
      g.ui.speedControl.set(2);                                                                    // the player plays on while building
      LESSON_SCRIPT.well(g.world, s.io);
      await frame();
      const r = row(s), fam = V81T_TEXT.steps.families(lessonFacts(g.world, step('families')));
      expect([r.dataset.step, Boolean(stepCard(s.root)), g.world.speed]).toEqual(['families', false, 2]);
      expect([shown(r.querySelector('.lesson-face')), r.querySelector('.label').textContent, r.querySelector('.ipi-why').textContent, r.querySelector('.text').textContent]).toEqual([true, V81T_TEXT.stepLabel('Water', 2, 2), fam.why, fam.do]);
    } finally { s.cleanup(); }
  });

  it('a lesson opened at a step inside a chapter opens with that chapter\'s card all the same (ruling 1213)', async () => {
    const s = await pageAt('granary', { width: 390, height: 844 });
    try {
      const card = stepCard(s.root);
      expect([Boolean(card), card && card.querySelector('.lc-label').textContent]).toEqual([true, V81T_TEXT.chapterLabel(4, LESSON_CHAPTER_COUNT, 'Food')]);
    } finally { s.cleanup(); }
  });
});

describe('v81 t lesson: Ipi reacts after each step', () => {
  it('inside a chapter: one line naming the result takes the why\'s place, the ring glows gold on what was built, the chime plays, and it all fades by itself', async () => {
    const s = await pageAt('farm', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      LESSON_SCRIPT.farm(g.world, s.io);
      await frame();
      const r = row(s), ring = s.root.querySelector('.lesson-ring');
      expect([r.dataset.step, r.classList.contains('beat-on'), r.querySelector('.beat-line').textContent, shown(r.querySelector('.beat-line')), shown(r.querySelector('.ipi-why'))]).toEqual(['granary', true, beatText(g.world, step('farm')), true, false]);
      expect([shown(r.querySelector('.text')), r.querySelector('.text').textContent]).toEqual([true, V81T_TEXT.steps.granary(lessonFacts(g.world, step('granary'))).do]);   // the next do is in sight at once
      expect([ring.hidden, ring.classList.contains('beat'), getComputedStyle(ring).borderTopColor]).toEqual([false, true, 'rgb(226, 177, 60)']);
      await wait(BEAT_MS + 300);
      await frame();
      expect([r.classList.contains('beat-on'), shown(r.querySelector('.ipi-why')), ring.classList.contains('beat')]).toEqual([false, true, false]);
      expect(BEAT_MS >= 2000 && BEAT_MS <= 3000).toBe(true);
    } finally { s.cleanup(); }
  });

  it('at a chapter\'s end: the reaction leads the next chapter\'s card, from the sim\'s own count', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      LESSON_SCRIPT.road(g.world, s.io);
      await frame();
      const card = stepCard(s.root), lead = card && card.querySelector('.lc-beat');
      expect([row(s).dataset.step, Boolean(card), shown(lead), lead && lead.textContent]).toEqual(['homes', true, true, V81T_TEXT.beats.road({ roads: gateRoadTiles(g.world) })]);
      expect(lead.textContent).toBe(`The road reaches the green land: ${step('road').check.n} new tiles.`);
      expect([row(s).classList.contains('beat-on'), speaking()]).toEqual([false, false]);         // nothing stands under the card
    } finally { s.cleanup(); }
  });
});

describe('v81 t lesson: only the step\'s own controls are live', () => {
  it('the homes step: its category and card are live; the other categories, the stats, the layers, the minimap and the clock are dimmed; the menu and the messages stay', async () => {
    const s = await pageAt('homes', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      g.ui.store.set({ dock: 'tray', category: 'homes' });
      await frame();
      const at = (sel) => s.root.querySelector(sel);
      expect([locked(at('#dock .cat[data-category="homes"]')), locked(at('#dock .card[data-item="house"]')), locked(at('#dock .cat[data-category="roads"]')), locked(at('#dock .cat[data-category="services"]'))]).toEqual([false, false, true, true]);
      expect([locked(at('#topbar .stats')), locked(at('#corners .overlay-button')), locked(at('#corners .minimap-button')), locked(at('#corners .speed-corner')), locked(at('#topbar .menu'))]).toEqual([true, true, true, true, false]);
      expect(lockFor(step('homes'))).toEqual(['menu', 'papyrus', 'tray-cat-homes', 'tray-item-house']);
      expect(lockFor(step('families')).includes('speed') && lockFor(step('month')).includes('stat-gold')).toBe(true);
      expect(getComputedStyle(at('#dock .cat[data-category="roads"]')).opacity < 0.5).toBe(true);
    } finally { s.cleanup(); }
  });

  it('a tap on a dimmed control does nothing but bring Ipi\'s line, pinned beside it; a dimmed key does nothing either; the map still pans', async () => {
    const s = await pageAt('homes', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      g.ui.store.set({ dock: 'tray', category: 'homes' });
      await frame();
      const roads = s.root.querySelector('#dock .cat[data-category="roads"]');
      fire(roads, 'pointerdown', { pointerType: 'touch' });
      fire(roads, 'click');
      await frame();
      const b = bubbleOf(), br = b.getBoundingClientRect(), rr = roads.getBoundingClientRect();
      expect([g.ui.store.get().category, b.hidden, b.textContent, b.classList.contains('pinned')]).toEqual(['homes', false, V81T_TEXT.refused('homes'), true]);
      expect(br.bottom <= rr.top + 0.5 || br.top >= rr.bottom - 0.5).toBe(true);
      const sheet = g.ui.store.get().sheet;
      key(s.root, 'm');
      expect(g.ui.store.get().sheet).toBe(sheet);                                                   // the minimap is dimmed: its key does nothing
      const canvas = s.root.querySelector('#map'), cr = canvas.getBoundingClientRect(), cam = g.cam, was = { x: cam.x, y: cam.y };
      const x0 = cr.left + cr.width / 2, y0 = cr.top + cr.height * 0.6;
      fire(canvas, 'pointerdown', { clientX: x0, clientY: y0, pointerId: 4, pointerType: 'touch' });
      for (let k = 1; k <= 6; k++) fire(canvas, 'pointermove', { clientX: x0 + k * 15, clientY: y0 + k * 6, pointerId: 4, pointerType: 'touch' });
      fire(canvas, 'pointerup', { clientX: x0 + 90, clientY: y0 + 36, pointerId: 4, pointerType: 'touch', buttons: 0 });
      g.ui.cameraControl.cancel();
      expect(cam.x !== was.x || cam.y !== was.y).toBe(true);
    } finally { s.cleanup(); }
  });

  it('the lock goes with the lesson: a normal game dims nothing', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.frame();
      expect(r.root.querySelectorAll('[data-locked]').length).toBe(0);
    } finally { r.cleanup(); }
  });
});

describe('v81 t lesson: each step reads the city, never the taps', () => {
  it('Josh\'s road: tapping around with the road, cancelling, a stray piece and a part laid, then the rest laid: the lesson moves on to the Homes card', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const g = s.g(), p = g.ui.placement;
      dockCard(s.root);                                                                              // Show me: the road tool, at its place
      await frame();
      p.pointAt(30, 30); p.pointAt(33, 30);                                                          // tapping around
      p.cancel();
      await frame();
      p.start({ kind: 'road' });
      p.pointAt(24, 35); p.pointAt(27, 35);
      expect(p.confirm().ok).toBe(true);                                                            // a stray piece, not joined to the gate
      p.pointAt(20, 39); p.pointAt(15, 39);
      expect(p.confirm().ok).toBe(true);                                                            // a part of the road
      await frame();
      expect([row(s).dataset.step, gateRoadTiles(g.world), stepDone(g.world, step('road'))]).toEqual(['road', 5, false]);   // nine tiles in all, but only five from the gate
      p.pointAt(15, 39);
      p.cancel();                                                                                    // cancelled midway
      await frame();
      s.root.querySelector('#lesson .show-me').click();                                              // the step's own Show me again
      await frame();
      g.ui.placement.pointAt(15, 39); g.ui.placement.pointAt(11, 39);
      expect(g.ui.placement.confirm().ok).toBe(true);
      await frame();
      expect([gateRoadTiles(g.world), row(s).dataset.step, Boolean(stepCard(s.root))]).toEqual([9, 'homes', true]);
    } finally { s.cleanup(); }
  });

  it('every build step, in the sim: part of it or undone is not done, done again is done; and a step already done is never asked again', () => {
    const P = LESSON_PLACES;
    const at = (id) => { const w = lessonWorld(); replayTo(w, stepIndex(id)); lessonAt(w, stepIndex(id)); return w; };
    const done = (w, id) => stepDone(w, step(id));
    const io = (w) => ({ tick() {}, did() {} });
    // road: a part, undone, the whole
    let w = at('road');
    drawRoad(w, ...P.road.from, 15, 39);
    expect(done(w, 'road')).toBe(false);
    undo(w);
    expect(gateRoadTiles(w)).toBe(0);
    LESSON_SCRIPT.road(w, io(w));
    expect(done(w, 'road')).toBe(true);
    // homes: five of six, undone, the six
    w = at('homes');
    paintHouses(w, 19, 41, 19, 45);
    expect(done(w, 'homes')).toBe(false);
    undo(w);
    LESSON_SCRIPT.homes(w, io(w));
    expect(done(w, 'homes')).toBe(true);
    // each building step: built, undone (not done), built again (done)
    for (const id of ['largeplot', 'well', 'farm', 'granary', 'bazaar']) {
      w = at(id);
      LESSON_SCRIPT[id](w, io(w));
      expect([id, done(w, id)]).toEqual([id, true]);
      undo(w);
      expect([id, done(w, id)]).toEqual([id, id === 'largeplot']);   // the Large plot's step counts the lots laid (the tally), which an undo does not take back
      LESSON_SCRIPT[id](w, io(w));
      expect([id, done(w, id)]).toEqual([id, true]);
    }
    expect(homesReached(w, 'bazaar') >= step('bazaar').check.homes).toBe(true);
  });

  it('the whole lesson with every build step undone and done again: it never goes back, ends, and hands its city over; the title then says Continue', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    let store = s.store, cleaned = false;
    try {
      const g = s.g();
      for (let i = 0; i < LESSON_LENGTH; i++) {
        const st = LESSON_STEPS[i];
        expect([i, row(s).dataset.step, Boolean(stepCard(s.root))]).toEqual([i, st.id, chapterAt(i).first]);
        dockCard(s.root);
        await frame();
        g.ui.placement.cancel();
        LESSON_SCRIPT[st.id](g.world, s.io);
        await frame();
        if (BUILD_STEPS.includes(st.id)) {
          undo(g.world); s.io.did();                                                                 // taken back after the lesson moved on: it does not go back
          await frame();
          expect([i, row(s).dataset.step]).toEqual([i, LESSON_STEPS[i + 1].id]);
          LESSON_SCRIPT[st.id](g.world, s.io);                                                       // and done again
          await frame();
        }
      }
      expect(await waitFor(() => !s.api.game().lesson, BEAT_MS + 3000)).toBe(true);                // the hand-over (ruling 1208)
      const h = s.api.game();
      const settings = JSON.parse(s.storage.data['thebes.settings']);
      expect([h.world.lesson, h.world.size, settings.lessonDone, s.root.querySelector('#lesson'), document.body.classList.contains('lesson-on')]).toEqual([undefined, 48, true, null, false]);
      expect([bubbleOf().hidden, bubbleOf().textContent]).toEqual([false, V81T_TEXT.handover]);
      expect(Object.values(h.world.buildings).some((b) => b.type === 'bazaar')).toBe(true);       // the lesson's city, kept
      expect(await waitFor(() => s.root.querySelectorAll('[data-locked]').length === 0, 500)).toBe(true);
      const saved = await store.load();
      expect(Boolean(saved && saved.text)).toBe(true);
      s.cleanup(); cleaned = true;
      const t = await pageAt(null, { store });
      try {
        const primary = [...t.root.querySelectorAll('.title-card button.primary')].filter((b) => !b.hidden);
        expect(primary.map((b) => b.textContent.trim())).toEqual([T.continueGame]);
      } finally { t.cleanup(); }
    } finally { if (!cleaned) s.cleanup(); }
  });
});

describe('v81 t lesson: Ipi in a normal game', () => {
  it('says one line at a rank-up, docked under the top bar', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.onEvents([{ type: 'milestone', id: 'town' }]);
      const b = bubbleOf();
      expect([b.hidden, b.textContent, b.parentElement.id]).toEqual([false, V81T_TEXT.rankUp('Town'), 'under-bar']);
    } finally { r.cleanup(); }
  });
  it('leads the first-time tips with the scribe\'s portrait', async () => {
    const m = mount();
    try {
      const settings = { v: {}, get() { return this.v; }, set(p) { this.v = { ...this.v, ...p }; } };
      const tips = createTips({ container: m.root, settings });
      tips.trigger('plotsPaused');                                                                   // the priority tip (Press Play) shows at once
      const tip = m.root.querySelector('.tip-row');
      expect([Boolean(tip), tip && Boolean(tip.querySelector('svg.scribe-portrait')), tip && tip.querySelector('svg.scribe-portrait').getAttribute('aria-hidden')]).toEqual([true, true, 'true']);
    } finally { m.cleanup(); }
  });
});
