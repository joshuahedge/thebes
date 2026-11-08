// Version 9.0 Track D (design section 2, rulings 1569, 1570, 1573, 1575): Pass the throne. The sim: refused below City and in the lesson, the score it seals
// (the best of the reign's seals and today's). The interface: the menu row from City, the sheet's five parts, the heir's card, Back and Not yet change nothing,
// Start writes the ruler row and the dynasty and starts the heir's city.
import { describe, it, expect } from '../../harness.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { canPassThrone, passScore, passThrone, titleOf } from '../../../src/sim/dynasty.js';
import { scoreOf, sealReign } from '../../../src/sim/score.js';
import { createWorld } from '../../../src/sim/world.js';
import { serialize } from '../../../src/save/serialize.js';
import { lessonWorld } from '../../../src/sim/lesson.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { createSaveStore } from '../../../src/save/store.js';
import { boot } from '../../../src/boot.js';
import { V90_D_TEXT, T } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire, mount } from '../../helpers/dom.js';
import { createPassSheets } from '../../../src/ui/v90/passSheet.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';

// The seed-11 sample Capital, the Builder by its laid units.
function capital() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  w.tally.stoneLaid = 9000;   // 9.0 wave 2 (ruling 1622, the Builder's bar 2,000 -> 4,600): was 2,500; 9.2 (Track S, ruling 1804): bar 8,000, was 5,000
  return w;
}

describe('v90 d pass: the command', () => {
  it('is refused below City, with the people still needed, and in the lesson', () => {
    const w = createWorld({ seed: 3 });
    expect(canPassThrone(w)).toEqual({ ok: false, reason: 'not_yet', people: 400 });
    expect(passThrone(w)).toEqual({ ok: false, reason: 'not_yet', warnings: [], people: 400 });
    expect(w.seals).toEqual([]);
    w.milestone = 'great_city';
    expect(canPassThrone(w).ok).toBe(true);
    const l = lessonWorld();
    l.milestone = 'city';
    expect(passThrone(l)).toEqual({ ok: false, reason: 'lesson', warnings: [], people: 0 });
  });
  it('seals today\'s score with passed and the title the reign earned, or the one it is given', () => {
    const w = capital();
    const s = scoreOf(w);
    const r = passThrone(w);
    expect([r.ok, r.title]).toEqual([true, 'builder']);
    expect(r.seal).toEqual({ day: w.day, score: s.total, parts: { ...s.parts }, medal: s.medal, version: s.version, passed: true, title: 'builder' });
    expect(w.seals[w.seals.length - 1]).toBe(r.seal);
    expect(passThrone(capital(), { title: 'merchant' }).title).toBe('merchant');
    expect(passThrone(capital(), { title: 'emperor' }).title).toBe('builder');
  });
  it('keeps a won seal\'s higher score (Q3), and today\'s when it is the higher', () => {
    const w = capital();
    const today = scoreOf(w).total;
    w.seals.push({ day: 100, score: today + 50, parts: { people: 90, prosperity: 90, culture: 90, safety: 90, monuments: 90 }, medal: 'gold', version: 2, won: true });
    expect(passScore(w)).toEqual({ score: today + 50, parts: { people: 90, prosperity: 90, culture: 90, safety: 90, monuments: 90 }, medal: 'gold', version: 2, sealed: true, day: 100 });
    const r = passThrone(w);
    expect([r.seal.score, r.seal.medal, r.seal.day, r.seal.passed]).toEqual([today + 50, 'gold', w.day, true]);
    const w2 = capital();
    w2.seals.push({ day: 100, score: 10, parts: {}, medal: null, version: 2 });
    const r2 = passThrone(w2);
    expect([passScore(capital()).sealed, r2.seal.score]).toEqual([false, scoreOf(w2).total]);
  });
  it('never refuses a won reign, and a seal it made still saves', () => {
    const w = capital();
    w.reign.won = true;
    sealReign(w, { won: true });
    expect(passThrone(w).ok).toBe(true);
    expect(JSON.parse(serialize(w)).seals.at(-1).passed).toBe(true);
  });
});

describe('v90 d pass: the interface', () => {
  const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  async function bootWith(dynasty = { name: '', heir: 'steady' }, rulers = []) {
    const width = 390, height = 844;
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true }), [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers, rivals: [], dynasty }) });
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    return { api, storage, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  const sheet = () => document.querySelector('#sheet');
  const openMenu = (api) => { const ui = api.game().ui; ui.store.set({ ...ui.store.get(), sheet: { kind: 'menu' } }); };
  const labels = () => [...sheet().querySelectorAll('.menu-list button')].map((b) => b.textContent.trim());

  it('offers Pass the throne in the menu from City only, and never in the lesson', async () => {
    const r = await bootWith();
    try {
      const small = createWorld({ seed: 3 });
      r.api.startGame(small);
      openMenu(r.api); await frame();
      expect(labels().includes(V90_D_TEXT.menuPass)).toBe(false);
      expect(r.api.hooks.canPassThrone()).toBe(false);
      r.api.startGame(capital());
      openMenu(r.api); await frame();
      expect(labels().includes(V90_D_TEXT.menuPass)).toBe(true);
      r.api.hooks.lesson({ step: 0 });
      await frame();
      openMenu(r.api); await frame();
      expect([r.api.game().lesson, labels().includes(V90_D_TEXT.menuPass)]).toEqual([true, false]);
    } finally { r.cleanup(); }
  });
  it('says the title, why, the runner-up, the heir\'s trait, the sealed score, the name and the replace note, and Not yet changes nothing', async () => {
    const r = await bootWith();
    try {
      const w = capital();
      w.tally.tradeGold = 100; w.tally.billsPaid = 1000;   // the Merchant at 0.25 of its bar: close behind
      r.api.startGame(w);
      const before = serialize(w);
      r.api.hooks.passThrone();
      await frame();
      const s = sheet(), kept = passScore(w);
      expect(s.querySelector('.head h2').textContent).toBe(V90_D_TEXT.menuPass);
      expect(s.querySelector('.pass-title').textContent).toBe('Ramesses I will be remembered as the Builder.');
      expect(s.querySelector('.pass-why').textContent).toBe(V90_D_TEXT.whyLine('builder', titleOf(w).rows));
      expect(s.querySelector('.pass-why').textContent).toBe('9,000 units of stone and brick laid on monuments');   // ruling 1622: was 2,500
      expect(s.querySelector('.pass-runner').textContent).toBe('Close behind: the Merchant');
      expect(s.querySelector('.pass-heir').textContent).toBe("Your heir's city: monuments rise 15% faster; taxes 5% lower");
      expect(s.querySelector('.pass-score').textContent).toBe(V90_D_TEXT.sealedScore(kept.score, kept.medal));
      const input = s.querySelector('#pass-name');
      expect([input.value, input.getAttribute('maxlength'), s.querySelector('label[for="pass-name"]').textContent]).toEqual(['Ramesses', '16', "Your dynasty's name"]);
      expect(s.querySelector('.pass-replace').textContent).toBe("Your city is replaced by your heir's. Export it first to keep a copy.");
      expect([...s.querySelectorAll('.actions button')].map((b) => b.textContent)).toEqual(['Pass the throne', T.exportFirst, 'Not yet']);
      fire(s.querySelector('.pass-not-yet'), 'click');
      await frame();
      expect([r.api.game().ui.store.get().sheet, serialize(w) === before, r.api.records.rulers().length]).toEqual([null, true, 0]);
    } finally { r.cleanup(); }
  });
  it('opens the heir\'s card with the trait line above Start, and Back changes nothing', async () => {
    const r = await bootWith();
    try {
      const w = capital();
      r.api.startGame(w);
      const before = serialize(w);
      r.api.hooks.passThrone(); await frame();
      fire(sheet().querySelector('.pass-confirm'), 'click'); await frame();
      const s = sheet();
      expect(s.querySelector('.head h2').textContent).toBe("Your heir's city");
      const line = s.querySelector('.heir-trait-line');
      expect(line.textContent).toBe("Your heir's city: monuments rise 15% faster; taxes 5% lower");
      expect(line.nextElementSibling.classList.contains('actions')).toBe(true);
      expect(s.querySelector('.start-city')).toBeTruthy();
      fire(s.querySelector('.guide-back'), 'click'); await frame();
      expect([r.api.game().world, r.api.game().ui.store.get().sheet, serialize(w) === before, r.api.records.rulers().length, r.api.records.dynasty().heir]).toEqual([w, null, true, 0, 'steady']);
    } finally { r.cleanup(); }
  });
  it('starts the heir\'s city on Start: the seal, the ruler row, the dynasty\'s name and heir, and the toast', async () => {
    const r = await bootWith({ name: '', heir: 'merchant' });
    try {
      const w = capital();
      w.heir = 'merchant';
      r.api.startGame(w);
      r.api.hooks.passThrone(); await frame();
      const input = sheet().querySelector('#pass-name');
      input.value = 'Ana'; fire(input, 'input');
      expect(sheet().querySelector('.pass-title').textContent).toBe('Ana I will be remembered as the Builder.');
      fire(sheet().querySelector('.pass-confirm'), 'click'); await frame();
      const kept = passScore(w);
      fire(sheet().querySelector('.start-city'), 'click'); await frame();
      const seal = w.seals.at(-1);
      expect([seal.passed, seal.title, seal.score]).toEqual([true, 'builder', kept.score]);
      const [row] = r.api.records.rulers();
      expect([row.name, row.n, row.title, row.heir, row.rank, row.score, row.seed, row.day]).toEqual(['Ana', 1, 'builder', 'merchant', w.milestone, kept.score, 11, w.day]);
      expect(r.api.records.dynasty()).toEqual({ name: 'Ana', heir: 'builder' });
      const next = r.api.game().world;
      expect([next === w, next.heir, next.day]).toEqual([false, 'builder', 0]);
      expect(document.querySelector('#toasts').textContent).toContain('Ana I is remembered as the Builder.');
    } finally { r.cleanup(); }
  });
  it('adds the regnal number by the rulers already of that name', async () => {
    const old = { id: 'c:1', n: 1, name: 'Ramesses', title: 'steady', heir: 'steady', rank: 'city', day: 9000, score: 300, parts: {}, medal: null, version: 2, seed: 4, difficulty: 'normal', mapVariant: 'classic', mapSize: 64, map: '', feats: [], date: 1 };
    const r = await bootWith({ name: 'Ramesses', heir: 'steady' }, [old]);
    try {
      r.api.startGame(capital());
      r.api.hooks.passThrone(); await frame();
      expect(sheet().querySelector('.pass-title').textContent).toBe('Ramesses II will be remembered as the Builder.');
    } finally { r.cleanup(); }
  });
});

// Track D's fix round (ruling 1583): Start sets the dynasty's name only once the seal is made; a ruler row the records do not keep undoes the seal and keeps the city;
// a second tap on Start does nothing.
describe('v90 d pass: Start when the records fail, and a double tap', () => {
  // The two sheets on their own, over a store, with records whose writes can fail.
  function rig({ keep = true, throwOn = null } = {}) {
    const { root, cleanup } = mount('<div id="a"></div><div id="b"></div>');
    const log = [], rows = [], toasts = [], started = [];
    const records = {
      dynasty: () => ({ name: '', heir: 'steady' }),
      rulers: () => rows.slice(),
      setDynasty: (p) => { if (throwOn === 'setDynasty') throw new Error('x'); log.push(['setDynasty', p]); return p; },
      noteCity: () => log.push(['noteCity']),
      addSeal: () => log.push(['addSeal']),
      addRuler: (world, seal, title) => { if (throwOn === 'addRuler') throw new Error('x'); const row = { id: `c:${seal.day}`, name: 'Ramesses', title }; if (keep) rows.push(row); log.push(['addRuler']); return row; },
    };
    const store = createStore(INITIAL_UI_STATE);
    const world = capital();
    const sheets = createPassSheets({ world, store, toasts: { show: (t) => toasts.push(t) }, hooks: { records, startHeir: (o) => started.push(o) }, clock: () => 5 });
    sheets.passThrone(root.querySelector('#a'), {});
    sheets.passHeir(root.querySelector('#b'), {});
    const start = () => fire(root.querySelector('#b .start-city'), 'click');
    return { world, log, toasts, started, start, cleanup };
  }
  it('passes once on Start, and a second tap neither seals again nor starts a second city', () => {
    const r = rig();
    try {
      const seals = r.world.seals.length;
      r.start(); r.start();
      expect([r.world.seals.length - seals, r.started.length, r.toasts]).toEqual([1, 1, []]);
      expect(r.log.map((x) => x[0])).toEqual(['setDynasty', 'addRuler', 'noteCity', 'addSeal', 'setDynasty']);   // fix wave: the ruler row first, so a failed Pass leaves no city row or stamp
    } finally { r.cleanup(); }
  });
  it('undoes the seal, says so and starts no city when the ruler row is not kept or a write throws', () => {
    for (const opts of [{ keep: false }, { throwOn: 'addRuler' }, { throwOn: 'setDynasty' }]) {
      const r = rig(opts);
      try {
        const seals = r.world.seals.length;
        r.start();
        expect([JSON.stringify(opts), r.world.seals.length - seals, r.started.length, r.toasts]).toEqual([JSON.stringify(opts), 0, 0, [V90_D_TEXT.passFailed]]);
        // Fix wave: no city row and no chronicle stamp stay written, and the dynasty's name goes back to what it was.
        expect([JSON.stringify(opts), r.log.some((x) => x[0] === 'noteCity' || x[0] === 'addSeal')]).toEqual([JSON.stringify(opts), false]);
        if (opts.throwOn !== 'setDynasty') expect(r.log.at(-1)).toEqual(['setDynasty', { name: '' }]);
      } finally { r.cleanup(); }
    }
  });
  it('sets no name when the seal is refused', () => {
    const r = rig();
    try {
      r.world.lesson = true;   // passThrone refuses it now
      r.start();
      expect([r.log, r.started.length, r.toasts]).toEqual([[], 0, [V90_D_TEXT.passFailed]]);
    } finally { r.cleanup(); }
  });
});
