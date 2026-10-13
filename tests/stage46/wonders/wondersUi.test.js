// Stage 4.6, Wonders track (rulings 343, 393, 394): the style picker in the placing bar, the style row on a monument's sheet, and the tips. Every
// sentence is the sim's own figure in words, checked with the world set up both ways (each style, each difficulty).
import { describe, it, expect } from '../../harness.js';
import { toolPreview, ghostsFor, monumentLine } from '../../../src/ui/placement.js';
import { styleChoices, styleRowText, createWondersUi } from '../../../src/ui/s46/wonders.js';
import { costOf, workGoldPerUnit, extraGoldOf } from '../../../src/sim/costs.js';
import { desirabilityPreview } from '../../../src/sim/desirability.js';
import { MONUMENTS, MONUMENT_KINDS } from '../../../src/data/monuments.js';
import { PICKABLE_STYLES, NEW_MONUMENT_KINDS } from '../../../src/data/wonders.js';
import { S46_WONDER_TEXT, TIP_TEXT, UI4_TEXT, ALERT_TEXT, ui4Gold } from '../../../src/ui/text.js';
import { siteRows, causeText } from '../../../src/ui/monumentSheet.js';
import { siteStatus } from '../../../src/sim/monuments.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

function capital(gold = 20000, difficulty = 'normal') {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  w.difficulty = difficulty;
  w.prestigeUnlocks.pyramid_small = 0;
  w.prestigeUnlocks.pyramid_great = 0;
  return w;
}
const picks = (root) => [...root.querySelectorAll('#confirm .style-pick')];

describe('s46 wonders style picker in the placing bar', () => {
  it('offers the three styles on a monument\'s bar, Whitewashed in force, and nothing on any other bar; classic is never offered', async () => {
    const r = await rigUI({ width: 390, height: 844, world: capital() });
    try {
      const { placement } = r.ui;
      placement.start({ kind: 'building', type: 'colossus' });
      placement.moveGhost(20, 11);
      expect(picks(r.root).map((b) => [b.dataset.style, b.getAttribute('aria-pressed'), b.textContent])).toEqual([
        ['whitewashed', 'true', '✓ Whitewashed'], ['painted', 'false', 'Painted'], ['gilded', 'false', 'Gilded']]);
      expect(r.root.querySelector('#confirm .style-choices').getAttribute('role')).toBe('group');
      expect(picks(r.root).map((b) => b.dataset.style)).toEqual(PICKABLE_STYLES);
      expect(r.root.querySelector('#confirm .style-line').textContent).toBe('Plain white limestone, no extra cost');
      placement.start({ kind: 'building', type: 'well' });
      expect([picks(r.root).length, placement.style(), placement.styleChoices()]).toEqual([0, null, null]);
      placement.start({ kind: 'road' });
      expect(picks(r.root).length).toBe(0);
    } finally { r.cleanup(); }
  });

  it('makes each pick a 44 px target with an accessible name that carries its consequence, and marks the one in force with a tick as well as colour', async () => {
    const r = await rigUI({ width: 390, height: 844, world: capital() });
    try {
      r.ui.placement.start({ kind: 'building', type: 'pyramid_small' });
      r.ui.placement.moveGhost(20, 11);
      for (const b of picks(r.root)) {
        const box = b.getBoundingClientRect();
        expect([b.dataset.style, box.height >= 43.5, box.width >= 43.5]).toEqual([b.dataset.style, true, true]);
        expect(b.getAttribute('aria-label').startsWith(`${b.textContent.replace('✓ ', '')}: `)).toBe(true);
      }
      fire(picks(r.root).find((b) => b.dataset.style === 'gilded'), 'click');
      expect(picks(r.root).map((b) => [b.dataset.style, b.getAttribute('aria-pressed'), b.textContent.startsWith('✓')])).toEqual([['whitewashed', 'false', false], ['painted', 'false', false], ['gilded', 'true', true]]);
    } finally { r.cleanup(); }
  });

  it('states what each style costs and does before the tap, from the sim: the price, the crews\' gold and the homes made nicer follow the style (both ways, three difficulties)', async () => {
    for (const difficulty of ['relaxed', 'normal', 'hard']) {
      const w = capital(100000, difficulty);
      const base = costOf(w, 'pyramid_small'), gilded = costOf(w, 'pyramid_small', { style: 'gilded' });
      expect(gilded).toBeGreaterThan(base);
      const choices = styleChoices(w, 'pyramid_small', 'gilded');
      expect(choices.map((c) => [c.id, c.name, c.active])).toEqual([['whitewashed', 'Whitewashed', false], ['painted', 'Painted', false], ['gilded', 'Gilded', true]]);
      expect(choices[0].line).toBe('Plain white limestone, no extra cost');
      expect(choices[1].line).toBe('Teal and ochre bands, no extra cost');
      expect(choices[2].line).toBe(`Gold leaf: 10% more gold in all (${gilded} to found), homes in reach +1 nicer`);
      // the bar's own price and its monument line follow the style picked
      const tool = (style) => ({ kind: 'building', type: 'pyramid_small', style });
      const at = (style) => toolPreview(w, { tool: tool(style), ghost: { x: 20, y: 11 } });
      expect([difficulty, at('whitewashed').cost, at('gilded').cost]).toEqual([difficulty, base, gilded]);
      expect(at('whitewashed').line.includes(`then ${Math.round(workGoldPerUnit(w, 'whitewashed') * 20)} gold a crew a month`)).toBe(true);
      const g = workGoldPerUnit(w, 'gilded') * 20;
      expect(at('gilded').line.includes(`then ${Math.round(g)} gold a crew a month`)).toBe(true);
      expect(at('gilded').line.endsWith(monumentLine(w, 'pyramid_small', 20, 11, 0, 'gilded'))).toBe(true);
    }
  });

  it('says how many more homes a Gilded one makes nicer than a Whitewashed one, from desirabilityPreview with the style', () => {
    const w = capital();
    for (const [x, y] of [[20, 9], [21, 9], [22, 9], [23, 9], [24, 9]]) addRaw(w, 'house', x, y, { tier: 1, residents: 4 });
    const homes = (style) => desirabilityPreview(w, 'sun_temple', 21, 12, { style }).better;
    expect(homes('gilded')).toBeGreaterThanOrEqual(homes('whitewashed'));
    const line = (style) => monumentLine(w, 'sun_temple', 21, 12, 0, style);
    expect(line('gilded').includes(`finished: ${homes('gilded')} homes nicer`) || homes('gilded') === 0).toBe(true);
  });

  it('puts the style picked on the ghost\'s silhouette, founds the monument in it at its price, and starts the next one on the style last picked', async () => {
    const w = capital(10000);
    const r = await rigUI({ width: 390, height: 844, world: w });
    try {
      const { placement, store } = r.ui;
      placement.start({ kind: 'building', type: 'colossus' });
      placement.moveGhost(20, 11);
      expect(placement.setStyle('tartan')).toBe(false);                                // not a style
      expect(placement.setStyle('classic')).toBe(false);                               // classic is never offered
      expect(placement.setStyle('gilded')).toBe(true);
      expect([store.get().tool.style, placement.style()]).toEqual(['gilded', 'gilded']);
      expect(ghostsFor(w, store.get())[0].silhouette.b.style).toBe('gilded');
      const res = placement.confirm();
      expect([res.ok, w.buildings[res.id].style, w.undo[w.undo.length - 1].cost]).toEqual([true, 'gilded', 660]);   // 600 x 1.1, the price its undo would give back
      placement.start({ kind: 'building', type: 'obelisk_small' });
      expect(placement.style()).toBe('gilded');                                        // the last pick stays for the next monument
      placement.setStyle('painted');
      placement.start({ kind: 'building', type: 'obelisk_large' });
      expect(placement.style()).toBe('painted');
      placement.start({ kind: 'building', type: 'sun_temple' });
      expect(store.get().tool.style).toBe('painted');
    } finally { r.cleanup(); }
  });

  it('keeps the focus on the style button just pressed (the bar rebuilds), and the picker to one row and one line: at most 80 px, so the bar stays within the screen at 375x667', async () => {
    const r = await rigUI({ width: 375, height: 667, world: capital() });
    try {
      const seen = [];
      for (const size of ['100', '125', '150']) {
        document.body.dataset.textSize = size;
        r.ui.placement.start({ kind: 'building', type: 'pyramid_great' });
        r.ui.placement.moveGhost(20, 11);
        const painted = picks(r.root).find((b) => b.dataset.style === 'painted');
        painted.focus();
        fire(painted, 'click');
        expect([size, document.activeElement && document.activeElement.dataset.style]).toEqual([size, 'painted']);
        const bar = r.root.querySelector('#confirm').getBoundingClientRect().height, row = r.root.querySelector('#confirm .style-row').getBoundingClientRect().height;
        seen.push([size, row <= 80, Math.round(bar) <= 667 * (size === '150' ? 0.58 : 0.5)]);
        for (const b of picks(r.root)) expect([size, b.dataset.style, b.scrollWidth <= b.clientWidth + 1]).toEqual([size, b.dataset.style, true]);   // each name on one line, not cut
      }
      expect(seen).toEqual([['100', true, true], ['125', true, true], ['150', true, true]]);
    } finally { r.cleanup(); }
  });
});

describe('s46 wonders sheet row and tips', () => {
  it('says a monument\'s style on its sheet in the sim\'s words, and nothing for a classic one', () => {
    const w = capital();
    const row = (style) => { const b = insertBuilding(w, makeBuilding(w, 'colossus', 14, 8, 0, { style })); return styleRowText(w, b); };
    expect([row('classic'), row('whitewashed'), row('painted'), row('gilded')]).toEqual([
      '', 'Style: Whitewashed (no extra cost)', 'Style: Painted (no extra cost)', 'Style: Gilded (10% more gold in all, homes in reach +1 nicer)']);
    expect(styleRowText(w, addRaw(w, 'well', 3, 3))).toBe('');
    const ui = createWondersUi({ world: w });
    const gilded = Object.values(w.buildings).find((b) => b.style === 'gilded');
    expect(ui.sheetParts.building(gilded).map((n) => n.textContent)).toEqual(['Style: Gilded (10% more gold in all, homes in reach +1 nicer)']);
    expect(ui.sheetParts.building(addRaw(w, 'well', 5, 3))).toEqual([]);
  });

  it('fires each new kind\'s tip once its card is unlocked, and the styles\' tip once a monument has been founded', () => {
    const w = makeTestWorld();
    const fired = [];
    const ui = createWondersUi({ world: w, fireTip: (key) => fired.push(key) });
    w.milestone = 'city';
    ui.refresh();
    expect(fired).toEqual([]);
    w.milestone = 'great_city';
    ui.refresh();
    expect(fired).toEqual(['great_sphinxUnlocked']);
    fired.length = 0;
    w.milestone = 'capital';
    ui.refresh();
    expect(fired).toEqual(['great_sphinxUnlocked', 'sun_templeUnlocked', 'step_pyramidUnlocked']);
    fired.length = 0;
    const b = addRaw(w, 'colossus', 14, 8), well = addRaw(w, 'well', 3, 3);
    ui.onCommand({ kind: 'building', result: { ok: true, id: well.id } });
    ui.onCommand({ kind: 'building', result: { ok: false, id: b.id } });
    ui.onCommand({ kind: 'road', result: { ok: true } });
    expect(fired).toEqual([]);
    ui.onCommand({ kind: 'building', result: { ok: true, id: b.id } });
    expect(fired).toEqual(['monumentFounded']);
  });

  it('words the styles\' tip from the data and lists the new kinds\' tips in How to play', async () => {
    expect(TIP_TEXT.monument_styles).toBe(S46_WONDER_TEXT.styleTip);
    expect(TIP_TEXT.monument_styles).toBe('Pick a style on the bar. Gilded costs 10% more gold in all, and homes in reach get +1 nicer.');
    const r = await rigUI();
    try {
      const { openSheet } = await import('../../../src/ui/modes.js');
      r.store.set(openSheet(r.store.get(), 'help'));
      const items = [...r.root.querySelectorAll('#sheet .tips-list li')].map((li) => li.textContent);
      for (const type of NEW_MONUMENT_KINDS) expect([type, items.includes(S46_WONDER_TEXT.kindHelp(type))]).toEqual([type, true]);
      expect(items.includes(S46_WONDER_TEXT.styleTip)).toBe(true);
      expect(MONUMENT_KINDS.length).toBe(10);
      expect(MONUMENTS.great_sphinx.name).toBe('Great sphinx');
    } finally { r.cleanup(); }
  });
});

describe('s46 wonders the site sheet follows the monument\'s style (fix round 1)', () => {
  const site = (w, type, style) => insertBuilding(w, makeBuilding(w, type, 14, 11, 0, { style }));
  it('quotes the crews\' work gold at the site\'s own style, both ways, at each difficulty', () => {
    for (const difficulty of ['relaxed', 'normal', 'hard']) {
      const w = capital(100000, difficulty);
      const gold = (style) => siteRows(w, site(w, 'pyramid_small', style)).find((r) => r.key === 'gold').text;
      const word = (style) => UI4_TEXT.workGold(Math.round(workGoldPerUnit(w, style) * 20));
      expect([difficulty, gold('gilded')]).toEqual([difficulty, word('gilded')]);
      expect([difficulty, gold('whitewashed')]).toEqual([difficulty, word('whitewashed')]);
      expect(Math.round(workGoldPerUnit(w, 'gilded') * 20)).toBeGreaterThan(Math.round(workGoldPerUnit(w, 'whitewashed') * 20));
    }
  });

  it('quotes the gilding and the capstone at the site\'s own style in the sheet, the alert fix and Welcome back\'s cause, as the sim holds the course for it', () => {
    const w = capital(1050);
    const gilded = site(w, 'obelisk_large', 'gilded'), plain = site(w, 'obelisk_large', 'whitewashed');
    expect(extraGoldOf(w, 'obelisk_large', 'gilded')).toBe(1100);
    expect(causeText(w, gilded, 'waiting_gilding')).toBe('Waiting for 1,100 gold for the gilding');
    expect(causeText(w, plain, 'waiting_gilding')).toBe('Waiting for 1,000 gold for the gilding');
    expect(siteRows(w, gilded, { ...siteStatus(w, gilded), reason: 'waiting_gilding' }).find((r) => r.key === 'cause').text).toBe('Waiting for 1,100 gold for the gilding');
    expect(ALERT_TEXT.site_stalled({ reason: 'waiting_gilding' }, w, gilded, 'Large obelisk').fix).toBe('Waiting for 1,100 gold for the gilding');
    expect(ALERT_TEXT.site_stalled({ reason: 'waiting_gilding' }, w, plain, 'Large obelisk').fix).toBe('Waiting for 1,000 gold for the gilding');
    const pyramid = site(w, 'pyramid_great', 'gilded');
    expect(causeText(w, pyramid, 'waiting_capstone')).toBe(`Waiting for ${ui4Gold(extraGoldOf(w, 'pyramid_great', 'gilded'))} gold for the capstone`);
    expect(causeText(w, pyramid, 'waiting_capstone')).toBe('Waiting for 5,500 gold for the capstone');
  });
});
