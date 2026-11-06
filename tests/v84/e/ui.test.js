// Version 8.4, Track E (rulings 1500-1519): the war elephants' words, sound, tip, picture card and drawing. Every line is the data's or the sim's,
// each checked with the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { alertText, S46_ARMY_TEXT as A, DANGER_UI_TEXT as D, TIP_TEXT, TIP_HELP_TEXT, CARDS4_TEXT, V84E_TEXT } from '../../../src/ui/text.js';
import { arrivalText, counterParts } from '../../../src/ui/dangerSheets.js';
import { bannerModel } from '../../../src/ui/alerts.js';
import { createArmiesUi } from '../../../src/ui/s46/armies.js';
import { MOMENTS, dueCards } from '../../../src/ui/cardMoments.js';
import { TUTORIAL_CARDS } from '../../../src/data/tutorial.js';
import { TIPS } from '../../../src/data/tips.js';
import { ENEMY_TYPES, TOWER_VS, ELEPHANTS, footMix } from '../../../src/data/armies.js';
import { SFX } from '../../../src/audio/sfx.js';
import { ART } from '../../../src/render/art/registry.js';
import { createEffects, EFFECT_MS, ivoryLabel, ivoryLostLabel, STAMPEDE_LABEL } from '../../../src/render/effects.js';
import { unitsAt } from '../../../src/render/units.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

const EAST = { x: 31, y: 16 };
const ELE = { foot: 6, archer: 2, chariot: 0, boat: 0, elephant: 2 };
function warned(mix) {
  const w = makeTestWorld({ raiderEntries: [EAST] });
  const size = Object.values(mix).reduce((s, n) => s + n, 0);
  w.raid.warning = { index: 9, entry: { ...EAST }, dir: 'east', size, tribute: 200, target: 'building', day: 900, arrives: 1000, first: false, mix, ...(mix.elephant ? { elephants: mix.elephant } : {}) };
  return w;
}
const alert = { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 1000 };
const quietSfx = (log) => ({ play: (n) => { log.push(n); return true; }, buzz: () => false, unlock: () => false, names: [] });

describe('v84 e words: "War elephants!" leads the warning', () => {
  it('leads the alert, the phone sheet and the wide sheet with it, names them in the mix, and leaves a raid without them as it was', () => {
    const w = warned(ELE);
    expect(alertText(alert, w).title).toBe('War elephants! 10 raiders from the east are after your buildings');
    expect(alertText(alert, w).fix.startsWith('6 on foot, 2 archers, 2 war elephants. ')).toBe(true);
    expect(A.mixText({ ...ELE, elephant: 1 })).toBe('6 on foot, 2 archers, 1 war elephant');
    expect(A.mixLine(10, 'the east', ELE)).toBe('War elephants! 10 raiders from the east: 6 on foot, 2 archers, 2 war elephants');
    expect(arrivalText(w.raid.warning, alertText(alert, w).title, 60, true).startsWith('War elephants! 10 raiders from the east are after your buildings: 6 on foot, 2 archers, 2 war elephants.')).toBe(true);
    const plain = warned({ foot: 8, archer: 2, chariot: 0, boat: 0 });
    expect(alertText(alert, plain).title).toBe('10 raiders from the east are after your buildings');
    expect(A.mixLine(10, 'the east', plain.raid.warning.mix)).toBe('10 raiders from the east: 8 on foot, 2 archers');
  });
  it('leads the banner\'s title with it and keeps the phone\'s countdown chip short, so its countdown shows', () => {
    const w = warned(ELE);
    w.day = 900;
    const m = bannerModel(w, [alert]);
    expect([m.title.startsWith('War elephants! 10 raiders from the east'), m.chip]).toEqual([true, `Raid from the east · ${D.countdown(100)}`]);
  });
});

describe('v84 e words: what helps against war elephants', () => {
  it('says their traits and matchups from the table, the tower row and the chariots\' rule', () => {
    const lines = A.counters(ELE);
    expect(lines[2]).toBe('2 war elephants: They trample every unit beside them and break walls 3x faster; an arrow that takes one below half may send it stampeding back through its own band. Your archers deal 2x at range (1x beside one); towers 1.5x. But soldiers deal half in melee (0.75x holding a gate or breach); your chariots will not charge them.');
    expect(lines.slice(0, 2)).toEqual(A.counters({ foot: 6, archer: 2, chariot: 0, boat: 0 }));   // the other kinds' lines are as before
    expect(counterParts(warned(ELE).raid.warning).length).toBe(2);
  });
  it('follows the data the other way', () => {
    const keep = { tower: TOWER_VS.elephant, wall: ENEMY_TYPES.elephant.wallDamage, trample: ENEMY_TYPES.elephant.trample, panic: ELEPHANTS.panicChance };
    try {
      TOWER_VS.elephant = 2; ENEMY_TYPES.elephant.wallDamage = 8; ENEMY_TYPES.elephant.trample = false; ELEPHANTS.panicChance = 0;
      expect(A.counters({ ...ELE, archer: 0 })[1]).toBe('2 war elephants: Break walls 4x faster. Your archers deal 2x at range (1x beside one); towers 2x. But soldiers deal half in melee (0.75x holding a gate or breach); your chariots will not charge them.');
    } finally { TOWER_VS.elephant = keep.tower; ENEMY_TYPES.elephant.wallDamage = keep.wall; ENEMY_TYPES.elephant.trample = keep.trample; ELEPHANTS.panicChance = keep.panic; }
  });
});

describe('v84 e words: the raid report', () => {
  const base = { index: 9, dir: 'east', size: 10, mix: ELE, won: true, byTowers: 6, bySoldiers: 2, towers: 2, burned: 0, stolen: 0, day: 900, burnedKinds: [], fires: [] };
  it('adds the elephants\' line: felled, stampeded, trampled, ivory stored or lost', () => {
    expect(D.raidReport({ ...base, elephants: 2, felled: 1, stampeded: 1, trampled: 2, ivory: 10 })).toBe('Raid from the east beaten: 2 towers stopped 6 of 10, soldiers stopped 2; nothing lost. 2 war elephants: 1 felled, 1 stampeded back through its band (trampling 2 raiders); 10 ivory stored.');
    expect(V84E_TEXT.reportLine({ elephants: 1, felled: 1, ivoryLost: 10 })).toBe('1 war elephant: 1 felled; 10 ivory lost: no working storehouse had room.');
    expect(V84E_TEXT.reportLine({ elephants: 2, felled: 1, ivory: 4, ivoryLost: 6 })).toBe('2 war elephants: 1 felled; 4 ivory stored; 6 ivory lost: no working storehouse had room.');
    expect(V84E_TEXT.reportLine({ elephants: 2, stampeded: 2 })).toBe('2 war elephants: 2 stampeded back through their band.');
    expect(V84E_TEXT.reportLine({ elephants: 1 })).toBe('1 war elephant: none fell.');
  });
  it('reads a report without elephants as before', () => {
    const r = { ...base, mix: footMix(10) };
    expect(D.raidReport(r)).toBe('Raid from the east beaten: 2 towers stopped 6 of 10, soldiers stopped 2; nothing lost.');
  });
});

describe('v84 e the trumpet, the tip and the picture card', () => {
  it('plays the trumpet in place of the horn for a warning with war elephants', async () => {
    expect(SFX.trumpet.length > 0 && SFX.trumpet.every((n) => n.g <= 0.35 && n.d <= 0.5)).toBe(true);
    const played = [];
    const r = await rigUI({ sfx: quietSfx(played) });
    try {
      const ev = { type: 'raid_warning', index: 9, entry: { x: 31, y: 16 }, dir: 'east', size: 10, tribute: 240, target: 'storehouse', arrives: 90, first: false };
      r.ui.onEvents([{ ...ev, elephants: 2 }]);
      r.ui.onEvents([ev]);
      expect(played.filter((n) => n === 'horn' || n === 'trumpet')).toEqual(['trumpet', 'horn']);
    } finally { r.cleanup(); }
  });
  it('fires the war elephants\' tip for their warning and the mixed raid\'s otherwise; it keeps to 20 words', () => {
    const fired = [];
    createArmiesUi({ world: warned(ELE), fireTip: (t) => fired.push(t) }).onEvents([{ type: 'raid_warning', elephants: 2 }]);
    createArmiesUi({ world: warned({ foot: 6, archer: 2, chariot: 0, boat: 0 }), fireTip: (t) => fired.push(t) }).onEvents([{ type: 'raid_warning' }]);
    expect(fired).toEqual(['elephantsWarned', 'mixedRaidWarned']);
    expect(TIPS.find((t) => t.id === 'war_elephants').trigger).toBe('elephantsWarned');
    expect(TIP_TEXT.war_elephants).toBe('Archers and towers fell elephants; soldiers in melee do half, and chariots will not charge them.');
    expect(TIP_TEXT.war_elephants.split(/\s+/).length <= 20).toBe(true);
    expect(TIP_HELP_TEXT.war_elephants).toBe('From the 8th raid, war elephants may come. Archers deal 2x, towers 1.5x, soldiers half. One felled leaves 10 ivory.');
    expect(TIP_HELP_TEXT.war_elephants.split(/\s+/).length <= 20).toBe(true);
  });
  it('shows the elephants\' picture card at the first raid with them, and not at a raid without', () => {
    expect(TUTORIAL_CARDS[TUTORIAL_CARDS.length - 1]).toEqual({ id: 'elephants', mark: 'ring', first: 'elephants' });
    const w = CARDS4_TEXT.cards.elephants;
    expect([w.title, w.words.split('. ').length <= 3, w.words.includes(`${ENEMY_TYPES.elephant.hp} hit points`), w.words.includes(`${ELEPHANTS.ivory} ivory`)]).toEqual(['War elephants', true, true, true]);
    const seenAll = TUTORIAL_CARDS.filter((c) => c.id !== 'elephants').map((c) => `card:${c.id}`);
    expect([MOMENTS.elephants(warned(ELE)), dueCards(warned(ELE), seenAll).map((c) => c.id)]).toEqual([true, ['elephants']]);
    expect([MOMENTS.elephants(warned({ foot: 8, archer: 2, chariot: 0, boat: 0 })), dueCards(warned(footMix(6)), seenAll)]).toEqual([false, []]);
    const active = makeTestWorld({ raiderEntries: [EAST] });
    active.raid.active = { mix: { ...ELE }, raiders: [] };
    expect(MOMENTS.elephants(active)).toBe(true);
  });
});

describe('v84 e drawing: the elephant figure, the stampede and the ivory', () => {
  it('draws a raider elephant in its own slot with a bar over its rider', () => {
    expect(typeof ART['fig.raider_elephant'].draw).toBe('function');
    const w = makeTestWorld({ raiderEntries: [EAST] });
    w.raid.active = { index: 9, entry: { ...EAST }, dir: 'east', size: 2, mix: { foot: 1, archer: 0, chariot: 0, boat: 0, elephant: 1 }, raiders: [{ id: 7, kind: 'elephant', x: 20, y: 16, hp: 60, hit: false }, { id: 8, kind: 'foot', x: 21, y: 16, hp: 10, hit: false }], phase: 'attack', shots: [] };
    expect(unitsAt(w, 0, null, { now: 0 }).filter((u) => u.id >= 100000).map((u) => u.kind)).toEqual(['raider_elephant', 'raider']);
  });
  it('runs a stampede at every Motion level with its label, and labels the ivory on its store or where it was lost', () => {
    for (const motion of ['full', 'gentle', 'still']) {
      const w = makeTestWorld({ raiderEntries: [EAST] });
      const store = addRaw(w, 'storehouse', 10, 10);
      const fx = createEffects({ motionLevel: motion });
      fx.fromEvents(w, [{ type: 'stampede', id: 7, x: 20, y: 16, to: { ...EAST } }, { type: 'ivory', id: store.id, n: 10, lost: 0, x: 20, y: 16 }, { type: 'ivory', id: null, n: 0, lost: 10, x: 18, y: 16 }], 0);
      const list = fx.active(1);
      expect([motion, list.filter((e) => e.kind === 'stampede').length, list.filter((e) => e.kind === 'label').map((e) => e.text)]).toEqual([motion, 1, [STAMPEDE_LABEL, ivoryLabel(10), ivoryLostLabel(10)]]);
      expect(fx.active(EFFECT_MS.stampede + 1).filter((e) => e.kind === 'stampede').length).toBe(0);
    }
    expect([ivoryLabel(10), ivoryLostLabel(6)]).toEqual(['+10 ivory', '6 ivory lost']);
  });
});
