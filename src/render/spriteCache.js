// Art slots rendered once per zoom bucket and devicePixelRatio onto offscreen canvases. A slot's registry
// entry either draws itself (`draw`) or points at a PNG (`png`); the cache treats both the same way.
import { ART, slotFor, FAR_ZOOM } from './art/registry.js';
import { makeDraw } from './art/ctx.js';
import { ART_SCALE } from './iso.js';
import { visibleTileRange, CHUNK } from './camera.js';
import { ringBuildings } from './chunkIndex.js';
import { hillsIn } from './hills.js';

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
// Version 10.0 (Track P, rulings 2284-2285): the warm band. On a frame that baked no terrain and spent under WARM_AFTER_MS, the renderer asks the
// cache to render, at most WARM_BAND_MS a frame, the slots of the buildings in the chunk ring one chunk outside the view (chunkIndex.js
// ringBuildings), nearest the view first, so a pan draws them from the cache instead of rendering them fresh mid-pan (the 9.3 follow-ups' cause of
// the desktop frame's rise). It never warms past the sprite budget (a warmed sprite would only push out one the view drew), and once a band is
// whole it is not walked again until the view, the bucket or the ratio moves it, or WARM_RECHECK frames pass (a look changed).
export const WARM_BAND_MS = 2, WARM_AFTER_MS = 8, WARM_RECHECK = 120;
const FAR_OPTS = { far: true }, NEAR_OPTS = { far: false };

export function createSpriteCache({ registry = ART, counter = null, createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage, now = () => performance.now(), idleMs = SPRITE_IDLE_MS, maxBytes = SPRITE_BUDGET_BYTES } = {}) {
  const sprites = new Map(); // key -> sprite
  const images = new Map();  // slot -> { img, promise }
  const buckets = new Map(); // `${bucket}x${dpr}` -> { keys: Set of sprite keys, bytes, left: when it stopped being the bucket in use }
  const drawnIn = new Map(); // key -> the frame it was last got in
  let current = null, gets = 0, bytes = 0, drops = 0, frameNo = 0, spentIn = -1;   // spentIn: the frame a trim found nothing left to evict
  const band = { key: '', done: false, at: 0 };   // Version 10.0 (Track P): the warm band walked last, whether it is whole, and the frame it was walked in

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
    // Version 10.0 (Track P): warm the band round the view (see WARM_BAND_MS); the number of sprites rendered. A warmed sprite counts as `warmed`,
    // never as a miss, and is stamped as got in the frame before this one, so it is the first to go if the budget is ever tight.
    warmBand(world, cam, view, budgetMs = WARM_BAND_MS, dpr = 1) {
      const bucket = bucketFor(cam.zoom), bk = `${bucket}x${dpr}`;
      const range = visibleTileRange(cam, view, world.size);
      const key = `${range.x0},${range.y0},${range.x1},${range.y1}|${bk}|${cam.zoom <= FAR_ZOOM}`;
      if (key === band.key && band.done && frameNo - band.at < WARM_RECHECK) return 0;
      if (key !== band.key) band.key = key;
      band.done = false; band.at = frameNo;
      if (bytes >= maxBytes) return 0;
      const t0 = now(), opts = cam.zoom <= FAR_ZOOM ? FAR_OPTS : NEAR_OPTS;
      let warmed = 0;
      // The ring's buildings, nearest first, then its hill tiles (each hill tile is a slot of its own, src/render/hills.js, so a pan meets new ones).
      const outer = { x0: (Math.floor(range.x0 / CHUNK) - 1) * CHUNK, y0: (Math.floor(range.y0 / CHUNK) - 1) * CHUNK, x1: (Math.floor(range.x1 / CHUNK) + 2) * CHUNK - 1, y1: (Math.floor(range.y1 / CHUNK) + 2) * CHUNK - 1 };
      const slots = function* () {
        for (const b of ringBuildings(world, range)) yield slotFor(b, world, opts);
        for (const h of hillsIn(world, outer, registry)) yield h.slot;
      };
      for (const slot of slots()) {
        const def = registry[slot];
        if (!def || def.live || def.png || !def.draw) continue;   // a monument draws live; a picture waits for its image in get()
        const k = spriteKey(slot, bucket, dpr);
        if (sprites.has(k)) continue;
        const held = use(bk);
        const sprite = render(slot, def, bucket, dpr);
        const n = canvasBytes(sprite.canvas);
        sprites.set(k, sprite); drawnIn.set(k, frameNo - 1);
        held.keys.add(k); held.bytes += n; bytes += n;
        count('warmed'); warmed++;
        if (bytes >= maxBytes || now() - t0 >= budgetMs) return warmed;
      }
      band.done = true;
      return warmed;
    },
    size() { return sprites.size; },
    clear() { sprites.clear(); buckets.clear(); drawnIn.clear(); current = null; bytes = 0; drops++; band.key = ''; },
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
