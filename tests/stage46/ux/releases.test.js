// Rulings 401-403: the version follows the stages (one constant), the title card shows it small with the short build stamp, and a What's new
// button opens one panel of every build, newest first, each split into New and Fixed. A test fails when the newest entry and the constant differ.
import { describe, it, expect } from '../../harness.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { RELEASES, releaseDateText } from '../../../src/data/releases.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { buildStampOf, readBuildStamp, renderWhatsNew } from '../../../src/ui/s46/whatsNew.js';
import { S46_UX_TEXT } from '../../../src/ui/text.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

const versionParts = (v) => v.split('.').map(Number);
// (Version 6.0.1: a third part, a fix release; a missing part counts as 0. Version 7.1: the newest entry now.)
const newerThan = (a, b) => { const x = versionParts(a), y = versionParts(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

describe('s46 ux releases', () => {
  it('the newest release is the build the game says it is (ruling 401)', () => {
    expect(RELEASES[0].version).toBe(APP_VERSION);
    expect(APP_VERSION).toBe('8.3');
  });
  it('lists every build, newest first, with a date and plain notes (ruling 403)', () => {
    expect(RELEASES.map((r) => r.version)).toEqual(['8.3', '8.2.1', '8.2', '8.1', '8.0', '7.1.1', '7.1', '7.0', '6.0.1', '6.0', '5.0', '4.7', '4.6', '4.5', '4.0', '3.2', '3.1', '3.0', '2.0', '1.1', '1.0']);
    for (let i = 1; i < RELEASES.length; i++) {
      expect([RELEASES[i - 1].version, newerThan(RELEASES[i - 1].version, RELEASES[i].version)]).toEqual([RELEASES[i - 1].version, true]);
      expect(RELEASES[i - 1].date >= RELEASES[i].date).toBe(true);           // dates never go backwards as versions go up
    }
    for (const r of RELEASES) {
      expect([r.version, /^\d{4}-\d{2}-\d{2}$/.test(r.date), typeof r.title === 'string' && r.title.length > 2]).toEqual([r.version, true, true]);
      expect([r.version, Array.isArray(r.new), Array.isArray(r.fixed), r.new.length + r.fixed.length > 0]).toEqual([r.version, true, true, true]);
      for (const line of [...r.new, ...r.fixed]) expect([r.version, typeof line === 'string' && line.length > 10 && line.length < 330]).toEqual([r.version, true]);
    }
    expect(RELEASES.filter((r) => 'provisional' in r).map((r) => r.version)).toEqual([]);   // final review: the 4.6 notes are final; every stage since keeps its own
    // Every entry has a build (final review, Josh's ask): the newest the running build's ('live'), every other its merge commit's short sha.
    expect(RELEASES.map((r, i) => [r.version, i === 0 ? r.build === 'live' : /^[0-9a-f]{7}$/.test(r.build)])).toEqual(RELEASES.map((r) => [r.version, true]));
    expect(new Set(RELEASES.map((r) => r.build)).size).toBe(RELEASES.length);
  });
  it('formats a date without Date', () => {
    expect([releaseDateText('2026-10-13'), releaseDateText('2026-01-05'), releaseDateText('nonsense')]).toEqual(['13 Oct 2026', '5 Jan 2026', 'nonsense']);
  });
  it('reads the short build stamp from the cache list, and shows none when it cannot', async () => {
    expect(buildStampOf("self.THEBES_VERSION = '4.6';\nself.THEBES_BUILD = '989a650d1fe3';\n")).toBe('989a650');
    expect(buildStampOf('nothing here')).toBe(null);
    const real = await readBuildStamp(fetch, '/sw-files.js');
    expect(/^[0-9a-f]{7}$/.test(real)).toBe(true);
    expect(await readBuildStamp(async () => { throw new Error('offline'); })).toBe(null);
    expect(await readBuildStamp(async () => ({ ok: false }))).toBe(null);
  });
  it('the title card has no version line (Version 8.0: it is at the foot of Options), and a What\'s new button that opens one panel with Back (ruling 402)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const container = r.root.querySelector('#title');
      const card = createTitleCard({ container, hasSave: false, onContinue: () => {}, onNewCity: () => {}, onSound: () => {} });
      expect(card.element.querySelector('.version')).toBe(null);
      const button = card.element.querySelector('.whats-new-button');
      expect(button.textContent).toBe(S46_UX_TEXT.whatsNew);
      expect(button.getBoundingClientRect().height >= 43.5).toBe(true);
      fire(button, 'click');
      const panel = card.element.querySelector('.guide .whats-new');
      expect(Boolean(panel)).toBe(true);
      expect(card.element.querySelector('.title-buttons').hidden).toBe(true);        // one panel at a time: the buttons give way
      const heads = [...panel.querySelectorAll('.release h3')].map((h) => h.textContent);
      expect(heads.length).toBe(RELEASES.length);
      expect(heads[0].startsWith(`Version ${RELEASES[0].version} · ${releaseDateText(RELEASES[0].date)}`)).toBe(true);
      expect(heads[heads.length - 1].startsWith('Version 1.0')).toBe(true);
      const first = panel.querySelector('.release');
      expect([...first.querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['New', 'Fixed']);
      expect(first.querySelectorAll('ul.notes')[0].children.length).toBe(RELEASES[0].new.length);
      expect(document.activeElement.classList.contains('whats-new-back')).toBe(true);
      fire(card.element.querySelector('.whats-new-back'), 'click');                 // Back returns to the card
      expect(card.element.querySelector('.guide')).toBe(null);
      expect(card.element.querySelector('.title-buttons').hidden).toBe(false);
    } finally { r.cleanup(); }
  });
  it('Esc closes the panel, a release with nothing fixed leaves out its Fixed list, and the plain words are plain', () => {
    const host = document.createElement('div');
    let backed = 0;
    const { scroller } = renderWhatsNew(host, () => { backed++; }, [{ version: '9.9', date: '2030-01-02', title: 'Test', new: ['One thing.'], fixed: [] }]);
    expect([...scroller.querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['New']);
    fire(scroller, 'keydown', { key: 'Escape' });
    expect(backed).toBe(1);
    const all = RELEASES.flatMap((r) => [r.title, ...r.new, ...r.fixed]).join(' ');
    for (const jargon of ['ruling', 'sim ', 'world version', 'migration', 'dev scene', 'dst']) expect([jargon, all.toLowerCase().includes(jargon)]).toEqual([jargon, false]);
  });
});
