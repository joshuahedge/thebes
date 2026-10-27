// Version 5.0 (Task 3, rulings 540-549): the three new layers (Home progress, Goods supply, Workers), their milestones and the numbers their legends say.
// The layers read the sim's own records (src/sim/layers.js); this file holds only what is chosen: when each appears in the Layers picker, which goods the
// goods layer can show, and the bands a district's joblessness is drawn in. A leaf data file: it imports nothing.
// Version 8.3 (Track K, ruling 1416): Supply lines ('lines') joins them: every Keep stocked order as a line along its road route. It is not Goods supply,
// which is untouched (ruling 1385).
export const LAYER_KINDS = ['progress', 'supply', 'workers', 'lines'];

// When each appears in the picker (and for the O key): Home progress with the first home (a plot counts), Goods supply and Workers at Town (150 people),
// where the first household good (pottery) and the sim's count of the jobless begin. A milestone is an id of src/data/progression.js.
// Version 8.3: Supply lines comes with Town too, as the storehouse does.
export const LAYER_UNLOCK = { progress: { home: true }, supply: { milestone: 'town' }, workers: { milestone: 'town' }, lines: { milestone: 'town' } };

// The goods the supply layer can show, in the picker's order: a household good is offered once its maker can be built (isUnlocked), foods always (all foods are one choice).
export const SUPPLY_GOODS = ['pottery', 'beer', 'linen', 'jewellery', 'food'];

// A district's jobless people, shared out over the districts by how many people live in each (the sim counts the jobless for the whole city, not per
// home): drawn in bands, a band from its `from` people up, the last with hatching.
export const JOBLESS_BANDS = [{ from: 1 }, { from: 5 }, { from: 15 }];

// Each layer's hue (the Layers picker's stripe, the legend and the map): a cyan for progress, an umber for supply, a steel blue-grey for workers. No two overlays share one
// (tests/stage45 holds that), and none of the three is read by colour alone: each has a shape, a number or hatching on the map and words in the legend.
// Version 8.3: a deep navy for Supply lines, so the amber of a stuck line (UI.warn, with long dashes as well) stands apart from it.
export const LAYER_HUE = { progress: '#1C9BB8', supply: '#8A5A2B', workers: '#4F6D7A', lines: '#23407A' };

// Version 8.3 (ruling 1417): how a supply line is drawn, in art px at the map's own scale. Its width grows with what it brought home last month: `thin` with
// nothing, then by the square root of the amount over `per`, to `thick` at most. A moving line's dashes are `dash` long with `gap` between and travel
// `speed` art px a second towards the store they feed; a stuck one (dry, or no source) is amber with long dashes (`stuckDash`, `stuckGap`) that stand still.
export const LINES = { thin: 2, thick: 5.5, per: 20, dash: 5, gap: 4, speed: 10, stuckDash: 9, stuckGap: 5 };
