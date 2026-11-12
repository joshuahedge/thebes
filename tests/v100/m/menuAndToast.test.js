// Version 10.0, Track M (rulings 2308 and 2309): the menu's Continue is outlined, not filled (C5); a toast waits above the Paused tag while it shows in the same corner (C6).
import { describe, it, expect } from '../../harness.js';
import { openSheet } from '../../../src/ui/modes.js';
import { bootAt, frame, wait, rect, SAMPLE_CITY } from './helpers.js';

describe('v100 m: the menu has no filled button (C5)', () => {
  for (const [w, h] of [[375, 667], [390, 844]]) {
    for (const text of [100, 150]) {
      it(`${w}x${h} at ${text}%: Continue is the outlined style and nothing in the menu is filled`, async () => {
        const r = await bootAt(SAMPLE_CITY, w, h, text);
        try {
          const ui = r.api.game().ui;
          ui.store.set(openSheet(ui.store.get(), 'menu'));
          await wait(150); await frame();
          const cont = [...r.root.querySelectorAll('#sheet .menu-list button')].find((b) => b.textContent.trim() === 'Continue');
          const cs = getComputedStyle(cont);
          expect([w, text, cont.classList.contains('secondary'), cont.classList.contains('primary'), cs.backgroundColor]).toEqual([w, text, true, false, 'rgba(0, 0, 0, 0)']);
          expect([w, text, r.root.querySelectorAll('#sheet button.primary').length]).toEqual([w, text, 0]);
        } finally { r.cleanup(); }
      });
    }
  }
});

describe('v100 m: a toast clears the Paused tag (C6)', () => {
  for (const [w, h] of [[375, 667], [390, 844]]) {
    for (const text of [100, 150]) {
      it(`${w}x${h} at ${text}%: the toast's bottom edge sits above the tag's top while paused`, async () => {
        const r = await bootAt(SAMPLE_CITY, w, h, text);
        try {
          const g = r.api.game(), at = [w, h, text];
          g.world.speed = 0; g.ui.store.set({}); g.ui.refresh();
          await wait(100); await frame();
          g.ui.toasts.show('Road laid');
          await wait(150); await frame();
          const tag = r.root.querySelector('#corners .speed-main[data-state="paused"] .state-tag');
          expect([...at, Boolean(tag)]).toEqual([...at, true]);
          const toast = rect(r.root, '#toasts .toast'), tagBox = tag.getBoundingClientRect();
          expect([...at, toast.bottom <= tagBox.top + 0.5]).toEqual([...at, true]);
        } finally { r.cleanup(); }
      });
    }
  }
});
