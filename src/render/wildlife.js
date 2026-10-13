// Wildlife on screen (Stage 4.6, River track, ruling 335): the herds (world.wildlife) and the render-only ibis, herons, hippos,
// crocodiles and jumping fish, at most WILDLIFE.ambientCap drawn at once; under Gentle they move slowly, under Still they stand.
// Track 0 made it empty; the River track owns this file. Called through src/render/s46.js s46Walkers.
// Figure ids: WILDLIFE_ID_BASE + a number below 100000 (units 100000+, processions 200000+, dedications 600000+, streamers 900000+,
// newcomers 1200000+).
export const WILDLIFE_ID_BASE = 1400000;

// The animals in range as walker entries: [{ id, kind, x, y, dir }], kind naming an art slot fig.<kind> (render/art/river.js).
export const animalsAt = (world, timeDays, range, motion) => [];
