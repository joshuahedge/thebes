// Version 7.0 Track S (rulings 930-959): the seasons. seasonAt is the flood calendar's season with the land turning over a season's last month; the
// words name the same months; Still switches at the boundary; the farms show the season in their slots; the palms and the river show it too.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { seasonAt, seasonOfDay } from '../../../src/sim/seasons.js';
import { SEASONS } from '../../../src/data/tips.js';
import { SEASON_IDS, SEASON_LOOK } from '../../../src/data/seasons.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { seasonMonths, SEASON_TEXT, V70_HELP } from '../../../src/ui/text.js';
import { seasonLooks, drawSeasonGround } from '../../../src/render/seasons.js';
import { SEASON_ART, seasonSlot } from '../../../src/render/art/seasons.js';
import { FARM_TYPES, farmStage } from '../../../src/render/art/stages.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas, canvasHash } from '../../helpers/canvas.js';
import { dayIn } from '../../../src/dev/v70/seasons.js';
import { allBuildings } from '../../../src/sim/world.js';
import { SERVICE_ART } from '../../../src/render/art/services.js';

const YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const lastOfSeason = (m) => SEASONS[(m + 1) % MONTHS_PER_YEAR] !== SEASONS[m];

describe('v70 s seasons: the calendar and the blend', () => {
  it('turns the land over a season\'s last month only, a thirtieth a day, and starts the next season where the last left off', () => {
    for (let m = 0; m < MONTHS_PER_YEAR; m++) {
      for (let d = 0; d < DAYS_PER_MONTH; d++) {
        const s = seasonAt({ day: m * DAYS_PER_MONTH + d });
        expect([m, d, s.season]).toEqual([m, d, SEASONS[m]]);
        if (lastOfSeason(m)) expect([m, d, s.next, s.blend]).toEqual([m, d, SEASONS[(m + 1) % MONTHS_PER_YEAR], d / DAYS_PER_MONTH]);
        else expect([m, d, s.next, s.blend]).toEqual([m, d, SEASONS[m], 0]);
      }
    }
    // No jump at a boundary: the last day of the old season is all but the new one (29/30), the first of the new one all of it (0 of the one after).
    const last = SEASONS.findIndex((_, m) => lastOfSeason(m));
    const before = seasonAt({ day: (last + 1) * DAYS_PER_MONTH - 1 }), after = seasonAt({ day: (last + 1) * DAYS_PER_MONTH });
    expect([before.next, before.blend > 0.95, after.season]).toEqual([after.season, true, before.next]);
  });
  it('turns exactly three times a year, one season to the next in order, and every season lasts at least two months (so a blend month is never the whole season)', () => {
    const runs = [];
    for (let m = 0; m < MONTHS_PER_YEAR; m++) if (!runs.length || runs[runs.length - 1].id !== SEASONS[m]) runs.push({ id: SEASONS[m], n: 1 }); else runs[runs.length - 1].n++;
    expect(new Set(SEASONS)).toEqual(new Set(SEASON_IDS));
    expect(SEASONS.filter((s, m) => lastOfSeason(m)).length).toBe(3);
    for (const r of runs) expect([r.id, r.n >= 2]).toEqual([r.id, true]);
  });
  it('is pure of the day and the same every year', () => {
    const w = createWorld({ seed: 4 });
    for (const d of [0, 29, 30, 200, 359, 360, 719]) {
      w.day = d;
      const a = seasonAt(w);
      w.day = d + YEAR;
      expect(seasonAt(w)).toEqual(a);
      expect(seasonOfDay(d)).toBe(a.season);
    }
  });
  it('never enters the save: a world round-trips with no season or light field', () => {
    const w = createWorld({ seed: 4 });
    buildSampleCity(w);
    const json = JSON.stringify(w);
    for (const word of ['akhet', 'peret', 'shemu', 'blend', 'dayNight', 'lamps', 'nightTint']) expect([word, json.includes(word)]).toEqual([word, false]);
  });
});

describe('v70 s seasons: the words', () => {
  it('names each season for the player and the months it covers from the same calendar the sim follows', () => {
    expect(SEASON_TEXT.names).toEqual({ akhet: 'Flood', peret: 'Growing', shemu: 'Harvest' });
    for (const id of SEASON_IDS) {
      const months = SEASONS.map((s, m) => (s === id ? m + 1 : 0)).filter(Boolean);
      const [a, b] = seasonMonths(id).split(' to ').map(Number);
      const covered = [];
      for (let m = a; ; m = (m % MONTHS_PER_YEAR) + 1) { covered.push(m); if (m === b) break; }
      expect([id, covered.sort((x, y) => x - y)]).toEqual([id, months]);
    }
    expect(seasonMonths('peret')).toBe('11 to 2');
  });
  it('puts the seasons and the day and night in How to play, in track S\'s paragraph, with the months the sim uses and never an ancient name', () => {
    expect(V70_HELP.s.length).toBe(1);
    const t = V70_HELP.s[0].text;
    for (const id of SEASON_IDS) expect([id, t.includes(`months ${seasonMonths(id)}`), t.includes(SEASON_TEXT.names[id])]).toEqual([id, true, true]);
    expect(/akhet|peret|shemu/i.test(`${t} ${V70_HELP.s[0].head} ${Object.values(SEASON_TEXT.names).join(' ')} ${SEASON_TEXT.dayNightNote}`)).toBe(false);   // ruling 863: the player sees flood, growing, harvest
    expect(t).toContain('Day and night');
  });
});

describe('v70 s seasons: the land, the river and the palms', () => {
  const range = { x0: 0, y0: 0, x1: 63, y1: 63 };
  const sample = () => { const w = createWorld({ seed: 11 }); buildSampleCity(w); return w; };
  const draw = (w, motion, size = 400) => {
    const c = makeCanvas(size, size);
    drawSeasonGround(makeDraw(c.getContext('2d'), 1, 2), w, { x0: 0, y0: 0, x1: 12, y1: 12 }, 0, motion);
    return c;
  };
  it('lays the season\'s wash by day, a different one for each season, and the same for Gentle and Full', () => {
    const w = sample();
    const hashes = {};
    for (const id of SEASON_IDS) {
      w.day = dayIn(w, id);
      hashes[id] = canvasHash(draw(w, 'gentle'));
      expect(hashes[id]).toBe(canvasHash(draw(w, 'full')));
    }
    expect(new Set(Object.values(hashes)).size).toBe(3);
  });
  it('blends over the last month: the two seasons at weights summing to one, and Still shows the season alone with no blend (it switches at the boundary)', () => {
    const w = sample();
    const m = SEASONS.findIndex((_, i) => lastOfSeason(i));
    w.day = m * DAYS_PER_MONTH + 15;
    const s = seasonAt(w);
    const gentle = seasonLooks(w, 'gentle'), still = seasonLooks(w, 'still');
    expect(gentle.map((l) => l[0])).toEqual([s.season, s.next]);
    expect(Math.round((gentle[0][1] + gentle[1][1]) * 1000) / 1000).toBe(1);
    expect(still).toEqual([[s.season, 1]]);
    // The picture follows: Still looks as the day before the turn began (the season alone), Gentle differs once the blend is half.
    const stillHash = canvasHash(draw(w, 'still'));
    w.day = m * DAYS_PER_MONTH;
    expect(canvasHash(draw(w, 'still'))).toBe(stillHash);
    expect(canvasHash(draw(w, 'gentle'))).toBe(stillHash);                        // blend 0 on the month's first day: identical
    w.day = m * DAYS_PER_MONTH + 15;
    expect(canvasHash(draw(w, 'gentle')) !== stillHash).toBe(true);
  });
  it('tints the river in its own banks and by season, and marks the palms by season only where they are large enough to see', () => {
    const w = sample();
    const counts = (season) => {
      w.day = dayIn(w, season);
      const c = makeCanvas(800, 600), ctx = c.getContext('2d');
      const calls = [];
      const g = makeDraw(ctx, 2, 2);
      const real = g.polys;
      g.polys = (list, ...rest) => { calls.push(list.length); return real(list, ...rest); };
      g.cull = null;
      drawSeasonGround(g, w, { x0: 0, y0: 0, x1: 40, y1: 40 }, 0, 'gentle');
      return calls;
    };
    for (const id of SEASON_IDS) expect([id, counts(id).length > 0]).toEqual([id, true]);   // palm marks are batched into fills
    // Zoomed far out (2 art px = 0.5 CSS px) a palm is a speck: no marks, the wash alone.
    w.day = dayIn(w, 'shemu');
    const c = makeCanvas(300, 300);
    const g = makeDraw(c.getContext('2d'), 0.5, 0.5);
    const calls = [];
    const real = g.polys;
    g.polys = (...a) => { calls.push(a[0].length); return real(...a); };
    drawSeasonGround(g, w, { x0: 0, y0: 0, x1: 40, y1: 40 }, 0, 'gentle');
    expect(calls).toEqual([]);
    expect(SEASON_LOOK.akhet.water[1]).toBeGreaterThan(SEASON_LOOK.peret.water[1]);        // the flood's river is the most silted
  });
});

describe('v70 s seasons: the fields', () => {
  it('registers a slot for every farm, stage and season, each with its farm\'s footprint, height and shadows, drawn differently from the plain farm and from each other', () => {
    for (const type of FARM_TYPES) {
      for (let stage = 0; stage < 4; stage++) {
        const base = SERVICE_ART[`${type}.g${stage}`];
        const hashes = new Map();
        for (const id of SEASON_IDS) {
          const slot = `${type}.g${stage}.${id}`, e = ART[slot];
          expect([slot, e === SEASON_ART[slot], e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([slot, true, base.w, base.d, base.height, base.bounds, base.shadows]);
          const c = makeCanvas(160, 120);
          const ctx = c.getContext('2d');
          ctx.translate(80, 24);
          e.draw(makeDraw(ctx, 2), 0, 0);
          hashes.set(id, canvasHash(c));
        }
        const plain = makeCanvas(160, 120);
        plain.getContext('2d').translate(80, 24);
        base.draw(makeDraw(plain.getContext('2d'), 2), 0, 0);
        const ph = canvasHash(plain);
        // A fallow field shows only the flood's water: its growing and harvest slots are the plain drawing.
        const distinct = new Set([ph, ...hashes.values()]).size;
        expect([type, stage, distinct]).toEqual([type, stage, stage === 0 ? 2 : 4]);
      }
    }
  });
  it('names the season in a farm\'s slot when the world is given, and keeps the plain slot without one', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    const farms = allBuildings(w).filter((b) => FARM_TYPES.includes(b.type));
    expect(farms.length).toBeGreaterThan(0);
    for (const id of SEASON_IDS) {
      w.day = dayIn(w, id);
      for (const b of farms) expect([id, slotFor(b, w), seasonSlot(b, w)]).toEqual([id, `${b.type}.g${farmStage(w, b)}.${id}`, `${b.type}.g${farmStage(w, b)}.${id}`]);
    }
    for (const b of farms) expect([slotFor(b), seasonSlot(b, null)]).toEqual([b.type, null]);
    for (const b of allBuildings(w).filter((x) => !FARM_TYPES.includes(x.type))) expect(seasonSlot(b, w)).toBe(null);
  });
});
