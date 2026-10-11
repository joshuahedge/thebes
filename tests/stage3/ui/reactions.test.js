import { describe, it, expect } from '../../harness.js';
import { firstWatered, placeName } from '../../../src/ui/danger.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createEffects, EFFECT_MS } from '../../../src/render/effects.js';
import { DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { DANGER_UI_TEXT as D, DIFFICULTY_NAMES, T } from '../../../src/ui/text.js';
import { addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };
const settingsWith = (patch = {}, reduced = true) => {
  const s = createSettings({ storage: noStorage, root: document.body, systemReducedMotion: () => reduced });
  s.set(patch);
  return s;
};
const quietSfx = (log) => ({ play: (n) => { log.push(n); return true; }, buzz: () => false, unlock: () => false, names: [] });

describe('s3 ui speed reactions', () => {
  it('drops a running game to 1x on a fire no staffed firehouse reaches (Just tell me), and leaves a paused game paused', async () => {
    const r = await rigUI({ settings: settingsWith({ fireReaction: 'inform' }) });
    try {
      const potter = addRaw(r.world, 'potter', 20, 11);
      r.ui.speedControl.set(3);
      r.ui.onEvents([{ type: 'fire', id: potter.id, covered: true, first: false }]);
      expect(r.world.speed).toBe(3);                                                   // a covered blaze: no change (spec 4.3)
      r.ui.onEvents([{ type: 'fire', id: potter.id, covered: false, first: false }]);
      expect(r.world.speed).toBe(1);
      r.ui.speedControl.set(2);
      r.ui.onEvents([{ type: 'fire_grow', id: potter.id, covered: false }]);
      expect(r.world.speed).toBe(2);                                                   // the same fire growing: no second reaction
      const granary = Object.values(r.world.buildings).find((b) => b.type === 'granary');
      r.ui.speedControl.set(0);
      r.ui.onEvents([{ type: 'fire', id: granary.id, covered: false, first: false }]);
      expect(r.world.speed).toBe(0);                                                   // "drop to 1x" never starts a paused game
    } finally { r.cleanup(); }
  });

  it('pauses on Pause, and on Go to it drops to 1x and moves the camera to the fire', async () => {
    const r = await rigUI({ settings: settingsWith({ fireReaction: 'pause' }) });
    try {
      const potter = addRaw(r.world, 'potter', 26, 4);
      r.ui.speedControl.set(2);
      r.ui.onEvents([{ type: 'fire', id: potter.id, covered: false, first: false }]);
      expect(r.world.speed).toBe(0);
      r.ui.settings.set({ fireReaction: 'goto' });
      const bazaar = Object.values(r.world.buildings).find((b) => b.type === 'bazaar');
      r.ui.speedControl.set(3);
      r.ui.onEvents([{ type: 'fire', id: bazaar.id, covered: false, first: false }]);
      expect([r.world.speed, r.cam.x, r.cam.y]).toEqual([1, bazaar.x + bazaar.w / 2, bazaar.y + bazaar.d / 2]);   // reduced motion: an instant cut
      r.ui.speedControl.set(0);
      r.ui.onEvents([{ type: 'fire', id: potter.id, covered: false, first: true }]);   // the sim paused for the city's first
      expect(r.world.speed).toBe(0);
    } finally { r.cleanup(); }
  });
});

describe('s3 ui sound and captions', () => {
  it('plays the horn once as a raid warning appears and the coin tick when the month\'s taxes arrive', async () => {
    const played = [];
    const r = await rigUI({ sfx: quietSfx(played) });
    try {
      const only = () => played.filter((n) => n === 'horn' || n === 'coin');
      r.ui.onEvents([{ type: 'raid_warning', index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 6, tribute: 240, target: 'storehouse', arrives: 90, first: false }]);
      expect(only()).toEqual(['horn']);
      r.world.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, net: 0 };
      r.ui.onEvents([{ type: 'month' }]);
      expect(only()).toEqual(['horn']);                                                // no taxes, no tick
      r.world.stats.lastMonth = { taxes: 42, wages: 10, upkeep: 6, net: 26 };
      r.ui.onEvents([{ type: 'month' }]);
      expect(only()).toEqual(['horn', 'coin']);
    } finally { r.cleanup(); }
  });

  it('captions a blaze or fire put out and a raid\'s report, in words that follow the event', async () => {
    const r = await rigUI();
    try {
      const shown = [];
      r.ui.celebrations.show = (c) => shown.push(c);
      const potter = addRaw(r.world, 'potter', 20, 11);
      const hut = Object.values(r.world.buildings).find((b) => b.type === 'house');
      r.ui.onEvents([{ type: 'fire_out', id: potter.id, stage: 'blaze' }, { type: 'fire_out', id: hut.id, stage: 'fire' }]);
      expect(shown.map((c) => [c.tier, c.text])).toEqual([['info', 'The firehouse put out a blaze at the potter'], ['info', `The firehouse put out a fire at the ${placeName(hut)}`]]);
      expect(placeName(hut)).toBe('hut');
      const report = { index: 1, dir: 'east', size: 12, won: true, byTowers: 9, bySoldiers: 3, towers: 2, burned: 1, stolen: 40, day: 900 };
      r.ui.onEvents([{ type: 'raid_end', won: true, report }]);
      expect(shown[2].text).toBe('Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 building burned, 40 gold stolen.');
    } finally { r.cleanup(); }
  });

  it('words every raid report from its numbers: beaten or lost, with and without towers, soldiers and losses', () => {
    const base = { index: 1, dir: 'north', size: 6, towers: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, day: 1 };
    expect(D.raidReport({ ...base, won: true, towers: 1, byTowers: 3 })).toBe('Raid from the north beaten: 1 tower stopped 3 of 6; nothing lost.');
    expect(D.raidReport({ ...base, won: true, bySoldiers: 4, stolen: 15 })).toBe('Raid from the north beaten: soldiers stopped 4; 15 gold stolen.');
    expect(D.raidReport({ ...base, won: false, burned: 3, stolen: 120, byTowers: 1 })).toBe('Raid from the north: raiders burned 3 buildings and took 120 gold. Towers stopped 1 of 6.');
    expect(D.raidReport({ ...base, won: false, burned: 1 })).toBe('Raid from the north: raiders burned 1 building.');
    expect(D.raidReport({ ...base, won: false, bySoldiers: 2 })).toBe('Raid from the north: the raiders struck and left. Soldiers stopped 2.');
  });
});

describe('s3 ui water ripple', () => {
  it('ripples each home a newly placed well is the first to water, and none under reduced motion', async () => {
    for (const reduced of [false, true]) {
      const world = uiWorld();                                                        // a well at (15, 11) waters the huts at (12, 9) and (13, 9)
      const near = addRaw(world, 'house', 26, 9, { tier: 1, residents: 2 });
      const plot = addRaw(world, 'house', 27, 9);
      staffAll(world);
      expect(firstWatered(world, addRaw(world, 'well', 17, 11)).map((h) => h.id)).toEqual([]);   // its homes already have water
      const r = await rigUI({ world, settings: settingsWith({}, reduced) });
      try {
        r.ui.placement.start({ kind: 'building', type: 'well' }, null);
        r.ui.placement.moveGhost(27, 11);
        expect(r.ui.placement.confirm().ok).toBe(true);
        const rings = r.ui.effects.active(0).filter((e) => e.kind === 'ripple');
        expect([reduced, rings.map((e) => [e.x, e.y])]).toEqual([reduced, reduced ? [] : [[near.x + 0.5, near.y + 0.5], [plot.x + 0.5, plot.y + 0.5]]]);
      } finally { r.cleanup(); }
    }
    const fx = createEffects({ reducedMotion: false });
    fx.ripple(3, 3, 0);
    expect([EFFECT_MS.ripple, fx.count(EFFECT_MS.ripple - 1), fx.count(EFFECT_MS.ripple + 1)]).toEqual([800, 1, 0]);
  });
});

describe('s3 ui settings rows', () => {
  function rig(reduced = false) {
    const { root, cleanup } = mount('<div id="body"></div>');
    const settings = createSettings({ storage: noStorage, root, systemReducedMotion: () => reduced });
    const store = createStore(INITIAL_UI_STATE);
    const menus = createMenuSheets({ store, settings, toasts: { show() {} } });
    const body = root.querySelector('#body');
    menus.settings(body, { close() {} });
    return { body, settings, cleanup };
  }

  it('adds On a fire (Pause, Go to it, Just tell me) and Ambient motion, Off and disabled while reduced motion is on', () => {
    const r = rig(false);
    try {
      const choices = [...r.body.querySelectorAll('.choice.fireReaction')];
      expect(choices.map((b) => [b.dataset.value, b.textContent])).toEqual([['pause', 'Pause'], ['goto', 'Go to it'], ['inform', 'Just tell me']]);
      expect(r.body.querySelector('.choice.fireReaction[data-value="inform"]').getAttribute('aria-pressed')).toBe('true');
      fire(choices[1], 'click');
      expect(r.settings.get().fireReaction).toBe('goto');
      expect(r.body.querySelector('.fire-note').textContent).toBe(D.onAFireNote);
      const ambient = r.body.querySelector('.switch.ambient');
      const note = r.body.querySelector('.ambient-note');
      expect([ambient.textContent.startsWith(D.ambient), ambient.getAttribute('aria-checked'), ambient.disabled, note.hidden]).toEqual([true, 'true', false, true]);
      fire(ambient, 'click');
      expect([r.settings.get().ambient, ambient.getAttribute('aria-checked')]).toEqual([false, 'false']);
      fire(ambient, 'click');
      fire(r.body.querySelector('.choice.reducedMotion[data-value="on"]'), 'click');
      expect([ambient.getAttribute('aria-checked'), ambient.querySelector('.state').textContent, ambient.disabled, note.hidden]).toEqual(['false', T.off, true, false]);
      expect(r.settings.get().ambient).toBe(true);                                     // the choice is kept for when motion is back
      fire(r.body.querySelector('.choice.reducedMotion[data-value="off"]'), 'click');
      expect([ambient.getAttribute('aria-checked'), ambient.disabled]).toEqual(['true', false]);
    } finally { r.cleanup(); }
  });

  it('offers Peaceful first among the levels for new cities, every choice a 44 px button inside the sheet at 150% text', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set(openSheet(r.store.get(), 'settings'));
      const sheet = r.root.querySelector('#sheet').getBoundingClientRect();
      const levels = [...r.root.querySelectorAll('#sheet .choice.difficulty')];
      expect(levels.map((b) => b.textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(levels[0].textContent).toBe('Peaceful');
      for (const b of [...levels, ...r.root.querySelectorAll('#sheet .choice.fireReaction'), r.root.querySelector('#sheet .switch.ambient')]) {
        const box = b.getBoundingClientRect();
        expect([b.textContent, box.height >= 44, box.left >= sheet.left - 0.5, box.right <= sheet.right + 0.5]).toEqual([b.textContent, true, true, true]);
      }
    } finally { r.cleanup(); }
  });
});
