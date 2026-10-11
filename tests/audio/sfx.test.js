import { describe, it, expect } from '../harness.js';
import { createSfx, SFX } from '../../src/audio/sfx.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { screenToTile } from '../../src/render/camera.js';
import { buildingAt } from '../../src/sim/world.js';
import { settle } from '../../src/sim/settle.js';

// Records every oscillator and gain node the effects build, so envelopes can be checked without sound.
function fakeAudio() {
  const ctx = {
    state: 'suspended', currentTime: 0, destination: { name: 'out' }, oscillators: [], gains: [], resumed: 0,
    resume() { ctx.resumed++; if (ctx.resumed > 1) ctx.state = 'running'; return Promise.resolve(); },   // the first resume has not settled yet
    createOscillator() {
      const o = { type: 'sine', freq: [], started: null, stopped: null, to: null, connect: (n) => { o.to = n; }, start: (t) => { o.started = t; }, stop: (t) => { o.stopped = t; } };
      o.frequency = { setValueAtTime: (v, t) => o.freq.push([v, t]), exponentialRampToValueAtTime: (v, t) => o.freq.push([v, t]) };
      ctx.oscillators.push(o);
      return o;
    },
    createGain() {
      const g = { ramps: [], to: null, connect: (n) => { g.to = n; } };
      g.gain = { setValueAtTime: (v, t) => g.ramps.push([v, t]), linearRampToValueAtTime: (v, t) => g.ramps.push([v, t]), exponentialRampToValueAtTime: (v, t) => g.ramps.push([v, t]) };
      ctx.gains.push(g);
      return g;
    },
  };
  return ctx;
}

describe('audio sfx', () => {
  it('stays silent until enabled and unlocked, then plays the nine effects as short envelopes', () => {
    let on = false, created = 0;
    const ctx = fakeAudio();
    const sfx = createSfx({ create: () => { created++; return ctx; }, enabled: () => on, vibrate: null, audioSession: null });
    expect(sfx.names).toEqual(['place', 'road', 'demolish', 'upgrade', 'milestone', 'alert', 'goal', 'horn', 'coin']);   // Stage 3: the raid horn and the coin tick
    expect(sfx.play('place')).toBe(false);
    expect(sfx.unlock()).toBe(false);
    expect(created).toBe(0);
    on = true;
    expect(sfx.play('place')).toBe(false);                 // no gesture yet
    expect(sfx.unlock()).toBe(false);                      // the context exists but has not resumed: not unlocked yet
    expect(created).toBe(1);
    expect(ctx.resumed).toBe(1);
    expect(ctx.state).toBe('suspended');
    expect(sfx.play('place')).toBe(false);                 // nothing is queued into a suspended context
    expect(ctx.oscillators.length).toBe(0);
    expect(sfx.unlock()).toBe(true);                       // the next gesture finds it running
    expect(ctx.resumed).toBe(2);
    expect(ctx.state).toBe('running');
    expect(sfx.unlock()).toBe(true);
    expect(created).toBe(1);
    expect(ctx.resumed).toBe(2);
    expect(sfx.context).toBe(ctx);
    expect(sfx.play('place')).toBe(true);
    expect(ctx.oscillators.length).toBe(SFX.place.length);
    const o = ctx.oscillators[0];
    expect(o.type).toBe(SFX.place[0].type);
    expect(o.freq[0]).toEqual([SFX.place[0].f, SFX.place[0].t]);
    expect(o.started).toBe(SFX.place[0].t);
    expect(o.stopped - o.started).toBeGreaterThan(SFX.place[0].d);
    expect(o.stopped - o.started).toBeLessThan(0.5);
    expect(o.to).toBe(ctx.gains[0]);
    expect(ctx.gains[0].to).toBe(ctx.destination);
    for (const name of sfx.names) expect(sfx.play(name)).toBe(true);
    expect(sfx.play('nope')).toBe(false);
    for (const g of ctx.gains) expect(g.ramps[g.ramps.length - 1][0]).toBeLessThan(0.001);   // every note fades to silence
    for (const name of sfx.names) for (const n of SFX[name]) { expect(n.d).toBeGreaterThan(0); expect(n.d).toBeLessThanOrEqual(0.4); expect(n.g).toBeLessThanOrEqual(0.35); }
    on = false;
    expect(sfx.play('place')).toBe(false);
  });
  it('marks the audio session ambient, never uses an audio element, and survives a context that fails to open', async () => {
    const session = { type: 'auto' };
    createSfx({ audioSession: session, enabled: () => true, create: () => fakeAudio(), vibrate: null });
    expect(session.type).toBe('ambient');
    const broken = createSfx({ enabled: () => true, create: () => { throw new Error('no audio'); }, audioSession: null, vibrate: null });
    expect(broken.unlock()).toBe(false);
    expect(broken.play('goal')).toBe(false);
    const src = await (await fetch('/src/audio/sfx.js')).text();
    expect(/new Audio\(|createElement\(\s*['"]audio['"]|<audio/i.test(src)).toBe(false);
  });
  it('buzzes only when the setting allows and the device can', () => {
    const buzzes = [];
    let allowed = true;
    const sfx = createSfx({ vibrate: (ms) => { buzzes.push(ms); return true; }, canVibrate: () => allowed, audioSession: null });
    expect(sfx.buzz(20)).toBe(true);
    allowed = false;
    expect(sfx.buzz(20)).toBe(false);
    expect(buzzes).toEqual([20]);
    expect(createSfx({ vibrate: null, canVibrate: () => true, audioSession: null }).buzz(20)).toBe(false);
    expect(createSfx({ vibrate: () => { throw new Error('x'); }, canVibrate: () => true, audioSession: null }).buzz(20)).toBe(false);
  });
  it('plays from the game: commands and ✓, events, and a new critical alert; buzzes on ✓ and milestones', async () => {
    const played = [], buzzes = [];
    const sfx = { names: [], play: (n) => { played.push(n); return true; }, unlock: () => { played.push('unlock'); return true; }, buzz: (ms) => { buzzes.push(ms); return true; }, context: null };
    const r = await rigUI({ width: 1280, height: 800, sfx });
    settle(r.world);                                                          // the rig's city already meets four goals: settle them silently first
    expect(r.ui.sfx).toBe(sfx);
    fire(r.root.querySelector('#topbar'), 'pointerdown');
    fire(r.root.querySelector('#topbar'), 'pointerdown');
    fire(r.root.querySelector('#topbar'), 'pointerup');
    expect(played).toEqual(['unlock']);                                       // all three listeners detached after the first success
    const c = screenToTile(r.cam, { width: 1280, height: 800 }, 640, 320);
    r.cam.x += 5.2 - c.x; r.cam.y += 9.2 - c.y;
    key(r.root, '5');
    fire(r.root.querySelector('#panel .cards .card'), 'click');
    key(r.root, 'Enter');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    expect(played).toEqual(['unlock', 'place']);
    expect(buzzes).toEqual([20]);
    key(r.root, 'z', { ctrlKey: true });                                      // undo: no sound, no buzz
    expect(played.length).toBe(2);
    key(r.root, 'Escape');
    key(r.root, '1');
    fire(r.root.querySelectorAll('#panel .cards .card')[0], 'click');         // the road card
    r.ui.placement.pointAt(5, 14); r.ui.placement.pointAt(8, 14);          // open desert below the services
    key(r.root, 'Enter');
    expect(played[played.length - 1]).toBe('road');
    expect(buzzes).toEqual([20, 20]);
    key(r.root, 'Escape');
    r.ui.onEvents([{ type: 'upgrade', id: 1, from: 1, to: 2 }, { type: 'arrivals', count: 2 }, { type: 'goal', id: 'road', reward: 25 }, { type: 'milestone', id: 'town' }]);
    expect(played.slice(-2)).toEqual(['upgrade', 'goal']);                    // the goal's sound and buzz come with its caption; the milestone's wait their turn (early-game pass 3.6)
    expect(buzzes).toEqual([20, 20, 20]);
    r.ui.celebrations.clear();
    r.ui.onEvents([{ type: 'milestone', id: 'town' }]);
    expect(played[played.length - 1]).toBe('milestone');
    expect(buzzes).toEqual([20, 20, 20, 40]);
    r.world.gold = -5;
    r.ui.alerts.refresh();
    expect(played[played.length - 1]).toBe('alert');
    r.ui.alerts.refresh();
    expect(played.filter((n) => n === 'alert').length).toBe(1);               // the same alert does not repeat
    r.cleanup();
  });
});
