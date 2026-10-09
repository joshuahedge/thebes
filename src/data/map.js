// Map generation tunables: the river, the terrain bands, the rock patches and the trade road.
export const MAP = {
  size: 64,
  riverBaseX: 7, riverWave1: { amp: 2.5, period: 9 }, riverWave2: { amp: 1.5, period: 4.3 },
  waterHalfWidth: 1.6, bankHalfWidth: 2.6,
  fertileBase: 7, fertileNoise: 5, fertileNoiseScale: 6,
  meadowNoiseScale: 9, meadowThreshold: 0.72,
  rockPatches: { min: 2, extra: 2, minX: 34, marginX: 40, minY: 6, marginY: 12, radiusMin: 3, radiusExtra: 2, edgeNoiseScale: 3, edgeNoise: 4 },
  tradeRoadOffsetX: 14, startRoadLength: 9, focusOffset: { x: -4, y: -12 },
};
