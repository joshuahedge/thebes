// The minimap (spec 6.3): the whole map top-down, the current view outlined, alert pins. Tapping it jumps.
import { T as TER } from '../sim/terrain.js';
import { TERRAIN, UI } from '../render/art/palette.js';
import { allBuildings } from '../sim/world.js';
import { screenToTile } from '../render/camera.js';

const COLOURS = { [TER.DESERT]: TERRAIN.sand, [TER.FERTILE]: TERRAIN.fertile, [TER.ROCKY]: TERRAIN.rocky, [TER.WATER]: TERRAIN.water, [TER.BANK]: TERRAIN.bank, [TER.MEADOW]: TERRAIN.grass };

export function createMinimap({ world, cam, view, size = 160, dpr = 1 }) {
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
    for (const a of alerts) {
      const b = a.id ? world.buildings[a.id] : null;
      if (!b) continue;
      ctx.fillStyle = UI.bad;
      ctx.beginPath();
      ctx.arc((b.x + b.w / 2) * scale, (b.y + b.d / 2) * scale, Math.max(2, dpr * 3), 0, Math.PI * 2);
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
