// Stage 4.7 Task 4: the dev scene for the next-house spots (src/dev/s47/index.js joins it). Opens the seed-11 sample city (a real town: roads, wells, a bazaar,
// homes) with the house tool on, so the free tiles beside the roads show Good and Fair. options: seed (11), variant ('classic'), size (64), zoom (1: the
// phone's default), well (true: one well beside the middle of the Fair tiles, so some turn Good), tool (true; false leaves the tool off, to see the plain map), at ('street' | 'whole' | 'farm': where the camera goes), chrome (false:
// screenshot mode).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide, place } from '../../sim/commands.js';
import { houseSpots } from '../../sim/spots.js';
import { wait, inGame } from '../s46/base.js';

export const houseSpotsScene = async (api, options = {}) => {
  inGame(api, 's47-house-spots');
  const o = { seed: 11, variant: 'classic', size: 64, zoom: 1, tool: true, at: 'street', ...options };
  const world = api.freshWorld({ seed: o.seed, variant: o.variant, size: o.size });
  buildSampleCity(world);
  setGuide(world, false);
  // The sample city's bazaar reaches free tiles its wells do not, so they are all Fair. A well beside the middle of those tiles (as a player would place one for the next
  // homes) turns the ones in its reach (5 road tiles) Good: both marks in one shot. well: false leaves the city as it is.
  let wellAt = null;
  if (o.well !== false) {
    const fair = houseSpots(world).list.filter((s) => Math.hypot(s.x - world.focus.x, s.y - world.focus.y) < 24);
    const mid = fair[Math.floor(fair.length / 2)];
    for (let r = 1; mid && r <= 4 && !wellAt; r++) {
      for (let dy = -r; dy <= r && !wellAt; dy++) {
        for (let dx = -r; dx <= r && !wellAt; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && place(world, 'well', mid.x + dx, mid.y + dy).ok) wellAt = [mid.x + dx, mid.y + dy];
        }
      }
    }
  }
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.cancel();
  const spots = houseSpots(world);
  // the camera goes to the middle of the marked tiles near the focus (the start road), or pulls out over the whole map
  const near = spots.list.filter((s) => Math.hypot(s.x - world.focus.x, s.y - world.focus.y) < 24);
  const pick = near.length ? near : spots.list;
  const cx = pick.length ? pick.reduce((a, s) => a + s.x, 0) / pick.length : world.focus.x;
  const cy = pick.length ? pick.reduce((a, s) => a + s.y, 0) / pick.length : world.focus.y;
  if (o.at === 'whole') {
    g.cam.zoom = Math.min(0.5, (g.ui.cameraControl.centre().x * 2 * 0.94) / (world.size * 64));
    g.ui.cameraControl.jumpTo(world.size / 2, world.size / 2);
  } else {
    g.cam.zoom = o.zoom;
    g.ui.cameraControl.jumpTo(cx + 0.5, cy + 0.5);
  }
  if (o.tool) g.ui.placement.start({ kind: 'houses' });
  await wait(400);
  if (o.chrome === false) g.ui.screenshotMode();
  return `s47-house-spots: ${o.variant} ${world.size} seed ${o.seed}, ${spots.good} good and ${spots.fair} fair spots, tool ${o.tool ? 'on' : 'off'}, well ${wellAt ? wellAt.join(',') : 'none'}, zoom ${o.zoom}`;
};
