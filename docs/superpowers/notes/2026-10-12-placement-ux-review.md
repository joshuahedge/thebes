# Placement UX review: placing, drawing and reading the land on a phone

Reviewed 12 Oct 2026 on main (03de552, 1275 tests) after Josh played on his phone. He gave seven points. This note checks each one against the code and the spec (4.4, 4.5, 4.10, 6.3-6.6), and builds on the mobile UX review and its rulings 163-177. It proposes rulings P1-P16 (numbered P, not 178 on, because the Stage 4 review has already proposed 178-224) and a task list.

## How it was checked

- 25 screenshots in headless Edge at 390×844, 375×667 (100% and 150% text), 844×390 and 1280×800, driven through `window.__thebes` with the real dock cards, the confirm bar's ✓ and the placement API.
- Folder: `C:\Users\joshed\AppData\Local\Temp\claude\C--Users-joshed\5b65ba77-073a-47cc-9bb5-151599212ef5\scratchpad\place\` (temporary; written below as `place\`). New city = seed 7. Sample city = seed 11 with `sample=1`. The scene scripts are in `place\js\`, run with `place\run.ps1`.
- Code read: `src/ui/placement.js`, `confirmBar.js`, `modes.js`, `gestures.js`, `input.js`, `createUI.js` (pick, confirm, afterCommand, actions), `goalsList.js`, `tips.js`, `celebrate.js`, `overlayUi.js`, `corners.js`, `src/render/overlays.js` (drawGhost, problemMarkers), `src/sim/commands.js` (checkTiles, canPlace, placementWarnings, previewRoad), `src/sim/alerts.js`, `labour.js`, `economy.js`, `src/data/ui.js`, `buildings.js`.

## 1. The short version

1. **Fertile land is never named on the map.** It is the brown loam; the bright green grass beside it is meadow, which does nothing. No overlay shows it, and a farm's ghost often lands on sand. **Do:** a Ground overlay, turned on by picking a farm, and the ghost lands on fertile land.
2. **Roads and plots need two taps, and a one-finger drag pans.** Only a mouse can drag a road. **Do:** in a drawing tool, a one-finger drag draws and a tap adds or removes one tile. Two fingers pan.
3. **After ✓ the tool stays on, and the ghost sits on the new building in coral.** **Do:** on touch, ✓ ends the tool. The tray comes back, so the same card is one tap away.
4. **Tips, captions and goal words are cut with "…" and cannot be opened.** **Do:** a tap opens the row in place.
5. **One condition at a time, and road and ground are both hard refusals.** **Do:** show each condition with its own mark and words; let a building that only lacks a road be placed in amber. Not a new "planned" building state yet.
6. **The "needs road" signs are tiny.** A 9 px "!" on plots, a 12 px line in the bar, a 10 px badge on buildings, and nothing at all on plots once placed. **Do:** bigger marks with a road glyph, the tiles where a road would join, and a warning for plots without a road.
7. **There is no Ground (fertility) overlay, and Layers only cycles.** **Do:** add Ground, and make Layers open a picker.

## 2. Findings by point

### 2.1 "Farm needs fertile land, but I'm not told where fertile land is"

**What happens today**
- `place\farm-pick-fresh.png`: a new city, grain farm picked. The ghost lands on sand and says "Needs fertile land". Fertile land is three tiles up-left, but nothing points to it.
- Why: `nearestFit` (placement.js) only accepts a spot where `canPlace` is ok. Every fertile spot fails "Must touch a road" in a new city, so no spot fits within 10 tiles and the ghost stays on the snapped point.
- `place\farm-pick.png`: the sample city. Same cause, worse words: the ghost lands on a building and says "Something is already here".
- `place\farm-desert.png`: the ghost sits on the edge of the loam and says "Needs fertile land". The terrain is drawn feathered (spec 5.2), but a farm needs all four tiles fertile (`checkTiles`). The soft edge hides which tiles count.
- `place\browse-fresh.png`, `place\plot-offroad.png`: the map shows two kinds of land that could be "fertile": bright green meadow tufts and brown loam. The loam is the fertile one. The green one reads as farmland and is decoration.
- No overlay, card, tooltip or tip names fertile land. Goals that ask for a farm aim Show me at the city's focus (`goals.js` showMe target `focus`), not at fertile land; only the gem mine has a terrain target (`rocky`).

**Why it is a problem**
- A rule the player cannot see is a guessing game. Spec 4.4 makes fertile land a core constraint and the spec 6.3 overlay list has nothing for it.

**Proposed change**
- **A Ground overlay** (point 7 below): free fertile tiles in green with two small dots each, free rocky tiles in grey with diagonal hatching, crisp tile edges (no feathering), built tiles left plain. Legend in words: "● Fertile: farms and orchards · ▨ Rocky: mines". While a farm, orchard or mine is being placed, tiles that belong to at least one free spot where the whole footprint fits are drawn at full strength and the rest at half, with the legend line "Bright: room for a farm".
- **Turn it on by picking:** `AUTO_OVERLAY` gains `farm_grain`, `farm_fig`, `farm_barley`, `farm_flax`, `gem_mine` → `'ground'` (and the Stage 4 quarry and monuments when they come).
- **Land the ghost on the right ground:** with P10 (road becomes a "later" condition), `nearestFit` already takes the warned fit, so the ghost lands on fertile land beside the farms. Show me for the food, beer and linen goals and the "Make more jobs" goal aims at the nearest free fertile tile (`showMeTarget` gets a `fertile` target, as `rocky` has).
- **Name it on the card:** terrain buildings' cards and tooltips gain a line "On fertile land" or "On rocky ground".
- Files: `src/render/overlays.js`, `src/ui/overlayUi.js`, `src/ui/text.js`, `src/data/ui.js`, `src/data/goals.js`, `src/ui/goalsList.js`, `src/ui/cards.js`.

### 2.2 "I don't want to tap two places on mobile, I want to either drag or tap individual tiles"

**What happens today**
- `place\road-start-fresh.png`: road picked, one tap made. The bar says "Tap where it ends". Spec 4.5 and 6.4: first tap sets the start, second the end, and the game picks an L.
- `input.js` onDragStart: a drag draws only when `e.type === 'mouse'`. On touch, every one-finger drag in a drawing tool pans (spec 6.6). So a phone can only make roads by two taps.
- `place\road-end.png`: one blocked tile turns the whole L coral with "Something is in the way" and ✓ is disabled. `previewRoad` fails the whole line on the first blocked tile, and the bar does not say which tile.
- Double-tap zooms in every mode (`gestures.js`, 300 ms, 24 px). Zoomed out, two neighbouring tiles are under 24 px apart, so tapping two tiles quickly would zoom instead.

**Why it is a problem**
- Drawing is the main thing a city builder's thumb does. Two taps plus an L that has to be flipped is a desktop habit. Every phone city builder draws roads with a drag.

**Proposed change**
- **One-finger drag draws** in a drawing tool (road, wall, housing plots, demolish) on touch and pen. Two fingers pan and zoom, as they always do. The bar's first line says how: "Drag or tap tiles · two fingers move the map".
  - **Roads and walls follow the finger** tile by tile. When the finger skips tiles, the gap is filled with a four-way step, along the axis it moved most. Dragging back over the last tiles of the stroke takes them off again.
  - **Plots and demolish paint a rectangle** from where the finger went down to where it is.
- **A tap adds one tile**, or takes it off if it is already in the plan. No L, no Flip on touch.
- **Strokes add up** into one plan until ✓ (the bar counts tiles and gold as they grow). Between strokes the player can pan with two fingers and carry on. ✕ clears the whole plan.
- **Double-tap zoom is off while any tool is active**; pinch still zooms.
- **A plan lays what it can.** Blocked tiles are drawn coral with ✕, and the bar says "8 tiles · 2 skipped: something is in the way". Plots already skip taken tiles (`previewHouses`); roads and walls do the same in a touch plan.
- **Mouse stays as it is**: click start, click end, or drag; Flip stays. The wide layout is unchanged unless the player uses touch on it.
- Sim: tile-list cores (`previewRoadTiles`/`drawRoadTiles`, `previewWallTiles`/`drawWallTiles`, `previewHouseTiles`/`paintHouseTiles`, `previewDemolishTiles`/`demolishTiles`), each one undo entry. Today's rectangle and L functions become thin wrappers, so their tests and the sample city keep working.
- Files: `src/ui/input.js`, `src/ui/gestures.js` (a `doubleTap` switch), `src/ui/placement.js` (`state.plan`), `src/ui/modes.js` and `src/ui/store.js` (plan in `CLEAR_TOOL` and the initial state), `src/ui/createUI.js` (actions), `src/ui/confirmBar.js`, `src/ui/text.js`, `src/sim/commands.js`, `src/sim/defence.js`.

### 2.3 "After placing I go back into the place-something loop with a whacking great UNDO button"

**What happens today**
- `place\after-well-fresh.png`: a well placed with ✓. The game stays in placing. The ghost stays on the tile, now on top of the new well, in coral with "Something is already here". The bar shows a full-size Undo button. The "Well placed · Undo" toast sits over the well.
- `placement.js` confirm keeps the tool for buildings (spec 6.5 "the game stays in placing mode so the player can place repeatedly", written for the mouse) and clears only the line or area for roads and plots. `tests/ui/placement.test.js` pins it: after ✓ the mode is still `placing` and the preview is `bad`.
- The toast floats mid-map because `#toasts` sits above `--dock-tray` while the card's tray is hidden behind the confirm bar (`css/ui.css` lines 162-163).

**Why it is a problem**
- After placing, a player wants to look at the result. Today the first thing they see is an error on their own building and a tool they must ✕ out of. The Undo button is the biggest word in the bar at the moment it is least needed.

**Proposed change**
- **On touch and pen, ✓ ends the tool** (decided by the input type of the ✓ press, spec 6.7). The map goes to Browse and the dock comes back as it was when the card was picked: usually the tray, on the same category, so placing another of the same is one tap on the same card, and something else is one tap too. A service's overlay stays on (its legend has ✕) so the player can see its reach, until it is closed or another tool starts. The camera moves the least that keeps the new building above the tray.
- **Mouse and keyboard keep placing repeatedly** (spec 6.5 unchanged for them).
- **The toast** stays "Well placed · Undo" for 6 s, and sits above the dock that is actually showing (the confirm bar's height while a tool is on, the tray's after).
- **On phones the bar's Undo becomes an icon button**, ↶, 44×44 px, named "Undo" for screen readers, shown only when there is something to undo. Wide keeps the word.
- Files: `src/ui/createUI.js` (confirm: `store.set(cancelTool(...))` after a touch ✓, then keep the building visible), `src/ui/confirmBar.js`, `css/ui.css` (`#toasts` while a tool is on), `src/ui/text.js`.

### 2.4 "Some goals have messages explaining them, but they're too long for the box: tap to expand"

**What happens today**
- `place\tip-long-375.png`: the tip after the first goal reads "Tap the goal line (Goals on a wide screen) to see what comes next…". The part about the gold is cut.
- `place\tip-long150-375.png`: at 150% even less fits.
- `place\caption-why-375.png`: "First Shack" with its why on one line; longer whys are cut (`#cheer .why` is clamped to one line on phones).
- `place\caption-why150-375.png`: at 125% and 150% the whole caption is clamped to two lines, so the why ("Water let a hut grow. Shacks hold 8 people.") is gone completely.
- `place\goal-event150-375.png`: "Make more jobs: build a farm…". The part that says what to build is cut.
- The clamps come from ruling 163 and 170 (`css/ui.css` lines 376-388). Tapping the goal words opens the Goals sheet (full words there). Tips have Got it but no way to read the rest. Captions are not tappable at all (`celebrate.js`: "Nothing to tap"). The full caption text is only in Recent, two taps away.

**Why it is a problem**
- The cut words are the explanation: what to build, why the home grew. A cut with no way to open it reads as broken.

**Proposed change**
- **When the row's words are cut, show "More ▾"** at the end (12 px word plus mark, part of the button). It appears only when the text is really cut: measured after render (`scrollHeight > clientHeight + 1`), again on a text-size change or resize.
- **A tap opens the row in place**, showing the full words. The open row may reach 40% of the screen height at any text size (spec 6.1's limit); longer text scrolls inside it. It eases open over 150 ms (instant under reduced motion).
- **While open:** a caption's timer stops (it gets at least 2 s more once closed); a tip's 20 s auto-close stops; the goal shows its full words, its reward, Show me, "All goals ›" (opens the Goals sheet) and, while the guide runs, Skip guide.
- **It closes** on a second tap ("Less ▴"), Back, Esc, a tap on the map, a sheet opening, or when the row's content changes.
- This changes ruling 170: the goal words open in place; the sheet is behind "All goals ›".
- Captions become buttons (`aria-expanded`), still in the polite live region.
- Files: `src/ui/goalsList.js`, `src/ui/tips.js`, `src/ui/celebrate.js`, `src/ui/createUI.js` (the guidance row: collapse rules, Back and Esc), `src/ui/text.js`, `css/ui.css`.

### 2.5 "If there are two conditions, give me an intermediate state: road and no fertile, amber, and I can place it, it just won't be built or cost resources till the conditions are met"

**What happens today**
- `checkTiles` stops at the first failure and returns one reason. Tiles are checked before the road, so a farm on sand without a road says only "Needs fertile land" (`place\farm-pick-fresh.png`). Move it onto fertile land and it says "Must touch a road" (`place\farm-noroad.png`, `place\farm-noroad-844.png`). Both are the same coral hatching.
- There are three ghost states (spec 6.5): blue ok, amber "won't work yet" (no storage or supply in reach, and housing plots without a road), coral can't. Road is amber for plots and coral for everything else.
- The sim already copes with a building that has no road: labour skips it (`labour.js` line 17), it raises `no_road` (`alerts.js` line 18), and the house sheet explains it. That happens today when a road is demolished. It still pays upkeep (`economy.js`).

**Why it is a problem**
- The player learns the conditions one at a time, and has to satisfy them in the game's order. Josh's intent: see partial validity, and not be forced to satisfy everything at once.

**Options weighed**

| Option | What it is | Meets the need | Cost |
|---|---|---|---|
| A. A "planned" building in the sim | Placed free, drawn as a blueprint, built and paid for by itself on the first day its conditions hold and gold allows | Fully, as Josh worded it | Large. A new building state every system must skip: labour, upkeep, desirability, fire, raids, goals, firsts, score, alerts, reach, walkers, the renderer. The save gains a field. Undo needs a rule for a plan that has since built itself. Gold spent while the player looks away needs a caption. And fertile or rocky ground never appears later, so a plan on sand would wait for ever: only road and gold can ever come true. About 3-4 tasks, high blast radius. |
| B. Plan both in one go (interface only) | The ghost shows each condition; a building that lacks only a road can be pinned while the player draws the road; one ✓ lays both | Partly: one action, both conditions | Medium. One compound undo entry. No sim state. |
| C. Plans that live in the interface | Free blueprints saved with the settings, not the city; tap one to build it once it can be | Partly; not built by itself | Medium. Lost on export and import; the sim can build over them. Confusing. |
| **D. Each condition shown, and road becomes "later"** | The ghost and bar show every condition with its own mark and words. A building that fails only the road is placed in amber, as plots already are. Ground and gold still refuse. A building with no road pays no upkeep and counts for no goal until a road touches it. | Mostly: he sees all conditions at once, places the farm first and the road after (or the other way). It costs its gold when placed, not when the road arrives. | Small. One option on `canPlace` and `place` (the player's commands only, so the sample city and balance runs stay strict), one line in the upkeep loop, one rule in goal counting. The rest is interface. |

**Recommendation: D, with B's "show each condition" built in.** It meets the intent at low cost and matches the genre (Caesar III and Pharaoh let you place a building without road access and flag it). It is honest that there are only two conditions that can ever come true later (road and gold), and that terrain cannot. If, after playing it, Josh still wants placement to be free until the road arrives, A is the follow-up; D's condition model is the base A would need anyway.

**Proposed change (D)**
- **Conditions, each with a mark and words.** Per building type: Ground ("Free ground", or "Fertile land" / "Rocky ground" for terrain buildings, with a count when partly met: "Fertile land: 2 of 4 tiles"), Road (needsRoad buildings and plots), Works (a store in reach for producers, supply for a bazaar), Gold (shown only when short: "60 gold, you have 40").
  - ✓ teal "met", ! amber "later" (it can be placed; it will not work until this is met), ✕ coral "can't" (it cannot be placed).
  - Ghost state is the worst condition. Words are never colour alone: the mark, and coral hatching for "can't".
- **The confirm bar** gets a row of condition chips under the title and cost, full width (under the buttons too), text 14 px × the text scale, chips at least 24 px tall, with short words ("✓ Fertile land", "! No road yet", "! No granary near", "✕ Not enough gold"). The row is always reserved for a building tool, so the bar does not jump as the ghost moves (the existing keep-tallest rule).
- **On the map, each footprint tile shows its own state**: on the loam's edge, the two fertile tiles are blue and the two sand tiles coral with ✕.
- **Road later:** `canPlace(world, type, x, y, { roadLater: true })` turns `needs_road` into a warning for every needsRoad building. Only the interface passes it. A farm placed so says "Grain farm placed · needs a road" in its toast.
- **A road-less building** pays no upkeep or wages (it does nothing), and "Build a …" goals count only buildings that touch a road.
- Files: `src/sim/commands.js` (`conditionsFor`, the option), `src/sim/economy.js`, `src/sim/goals.js`, `src/ui/placement.js`, `src/ui/confirmBar.js`, `src/render/overlays.js` (`drawGhost`), `src/ui/text.js`, `css/ui.css`.

### 2.6 "Very hard to see the little 'needs road' thing"

**What happens today**
- `place\plot-offroad.png` and `place\zoom-plot-offroad.png`: plots off the road show a thin amber outline and a 9 art px "!" per plot (`drawGhost`, `size: 9`). On the brown loam it nearly vanishes. The bar's "No road touches it yet" is 12 px.
- `place\zoom-farm-bad.png`: the coral ✕ is lost in the hatching.
- `place\plot-offroad-placed.png`: once placed, road-less plots are pale patches with no mark at all (`alertsFor` skips houses; `problemMarkers` marks houses only when counting down). The tip that shows is "Press Play so people can move in", which is wrong: they would stay empty in play too.
- `place\noroad-marker.png`: a well whose road was removed shows a 10 px red "!" badge (radius 5 art px), the same as every other problem. It says nothing about roads until tapped.
- Nothing on the map says where a road would have to go.

**Why it is a problem**
- The road is the condition players miss most, and every sign of it is the smallest thing on screen.

**Proposed change**
- **Ghost marks at a fixed screen size**: a 20 px badge (white halo 2 px) with a 13 px bold mark at the footprint's centre at any zoom (radius `max(5, 10 / zoom)` art px).
- **Where a road would join**: when Road is "later", the free tiles beside the footprint get a dashed amber outline and the road mark "═" (the Roads category icon). The bar chip reads "! No road yet: draw one on a marked tile".
- **Problem markers** at least 20 px across at any zoom, with the mark by cause: "═" for no road, "!" for the rest (colour unchanged). `problemMarkers` gets the cause from the alert code.
- **Road-less plots** get a dashed amber outline on their tile, and one warning in the alert list and the Map badge: "6 plots have no road", with View (pans to the nearest).
- **The plots toast** says "6 plots placed · no road yet", and the Press Play tip does not fire when none of the plots touches a road.
- Files: `src/render/overlays.js`, `src/render/renderer.js`, `src/sim/alerts.js` (one aggregate `plots_no_road`), `src/ui/sheets.js` (its fix: the road tool), `src/ui/createUI.js` (afterCommand), `src/ui/text.js`.

### 2.7 "Fertility overlay is not present in overlays"

**What happens today**
- `OVERLAYS` (`src/render/overlays.js` line 21) has eight: water, food, religion, goods, entertainment, desirability, fire, housing. No terrain overlay.
- `place\overlay-water.png`: Layers cycles (`legend.cycle`). Reaching the last overlay takes eight taps; turning one off takes the legend's ✕ or cycling past the end.
- On the wide layout the corner buttons are hidden (`css/ui.css` line 155), so the only way to choose an overlay there is the O key. A touch tablet in the wide layout cannot pick one at all.

**Proposed change**
- **Ground** becomes the ninth overlay (2.1).
- **Layers opens a picker** on every layout: a small popover above the Layers corner button (phones) or under the minimap in the side panel (wide, a new Layers button there). Nine labelled toggle buttons plus Off, three columns at 100% text and two at 125%+, each 44 px tall. One tap picks and closes; tapping the current one turns it off. Back, Esc and a tap outside close it. It is a popover, not a sheet, so it does not cancel a tool. O still cycles.
- Files: `src/render/overlays.js`, `src/ui/overlayUi.js`, a new `src/ui/layersPicker.js`, `src/ui/corners.js`, `src/ui/sidePanel.js`, `src/ui/createUI.js`, `src/ui/backstack.js`, `css/ui.css`, `src/ui/text.js`.

## 3. Proposed rulings

- **P1.** A ninth overlay, **Ground**, shows free fertile land (green with dots) and free rocky ground (grey, hatched), with crisp tile edges and a legend in words. Picking a farm, orchard or gem mine turns it on, and while placing one the tiles with room for a whole footprint are brighter. — Cost if wrong: one more overlay to pass when cycling with O.
- **P2.** The Layers button opens a picker of all overlays plus Off on every layout (a corner popover on phones, a new button under the minimap on wide). O still cycles. — Cost if wrong: switching off from the picker is two taps (the legend's ✕ is still one).
- **P3.** On touch and pen, a one-finger drag in a drawing tool draws instead of panning; two fingers pan and zoom. Roads and walls follow the finger tile by tile; plots and demolish paint the rectangle from start to finger. A tap adds or removes one tile. Strokes add up into one plan until ✓. The mouse keeps click-start-click-end, drag and Flip. — Cost if wrong: one-finger panning is not available while a drawing tool is open.
- **P4.** Double-tap zoom is off while any tool is active. — Cost if wrong: zooming while placing needs a pinch.
- **P5.** A touch plan lays every tile it can and skips blocked ones, marking them coral with ✕ and counting them in the bar. — Cost if wrong: a road can have a gap where something stood.
- **P6.** After ✓ with touch or pen the tool ends: the map is in Browse, the dock returns as it was when the card was picked, a service's overlay stays on until closed, and the Undo toast stays 6 s above the dock that is showing. Mouse and keyboard keep placing repeatedly. — Cost if wrong: placing several of the same building takes one extra tap each (the card).
- **P7.** On phones the confirm bar's Undo is an icon button (↶, named Undo), shown only when there is something to undo. — Cost if wrong: Undo is less obvious in the bar; the toast keeps the word.
- **P8.** A cut goal, tip or caption shows "More ▾"; a tap opens it in place up to 40% of the screen height (scrolling inside beyond), stops its timer, and closes on a second tap, Back, Esc, a map tap, a sheet opening or a change of content. The open goal holds its reward, Show me, "All goals ›" and Skip guide. This replaces ruling 170's "the words open the Goals sheet". — Cost if wrong: the Goals sheet is two taps from the strip, not one.
- **P9.** The placing preview checks each condition on its own (ground or terrain, road, storage or supply, gold) and shows each as a chip in the confirm bar with a mark and words (✓ met, ! later, ✕ can't). Each footprint tile shows its own state on the map. — Cost if wrong: the bar is one row taller for buildings.
- **P10.** A building that fails only the road can be placed by the player, in amber ("won't work until a road touches it"), as housing plots already can; the ghost marks the free tiles where a road would join it. Fertile or rocky ground and gold still refuse. The sim's default and the sample city stay strict. — Cost if wrong: a player can spend gold on a building that does nothing until a road comes (Undo refunds it this month).
- **P11.** A building with no road beside it pays no upkeep and no wages, and does not count for "Build a …" goals until a road touches it. — Cost if wrong: an unconnected building costs nothing to keep (it already does nothing).
- **P12.** No "planned" building state for now (placed free, built and paid for by itself later). Revisit after Josh has played P10. — Cost if wrong: a farm's gold is spent when it is placed, not when its road arrives.
- **P13.** Ghost marks and problem markers are at least 20 px across at any zoom; a no-road problem shows the road mark "═", others "!". Road-less housing plots get a dashed amber outline and one warning in the list ("6 plots have no road", View). — Cost if wrong: a busier map while many plots lack a road.
- **P14.** Plots painted with no road never bring the Press Play tip; their toast says "· no road yet". — Cost if wrong: none.
- **P15.** Picking a farm, orchard or mine lands its ghost on the nearest free ground of its kind (a fit with only "later" conditions counts), and Show me for the farm goals aims at the nearest free fertile land. Terrain buildings' cards say "On fertile land" or "On rocky ground". — Cost if wrong: the ghost may land a few tiles further from the town than today.
- **P16.** Spec 4.4, 4.5, 6.3, 6.4, 6.5, 6.6 and 6.8 are updated to match P1-P15, and the mobile budget gains an "expanded" scene (an open tip, limit 40% at every size and text size) and a "farm" placing scene. — Cost if wrong: none.

## 4. Implementation tasks, in order

Each task keeps the wide layout as it is, except where a ruling says otherwise (P2's panel button, P6 and P3 only for touch input), and keeps `tests/ui/mobileBudget.test.js` passing. Tests named here pin today's behaviour and need updating, not deleting.

1. **Leave the tool after a touch ✓** (P6, P7). Smallest change with the biggest felt effect.
   - Files: `src/ui/createUI.js` (confirm: after a touch or pen ✓, `cancelTool`, then `cameraControl.keepVisible` above the tray), `src/ui/confirmBar.js` (icon Undo on phones, hidden with nothing to undo), `css/ui.css` (`#toasts` above the confirm bar while a tool is on), `src/ui/text.js`.
   - Tests: `tests/ui/placement.test.js` ("places it on confirm": mode stays `placing`, preview `bad`; this stays true at the placement level, so add the leave rule in `tests/ui/createUI.test.js`), `tests/ui/confirmBar.test.js` ("offers … Undo when there is history"), `tests/ui/a11y.test.js`, `tests/ui/toasts.test.js`, `tests/ui/tips.test.js` (servicePlaced still fires), `tests/ui/guide.test.js`.
   - Model: sonnet.
2. **Tap to expand the guidance row** (P8).
   - Files: `src/ui/goalsList.js`, `src/ui/tips.js`, `src/ui/celebrate.js`, `src/ui/createUI.js` (collapse rules, Back and Esc), `src/ui/backstack.js`, `src/ui/text.js`, `css/ui.css`, `src/dev/scenes.js` (`expanded` scene), `tools/shots.ps1`.
   - Tests: `tests/ui/goalsList.test.js` and `tests/ui/goalsV2.test.js` (the words open the Goals sheet, ruling 170), `tests/ui/celebrate.test.js` (nothing to tap, times, hold), `tests/ui/tips.test.js` (auto-close), `tests/ui/keyboard.test.js` (Esc), `tests/ui/a11y.test.js`, `tests/ui/mobileBudget.test.js` (new scene and its 40% check).
   - Model: sonnet.
3. **Ground overlay and the Layers picker** (P1, P2).
   - Files: `src/render/overlays.js` (`OVERLAYS`, `OVERLAY_HUE.ground`, `drawGround`, the "room for a footprint" pass, memoised on `roadVersion` and the buildings), `src/ui/overlayUi.js`, new `src/ui/layersPicker.js`, `src/ui/corners.js`, `src/ui/sidePanel.js`, `src/ui/createUI.js`, `src/data/ui.js` (`AUTO_OVERLAY`), `src/ui/text.js`, `css/ui.css`.
   - Tests: `tests/render/overlays.test.js` (`OVERLAYS.length` is 8), `tests/ui/overlayUi.test.js` ("cycles through all eight"), `tests/ui/overlaysStage2.test.js`, `tests/stage3/ui/fireOverlay.test.js`, `tests/ui/cornerWords.test.js` (Layers press cycles), `tests/ui/panels.test.js`, `tests/ui/placement.test.js` ("the matching overlay").
   - Model: sonnet.
4. **Conditions in the sim, and road later** (P9 sim side, P10, P11).
   - Files: `src/sim/commands.js` (`conditionsFor`; `canPlace` and `place` take `{ roadLater }`; `canPlace`'s single reason is unchanged by default), `src/sim/economy.js` (no upkeep or wages without a road), `src/sim/goals.js` (building goals count road-touching buildings).
   - Tests: `tests/sim/commands.test.js` (line 25: a well off the road still refuses by default; add the option), `tests/sim/areaCommands.test.js`, `tests/sim/economyUnlocks.test.js`, `tests/sim/economy.test.js`, `tests/sim/goals.test.js`, `tests/sim/goalsV2.test.js`, `tests/sim/longrun.test.js` and `tests/sim/capital.test.js` (must not move: the sample city stays strict).
   - Model: opus (sim semantics and balance).
5. **Conditions in the ghost and the bar; landing on the right ground** (P9 interface side, P10's road tiles, P15).
   - Files: `src/ui/placement.js` (preview carries conditions, per-tile states and road-join tiles; `nearestFit` with `roadLater`), `src/render/overlays.js` (`drawGhost` per tile, fixed-size badge, dashed road-join tiles), `src/render/renderer.js`, `src/ui/confirmBar.js` (chip row, held height), `src/ui/goalsList.js` (`fertile` target), `src/data/goals.js`, `src/ui/cards.js`, `src/ui/text.js`, `css/ui.css`.
   - Tests: `tests/ui/placement.test.js` (line 31: reason text), `tests/ui/confirmBar.test.js` (line 30: `.reason` text), `tests/ui/placementFit.test.js` (nearest fit; the bar keeps one height as the preview flips), `tests/render/overlays.test.js` and `tests/stage3/ui/fireOverlay.test.js` (`drawGhost`), `tests/ui/goalsList.test.js` (`showMeTarget`), `tests/ui/cards.test.js`, `tests/ui/text.test.js` (the reasons and warnings lists).
   - Model: sonnet, with the condition model from task 4 as its contract.
6. **Road signs that can be seen** (P13, P14).
   - Files: `src/render/overlays.js` (`problemMarkers`: size, cause, plot outlines), `src/sim/alerts.js` (`plots_no_road`), `src/ui/sheets.js` (its fix), `src/ui/alerts.js` (warning tier), `src/ui/createUI.js` (afterCommand: the tip and the toast words), `src/ui/text.js`.
   - Tests: `tests/render/problemMarkers.test.js`, `tests/stage3/ui/fireOverlay.test.js` (`problemMarkers`), `tests/ui/alerts.test.js`, `tests/ui/minimap.test.js` (badge count), `tests/ui/tips.test.js` (plotsPaused), `tests/sim/events.test.js` if it counts alerts.
   - Model: sonnet.
7. **Touch drawing** (P3, P4, P5). The largest; it uses task 1's leave rule and task 5's per-tile ghost states.
   - Files: `src/ui/input.js` (a touch drag in a drawing tool is a draw), `src/ui/gestures.js` (`doubleTap` switch), `src/ui/placement.js` (`state.plan`, strokes, tap toggles, backtracking), `src/ui/modes.js`, `src/ui/store.js`, `src/ui/createUI.js`, `src/ui/confirmBar.js` (idle words, no Flip for a touch plan, skipped count), `src/ui/text.js`, `src/sim/commands.js` and `src/sim/defence.js` (tile-list cores; old functions as wrappers).
   - Tests: `tests/ui/input.test.js` ("pans the camera on a one-finger drag" stays for Browse; add the drawing case), `tests/ui/gestures.test.js` (double tap), `tests/ui/placement.test.js` ("draws a road from two taps" stays for the mouse; add touch), `tests/sim/commands.test.js`, `tests/sim/areaCommands.test.js`, `tests/sim/undo.test.js`, the Stage 3 wall tests (`tests/stage3/`, `drawWall`).
   - Model: opus (gestures, plan model and sim cores together).
8. **Spec, scenes and screenshots** (P16).
   - Files: `docs/superpowers/specs/2026-10-09-thebes-design.md` (4.4 Ground overlay; 4.5 drawing on touch; 6.3 overlays and the picker, the guidance row's More; 6.4 the Placing row's exit after ✓ on touch, Drawing's taps and drags; 6.5 validity by condition and road later; 6.6 one-finger drag in drawing tools, double-tap off in tools; 6.8), `src/dev/scenes.js` (`farm` scene), `tools/shots.ps1`, `docs/superpowers/notes/screenshots/` (before and after for this note's shots at 390×844 and 375×667 at 150%), `handoff-2026-10-11/rulings-so-far.md` (P1-P16, renumbered after the Stage 4 rulings once those are recorded).
   - Model: sonnet.

Order: 1 and 2 first (small, independent, most felt), then 3, then 4, then 5 (needs 4), then 6, then 7 (needs 1 and 5), then 8.

## 5. Things to check on a real phone

- Whether one-finger drawing with two-finger panning feels natural, or whether panning a long road needs an edge scroll (not proposed; strokes add up instead).
- Whether a 20 px badge is big enough on the loam in sunlight.
- Whether the green Ground tint reads clearly against the green meadow next to it (the overlay shows only fertile land, so meadow stays plain while it is on).
