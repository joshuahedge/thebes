// Version 8.2 Track G (rulings 1305-1307): the flood on the Great oasis's lake, the Nilometer and the wharf on its bank (not by a spring), trade by caravan
// only (no Quay, no river partner, no Quay advice), and the words per map. Each rule is set up on a Great oasis city and on a river city.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { FLOOD_LEVELS } from '../../../src/data/river.js';
import { floodHarvestFactor, levelHarvest, onFloodplain } from '../../../src/sim/flood.js';
import { fitOf } from '../../../src/sim/fit.js';
import { canPlace } from '../../../src/sim/commands.js';
import { routeBlocker, openRoute } from '../../../src/sim/trade.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { inOasisPool } from '../../../src/sim/oases.js';
import { S46_RIVER_TEXT as R, S47_OASIS_TEXT, P_TEXT, routeBlockText, tradeReasonText } from '../../../src/ui/text.js';
import { V81_B_TEXT as B } from '../../../src/ui/v81/bText.js';
import { RIVER_SWAPS, forMap, OASIS_TEXT } from '../../../src/ui/v82/oasisText.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';

const oasis = (seed = 3) => createWorld({ seed, mapVariant: 'great-oasis' });
const river = (seed = 3) => createWorld({ seed, mapVariant: 'classic' });
// The first footprint (w x d) whose rule `ok(x, y)` holds, nearest the start first.
function spotNear(w, ok) {
  const out = [];
  for (let y = 1; y < w.size - 2; y++) for (let x = 1; x < w.size - 2; x++) if (ok(x, y)) out.push({ x, y, d: Math.hypot(x - w.focus.x, y - w.focus.y) });
  return out.sort((a, b) => a.d - b.d)[0] || null;
}
const free = (w, x, y, ww, dd) => { for (let ty = y; ty < y + dd; ty++) for (let tx = x; tx < x + ww; tx++) if (!inBounds(w.size, tx, ty) || [T.WATER, T.HILLS].includes(w.terrain[idx(w.size, tx, ty)])) return false; return true; };
const touches = (w, x, y, test) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => inBounds(w.size, a, b) && test(a, b));

describe('v82 g great oasis: the flood on the lake (ruling 1305)', () => {
  it('floods the lake\'s fertile ring as a river floods its banks: a farm there follows every level, Nilometer and all, and a farm off it does not', () => {
    for (const w of [oasis(3), oasis(11), river(3)]) {
      const farm = spotNear(w, (x, y) => onFloodplain(w, { x, y, w: 2, d: 2 }) && fitOf(w, 'farm_grain', x, y).ok);
      const dry = spotNear(w, (x, y) => !onFloodplain(w, { x, y, w: 2, d: 2 }) && fitOf(w, 'farm_grain', x, y).ok);
      expect([w.mapVariant, Boolean(farm), farm && farm.d < 14]).toEqual([w.mapVariant, true, true]);   // a floodplain farm near the start
      for (const l of FLOOD_LEVELS) {
        w.flood.applied = l.id;
        expect([w.mapVariant, l.id, floodHarvestFactor(w, { type: 'farm_grain', ...farm, w: 2, d: 2 }), dry ? floodHarvestFactor(w, { type: 'farm_grain', ...dry, w: 2, d: 2 }) : 1])
          .toEqual([w.mapVariant, l.id, levelHarvest(w, l), 1]);
      }
    }
  });
  it('lets a Nilometer and a fishing wharf stand on the great lake\'s bank, and refuses them by a spring pool ("Must touch the great lake")', () => {
    const w = oasis(3);
    const lake = (x, y) => w.terrain[idx(w.size, x, y)] === T.WATER && !inOasisPool(w, x, y);
    const spring = (x, y) => inOasisPool(w, x, y);
    const byLake = spotNear(w, (x, y) => free(w, x, y, 1, 1) && touches(w, x, y, lake));
    const bySpring = spotNear(w, (x, y) => free(w, x, y, 1, 1) && touches(w, x, y, spring) && !touches(w, x, y, lake));
    expect([fitOf(w, 'nilometer', byLake.x, byLake.y).ok, fitOf(w, 'nilometer', bySpring.x, bySpring.y).reason]).toEqual([true, 'needs_river']);
    const wharf = spotNear(w, (x, y) => free(w, x, y, 2, 1) && lake(x, y - 1) && lake(x + 1, y - 1));
    expect(fitOf(w, 'fishing_wharf', wharf.x, wharf.y).ok).toBe(true);
    expect(forMap(w, S47_OASIS_TEXT.needsRiver)).toBe('Must touch the great lake');
  });
});

describe('v82 g great oasis: trade by caravan only (ruling 1306)', () => {
  it('refuses Nubia\'s and Punt\'s routes and the Quay with no_river, says why, and never advises a Quay; a river city is as before', () => {
    const w = oasis(3), r = river(3);
    w.gold = r.gold = 99999;
    w.milestone = r.milestone = 'great_capital';
    for (const id of ['nubia', 'punt']) {
      expect([id, routeBlocker(w, id), openRoute(w, id).reason, routeBlocker(r, id)]).toEqual([id, 'no_river', 'no_river', 'no_quay']);
    }
    expect([routeBlocker(w, 'memphis'), routeBlocker(w, 'byblos')]).toEqual(['no_post', 'no_post']);   // caravans as on every map
    expect([routeBlockText('punt', 'no_river'), routeBlockText('nubia', 'no_river'), tradeReasonText('no_river')])
      .toEqual(["No river reaches this oasis: Punt's ships cannot come", "No river reaches this oasis: Nubia's boats cannot come", OASIS_TEXT.noRiver]);
    expect([canPlace(w, 'quay', w.focus.x, w.focus.y).reason, canPlace(r, 'quay', r.focus.x, r.focus.y).reason === 'no_river']).toEqual(['no_river', false]);
    expect(cityAdvice(w).some((a) => a.kind === 'quay')).toBe(false);
  });
  it('the Trade sheet says it on the route\'s row, its Open button off', async () => {
    const w = oasis(3);
    w.milestone = 'great_capital';
    const rig = await rigUI({ world: w });
    try {
      rig.store.set(openSheet(rig.store.get(), 'trade'));
      const row = rig.root.querySelector('#sheet .route[data-partner="punt"]');
      expect([row.querySelector('.reason').textContent, row.querySelector('.open-route').disabled]).toEqual(["No river reaches this oasis: Punt's ships cannot come", true]);
    } finally { rig.cleanup(); }
  });
});

describe('v82 g great oasis: the words per map (ruling 1307)', () => {
  it('every phrase the list swaps still occurs in the river words, and is swapped on the Great oasis only', () => {
    const sources = [R.nilometerIdle, R.summaryHead, R.catchRule, R.riseCaption('fair'), S47_OASIS_TEXT.needsRiver, B.nilometerBuild(80), P_TEXT.place.water.river,
      R.floodLine({ phase: 'rising', level: FLOOD_LEVELS[1], applied: FLOOD_LEVELS[1], factor: 1, prepared: false })].join(' | ');
    for (const [from, to] of RIVER_SWAPS) expect([from, sources.includes(from)]).toEqual([from, true]);
    const w = oasis(3), r = river(3);
    for (const [from, to] of RIVER_SWAPS) expect([forMap(w, from), forMap(r, from)]).toEqual([to, from]);
    expect([forMap(w, R.nilometerIdle), forMap(w, B.nilometerBuild(80)), forMap(w, R.riseCaption('fair')).startsWith('The great lake is rising')])
      .toEqual(['It needs workers to read the great lake', "Build a Nilometer (80 gold) on the great lake's bank: Show me", true]);
  });
  it('the Nilometer\'s and the wharf\'s sheets and How to play say the great lake on the Great oasis, and the river on a river map', async () => {
    for (const w of [oasis(3), river(3)]) {
      const nilo = { id: 'n', type: 'nilometer', x: 1, y: 1, w: 1, d: 1, staff: 0, paused: false };
      const wharf = { id: 'f', type: 'fishing_wharf', x: 1, y: 1, w: 2, d: 1, staff: 0, paused: false };
      const words = [...riverRows(w, nilo), ...riverRows(w, wharf)].map((n) => n.textContent).join(' | ');
      const great = w.mapVariant === 'great-oasis';
      expect([w.mapVariant, words.includes('read the great lake'), words.includes('fishes the great lake'), words.includes('the river')]).toEqual([w.mapVariant, great, great, !great]);
      const rig = await rigUI({ world: w });
      try {
        rig.store.set(openSheet(rig.store.get(), 'help'));
        const sheet = rig.root.querySelector('#sheet');
        expect([w.mapVariant, Boolean(sheet.querySelector('.help-map')), sheet.textContent.includes(OASIS_TEXT.help)]).toEqual([w.mapVariant, great, great]);
      } finally { rig.cleanup(); }
    }
  });
});
