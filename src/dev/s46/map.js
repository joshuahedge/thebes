// Stage 4.6, the Map track's dev scenes (Track 0 made them; the Map track owns this file). Run through window.__thebes.devScene(name, options)
// (src/dev/scenes.js), after opening /?skipTitle=1&nosw=1&seed=11&sample=1.
//   s46-sizes-small / -normal / -large  a new seed-11 city at 48, 64 and 80 on the layout its seed picks (as New city does), the whole map in view
//   s46-clay     the clay pit picked on the sample city: Ground on, the ghost on the nearest spot that fits, the guidance row's line showing
//   s46-bridge   the road tool and water, on a river with a crossing: options.view 'bridge' (a line across narrow water: the bar says the bridge's
//                price), 'refused' (a line that stops in the water: the bar says why and offers Show me) or 'tip' (the bridge tip in the guidance row)
import { MAP_SIZES } from '../../data/map.js';
import { variantFor } from '../../sim/mapgen.js';
import { bridgeSpot } from '../../sim/bridges.js';
import { isUnlocked } from '../../sim/progression.js';
import { setGuide } from '../../sim/commands.js';
import { pickCategory } from '../../ui/modes.js';
import { fitOf } from '../../sim/fit.js';
import { TIP_FIRST_DELAY_MS } from '../../data/tips.js';
import { wait, inGame } from './base.js';

// A fresh city (no buildings but the start road) at the given size on the layout its seed picks, guide off, the camera pulled out over the
// whole map (below the buttons' minimum zoom, as the 'variant' scene's). options: seed (11), variant (the seed's), zoom.
async function newCityAt(api, size, options = {}) {
  inGame(api, 's46-sizes');
  const seed = options.seed || 11;
  const world = api.freshWorld({ seed, variant: options.variant || variantFor(seed), size });
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  const c = g.ui.cameraControl.centre();
  g.ui.cameraControl.cancel();
  g.cam.zoom = options.zoom || Math.min(0.5, (c.x * 2 * 0.94) / (world.size * 64));
  g.ui.cameraControl.jumpTo(world.size / 2, world.size / 2);
  await wait(300);
  return world;
}

const sizeScene = (id) => async (api, options = {}) => {
  const world = await newCityAt(api, MAP_SIZES[id], options);
  const p = world.mapParams || {};
  return `size ${id} ${world.size}x${world.size} ${world.mapVariant} outcrops ${p.outcrops || 0} pools ${(p.pools || []).length} groves ${(p.groves || []).length} dunes ${(p.dunes || []).length} wadis ${(p.wadis || []).length}`;
};

// Clicks the card of an item in its category's tray, as a tap does.
async function pickCard(g, category, item) {
  g.ui.store.set(pickCategory(g.ui.store.get(), category));
  await wait(400);
  const card = [...document.querySelectorAll(`[data-item="${item}"]`)].find((b) => b.offsetParent);
  if (!card) throw new Error(`devScene: no card ${item}`);
  card.click();
  await wait(500);
}

async function clay(api, options = {}) {
  const g = inGame(api, 's46-clay');
  if (!isUnlocked(g.world, 'clay_pit')) g.world.milestone = 'town';
  await pickCard(g, 'industry', 'clay_pit');
  const s = g.ui.store.get(), at = s.ghost;
  const f = at ? fitOf(g.world, 'clay_pit', at.x, at.y) : null;
  await wait(options.wait === undefined ? 300 : options.wait);
  return `clay pit ghost ${at ? `${at.x},${at.y}` : 'none'} overlay ${s.overlay} clay tiles ${f ? `${f.fit} of ${f.of}` : '-'}`;
}

async function bridge(api, options = {}) {
  const open = inGame(api, 's46-bridge');
  const view = options.view || 'bridge';
  if (view === 'tip') {   // the one-time Gentle tip would be showing on a wide screen under Gentle and hold the guidance row for three minutes: mark it seen
    const seen = open.ui.settings.get().seenTips;
    open.ui.settings.set({ seenTips: [...new Set([...(Array.isArray(seen) ? seen : []), 'gentle_motion'])] });
  }
  const world = await (async () => {
    const w = api.freshWorld({ seed: options.seed || 11, variant: options.variant || 'middle', size: 64 });
    setGuide(w, false);
    api.startGame(w, { saveNow: false });
    await wait(300);
    return w;
  })();
  const g = api.game();
  const spot = bridgeSpot(world, world.focus);
  if (!spot) throw new Error('devScene s46-bridge: this map has no crossing');
  g.ui.cameraControl.cancel();
  g.cam.zoom = 1;
  g.ui.cameraControl.jumpTo(spot.x + 0.5, spot.y + 0.5);
  await pickCard(g, 'roads', 'road');
  if (view === 'tip') {
    g.ui.store.set({ ...pickCategory(g.ui.store.get(), 'roads'), tool: null, mode: 'browse' });
    await wait(TIP_FIRST_DELAY_MS + 300);
    if (!g.ui.tips.trigger('roadMeetsWater')) throw new Error('devScene s46-bridge: the bridge tip did not show');
    await wait(300);
    return `bridge tip ${g.ui.tips.current()} at ${spot.x},${spot.y}`;
  }
  const [x0, y0] = spot.from, [x1, y1] = spot.to;
  // 'refused': the line bends in the middle of the water (the sim's own bridge_shape refusal, with Show me in the bar).
  // Version 8.3 (Track X): a line that stops in the water is on its way across (the bar names what lies ahead), so 'refused' bends in the water instead.
  const end = view === 'refused' ? (spot.vertical ? [spot.x + 1, spot.y] : [spot.x, spot.y + 1]) : [x1, y1];
  g.ui.placement.pointAt(x0, y0);
  g.ui.placement.pointAt(end[0], end[1]);
  if (view === 'refused' && spot.vertical) g.ui.placement.flip();
  await wait(300);
  const p = g.ui.placement.preview();
  return `bridge ${view} from ${x0},${y0} to ${end[0]},${end[1]} water ${spot.water}: ${p.state} ${p.text}`;
}

export const MAP_SCENES = {
  's46-sizes-small': sizeScene('small'),
  's46-sizes-normal': sizeScene('normal'),
  's46-sizes-large': sizeScene('large'),
  's46-clay': clay,
  's46-bridge': bridge,
};
