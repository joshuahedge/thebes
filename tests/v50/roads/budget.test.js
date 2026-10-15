// Version 5.0 Task 5 (UX rules, rulings 560-569): the road bar with its Route / Straight toggle, on a small and a tall phone (375x667, 390x844) at 100, 125 and 150% text, from the
// v50-roads dev scene: a routed road with a bridge (the longest words: the count, the bridge and the road already there), the same ends in Straight, and two refusals (the
// water too wide, buildings in the way, each with Show me). The bar stays under half the screen and inside the frame, its words are not cut off, and every button is a 44x44 target
// with a name.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene } from '../../../src/dev/scenes.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const PHONES = [[375, 667], [390, 844]];
const TEXT_SIZES = [100, 125, 150];
const noStorage = { getItem: () => null, setItem: () => {} };
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function bootScene(width, height) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
    now: () => performance.now(), clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

const inside = (n, box) => { const b = n.getBoundingClientRect(); return b.left >= box.left - 1 && b.right <= box.right + 1 && b.top >= box.top - 1 && b.bottom <= box.bottom + 1; };
const size = (n) => { const b = n.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; };
const small = (n) => { const b = n.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5; };
const named = (n) => Boolean(n.getAttribute('aria-label') || n.textContent.trim());

// What each view must have set up (read from the game, so a scene that quietly stops setting up its moment fails here).
const VIEWS = [
  ['route', (g) => g.ui.store.get().tool.route === true && g.ui.placement.preview().state === 'ok' && g.ui.placement.preview().bridges.length > 0],
  ['straight', (g) => !g.ui.store.get().tool.route && g.ui.placement.preview().state === 'bad'],
  ['refused', (g) => g.ui.placement.preview().reason === 'too_wide' && g.ui.placement.preview().showFit === true],
  ['boxed', (g) => g.ui.placement.preview().reason === 'boxed_in' && g.ui.placement.preview().showFit === true],
];

describe('v50 roads budget: the road bar with its toggle', () => {
  for (const [view, ready] of VIEWS) {
    it(`holds the bar budget in the ${view} view on a small and a tall phone at 100, 125 and 150% text`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene(width, height);
          const at = `${width}x${height} ${textSize}% ${view}`;
          try {
            r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, 'v50-roads', { view, quick: true });
            const g = r.api.game();
            await frame(); await frame();
            expect([at, said.startsWith('v50-roads: '), ready(g)]).toEqual([at, true, true]);
            const box = r.root.getBoundingClientRect();
            const bar = r.root.querySelector('#confirm');
            const b = bar.getBoundingClientRect();
            if (!inside(bar, box)) wrong.push(`${at}: the bar is outside the frame`);
            if (b.height > box.height * 0.5 + 0.5) wrong.push(`${at}: the bar is ${Math.round(b.height)} of ${box.height} px tall, over half`);
            for (const sel of ['.cost', '.reason', '.title']) {
              const n = bar.querySelector(sel);
              if (n && n.scrollWidth > n.clientWidth + 1) wrong.push(`${at}: ${sel} runs past its box`);
            }
            const reason = bar.querySelector('.reason');
            if (reason) {
              const lineH = parseFloat(getComputedStyle(reason).lineHeight) || parseFloat(getComputedStyle(reason).fontSize) * 1.45;
              if (reason.getBoundingClientRect().height > 3 * lineH + 2) wrong.push(`${at}: the words are ${Math.round(reason.getBoundingClientRect().height)} px, over three lines`);
            }
            for (const n of bar.querySelectorAll('button')) {
              if (small(n)) wrong.push(`${at}: ${n.className} is ${size(n)}, under 44x44`);
              if (!named(n)) wrong.push(`${at}: ${n.className} has no name`);
              if (!inside(n, b)) wrong.push(`${at}: ${n.className} is outside the bar`);
            }
            const picks = [...bar.querySelectorAll('.route-pick')];
            if (picks.length !== 2) wrong.push(`${at}: ${picks.length} shape buttons, wanted 2`);
            if (picks.filter((p) => p.getAttribute('aria-pressed') === 'true').length !== 1) wrong.push(`${at}: not exactly one shape pressed`);
            if (picks.some((p) => !p.getAttribute('aria-label').startsWith(p.textContent.replace('✓ ', '')))) wrong.push(`${at}: a shape button's name does not start with its words`);
            if (view === 'refused' || view === 'boxed') {
              const show = bar.querySelector('.show-fit');
              if (!show || small(show) || !named(show)) wrong.push(`${at}: Show me is ${show ? size(show) : 'missing'} or has no name`);
            }
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
