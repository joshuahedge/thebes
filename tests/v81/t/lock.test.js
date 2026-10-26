// Version 8.1 Track T (ruling 1200): the lesson's lock and dim, the contract Tracks B and D build against. A control carries data-lock="<id>"; lockTo(allowed) dims every other one
// (data-locked, aria-disabled), refuses a press, a click, Enter or Space on it (and a game key for it), and says which through onRefused; a re-drawn control is marked at once;
// unlock() clears it all. Until B and D land, today's controls are given the same ids (the bridge), so the 8.0 interface locks as it stands.
import { describe, it, expect } from '../../harness.js';
import { lockTo, unlock, isLocked, lockIdsOf } from '../../../src/ui/v81/lessonLock.js';
import { mount, fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const settle = () => new Promise((r) => setTimeout(r, 0));   // a MutationObserver's callback runs as a microtask after the change

function bar() {
  const m = mount(`
    <button data-lock="stat-gold" class="gold">Gold</button>
    <button data-lock="speed" class="speed"><span class="inner">Play</span></button>
    <button data-lock="tray-cat-roads tray-cat-homes" class="two">Both</button>
    <div class="tray"><button data-lock="tray-item-road" class="road">Road</button><button data-lock="tray-item-house" class="house">Plots</button></div>
    <button class="free">No lock</button>`);
  return m;
}

describe('v81 t lock: dims and refuses what the step does not use', () => {
  it('marks every control none of whose ids is allowed, and leaves the allowed and the unmarked alone', () => {
    const m = bar();
    try {
      lockTo(['speed', 'tray-item-road', 'tray-cat-homes'], { root: m.root });
      const locked = (sel) => m.root.querySelector(sel).hasAttribute('data-locked');
      expect([locked('.gold'), locked('.speed'), locked('.two'), locked('.road'), locked('.house'), locked('.free')]).toEqual([true, false, false, false, true, false]);
      expect([m.root.querySelector('.gold').getAttribute('aria-disabled'), m.root.querySelector('.speed').getAttribute('aria-disabled')]).toEqual(['true', null]);
      expect(lockIdsOf(m.root.querySelector('.two'))).toEqual(['tray-cat-roads', 'tray-cat-homes']);
      lockTo(['stat-gold'], { root: m.root });                                               // called again: what is allowed changes
      expect([locked('.gold'), locked('.speed')]).toEqual([false, true]);
    } finally { unlock(); m.cleanup(); }
  });

  it('refuses a press and a click on a dimmed control (and on what is inside it), says which once, and lets an allowed one work', () => {
    const m = bar();
    const refused = [], clicked = [];
    for (const b of m.root.querySelectorAll('button')) b.addEventListener('click', () => clicked.push(b.className));
    try {
      lockTo(['tray-item-road'], { root: m.root, onRefused: (id, node) => refused.push([id, node.className]) });
      const inner = m.root.querySelector('.speed .inner');
      const down = fire(inner, 'pointerdown');
      const click = fire(inner, 'click');
      expect([down.defaultPrevented, click.defaultPrevented, clicked, refused]).toEqual([false, true, [], [['speed', 'speed']]]);   // the press is stopped, not prevented (a tray still scrolls)
      fire(m.root.querySelector('.road'), 'click');
      expect([clicked, refused.length]).toEqual([['road'], 1]);
      fire(m.root.querySelector('.free'), 'click');
      expect(clicked).toEqual(['road', 'free']);
    } finally { unlock(); m.cleanup(); }
  });

  it('refuses Enter and Space on a dimmed control, and a game key for a dimmed control (the minimap, the layers, the clock, a category); the view keys always work', () => {
    const m = bar();
    const refused = [];
    try {
      lockTo(['tray-cat-roads'], { root: m.root, onRefused: (id) => refused.push(id) });
      expect(key(m.root.querySelector('.gold'), 'Enter').defaultPrevented).toBe(true);
      expect(key(m.root.querySelector('.gold'), ' ').defaultPrevented).toBe(true);
      for (const k of ['m', 'o', ' ', ']', '2']) expect([k, key(m.root, k).defaultPrevented]).toEqual([k, true]);
      expect([key(m.root, '1').defaultPrevented, key(m.root, 'ArrowLeft').defaultPrevented, key(m.root, '+').defaultPrevented]).toEqual([false, false, false]);   // roads is allowed; the view's keys are never locked
      expect(refused).toEqual(['stat-gold', 'stat-gold', 'minimap', 'layers', 'speed', 'speed', 'tray-cat-homes']);
    } finally { unlock(); m.cleanup(); }
  });

  it('marks a control drawn afresh at once, and unlock() clears every mark and stops refusing', async () => {
    const m = bar();
    const clicked = [];
    try {
      lockTo(['speed'], { root: m.root });
      const card = document.createElement('button');
      card.setAttribute('data-lock', 'tray-item-well');
      card.addEventListener('click', () => clicked.push('well'));
      m.root.querySelector('.tray').append(card);                                            // the tray re-drawn
      await settle();
      expect([card.hasAttribute('data-locked'), isLocked()]).toEqual([true, true]);
      unlock();
      expect([m.root.querySelectorAll('[data-locked]').length, m.root.querySelectorAll('[aria-disabled]').length, isLocked()]).toEqual([0, 0, false]);
      fire(card, 'click');
      expect(clicked).toEqual(['well']);
    } finally { unlock(); m.cleanup(); }
  });

  it('gives today\'s top bar, tray, corners and menu their ids until Tracks B and D carry their own (the bridge), and a control\'s own data-lock wins', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set({ dock: 'tray', category: 'homes' });
      r.frame();
      lockTo(['menu', 'tray-cat-homes', 'tray-item-house'], { root: document.body });
      const at = (sel) => r.root.querySelector(sel);
      const ids = (sel) => lockIdsOf(at(sel));
      expect([ids('#dock .cat[data-category="roads"]'), ids('#topbar .menu'), ids('#corners .overlay-button'), ids('#corners .minimap-button')]).toEqual([['tray-cat-roads'], ['menu'], ['layers'], ['minimap']]);
      expect([at('#dock .cat[data-category="roads"]').hasAttribute('data-locked'), at('#dock .cat[data-category="homes"]').hasAttribute('data-locked'), at('#topbar .menu').hasAttribute('data-locked')]).toEqual([true, false, false]);
      expect([at('#topbar .stats').hasAttribute('data-locked'), at('#corners .overlay-button').hasAttribute('data-locked')]).toEqual([true, true]);
      const house = at('#dock .card[data-item="house"]');
      if (house) expect(house.hasAttribute('data-locked')).toBe(false);
      at('#topbar .menu').setAttribute('data-lock', 'stat-gold');                             // a control that carries its own id is read from it alone
      await settle();
      expect([ids('#topbar .menu'), at('#topbar .menu').hasAttribute('data-locked')]).toEqual([['stat-gold'], true]);
      at('#topbar .menu').removeAttribute('data-lock');
      unlock();
      expect(r.root.querySelectorAll('[data-lock-bridge], [data-locked]').length).toBe(0);
    } finally { unlock(); r.cleanup(); }
  });
});
