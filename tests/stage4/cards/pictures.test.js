import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene } from '../../../src/dev/scenes.js';
import { TUTORIAL_SHOT } from '../../../src/dev/tutorialScenes.js';
import { TUTORIAL_CARDS, TUTORIAL } from '../../../src/data/tutorial.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { tileToScreen, screenToTile } from '../../../src/render/camera.js';
import { CARDS4_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };

// The page as tools/tutorial.ps1 opens it for a picture, or the title card: the real game loop runs (the city is paused).
async function bootShot(params) {
  const { width, height } = TUTORIAL_SHOT;
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params.replace(/^\/\?/, '')),
    now: () => performance.now(), clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('s4 cards pictures', () => {
  it('has each card\'s picture, 600 px square and at most 60 KB, with its mark inside it, all kept for offline play', async () => {
    const json = await (await fetch(`/assets/tutorial/${TUTORIAL.marks}`)).json();
    const self = {};
    new Function('self', await (await fetch('/sw-files.js')).text())(self);
    expect(self.THEBES_FILES).toContain(`${TUTORIAL.dir}${TUTORIAL.marks}`);
    expect(json.size).toBe(TUTORIAL.size);
    for (const card of TUTORIAL_CARDS) {
      const r = await fetch(`/assets/tutorial/${card.id}.webp`);
      const blob = await r.blob();
      const image = await createImageBitmap(blob);
      const mark = json.cards[card.id] && json.cards[card.id].mark;
      expect([card.id, r.status, blob.size <= TUTORIAL.maxBytes, image.width, image.height, self.THEBES_FILES.includes(`${TUTORIAL.dir}${card.id}.webp`), mark && mark.kind])
        .toEqual([card.id, 200, true, TUTORIAL.size, TUTORIAL.size, true, card.mark]);
      const inside = (x, y) => x >= 0 && y >= 0 && x <= TUTORIAL.size && y <= TUTORIAL.size;
      if (mark.kind === 'ring') expect([card.id, inside(mark.x - mark.w / 2, mark.y - mark.h / 2), inside(mark.x + mark.w / 2, mark.y + mark.h / 2)]).toEqual([card.id, true, true]);
      else {
        const a = (mark.angle * Math.PI) / 180;
        expect([card.id, inside(mark.x, mark.y), inside(mark.x - Math.cos(a) * TUTORIAL.arrowLength, mark.y - Math.sin(a) * TUTORIAL.arrowLength)]).toEqual([card.id, true, true]);
      }
    }
  });

  it('sets each picture up with its mark on its thing, and nothing in the picture with a problem', async () => {
    for (const card of TUTORIAL_CARDS) {
      const s = await bootShot(TUTORIAL_SHOT.params);
      try {
        const shot = await devScene(s.api, 'tutorial', { picture: card.id });
        const g = s.api.game(), { world, cam } = g;
        const view = { width: TUTORIAL_SHOT.width, height: TUTORIAL_SHOT.height };
        const frame = s.root.querySelector('#map').getBoundingClientRect();
        const { clip, mark } = shot;
        expect([shot.id, clip.size, clip.x >= 0, clip.y >= 0, clip.x + clip.size <= view.width, clip.y + clip.size <= view.height]).toEqual([card.id, TUTORIAL_SHOT.clip, true, true, true, true]);
        const k = clip.size / TUTORIAL.size;
        const toScreen = (px, py) => [clip.x + px * k, clip.y + py * k];
        const [mx, my] = toScreen(mark.x, mark.y);
        const centreOf = (b) => tileToScreen(cam, view, b.x + b.w / 2, b.y + b.d / 2);
        const inClip = ([x, y]) => x >= clip.x && x <= clip.x + clip.size && y >= clip.y && y <= clip.y + clip.size;
        const inRing = ([x, y]) => Math.abs(x - mx) <= (mark.w * k) / 2 && Math.abs(y - my) <= (mark.h * k) / 2;
        const box = (node) => { const r = node.getBoundingClientRect(); return { left: r.left - frame.left, right: r.right - frame.left, top: r.top - frame.top, bottom: r.bottom - frame.top }; };
        const inBox = (b, x, y, slack = 0) => x >= b.left - slack && x <= b.right + slack && y >= b.top - slack && y <= b.bottom + slack;
        const all = Object.values(world.buildings), one = (type) => all.find((b) => b.type === type);
        const at = card.id;
        if (at === 'road') {
          const t = screenToTile(cam, view, mx, my);
          expect([at, world.road[idx(world.size, Math.floor(t.x), Math.floor(t.y))]]).toEqual([at, 1]);
          for (const type of ['house', 'well', 'farm_grain']) expect([at, type, inClip(centreOf(one(type)))]).toEqual([at, type, true]);
        } else if (at === 'homes') {
          const well = one('well');
          expect([at, inRing(centreOf(well)), mark.w * k < 2 * 64 * cam.zoom]).toEqual([at, true, true]);    // round the well, and it alone
          expect([at, all.filter((b) => b.type === 'house' && b.residents > 0 && inClip(centreOf(b))).length >= 3]).toEqual([at, true]);
        } else if (at === 'farm') {
          const farm = one('farm_grain'), layers = box(s.root.querySelector('#corners .overlay-button'));
          const a = (mark.angle * Math.PI) / 180, tail = [mx - Math.cos(a) * TUTORIAL.arrowLength * k, my - Math.sin(a) * TUTORIAL.arrowLength * k];
          const dist = ([x, y]) => Math.hypot(x - (layers.left + layers.right) / 2, y - (layers.top + layers.bottom) / 2);
          expect([at, g.ui.store.get().overlay, inBox(layers, mx, my, 12), dist(tail) > dist([mx, my]), inClip(centreOf(farm))]).toEqual([at, 'ground', true, true, true]);
          let fertile = 0;
          for (let y = farm.y; y < farm.y + farm.d; y++) for (let x = farm.x; x < farm.x + farm.w; x++) if (world.terrain[idx(world.size, x, y)] === TERRAIN.FERTILE) fertile++;
          expect([at, fertile]).toEqual([at, farm.w * farm.d]);
        } else if (at === 'food') {
          const row = [...s.root.querySelectorAll('#sheet .row')].find((n) => inBox(box(n), mx, my));
          const sheetTop = box(s.root.querySelector('#sheet')).top;
          expect([at, Boolean(row) && /worker/i.test(row.textContent), world.buildings[g.ui.store.get().selectedId].type]).toEqual([at, true, 'bazaar']);
          for (const type of ['granary', 'bazaar']) { const [x, y] = centreOf(one(type)); expect([at, type, inClip([x, y]), y < sheetTop]).toEqual([at, type, true, true]); }
          // The ring is a rounded box, not a pill, and its line and halo (half the halo's 16 px, 8 picture px, either side of its path) clear the row's
          // label and value text: every corner of each text's rect lies inside the ring's path drawn in by the halo.
          const pad = Number.isFinite(mark.pad) ? mark.pad : TUTORIAL.ringPad, halo = 8 * k;
          const pill = Math.min(mark.w, mark.h) / 2 + pad, radius = Number.isFinite(mark.radius) ? Math.min(mark.radius, pill) : pill;   // as markSvg draws it
          const hw = (mark.w / 2 + pad) * k - halo, hh = (mark.h / 2 + pad) * k - halo, rad = Math.max(0, radius * k - halo);
          expect([at, Number.isFinite(mark.radius), radius < pill]).toEqual([at, true, true]);
          const clears = (rect) => [[rect.left, rect.top], [rect.right, rect.top], [rect.left, rect.bottom], [rect.right, rect.bottom]].every(([x, y]) => {
            const qx = Math.abs(x - mx) - (hw - rad), qy = Math.abs(y - my) - (hh - rad);
            return Math.abs(x - mx) <= hw && Math.abs(y - my) <= hh && (qx <= 0 || qy <= 0 || Math.hypot(qx, qy) <= rad);
          });
          const texts = [...row.children].map((c) => { const r = document.createRange(); r.selectNodeContents(c); const b = r.getBoundingClientRect(), f = s.root.querySelector('#map').getBoundingClientRect(); return { left: b.left - f.left, right: b.right - f.left, top: b.top - f.top, bottom: b.bottom - f.top }; });
          expect([at, texts.length, texts.map((t) => t.right > t.left), texts.map(clears)]).toEqual([at, 2, [true, true], [true, true]]);
        } else if (at === 'goals') {
          const show = [...s.root.querySelectorAll('#goals button')].find((b) => inBox(box(b), mx, my));
          expect([at, Boolean(show) && /show me/i.test(show.textContent)]).toEqual([at, true]);
        } else if (at === 'ahead') {
          const pyramid = one('pyramid_small');
          expect([at, inRing(centreOf(pyramid)), pyramid.site.course > 0]).toEqual([at, true, true]);
          for (const type of ['tower', 'firehouse']) { const [x, y] = centreOf(one(type)); expect([at, type, inClip([x, y]), y < my]).toEqual([at, type, true, true]); }   // beyond it
        }
        const troubled = alertsFor(world).filter((a) => a.id !== undefined && world.buildings[a.id] && inClip(centreOf(world.buildings[a.id])));
        expect([at, troubled.map((a) => `${a.code} ${world.buildings[a.id].type}`)]).toEqual([at, []]);
      } finally { s.cleanup(); }
    }
  });

  it('shows the cards on the title card as a player first meets them, at any card', async () => {
    const s = await bootShot('/?nosw=1');
    try {
      expect(await devScene(s.api, 'tutorial', { card: 2 })).toBe('tutorial card 3');
      const d = document.querySelector('.picture-cards');
      expect([d.querySelector('.pc-count').textContent, d.querySelector('#pc-title').textContent]).toEqual(['3 of 7', CARDS4_TEXT.cards.farm.title]);
    } finally { s.cleanup(); }
    expect(document.querySelector('.picture-cards')).toBe(null);
  });
});
