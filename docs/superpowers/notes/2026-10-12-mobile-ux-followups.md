# Mobile UX pass: follow-ups

Carried forward from the mobile UX pass (12 Oct 2026): the review `2026-10-12-mobile-ux-review.md`, its task reviews, the whole-branch review (fable) and its fix wave. Nothing here blocked the merge. Before and after sheets: `screenshots/mobile-ux-before-*.png` (the review's evidence) and `screenshots/mobile-ux-{375x667-t100,375x667-t150,667x375-t150,844x390-t100}.png` (before above, after below). Rulings 163-177 are in `handoff-2026-10-11/rulings-so-far.md`, part 7.

## What changed, measured
- A raid warning with a goal and a caption on a 375×667 phone: rows under the top bar ended at 44% of the screen (72% at 150% text); now 23% (34%). On a 667×375 landscape phone at 150% text they ran off the screen; now one row ending at 31%.
- The height budget (rows end by 30% of a portrait phone at 100% text, 40% at 150%, 40% on landscape) is a test (`tests/ui/mobileBudget.test.js`) at 375×667, 844×390 and 667×375, at 100%, 125% and 150% text; `tools/shots.ps1 -Mobile` takes and measures the busy scenes.
- Wide layouts (1024×768, 1280×800) are pixel-identical in their chrome.

## For Josh to check on a real phone
- The top bar's icons at 150% text (☥ can read as ♀; ☺ may turn into an emoji on iOS).
- Two-line clamped tips and captions on an iPhone (`-webkit-line-clamp` on a button).
- Whether tips waiting until Play feels right in a new city (ruling 176), and whether 4-6 s captions are long enough to read (anything missed is in the Goals sheet's Recent list).
- The Update ready toast's ✕ on a phone.

## Deferred
- Two tips (`house_needs`, `overlay_keys`) can never show on a phone, because their triggers coincide with a sheet or an overlay that holds the guidance row; How to play still lists them. Either retrigger them later or accept it.
- Tapping a building frames it as if the goals strip were still there (the strip hides once the sheet opens), so the building sits a little lower than it needs to (safe, just conservative).
- The screenshot tool's focus emulation (added to stop headless Edge freezing frames) draws a focus ring on the title card's New city in shots.
- Small duplications noted by the task reviews (a speed-button label helper, the corners height in two places) and unit tests for `freeTop` and `cornersHeight`.
- A paused phone holds one waiting tip for at most 60 s of real time, so the "Tap the goal line" tip can be lost if the player stays paused longer (the goal and Show me stay visible; How to play lists the tip). Once play starts, that tip holds the row for up to 20 s, hiding the goal line it names.
- The Update ready toast with Restart and ✕, stacked above an Undo toast, is about two toasts tall on a 667×375 phone at 150% text (not measured).
