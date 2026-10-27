// Task 5d (rulings 318-321): the face of disease and crime. Health and Crime overlays (banded like fire risk, a dot where a staffed
// physician or police post reaches), the cloth over an ill home's door (still at every Motion level), the rows on a home's sheet
// ("Health: covered by the physician", "Crime risk: High, ..."), the physician's and police post's own rows, Show me on an alert,
// the theft caption, the goals, tips and firsts, Peaceful off, and no score change. Every sentence comes from the sim's own function;
// each is tested with the world set up both ways.
import { describe, it, expect } from '../harness.js';
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, FIRE_ALPHA, homeRiskMarks, drawOverlay, problemMarkers } from '../../src/render/overlays.js';
import { drawIllness, clothFor, DOORS, CLOTH } from '../../src/render/illness.js';
import { AUTO_OVERLAY } from '../../src/data/ui.js';
import { HEALTH, HEALTH_BANDS } from '../../src/data/health.js';
import { CRIME, CRIME_BANDS } from '../../src/data/crime.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { MILESTONES } from '../../src/data/progression.js';
import { TIPS } from '../../src/data/tips.js';
import { healthRowModel, crimeRowModel, homeRows } from '../../src/ui/dangerSheets.js';
import { alertShowMe } from '../../src/ui/threatFix.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createPlacement, toolPreview } from '../../src/ui/placement.js';
import { homesServedFrom } from '../../src/sim/housing.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, DANGER_UI_TEXT as D, TIP_TEXT, FIRST_TEXT, CRIME_TEXT, T, effectText, alertText } from '../../src/ui/text.js';
import { fallIll, healthBandOf, healthCovered, illnessDaysLeft, homesCoveredBy } from '../../src/sim/health.js';
import { crimeCovered, steal, dailyCrimeRiskOf, crimeHomesCoveredBy } from '../../src/sim/crime.js';
import { openGoals } from '../../src/sim/goals.js';
import { checkFirsts } from '../../src/sim/firsts.js';
import { scoreRow } from '../../src/sim/score.js';
import { p } from '../../src/render/iso.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';
import { mount, fire } from '../helpers/dom.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { rigUI } from '../helpers/uiWorld.js';

const click = (n) => fire(n, 'click');
const keep = (m, keys) => Object.fromEntries(keys.map((k) => [k, m[k]]));
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const FULL = { workforce: 100, employed: 100, jobs: 100, shortLevels: [] };

// A Market town with a road along y = 10 and homes north of it.
function city(homes = [[4, 9], [6, 9], [10, 9]], { tier = 3, residents = 8 } = {}) {
  const w = makeTestWorld({ gold: 5000 });
  w.milestone = 'market_town';
  w.mood = 60;
  w.labour = { ...FULL };
  setRoad(w, 0, 10, 31, 10);
  const ids = homes.map(([x, y]) => addRaw(w, 'house', x, y, { tier, residents }).id);
  staffAll(w);
  return { w, ids };
}
const homesOf = (w, ids) => ids.map((id) => w.buildings[id]);

describe('s45 health and crime overlays', () => {
  it('joins the overlays as two banded ones with a name, a hue and the words for the dot and the ring, in the Layers list', () => {
    expect(OVERLAYS).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'fire', 'health', 'crime', 'housing', 'ground', 'progress', 'supply', 'workers', 'lines']);   // Version 8.3 (Track K): Supply lines
    expect(GRADED_OVERLAYS).toEqual(['desirability', 'fire', 'health', 'crime']);
    expect([OVERLAY_NAMES.health, OVERLAY_NAMES.crime]).toEqual(['Health', 'Crime']);
    expect(OVERLAY_LEGEND.health).toEqual(['A staffed physician reaches it', 'No staffed physician reaches it']);
    expect(OVERLAY_LEGEND.crime).toEqual(['A staffed police post reaches it', 'No staffed police post reaches it']);
    expect(new Set(OVERLAYS.map((k) => OVERLAY_HUE[k])).size).toBe(OVERLAYS.length);        // no two overlays share a hue
    expect([AUTO_OVERLAY.physician, AUTO_OVERLAY.police_post]).toEqual(['health', 'crime']);
  });
  it('turns the overlay on while a physician or a police post is placed', () => {
    for (const [type, overlay] of [['physician', 'health'], ['police_post', 'crime']]) {
      const { w } = city();
      const store = createStore(INITIAL_UI_STATE);
      createPlacement({ world: w, store }).start({ kind: 'building', type }, { x: 20, y: 11 });
      expect([type, store.get().overlay]).toEqual([type, overlay]);
    }
  });
  it('marks every home with people in it by its band, an ill home in the top band, with a dot only where a staffed physician reaches it', () => {
    const { w, ids } = city([[4, 9], [6, 9], [8, 9], [10, 9], [12, 9]]);
    const [low, rising, high, hot, ill] = homesOf(w, ids);
    low.health = 10; rising.health = 30; high.health = 70; hot.health = 120;
    w.day = 7; fallIll(w, ill.id);
    addRaw(w, 'garden', 14, 9);                                                              // not a home: no mark
    addRaw(w, 'house', 20, 9);                                                               // an empty plot: no mark
    const doc = addRaw(w, 'physician', 26, 9);
    staffAll(w);
    const marks = homeRiskMarks(w, 'health');
    expect(marks.map((m) => [m.id, m.band, m.has])).toEqual([[low.id, 0, false], [rising.id, 1, false], [high.id, 2, false], [hot.id, 3, false], [ill.id, 3, false]]);
    expect(healthBandOf(w, ill)).toBe(3);
    const doc2 = addRaw(w, 'physician', 14, 11);
    staffAll(w);
    expect(homeRiskMarks(w, 'health').map((m) => m.has)).toEqual(homesOf(w, ids).map((h) => healthCovered(w, h)));
    expect(homeRiskMarks(w, 'health').some((m) => m.has)).toBe(true);
    doc2.staff = 0; doc.staff = 0;
    expect(homeRiskMarks(w, 'health').some((m) => m.has)).toBe(false);
    expect(FIRE_ALPHA.length).toBe(HEALTH_BANDS.length);
  });
  it('marks crime by band, a dot where a staffed police post reaches it, and leaves out homes with nobody in them', () => {
    const { w, ids } = city([[4, 9], [6, 9], [8, 9], [10, 9]]);
    const hs = homesOf(w, ids);
    [5, 30, 70, 110].forEach((v, i) => { hs[i].crime = v; });
    hs[3].residents = 0;
    const post = addRaw(w, 'police_post', 5, 11);
    staffAll(w);
    const marks = homeRiskMarks(w, 'crime');
    expect(marks.map((m) => [m.id, m.band])).toEqual([[hs[0].id, 0], [hs[1].id, 1], [hs[2].id, 2]]);
    expect(marks.map((m) => m.has)).toEqual(hs.slice(0, 3).map((h) => crimeCovered(w, h)));
    expect(marks.some((m) => m.has)).toBe(true);
    post.staff = 0;
    expect(homeRiskMarks(w, 'crime').some((m) => m.has)).toBe(false);
  });
  it('draws nothing for homes before the threat starts or on Peaceful, and the strip says why instead of showing bands', () => {
    for (const [kind, before, started] of [['health', 'village', 'town'], ['crime', 'town', 'market_town']]) {
      const { w, ids } = city([[10, 9], [12, 9]]);
      w.milestone = before;
      const [a] = homesOf(w, ids);
      if (kind === 'health') a.health = 120; else a.crime = 120;
      expect([kind, homeRiskMarks(w, kind).length]).toEqual([kind, 0]);                     // not started: no home is marked
      const { root, cleanup } = mount();
      try {
        const store = createStore(INITIAL_UI_STATE);
        createOverlayLegend({ container: root, store, world: w });
        store.set({ overlay: kind });
        expect([root.querySelectorAll('.band').length, root.querySelector('.never-burn').textContent]).toEqual([0, D.threatNotStarted(kind, false)]);
        expect(root.querySelector('.never-burn').textContent.includes(MILESTONES.find((m) => m.name === (before === 'village' ? 'Town' : 'Market town')).name)).toBe(true);
        w.milestone = started;
        store.set({ overlay: null }); store.set({ overlay: kind });
        expect([homeRiskMarks(w, kind).length, root.querySelectorAll('.band').length]).toEqual([2, 4]);   // started: marks and the four bands
        w.difficulty = 'peaceful';
        expect(homeRiskMarks(w, kind).length).toBe(0);
        store.set({ overlay: null }); store.set({ overlay: kind });
        expect([root.querySelectorAll('.band').length, root.querySelector('.never-burn').textContent]).toEqual([0, D.threatNotStarted(kind, true)]);
        expect(D.threatNotStarted('health', true)).toBe('There is no sickness on Peaceful');
        expect(D.threatNotStarted('crime', true)).toBe('There are no thieves on Peaceful');
      } finally { cleanup(); }
    }
  });
  it('draws the bands light to dark, hatched on High and above, plain below', () => {
    for (const kind of ['health', 'crime']) {
      const { w, ids } = city([[10, 9], [12, 9]]);
      const [a, b] = homesOf(w, ids);
      if (kind === 'health') { a.health = 0; b.health = 120; } else { a.crime = 0; b.crime = 120; }
      const c = makeCanvas(400, 240);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#F3E7CB'; ctx.fillRect(0, 0, 400, 240);
      const [ax, ay] = p(11, 9);
      ctx.translate(200 - 2 * ax, 120 - 2 * ay);
      drawOverlay(makeDraw(ctx, 2), w, kind, null);
      const across = (tx) => { const q = p(tx + 0.5, 9.5); const out = []; for (let dx = -8; dx <= 8; dx++) out.push(pixelAt(c, 200 + 2 * (q[0] - ax) + dx, 120 + 2 * (q[1] - ay) + 6)); return out; };
      const low = across(10), hot = across(12);
      const mean = (row) => row.reduce((s, px) => s + luminance(px), 0) / row.length;
      expect([kind, mean(hot) < mean(low) - 15]).toEqual([kind, true]);
      expect([kind, new Set(low.map((px) => px.join())).size]).toEqual([kind, 1]);
      expect([kind, new Set(hot.map((px) => px.join())).size > 2]).toEqual([kind, true]);
    }
  });
  it('shows a legend of the four bands, hatched on the top two, with the dot, the ring and the homes-only note', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      createOverlayLegend({ container: root, store });
      store.set({ overlay: 'health' });
      const bands = [...root.querySelectorAll('.band')];
      expect(bands.map((b) => b.textContent)).toEqual(['Low', 'Rising', 'High', 'Can fall ill']);
      expect(bands.map((b) => b.getAttribute('aria-label'))).toEqual(['Low: health risk 0 to 24', 'Rising: health risk 25 to 59', 'High: health risk 60 to 99', `Can fall ill: health risk ${HEALTH.threshold} or more (a home already ill is marked here too)`]);
      expect(HEALTH_BANDS[HEALTH_BANDS.length - 1]).toBe(HEALTH.threshold);          // the top band's start is the threshold the words name
      expect(bands.map((b) => b.querySelector('.swatch').classList.contains('hatch'))).toEqual([false, false, true, true]);
      expect([...root.querySelectorAll('.fire-keys .key')].map((k) => k.textContent.trim())).toEqual(OVERLAY_LEGEND.health);
      expect(root.querySelector('.never-burn').textContent).toBe(D.homesOnlyNote);
      store.set({ overlay: 'crime' });
      const cb = [...root.querySelectorAll('.band')];
      expect(cb.map((b) => b.getAttribute('aria-label'))).toEqual(['Low: crime risk 0 to 24', 'Rising: crime risk 25 to 59', 'High: crime risk 60 to 99', 'Can cause a theft: crime risk 100 or more']);
      expect([...root.querySelectorAll('.fire-keys .key')].map((k) => k.textContent.trim())).toEqual(OVERLAY_LEGEND.crime);
      expect([HEALTH_BANDS, CRIME_BANDS]).toEqual([[0, 25, 60, 100], [0, 25, 60, 100]]);
    } finally { cleanup(); }
  });
});

describe('s45 the cloth over an ill home', () => {
  const paint = (w, home, t) => {
    const c = makeCanvas(160, 140);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#F3E7CB'; ctx.fillRect(0, 0, 160, 140);
    const [ax, ay] = p(home.x + 0.5, home.y + 0.5);
    ctx.translate(80 - 2 * ax, 100 - 2 * ay);
    drawIllness(makeDraw(ctx, 2), w, null, t);
    return { c, at: (u, z) => { const q = clothFor(home).cloth[0]; return [80 + 2 * (q[0] - ax) + u, 100 + 2 * (q[1] - ay) + z]; } };
  };
  it('draws a green-grey cloth over the door of an ill home and nothing over a healthy one, for every tier', () => {
    for (const tier of [1, 2, 3, 4, 5, 6, 9]) {
      const { w, ids } = city([[10, 8]], { tier, residents: 8 });
      const home = w.buildings[ids[0]];
      const well = paint(w, home, 0);
      let ink = 0;
      for (let y = 0; y < 140; y++) for (let x = 0; x < 160; x++) if (pixelAt(well.c, x, y).slice(0, 3).join() !== [0xF3, 0xE7, 0xCB].join()) ink++;
      expect([tier, ink]).toEqual([tier, 0]);                                           // healthy: nothing
      w.day = 5; fallIll(w, home.id);
      const sick = paint(w, home, 0);
      const cloth = clothFor(home);
      const [ax, ay] = p(home.x + 0.5, home.y + 0.5);
      const xs = cloth.cloth.map((q) => Math.round(80 + 2 * (q[0] - ax))), ys = cloth.cloth.map((q) => Math.round(100 + 2 * (q[1] - ay)));
      let near = 0;                                                                        // pixels of the cloth's own colour (the draw softens it a little) inside its outline
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++) for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
        if (pixelAt(sick.c, x, y).slice(0, 3).every((v, i) => Math.abs(v - [0xA9, 0xB8, 0xA0][i]) <= 10)) near++;
      }
      expect([tier, near >= 12]).toEqual([tier, true]);
      expect(CLOTH.fill).toBe('#A9B8A0');
      expect(DOORS[tier].h).toBeGreaterThan(0);
    }
  });
  it('is the same at every moment and every Motion level: nothing sways, flashes or fades', () => {
    const { w, ids } = city([[10, 8]], { tier: 3 });
    const home = w.buildings[ids[0]];
    w.day = 5; fallIll(w, home.id);
    const shot = (t) => { const s = paint(w, home, t); return Array.from({ length: 160 * 140 }, (_, i) => pixelAt(s.c, i % 160, Math.floor(i / 160)).join()).join('|'); };
    expect(shot(0)).toBe(shot(333));
    expect(shot(0)).toBe(shot(2500));
  });
  it('draws the cloth through the interface\'s own frame hook for an ill home, and not for a healthy or a recovered one', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.milestone = 'town';
      const hut = Object.values(r.world.buildings).find((b) => b.type === 'house');
      const real = r.renderer.renderFrame;
      let cloths = 0;
      r.renderer.renderFrame = (world, cam, opts) => {
        const g = new Proxy({}, { get: (_, name) => (...a) => { if (name === 'poly' && a[1] === CLOTH.fill) cloths++; } });
        if (opts.fire) opts.fire(g, null);
        return real(world, cam, { ...opts, fire: null });
      };
      r.frame(0);
      expect(cloths).toBe(0);
      r.world.day = 3; fallIll(r.world, hut.id);
      r.frame(100);
      expect(cloths).toBe(1);
      hut.illness = null;
      r.frame(200);
      expect(cloths).toBe(1);
    } finally { r.cleanup(); }
  });
});

describe('s45 the rows on a home\'s sheet', () => {
  it('says "covered by the physician" with a physician, and why not without: none, short of workers, paused, no road', () => {
    const { w, ids } = city([[6, 9]]);
    const h = w.buildings[ids[0]];
    expect(healthRowModel(w, h)).toEqual({ text: 'no physician within 8 road tiles', action: { kind: 'showMe', item: 'physician' }, factors: 'Sickness risk builds faster: no well reaches it' });
    const doc = addRaw(w, 'physician', 8, 9);
    staffAll(w);
    expect(healthRowModel(w, h)).toEqual({ text: 'covered by the physician', action: null, factors: 'Sickness risk builds faster: no well reaches it' });
    doc.staff = 0;
    expect(keep(healthRowModel(w, h), ['text', 'action'])).toEqual({ text: 'the physician is short of workers', action: { kind: 'view', id: doc.id } });
    doc.staff = 1; doc.paused = true;
    expect(keep(healthRowModel(w, h), ['text', 'action'])).toEqual({ text: 'the physician is paused', action: { kind: 'view', id: doc.id } });
    doc.paused = false;
    addRaw(w, 'well', 6, 11);
    expect(healthRowModel(w, h).factors).toBe('');                                          // a well reaches it now, and it is not crowded or poor
    h.health = 70;
    expect(healthRowModel(w, h).text).toBe('risk high, covered by the physician');
    const lone = addRaw(w, 'house', 20, 12, { tier: 1, residents: 4 });                      // no road beside it
    expect(healthRowModel(w, lone).text).toBe('no road beside it for a physician to reach');
  });
  it('shows an ill home\'s days left at its own pace, a covered one mending twice as fast', () => {
    const { w, ids } = city([[6, 9]]);
    const h = w.buildings[ids[0]];
    w.day = 4; fallIll(w, h.id);
    h.illness.left = 21;
    expect(illnessDaysLeft(w, h)).toBe(21);
    expect(healthRowModel(w, h).text).toBe('ill, 21 days left, no physician within 8 road tiles');
    expect(healthRowModel(w, h).factors).toBe('');
    addRaw(w, 'physician', 8, 9);
    staffAll(w);
    expect(illnessDaysLeft(w, h)).toBe(11);                                                  // 21 left, two a day: 11 days
    expect(healthRowModel(w, h).text).toBe('ill, 11 days left, covered by the physician, mending twice as fast');
    h.illness.left = 1;
    expect(illnessDaysLeft(w, h)).toBe(1);
  });
  it('says "Crime risk: High" with the band, and why not covered, both ways', () => {
    const { w, ids } = city([[6, 9]], { tier: 3 });
    const h = w.buildings[ids[0]];
    h.crime = 70;
    expect(crimeRowModel(w, h)).toEqual({ text: 'High, no police post within 8 road tiles', action: { kind: 'showMe', item: 'police_post' }, factors: 'Crime risk builds faster: it is a low tier of home' });
    w.mood = 40; w.labour = { workforce: 100, employed: 80, jobs: 80, shortLevels: [] };
    expect(crimeRowModel(w, h).factors).toBe('Crime risk builds faster: it is a low tier of home; city mood is below 45; unemployment is above 10%');
    const post = addRaw(w, 'police_post', 8, 9);
    staffAll(w);
    expect(crimeRowModel(w, h).text).toBe('High, a police post reaches it');
    expect(crimeRowModel(w, h).action).toBe(null);
    post.staff = 0;
    expect(keep(crimeRowModel(w, h), ['text', 'action'])).toEqual({ text: 'High, the police post is short of workers', action: { kind: 'view', id: post.id } });
    h.tier = 6;                                                                              // a high tier: that reason goes
    w.mood = 60; w.labour = { ...FULL };
    expect(crimeRowModel(w, h).factors).toBe('');
  });
  it('has no row for an empty plot, a home with nobody in it, before Town (health) or Market town (crime), or on Peaceful', () => {
    const { w, ids } = city([[6, 9], [10, 9]]);
    const [h, plot] = homesOf(w, ids);
    plot.tier = 0; plot.residents = 0;
    expect([healthRowModel(w, plot), crimeRowModel(w, plot)]).toEqual([null, null]);
    w.milestone = 'town';
    expect(healthRowModel(w, h)).toBeTruthy();
    expect(crimeRowModel(w, h)).toBe(null);                                                  // crime starts at Market town
    w.milestone = 'village';
    expect([healthRowModel(w, h), crimeRowModel(w, h)]).toEqual([null, null]);
    w.milestone = 'market_town';
    w.difficulty = 'peaceful';
    expect([healthRowModel(w, h), crimeRowModel(w, h)]).toEqual([null, null]);
  });
  it('shows both rows on a home\'s sheet, Show me placing a physician by it and View selecting the physician', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'market_town';
      w.labour = { ...FULL };
      const hut = Object.values(w.buildings).find((b) => b.type === 'house');
      r.store.set(select(r.store.get(), hut.id));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('.threat-row').textContent).toBe(`${D.healthLabel}no physician within 8 road tiles`);
      expect([...sheet.querySelectorAll('.threat-row')].map((n) => n.firstChild.textContent)).toEqual([D.healthLabel, D.crimeLabel]);
      click(sheet.querySelector('.threat-fix .show-me'));
      const s = r.store.get();
      expect([s.tool, s.sheet]).toEqual([{ kind: 'building', type: 'physician' }, null]);
      expect(Math.abs(s.ghost.x - hut.x) + Math.abs(s.ghost.y - hut.y)).toBeLessThan(8);
      r.ui.placement.cancel();
      const doc = addRaw(w, 'physician', 14, 11);
      staffAll(w);
      doc.staff = 0;
      r.store.set(select(r.store.get(), hut.id));
      click(r.root.querySelector('#sheet .threat-fix .view'));
      expect(r.store.get().selectedId).toBe(doc.id);
      expect(homeRows({ world: w, showMeAt() {}, selectBuilding() {} }, hut).length).toBeGreaterThan(1);
    } finally { r.cleanup(); }
  });
  it('words the physician\'s and the police post\'s own sheet by what they cover or why they cover nothing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'market_town';
      const doc = addRaw(w, 'physician', 14, 11), post = addRaw(w, 'police_post', 16, 11);
      staffAll(w);
      const sheet = r.root.querySelector('#sheet');
      const small = () => [...sheet.querySelectorAll('p.small')].map((n) => n.textContent);
      r.store.set(select(r.store.get(), doc.id));
      expect(small()).toContain('Covers 2 homes');
      r.store.set(select(r.store.get(), post.id));
      expect(small()).toContain('Covers 2 homes');
      doc.staff = 0;
      r.store.set(select(r.store.get(), doc.id));
      expect(small()).toContain(D.coversNothingUntil(1, 1));
      expect(D.coversNothingUntil(1, 1)).toBe('Covers nothing until it has 1 of 1 workers');
      doc.staff = 1; doc.paused = true;
      r.store.set(select(r.store.get(), doc.id));
      expect(small()).toContain(D.coversNothingPaused);
    } finally { r.cleanup(); }
  });
});

describe('s45 Show me on an alert, the caption and the problem marker', () => {
  it('aims Show me at a physician or police post only when none reaches the home, and at the road tool with no road', () => {
    const { w, ids } = city([[6, 9]]);
    const h = w.buildings[ids[0]];
    w.day = 3; fallIll(w, h.id);
    h.crime = 80;
    const ill = { code: 'illness', id: h.id }, crime = { code: 'crime_risk', id: h.id, ids: [h.id], count: 1 };
    expect(alertShowMe(w, ill)).toEqual({ category: 'services', item: 'physician', x: 6.5, y: 9.5 });
    expect(alertShowMe(w, crime)).toEqual({ category: 'services', item: 'police_post', x: 6.5, y: 9.5 });
    const doc = addRaw(w, 'physician', 8, 9), post = addRaw(w, 'police_post', 4, 9);
    staffAll(w);
    doc.staff = 0; post.staff = 0;                                                           // short of workers: View, not Show me
    expect([alertShowMe(w, ill), alertShowMe(w, crime)]).toEqual([null, null]);
    expect(alertShowMe(w, { code: 'fire_risk', id: h.id })).toBe(null);
    const lone = addRaw(w, 'house', 20, 12, { tier: 3, residents: 6 });
    w.day = 4; fallIll(w, lone.id);
    expect(alertShowMe(w, { code: 'illness', id: lone.id })).toEqual({ category: 'roads', item: 'road', x: 20.5, y: 12.5 });
  });
  it('lists the alerts with a Show me in the Map sheet, which starts the card by the home', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'market_town';
      const hut = Object.values(w.buildings).find((b) => b.type === 'house');
      w.day = 3; fallIll(w, hut.id);
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'minimap'));
      const li = [...r.root.querySelectorAll('#sheet .alert-list li')].find((n) => n.textContent.startsWith('Sickness in a Hut'));
      expect(li.textContent).toContain('Build a physician nearby');
      click(li.querySelector('.show-me'));
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'physician' });
    } finally { r.cleanup(); }
  });
  it('captions a theft with what was taken and where, from the sim\'s own event, and fires the tips on the first illness and theft', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'market_town';
      const shown = [], tips = [];
      r.ui.celebrations.show = (c) => shown.push([c.tier, c.text]);
      r.ui.tips.trigger = (key) => { tips.push(key); return true; };
      const hut = Object.values(w.buildings).find((b) => b.type === 'house');
      w.gold = 2000; w.day = 3;
      const events = [];
      steal(w, hut, events);
      r.ui.onEvents(events);
      expect(shown).toEqual([['info', CRIME_TEXT.caption(events[0])]]);
      expect(shown[0][1].startsWith('A thief took 40 gold from the treasury')).toBe(true);
      expect(tips).toEqual(['theft']);
      r.ui.onEvents([{ type: 'illness', id: hut.id, covered: false, cause: 'risk' }]);
      expect(tips).toEqual(['theft', 'illness']);
    } finally { r.cleanup(); }
  });
  it('gives an ill home no badge: its cloth is its mark on the map', () => {
    const { w, ids } = city([[6, 9]]);
    expect(problemMarkers(w, [{ code: 'illness', id: ids[0] }, { code: 'crime_risk', id: ids[0], ids: [ids[0]], count: 1 }])).toEqual([]);
  });
});

describe('s45 goals, tips and firsts', () => {
  it('lists "Build a physician" from Town and "Build a police post" from Market town, in the Danger chapter, and not on Peaceful', () => {
    const phys = GOALS.find((g) => g.id === 'physician'), police = GOALS.find((g) => g.id === 'police_post');
    expect([phys.chapter, phys.from, phys.text, phys.reward, phys.need]).toEqual(['danger', 'town', 'Build a physician', GOAL_REWARD, { kind: 'building', type: 'physician', n: 1 }]);
    expect([police.chapter, police.from, police.text, police.reward, police.need]).toEqual(['danger', 'market_town', 'Build a police post', GOAL_REWARD, { kind: 'building', type: 'police_post', n: 1 }]);
    expect([phys.showMe.item, police.showMe.item]).toEqual(['physician', 'police_post']);
    const w = makeTestWorld({ gold: 5000 });
    w.goals.completed = GOALS.filter((g) => !['physician', 'police_post', 'pottery'].includes(g.id) && g.chapter !== 'grand' && g.chapter !== 'monuments').map((g) => g.id);
    w.milestone = 'town';
    w.tally.peakPeople = 150;
    const open = () => openGoals(w).map((g) => g.id);
    expect(open()).toContain('physician');
    expect(open().includes('police_post')).toBe(false);
    w.milestone = 'market_town';
    w.tally.peakPeople = 250;
    expect(open()).toContain('police_post');
    w.difficulty = 'peaceful';
    expect(open().includes('physician')).toBe(false);
    expect(open().includes('police_post')).toBe(false);
  });
  it('completes each goal when the building stands, and pays the first for each', () => {
    const { w } = city([[6, 9]]);
    addRaw(w, 'physician', 8, 9);
    addRaw(w, 'police_post', 4, 9);
    staffAll(w);
    const ids = FIRSTS.map((f) => f.id);
    expect(ids).toContain('first_physician');
    expect(ids).toContain('first_police_post');
    w.firsts = [];
    const events = [];
    checkFirsts(w, events);
    expect(w.firsts).toContain('first_physician');
    expect(w.firsts).toContain('first_police_post');
    expect([FIRST_TEXT.first_physician.head, FIRST_TEXT.first_police_post.head]).toEqual(['First physician', 'First police post']);
    expect(FIRST_TEXT.first_physician.why).toContain(`${HEALTH.reach} road tiles`);
    expect(FIRST_TEXT.first_police_post.why).toContain(`${CRIME.reach} road tiles`);
  });
  it('adds one tip each, on the first illness and the first theft, with numbers from the data', () => {
    expect(TIPS.find((t) => t.id === 'sickness_spreads').trigger).toBe('illness');
    expect(TIPS.find((t) => t.id === 'thieves_about').trigger).toBe('theft');
    expect(TIP_TEXT.sickness_spreads).toBe('Sickness spreads between touching homes: a staffed physician within 8 road tiles stops that and cures it twice as fast.');
    expect(TIP_TEXT.thieves_about).toBe('Poor, unhappy or jobless homes breed thieves: a police post within 8 road tiles cuts risk by up to 80%.');
    for (const id of ['sickness_spreads', 'thieves_about']) expect(TIP_TEXT[id].split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(HEALTH.reach).toBe(8);
    expect(CRIME.cut).toBe(0.8);
  });
  it('says the thieves tip cut is "up to" the data, and a post short of staff cuts less', () => {
    const { w, ids } = city([[4, 9]]);
    w.mood = 30;                                                                            // crime builds from a low mood
    const home = w.buildings[ids[0]];
    const bare = dailyCrimeRiskOf(w, home);
    expect(bare).toBeGreaterThan(0);
    const post = addRaw(w, 'police_post', 5, 11);
    staffAll(w);
    expect(Math.abs(dailyCrimeRiskOf(w, home) - bare * (1 - CRIME.cut)) < 1e-9).toBe(true);              // fully staffed: the whole of the data's cut
    expect(TIP_TEXT.thieves_about).toContain(`by up to ${Math.round(CRIME.cut * 100)}%`);
    post.staff = 0.6;                                                                       // short of staff but working: a smaller cut
    const part = dailyCrimeRiskOf(w, home);
    expect(Math.abs(part - bare * (1 - CRIME.cut * 0.6)) < 1e-9).toBe(true);
    expect(part > bare * (1 - CRIME.cut) && part < bare).toBe(true);
    expect(TIP_TEXT.thieves_about.includes('cuts risk by up to')).toBe(true);
  });
  it('words the top Health band so an ill home (risk 0) and a home at the threshold are both in it, both ways', () => {
    const { w, ids } = city([[4, 9], [6, 9]]);
    const [ill, ripe] = homesOf(w, ids);
    w.day = 5;
    fallIll(w, ill.id);
    expect([ill.health, healthBandOf(w, ill)]).toEqual([0, 3]);                             // ill, with no risk points
    ripe.health = HEALTH.threshold;
    expect(healthBandOf(w, ripe)).toBe(3);                                                  // not ill, at the threshold
    ripe.health = HEALTH.threshold - 1;
    expect(healthBandOf(w, ripe)).toBe(2);                                                  // one point short: High
    const top = D.healthBand(3).words;                                                   // an ill home is in this band, so the words say so, and no healthy home is called ill
    expect([top.includes('a home already ill is marked here too'), top.includes(`${HEALTH.threshold} or more`), D.healthBand(3).label.includes('Ill')]).toEqual([true, true, false]);
    expect(D.healthBand(2).words.includes('ill,')).toBe(false);
    expect(D.crimeBand(3).words.includes('ill')).toBe(false);
  });
  it('says what a card will cover from the ghost\'s spot', () => {
    expect(effectText('physician', 3)).toBe('Looks after 3 homes');
    expect(effectText('police_post', 1)).toBe('Watches over 1 home');
  });
  it('counts the same homes in the ghost\'s bar as the placed card\'s sheet: homes with people in them, not empty plots', () => {
    const { w } = city([[4, 9], [6, 9]]);
    addRaw(w, 'house', 8, 9, { tier: 0, residents: 0 });                                    // an empty plot in reach
    const bar = (type, x, y) => toolPreview(w, { tool: { kind: 'building', type }, ghost: { x, y } }).effect;
    expect(homesServedFrom(w, 'physician', 6, 11)).toBe(3);                                 // the plot counts for the old count...
    expect([bar('physician', 6, 11), bar('police_post', 6, 11)]).toEqual(['Looks after 2 homes', 'Watches over 2 homes']);   // ...and not for the bar
    const doc = addRaw(w, 'physician', 6, 11), post = addRaw(w, 'police_post', 7, 11);
    expect([homesCoveredBy(w, doc), crimeHomesCoveredBy(w, post)]).toEqual([2, 2]);          // what the sheets say
    for (const id of Object.keys(w.buildings)) if (w.buildings[id].type === 'house') { w.buildings[id].residents = 0; w.buildings[id].tier = 0; }
    expect([bar('physician', 12, 11), homesCoveredBy(w, doc)]).toEqual([T.noHomesInReach, 0]);   // nobody home: the bar and the sheet both say none
  });
});

describe('s45 score stays as it is (ruling 321)', () => {
  it('moves no Safety term for illness or theft: the same score row with a city full of sickness and thieves', () => {
    const { w, ids } = city([[4, 9], [6, 9], [8, 9]]);
    const before = JSON.stringify(scoreRow(w));
    w.day = 5;
    for (const id of ids) fallIll(w, id);
    for (const id of ids) w.buildings[id].crime = 90;
    steal(w, w.buildings[ids[0]], []);
    w.mood = 60;                                                                            // a mood row is not a score term
    const after = JSON.stringify(scoreRow(w));
    expect(after).toBe(before);
  });
});
