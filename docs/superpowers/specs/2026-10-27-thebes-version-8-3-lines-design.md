# Thebes 8.3 "Lines": design (approved by Josh, 27 Oct)

**Approved 27 Oct, with every recommended answer:**
- The 4- and 12-tile limits stay.
- Today's order controls are taken to have failed on the word "Fetch", the mix with the delivery switches, and the hidden source.
- A chosen source never falls back to Nearest by itself; it waits and asks.
- Far crews lose 10% per 12 road tiles past the first 12, down to 50%, as a first value.
- A workers' camp costs 10% of the monument's founding price, not a flat 100 gold.

The **Josh** marks below are kept as the record of each call.

**Josh's calls (27 Oct):** 8.3 is the first of v9's four releases (`2026-10-27-thebes-v9-roadmap-design.md`). It covers three of his notes:
- Ferries and bridges are unclear.
- Builders' guilds near monuments are not ideal.
- Ordering at granaries and storehouses is hard to find, its controls do not make sense, and choosing the store to fetch from would make supply lines.

8.3 changes no balance numbers. Everything marked **Josh** is a call for him to make.

## 1. The rules for this release

1. **Show how things move.** Crossings, carts and crews become visible, with their reason in words.
2. **One rule, not two.** Distance makes things slower, not impossible, as carts already work.
3. **Nothing new to learn where the old way still works.** The default behaviour is today's, and the new choices are offered, not required.

## 2. One way across water

**Today:**
- **The road tool** lays a bridge over a straight run of up to 4 tiles of water, with land at both ends (`MAP.bridgeMax`). Wider water is refused with "too wide", and Show me opens the Ferry tool.
- **The Ferry tool** (Roads tray) lays two landings across 5 to 12 tiles of water. It shows the best 3 crossings near where you are looking (8.2.1).
- **Why it confuses:** the 4-tile limit is only discovered when the road is refused, and two tools do one job.

**8.3:**
- **The road tool lays both.** While you drag a road across water, the run of water is judged as you go:
  - **1 to 4 tiles, straight, land at both ends:** a bridge, as today.
  - **5 to 12 tiles, straight, land at both ends:** a ferry. The road's last land tile on each bank becomes a ferry landing, and the road carries on from the far landing. The price adds the two landings (80 each), and each landing needs a ferryman, as today.
  - **Wider than 12, or bent:** refused, with the reason.
- **Live words while dragging.** The bar names the crossing, and the run's water tiles are tinted: teal for a bridge, blue for a ferry, coral for "cannot".
  - "Bridge: 3 tiles of water"
  - "Ferry: 7 tiles of water, walkers wait at the bank"
  - "Too wide: 14 tiles (a ferry crosses up to 12)"
  - "A crossing must go straight across"
- **The Ferry card becomes the Crossing card.** It shows the best 3 crossings near where you are looking, each a bridge where the water allows one and a ferry where it does not. 8.2.1's ferry finder is widened to bridge runs; `bridgeSpot` (src/sim/bridges.js) already finds the nearest one. Tapping a crossing lays it with its road stubs, as 8.2.1 does for ferries.
  - Its card line: "Cross water: bridges up to 4 tiles, ferries 5 to 12".
- **The ferries tip** becomes a crossings tip and fires the first time a road meets water. It says the rule in one line.
- **Saves:** standing bridges and ferries are unchanged. A ferry laid by a road is the same two landings the Ferry tool lays, so the sim, carts, walkers and the ferry drawing need no change.

**Josh:** keep the 4 and 12 limits as they are? **Recommended: yes.** The limits make rivers matter. What was wrong was that nobody could see them.

## 3. Keep stocked, and supply lines

**Today:**
- **What an order does:** a granary or storehouse can be set to Fetch a good up to an amount. One cart, run by the store's own workers, brings 20 a trip at 8 road tiles a day, from the nearest other store that can spare some.
- **The sheet's two controls:** the controls sit in a "Fetch goods" group on the store's sheet. A storehouse's sheet also has on/off switches for the goods producers may deliver to it.
- **Why it confuses:**
  - Players don't find it.
  - Two different ideas, what may be *delivered* here and what is *fetched* here, sit side by side in the same kind of switch.
  - The source is chosen invisibly.
  - Nothing on the map shows that goods move between stores.

**8.3:**
- **Words.** "Fetch" becomes **Keep stocked**. The sheet has two clearly separate parts:
  - **Takes in:** the storehouse's existing switches for what producers may deliver here.
  - **Keeps stocked:** what carts bring here from other stores.
- **One row per order, readable left to right:** [the good's icon] **Keep stocked** [on/off] · **up to** [− 100 +] · **from** [Nearest granary, 34 tiles ▸]. The live line under it stays, for example "40 on the way, back in 3 days".
- **Choose the source (the supply line).** Tapping **from** opens a pick on the map:
  - Every store that holds the good is lit, showing how much it can spare.
  - The road route from each is drawn.
  - Tap one to make it this order's source, or tap **Nearest** to go back to today's rule.
  - A chosen source is kept even when a nearer one appears.
  - If the chosen store has none to spare, the cart waits, and the row says so in amber: "The granary by the farms has no grain to spare. Nearest instead?" Choosing that answer sets the order back to Nearest.
- **The Supply lines layer.** This is a new layer in the Layers picker:
  - **Lines:** every order is drawn as a line along its road route, from source to store.
  - **Movement:** dashes move in the direction the goods go.
  - **Thickness:** set by how much the line carried last month.
  - **Stuck lines:** amber when the order has nothing to fetch.
  - **Tap a line** to open its store's sheet.
  - Carts already drive on the map. The layer shows where they go and why.
- **Finding it:**
  - **The sheet:** Keeps stocked sits near the top of every granary and storehouse sheet, open, not folded away.
  - **A tip:** it fires the first time a city has two stores: "Stores can keep each other stocked. Open a store and pick Keep stocked."
  - **Advice:** it suggests Keep stocked with Show me in two cases:
    - a bazaar's granary runs low while another store far away can spare food (the 8.2.1 `granary_low` cause gains this fix);
    - a monument site lacks stone or bricks while a storehouse elsewhere holds some (see 4).
- **Copies:** Build another already carries a store's orders, and it carries a chosen source too.

**Josh:**
- What felt wrong about today's controls? The design above assumes it was the word "Fetch", the mix with the delivery switches, and the hidden source.
- Should a chosen source fall back to Nearest by itself when it runs dry? **Recommended: no.** It waits and asks, because a player who drew a line meant it.

## 4. Crews at any distance

**Today:**
- **The crew rule:** a builders' guild's crew works only a site within 12 road tiles (`MONUMENT.crewReach`).
- **The materials rule:** a quarry or brickworks delivers only within 12 (`producerReach`), and a site also draws from storehouses within 16 (`supplyReach`).
- **Why it hurts:** a guild, a workshop that lowers the land's appeal, must stand next to the grandest building in the city.

**8.3:**
- **A guild works any site its roads reach,** bridges and ferries included, nearest first, as today.
- **A far crew works more slowly:**
  - 100% within 12 road tiles, as today;
  - then 10% less for each further 12 tiles;
  - never below 50%.

  The site sheet says it plainly: "Crew from the guild 40 road tiles away: works at 80% (the walk)".
- **The workers' camp.** A button on the site's sheet:
  - **What it says:** "Set up a workers' camp: far crews work at full speed", with its price: 10% of the monument's founding price (Josh, 27 Oct).
  - **What it does:** tents are drawn along the site's own edge, so no tiles are taken and no placing is needed. All crews at that site then work at 100%.
  - **When it goes:** the camp clears itself when the monument is finished, and leaves nothing behind. This is historically right, too: the Giza builders had their own village.
- **Materials.** The guild stays the only change. Quarries and brickworks keep their 12-tile delivery. A storehouse within 16 tiles of the site, kept stocked with stone from a far store, already supplies the site, so supply lines (3) are the answer for far quarries. The site sheet's "no stone near" line gains that fix with Show me.
- **Placing a site.** The placing chip "Builders' guild near" becomes "Builders' guild: 40 road tiles (80%)", or "no guild yet".

**Josh:**
- The slowdown, 10% per 12 tiles to a floor of 50%: does that feel right? It is a first value for the balance run.
- Should the camp cost 100 gold, or scale with the monument's size? **Recommended:** scale it, at 10% of the founding price, so a pyramid's camp is worth thinking about.

## 5. What does not change

- No balance numbers: costs, rates and the 4 and 12 limits all stay.
- No new buildings. The camp is a site feature, and the landing is 7.1's.
- Saves load as they are: a `from` field on an order and a `camp` flag on a site, both absent on old saves.

## 6. Testing

- **The road drag:** each water width from 1 to 13 lays a bridge, a ferry or is refused with the right words. The tints and the bar's line match the verdict.
- **The ferry a road lays:** it is the same two landings the Ferry tool laid in 8.2.1, so walkers, carts and the crossing time act the same.
- **The Crossing card:** it shows bridges and ferries, ranked as 8.2.1 ranks ferries.
- **Keep stocked:**
  - a chosen source is used even when a nearer one exists;
  - it waits and says so when it runs dry;
  - Nearest restores today's rule;
  - Build another copies the source.
- **The Supply lines layer:** it draws one line per order along its route, amber when stuck.
- **Crews:**
  - speed by distance at 12, 24, 36, 48 and 100 tiles;
  - a camp lifts every crew to 100%;
  - the camp clears when the site finishes;
  - old saves load.
- **The full suite,** plus the 8.2.1 ferry tests updated to the Crossing card's names.
- **What's new:** an 8.3 entry with the pinned release tests moved down one, as every release does.
