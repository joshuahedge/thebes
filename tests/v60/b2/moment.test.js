// Version 6.0 Track B2: the result of a raid in the alert row (src/ui/v60/battle.js): the words are the report's own numbers, the row is the alert row
// (never over the map, never an extra row on a phone), and it clears itself.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { raidDay, entryDir } from '../../../src/sim/raids.js';
import { footMix } from '../../../src/data/armies.js';
import { MOMENT } from '../../../src/data/battle.js';
import { B2_TEXT, B1_TEXT, TIP_TEXT, TIP_HELP_TEXT, V60_HELP } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { CHIEFTAIN } from '../../../src/data/hazards.js';
import { measureRows } from '../../../src/dev/scenes.js';
import { createBattleUi } from '../../../src/ui/v60/battle.js';
import { setBattleHooks, resetBattleHooks, unitsAt, heldAge } from '../../../src/render/units.js';
import { FIGHT } from '../../../src/data/battle.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const rowOf = (rig) => rig.root.querySelector('#banner .moment');
const WON = { index: 2, dir: 'east', size: 9, mix: footMix(9), won: true, byTowers: 3, bySoldiers: 5, towers: 1, burned: 0, stolen: 0, day: 100, burnedKinds: [], fires: [] };
const LOST = { ...WON, won: false, byTowers: 2, bySoldiers: 0, burned: 1, burnedKinds: ['potter'], stolen: 40, wrecked: 1, wreckedKinds: ['storehouse'], taken: { pottery: 12 }, chiefs: 1, chiefsFell: 0 };

// A real raid through the sim (a band of `size` on foot; soldiers and a tower to meet it, or none) until the report: what raid.last holds.
function realRaid({ size = 3, defended = false, chiefs = null } = {}) {
  const w = makeTestWorld({ fertile: [], raiderEntries: [{ x: 31, y: 10 }] });
  setRoad(w, 0, 10, 31, 10);
  const granary = addRaw(w, 'granary', 20, 11, { store: { grain: 40 } });
  if (defended) {
    const bk = addRaw(w, 'barracks', 14, 11), tw = addRaw(w, 'tower', 22, 9);
    staffAll(w);
    w.soldiers = [0, 1, 2, 3].map((i) => ({ id: w.nextUnitId++, kind: 'soldier', barracks: bk.id, x: bk.x + 1, y: bk.y + 1, hp: 12, hit: false, task: 'wait' }));
    void tw;
  }
  const e = w.raiderEntries[0];
  w.raid.index = 3; w.raid.clockDay = 0; w.day = 1100;
  w.raid.warning = { index: 2, entry: { ...e }, dir: entryDir(w, e), size, tribute: 100, target: 'granary', day: 1010, arrives: 1100, first: false, mix: footMix(size), ...(chiefs ? { chiefs } : {}) };
  const events = [];
  raidDay(w, events);
  for (let k = 0; k < 250 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
  return { report: w.raid.last, end: events.find((x) => x.type === 'raid_end'), granary };
}

describe('v60 b2 moment words', () => {
  it('says Raid beaten and The raiders got through, each with the report\'s own numbers', () => {
    const won = B2_TEXT.moment(WON);
    expect(won.title).toBe('Raid beaten');
    expect(won.detail).toBe('8 of 9 raiders stopped.');                                              // towers 3 and soldiers 5
    const lost = B2_TEXT.moment(LOST);
    expect(lost.title).toBe('The raiders got through');
    expect(lost.detail).toBe(`1 building burned, ${B1_TEXT.wrecked(['storehouse'])} wrecked, ${B1_TEXT.taken({ pottery: 12 })} taken, 40 gold stolen. 2 of 9 raiders stopped. ${B1_TEXT.chiefLine(LOST)}`);
    expect(B2_TEXT.moment({ ...WON, byTowers: 0, bySoldiers: 0 }).detail).toBe('The band turned back.');   // beaten by turning it back with no one fallen
    expect(B2_TEXT.moment({ ...LOST, burned: 0, burnedKinds: [], wrecked: 0, taken: null, stolen: 0, chiefs: 0 }).detail).toBe('They struck and left. 2 of 9 raiders stopped.');
    expect(B2_TEXT.moment({ ...WON, chiefs: 1, chiefsFell: 1, burned: 2, burnedKinds: ['potter', 'potter'] }).detail).toBe(`8 of 9 raiders stopped. ${B1_TEXT.chiefLine({ chiefs: 1, chiefsFell: 1 })} Lost: 2 buildings burned.`);
    expect(B2_TEXT.moment({ ...WON, byArchers: 1, byChariots: 2 }).detail).toBe('11 of 9 raiders stopped.'.replace('11', String(3 + 5 + 1 + 2)));   // every kind that stopped them counts
  });

  it('words a real raid from its report: what stopped the band and what it cost, both ways', () => {
    const lost = realRaid({ size: 3 });
    expect(lost.report.won).toBe(false);
    const t = B2_TEXT.moment(lost.report);
    expect(t.title).toBe('The raiders got through');
    const says = lost.report.burned ? `${lost.report.burned} building` : lost.report.taken ? `${B1_TEXT.taken(lost.report.taken)} taken` : 'They struck and left';
    expect(t.detail).toContain(says);
    const won = realRaid({ size: 3, defended: true });
    expect(won.report.won).toBe(true);
    const stopped = (won.report.byTowers || 0) + (won.report.bySoldiers || 0);
    const w = B2_TEXT.moment(won.report);
    expect(w.title).toBe('Raid beaten');
    expect(w.detail.startsWith(stopped ? `${stopped} of 3 raiders stopped.` : 'The band turned back.')).toBe(true);
    expect(won.end.report.size).toBe(3);                                                              // the event carries the same report
    const withChief = realRaid({ size: CHIEFTAIN.fromSize, chiefs: [0] });
    expect(withChief.report.chiefs).toBe(1);
    expect(B2_TEXT.moment(withChief.report).detail).toContain(B1_TEXT.chiefLine(withChief.report));
  });

  it('has the tip and the How to play words of the chieftain\'s banner, from the same numbers the sim uses', () => {
    expect(TIPS.find((t) => t.id === 'chief_banner')).toEqual({ id: 'chief_banner', trigger: 'chiefBanner', priority: false });
    expect(TIP_TEXT.chief_banner.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIP_HELP_TEXT.chief_banner).toContain(`${CHIEFTAIN.fromSize} or more`);
    expect(TIP_HELP_TEXT.chief_banner).toContain(`${CHIEFTAIN.hpFactor} times a raider's strength`);
    const help = V60_HELP.b2.map((h) => h.text).join(' ');
    expect(V60_HELP.b2.length).toBeGreaterThan(0);
    expect(help).toContain(`${CHIEFTAIN.fromSize} or more`);
    expect(help).toContain(`${MOMENT.days} game days`);
    for (const word of ['chieftain', 'banner', 'Gentle', 'Still', 'Report', 'alert row']) expect([word, help.includes(word)]).toEqual([word, true]);
  });
});

describe('v60 b2 moment in the alert row', () => {
  it('puts the result in the alert row when a raid ends, with Report and Dismiss, and says it once to a screen reader', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      expect(rowOf(rig)).toBe(null);
      rig.ui.onEvents([{ type: 'raid_end', won: false, report: LOST }]);
      await tick();
      const row = rowOf(rig);
      expect(row.parentNode.id).toBe('banner');
      expect(row.dataset.code).toBe('raid_lost');
      const t = B2_TEXT.moment(LOST);
      expect([row.querySelector('strong').textContent, row.querySelector('.small').textContent]).toEqual([t.title, t.detail]);
      expect(rig.root.ownerDocument.body.classList.contains('has-banner')).toBe(true);
      expect(rig.root.querySelector('#live').textContent).toBe(`${t.title}. ${t.detail}`);
      const [report, dismiss] = [...row.querySelectorAll('button')];
      expect([report.textContent, dismiss.textContent]).toEqual([B2_TEXT.report, B2_TEXT.dismiss]);
      for (const b of [report, dismiss]) { const r = b.getBoundingClientRect(); expect([b.textContent, r.width >= 43.5, r.height >= 43.5, b.getAttribute('aria-label').length > 0]).toEqual([b.textContent, true, true, true]); }
      expect(row.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      expect(row.querySelector('.icon').textContent).toBe('⚠');                                       // the shape says it as the colour does
      rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);                                 // a later raid replaces it
      await tick();
      expect(rig.root.querySelectorAll('#banner .moment').length).toBe(1);
      expect(rowOf(rig).dataset.code).toBe('raid_beaten');
      expect(rowOf(rig).querySelector('.icon').textContent).toBe('✔');
    } finally { rig.cleanup(); }
  });

  it('opens the city summary from Report, goes at Dismiss, after its game days, and when the next raid starts or is warned', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      const show = async () => { rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]); await tick(); return rowOf(rig); };
      let row = await show();
      row.querySelector('button.report').click();
      expect(rig.store.get().sheet.kind).toBe('summary');
      rig.store.set({ ...rig.store.get(), sheet: null });
      row.querySelector('button.dismiss').click();
      await tick();
      expect(rowOf(rig)).toBe(null);
      rig.ui.refresh();
      expect(rowOf(rig)).toBe(null);                                                                   // and stays gone
      expect(rig.root.ownerDocument.body.classList.contains('has-banner')).toBe(false);
      await show();
      rig.world.day += MOMENT.days - 1;
      rig.ui.refresh();
      expect(Boolean(rowOf(rig))).toBe(true);
      rig.world.day += 1;
      rig.ui.refresh();
      expect(rowOf(rig)).toBe(null);                                                                   // MOMENT.days game days
      await show();
      rig.ui.onEvents([{ type: 'raid_warning', index: 3 }]);
      await tick();
      expect(rowOf(rig)).toBe(null);
      await show();
      rig.ui.onEvents([{ type: 'raid_start', index: 3, dir: 'east', size: 5 }]);
      await tick();
      expect(rowOf(rig)).toBe(null);
    } finally { rig.cleanup(); }
  });

  it('stays in the alert row when the alerts redraw it, and shows with a critical alert on a wide screen but waits for the row on a phone', async () => {
    for (const [width, height, phone] of [[1280, 800, false], [390, 844, true]]) {
      const rig = await rigUI({ width, height });
      try {
        const b = addRaw(rig.world, 'potter', 20, 11, { fire: { stage: 'fire', days: 3, left: 9 } });   // a fire no firehouse reaches: a critical alert
        rig.ui.refresh();
        expect([phone, Boolean(rig.root.querySelector('#banner .critical[data-code="fire"]'))]).toEqual([phone, true]);
        rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
        await tick();
        expect([phone, Boolean(rowOf(rig))]).toEqual([phone, !phone]);                                 // a phone's alert row is one line: the fire has it
        if (phone) {
          b.fire = null;                                                                               // the fire is out
          rig.ui.refresh();
          await tick();
          expect(Boolean(rowOf(rig))).toBe(true);                                                      // the row is free: the result shows
          expect(rowOf(rig).classList.contains('line')).toBe(true);
        } else {
          expect(Boolean(rig.root.querySelector('#banner .critical[data-code="fire"]'))).toBe(true);   // both rows, the fire's first
          b.fire = null;
          rig.ui.refresh();
          await tick();
          expect(Boolean(rowOf(rig))).toBe(true);                                                      // the alerts cleared the banner and it came back
          expect(rowOf(rig).classList.contains('line')).toBe(false);
        }
      } finally { rig.cleanup(); }
    }
  });

  it('takes the phone\'s one-line row from a letter from the court, which waits behind it, and shows beside it on a wide screen', async () => {
    for (const [width, height, phone] of [[390, 844, true], [1280, 800, false]]) {
      const rig = await rigUI({ width, height });
      try {
        const banner = rig.root.querySelector('#banner');
        const letter = document.createElement('div');                                                  // the court's letter, as the alert row draws it
        letter.className = 'critical'; letter.dataset.code = 'court_letter'; letter.textContent = 'Court: a letter';
        banner.append(letter);
        rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
        await tick();
        expect([phone, Boolean(rowOf(rig))]).toEqual([phone, true]);                                   // a polite alert does not keep it off a phone
        expect([phone, getComputedStyle(letter).display === 'none']).toEqual([phone, phone]);          // the letter waits behind it on a phone, and stays on a wide screen
        expect(banner.classList.contains('moment-up')).toBe(phone);
        rowOf(rig).querySelector('button.dismiss').click();
        await tick();
        expect([phone, getComputedStyle(letter).display !== 'none', banner.classList.contains('moment-up')]).toEqual([phone, true, false]);   // dismissed: the letter is back
      } finally { rig.cleanup(); }
    }
  });

  it('is gone with the game, and takes nothing with it', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    rig.ui.onEvents([{ type: 'raid_end', won: true, report: WON }]);
    await tick();
    expect(Boolean(rowOf(rig))).toBe(true);
    rig.cleanup();
    expect(document.querySelector('#banner .moment')).toBe(null);
  });

  it('gives the renderer the Motion level and the clock, and clears any held moment, when a game starts', () => {
    const w = makeTestWorld({ fertile: [] });
    const bk = addRaw(w, 'barracks', 2, 2);
    w.raid.active = { index: 2, entry: { x: 31, y: 10 }, phase: 'attack', targetId: null, struck: [], shots: [], x: 20, y: 10, raiders: [{ id: 1, x: 11, y: 10, hp: 10, hit: false }] };
    w.soldiers = [{ id: 50, kind: 'soldier', barracks: bk.id, x: 10, y: 10, hp: 12, hit: false, task: 'out' }];
    const level = { motion: 'still' }, clock = { now: FIGHT.period.full * 0.7 };
    setBattleHooks({ hold: 123 });
    const seam = createBattleUi({ world: w, root: { querySelector: () => null }, store: { get: () => ({ layout: 'wide' }) }, effects: level, now: () => clock.now, fireTip: () => {} });
    try {
      expect(heldAge()).toBe(null);                                                                    // a new game holds nothing
      const pose = () => unitsAt(w, 0).map((u) => u.kind.split('_')[1]);
      expect(pose()).toEqual(['a', 'a']);                                                              // Still, at any time: the guard
      level.motion = 'full';
      expect(pose()).toEqual(['b', 'b']);                                                              // Full, at 0.7 of a period: the blow
      level.motion = 'gentle'; clock.now = FIGHT.period.gentle * 0.7;
      expect(pose()).toEqual(['b', 'b']);
      clock.now = FIGHT.period.gentle * 1.7;
      expect(pose()).toEqual(['a', 'a']);
    } finally { seam.destroy(); resetBattleHooks(); }
  });

  it('fires the chieftain tip once a raid with a chieftain starts, and not for a band without one', () => {
    const fired = [];
    const world = { day: 0, raid: { active: { chiefs: [{ id: 1, band: 0 }] } } };
    const seam = createBattleUi({ world, root: { querySelector: () => null }, store: { get: () => ({ layout: 'wide' }) }, effects: { motion: 'full' }, now: () => 0, fireTip: (t) => fired.push(t) });
    seam.onEvents([{ type: 'raid_start', index: 2, dir: 'east', size: 9 }]);
    world.raid.active = { chiefs: undefined };
    seam.onEvents([{ type: 'raid_start', index: 3, dir: 'east', size: 5 }]);
    expect(fired).toEqual(['chiefBanner']);
    seam.destroy();
    resetBattleHooks();
  });
});

describe('v60 b2 moment on a phone', () => {
  it('holds the height budget: the result is the alert row, one line, under the limit at each size and text size, with 44 px buttons', async () => {
    const wrong = [];
    for (const [width, height] of [[375, 667], [390, 844]]) {
      for (const textSize of [100, 125, 150]) {
        const rig = await rigUI({ width, height });
        try {
          rig.ui.settings.set({ textSize, reducedMotion: 'on' });
          rig.ui.onEvents([{ type: 'raid_end', won: false, report: LOST }]);
          await tick(); await tick();
          const m = measureRows(rig.root), at = `${width}x${height} ${textSize}%`;
          const limit = textSize >= 125 ? 0.4 : 0.3;
          if (!rowOf(rig)) { wrong.push(`${at}: no result shown (layout ${rig.store.get().layout}, banner: ${rig.root.querySelector('#banner').innerHTML.slice(0, 160)})`); continue; }
          if (m.rows > 2) wrong.push(`${at}: ${m.rows} rows`);
          if (m.rowsEnd / m.height > limit + 0.005) wrong.push(`${at}: rows end at ${Math.round((m.rowsEnd / m.height) * 100)}%, limit ${Math.round(limit * 100)}%`);
          const r = rowOf(rig).getBoundingClientRect(), frame = rig.root.getBoundingClientRect();
          if (r.left < frame.left - 1 || r.right > frame.right + 1) wrong.push(`${at}: the row runs off the screen`);
          if (rowOf(rig).querySelector('.text').scrollWidth > rowOf(rig).querySelector('.text').clientWidth + 1) wrong.push(`${at}: its words are clipped sideways`);
          for (const b of rowOf(rig).querySelectorAll('button')) { const q = b.getBoundingClientRect(); if (q.width < 43.5 || q.height < 43.5) wrong.push(`${at}: ${b.textContent} is ${Math.round(q.width)}x${Math.round(q.height)}`); }
          expect([at, rowOf(rig).classList.contains('line')]).toEqual([at, true]);
        } finally { rig.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});
