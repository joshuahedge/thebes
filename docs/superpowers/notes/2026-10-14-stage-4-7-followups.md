# Stage 4.7 follow-ups

Carried forward from the task reviews, the balance pass and the whole-branch review (14-15 Oct 2026). Nothing here blocks the merge. The plan is `plans/2026-10-14-thebes-stage-4-7-land-and-logistics.md`, the contract is `notes/2026-10-14-stage-4-7-contract.md` (sections 1-17), and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, part 14, rulings 461 on).

## What changed, measured
- **The test suite** now has about 2,630 tests (2,626 at the balance commit). It takes about 6 minutes (it was about 3 in Stage 4.6): run it with `-WaitSeconds 600`, alone, never beside another suite. Timing tests (the s4 balance live draw budget, placement preview, ambient puff) can flake under load: rerun once.
- **Large (80x80)**, Stress city, headless Edge, 390x844 at dpr 2: a cold bake of all 25 chunks is 129-147 ms at zoom 0.5 (it was 100 before the green band and rock belts) and 151-193 ms at zoom 1; Large against Normal at zoom 0.5 is 1.42x (the line is 1.6x). A fully built Large city's month end is 22-72 ms (about 100 ms in 4.6) with carts running. Contract sections 8, 12, 14 and 17 hold the runs.
- **The village balance run** holds 68.2% of taxes spent with the tribute met, and 73.7% with one fetch order (a second store costs 5.5 points), so the plan's 60-70% became 70-75% for a village that fetches (ruling 479).
- **The late run** (the capital run to year 15 on Normal): gold 83k, 107k and 166k at years 8, 10 and 15, favour 54, 44 and 44, raids 18, 25 and 25 beaten (23 at year 11 and 24 at year 14 after the gold step moved to 40,000), all 8 quotas met.
- **Fair flood** is x1.0 (average year x1.0125, was 0.98).

## For Josh to check on a real phone
- **Good and Fair spots.** Place a house with a finger: the house tool should stay on with a Done button, the marks should read at phone zoom (a drop and a basket, wash against hatching), and the bar should not change height as plots come and go. Turn an overlay on: the marks should go and come back with it.
- **The Fetch panel at 150% text.** Open a storehouse on a phone with text at 150%: "Fetch goods" opens to a row per good; the toggle, the stepper and Show me should be at least 44 px with the consequence line readable, and the sheet should not run under the bottom bar.
- **Carts under Gentle.** Set a storehouse to Fetch pottery from a far one: the cart should walk the road with its load drawn, stand at its store under Still, and read at phone zoom.
- **The new land at 390x844 under Gentle.** A new Normal city: green only along the river and round the oases (never as patches in open desert), long grey-brown rock belts with cliffed ridge hills on them, and the Ground legend naming hills on a map that has them.
- **A Large map's speed on an old phone.** Zoomed all the way out and panning, with carts running: it should stay smooth and a month turning should not hitch (the cold bake is a one-off about a third longer than in 4.6).
- **The tribute on the court sheet.** From year 7 the sheet shows the warning, from year 8 a Send button with its progress bar; check the reminders at 3 and 1 months and that Send is on screen without scrolling at 150% text.

## Deferred from the final review
- **One-time late warnings for 4.6 saves past year 7 or 9.** A city saved in 4.6 that is already past year 7 or year 9 never gets the year-before warning (the quota arrives at its next year start, the wealth term at once in year 10). Nothing is wrong in the sim; a one-off caption on load would explain it.
- **A real v7 save fixture.** The migration is tested on a classic and a `wide-bends` v7 city built in the tests, not on a save file written by a real 4.6 build. Add one from Josh's phone (Export city) and load it in a test.
- **4.6 Villas and Estates enter a two-month countdown.** Under the third-food rule (ruling 476) a saved Villa or Estate without three foods in reach gets the usual warning and a tier down after 2 months (the stock it held was a month at the old use, so with three foods in reach it keeps its tier). It is in the 4.7 release note; if Josh would rather grandfather them, a flag on old homes is the fix.
- **The late run never reaches a Villa.** Its city has no third food, no weaver and not enough desirability, so the upper tiers are tested with set-up scenes (`s47-estate`) and not through a played game; the upper-tier pressure has not been felt in a real run.
- **The mine repair still adds rock on about 43% of Normal maps** (58% Small, 48% Large): a short belt fragment where the draw had no mine within reach. It looks like a belt, but those maps carry about 33 more rock tiles than the draw aimed at.
- **The Small rock floor is 0.25x.** A Small map can hold a quarter of the rock the draw wants (lowest of 3,000 maps 0.30; the tests allow 0.25), and an oasis layout at Small sometimes has one short belt (about 1 in 60 had none before the last-resort tries).
- **The oasis gap.** The 8-tile gap between a pool and rock breaks on 26 of 3,400 new maps (0.8%), all of them mended-mine maps; the oasis test allows 40.
- **The village with a second store** spends 73.7% of taxes (ruling 479), so a fetching village has less margin than the 4.6 one; run the 10-year village again after any later change to food, wages or upkeep.
- **A far district without an order stays small.** With no Fetch, no home in the far-district scene reaches Townhouse or better; with one, 26 do (14 trips in 120 days). A player who never sets an order still sees stranded homes (the far-good tip and the house sheet's Show me point at the remedy).

## The 15 worktrees not removed
At the start the controller removed 16 old worktrees (s3-art, s3-fire, s3-raids, s3-score, s4-art, s4-cards, s4-look, s4-motion, s4-score, s4-sim, s4-ui, s46-armies, s46-court, s46-fixa, s46-fixb, s46-map) and pruned them; the branches were kept. These 15 were left, each for a reason, and Josh should look before removing them:
- **s3-ui**: untracked screenshots in `shots/` (not under `raw/`).
- **s4-scratch, s4-w-art, s4-w-balance, s4-w-cards, s4-w-look, s4-w-motion, s4-w-sim, s4-w-ui**: their HEAD is not an ancestor of main (writer copies; the work may exist only there).
- **s4-w-balance-replay** (a detached HEAD) and **s4-w-balance-tmp**: staged edits.
- **s46-river, s46-ux, s46-wonders**: a modified `tests/screenshot.ps1`.

## Process lessons
- **A fresh task brief per task kept the run lean.** One branch, sequential tasks, a controller ledger (`.superpowers/sdd/...`, never committed) with accepted rulings per task, and a review after each task worked. A task's reviewer minors went into the next task's first commit.
- **Josh's mid-run ask changed three rulings.** The green, hills and rock look were reshaped after Task 3 (Task 3b) from a whole-map screenshot; a short research note first (`2026-10-15-terrain-look-research.md`) and then a build kept it focused. Whole-map shots under Gentle should be part of the next land review, not only close-ups.
- **A network drop and a session restart cost nothing** because every task committed and the ledger was written as it went.
- **Numbers clash again.** Task 8 proposed 474-476 after Task 7 had taken 474-477; the controller renumbered them 478-480 and the final review added 481. Give each task a range up front.
- **The final review found a real design gap (ruling 480).** A food-only city would have been asked for grain it never held; running the balance run's village against the tribute caught it. Run the village and the late run with each new pressure before the review.
