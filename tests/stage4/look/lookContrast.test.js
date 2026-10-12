// Track H, task H2: the contrast check of every text style on its new background (spec 6.1, 6.9; ruling 277). The real
// interface is driven through the screens a player meets (the top bar, the dock and its cards, a tool's bar, the sheets,
// the side panel, the rail's drawer, a dialog, a toast, the banner, the title card) in the three layouts, and every element
// that shows words of its own is measured against what lies under it. Where that is papyrus, the fibre's darkest and
// lightest points are measured too (the darkest layer comes from the stylesheet's own --look-fibre). Disabled controls
// are left out (WCAG 1.4.3 exempts them), as are words hidden for screen readers only.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { addRaw } from '../../helpers/testWorld.js';
import { openSheet, select, startTool, cancelTool, pickCategory, closeSheet } from '../../../src/ui/modes.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createToasts } from '../../../src/ui/toasts.js';
import { buildingAt } from '../../../src/sim/world.js';
import { parseColour, fibreLayers } from './lookTokens.js';

const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const mix = (bottom, top, a) => [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a));

// The elements with words of their own, as a sighted player sees them.
function wordElements(root) {
  const out = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || out.has(el) || !/[\p{L}\p{N}]/u.test(n.nodeValue)) continue;
    if (el.closest('[hidden], [disabled], [aria-hidden="true"], .sizer')) continue;
    const rect = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (rect.width <= 1 || rect.height <= 1 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    out.add(el);
  }
  return [...out];
}

// The words' colour as shown (their alpha and their own opacity) and every backdrop they can stand on: the first box up the
// tree with a colour of its own, and on papyrus that colour under the fibre's darkest and lightest layers.
function worstContrast(el, layers) {
  const fg = parseColour(getComputedStyle(el).color);
  let alpha = fg[3] * Number(getComputedStyle(el).opacity);
  let box = el;
  for (; box; box = box.parentElement) { const c = parseColour(getComputedStyle(box).backgroundColor); if (c[3] > 0) break; }
  if (!box) return { ratio: 21, box: null };
  const bg = parseColour(getComputedStyle(box).backgroundColor).slice(0, 3);
  const backs = [bg];
  if (getComputedStyle(box).backgroundImage.includes('data:image/svg+xml')) for (const l of layers) backs.push(mix(bg, parseColour(l.stroke), l.opacity));
  const shown = (b) => mix(b, fg, alpha);
  return { ratio: Math.min(...backs.map((b) => ratio(shown(b), b))), box };
}
const pathOf = (el) => { const parts = []; for (let n = el; n && n.id !== 'ui' && parts.length < 4; n = n.parentElement) parts.unshift(n.id ? `#${n.id}` : `${n.tagName.toLowerCase()}${n.classList.length ? '.' + [...n.classList].join('.') : ''}`); return parts.join(' > '); };

describe('s4 look contrast of every text style', () => {
  it('keeps every word in the interface at 4.5:1 or better on its new background, in every layout', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    const failing = [], seen = new Set();
    let checked = 0;
    try {
      const layers = fibreLayers(getComputedStyle(document.documentElement).getPropertyValue('--look-fibre'));
      expect(layers.length).toBeGreaterThanOrEqual(2);
      const measure = (scene) => {
        for (const el of wordElements(r.root)) {
          const { ratio: c, box } = worstContrast(el, layers);
          if (!box) continue;                                            // words straight on the map have a box of their own in this game
          checked++;
          const style = `${getComputedStyle(el).color} on ${getComputedStyle(box).backgroundColor}`;
          seen.add(style);
          if (c < 4.5) failing.push(`${scene}: ${pathOf(el)} "${el.textContent.trim().slice(0, 24)}" ${style} = ${c.toFixed(2)}`);
        }
      };
      const store = r.store;
      const house = buildingAt(r.world, 12, 9);
      addRaw(r.world, 'storehouse', 16, 8);
      addRaw(r.world, 'trading_post', 20, 7);
      r.world.milestone = 'town';
      r.ui.refresh();
      for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
        r.resize(w, h);
        const at = `${w}x${h}`;
        store.set(closeSheet(store.get()));
        measure(`${at} city`);
        store.set(pickCategory(store.get(), 'industry'));
        measure(`${at} cards`);
        store.set(startTool(store.get(), { kind: 'building', type: 'well' }));
        measure(`${at} placing`);
        store.set(startTool(store.get(), { kind: 'demolish' }));
        measure(`${at} demolishing`);
        store.set(cancelTool(store.get()));
        for (const kind of ['summary', 'menu', 'settings', 'help', 'about', 'minimap', 'goals']) { store.set(openSheet(store.get(), kind)); measure(`${at} ${kind}`); }
        for (const b of [house, buildingAt(r.world, 9, 11), buildingAt(r.world, 16, 8), buildingAt(r.world, 20, 7)]) { store.set(select(store.get(), b.id)); measure(`${at} ${b.type} sheet`); }
        store.set(openSheet(store.get(), 'trade', buildingAt(r.world, 20, 7).id));
        measure(`${at} trade`);
        store.set(closeSheet(store.get()));
        store.set({ confirmDialog: { text: 'Demolish the granary?', confirmLabel: 'Demolish' } });
        measure(`${at} dialog`);
        store.set({ confirmDialog: null });
      }
      // The critical banner (debt), a toast with its action, and the title card.
      r.resize(390, 844);
      r.world.gold = -5;
      r.ui.refresh();
      const toasts = createToasts({ container: r.root.querySelector('#toasts'), max: () => 3 });
      toasts.show('Road laid', { action: 'Undo', onAction: () => {}, ms: 60000 });
      measure('banner and toast');
      const title = r.root.querySelector('#title');
      const card = createTitleCard({ container: title, hasSave: true, onContinue: () => {}, onNewCity: () => {}, onSound: () => {} });
      measure('title card');
      card.element.remove();
      title.hidden = true;
    } finally { r.cleanup(); }
    expect(failing).toEqual([]);
    expect(checked).toBeGreaterThan(300);
    expect(seen.size).toBeGreaterThan(12);                               // many distinct styles, not one measured many times
  });
});
