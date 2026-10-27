// Version 8.2.1 "Easier ferries" (rulings 1340-1359): the Ferry tool's interface. The crossings it shows (ghost boats with their price), a tap that picks one and the
// tick that builds it, the bar's crossing buttons (named, 44 px, a keyboard path), a wobbly drag that snaps, the plain words when no crossing is near the roads, and
// the road tool's Show me that opens the Ferry tool with its crossings.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { addRaw, setRoad } from '../../helpers/testWorld.js';
import { ferryWorld, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { toolPreview, ghostsFor, fitTarget } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { FERRY_TEXT } from '../../../src/ui/v71/ferryText.js';
import { ferryChoices } from '../../../src/sim/ferryFind.js';
import { ferrySpot, landingsOf } from '../../../src/sim/ferries.js';
import { idx } from '../../../src/sim/grid.js';

const FROM = { x: RIVER_X + 3.5, y: ROW + 0.5 };
const store = (tool, extra = {}) => createStore({ ...INITIAL_UI_STATE, mode: 'drawing', tool, ...extra });
const ferry = (extra = {}) => ({ kind: 'ferry', from: FROM, pick: null, ...extra });
const sized = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };
// The far bank has no road; a road runs all along the west bank (x = 10), so several crossings are shown, each with a stub on the far bank; homes give ferrymen.
function bankWorld() {
  const w = ferryWorld(7, { roads: false });
  setRoad(w, 4, ROW, RIVER_X - 2, ROW);
  setRoad(w, RIVER_X - 2, 0, RIVER_X - 2, w.size - 1);
  return w;
}

describe('v821 f ui: the crossings the Ferry tool shows', () => {
  it('shows the crossings near the roads as ghost boats with their price, and the bar says how to pick one', () => {
    const w = bankWorld();
    const shown = ferryChoices(w, FROM);
    const p = toolPreview(w, store(ferry(), { inputType: 'touch' }).get());
    expect([p.state, p.text, p.choices.length, shown.length > 1]).toEqual(['idle', FERRY_TEXT.idleTouch, shown.length, true]);
    const g = ghostsFor(w, store(ferry()).get());
    const boats = g.filter((s) => s.boat);
    expect(boats.map((s) => s.boat.label)).toEqual(shown.map((c) => `${c.cost} gold`));
    expect(boats.every((s) => !s.boat.picked)).toBe(true);
    expect(g.filter((s) => s.state === 'shown').length).toBe(shown.reduce((n, c) => n + 2 + c.water, 0));
    expect(g.filter((s) => s.state === 'stub').length).toBe(shown.reduce((n, c) => n + c.roads.length, 0));
  });

  it('a picked crossing is drawn as accepted with its stubs, its price is the bar\'s, and the other shown crossings stay to switch to', () => {
    const w = bankWorld();
    const [a, b] = ferryChoices(w, FROM);
    const s = store(ferry({ pick: a.key }));
    const p = toolPreview(w, s.get());
    expect([p.state, p.cost, p.text]).toEqual(['ok', a.cost, `Ferry: 7 tiles of water · ${a.roads.length} road tiles · ${p.text.split(' · ')[2]}`]);   // Version 8.3: led by its kind
    const g = ghostsFor(w, s.get());
    const picked = g.filter((x) => x.boat && x.boat.picked);
    expect([picked.length, picked[0].boat.label, g.filter((x) => x.boat).length]).toEqual([1, `${a.cost} gold`, ferryChoices(w, FROM).length]);
    expect(g.filter((x) => x.state === 'stub' && !x.faint).map((x) => [x.x, x.y])).toEqual(a.roads);
    expect(toolPreview(w, store(ferry({ pick: b.key })).get()).cost).toBe(b.cost);
  });

  it('when no crossing is near the roads it says so plainly, and Show me goes to the nearest place a ferry could cross', () => {
    const w = ferryWorld(7, { roads: false });
    setRoad(w, 0, 30, 3, 30);                                                   // a road far from the river
    const s = store(ferry());
    const p = toolPreview(w, s.get());
    expect([p.state, p.reason, p.text, p.showFit]).toEqual(['bad', 'ferry_none_near', FERRY_TEXT.noneNear, true]);
    expect(FERRY_TEXT.noneNear).toBe('No water near your roads that a bridge or a ferry can cross: extend a road along the bank');   // Version 8.3: the Crossing card
    const t = fitTarget(w, s.get()), spot = ferrySpot(w, FROM);
    expect([t.kind, t.x, t.y]).toEqual(['ferry', spot.x + 0.5, spot.y + 0.5]);
    expect(ghostsFor(w, s.get())).toEqual([]);
  });
});

describe('v821 f ui: tap one, then ✓', () => {
  it('a tap on a shown crossing picks it, another tap switches, ✓ builds both landings and the road, and Undo takes it all back', async () => {
    const w = bankWorld();
    addRaw(w, 'house', 2, 2, { tier: 1, residents: 40 });
    const r = await rigUI({ world: w });
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'ferry' }, FROM);
      const [a, b] = ferryChoices(w, FROM);
      pl.toggleTile(a.mid[0], a.mid[1] + 1);                                   // a finger's tap beside the ghost's water still picks it
      expect(r.store.get().tool.pick).toBe(a.key);
      pl.toggleTile(b.landings[1][0], b.landings[1][1]);
      expect(r.store.get().tool.pick).toBe(b.key);
      r.frame(0);
      const bar = r.root.querySelector('#confirm .confirm');
      expect([bar.querySelector('.name').textContent, bar.querySelector('.cost').textContent.startsWith(`${b.cost} gold`), bar.querySelector('.reason').textContent.startsWith('Ferry: 7 tiles of water')]).toEqual(['Crossing', true, true]);   // Version 8.3: the Crossing card
      const gold = w.gold;
      fire(r.root.querySelector('#confirm .ok'), 'click');
      const e = w.undo[w.undo.length - 1];
      expect([landingsOf(w).map((l) => [l.x, l.y]), e.cost + e.roadCost, gold - w.gold >= 0]).toEqual([b.landings, b.cost, true]);   // the price shown is what it cost (a goal's reward may come back)
      expect(b.roads.every(([x, y]) => w.road[idx(w.size, x, y)] === 1)).toBe(true);
      r.ui.placement.undo();
      expect([landingsOf(w).length, b.roads.some(([x, y]) => w.road[idx(w.size, x, y)] === 1)]).toEqual([0, false]);
    } finally { r.cleanup(); }
  });

  it('the bar\'s crossing buttons are named for the water and the price, 44 px, and Tab, the arrows and Enter pick and build from the keyboard', async () => {
    const w = bankWorld();
    const r = await rigUI({ world: w, width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'ferry' }, FROM);
      r.frame(0);
      const shown = ferryChoices(w, FROM);
      const buttons = () => [...r.root.querySelectorAll('#confirm .crossing-pick')];
      expect(buttons().map((x) => x.getAttribute('aria-label'))).toEqual(shown.map((c) => FERRY_TEXT.choiceLabel(c.water, c.cost, c.roads.length)));
      expect(FERRY_TEXT.choiceLabel(7, 160)).toBe('Ferry crossing, 7 tiles of water, 160 gold');
      expect(buttons().every((x) => sized(x).every(Boolean))).toBe(true);
      expect(r.root.querySelector('#confirm .crossing-choices').getAttribute('aria-label')).toBe(FERRY_TEXT.choicesGroup);
      buttons()[0].focus();
      expect([r.store.get().tool.pick, buttons()[0].getAttribute('aria-pressed'), buttons()[0].textContent.startsWith('✓')]).toEqual([shown[0].key, 'true', true]);
      fire(document.activeElement, 'keydown', { key: 'ArrowRight' });
      expect([r.store.get().tool.pick, document.activeElement.dataset.crossing]).toEqual([shown[1].key, shown[1].key]);
      fire(document.activeElement, 'keydown', { key: 'Enter' });
      expect(landingsOf(w).map((l) => [l.x, l.y])).toEqual(shown[1].landings);
    } finally { r.cleanup(); }
  });

  it('a wobbly drag still works: it snaps to the straight crossing, drawn with its stub', () => {
    const w = bankWorld();
    const wobbly = [[RIVER_X - 1, ROW], [RIVER_X, ROW], [RIVER_X + 1, ROW], [RIVER_X + 2, ROW + 1], [RIVER_X + 3, ROW + 1], [RIVER_X + 4, ROW + 1], [RIVER_X + 5, ROW + 2], [RIVER_X + 6, ROW + 2], [RIVER_X + 7, ROW + 2]];
    const s = store(ferry(), { plan: { tiles: wobbly }, inputType: 'touch' });
    const p = toolPreview(w, s.get());
    expect([p.state, p.landings]).toEqual(['ok', [[RIVER_X - 1, ROW], [RIVER_X + 7, ROW]]]);
    const g = ghostsFor(w, s.get());
    expect(g.map((x) => x.state)).toEqual(['ok', ...Array(7).fill('ferry'), 'ok', 'stub', 'stub', 'stub']);
  });
});

describe('v821 f ui: Show me and the words', () => {
  it('the road\'s "too wide for a bridge" Show me opens the Ferry tool with its crossings, ranked from there', async () => {
    const w = bankWorld();
    const r = await rigUI({ world: w });
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'road' });
      addRaw(w, 'well', RIVER_X + 7, 20);                                       // Version 8.3: the road lays a ferry itself; a far bank built on is refused, with Show me
      pl.pointAt(RIVER_X - 2, 20); pl.pointAt(RIVER_X + 10, 20);
      r.frame(0);
      const t = fitTarget(w, r.store.get());
      expect([t.kind, Boolean(t.crossing)]).toEqual(['ferry', true]);
      fire(r.root.querySelector('#confirm .show-fit'), 'click');
      const tool = r.store.get().tool;
      expect([tool.kind, tool.from]).toEqual(['ferry', { x: t.x, y: t.y }]);
      r.frame(0);
      expect(r.root.querySelectorAll('#confirm .crossing-pick').length).toBe(ferryChoices(w, tool.from).length);
    } finally { r.cleanup(); }
  });

  it('an impossible drag still refuses with Show me; the card, How to play and the tip say the new way', () => {
    const wide = ferryWorld(13);
    const p = toolPreview(wide, store(ferry(), { line: { x0: RIVER_X - 2, y0: ROW, x1: RIVER_X + 14, y1: ROW, flip: false } }).get());
    expect([p.state, p.reason, p.showFit]).toEqual(['bad', 'ferry_too_wide', true]);
    // Version 8.3 (Track X): the Crossing card's line says both limits, and the tip is the crossings tip
    expect([FERRY_TEXT.card.startsWith('Cross water'), FERRY_TEXT.cardTitle(160).includes('Pick one of the crossings the map shows'), FERRY_TEXT.help.text.includes('tap one, then ✓'), FERRY_TEXT.tip.includes('a ferry 5 to 12')]).toEqual([true, true, true, true]);
    expect(FERRY_TEXT.idleMouse).toBe('Click a crossing, then ✓ · or click both banks');
  });
});
