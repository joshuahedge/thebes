// Boot: the world from the URL's seed, the renderer, the interface and the loop (spec 4.1: a new city
// starts paused with its start road; createWorld does both). ?seed=N picks a map, ?stress=1 a full city,
// ?sample=1 the sample city, ?speed=1 starts running.
import { createWorld } from './sim/world.js';
import { setSpeed } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';
import { createUI } from './ui/createUI.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const world = createWorld({ seed });
const stress = params.get('stress') === '1';
if (stress) buildStressCity(world);
else if (params.get('sample') === '1') buildSampleCity(world);
if (params.has('speed')) setSpeed(world, Number(params.get('speed')));

const canvas = document.getElementById('map');
const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
const renderer = createRenderer({ canvas });
const ui = createUI({
  world, canvas, cam, renderer,
  hooks: {
    newCity() {
      const url = new URL(location.href);
      url.searchParams.set('seed', String(Math.floor(Math.random() * 1e9)));
      url.searchParams.delete('stress'); url.searchParams.delete('sample'); url.searchParams.delete('speed');
      location.href = url.href;
    },
  },
});
const loop = createGameLoop({ world, onEvents: (events) => ui.effects.fromEvents(world, events, performance.now()), render: ui.render });
loop.start();
window.__thebes = { world, cam, renderer, loop, ui };
