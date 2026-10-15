// Version 5.0 Task 4 (UX rules, rulings 550-559): the confirm bar of a farm area, a garden area (with its spacing row), an area the treasury cannot pay (the longest words) and
// Build another's copied-settings line, and the building sheet with Build another and its refusal, on a small and a tall phone (375x667, 390x844) at 100, 125 and 150% text, from the
// v50-areas dev scene. The bar stays under half the screen and inside the frame, its words are not cut off (no line runs past its box), the copy line is two lines at most, and
// every button in the bar and the sheet is a 44x44 target with a name.
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
  ['farm', {}, (g) => g.ui.store.get().tool.kind === 'areas' && g.ui.store.get().tool.type === 'farm_grain'],
  ['garden', {}, (g) => g.ui.store.get().tool.kind === 'areas' && g.ui.store.get().tool.type === 'garden'],
  ['broke', {}, (g) => g.ui.placement.preview().reason === 'no_gold'],
  ['another-bar', {}, (g) => g.ui.store.get().tool.kind === 'building' && Boolean(g.ui.store.get().tool.copy)],
  ['another', {}, (g) => g.ui.store.get().sheet !== null && g.ui.store.get().sheet.kind === 'info'],
  ['refused', {}, (g) => g.ui.store.get().sheet !== null && g.ui.store.get().tool === null],
];

describe('v50 areas budget: the confirm bar and the sheet', () => {
  for (const [view, options, ready] of VIEWS) {
    it(`holds the bar and sheet budget in the ${view} view on a small and a tall phone at 100, 125 and 150% text`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene(width, height);
          const at = `${width}x${height} ${textSize}% ${view}`;
          try {
            r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, 'v50-areas', { view, ...options, quick: true });
            const g = r.api.game();
            await frame(); await frame();
            expect([at, said.startsWith('v50-areas: '), ready(g)]).toEqual([at, true, true]);
            const box = r.root.getBoundingClientRect();
            if (view === 'another' || view === 'refused') {
              const sheet = r.root.querySelector('#sheet');
              const button = sheet.querySelector('button.another');
              if (!button) { wrong.push(`${at}: no Build another button`); continue; }
              button.scrollIntoView({ block: 'center' });
              if (small(button) || !named(button)) wrong.push(`${at}: Build another is ${size(button)} or has no name`);
              if (!inside(sheet, box)) wrong.push(`${at}: the sheet is outside the frame`);
              if (view === 'refused') {
                const note = sheet.querySelector('.another-note');
                if (!note) { wrong.push(`${at}: no refusal`); continue; }
                note.scrollIntoView({ block: 'center' });
                const show = note.querySelector('.show-me');
                if (!show || small(show) || !named(show)) wrong.push(`${at}: Show me is ${show ? size(show) : 'missing'} or has no name`);
                if (note.scrollWidth > note.clientWidth + 1) wrong.push(`${at}: the refusal runs sideways`);
                if (note.getBoundingClientRect().width > box.width) wrong.push(`${at}: the refusal is wider than the frame`);
              }
              continue;
            }
            const bar = r.root.querySelector('#confirm');
            const b = bar.getBoundingClientRect();
            if (!inside(bar, box)) wrong.push(`${at}: the bar is outside the frame`);
            if (b.height > box.height * 0.5 + 0.5) wrong.push(`${at}: the bar is ${Math.round(b.height)} of ${box.height} px tall, over half`);
            for (const sel of ['.cost', '.reason', '.copy-line', '.balance', '.title']) {
              const n = bar.querySelector(sel);
              if (n && n.scrollWidth > n.clientWidth + 1) wrong.push(`${at}: ${sel} runs past its box`);
            }
            const copy = bar.querySelector('.copy-line');
            if (copy) {
              const lineH = parseFloat(getComputedStyle(copy).lineHeight) || parseFloat(getComputedStyle(copy).fontSize) * 1.45;
              if (copy.getBoundingClientRect().height > 2 * lineH + 2) wrong.push(`${at}: the copy line is ${Math.round(copy.getBoundingClientRect().height)} px, over two lines`);
            }
            for (const n of bar.querySelectorAll('button')) {
              if (small(n)) wrong.push(`${at}: ${n.className} is ${size(n)}, under 44x44`);
              if (!named(n)) wrong.push(`${at}: ${n.className} has no name`);
              if (!inside(n, b)) wrong.push(`${at}: ${n.className} is outside the bar`);
            }
            if (view === 'farm' || view === 'broke') {
              const toggle = bar.querySelector('.area-toggle');
              if (!toggle || toggle.getAttribute('aria-pressed') !== 'true') wrong.push(`${at}: the area button is missing or not pressed`);
            }
            if (view === 'garden') {
              const picks = [...bar.querySelectorAll('.area-pick')];
              if (picks.length !== 3) wrong.push(`${at}: ${picks.length} spacing buttons, wanted 3`);
              if (picks.filter((p) => p.getAttribute('aria-pressed') === 'true').length !== 1) wrong.push(`${at}: not exactly one spacing pressed`);
            }
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
