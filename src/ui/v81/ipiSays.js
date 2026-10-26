// Version 8.1 (Track D): the build tray's way to Ipi's speech bubble. Track T owns the scribe (src/ui/v81/scribe.js, say(text, { anchor, ms, onDone })); this file asks for it
// lazily, so the tray works the same where the scribe is not there yet (it says nothing then) and a test can stand in for it with setSay.
let sayFn = null, asked = false;

export function setSay(fn) { sayFn = typeof fn === 'function' ? fn : null; asked = true; }

// Loads the scribe once, after the page has started. A missing file or a failed import leaves the tray silent.
export function loadScribe(importer = () => import('./scribe.js')) {
  if (asked) return;
  asked = true;
  try { importer().then((m) => { if (!sayFn && m && typeof m.say === 'function') sayFn = m.say; }, () => {}); } catch { /* no scribe */ }
}

// One line from Ipi. True when the scribe was there to say it.
export function ipiSay(text, opts = {}) {
  if (!sayFn || !text) return false;
  try { sayFn(text, opts); return true; } catch { return false; }
}
