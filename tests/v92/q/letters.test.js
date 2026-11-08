// Version 9.2, Track Q, 3.3 (rulings 1776, 1777): one gate over the four letter streams. T6: a scripted year from Market town has at most one letter open at a
// time and none within a month of another (the gate's own gap is 5 to 8 months). Absent the field, today's schedules.
import { describe, it, expect } from '../../harness.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { tickDay } from '../../../src/sim/clock.js';
import { letterMayCome, noteLetter, letterOpen, LETTER_GAP, LETTER_STALE_MONTHS } from '../../../src/sim/letters.js';
import { capital6Fresh } from '../helpers/capital6.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';

// The letters the city has been sent so far, by stream: the numbers each stream counts its own letters with.
const sent = (w) => [w.tally.eventsOffered, w.demands.nextId, w.court.nextId];
// Letters open as the gate counts them: ignored for LETTER_STALE_MONTHS, one stops counting.
const fresh = (w, day) => w.day - day < LETTER_STALE_MONTHS * MONTH;
const openCount = (w) => (w.cityEvents.waiting && fresh(w, w.cityEvents.waiting.day) ? 1 : 0) + w.demands.open.filter((d) => !d.accepted && fresh(w, d.day)).length + w.court.letters.filter((l) => fresh(w, l.day) && (l.kind === 'card' || (!l.read && w.court.request && w.court.request.id === l.id))).length;

function run(w, days) {
  w.speed = 1;
  const issued = [];
  let before = sent(w), worstOpen = 0;
  for (let d = 0; d < days; d++) {
    tickDay(w);
    const now = sent(w);
    const n = now.reduce((s, v, i) => s + (v - before[i]), 0);
    for (let i = 0; i < n; i++) issued.push(w.day);
    before = now;
    worstOpen = Math.max(worstOpen, openCount(w));
  }
  return { w, issued, worstOpen };
}

describe('v92 q letters: the court\'s one gate', () => {
  it('absent the gate field every kind may come and noteLetter creates it; a world without it is a 9.1 city', () => {
    const w = courtWorld({ open: true });
    expect(w.letterGate).toBe(undefined);
    for (const k of ['event', 'demand', 'request', 'card']) expect(letterMayCome(w, k)).toBe(true);
    noteLetter(w, 'event');
    expect(w.letterGate.nextDay - w.day).toBeGreaterThanOrEqual(LETTER_GAP[0] * MONTH);
    expect(w.letterGate.nextDay - w.day).toBeLessThanOrEqual(LETTER_GAP[1] * MONTH);
    expect(letterMayCome(w, 'card')).toBe(false);
    w.day = w.letterGate.nextDay;
    expect(letterMayCome(w, 'card')).toBe(true);
    w.cityEvents.waiting = { kind: 'x' };
    expect(letterOpen(w)).toBe(true);
    expect(letterMayCome(w, 'card')).toBe(false);
  });

  it('the gap is drawn from the world\'s own seed: the same seed the same gap, and the draws vary across seeds', () => {
    const gaps = (seed) => { const w = courtWorld({ open: true, seed }); noteLetter(w, 'card'); return w.letterGate.nextDay - w.day; };
    expect(gaps(3)).toBe(gaps(3));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9].map(gaps)).size).toBeGreaterThan(1);
  });

  it('T6: two scripted years from the six-year Capital, and a small Market town for three: at most one letter open at a time, 5 months or more between letters once the gate has begun', () => {
    const runs = [['capital', run(capital6Fresh(), YEAR * 2), 3], ['market town', run(courtWorld({ open: true, seed: 1 }), YEAR * 3), 2]];
    for (const [label, { issued, worstOpen, w }, least] of runs) {
      expect([label, issued.length >= least]).toEqual([label, true]);
      expect([label, worstOpen <= 1]).toEqual([label, true]);
      for (let i = 1; i < issued.length; i++) expect([label, i, issued[i] - issued[i - 1] >= LETTER_GAP[0] * MONTH]).toEqual([label, i, true]);   // the design's floor is a month; the gate keeps 5
      expect(w.letterGate.n).toBeGreaterThanOrEqual(issued.length);
    }
  });

  it('the stream that has asked longest goes first when the gate opens, and one let through on several days with nothing to send goes to the back', () => {
    const w = courtWorld({ open: true });
    noteLetter(w, 'card');                                       // the gate is closed for 5 to 8 months
    w.day = w.letterGate.nextDay - 2;
    expect(letterMayCome(w, 'event')).toBe(false);               // asks first, and waits
    w.day += 1;
    expect(letterMayCome(w, 'request')).toBe(false);
    w.day += 1;                                                  // the gate is open
    expect(letterMayCome(w, 'request')).toBe(false);             // the event asked longer ago
    expect(letterMayCome(w, 'event')).toBe(true);
    for (let i = 0; i < 3; i++) { w.day += 1; letterMayCome(w, 'request'); letterMayCome(w, 'event'); }   // the event is let through on three more days and sends nothing
    w.day += 1;
    expect(letterMayCome(w, 'event')).toBe(false);               // back of the line
    expect(letterMayCome(w, 'request')).toBe(true);
    noteLetter(w, 'request');
    expect(w.letterGate.served.request).toBe(w.day);             // a letter sent: it has been served
  });

  it('a saved city keeps its gate, and one saved without it opens as it was', () => {
    const w = courtWorld({ open: true });
    noteLetter(w, 'demand');
    const back = unpackSave(packSave(w)).world;
    expect(back.letterGate).toEqual(w.letterGate);
    const plain = courtWorld({ open: true });
    const again = unpackSave(packSave(plain)).world;
    expect(again.letterGate).toBe(undefined);
  });
});
