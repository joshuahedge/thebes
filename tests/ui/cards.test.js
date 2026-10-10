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
    expect(cardInfo(w, 'well')).toEqual({ item: 'well', name: 'Well', cost: BUILDINGS.well.cost, costText: `${BUILDINGS.well.cost} gold`, affordable: true, locked: false, lockText: '' });
    expect(cardInfo(w, 'temple').affordable).toBe(false);
    expect(cardInfo(w, 'road').costText).toBe(`${ECONOMY.roadCost} gold per tile`);
    expect(cardInfo(w, 'house').costText).toBe(`${BUILDINGS.house.cost} gold per plot`);
    expect(cardInfo(w, 'demolish').costText).toBe('Refunds a quarter');
    expect(activeItemOf({ kind: 'building', type: 'temple' })).toBe('temple');
    expect(activeItemOf({ kind: 'houses' })).toBe('house');
    expect(activeItemOf(null)).toBe(null);
  });
  it('renders a category as labelled card buttons and reports picks', () => {
    const { root, cleanup } = mount();
    const w = makeTestWorld({ gold: -400 });
    const picked = [];
    const buttons = renderCards(root, { world: w, category: 'services', activeItem: 'well', onPick: (i) => picked.push(i) });
    expect(buttons.length).toBe(3);
    expect(buttons[0].querySelector('.name').textContent).toBe('Well');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[2].classList.contains('unaffordable')).toBe(true);
    fire(buttons[1], 'click');
    expect(picked).toEqual(['bazaar']);
    renderCards(root, { world: w, category: 'industry', activeItem: null, onPick: () => {} });
    expect(root.querySelector('.empty').textContent).toBe('Coming later');
    cleanup();
  });
});
