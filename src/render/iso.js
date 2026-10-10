// Isometric projection in "art pixels": the unit the approved mock-ups were drawn in, where a tile is
// 32 px wide and 16 px tall. The game draws at ART_SCALE times this, so a tile is 64 CSS px at zoom 1.
export const ART_SCALE = 2;
export const ART_TILE_W = 32;
export const ART_TILE_H = 16;
export const TILE_W = ART_TILE_W * ART_SCALE;
export const TILE_H = ART_TILE_H * ART_SCALE;

export const p = (x, y) => [(x - y) * 16, (x + y) * 8];
export const U = (q, h) => [q[0], q[1] - h];

export function artToTile(ax, ay) {
  return { x: (ax / 16 + ay / 8) / 2, y: (ay / 8 - ax / 16) / 2 };
}

export const tileDiamond = (x, y) => [p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1)];
export const quad = (x, y, w, d, z) => [U(p(x, y), z), U(p(x + w, y), z), U(p(x + w, y + d), z), U(p(x, y + d), z)];
export const dia = (cx, cy, r) => [p(cx, cy - r), p(cx + r, cy), p(cx, cy + r), p(cx - r, cy)];

// The mock-ups' sine hash: cheap, deterministic, good enough for scattering pebbles and tufts.
export function hs(x, y, k) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export const depthKey = (x, y, w, d) => x + w / 2 + y + d / 2;
export const compareDepth = (a, b) => a.key - b.key || a.id - b.id;

// Art px bounds [left, top, right, bottom] of a sprite whose footprint origin sits at p(0, 0).
export function boundsFor(w, d, height, m = 8) {
  return [-16 * d - m, -height - m, 16 * w + m, 8 * (w + d) + m];
}
