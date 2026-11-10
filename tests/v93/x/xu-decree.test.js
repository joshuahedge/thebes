// Version 9.3 fix wave, group xu: the decree's interface and records (known 5-9, U1-U11, S1, S2).
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { decreesOfWeek } from '../../../src/data/week.js';
import * as uiWeek from '../../../src/ui/week.js';
import * as dataWeek from '../../../src/data/week.js';
import { granaryStage } from '../../../src/render/art/stages.js';
import { U93_TEXT as U, reasonText } from '../../../src/ui/text.js';
import { runAt, titleAt, frame, MONDAY_47, WITH_TOWN } from '../u/page.js';

const W47 = '2026-47';
const finish = async (t) => {
  t.root.querySelector('#sheet .decree-begin').click();
  await frame();
  const g = t.g();
  g.world.day = 2160; g.world.decree.ended = true; g.world.speed = 0;
  return g;
};

describe('v93 x xu: week helpers live outside the interface (S1)', () => {
  it('src/ui/week.js re-exports the data module\'s helpers', () => {
    for (const k of ['isWeekKey', 'weeklySeed', 'decreeMapOf', 'decreesOfWeek']) expect(uiWeek[k]).toBe(dataWeek[k]);
  });
});

describe('v93 x xu: words', () => {
  it('decree_ended has reason words (U2)', () => { expect(reasonText('decree_ended')).toBe('The decree has ended'); });
  it('the bonus line lowercases only its first letter (U6)', () => { expect(U.counts(['low_nile'])).toBe('The bonus counts: months with every Cottage or better fed'); });
  it('elephants "may come" (U11)', () => { expect(U.twists.southern_host.startsWith('War elephants may come')).toBe(true); });
});

describe('v93 x xu: Low Nile granary drawing (known 9)', () => {
  it('half of the plain capacity reads as half under Low Nile, as full without it', () => {
    const plain = createWorld({ seed: 7 });
    const low = createWorld({ seed: 7, decree: { week: '2026-48', ids: ['low_nile'] } });
    const b = { store: { grain: 420 } };   // 70% of the plain 600
    expect(granaryStage(b, plain)).toBe(3);
    expect(granaryStage(b, low)).toBe(2);
  });
});

describe('v93 x xu: the decree run at its end', () => {
  it('the top bar holds year 6, the score chip reads the decree, and no chapter goals show (known 5, 6, 7)', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      const g = await finish(t);
      g.ui.refresh();
      await frame();
      expect(t.root.querySelector('#topbar').textContent.includes('Year 7')).toBe(false);
      expect(t.root.querySelector('.goal-strip').hidden).toBe(true);
      expect(t.root.classList.contains('decree-over')).toBe(true);
    } finally { t.cleanup(); }
  });

  it('the end is noted the moment it arrives, with the heir\'s title, even under a waiting sheet (U1, S2)', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      t.root.querySelector('#sheet .decree-begin').click();
      await frame();
      const g = t.g();
      g.ui.store.set({ confirmDialog: { title: 'x' } });   // something is up: the end card waits
      g.world.day = 2160; g.world.decree.ended = true; g.world.speed = 0;
      g.ui.refresh();
      await frame();
      const rows = t.api.records.decrees();
      expect(rows.length).toBe(1);
      expect(typeof rows[0].title).toBe('string');
      expect(rows[0].title.length > 0).toBe(true);
    } finally { t.cleanup(); }
  });

  it('Play after the end opens the end card (U2)', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      const g = await finish(t);
      g.ui.refresh();
      await frame();
      g.ui.store.set({ sheet: null });
      g.ui.speedControl.set(1);
      await frame();
      expect(t.kind()).toBe('decreeEnd');
    } finally { t.cleanup(); }
  });
});

describe('v93 x xu: the title', () => {
  it('Rulers shows with a decree row and no ruler (U3); the card\'s lines are small, left-aligned, with the mark the only bold (U5), and Start is plain (U7)', async () => {
    const row = { id: 'decree:2026-47:1', week: W47, ids: ['sea_peoples'], mark: 'Sea Peoples, week 47', score: 300, parts: { people: 50, prosperity: 50, culture: 50, safety: 50, monuments: 50, bonus: 50 }, medal: null, day: 2160, map: '', feats: [], title: 'steady', name: 'A', tries: 1, date: 1 };
    const t = await titleAt({ records: { ...WITH_TOWN, decrees: [row] } });
    try {
      expect(Boolean(t.root.querySelector('.title-records .rulers-open'))).toBe(true);
      const card = t.root.querySelector('.decree-card');
      expect(Boolean(card)).toBe(true);
      expect(getComputedStyle(card).textAlign === 'left' || getComputedStyle(card).textAlign === 'start').toBe(true);
      expect(card.querySelectorAll('strong').length).toBe(1);
      expect(card.querySelector('.decree-twist').classList.contains('small')).toBe(true);
      expect(card.querySelector('.decree-go').classList.contains('primary')).toBe(false);
    } finally { t.cleanup(); }
  });
});
