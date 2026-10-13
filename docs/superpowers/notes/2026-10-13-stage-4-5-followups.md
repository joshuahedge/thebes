# Stage 4.5 follow-ups

Carried forward from the Stage 4.5 task reviews, their fix rounds, the whole-branch review and its fixes (13 Oct 2026). Nothing here blocks the merge. The plan is `plans/2026-10-13-thebes-stage-4-5-polish-and-pressure.md`; every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, part 12, rulings 309 to 330).

## What changed, measured
- **The test suite** now has 1,918 tests and takes about 2 minutes 20 seconds on this laptop, so the default 150-second wait in `tests/run-tests.ps1 -WaitSeconds 150` has little room. Old headless Edge windows left running from earlier sessions made it much slower (over 3 minutes and a timeout) until they were closed: if a run times out, look for stray `msedge` and `python tests/serve.py` processes before assuming a test is stuck.
- **The balance runs** (spec 9): after the disease and crime work the village run ended at 68.2% of taxes spent and the capital run passed, with no retune needed for the tougher raids; rulings 329 and 330 (one worker each for the physician and police post, the disease and crime rates) are what kept them there.
- **The final review's fixes:** raiders have 19 standing spots (the cap is 18 and a two-sided raid totals 19, so they no longer stack); the ghost's "Looks after N homes" and "Watches over N homes" count homes with people in them, as the physician and police post sheets do; the Health and Crime overlays draw nothing before their threat starts or on Peaceful and the strip says why; share links, Start this seed and personal bests carry the map layout; the "What lies ahead" card names sickness and thieves (and fires alone on Peaceful).

## For Josh to check on a real phone
- **Fire under Gentle.** Settings → Motion on Gentle, light a fire (or open `?sample=1` and start one): the flames should change shape about once a second in place, with smoke fading in place, nothing flashing or rising. Scorch marks should stay after the fire under every level.
- **Bridges and gates by touch.** Draw a road across a river where it is 4 tiles wide or less: the bar should name the run and the price (25 gold a tile). Draw one across a wall: the bar should name the gates (20 gold each). Try the Gate card too. Check that a finger can start and end each, and that a too-wide river says why.
- **The forecast chip at 360 px and at 150% text.** The gold chip's "+120 a month" should fit under the gold figure; at the narrowest width with large text it may hide (below), and the tap should still open the summary at "Spending more than taxes bring in" when it is amber.
- **Newcomers walking in.** Watch a month turn on a growing city: one to three small figures should walk from the road entry to the new homes (at most 12 at once), and none should appear under Still.
- **The illness cloth.** Let a home fall ill (build a few crowded homes with no well after Town): the cloth should hang over its door at every Motion level, read at phone zoom, and not hide the home's roof or the next building's sprite (see below).
- **The two new overlays and cards.** Health and Crime from the Layers list: dots where a staffed physician or police post reaches, hollow rings where none does; the physician and police post cards' "Looks after N homes" and "Watches over N homes" should match the "Covers N homes" on the placed sheet.
- **The month clock.** A month should now take about 30 seconds at 1x; check that this feels right for early building and not slow for the late game.

## Interface (a later phone pass picks these up first)
- **The ill-home cloth is drawn after the sprites,** so on a home beside a taller building it can float over that neighbour. Drawing it in depth order with the home would fix it.
- **Under Gentle a second "Burning" pill can sit over a neighbouring building,** as the first Stage 4 pills do.
- **The Gate card has no "new" badge,** and a drag of a gate line that has a refused tile is refused whole rather than drawn up to the problem.
- **The gold chip hides when the top bar wraps,** and then an amber warning has no chip (the one-time tip still fires).
- **The "Costs N a month" line on a card is for a full crew;** when the workforce is short, the confirm bar's cost and the monthly balance differ (the tooltip explains).
- **"At this rate the treasury runs out in about 1 month"** reads oddly at exactly 0 gold.
- **An open Health or Crime overlay keeps its old strip** when the city reaches Town or Market town while it is open: toggling the overlay refreshes it.
- **The island's river split is hard to see at whole-map zoom,** on the minimap and in score stamps.
- **The title card's best-score lines do not say the map layout,** so two bests on the same seed and level but different layouts read alike.

## Balance and design
- **The late-game treasury pile** stays as it is (Josh's pick 8 on the economy page): a settled city still ends up with more gold than it can use, and thefts (2% of the treasury, 5 to 100 gold) are only a small skim off it.
- **The biggest-cost warning omits soldiers' pay,** so a city whose barracks are its largest cost is told another building is.
- **Map types later:** the six river layouts are the only variety; sea coasts, desert-only maps or a second river are later work.
- **Wider bridges or fords later:** a bridge crosses at most 4 tiles of water in a straight line, so a very wide river cannot be crossed at all (every layout but classic has at least one spot narrow enough, by a test).
- **The score does not count disease or crime** (ruling 321): Safety ignores them until a later score version.

## Code and tests
- The gate alias (a gate unlocks with the wall) is repeated in three files; one helper would hold it.
- No test pins the real-time timers (the one-time tip's gap, newcomers' walking speed).
- The spec's own sections have not been revised for Stage 4.5 (only the raid size cap was corrected); a revision pass should fold in gates, bridges, clay, the six layouts, the money hints, newcomers, the tougher raids, disease and crime.
- Ruling 71 in the rulings list still says "at most 12 raiders": it records Stage 1's rule and ruling 317 supersedes it.

## Before you push
- The tree has no mention of your employer, but an early commit of this branch's base still carries it in the plan text (it was fixed in the tree afterwards). History is not rewritten. Decide whether to leave it or rewrite those commits before the branch goes to the public repository.
