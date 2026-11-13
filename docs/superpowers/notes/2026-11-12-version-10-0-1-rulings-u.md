# Version 10.0.1, Track U (the screen): rulings 2340-2354

**2340 (U.1, the tip card).** On the wide layout `#tip .tip-row` is a grid: the portrait and the words share the top line (the words take every px the card has), Show me and Got it sit on a line of their own beneath, right-aligned. The cap is `calc(440px * var(--ui-scale))` (it was a flat 440), so the card grows with the text size. Phones (portrait, compact) are untouched: the rule is `body[data-layout="wide"]` only, so the 390x844 and 375x667 looks at 100 and 150% are exactly 10.0's. Plan and code agree; note that "Auto" text size puts a 1920 px window at 125%, so the 1920x1080 card is 550 px wide.

**2341 (U.2, the "Rushed" label).** `rushLabelAt` now returns the middle of the footprint's back-right edge, 2.5 art px above the ground line (it was the front corner plus 7). Size 6 art px (was 7), no outline, alpha 0.82, softer ink. The problem marker's badge stands on a stem over the footprint's middle (`monumentTop`), so a pill half a footprint's width to the side never meets it; the fire labels' pills stand on roofs, so `layoutLabels` stepping was not needed and is not used (the plan allowed "or an equivalent"). `tests/v84/g/ui.test.js` passes unchanged: it only pins the text.

**2342 (U.3, where the keys are).** Plan said "keys 1-7 already open the build tabs". True, but on the wide layout the panel's cards are always on screen, so "a tab's tray is open" needs a meaning there. Ruling: on wide, the cards are open for the card keys from the moment a tab is chosen (its key or a click) until Esc (`store.cardKeys`, set in `keyActions.category` and the panel's tab click, cleared by `goBack` when `back()` has nothing else to close). On the phone dock tray the tray is `dock === 'tray'`; on the compact rail the drawer is open with no tool or sheet over it. `trayOpenOf(state)` in `src/ui/v1001/cardKeys.js` is the one test.

**2343 (U.3, card keys).** New KEYS entry `card` ('1'..'9'). Keyboard: with the cards open a card key picks its card (the i-th pickable card behaves as a click on its button), otherwise the tab key opens its tab; a key that is only a card key does nothing with the cards shut. Locked cards are not numbered and cannot be picked (they have no click either). `matchKey` still returns the first matching action (tab keys); `matchKeys` lists all.

**2344 (U.3, badges).** `createKeyBadges` adds a small number to each tab button (dock, rail, panel) and, while the cards are open for keys, to each pickable card (bottom right). Only with `(any-pointer: fine) and (any-hover: hover)` (read at decorate time, so a test may stub `matchMedia`) and while Single keys is on; hidden on touch. Tab buttons also get a tooltip "Roads (1)" and `aria-keyshortcuts` (a tooltip this code set is removed again, others are left). It holds no settings subscription (a test counts them): createUI's one settings watch calls `decorate()`.

**2345 (U.3, speed and pause tooltips).** The wide speed steps already said "Pause (Space)" and "(] and [ change it)" (6.0/8.0). They now follow the player's keys: `speedStepTitle(s, keys, map)` and `createSpeedControl({ keyMap })`.

**2346 (How to play).** The key table gains a "Pick a card, while its tab is open - 1 to 9" row (`HELP_ROWS` spliced in Track U's text section) and, once any key is changed, shows the keys in effect instead of the written "1 to 7" / "Arrows or WASD". The long paragraph in `V60_HELP` still names the defaults (it is static text from KEYS): left as is.

**2347 (U.4, storage).** `settings.keyBindings`: `{ action: [keys] }`, only what differs from KEYS; default `{}`; validated as an object of key lists (an older save, or junk, loads `{}`). `effectiveKeys(overrides)` (src/ui/v1001/keymap.js) lays valid lists over the defaults, ignores unknown actions, ignores a tab or card list of the wrong length, and always keeps Esc on Back. `createKeyboard` reads it on every key (cheap). No world state: `WORLD_VERSION` stays 12.

**2348 (U.4, clashes).** A key another action holds is REFUSED: the new key is not taken, the other action keeps its key, a status line names the holder ("M is already Open the minimap. Press another key, or Esc to cancel."), and the listen stays open so the player can try another. Letters match in either case. The tab keys and the card keys share digits by design and never clash with each other; inside one list a key cannot sit in two slots. Never bindable: Tab, modifiers alone, F-keys. Esc cancels a listen, so Back always keeps Esc as well as its new key.

**2349 (U.4, Options > Keys).** A "Keys" section (a closed `details.keys-section` inside the Controls group, so Options keeps its five groups and the pinned group-order tests stay as they were): one row per KEYS action (tab and card rows have a button per slot), a Change button (named in its aria-label, "Press a key..." while it listens, Enter or Esc from the keyboard), a polite live warning line, and Reset to defaults (disabled while nothing differs). Change on an ordinary action replaces all of that action's keys with the pressed one (and its other case); Pan therefore loses its Arrow keys when changed, Reset brings them back. The listener is on the document in capture and swallows the keys while listening; it stops itself if the sheet has closed under it.

**2350 (pinned tests changed).** `tests/ui/cardThumbs.test.js` "keeps the number keys on their categories": a tray left open now takes digits as card picks, so the test presses Esc between tab keys. `tests/v71/fb/ui.test.js` "leaves the build category alone while a sheet is open": its probe lets go of `cardKeys` after each key.

**2351 (files outside the ownership list).** `src/ui/createUI.js` (keyActions.category/card, goBack, the keyboard and badges wiring, speed keyMap), `src/ui/sidePanel.js` (tab click arms the card keys), `src/ui/menu.js` (the Keys group, keyLabel's map), `src/ui/speed.js` and `src/ui/text.js` (the tooltip map, Track U's section), plus the new `src/ui/v1001/*`. Needed for the wiring; no other track edits them.

**Not done / left.** The lesson lock (`src/ui/v81/lessonLock.js`) still matches the default tab keys, so a rebound tab key is not refused by a lesson's lock (the lesson runs in its first minutes; a rebinding player could open a locked tab with it). Phone tip screenshots at 150% were not taken: the phone rule was not touched.

## Review fixes (rulings 2410-2414)

**2410 (the ghost on a short phone; fix 1).** The steady stack hid the farm ghost at 375x667 from 125% text up (the bar and the corner row stood on the dock's strip, leaving a band shorter than the ghost). Fix, option b: `updateStackTight` (createUI.js) decides, from the steady geometry each time (the class is removed, measured, put back), whether `band = bar top - rows end` is below the ghost's height + 24 px (about 700 px tall or less at 125% text and up); if so the body gets `stack-tight` and 10.0's stacking returns while a tool is on (bar at the foot, corners riding it, dock gone). It is decided in `pick`, `showMeAt` and on every store or settings change, and `placingInsets` drops the strip estimate under it. 390x844 is never tight. Option a was measured first and does not fit: the placing bar alone is 244-273 px at 150% text on a 667 px screen. Ghost spans (screen y of the farm's four corners, bar top): 375x667 150% + 67 px row 236-300, bar 394; 150% no row 206-270, bar 394; 125% + 67 px row 242-306, bar 415; 100% 179-243, bar 284 (steady); 390x844 100% 294-358, bar 461 (steady); 150% 267-331, bar 379 (steady). The real assertions are restored in `tests/v70/p/review.test.js` (cases 150%/110, 150%/67, 150%/0, 125%/67, 100%/0, 390x844 150%; the Show me test also asserts `lowest <= bar top`) and `tests/v1001/u/ghost.test.js`.

**2411 (the lesson lock and the player's keys; fix 2).** `lockTo(allowed, { root, onRefused, keys, cardsOpen })`; lesson.js passes the effective map and `trayOpenOf`. `keyLockId` matches `matchKeys` against that map and resolves a tab with `slotOf`; a digit that is a card key while a tab's cards are open is never refused as a tab key (the locked card refuses its own click). Tests in `tests/v1001/u/review.test.js`.

**2412 (a modal; fix 5).** `trayOpenOf` is false under `confirmDialog`: a card key picks nothing behind a modal.

**2413 (hardening; fix 7).** `effectiveKeys` strips Back's keys (Esc, and any key Back was given) from every other action, so `{ pause: ['Escape'] }` is dropped (the action keeps its defaults). In Options > Keys, Tab ends a listen, is not swallowed, and focus stays where Tab put it (the rows keep focus on the same button across a redraw).

**2414 (hints, coverage, the label; fixes 6, 8, 9).** Key hints now follow the player's keys: the bar's Rotate title and aria-keyshortcuts (`keyMap` into `createConfirmBar`), the Map button, Pause (title and aria), Zoom in/out and Fit the city (`keyMap` into `createSheets`, read when a sheet is built). The long V60_HELP paragraph still names the default keys (static text from KEYS). Coverage: `tests/v1001/u/review.test.js` holds the order test for 375x667 at 150% (building, toast, tray, corners, top to bottom) in place of the deleted "zooms out just enough" case, which described the 10.0 gap. `tests/ui/placementFit.test.js:172` is `> 32 - strip / 2`: the free middle moved up by exactly half the dock's strip. The Rushed pill now rises to `monumentTop - 3` where that is higher than the back edge (a part-built pyramid), beside the apex rather than over it.

## U.5 The bottom bar and the corner buttons (ruling 2352-2354)

**Measured first (10.0 as it stood; `early` dev scene, Gentle motion, CSS px; screen rects of the dock, the Play/Pause button, Map and Layers).** Dock top / height, then the buttons' top:

| state | 390x844 t100 | 390x844 t150 | 375x667 t100 | 375x667 t150 |
|---|---|---|---|---|
| idle (slim) | dock 772 / 72, buttons 708 | 755 / 89, 660 | 595 / 72, 531 | 578 / 89, 483 |
| tray, Roads | 611 / 233, 552 | 500 / 344, 426 | 417 / 250, 375 | 323 / 344, 249 |
| tray, Homes | 665 / 179, 552 | 569 / 275, 426 | 465 / 202, 375 | 392 / 275, 249 |
| tray, Food | 642 / 202, 552 | 575 / 269, 426 | 465 / 202, 375 | 398 / 269, 249 |
| tray, Services | 631 / 213, 552 | 578 / 266, 426 | 454 / 213, 375 | 401 / 266, 249 |
| card picked (placing bar) | dock hidden; bar 680 / 164; buttons 620 | bar 499 / 345; 428 | bar 486 / 181; 426 | bar 423 / 244; 352 |

So the bar varied from 72 to 344 px and the three buttons stood at three different heights (idle, tray, placing; four at 375x667/150% with the tray), and the Layers button changed width with the layer on (51 -> 48 px; "Entertainment" is far wider), which moved the Map button sideways as well. Not measured separately: a drag in progress (it is the placing state: the same bar and tool mode), the lesson row and an alert row (both stand under the top bar, they never touched the bottom stack), Track M's folded bar on a short phone (it shortens the placing bar only; it is covered by the 375x667 columns). No tablet/narrow desktop shows this bar (it is the portrait layout only: 767 px and under, `data-layout="portrait"`).

**2352 (the fix).** Portrait only. The dock keeps its slim strip in every state (the tray is `position: fixed` above it and its own region; in placing the dock is `visibility: hidden`, not removed, so nothing below moves), the corner row sits at one fixed place (above that strip, `--dock-slim + 8px`), and the tray and the placing bar open ABOVE the corner row (`--stack-b = strip + 8px + corner row + 8px`). `#corners` no longer rides the bar's `--confirm-h` or the tray's edge; the `over-half` hiding is gone on a phone (the corners can no longer be over the middle). The Layers button has one width (76px x scale; longer layer names are cut with an ellipsis, its accessible name stays whole) so the Map button never shifts. Compact and wide layouts are untouched (`:where(:not(...))` keeps the old rules' specificity).

**Cost, stated.** The dock's strip (72 px at 100%) and the corner row now stand under the bar, so a picked card's bar covers about 76 px more map than before: at 390x844 the free band is still large; at 375x667 and 150% text under a 110 px synthetic goal row (the review's worst case) there is no band left. Everything else holds.

**2353 (code that measured the old layout).** `placingInsets` measures the bar's top edge (not its height) and its pre-bar guess adds the dock's strip; `leavePlan` counts the tray's top edge and the toast's measured top; toasts in the tray state and while a tool is on sit above the tray/bar (CSS); the map foot is `canvas top + view().height` (a rig's canvas is not full height). Pinned tests updated: `tests/ui/placementFit.test.js` (bar above the corners, not under them; the free-middle guess includes the strip; the "more than a tile below 40%" check became "> 0"), `tests/ui/cornerWords.test.js` (corners are never hidden by the tray on a phone), `tests/ui/createUI.test.js` (the three toast/tray framing tests describe the new order: building, toast, tray, corners), `tests/ui/houseSheetWhy.test.js` (middle of the free map from the bar's top and the strip), `tests/v70/p/review.test.js` (ruling 993's whole-farm-above-the-bar check keeps its assertion everywhere except the synthetic 110 px row at 375x667/150%, see Cost).

**2354 (test).** `tests/v1001/u/bar.test.js`: at 390x844 and 375x667, at 100% and 150% text, the dock's rect and the Play, Map and Layers rects are identical (within 1 px) idle, with each of four trays open, and with a card picked; the tray and the bar stand above the buttons. After shots: `v1001-u-bar-after-<WxH>-t<text>.png` beside the `-before-` ones.

## Final review fixes (rulings 2415-2419)

**2415 (U-1, the key not the action).** `keyboard.js` leaves a focused button only its own Space and Enter (`ev.key === ' ' || 'Enter'`), not every key bound to Pause or Confirm; a rebound P or C now works with Menu focused. Tests in `tests/v1001/u/keys.test.js` (both failed before the fix).

**2416 (U-2, key words).** `clash` reads "M is already used for Open the minimap."; `speedStepTitle` prints the speed keys through `keyName` ("(F and [").

**2417 (U-3, How to play).** `menu.js` adds `V1001U_TEXT.keysChangedHelp` after the V60_HELP paragraphs when `keyBindings` is non-empty. This closes 2414's open item.

**2418-2419.** Unused.
