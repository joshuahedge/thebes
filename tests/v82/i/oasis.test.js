// Version 8.2 integration (rulings 1333-1336): the Great oasis's seams. A map with no river offers no Ferry and no ferry words (ruling 1333); a new city opens with its start
// area and the end of its start road in the free map on every layout and screen (ruling 1334); and every player-facing text a Great oasis city can show says the great lake,
// not the river or the Nile, except the few lines listed below on purpose (ruling 1335).
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { MAP_VARIANTS } from '../../../src/data/map.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import * as TEXT from '../../../src/ui/text.js';
import * as ADVICE_TEXT from '../../../src/ui/adviceText.js';
import * as AREA_TEXT from '../../../src/ui/areaText.js';
import * as NEXT_TEXT from '../../../src/ui/nextStepText.js';
import * as ROUTE_TEXT from '../../../src/ui/routeText.js';
import * as FERRY_TEXT from '../../../src/ui/v71/ferryText.js';
import * as MAPS_TEXT from '../../../src/ui/v71/mapsText.js';
import * as B_TEXT from '../../../src/ui/v81/bText.js';
import * as LESSON_TEXT from '../../../src/ui/v81/lessonText.js';
import * as TRAY_TEXT from '../../../src/ui/v81/trayText.js';
import { forMap } from '../../../src/ui/v82/oasisText.js';
import { MAP_WORDS_AS_WRITTEN } from '../../../src/ui/v82/mapWords.js';
import { shownItems } from '../../../src/ui/cards.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createWorld } from '../../../src/sim/world.js';
import { rigUI } from '../../helpers/uiWorld.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

// A fresh city of the layout and seed, as ?seed=&variant= starts one (the dev flags keep their own seed, ruling 1310).
export async function cityAt({ width = 390, height = 844, seed = 3, variant = 'great-oasis', settings = {} } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true, motion: 'still', motionRig: true, ...settings }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(`skipTitle=1&nosw=1&seed=${seed}&variant=${variant}`), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  await frame();
  return { api, g: () => api.game(), root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

// The free map, in the shell's own px: under the top bar, left of the wide panel, above the phone's dock.
function freeBox(root, width, height) {
  const at = root.getBoundingClientRect();
  const r = (sel) => { const n = root.querySelector(sel); if (!n || n.offsetParent === null) return null; const b = n.getBoundingClientRect(); return { top: b.top - at.top, left: b.left - at.left, bottom: b.bottom - at.top }; };
  const bar = r('#topbar'), panel = r('#panel'), dock = r('#dock');
  return { left: 0, top: bar ? bar.bottom : 0, right: panel && panel.left > width / 2 ? panel.left : width, bottom: dock && dock.top > height / 2 ? dock.top : height };
}

// ── The words (ruling 1335) ──
// Every text table the game shows, walked: each string, and each function called with a stand-in that answers any question (a number for a sum, itself for a
// property or a call), so the fixed words around the sim's numbers come out; a function that cannot run on the stand-in is skipped. A deep walk of every export of
// the text modules: the gossip (CITIZEN_REMARKS), the events, the court's cards and omens, How to play, the tips, the Advice, the explainers and the lesson's words.
const ANY = new Proxy(function any() {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 3 : k === Symbol.iterator ? function* none() {} : k === 'length' ? 1 : ANY),
  apply: () => ANY,
});
export function textsOf(mods) {
  const out = [], seen = new Set();
  const walk = (v, path, depth) => {
    if (depth > 12 || v === null || v === undefined) return;
    if (typeof v === 'string') { out.push({ path, text: v }); return; }
    if (typeof v === 'function') {
      if (seen.has(v)) return;
      seen.add(v);
      let r;
      try { r = v(ANY, ANY, ANY, ANY); } catch (e) { return; }
      if (typeof r === 'string') out.push({ path: `${path}()`, text: r });
      else if (r && typeof r === 'object' && r !== ANY) walk(r, `${path}()`, depth + 1);
      return;
    }
    if (typeof v !== 'object' || seen.has(v) || v === ANY) return;
    seen.add(v);
    if (typeof Node !== 'undefined' && v instanceof Node) return;
    for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`, depth + 1);
  };
  for (const [name, mod] of Object.entries(mods)) for (const k of Object.keys(mod)) walk(mod[k], `${name}.${k}`, 0);
  return out;
}

const OASIS_WORLD = { mapVariant: 'great-oasis' };
// Sentences that keep "river" or "Nile" on a Great oasis on purpose (ruling 1335).
export const KEPT = [
  /^(?!.*river).*\bNile\b/i,                                   // the Nile's yearly flood keeps its name everywhere, and so does the low Nile (ruling 1307: the lake rises with it)
  /\bby river\b|\briver (route|partner)s?\b/i,                  // the kind of trade this map lacks, named so: the Trade sheet says "No river reaches this oasis" (ruling 1306)
  /\bNo river reaches this oasis\b|\bno river at all\b|\bas river farms do\b/i,   // the Great oasis's own words (How to play's paragraph about it)
];
// Tables whose river words a Great oasis never shows, or shows as written on purpose.
export const KEPT_PATHS = [
  /^MAPS_TEXT\./,                     // the layouts' names and lines: How to play's Maps note and the new-city card name every map (as written, MAP_WORDS_AS_WRITTEN)
  /^TEXT\.V70_HELP\.(t|a)\.0\./,      // How to play's Trade by river and The Quay: left out on a map with no river (tested below)
  /^TEXT\.TIP_TEXT\.quay_boats$/,     // fires when a Quay is placed, which a map with no river refuses; left out of its How to play
  /^TEXT\.S46_ARMY_TEXT\.counters/,   // raiders by boat: no boat reaches the Great oasis's lake (ruling 1302)
];
const sentences = (s) => s.split(/(?<=[.!?;])\s+|\n+/).filter(Boolean);
describe('v82 i oasis: the words on a map with no river', () => {
  it('no text table says the river or the Nile on the Great oasis, except the sentences kept on purpose', () => {
    const all = textsOf({ TEXT, ADVICE_TEXT, AREA_TEXT, NEXT_TEXT, ROUTE_TEXT, FERRY_TEXT, MAPS_TEXT, B_TEXT, LESSON_TEXT, TRAY_TEXT });
    const wrong = [];
    for (const { path, text } of all) {
      if (KEPT_PATHS.some((k) => k.test(path))) continue;
      for (const s of sentences(forMap(OASIS_WORLD, text))) {
        if (/river|nile/i.test(s) && !KEPT.some((k) => k.test(s))) wrong.push(`${path}: ${s}`);
        if (/great lake[a-z]/i.test(s)) wrong.push(`swapped inside a word: ${path}: ${s}`);   // "the riverbank" must not become "the great lakebank"
      }
    }
    expect([all.length > 1000, wrong]).toEqual([true, []]);
  });
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
describe('v82 i oasis: the words as drawn', () => {
  it('How to play on the Great oasis leaves out trade by river, the Quay and the ferries, keeps the Maps note as written, and says no river elsewhere', async () => {
    for (const variant of ['great-oasis', 'classic']) {
      const rig = await rigUI({ world: createWorld({ seed: 3, mapVariant: variant }) });
      try {
        rig.store.set(openSheet(rig.store.get(), 'help'));
        await tick();
        const sheet = rig.root.querySelector('#sheet');
        const heads = [...sheet.querySelectorAll('summary h3')].map((h) => h.textContent);
        const great = variant === 'great-oasis';
        const gone = ['Trade by river', 'The Quay', FERRY_TEXT.FERRY_TEXT.help.head].filter((h) => !heads.includes(h));
        expect([variant, gone.length]).toEqual([variant, great ? 3 : 0]);
        const maps = [...sheet.querySelectorAll(`[${MAP_WORDS_AS_WRITTEN}]`)].map((n) => n.textContent).join(' ');
        expect([variant, maps.includes('The river may run north to south')]).toEqual([variant, true]);   // the Maps note names every map's river, as written
        if (great) {
          const clone = sheet.cloneNode(true);
          for (const n of clone.querySelectorAll(`[${MAP_WORDS_AS_WRITTEN}]`)) n.remove();
          const words = [...clone.querySelectorAll('h3, p, li, td')].map((n) => n.textContent).join(' ');
          const wrong = sentences(words.replace(/\s+/g, ' ')).filter((s) => /river|nile/i.test(s) && !KEPT.some((k) => k.test(s)));
          expect(wrong).toEqual([]);
        }
      } finally { rig.cleanup(); }
    }
  });
  it('every line drawn later says the great lake on the Great oasis (the gossip, a toast, a label), and the river on a river map', async () => {
    const line = 'The priests say the river rose just as it should';
    for (const variant of ['great-oasis', 'classic']) {
      const rig = await rigUI({ world: createWorld({ seed: 3, mapVariant: variant }) });
      try {
        rig.ui.toasts.show(line);
        const extra = document.createElement('p');
        extra.setAttribute('aria-label', 'Clay ground, along the riverbanks');
        extra.textContent = 'The brickmakers say the river mud makes strong bricks';
        rig.root.querySelector('#sheet').append(extra);
        await tick();
        const said = rig.root.textContent;
        const great = variant === 'great-oasis';
        expect([variant, said.includes('The priests say the great lake rose just as it should'), said.includes(line), extra.textContent, extra.getAttribute('aria-label')])
          .toEqual([variant, great, !great, great ? "The brickmakers say the lake's mud makes strong bricks" : extra.textContent, great ? "Clay ground, along the lake's banks" : 'Clay ground, along the riverbanks']);
        extra.firstChild.nodeValue = 'An omen on the river';   // a line changed in place
        await tick();
        expect([variant, extra.textContent]).toEqual([variant, great ? 'An omen on the great lake' : 'An omen on the river']);
        extra.remove();
      } finally { rig.cleanup(); }
    }
  });
  it('a map with no river offers no Ferry, and a road too wide to bridge says so without one', async () => {
    for (const variant of ['great-oasis', 'classic']) {
      const w = createWorld({ seed: 3, mapVariant: variant });
      expect([variant, shownItems(w, 'roads').includes('ferry')]).toEqual([variant, variant !== 'great-oasis']);
      expect([variant, TEXT.S45_TEXT.tooWide(6, variant !== 'great-oasis').includes('ferry')]).toEqual([variant, variant !== 'great-oasis']);
    }
    expect(TEXT.S45_TEXT.tooWide(6, false)).toBe('Too wide for a bridge (6 tiles of water; the most is 4)');
  });
});

describe('v82 i oasis: a new city opens on its start road', () => {
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    it(`at ${width}x${height}: the start road's end and the start area are in the free map for every layout`, async () => {
      const wrong = [];
      for (const variant of MAP_VARIANTS) {
        for (const seed of variant === 'great-oasis' ? [3, 11, 27, 40, 52, 64] : [3, 11]) {
          const s = await cityAt({ width, height, seed, variant });
          try {
            const { world, cam } = s.g();
            const box = freeBox(s.root, width, height), view = { width, height };
            const road = world.startRoad.reduce((a, t) => (Math.hypot(t[0] - world.focus.x, t[1] - world.focus.y) < Math.hypot(a[0] - world.focus.x, a[1] - world.focus.y) ? t : a));
            for (const [name, x, y] of [['road', road[0] + 0.5, road[1] + 0.5], ['focus', world.focus.x, world.focus.y]]) {
              const [sx, sy] = tileToScreen(cam, view, x, y);
              if (!(sx >= box.left + 16 && sx <= box.right - 16 && sy >= box.top + 16 && sy <= box.bottom - 16)) wrong.push(`${variant} #${seed} ${name} at ${Math.round(sx)},${Math.round(sy)} outside ${JSON.stringify(box)}`);
            }
          } finally { s.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
