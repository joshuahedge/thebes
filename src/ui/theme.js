// The colour tokens as JavaScript, mirroring css/ui.css, so tests can check contrast and the two never drift.
export const TOKENS = {
  parchment: '#F3E7CB', parchment2: '#EADBB9', parchment3: '#DCC9A0',
  ink: '#2B1F0E', inkSoft: '#5A4832',
  teal: '#1F6F66', tealInk: '#FFFFFF', tealSoft: '#CFE6E2',
  coral: '#E2604C', coralText: '#A33624', coralSoft: '#F6D5CE',
  amber: '#E0A030', amberText: '#7A5200', amberSoft: '#F6E7C2',
  blue: '#2F6FA8', gold: '#E2B13C',
};

// Every foreground-on-background pair used for text; each must reach 4.5:1 (spec 6.1).
export const TEXT_PAIRS = [
  ['ink', 'parchment'], ['inkSoft', 'parchment'], ['ink', 'parchment2'], ['ink', 'parchment3'],
  ['coralText', 'parchment'], ['amberText', 'parchment'], ['teal', 'parchment'], ['tealInk', 'teal'],
  ['ink', 'coralSoft'], ['ink', 'amberSoft'], ['ink', 'tealSoft'], ['inkSoft', 'tealSoft'], ['parchment', 'ink'], ['gold', 'ink'],
];

export const cssName = (name) => '--' + name.replace(/[A-Z0-9]/g, (c) => '-' + c.toLowerCase());

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
