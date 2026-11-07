// Version 9.0 Track L, fix wave (rulings 1634-1636): Bring rulers' Merge keeps the device's dynasty, one source for the titles and the label, the install ask's Safari line
// only on iOS, and the side by side's narrow layout. Play this map's Back is in boot.test.js (it needs the booted game).
import { describe, it, expect } from '../../harness.js';
import { createRecords, mergeRecords } from '../../../src/save/records.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { rulerNameRow, bringRulersRow } from '../../../src/ui/v90/rulerOptions.js';
import { renderRulers } from '../../../src/ui/v90/rulers.js';
import { V90_L_TEXT, V90_D_TEXT } from '../../../src/ui/text.js';
import { mount, fire } from '../../helpers/dom.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const memory = (start) => { const data = { [RECORDS_KEY]: JSON.stringify(start) }; return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } }; };
const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const ruler = (id, date, over = {}) => ({ id, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 250, parts: PARTS, medal: null, version: 2, seed: 5, difficulty: 'normal', mapVariant: 'classic', mapSize: 64, map: '', feats: [], date, ...over });
const recs = (o) => ({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: { name: '', heir: 'steady' }, ...o });
const fileOf = (records) => JSON.stringify({ version: 1, savedAt: 1, lastSpeed: 1, world: { junk: true }, records });

describe('v90 l fix: Merge and the dynasty', () => {
  async function bring(device, fileRecords) {
    const records = createRecords({ storage: memory(device) });
    const m = mount('<div id="host"></div>');
    const row = bringRulersRow({ records, bringRulers: async () => fileOf(fileRecords) });
    m.root.querySelector('#host').append(row);
    fire(row.querySelector('.bring-rulers'), 'click'); await flush(); await flush();
    return { records, text: () => row.querySelector('.bring-text').textContent, merge: () => fire(row.querySelector('.bring-merge'), 'click'), cleanup: m.cleanup };
  }
  const file = recs({ rulers: [ruler('c:3', 9, { title: 'builder' })], dynasty: { name: 'Ramesses', heir: 'builder' } });
  it('keeps the device\'s heir and name when the device has rulers, though the file holds the newest ruler, and says nothing about a dynasty', async () => {
    const r = await bring(recs({ rulers: [ruler('a:1', 1)], dynasty: { name: 'Khufu', heir: 'merchant' } }), file);
    try {
      expect(r.text()).toBe('Adds 1 ruler and 0 rivals');
      r.merge();
      expect(r.records.dynasty()).toEqual({ name: 'Khufu', heir: 'merchant' });
      expect(r.records.rulers().length).toBe(2);
    } finally { r.cleanup(); }
    expect(mergeRecords(recs({ rulers: [ruler('a:1', 1)], dynasty: { name: 'Khufu', heir: 'merchant' } }), file).dynasty).toEqual({ name: 'Khufu', heir: 'merchant' });
  });
  it('takes the file\'s dynasty on a device with no rulers, and says so before Merge', async () => {
    const r = await bring(recs({ dynasty: { name: '', heir: 'steady' } }), file);
    try {
      expect(r.text()).toBe('Adds 1 ruler and 0 rivals. Your next city will be heir of the Builder, under the name Ramesses.');
      expect(r.records.dynasty()).toEqual({ name: '', heir: 'steady' });             // nothing changes before Merge
      r.merge();
      expect(r.records.dynasty()).toEqual({ name: 'Ramesses', heir: 'builder' });
    } finally { r.cleanup(); }
  });
});

describe('v90 l fix: one source for the titles, the regnal number and the name label', () => {
  it('has no titleWords, heirOf or roman of its own, and names a ruler by Track D\'s words', () => {
    expect(['titleWords', 'heirOf', 'roman', 'nameLabel'].filter((k) => k in V90_L_TEXT)).toEqual([]);
    expect(V90_L_TEXT.rulerName({ name: 'Khufu', n: 14, title: 'merchant' })).toBe('Khufu XIV the Merchant');
    expect(V90_L_TEXT.rivalLine({ name: 'Ana', heir: 'generous', score: 5 })).toBe('Ana (heir of the Generous): 5');
  });
  it('labels the Options name field "Your dynasty\'s name" and lists what it keeps', () => {
    const records = createRecords({ storage: memory(recs({})) });
    const row = rulerNameRow({ records });
    expect(row.querySelector('label').textContent).toBe(V90_D_TEXT.nameLabel);
    expect(V90_D_TEXT.nameLabel).toBe("Your dynasty's name");
    expect(row.querySelector('.ruler-name-hint').textContent.startsWith("Letters, digits, spaces and ' - . only, 16 at most.")).toBe(true);
  });
});

describe('v90 l fix: the install ask says the Safari line on iOS only', () => {
  it('is a plain ask elsewhere and the Safari line on iOS, in the list', () => {
    expect(V90_L_TEXT.installAsk(false)).toBe('Install Thebes to keep your rulers');
    expect(V90_L_TEXT.installAsk(true)).toBe("Install Thebes to keep your rulers: Safari clears a site's data after 7 days without a visit");
    const records = createRecords({ storage: memory(recs({ rulers: [ruler('a:1', 1)] })) });
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const body = root.querySelector('#body');
      renderRulers(body, { records, installAsk: true, ios: true });
      expect(body.querySelector('.install-ask').textContent.includes('Safari')).toBe(true);
      renderRulers(body, { records, installAsk: true, ios: false });
      expect(body.querySelector('.install-ask').textContent).toBe('Install Thebes to keep your rulers');
    } finally { cleanup(); }
  });
});

describe('v90 l fix: the side by side on a narrow screen', () => {
  it('wraps each line under 480px: name and number above, the bar across the full width', async () => {
    const css = await (await fetch('/css/v90.css')).text();
    const at = css.indexOf('@media (max-width: 480px)');
    expect(at > 0).toBe(true);
    const block = css.slice(at, css.indexOf('\n}', at));
    expect(/\.sbs-bar \{[^}]*grid-column: 1 \/ -1; grid-row: 2/.test(block)).toBe(true);
    expect(/\.sbs-name \{[^}]*grid-row: 1/.test(block) && /\.sbs-number \{[^}]*grid-row: 1/.test(block)).toBe(true);
  });
});
