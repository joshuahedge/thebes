# Stage 1c follow-ups

Carried forward from the Stage 1c reviews (per-task reviews and the final whole-branch review on 10 Oct 2026). Nothing here blocked the merge; the final fix wave took the rest. Each item belongs to the plan that first touches the code in question. Source for the minors: `.superpowers/sdd/2026-10-10-thebes-stage-1c-interface/deferred-and-rulings.md`.

## Plan 1d (onboarding, saving, shipping)

### Accessibility and keyboard
- **Left-handed mirroring** covers only the corner buttons. The confirm bar and the rail's ✕/✓ still need to mirror.
- **Esc cannot close an open tray or drawer.** Back, the handle and the category button close them; Esc does not.
- **Sheets rebuild on hover and lose button focus.** Rebuild only when the data changes, or restore focus by class as the confirm bar does.
- **The legend under a banner hides its dot/ring words.** Use the sr-only pattern so the words stay readable by screen readers while the legend is collapsed.
- **Landmarks.** There is no `<main>`, and empty region landmarks are announced. The dialog still has no focus trap or focus restore, and it rebuilds on every store change while open.
- **Switches** repeat the state word in their accessible name.
- **Minimap canvas** has no keyboard path.
- **Cards and the confirm bar.** The tray rebuilds on a gold tick and drops card focus. The confirm bar is not `aria-live`. In the demolish bar the refund is shown twice.
- **Keyboard layer.** `preventDefault` runs even when no action handles the key; there is no `isComposing` check; `detach` is not asserted; `?` with shift is untested. The context-menu key is ignored until the first mouse press, because the initial `inputType` is `'touch'`.
- **Text-size and compact chrome.** Compact `--topbar-h` is 40 px but its buttons are 44 px, so sibling chrome overlaps the bar's bottom 4 px at 100% text size (use `max(var(--tap), calc(40px * var(--ui-scale)))`). The dock handle's lower 10 px hit area is painted over by `.cats`. `sheetInsets` ignore the compact 40 px bar, the text scale and the banner. Stats can clip at 900 px wide or large text; hide the wide-only stats below a threshold.

### Motion and settings
- **Effects read reduced motion once at creation.** A change in the settings sheet or in the system setting is not seen until reload. Watch `matchMedia` (the back stack and camera control have the same gap).
- **`settings.js`** reads the `localStorage` global in a default parameter, which can throw in sandboxed contexts. Guard it with try/catch when saving lands.

### Cards, money and wording
- **Debt on the cards.** A 120-gold item shows as affordable at 50 gold because `canAfford` allows debt down to -500 (same rule as `no_gold`). Consider an amber "goes into debt" state so coral still means "refused".
- **Strings outside `T`.** Summary strings ("Grain", "Lasts", "Working", "Jobs"), raw good keys in stock rows, the compact date and " mo" in `hud.js`, and the milestone toast capitalisation. `T` also has duplicate values (shortcuts / keyboardShortcuts, mood / moodBreakdown), and the forbidden-word test covers `text.js` only.
- **`bazaar_empty`** fix text states the cause, not an action ("Build a granary with grain within N road tiles").

### Camera and gestures
- Rapid `zoomStep` compounds from the live zoom, not the pending target; the point under the cursor drifts mid-zoom tween; `panTo`/`jumpTo` have no non-finite guards.
- Gestures: a third pointer is partly mishandled (`pair()` noise, no `inPinch`); `onDragEnd` at pinch start reports the new pointer's coordinates; `lastTap` ignores input type (mouse then touch within 300 ms double-taps). `onLeave` after touch clears mouse hover.
- Placement: demolish ghost marks only tiles inside the rectangle (whole footprints go); the road ghost marks existing-road tiles; `pointAt` stores raw coordinates (createUI clamps via `tileUnder`); only the first warning is shown; `demolishOne` does not deselect (the sheet closes, which deselects).
- Back stack: `depth--` assumes `back()` drops one step; `start()` with something already open; Forward and reload popstates; `set(null)` throws. A step closed with Esc or ✕ leaves a stale history entry that absorbs one Back (kept by ruling).

### Performance
- `summaryData` runs every frame, and the wide minimap redraws every frame. Both can be keyed on the day.
- Three panels (dock, side panel, rail) carry the same card memo key; fold into one helper if a fourth appears. The side panel renders in hidden layouts, and panel, rail and corners have no teardown.
- `chunkSignature` is computed twice per re-bake. `drawOverlay`'s guard uses inherited keys (use `hasOwn`).

### Tests worth adding
- Theme: `TEXT_PAIRS` omits white-on-coralText and inkSoft-on-tealSoft; the token check runs one way only; the default `windowSubscribe` is untested.
- Camera: cancel, retarget and reduced-motion zoom are untested. Gestures: edge tests for `tileAt` near -1/size, `pointercancel` mid-drag and a third pointer.
- Input: pen hover, wheel-towards-cursor, `ghostDragEnd` on cancel. Banner: reorder, level-change announce, timer after dismiss, clear with an active timer.
- Sheets: the minimap tap test is vacuous (taps near a corner); no assertions for pin, outline or dots; house timers untested. Help test is circular for most rows. Panel/rail: weak tests for the fold label, the warn-enabled tick and the drawer's `onPick`.
- Settings: `getItem` throwing is untested. Overlay: the INK ring and range culling are unasserted.
- Housekeeping: the modes test title still says "in portrait only"; `tests/all.js` no longer keeps the stress test last; the a11y reduced-motion test hard-codes 12,10; the rig cleanup has no try/finally; `ui.css` stays loaded after the test file; `destroy` leaves `dataset.mode`; `fire()` builds contextmenu and dblclick as plain Events; `el()` drops `false` and sets `true` as `""` for `aria-pressed` (callers pass `String()`); `openSheet(state, 'info')` bypasses `select` (document non-info only or route it); `back()`'s selected branch duplicates `deselect`.
- README omits R. No CSS yet for `.checklist`, `.problems`, `.alert-list`, `.minimap-wrap`. The drawer has no role or label. The confirm bar's cost text wraps in the 320 px panel.

## Stage 2 and later

- **`store.set` re-entrancy.** A subscriber that calls `set` hands later subscribers an older state (`sheets.render` does it when a selected building is missing). Today that is rare. It becomes real in Stage 3, when buildings are removed on the daily tick: queue nested sets, or have subscribers read `store.get()` instead of the argument.
