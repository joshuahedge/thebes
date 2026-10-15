// Version 5.0 (Task 4, rulings 550-559): the buildings that can be laid as an area, dragged like plots. 'farm': as many whole footprints as fit the
// tiles, each on ground that takes it (packed in rows, or in columns when that fits more); 'spread': one on every tile of a lattice, the spacing
// being the gap between two, so 1 fills the rectangle and 3 puts one in every third tile each way. Every number an area shows comes from the sim
// (src/sim/areas.js previewAreaTiles); this file only says which types and which spacings.
export const AREA_TYPES = { farm_grain: 'farm', farm_fig: 'farm', farm_barley: 'farm', farm_flax: 'farm', garden: 'spread', statue: 'spread' };
export const AREA_SPACINGS = [1, 2, 3];
export const AREA_SPACING_DEFAULT = 2;
export const areaKindOf = (type) => AREA_TYPES[type] || null;
