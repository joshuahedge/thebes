// The minimap (spec 6.3): the whole map top-down, the current view outlined, alert pins. Tapping it jumps.
// Stage 3 (Track D): a pin can mark a map point as well as a building. A raid's alerts (no building, an x and y) get a
// larger pin with an arrow pointing into the map from the edge they come from (spec 4.13), so the pin says where by shape.
import { T as TER } from '../sim/terrain.js';
import { TERRAIN, UI, INK } from '../render/art/palette.js';
import { allBuildings, isMonument } from '../sim/world.js';
import { screenToTile } from '../render/camera.js';
import * as monumentArt from '../render/monuments.js';   // Track B's minimapGlyph, once it is there (a namespace import never fails)

// Stage 4 (Track C, spec 5.7): a monument on the minimap is Track B's glyph (render/monuments.js minimapGlyph(ctx, b, scale), drawn
// in minimap px), or until then its footprint in the Monuments gold.
const MONUMENT_GOLD = '#E2B13C';
function drawMonumentMark(ctx, b, scale) {
  if (typeof monumentArt.minimapGlyph === 'function') { monumentArt.minimapGlyph(ctx, b, scale); return; }
  ctx.fillStyle = MONUMENT_GOLD;
  ctx.fillRect(b.x * scale, b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.d * scale));
}

const COLOURS = { [TER.DESERT]: TERRAIN.sand, [TER.FERTILE]: TERRAIN.fertile, [TER.ROCKY]: TERRAIN.rocky, [TER.WATER]: TERRAIN.water, [TER.BANK]: TERRAIN.bank, [TER.MEADOW]: TERRAIN.grass, [TER.CLAY]: TERRAIN.clay };

const INTO = { east: [-1, 0], west: [1, 0], north: [0, 1], south: [0, -1] };

// The pins for a list of alerts, in tile units: { x, y, point, dx, dy }. A building's pin sits on its centre; a point
// alert's at its tile's centre, with (dx, dy) the unit arrow into the map (from its dir, else towards the map's middle).
export function minimapPins(world, alerts = []) {
  const out = [];
  for (const a of alerts) {
    // An alert about many buildings (plots with no road) pins each of them.
    if (a.ids) { for (const id of a.ids) { const m = world.buildings[id]; if (m) out.push({ x: m.x + m.w / 2, y: m.y + m.d / 2, point: false, dx: 0, dy: 0 }); } continue; }
    const b = a.id ? world.buildings[a.id] : null;
    if (b) { out.push({ x: b.x + b.w / 2, y: b.y + b.d / 2, point: false, dx: 0, dy: 0 }); continue; }
    if (a.id !== undefined && a.id !== null) continue;          // a building that is gone
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
    const x = Math.max(0, Math.min(world.size - 1, a.x)) + 0.5, y = Math.max(0, Math.min(world.size - 1, a.y)) + 0.5;
    let [dx, dy] = INTO[a.dir] || [world.size / 2 - x, world.size / 2 - y];
    const len = Math.hypot(dx, dy) || 1;
    out.push({ x, y, point: true, dx: dx / len, dy: dy / len });
  }
  return out;
}

// Stage 4 (Track C): the camera and view the interface shows a city through, as the minimap that follows it was given them.
// createUI makes its minimaps before the monuments interface, and its seam context carries no camera, so the placing fit
// (src/ui/monumentSheet.js pickFit: never zoom in) reads the camera's zoom here. Read-only.
const shownBy = new WeakMap();   // world -> { cam, view }
export const cameraOf = (world) => (world && shownBy.get(world)) || null;

export function createMinimap({ world, cam, view, size = 160, dpr = 1 }) {
  if (cam && view) shownBy.set(world, { cam, view });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.className = 'minimap-canvas';
  const ctx = canvas.getContext('2d');
  const scale = (size * dpr) / world.size;

  // Terrain never changes in Stage 1, so it is baked once.
  const ground = document.createElement('canvas');
  ground.width = canvas.width; ground.height = canvas.height;
  const gctx = ground.getContext('2d');
  for (let y = 0; y < world.size; y++) {
    for (let x = 0; x < world.size; x++) {
      gctx.fillStyle = COLOURS[world.terrain[y * world.size + x]] || TERRAIN.sand;
      gctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
    }
  }

  function render(alerts = []) {
    ctx.drawImage(ground, 0, 0);
    ctx.fillStyle = TERRAIN.road;
    for (let i = 0; i < world.road.length; i++) if (world.road[i]) ctx.fillRect((i % world.size) * scale, Math.floor(i / world.size) * scale, Math.ceil(scale), Math.ceil(scale));
    for (const b of allBuildings(world)) {
      if (isMonument(b)) { drawMonumentMark(ctx, b, scale); continue; }
      ctx.fillStyle = b.type === 'house' ? (b.tier > 0 ? TERRAIN.roadPebble : TERRAIN.plot) : UI.housing;
      ctx.fillRect(b.x * scale, b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.d * scale));
    }
    const v = view();
    const corners = [[0, 0], [v.width, 0], [v.width, v.height], [0, v.height]].map(([sx, sy]) => screenToTile(cam, v, sx, sy));
    ctx.strokeStyle = UI.halo;
    ctx.lineWidth = Math.max(1, dpr * 1.5);
    ctx.beginPath();
    corners.forEach((t, i) => { const px = t.x * scale, py = t.y * scale; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = TERRAIN.grid;
    ctx.lineWidth = Math.max(1, dpr * 0.5);
    ctx.stroke();
    for (const pin of minimapPins(world, alerts)) {
      const px = pin.x * scale, py = pin.y * scale;
      ctx.fillStyle = UI.bad;
      if (pin.point) {
        // An arrow from the pin into the map, then the pin: a ringed disc twice a building pin's size.
        const r = Math.max(4, dpr * 5), len = r * 2.6, nx = -pin.dy, ny = pin.dx;
        const tip = [px + pin.dx * len, py + pin.dy * len], base = [px + pin.dx * r * 0.6, py + pin.dy * r * 0.6];
        ctx.beginPath();
        ctx.moveTo(tip[0], tip[1]);
        ctx.lineTo(base[0] + nx * r, base[1] + ny * r);
        ctx.lineTo(base[0] - nx * r, base[1] - ny * r);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = UI.halo;
        ctx.lineWidth = Math.max(1.5, dpr * 2);
        ctx.stroke();
        continue;
      }
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, dpr * 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tileFromPoint(px, py) {
    const clamp = (v) => Math.max(0, Math.min(world.size - 1, Math.floor(v)));
    return { x: clamp((px * dpr) / scale), y: clamp((py * dpr) / scale) };
  }

  render();
  return { canvas, render, tileFromPoint };
}
