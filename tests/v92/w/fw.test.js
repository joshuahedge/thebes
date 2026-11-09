// Version 9.2, fix wave (Track W's second pass, rulings 1880-1884): the glossary's leftovers, the short Generous line for Ipi's bubble, one caption for several quiet sites,
// the Peaceful card line that agrees with the difficulty hint, the Health legend's heavier swatch, the Rulers rows' wrap.
import { describe, it, expect } from '../../harness.js';
import { GOALS } from '../../../src/data/goals.js';
import { TRAITS } from '../../../src/data/dynasty.js';
import { TIERS } from '../../../src/data/housing.js';
import { STEP_TEXT } from '../../../src/ui/nextStepText.js';
import { T, V80_U_TEXT, D92_D_TEXT, A92_TEXT, S92_S_TEXT, V90_D_TEXT, difficultyHint } from '../../../src/ui/text.js';
import { createMonumentUi } from '../../../src/ui/monumentSheet.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const LIMIT = 90;
const source = async (p) => (await fetch(p)).text();

describe('v92 w fix: the glossary (S4)', () => {
  it('the two street goals and the step line say pleasantness, not desirability', () => {
    expect(GOALS.find((g) => g.id === 'villa_street').text).toBe(`Raise a ${TIERS[7].name}'s pleasantness to ${TIERS[8].desirability.rise}`);
    expect(GOALS.find((g) => g.id === 'estate_street').text).toBe(`Raise a ${TIERS[8].name}'s pleasantness to ${TIERS[9].desirability.rise}`);
    expect(STEP_TEXT.lifts(1, 2, 3)).toBe('raises its pleasantness from 1 to 2 (it needs 3)');
    for (const g of GOALS) expect([g.id, /desirability/i.test(g.text)]).toEqual([g.id, false]);
  });
  it('the guide help ends with a full stop and the overlay keys line no longer claims dots and rings', () => {
    expect(T.guideHelp.endsWith('.')).toBe(true);
    expect(/dot|ring/.test(T.overlay_keys)).toBe(false);
  });
  it('the heir lines of Track D, A and S fit 90 characters for every title', () => {
    for (const id of ['builder', 'unconquered', 'bountiful', 'merchant', 'generous', 'steady']) {
      const line = D92_D_TEXT.heirIpi(id);
      expect([id, line.length <= LIMIT]).toEqual([id, true]);
    }
    for (const s of [D92_D_TEXT.sealedSheet, D92_D_TEXT.found, D92_D_TEXT.mapCaption, A92_TEXT.minimapHelp, S92_S_TEXT.siteQuietMany(12), S92_S_TEXT.siteQuietWhy]) expect(s.length <= LIMIT).toBe(true);
  });
});

describe('v92 w fix: Ipi\'s Generous line (M11)', () => {
  it('is short and made of the TRAITS numbers, set both ways; the Pass sheet keeps the long one', () => {
    const was = TRAITS.generous.arrivals, wasTax = TRAITS.generous.taxes;
    try {
      expect(D92_D_TEXT.heirIpi('generous')).toBe('Heir of the Generous. 20% more newcomers; taxes 2% lower.');
      TRAITS.generous.arrivals = 1.3; TRAITS.generous.taxes = 0.95;
      expect(D92_D_TEXT.heirIpi('generous')).toBe('Heir of the Generous. 30% more newcomers; taxes 5% lower.');
    } finally { TRAITS.generous.arrivals = was; TRAITS.generous.taxes = wasTax; }
    expect(V90_D_TEXT.traitLine('generous').length).toBeGreaterThan(LIMIT - 40);
    expect(V90_D_TEXT.traitLine('generous').includes('High taxes take')).toBe(true);
  });
});

describe('v92 w fix: Peaceful says one thing on the card and in the hint (M15)', () => {
  it('both name the rarer hazards', () => {
    expect(V80_U_TEXT.difficultyLine('peaceful')).toBe('No raids, sickness or thefts; rarer fires and Low Niles; buildings 20% cheaper.');
    expect(V80_U_TEXT.difficultyLine('peaceful').length <= LIMIT).toBe(true);
    expect(/Low Niles, locusts and fires still come, rarer/.test(difficultyHint('peaceful'))).toBe(true);
  });
});

describe('v92 w fix: several quiet monument sites (M10)', () => {
  it('three sites due at one month end get one caption naming the count, once', () => {
    const w = makeTestWorld({ gold: 20000 });
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'great_city';
    addRaw(w, 'mastaba_small', 12, 11); addRaw(w, 'mastaba_small', 16, 11); addRaw(w, 'mastaba_small', 20, 11);
    const shown = [];
    const ui = createMonumentUi({ world: w, store: null, celebrations: { show: (c) => shown.push(c) } });
    ui.onEvents([{ type: 'month' }]);
    w.day += 30; ui.onEvents([{ type: 'month' }]);
    expect(shown.length).toBe(1);
    expect(shown[0].text).toBe(S92_S_TEXT.siteQuietMany(3));
    expect(shown[0].text).toBe('3 monument sites not looked at for a month');
    w.day += 30; ui.onEvents([{ type: 'month' }]);
    expect(shown.length).toBe(1);
  });
});

describe('v92 w fix: the sources (M2, M9, M13)', () => {
  it('one .cartouche-ruler rule, and it wraps (ruling 1880)', async () => {
    const css = await source('/css/v92.css');
    const rules = css.split('\n').filter((l) => /^\.cartouche-ruler \{/.test(l));
    expect(rules.length).toBe(1);
    expect(/white-space: normal/.test(rules[0]) && !/nowrap|ellipsis/.test(rules[0].replace(/\/\*.*\*\//, ''))).toBe(true);
  });
  it('the Health legend swatch edges are 2 px', async () => {
    const js = await source('/src/ui/overlayUi.js');
    expect(/inset 0 0 0 2px \$\{hue\}/.test(js) && /border: `2px dashed \$\{hue\}`/.test(js)).toBe(true);
  });
  it('isRoad is spaced', async () => {
    expect((await source('/src/render/terrainRoads.js')).includes('const isRoad = (world')).toBe(true);
  });
});
