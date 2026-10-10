// Art slots rendered once per zoom bucket and devicePixelRatio onto offscreen canvases. A slot's registry
// entry either draws itself (`draw`) or points at a PNG (`png`); the cache treats both the same way.
import { ART } from './art/registry.js';
import { makeDraw } from './art/ctx.js';
import { ART_SCALE } from './iso.js';

export const ZOOM_BUCKETS = [0.5, 0.75, 1, 1.5, 2];

export function bucketFor(zoom) {
  for (const b of ZOOM_BUCKETS) if (zoom <= b + 1e-9) return b;
  return ZOOM_BUCKETS[ZOOM_BUCKETS.length - 1];
}

export const spriteKey = (slot, bucket, dpr) => `${slot}@${bucket}x${dpr}`;

export function defaultCreateCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function defaultLoadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const imageReady = (img) => Boolean(img.complete && img.naturalWidth > 0);

export function createSpriteCache({ registry = ART, counter = null, createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage } = {}) {
  const sprites = new Map(); // key -> sprite
  const images = new Map();  // slot -> { img, promise }

  const count = (k) => { if (counter) counter[k] = (counter[k] || 0) + 1; };

  function imageFor(slot, def) {
    let entry = images.get(slot);
    if (!entry) {
      const img = loadImage(def.png.src);
      const promise = new Promise((resolve) => {
        if (imageReady(img)) { resolve(); return; }
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
      entry = { img, promise };
      images.set(slot, entry);
    }
    return entry;
  }

  function render(slot, def, bucket, dpr) {
    const scale = ART_SCALE * bucket * dpr;
    const [l, t, r, b] = def.bounds;
    const canvas = createCanvas(Math.max(1, Math.ceil((r - l) * scale)), Math.max(1, Math.ceil((b - t) * scale)));
    const ctx = canvas.getContext('2d');
    const ax = -l * scale, ay = -t * scale;
    if (def.png) {
      const { img } = imageFor(slot, def);
      const k = scale / def.png.scale;
      ctx.drawImage(img, ax - def.png.ax * k, ay - def.png.ay * k, img.width * k, img.height * k);
    } else if (def.draw) {
      ctx.save();
      ctx.translate(ax, ay);
      def.draw(makeDraw(ctx, scale), 0, 0);
      ctx.restore();
    }
    return { slot, canvas, ax, ay, scale, bucket, dpr };
  }

  return {
    get(slot, zoom, dpr = 1) {
      const def = registry[slot];
      if (!def) return null;
      const bucket = bucketFor(zoom);
      const key = spriteKey(slot, bucket, dpr);
      const hit = sprites.get(key);
      if (hit) { count('hits'); return hit; }
      if (def.png && !imageReady(imageFor(slot, def).img)) { count('pending'); return null; }
      count('misses');
      const sprite = render(slot, def, bucket, dpr);
      sprites.set(key, sprite);
      return sprite;
    },
    ready(slot) {
      const def = registry[slot];
      if (!def || !def.png) return Promise.resolve();
      return imageFor(slot, def).promise;
    },
    size() { return sprites.size; },
    clear() { sprites.clear(); },
  };
}

// Draw a sprite so its art origin lands on device px (px, py), scaled from its bucket to the real zoom.
export function drawSprite(ctx, sprite, px, py, zoom, dpr = 1) {
  const k = (ART_SCALE * zoom * dpr) / sprite.scale;
  ctx.drawImage(sprite.canvas, px - sprite.ax * k, py - sprite.ay * k, sprite.canvas.width * k, sprite.canvas.height * k);
}
