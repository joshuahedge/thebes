// Version 9.3 Track U (rulings 1975-1984): the decree's interface. The card's gate, the three buttons, the chip, the first screen, the menu, the end card's six parts, the locked wall,
// the ruler list's decree rows, and the layout at the three phone and desktop sizes. The sim's end (Track R) is stood in for by setting world.decree.ended, so a test need not
// play 2,160 days; the score, the records and the links are Track R's and Track S's own.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { packSave } from '../../../src/save/serialize.js';
import { decreesOfWeek, weekKey } from '../../../src/ui/week.js';
import { decreeTitleCard, decreeUnlocked, partsObject } from '../../../src/ui/v93/decree.js';
import { renderRulers } from '../../../src/ui/v90/rulers.js';
import { cardInfo, renderCards } from '../../../src/ui/cards.js';
import { reasonText, partBarLabel, U93_TEXT as U } from '../../../src/ui/text.js';
import { decreeScore, decreeMedals } from '../../../src/sim/score.js';
import { openSheet } from '../../../src/ui/modes.js';
import { DEFAULT_MAP_SIZE } from '../../../src/data/map.js';
import { titleAt, runAt, frame, waitFor, wait, MONDAY_47, MONDAY_48, MONDAY_50, WITH_TOWN } from './page.js';

const W47 = '2026-47';
const rect = (n) => n.getBoundingClientRect();
const noSideScroll = (n) => n.scrollWidth <= n.clientWidth + 1;
const weekOf = (id) => { for (let w = 1; w <= 52; w++) { const k = `2026-${String(w).padStart(2, '0')}`; const ids = decreesOfWeek(k); if (ids.length === 1 && ids[0] === id) return k; } return null; };
const savedRun = (week, ended = false) => { const w = createWorld({ seed: 202646, decree: { week, ids: decreesOfWeek(week) } }); w.decree.ended = ended; return packSave(w, { savedAt: 1, lastSpeed: 1 }); };

describe('v93 u card: the title\'s decree card and its gate', () => {
  it('decreeUnlocked: a city with a Town split, or any ruler; nothing else', () => {
    const rec = (r) => ({ load: () => ({ cities: [], rulers: [], ...r }) });
    expect(decreeUnlocked(null)).toBe(false);
    expect(decreeUnlocked(rec({}))).toBe(false);
    expect(decreeUnlocked(rec({ cities: [{ splits: {} }] }))).toBe(false);
    expect(decreeUnlocked(rec({ cities: [{ splits: { town: 90 } }] }))).toBe(true);
    expect(decreeUnlocked(rec({ rulers: [{ id: 'a' }] }))).toBe(true);
  });

  it('the title has no card on a new device and has it, with the mark and the twist, once a city reached Town', async () => {
    const a = await titleAt({});
    try { expect(a.root.querySelector('.decree-card')).toBe(null); } finally { a.cleanup(); }
    const b = await titleAt({ records: WITH_TOWN });
    try {
      const card = b.root.querySelector('.decree-card');
      expect(Boolean(card)).toBe(true);
      expect(card.querySelector('h2').textContent).toBe(U.cardTitle);
      expect(card.querySelector('.decree-go').classList.contains('primary')).toBe(false);   // fix wave U7: a plain button; Play stays the title's one primary
      expect(card.querySelector('.decree-mark').textContent).toBe('Sea Peoples, week 47');   // fix wave U10: no-break space
      expect(card.querySelector('.decree-twist').textContent).toContain(U.twists.sea_peoples);
      expect(card.querySelector('.decree-counts').textContent).toBe(U.counts(['sea_peoples']));
      expect(card.querySelector('.decree-go').textContent).toBe(U.start);
      expect(card.textContent.includes('Pharaoh')).toBe(false);
    } finally { b.cleanup(); }
  });

  it('a pair week joins the names with and', async () => {
    const t = await titleAt({ records: WITH_TOWN, clock: MONDAY_50 });
    try { expect(t.root.querySelector('.decree-mark').textContent).toBe('Low Nile and Golden caravans, week 50'); } finally { t.cleanup(); }
  });
});

describe('v93 u card: Start, Continue, Try again, and an unfinished run from another week', () => {
  const ids = ['sea_peoples'];
  const rec = (best, rival) => ({ decrees: () => (best ? [best] : []), load: () => ({ rivals: rival ? [rival] : [] }) });
  const build = (slot, records = rec(null)) => decreeTitleCard({ week: W47, ids, records, slot, onStart: () => { calls.push('start'); }, onContinue: (s) => { calls.push(`continue ${s.week}`); } });
  let calls = [];
  it('Start with nothing; Continue with this week\'s live run; Try again once it ended or a best is kept', () => {
    calls = [];
    const start = build(null); start.querySelector('.decree-go').click();
    expect([start.querySelector('.decree-go').textContent, calls]).toEqual([U.start, ['start']]);
    calls = [];
    const cont = build({ week: W47, ended: false }); cont.querySelector('.decree-go').click();
    expect([cont.querySelector('.decree-go').textContent, calls]).toEqual([U.continue, ['continue 2026-47']]);
    calls = [];
    const again = build({ week: W47, ended: true }); again.querySelector('.decree-go').click();
    expect([again.querySelector('.decree-go').textContent, calls]).toEqual([U.again, ['start']]);
    expect(build(null, rec({ week: W47, score: 300, medal: 'bronze' })).querySelector('.decree-go').textContent).toBe(U.again);
  });
  it('shows your best and the best rival on this week', () => {
    const card = build(null, rec({ week: W47, score: 412, medal: 'silver' }, { week: W47, name: 'Nefer', score: 380 }));
    expect(card.querySelector('.decree-best').textContent).toBe('Your best this week: 412 of 600, silver');
    expect(card.querySelector('.decree-rival').textContent).toBe('Nefer scored 380 this week');
    expect(build(null).querySelector('.decree-best').textContent).toBe(U.noBest);
  });
  it('an unfinished run of another week says so with Continue; Start there is the card\'s other button', () => {
    calls = [];
    const card = build({ week: '2026-46', ended: false });
    expect(card.querySelector('.decree-unfinished').textContent).toBe('You have an unfinished run from week 46.');
    card.querySelector('.decree-continue-old').click();
    expect(calls).toEqual(['continue 2026-46']);
    card.querySelector('.decree-go').click();
    expect(calls).toEqual(['continue 2026-46', 'start']);
  });
  it('on the page: Continue loads the slot\'s run, an unfinished run of week 46 asks before Start replaces it, and Try again follows an ended run', async () => {
    const { createSaveStore } = await import('../../../src/save/store.js');
    const { fakeIndexedDB } = await import('../../helpers/fakeStorage.js');
    const slot = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await slot.save(savedRun(W47));
    const a = await titleAt({ records: WITH_TOWN, decreeStore: slot });
    try {
      const go = a.root.querySelector('.decree-go');
      expect(go.textContent).toBe(U.continue);
      go.click();
      expect(await waitFor(() => a.api.game() && a.api.game().world.decree)).toBeTruthy();
      expect([a.api.game().world.decree.week, a.api.game().world.speed]).toEqual([W47, 0]);   // the saved run reopens paused
    } finally { a.cleanup(); }
    const other = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await other.save(savedRun('2026-46'));
    const b = await titleAt({ records: WITH_TOWN, decreeStore: other });
    try {
      expect(b.root.querySelector('.decree-unfinished').textContent).toContain('week 46');
      b.root.querySelector('.decree-go').click();
      await frame();
      expect(b.root.querySelector('.title-card').textContent).toContain(U.replaceQuestion('2026-46'));
      expect(b.api.phase()).toBe('title');
      b.root.querySelector('.guide .start-new').click();
      expect(b.api.game().world.decree.week).toBe(W47);
      expect(b.api.game().world.day).toBe(0);
    } finally { b.cleanup(); }
    const done = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await done.save(savedRun(W47, true));
    const c = await titleAt({ records: WITH_TOWN, decreeStore: done });
    try { expect(c.root.querySelector('.decree-go').textContent).toBe(U.again); } finally { c.cleanup(); }
  });
});

describe('v93 u run: the first screen, the chip and the menu', () => {
  it('opens on the decree card with the game held; Begin starts the clock; the chip reads the year and reopens the card', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      const g = t.g();
      expect([Boolean(g.decree), Boolean(g.world.decree), g.world.speed, t.kind()]).toEqual([true, true, 0, 'decree']);
      expect(g.world.guide.on).toBe(false);
      expect([g.world.heir, g.world.difficulty]).toEqual(['steady', 'normal']);
      const chip = t.root.querySelector('.decree-chip');
      expect(chip.querySelector('.chip-year').textContent).toBe('Year 1 of 6');
      expect(chip.querySelector('.chip-mark').textContent).toBe('Sea Peoples, week 47');
      expect(chip.getAttribute('aria-label')).toBe(U.chipLabel('Sea Peoples, week 47', 1));
      expect(t.root.querySelector('#sheet .decree-mark').textContent).toBe('Sea Peoples, week 47');
      t.root.querySelector('#sheet .decree-begin').click();
      await frame();
      expect([t.kind(), g.world.speed]).toEqual([null, 1]);
      g.world.day = 400;
      g.ui.refresh();
      expect(chip.querySelector('.chip-year').textContent).toBe('Year 2 of 6');
      chip.click();
      expect(t.kind()).toBe('decree');
      expect(t.root.querySelector('#sheet .decree-begin').textContent).toBe(U.close);   // a reminder now: it does not restart the clock
    } finally { t.cleanup(); }
  });

  it('has no daily goals, no heir picker, no records written and no city row', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      const g = t.g();
      for (let i = 0; i < 40; i++) g.ui.refresh();
      expect(g.world.daily).toBe(null);
      expect(t.api.records.load().cities.length).toBe(1);   // the one that opened the card: the run added none
      expect(await waitFor(() => t.decreeStore.load().then((l) => Boolean(l)))).toBe(true);   // saved to its own slot
      expect(await t.store.load()).toBe(null);               // and never to the city's
    } finally { t.cleanup(); }
  });

  it('the menu has Back to your city and Start the decree again, and none of the city\'s own rows', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      const g = t.g();
      g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
      const rows = (c) => t.root.querySelectorAll(`#sheet .${c}`).length;
      expect([rows('menu-back-to-city'), rows('menu-decree-again')]).toEqual([1, 1]);
      expect([rows('menu-new-city'), rows('menu-home'), rows('menu-pass-throne'), rows('menu-rulers'), rows('menu-lesson'), rows('export-city')]).toEqual([0, 0, 0, 0, 0, 0]);
      expect(t.root.querySelector('#sheet .menu-back-to-city').textContent).toBe(U.backToCity);
      t.root.querySelector('#sheet .menu-decree-again').click();
      const d = g.ui.store.get().confirmDialog;
      expect([d.text, d.confirmLabel]).toEqual([U.againQuestion, U.againYes]);
      d.onConfirm();
      await frame();
      expect([t.g().world.decree.week, t.g().world.day, t.g() === g]).toEqual([W47, 0, false]);
    } finally { t.cleanup(); }
  });

  it('Back to your city saves the run, then loads the city; with no city it opens the title', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      t.root.querySelector('#sheet .decree-begin').click();
      t.g().ui.store.set(openSheet(t.g().ui.store.get(), 'menu'));
      t.root.querySelector('#sheet .menu-back-to-city').click();
      expect(await waitFor(() => t.api.phase() === 'title')).toBe(true);
      expect((await t.decreeStore.load()) !== null).toBe(true);
      expect(t.root.querySelector('.decree-go').textContent).toBe(U.continue);   // the title offers the saved run
    } finally { t.cleanup(); }
    const withCity = await titleAt({ records: WITH_TOWN });
    try {
      withCity.api.startGame(withCity.api.freshWorld({ seed: 4 }), {});
      await withCity.g().ui.autosave('new');
      const city = withCity.g().world.cityId;
      withCity.api.startDecree(W47);
      await frame();
      withCity.g().ui.store.set(openSheet(withCity.g().ui.store.get(), 'menu'));
      withCity.root.querySelector('#sheet .menu-back-to-city').click();
      expect(await waitFor(() => withCity.g() && !withCity.g().decree)).toBe(true);
      expect([withCity.g().world.cityId, Boolean(withCity.g().world.decree)]).toEqual([city, false]);
    } finally { withCity.cleanup(); }
  });
});

describe('v93 u wall: a forbidden building shows locked', () => {
  it('Open city locks the wall and the gate with the decree line; no other week does', () => {
    const open = weekOf('open_city');
    expect(open).toBeTruthy();
    const w = createWorld({ seed: 1, decree: { week: open, ids: ['open_city'] } });
    w.milestone = 'capital';
    for (const item of ['wall', 'gate']) {
      const i = cardInfo(w, item);
      expect([item, i.locked, i.lockText]).toEqual([item, true, U.locked]);
    }
    expect(cardInfo(w, 'tower').lockText === U.locked).toBe(false);
    const sea = createWorld({ seed: 1, decree: { week: W47, ids: ['sea_peoples'] } });
    sea.milestone = 'capital';
    expect(cardInfo(sea, 'wall').locked).toBe(false);
    const plain = createWorld({ seed: 1 });
    plain.milestone = 'capital';
    expect(cardInfo(plain, 'wall').locked).toBe(false);
    expect(reasonText('decree')).toBe(U.locked);
  });
  it('the tray draws the wall card locked, saying the line, and a click picks nothing', () => {
    const w = createWorld({ seed: 1, decree: { week: weekOf('open_city'), ids: ['open_city'] } });
    w.milestone = 'capital';
    const box = document.createElement('div');
    document.body.append(box);
    const picked = [];
    try {
      renderCards(box, { world: w, category: 'defence', onPick: (item) => picked.push(item) });
      const wall = box.querySelector('.card[data-item="wall"]');
      expect([wall.classList.contains('locked'), wall.getAttribute('aria-disabled'), wall.textContent.includes(U.locked)]).toEqual([true, 'true', true]);
      wall.click();
      expect(picked).toEqual([]);
    } finally { box.remove(); }
  });
});

describe('v93 u end: the end card', () => {
  async function ended(opts = {}) {
    const t = await runAt(W47, { records: WITH_TOWN, ...opts });
    t.root.querySelector('#sheet .decree-begin').click();
    await frame();
    t.noted = 0;
    t.api.records.noteDecree = () => { t.noted++; return null; };
    const g = t.g();
    g.world.day = 2160; g.world.decree.ended = true; g.world.speed = 0;
    g.ui.refresh();
    await frame();
    return t;
  }

  it('opens by itself with the total, the medal, the three buttons first and the six parts under them', async () => {
    const t = await ended();
    try {
      expect(t.kind()).toBe('decreeEnd');
      const sheet = t.root.querySelector('#sheet');
      // The score sheet's own parts (scoreUi.js scoreTotalLine and scorePartRow): the number, the medal with its dot class, a progress bar per part with its label.
      const r = decreeScore(t.g().world);
      const end = sheet.querySelector('.score-section.decree-end');
      expect([end.querySelector('.score-total .score-number').textContent, end.querySelector('.score-total .medal').className, end.querySelector('.score-total .medal').textContent])
        .toEqual([String(r.total), `medal ${r.medal || 'none'}`, U.medalWords(r.medal)]);
      expect(end.querySelector('.next-medal').textContent).toBe(U.scale(decreeMedals(t.g().world)));
      expect([...end.querySelectorAll('.actions button')].map((b) => [b.textContent, b.classList.contains('primary')])).toEqual([[U.again, true], [U.backToCity, false], [U.share, false]]);   // Version 9.3.1 (Track T, ruling 2028): Try again first and filled
      expect(end.querySelectorAll('.score-parts .score-part').length).toBe(6);
      const bonus = end.querySelector('.score-part[data-part="bonus"]');
      expect([bonus.querySelector('.row span').textContent, bonus.querySelector('.part-bar').getAttribute('role'), bonus.querySelector('.part-bar').getAttribute('aria-label')])
        .toEqual([U.bonusPart, 'progressbar', `${U.bonusPart}: ${r.parts.bonus} of 100`]);
      expect(end.querySelector('.score-part[data-part="people"] .part-bar').getAttribute('aria-label')).toBe(partBarLabel('people', r.parts.people, 100));
      expect([...end.querySelectorAll('h4')].map((h) => h.textContent)).toEqual([U.partsHead, U.rivalsHead]);
      const actions = end.querySelector('.actions'), parts = end.querySelector('.score-parts');
      expect(Boolean(actions.compareDocumentPosition(parts) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);   // the choices are above the lines, as the lesson's end card has them
      expect(sheet.querySelector('.decree-counts').textContent).toBe(U.counts(['sea_peoples']));
      expect(sheet.textContent.includes('Pharaoh')).toBe(false);
      expect(sheet.querySelector('.decree-no-rivals').textContent).toBe(U.noRivals);
    } finally { t.cleanup(); }
  });

  it('notes the run once: a second open of the card, and the chip, do not count another try', async () => {
    const t = await ended();
    try {
      expect(t.noted).toBe(1);
      expect(t.g().world.decree.noted).toBe(true);
      t.g().ui.store.set({ sheet: null });
      t.root.querySelector('.decree-chip').click();
      expect(t.kind()).toBe('decreeEnd');
      t.g().ui.refresh();
      expect(t.noted).toBe(1);
    } finally { t.cleanup(); }
  });

  it('writes the week\'s row through the records (Track S): the score shown, the mark and one try; the share carries a d1 link', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      t.root.querySelector('#sheet .decree-begin').click();
      await frame();
      const g = t.g();
      g.world.day = 2160; g.world.decree.ended = true; g.world.speed = 0;
      g.ui.refresh();
      await frame();
      expect(t.kind()).toBe('decreeEnd');
      const shown = Number(t.root.querySelector('#sheet .score-total .score-number').textContent);
      const rows = t.api.records.decrees();
      expect(rows.map((r) => [r.week, r.mark, r.score, r.tries])).toEqual([[W47, 'Sea Peoples, week 47', shown, 1]]);
      expect(t.root.querySelector('#sheet .decree-best').textContent).toBe(U.yourBest(shown, rows[0].medal));
      const fresh = t.root.querySelector('#sheet .decree-new-best');   // marked as an earned feat is: the done tick, then the words, in the sheet's own ink
      expect([fresh.classList.contains('small'), Boolean(fresh.querySelector('.tick')), fresh.textContent.endsWith(U.newBest)]).toEqual([true, true, true]);
      expect(getComputedStyle(fresh).color).toBe(getComputedStyle(t.root.querySelector('#sheet .decree-best')).color);
      const shared = [];
      const was = Object.getOwnPropertyDescriptor(navigator, 'share');
      Object.defineProperty(navigator, 'share', { value: (d) => { shared.push(d.text); return Promise.resolve(); }, configurable: true });
      try {
        t.root.querySelector('#sheet .decree-share').click();
        await wait(60);
      } finally { if (was) Object.defineProperty(navigator, 'share', was); else delete navigator.share; }
      expect(shared[0]).toContain(`Sea Peoples, week 47: ${shown} of 600`);
      expect(shared[0]).toContain('#d1.2026-47.');
    } finally { t.cleanup(); }
  });

  it('Try again is a new run of the same week from day one; Share offers the score; Back to your city leaves', async () => {
    const t = await ended();
    try {
      const shared = [];
      const g = t.g();
      t.root.querySelector('#sheet .decree-again').click();
      await frame();
      expect([t.g() === g, t.g().world.decree.week, t.g().world.decree.ended, t.g().world.day, t.kind()]).toEqual([false, W47, false, 0, 'decree']);
      t.root.querySelector('#sheet .decree-begin').click();
      t.g().world.day = 2160; t.g().world.decree.ended = true; t.g().ui.refresh();
      await frame();
      expect(t.kind()).toBe('decreeEnd');
      const was = Object.getOwnPropertyDescriptor(navigator, 'share');
      Object.defineProperty(navigator, 'share', { value: (d) => { shared.push(d.text); return Promise.resolve(); }, configurable: true });
      try {
        t.root.querySelector('#sheet .decree-share').click();
        await wait(60);
      } finally { if (was) Object.defineProperty(navigator, 'share', was); else delete navigator.share; }
      expect(shared.length).toBe(1);
      expect(shared[0]).toContain('Sea Peoples, week 47');
      expect(shared[0]).toContain('of 600');
      t.root.querySelector('#sheet .decree-back').click();
      expect(await waitFor(() => t.api.phase() === 'title')).toBe(true);
    } finally { t.cleanup(); }
  });

  it('the rivals on this week show side by side', async () => {
    const t = await runAt(W47, { records: WITH_TOWN });
    try {
      t.root.querySelector('#sheet .decree-begin').click();
      const g = t.g();
      const was = t.api.records.load;
      t.api.records.load = () => ({ ...was(), rivals: [
        { id: 'a', week: W47, name: 'Nefer', score: 380, parts: { people: 60, prosperity: 60, culture: 60, safety: 60, monuments: 60 }, heir: 'steady' },
        { id: 'b', week: '2026-46', name: 'Other week', score: 500, parts: {}, heir: 'steady' },
      ] });
      g.world.decree.ended = true; g.world.speed = 0;
      g.ui.refresh();
      await frame();
      expect(t.kind()).toBe('decreeEnd');
      expect(t.root.querySelectorAll('#sheet .decree-rival').length).toBe(1);
      expect(t.root.querySelector('#sheet .decree-rival').textContent).toBe('Nefer: 380');
      expect(Boolean(t.root.querySelector('#sheet .side-by-side'))).toBe(true);
    } finally { t.cleanup(); }
    expect(partsObject([1, 2, 3, 4, 5, 6])).toEqual({ people: 1, prosperity: 2, culture: 3, safety: 4, monuments: 5, bonus: 6 });
  });
});

describe('v93 u rows: the ruler list\'s decree rows', () => {
  it('sit among the rulers by date, with the mark and the medal, no regnal number, and replay the map', () => {
    const parts = { people: 80, prosperity: 70, culture: 60, safety: 50, monuments: 40, bonus: 90 };
    const records = {
      rulers: () => [{ id: 'r1', n: 2, name: 'Ramesses', title: 'builder', heir: 'builder', rank: 'town', day: 900, score: 250, parts: { people: 50, prosperity: 50, culture: 50, safety: 50, monuments: 50 }, medal: 'bronze', version: 3, seed: 9, difficulty: 'normal', mapVariant: 'classic', mapSize: 32, map: null, feats: [], date: 2000 }],
      decrees: () => [
        { id: 'd1', week: '2026-47', ids: ['sea_peoples'], mark: 'Sea Peoples, week 47', score: 412, parts, medal: 'silver', date: 3000, map: null, tries: 2 },
        { id: 'd0', week: '2026-48', ids: ['low_nile'], mark: 'Low Nile, week 48', score: 301, parts, medal: 'bronze', date: 1000, map: null, tries: 1 },
      ],
    };
    const body = document.createElement('div');
    document.body.append(body);
    const played = [];
    try {
      renderRulers(body, { records, onPlay: (r) => played.push(r) });
      const items = [...body.querySelectorAll('.rulers-list > li')];
      expect(items.map((li) => li.className.split(' ').filter((c) => c !== 'ruler').join('') || 'ruler')).toEqual(['decree', 'ruler', 'decree']);
      const row = items[0];
      expect(row.querySelector('.decree-row-mark').textContent).toBe('Sea Peoples, week 47');
      expect(row.querySelector('.ruler-score').textContent).toBe('412');
      expect(row.querySelector('.ruler-medal').textContent).toBe('Silver medal');
      expect(row.querySelector('.cartouche')).toBe(null);
      expect(row.querySelector('.ruler-row').getAttribute('aria-label')).toBe(U.rowName(records.decrees()[0]));
      row.querySelector('.ruler-row').click();
      expect(row.querySelector('.ruler-detail').hidden).toBe(false);
      expect(row.querySelectorAll('.ruler-part').length).toBe(6);
      row.querySelector('.play-map').click();
      expect(played).toEqual([{ seed: 202647, difficulty: 'normal', mapSize: DEFAULT_MAP_SIZE, mapVariant: 'classic' }]);   // fix wave: the week's own map (week.js decreeMapOf); 2026-W47 is Sea Peoples, so the river, not the seed's oasis
    } finally { body.remove(); }
  });
});
