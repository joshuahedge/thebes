// Version 9.0 Track L (rulings 1586, 1593): the backup. An export file carries the rulers and rivals (packSave's records); Bring rulers from a file (Options > Saves) reads
// a file's records only, says what a merge adds before Merge, merges by id, and refuses a bad or newer file with the reason. A city, a stamp or a world is never brought.
// The ruler name field is a labelled field of at most 16 characters.
import { describe, it, expect } from '../../harness.js';
import { readRecordsFile, bringSummary, pickTextFile } from '../../../src/save/exportImport.js';
import { createRecords, RULER_NAME_MAX } from '../../../src/save/records.js';
import { packSave } from '../../../src/save/serialize.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { createWorld } from '../../../src/sim/world.js';
import { rulerNameRow, bringRulersRow } from '../../../src/ui/v90/rulerOptions.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createSettings } from '../../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { V90_L_TEXT } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';

function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const ruler = (id, date, over = {}) => ({ id, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 250, parts: PARTS, medal: null, version: 2, seed: 5, difficulty: 'normal', mapVariant: 'classic', mapSize: 64, map: '', feats: [], date, ...over });
const rival = (name, seed, added, score = 300) => ({ name, heir: 'merchant', seed, difficulty: 'normal', mapVariant: 'classic', mapSize: 64, score, parts: PARTS, splits: {}, version: 2, added });
const cityRow = (id) => ({ id, seed: 9, difficulty: 'normal', scoreVersion: 2, best: 123, bestDay: 900, medal: null, splits: {}, updated: 1 });
const recs = (o) => ({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: { name: '', heir: 'steady' }, ...o });
const fileOf = (records, extra = {}) => JSON.stringify({ version: 1, savedAt: 1, lastSpeed: 1, world: { junk: true }, records, ...extra });

describe('v90 l bring: the file', () => {
  it('finds the rulers and rivals in an export made by packSave, and leaves its world unread', () => {
    const device = createRecords({ storage: memory(recs({ rulers: [ruler('a:1', 1), ruler('b:2', 2)], rivals: [rival('Ana', 5, 10)], dynasty: { name: 'Khufu', heir: 'builder' } })) });
    const text = packSave(createWorld({ seed: 3 }), { savedAt: 5, records: device.load() });
    const read = readRecordsFile(text);
    expect(read.ok).toBe(true);
    expect([read.records.rulers.map((r) => r.id), read.records.rivals.map((v) => v.name), read.records.dynasty]).toEqual([['a:1', 'b:2'], ['Ana'], { name: 'Khufu', heir: 'builder' }]);
    expect(readRecordsFile(fileOf(recs({ rulers: [ruler('z:1', 1)] }))).ok).toBe(true);   // the world in the file is junk and is never looked at
  });
  it('leaves a file\'s cities and stamps out of what it brings', () => {
    const read = readRecordsFile(fileOf(recs({ cities: [cityRow('c1')], chronicle: [], rulers: [ruler('a:1', 1)] })));
    expect([read.records.cities, read.records.chronicle, read.records.rulers.length]).toEqual([[], [], 1]);
  });
  it('refuses what is not a file of rulers, with the reason', () => {
    expect(readRecordsFile('not json at all')).toEqual({ ok: false, reason: 'unreadable' });
    for (const text of ['{}', '[]', '5', 'null', '{"version":1}', '{"version":1,"records":5}', '{"records":[]}']) expect([text, readRecordsFile(text).reason]).toEqual([text, 'bad']);
    expect(readRecordsFile(fileOf(recs({}), { version: 2 }))).toEqual({ ok: false, reason: 'newer' });                         // a newer save file
    expect(readRecordsFile(fileOf({ ...recs({}), version: 3 }))).toEqual({ ok: false, reason: 'newer' });                     // newer records
    expect(readRecordsFile(fileOf({ version: 1, cities: [], chronicle: [] })).records.rulers).toEqual([]);                     // a records version 1 file reads with none
  });
  it('counts what a merge adds: rulers by id, rivals by name and map, a rival the device has adding nothing', () => {
    const device = recs({ rulers: [ruler('a:1', 1), ruler('b:2', 2)], rivals: [rival('Ana', 5, 10)] });
    const file = recs({ rulers: [ruler('b:2', 2), ruler('c:3', 3), ruler('d:4', 4)], rivals: [rival('Ana', 5, 99), rival('Bo', 5, 11), rival('Ana', 6, 12)] });
    expect(bringSummary(device, file)).toEqual({ rulers: 2, rivals: 2 });
    expect(bringSummary(device, device)).toEqual({ rulers: 0, rivals: 0 });
    expect(bringSummary(recs({}), file)).toEqual({ rulers: 3, rivals: 3 });
    expect(V90_L_TEXT.bringAdds(4, 2)).toBe('Adds 4 rulers and 2 rivals');
    expect(V90_L_TEXT.bringAdds(1, 1)).toBe('Adds 1 ruler and 1 rival');
  });
});

describe('v90 l bring: Bring rulers from a file', () => {
  function rig(fileText, start = recs({ rulers: [ruler('a:1', 1), ruler('b:2', 2)], rivals: [rival('Ana', 5, 10)], cities: [cityRow('mine')], dynasty: { name: 'Khufu', heir: 'steady' } })) {
    const records = createRecords({ storage: memory(start) });
    const m = mount('<div id="host"></div>');
    const picks = [];
    const hooks = { records, bringRulers: async () => { picks.push(1); if (fileText instanceof Error) throw fileText; return fileText; } };
    const row = bringRulersRow(hooks);
    m.root.querySelector('#host').append(row);
    return { records, row, picks, answer: () => row.querySelector('.bring-answer'), pick: async () => { fire(row.querySelector('.bring-rulers'), 'click'); await flush(); await flush(); }, cleanup: m.cleanup };
  }
  it('says "Adds 2 rulers and 1 rival" before Merge, then merges by id and leaves the device\'s cities as they were', async () => {
    const file = fileOf(recs({ rulers: [ruler('b:2', 2), ruler('c:3', 3), ruler('d:4', 4)], rivals: [rival('Ana', 5, 99), rival('Bo', 5, 11)], cities: [cityRow('theirs')], dynasty: { name: 'Other', heir: 'builder' } }));
    const r = rig(file);
    try {
      await r.pick();
      expect(r.answer().querySelector('.bring-text').textContent).toBe('Adds 2 rulers and 1 rival');
      expect([...r.answer().querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Merge', 'Cancel']);
      expect(r.records.rulers().length).toBe(2);                                    // nothing merged yet
      fire(r.answer().querySelector('.bring-merge'), 'click');
      expect(r.answer().querySelector('.bring-text').textContent).toBe('Merged. Added 2 rulers and 1 rival.');
      const after = r.records.load();
      expect([after.rulers.map((x) => x.id).sort(), after.rivals.map((v) => v.name).sort()]).toEqual([['a:1', 'b:2', 'c:3', 'd:4'], ['Ana', 'Bo']]);
      expect(after.rivals.find((v) => v.name === 'Ana').added).toBe(99);             // the friend's newer score replaced the older row
      expect([after.cities.map((c) => c.id), after.dynasty.name]).toEqual([['mine'], 'Khufu']);   // a city is never brought; the device keeps its own name
    } finally { r.cleanup(); }
  });
  it('merges nothing on Cancel, and says so when the file holds nothing new', async () => {
    const file = fileOf(recs({ rulers: [ruler('c:3', 3)] }));
    const r = rig(file);
    try {
      await r.pick();
      fire(r.answer().querySelector('.bring-cancel'), 'click');
      expect([r.answer().childNodes.length, r.records.rulers().length]).toEqual([0, 2]);
    } finally { r.cleanup(); }
    const same = rig(fileOf(recs({ rulers: [ruler('a:1', 1)] })));
    try {
      await same.pick();
      expect(same.answer().querySelector('.bring-text').textContent).toBe('Nothing new: this device already has every ruler and rival in that file.');
      expect(same.answer().querySelector('.bring-merge')).toBe(null);
    } finally { same.cleanup(); }
  });
  it('refuses a bad file, a newer one and one that cannot be read, saying why and what to do', async () => {
    for (const [text, words] of [['{"hello":1}', V90_L_TEXT.bringBad], [fileOf(recs({}), { version: 2 }), V90_L_TEXT.bringNewer], ['{{{', V90_L_TEXT.bringUnreadable], [new Error('denied'), V90_L_TEXT.bringUnreadable]]) {
      const r = rig(text);
      try {
        await r.pick();
        expect(r.answer().querySelector('.bring-text').textContent).toBe(words);
        expect(r.answer().querySelector('.bring-merge')).toBe(null);
        expect(r.records.rulers().length).toBe(2);
      } finally { r.cleanup(); }
    }
    expect(V90_L_TEXT.bringBad.includes('Pick a Thebes city file')).toBe(true);
    expect(V90_L_TEXT.bringNewer.includes('Update the game')).toBe(true);
  });
  it('says nothing when no file is picked, and reads nothing from the world in a file', async () => {
    const r = rig(null);
    try { await r.pick(); expect([r.picks.length, r.answer().childNodes.length]).toEqual([1, 0]); } finally { r.cleanup(); }
  });
  it('offers its own picker through pickTextFile, which adds its input for the moment it takes and removes it', async () => {
    const added = [];
    const input = { type: '', accept: '', hidden: false, files: [{ text: async () => 'file text' }], parentNode: {}, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, remove() { this.parentNode = null; }, click() { Promise.resolve().then(() => this.listeners.change()); } };
    const doc = { createElement: () => input, body: { append: (n) => added.push(n) } };
    expect(await pickTextFile(doc)).toBe('file text');
    expect([input.type, input.accept, added.length, input.parentNode]).toEqual(['file', '.json,application/json', 1, null]);
    const cancelled = { ...input, files: [], parentNode: {}, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, click() { Promise.resolve().then(() => this.listeners.cancel()); }, remove() { this.parentNode = null; } };
    expect(await pickTextFile({ createElement: () => cancelled, body: { append() {} } })).toBe(null);
  });
});

describe('v90 l bring: the ruler name field', () => {
  function rig(start = recs({})) {
    const records = createRecords({ storage: memory(start) });
    const m = mount('<div id="host"></div>');
    const row = rulerNameRow({ records });
    m.root.querySelector('#host').append(row);
    const input = row.querySelector('input'), status = row.querySelector('.ruler-name-status');
    const type = (text) => { input.value = text; fire(input, 'change'); };
    return { records, row, input, status, type, cleanup: m.cleanup };
  }
  it('is a labelled field with a 16-character limit that the words say', () => {
    const r = rig();
    try {
      expect([r.input.getAttribute('maxlength'), RULER_NAME_MAX]).toEqual(['16', 16]);
      const label = r.row.querySelector('label');
      expect([label.getAttribute('for'), r.input.id, label.textContent]).toEqual(['ruler-name', 'ruler-name', "Your dynasty's name"]);
      expect(r.row.querySelector('.ruler-name-hint').textContent.includes("Letters, digits, spaces and ' - . only, 16 at most.")).toBe(true);
      expect(r.input.getAttribute('aria-describedby').split(' ')).toEqual(['ruler-name-hint', 'ruler-name-status']);
      expect(r.status.getAttribute('role')).toBe('status');
    } finally { r.cleanup(); }
  });
  it('keeps a good name on the dynasty, shows the one already kept, and cleans or refuses a bad one with the reason', () => {
    const r = rig(recs({ dynasty: { name: 'Khufu', heir: 'steady' } }));
    try {
      expect(r.input.value).toBe('Khufu');
      r.type('Ana');
      expect([r.records.dynasty().name, r.status.textContent]).toEqual(['Ana', 'Ruler name kept: Ana']);
      r.type("  O'Neil <b>  ");
      expect([r.records.dynasty().name, r.input.value, r.status.textContent]).toEqual(["O'Neil b", "O'Neil b", "Kept as O'Neil b: only letters, digits, spaces and ' - . are kept, up to 16."]);
      r.type('***');
      expect([r.records.dynasty().name, r.input.value, r.status.textContent.startsWith("That name has no letters or digits, so it stays O'Neil b.")]).toEqual(["O'Neil b", "O'Neil b", true]);
      r.type('');
      expect([r.records.dynasty().name, r.status.textContent]).toEqual(["O'Neil b", '']);
    } finally { r.cleanup(); }
  });
});

describe('v90 l bring: Options > Saves places the two rows', () => {
  function labels(hooks) {
    const { root, cleanup } = mount('<div id="body"></div>');
    const settings = createSettings({ storage: { getItem: () => null, setItem() {} }, root });
    const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} }, hooks });
    const body = root.querySelector('#body');
    menus.settings(body);
    const out = { name: body.querySelector('.ruler-name-row'), bring: body.querySelector('.bring-row'), group: body.querySelector('.options-group.saves'), cleanup };
    return out;
  }
  it('puts the ruler name and Bring rulers in the Saves group once the hooks exist', () => {
    const records = createRecords({ storage: memory() });
    const o = labels({ records, bringRulers: async () => null, exportCity: () => {} });
    try {
      expect([o.name.parentElement === o.group, o.bring.parentElement === o.group]).toEqual([true, true]);
      expect(o.bring.querySelector('button').textContent).toBe('Bring rulers from a file');
      expect(o.bring.querySelector('.bring-note').textContent.includes('its city is never brought')).toBe(true);
    } finally { o.cleanup(); }
  });
  it('leaves Bring rulers out until boot gives it, and both rows out of the lesson', () => {
    const records = createRecords({ storage: memory() });
    const a = labels({ records });
    try { expect([a.name !== null, a.bring]).toEqual([true, null]); } finally { a.cleanup(); }
    const b = labels({ records, bringRulers: async () => null, lessonRun: { leave() {} } });
    try { expect([b.name, b.bring]).toEqual([null, null]); } finally { b.cleanup(); }
    const c = labels({});
    try { expect([c.name, c.bring]).toEqual([null, null]); } finally { c.cleanup(); }
  });
});
