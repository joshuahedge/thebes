# Stage 2 follow-ups

Carried forward from the Stage 2 per-task reviews, the whole-branch review (fable) and its fix wave (11 Oct 2026). Nothing here blocked the merge. Before and after screenshots at the four sizes: `screenshots/stage-2-*.png` (before = main before Stage 2; after = the six Stage 2 scenes). Every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Stage 2 section).

## For Josh to check on a real phone
- How long the title card takes to appear: the backdrop city now simulates 600 days (0.1-0.35 s on a desktop, perhaps about 1 s on a mid phone). If it drags, precompute the backdrop or cut its days.
- The tier ladder's tones (whitewash, cream, ochre, rose for Manor to Estate): the Fine manor's cream is close to the sand colour.
- The desirability overlay at zoom 1, and the coral hatching while placing an unpleasant building (a granary hatches a large area).
- The trade sheet on a landscape phone: the Sell buttons sit below the fold.

## Balance (from the long-run test, `tests/sim/capital.test.js`)
- The scripted city reaches Capital in month 17 with a lowest month-end treasury of 379 gold, then sits at 1,134 people with about half its workforce jobless (the script stops building homes). Its wages plus upkeep fall to 30% of taxes from month 24, against spec 4.11's 60-70% for a steady tier-4 town: the late game is generous, and gold piles up (about 154,000 by year 6) with nothing to spend it on until Stage 4's monuments.
- A raw good that outruns its workshop (clay 40 a month against the potter's 30) slowly fills a shared storehouse and slows every chain that stores there; refusing it at one storehouse or building another are the player's levers.
- Homes that want one food take from the food their bazaar holds most of (a ruling), so surplus figs no longer block grain farms; two-food homes still split half and half, grain first.
- A full granary now raises its own "Granary is full" beside the farm's "no storage" (accepted: both are true), so a Stage 1 village whose granary fills shows two markers.
- The sample city (`?sample=1`) starves on seeds 4, 7 and 19 (fertile land out of the farms' reach) and ends in debt; most seeds sit at mood 27-31 with a "Make more jobs" goal. The title backdrop and the tests use seeds that work.
- The 64×64 stress city: a month takes about 0.4 s and the first goods or water overlay about 1-2 s (houses × providers); irrelevant below about 2,000 people.

## Interface
- On the smallest phones at large text, with a debt banner up, the desirability legend ends about 4 px above the middle line (font-dependent); with two banners up any legend reaches the lower half (as before Stage 2).
- On a landscape phone (844x390) with a banner up and an overlay on, the goals strip ends at about 55% of the height (the legend now shares one row; four stacked 44 px rows need about 216 px of 390); at 150% text the banner wraps and the legend ends at about 53%. In the compact layout an open sheet covers the right end of the goals strip.
- A first caravan whose gift cannot land (no store near the post) and that trades nothing says "found nothing to trade" without saying the gift is waiting for a store.
- The confirm bar can still grow once when a reach building's "Makes N homes nicer" line wraps (it then holds its tallest height).
- The landscape rail fits five categories with 6 px to spare at normal text; at 150% its own ✓ is partly clipped (the confirm bar has one).
- The storehouse sheet lists all eight goods from Town, including gems and jewellery (long on a phone).
- A workshop's status line says "Making pottery" before its first production day; "Nothing makes pottery near the bazaar" also shows while a maker exists but has not produced, is paused, lacks clay, or its only store refuses pottery.
- The trade sheet: an idle caravan still gets the celebration caption; focus drops to the page when −10 is disabled at keep 0; a disabled "Open route" reads faintly; a refused click's toast says "Not enough gold" where the sheet says "Would put the treasury over 500 gold in debt"; with several trading posts and none working, the stock count uses the first post's reach.
- Difficulty: each choice announces the current level's hint to a screen reader; the pressed state is fill only (it would vanish in forced-colours mode); the Settings row wraps its three choices onto two rows on phones.
- Goals: "1,000" in a goal but "1000" and "2000" in achievements (no thousands formatter); the beer goal text drops "and"; the merge tip is true but does not say that plots filling below Townhouse block a merge.
- The house sheet's "Show me" for an empty granary (Stage 1) still aims the grain farm at the granary (the fig, barley, flax and gem cases now aim at suitable ground).
- Undoing a placement does not bring back its "New" badge; a Stage 1 save already at Town gets no "New" badges for the Stage 2 unlocks.

## Art
- Ripe barley looks like ripe grain at zoom 1, and fallow barley and flax are identical (their pennants differ); the industry pennant is faint at zoom 1, especially on the potter and jeweller.
- The weaver's pennant pole lines up with its loom post; the trading post's donkeys are drawn over the hitching rail.
- Registry heights are typed in, not derived from the drawing, and the bounds test's 8 px margin cannot catch an understated height.

## Code and tests
- Tests worth adding: the trade post's 16-tile boundary; trade determinism through the clock; tiers 6-9 rising and falling in place through the monthly check; the tie-to-grain food rule with several bazaars; a goal behind a waiting goal still completes; a pure size change rebuilding the desirability field; the title card fitting at 844×390 at normal text.
- Small duplications: the stores-of-a-good test (four places), `foodOnHand` (two), the category-tab builders (dock, rail, side panel), `yearOf` vs `dateParts`.
- Loose tests: the pennant pixel test cannot see a missing pennant on the gem mine or storehouse; the long run's chain floors would pass a chain at half speed.
