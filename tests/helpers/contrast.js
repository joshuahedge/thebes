// Contrast as shown: the text colour with its alpha and every opacity up to `stop`, over `stop`'s background.
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
function backdrop(node) {
  for (let n = node; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) return c; }
  return [255, 255, 255, 1];
}
const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export function contrastIn(node, stop) {
  const fg = rgba(getComputedStyle(node).color);
  let alpha = fg[3];
  for (let n = node; n; n = n.parentElement) { alpha *= Number(getComputedStyle(n).opacity); if (n === stop) break; }
  const bg = backdrop(stop);
  const shown = [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
  const [hi, lo] = [lum(shown), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
