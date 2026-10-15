# Version 5.0 follow-ups

Carried forward from the task reviews, the balance pass and the final review (15-16 Oct 2026). Nothing here blocks the merge. The plan is `plans/2026-10-15-thebes-version-5-0-know-your-city.md`, the contract is `notes/2026-10-15-version-5-0-contract.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, part 15, rulings 501 on).

## What changed, measured
- **The test suite** now has about 2,960 tests (2,958 at the last run). It still takes about 6 minutes: run it with `-WaitSeconds 600`, alone, never beside another suite. Timing tests can flake under load: rerun once.
- **Large (80x80) against Normal**, stress city, zoom 0.5, mean frame: 1.14x after the renderer left out what is off the canvas (it was 1.77x; the target was 1.25x). Zoom 1 is still 1.27x (see below).
- **Home progress, Goods supply and Workers** build their lists in slices of about 6 ms a frame and draw the old list until the new one is whole (ruling 548a): the worst frame on a huge city went from 262 to 39 ms.
- **The grand district run:** a Fine manor in month 74, a Villa in month 86 and an Estate in month 97 by following the advice, with no balance data changed (ruling 584). The 10-year village still spends 68.2% of taxes (73.7% with one fetch order); the capital run 67.5%; the late run meets every quota with no raid lost.

## For Josh to check on a real phone
- **Fling feel.** A quick swipe should carry the map and slow to a stop (about 350 ms under Full, shorter under Gentle, none under Still), and a touch while it moves should stop it and do nothing else. Check it is not too slippery or too short.
- **Two-finger double tap.** Two fingers tapped twice should zoom out one step, also with a tool open. Check it is easy to do and does not fire while pinching or drawing.
- **The top bar at 150% text.** The Advice button was fitted in by tightening the bar (ruling 524). Check nothing is cut, wrapped or under 44 px, and the numbers still read.
- **Drag areas and Route by finger.** Drag a farm area, a garden area and a statue area; check the total and the skipped tiles read, the 44 px one-building or area icon is easy to find, and Undo takes the whole area back. Drag a Route: the preview should follow the finger, settle on lift, and the tiles, bridges and price should read.
- **The Advice dot.** Build a first house, then something that changes the top five: the dot should appear on the button and clear when the sheet opens. It can lag a daily danger by up to 4 days (ruling 522).

## Deferred
- **Ruling 586: an Estate needs a trick the advice never says.** The grand balance run reaches an Estate only with a workshop in the open with its own store that Fetches the input, when no room is left beside the store that holds it. Without it: a Villa in month 92 and no Estate in ten years. Either teach it (a tip or a step) or make the advice say it.
- **`setPaused` rebuilds the chunk index and the roadless plots.** Pausing and unpausing costs a rebuild it does not need. A separate counter for the layers would avoid it.
- **Zoom 1, Large against Normal, is still 1.27x.** The 1.14x is at zoom 0.5 only.
- **Home progress costs about 25 ms a frame at 1,720 homes, zoom 0.5, in steady draw.** It is the dearest layer.
- **The draw-cost figures were measured by hand,** with the screenshot tool's budget and the contract's runs. No suite assertion pins them, so a slow change could creep in.
- **The Route ghost does not draw bridge tiles differently.** The bar counts the bridges, but the preview shows them as road.
- **The Layers picker does not name the layers still to come.** A layer that is not unlocked yet is simply absent (ruling 541), so a player cannot know Goods supply or Workers exists before Town.
- **Farm-area leftovers are not marked.** When an area has too few fertile tiles for one more farm, those tiles are left out without a mark; the count says skipped ground the sim refuses, not ground that was merely too small.
- **Ruling 600 (a warned raid weighs 3 per tower short)** was the controller's call. Confirm in play that the first warned raid ranking first feels right, and that a cheap booth fix showing second is not annoying.

## Version 5.1 "A living world" (from the plan's intro)
Planned later, not started: trade routes, goals after Capital, city events, seasons and light, and sound polish. Not chosen for 5.0: moving buildings and rotating the view.

## Process lessons
- **One branch, sequential tasks, a ledger outside the repo, and a review after each task** kept the run lean again. Reviewer minors went into the next task's first commit.
- **Give each task a range of ruling numbers up front** (501-509 from the plan, then 510 on in tens). It stopped the renumbering that Stage 4.7 needed.
- **Run the balance runs with each new feature before the review.** The grand district run found the Estate trick (ruling 586) only because the advice was followed to the letter.
