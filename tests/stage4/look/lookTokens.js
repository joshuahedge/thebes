// Track H's helpers for the look's tests (spec 6.9): the look's tokens as JavaScript, mirroring css/ui.css as
// src/ui/theme.js mirrors the Stage 1-3 tokens (lookBase.test.js keeps the two equal), and the colour sums the
// contrast checks need. Not a test file: tests/stage4/look.all.js imports only the *.test.js files.
import { TOKENS, cssName } from '../../../src/ui/theme.js';

export const LOOK_TOKENS = { lapis: '#1C3768', lapisInk: '#F5D98A', terracotta: '#B4502E', turquoise: '#3A9E96', inkLine: '#8C7550' };
export const SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
export const ALL_TOKENS = { ...TOKENS, ...LOOK_TOKENS };
export { cssName };

const hexOf = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
export const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// A computed colour ("rgb(28, 55, 104)" or "rgba(...)") as [r, g, b, a].
export const parseColour = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
export const cssRgb = (hex) => `rgb(${rgbOf(hex).join(', ')})`;
// `top` laid over `bottom` at `alpha`, as a hex colour.
export const blend = (bottom, top, alpha) => { const b = rgbOf(bottom), t = rgbOf(top); return hexOf(b.map((v, i) => t[i] * alpha + v * (1 - alpha))); };

// The fibre tile's layers, read from the --look-fibre value itself: each <g> with its stroke colour and group opacity. A
// group's strokes are composited first and then faded by the group's opacity, so no point of the tile lies further from
// the parchment than the parchment blended with that stroke at that opacity, however the strokes cross.
export function fibreLayers(value) {
  const at = value.indexOf('data:image/svg+xml,');
  const svg = decodeURIComponent(value.slice(at + 'data:image/svg+xml,'.length).replace(/["')\s]+$/, ''));
  return [...svg.matchAll(/<g\b([^>]*)>/g)].map((m) => {
    const stroke = (m[1].match(/(?:^|\s)stroke='(#[0-9A-Fa-f]{6})'/) || [])[1] || null;
    const opacity = Number((m[1].match(/(?:^|\s)opacity='([\d.]+)'/) || [])[1] || 1);
    return { stroke: stroke && stroke.toUpperCase(), opacity };
  });
}
