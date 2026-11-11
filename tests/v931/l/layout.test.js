// Version 9.3.1, Track L (the mobile review's layout, landscape and 150% findings M2, S1, S4, S9, S10, S14, S15): each one measured in the test page at the phone's size and text size,
// the way tests/ui/mobileBudget.test.js boots its scenes.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene, MOBILE_SCENE_PARAMS } from '../../../src/dev/scenes.js';
import { TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function bootAt(params, width, height, textSize) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  let skew = 0;
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params),
    now: () => performance.now() + skew, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
  });
  api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
  await frame();
  return {
    api, root: shell.root, skip(ms) { skew += ms; },
    cleanup() { document.documentElement.style.removeProperty('--safe-right'); api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; },
  };
}
const rect = (root, sel) => { const n = root.querySelector(sel); return n ? n.getBoundingClientRect() : null; };

describe('v931 l: a notched phone held sideways (M2)', () => {
  it('has a rail that is its own width plus the notch once, so the corner buttons, the bar and the sheet stop at its edge', async () => {
    for (const scene of ['placing', 'sheet']) {
      const r = await bootAt(MOBILE_SCENE_PARAMS[scene], 844, 390, 100);
      try {
        document.documentElement.style.setProperty('--safe-right', '47px');
        await devScene(r.api, scene, { quick: true });
        await frame(); await frame();
        const rail = rect(r.root, '#rail'), corners = rect(r.root, '#corners');
        expect([scene, document.body.dataset.layout]).toEqual([scene, 'compact']);
        expect([scene, Math.round(rail.width)]).toEqual([scene, 104]);   // 56 + its 1 px edge + the 47 px notch
        expect(corners.right).toBeLessThanOrEqual(rail.left + 1.5);
        const panel = rect(r.root, scene === 'placing' ? '#confirm' : '#sheet');
        expect([scene, panel.right <= rail.left + 1.5]).toEqual([scene, true]);
      } finally { r.cleanup(); }
    }
  });
});

describe('v931 l: the rail at 150% text (S15)', () => {
  it('sets each category word clear above its colour band', async () => {
    const r = await bootAt(MOBILE_SCENE_PARAMS.early, 844, 390, 150);
    try {
      await devScene(r.api, 'early', { quick: true });
      await frame(); await frame();
      const cats = [...r.root.querySelectorAll('#rail .cat')];
      expect(cats.length).toBeGreaterThan(2);
      for (const c of cats) {
        const w = c.querySelector('.cat-word').getBoundingClientRect(), b = c.getBoundingClientRect();
        expect([c.dataset.category, b.bottom - w.bottom >= 7.5]).toEqual([c.dataset.category, true]);   // the band is 3 px, 4 px up from the foot
        expect([c.dataset.category, b.height >= 44]).toEqual([c.dataset.category, true]);
      }
    } finally { r.cleanup(); }
  });
});

describe('v931 l: the guidance rows at 150% text on a 360 phone (S1, S10)', () => {
  it('shows the lesson row\'s whole instruction, with the chapter label out of the way', async () => {
    const r = await bootAt('skipTitle=1&seed=7', 360, 780, 150);
    try {
      await devScene(r.api, 'v60-lesson', { step: 'homes', quick: true });
      await frame(); await frame();
      const body = r.root.querySelector('#lesson .body');
      expect(getComputedStyle(body).webkitLineClamp).toBe('none');
      expect(body.scrollHeight <= body.clientHeight + 1).toBe(true);
      const text = r.root.querySelector('#lesson .text').getBoundingClientRect(), row = r.root.querySelector('#lesson').getBoundingClientRect();
      expect([text.left >= row.left, text.right <= row.right + 0.5]).toEqual([true, true]);
      const label = r.root.querySelector('#lesson .label').getBoundingClientRect();
      expect(label.width <= 1.5 && label.height <= 1.5).toBe(true);
    } finally { r.cleanup(); }
  });

  it('gives the goals strip four lines and More a line of its own', async () => {
    const r = await bootAt(MOBILE_SCENE_PARAMS.early, 360, 780, 150);
    try {
      r.skip(TIP_FIRST_DELAY_MS);
      await devScene(r.api, 'early', { quick: true });
      await frame(); await frame();
      const words = r.root.querySelector('#goals .goal-strip .words');
      expect(getComputedStyle(words).webkitLineClamp).toBe('4');
      expect(words.scrollHeight <= words.clientHeight + 1).toBe(true);   // the goal's words fit: nothing cut, so More is not drawn over them
      const more = r.root.querySelector('#goals .goal-strip .more');
      if (more && !more.hidden) {
        const m = more.getBoundingClientRect(), w = words.getBoundingClientRect();
        expect(m.top >= w.bottom - 1).toBe(true);
      }
    } finally { r.cleanup(); }
  });
});

describe('v931 l: the bar and the dock at 150% text (S4, S9)', () => {
  it('breaks the placing bar\'s name between words', async () => {
    const r = await bootAt(MOBILE_SCENE_PARAMS.placing, 360, 780, 150);
    try {
      await devScene(r.api, 'placing', { quick: true });
      await frame(); await frame();
      const name = r.root.querySelector('#confirm .info .title .name');
      expect(getComputedStyle(name).overflowWrap).toBe('break-word');
      expect(getComputedStyle(name.parentElement).flexWrap).toBe('wrap');
    } finally { r.cleanup(); }
  });

  it('puts Defence in view in the dock while a raid is warned', async () => {
    const r = await bootAt(MOBILE_SCENE_PARAMS.raid, 375, 667, 150);
    try {
      await devScene(r.api, 'raid', { quick: true });
      await frame(); await frame();
      expect(r.root.querySelector('#banner .critical[data-code="raid_warning"]') === null).toBe(false);
      const cats = rect(r.root, '#dock .cats'), def = rect(r.root, '#dock .cat[data-category="defence"]');
      expect([def.left >= cats.left - 0.5, def.right <= cats.right + 0.5]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });
});

describe('v931 l: a pinch on a bar (S14)', () => {
  it('caps the page zoom at 200%, not below it, and keeps the chrome\'s pinch-zoom', async () => {
    const html = await (await fetch('/index.html')).text();
    const content = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="viewport"]').getAttribute('content');
    expect(content.includes('maximum-scale=2')).toBe(true);
    expect(content.includes('user-scalable')).toBe(false);
  });
});
