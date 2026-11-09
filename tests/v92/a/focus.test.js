// Version 9.2, Track A, 6.2 (ruling 1825-1826; T11): a keyboard-only player opens and closes a sheet and the confirm dialog with focus back on the opener; the confirm dialog traps Tab and
// takes Cancel once (not on every store change); the bars behind a keyboard-opened sheet are inert; the dialog paints above the confirm bar and the Layers popover.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { tab, shiftTab, press } from '../helpers/keys.js';
import { fire } from '../../helpers/dom.js';

const later = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));   // the sheet's "this came from a key or a tap" flag lasts to the end of the task

describe('v92 a focus: the confirm dialog', () => {
  it('T11: takes Cancel once, keeps Tab and Shift+Tab among its buttons, and hands focus back to the opener', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const opener = r.root.querySelector('#topbar .menu');
      opener.focus();
      expect(document.activeElement).toBe(opener);
      let confirmed = 0;
      r.store.set({ confirmDialog: { text: 'Start a new city?', confirmLabel: 'Start', extraLabel: 'Export first', onExtra() {}, onConfirm: () => { confirmed++; } } });
      const dialog = r.root.querySelector('#dialog');
      const names = () => [...dialog.querySelectorAll('button')].map((b) => b.className.split(' ')[0]);
      expect(names()).toEqual(['cancel', 'extra', 'ok']);
      expect(document.activeElement).toBe(dialog.querySelector('.cancel'));
      // Tab moves on and wraps; Shift+Tab goes back and wraps the other way; focus never leaves the dialog
      expect(tab({ root: dialog })).toBe(dialog.querySelector('.extra'));
      expect(tab({ root: dialog })).toBe(dialog.querySelector('.ok'));
      expect(tab({ root: dialog }).className.split(' ')[0]).toBe('cancel');
      expect(shiftTab({ root: dialog }).className.split(' ')[0]).toBe('ok');
      // a store change that does not touch the question leaves focus where the player put it
      r.store.set({ overlay: null, layersOpen: false });
      expect(document.activeElement).toBe(dialog.querySelector('.ok'));
      // Tab from somewhere outside the dialog (a click on the backdrop left focus on the page) comes back in
      opener.focus();
      expect(dialog.contains(tab({ root: dialog }))).toBe(true);
      // Cancel closes it and focus goes back to what opened it
      dialog.querySelector('.cancel').click();
      expect(dialog.hidden).toBe(true);
      expect(document.activeElement).toBe(opener);
      expect(confirmed).toBe(0);
    } finally { r.cleanup(); }
  });

  it('T11: paints above the confirm bar and the Layers popover', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set({ layersOpen: true });
      r.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes' } });
      const z = (sel) => { const n = r.root.querySelector(sel); return n ? Number(getComputedStyle(n).zIndex) : null; };
      const dialogZ = z('#dialog'), others = [z('#confirm'), z('.layers-picker')];
      expect(Number.isFinite(dialogZ)).toBe(true);
      expect(others.every((v) => v === null || (Number.isFinite(v) && dialogZ > v))).toBe(true);
      expect(others.some((v) => v !== null)).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v92 a focus: sheets', () => {
  it('T11: a sheet opened from the keyboard takes focus at its title, makes what is behind it inert, and gives focus back to its opener on close', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      await later();
      const opener = r.root.querySelector('#topbar .stat.gold');
      opener.focus();
      press('Enter', { from: opener });                      // the key that opens it is the flag's cause; a click with detail 0 is what Enter sends to a button
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.hidden).toBe(false);
      expect(document.activeElement).toBe(sheet.querySelector('.head h2'));
      for (const id of ['topbar', 'dock', 'corners']) expect([id, r.root.querySelector(`#${id}`).hasAttribute('inert')]).toEqual([id, true]);
      expect(sheet.hasAttribute('inert')).toBe(false);
      await later();
      sheet.querySelector('.close').click();
      expect(sheet.hidden).toBe(true);
      for (const id of ['topbar', 'dock', 'corners']) expect([id, r.root.querySelector(`#${id}`).hasAttribute('inert')]).toEqual([id, false]);
      expect(document.activeElement).toBe(opener);
    } finally { r.cleanup(); }
  });

  it('T11: a sheet opened by a tap leaves focus alone (so the daily refresh keeps its numbers current) and gives it back on close, with nothing made inert; the first tap lifts the inert of a keyboard-opened one; one the game opens by itself never steals focus', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      await later();
      const opener = r.root.querySelector('#topbar .stat.gold');
      opener.focus();
      fire(opener, 'pointerdown');
      fire(opener, 'click', { detail: 1 });
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.contains(document.activeElement)).toBe(false);
      expect(r.root.querySelector('#topbar').hasAttribute('inert')).toBe(false);
      await later();
      sheet.querySelector('.close').click();
      expect(document.activeElement).toBe(opener);
      // keyboard-opened, then a tap anywhere lifts the inert so a touch user is never blocked
      await later();
      press('Enter', { from: opener });
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(r.root.querySelector('#dock').hasAttribute('inert')).toBe(true);
      fire(r.canvas, 'pointerdown');
      expect(r.root.querySelector('#dock').hasAttribute('inert')).toBe(false);
      r.store.set({ sheet: null });
      // the game's own opening (no key, no tap in this task) leaves focus alone
      await later();
      opener.focus();
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(document.activeElement).toBe(opener);
      expect(r.root.querySelector('#topbar').hasAttribute('inert')).toBe(false);
    } finally { r.cleanup(); }
  });
});
