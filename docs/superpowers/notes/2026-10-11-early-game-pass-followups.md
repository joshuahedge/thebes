# Early-game pass follow-ups

Carried forward from the per-task reviews, the final whole-branch review, its fix wave and the follow-up round (11 Oct 2026). Nothing here blocked the merge. Before and after screenshots at the four sizes: `screenshots/early-game-pass-*.png`.

## What Stage 2 must extend
- Goals that introduce each need (pottery, entertainment, beer and two foods, linen, jewellery), tier-count goals for tiers 5-9, firsts and achievements for the new tiers, goods and trade, new daily goals, tips for desirability, storehouse choices, trade and merges.
- `needCause` codes for the new needs (goods missing from the bazaar, goods not made, booth codes, low desirability, no 2×2 square), keeping the invariant test (null exactly when the row is met).
- "New" badges (the pass did not add them: Stage 1 had no Town unlocks), locked cards only for the next milestone, problem markers for the new alert codes, thumbnails and tints for the new buildings and categories.
- The summary's yes/no achievement rows already key off `of === 1`; new kinds work without a list.

## Known limits accepted by ruling
- On the smallest phones at the largest text (360x640 at 150%; 740x360 at 125-150%; 844x390 at 150%), the goals strip, a tip and a caption can briefly reach below the middle of the screen together; the combined-stack test pins each case. Captions wait while a tip shows in the compact layout and on phones at large text, and tips there close themselves after 15 s.
- The confirm bar keeps the tallest height it reached while a tool is active.
- The corner groups can be 4 px apart at 640x360 with 150% text and the drawer open.
- A migrated (pre-v2) city celebrates "First harvest" and "First month in profit" once each, because the migration starts tallies at zero.

## Interface
- The goals strip and the overlay legend run under the compact card drawer when it is open.
- `needCause` still says "No well within 5 road tiles" when a well's road never reaches the home, or reaches it by a path longer than its reach; a "the road does not reach" code would be truthful.
- Two buildings with the same alert title share one View name.
- The nudge's "Next:" line is not in the combined-stack test.
- The summary rebuilds every game day while open, which moves a screen reader's place; skip the rebuild when the numbers have not changed.
- Progress words carry no unit ("12 of 50" beside "Have 50 homes").
- Wide-panel category tabs are not visibly dimmed while the guide runs (only the dot marks the suggested one); the pressed and suggested cards look alike apart from the tag; the Suggested tag covers half the picture at 150%.
- Bazaar stock reads faintly at zoom 1 (the back baskets sit under the awnings); beige granary sacks are low-contrast on sand.
- A caption queue that builds up while the tab is hidden drains on timers rather than the frame clock.
- Keyboard 1-7 keep their categories (Industry is 4) with no on-screen hint.
- The thumbnail cache, the hauler's contact shadow, the stepped map-edge band and several test-tightness notes are in the ledger summary below.

## Sim and saves
- A first's gold lands after the goal check, so "Get out of debt" can complete a tick later than it could.
- Event goals complete when their trouble disappears, including by pausing or demolishing the troubled building.
- `alertsFor` runs daily while an event goal waits; computing the codes once per check would be cheaper.
- Daily goals: the swap order follows live availability; a missing base pins progress at 0 (corrupt saves only); a device clock set backwards redraws a day.
- `farmStage` decides "working" from staff and blocked, not the 25% rule.

## Tests worth adding
- Net exactly zero not counting as profit; a migrated world stepped with `advanceDays`; tie-breaks in the closest achievement; the null-achievements summary path (now silent-marked at load); a cross-chunk scatter test; the clip test at another zoom and pixel ratio; the goals sheet at the 320 px side panel.
