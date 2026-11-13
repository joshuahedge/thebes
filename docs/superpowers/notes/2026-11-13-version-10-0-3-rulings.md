# Version 10.0.3 "Shorter road cards": rulings 2460-2469 (2460 to 2468 used)

Josh measured 10.0.2 on a 390x844 phone: the Roads tray covered about 30% of the screen, the other trays about 24%. The cause was two cards: Road's "Bridges over water: 25 gold a tile" and Crossing's "Cross water: bridges up to 4 tiles, ferries 5 to 12" wrap to three or four lines and make the whole tray tall; every other card shows only a name and a cost. He approved the design: on a portrait phone those two cards show a name and a cost, and the water words stay reachable. Portrait phone only; `WORLD_VERSION` stays 12; nothing in the sim or the renderer changed.

## Measured first, then after

Shots: `docs/superpowers/notes/screenshots/raw/v1003/v1003-<category>-<before|after>-<WxH>-t<text>.png` (gitignored; categories roads, homes, food, services). Before = an extracted copy of e52e470 (10.0.2), after = this branch; the dev `early` scene, Gentle motion, each tab's tray open. Measured the way 10.0.2 measured (ruling 2446): the share of the screen's AREA under the union of the dock with its tray and the four rail buttons, then, in brackets, the HEIGHT of the stack from the top of the dock to the foot. Dock = the dock box in px (tray inside it).

| Roads tray | before 10.0.2 | after 10.0.3 | Homes (unchanged) | tallest other tray (unchanged) |
|---|---|---|---|---|
| 390x844 t100 | 30.1% (27.7%), dock 233 px | 23.9% (21.5%), dock 181 px | 23.7% (21.2%), dock 179 px | Food 25.1% (22.7%), dock 192 px |
| 390x844 t150 | 43.1% (40.7%), dock 344 px | 31.3% (28.8%), dock 243 px | 35.1% (32.6%), dock 275 px | Homes 35.1% |
| 375x667 t100 | 41.0% (37.5%), dock 250 px | 33.4% (29.7%), dock 198 px | 34.1% (30.2%), dock 202 px | Homes 34.1% |
| 375x667 t150 | 55.4% (51.5%), dock 344 px | 40.4% (36.5%), dock 243 px | 44.9% (41.2%), dock 275 px | Homes 44.9% |

Services (23.7 / 30.7 / 27.9 / 36.2%) and Food (25.1 / 32.5 / 34.3 / 44.3%) are the same before and after. Result: the Roads tray is now within 0.2 points of Homes at 390x844 t100 (2 px taller) and 0.7 to 4.5 points SHORTER than Homes at the other three sizes. The target, "match the tallest other tray within 1 point", is met at every size from below (at 390x844 t100 Roads is 1.2 points under Food, the tallest).

## Rulings

**2460 (the card face).** On a portrait phone (`body[data-layout="portrait"]`) the `.terrain` line of the Road and Crossing cards is clipped to 1 px (the `.sr-only` recipe, in the block at the end of css/v93.css, so index.html's stylesheet list is unchanged). The card draws a name and a cost, like every other card. Desktop, tablet and landscape phone keep the line exactly as in 10.0.2 (tests/v1003/roads.test.js). — Cost if wrong: two cards without a line a player may have read.

**2461 (title and accessible name).** The line is clipped, not removed, so the card's accessible name (name, cost, line) is as in 10.0.2. The card button also gets a `title` for Road and Crossing: the name and the full tooltip text that was on the line (`terrainTitleOf`: for Road "A road crosses water on a bridge: 25 gold a tile, straight across at most 4 tiles of water, with land at both ends", for Crossing the long `FERRY_TEXT.cardTitle`), so a hover or a long press on the card carries it. The line's own title is unchanged. — Cost if wrong: a doubled tooltip on a laptop (the card's and the line's).

**2462 (the placing panel).** Road: ruling 350's note ("Water: bridge up to 4 tiles (25 a tile), ferry 5 to 12", or "Water: a bridge, 25 gold a tile" on a map with no river) rides on the cost line (`p.note`), and 10.0.2's compact panel keeps the cost line folded, so nothing was needed; a test now pins it at 390x844 and 375x667 at 150% text. Crossing: the panel did NOT say the ranges (with crossings shown it said "Tap a crossing, then ✓", with none near "No water near your roads..."; `p.note` is empty in both). `confirmBar.js` now puts `FERRY_TEXT.note` ("Bridges up to 4 tiles of water, ferries 5 to 12", the existing string) on the cost line on a portrait phone while the Crossing tool has no crossing picked and no line drawn. A crossing picked has its own preview words and the bridge or ferry named. No new strings. The laptop's panel is unchanged. — Cost if wrong: one more phrase on the cost line while a crossing is not yet picked.

**2463 (coverage).** See the table above. tests/v1003/roads.test.js holds, at the four sizes: Roads dock and tray no taller than Homes by more than 2 px (and not more than 40 px shorter, so a regression to a hidden tray is caught).

**2464 (pins that moved).**
- `tests/v1002/coverage.test.js` (2446): the tallest tray at 390x844 t100 was allowed 31% for the Roads outlier; now it is Food's 25.1%, so the bound is 25.5%.
- The release pins shift one place for the new entry, as in 10.0.1 and 10.0.2: stage46 ux, stage47 final, v50 docs, v60 docs, v70 docs, v71 docs, v711 docs, v80 g (integration) and u, v81 i, v82 i and m, v821 f, v83 docs, v84 docs, v91 docs. The 10.0.3 entry has a Fixed note because the first-entry test wants both lists.
- The full suite (5746 tests) had two failures: v80 g's "what's new" index (fixed above, passes) and the v100 w0 stress-city frame budget (p95 41 ms under load; passes alone, outside this change).
- Nothing else moved: the tests for the cards (`tests/ui/cards.test.js`, `tests/stage46/map/bridges.test.js`, `tests/v71/f/ui.test.js`) find the line in the page as before.

**2465 (exact equality was not the aim).** The brief said the Roads tray should equal the Homes tray within 2 px at all four sizes. It cannot be exact without padding: a tray sizes to its cards, and a house card's price wraps at 150% text ("30 gold per plot") where Road's ("2 gold per tile") does not, so Roads is 32 px SHORTER at 150% (dock 243 against 275) and 4 px shorter at 375x667 t100. The test says what the design needs: Roads is never taller than Homes. Padding Roads up to Homes would put the empty space back.

**2466 (tests).** `tests/v1003/` (`all.js`, imported from tests/all.js under `// Version 10.0.3`): `roads.test.js` has the tray-height test (four sizes), the card-face tests (no drawn line and a title on the phone, as tall as the others; the line drawn on a laptop, a tablet and a phone held sideways, with the laptop's cost line unchanged) and the placing-panel tests (Road's bridge note at two sizes, Crossing's ranges with no water and with crossings shown near a road).

**2467 (docs).** `src/data/releases.js`: a 10.0.3 entry, build `live`, and 10.0.2's build is `e52e470`. `APP_VERSION` is `10.0.3`. README's current-build paragraph and Part 34 of the handoff rulings. `sw-files.js` and index.html's preload block regenerated by `tools/sw-files.ps1`.

**2468 (known, left).** The key badge on a card (fine pointer only, a mouse or keyboard) now sits over the end of the Road and Crossing cost text ("160 gold a fer...") in the narrow phone shots, because the card is shorter; the Homes and Food cards have the same overlap on their prices, as in 10.0.2, and a touch phone does not draw the badge.

**2469 (Josh: the key badges on a desktop only).** Josh asked for the numbers to be hidden on a phone and shown only on a desktop. `css/ui.css` hides `.key-badge` wherever the layout is not `wide` (portrait and compact, so a phone either way up and a small tablet), even with a fine pointer; the keys themselves still work there and the tooltips still name them. This also settles 2468 on a phone: no badge sits over a card's price there. Test: `tests/v1003/badges.test.js` (none shown at 390x844 and 844x390, the tab badges shown at 1280x800).

2470 is the next free number.
