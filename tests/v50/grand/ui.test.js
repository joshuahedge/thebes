// Version 5.0 Task 7 (rulings 580-599, UX rules): the grand homes' words and buttons. A Fine manor's next step names the decoration, its place and what it does
// to the street, all from the sim's desirabilityFix; its Show me and the desirability row's start the same tool; the advice says the same; a third food names the
// lodge by the herd; the tip's words are TIERS'. The sheet with the longer step line on a small and a tall phone at 100, 125 and 150% text (v50-grand scene).
import { describe, it, expect } from '../../harness.js';
import { fire, flush } from '../../helpers/dom.js';
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene } from '../../../src/dev/scenes.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { nextStep, cityAdvice } from '../../../src/sim/advice.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { costOf } from '../../../src/sim/costs.js';
import { select } from '../../../src/ui/modes.js';
import { stepWords, STEP_LABELS, STEP_TEXT } from '../../../src/ui/nextStepText.js';
import { adviceWords, ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { TIP_TEXT, TIP_HELP_TEXT, buildingName } from '../../../src/ui/text.js';
import { TIERS } from '../../../src/data/housing.js';
import { grandDistrict } from '../../../src/dev/v50/grand.js';

describe('v50 grand ui: the next step names the decoration and its tile', () => {
  it('says which building, where, its price and the street before and after, and both Show me buttons start that building', async () => {
    const { world: w, home } = grandDistrict('street');
    const step = nextStep(w, home);
    const f = step.fix;
    const words = stepWords(w, home, step);
    expect(words.text).toBe(`${STEP_LABELS.next} a ${buildingName(f.item).toLowerCase()} ${STEP_TEXT.spot(f.dist)} (${costOf(w, f.item)} gold) raises its desirability from ${houseDesirability(w, home)} to ${f.to} (it needs ${TIERS[8].desirability.rise})`);
    expect(words.action.build).toEqual({ category: 'homes', item: f.item, x: f.target.x, y: f.target.y });
    const item = cityAdvice(w).find((a) => a.kind === 'home_need' && a.data.need === 'desirability');
    expect(adviceWords(item, w).fix).toBe(ADVICE_TEXT.decor(f, 1));
    const r = await rigUI({ world: w });
    try {
      for (const pick of ['.step-line button', '.checklist li[data-need="desirability"] .show-me']) {
        r.store.set(select(r.store.get(), home.id));
        await flush();
        fire(r.root.querySelector(`#sheet ${pick}`), 'click');
        expect([pick, r.store.get().tool]).toEqual([pick, { kind: 'building', type: f.item }]);
      }
    } finally { r.cleanup(); }
  });

  it('names a hunting lodge by the nearest herd for a third food, and the tip says what a Villa and an Estate want', () => {
    const { world: w, home } = grandDistrict('food');
    const words = stepWords(w, home, nextStep(w, home));
    expect(words.text).toBe(`${STEP_LABELS.next} a hunting lodge ${STEP_TEXT.herd} (${costOf(w, 'hunting_lodge')} gold) gives this home a third kind of food`);
    for (const n of [TIERS[8].desirability.rise, TIERS[9].desirability.rise]) expect(TIP_HELP_TEXT.grand_homes).toContain(String(n));
    expect(TIP_TEXT.grand_homes).toContain(TIERS[7].name);
    expect(TIP_TEXT.grand_homes.length).toBeLessThanOrEqual(130);
  });
});

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
const small = (n) => { const b = n.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5; };

describe('v50 grand budget: the house sheet with the grand step line', () => {
  for (const view of ['street', 'food']) {
    it(`keeps the ${view} step line inside the sheet, with a named 44 px Show me, on a small and a tall phone at 100, 125 and 150% text`, async () => {
      const wrong = [];
      for (const [width, height] of PHONES) {
        for (const textSize of TEXT_SIZES) {
          const r = await bootScene(width, height);
          const at = `${width}x${height} ${textSize}% ${view}`;
          try {
            r.api.game().ui.settings.set({ textSize, reducedMotion: 'on' });
            await frame();
            const said = await devScene(r.api, 'v50-grand', { view, quick: true });
            await frame(); await frame();
            expect([at, said.startsWith('v50-grand: ')]).toEqual([at, true]);
            const sheet = r.root.querySelector('#sheet');
            const line = sheet && sheet.querySelector('.step-line');
            if (!line) { wrong.push(`${at}: no step line`); continue; }
            if (!line.textContent.includes(STEP_LABELS.next)) wrong.push(`${at}: the line is not a next step`);
            if (line.scrollWidth > line.clientWidth + 1) wrong.push(`${at}: the step line runs sideways`);
            if (line.getBoundingClientRect().right > r.root.getBoundingClientRect().right + 1) wrong.push(`${at}: the step line is wider than the frame`);
            const button = line.querySelector('button');
            if (!button || small(button) || !(button.getAttribute('aria-label') || '').length) wrong.push(`${at}: Show me is missing, small or unnamed`);
          } finally { r.cleanup(); }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
