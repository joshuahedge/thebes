import { describe, it, expect } from '../harness.js';
import { cardInfo, renderCards, activeItemOf } from '../../src/ui/cards.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui cards', () => {
  it('describes every item with its cost and state', () => {
    // the treasury may run to the debt floor (-500): a 30-gold well still fits, a 120-gold temple does not
    const w = makeTestWorld({ gold: -400 });
    expect(cardInfo(w, 'well')).toEqual({ item: 'well', name: 'Well', cost: BUILDINGS.well.cost, costText: `${BUILDINGS.well.cost} gold`, affordable: true, locked: false, lockText: '', isNew: false, terrainText: '' });
    expect(cardInfo(w, 'temple').affordable).toBe(false);
    expect(cardInfo(w, 'road').costText).toBe(`${ECONOMY.roadCost} gold per tile`);
    expect(cardInfo(w, 'house').costText).toBe(`${BUILDINGS.house.cost} gold per plot`);
    expect(cardInfo(w, 'demolish').costText).toBe('Refunds a quarter');
    expect(activeItemOf({ kind: 'building', type: 'temple' })).toBe('temple');
    expect(activeItemOf({ kind: 'houses' })).toBe('house');
    expect(activeItemOf(null)).toBe(null);
  });
  it('says what ground a farm or a mine needs on its card, and nothing on any other card (placement review P15)', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax'].map((t) => cardInfo(w, t).terrainText)).toEqual(Array(4).fill('Fertile land'));
    expect(cardInfo(w, 'gem_mine').terrainText).toBe('Rocky ground');
    expect(cardInfo(w, 'clay_pit').terrainText).toBe('Clay ground');                                  // Stage 4.5, ruling 312
    expect(['well', 'granary', 'road', 'house', 'demolish'].map((t) => cardInfo(w, t).terrainText)).toEqual(Array(5).fill(''));
    const { root, cleanup } = mount();
    renderCards(root, { world: w, category: 'food', activeItem: null, onPick: () => {} });
    const farm = root.querySelector('.card[data-item="farm_grain"]');
    expect(farm.querySelector('.terrain').textContent).toBe('Fertile land');
    expect(root.querySelector('.card[data-item="granary"] .terrain')).toBe(null);
    cleanup();
  });
  it('renders a category as labelled card buttons and reports picks', () => {
    const { root, cleanup } = mount();
    const w = makeTestWorld({ gold: -400 });
    const picked = [];
    const buttons = renderCards(root, { world: w, category: 'services', activeItem: 'well', onPick: (i) => picked.push(i) });
    expect(buttons.length).toBe(6);                                  // the booth and the palace come with Town: shown, locked; the firehouse with the Village
    expect(buttons[0].querySelector('.name').textContent).toBe('Well');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[2].classList.contains('unaffordable')).toBe(true);
    fire(buttons[1], 'click');
    expect(picked).toEqual(['bazaar']);
    renderCards(root, { world: w, category: 'defence', activeItem: null, onPick: () => {} });
    expect(root.querySelector('.empty').textContent).toBe('Coming later');
    cleanup();
  });
  it('keeps keyboard focus on the same card when the grid rebuilds', () => {
    const { root, cleanup } = mount();
    const w = makeTestWorld({ gold: 100000 });
    renderCards(root, { world: w, category: 'services', activeItem: null, onPick: () => {} });
    root.querySelectorAll('.card')[1].focus();
    expect(document.activeElement.dataset.item).toBe('bazaar');
    renderCards(root, { world: w, category: 'services', activeItem: 'bazaar', onPick: () => {} });
    expect(document.activeElement.dataset.item).toBe('bazaar');
    expect(document.activeElement.getAttribute('aria-pressed')).toBe('true');
    cleanup();
  });
});
