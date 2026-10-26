// Version 8.1 "The vizier", integration (rulings 1260-1269): the seams between the three tracks. The lesson's lock (Track T) reads the ids the top bar (Track B) and the tray (Track D) carry,
// with no bridge left; every card a lesson step points at is in the layered tray, in sight, live and ringed; a card dragged on in the lesson keeps the lock and counts as a tap does; the
// month step lights B's gold; Ipi speaks in one place at a time and the docked bubble is read whole on a phone; the tray's lines show in the real bubble, docked; and the reviewers' minors.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, LESSON_PLACES } from '../../../src/data/lesson.js';
import { CATEGORIES, GHOST_FINGER_OFFSET_PX } from '../../../src/data/ui.js';
import { buildingAt, housesOf } from '../../../src/sim/world.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { unlockedItems, trayCategories } from '../../../src/ui/cards.js';
import { T } from '../../../src/ui/text.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { TRAY_V81_TEXT, firstSentence } from '../../../src/ui/v81/trayText.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { say, bubbleOf } from '../../../src/ui/v81/scribe.js';
import { setSay } from '../../../src/ui/v81/ipiSays.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { dockCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const shown = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden' && n.getBoundingClientRect().width > 0;
const lockOf = (root, id) => [...root.querySelectorAll('[data-lock]')].filter((n) => n.getAttribute('data-lock').split(/\s+/).includes(id) && shown(n));
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
const STATS = ['stat-gold', 'stat-people', 'stat-mood', 'stat-date', 'stat-score'];

describe('v81 i lock: every id in the contract is a real control in the merged game (ruling 1260)', () => {
  for (const [w, h, more] of [[390, 844, ['layers', 'minimap']], [1280, 800, ['layers', 'minimap']]]) {
    it(`at ${w}x${h}: the stats, the papyrus, the speed, the menu, every category and card, the Layers and the Map`, async () => {
      const s = await pageAt('month', { width: w, height: h });
      try {
        const g = s.g();
        dockCard(s.root);
        await frame();
        const missing = [...STATS, 'papyrus', 'speed', 'menu', ...more].filter((id) => lockOf(s.root, id).length === 0);
        for (const c of trayCategories(g.world)) {
          if (lockOf(s.root, `tray-cat-${c.id}`).length === 0) missing.push(`tray-cat-${c.id}`);
          g.ui.store.set({ dock: 'tray', category: c.id });
          await frame();
          for (const item of unlockedItems(g.world, c.id)) if (lockOf(s.root, `tray-item-${item}`).length === 0) missing.push(`tray-item-${item}`);
        }
        expect([`${w}x${h}`, missing]).toEqual([`${w}x${h}`, []]);
        expect(s.root.querySelectorAll('[data-lock-bridge]').length).toBe(0);                // the bridge is gone
      } finally { s.cleanup(); }
    });
  }
});

describe('v81 i lesson: the layered tray holds every card a step points at', () => {
  it('each step\'s card is in the open tray, in sight, live and ringed (the only ringed card), with no More; a tap on it takes its tool', async () => {
    const wrong = [];
    for (const step of LESSON_STEPS.filter((x) => x.show)) {
      const s = await pageAt(step.id, { width: 390, height: 844 });
      try {
        const g = s.g();
        dockCard(s.root);                                                                     // the card's Show me starts the tool (the phone's tray gives way to the bar)
        await frame();
        g.ui.placement.cancel();                                                              // the player puts it away and opens the tray at the step's category
        g.ui.store.set({ dock: 'tray', category: step.show.category });
        await frame();
        const tray = s.root.querySelector('#dock .tray'), card = tray && tray.querySelector(`[data-lock="tray-item-${step.show.item}"]`);
        const t = tray.getBoundingClientRect(), c = card ? card.getBoundingClientRect() : null;
        const ringed = [...s.root.querySelectorAll('#dock .card.lesson-pulse')].map((n) => n.dataset.item);
        const facts = [Boolean(card), card && shown(card), c && c.left >= t.left - 1 && c.right <= t.right + 1, card && card.hasAttribute('data-locked'), ringed, tray.querySelectorAll('.more-card').length];
        if (JSON.stringify(facts) !== JSON.stringify([true, true, true, false, [step.show.item], 0])) wrong.push(`${step.id}: ${JSON.stringify(facts)}`);
        fire(card, 'click');
        const tool = g.ui.store.get().tool;
        const took = Boolean(tool) && (step.show.item === 'road' ? tool.kind === 'road' : step.show.item === 'house' ? tool.kind === 'houses' : tool.type === step.show.item);
        if (!took) wrong.push(`${step.id}: a tap on the card did not take its tool (${JSON.stringify(tool)})`);
      } finally { s.cleanup(); }
    }
    expect(wrong).toEqual([]);
  });
});

// A finger dragging a card in the lesson's page: the press, a lead up off the dock's row, then the tile (a building's ghost rides GHOST_FINGER_OFFSET_PX above the finger), and the lift.
function lessonDrag(s) {
  const g = s.g(), canvas = s.root.querySelector('#map');
  const base = { pointerId: 11, pointerType: 'touch', button: 0, isPrimary: true };
  let at = null;
  const surface = () => document.querySelector('.card-drag-surface') || document;
  return {
    press(card) { const b = card.getBoundingClientRect(); at = { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }; fire(card, 'pointerdown', { ...base, ...at, buttons: 1 }); },
    lead() { at = { clientX: at.clientX, clientY: at.clientY - 14 }; fire(document, 'pointermove', { ...base, ...at, buttons: 1 }); },
    tile(tx, ty) {
      const [sx, sy] = tileToScreen(g.cam, { width: 390, height: 844 }, tx + 0.5, ty + 0.5), r = canvas.getBoundingClientRect();
      at = { clientX: r.left + sx, clientY: r.top + sy + GHOST_FINGER_OFFSET_PX };
      fire(surface(), 'pointermove', { ...base, ...at, buttons: 1 });
    },
    lift() { fire(surface(), 'pointerup', { ...base, ...at, buttons: 0 }); },
  };
}

describe('v81 i lesson: drag to build keeps the lock and counts as a tap does', () => {
  it('a dimmed card cannot be dragged; the well dragged onto its place does the Water step and the lesson moves on', async () => {
    const s = await pageAt('well', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      if (g.ui.cameraControl.cancel) g.ui.cameraControl.cancel();
      g.ui.store.set({ dock: 'tray', category: 'homes' });
      await frame();
      const house = s.root.querySelector('#dock .tray [data-lock="tray-item-house"]');
      expect(house.hasAttribute('data-locked')).toBe(true);
      const d = lessonDrag(s);
      d.press(house); d.lead(); d.tile(20, 42);
      expect([document.querySelectorAll('.card-drag-surface').length, g.ui.store.get().tool]).toEqual([0, null]);   // the lock took the press: no drag, no tool
      d.lift();
      g.ui.store.set({ category: 'services' });
      await frame();
      const well = s.root.querySelector('#dock .tray [data-lock="tray-item-well"]');
      const [x, y] = LESSON_PLACES.well;
      d.press(well); d.lead(); d.tile(x, y);
      expect([document.querySelectorAll('.card-drag-surface').length, g.ui.store.get().ghost]).toEqual([1, { x, y }]);
      d.lift();
      await frame();
      const b = buildingAt(g.world, x, y);
      expect([b && b.type, s.root.querySelector('#lesson').dataset.step]).toEqual(['well', 'families']);
    } finally { s.cleanup(); }
  });
});

describe('v81 i lesson: the month step lights the top bar\'s gold', () => {
  it('the gold is ringed and live, the other stats are dimmed, and the map\'s ring and camera stay put (the step points at no place)', async () => {
    const s = await pageAt('month', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      const was = { x: g.cam.x, y: g.cam.y, zoom: g.cam.zoom };
      await frame();
      const gold = s.root.querySelector('#topbar .stat.gold');
      expect([gold.classList.contains('lesson-lit'), gold.hasAttribute('data-locked'), getComputedStyle(gold).outlineStyle]).toEqual([true, false, 'solid']);
      expect(['people', 'mood', 'date', 'score'].map((k) => s.root.querySelector(`#topbar .stat.${k}`).hasAttribute('data-locked'))).toEqual([true, true, true, true]);
      expect([s.root.querySelector('.lesson-ring').hidden, g.cam.x, g.cam.y, g.cam.zoom]).toEqual([true, was.x, was.y, was.zoom]);
      expect(s.root.querySelectorAll('.lesson-lit').length).toBe(1);
    } finally { s.cleanup(); }
  });
});

describe('v81 i lesson: after the month card, keyboard focus goes to the gold, not the menu', () => {
  it('the card\'s button docks the step and focus lands on the gold stat (its own target); the menu button never takes it', async () => {
    const s = await pageAt('month', { width: 390, height: 844 });
    try {
      const gold = s.root.querySelector('#topbar .stat.gold');
      expect(dockCard(s.root)).toBe(true);
      await frame();
      expect([document.activeElement === gold, document.activeElement === s.root.querySelector('#topbar .menu')]).toEqual([true, false]);
    } finally { s.cleanup(); }
  });
  it('a step whose target is no button (the speed bar) leaves focus off the menu too', async () => {
    const s = await pageAt('families', { width: 390, height: 844 });
    try {
      expect(dockCard(s.root)).toBe(true);
      await frame();
      expect(document.activeElement === s.root.querySelector('#topbar .menu')).toBe(false);
    } finally { s.cleanup(); }
  });
});

describe('v81 i Ipi: one place at a time, read whole', () => {
  it('a tap on a dimmed control while a line of Ipi\'s floats: the floating line goes and the refusal takes the docked bubble, then the why comes back', async () => {
    const s = await pageAt('homes', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      g.ui.store.set({ dock: 'tray', category: 'homes' });
      await frame();
      say('A line of my own.', { ms: 0 });
      fire(s.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
      const row = s.root.querySelector('#lesson');
      expect([bubbleOf().hidden, row.classList.contains('refused'), row.querySelector('.beat-line').textContent, shown(row.querySelector('.ipi-why'))]).toEqual([true, true, V81T_TEXT.refused('homes'), false]);
      await new Promise((r) => setTimeout(r, 2900));
      expect([row.classList.contains('refused'), shown(row.querySelector('.ipi-why'))]).toEqual([false, true]);
    } finally { s.cleanup(); }
  });

  it('on an upright phone at 100% text every step\'s docked bubble shows its whole why and do, in two type sizes', async () => {
    const wrong = [];
    for (const step of LESSON_STEPS) {
      const s = await pageAt(step.id, { width: 390, height: 844 });
      try {
        dockCard(s.root);
        await frame();
        s.g().ui.placement.cancel();
        await frame();
        const row = s.root.querySelector('#lesson'), body = row.querySelector('.body');
        const cut = body.scrollHeight > body.clientHeight + 1;
        const sizes = new Set([...row.querySelectorAll('.body > span, .body > button')].filter((n) => shown(n) && n.textContent.trim()).map((n) => getComputedStyle(n).fontSize));
        if (cut || sizes.size > 2) wrong.push(`${step.id}: cut ${cut}, sizes ${[...sizes].join(' ')}`);
      } finally { s.cleanup(); }
    }
    expect(wrong).toEqual([]);
  });

  it('at 150% text the words are one size too (the do, the why and a reaction), with the small label and More', async () => {
    const s = await pageAt('largeplot', { width: 375, height: 667, textSize: 150 });
    try {
      dockCard(s.root);
      await frame();
      const row = s.root.querySelector('#lesson');
      expect(getComputedStyle(row.querySelector('.ipi-why')).fontSize).toBe(getComputedStyle(row.querySelector('.text')).fontSize);
    } finally { s.cleanup(); }
  });
});

// A city whose advice has a build to suggest (homes short of water), as Track D's tests make it.
function adviceCity() {
  const w = makeTestWorld({ gold: 5000 });
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 20, 9, { tier: 1, residents: 4 });
  addRaw(w, 'house', 21, 9, { tier: 1, residents: 4 });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11);
  staffAll(w);
  return w;
}

describe('v81 i the tray\'s lines in Ipi\'s real bubble (rulings 1262, 1265)', () => {
  it('an unlock line shows in the real bubble, docked under the top bar (the guidance place), never over the tray', async () => {
    setSay(say);
    const w = adviceCity();
    w.guide.on = false;                                                                      // Ipi waits while the guide speaks
    const r = await rigUI({ world: w, width: 390, height: 844, hooks: { flatTray: false } });
    try {
      r.ui.refresh();
      r.world.milestone = 'town';
      r.ui.refresh();
      const b = bubbleOf(), dock = r.root.querySelector('#dock').getBoundingClientRect(), bar = r.root.querySelector('#topbar').getBoundingClientRect();
      const box = b.getBoundingClientRect();
      expect([b.hidden, b.classList.contains('pinned'), b.parentElement.id, b.textContent.startsWith('The king grants you')]).toEqual([false, false, 'under-bar', true]);
      expect([box.top >= bar.bottom - 1, box.top - bar.bottom < 24, box.bottom < dock.top]).toEqual([true, true, true]);
    } finally { r.cleanup(); setSay(null); }
  });
  it('a suggestion line is never more than two sentences, whatever the advice says', () => {
    const line = TRAY_V81_TEXT.suggestLine('Well', 'Three homes are held back by water. A well reaches 2.5 tiles. Build one near them');
    expect([sentences(line).length, line]).toEqual([2, 'Try the Well. Three homes are held back by water.']);
    expect([firstSentence('One thing'), firstSentence('One thing.'), firstSentence('Costs 2.5 gold. More')]).toEqual(['One thing', 'One thing', 'Costs 2.5 gold']);
  });
  it('never says the forbidden word in any of the game\'s words files (ruling 379\'s copy rule, ruling 1216)', async () => {
    const list = await (await fetch('/sw-files.js')).text();
    const files = [...new Set([...list.matchAll(/'\.\/(src\/ui\/[^']*Text\.js)'/g)].map((m) => `/${m[1]}`).concat(['/src/ui/text.js']))];
    expect(files.length >= 10 && files.includes('/src/ui/v81/trayText.js')).toBe(true);
    const bad = [];
    for (const f of files) if (/pharaoh/i.test(await (await fetch(f)).text())) bad.push(f);
    expect(bad).toEqual([]);
  });
});

describe('v81 i reviewers\' minors', () => {
  it('the gold explainer\'s one action is about gold and says Show me (ruling 1267)', () => {
    const w = makeTestWorld({ gold: 2000 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 12, 11, { tier: 3, residents: 0 });
    addRaw(w, 'granary', 14, 11, { store: { grain: 30 } });
    addRaw(w, 'bazaar', 17, 11, { store: { grain: 6 } });
    staffAll(w);
    for (const h of housesOf(w)) h.residents = 0;                                           // a month at a loss
    let picked = null;
    const e = explainStat(w, 'gold', { selectBuilding: (id) => { picked = id; }, advice: { fix() {}, showMe() {} }, openSummary() {} });
    expect([e.action.label, e.action.kind, e.action.aria.startsWith(T.showMe)]).toEqual([T.showMe, 'select', true]);
    e.action.run();
    expect(['granary', 'bazaar'].includes(w.buildings[picked].type)).toBe(true);
  });

  it('the papyrus\'s tabs name their panel and the panel names its tab (ruling 1268)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      for (const [sheet, active] of [['advice', 'messages'], ['summary', 'city']]) {
        r.store.set(openSheet(r.store.get(), sheet));
        const tab = r.root.querySelector(`#sheet .sheet-tab[data-tab="${active}"]`);
        if (!tab) continue;                                                                  // the tabs come with the first home
        const panel = r.root.querySelector(`#${tab.getAttribute('aria-controls')}`);
        expect([sheet, tab.getAttribute('aria-selected'), panel && panel.getAttribute('role'), panel && panel.getAttribute('aria-labelledby'), panel && panel.children.length > 0]).toEqual([sheet, 'true', 'tabpanel', tab.id, true]);
      }
    } finally { r.cleanup(); }
  });

  it('on the wide panel More stays in sight at the grid\'s foot while the cards overflow (ruling 1269)', async () => {
    const w = uiWorld(); w.milestone = 'capital';
    const r = await rigUI({ world: w, width: 1280, height: 600, hooks: { flatTray: false } });
    try {
      const cat = CATEGORIES.find((c) => unlockedItems(w, c.id).length > 6);
      r.store.set({ category: cat.id });
      r.frame();
      fire(r.root.querySelector('#panel .more-card'), 'click');                           // open: every card, and Fewer at the end
      r.frame();
      const grid = r.root.querySelector('#panel .cards'), more = r.root.querySelector('#panel .more-card');
      const g = grid.getBoundingClientRect(), m = more.getBoundingClientRect();
      expect([grid.scrollHeight > grid.clientHeight, m.top >= g.top - 1, m.bottom <= g.bottom + 1]).toEqual([true, true, true]);
    } finally { r.cleanup(); }
  });
});
