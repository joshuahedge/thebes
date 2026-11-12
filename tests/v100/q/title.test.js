// Version 10.0, Track Q (ruling 2147, Task Q.7): the title's backdrop is the Capital's look with a procession out, and a sheet head's long name wraps inside its cartouche.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { lookOfRank } from '../../../src/render/looks.js';
import { processionsAt } from '../../../src/render/walkers.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { useGameCss } from './cssHelper.js';
import { rulerCartouche } from '../../../src/ui/v92/cartouche.js';

const noStorage = { getItem: () => null, setItem: () => {} };

async function bootRig({ width = 390, height = 844 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''),
    now: () => 0, clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('v100 q title: the backdrop is the Capital with a procession', () => {
  it("devScene('title') says look 3 and a procession, and the title world really has both", async () => {
    const r = await bootRig();
    try {
      const said = await window.__thebes.devScene('title');
      expect(/^title: look 3 \(Capital\), [1-9]\d* procession figures,/.test(said)).toBe(true);
      const { world } = r.api.titleView();
      expect(lookOfRank(world.milestone)).toBe(3);
      const walkers = processionsAt(world, world.day, null);
      expect(walkers.some((w) => w.kind === 'standard' || w.kind === 'priest' || w.kind === 'shrine' || w.kind === 'musician' || w.kind === 'dancer')).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v100 q title: a sheet head with a long name', () => {
  it('a 40-character ruler name wraps inside its cartouche at 150% text on 390x844', async () => {
    const off = await useGameCss();
    const m = mount();
    try {
      m.root.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;';
      document.body.dataset.textSize = '150';
      document.body.style.setProperty('--ui-scale', '1.5');
      const name = 'Nefertari-Hatshepsut of the Two Great Lands'.slice(0, 40);
      expect(name.length).toBe(40);
      const node = rulerCartouche({ name, n: 1, title: 'steady' }, { full: false });
      node.style.width = '358px';
      m.root.append(node);
      const box = node.getBoundingClientRect(), ruler = node.querySelector('.cartouche-ruler').getBoundingClientRect();
      expect(ruler.right <= box.right + 0.5).toBe(true);
      expect(ruler.left >= box.left - 0.5).toBe(true);
      expect(node.scrollWidth <= node.clientWidth + 1).toBe(true);
      expect(ruler.height > 24 * 1.5).toBe(true);   // two lines or more: it wrapped
    } finally { m.cleanup(); delete document.body.dataset.textSize; document.body.style.removeProperty('--ui-scale'); off(); }
  });
});
