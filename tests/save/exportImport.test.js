import { describe, it, expect } from '../harness.js';
import { exportFileName, exportSave, downloadFile, pickFile, importSaveFile } from '../../src/save/exportImport.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { T, importErrorText } from '../../src/ui/text.js';
import { mount } from '../helpers/dom.js';

const code = async (p) => { try { await p; } catch (e) { return e.message; } return null; };
const date = new Date(Date.UTC(2026, 9, 11, 12));

describe('save export and import', () => {
  it('names the file by date, shares it where files can be shared, else downloads it', async () => {
    expect(exportFileName(date)).toBe('thebes-city-2026-10-11.json');
    const text = packSave(createWorld({ seed: 2 }));
    const shared = [], downloaded = [];
    const download = (f) => downloaded.push(f);
    expect(await exportSave(text, { share: async (d) => { shared.push(d); }, canShare: () => true, download, date })).toBe('shared');
    expect(shared[0].files[0].name).toBe('thebes-city-2026-10-11.json');
    expect(await shared[0].files[0].text()).toBe(text);
    expect(downloaded.length).toBe(0);
    expect(await exportSave(text, { share: async () => {}, canShare: () => false, download, date })).toBe('downloaded');
    expect(downloaded[0].name).toBe('thebes-city-2026-10-11.json');
    expect(downloaded[0].type).toBe('application/json');
    expect(await exportSave(text, { download, date })).toBe('downloaded');
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    expect(await exportSave(text, { share: async () => { throw abort; }, canShare: () => true, download, date })).toBe('cancelled');
    expect(await exportSave(text, { share: async () => { throw new Error('nope'); }, canShare: () => true, download, date })).toBe('downloaded');
    expect(await exportSave(text, { share: async () => {}, canShare: () => { throw new Error('odd'); }, download, date })).toBe('downloaded');
    expect(downloaded.length).toBe(4);
  });
  it('downloads through a temporary link and picks a file through a hidden input', async () => {
    const { root, cleanup } = mount();
    const clicked = [];
    const doc = { createElement: (tag) => { const n = document.createElement(tag); n.click = () => clicked.push(n); return n; }, body: root };
    const urls = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
    downloadFile(new File(['{}'], 'x.json', { type: 'application/json' }), doc, urls);
    expect(clicked.length).toBe(1);
    expect(clicked[0].tagName).toBe('A');
    expect(clicked[0].download).toBe('x.json');
    expect(clicked[0].getAttribute('href')).toBe('blob:test');
    expect(root.querySelector('a')).toBe(null);                              // removed after the click
    const cancelled = pickFile(doc);
    const input = clicked[1];
    expect(input.type).toBe('file');
    expect(input.accept).toBe('application/json,.json');
    expect(root.contains(input)).toBe(true);
    input.dispatchEvent(new Event('cancel'));
    expect(await cancelled).toBe(null);
    expect(root.contains(input)).toBe(false);
    const picked = pickFile(doc);
    const input2 = clicked[2];
    const dt = new DataTransfer();
    dt.items.add(new File(['{}'], 'c.json', { type: 'application/json' }));
    input2.files = dt.files;
    input2.dispatchEvent(new Event('change'));
    expect((await picked).name).toBe('c.json');
    expect(root.contains(input2)).toBe(false);
    cleanup();
  });
  it('reads a file back into an envelope and reports the save codes', async () => {
    const w = createWorld({ seed: 3 });
    const text = packSave(w, { savedAt: 5, lastSpeed: 2 });
    const back = await importSaveFile(new File([text], 'city.json', { type: 'application/json' }));
    expect(back.world).toEqual(w);
    expect(back.savedAt).toBe(5);
    expect(back.lastSpeed).toBe(2);
    expect((await importSaveFile(new File([JSON.stringify(w)], 'bare.json'))).lastSpeed).toBe(1);
    expect(await code(importSaveFile(new File(['{nope'], 'x.json')))).toBe('corrupt_save');
    expect(await code(importSaveFile(new File([JSON.stringify({ version: 9, world: {} })], 'x.json')))).toBe('newer_version');
    expect(await code(importSaveFile({ text: () => Promise.reject(new Error('io')) }))).toBe('read_failed');
    expect(importErrorText('newer_version')).toBe(T.saveNewer);
    expect(importErrorText('read_failed')).toBe(T.fileUnreadable);
    expect(importErrorText('corrupt_save')).toBe(T.saveUnreadable);
    expect(importErrorText('not_a_save')).toBe(T.saveUnreadable);
  });
});
