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

// Version 9.1 (Track P, rulings 1686, 1689): the sprites are held by bytes. A zoom bucket (at one ratio) left for SPRITE_IDLE_MS is dropped whole,
// so a long session does not keep every slot at every bucket; the bucket in view is never dropped (it is the one being drawn), and coming back to
// a dropped one draws its sprites again as the first visit did (checked when the bucket changes and every SWEEP_EVERY gets). Inside the buckets
// held, past SPRITE_BUDGET_BYTES the sprites least recently drawn go first, never one drawn in this frame (the renderer calls frame() as each
// begins; with no frames, nothing is evicted): at DPR 2 and zoom 2 a slot draws at 8 device px per art px, and a Large city's every slot there
// was about 100 MB, where one view needs about 13.
export const SPRITE_IDLE_MS = 30000;
// Version 9.3 Track P (rulings 1935-1937, spec section 7): the four looks, a home's three variants and a service's three states multiply the
// slots, so the budgets are set by device from the measured scenes (tests/v93/p): a desktop and a phone, by the memory the browser reports
// (navigator.deviceMemory, Chromium's 0.25 to 8 GB) where it does, else by the screen's short side. The sprites' budget is SPRITE_BUDGET_BYTES;
// the terrain and sprites together keep CACHES_BUDGET_BYTES (terrainBaker.js), which rises with it so the terrain is not starved.
const MB = 1024 * 1024;
export const DEVICE_BUDGETS = {
  desktop: { sprites: 32 * MB, caches: 80 * MB },
  phone: { sprites: 24 * MB, caches: 72 * MB },
};
export function deviceKind({ deviceMemory, screenWidth, screenHeight, maxTouchPoints } = {}) {
  if (typeof deviceMemory === 'number' && deviceMemory > 0) return deviceMemory >= 8 ? 'desktop' : 'phone';
  if (maxTouchPoints > 0) return 'phone';   // 9.3 speed fix (ruling 1944): Safari reports no deviceMemory, and an iPad's tab reloads under desktop budgets; touch with no memory figure is a phone's
  const side = Math.min(screenWidth || Infinity, screenHeight || Infinity);
  return side < 768 ? 'phone' : 'desktop';
}
const thisDevice = () => {
  const nav = typeof navigator !== 'undefined' ? navigator : {}, scr = typeof screen !== 'undefined' ? screen : {};
  return deviceKind({ deviceMemory: nav.deviceMemory, maxTouchPoints: nav.maxTouchPoints, screenWidth: scr.width, screenHeight: scr.height });
};
export const DEVICE_KIND = thisDevice();
export const SPRITE_BUDGET_BYTES = DEVICE_BUDGETS[DEVICE_KIND].sprites;   // 9.1: 16 MB on every device
const SWEEP_EVERY = 4096;
export const canvasBytes = (canvas) => canvas.width * canvas.height * 4;

export function createSpriteCache({ registry = ART, counter = null, createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage, now = () => performance.now(), idleMs = SPRITE_IDLE_MS, maxBytes = SPRITE_BUDGET_BYTES } = {}) {
  const sprites = new Map(); // key -> sprite
  const images = new Map();  // slot -> { img, promise }
  const buckets = new Map(); // `${bucket}x${dpr}` -> { keys: Set of sprite keys, bytes, left: when it stopped being the bucket in use }
  const drawnIn = new Map(); // key -> the frame it was last got in
  let current = null, gets = 0, bytes = 0, drops = 0, frameNo = 0, spentIn = -1;   // spentIn: the frame a trim found nothing left to evict

  const count = (k) => { if (counter) counter[k] = (counter[k] || 0) + 1; };

  // Past the budget, the sprites not got in this frame, least recently got first, until the bytes are back under it. Once a trim ends over the
  // budget, every sprite left was got in this frame and none can become evictable before the next, so the frame's later misses skip the scan.
  function trim() {
    if (bytes <= maxBytes || spentIn === frameNo) return;
    const old = [...drawnIn].filter(([, f]) => f < frameNo).sort((a, b) => a[1] - b[1]);
    for (const [key] of old) {
      if (bytes <= maxBytes) break;
      const s = sprites.get(key), b = buckets.get(key.slice(key.lastIndexOf('@') + 1));
      const n = canvasBytes(s.canvas);
      sprites.delete(key); drawnIn.delete(key);
      if (b) { b.keys.delete(key); b.bytes -= n; }
      bytes -= n;
      count('evicted');
    }
    if (bytes > maxBytes) spentIn = frameNo;
  }

  function sweep(t) {
    for (const [bk, b] of buckets) {
      if (bk === current || t - b.left < idleMs) continue;
      for (const k of b.keys) { sprites.delete(k); drawnIn.delete(k); }
      bytes -= b.bytes;
      buckets.delete(bk);
      drops++;
    }
  }

  // The bucket this get draws in: leaving another one stamps when it was left, and looks for buckets idle long enough to drop.
  function use(bk) {
    if (bk !== current) {
      const t = now();
      const was = buckets.get(current);
      if (was) was.left = t;
      current = bk;
      if (!buckets.has(bk)) buckets.set(bk, { keys: new Set(), bytes: 0, left: t });
      sweep(t);
    } else if (++gets % SWEEP_EVERY === 0) sweep(now());
    return buckets.get(bk);
  }

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
      const held = use(`${bucket}x${dpr}`);
      const key = spriteKey(slot, bucket, dpr);
      const hit = sprites.get(key);
      if (hit) { count('hits'); drawnIn.set(key, frameNo); return hit; }
      if (def.png && !imageReady(imageFor(slot, def).img)) { count('pending'); return null; }
      count('misses');
      const sprite = render(slot, def, bucket, dpr);
      sprites.set(key, sprite);
      drawnIn.set(key, frameNo);
      const b = canvasBytes(sprite.canvas);
      held.keys.add(key); held.bytes += b; bytes += b;
      if (frameNo) trim();
      return sprite;
    },
    ready(slot) {
      const def = registry[slot];
      if (!def || !def.png) return Promise.resolve();
      return imageFor(slot, def).promise;
    },
    size() { return sprites.size; },
    clear() { sprites.clear(); buckets.clear(); drawnIn.clear(); current = null; bytes = 0; drops++; },
    // Version 9.1 (Track P): a frame begins (what it gets is never evicted for the budget); the canvas bytes held, the buckets held, and how
    // many times a bucket has been dropped (the renderer's walk warm-up starts again after one; a single sprite evicted is drawn again when next
    // needed).
    frame() { frameNo++; },
    bytes() { return bytes; },
    buckets() { return [...buckets.keys()]; },
    get drops() { return drops; },
  };
}

// Draw a sprite so its art origin lands on device px (px, py), scaled from its bucket to the real zoom.
export function drawSprite(ctx, sprite, px, py, zoom, dpr = 1) {
  const k = (ART_SCALE * zoom * dpr) / sprite.scale;
  ctx.drawImage(sprite.canvas, px - sprite.ax * k, py - sprite.ay * k, sprite.canvas.width * k, sprite.canvas.height * k);
}
