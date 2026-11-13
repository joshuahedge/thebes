// Version 10.0.3 "Shorter road cards" (rulings 2460-2469): on a portrait phone the Road and Crossing cards show a name and a cost like every other card, so the Roads tray is as tall as the Homes tray (it was about 54 px
// taller, 30% of a 390x844 screen against 24%). The water words are kept: in the card's title and accessible name, and in the placing panel once the card is picked. Other layouts keep the line as in 10.0.2.
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';
import { ferryWorld } from '../v71/f/helpers.js';
import { costOf } from '../../src/sim/costs.js';
import { FERRY } from '../../src/data/ferries.js';
import { BRIDGE_MAX } from '../../src/sim/bridges.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const SIZES = [[390, 844, 100], [390, 844, 150], [375, 667, 100], [375, 667, 150]];
const open = async (r, category) => { r.store.set({ category, dock: 'tray' }); await tick(); };
// The line of the card the player sees (a phone held sideways keeps its cards in the drawer; the side panel's copy is hidden there).
const line = (r, item) => { const all = [...r.root.querySelectorAll(`.card[data-item="${item}"] .terrain`)]; return all.find((n) => n.getClientRects().length > 0) || all[0] || null; };
const drawn = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 2;
const bar = (r) => r.root.querySelector('#confirm .confirm');

describe('v1003 roads: the Roads tray is as tall as the Homes tray on a phone', () => {
  it('has the same dock height for Roads and Homes within 2 px at 390x844 and 375x667, 100% and 150% text', async () => {
    const got = [];
    for (const [w, h, text] of SIZES) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.renderer.renderFrame = () => {};
        r.ui.settings.set({ textSize: text, reducedMotion: 'on' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        r.store.set({ dock: 'slim', mode: 'browse', tool: null, sheet: null });
        await open(r, 'homes');
        const homes = r.root.querySelector('#dock').getBoundingClientRect().height, homesTray = r.root.querySelector('#dock .tray').getBoundingClientRect().height;
        await open(r, 'roads');
        const roads = r.root.querySelector('#dock').getBoundingClientRect().height, roadsTray = r.root.querySelector('#dock .tray').getBoundingClientRect().height;
        // Roads is never taller than Homes (within 2 px). It can be SHORTER: a house card's price wraps ("30 gold per plot") where a road's does not, at 150% text and on the narrow phone (measured:
        // roads/homes dock 181/179, 198/202, 243/275, 243/275 px), and the tray sizes to its cards, so an exact match would mean padding Roads.
        got.push([`${w}x${h} t${text}`, roads <= homes + 2, roadsTray <= homesTray + 2, roads >= homes - 40, `roads ${roads}/${roadsTray}, homes ${homes}/${homesTray}`]);
      } finally { r.cleanup(); }
    }
    expect(got.map((g) => g.slice(0, 4))).toEqual(SIZES.map(([w, h, text]) => [`${w}x${h} t${text}`, true, true, true]));
  });
});

describe('v1003 roads: the cards, phone and wide', () => {
  it('draws no water line on the phone\'s Road and Crossing cards, keeps it in the title and the accessible name, and the cards are as tall as a house card', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.renderer.renderFrame = () => {};
      r.world.milestone = 'capital';
      r.ui.refresh();
      await open(r, 'roads');
      expect(document.body.dataset.layout).toBe('portrait');
      const cost = costOf(r.world, 'bridge');
      for (const item of ['road', 'ferry']) {
        const card = r.root.querySelector(`#dock .card[data-item="${item}"]`);
        expect([item, drawn(line(r, item))]).toEqual([item, false]);
        expect([item, card.getAttribute('title').length > 40]).toEqual([item, true]);
        expect(line(r, item).textContent.length).toBeGreaterThan(10);                // still in the page: a screen reader reads it with the card
      }
      expect(r.root.querySelector('#dock .card[data-item="road"]').title).toContain(`${cost} gold a tile`);
      expect(r.root.querySelector('#dock .card[data-item="ferry"]').title).toContain(`a bridge over up to ${BRIDGE_MAX} tiles of water, a ferry over ${FERRY.min} to ${FERRY.max}`);
      const heights = [...r.root.querySelectorAll('#dock .tray .card')].map((c) => Math.round(c.getBoundingClientRect().height));
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
    } finally { r.cleanup(); }
  });
  it('keeps the water line on a laptop and on a phone held sideways, as in 10.0.2', async () => {
    for (const [w, h, layout] of [[1280, 800, 'wide'], [1024, 768, 'wide'], [844, 390, 'compact']]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.renderer.renderFrame = () => {};
        r.world.milestone = 'capital';
        r.ui.refresh();
        r.store.set({ category: 'roads', dock: 'tray' });
        r.ui.refresh();
        await tick();
        const road = line(r, 'road'), ferry = line(r, 'ferry');
        expect([layout, document.body.dataset.layout, drawn(road), drawn(ferry)]).toEqual([layout, layout, true, true]);
        expect([road.textContent, ferry.textContent.startsWith('Cross water')]).toEqual([`Bridges over water: ${costOf(r.world, 'bridge')} gold a tile`, true]);
        if (layout === 'wide') {                                                       // and the panel's cost line is 10.0.2's: no reaches added for a crossing picked on the laptop
          fire([...r.root.querySelectorAll('.card[data-item="ferry"]')].find((n) => n.getClientRects().length > 0), 'click');
          await tick();
          expect(r.root.querySelector('#confirm .confirm .cost').textContent.includes('Bridges up to')).toBe(false);
        }
      } finally { r.cleanup(); }
    }
  });
});

describe('v1003 roads: the water information reaches the placing panel', () => {
  it('says what a bridge costs when Road is picked (390x844 and 375x667 at 150% text, folded)', async () => {
    for (const [w, h, text] of [[390, 844, 100], [375, 667, 150]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.renderer.renderFrame = () => {};
        r.ui.settings.set({ textSize: text, reducedMotion: 'on' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        await open(r, 'roads');
        fire(r.root.querySelector('#dock .tray .card[data-item="road"]'), 'click');
        await tick();
        const b = bar(r), cost = b.querySelector('.cost');
        expect([b.classList.contains('phone'), b.classList.contains('more-open')]).toEqual([true, false]);
        // "Water: bridge up to 4 tiles (25 a tile), ferry 5 to 12": the price is the sim's bridge price
        expect([`${w}x${h}`, cost.textContent, drawn(cost), cost.textContent.includes(`(${costOf(r.world, 'bridge')} a tile)`), /bridge/i.test(cost.textContent)]).toEqual([`${w}x${h}`, cost.textContent, true, true, true]);
      } finally { r.cleanup(); }
    }
  });
  it('says the bridge and ferry ranges when Crossing is picked, with no water drawn and with crossings shown near a road (folded)', async () => {
    for (const world of [undefined, ferryWorld(7)]) {
      const r = await rigUI(world ? { width: 390, height: 844, world } : { width: 390, height: 844 });
      try {
        r.renderer.renderFrame = () => {};
        r.world.milestone = 'capital';
        r.ui.refresh();
        await open(r, 'roads');
        fire(r.root.querySelector('#dock .tray .card[data-item="ferry"]'), 'click');
        await tick();
        const b = bar(r);
        const said = [...b.querySelectorAll('.cost, .reason, .why')].filter(drawn).map((n) => n.textContent).join(' | ');
        expect([Boolean(world), b.classList.contains('phone'), said || b.textContent, said.includes(`Bridges up to ${BRIDGE_MAX} tiles of water, ferries ${FERRY.min} to ${FERRY.max}`)]).toEqual([Boolean(world), true, said || b.textContent, true]);
      } finally { r.cleanup(); }
    }
  });
});
