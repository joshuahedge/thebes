// Version 6.0 (Track C, the 5.0 loose end): the layers' own change counter. A pause changes what Home progress, Goods supply and Workers say (the layers' lists key on it:
// src/sim/layers.js) but moves no footprint, so it must not rebuild what keys on the buildings' version: the render's chunk index and the roadless plots (buildingsVersion,
// bumped only by insertBuilding and removeBuilding). Kept beside the world, never saved: 0 for a world just made or loaded, as buildingsVersion is.
const versions = new WeakMap();
export const layersVersion = (world) => versions.get(world) || 0;
// Says a building changed without being placed or removed (a pause or a resume): the layers' caches see it, nothing that keys on footprints does.
export const touchLayers = (world) => { versions.set(world, layersVersion(world) + 1); };
