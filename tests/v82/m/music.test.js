// Version 8.2 "Song of the Nile" (Track M, rulings 1280-1299): the music as pieces with silence between them, each playing a little
// different, the danger tune softened. The pure parts (composePiece, choosePiece, gapSeconds) first, then the programme on a stand-in
// audio context, then the sound rendered offline against 8.1's measured levels.
import { describe, it, expect } from '../../harness.js';
import {
  createMusic, composePiece, choosePiece, gapSeconds, firstWaitSeconds, composeDanger, scheduleOffline, masterGain, pieceById, barSeconds, MUSIC,
} from '../../../src/audio/music.js';
import { PIECES, MODES } from '../../../src/data/pieces.js';
import { SEASON_IDS, SEASON_MUSIC } from '../../../src/data/seasons.js';

// 8.1's loop (ad57f92), measured with this file's render at volume 1 over 180 s (calm, seeds 1, 11 and 99, every season and none) and
// 60 s (raid and tense): the quietest of each, so every piece must be at or under the quietest 8.1 ever was.
const TODAY = { peak: 0.67, rmsDb: -23.3, loudDb: -20.8, meanHz: 528 };
const TODAY_RAID = { peak: 0.764, rmsDb: -22.3, meanHz: 579 };

// A stand-in audio context that records what the music builds: every source with its start and stop, every gain's and filter's automation.
function fakeAudio({ state = 'running' } = {}) {
  const param = (v) => {
    const p = { value: v, events: [] };
    for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'setValueCurveAtTime', 'cancelScheduledValues']) p[k] = (...a) => { p.events.push([k, ...a]); return p; };
    return p;
  };
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
  const ctx = {
    state, currentTime: 0, sampleRate: 8000, destination: node(), sources: [], gains: [], filters: [], suspended: 0,
    resume() { ctx.state = 'running'; return Promise.resolve(); },
    suspend() { ctx.suspended++; ctx.state = 'suspended'; return Promise.resolve(); },
    close() { ctx.state = 'closed'; return Promise.resolve(); },
    createGain() { const g = node({ gain: param(1) }); ctx.gains.push(g); return g; },
    createBiquadFilter() { const f = node({ type: 'lowpass', frequency: param(350), Q: param(1) }); ctx.filters.push(f); return f; },
    createDelay() { return node({ delayTime: param(0) }); },
    createPeriodicWave() { return {}; },
    createBuffer(ch, len, sr) { const d = new Float32Array(len); return { length: len, sampleRate: sr, getChannelData: () => d }; },
    createOscillator() { return source(node({ type: 'sine', frequency: param(440), setPeriodicWave() {} }), 'osc'); },
    createBufferSource() { return source(node({ buffer: null }), 'buffer'); },
  };
  function source(n, kind) {
    Object.assign(n, { kind, started: null, stopped: Infinity, start(t) { n.started = t; }, stop(t) { n.stopped = t; } });
    ctx.sources.push(n);
    return n;
  }
  return ctx;
}
const lastTarget = (g) => { const e = g.gain.events.filter((x) => x[0] === 'setTargetAtTime'); return e.length ? e[e.length - 1][1] : null; };
function mostAtOnce(sources) {
  const marks = sources.filter((s) => s.stopped > s.started).flatMap((s) => [[s.started, 1], [s.stopped, -1]]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  let n = 0, most = 0;
  for (const [, d] of marks) { n += d; most = Math.max(most, n); }
  return most;
}
// Runs a music on a stand-in context from its time now to `until`, a tick every `step` s.
function runTo(m, ctx, until, step = 0.25, each = () => {}) { while (ctx.currentTime < until) { each(ctx.currentTime); m.tick(); ctx.currentTime += step; } }
const SEEDS = [1, 11, 99, 123456789];

describe('v82 m music: the pieces', () => {
  it('has six to eight pieces, each a minute and a half to three minutes long in every playing, with a name and a mood', () => {
    expect([PIECES.length >= 6, PIECES.length <= 8]).toEqual([true, true]);
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(PIECES.length);
    for (const P of PIECES) {
      expect([P.id, P.name.length > 3, P.mood.length > 10, Boolean(MODES[P.mode])]).toEqual([P.id, true, true, true]);
      let lo = Infinity, hi = 0;
      for (const seed of SEEDS) for (let play = 0; play < 150; play++) { const s = composePiece(P.id, seed, play).seconds; lo = Math.min(lo, s); hi = Math.max(hi, s); }
      expect([P.id, lo >= 90, hi <= 180]).toEqual([P.id, true, true]);
      expect([P.id, hi - lo > 10]).toEqual([P.id, true]);                    // which sections repeat varies the length
    }
  });

  it('keeps every voice in its own low register and every note in the piece\'s mode, and only the accent above A4', () => {
    for (const P of PIECES) for (const seed of [1, 11]) for (let play = 0; play < 30; play++) {
      const piece = composePiece(P.id, seed, play);
      for (const n of piece.notes) {
        expect([P.id, n.vel > 0 && n.vel <= 1, n.len > 0, n.at >= 0, n.at < piece.seconds - MUSIC.tail]).toEqual([P.id, true, true, true, true]);
        if (n.voice === 'dum') { expect(n.midi).toBe(undefined); continue; }
        const [lo, hi] = MUSIC.ranges[n.voice];
        expect([P.id, n.voice, n.midi >= lo && n.midi <= hi]).toEqual([P.id, n.voice, true]);
        expect([P.id, MODES[P.mode].includes((((n.midi - P.tonic) % 12) + 12) % 12)]).toEqual([P.id, true]);
        if (n.voice !== 'accent') expect([P.id, n.voice, n.midi <= 69]).toEqual([P.id, n.voice, true]);
      }
    }
  });

  it('plays the high pluck as a rare accent: one to four notes a playing, never in the first two bars or the last', () => {
    for (const P of PIECES) {
      const counts = new Set();
      for (const seed of SEEDS) for (let play = 0; play < 50; play++) {
        const piece = composePiece(P.id, seed, play), barLen = (piece.seconds - MUSIC.tail) / piece.bars;
        const accents = piece.notes.filter((n) => n.voice === 'accent');
        expect([P.id, accents.length >= 1, accents.length <= Math.min(P.accents, MUSIC.accentMax)]).toEqual([P.id, true, true]);
        for (const a of accents) expect([P.id, a.at >= 2 * barLen, a.at < (piece.bars - 1) * barLen]).toEqual([P.id, true, true]);
        counts.add(accents.length);
      }
      if (P.accents > 1) expect([P.id, counts.size > 1]).toEqual([P.id, true]);
    }
    expect(MUSIC.accentMax).toBeLessThanOrEqual(4);
  });

  it('is the same playing for the same seed and play count, another for every other play count, and always begins as written', () => {
    const sig = (piece) => JSON.stringify(piece.notes.map((n) => [n.voice, Math.round(n.at * 1000), n.midi, Math.round(n.vel * 100)]));
    const opening = (piece) => piece.notes.filter((n) => n.part === 'tune' && !n.grace).slice(0, 6).map((n) => n.midi);
    for (const P of PIECES) for (const seed of [1, 11, 99]) {
      expect(composePiece(P.id, seed, 3)).toEqual(composePiece(P.id, seed, 3));
      const plays = Array.from({ length: 40 }, (_, play) => composePiece(P.id, seed, play));
      expect([P.id, new Set(plays.map(sig)).size]).toEqual([P.id, 40]);
      for (const piece of plays) expect([P.id, opening(piece)]).toEqual([P.id, opening(plays[0])]);
      expect([P.id, new Set(plays.map((p) => p.bars)).size > 1, new Set(plays.map((p) => Math.round(p.bpm * 10))).size > 10]).toEqual([P.id, true, true]);
    }
    expect(composePiece('nonsense', 1, 0)).toBe(null);
  });

  it('never picks the same piece twice in a row, plays every piece, and leans on the season\'s own pieces', () => {
    for (const seed of SEEDS) for (const season of [null, ...SEASON_IDS]) {
      let last = null;
      const seen = {};
      for (let n = 0; n < 200; n++) {
        const id = choosePiece(seed, n, last, season);
        expect([seed, season, n, id !== last, Boolean(pieceById(id))]).toEqual([seed, season, n, true, true]);
        seen[id] = (seen[id] || 0) + 1;
        last = id;
      }
      expect([seed, season, Object.keys(seen).length]).toEqual([seed, season, PIECES.length]);
    }
    for (const season of SEASON_IDS) {
      const own = PIECES.filter((p) => p.seasons.includes(season)).map((p) => p.id);
      expect([season, own.length >= 1]).toEqual([season, true]);
      const share = (s) => { let hit = 0, last = null; for (let n = 0; n < 2000; n++) { last = choosePiece(7, n, last, s); if (own.includes(last)) hit++; } return hit / 2000; };
      expect([season, share(season) > 1.5 * share(null)]).toEqual([season, true]);
    }
  });

  it('draws each gap of silence between one and four minutes, and the first wait between 5 and 20 s', () => {
    for (const seed of SEEDS) {
      const gaps = Array.from({ length: 500 }, (_, n) => gapSeconds(seed, n));
      expect([Math.min(...gaps) >= 60, Math.max(...gaps) <= 240, Math.min(...gaps) < 80, Math.max(...gaps) > 220]).toEqual([true, true, true, true]);
      const first = firstWaitSeconds(seed);
      expect([first >= 5, first <= 20]).toEqual([true, true]);
    }
    expect(new Set(SEEDS.map(firstWaitSeconds)).size).toBe(SEEDS.length);
  });

  it('softens the danger tune: 8.1\'s raid bars an octave lower, soft dums only, no teks', () => {
    for (const t of [0.45, 1]) for (let bar = 0; bar < 100; bar++) {
      const b = composeDanger(11, bar, t);
      expect(b.notes.every((n) => n.voice === 'low' || n.voice === 'dum')).toBe(true);
      for (const n of b.notes.filter((x) => x.voice === 'low')) expect([n.midi >= 45, n.midi <= 63]).toEqual([true, true]);
      expect(b.notes.filter((n) => n.voice === 'dum').length).toBe(t >= 0.5 ? 4 : 2);
      expect(b.notes.every((n) => n.vel <= 1)).toBe(true);
    }
  });
});

describe('v82 m music: the programme', () => {
  it('waits 5 to 20 s once unlocked, plays a piece, then a silence of one to four minutes, then another piece', () => {
    const ctx = fakeAudio();
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 11 });
    expect(m.unlock()).toBe(true);
    const s0 = m.state();
    expect([s0.phase, s0.until >= 5, s0.until <= 20, ctx.sources.length]).toEqual(['rest', true, true, 0]);
    runTo(m, ctx, s0.until - MUSIC.lookahead - 0.3);
    expect([m.state().phase, ctx.sources.length]).toEqual(['rest', 0]);         // silence until the first piece is near
    runTo(m, ctx, s0.until + 1);
    const first = m.state();
    expect([first.phase, first.played, Boolean(pieceById(first.piece))]).toEqual(['piece', 1, true]);
    expect(Math.min(...ctx.sources.map((s) => s.started))).toBeGreaterThanOrEqual(s0.until - 0.001);
    expect(Math.max(...ctx.sources.map((s) => s.started))).toBeLessThan(ctx.currentTime + MUSIC.lookahead);   // only notes within the look-ahead
    const piece = composePiece(first.piece, 11, 0), end = s0.until + piece.seconds;
    runTo(m, ctx, end + 0.5);
    const rest = m.state();
    expect([rest.phase, rest.until - end >= 60, rest.until - end <= 240]).toEqual(['rest', true, true]);
    const before = ctx.sources.length;
    runTo(m, ctx, rest.until - MUSIC.lookahead - 0.3, 1);
    expect(ctx.sources.length).toBe(before);                                   // the gap is silent
    runTo(m, ctx, rest.until + 1);
    expect([m.state().phase, m.state().played, m.state().piece !== first.piece]).toEqual(['piece', 2, true]);
    m.destroy();
  });

  it('never sounds more than eight voices at once over an hour of pieces and dangers', () => {
    const ctx = fakeAudio();
    let mood = 'calm';
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 7, mood: () => mood, plan: { gap: () => 2, firstWait: () => 1 } });
    m.unlock();
    runTo(m, ctx, 3600, 0.5, (t) => { const k = Math.floor(t / 300) % 4; mood = k === 3 ? 'raid' : k === 2 && t % 300 > 200 ? 'tense' : 'calm'; });
    expect(m.state().played).toBeGreaterThan(15);
    expect(ctx.sources.length).toBeGreaterThan(3000);
    expect(mostAtOnce(ctx.sources)).toBeLessThanOrEqual(MUSIC.maxVoices);
    expect(ctx.sources.every((s) => s.stopped >= s.started)).toBe(true);
    // A note's gain starts silent (a source can sound a frame before its gain's first event).
    expect(ctx.gains.filter((g) => g.gain.value !== 0 && g.gain.value !== 1 && g.gain.events.some((e) => e[0] === 'setValueAtTime')).length).toBe(0);
  });

  it('fades the danger tune in while the piece fades out, follows the mood a bar at a time, and fades out into a silence before the next piece', () => {
    const ctx = fakeAudio();
    let mood = 'calm';
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 11, mood: () => mood });
    m.unlock();
    runTo(m, ctx, m.state().until + 20);
    expect(m.state().phase).toBe('piece');
    const T = ctx.currentTime, pieceSources = ctx.sources.length, gainsBefore = ctx.gains.length;
    mood = 'raid';
    m.tick();
    // The piece's output ramps to 0 over MUSIC.pieceOut; its notes not yet started never sound, those sounding end with the fade.
    const ramps = (g, to) => g.gain.events.some((e) => e[0] === 'linearRampToValueAtTime' && e[1] === to.v && Math.abs(e[2] - to.at) < 1e-6);
    expect(ctx.gains.slice(0, gainsBefore).some((g) => ramps(g, { v: 0, at: T + MUSIC.pieceOut }))).toBe(true);
    expect(ctx.sources.slice(0, pieceSources).every((s) => s.stopped <= Math.max(s.started, T + MUSIC.pieceOut) + 1e-9)).toBe(true);
    // The danger tune's output ramps from 0 to 1 over MUSIC.dangerIn: a few seconds, not a cut.
    const dangerOut = ctx.gains.slice(gainsBefore).find((g) => ramps(g, { v: 1, at: T + MUSIC.dangerIn }));
    expect([Boolean(dangerOut), MUSIC.dangerIn >= 2, MUSIC.dangerIn <= 6]).toEqual([true, true, true]);
    const drones = ctx.sources.slice(pieceSources).filter((s) => s.stopped === Infinity);
    expect([drones.length, drones.every((s) => s.kind === 'osc' && s.started >= T && s.started <= T + MUSIC.pieceOut + 1)]).toEqual([MUSIC.droneVoices, true]);
    expect([m.state().phase, m.state().tension]).toEqual(['danger', 1]);
    const tensions = [];
    for (let i = 0; i < 8; i++) {
      if (i === 2) mood = 'tense';
      ctx.currentTime += 4; m.tick(); tensions.push(m.state().tension);
    }
    expect(tensions).toEqual([1, 1, 0.75, 0.5, 0.45, 0.45, 0.45, 0.45]);    // a quarter a bar towards the tense tension
    // Calm again: the danger tune fades out, its drones stop with the fade, and a silence comes before the next calm piece.
    mood = 'calm';
    const T2 = ctx.currentTime;
    m.tick();
    expect(dangerOut.gain.events.some((e) => e[0] === 'linearRampToValueAtTime' && e[1] === 0 && Math.abs(e[2] - (T2 + MUSIC.dangerOut)) < 1e-6)).toBe(true);
    expect(drones.every((s) => Math.abs(s.stopped - (T2 + MUSIC.dangerOut + 0.05)) < 1e-6)).toBe(true);
    const rest = m.state();
    expect([rest.phase, rest.until - T2 >= MUSIC.dangerOut + 60, rest.until - T2 <= MUSIC.dangerOut + 240]).toEqual(['rest', true, true]);
    const n = ctx.sources.length;
    runTo(m, ctx, rest.until - MUSIC.lookahead - 0.3, 1);
    expect(ctx.sources.slice(n).length).toBe(0);
    expect(Math.max(...ctx.sources.map((s) => s.started))).toBeLessThan(T2 + MUSIC.lookahead + barSeconds());   // only the bar already scheduled
    runTo(m, ctx, rest.until + 1);
    expect(m.state().phase).toBe('piece');
  });

  it('takes the volume and Music off at once, in a silence too, and comes back where the programme was', () => {
    let on = true, vol = 0.3;
    const timers = [];
    const ctx = fakeAudio();
    const m = createMusic({ context: ctx, enabled: () => on, volume: () => vol, seed: () => 3, timer: (fn) => { timers.push(fn); return timers.length; }, cancelTimer: () => {} });
    m.unlock();
    m.tick();
    const master = ctx.gains[0], until = m.state().until;
    expect([m.state().phase, lastTarget(master)]).toEqual(['rest', masterGain(0.3)]);
    vol = 0.7;
    m.refresh();
    expect(lastTarget(master)).toBe(masterGain(0.7));                          // in the silence, at once
    on = false;
    m.refresh();
    expect([m.playing(), lastTarget(master)]).toEqual([false, 0]);
    timers.shift()();
    expect(ctx.state).toBe('suspended');
    on = true;
    m.refresh();
    expect([ctx.state, m.playing(), lastTarget(master), m.state().until]).toEqual(['running', true, masterGain(0.7), until]);
    m.destroy();
  });

  it('plays the season\'s colour on each piece: the accent\'s brightness and the echo\'s send', () => {
    for (const s of SEASON_IDS) {
      const ctx = fakeAudio();
      const m = createMusic({ context: ctx, enabled: () => true, seed: () => 7, season: () => s, plan: { firstWait: () => 1 } });
      m.unlock();
      runTo(m, ctx, 3);
      expect([s, ctx.filters.some((f) => f.frequency.value === SEASON_MUSIC[s].tone)]).toEqual([s, true]);
      const sends = ctx.gains.flatMap((g) => g.gain.events.filter((e) => e[0] === 'setTargetAtTime').map((e) => Math.round(e[1] * 1000)));
      expect([s, sends.includes(Math.round(MUSIC.level.wet * SEASON_MUSIC[s].wet * 1000))]).toEqual([s, true]);
      m.destroy();
    }
  });
});

// Renders the programme offline at volume 1 (22050 Hz); measure() then gives, over `from`-`to` s: the peak, the RMS, the loudest 3 s, a
// "mean frequency" from the first difference (a sine at f gives f), the largest second difference (a click stands out there) and the offset.
const SR = 22050;
async function render(opts, seconds) {
  const ctx = new OfflineAudioContext(1, Math.ceil(SR * seconds), SR);
  scheduleOffline(ctx, { volume: 1, seconds, ...opts });
  return (await ctx.startRendering()).getChannelData(0);
}
function measure(d, from = 0, to = d.length / SR) {
  const sr = SR, a = Math.floor(from * sr), b = Math.min(d.length, Math.floor(to * sr));
  let peak = 0, sum = 0, dsum = 0, bend = 0, dc = 0, loud = 0;
  for (let i = a; i < b; i++) {
    const x = d[i];
    peak = Math.max(peak, Math.abs(x));
    if (i > 1) bend = Math.max(bend, Math.abs(x - 2 * d[i - 1] + d[i - 2]));
    sum += x * x; dc += x;
    if (i > a) dsum += (x - d[i - 1]) ** 2;
  }
  const w = 3 * sr;
  for (let s = a; s + w <= b; s += sr / 2) { let e = 0; for (let i = s; i < s + w; i++) e += d[i] * d[i]; loud = Math.max(loud, Math.sqrt(e / w)); }
  const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
  return { peak, rmsDb: db(Math.sqrt(sum / (b - a))), loudDb: db(loud), meanHz: Math.asin(Math.min(1, Math.sqrt(dsum / Math.max(sum, 1e-12)) / 2)) * sr / Math.PI, bend, dc: dc / (b - a) };
}

describe('v82 m music: the sound', () => {
  it('renders every piece no louder than 8.1\'s music and lower in pitch, with no clicks', async () => {
    const results = [];
    for (const [i, P] of PIECES.entries()) {
      const seed = 11 + i, piece = composePiece(P.id, seed, i);
      const r = measure(await render({ seed, play: i, plan: { choose: () => P.id, firstWait: () => 0.05, gap: () => 600 } }, piece.seconds + 1), 0.05, piece.seconds);
      results.push([P, r]);
    }
    for (const [P, r] of results) {
      expect([P.id, r.peak <= TODAY.peak, r.loudDb <= TODAY.loudDb, r.rmsDb <= TODAY.rmsDb, r.meanHz <= TODAY.meanHz]).toEqual([P.id, true, true, true, true]);
      expect([P.id, r.bend < 0.25, Math.abs(r.dc) < 0.002, r.loudDb > -45]).toEqual([P.id, true, true, true]);   // and it does play
    }
  });

  it('renders the danger tune softer and lower than 8.1\'s raid, the drones holding it together', async () => {
    for (const mood of ['raid', 'tense']) {
      const d = await render({ seed: 11, mood: () => mood }, 40), r = measure(d, 6, 40);
      expect([mood, r.peak < TODAY_RAID.peak, r.rmsDb < TODAY_RAID.rmsDb - 2, r.meanHz < TODAY_RAID.meanHz]).toEqual([mood, true, true, true]);
      expect([mood, r.bend < 0.25, Math.abs(r.dc) < 0.002]).toEqual([mood, true, true]);
      let quietest = 0;                                                        // the drones hold: never a dropout once it is in
      for (let s = 8; s + 0.5 <= 39; s += 0.5) quietest = Math.min(quietest, measure(d, s, s + 0.5).rmsDb);
      expect([mood, quietest > -40]).toEqual([mood, true]);
    }
  });

  it('crossfades from a piece into danger and out to silence without a click', async () => {
    const d = await render({ seed: 5, mood: (t) => (t >= 20 && t < 32 ? 'raid' : 'calm'), plan: { firstWait: () => 0.05 } }, 60);
    const all = measure(d), danger = measure(d, 25, 31), after = measure(d, 32 + MUSIC.dangerOut + 4, 60);
    expect([all.bend < 0.25, danger.rmsDb > -45, after.rmsDb < -60]).toEqual([true, true, true]);
  });

});

