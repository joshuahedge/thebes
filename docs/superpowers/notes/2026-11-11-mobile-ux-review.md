# Mobile UX review: Thebes 9.3 on a phone

Reviewed 11 Nov 2026 on main at 9.3 (22bb649). Josh has noticed "a number of UX issues on mobile" and asked for a review with findings. This is a review only: no source was changed and nothing was committed. It follows the 12 Oct mobile review (`2026-10-12-mobile-ux-review.md`), whose row budget and toast fixes have held up; this pass is about what a first-time phone player meets now, from the title card to the weekly decree.

## How it was checked

- **Browser:** headless Edge 157 over the DevTools protocol, from a scratch copy of `tests/screenshot.ps1` with `mobile = $true`, touch emulation (5 points) and a phone user agent (Android Chrome, or iPhone Safari where iOS matters). A second scratch script drives a whole session (`run.ps1`) with real `Input.dispatchTouchEvent` taps, drags, holds and pinches.
- **Sizes:** 360×780 (small Android), 390×844 (iPhone), 375×667 (iPhone SE) and 844×390 (landscape), all at DPR 2, at 100% and 150% text.
- **Notch and home bar:** `Emulation.setSafeAreaInsetsOverride` gave iPhone insets: 47/34 px top and bottom in portrait, and 47 px left and right with 21 px at the bottom in landscape.
- **Scenes:** the lesson was played by touch through the road and the homes steps. Its later steps came from `devScene('v60-lesson', { step })`. The city work used the seed-11 sample city (`?skipTitle=1&nosw=1&seed=11&sample=1`) and the mobile scenes (`raid`, `raid-fire`, `battle`, `fire`, `early`, `welcome`, `placing`, `sheet`). For the decree, records with a Town split were seeded and the clock set to 2026-W47. The decree's end was forced with `world.decree.ended = true`.
- **Back gesture:** emulated with `history.back()` while each surface was open. The test noted whether the page stayed on the game.
- **Scripts:** in `C:\Users\joshed\AppData\Local\Temp\claude\36c1172e16b397f8\ee1f326e-2736-4349-a934-9901320a4e43\scratchpad\mobrev\` (`screenshot.ps1`, `run.ps1`, `audit.js`, `s*.ps1`).
- **Screenshots:** in `docs/superpowers/notes/screenshots/raw/mobile-review/` (gitignored), 42 shots, each looked at before it is cited here.
- **A harness note:** the local server sometimes failed to serve the fourth page load in one Edge session ("Thebes could not start (a file did not load)"). Runs were split to avoid it. It is the test server, not the game.

Every interactive control on every screen was measured with a small audit (`audit.js`): its box, whether it is off-screen, and whether text is clipped. Almost everything is 44 px or more, so tap size is mostly not the problem. The problems are flow, Back, landscape with a notch, and what 150% text does to the guidance rows.

## Findings

Counts: **3 must, 15 should, 14 could.**

### Must

#### M1. The phone's Back leaves the game from five common surfaces
- **Where:** 390×844, Android. Open any one of these, then use Back:
  - a stat's explainer (gold, mood and the rest);
  - the Speed popup;
  - the build tray (a category tapped, its cards showing);
  - the title's New city card;
  - the lesson's chapter card.
- **What's wrong:** none of these adds a history entry, so Back goes to the previous page. In an installed app it closes the app. The surfaces that do add one (sheets, the Menu, placing, the Layers picker, a selected building) behave: Back closes them one at a time.
- **Why it matters:** on Android, Back is how players close things. Trying to close the tray, or a gold popover, throws the player out of the game. The backstack's own promise ("never leaves the game while something is open") does not hold for these.
- **Fix:** count `stepsOf` for an open explainer, the speed popup, `dock === 'tray'`, and the title's panels and lesson card. Their close paths already exist.
- **Code:** `src/ui/backstack.js:5-6`, `src/ui/titleCard.js:188` (`showPanelNode` pushes nothing), `src/ui/v81/stats.js:181` (the explainer), `src/ui/speed.js:36`, `src/ui/dock.js:81`.
- **Shots:** `13-gold-popover-390x844.png`, `19-build-tray-390x844.png`, `04-new-city-card-150-375x667.png`, `05-lesson-chapter-card-360x780.png`.

#### M2. On an iPhone held sideways the category rail is 47 px too wide and covers the corner buttons and sheets
- **Where:** 844×390 with landscape notch insets (47 px left and right). It shows in calm play, while placing and with a sheet open.
- **What's wrong:** `#rail` has `width: calc(var(--rail-w) + var(--safe-right))` and also `padding-right: var(--safe-right)`, in content-box. It measures 693–844 (151 px) where everything else assumes 103. As a result:
  - the Layers button sits on top of Defence;
  - the placement bar, the drawer and every sheet run under the rail and cut its words ("oads", "omes", "lustry", "fence").
- **Why it matters:** every notched iPhone held sideways gets this, in the layout the checklist asks to try. Defence is half covered during a raid, and taps near the overlap hit the wrong control.
- **Fix:** `box-sizing: border-box` on `#rail`, or drop the `+ var(--safe-right)` from its width.
- **Code:** `css/ui.css:155`.
- **Shots:** `31-landscape-notch-layers-over-defence-844x390.png`, `32-landscape-notch-confirm-over-rail-844x390.png`, `33-landscape-notch-sheet-over-rail-844x390.png`.

#### M3. The lesson's first drag starts at the screen's right edge, in Android's back-gesture zone
- **Where:** 360×780, the lesson's chapter 1. Tap Play, then Show me.
- **What's wrong:**
  - The camera frames the road step so the marked end's centre is 24 px from the right edge (44 px at 390, 46 px at 412), and the words say "Drag west from the marked end of the road".
  - A drag that starts within ~24 px of the right edge and moves left is Android's Back swipe.
  - In emulation the drag worked: 9 tiles, then ✓. On a phone with gesture navigation, the system may take it as Back, which here closes the road tool (it holds a history entry).
- **Why it matters:** this is the first thing the game asks a new player to do. It is on Josh's checklist ("The lesson's road step by touch") and is the likeliest of these to be what he saw.
- **Fix:** frame the step so the marked end is at least 48 px from the edges. Accept the drag from either end of the dashed line, and say "Drag along the dashed line" rather than a compass word.
- **Code:** `src/ui/v60/lesson.js:561` (the step framing), `src/data/lesson.js:67` (the road's `at`), `src/ui/text.js:4583` (`roadDo`).
- **Shots:** `06-lesson-road-end-at-edge-360x780.png`, `11-lesson-road-landscape-844x390.png` (fine sideways).

### Should

#### S1. At 150% the lesson row cuts the instruction itself
- **Where:**
  - At 360×780 with 150% text, the road step's row reads "Drag west / from the…", and its "0 of 9" pill is cut at the right.
  - The homes step reads "Homes · 1 of / 2 / 0 of 6 / Place 6…".
  - At 100% the chapter label wraps the same way ("Homes · 1 of" then "2").
- **What's wrong:** the row is clamped to 3 lines on a phone (4 at 100%). The chapter label, the step count, the progress pill, the words, More and Show me all share those lines. The words lose, so the instruction is behind More.
- **Why it matters:** a player who chose large text cannot read what to do at the moment the game is teaching them.
- **Fix:** drop the chapter label ("Homes · 1 of 2") from the row on phones (the card already says it), and keep the progress pill on its own line or after the words. Never clamp the step's own instruction.
- **Code:** `css/ui.css:1455-1456`, `css/v81-t.css:42`.
- **Shots:** `08-lesson-row-cut-150-360x780.png`, `09-lesson-homes-word-split-150-360x780.png`, `10-lesson-homes-done-and-tick-360x780.png`.

#### S2. The road step never says to tap ✓, and its counter stays at 0 while the road is drawn
- **Where:** 360×780, the lesson's road step, after dragging 9 tiles.
- **What's wrong:**
  - The row still says "0 of 9 Drag west from the marked end of the road."
  - The bar below says "18 gold 9 tiles" with ✓ lit. Nothing says the road is only planned until ✓ is tapped.
- **Why it matters:** a new player who has done what the words said sees "0 of 9" and may drag again or wait.
- **Fix:** while a plan is drawn, have the row say "Tap ✓ to build it" and count the planned tiles (for example "9 of 9 planned").
- **Code:** `src/ui/text.js:4583`, `src/ui/v60/lesson.js` (the count).
- **Shot:** `07-lesson-road-drawn-count-0-360x780.png`.

#### S3. "Done" sits beside ✓ in the housing-plots bar
- **Where:** 360×780, the lesson's homes step (and any plots tool) before a plot is drawn.
- **What's wrong:**
  - The bar shows ↶, Done and ✓ (dimmed).
  - Done means "stop placing homes" (it is Cancel in this state). After a drag the same slot turns into ×.
  - Two finishing words side by side read as the same action, and the slot changes its word.
- **Why it matters:** a player may tap Done to place the plots and lose the tool.
- **Fix:** use × here as in every other tool, or label it "Stop".
- **Code:** `src/ui/confirmBar.js:149`.
- **Shot:** `10-lesson-homes-done-and-tick-360x780.png`.

#### S4. The bar's building name breaks inside a word at 150%
- **Where:** 360×780 at 150%, placing housing plots.
- **What's wrong:** the name reads "Housi / ng / plots", because `.confirm .info .title .name` has `overflow-wrap: anywhere`.
- **Why it matters:** it looks broken, and on the lesson's second step.
- **Fix:** use `overflow-wrap: break-word` (only an over-long single word breaks), and let the name take the line's full width before the buttons.
- **Code:** `css/ui.css:1723`.
- **Shot:** `09-lesson-homes-word-split-150-360x780.png`.

#### S5. On an iPhone, the first screen of the game is the install guide
- **Where:** 375×667, iPhone user agent, no saved city (every first visit, and every visit until a city is saved).
- **What's wrong:**
  - The title card opens with the guide in place of its buttons: Share, Add to Home Screen, Add.
  - The guide ends with "The installed app starts empty. Export first, then Bring rulers from a file in the app."
  - It closes with "Continue". On the title that word otherwise means "continue your saved city", and the Menu uses it too.
  - At 150% the steps scroll inside the card.
- **Why it matters:** before seeing what the game is, a new player is asked to install it. The text speaks of exports and rulers they cannot know, and the button word is ambiguous.
- **Fix:** show the title's buttons first, and offer install the way Android gets it (the Install button and the later ask). Drop the Export line when there is nothing to export, and label the close "Not now" or "Back".
- **Code:** `src/save/installFlow.js:23` (`shouldShowGuide`), `src/boot.js:612`, `src/ui/installUi.js:12`, `src/ui/text.js:4546`, `src/ui/titleCard.js:244-250`.
- **Shots:** `02-title-iphone-install-guide-375x667.png`, `03-title-iphone-install-guide-150-375x667.png`. For comparison, Android's first screen is `01-title-first-visit-390x844.png`.

#### S6. A sheet opened from a scrolled sheet opens part-way down
- **Where:** 390×844. Open the Menu, scroll it to reach Options or How to play (they are below the fold), then tap Options.
- **What's wrong:** `#sheet` keeps the Menu's `scrollTop` (101 px), so Options opens with its Sound heading and switch scrolled away. The same applies between building sheets.
- **Why it matters:** the first rows of Options and of How to play are the ones a player looks for, and the sheet gives no sign that it is scrolled.
- **Fix:** in the `s.sheet !== scrolledFor` block, set `container.scrollTop = 0` when no section is named.
- **Code:** `src/ui/sheets.js:560-565`.
- **Shot:** `28-options-opens-scrolled-390x844.png`.

#### S7. The Map button opens a list, with the map two screens down
- **Where:** 390×844, tap Map.
- **What's wrong:**
  - On a phone the sheet puts "Fix these first" and every alert above the minimap. The map starts at y 1064 in an 844 px screen.
  - Fit the city, at the end, then barely moves the camera: this city is wider than the strip of map above the sheet at the lowest zoom, and the sheet stays open over 60% of the screen.
  - The list's View and Show me are inline text links, unlike the bordered buttons elsewhere.
- **Why it matters:** a button called Map that shows a list reads as broken, and the checklist's "Fit the city from the Minimap's button" looks like a no-op on a phone.
- **Fix:** on phones put the minimap and its buttons first and the alerts under it (the Map badge counts them). Have Fit the city close the sheet before framing.
- **Code:** `src/ui/sheets.js:476` (`phone ? [...alerts, ...map]`), `src/ui/sheets.js:450`.
- **Shots:** `16-minimap-sheet-top-390x844.png`, `17-minimap-sheet-scrolled-390x844.png`.

#### S8. The City summary is about twelve screens tall in a half-screen sheet
- **Where:** 390×844, the score chip, then City page.
- **What's wrong:**
  - The sheet's content is 6057 px in a 506 px sheet, so it opens at the score section with the tabs scrolled out of sight.
  - The same two tabs (Messages, City) appear under two sheet titles: "Messages and advice" from the scroll button, and "City summary" from the score.
- **Why it matters:** a scroll that long on a phone is not read, and the changing title hides that it is one sheet.
- **Fix:** keep the tabs sticky, and give the City tab a short head (score, the weakest part, milestones) with the rest behind section rows that open on tap. Use one sheet title.
- **Code:** `src/ui/sheets.js:542` (`summarySheet`), `src/ui/scoreUi.js`.
- **Shot:** `23-city-summary-390x844.png`.

#### S9. At 150% on a small phone, Defence is off the end of the dock during a raid
- **Where:** 375×667 at 150%, with a raid warning up.
- **What's wrong:** the category row scrolls sideways at 125% and above. It shows Roads to Services, then "Def…" under a fade, and Monuments is off-screen.
- **Why it matters:** the raid tells the player to build towers, and the category they need is the one cut off. A sideways-scrolling row of tabs is easy to miss.
- **Fix:** while a raid is warned or under way, scroll the row so Defence is in view, or wrap the categories onto two rows at 150%.
- **Code:** `css/ui.css:1231-1234`.
- **Shot:** `25-raid-dock-cut-150-375x667.png`.

#### S10. At 150% the goals strip cuts its instruction mid-word
- **Where:** 360×780 at 150%, a new city's guide ("2 of 11").
- **What's wrong:** the strip reads "Place 6 housing plo" with More drawn over the rest.
- **Why it matters:** as with S1, the one line that says what to do is the line that is cut.
- **Fix:** let the strip's words take two full lines before More, or put More on its own line at 150%.
- **Code:** `css/ui.css:424`, `css/ui.css:446`.
- **Shot:** `26-goal-strip-cut-and-toast-150-360x780.png`.

#### S11. The decree chip is 36 px tall
- **Where:** 390×844 and 360×780, during a decree run.
- **What's wrong:** "Year 1 of 6 · Sea Peoples, week 47" is a button with `min-height: 36px`. It is the way back to the decree's sheet. It also looks like a pale label, with nothing that says it can be tapped.
- **Why it matters:** it is under the 44 px the rest of the game keeps, and it is the only control of the run's own.
- **Fix:** `min-height: var(--tap)`, and a chevron or the row-button look the court letter row uses.
- **Code:** `css/v93.css:16`.
- **Shot:** `38-decree-chip-390x844.png`.

#### S12. The decree end card has three equal buttons and no first choice
- **Where:** 390×844, the decree's end card.
- **What's wrong:** Share, Try again and Back to your city are all outlined. Every other end card in the game (the lesson's "Your first city stands", the court letter) leads with one filled primary button.
- **Why it matters:** Josh's consistency rule. He has flagged this card before, and it still does not reuse the lesson end card's pattern.
- **Fix:** make Try again (or Back to your city) the primary, and stack the buttons at full width as the lesson end card does.
- **Code:** `src/ui/v93/decree.js:189`.
- **Shot:** `39-decree-end-card-390x844.png`.

#### S13. At 150% on a small phone, the decree card pushes the title's other buttons below the fold
- **Where:** 375×667 at 150%, title card with this week's decree.
- **What's wrong:** the card is 895 px in a 639 px box. The decree's Start, and Lesson, Options, What's new and Install, are below the fold, and the cut falls mid-line ("You have not finished this week") with no scroll cue.
- **Why it matters:** on the screens where text is largest, the title hides its own buttons.
- **Fix:** shorten the decree panel on short screens (the mark and Start only, with the twist behind a "What it does" row), or show a fade and a down chevron as the New city card does.
- **Code:** `src/ui/titleCard.js:168-172`.
- **Shot:** `36-decree-title-card-150-375x667.png`.

#### S14. A pinch on a bar zooms the whole page, and getting back is hard
- **Where:** 390×844, a two-finger spread on the top bar or the dock.
- **What's wrong:** by ruling 1829 the interface allows a deliberate pinch to zoom the page (`touch-action: … pinch-zoom`). In emulation one spread took `visualViewport.scale` to 5. The map then fills almost the screen, and a pinch there zooms the map, not the page, so getting back needs a pinch on the thin strip of bar that is left.
- **Why it matters:** the checklist asks whether a two-finger touch on the bars zooms the page by accident. It can, and a player who does it is stuck.
- **Fix:** keep the ruling but cap it (`maximum-scale=2` in the viewport meta). Or reset the page zoom when the map takes a pinch while `visualViewport.scale > 1`.
- **Code:** `css/v81-d.css:5`, `index.html:5`.
- **Shot:** `40-page-zoomed-by-pinch-on-bar-390x844.png`.

#### S15. Sideways at 150%, the rail's words sit on their colour bars and read as struck through
- **Where:** 844×390 at 150%.
- **What's wrong:** the icons grow with `--ui-scale` but the words are fixed at 12 px and pushed down onto the coloured underline. "Homes", "Food" and "Defence" look crossed out (read as disabled), and Monuments is cut at the bottom of the rail.
- **Why it matters:** players read the categories as unavailable.
- **Fix:** add bottom padding to `#rail .cat` equal to the bar's height, or move the bar under the word box.
- **Code:** `css/ui.css:156-158`, `css/ui.css:317`.
- **Shot:** `34-landscape-rail-words-struck-150-844x390.png`.

### Could

#### C1. "Show me" comes in three looks on one sheet
- **Where:** 390×844, a Shack's sheet. The Next step box has a filled navy Show me, the Food row an outlined one, and the Health row a filled one again. In the Minimap list, Show me and View are plain links.
- **Why it matters:** Josh's rule is one part for one role. It also makes the most important Show me hard to tell from the others.
- **Fix:** one style for row actions (outlined), filled only for the sheet's single next step.
- **Code:** `src/ui/sheets.js` (house sheet), `src/ui/sheets.js:458-470`.
- **Shots:** `21-house-sheet-390x844.png`, `16-minimap-sheet-top-390x844.png`.

#### C2. On a phone, How to play leads with Keyboard shortcuts, before Touch
- **Where:** 390×844, the Menu, then How to play.
- **Why it matters:** a phone player meets a table of keys first. Touch is the third of about 40 sections.
- **Fix:** on a touch device put Touch second and Keyboard shortcuts near the end (or hide it with no keyboard).
- **Code:** `src/ui/menu.js:212-218`.
- **Shot:** `29-how-to-play-390x844.png`.

#### C3. A building's "Pause", and a bold Demolish at thumb height
- **Where:** 390×844, the bazaar's sheet.
- **What's wrong:** "Pause" pauses this building, beside a game whose biggest button is Play and Paused. Demolish is the strongest button in the row, filled red, and a bazaar goes with no question (Undo only).
- **Fix:** "Pause work" or "Stop work", and an outlined Demolish with red words.
- **Code:** `src/ui/sheets.js:211`, `src/ui/sheets.js:94`.
- **Shot:** `22-bazaar-sheet-390x844.png`.

#### C4. Layers picker: "Off" is drawn as the filled, chosen button
- **Where:** 390×844, Layers.
- **What's wrong:** with no layer on, Off is a full-width filled teal bar. It reads as a primary action ("tap to turn off") more than as the current state.
- **Fix:** draw Off like the others, with the ✓ or ring the picked layer gets.
- **Code:** `src/ui/layersPicker.js:23`.
- **Shot:** `18-layers-picker-390x844.png`.

#### C5. The Menu's first item is a filled "Continue"
- **Where:** 390×844, the Menu.
- **What's wrong:** "Continue" closes the Menu, which the × already does. It is the third meaning of Continue a player meets (the title's saved city, the install guide's close). The list also runs past the fold (How to play and About), which is where S6 starts.
- **Fix:** drop the Continue row on phones (× and Back close the Menu), which also brings About above the fold.
- **Code:** `src/ui/menu.js`.
- **Shot:** `15-menu-390x844.png`.

#### C6. The Undo toast sits on the Paused tag at 150%
- **Where:** 360×780 at 150%, "Road laid Undo ×" over the Play button's "Paused" tag (a few px overlap).
- **Fix:** add the tag's height to `--toast-lift` while paused.
- **Code:** `css/ui.css:184-186`.
- **Shot:** `26-goal-strip-cut-and-toast-150-360x780.png`.

#### C7. The lesson's first tool bar talks about bridges and ferries
- **Where:** 360×780, the lesson's road step.
- **What's wrong:** the bar's first line is "Water: bridge up to 4 tiles (25 a tile), ferry 5 to 12" before "Drag or tap tiles · two fingers move the map".
- **Why it matters:** noise at the one moment the player needs a single instruction.
- **Fix:** hide the water line in the lesson, or until the plan crosses water.
- **Shot:** `06-lesson-road-end-at-edge-360x780.png`.

#### C8. A new map opens with a quarter of the screen past its edge
- **Where:** 390×844, a fresh city (seed 7) and the decree's first screen.
- **What's wrong:** the start camera shows a wedge of plain tan off the map's corner, lower left.
- **Fix:** clamp the opening frame so the map's edge sits at the screen's edge.
- **Shots:** `37-decree-first-sheet-390x844.png`, `38-decree-chip-390x844.png`.

#### C9. The decree card says the decree's name three times
- **Where:** 390×844, the title's decree card.
- **What's wrong:** the card reads "Sea Peoples, week 47", then "Sea Peoples. Raids come twice…", with "This week's decree" above both.
- **Fix:** for a single-decree week, drop the name before the twist ("Raids come twice as often…").
- **Code:** `src/ui/v93/decree.js:88`.
- **Shot:** `35-decree-title-card-390x844.png`.

#### C10. After a decree, the title says "Rulers (1)" for a decree row
- **Where:** 390×844, the title after one decree run.
- **What's wrong:** the button counts the decree as a ruler, and it sits between "Best reign" and Play.
- **Fix:** "Records (1)" or "Your results"; place it under Play with the other secondary buttons.
- **Code:** `src/ui/scoreUi.js:364`.
- **Shot:** `42-title-after-decree-390x844.png`.

#### C11. The date explainer's action is a two-line sentence-button
- **Where:** 390×844, tap the date.
- **What's wrong:** "Build a Nilometer (80 gold) on the river bank: Show me" is one wide filled button. The other explainers put a short Show me under their words.
- **Fix:** the sentence as a line, Show me as the button.
- **Shot:** `14-date-popover-390x844.png`.

#### C12. In a built-up city, a double tap opens a building before it zooms
- **Where:** 390×844, double tap over houses.
- **What's wrong:** the first tap selects the building and frames it, so the second tap often lands elsewhere: the zoom does not happen and a sheet is open.
- **Fix:** delay a tap's select by the double-tap window when the camera would move, or zoom on the first tap's point.
- **Code:** `src/ui/input.js:25`.
- **Shot:** none (behaviour).

#### C13. The New city card at 150% on an SE hides Hard and the map choices
- **Where:** 375×667 at 150%.
- **What's wrong:** the "Thebes" cartouche and the "New city" head take about 150 px. Hard, the map preview, "Another map" and "More choices" are below the fold (a sticky Start and Back stay in view).
- **Fix:** drop the Thebes cartouche on the New city card on short screens.
- **Shot:** `04-new-city-card-150-375x667.png`.

#### C14. Placing at 150% on a 360 phone leaves little map
- **Where:** 360×780 at 150%, placing a well with a raid warning.
- **What's wrong:**
  - The placement text runs to six lines ("30 gold · Costs 3 / a month / …").
  - The Water legend wraps each key onto two lines.
  - With the raid row, about 40% of the screen is left for the map.
- **Fix:** at 150% show the cost line only, and put the reasons on the chips the bar already has.
- **Shot:** `27-placing-raid-150-360x780.png`.

## What works well on mobile

- **Tap sizes.** Every control measured on every screen is 44 px or more, except the decree chip (S11). The small-looking lesson More has a 44 px hit area through `::before` (`css/ui.css:1453`).
- **Portrait safe areas.** The top bar, dock, corners, sheets and toasts all keep clear of a 47 px notch and a 34 px home bar (`41-safe-area-portrait-390x844.png`). The landscape rail (M2) is the one slip.
- **Placement by touch.** A tap moves the ghost and does not build. Drag pans, two fingers pan and zoom, and the ✓ is never pressed by accident. The bar's chips ("✓ Free ground", "! No road yet") read well at arm's length (`20-placing-well-390x844.png`).
- **The lesson's picture cards.** One instruction, a picture and one big button, in both orientations (`05`, `11`).
- **Stat explainers.** Short, honest and actionable (`13-gold-popover-390x844.png`).
- **The court letter.** Deadline, reward and cost in rows, with the two answers as full-width buttons, primary first (`24-court-letter-390x844.png`). This is the pattern S12 asks the decree end card to reuse.
- **The row budget.** The 12 Oct review's two-row rule holds in calm play and during raids at 100% (`12-city-calm-390x844.png`), and toasts now span the screen.
- **Back on sheets, the Menu, tools, selections and Layers.** Each closes one step at a time.
- **The title card at 150% on a 360 phone.** It fits without scrolling on Android.

## The real-phone checklist (from `2026-11-10-version-9-3-followups.md`)

What this emulation could and could not check:

| Item | In emulation |
|---|---|
| The first two hours on a phone over mobile data | **Partly.** The lesson was played by touch through roads and homes, the later steps by dev scene, and the first unguided minutes by scenes. Cold load, mobile data and a real first raid were not. |
| Warmth and battery at 1x and 3x | **No.** |
| An hour of zooming and panning on Large and Huge: does the tab reload? | **No.** Headless has no memory pressure. |
| Install, then launch offline; the install ask; Safari's 7-day rule | **No.** The iOS guide text was seen (S5); the install prompt and offline launch cannot be. |
| The lesson's road step by touch | **Yes,** at 360, 390 and 844×390: it works, but see M3 (the edge) and S2 (✓ not mentioned). |
| Sound with the silent switch; 150% text; the phone held sideways | **150% and sideways: yes** (S1, S4, S9, S10, S13, S15, M2). **Sound: no.** |
| The error card: `?crash=tick`, `render`, `ui` | **Only `ui`:** "That didn't work; your city is safe" shows. Tick and render need the city playing; not done. |
| The lesson's raid framed on your phone | **Partly.** The raid step's card was seen; the framing from the first warning was not followed. |
| Pinch zoom on the map and on a sheet; two fingers on the bars | **Map: yes** (0.5 to 1.75 and back). **Bars: a deliberate pinch zooms the page** (S14). **Sheet:** not separable from the bar test. |
| 200% text | **No** (this pass kept to 100% and 150%). |
| Fit the city from the Minimap on a phone | **Yes:** it barely moves on the sample city and the sheet stays open (S7). |
| The lesson's end card at 150% | **At 100% only** (360×780: both choices visible). |
| Health layer legend in sunlight | **No.** |
| Day and night, and the music, in sunlight | **No.** |
| Tab reload on a Capital mid-rebuild | **No.** |
| An iPad on a Capital mid-rebuild | **No.** |
| A decree run on a phone, start to finish | **Mostly.** The title card, Start, Begin, the chip, 150%, the end card, Try again and Back were checked. Share calls `navigator.share`, which headless cannot show. A forbidden card in the tray, and Continue after leaving mid-run, were not checked. |
| A decree link from a friend; sharing your own | **No.** |
| A look change seen on a phone | **No.** |

## What emulation cannot tell us

- **The back-gesture zones.** M3 rests on Android's edge-swipe width, about 24 dp by default and adjustable. Whether a drag from 24 px is eaten needs a real phone with gesture navigation. Whether iOS's edge swipe interferes in Safari (not standalone) needs one too.
- **The keyboard.** The Pass the throne name field sits at y 722–766 on an 844 px screen (`30-pass-the-throne-input-390x844.png`). The Options ruler-name field is in the lower half of a bottom sheet. Whether iOS and Android pan the view to keep them visible above the keyboard cannot be emulated.
- **Real touch.** Finger size, palm rejection, fling feel, and how often a two-finger touch on the bars is an accident (S14).
- **Install, offline and share.** The install prompt, standalone launch, `navigator.share`, Export and Bring rulers from a file (the system file picker) cannot be shown headless.
- **Contrast in sunlight, sound, heat, battery and memory pressure.** The emulation also draws without a graphics card, so nothing here says anything about speed. A few long sheets (the City summary, the Minimap list) scrolled smoothly, but that is headless, not a phone.
- **Safari's own chrome.** The bottom address bar in Safari, and how `100dvh` and the dock behave as it shows and hides, are not modelled by Chromium's emulation.
