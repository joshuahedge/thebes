// Version 9.0 Track D, the fix wave: words that left a trait out (the Nilometer's note, the unit pay lines, the Builder's work gold, the pre-flood rows), the Pass
// sheet's side by side (the sealed score's parts, above the buttons), the name field's words, and the Generous through the palace's taxModel. Each set up as the
// Steady and as the heir.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { UNIT_TYPES } from '../../../src/data/armies.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { createRecords } from '../../../src/save/records.js';
import { workGoldPerUnit } from '../../../src/sim/costs.js';
import { passScore } from '../../../src/sim/dynasty.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { riverRows } from '../../../src/ui/s46/river.js';
import { createArmiesUi } from '../../../src/ui/s46/armies.js';
import { buildingParts } from '../../../src/ui/dangerSheets.js';
import { siteRows, taxModel } from '../../../src/ui/monumentSheet.js';
import { monumentLine } from '../../../src/ui/placement.js';
import { createPassSheets } from '../../../src/ui/v90/passSheet.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { FIRST_TEXT, UI4_TEXT, V84_G_TEXT, V90_D_TEXT, V90_L_TEXT } from '../../../src/ui/text.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { mount } from '../../helpers/dom.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { riverWorld, addFarm, addGranary, dayOf } from '../../stage46/river/riverHelpers.js';
import { rushCity } from '../../v84/g/fixtures.js';

const as = (w, heir) => { w.heir = heir; return w; };

describe('v90 d fix: the Nilometer\'s note says this city\'s figures', () => {
  function city(heir) {
    const w = as(riverWorld(), heir);
    addFarm(w, 22, 11); addGranary(w, 24, 11);
    addRaw(w, 'nilometer', 19, 12).staff = 2;
    w.day = dayOf(2, 8);
    return w;
  }
  it('reads 73% not 60% for the Steady and 60% not 40% for the Bountiful', () => {
    const note = (heir) => explainStat(city(heir), 'date').notes.find((n) => n.startsWith('A staffed Nilometer'));
    expect(note('steady')).toBe('A staffed Nilometer stands, so the farms prepare: a Low flood gives floodplain farms 73%, not 60%.');
    expect(note('bountiful')).toBe('A staffed Nilometer stands, so the farms prepare: a Low flood gives floodplain farms 60%, not 40%.');
  });
});

describe('v90 d fix: the unit pay lines say what the city pays', () => {
  function rows(heir) {
    const w = as(makeTestWorld(), heir);
    const ui = createArmiesUi({ world: w });
    const range = addRaw(w, 'archery_range', 2, 2, { staff: 6 }), stab = addRaw(w, 'stables', 6, 2, { staff: 6 }), bar = addRaw(w, 'barracks', 10, 2);
    const text = (b) => ui.sheetParts.building(b).map((n) => n.textContent).join(' | ');
    return { archer: text(range), chariot: text(stab), soldier: buildingParts({ world: w }, bar).map((n) => n.textContent).join(' | ') };
  }
  it('is the data\'s pay for the Steady and 20% lower for the Unconquered, on all three sheets', () => {
    const s = rows('steady'), u = rows('unconquered');
    expect(s.soldier).toContain(`Each soldier is paid ${UNIT_TYPES.soldier.pay} gold a month`);
    expect(s.archer).toContain(`Each archer is paid ${UNIT_TYPES.archer.pay} gold a month`);
    expect(s.chariot).toContain(`Each chariot is paid ${UNIT_TYPES.chariot.pay} gold a month`);
    expect(u.soldier).toContain('Each soldier is paid 6.4 gold a month');
    expect(u.archer).toContain('Each archer is paid 4.8 gold a month');
    expect(u.chariot).toContain('Each chariot is paid 8 gold a month');
  });
});

describe('v90 d fix: the Builder\'s work gold counts the crews it speeds up', () => {
  it('quotes 15% more a crew a month on the site sheet and on the placement line, and the Steady\'s as before', () => {
    const steady = rushCity({ stone: 2000 }), builder = rushCity({ stone: 2000 });
    as(builder.w, 'builder');
    for (const [c, f] of [[steady, 1], [builder, 1.15]]) {
      const gold = siteRows(c.w, c.site).find((r) => r.key === 'gold').text;
      expect(gold).toBe(UI4_TEXT.workGold(workGoldPerUnit(c.w, c.site.style) * MONUMENT.unitsPerCrewMonth * f));
    }
    expect(siteRows(builder.w, builder.site).find((r) => r.key === 'gold').text === siteRows(steady.w, steady.site).find((r) => r.key === 'gold').text).toBe(false);
    for (const [w, f] of [[as(createWorld({ seed: 11 }), 'steady'), 1], [as(createWorld({ seed: 11 }), 'builder'), 1.15]]) {
      buildSampleCity(w);
      expect(monumentLine(w, 'obelisk_small', 20, 11)).toContain(UI4_TEXT.crewGold(workGoldPerUnit(w, null) * MONUMENT.unitsPerCrewMonth * f));
    }
  });
});

describe('v90 d fix: the rows before a first flood say this city\'s levels', () => {
  it('says the farm\'s range, and the First flood card, at 60% for the Steady and 40% for the Bountiful', () => {
    const farmRow = (heir) => {
      const w = as(riverWorld(), heir);
      const farm = addFarm(w, 22, 11); addGranary(w, 24, 11);
      w.day = dayOf(2, 3);
      const { root, cleanup } = mount('<div id="x"></div>');
      try { root.querySelector('#x').append(...riverRows(w, farm)); return { text: root.querySelector('#x').textContent, w }; } finally { cleanup(); }
    };
    const s = farmRow('steady'), b = farmRow('bountiful');
    expect(s.text).toContain('from 60% to');
    expect(b.text).toContain('from 40% to');
    expect(FIRST_TEXT.first_flood.whyFor(s.w)).toContain('Low 60%');
    expect(FIRST_TEXT.first_flood.whyFor(b.w)).toContain('Low 40%');
    expect(FIRST_TEXT.first_flood.why).toContain('Low 60%');   // 8.4's card, for any reader without a city
  });
});

describe('v90 d fix: the Generous through the palace\'s taxModel', () => {
  it('quotes High at x1.15 and says so in its line, the Steady at x1.25', () => {
    const make = (heir) => { const w = as(createWorld({ seed: 11 }), heir); buildSampleCity(w); return w; };
    const s = make('steady'), g = make('generous');
    const ms = taxModel(s), mg = taxModel(g);
    // The Generous's sample city grows differently (more newcomers), so each is quoted against its own normal taxes (monthFigures' taxesNormal, untraited).
    expect([ms.normal, mg.normal]).toEqual([monthFigures(s).taxesNormal, monthFigures(g).taxesNormal]);
    expect(ms.normal > 100).toBe(true);
    expect([ms.at.high, mg.at.high]).toEqual([Math.round(ms.normal * 1.25), Math.round(mg.normal * 1.15 * 0.98)]);   // 9.2 (Track S): the Generous's taxes lower at every rate (x0.98, 9.2 balance ruling 1859)
    expect([ms.at.low, mg.at.low]).toEqual([Math.round(ms.normal * 0.75), Math.round(mg.normal * 0.75 * 0.98)]);   // Low is the same factor for both, less the Generous's 2%
    const normal = mg.normal;
    const high = (m) => m.choices.find((c) => c.rate === 'high');
    expect(high(mg).line).toBe(V84_G_TEXT.rateLine('high', normal, mg.at));
    expect(high(mg).line.startsWith(`${mg.at.high - mg.at.normal} gold a month more`)).toBe(true);   // 9.2 (Track S): the Generous's Normal is its taxes x0.95, so High is quoted against that
    expect(high(ms).line.startsWith(`${ms.at.high - ms.normal} gold a month more`)).toBe(true);
    expect(high(mg).line === high(ms).line).toBe(false);
  });
});

describe('v90 d fix: the Pass sheet', () => {
  function build(world, records) {
    const { root, cleanup } = mount('<div id="a"></div>');
    const sheets = createPassSheets({ world, store: createStore(INITIAL_UI_STATE), toasts: { show() {} }, hooks: { records, startHeir() {} }, clock: () => 5 });
    sheets.passThrone(root.querySelector('#a'), {});
    return { root, cleanup };
  }
  function capital() {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    w.tally.stoneLaid = 2500;
    return w;
  }
  const parts = { people: 91, prosperity: 82, culture: 73, safety: 64, monuments: 55 };
  const memory = (data) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } });
  it('draws a kept rival\'s side by side above the buttons, with the sealed score and its parts', () => {
    const w = capital();
    w.seals.push({ day: 100, score: 9000, parts, medal: 'gold', version: 2, won: true });
    const kept = passScore(w);
    expect([kept.sealed, kept.score]).toEqual([true, 9000]);
    const rival = { name: 'Ana', heir: 'merchant', seed: w.seed, difficulty: w.difficulty, mapVariant: w.mapVariant, mapSize: w.mapSize, score: 300, parts, splits: {}, version: 2, added: 5 };
    const records = createRecords({ storage: memory({ [RECORDS_KEY]: JSON.stringify({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [rival], dynasty: { name: '', heir: 'steady' } }) }) });
    const { root, cleanup } = build(w, records);
    try {
      const sbs = root.querySelector('#pass-side-by-side, .side-by-side');
      expect(Boolean(sbs)).toBe(true);
      expect(sbs.querySelector('.sbs-side.you .sbs-score').textContent).toBe(String(kept.score));
      for (const p of Object.keys(parts)) expect(sbs.querySelector(`.sbs-line.you[data-part="${p}"] .sbs-number`).textContent).toBe(String(parts[p]));
      const buttons = root.querySelector('.pass-sheet .actions');
      expect(Boolean(sbs.compareDocumentPosition(buttons) & 4)).toBe(true);   // the buttons follow the side by side
      expect(sbs.querySelector('h3').textContent).toBe(V90_L_TEXT.sideHead('Ana'));
    } finally { cleanup(); }
  });
  it('draws no side by side on a map with no rival', () => {
    const records = createRecords({ storage: memory({}) });
    const { root, cleanup } = build(capital(), records);
    try { expect(root.querySelector('.side-by-side')).toBe(null); } finally { cleanup(); }
  });
  it('labels the name field with the dynasty\'s name and lists what is allowed', () => {
    const { root, cleanup } = build(capital(), createRecords({ storage: memory({}) }));
    try {
      expect(root.querySelector('label[for="pass-name"]').textContent).toBe(V90_D_TEXT.nameLabel);
      expect(V90_D_TEXT.nameLabel).toBe("Your dynasty's name");
      const hint = root.querySelector('#pass-name-hint').textContent;
      expect(hint).toBe("Up to 16 characters: letters, digits, spaces and ' - . only. The game adds the number.");
    } finally { cleanup(); }
  });
});
