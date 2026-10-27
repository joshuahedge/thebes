// Version 8.0 Track U: the release entry, the version constant and the stylesheet the offline cache lists.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v80 u release: Version 8.0 "Clear and calm"', () => {
  it('is the third entry with its merge commit (8.2 and 8.1 are newer), and 7.1.1 carries its own', () => {
    expect([RELEASES[3].version, RELEASES[3].date, RELEASES[3].title, RELEASES[3].build]).toEqual(['8.0', '2026-10-24', 'Clear and calm', '702481b']);
    expect([RELEASES[4].version, RELEASES[4].build]).toEqual(['7.1.1', 'a6eae26']);
  });
  it('names what changed in the words a player would look for, each note one plain sentence', () => {
    const notes = [...RELEASES[3].new, ...RELEASES[3].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['patterned band', 'title screen', 'new city', 'more choices', 'options', 'tray', 'placing', 'single house', 'undo', 'full motion', 'bring a city from safari', 'place']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
  });
  it('lists the new stylesheet in the offline cache and links it from the page', async () => {
    const files = await (await fetch('/sw-files.js')).text();
    expect(files.includes('css/v80-u.css')).toBe(true);
    const html = await (await fetch('/index.html')).text();
    expect(html.includes('./css/v80-u.css')).toBe(true);
  });
});
