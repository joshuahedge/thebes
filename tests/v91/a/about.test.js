// Version 9.1 Track A (rulings 1701-1703): the About lines (the About sheet and Options' closed About section), their keyboard path, and the Options sheet on
// a phone with About open at each text size.
import { describe, it, expect } from '../../harness.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createSettings } from '../../../src/ui/settings.js';
import { openSheet } from '../../../src/ui/modes.js';
import { V91_A_TEXT } from '../../../src/ui/text.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { RELEASES } from '../../../src/data/releases.js';
import { readBuildStamp } from '../../../src/ui/s46/whatsNew.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { devScene, measureRows } from '../../../src/dev/scenes.js';
import { budgetChecks } from '../../ui/mobileBudget.test.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function rig() {
  const { root, cleanup } = mount('<div id="body"></div>');
  const store = createStore(INITIAL_UI_STATE);
  const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
  const menus = createMenuSheets({ store, settings, toasts: { show: () => {} }, hooks: {}, version: APP_VERSION });
  return { body: root.querySelector('#body'), menus, cleanup };
}

const LINES = () => [
  ['made', 'Made by Josh'],
  ['licence', `Licence: ${V91_A_TEXT.aboutLicence}`],
  ['art', 'Art, music and sounds are made by the game itself.'],
  ['privacy', 'Cities stay on this device; nothing is sent. A share link carries only what it shows.'],
];

describe('v91 a about: the lines', () => {
  it('the About sheet says who made it, the licence, where art and sound come from, the privacy line, and the version and build', async () => {
    const r = rig();
    r.menus.about(r.body);
    for (const [key, text] of LINES()) expect([key, r.body.querySelector(`.about-${key}`).textContent]).toEqual([key, text]);
    const stamp = await readBuildStamp();
    await flush(); await flush();
    const version = r.body.querySelector('.version').textContent;
    expect(version.startsWith(`Version ${APP_VERSION}`)).toBe(true);
    expect(Boolean(stamp)).toBe(true);                         // the build stamp must be readable off sw-files.js, or the build line is not being tested
    expect(version).toBe(`Version ${APP_VERSION} · build ${stamp}`);
    r.cleanup();
  });

  it('the licence is one string: changing V91_A_TEXT.aboutLicence is the only edit the licence line needs', () => {
    const r = rig();
    const was = V91_A_TEXT.aboutLicence;
    try {
      V91_A_TEXT.aboutLicence = 'A made-up licence';
      r.menus.about(r.body);
      expect(r.body.querySelector('.about-licence').textContent).toBe('Licence: A made-up licence');
    } finally { V91_A_TEXT.aboutLicence = was; }
    r.cleanup();
  });

  it('the version is the one APP_VERSION names, which is the newest release', () => {
    expect(RELEASES[0].version).toBe(APP_VERSION);
  });

  it('Options folds the same four lines under a closed About, above the version and build at the foot', () => {
    const r = rig();
    r.menus.settings(r.body);
    const about = r.body.querySelector('details.options-about');
    expect(about.open).toBe(false);
    expect(about.querySelector('summary h3').textContent).toBe('About');
    for (const [key, text] of LINES()) expect([key, about.querySelector(`.about-${key}`).textContent]).toEqual([key, text]);
    const kids = [...r.body.children];
    expect([kids.indexOf(about) < kids.length - 1, kids[kids.length - 1].className, kids[kids.length - 1].querySelector('.version').textContent.startsWith(`Version ${APP_VERSION}`)]).toEqual([true, 'options-version', true]);
    r.cleanup();
  });

  it('the keyboard path: About is a details whose summary takes focus, and Enter or Space (the browser\'s own toggle) opens it', () => {
    const r = rig();
    r.menus.settings(r.body);
    const summary = r.body.querySelector('details.options-about > summary');
    expect([summary.tagName, summary.tabIndex]).toEqual(['SUMMARY', 0]);
    summary.focus();
    expect(document.activeElement === summary).toBe(true);
    summary.click();                                           // what Enter and Space do on a summary
    expect(r.body.querySelector('details.options-about').open).toBe(true);
    r.cleanup();
  });
});

async function bootPhone(width, height) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const noStorage = { getItem: () => null, setItem: () => {} };
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
    now: () => performance.now(), clock: () => 1760000000000, storage: noStorage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('v91 a about: Options with About open on a phone (the mobile budget)', () => {
  it('at 375x667 and 390x844, 100/125/150% text: the rows obey the sheet budget, About\'s summary is 44 px, and its four lines are inside the frame with no sideways scroll', async () => {
    const wrong = [];
    for (const [width, height] of [[375, 667], [390, 844]]) {
      for (const textSize of [100, 125, 150]) {
        const r = await bootPhone(width, height);
        const at = `${width}x${height} ${textSize}%`;
        try {
          const g = r.api.game();
          g.ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          await devScene(r.api, 'sheet', { quick: true });
          const ui = r.api.game().ui;
          ui.store.set(openSheet(ui.store.get(), 'settings'));
          await frame(); await frame();
          const sheet = r.root.querySelector('#sheet');
          const about = sheet.querySelector('details.options-about');
          if (!about) { wrong.push(`${at}: no About section`); continue; }
          const summary = about.querySelector('summary');
          about.open = true;
          await frame();
          const box = r.root.getBoundingClientRect(), s = summary.getBoundingClientRect();
          if (s.height < 43.5) wrong.push(`${at}: About's summary is ${Math.round(s.height)} px tall`);
          for (const p of about.querySelectorAll('.about-line')) {
            const b = p.getBoundingClientRect();
            if (b.left < box.left - 1 || b.right > box.right + 1) wrong.push(`${at}: ${p.className} is outside the frame (${Math.round(b.left)}..${Math.round(b.right)} of ${Math.round(box.width)})`);
          }
          if (sheet.scrollWidth > sheet.clientWidth + 1) wrong.push(`${at}: the sheet scrolls sideways (${sheet.scrollWidth} > ${sheet.clientWidth})`);
          about.scrollIntoView({ block: 'end' });
          const m = measureRows(r.root);
          for (const c of budgetChecks('sheet', m)) if (!c.ok) wrong.push(`${c.id}: ${c.got}, limit ${c.limit}`);   // the suite's own sheet-open budget, not a copy of it
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});
