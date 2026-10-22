// Version 5.0 Task 3 (UX rules, rulings 540-549): the legend row of the three layers, with Goods supply's good picker, on a small and a tall phone (375x667, 390x844) at 100, 125 and
// 150% text, on the sample city (a Capital: every layer and every good is offered, and its court banner is up). The rows under the top bar obey the height budget the mobile tests hold
// (they end by 30% of the height at 100% text, 40% at 125% and 150%, 40% held sideways; at most two rows: the alert row and the legend), the strip and every key are inside the frame, and every button in it
// (the five goods, the x) is a 44x44 target with a name. The Layers popover with all fourteen choices and Off keeps 44 px buttons and stays inside the frame.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene, measureRows } from '../../../src/dev/scenes.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { OVERLAYS } from '../../../src/render/overlays.js';
import { SUPPLY_GOODS } from '../../../src/data/layers.js';
import { V50_LAYERS_TEXT as W, OVERLAY_NAMES } from '../../../src/ui/text.js';

const PHONES = [[375, 667], [390, 844], [844, 390], [667, 375]];
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

describe('v50 layers budget: the legend row', () => {
  for (const [layer, options] of [['progress', {}], ['workers', {}], ...SUPPLY_GOODS.map((good) => ['supply', { good }])]) {
    it(`holds the height budget with ${layer}${options.good ? ` (${options.good})` : ''} on, every key inside the frame and every button a named 44x44 target`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          if (width > height && textSize > 100) continue;   // held sideways at 125% text or more the legend yields to the alert row (ruling 172, tests/ui/mobileBudget.test.js)
          const r = await bootScene(width, height);
          const at = `${width}x${height} ${textSize}% ${layer}${options.good ? ` ${options.good}` : ''}`;
          try {
            r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, 'v50-layers', { layer, ...options, quick: true });
            const g = r.api.game();
            await frame(); await frame();
            expect([at, said.startsWith('v50-layers: ') && g.ui.store.get().overlay === layer]).toEqual([at, true]);
            const box = r.root.getBoundingClientRect();
            const strip = r.root.querySelector('#legend .strip.layer');
            if (!strip) { wrong.push(`${at}: no legend strip`); continue; }
            if (!inside(strip, box)) wrong.push(`${at}: the strip is outside the frame`);
            for (const k of strip.querySelectorAll('.key')) if (!inside(k, box) || !k.getAttribute('aria-label')) wrong.push(`${at}: a key is cut off or has no words`);
            const close = strip.querySelector('.close');
            if (!close || close.getBoundingClientRect().width < 43.5 || close.getBoundingClientRect().height < 43.5 || !close.getAttribute('aria-label')) wrong.push(`${at}: the x is ${close ? size(close) : 'missing'} or has no name`);
            if (layer === 'supply') {
              const chips = [...strip.querySelectorAll('.goods-pick .good')];
              if (chips.length !== 5) wrong.push(`${at}: ${chips.length} goods offered, wanted 5`);
              for (const c of chips) {
                const b = c.getBoundingClientRect();
                if (b.width < 43.5 || b.height < 43.5) wrong.push(`${at}: ${c.textContent} is ${size(c)}, under 44x44`);
                if (!inside(c, box)) wrong.push(`${at}: ${c.textContent} is outside the frame`);
                if (!c.getAttribute('aria-label') || !c.getAttribute('aria-label').toLowerCase().includes(c.textContent.toLowerCase())) wrong.push(`${at}: ${c.textContent} is not named for what it shows`);
              }
              const pressed = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.good);
              if (pressed.join() !== options.good) wrong.push(`${at}: pressed ${pressed.join()} not ${options.good}`);
            }
            const m = measureRows(r.root);
            const large = textSize >= 125, limit = width > height || large ? 0.4 : 0.3, end = m.rowsEnd / m.height;
            if (end > limit + 0.005) wrong.push(`${at}: the rows end at ${Math.round(end * 100)}% of the height, limit ${Math.round(limit * 100)}%`);
            if (m.rows > 2) wrong.push(`${at}: ${m.rows} rows, limit 2`);
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }

  it('the Layers popover offers all fourteen and Off with 44 px buttons inside the frame, and shows only the layers the city has reached on a young city', async () => {
    const wrong = [];
    for (const [width, height] of PHONES) {
      for (const textSize of TEXT_SIZES) {
        const r = await bootScene(width, height);
        const at = `${width}x${height} ${textSize}%`;
        try {
          r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          await devScene(r.api, 'v50-layers', { layer: 'progress', quick: true });
          const g = r.api.game();
          g.ui.store.set({ overlay: null, layersOpen: true });
          await frame(); await frame();
          const picker = [...r.root.querySelectorAll('.layers-picker')].find((n) => n.offsetParent !== null);
          if (!picker) { wrong.push(`${at}: no picker`); continue; }
          const buttons = [...picker.querySelectorAll('button.layer')].filter((b) => !b.hidden);
          if (buttons.length !== OVERLAYS.length + 1) wrong.push(`${at}: ${buttons.length} choices`);
          for (const b of buttons) {
            const q = b.getBoundingClientRect();
            if (q.height < 43.5 || q.width < 43.5) wrong.push(`${at}: ${b.textContent} is ${size(b)}`);
            if (!b.textContent) wrong.push(`${at}: a choice has no name`);
          }
          const box = r.root.getBoundingClientRect(), pb = picker.getBoundingClientRect();
          if (pb.left < box.left - 1 || pb.right > box.right + 1 || pb.top < box.top - 1 || pb.bottom > box.bottom + 1) wrong.push(`${at}: the popover is outside the frame`);
          // A young city (the first plot only) is offered Home progress and nothing newer.
          g.ui.store.set({ layersOpen: false });
          g.world.milestone = 'village';
          g.ui.store.set({ layersOpen: true });
          await frame();
          const shown = [...picker.querySelectorAll('button.layer')].filter((b) => !b.hidden && !b.classList.contains('locked')).map((b) => b.dataset.layer);   // Version 6.0: a layer not reached is greyed with its rank, not offered
          if (!shown.includes('progress') || shown.includes('supply') || shown.includes('workers')) wrong.push(`${at}: at Village the picker shows ${shown.join()}`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
    expect(OVERLAY_NAMES.progress + OVERLAY_NAMES.supply + OVERLAY_NAMES.workers).toBe('Home progressGoods supplyWorkers');
    expect(W.pickName('food')).toBe('Foods');
  });
});
