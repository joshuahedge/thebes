// Stage 4.6, the UX track's dev scenes (window.__thebes.devScene(name, options), on the seed-11 sample city:
// /?skipTitle=1&nosw=1&seed=11&sample=1). The text size and the motion are the caller's (the shots tool sets them first).
//   s46-speed  the top bar's play, pause and speed state at a glance. options: speed (0 paused, 1, 2 or 3; paused by default)
//   s46-hud    the HUD as a player meets it. options: view, one of
//              'city'     (default) the top bar, the alert and guidance rows, and the bottom category bar with its cards
//              'sheet'    a home's sheet open
//              'summary'  the city summary open
//              'confirm'  a building's ghost with the confirm bar (a well)
//              'road'     a road drawn from its start to its end and waiting for Enter (the confirm bar, with the key hint)
//              'menu'     the menu sheet open
import { inGame, wait } from './base.js';
import { openSheet, select, pickCategory } from '../../ui/modes.js';
import { setSpeed } from '../../sim/commands.js';
import { allBuildings } from '../../sim/world.js';

const settle = (options, ms) => wait(options && options.quick ? 0 : ms);

// The finest home standing, the nearest to the middle first: the house sheet's scene.
function aHome(world) {
  const homes = allBuildings(world).filter((b) => b.type === 'house' && b.residents > 0);
  homes.sort((a, b) => (b.tier - a.tier) || (Math.abs(a.x - world.focus.x) + Math.abs(a.y - world.focus.y)) - (Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y)));
  return homes[0] || null;
}

// A straight run of free tiles for a road, the nearest to the middle that the road tool's own preview calls placeable.
function roadSpot(g) {
  const { world, ui } = g;
  const { x: cx, y: cy } = world.focus;
  const tried = [];
  for (let r = 0; r < 24; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = Math.round(cx + dx), y = Math.round(cy + dy);
    ui.store.set({ line: { x0: x, y0: y, x1: x + 4, y1: y, flip: false }, plan: null });
    const p = ui.placement.preview();
    tried.push(p.state);
    if (p.state === 'ok') return { x, y };
  }
  return null;
}

export const UX_SCENES = {
  's46-speed': async (api, options = {}) => {
    const g = inGame(api, 's46-speed');
    const speed = [0, 1, 2, 3].includes(options.speed) ? options.speed : 0;
    g.ui.store.set({ sheet: null, mode: 'browse', tool: null, selectedId: null });
    setSpeed(g.world, speed);
    g.ui.speedControl.render();
    g.ui.refresh();
    await settle(options, 300);
    return `s46-speed ${speed}`;
  },
  's46-hud': async (api, options = {}) => {
    const g = inGame(api, 's46-hud');
    const { world, ui } = g;
    const view = options.view || 'city';
    setSpeed(world, 0);
    ui.refresh();
    await settle(options, 150);
    if (view === 'sheet') {
      const h = aHome(world);
      if (!h) throw new Error('devScene s46-hud: no home to open');
      ui.store.set(select(ui.store.get(), h.id));
    } else if (view === 'summary') {
      ui.store.set(openSheet(ui.store.get(), 'summary'));
    } else if (view === 'menu') {
      ui.store.set(openSheet(ui.store.get(), 'menu'));
    } else if (view === 'confirm') {
      ui.showMeAt({ category: 'services', item: 'well', x: world.focus.x, y: world.focus.y });
    } else if (view === 'road') {
      ui.store.set(pickCategory(ui.store.get(), 'roads'));
      ui.showMeAt({ category: 'roads', item: 'road', x: world.focus.x, y: world.focus.y });
      const at = roadSpot(g);
      if (!at) throw new Error('devScene s46-hud: no free run of tiles for a road near the middle');
      ui.cameraControl.jumpTo(at.x + 2, at.y);
    }
    ui.refresh();
    await settle(options, 400);
    return `s46-hud ${view}`;
  },
};
