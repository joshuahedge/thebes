export const NEIGHBOURS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const idx = (size, x, y) => y * size + x;

export const inBounds = (size, x, y) => x >= 0 && y >= 0 && x < size && y < size;

export function footprint(x, y, w, d) {
  const out = [];
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]);
  return out;
}

// Tiles sharing an edge with the footprint, outside it: top and bottom rows, then left and right columns.
export function ring(x, y, w, d) {
  const out = [];
  for (let i = 0; i < w; i++) { out.push([x + i, y - 1]); out.push([x + i, y + d]); }
  for (let j = 0; j < d; j++) { out.push([x - 1, y + j]); out.push([x + w, y + j]); }
  return out;
}
