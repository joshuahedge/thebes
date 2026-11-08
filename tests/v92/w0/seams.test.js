// Version 9.2 wave 0 (rulings 1750-1754): the seams, each with 9.1's behaviour. The six-year Capital is built once for the suite (about a minute: the same
// run as tests/stage4/balance's, with the dangers on); the text sections are checked from the source.
import { describe, it, expect } from '../../harness.js';
import { capital6World, capital6Save, capital6Fresh, capital6Elapsed } from '../helpers/capital6.js';
import { tab, shiftTab, enter, space, escape } from '../helpers/keys.js';
import { mount } from '../../helpers/dom.js';
import { alertsFor, rollUpAlerts } from '../../../src/sim/alerts.js';
import { letterMayCome, noteLetter } from '../../../src/sim/letters.js';
import { stepRow } from '../../../src/ui/alerts.js';
import { MEDALS_BY_VERSION, MEDALS, SCORE_VERSION, SHARE } from '../../../src/data/scoring.js';
import { parseShareLink, shareCheck } from '../../../src/ui/share.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

describe('v92 w0 rigs', () => {
  it('the six-year Capital is built once and handed out as a world and as a packed save that opens', () => {
    const w = capital6World();
    expect(capital6World()).toBe(w);
    expect(w.day).toBeGreaterThan(2000);
    expect(capital6Save()).toBe(capital6Save());
    const fresh = capital6Fresh();
    expect(fresh === w).toBe(false);
    expect(fresh.day).toBe(w.day);
    expect(capital6Elapsed()).toBeGreaterThan(0);
  });
  it('the keyboard rig moves focus with Tab and Shift+Tab, and sends Enter, Space and Escape to the focused element', () => {
    const m = mount('<button id="a">A</button><button id="b">B</button><button id="c">C</button>');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => m.root.querySelector(`#${id}`));
    const seen = [];
    b.addEventListener('keydown', (e) => seen.push(e.key));
    try {
      a.focus();
      expect(tab({ root: m.root })).toBe(b);
      expect(tab({ root: m.root })).toBe(c);
      expect(shiftTab({ root: m.root })).toBe(b);
      seen.length = 0;
      enter(); space(); escape();
      expect(seen).toEqual(['Enter', ' ', 'Escape']);
    } finally { m.cleanup(); }
  });
});

describe('v92 w0 seams: the alerts\' roll-up shape', () => {
  it('every alert carries ids and count; an alert with an id carries just it; rollUpAlerts returns the list as it is', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'storehouse', 20, 20);   // off the road: a no_road alert
    w.gold = -5;                  // a debt alert, which has no id
    const list = alertsFor(w);
    expect(list.length).toBeGreaterThan(1);
    for (const a of list) {
      expect(Array.isArray(a.ids)).toBe(a.id !== undefined || a.code === 'plots_no_road' || a.code === 'crime_risk');
      expect(Number.isInteger(a.count)).toBe(true);
      if (a.id !== undefined) expect(a.ids).toEqual([a.id]);
    }
    expect(list.find((a) => a.code === 'debt').count).toBe(1);
    expect(rollUpAlerts(list)).toBe(list);
  });
  it('stepRow walks a row\'s alerts round and round, and a rolled-up alert\'s ids one by one', () => {
    const fires = [{ code: 'fire', id: 4, ids: [4], count: 1 }, { code: 'fire', id: 9, ids: [9], count: 1 }];
    expect([0, 1, 2].map((n) => stepRow(fires, n).id)).toEqual([4, 9, 4]);
    const rolled = { code: 'no_road', ids: [1, 2, 3], count: 3 };
    expect([0, 1, 2, 3].map((n) => stepRow(rolled, n).id)).toEqual([1, 2, 3, 1]);
  });
});

describe('v92 w0 seams: the letters\' gate', () => {
  it('letterMayCome is true for every kind and noteLetter changes nothing', () => {
    const w = makeTestWorld();
    const before = JSON.stringify(w);
    for (const k of ['event', 'demand', 'request', 'card']) { expect(letterMayCome(w, k)).toBe(true); noteLetter(w, k); }
    expect(JSON.stringify(w)).toBe(before);
  });
});

describe('v92 w0 seams: score v3\'s slot', () => {
  it('has a medals entry for version 3 equal to v2\'s, SCORE_VERSION stays 2, and a t3 link reads as a t2 one', () => {
    expect(MEDALS_BY_VERSION[3]).toEqual(MEDALS_BY_VERSION[2]);
    expect(SCORE_VERSION).toBe(2);
    expect(SHARE.format).toBe('t2');
    const mk = (t) => { const body = `${t}.7.n.50-60-70-80-90.1-2-3-4-5-6-x`; return `#${body}.${shareCheck(body)}`; };
    const t2 = parseShareLink(mk('t2')), t3 = parseShareLink(mk('t3'));
    expect(t2.ok).toBe(true);
    expect(t3.ok).toBe(true);
    expect({ ...t3, version: 2 }).toEqual(t2);
    expect(t3.older).toBe(false);
  });
});

describe('v92 w0 seams: the text sections', () => {
  it('src/ui/text.js ends with the seven headers, in order', async () => {
    const text = await fetch('/src/ui/text.js').then((r) => r.text());
    const heads = [...text.matchAll(/^\/\/ Version 9\.2, Track (\w)$/gm)].map((m) => m[1]);
    expect(heads).toEqual(['L', 'Q', 'S', 'D', 'A', 'W', 'V']);
  });
});
