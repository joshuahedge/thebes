// Walls on the map (spec 4.13, 5.4): a continuous mudbrick band along the wall tiles (world.wall), a gate arch where a
// wall crosses a road, and broken stone at a breach. Baked into the terrain chunks after the roads (terrainBaker.js), so
// a chunk re-bakes only when a wall tile in it, or in the two-tile ring it draws, appears, goes or breaks: its
// signature mixes each tile's wallCode, which changes exactly when the sim bumps world.wallVersion. Pieces are drawn
// back to front (by x + y), so arms that meet across a tile edge join into one band.
import { idx, inBounds } from '../sim/grid.js';
import { wallPiece, gatePiece, breachPiece } from './art/defence.js';

// 0 no wall, 1 a standing wall (a gate, or a tower's wall tile, included), 2 a breach. Off the map is 0.
export function wallCode(world, x, y) {
  if (!world.wall || !inBounds(world.size, x, y)) return 0;
  const v = world.wall[idx(world.size, x, y)];
  return v > 0 ? 1 : v < 0 ? 2 : 0;
}

const isRoad = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);

// Whether the wall through tile (x, y) runs along x: it links east or west; failing that, north or south means along
// y; a lone gate turns across its road.
export function runsAlongX(world, x, y) {
  if (wallCode(world, x - 1, y) || wallCode(world, x + 1, y)) return true;
  if (wallCode(world, x, y - 1) || wallCode(world, x, y + 1)) return false;
  return !(isRoad(world, x - 1, y) || isRoad(world, x + 1, y));
}

// What one wall tile draws: null, or { kind: 'wall' | 'gate' | 'breach', links, alongX }.
export function wallPieceAt(world, x, y) {
  const code = wallCode(world, x, y);
  if (!code) return null;
  if (code === 2) return { kind: 'breach', alongX: runsAlongX(world, x, y) };
  if (isRoad(world, x, y)) return { kind: 'gate', alongX: runsAlongX(world, x, y) };
  return { kind: 'wall', links: { n: wallCode(world, x, y - 1), e: wallCode(world, x + 1, y), s: wallCode(world, x, y + 1), w: wallCode(world, x - 1, y) } };
}

export function drawWalls(g, world, range) {
  if (!world.wall) return;
  for (let sum = range.x0 + range.y0; sum <= range.x1 + range.y1; sum++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const y = sum - x;
      if (y < range.y0 || y > range.y1) continue;
      const piece = wallPieceAt(world, x, y);
      if (!piece) continue;
      if (piece.kind === 'wall') wallPiece(g, x, y, piece.links);
      else if (piece.kind === 'gate') gatePiece(g, x, y, piece.alongX);
      else breachPiece(g, x, y, piece.alongX);
    }
  }
}
