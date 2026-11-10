// Version 9.2, Track W (rulings 1835-1844): the words. T13: no player string in the words files is over 90 characters outside help bodies, What's new prints no build
// hash, one name for each thing (the glossary in docs/superpowers/notes/2026-11-08-version-9-2-rulings-w.md), and the figures typed into sentences are read from the data.
import { describe, it, expect } from '../../harness.js';
import { renderWhatsNew } from '../../../src/ui/s46/whatsNew.js';
import { RELEASES, releaseDateText } from '../../../src/data/releases.js';
import { S46_UX_TEXT, DAILY_TEXT, MOOD_NAMES, scoreReasonText, shortDateText, V711_TEXT, T } from '../../../src/ui/text.js';
import { DAILY_POOL } from '../../../src/data/daily.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { SCORE_TERMS } from '../../../src/data/scoring.js';

const LIMIT = 90;

// Every words file the game ships: src/ui/text.js and each *Text.js the cache list names (the same list the forbidden-word test reads).
async function wordsFiles() {
  const list = await (await fetch('/sw-files.js')).text();
  return [...new Set([...list.matchAll(/'\.\/(src\/ui\/[^']*Text\.js)'/g)].map((m) => m[1]).concat(['src/ui/text.js']))];
}

// Every string reachable from a file's exports through objects and arrays (functions are not called: a sentence a function builds is held by the cases below),
// as [file, path, string]. Getters are read.
async function allStrings() {
  const out = [];
  for (const f of await wordsFiles()) {
    const m = await import(`../../../${f}`);
    const seen = new Set();
    const walk = (v, p) => {
      if (typeof v === 'string') { out.push([f.replace('src/ui/', ''), p, v]); return; }
      if (!v || typeof v !== 'object' || seen.has(v)) return;
      seen.add(v);
      for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`);
    };
    for (const k of Object.keys(m)) walk(m[k], k);
  }
  return out;
}

// The exemptions, each with its reason. Anything not matched here is a row a phone shows and must stay within LIMIT characters.
const EXEMPT = [
  [/^TIP_TEXT\./, 'tips: each keeps to its own 20 words (the tip tests)'],
  [/^TIP_HELP_TEXT\./, 'tips as How to play lists them: 20 words'],
  [/\.(tip\w*|\w*Tip\w*)$/, 'a tip field of a words object: 20 words'],
  [/^(V60_HELP|V70_HELP|MAPS_HELP)\./, 'How to play sections: help bodies'],
  [/^T\.(gesturesHelp|aboutText)$/, 'the Touch help and About: help bodies'],
  [/^(FERRY_TEXT\.help|OASIS_TEXT\.help|V601_TEXT\.help|S47_CARTS_TEXT\.help)\./, 'help entries with their own head: help bodies'],
  [/^(OASIS_TEXT\.help|S47_CARTS_TEXT\.help)$/, 'help bodies'],
  [/^(LAYOUT_LINES|OASIS_TEXT\.layoutLine)/, 'the map layouts as the Maps help lists them: help bodies'],
  [/^CARDS4_TEXT\.cards\./, 'the picture cards: three sentences and a picture description (tests/stage4/cards)'],
  [/^FIRST_TEXT\.[a-z_0-9]+\.why$/, 'a celebration\'s why: read by screen readers, hidden on a phone at larger text'],
  [/^S46_RIVER_TEXT\.(huntRule|nilometerNote)$/, 'a paragraph of rules under a sheet\'s rows, with the data\'s own numbers'],
];
const exempt = (path) => EXEMPT.find(([re]) => re.test(path));

describe('v92 w words: length (T13)', () => {
  it('no player string in the words files is over 90 characters, outside the listed exemptions', async () => {
    const all = await allStrings();
    expect(all.length).toBeGreaterThan(1500);
    const long = all.filter(([, path, s]) => s.length > LIMIT && !exempt(path)).map(([f, path, s]) => `${f} ${path} (${s.length}): ${s.slice(0, 60)}`);
    expect(long).toEqual([]);
  });
  it('every exemption still covers something, so the list cannot go stale', async () => {
    const all = await allStrings();
    const live = EXEMPT.filter(([re]) => !all.some(([, path, s]) => s.length > LIMIT && re.test(path))).map(([re]) => String(re));
    expect(live).toEqual([]);
  });
});

describe('v92 w words: What\'s new prints no hash (ruling 1836)', () => {
  it('a heading is the version and its date, newest tagged, and no heading carries a build', () => {
    const host = document.createElement('div');
    renderWhatsNew(host, () => {});
    const heads = [...host.querySelectorAll('.release h3')];
    expect(heads.length).toBe(RELEASES.length);
    RELEASES.forEach((r, i) => {
      const text = heads[i].firstChild.textContent;
      expect(text).toBe(`Version ${r.version} · ${releaseDateText(r.date)}`);
      expect(/build|[0-9a-f]{7}/.test(text)).toBe(false);
    });
    expect(S46_UX_TEXT.releaseHead('9.2', '8 Nov 2026')).toBe('Version 9.2 · 8 Nov 2026');
  });
  it('the notes keep no change-log sentences a player cannot feel', () => {
    const notes = RELEASES.flatMap((r) => [...r.new, ...r.fixed]).join('\n');
    for (const gone of ['60 frames a second', 'rebuilds the map layers for nothing']) expect(notes.includes(gone)).toBe(false);
  });
});

describe('v92 w words: one name per thing (ruling 1835)', () => {
  it('no words file or release note uses the retired names', async () => {
    const all = await allStrings();
    // The newest entry is the docs step's to write; the notes before it say "I've played before" because that was the button then.
    const notes = RELEASES.slice(1).flatMap((r) => [...r.new, ...r.fixed].map((s) => [`release ${r.version}`, '', s.replace(/I've played before/g, '')]));
    const BANNED = [
      [/\bseed\b/i, 'map number'],
      [/Great city/, 'Great City'],
      [/Ipi suggests/, 'City advice'],
      [/title card/i, 'the title screen'],
      [/\bsquares?\b/i, 'tile'],
      [/\bY\d+ M\d+\b/, 'Yr 1 Mo 3'],
      [/\(the diamond\)|\(wide: Goals\)/, 'said once shown'],
      [/I've played before/, 'Skip the lesson'],
    ];
    const hits = [];
    for (const [where, path, s] of [...all, ...notes]) {
      for (const [re, use] of BANNED) if (re.test(s)) hits.push(`${where} ${path}: ${re} (say ${use}): ${s.slice(0, 70)}`);
    }
    // "square up" is what soldiers and raiders do, and the iOS Share icon is a square with an arrow.
    expect(hits.filter((h) => !/square up|Share \(the square/.test(h))).toEqual([]);
  });
  it('Fetch appears only in the 8.3 note that says it was renamed', async () => {
    const all = await allStrings();
    const fetchy = [...all.map(([f, p, s]) => [`${f} ${p}`, s]), ...RELEASES.flatMap((r) => [...r.new, ...r.fixed].map((s) => [`release ${r.version}`, s]))].filter(([, s]) => /\bFetch/.test(s)).map(([w]) => w);
    expect(fetchy).toEqual(['release 8.3']);
  });
  it('the skip on the lesson\'s first card and on the title is "Skip the lesson"; the guide keeps its own Skip guide', () => {
    expect([V711_TEXT.skip, T.skipGuide]).toEqual(['Skip the lesson', 'Skip guide']);
  });
  it('the top bar\'s short date reads "Yr 1 Mo 3"', () => {
    expect(shortDateText({ year: 1, month: 3 })).toBe('Yr 1 Mo 3');
  });
});

describe('v92 w words: the figures are the data\'s (ruling 1840)', () => {
  it('each daily goal says its pool number, set both ways', () => {
    const goal = DAILY_POOL.find((g) => g.id === 'plots4'), was = goal.n;
    try {
      expect(DAILY_TEXT.plots4).toBe(`Place ${was} housing plots`);
      goal.n = was + 3;
      expect(DAILY_TEXT.plots4).toBe(`Place ${was + 3} housing plots`);
    } finally { goal.n = was; }
    for (const g of DAILY_POOL) if (/\d/.test(DAILY_TEXT[g.id] || '')) expect([g.id, DAILY_TEXT[g.id].match(/\d+/)[0]]).toEqual([g.id, String(g.n)]);
  });
  it('"how pleasant the street is" counts out of the score\'s own ceiling, set both ways', () => {
    const was = SCORE_TERMS.pleasant;
    try {
      expect(scoreReasonText({ code: 'plain', value: 20 })).toBe(`Homes average 20 of ${was} for how pleasant the street is`);
      SCORE_TERMS.pleasant = was + 10;
      expect(scoreReasonText({ code: 'plain', value: 20 })).toBe(`Homes average 20 of ${was + 10} for how pleasant the street is`);
    } finally { SCORE_TERMS.pleasant = was; }
  });
  it('the burned row names the months the mood counts, set both ways', () => {
    const was = DANGER_MOOD.burnedDays;
    try {
      expect(MOOD_NAMES.burned).toBe(`Buildings burned, last ${was / 30} months`);
      DANGER_MOOD.burnedDays = 90;
      expect(MOOD_NAMES.burned).toBe('Buildings burned, last 3 months');
    } finally { DANGER_MOOD.burnedDays = was; }
  });
  it('the words keep to the old figures while the data is unchanged', () => {
    expect([DAILY_TEXT.roads10, MOOD_NAMES.burned]).toEqual(['Lay 10 road tiles', 'Buildings burned, last 6 months']);
  });
});
