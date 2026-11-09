// Version 9.2 Track D (design section 5, rulings 1815-1824): the sealed-ruler card, the heir's first screen, the heir's city without the guide and on the sealed
// layout, the Rulers row's cartouche, and the title's record line.
import { describe, it, expect } from '../../harness.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { INSTALL_ASK_KEY } from '../../../src/save/installFlow.js';
import { createWorld } from '../../../src/sim/world.js';
import { mapSquareOf } from '../../../src/save/records.js';
import { serialize } from '../../../src/save/serialize.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { createSaveStore } from '../../../src/save/store.js';
import { boot } from '../../../src/boot.js';
import { V90_L_TEXT, TITLE_SCORE_TEXT, D92_D_TEXT, S46_MAP_TEXT } from '../../../src/ui/text.js';
import { renderRulers } from '../../../src/ui/v90/rulers.js';
import { rulerCartouche, isLong, LONG_NAME } from '../../../src/ui/v92/cartouche.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire, mount } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const CHROME = 'Mozilla/5.0 (Linux; Android 14) Chrome/124.0 Mobile';
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const ruler = (i, over = {}) => ({ id: `c${i}:3600`, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 200 + i, parts: PARTS, medal: 'silver', version: 2, seed: 4000 + i, difficulty: 'hard', mapVariant: 'island', mapSize: 80, map: '', feats: [], date: i, ...over });

function capital() {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  w.tally.stoneLaid = 9000;
  return w;
}

async function bootWith({ rulers = [], dynasty = { name: '', heir: 'steady' }, env = { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, settings = { cardsSeen: true, lessonDone: true }, width = 390, height = 844 } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify(settings), [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers, rivals: [], dynasty }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: env, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, storage, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
const sheet = () => document.querySelector('#sheet');
const toasts = () => [...document.querySelectorAll('#toasts .toast .text')].map((n) => n.textContent);

describe('v92 d sealed card: between the Pass sheet and the heir card', () => {
  it('opens from the Pass button, draws the cartouche and what the heir inherits, and seals nothing; Back is the Pass sheet', async () => {
    const r = await bootWith();
    try {
      const w = capital();
      r.api.startGame(w);
      const before = serialize(w), seals = w.seals.length;
      r.api.hooks.passThrone(); await frame();
      fire(sheet().querySelector('.pass-confirm'), 'click'); await frame();
      const s = sheet();
      expect(s.querySelector('.head h2').textContent).toBe(D92_D_TEXT.sealedSheet);
      const c = s.querySelector('.cartouche');
      expect([c.querySelector('.cartouche-ruler').textContent, c.querySelector('.cartouche-title').textContent]).toEqual(['Ramesses I', 'the Builder']);
      expect(c.querySelector('.cartouche-facts-text').textContent).toContain(V90_L_TEXT.years(w.day));
      expect(c.querySelector('.cartouche-score').textContent.startsWith('Score ')).toBe(true);
      const canvas = c.querySelector('canvas.cartouche-map');
      expect([canvas.width, canvas.height]).toEqual([32, 32]);
      expect(s.querySelector('.sealed-inherits').textContent).toBe("Your heir's city: monuments rise 15% faster; taxes 5% lower");
      expect([...s.querySelectorAll('.sealed-card .primary')].map((b) => b.textContent)).toEqual(["Found the heir's city"]);
      // nothing is sealed, kept or written before Start
      expect([serialize(w) === before, w.seals.length === seals, r.api.records.rulers().length, r.api.records.dynasty().heir]).toEqual([true, true, 0, 'steady']);
      fire(s.querySelector('.sealed-back'), 'click'); await frame();
      expect(sheet().querySelector('.head h2').textContent).toBe('Pass the throne');
      expect(sheet().querySelector('.pass-name')).toBeTruthy();
      expect([serialize(w) === before, r.api.records.rulers().length]).toEqual([true, 0]);
    } finally { r.cleanup(); }
  });
  it('keeps the name typed on the sheet, with the regnal number, through the card and Back', async () => {
    const r = await bootWith();
    try {
      r.api.startGame(capital());
      r.api.hooks.passThrone(); await frame();
      const input = sheet().querySelector('#pass-name');
      input.value = 'Ana'; fire(input, 'input');
      fire(sheet().querySelector('.pass-confirm'), 'click'); await frame();
      expect(sheet().querySelector('.cartouche-ruler').textContent).toBe('Ana I');
      fire(sheet().querySelector('.sealed-back'), 'click'); await frame();
      expect(sheet().querySelector('#pass-name').value).toBe('Ana');
    } finally { r.cleanup(); }
  });
  it('gives the heir card the sealed city\'s layout first (Surprise me stays a pick away), and keeps a pick the player made', async () => {
    const r = await bootWith();
    try {
      const w = capital();
      w.mapVariant = 'island';
      r.api.startGame(w);
      r.api.hooks.passThrone(); await frame();
      fire(sheet().querySelector('.pass-confirm'), 'click'); await frame();
      fire(sheet().querySelector('.sealed-found'), 'click'); await frame();
      const select = sheet().querySelector('.layout-select');
      expect([select.value, r.api.hooks.newCityChoices.get().layout]).toEqual(['island', 'island']);
      expect([...select.options].some((o) => o.value === 'auto')).toBe(true);
      select.value = 'auto'; fire(select, 'change');
      fire(sheet().querySelector('.guide-back'), 'click'); await frame();
      fire(sheet().querySelector('.sealed-found'), 'click'); await frame();
      expect(sheet().querySelector('.layout-select').value).toBe('auto');
    } finally { r.cleanup(); }
  });
});

describe('v92 d the heir\'s first screen', () => {
  it('has no install toast in its first game month, then asks once at the first month end', async () => {
    const r = await bootWith({ rulers: [ruler(1)], dynasty: { name: 'Khufu', heir: 'builder' }, env: { ua: CHROME, standalone: false, hasBeforeInstallPrompt: true } });
    try {
      r.api.hooks.startHeir();
      await frame();
      const asked = () => toasts().filter((t) => t === V90_L_TEXT.installAsk(false));
      expect([asked(), r.storage.getItem(INSTALL_ASK_KEY)]).toEqual([[], null]);
      expect(r.api.game().world.heir).toBe('builder');
      const g = r.api.game();
      g.world.speed = 3;
      for (let i = 0; i < 400 && g.world.day < 32; i++) g.loop.tick(i * 1000);
      expect([g.world.day >= 30, asked()]).toEqual([true, [V90_L_TEXT.installAsk(false)]]);
    } finally { r.cleanup(); }
  });
  it('says the heir in Ipi\'s line, once, and nothing else on the screen speaks', async () => {
    const r = await bootWith({ rulers: [ruler(1)], dynasty: { name: 'Khufu', heir: 'merchant' } });
    try {
      r.api.hooks.startHeir();
      await frame();
      expect(document.querySelector('.scribe-words').textContent).toBe(D92_D_TEXT.heirIpi('merchant'));
      expect(document.querySelector('.scribe-bubble').hidden).toBe(false);
      expect(toasts()).toEqual([]);
    } finally { r.cleanup(); }
  });
  it('is a city with no beginner\'s guide, while a first city keeps its guide', async () => {
    const heir = await bootWith({ rulers: [ruler(1)], dynasty: { name: 'Khufu', heir: 'builder' } });
    try { heir.api.hooks.startHeir(); expect(heir.api.game().world.guide.on).toBe(false); } finally { heir.cleanup(); }
    const steadyHeir = await bootWith({ rulers: [ruler(1)], dynasty: { name: 'Khufu', heir: 'steady' } });
    try { steadyHeir.api.hooks.startHeir(); expect(steadyHeir.api.game().world.guide.on).toBe(false); } finally { steadyHeir.cleanup(); }
    const first = await bootWith({ settings: { cardsSeen: true, lessonDone: true, help: 'full' } });
    try { first.api.startGame(first.api.freshWorld()); expect(first.api.game().world.guide.on).toBe(true); } finally { first.cleanup(); }
  });
});

describe('v92 d the Rulers list', () => {
  const list = (rows, extra = {}) => {
    const { root, cleanup } = mount('<div id="body"></div>');
    const body = root.querySelector('#body');
    renderRulers(body, { records: { rulers: () => rows }, ...extra });
    return { body, cleanup };
  };
  it('heads each row with the cartouche: the name and number on one line, the title under it', () => {
    const { body, cleanup } = list([ruler(1, { n: 3, name: 'Khufu', title: 'unconquered' }), ruler(2, { name: 'Hatshepsut Thutmose' , n: 14 })]);
    try {
      const rows = [...body.querySelectorAll('.ruler-row')];
      expect(rows.map((x) => [x.querySelector('.cartouche-ruler').textContent, x.querySelector('.cartouche-title').textContent])).toEqual([['Khufu III', 'the Unconquered'], ['Hatshepsut Thutmose XIV', 'the Builder']]);
      expect(rows.map((x) => x.querySelector('.cartouche').classList.contains('long'))).toEqual([false, true]);
      expect([isLong({ name: 'Hatshepsut Thut', n: 3 }), LONG_NAME]).toEqual([true, 16]);
    } finally { cleanup(); }
  });
  it('asks to install once, at the top of the list', () => {
    const { body, cleanup } = list([ruler(1), ruler(2)], { installAsk: true });
    try {
      expect(body.querySelectorAll('.install-ask').length).toBe(1);
      expect(body.querySelector('.rulers-body').firstElementChild.classList.contains('rulers-install')).toBe(true);
    } finally { cleanup(); }
  });
  it('keeps the seed, level and size in an opened row', () => {
    const { body, cleanup } = list([ruler(1, { mapSize: 80, seed: 4242, difficulty: 'hard', mapVariant: 'east' })]);
    try { expect(body.querySelector('.ruler-map-line').textContent).toBe(`Seed 4242, Hard, east layout, ${S46_MAP_TEXT.sizeNote(80)}`); } finally { cleanup(); }
  });
  it('draws the cartouche whole with its facts and map square, and a short name shares the facts\' row', () => {
    const { root, cleanup } = mount('<div id="x"></div>');
    try {
      const c = rulerCartouche({ name: 'Ana', n: 2, title: 'merchant', rank: 'town', day: 720, score: 150, medal: null, map: '' }, { full: true });
      root.querySelector('#x').append(c);
      expect([c.classList.contains('full'), c.classList.contains('long'), c.getAttribute('aria-label')]).toEqual([true, false, 'Ana II the Merchant, Town, 2 years, score 150, No medal']);
    } finally { cleanup(); }
  });
  it('says the reign in whole years and months, from its days (a month 30 days, a year 12 months)', () => {
    const y = (d) => V90_L_TEXT.years(d);
    expect([y(0), y(29), y(30), y(360), y(600), y(720), y(10800), y(4500), y(361)]).toEqual(['Under a month', 'Under a month', '1 month', '1 year', '1 year, 8 months', '2 years', '30 years', '12 years, 6 months', '1 year']);
  });
  it('draws no map square for a row or card whose map is empty or unreadable, and one for a real map', () => {
    const base = { name: 'Ana', n: 1, title: 'merchant', rank: 'town', day: 720, score: 150, medal: null };
    const w = createWorld({ seed: 3 }); buildSampleCity(w);
    const good = mapSquareOf(w);
    expect([rulerCartouche({ ...base, map: '' }, { full: true }).querySelector('canvas'), rulerCartouche({ ...base, map: 'zz' }, { full: true }).querySelector('.cartouche-map-box')]).toEqual([null, null]);
    expect(rulerCartouche({ ...base, map: good }, { full: true }).querySelector('canvas.cartouche-map') !== null).toBe(true);
  });
});

describe('v92 d the title\'s record line', () => {
  it('reads "Best reign: 200, Bronze" with the medal of the best\'s own version, and says older scoring', () => {
    const line = TITLE_SCORE_TEXT.bestLine;
    expect(line({ score: 200, medal: 'bronze', seed: 5, difficulty: 'normal' })).toBe('Best reign: 200, Bronze');
    expect(line({ score: 90, medal: null, seed: 5, difficulty: 'hard', mapSize: 80 })).toBe('Best reign: 90');
    expect(line({ score: 300, medal: 'gold', older: true })).toBe('Best reign: 300, Gold, older scoring');
    expect(D92_D_TEXT.bestLabel({ score: 200, medal: 'bronze', seed: 5, difficulty: 'hard', mapSize: 80 })).toBe(`Best reign: 200, Bronze. Seed 5, Hard, ${S46_MAP_TEXT.sizeNote(80)}`);
  });
});
