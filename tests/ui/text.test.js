import { describe, it, expect } from '../harness.js';
import { CATEGORIES, CATEGORY_ICONS, toolForItem, AUTO_OVERLAY, KEYS } from '../../src/data/ui.js';
import { CATEGORY_NAMES, buildingName, NEED_NAMES, tierName, reasonText, warningText, unlockText, alertText, OVERLAY_NAMES, OVERLAY_LEGEND, SPEED_LABELS, dateText, plural, ACHIEVEMENT_TEXT, DAILY_TEXT, FIRST_TEXT, CONDITION_TEXT, CONDITION_MARKS, CONDITION_STATE_WORDS, conditionText, plotsPlacedText, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

const REASONS = ['unknown', 'locked', 'out_of_bounds', 'water', 'occupied', 'needs_fertile', 'needs_rocky', 'needs_road', 'no_gold', 'nothing_to_place', 'nothing_here', 'blocked', 'bad_speed', 'not_pausable', 'nothing_to_undo'];
const WARNINGS = ['needs_road', 'no_storage', 'no_supply'];
const ALERTS = ['no_road', 'no_storage', 'storage_full', 'understaffed', 'bazaar_empty', 'labour_shortage', 'unemployment', 'debt'];

describe('ui text', () => {
  it('calls the harvest grain everywhere: the achievements, the daily goal and the first harvest', () => {
    expect(ACHIEVEMENT_TEXT.good_harvests).toBe('Harvest 500 grain');
    expect(ACHIEVEMENT_TEXT.granary_of_the_river).toBe('Harvest 2000 grain');
    expect(DAILY_TEXT.harvest100).toBe('Harvest 100 grain');
    expect(FIRST_TEXT.first_harvest.why.startsWith('Grain reached')).toBe(true);
    for (const words of [ACHIEVEMENT_TEXT.good_harvests, ACHIEVEMENT_TEXT.granary_of_the_river, DAILY_TEXT.harvest100]) expect(words.includes('food')).toBe(false);
  });
  it('names every category, item and need', () => {
    for (const c of CATEGORIES) {
      expect(typeof CATEGORY_NAMES[c.id]).toBe('string');
      expect(typeof CATEGORY_ICONS[c.id]).toBe('string');
      for (const item of c.items) expect(buildingName(item).length).toBeGreaterThan(0);
    }
    for (const type of Object.keys(BUILDINGS)) expect(buildingName(type)).toBe(BUILDINGS[type].name);
    expect(buildingName('road')).toBe('Road');
    for (const need of ['road', 'water', 'food', 'religion']) expect(typeof NEED_NAMES[need]).toBe('string');
    expect(tierName(0)).toBe('Empty plot');
    expect(tierName(2)).toBe('Shack');
  });
  it('has a sentence for every reason, warning and alert', () => {
    for (const code of REASONS) expect(reasonText(code) === reasonText('__none__')).toBe(false);
    for (const code of WARNINGS) expect(warningText(code).length).toBeGreaterThan(0);
    const w = makeTestWorld();
    const farm = addRaw(w, 'farm_grain', 0, 0);
    for (const code of ALERTS) {
      const t = alertText({ code, id: farm.id, level: 'essential' }, w);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.fix.length).toBeGreaterThan(0);
    }
    expect(alertText({ code: 'no_storage', id: farm.id }, w).fix).toContain(String(BUILDINGS.farm_grain.producerReach));
    expect(alertText({ code: 'bazaar_empty', id: farm.id }, w).fix).toContain(String(BUILDINGS.bazaar.supplyReach));
  });
  it('words the plots with no road: plots, or homes once people live in them, the toast by how many lack a road (placement review P13, P14)', () => {
    const w = makeTestWorld();
    const empty = [addRaw(w, 'house', 20, 20), addRaw(w, 'house', 21, 20)], lived = addRaw(w, 'house', 25, 25, { tier: 2, residents: 6 });
    expect(alertText({ code: 'plots_no_road', count: 2, ids: empty.map((h) => h.id) }, w)).toEqual({ title: '2 plots have no road', fix: 'Draw a road beside them' });
    expect(alertText({ code: 'plots_no_road', count: 1, ids: [empty[0].id] }, w)).toEqual({ title: '1 plot has no road', fix: 'Draw a road beside it' });
    expect(alertText({ code: 'plots_no_road', count: 3, ids: [empty[0].id, empty[1].id, lived.id] }, w).title).toBe('3 homes have no road');
    expect(plotsPlacedText(6, 0)).toBe('6 plots placed');
    expect(plotsPlacedText(6, 6)).toBe('6 plots placed · no road yet');
    expect(plotsPlacedText(1, 1)).toBe('1 plot placed · no road yet');
    expect(plotsPlacedText(6, 2)).toBe('6 plots placed · 2 with no road yet');
  });
  it('words each placing condition in each state, with a mark and a state that never rest on colour (placement review P9)', () => {
    expect(CONDITION_MARKS).toEqual({ met: '✓', later: '!', cant: '✕' });
    expect(Object.keys(CONDITION_STATE_WORDS)).toEqual(['met', 'later', 'cant']);
    const ground = (state, reason, extra = {}) => ({ key: 'ground', state, reason, ...extra });
    expect(conditionText(ground('met', null), 'well')).toBe('Free ground');
    expect(conditionText(ground('met', null), 'farm_grain')).toBe('Fertile land');
    expect(conditionText(ground('met', null), 'gem_mine')).toBe('Rocky ground');
    expect(conditionText(ground('cant', 'needs_fertile', { terrain: 'fertile', fit: 2, of: 4 }), 'farm_grain')).toBe('Fertile land: 2 of 4 tiles');
    expect(conditionText(ground('cant', 'needs_rocky', { terrain: 'rocky', fit: 0, of: 4 }), 'gem_mine')).toBe('Rocky ground: 0 of 4 tiles');
    expect([conditionText(ground('cant', 'occupied'), 'well'), conditionText(ground('cant', 'water'), 'well'), conditionText(ground('cant', 'out_of_bounds'), 'well')]).toEqual(['Ground taken', 'Water here', 'Off the map']);
    expect(conditionText({ key: 'road', state: 'met', reason: null }, 'well')).toBe('Road beside it');
    expect(conditionText({ key: 'road', state: 'later', reason: 'needs_road' }, 'well')).toBe('No road yet');
    expect(conditionText({ key: 'road', state: 'cant', reason: 'needs_road' }, 'well')).toBe(reasonText('needs_road'));
    expect(conditionText({ key: 'works', state: 'later', reason: 'no_storage' }, 'farm_grain')).toBe('No granary near');
    expect(conditionText({ key: 'works', state: 'later', reason: 'no_storage' }, 'potter')).toBe('No storehouse near');
    expect(conditionText({ key: 'works', state: 'later', reason: 'no_storage' }, 'potter', { refused: true })).toBe('No storehouse takes pottery');
    expect(conditionText({ key: 'works', state: 'met', reason: null }, 'farm_grain')).toBe('Granary near');
    expect(conditionText({ key: 'works', state: 'later', reason: 'no_supply' }, 'bazaar')).toBe(warningText('no_supply'));
    expect(conditionText({ key: 'gold', state: 'cant', reason: 'no_gold', cost: 60, have: 40 }, 'farm_grain')).toBe('Not enough gold: 60 needed, you have 40');
    expect(CONDITION_TEXT.roadHint).toBe('No road yet: draw one on a marked tile');
    expect([CONDITION_TEXT.terrainLine('farm_grain'), CONDITION_TEXT.terrainLine('gem_mine'), CONDITION_TEXT.terrainLine('well')]).toEqual(['On fertile land', 'On rocky ground', '']);
    expect([CONDITION_TEXT.terrainLine('farm_flax', true), CONDITION_TEXT.terrainLine('gem_mine', true)]).toEqual(['Fertile land', 'Rocky ground']);
  });
  it('maps items to tools and services to their overlay', () => {
    expect(toolForItem('road')).toEqual({ kind: 'road' });
    expect(toolForItem('demolish')).toEqual({ kind: 'demolish' });
    expect(toolForItem('house')).toEqual({ kind: 'houses' });
    expect(toolForItem('well')).toEqual({ kind: 'building', type: 'well' });
    expect(AUTO_OVERLAY.well).toBe('water');
    expect(unlockText('house')).toBe('Unlocks at Village');
    expect(unlockText('nothing')).toBe('Comes later');
  });
  it('covers the keyboard map, overlays, speeds and dates', () => {
    for (const k of ['pause', 'speedUp', 'speedDown', 'panLeft', 'panRight', 'panUp', 'panDown', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'help']) expect(KEYS[k].length).toBeGreaterThan(0);
    expect(KEYS.category.length).toBe(7);
    for (const o of ['water', 'food', 'religion', 'housing']) { expect(typeof OVERLAY_NAMES[o]).toBe('string'); expect(OVERLAY_LEGEND[o].length).toBe(2); }
    expect(SPEED_LABELS).toEqual(['Paused', '1×', '2×', '3×']);
    expect(dateText({ year: 2, month: 3, day: 4 })).toBe('Year 2, month 3, day 4');
    expect(plural(1, 'month', 'months')).toBe('1 month');
    expect(plural(2, 'month', 'months')).toBe('2 months');
    expect(T.place).toBe('Place');
  });
  it('never says the forbidden word', async () => {
    const src = await (await fetch('/src/ui/text.js')).text();
    expect(/pharaoh/i.test(src)).toBe(false);
  });
});
