import { describe, it, expect } from '../harness.js';
import { exportFileName, exportSave, downloadFile } from '../../src/save/exportImport.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { mount } from '../helpers/dom.js';

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
  it('downloads through a temporary link', async () => {
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
    cleanup();
  });
  it('has no import half any more (Version 8.0: Bring a city from Safari is gone)', async () => {
    const mod = await import('../../src/save/exportImport.js');
    expect(Object.keys(mod).sort()).toEqual(['downloadFile', 'exportFileName', 'exportSave']);
  });
});
