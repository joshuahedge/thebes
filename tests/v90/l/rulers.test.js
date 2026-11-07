// Version 9.0 Track L (rulings 1585, 1591, 1592): the ruler list. Rows newest first and never capped, each a one-line button that opens to its parts, feats, heir,
// map and (when kept) rival side by side; Play this map hands the row's seed, level, layout and size to onPlay; the install ask is the top line while it is due.
// The list reads records.rulers() whatever wrote the rows (Track D writes them at the Pass; these tests seed them).
import { describe, it, expect } from '../../harness.js';
import { renderRulers, rulerRow } from '../../../src/ui/v90/rulers.js';
import { createRecords, mapSquareOf } from '../../../src/save/records.js';
import { RECORDS_KEY, RECORDS_MAX } from '../../../src/data/scoring.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { V90_L_TEXT } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';
import { mountShell } from '../../helpers/uiWorld.js';

function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const sample = createWorld({ seed: 11 });
buildSampleCity(sample);
const MAP = mapSquareOf(sample);
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const ruler = (i, over = {}) => ({
  id: `c${i}:3600`, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 200 + i, parts: PARTS, medal: 'silver', version: 2,
  seed: 100 + i, difficulty: 'normal', mapVariant: 'classic', mapSize: 64, map: MAP, feats: ['debt_free'], date: i, ...over,
});
const cityRow = (i) => ({ id: `city${i}`, seed: 9, difficulty: 'normal', scoreVersion: 2, best: 100 + i, bestDay: 900, medal: null, splits: {}, updated: i });
const recordsWith = (rulers, extra = {}) => createRecords({ storage: memory({ version: 2, cities: [], chronicle: [], rulers, rivals: [], dynasty: { name: '', heir: 'steady' }, ...extra }) });

describe('v90 l rulers: the list', () => {
  it('lists every ruler newest first and never caps them: 250 rulers beside 200 capped cities', () => {
    const storage = memory({ version: 2, cities: Array.from({ length: 230 }, (_, i) => cityRow(i)), chronicle: [], rulers: Array.from({ length: 250 }, (_, i) => ruler(i)), rivals: [], dynasty: { name: '', heir: 'steady' } });
    const records = createRecords({ storage });
    records.noteCity(createWorld({ seed: 5, cityId: 'now' }), 999);                  // a write: the cities are capped, the rulers are not
    const kept = JSON.parse(storage.data[RECORDS_KEY]);
    expect([kept.cities.length <= RECORDS_MAX, kept.rulers.length]).toEqual([true, 250]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records });
      const rows = [...body.querySelectorAll('.ruler')];
      expect(rows.length).toBe(250);
      expect(rows.map((r) => r.dataset.id).slice(0, 3)).toEqual(['c249:3600', 'c248:3600', 'c247:3600']);
      expect(rows[249].dataset.id).toBe('c0:3600');
    } finally { cleanup(); }
  });
  it('shows a row as one line: name with regnal number and title, rank, years, score and the medal in words, and the map square', () => {
    const records = recordsWith([ruler(1, { n: 2, name: 'Khufu', title: 'merchant', day: 4500, score: 312, medal: 'gold', rank: 'great_city' }), ruler(2, { n: 4, medal: null, title: 'steady', rank: 'town', day: 360 })]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records });
      const [newest, older] = [...body.querySelectorAll('.ruler-row')];
      expect(newest.querySelector('.ruler-name').textContent).toBe('Ramesses IV the Steady');
      expect(newest.querySelector('.ruler-sub').textContent).toBe('Town · 1.0 years');
      expect([older.querySelector('.ruler-name').textContent, older.querySelector('.ruler-sub').textContent, older.querySelector('.ruler-score').textContent, older.querySelector('.ruler-medal').textContent]).toEqual(['Khufu II the Merchant', 'Great city · 12.5 years', '312', 'Gold medal']);
      expect(newest.querySelector('.ruler-medal').textContent).toBe('No medal');
      expect(older.getAttribute('aria-label')).toBe('Khufu II the Merchant, Great city, 12.5 years, score 312, Gold medal');
      expect([V90_L_TEXT.roman(1), V90_L_TEXT.roman(4), V90_L_TEXT.roman(9), V90_L_TEXT.roman(14), V90_L_TEXT.roman(49)]).toEqual(['I', 'IV', 'IX', 'XIV', 'XLIX']);
      const c = older.querySelector('canvas.ruler-map');
      expect([c.width, c.height, c.getAttribute('aria-hidden')]).toEqual([32, 32, 'true']);
      const px = c.getContext('2d').getImageData(0, 0, 32, 32).data;                // the picture is drawn from the row's map string
      expect([...px].some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
      expect(new Set(Array.from({ length: 1024 }, (_, i) => `${px[i * 4]},${px[i * 4 + 1]},${px[i * 4 + 2]}`)).size > 3).toBe(true);
    } finally { cleanup(); }
  });
  it('opens a row to its parts, feats, heir and map, and closes it again', () => {
    const records = recordsWith([ruler(1, { heir: 'bountiful', feats: ['debt_free', 'well_fed'], mapVariant: 'east', mapSize: 80, seed: 4242, difficulty: 'hard' })]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records });
      const row = body.querySelector('.ruler-row'), detail = body.querySelector('.ruler-detail');
      expect([row.getAttribute('aria-expanded'), detail.hidden, row.getAttribute('aria-controls') === detail.id]).toEqual(['false', true, true]);
      fire(row, 'click');
      expect([row.getAttribute('aria-expanded'), detail.hidden]).toEqual(['true', false]);
      expect([...detail.querySelectorAll('.ruler-part')].map((p) => [p.dataset.part, p.querySelector('.part-number').textContent])).toEqual([['people', '72'], ['prosperity', '65'], ['culture', '58'], ['safety', '40'], ['monuments', '36']]);
      expect(detail.querySelector('.ruler-heir').textContent).toBe('Heir of the Bountiful');
      expect(detail.querySelector('.ruler-feats').textContent).toBe('Feats: Debt-free founder, Well fed');
      expect(detail.querySelector('.ruler-map-line').textContent).toBe('Seed 4242, Hard, east layout, 80 x 80 map');
      expect(detail.querySelector('.side-by-side')).toBe(null);                      // no rival kept
      fire(row, 'click');
      expect([row.getAttribute('aria-expanded'), detail.hidden]).toEqual(['false', true]);
    } finally { cleanup(); }
  });
  it('shows the rival side by side in a row that kept one, and not in a row that did not', () => {
    const rival = { id: 'Ana@11|normal', name: 'Ana', heir: 'merchant', score: 380, parts: { people: 60, prosperity: 55, culture: 50, safety: 45, monuments: 40 }, splits: {}, version: 2 };
    const records = recordsWith([ruler(1, { heir: 'builder', rival }), ruler(2)]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records });
      const [plain, withRival] = [...body.querySelectorAll('.ruler-detail')];
      expect([plain.querySelector('.side-by-side'), withRival.querySelector('.side-by-side h3').textContent]).toEqual([null, 'Side by side with Ana']);
      expect([...withRival.querySelectorAll('.sbs-side')].map((p) => p.textContent.replace(/\s+/g, ' ').trim())).toEqual(['You 201 Heir of the Builder', 'Ana 380 Heir of the Merchant']);
      expect([...withRival.querySelectorAll('.sbs-part[data-part="people"] .sbs-number')].map((n) => n.textContent)).toEqual(['72', '60']);
    } finally { cleanup(); }
  });
  it('hands the row to Play this map with its seed, level, layout and size', () => {
    const played = [];
    const records = recordsWith([ruler(1, { seed: 4242, difficulty: 'hard', mapVariant: 'island', mapSize: 80 })]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records, onPlay: (r) => played.push([r.seed, r.difficulty, r.mapVariant, r.mapSize]) });
      const play = body.querySelector('.play-map');
      expect([play.textContent, body.querySelector('.ruler-play-note').textContent]).toEqual(['Play this map', 'Opens New city on this seed, level, layout and size. A city you have is replaced unless you export it first.']);
      expect(play.getAttribute('aria-describedby')).toBe(body.querySelector('.ruler-play-note').id);
      fire(play, 'click');
      expect(played).toEqual([[4242, 'hard', 'island', 80]]);
    } finally { cleanup(); }
  });
  it('says there is no ruler yet on a device with none, with a Back when the panel has no head', () => {
    let backs = 0;
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records: recordsWith([]), onBack: () => { backs++; } });
      expect(body.querySelector('.rulers-empty').textContent).toBe('No rulers yet. A reign you pass on is kept here.');
      expect(body.querySelector('.rulers-install')).toBe(null);
      fire(body.querySelector('.guide-back'), 'click');
      expect(backs).toBe(1);
      renderRulers(body, { records: createRecords({ storage: { getItem() { throw new Error('blocked'); }, setItem() {} } }) });   // blocked storage reads as none
      expect(body.querySelector('.rulers-empty')).toBeTruthy();
    } finally { cleanup(); }
  });
  it('puts the install ask on top while it is due, with Install, and not when it is not', () => {
    const asked = [];
    const records = recordsWith([ruler(1)]);
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records, installAsk: true, onInstall: () => asked.push('install') });
      expect(body.querySelector('.rulers-body').firstElementChild.classList.contains('rulers-install')).toBe(true);
      expect(body.querySelector('.install-ask').textContent).toBe("Install Thebes to keep your rulers: Safari clears a site's data after 7 days without a visit");
      fire(body.querySelector('.install-ask-button'), 'click');
      expect(asked).toEqual(['install']);
      renderRulers(body, { records, installAsk: false });
      expect(body.querySelector('.rulers-install')).toBe(null);
      renderRulers(body, { records: recordsWith([]), installAsk: true });             // no ruler kept yet: nothing to keep, nothing to ask
      expect(body.querySelector('.rulers-install')).toBe(null);
    } finally { cleanup(); }
  });
  it('builds a row for one ruler on its own, an unreadable map string leaving a blank square', () => {
    const row = rulerRow({ ...ruler(1), map: '' }, {});
    expect(row.querySelector('canvas').width).toBe(32);
    expect(row.querySelector('.ruler-row').getAttribute('aria-expanded')).toBe('false');
  });
});

describe('v90 l rulers: layout at phone width', () => {
  for (const [w, h, text] of [[375, 667, 1], [390, 844, 1], [375, 667, 1.5], [390, 844, 1.5]]) {
    it(`keeps a row one line of name, score and map without overflow at ${w}x${h}, ${text * 100}% text`, async () => {
      const shell = await mountShell(w, h);
      try {
        shell.root.style.setProperty('--ui-scale', String(text));
        const sheet = shell.root.querySelector('#sheet');
        sheet.hidden = false;
        const body = document.createElement('div'); body.className = 'body';
        sheet.append(body);
        const records = recordsWith([ruler(1, { n: 14, name: 'Ramesses the Gr', title: 'unconquered', score: 1234, medal: 'silver' }), ruler(2)]);
        renderRulers(body, { records });
        const rows = [...body.querySelectorAll('.ruler-row')];
        for (const r of rows) {
          const b = r.getBoundingClientRect(), name = r.querySelector('.ruler-name').getBoundingClientRect(), score = r.querySelector('.ruler-score-box').getBoundingClientRect(), map = r.querySelector('canvas').getBoundingClientRect();
          expect(b.height >= 44).toBe(true);
          expect(name.right <= score.left + 1).toBe(true);                         // the name wraps before it can go under the score
          expect(score.right <= map.left + 1).toBe(true);
          expect(b.right <= sheet.getBoundingClientRect().right + 1).toBe(true);
        }
        fire(rows[0], 'click');
        expect(body.scrollWidth <= body.clientWidth + 1).toBe(true);
        for (const btn of body.querySelectorAll('button')) if (btn.offsetParent !== null) expect([btn.getBoundingClientRect().height >= 44, (btn.textContent || btn.getAttribute('aria-label')).length > 0]).toEqual([true, true]);
      } finally { shell.cleanup(); }
    });
  }
});
