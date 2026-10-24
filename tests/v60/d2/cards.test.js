// Version 6.0 Track D2 (rulings 760-779): the picture cards remade, and the six new ones at their first moments. Thirteen cards in all: the seven read before a first city, and a Large
// plot, a court demand, a plague, a low Nile, locusts and a raid, each shown alone, once a device, the first time it happens, and every one kept in How to play.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { showPictureCards } from '../../../src/ui/tutorial.js';
import { TUTORIAL_CARDS, INTRO_CARDS, TUTORIAL } from '../../../src/data/tutorial.js';
import { CARDS4_TEXT, DANGER_UI_TEXT, V60_HELP, D2_TEXT } from '../../../src/ui/text.js';
import { MOMENTS, dueCards, createCardMoments, seenKey } from '../../../src/ui/cardMoments.js';
import { lessonWorld, STAGES } from '../../../src/sim/lesson.js';
import { largePlotUnlocked } from '../../../src/sim/largePlots.js';
import { makeBuilding, insertBuilding, createWorld } from '../../../src/sim/world.js';
import { TIERS } from '../../../src/data/housing.js';
import { LARGE_PLOT } from '../../../src/data/largePlots.js';
import { PLAGUE, DROUGHT, CROPS, HARVEST_NOW, GRACE_DAYS } from '../../../src/data/hazards.js';
import { RAIDS } from '../../../src/data/raids.js';
import { devScene } from '../../../src/dev/scenes.js';
import { TUTORIAL_SHOT } from '../../../src/dev/tutorialScenes.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire, startNewCity } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const NEW_IDS = ['large', 'demand', 'plague', 'drought', 'locusts', 'raid'];
const stored = (storage) => JSON.parse(storage.data['thebes.settings'] || '{}');

describe('v60 d2 picture cards: the thirteen', () => {
  it('are the seven intro cards and six more with a first moment each, in order, every one with words, an alt text and a mark kind', () => {
    expect(TUTORIAL_CARDS.length).toBe(14);                                                           // Version 7.0 (Track E) adds the first city event's card after the six (tests/v70/e)
    expect(INTRO_CARDS.map((c) => c.id)).toEqual(['road', 'homes', 'farm', 'food', 'gold', 'goals', 'ahead']);
    expect(TUTORIAL_CARDS.slice(7, 13).map((c) => [c.id, Boolean(c.first), Boolean(MOMENTS[c.first])])).toEqual(NEW_IDS.map((id) => [id, true, true]));
    expect(TUTORIAL_CARDS.slice(13).map((c) => [c.id, c.first, Boolean(MOMENTS[c.first])])).toEqual([['event', 'cityEvent', true]]);
    for (const c of TUTORIAL_CARDS) {
      const w = CARDS4_TEXT.cards[c.id];
      expect([c.id, w.title.length > 0, w.words.length > 20, w.alt.length > 20, w.words.split('. ').length <= 3, c.mark === 'ring' || c.mark === 'arrow']).toEqual([c.id, true, true, true, true, true]);
    }
  });
  it('word what the sim does in the sim\'s own numbers', () => {
    const W = (id) => CARDS4_TEXT.cards[id].words;
    expect(W('large')).toContain(`${LARGE_PLOT.size} by ${LARGE_PLOT.size} tiles`);
    expect(W('large')).toContain(TIERS[LARGE_PLOT.unlockTier].name);                                  // a Townhouse opens the card
    expect(W('large')).toContain(TIERS[LARGE_PLOT.opensTier].name);                                   // a Manor grows in it
    expect(W('plague')).toContain(`${PLAGUE.warnDays / 30} months ahead`);
    expect(W('plague')).toContain(`${PLAGUE.quarantine.months} months`);
    expect(W('drought')).toContain(`${Math.round((1 - DROUGHT.cut) * 100)}%`);
    expect(W('locusts')).toContain(`${DANGER_UI_TEXT.duration(CROPS.warnDays)} ahead`);          // in game months, as the alert's own words say them (the final review)
    expect(W('locusts')).toContain(`${Math.round(HARVEST_NOW.share * 100)}%`);
    expect(W('locusts')).toContain(`${HARVEST_NOW.restDays} days`);                             // a rest is not a deadline, and half a month has no month words
    expect(W('raid')).toContain(`${DANGER_UI_TEXT.duration(RAIDS.warningDays)} ahead`);
    expect(W('raid')).toContain(`${GRACE_DAYS / 360} years`);
    expect([W('locusts').includes(`${CROPS.warnDays} days ahead`), W('raid').includes(`${RAIDS.warningDays} days ahead`)]).toEqual([false, false]);
  });
  it('says the first raid\'s clock as RAIDS has it, in months: it starts at the people, the warning comes later, the raiders after it; and names the dangers that wait', () => {
    const [lesson, cards] = [D2_TEXT.steps.tower({ warning: null, paused: true }), V60_HELP.d2.find((h) => h.head === 'Picture cards').text];
    for (const why of [lesson.why, D2_TEXT.steps.tower({ warning: { dir: 'east', size: 3, daysLeft: 89, need: 1, have: 0 }, paused: false }).why]) {
      expect(why).toContain(`first has ${RAIDS.clockPeople} people`);
      expect(why).toContain(`first warning comes ${DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)} later`);
      expect(why).toContain(`raiders ${DANGER_UI_TEXT.duration(RAIDS.warningDays)} after it`);
      expect(why.includes(`${RAIDS.warningDays} days ahead`)).toBe(false);                      // the old words ("at 250 people, the warning 90 days ahead") were wrong
    }
    expect(DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)).toBe('24 months');
    for (const word of ['plague', 'low Nile', 'locusts', 'wrecking buildings', 'looting storehouses']) expect([word, cards.includes(word)]).toEqual([word, true]);
    expect(cards.includes('Dangers never come')).toBe(false);                                   // raids and fires do come in the first years
  });
});

describe('v60 d2 picture cards: each first moment, both ways', () => {
  const quiet = () => createWorld({ seed: 11, size: 48, mapVariant: 'classic' });
  it('the Large plot\'s card: not before a Townhouse or the card\'s opening, yes after', () => {
    const w = quiet();
    expect([MOMENTS.largePlot(w), largePlotUnlocked(w)]).toEqual([false, false]);
    const h = insertBuilding(w, makeBuilding(w, 'house', 20, 20));
    h.tier = LARGE_PLOT.unlockTier - 1;
    expect(MOMENTS.largePlot(w)).toBe(false);
    h.tier = LARGE_PLOT.unlockTier;
    expect(MOMENTS.largePlot(w)).toBe(true);
    const l = lessonWorld();
    expect(MOMENTS.largePlot(l)).toBe(false);
    STAGES.largePlot(l);                                                                              // the lesson's own opening of the card counts too
    expect(MOMENTS.largePlot(l)).toBe(true);
  });
  it('a court demand: when one is open', () => {
    const w = quiet();
    expect(MOMENTS.demand(w)).toBe(false);
    w.demands.open.push({ id: 1, kind: 'goods', good: 'linen', amount: 40, day: 0, due: 90, accepted: false });
    expect(MOMENTS.demand(w)).toBe(true);
  });
  it('a plague, a low Nile, locusts: when each is warned or under way, not before', () => {
    for (const kind of ['plague', 'drought', 'locusts']) {
      const w = quiet();
      expect([kind, MOMENTS[kind](w)]).toEqual([kind, false]);
      w.hazards[kind].warning = { day: 0, strikes: 60 };
      expect([kind, 'warned', MOMENTS[kind](w)]).toEqual([kind, 'warned', true]);
      w.hazards[kind].warning = null;
      w.hazards[kind].active = { day: 60 };
      expect([kind, 'active', MOMENTS[kind](w)]).toEqual([kind, 'active', true]);
    }
  });
  it('a raid: when one is warned or under way', () => {
    const w = quiet();
    expect(MOMENTS.raid(w)).toBe(false);
    w.raid.warning = { index: 0 };
    expect(MOMENTS.raid(w)).toBe(true);
    w.raid.warning = null; w.raid.active = { index: 0 };
    expect(MOMENTS.raid(w)).toBe(true);
  });
  it('dueCards lists the cards whose moment has come and that the device has not seen, in order', () => {
    const w = quiet();
    w.hazards.drought.warning = { day: 0, strikes: 60 };
    w.raid.warning = { index: 0 };
    expect(dueCards(w, []).map((c) => c.id)).toEqual(['drought', 'raid']);
    expect(dueCards(w, [seenKey('drought')]).map((c) => c.id)).toEqual(['raid']);
    expect(dueCards(w, [seenKey('drought'), seenKey('raid'), 'press_play']).map((c) => c.id)).toEqual([]);
  });
});

describe('v60 d2 picture cards: shown once, at the right time', () => {
  function rig({ help = 'full', seen = [], mode = 'browse', sheet = null } = {}) {
    const world = createWorld({ seed: 11, size: 48, mapVariant: 'classic' });
    const storage = memory();
    const settings = createSettings({ storage, root: document.body });
    settings.set({ help, seenTips: seen });
    const store = createStore({ ...INITIAL_UI_STATE, mode, sheet });
    const shown = [];
    let busy = false;
    const hooks = { pictureCard: (id) => { if (busy) return false; shown.push(id); return true; } };
    const moments = createCardMoments({ world, store, settings, hooks });
    return { world, store, settings, shown, moments, setBusy: (b) => { busy = b; }, cleanup() { moments.destroy(); settings.destroy(); } };
  }
  it('opens the first due card when the game loop reports events, marks it seen at once, and never shows it again', () => {
    const r = rig();
    try {
      r.world.hazards.plague.warning = { day: 0, strikes: 60 };
      r.moments.onEvents([]);                                                                         // no events: nothing (a command or a loaded city is not a moment)
      expect(r.shown).toEqual([]);
      r.moments.onEvents([{ type: 'month' }]);
      expect(r.shown).toEqual(['plague']);
      expect(r.settings.get().seenTips.includes('card:plague')).toBe(true);
      r.moments.onEvents([{ type: 'month' }]); r.moments.onEvents([{ type: 'month' }]);
      expect(r.shown).toEqual(['plague']);
      r.world.raid.warning = { index: 0 };                                                            // the next card, the next time
      r.moments.onEvents([{ type: 'raid_warning' }]);
      expect(r.shown).toEqual(['plague', 'raid']);
    } finally { r.cleanup(); }
  });
  it('waits while a tool, a sheet or a question is open, and tries again at the next events without marking it seen', () => {
    for (const state of [{ mode: 'placing' }, { mode: 'drawing' }, { sheet: { kind: 'summary', id: null } }]) {
      const r = rig(state);
      try {
        r.world.hazards.drought.warning = { day: 0, strikes: 90 };
        r.moments.onEvents([{ type: 'month' }]);
        expect([JSON.stringify(state), r.shown, r.settings.get().seenTips.length]).toEqual([JSON.stringify(state), [], 0]);
        r.store.set({ mode: 'browse', sheet: null });
        r.moments.onEvents([{ type: 'month' }]);
        expect([JSON.stringify(state), r.shown]).toEqual([JSON.stringify(state), ['drought']]);
      } finally { r.cleanup(); }
    }
    const q = rig();
    try {
      q.world.hazards.drought.warning = { day: 0, strikes: 90 };
      q.store.set({ confirmDialog: { text: 'x' } });
      q.moments.onEvents([{ type: 'month' }]);
      expect(q.shown).toEqual([]);
    } finally { q.cleanup(); }
  });
  it('shows nothing under Help: Off, nothing for a card the device has seen, and does not mark a card it could not open', () => {
    const off = rig({ help: 'off' });
    try { off.world.raid.warning = { index: 0 }; off.moments.onEvents([{ type: 'month' }]); expect(off.shown).toEqual([]); } finally { off.cleanup(); }
    const seen = rig({ seen: [seenKey('raid')] });
    try { seen.world.raid.warning = { index: 0 }; seen.moments.onEvents([{ type: 'month' }]); expect(seen.shown).toEqual([]); } finally { seen.cleanup(); }
    const blocked = rig();
    try {
      blocked.world.raid.warning = { index: 0 };
      blocked.setBusy(true);                                                                          // other cards are open: the hook says false
      blocked.moments.onEvents([{ type: 'month' }]);
      expect([blocked.shown, blocked.settings.get().seenTips.length]).toEqual([[], 0]);
      blocked.setBusy(false);
      blocked.moments.onEvents([{ type: 'month' }]);
      expect(blocked.shown).toEqual(['raid']);
    } finally { blocked.cleanup(); }
  });
});

// The real page on a device that has done the lesson and seen the intro cards.
async function open({ width = 1280, height = 800, settings = {} } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, ...settings }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, storage, shell, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('v60 d2 picture cards: in the page', () => {
  it('shows one card alone for a first moment (no count, dots, Skip or Back; one Got it), pauses the game, and leaves the intro flag and the rest alone', async () => {
    const s = await open();
    try {
      startNewCity(document);
      const g = s.api.game();
      g.ui.speedControl.set(2);
      expect(s.api.hooks.pictureCard('large')).toBe(true);
      const d = document.querySelector('.picture-cards');
      const visible = (sel) => [...d.querySelectorAll(sel)].filter((n) => !n.hidden && !n.closest('[hidden]'));
      expect([g.world.speed, d.querySelector('#pc-title').textContent, d.querySelector('.pc-picture').getAttribute('src')]).toEqual([0, CARDS4_TEXT.cards.large.title, `${TUTORIAL.dir}large.webp`]);
      expect([visible('.pc-count').length, visible('.pc-dot').length, visible('.pc-skip').length, visible('.pc-back').length, d.querySelector('.pc-next').textContent]).toEqual([0, 0, 0, 0, 'Got it']);
      expect(s.api.hooks.pictureCard('raid')).toBe(false);                                            // one set at a time
      expect(s.api.hooks.pictureCard('nothing')).toBe(false);
      fire(d.querySelector('.pc-next'), 'click');
      expect([document.querySelector('.picture-cards'), g.world.speed, s.api.phase()]).toEqual([null, 0, 'game']);
      expect(stored(s.storage).cardsSeen).toBe(true);                                                 // it was true: the intro flag is not this card's to set
    } finally { s.cleanup(); }
  });
  it('shows all thirteen from How to play (the hook), and only the seven before a first city', async () => {
    const s = await open();
    try {
      s.api.hooks.pictureCards();
      expect(document.querySelector('.pc-count').textContent).toBe('1 of 14');
      document.querySelector('.pc-close').click();
    } finally { s.cleanup(); }
    const f = await open({ settings: { cardsSeen: false } });
    try {
      startNewCity(document);
      expect(document.querySelector('.pc-count').textContent).toBe('1 of 7');
    } finally { f.cleanup(); }
  });
  it('opens the card by itself in a real game when its moment comes in the events the loop reports, once', async () => {
    const s = await open();
    try {
      startNewCity(document);
      const g = s.api.game();
      g.ui.speedControl.set(2);
      const home = insertBuilding(g.world, makeBuilding(g.world, 'house', g.world.focus.x + 4, g.world.focus.y - 4));
      home.tier = LARGE_PLOT.unlockTier;                                                              // a Townhouse: the Large plot's card opens
      g.ui.onEvents([]);                                                                              // nothing reported, nothing shown
      expect(document.querySelector('.picture-cards')).toBe(null);
      g.ui.onEvents([{ type: 'month' }]);
      const d = document.querySelector('.picture-cards');
      expect([Boolean(d), d && d.querySelector('#pc-title').textContent, g.world.speed, stored(s.storage).seenTips.includes('card:large')]).toEqual([true, CARDS4_TEXT.cards.large.title, 0, true]);
      fire(d.querySelector('.pc-next'), 'click');
      g.ui.onEvents([{ type: 'month' }]);
      expect(document.querySelector('.picture-cards')).toBe(null);
    } finally { s.cleanup(); }
  });
});

describe('v60 d2 picture cards: the pictures', () => {
  async function shot(id) {
    const { width, height } = TUTORIAL_SHOT;
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(TUTORIAL_SHOT.params.replace(/^\/\?/, '')), now: () => performance.now(), clock: () => 1760000000000,
      storage: { getItem: () => null, setItem() {} }, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: { getItem: () => null, setItem() {} } },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    const result = await devScene(api, 'tutorial', { picture: id });
    return { api, root: shell.root, result, view: { width, height }, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  const ringBox = (mark, clip) => { const k = clip.size / TUTORIAL.size, pad = Number.isFinite(mark.pad) ? mark.pad : TUTORIAL.ringPad; return { l: clip.x + (mark.x - mark.w / 2 - pad) * k, r: clip.x + (mark.x + mark.w / 2 + pad) * k, t: clip.y + (mark.y - mark.h / 2 - pad) * k, b: clip.y + (mark.y + mark.h / 2 + pad) * k }; };
  const inRing = (rb, x, y) => x >= rb.l && x <= rb.r && y >= rb.t && y <= rb.b;
  const nodeBox = (n, root) => { const r = n.getBoundingClientRect(), f = root.querySelector('#map').getBoundingClientRect(); return { l: r.left - f.left, r: r.right - f.left, t: r.top - f.top, b: r.bottom - f.top }; };

  it('sets each of the six up on its own city with its ring on its thing, inside a square clip of the phone', async () => {
    for (const id of NEW_IDS) {
      const s = await shot(id);
      try {
        const { clip, mark, id: got } = s.result, g = s.api.game(), w = g.world, rb = ringBox(mark, clip);
        expect([id, got, clip.size, clip.x >= 0, clip.y >= 0, clip.x + clip.size <= s.view.width, clip.y + clip.size <= s.view.height, mark.kind]).toEqual([id, id, TUTORIAL_SHOT.clip, true, true, true, true, 'ring']);
        expect([id, rb.l >= clip.x - 1, rb.r <= clip.x + clip.size + 1, rb.t >= clip.y - 1, rb.b <= clip.y + clip.size + 1]).toEqual([id, true, true, true, true]);
        const centre = (b) => tileToScreen(g.cam, s.view, b.x + b.w / 2, b.y + b.d / 2);
        if (id === 'large') {
          const lot = Object.values(w.buildings).find((b) => b.type === 'house' && b.large === true);
          const [x, y] = centre(lot);
          expect([id, lot.tier, lot.residents, inRing(rb, x, y), g.ui.store.get().sheet]).toEqual([id, 0, 0, true, null]);                // an empty lot, the map alone
        } else if (id === 'demand') {
          const sheet = g.ui.store.get().sheet;
          const lines = [...s.root.querySelectorAll('#sheet p')].filter((p) => /^(Met|Failed)/.test(p.textContent.trim()));
          expect([id, sheet && sheet.kind, lines.length, w.demands.open.length]).toEqual([id, 'demand', 2, 1]);
          for (const p of lines) { const b = nodeBox(p, s.root); expect([id, p.textContent.slice(0, 6), inRing(rb, b.l + 4, (b.t + b.b) / 2), inRing(rb, b.r - 4, (b.t + b.b) / 2)]).toEqual([id, p.textContent.slice(0, 6), true, true]); }
        } else if (id === 'plague') {
          const sick = Object.values(w.buildings).filter((b) => b.type === 'house' && b.illness);
          const first = sick.sort((a, b) => b.residents - a.residents)[0];
          const [x, y] = centre(first);
          expect([id, sick.length >= 3, g.ui.store.get().overlay, inRing(rb, x, y)]).toEqual([id, true, 'health', true]);
        } else if (id === 'drought') {
          const title = [...s.root.querySelectorAll('#sheet *')].find((n) => n.children.length === 0 && /^Low Nile/.test(n.textContent.trim()));
          const b = nodeBox(title, s.root);
          expect([id, g.ui.store.get().sheet.kind, Boolean(w.hazards.drought.warning), inRing(rb, b.l + 4, (b.t + b.b) / 2), inRing(rb, b.r - 4, (b.t + b.b) / 2)]).toEqual([id, 'advice', true, true, true]);
        } else if (id === 'locusts') {
          const warn = [...s.root.querySelectorAll('#sheet *')].find((n) => n.children.length === 0 && /^Locusts warned/.test(n.textContent.trim()));
          const b = nodeBox(warn, s.root);
          expect([id, Boolean(w.hazards.locusts.warning), inRing(rb, b.l + 4, (b.t + b.b) / 2), inRing(rb, b.r - 4, (b.t + b.b) / 2)]).toEqual([id, true, true, true]);
        } else if (id === 'raid') {
          const rubble = Object.values(w.buildings).filter((b) => b.type === 'rubble' && b.was && b.was.cause === 'wreck');
          const x = rubble.reduce((n, b) => n + b.x + 0.5, 0) / rubble.length, y = rubble.reduce((n, b) => n + b.y + 0.5, 0) / rubble.length;
          const [sx, sy] = tileToScreen(g.cam, s.view, x, y);
          expect([id, rubble.length >= 1, Boolean(w.raid.warning || w.raid.active || w.raid.last), inRing(rb, sx, sy), s.root.querySelector('#banner .critical') !== null]).toEqual([id, true, true, true, true]);
        }
      } finally { s.cleanup(); }
    }
  });
  it('has every picture 600 px square and at most 60 KB with its mark inside it, kept for offline play', async () => {
    const json = await (await fetch(`/assets/tutorial/${TUTORIAL.marks}`)).json();
    const self = {};
    new Function('self', await (await fetch('/sw-files.js')).text())(self);
    for (const id of NEW_IDS) {
      const r = await fetch(`/assets/tutorial/${id}.webp`);
      const blob = await r.blob();
      const image = await createImageBitmap(blob);
      const mark = json.cards[id] && json.cards[id].mark;
      expect([id, r.status, blob.size <= TUTORIAL.maxBytes, image.width, image.height, self.THEBES_FILES.includes(`${TUTORIAL.dir}${id}.webp`), mark && mark.kind]).toEqual([id, 200, true, 600, 600, true, 'ring']);
      expect([id, mark.x - mark.w / 2 >= 0, mark.x + mark.w / 2 <= 600, mark.y - mark.h / 2 >= 0, mark.y + mark.h / 2 <= 600]).toEqual([id, true, true, true, true]);
    }
  });
});

describe('v60 d2 picture cards: the dialog fits with thirteen', () => {
  it('lays every card out on a phone held either way and a screen, at 100% and 150% text, with 44 px controls', async () => {
    for (const [w, h] of [[390, 844], [375, 667], [844, 390], [1280, 800]]) {
      for (const text of [100, 150]) {
        const shell = await mountShell(w, h);
        const settings = createSettings({ storage: { getItem: () => null, setItem() {} }, root: document.body, systemReducedMotion: () => false });
        settings.set({ motion: 'still', textSize: text });
        const c = showPictureCards({ root: shell.root, doc: document, settings, history: null, addListener: () => {}, removeListener: () => {}, marks: {}, onDone() {} });
        try {
          const at = `${w}x${h} at ${text}%`;
          for (let i = 0; i < TUTORIAL_CARDS.length; i++) {
            c.go(i);
            const box = c.element.querySelector('.pc-box').getBoundingClientRect();   // a card's box follows its words
            const t = c.element.querySelector('.pc-text');
            expect([at, i, c.element.querySelector('.pc-picture').getAttribute('src')]).toEqual([at, i, `${TUTORIAL.dir}${TUTORIAL_CARDS[i].id}.webp`]);
            for (const b of [...c.element.querySelectorAll('button')].filter((n) => !n.closest('[hidden]'))) { const rb = b.getBoundingClientRect(); expect([at, i, b.className, rb.width >= 44, rb.height >= 44, rb.right <= box.right + 0.5 && rb.bottom <= box.bottom + 0.5]).toEqual([at, i, b.className, true, true, true]); }
            if (text === 100) expect([at, i, t.scrollHeight <= t.clientHeight + 1]).toEqual([at, i, true]);
          }
        } finally { c.close(); settings.destroy(); shell.cleanup(); delete document.body.dataset.motion; }
      }
    }
  });
});
