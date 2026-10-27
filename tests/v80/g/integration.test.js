// Version 8.0 integration (rulings 1175-1179): the three tracks (V the look, U menus and words, N messages, placing and the lesson) were built apart; these tests hold the places where they meet.
// Skip wears V's tertiary style at 44 px; N's lit-card selector cannot restyle another surface's cards; the chosen Straight is a quiet teal ring, not a wide bold button; the advice dot is teal;
// no player-facing "Settings" is left; only a destructive confirm is coral; the tray's Show is tertiary and a pinned Open is the secondary; Options' Back is not clipped on a computer.
import { describe, it, expect } from '../../harness.js';
import { rigUI, mountShell } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { contrastIn } from '../../helpers/contrast.js';
import { createLessonCard } from '../../../src/ui/lessonCard.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { TOKENS } from '../../../src/ui/theme.js';
import { LOOK_TOKENS, cssRgb } from '../../stage4/look/lookTokens.js';
import * as TEXT from '../../../src/ui/text.js';
import { TRAY_TEXT, D2_TEXT } from '../../../src/ui/text.js';
import { igniteBuilding } from '../../../src/sim/fire.js';
import { housesOf } from '../../../src/sim/world.js';
import { pageAt, cardOf, frame } from '../../v711/lessonPage.js';
import { eventWorld, offer, YEAR } from '../../v70/e/helpers.js';

const LAPIS = cssRgb(LOOK_TOKENS.lapis), CORAL = cssRgb(TOKENS.coralText), PARCHMENT = cssRgb(TOKENS.parchment), TEAL = cssRgb(TOKENS.teal), TEAL_SOFT = cssRgb(TOKENS.tealSoft);
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const cs = (n, pseudo) => getComputedStyle(n, pseudo);
const probe = (parent, cls, text = 'Go') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; parent.append(b); return b; };
const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });

describe('v80 g skip: the lesson card\'s Skip is V\'s tertiary style, 44 px tall', () => {
  it('draws exactly as a plain tertiary button does (clear, lapis, underlined, no outline) and keeps its 44 px box', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const card = createLessonCard({ root: r.root, store: r.store, onGo() {}, onLeave() {}, onSkip() {} });
      card.show({ label: 'Step 1 of 14', words: 'Lay a road from the gate.', goLabel: 'Show me', picture: null, skipOffered: true });
      const skip = r.root.querySelector('.lesson-card .lc-skip');
      const ref = probe(r.root.querySelector('#ui'), 'tertiary');
      const look = (n) => { const s = cs(n); return [s.backgroundColor, s.color, s.textDecorationLine, s.borderTopColor, s.boxShadow]; };
      expect(skip.classList.contains('tertiary')).toBe(true);
      expect(look(skip)).toEqual(look(ref));
      expect([cs(skip).backgroundColor, cs(skip).color, cs(skip).textDecorationLine]).toEqual([TRANSPARENT, LAPIS, 'underline']);
      expect(skip.getBoundingClientRect().height).toBeGreaterThanOrEqual(43.5);
      ref.remove();
      card.destroy();
    } finally { r.cleanup(); }
  });
});

describe('v80 g cards: the lit-card selector belongs to the build tray', () => {
  it('lights a pressed card inside the tray (a teal tint and a lapis ring) and leaves a pressed .card anywhere else alone', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const tray = r.root.querySelector('#panel .cards');
      const inside = document.createElement('button'); inside.className = 'card'; inside.setAttribute('aria-pressed', 'true'); inside.innerHTML = '<span class="name">Well</span>';
      tray.append(inside);
      const outside = document.createElement('button'); outside.className = 'card'; outside.setAttribute('aria-pressed', 'true'); outside.innerHTML = '<span class="name">Elsewhere</span>';
      r.root.querySelector('#ui').append(outside);
      expect([cs(inside).backgroundColor, cs(inside.querySelector('.name'), '::after').content]).toEqual([TEAL_SOFT, '" ✓"']);
      expect([cs(outside).backgroundColor === TEAL_SOFT, cs(outside.querySelector('.name'), '::after').content]).toEqual([false, 'none']);
      inside.remove(); outside.remove();
    } finally { r.cleanup(); }
  });
});

describe('v80 g straight: the chosen Straight is a quiet teal ring on a button as wide as its words', () => {
  it('on a phone road bar Straight is no wider than a third of the bar, plain weight, ringed in teal, with the tick the only filled button', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      fire(r.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
      fire(r.root.querySelector('#dock .tray .card[data-item="road"]'), 'click');
      r.frame(0);
      const bar = r.root.querySelector('#confirm .confirm');
      const straight = bar.querySelector('.route-pick[aria-pressed="true"]'), route = bar.querySelector('.route-pick[aria-pressed="false"]'), ok = bar.querySelector('.ok');
      expect([straight.dataset.shape, route.dataset.shape]).toEqual(['straight', 'route']);
      const w = straight.getBoundingClientRect(), b = bar.getBoundingClientRect();
      expect([w.width <= b.width / 3, w.width >= 43.5, w.height >= 43.5]).toEqual([true, true, true]);
      expect([cs(straight).fontWeight, cs(straight).backgroundColor, cs(straight).borderTopColor]).toEqual([cs(route).fontWeight, PARCHMENT, TEAL]);
      expect(cs(straight).boxShadow.includes(TEAL)).toBe(true);                         // the ring
      expect(straight.textContent.startsWith('✓')).toBe(true);                             // and the tick in its words: colour is never the only cue
      expect(cs(ok).backgroundColor).toBe(LAPIS);
      const solid = [...bar.querySelectorAll('button')].filter((x) => x.offsetParent && ![TRANSPARENT, PARCHMENT].includes(cs(x).backgroundColor));
      expect(solid.map((x) => x.className.split(' ')[0])).toEqual(['ok']);
      expect(contrastIn(straight, straight)).toBeGreaterThanOrEqual(4.5);
    } finally { r.cleanup(); }
  });
});

describe('v80 g advice dot: teal, because red means only cannot', () => {
  it('is the teal of "good", not coral', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const dot = r.root.querySelector('#topbar .advice .advice-dot');
      expect([cs(dot).backgroundColor, cs(dot).backgroundColor === CORAL]).toEqual([TEAL, false]);
    } finally { r.cleanup(); }
  });
});

describe('v80 g words: no player-facing "Settings" is left', () => {
  // Every string the interface's own word lists hold, except the sentences that mean a building's copied settings (Build another).
  const OK = [/same settings/i, /copies settings/i, /store settings/i, /settings it copies/i];
  const walk = (v, path, out, seen = new Set()) => {
    if (typeof v === 'string') { if (/\bsettings?\b/i.test(v) && !OK.some((re) => re.test(v))) out.push(`${path}: ${v.slice(0, 80)}`); return; }
    if (typeof v === 'function' || !v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, out, seen);
  };
  it('says Options in the lists text.js exports (How to play\'s keys line and the single-keys note included)', () => {
    const found = [];
    for (const [name, value] of Object.entries(TEXT)) walk(value, name, found);
    expect(found).toEqual([]);
    expect(TEXT.T.settings).toBe('Options');
    expect(TEXT.T.shortcutsOff.includes('Options')).toBe(true);
    expect(JSON.stringify(TEXT.V60_HELP).includes('single keys off in Options')).toBe(true);
  });
});

describe('v80 g confirms: coral only when something is lost', () => {
  it('the lesson\'s skip question and the menu\'s Lesson question wear the primary; Leave, New city and Demolish stay coral', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const ui = s.g().ui;
      const ok = () => s.root.querySelector('#dialog .ok');
      const card = cardOf(s);
      fire(card.querySelector('.lc-skip'), 'click');
      await frame();
      expect([ui.store.get().confirmDialog.destructive, ok().classList.contains('primary'), ok().classList.contains('danger'), cs(ok()).backgroundColor]).toEqual([false, true, false, LAPIS]);
      ui.store.set({ confirmDialog: null });
      fire(s.root.querySelector('#topbar .menu'), 'click');
      await frame();
      fire(s.root.querySelector('#sheet .leave-lesson'), 'click');
      await frame();
      expect([ui.store.get().confirmDialog.destructive, ok().classList.contains('danger'), cs(ok()).backgroundColor]).toEqual([undefined, true, CORAL]);   // Leave the lesson loses the streets: coral
      ui.store.set({ confirmDialog: null });
    } finally { s.cleanup(); }
    const g = await rigUI({ width: 390, height: 844, hooks: { lesson() {}, save: async () => true, exportCity() {} } });
    try {
      const ok = () => g.root.querySelector('#dialog .ok');
      fire(g.root.querySelector('#topbar .menu'), 'click');
      fire(g.root.querySelector('#sheet .menu-lesson'), 'click');
      expect([g.store.get().confirmDialog.text, g.store.get().confirmDialog.destructive, ok().classList.contains('primary'), cs(ok()).backgroundColor]).toEqual([D2_TEXT.menuLessonConfirm, false, true, LAPIS]);
      g.store.set({ confirmDialog: null });
      fire(g.root.querySelector('#sheet .menu-list button:nth-child(2)'), 'click');       // New city: it replaces the saved one
      fire(g.root.querySelector('#sheet .start-city'), 'click');                          // Version 8.2 (ruling 1308): the new-city card first; its Start asks
      expect([ok().classList.contains('danger'), cs(ok()).backgroundColor]).toEqual([true, CORAL]);
      g.store.set({ confirmDialog: null });
    } finally { g.cleanup(); }
  });
});

describe('v80 g tray rows: Show is tertiary, a pinned Open is the secondary that stands out', () => {
  const rows = (r) => [...r.root.querySelectorAll('#sheet .tray-item')];
  const box = (n) => { const q = n.getBoundingClientRect(); return [q.width >= 43.5, q.height >= 43.5]; };
  it('a plain row\'s and a pinned fire\'s Show are plain underlined words at 44 px', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'houses' }); r.ui.placement.toggleTile(20, 9); r.ui.placement.confirm();
      expect(igniteBuilding(r.world, housesOf(r.world)[0].id)).toBeTruthy();
      r.ui.refresh();
      fire(r.root.querySelector('#topbar .advice'), 'click');
      const all = rows(r), pinned = all[0], plain = all.find((x) => x.querySelector('.tray-go') && !x.classList.contains('pinned'));
      for (const row of [pinned, plain]) {
        const go = row.querySelector('.tray-go');
        expect([row.className, go.textContent, go.classList.contains('tertiary'), go.classList.contains('secondary'), cs(go).textDecorationLine, cs(go).backgroundColor, cs(go).color, box(go)]).toEqual([row.className, TRAY_TEXT.showMe, true, false, 'underline', TRANSPARENT, LAPIS, [true, true]]);
        expect(contrastIn(go, row)).toBeGreaterThanOrEqual(4.5);
      }
    } finally { r.cleanup(); }
  });
  it('the Open on a pinned event is the outlined secondary', async () => {
    const w = eventWorld({ gold: 5000 });
    w.day = 3 * YEAR; w.speed = 0;
    offer(w, 'envoy');
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      fire(r.root.querySelector('#topbar .advice'), 'click');
      const go = rows(r)[0].querySelector('.tray-go');
      expect([go.textContent, go.classList.contains('secondary'), go.classList.contains('tertiary'), cs(go).borderTopColor, parseFloat(cs(go).borderTopWidth), cs(go).textDecorationLine, box(go)]).toEqual([TRAY_TEXT.open, true, false, LAPIS, 2, 'none', [true, true]]);
      expect(contrastIn(go, rows(r)[0])).toBeGreaterThanOrEqual(4.5);
    } finally { r.cleanup(); }
  });
});

describe('v80 g options: Back is not clipped at the foot', () => {
  it('shows the whole Back button inside the card, with nothing to scroll to reach it on a computer, and still inside it on a phone', async () => {
    for (const [w, h, size, scrolls] of [[1280, 800, 100, false], [390, 844, 100, true], [375, 667, 150, true]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const container = shell.root.querySelector('#title');
      const settings = createSettings({ storage: memory(), root: shell.root });
      const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, hooks: { exportCity() {} } });
      const tc = createTitleCard({ container, hasSave: true, onContinue() {}, onNewCity() {}, renderSettings: (body) => menus.settings(body, { close() {} }), screen: () => ({ width: w, height: h }) });
      try {
        const at = `${w}x${h} at ${size}%`;
        const cardEl = container.querySelector('.title-card');
        fire(cardEl.querySelector('.title-settings'), 'click');
        const back = cardEl.querySelector('.actions button'), c = cardEl.getBoundingClientRect(), b = back.getBoundingClientRect(), outer = shell.root.getBoundingClientRect();
        expect([at, back.textContent, b.height >= 43.5, b.top >= c.top, b.bottom <= c.bottom - 6, c.bottom <= outer.bottom + 0.5]).toEqual([at, 'Back', true, true, true, true]);
        if (!scrolls) expect([at, cardEl.scrollHeight <= cardEl.clientHeight + 1]).toEqual([at, true]);
        else {
          back.scrollIntoView({ block: 'nearest' });
          const after = back.getBoundingClientRect(), cc = cardEl.getBoundingClientRect();
          expect([at, after.bottom <= cc.bottom + 0.5]).toEqual([at, true]);
        }
      } finally { tc.destroy(); settings.destroy(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
  });
});

describe('v80 g what\'s new: the 8.0 entry says what was built', () => {
  it('mentions the tray, the lit card, Leave in the menu, the quiet Skip, amber and the coral rule, and nothing that was not built', async () => {
    const { RELEASES } = await import('../../../src/data/releases.js');
    const text = [...RELEASES[4].new, ...RELEASES[4].fixed].join(' ').toLowerCase();
    for (const word of ['last 30', 'lit in the tray', 'leave the lesson', 'skip, i\'ve played before', 'amber', 'coral button', 'demolish']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const word of ['drag', 'scribe', 'ipi', 'music', 'chapter']) expect([word, text.includes(word)]).toEqual([word, false]);   // 8.1 and 8.2 things
  });
});
