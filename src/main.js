// Boot. Until Task 17 this only shows the world: layout, renderer and loop, no controls.
import { createWorld } from './sim/world.js';
import { createCamera, visibleTileRange } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { walkersAt } from './render/walkers.js';
import { createEffects } from './render/effects.js';
import { watchLayout } from './ui/layout.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const world = createWorld({ seed });
if (params.get('stress') === '1') buildStressCity(world);
else if (params.get('sample') === '1') buildSampleCity(world);

const canvas = document.getElementById('map');
const cam = createCamera({ x: world.focus.x, y: world.focus.y, zoom: 1 });
const renderer = createRenderer({ canvas });
const effects = createEffects();
const view = () => ({ width: canvas.clientWidth || window.innerWidth, height: canvas.clientHeight || window.innerHeight });
watchLayout({ root: document.body });

const loop = createGameLoop({
  world,
  onEvents: (events) => effects.fromEvents(world, events, performance.now()),
  render: ({ timeDays, now }) => {
    const v = view();
    renderer.renderFrame(world, cam, { view: v, walkers: walkersAt(world, timeDays, visibleTileRange(cam, v, world.size)), effects, now });
  },
});
loop.start();
window.__thebes = { world, cam, renderer, loop };
