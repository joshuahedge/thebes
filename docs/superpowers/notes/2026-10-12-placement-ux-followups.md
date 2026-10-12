# Placement UX pass: follow-ups

Carried forward from the placement UX pass (12 Oct 2026): the design note `2026-10-12-placement-ux-review.md` (rulings P1-P16, part 8 of the rulings list), its eight task reviews, the whole-branch review (fable) and its fix wave. Before and after pictures: `screenshots/placement-*.png`.

## Josh's seven points, as merged
1. Fertile land: a Ground overlay turns on when a farm, orchard or mine is picked, and the ghost lands on the right ground. Met.
2. Drag or tap tiles: on a phone one finger draws roads, plots and walls, a tap adds or removes one tile, blocked tiles are skipped and counted, two fingers pan and zoom. Met; the feel needs a real phone.
3. No lock-in after placing: a touch ✓ ends the tool, the tray comes back, Undo is an icon, and the new building stays in view. Met.
4. Tap to expand: More ▾ opens a goal, tip or caption in place (up to 40% of the screen). Met.
5. Conditions shown separately: every condition is its own chip with words; a building that lacks only a road can be placed in amber and gives nothing (no upkeep, workers, desirability, firsts, achievements, daily goals, score) until a road touches it. Partly, by ruling: its gold is spent when it is placed (Undo refunds it within the month). A truly unpaid "planned" building is the follow-up if Josh wants it after playing this.
6. A visible road sign: a 20 px road badge on road-less buildings and on each group of road-less plots, dashed tiles where a road would join. Met.
7. A fertility overlay: Ground is the ninth overlay, and Layers opens a picker on every layout. Met.

## For Josh to check on a real phone
- Drawing by drag and tap, and that a second finger cancels a stroke rather than drawing.
- The Ground tint next to bright meadow (can fertile land be told apart at a glance).
- On a 667×375 landscape phone at 150% text an opened goal can push Show me below the fold (the 40% rule); say if Show me should stay pinned.

## Deferred
- At 150% text the goal row can show a clipped letter before More ▾ ("build a f More ▾"); widen the fade or cut on a word.
- The sample city (seed 11) now opens with a true "3 plots have no road" warning from its reserve plots; give them a road stub or leave it.
- A plot plan where only some plots lack a road says "No road touches it yet" in the bar (the toast after ✓ gives the count).
- Per-frame work while a row is open, while Ground is on and for road-less plots; the far scan when a farm is picked; small helpers to share.
- `:has()` in the CSS needs Safari 15.4+ and Chrome 105+.
- The room line under the bar is screen-reader-only from 125% text in portrait; it could start at 150%.
