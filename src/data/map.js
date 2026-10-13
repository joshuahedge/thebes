// Map generation tunables: the river, the terrain bands, the rock patches and the trade road.
export const MAP = {
  size: 64,
  riverBaseX: 7, riverWave1: { amp: 2.5, period: 9 }, riverWave2: { amp: 1.5, period: 4.3 },
  waterHalfWidth: 1.6, bankHalfWidth: 2.6,
  fertileBase: 7, fertileNoise: 5, fertileNoiseScale: 6,
  meadowNoiseScale: 9, meadowThreshold: 0.72,
  rockPatches: { min: 2, extra: 2, minX: 34, marginX: 40, minY: 6, marginY: 12, radiusMin: 3, radiusExtra: 2, edgeNoiseScale: 3, edgeNoise: 4 },
  // Clay (Stage 4.5, ruling 312): stretches of 4-10 bank tiles (some a second tile deep) turn to clay until a map holds its
  // target, 40-66 tiles; a stretch adds at most 20, so a map ends with at most 85. salt keys the draws apart from the generator's.
  clay: { targetMin: 40, targetExtra: 26, stretchMin: 4, stretchExtra: 7, deepChance: 0.45, maxTries: 400, salt: 0x51A7C1A9 },
  variantSalt: 0x0A1E,
  tradeRoadOffsetX: 14, startRoadLength: 9, focusOffset: { x: -4, y: -12 },
};

// The six river layouts (Stage 4.5, ruling 313). A new city's UI passes 'auto' and the seed picks one; everything else
// (tests, the dev scenes, the sample, stress and title cities) asks for 'classic'.
export const MAP_VARIANTS = ['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis'];
