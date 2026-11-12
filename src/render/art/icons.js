// Version 10.0 (Track Q, ruling 2141, Task Q.2): the seven category icons, drawn once with the game's own shapes and kept as data URLs, so the dock, the wide panel's tabs
// and the rail show the same picture on every device and no font is involved (the text glyphs they replace were drawn by each system's own font).
//   roads      a road tile: the diamond of terrainRoads' tile with its centre line
//   homes      a home: housing.js's smallest silhouette, a flat-roofed mud-brick block with its door
//   food       a grain ear: the stalk and three pairs of grains
//   industry   a pick: its haft and curved head
//   services   an ankh (the title's own, --look-ankh)
//   defence    a shield
//   monuments  a pyramid, its shaded side marked
// Each draw is (g, x, y, size): g a 2D canvas context whose strokeStyle the caller has set, (x, y) the box's top left, size its side in pixels. The art is laid out on a 20 unit
// square, ink line drawings that need no fill, so one stroke colour (ink, or teal for the chosen category) is the whole of the colour.

const U = 20;                                                   // the art's grid
const line = (g, pts, close = false) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); if (close) g.closePath(); g.stroke(); };

export const CATEGORY_ICON_DRAWS = {
  roads(g) {
    line(g, [[10, 3], [18, 10], [10, 17], [2, 10]], true);       // the tile's diamond
    g.setLineDash([1.6, 2.2]);
    line(g, [[6, 6.5], [14, 13.5]]);                              // the road's centre line, dashed
    g.setLineDash([]);
  },
  homes(g) {
    line(g, [[10, 2.5], [17, 5.5], [17, 14], [10, 17.5], [3, 14], [3, 5.5]], true);   // a cube seen from a corner: its outline
    line(g, [[3, 5.5], [10, 8.5], [17, 5.5]]);                     // the flat roof's front edges
    line(g, [[10, 8.5], [10, 17.5]]);                              // the corner between the faces
    line(g, [[5.6, 15.2], [5.6, 11.4], [7.8, 10.3], [7.8, 16.3]]); // the door in the lit face
  },
  food(g) {
    line(g, [[10, 18], [10, 4]]);                                  // the stalk
    for (const y of [6.5, 10, 13.5]) {                             // a pair of grains at each step, tilted outward
      line(g, [[10, y + 1.6], [6.2, y - 1.2]]);
      line(g, [[10, y + 1.6], [13.8, y - 1.2]]);
    }
    line(g, [[10, 4], [10, 1.6]]);                                 // the awn
  },
  industry(g) {
    line(g, [[4.5, 17], [14.5, 5.5]]);                             // the haft
    g.beginPath(); g.moveTo(5.5, 5.5); g.quadraticCurveTo(12.5, 1.2, 18, 8.2); g.stroke();   // the head's curve
    line(g, [[5.5, 5.5], [8, 6.2]]);
    line(g, [[18, 8.2], [16.4, 9.8]]);
  },
  services(g) {
    g.beginPath(); g.ellipse(10, 5.4, 3.2, 4, 0, 0, Math.PI * 2); g.stroke();   // the ankh's loop
    line(g, [[3, 11.6], [17, 11.6]]);                              // its arms
    line(g, [[10, 9.4], [10, 19]]);                                // its stem
  },
  defence(g) {
    g.beginPath(); g.moveTo(3.5, 3.5); g.lineTo(16.5, 3.5); g.lineTo(16.5, 10); g.quadraticCurveTo(16.5, 16, 10, 18.5); g.quadraticCurveTo(3.5, 16, 3.5, 10); g.closePath(); g.stroke();
    line(g, [[10, 3.5], [10, 18]]);                                // the shield's rib
    line(g, [[3.8, 9], [16.2, 9]]);
  },
  monuments(g) {
    line(g, [[10, 2.5], [18.5, 16.5], [1.5, 16.5]], true);         // the pyramid
    line(g, [[10, 2.5], [11.6, 16.5]]);                            // the edge between its lit and shaded faces
    line(g, [[14.4, 9.6], [6.4, 9.6]]);                            // a course
  },
};

export const CATEGORY_ICON_IDS = Object.keys(CATEGORY_ICON_DRAWS);

const urls = new Map();

// A data URL (PNG) of one category's icon at `size` CSS px in `color`, drawn at the device's pixel ratio (1 to 3) and cached by id, size, color and ratio, so two calls give the same string.
// '' when there is no document to draw on (a test page without one) or the id is not a category.
export function categoryIconUrl(id, size = 20, color = '#2B1F0E') {
  const draw = CATEGORY_ICON_DRAWS[id];
  if (!draw || typeof document === 'undefined') return '';
  const ratio = Math.max(1, Math.min(3, Math.ceil((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1)));
  const key = `${id}|${size}|${color}|${ratio}`;
  const have = urls.get(key);
  if (have) return have;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(size * ratio);
  const g = canvas.getContext('2d');
  g.scale((size * ratio) / U, (size * ratio) / U);
  g.strokeStyle = color;
  g.lineWidth = 1.7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g, 0, 0, size);
  const url = canvas.toDataURL('image/png');
  urls.set(key, url);
  return url;
}
