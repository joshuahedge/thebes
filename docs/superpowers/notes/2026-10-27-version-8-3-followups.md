# Version 8.3 follow-ups

Carried forward from the three tracks, their reviews and the fix waves (27 Oct 2026). Nothing below blocks the merge. The design is `specs/2026-10-27-thebes-version-8-3-lines-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 25).

## What shipped
- **The road crosses water by itself (Track X).** A road stroke lays a bridge over 1 to 4 tiles of water and a ferry over 5 to 12, as one price and one Undo; a landing that would not work is refused with the reason and a Show me. The Ferry card is now the Crossing card, listing bridges and ferries together. A road already at the bank becomes the ferry's landing (ruling 1406). One crossings tip a map (ruling 1450).
- **Keep stocked, a chosen store and Supply lines (Track K).** Fetch is Keep stocked everywhere, the delivery switches are Takes in, an order can name the store it draws from (picked on the map, or Nearest), and a chosen store never falls back by itself: the line goes amber and waits. Supply lines is a new map layer; City advice and the bazaar's food alert point at Keep stocked.
- **Crews at any distance and the workers' camp (Track C).** A builders' guild's crew works any site its roads reach: full speed within 12 road tiles, 10% less for each further 12, never below 50%. A workers' camp (10% of the site's founding price, not undoable) puts every crew there at full speed. The site sheet says how each slowed crew is doing and what to keep stocked.
- **No balance number moved, no world-version bump.** Old saves load as they were (rulings 1380 and 1388).

## For Josh to check on a real phone
Nothing in 8.3 was tried on a real device; every screen was read in headless Edge at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text.
- **Drag a road across a wide river.** Start on one bank and drag straight over 5 to 12 tiles of water to the far bank: the bar should name the ferry, tint the water, and show the price with the ferrymen's bill; lift your finger in the middle of the river and see what the bar says the tick will lay. Try water over 12 tiles for the refusal and its Show me.
- **A road already at the bank, dragged on as a ferry.** Take a road that ends at the water and drag from its last tile across: the last road tile should become the landing, the bar should say so, and Undo should put it back.
- **Pick a source on a phone.** Open a store, turn on Keep stocked for a good, tap "from" and choose a store on the map or from the bar's buttons; check the framing keeps the store clear of the top rows and the bar, that Cancel and Back return to the store's sheet, and that a dimmed store says why.
- **The Supply lines layer.** Switch it on from Layers: lines between stores, thicker for more carried, dashes moving toward the store they feed, amber and still where a line is stuck. Tap a line to open the store it feeds.
- **A far guild and a camp.** Start a monument far from every guild (more than 12 road tiles), read the site sheet's crew lines, then set up a camp and check the price on the button is what the tap takes and that the confirm says it cannot be undone.

## What was cut or left
- **The camp and the far-guild pace are exercised by no balance run.** Every crew in the balance runs works within 6 tiles, so neither the speeds past 12 tiles nor the camp are in a number; the Stage 4 capital run and the great-work run did not move (the great work is still won on day 7,021 before and after, ruling 1443). 8.4 owns balance.
- **"Colossus" wraps mid-word in the confirm bar at 375x667 and 150% text.** It was so before 8.3 (pre-existing), and no 8.3 change touched it.
- **On a phone, the pick frames only the nearest store when the order's store is far away.** The map taps still pick any store, but a far one may be off the screen when the pick opens.
- **The Layers popover scrolls on a phone held sideways at 150% text.** Supply lines made it 16 choices (ruling 1427); the current choice is scrolled into view, and the last layer is one short scroll away.

## Process lessons
- **Words against the sim stayed the rule that finds most.** The site sheet's keep rows and crew lines now say only what the sim's own fix and speed say, and one stall shows one Show me (rulings 1447 to 1449).
- **A controller's reading of the design's own example settled a ruling.** "10% less for each further 12 tiles" was first read as a step counting once begun; 40 tiles at 80% from Josh's example said it counts once complete (ruling 1431).
- **A wall-clock test can fail late in a long suite and pass alone.** The stage 2 preview's memo-hit timing took 9 ms alone and 21 to 34 ms late in the 8.3 suite; its bound is now 40 ms for 200 hits (ruling 1445).
