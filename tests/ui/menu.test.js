import { describe, it, expect } from '../harness.js';
import { createMenuSheets, createDialog, keyLabel } from '../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { KEYS } from '../../src/data/ui.js';
import { T, HELP_ROWS } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

function rig(hooks = {}) {
  const { root, cleanup } = mount('<div id="body"></div><div id="dialog" hidden></div>');
  const store = createStore(INITIAL_UI_STATE);
  const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
  const shown = [];
  const log = [];
  const menus = createMenuSheets({ store, settings, toasts: { show: (t) => shown.push(t) }, hooks, onNewCity: () => log.push('new'), version: '0.1-test' });
  const dialog = createDialog({ container: root.querySelector('#dialog'), store });
  return { root, body: root.querySelector('#body'), dialogNode: root.querySelector('#dialog'), store, settings, menus, dialog, shown, log, close: () => log.push('close'), cleanup };
}
const buttonNamed = (node, text) => [...node.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

describe('ui menu', () => {
  it('menu: continue closes, new city asks first, export and import fall back to a toast, others open sheets', () => {
    const r = rig();
    r.menus.menu(r.body, { close: r.close });
    fire(buttonNamed(r.body, T.continueGame), 'click');
    expect(r.log).toEqual(['close']);
    fire(buttonNamed(r.body, T.newCity), 'click');
    expect(r.store.get().confirmDialog.text).toBe(T.newCityConfirm);
    expect(r.dialogNode.hidden).toBe(false);
    expect(r.dialogNode.querySelector('.box').textContent).toContain(T.newCityConfirm);
    fire(r.dialogNode.querySelector('.cancel'), 'click');
    expect(r.store.get().confirmDialog).toBe(null);
    expect(r.dialogNode.hidden).toBe(true);
    fire(buttonNamed(r.body, T.newCity), 'click');
    fire(r.dialogNode.querySelector('.ok'), 'click');
    expect(r.log).toEqual(['close', 'new']);
    expect(r.store.get().confirmDialog).toBe(null);
    fire(buttonNamed(r.body, T.exportCity), 'click');
    expect(r.shown).toEqual([T.notYet]);
    fire(buttonNamed(r.body, T.settings), 'click');
    expect(r.store.get().sheet).toEqual({ kind: 'settings', id: null });
    fire(buttonNamed(r.body, T.howToPlay), 'click');
    expect(r.store.get().sheet.kind).toBe('help');
    fire(buttonNamed(r.body, T.about), 'click');
    expect(r.store.get().sheet.kind).toBe('about');
    r.cleanup();
    const hooked = rig({ exportCity: () => hooked.log.push('export'), importCity: () => hooked.log.push('import') });
    hooked.menus.menu(hooked.body, { close: hooked.close });
    fire(buttonNamed(hooked.body, T.exportCity), 'click');
    fire(buttonNamed(hooked.body, T.importCity), 'click');
    expect(hooked.log).toEqual(['export', 'import']);
    expect(hooked.shown).toEqual([]);
    hooked.cleanup();
  });
  it('settings: switches and choices write through the settings store', () => {
    const r = rig();
    r.menus.settings(r.body, { close: r.close });
    expect(r.settings.get()).toEqual(DEFAULT_SETTINGS);
    const sound = r.body.querySelector('.switch.sound');
    expect(sound.getAttribute('role')).toBe('switch');
    expect(sound.getAttribute('aria-checked')).toBe('false');
    expect(sound.textContent).toContain(T.off);
    fire(sound, 'click');
    expect(r.settings.get().sound).toBe(true);
    expect(sound.getAttribute('aria-checked')).toBe('true');
    expect(sound.textContent).toContain(T.on);
    fire(r.body.querySelector('.choice.textSize[data-value="150"]'), 'click');
    expect(r.settings.get().textSize).toBe(150);
    expect(r.root.dataset.textSize).toBe('150');
    expect(r.body.querySelector('.choice.textSize[data-value="150"]').getAttribute('aria-pressed')).toBe('true');
    expect(r.body.querySelector('.choice.textSize[data-value="100"]').getAttribute('aria-pressed')).toBe('false');
    fire(r.body.querySelector('.choice.reducedMotion[data-value="on"]'), 'click');
    expect(r.settings.reducedMotion()).toBe(true);
    fire(r.body.querySelector('.switch.leftHanded'), 'click');
    expect(r.root.dataset.hand).toBe('left');
    fire(r.body.querySelector('.switch.keyboardShortcuts'), 'click');
    expect(r.settings.get().keyboardShortcuts).toBe(false);
    r.cleanup();
  });
  it('help lists every shortcut with its keys and the ways out of a mode; about names the version', async () => {
    const r = rig();
    r.menus.help(r.body, { close: r.close });
    const rows = [...r.body.querySelectorAll('.shortcuts tbody tr')];
    expect(rows.length).toBe(HELP_ROWS.length);
    for (const [name, text, keys] of HELP_ROWS) {
      const row = rows.find((tr) => tr.textContent.includes(text));
      expect(row.textContent).toContain(keys || keyLabel(name));
    }
    expect(keyLabel('pause')).toBe('Space');
    expect(keyLabel('back')).toBe('Esc');
    expect(keyLabel('speedUp')).toBe('+ or =');
    expect(keyLabel('minimap')).toBe('M');
    expect(r.body.textContent).toContain('right-click');
    expect(r.body.textContent).toContain(T.goalsHelp);
    r.menus.about(r.body, { close: r.close });
    expect(r.body.textContent).toContain('0.1-test');
    const src = await (await fetch('/src/ui/menu.js')).text();
    expect(/pharaoh/i.test(src)).toBe(false);
    expect(KEYS.help).toContain('?');
    r.cleanup();
  });
});
