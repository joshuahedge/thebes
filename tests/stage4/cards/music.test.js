import { describe, it, expect } from '../../harness.js';
import {
  createMusic, composeBar, nextTension, masterGain, barSeconds, pluckSamples, scheduleOffline, MUSIC,
} from '../../../src/audio/music.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createSettings } from '../../../src/ui/settings.js';
import { CARDS4_TEXT, T } from '../../../src/ui/text.js';
import { fire } from '../../helpers/dom.js';
import { mountShell } from '../../helpers/uiWorld.js';

// A stand-in audio context that records what the music builds: every source with its start and stop, and every gain's
// automation, so voices, fades and suspends can be checked without sound. lazy: the first resume() does not settle (as
// on a phone, where the first touch's resume arrives a moment later).
function fakeAudio({ state = 'suspended', lazy = true } = {}) {
  const param = (v) => {
    const p = { value: v, events: [] };
    for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'setValueCurveAtTime', 'cancelScheduledValues']) p[k] = (...a) => { p.events.push([k, ...a]); return p; };
    return p;
  };
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
  const ctx = {
    state, currentTime: 0, sampleRate: 8000, destination: node(), sources: [], gains: [], resumed: 0, suspended: 0, closed: 0,
    resume() { ctx.resumed++; if (!lazy || ctx.resumed > 1) ctx.state = 'running'; return Promise.resolve(); },
    suspend() { ctx.suspended++; ctx.state = 'suspended'; return Promise.resolve(); },
    close() { ctx.closed++; ctx.state = 'closed'; return Promise.resolve(); },
    createGain() { const g = node({ gain: param(1) }); ctx.gains.push(g); return g; },
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param(350), Q: param(1) }); },
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
// The value a gain is last asked to move to (setTargetAtTime), and the most notes sounding at once among sources.
const lastTarget = (g) => { const e = g.gain.events.filter((x) => x[0] === 'setTargetAtTime'); return e.length ? e[e.length - 1][1] : null; };
function mostAtOnce(sources) {
  const marks = sources.flatMap((s) => [[s.started, 1], [s.stopped, -1]]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  let n = 0, most = 0;
  for (const [, d] of marks) { n += d; most = Math.max(most, n); }
  return most;
}
const HIJAZ = [2, 3, 6, 7, 9, 10, 0];                       // D E♭ F♯ G A B♭ C as pitch classes
const pitched = (bar) => bar.notes.filter((n) => n.midi !== undefined);

// Version 8.2 (Track M): composeBar no longer plays as a loop; only its bars at a danger's tension are heard, softened, as the danger
// tune (composeDanger, at 60 beats a minute). The tests of the calm loop (never the same minute twice, the ney once a minute) went with
// it; the pieces that replace it are tested in tests/v82/m.
describe('s4 cards music: the bars', () => {
  it('plays hijaz on D (the danger tune at 60 beats a minute since Version 8.2), the same bars for the same city and other bars for another', () => {
    expect(Math.abs(barSeconds() - 4 * 60 / 60) < 1e-9).toBe(true);
    for (const t of [0, 0.5, 1]) {
      for (let bar = 0; bar < 400; bar++) {
        const b = composeBar(11, bar, t);
        for (const n of pitched(b)) {
          expect([n.voice, HIJAZ.includes(n.midi % 12)]).toEqual([n.voice, true]);
          if (n.voice === 'pluck') expect([n.midi >= 57, n.midi <= 75]).toEqual([true, true]);   // A3 to E♭5
          if (n.voice === 'ney') expect([n.midi >= 62, n.midi <= 74]).toEqual([true, true]);     // D4 to D5
        }
        expect(b.notes.some((n) => n.voice === 'dum' && n.at === 0)).toBe(true);                 // every bar starts on a dum
      }
    }
    expect(composeBar(11, 37, 0)).toEqual(composeBar(11, 37, 0));
    let same = 0;
    for (let bar = 0; bar < 100; bar++) if (JSON.stringify(composeBar(11, bar)) === JSON.stringify(composeBar(12, bar))) same++;
    expect(same).toBeLessThan(20);
  });

  it('fades the raid mood in over four bars and out again: a firmer, quicker drum, a lower drone, a sparser pluck', () => {
    const seq = [];
    let t = 0;
    for (const mood of ['calm', 'raid', 'raid', 'raid', 'raid', 'raid', 'calm', 'calm', 'calm', 'calm']) { t = nextTension(t, mood); seq.push(t); }
    expect(seq).toEqual([0, 0.25, 0.5, 0.75, 1, 1, 0.75, 0.5, 0.25, 0]);
    const bars = (tension) => [...Array(200).keys()].map((b) => composeBar(11, b, tension));
    const calm = bars(0), raid = bars(1), half = bars(0.5);
    const count = (list, voice) => list.reduce((n, b) => n + b.notes.filter((x) => voice.includes(x.voice)).length, 0);
    const meanVel = (list, voice) => { const v = list.flatMap((b) => b.notes.filter((x) => x.voice === voice).map((x) => x.vel)); return v.reduce((a, b) => a + b, 0) / v.length; };
    expect(count(raid, ['dum', 'tek'])).toBeGreaterThan(1.5 * count(calm, ['dum', 'tek']));
    expect(meanVel(raid, 'dum')).toBeGreaterThan(meanVel(calm, 'dum'));
    expect(count(raid, ['pluck'])).toBeLessThan(0.8 * count(calm, ['pluck']));
    expect(calm.every((b) => b.drone.low === 0 && b.drone.fifth > 0)).toBe(true);
    expect(raid.every((b) => b.drone.low > 0 && b.drone.fifth === 0)).toBe(true);
    expect(half.every((b) => b.drone.low > 0 && b.drone.fifth > 0)).toBe(true);
  });

  it('plucks a string that starts at full level, rings down and ends at silence, with no offset', () => {
    const d = pluckSamples(22050, 62);
    const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    const tenth = Math.floor(d.length / 10);
    expect(Math.max(...d.map(Math.abs))).toBe(1);
    expect(rms(d.slice(-tenth))).toBeLessThan(0.05 * rms(d.slice(0, tenth)));
    expect([d[d.length - 1], Math.abs(d.reduce((s, x) => s + x, 0) / d.length) < 0.002]).toEqual([0, true]);
  });
});

describe('s4 cards music: the player', () => {
  // Version 8.2: the first piece comes after a short wait, then pieces with silence between them (tests/v82/m has the programme in full).
  it('is silent until the music is on and a gesture unlocks it, waits a moment, then schedules the piece a moment ahead', () => {
    let on = false, created = 0;
    const ctx = fakeAudio();
    const m = createMusic({ create: () => { created++; return ctx; }, enabled: () => on, volume: () => 0.3, seed: () => 11 });
    m.tick(0); m.refresh();
    expect([m.unlock(), created, m.playing()]).toEqual([false, 0, false]);
    on = true;
    expect(m.unlock()).toBe(false);                                   // made and asked to resume: not running yet
    expect([created, ctx.resumed, ctx.sources.length]).toEqual([1, 1, 0]);   // no drones: silence until the first piece
    expect([m.unlock(), m.playing()]).toEqual([true, true]);
    expect(lastTarget(ctx.gains[0])).toBe(masterGain(0.3));          // the master fades in to the volume
    const until = m.state().until;
    expect([until >= 5, until <= 20]).toEqual([true, true]);
    m.tick(0);
    expect([m.state().phase, ctx.sources.length]).toEqual(['rest', 0]);
    ctx.currentTime = until - 1;
    m.tick();
    const n = ctx.sources.length;
    expect([m.state().phase, n > 0]).toEqual(['piece', true]);
    expect(Math.min(...ctx.sources.map((s) => s.started))).toBeGreaterThanOrEqual(until - 1e-9);
    expect(Math.max(...ctx.sources.map((s) => s.started))).toBeLessThan(until - 1 + MUSIC.lookahead);
    m.tick();
    expect(ctx.sources.length).toBe(n);                              // nothing is scheduled twice
    m.destroy();
    expect([ctx.closed, m.playing(), m.unlock()]).toEqual([1, false, false]);
  });

  it('plays the danger tune while the city\'s mood is a raid, its tension a bar at a time, and leaves it when calm', () => {
    let mood = 'calm';
    const ctx = fakeAudio({ state: 'running' });
    const m = createMusic({ context: ctx, enabled: () => true, mood: () => mood, plan: { firstWait: () => 60 } });
    m.unlock();
    const tensions = [];
    for (let i = 0; i < 12; i++) {
      if (i === 2) mood = 'raid';
      if (i === 5) mood = 'tense';
      if (i === 9) mood = 'calm';
      ctx.currentTime = i * barSeconds();
      m.tick();
      tensions.push([m.state().phase, m.state().tension]);
    }
    expect(tensions).toEqual([['rest', 0], ['rest', 0], ['danger', 1], ['danger', 1], ['danger', 1], ['danger', 0.75], ['danger', 0.5],
      ['danger', 0.45], ['danger', 0.45], ['rest', 0], ['rest', 0], ['rest', 0]]);
  });

  it('never sounds more than eight voices at once, the danger\'s three drones among them', () => {
    const ctx = fakeAudio({ state: 'running' });
    let mood = 'calm';
    const m = createMusic({ context: ctx, enabled: () => true, seed: () => 7, mood: () => mood, plan: { gap: () => 3, firstWait: () => 1 } });
    m.unlock();
    while (ctx.currentTime < 1800) { mood = Math.floor(ctx.currentTime / 200) % 3 === 2 ? 'raid' : 'calm'; m.tick(); ctx.currentTime += 0.5; }
    const drones = ctx.sources.filter((s) => s.kind === 'osc' && s.stopped - s.started > 30);
    expect(drones.length).toBeGreaterThanOrEqual(MUSIC.droneVoices * 2);   // the drones come and go with each danger
    expect(ctx.sources.length).toBeGreaterThan(2000);
    expect(mostAtOnce(ctx.sources.filter((s) => s.stopped > s.started)) + 0).toBeLessThanOrEqual(MUSIC.maxVoices);
    expect(ctx.sources.every((s) => s.stopped >= s.started)).toBe(true);
    // A note's gain starts silent (a source can sound a frame before its gain's first event).
    expect(ctx.gains.filter((g) => g.gain.value !== 0 && g.gain.value !== 1 && g.gain.events.some((e) => e[0] === 'setValueAtTime')).length).toBe(0);
  });

  it('goes quiet while hidden or off, comes back without catching up and at the new volume', () => {
    let on = true, vol = 0.3;
    const timers = [];
    const ctx = fakeAudio({ state: 'running', lazy: false });
    const m = createMusic({ context: ctx, enabled: () => on, volume: () => vol, timer: (fn) => { timers.push(fn); return timers.length; }, cancelTimer: () => {}, plan: { firstWait: () => 0.1 } });
    m.unlock(); m.tick();
    expect(m.state().phase).toBe('piece');
    const master = ctx.gains[0];
    m.stop();                                                          // the page is hidden
    expect([m.playing(), lastTarget(master)]).toEqual([false, 0]);
    timers.shift()();                                                  // the fade's end
    expect(ctx.state).toBe('suspended');
    const n = ctx.sources.length;
    ctx.currentTime = 30;
    m.tick();
    expect(ctx.sources.length).toBe(n);                                // nothing while hidden
    m.start();
    m.tick();
    ctx.currentTime = 33;
    m.tick();
    expect([ctx.state, m.playing(), lastTarget(master)]).toEqual(['running', true, masterGain(0.3)]);
    const fresh = ctx.sources.slice(n);
    expect(fresh.length > 0 && Math.min(...fresh.map((s) => s.started)) >= 30).toBe(true);   // no catching up on the notes missed
    vol = 0.6;
    m.refresh();
    expect(lastTarget(master)).toBe(masterGain(0.6));
    on = false;
    m.refresh();                                                       // Music: Off
    expect([m.playing(), lastTarget(master), m.unlock()]).toEqual([false, 0, false]);
    timers.shift()();
    expect(ctx.state).toBe('suspended');
    on = true;
    m.refresh();                                                       // Music: On again (a tap in Settings)
    expect([ctx.state, m.playing()]).toEqual(['running', true]);
    m.destroy();
    expect(ctx.closed).toBe(0);                                        // a context it was given is the giver's to close
  });

  it('stays silent and never throws where there is no Web Audio', () => {
    const m = createMusic({ create: () => { throw new Error('no_audio'); }, enabled: () => true });
    expect([m.unlock(), m.playing()]).toEqual([false, false]);
    m.tick(0); m.refresh(); m.stop(); m.start(); m.destroy();
    expect(m.state()).toBe(null);
  });
});

describe('s4 cards music: the sound', () => {
  // Renders 40 s offline at volume 1 (Version 8.2: a piece from the first moment, or the danger tune) and measures: the peak, the RMS
  // level, a "mean frequency" from the first difference (a sine at f gives f), the largest second difference (a click stands out
  // there), the offset and the quietest half second after the first six (the danger tune's fade-in).
  async function render(mood) {
    const sr = 22050, seconds = 40;
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
    scheduleOffline(ctx, { seed: 11, seconds, volume: 1, mood: () => mood, plan: { firstWait: () => 0.05 } });
    const d = (await ctx.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, dsum = 0, bend = 0, dc = 0;
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      peak = Math.max(peak, Math.abs(x)); sum += x * x; dc += x;
      if (i > 0) dsum += (x - d[i - 1]) ** 2;
      if (i > 1) bend = Math.max(bend, Math.abs(x - 2 * d[i - 1] + d[i - 2]));
    }
    let quietest = Infinity;
    const w = Math.floor(sr / 2);
    for (let s = 6 * sr; s + w <= d.length - sr; s += w) {
      let e = 0;
      for (let i = s; i < s + w; i++) e += d[i] * d[i];
      quietest = Math.min(quietest, Math.sqrt(e / w));
    }
    const db = (v) => 20 * Math.log10(v);
    return { peak, rmsDb: db(Math.sqrt(sum / d.length)), meanHz: Math.asin(Math.sqrt(dsum / sum) / 2) * sr / Math.PI, bend, dc: dc / d.length, quietestDb: db(quietest) };
  }

  it('renders forty seconds offline that never clip or click, sit quietly at volume 30 and stay soft', async () => {
    const calm = await render('calm'), raid = await render('raid');
    for (const m of [calm, raid]) {
      expect(m.peak).toBeLessThan(0.85);                               // at full volume: headroom, never clipping
      expect(m.bend).toBeLessThan(0.25);                               // no clicks (a one-frame step shows above 0.3)
      expect(Math.abs(m.dc)).toBeLessThan(0.002);
      expect(m.meanHz).toBeLessThan(900);                              // soft: the sound sits low, nothing shrill
    }
    expect(raid.quietestDb).toBeGreaterThan(-40);                      // the danger tune's drones hold: never a dropout
    const atDefault = calm.rmsDb + 20 * Math.log10(masterGain(0.3));
    expect([atDefault > -40, atDefault < -28]).toEqual([true, true]); // quiet behind the game at the default volume (Version 8.2: softer)
  });
});

describe('s4 cards music: the Settings rows', () => {
  it('has Music On / Off and its volume beside Sound, in tens with 44 px buttons that stop at 0 and 100', async () => {
    const shell = await mountShell(390, 844);                         // the real stylesheet, for the buttons' size
    const root = shell.root, cleanup = shell.cleanup;
    root.querySelector('#sheet').hidden = false;
    root.querySelector('#sheet').append(Object.assign(document.createElement('div'), { id: 'body' }));
    try {
      const store = createStore(INITIAL_UI_STATE);
      const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
      const body = root.querySelector('#body');
      createMenuSheets({ store, settings, toasts: { show() {} } }).settings(body, { close() {} });
      const rows = [...body.querySelector('.options-group.sound').children];   // Version 8.0: the Sound group's rows, after its heading
      const sound = rows.findIndex((r) => r.querySelector('.switch.sound'));
      expect([rows[sound + 1].querySelector('.switch.music') !== null, rows[sound + 2].classList.contains('music-volume')]).toEqual([true, true]);
      const music = body.querySelector('.switch.music');
      expect([music.textContent.includes(CARDS4_TEXT.music), music.getAttribute('aria-checked'), music.textContent.includes(T.on)]).toEqual([true, 'true', true]);
      fire(music, 'click');
      expect([settings.get().music, settings.get().sound, music.getAttribute('aria-checked')]).toEqual([false, true, 'false']);
      const row = body.querySelector('.music-volume'), value = row.querySelector('.value');
      const quieter = row.querySelector('.quieter'), louder = row.querySelector('.louder');
      expect([quieter.getAttribute('aria-label'), louder.getAttribute('aria-label'), value.textContent]).toEqual([CARDS4_TEXT.quieter, CARDS4_TEXT.louder, '30']);
      for (const b of [quieter, louder]) { const r = b.getBoundingClientRect(); expect([r.width >= 44, r.height >= 44]).toEqual([true, true]); }
      fire(louder, 'click');
      expect([settings.get().musicVolume, value.textContent]).toEqual([40, '40']);
      for (let i = 0; i < 8; i++) fire(louder, 'click');
      expect([settings.get().musicVolume, louder.disabled, quieter.disabled]).toEqual([100, true, false]);
      for (let i = 0; i < 12; i++) fire(quieter, 'click');
      expect([settings.get().musicVolume, quieter.disabled, louder.disabled, value.textContent]).toEqual([0, true, false, '0']);
      settings.destroy();
    } finally { cleanup(); }
  });
});
