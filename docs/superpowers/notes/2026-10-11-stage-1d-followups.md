# Stage 1d follow-ups

Carried forward from the Stage 1d reviews (per-task reviews, the final whole-branch review and its fix wave, 11 Oct 2026). Nothing here blocked the merge. Items already fixed in the fix wave (title-card New city confirm, backup fallback for every code but `newer_version`, dev flags loading first, `cache: 'reload'`, one audio context per page, title-phase import messages, the export-first install guide, `lastSpeed` seeding, `Object.hasOwn`, share before autosave, no reload after a failed save) are not repeated.

## Before the first publish: Josh's real-device checks (spec 9)
- iPhone Safari: first launch shows the install guide; Share → Add to Home Screen; the home-screen app offers Bring a city from Safari; import works; the silent switch keeps the game quiet with sound on; the share sheet appears for Export city (if it downloads instead, the share ran outside the activation window: see Export below).
- Android Chrome: Install on the title card and in the menu; vibration pulses on ✓ and milestones.
- A chat app's in-app browser (Messenger, Instagram): the "Open in Safari/Chrome to keep your city" notice shows and stays under the top bar.
- The link preview (og-image) in a messaging app, after Pages is live.
- Install → deploy a change → "Update ready" toast → Restart on the phone; the sticky Carry on row's safe-area padding on a notched phone.

## Saving and loading
- `store.js`: `localSave` leaves a stale `staging` key when the current write throws; `clear()` swallows an IndexedDB failure; IndexedDB request-level quota errors are classified `write_failed` rather than `storage_full`; no tests for a corrupt current with a corrupt or missing backup, `clear()` on IndexedDB, or `storage_full` on IndexedDB.
- When the title loaded the backup (current corrupt), the next autosave rotates the corrupt current over the good backup. Consider re-saving the restored text as current at Continue.
- Overlapping autosaves are not serialised and `setSaveFailed` is last-writer-wins; `setSaveFailed` does not refresh `#map-summary`.
- The "save failing" banner on the newer-version path says "free up storage"; a distinct blocked-save alert code would be truthful.
- `createUI` throwing on an imported world that passes `validateWorld` but is malformed deeper leaves a blank page (title and game both torn down); wrap `startGame`'s construction and return to the title with `T.saveUnreadable`, or validate `alerts`, `labour`, `undo` and building fields; consider `saveNow: false` for imports so a crashing import is not autosaved as current.
- `?speed`, `?sample` and `?stress` apply to every menu New city (main.js used to strip them).

## Export, import and install
- `hooks.importCity`: the `pick` await sits outside any try (an unhandled rejection shows no toast); `pickFile` never resolves on browsers without the `cancel` event (Safari < 16.4).
- `#dialog .buttons` has no `flex-wrap` for three buttons at the 150% text size.
- iPadOS Safari reports a Macintosh UA: pass `maxTouchPoints` from `readEnvironment` and treat Macintosh + touch as iOS, or iPad players get neither guide nor Install.
- The title guide's Install now ignores the `'guide'` result and the "not offered" small print is static; `appinstalled` is not handled (Install stays until reload); no test for a late `beforeinstallprompt` after the game started.
- The title's 25% tint paints over the in-app notice (cosmetic); the "City file downloaded" message stays on the card after Back.

## Service worker and update flow
- A stale offer can capture a worker made redundant by a newer one (read `reg.waiting` at click time); an offer is lost after the 20 s toast or across New city/import; a hard-reloaded page is uncontrolled so an update found then is never offered.
- `tools/sw-files.ps1` sorts culture-sensitively (use an ordinal sort so the stamp is stable across machines); `caches.match` without `cacheName` searches every cache.
- With a newer-version save in the slot, Restart refuses ("Couldn't save, so the update will wait") although the update is the way out; export is the workaround.

## Interface
- Goals: the strip's reward reads "+25" with no unit; the road goal counts tiles against `startRoad.length` (demolishing start-road tiles gives a false negative; a set difference would be exact); the portrait/compact Show me path is untested; the `has-overlay` body class is unused by CSS; `#goals` leaves a 6 px trailing gap when no goal is open.
- Welcome back: no test pins its history entry or Back closing it; `trendText` is untested with 5+ rows; `.trends` has no styles; in the wide panel column the card half-crops the second row of category tabs while open (by design).
- Sheets: focus restore by index can land on a neighbouring same-class button when the list changes; the legend sr-only rule duplicates `.sr-only`'s properties; the literal-label scan in the carry-overs test catches single-quoted capitals only.
- `afterCommand`/`onEvents` have no `destroyed` guard; no test for the sound-setting-turned-on-after-load unlock path.
- Minimaps read `renderer.dpr` once, so they stay at the old resolution after a live browser-zoom change.
- The title card is `role="dialog"` without `aria-modal` (harmless: the chrome is `display: none`).
- Back-stack entries pushed by the old UI survive `startGame`, so one Back press is swallowed after New city with a sheet open.
- Export: `exportCity` captures `ui` before its await; a share rejected on iOS falls back to a download silently.

## Tools and tests
- `tools/assets.html` ends in DONE after a FAILED write; a module-load failure waits the full 60 s (add an `onerror` hook); a bad base64 body leaves a `.tmp`; `render-assets.ps1` stops Edge without `/T`; `templeInk` has no edge/empty guard; vertical icon framing is untested.
- `tests/serve.py`: `/__file` has no Origin check (dev-only; a per-run token would close it); with HOST `0.0.0.0` anyone on the LAN can overwrite the six asset files (document it).
- Tests: `goals.test.js` imports an unused `staffAll`; the rig's cleanup is not in `try/finally` (a throwing UI test cascades); `autosave.test`'s "pausing first" case asserts speed only after the flush; `until()` in `boot.test.js` should throw on timeout; the second-game boot test's sheet/mode assertions are not RED-proven.
- `src/boot.js` is about 260 lines and still one orchestration file; split the title phase out if it grows again.
