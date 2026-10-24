// Version 8.0 (Track N, rulings 1160-1164): the message tray. Every toast and caption (placed, goal done, caravan, rank, a warning) shows for its few seconds and is
// kept here as well: the last TRAY_MAX messages, newest first, each with the place on the map it is about (or none). The tray is behind the scroll button at the top right
// (no new top-bar button, the 7.0 rule): the button counts what has not been read yet, and its sheet lists the messages (src/ui/adviceSheet.js).
// What needs a decision (a raid, a fire, a letter from the court, an event waiting) is not stored here: it is read live from the alerts and stays pinned at the top of the
// list until it is dealt with (src/ui/createUI.js trayModel). The tray belongs to a game's interface and is never saved.
export const TRAY_MAX = 30;

// The alerts that stay pinned: the banner's critical ones (a raid, a fire no staffed firehouse reaches, a raid warning, a letter from the court, debt, a save that fails)
// and the city event that waits for an answer. Pinned until the alert is gone, which is the player dealing with it.
export const PINNED_CODES = new Set(['raid', 'fire', 'raid_warning', 'court_letter', 'debt', 'save_failed', 'city_event']);

// createTray({ max }) -> { add(text, { at, why, kind }), drop(id), list(), unread(), markRead(), subscribe(fn), clear() }.
// subscribe's fn gets 'add', 'drop', 'read' or 'clear'.
export function createTray({ max = TRAY_MAX } = {}) {
  let items = [];       // newest first: { id, text, why, at: { x, y } | null, kind, read }
  let seq = 0;
  const listeners = new Set();
  const tell = (why) => { for (const fn of [...listeners]) fn(why); };

  return {
    // Records a message and returns its id (the toast keeps it to drop it again when its Undo is used). Blank words are not kept.
    add(text, { at = null, why = '', kind = 'info' } = {}) {
      const words = String(text || '').trim();
      if (!words) return null;
      const place = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: at.x, y: at.y } : null;
      const item = { id: ++seq, text: words, why: String(why || ''), at: place, kind, read: false };
      items.unshift(item);
      if (items.length > max) items.length = max;
      tell('add');
      return item.id;
    },
    // Takes one message away (a placement that was undone is no longer news).
    drop(id) {
      const n = items.length;
      items = items.filter((i) => i.id !== id);
      if (items.length !== n) tell('drop');
    },
    list: () => items.slice(),
    unread: () => items.reduce((n, i) => n + (i.read ? 0 : 1), 0),
    // Everything shown is read: the count at the top goes to nothing.
    markRead() {
      let any = false;
      for (const i of items) if (!i.read) { i.read = true; any = true; }
      if (any) tell('read');
    },
    clear() { if (items.length) { items = []; tell('clear'); } },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
