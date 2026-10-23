// Version 7.0 Track S (rulings 930-959, 935-938): the sound. The music has a mood for each season and a tense variant while danger is live (the same
// generator, the bars unchanged where no season is given); the effects have their own volume under the Sound master and five new short voices; the
// cues play from the sim's events and the days, and only as often as their cooldowns say.
import { describe, it, expect } from '../../harness.js';
import { createMusic, composeBar, nextTension, musicMood, barSeconds, MUSIC } from '../../../src/audio/music.js';
import { createSfx, SFX } from '../../../src/audio/sfx.js';
import { SEASON_MUSIC, MOOD_TENSION, SEASON_IDS, MARKET_SOUND } from '../../../src/data/seasons.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { marketDay, bazaarInView } from '../../../src/ui/v70/seasons.js';

// A stand-in audio context that records the music's graph: every source, every gain and filter with its automation.
function fakeAudio({ state = 'running' } = {}) {
  const param = (v) => {
    const p = { value: v, events: [] };
    for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'setValueCurveAtTime', 'cancelScheduledValues']) p[k] = (...a) => { p.events.push([k, ...a]); return p; };
    return p;
  };
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
  const ctx = {
    state, currentTime: 0, sampleRate: 8000, destination: node(), sources: [], gains: [], filters: [],
    resume() { ctx.state = 'running'; return Promise.resolve(); }, suspend() { ctx.state = 'suspended'; return Promise.resolve(); }, close() { return Promise.resolve(); },
    createGain() { const g = node({ gain: param(1) }); ctx.gains.push(g); return g; },
    createBiquadFilter() { const f = node({ type: 'lowpass', frequency: param(350), Q: param(1) }); ctx.filters.push(f); return f; },
    createDelay() { return node({ delayTime: param(0) }); },
    createPeriodicWave() { return {}; },
    createBuffer(ch, len, sr) { const d = new Float32Array(len); return { length: len, sampleRate: sr, getChannelData: () => d }; },
    createOscillator() { return source(node({ type: 'sine', frequency: param(440), setPeriodicWave() {} })); },
    createBufferSource() { return source(node({ buffer: null })); },
  };
  function source(n) { Object.assign(n, { started: null, stopped: Infinity, start(t) { n.started = t; }, stop(t) { n.stopped = t; } }); ctx.sources.push(n); return n; }
  return ctx;
}
const bars = (season, tension = 0, n = 400, seed = 11) => Array.from({ length: n }, (_, b) => composeBar(seed, b, tension, season));
const count = (list, voices) => list.reduce((n, b) => n + b.notes.filter((x) => voices.includes(x.voice)).length, 0);

describe('v70 s sound: the moods', () => {
  it('is calm, tense while another danger is live (warned or under way, or a building on fire) and a raid while a raid warning or a raid is on, a raid first', () => {
    const w = makeTestWorld();
    expect([musicMood(null), musicMood(w)]).toEqual(['calm', 'calm']);
    for (const kind of ['plague', 'drought', 'locusts']) {
      for (const state of ['warning', 'active']) {
        w.hazards[kind][state] = { day: 0, strikes: 30 };
        expect([kind, state, musicMood(w)]).toEqual([kind, state, 'tense']);
        w.hazards[kind][state] = null;
      }
    }
    expect(musicMood(w)).toBe('calm');
    const home = addRaw(w, 'house', 5, 5, { tier: 1, residents: 3 });
    home.fire = { stage: 'fire', days: 2, left: 9 };
    expect(musicMood(w)).toBe('tense');
    w.raid.warning = { index: 0 };
    expect(musicMood(w)).toBe('raid');                                         // a raid outranks the rest
    w.raid.warning = null; w.raid.active = { index: 0 };
    expect(musicMood(w)).toBe('raid');
    w.raid.active = null; home.fire = null;
    expect(musicMood(w)).toBe('calm');
  });
  it('moves to the tense tension a quarter a bar and no further, and back, with a raid still reaching its own full tension', () => {
    expect(MOOD_TENSION).toEqual({ calm: 0, tense: 0.45, raid: 1 });
    expect(MOOD_TENSION.tense).toBeLessThan(0.5);                              // below the raid drum's threshold: tense is not a raid
    let t = 0;
    const seq = [];
    for (const mood of ['tense', 'tense', 'tense', 'tense', 'calm', 'calm', 'calm', 'raid', 'raid', 'raid', 'raid', 'raid']) { t = nextTension(t, mood); seq.push(Math.round(t * 100) / 100); }
    expect(seq).toEqual([0.25, 0.45, 0.45, 0.45, 0.2, 0, 0, 0.25, 0.5, 0.75, 1, 1]);
    expect(Math.round(nextTension(0.3, 'nonsense') * 100) / 100).toBe(0.05);                          // an unknown mood is calm
  });
  it('tenses the music as it has before: with the tense tension the flute stops, the pluck thins and the low drone comes in', () => {
    const calm = bars(null, 0), tense = bars(null, MOOD_TENSION.tense);
    expect(count(tense, ['ney'])).toBe(0);
    expect(count(calm, ['ney'])).toBeGreaterThan(0);
    expect(count(tense, ['pluck'])).toBeLessThan(count(calm, ['pluck']));
    expect(tense.every((b) => b.drone.low > 0 && b.drone.fifth > 0)).toBe(true);
    expect(tense.every((b) => b.notes.filter((n) => n.voice === 'tek').length <= 4)).toBe(true);   // not the raid's quick drum
  });
});

describe('v70 s sound: the season moods', () => {
  it('leaves the bars exactly as they were where no season is given', () => {
    for (const t of [0, 0.25, 0.5, 1]) for (let b = 0; b < 120; b++) {
      expect(composeBar(11, b, t, null)).toEqual(composeBar(11, b, t));
      expect(composeBar(11, b, t).look).toBe(undefined);
    }
  });
  it('is the same bar for the same city, bar and season, and a different colour for each season', () => {
    const sig = (list) => JSON.stringify(list.map((b) => b.notes.map((n) => `${n.voice}${n.at}:${n.midi}:${Math.round(n.vel * 100)}`)));
    const each = Object.fromEntries(SEASON_IDS.map((s) => [s, bars(s)]));
    for (const s of SEASON_IDS) {
      expect(sig(bars(s))).toBe(sig(each[s]));
      expect(sig(each[s]) !== sig(bars(null))).toBe(true);
      for (const b of each[s]) expect([s, b.look]).toEqual([s, { tone: SEASON_MUSIC[s].tone, wet: SEASON_MUSIC[s].wet }]);
    }
    expect(new Set(SEASON_IDS.map((s) => sig(each[s]))).size).toBe(3);
  });
  it('gives the flood the flute most often and the thinnest pluck and the quietest teks, the harvest the fullest drum, the growing the brightest pluck', () => {
    const flood = bars('akhet'), growing = bars('peret'), harvest = bars('shemu');
    expect(count(flood, ['ney'])).toBeGreaterThan(count(growing, ['ney']));
    expect(count(growing, ['ney'])).toBeGreaterThan(count(harvest, ['ney']));
    expect(count(flood, ['pluck'])).toBeLessThan(count(growing, ['pluck']) * 0.95);
    expect(count(flood, ['tek'])).toBeLessThan(count(growing, ['tek']));
    expect(count(harvest, ['tek'])).toBeGreaterThan(count(growing, ['tek']));
    expect(SEASON_MUSIC.peret.tone).toBeGreaterThan(SEASON_MUSIC.shemu.tone);
    expect(SEASON_MUSIC.shemu.tone).toBeGreaterThan(SEASON_MUSIC.akhet.tone);
    const mean = (list, k) => list.reduce((s, b) => s + b.drone[k], 0) / list.length;
    expect(mean(flood, 'tonic')).toBeGreaterThan(mean(growing, 'tonic'));
    expect(mean(harvest, 'fifth')).toBeGreaterThan(mean(growing, 'fifth'));
  });
  it('keeps every season\'s notes in range: pitched notes the same pitch classes as hijaz on D, drums with no pitch, velocities within 0 to 1', () => {
    const HIJAZ = [2, 3, 6, 7, 9, 10, 0];
    for (const s of SEASON_IDS) for (const t of [0, 0.45, 1]) for (const b of bars(s, t, 80)) for (const n of b.notes) {
      if (n.midi !== undefined) expect([s, n.midi, HIJAZ.includes(n.midi % 12)]).toEqual([s, n.midi, true]);
      expect([s, n.vel > 0 && n.vel <= 1]).toEqual([s, true]);
    }
  });
  it('plays the season on the page\'s music: the pluck\'s brightness and the echo move to the season\'s over the bar, and never more than eight voices sound at once', () => {
    for (const s of SEASON_IDS) {
      const ctx = fakeAudio();
      const m = createMusic({ context: ctx, enabled: () => true, seed: () => 7, season: () => s, mood: () => 'calm' });
      m.unlock();
      for (let i = 0; i < 6; i++) { m.tick(); ctx.currentTime += barSeconds(); }
      const tones = ctx.filters.flatMap((f) => f.frequency.events.filter((e) => e[0] === 'setTargetAtTime').map((e) => e[1]));
      expect([s, tones.includes(SEASON_MUSIC[s].tone)]).toEqual([s, true]);
      const wets = ctx.gains.flatMap((g) => g.gain.events.filter((e) => e[0] === 'setTargetAtTime').map((e) => Math.round(e[1] * 1000) / 1000));
      expect([s, wets.includes(Math.round(MUSIC.level.wet * SEASON_MUSIC[s].wet * 1000) / 1000)]).toEqual([s, true]);
      m.destroy();
    }
    const ctx = fakeAudio();
    let which = 0;
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 5, season: () => SEASON_IDS[which % 3], mood: () => 'calm' });
    m.unlock();
    while (m.state().bar < 240) { which = Math.floor(m.state().bar / 40); m.tick(); ctx.currentTime += 0.5; }
    const notes = ctx.sources.filter((s) => s.stopped !== Infinity);
    const marks = notes.flatMap((s) => [[s.started, 1], [s.stopped, -1]]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    let n = 0, most = 0;
    for (const [, d] of marks) { n += d; most = Math.max(most, n); }
    expect(most + MUSIC.droneVoices).toBeLessThanOrEqual(MUSIC.maxVoices);
  });
  it('keeps no season in the music\'s save or the sim: the music reads the city\'s date through its option, and with none (the title) plays the plain bars', () => {
    const ctx = fakeAudio();
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 7 });
    m.unlock();
    m.tick();
    expect(ctx.filters.every((f) => !f.frequency.events.some((e) => e[0] === 'setTargetAtTime' && SEASON_IDS.some((s) => e[1] === SEASON_MUSIC[s].tone)))).toBe(true);
  });
});

describe('v70 s sound: the effects', () => {
  const ctxFor = () => {
    const ctx = fakeAudio();
    ctx.oscillators = ctx.sources;
    return ctx;
  };
  const rampsOf = (ctx) => ctx.gains.map((g) => g.gain.events.filter((e) => e[0] === 'linearRampToValueAtTime').map((e) => e[1])[0]);
  it('has five new short, quiet voices made only of oscillators: market, fire, battle, bells and oars', () => {
    const NEW = ['market', 'fire', 'battle', 'bells', 'oars'];
    const sfx = createSfx({ audioSession: null, vibrate: null, enabled: () => true, context: ctxFor() });
    expect(sfx.names.slice(-5)).toEqual(NEW);
    for (const name of NEW) {
      expect(SFX[name].length).toBeGreaterThan(2);
      for (const n of SFX[name]) {
        expect([name, ['sine', 'triangle', 'square', 'sawtooth'].includes(n.type), n.d > 0 && n.d <= 0.4, n.g <= 0.12]).toEqual([name, true, true, true]);
        expect([name, n.t + n.d < 1]).toEqual([name, true]);                     // under a second whole
      }
    }
    expect(Math.max(...SFX.market.map((n) => n.g))).toBeLessThanOrEqual(0.04);        // the bustle is the quietest
  });
  it('plays at the effects volume under the Sound master: full at 1, scaled in between, silent at 0 and while Sound is off', () => {
    let on = true, vol = 1;
    const ctx = ctxFor();
    const sfx = createSfx({ audioSession: null, vibrate: null, context: ctx, enabled: () => on, volume: () => vol });
    expect(sfx.play('place')).toBe(true);
    expect(rampsOf(ctx)).toEqual(SFX.place.map((n) => n.g));                           // 1: the loudness they have always had
    ctx.gains.length = 0;
    vol = 0.4;
    expect(sfx.play('place')).toBe(true);
    expect(rampsOf(ctx).map((v) => Math.round(v * 1e4) / 1e4)).toEqual(SFX.place.map((n) => Math.round(n.g * 0.4 * 1e4) / 1e4));
    ctx.gains.length = 0;
    vol = 0;
    expect([sfx.play('place'), ctx.gains.length]).toEqual([false, 0]);
    vol = 1; on = false;
    expect([sfx.play('coin'), ctx.gains.length]).toEqual([false, 0]);                  // the master: Sound off, whatever the volume
    on = true;
    for (const name of sfx.names) expect([name, sfx.play(name)]).toEqual([name, true]);
  });
});

describe('v70 s sound: the cues', () => {
  const spy = () => { const calls = []; return { calls, sfx: { play: (n) => { calls.push(n); return true; }, unlock: () => true, buzz: () => false } }; };
  it('plays fire for a new fire or a blaze that grows (not a covered one), at most once in four seconds', async () => {
    const { calls, sfx } = spy();
    let t = 1000;
    const r = await rigUI({ sfx, now: () => t });
    try {
      r.ui.onEvents([{ type: 'fire', id: 1 }]);
      r.ui.onEvents([{ type: 'fire_grow', id: 1, covered: false }]);
      expect(calls.filter((c) => c === 'fire').length).toBe(1);                       // the second came within the cooldown
      t += 4500;
      r.ui.onEvents([{ type: 'fire_grow', id: 1, covered: true }]);
      expect(calls.filter((c) => c === 'fire').length).toBe(1);                       // a covered blaze is not news
      r.ui.onEvents([{ type: 'fire_grow', id: 1, covered: false }]);
      expect(calls.filter((c) => c === 'fire').length).toBe(2);
    } finally { r.cleanup(); }
  });
  it('plays battle for a raid starting, striking or wrecking, one clash at a time', async () => {
    const { calls, sfx } = spy();
    let t = 1000;
    const r = await rigUI({ sfx, now: () => t });
    try {
      r.ui.onEvents([{ type: 'raid_start', index: 0, dir: 'west', size: 8 }, { type: 'raid_strike', id: 1, stolen: {} }, { type: 'raid_wreck', id: 1, kind: 'house', to: [] }]);
      expect(calls.filter((c) => c === 'battle').length).toBe(1);
      t += 2000;
      r.ui.onEvents([{ type: 'raid_strike', id: 1, stolen: {} }]);
      expect(calls.filter((c) => c === 'battle').length).toBe(2);
    } finally { r.cleanup(); }
  });
  it('plays a caravan\'s bells by land and a boat\'s oars by river (the partner\'s way in, from the trade data), and nothing for a month or the rest', async () => {
    const { calls, sfx } = spy();
    let t = 1000;
    const ids = Object.keys(PARTNERS);
    const was = ids.map((id) => PARTNERS[id].by);
    PARTNERS[ids[0]].by = 'river'; PARTNERS[ids[1]].by = 'road';
    const r = await rigUI({ sfx, now: () => t });
    try {
      r.ui.onEvents([{ type: 'caravan', partner: ids[1], sold: {}, bought: {}, income: 0, spent: 0, gift: null }]);
      t += 3000;
      r.ui.onEvents([{ type: 'caravan', partner: ids[0], sold: {}, bought: {}, income: 0, spent: 0, gift: null }]);
      expect(calls.filter((c) => c === 'bells' || c === 'oars')).toEqual(['bells', 'oars']);
      const n = calls.length;
      r.ui.onEvents([{ type: 'achievement', id: 'x' }, { type: 'daily', id: 'y' }]);
      expect(calls.slice(n).filter((c) => ['fire', 'battle', 'bells', 'oars', 'market'].includes(c))).toEqual([]);
    } finally { ids.forEach((id, i) => { if (was[i] === undefined) delete PARTNERS[id].by; else PARTNERS[id].by = was[i]; }); r.cleanup(); }
  });
  it('plays the market\'s bustle on a seeded day no oftener than the data says, only while the view is by a bazaar, and never while paused', async () => {
    const { calls, sfx } = spy();
    const r = await rigUI({ sfx });
    try {
      const w = r.world;
      expect(bazaarInView(w, r.ui.cameraControl.centreTile())).toBe(true);           // the rig's view is by its bazaar
      expect([bazaarInView(w, { x: 400, y: 400 }), bazaarInView(w, null)]).toEqual([false, false]);
      const bustle = () => calls.filter((c) => c === 'market').length;
      const nextYes = (from, last) => { for (let d = from; d < from + 400; d++) if (marketDay(w, d, last)) return d; return null; };
      const d1 = nextYes(w.day + 1, null);
      w.speed = 0;
      w.day = d1; r.ui.refresh();
      expect(bustle()).toBe(0);                                                       // paused: nothing, though the day says yes
      w.speed = 1;
      const d2 = nextYes(d1 + 1, null);
      w.day = d2; r.ui.refresh();
      expect(bustle()).toBe(1);                                                       // a running day the seed says yes to, a bazaar by the view
      const soon = nextYes(d2 + 1, null);                                             // a yes day inside the gap: the gap says no
      expect([soon !== null, soon - d2 < MARKET_SOUND.everyDays]).toEqual([true, true].slice(0, soon !== null && soon - d2 < MARKET_SOUND.everyDays ? 2 : 1));
      if (soon !== null && soon - d2 < MARKET_SOUND.everyDays) { w.day = soon; r.ui.refresh(); expect(bustle()).toBe(1); }
      expect(marketDay(w, d2 + MARKET_SOUND.everyDays - 1, d2)).toBe(false);
      const d3 = nextYes(d2 + MARKET_SOUND.everyDays, d2);
      w.day = d3; r.ui.refresh();
      expect(bustle()).toBe(2);
      expect(d3 - d2).toBeGreaterThanOrEqual(MARKET_SOUND.everyDays);
      // The view away from the bazaar: no bustle, whatever the day.
      r.ui.cameraControl.jumpTo(400, 400);
      const d4 = nextYes(d3 + MARKET_SOUND.everyDays, d3);
      w.day = d4; r.ui.refresh();
      expect(bustle()).toBe(2);
    } finally { r.cleanup(); }
  });
});
