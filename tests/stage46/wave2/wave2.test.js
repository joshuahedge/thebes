// Stage 4.6 wave 2 integration: the fixes the wave's reviewers left after the River, Wonders and UX tracks merged (rulings 419 on).
// Describe names start with 's46 wave2'.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { fire } from '../../helpers/dom.js';
import { PICKABLE_STYLES } from '../../../src/data/wonders.js';
import { HUNTING, FISHING } from '../../../src/data/river.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { produceDay } from '../../../src/sim/production.js';
import { riverWorld as riverCity, addGranary, dayOf, MONTH } from '../river/riverHelpers.js';
import { huntingOutlook, takeGame, wildlifeMonth, wildlifeDay, scareOf } from '../../../src/sim/wildlife.js';
import { setPaused, canPlace } from '../../../src/sim/commands.js';
import { nearestFit, fitTarget } from '../../../src/ui/placement.js';
import { courtDay } from '../../../src/sim/court.js';
import { WILDLIFE } from '../../../src/data/river.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { S46_RIVER_TEXT as R } from '../../../src/ui/text.js';
import { riverWorld, addRaw as addRiverRaw } from '../river/riverHelpers.js';
import { S46_UX_TEXT, SPEED_LABELS, T } from '../../../src/ui/text.js';

const rect = (node) => node.getBoundingClientRect();

// ── Play and pause read at a glance (ruling 419, Josh's ask) ──
describe('s46 wave2 play and pause', () => {
  // The pause picture: two bars, each clearly apart (a gap at least as wide as a bar's third), as tall as the play triangle beside it.
  const pauseBarsApart = (picture) => {
    const bars = [...picture.querySelectorAll('.bar')].map(rect);
    if (bars.length !== 2) return false;
    const gap = bars[1].left - bars[0].right;
    return gap >= 2 && gap >= bars[0].width * 0.5 && bars[0].height >= 8 && Math.abs(bars[0].height - bars[1].height) < 0.5;
  };
  it('draws pause as two clear bars as tall as play, in the wide bar at 1280x800 and on the phone corner at 390x844', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const steps = [...r.root.querySelectorAll('#topbar .speed-bar .speed-step')];
      const pause = steps[0].querySelector('.speed-picture'), play = steps[1].querySelector('.speed-picture');
      expect(pauseBarsApart(pause)).toBe(true);
      expect(Math.abs(rect(pause.querySelector('svg')).height - rect(play.querySelector('svg')).height) < 0.5).toBe(true);   // same weight
      expect(rect(pause.querySelector('svg')).height >= 13).toBe(true);           // not the old 0.75em glyph
      expect(steps.map((b) => b.querySelector('.speed-picture').dataset.glyph)).toEqual(S46_UX_TEXT.speedGlyphs);
    } finally { r.cleanup(); }
    const p = await rigUI({ width: 390, height: 844 });
    try {
      p.ui.speedControl.set(2);
      const main = p.root.querySelector('#corners .speed-main');
      const pause = main.querySelector('.face .speed-picture');
      expect(pause.dataset.glyph).toBe(S46_UX_TEXT.speedGlyphs[0]);
      expect(pauseBarsApart(pause)).toBe(true);
      const pauseH = rect(pause.querySelector('svg')).height;
      p.ui.speedControl.set(0);
      const play = main.querySelector('.face .speed-picture');
      expect(play.dataset.glyph).toBe(S46_UX_TEXT.speedGlyphs[1]);
      expect(Math.abs(rect(play.querySelector('svg')).height - pauseH) < 0.5).toBe(true);
    } finally { p.cleanup(); }
  });
  it('says the state on the phone as well as the action: paused is amber with a Paused tag, playing lapis; both in the description', async () => {
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        const main = r.root.querySelector('#corners .speed-main');
        const tag = r.root.querySelector(`#${main.getAttribute('aria-describedby')}`);
        r.ui.speedControl.set(0);
        const pausedFill = getComputedStyle(main).backgroundColor;
        const shown = (node) => getComputedStyle(node).display !== 'none' && rect(node).width > 2;
        expect([size, main.dataset.state, tag.textContent, shown(tag), main.getAttribute('aria-label')]).toEqual([size, 'paused', S46_UX_TEXT.pausedWord, true, T.play]);
        const t = rect(tag), m = rect(main), shell = r.root.getBoundingClientRect();
        expect([size, t.left >= shell.left, t.right <= m.right + 0.5 || t.right <= shell.right, t.bottom > m.top, t.top < m.top]).toEqual([size, true, true, true, true]);   // on the button's top edge, on screen
        const heightPaused = m.height;
        r.ui.speedControl.set(3);
        expect([size, main.dataset.state, tag.textContent, shown(tag)]).toEqual([size, 'playing', S46_UX_TEXT.playingState(SPEED_LABELS[3]), false]);
        expect(getComputedStyle(main).backgroundColor === pausedFill).toBe(false);   // a different fill, as well as the picture and the word
        expect(Math.abs(rect(main).height - heightPaused) < 0.5).toBe(true);           // the tag costs the corner row no height
      } finally { r.cleanup(); }
    }
  });
  it('gives the wide bar its state for a screen reader, paused and playing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const bar = r.root.querySelector('#topbar .speed-bar');
      r.ui.speedControl.set(0);
      expect(bar.getAttribute('aria-description')).toBe(S46_UX_TEXT.pausedWord);
      r.ui.speedControl.set(2);
      expect(bar.getAttribute('aria-description')).toBe(S46_UX_TEXT.playingState(SPEED_LABELS[2]));
    } finally { r.cleanup(); }
  });
});

// ── The style picker fits (ruling 420) ──
describe('s46 wave2 style picker fits', () => {
  const capital = () => {
    const w = makeTestWorld({ gold: 20000 });
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'capital';
    w.prestigeUnlocks.pyramid_small = 0;
    return w;
  };
  it('shows the whole name of every style button, whichever is in force, in the wide side panel and on phones, at 100% and 150% text', async () => {
    for (const [w, h] of [[1280, 800], [390, 844], [375, 667]]) {
      for (const size of [100, 150]) {
        const r = await rigUI({ width: w, height: h, world: capital() });
        try {
          r.ui.settings.set({ textSize: size });
          r.ui.placement.start({ kind: 'building', type: 'pyramid_small' });
          r.ui.placement.moveGhost(20, 11);
          for (const style of PICKABLE_STYLES) {
            fire(r.root.querySelector(`#confirm .style-pick[data-style="${style}"]`), 'click');
            const bar = rect(r.root.querySelector('#confirm .confirm'));
            const picks = [...r.root.querySelectorAll('#confirm .style-pick')];
            expect(picks.length).toBe(3);
            for (const b of picks) {
              const box = rect(b), at = `${w}x${h} ${size}% ${style} in force: ${b.dataset.style}`;
              expect([at, b.scrollWidth <= b.clientWidth + 0.5, box.left >= bar.left - 0.5, box.right <= bar.right + 0.5, box.height >= 43.5]).toEqual([at, true, true, true, true]);
            }
            expect(picks.find((b) => b.dataset.style === style).textContent.startsWith('✓')).toBe(true);
          }
          const rows = new Set([...r.root.querySelectorAll('#confirm .style-pick')].map((b) => Math.round(rect(b).top)));
          if (w >= 375) expect([w, h, size, rows.size]).toEqual([w, h, size, 1]);   // one row on these screens
        } finally { r.cleanup(); }
      }
    }
  });
});

// ── The lodge's game: what is left this month (ruling 421) ──
describe('s46 wave2 hunting lodge sheet', () => {
  const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
  const herd = (w, o = {}) => {
    const h = { id: w.wildlife.nextId++, kind: 'gazelle', x: 34, y: 20, size: 8, max: 8, regrow: null, hx: 34, hy: 20, px: 34, py: 20, moved: 0, hunted: 0, dir: 1, ...o };
    w.wildlife.herds.push(h);
    return h;
  };
  it('states what the hunters may still take this month, less what this lodge and others have taken, and the rule; afresh next month', () => {
    const w = riverWorld();
    const lodge = addRiverRaw(w, 'hunting_lodge', 32, 11);
    const other = addRiverRaw(w, 'hunting_lodge', 36, 11);
    w.wildlife.seeded = true;
    const big = herd(w, { size: 8 });
    const small = herd(w, { x: 30, y: 21, size: 3, max: 3 });
    const fresh = HUNTING.perHerdMonth + 3;                                  // 6 from the big herd, all 3 of the small
    expect([huntingOutlook(w, lodge).left, huntingOutlook(w, lodge).taken]).toEqual([fresh, 0]);
    expect(text(riverRows(w, lodge))).toContain(R.gameLine(fresh, 0));
    for (let i = 0; i < 4; i++) takeGame(w, big, lodge);                     // this lodge takes 4 from the big herd
    let o = huntingOutlook(w, lodge);
    expect([o.left, o.taken]).toEqual([HUNTING.perHerdMonth - 4 + 3, 4]);   // 2 more from the big herd, 3 from the small: not "up to 9" again
    expect(text(riverRows(w, lodge))).toContain(R.gameLine(o.left, 4));
    expect(R.gameLine(5, 4)).toBe(`5 more (4 taken); ${HUNTING.perHerdMonth} a herd a month, at most ${HUNTING.maxMonth}`);
    takeGame(w, small, other);                                                // another lodge's hunters take 1 from the small herd: its share is shared
    o = huntingOutlook(w, lodge);
    expect([o.left, o.taken]).toEqual([HUNTING.perHerdMonth - 4 + 2, 4]);
    lodge.hunted = HUNTING.maxMonth - 1;                                     // the lodge's own month nearly spent: the lodge's most binds
    expect(huntingOutlook(w, lodge).left).toBe(1);
    lodge.hunted = 4;
    for (const b of [lodge, other]) b.hunted = b.hunted || 0;
    wildlifeMonth(w);                                                         // the month's end: both counts start afresh
    o = huntingOutlook(w, lodge);
    expect([o.taken, o.left]).toEqual([0, Math.min(HUNTING.perHerdMonth, big.size) + Math.min(HUNTING.perHerdMonth, small.size)]);
  });
});

// ── The wharf's sheet says what the sim does (ruling 422) ──
describe('s46 wave2 fishing wharf sheet', () => {
  it('names no fishing distance (no sim reads one) and states the catch as the sim makes it: a full crew lands the month, fewer hands fewer', () => {
    expect('reach' in FISHING).toBe(false);
    expect(R.catchRule.includes('tiles')).toBe(false);
    expect(R.catchRule).toContain(`${FISHING.perMonth} a month with a full crew, ${FISHING.floodPerMonth} in months`);
    const catchOf = (staff) => {
      const w = riverCity();
      const wharf = addRiverRaw(w, 'fishing_wharf', 22, 11);
      wharf.rot = 1; wharf.w = 1; wharf.d = 2;
      wharf.staff = staff;
      const granary = addGranary(w, 24, 11);
      w.day = dayOf(2, 3);
      for (let i = 0; i < MONTH; i++) produceDay(w);
      return { fish: granary.store.fish || 0, sheet: text(riverRows(w, wharf)) };
    };
    const full = catchOf(BUILDINGS.fishing_wharf.workers), fewer = catchOf(BUILDINGS.fishing_wharf.workers - 1);
    expect(Math.abs(full.fish - FISHING.perMonth) <= 1).toBe(true);
    expect(fewer.fish < full.fish).toBe(true);
    expect(full.sheet).toContain(R.catchRule);
  });
  const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
});

// ── A scare or a court pause lifts only the pause it set (ruling 423) ──
describe('s46 wave2 the player own pause survives', () => {
  const scared = () => {
    const w = riverCity();
    const wharf = addRiverRaw(w, 'fishing_wharf', 22, 11);
    wharf.rot = 1; wharf.w = 1; wharf.d = 2;
    wharf.staff = BUILDINGS.fishing_wharf.workers;
    w.day = dayOf(2, 3);
    wharf.paused = true;                                                       // what the scare does (wildlifeDay)
    w.wildlife.seeded = true;
    w.wildlife.scares.push({ id: wharf.id, until: w.day + WILDLIFE.scareDays });
    return { w, wharf };
  };
  const daysPast = (w, n, step) => { for (let i = 0; i < n; i++) { step(w); w.day += 1; } };
  it('lifts the pause a crocodile scare set when its days are up', () => {
    const { w, wharf } = scared();
    daysPast(w, WILDLIFE.scareDays + 1, (x) => wildlifeDay(x));
    expect([wharf.paused, scareOf(w, wharf)]).toEqual([false, null]);
  });
  it('keeps a pause the player set during the scare, even a resume and a pause within the scare day', () => {
    const { w, wharf } = scared();
    expect(setPaused(w, wharf.id, false).ok).toBe(true);                       // the player resumes it ...
    expect(setPaused(w, wharf.id, true).ok).toBe(true);                        // ... and pauses it again, the same day
    expect(scareOf(w, wharf)).toBe(null);                                      // the scare let go of it: the pause is the player's
    daysPast(w, WILDLIFE.scareDays + 1, (x) => wildlifeDay(x));
    expect(wharf.paused).toBe(true);
  });
  it('keeps a pause the player set during a court card pause (a quarantine), and still lifts the pause the court set', () => {
    const w = riverCity();
    const a = addRiverRaw(w, 'fishing_wharf', 22, 11), b = addRiverRaw(w, 'granary', 24, 11);
    a.rot = 1; a.w = 1; a.d = 2;
    w.court.awake = true;
    a.paused = true; b.paused = true;
    w.court.effects.push({ kind: 'pause', ids: [a.id, b.id], until: w.day + 5 });
    setPaused(w, a.id, false);
    setPaused(w, a.id, true);                                                  // the player's own, within the same day
    daysPast(w, 6, (x) => courtDay(x));
    expect([a.paused, b.paused]).toEqual([true, false]);
  });
});

// ── Show me and the card pick turn a wharf to fit (ruling 424) ──
describe('s46 wave2 wharf lands turned to fit', () => {
  const WHARF = { kind: 'building', type: 'fishing_wharf' };
  // riverCity's river runs north to south (x 20-21), so a wharf's long side meets it only turned (rot 1: one wide, two deep).
  const fits = (w, at) => canPlace(w, 'fishing_wharf', at.x, at.y, { roadLater: true, rot: at.rot }).ok;
  it('searches both turns: the turn in hand finds no bank beside a north-south river, the other does, near', () => {
    const w = riverCity();
    expect(canPlace(w, 'fishing_wharf', 22, 12, { roadLater: true, rot: 0 }).ok).toBe(false);
    const at = nearestFit(w, WHARF, 22, 12, null, w.size);
    expect([at.rot, fits(w, at), Math.abs(at.x - 22) + Math.abs(at.y - 12) <= 4]).toEqual([1, true, true]);
    const same = nearestFit(w, { ...WHARF, rot: 1 }, 22, 12, null, w.size);   // already turned: it stays turned
    expect(same.rot).toBe(1);
  });
  it('lands the card pick and Show me from the bar in the turn that fits', async () => {
    const w = riverCity();
    w.milestone = 'city';
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      r.ui.placement.start({ ...WHARF }, { x: 22, y: 12 });                   // the card pick, with the view's middle beside the river
      let s = r.store.get();
      expect([s.tool.rot, fits(w, { ...s.ghost, rot: s.tool.rot }), r.ui.placement.preview().state !== 'bad']).toEqual([1, true, true]);
      r.ui.placement.start({ ...WHARF, rot: 0 });                              // the turn the player had, on a refused spot
      r.ui.placement.moveGhost(30, 20);
      expect(r.ui.placement.preview().state).toBe('bad');
      const target = fitTarget(w, r.store.get());
      expect([target.kind, target.rot]).toEqual(['building', 1]);
      r.ui.showMeAt({ item: 'fishing_wharf', x: target.x, y: target.y });     // Show me
      s = r.store.get();
      expect([s.tool.rot, fits(w, { ...s.ghost, rot: s.tool.rot })]).toEqual([1, true]);
    } finally { r.cleanup(); }
  });
});
