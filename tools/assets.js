// Icons and the link preview (spec 7.1), drawn by the art code so they match the game. tools/assets.html
// runs this in a browser and POSTs the PNGs to tests/serve.py; the results are committed.
import { ART } from '../src/render/art/registry.js';
import { makeDraw } from '../src/render/art/ctx.js';
import { createRenderer } from '../src/render/renderer.js';
import { createCamera } from '../src/render/camera.js';
import { createWorld } from '../src/sim/world.js';
import { buildSampleCity } from '../src/dev/sampleCity.js';
import { TITLE_SEED } from '../src/data/ui.js';
import { T } from '../src/ui/text.js';

const PARCHMENT = '#F3E7CB', PARCHMENT_3 = '#DCC9A0', INK = '#2B1F0E', INK_SOFT = '#5A4832';

// Framing knobs. The icon temple is scaled by its measured ink, not its declared bounds, which leave headroom.
const ICON_FILL = 0.72, ICON_FILL_MASKABLE = 0.56;   // the temple's longer side as a share of the icon side
const ICON_DROP = 0.04;                              // the ink centre sits this share of the side below the middle, so the base meets the ground band
const OG_CAM = { dx: 0, y: 18, zoom: 1.2 };         // link preview camera: x = world.tradeEntry.x + dx, y = world.size - y

const icon = (name, size, extra = {}) => ({ name, kind: 'icon', size, width: size, height: size, maskable: false, rounded: true, ...extra });
export const ASSETS = [
  icon('icons/icon-192.png', 192),
  icon('icons/icon-512.png', 512),
  icon('icons/icon-512-maskable.png', 512, { maskable: true, rounded: false }),
  icon('icons/apple-touch-icon.png', 180, { rounded: false }),
  icon('icons/favicon-32.png', 32),
  { name: 'og-image.png', kind: 'og', width: 1200, height: 630 },
];

export function defaultCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// The bounding box of what ART.temple actually paints, in art px relative to its origin: [left, top, right, bottom].
// Found once by drawing it at 4 px per art px onto a scratch canvas and taking the pixels with any alpha.
let inkBox = null;
export function templeInk(createCanvas = defaultCanvas) {
  if (inkBox) return inkBox;
  const K = 4, PAD = 8;
  const [l, t, r, b] = ART.temple.bounds;
  const w = Math.ceil((r - l + 2 * PAD) * K), h = Math.ceil((b - t + 2 * PAD) * K);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.translate((PAD - l) * K, (PAD - t) * K);
  ART.temple.draw(makeDraw(ctx, K), 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  inkBox = [x0 / K - PAD + l, y0 / K - PAD + t, (x1 + 1) / K - PAD + l, (y1 + 1) / K - PAD + t];
  return inkBox;
}

// The temple, centred, on a parchment ground. Maskable icons keep the art inside the 80% safe zone.
export function renderIcon({ size, maskable = false, rounded = !maskable, createCanvas = defaultCanvas }) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (rounded) { roundedRect(ctx, 0, 0, size, size, size * 0.2); ctx.clip(); }
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = PARCHMENT_3;
  ctx.fillRect(0, size * 0.62, size, size * 0.38);
  const def = ART.temple;
  const [l, t, r, b] = templeInk(createCanvas);
  const scale = (size * (maskable ? ICON_FILL_MASKABLE : ICON_FILL)) / Math.max(r - l, b - t);
  ctx.save();
  ctx.translate(size / 2 - (l + (r - l) / 2) * scale, size / 2 + size * ICON_DROP - (t + (b - t) / 2) * scale);
  def.draw(makeDraw(ctx, scale), 0, 0);
  ctx.restore();
  return canvas;
}

// The link preview: the sample city with every chunk baked, and the name on a parchment panel.
export function renderOgImage({ createCanvas = defaultCanvas } = {}) {
  const canvas = createCanvas(1200, 630);
  const world = buildSampleCity(createWorld({ seed: TITLE_SEED }));
  const cam = createCamera({ x: world.tradeEntry.x + OG_CAM.dx, y: world.size - OG_CAM.y, zoom: OG_CAM.zoom });
  const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: 64 });
  const view = { width: 1200, height: 630 };
  for (let i = 0; i < 3; i++) renderer.renderFrame(world, cam, { view });   // bakes settle on the first frame; two more for safety
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PARCHMENT;
  roundedRect(ctx, 48, 630 - 48 - 176, 520, 176, 24);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 88px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Thebes', 80, 630 - 48 - 72);
  ctx.fillStyle = INK_SOFT;
  ctx.font = '34px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(T.tagline, 82, 630 - 48 - 24);
  return canvas;
}

export function renderAsset(asset, createCanvas = defaultCanvas) {
  if (asset.kind === 'og') return renderOgImage({ createCanvas });
  return renderIcon({ size: asset.size, maskable: asset.maskable, rounded: asset.rounded, createCanvas });
}
