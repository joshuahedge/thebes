// Version 7.0, Track P (ruling 1001): Delete and Backspace. While a placement's Undo is on offer they are that Undo (same refund), otherwise with a building's sheet open they press
// the sheet's Demolish (same question first, where it asks one), and they never act in a text field, behind a dialog, with single keys switched off, or without something to do.
// Every key the game has is in How to play, and the buttons the keys press name them (tooltip and aria-keyshortcuts).
import { describe, it, expect } from '../../harness.js';
import { createKeyboard, matchKey } from '../../../src/ui/keyboard.js';
import { createCamera } from '../../../src/render/camera.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { KEYS } from '../../../src/data/ui.js';
import { HELP_ROWS, V70_HELP, P_TEXT } from '../../../src/ui/text.js';
import { buildingAt } from '../../../src/sim/world.js';
import { costOf } from '../../../src/sim/costs.js';
import { addRaw } from '../../helpers/testWorld.js';
import { mount, key, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

function rig(shortcuts = true) {
  const { root, cleanup } = mount('<div id="t" tabindex="0"><input id="field"><button id="b">Go</button><div id="list" role="listbox"><div id="opt" role="option" tabindex="0">One</div></div></div>');
  const target = root.querySelector('#t');
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const cameraControl = createCameraControl({ cam, view: () => ({ width: 400, height: 300 }), reducedMotion: () => true });
  const log = [];
  const kb = createKeyboard({ target, settings: { get: () => ({ keyboardShortcuts: shortcuts }) }, cam, cameraControl, actions: { remove: () => log.push('remove') } });
  return { root, target, log, kb, cleanup };
}

describe('v70 p Delete and Backspace: the keys', () => {
  it('both keys are the remove key, with no modifier', () => {
    expect([matchKey({ key: 'Delete' }), matchKey({ key: 'Backspace' }), matchKey({ key: 'Delete', ctrlKey: true }), matchKey({ key: 'Backspace', metaKey: true }), matchKey({ key: 'Delete', altKey: true })]).toEqual(['remove', 'remove', null, null, null]);
  });
  it('reaches its action, once a press, and stays quiet in a text field, in a listbox that uses it, and with single keys switched off', () => {
    const r = rig();
    key(r.target, 'Delete');
    key(r.target, 'Backspace');
    key(r.target, 'Delete', { repeat: true });
    expect(r.log).toEqual(['remove', 'remove']);
    key(r.root.querySelector('#field'), 'Backspace');
    key(r.root.querySelector('#opt'), 'Delete');
    expect(r.log).toEqual(['remove', 'remove']);
    r.kb.detach(); r.cleanup();
    const off = rig(false);
    key(off.target, 'Delete');
    expect(off.log).toEqual([]);
    off.kb.detach(); off.cleanup();
  });
});

const wellCard = (r) => { fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click'); fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click'); r.frame(0); };

describe('v70 p Delete and Backspace: in the game', () => {
  it('takes back the placement whose Undo toast is up, with the refund the Undo button gives, and a second press takes nothing more', async () => {
    const r = await rigUI();
    try {
      wellCard(r);
      r.tap(5, 9);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect([buildingAt(r.world, 5, 9).type, r.root.querySelector('#toasts .toast .action').textContent]).toEqual(['well', 'Undo']);
      fire(r.root.querySelector('#confirm .cancel'), 'click');                         // the tool put away: the toast's Undo is the one on offer
      const before = r.world.gold;                                                     // (the well's goal paid a little more than it cost, so the refund is measured from here)
      key(r.root, 'Backspace');
      expect([buildingAt(r.world, 5, 9), r.world.gold - before]).toEqual([null, costOf(r.world, 'well')]);   // the same refund as the Undo button: what the well cost
      expect(r.root.querySelector('#toasts .toast .action')).toBe(null);               // the toast went with it: it cannot be used twice
      addRaw(r.world, 'granary', 20, 12);
      key(r.root, 'Delete');
      expect(buildingAt(r.world, 20, 12).type).toBe('granary');                        // nothing on offer, nothing selected: nothing happens
    } finally { r.cleanup(); }
  });
  it('with no Undo on offer, removes the selected building through its sheet\'s own Demolish, the same as the button, and does not when nothing is selected or a dialog is up', async () => {
    const r = await rigUI();
    try {
      key(r.root, 'Delete');
      expect(Object.keys(r.world.buildings).length).toBe(7);                           // the test city's seven, nothing selected
      r.tap(15, 11);                                                                   // the well
      expect([r.store.get().mode, Boolean(r.root.querySelector('#sheet .demolish'))]).toEqual(['selected', true]);
      r.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm: () => {} } });
      key(r.root, 'Delete');
      expect(buildingAt(r.world, 15, 11).type).toBe('well');                           // a dialog has the keys
      r.store.set({ confirmDialog: null });
      key(r.root, 'Backspace');
      expect([buildingAt(r.world, 15, 11), r.store.get().mode]).toEqual([null, 'browse']);
    } finally { r.cleanup(); }
  });
  it('asks the same question first where the button does (a monument site), and only the answer demolishes', async () => {
    const r = await rigUI();
    try {
      const b = addRaw(r.world, 'mastaba_small', 20, 14);
      r.tap(21, 15);
      expect([r.store.get().mode, Boolean(r.root.querySelector('#sheet .demolish'))]).toEqual(['selected', true]);
      key(r.root, 'Delete');
      const dialog = r.store.get().confirmDialog;
      expect([Boolean(dialog), Boolean(r.world.buildings[b.id])]).toEqual([true, true]);
      dialog.onConfirm();
      expect(r.world.buildings[b.id]).toBe(undefined);
    } finally { r.cleanup(); }
  });
  it('names the key on the buttons it presses: Undo (bar and toast) and Demolish carry a tooltip and aria-keyshortcuts, with the single keys left out when they are off', async () => {
    const r = await rigUI();
    try {
      wellCard(r);
      r.tap(5, 9);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      const bar = r.root.querySelector('#confirm .undo'), toast = r.root.querySelector('#toasts .toast .action');
      for (const b of [bar, toast]) expect([b.title, b.getAttribute('aria-keyshortcuts')]).toEqual([P_TEXT.undoTitle(true), 'Control+Z Meta+Z Delete Backspace']);
      fire(r.root.querySelector('#confirm .cancel'), 'click');
      r.tap(15, 11);
      const dem = r.root.querySelector('#sheet .demolish');
      expect([dem.title, dem.getAttribute('aria-keyshortcuts')]).toEqual([P_TEXT.demolishTitle, 'Delete Backspace']);
      r.ui.settings.set({ keyboardShortcuts: false });
      r.ui.refresh();
      expect(r.root.querySelector('#sheet .demolish').getAttribute('aria-keyshortcuts')).toBe(null);
      wellCard(r);
      expect(r.root.querySelector('#confirm .undo').getAttribute('aria-keyshortcuts')).toBe('Control+Z Meta+Z');
    } finally { r.cleanup(); }
  });
  it('lists every key the game has in How to play: a row in the key table for each (the pan keys as one), and the Keyboard entry names them from KEYS', () => {
    const rows = new Set(HELP_ROWS.map((row) => row[0]));
    const missing = Object.keys(KEYS).filter((name) => !rows.has(name) && !['panRight', 'panUp', 'panDown'].includes(name));
    expect(missing).toEqual([]);
    expect(HELP_ROWS.find((row) => row[0] === 'remove')[1]).toBe(P_TEXT.removeRow);
    const entry = V70_HELP.p.find((h) => h.head === 'Keyboard');
    expect(Boolean(entry)).toBe(true);
    for (const text of ['Space', ']', '[', '+', 'Delete', 'Backspace', 'Esc', 'Enter', 'Ctrl+Z']) expect([text, entry.text.includes(text)]).toEqual([text, true]);
  });
});
