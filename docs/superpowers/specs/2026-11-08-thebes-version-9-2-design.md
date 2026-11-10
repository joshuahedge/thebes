# Thebes 9.2 "A city you can read": the design

**Josh's answers (8 Nov 2026): "Go with your recommendations".** Every open question in section 9 takes its recommendation: Q1 this is 9.2 "A city you can read" and the decree becomes 9.3; Q2 score v3 as described; Q3 services ahead of safety until Town; Q4 one gate over the four letter streams; Q5 one end card on both paths; Q6 the Builder's bar instead of a cap, the Generous and Unconquered costs, the Merchant bar lowered; Q7 pinch zoom and a 200% step; Q8 Villa tax 7 and the luxury goal; Q9 Screenshot mode in Options; Q10 Track V in, last, cut first; Q11 no beginner's guide in an heir's city. **And on the models:** "I've only got 21% usage left, so use sonnet where appropriate": every track runs on Sonnet (L and Q included); Opus is kept for the final review and any merge Sonnet cannot settle (the plan's Process section).

**Josh's ask (8 Nov 2026):** one release that acts on everything both design reviews of 8 November found, before the weekly decree. The reviews are the design source: `notes/2026-11-08-design-review.md` (first pass, findings 2.1 to 2.12, visual notes in its section 3, interface notes in 4, game-design notes in 5) and `notes/2026-11-08-design-review-deep.md` (findings D1 to D15, visual notes in 4, words in 5, accessibility in 6, balance in 7). The reviews' ranking stands. Where a review gives a number, it is the starting point; the code and the balance runs decide.

**For Josh:** section 1 ranks the fixes by what each buys and for whom. Sections 2 to 8 are the tracks: for each finding, today (checked in the code at 4d5fa77), the change and the proof. Every finding in both reviews appears once, with its number, so you can tick them off. Section 9 is the open questions, section 10 the targets, section 11 what does not change. The plan is `plans/2026-11-08-thebes-version-9-2.md`.

**Where the code disagrees with a review** (checked by four code-mapping passes; each is a ruling in the plan):
- **2.4:** the end sheet was never meant to open on a first run. `lessonEnd` opens only on a replay (a device that already holds a city); on a fresh device the lesson hands over by a 2.6-second timer (`boot.js` `adoptLesson`). So the fix is a new end card on both paths, not a blocked sheet.
- **D13:** the beginner's guide is five goals before Town (road, plots, well, food, temple), and no record keeps a reign's met goals. So "start at the first unmet goal" becomes: an heir's city has no guide at all (a ruler has met all five).
- **D3:** every monument kind's prestige sums to 1,280, not 1,080 (the great temple was missed). The growth cap at Capital was deliberate (ruling 659); Q2 asks to lift it.
- **D8:** capping each title's fit at 2 only moves the tie to row order: in the great-work run the Builder (2.94) and the Unconquered (2.60) both cap to 2 and the earlier row (the Unconquered) would win. Q6 changes the recommendation to the Builder's bar.
- **D7:** crew-months are the sum of the courses' units, so fewer crew-months also means less stone and brick. Accepted: a cheaper middle rung is no harm.
- **D2:** the Minimap sheet's list rolls up nothing, not even fires (only the banner does), and the markers have no zoom buckets (fixed-size badges merged when closer than 25 px; rings always drawn). City advice ranks five lines, not three.
- **D4:** `heirCaption` is the cheer row's "Heir of the Steady" for ten days, not an Ipi line; the heir's two toasts are `boot.js` `noteFirstPass` (the install ask) and the Pass notice. The Pass button opens the heir card; nothing is sealed until the heir card's Start.
- **2.10 and section 4's dock note:** the dock's category buttons already take their name from their label, and the rail's buttons have an aria-label and a title. What is missing is a visible word on the rail only.
- **Section 3's roads and plots:** the roads already draw ruts and pebbles and the unbuilt plots already draw stakes and string. Track V looks at them at the far zooms (where the review saw them) before changing anything.
- **D10:** two of the hiding rules (`css/ui.css:1384, 1529`) hide labels on phones at every text size, not only at large text.
- **2.7:** the "why" line was meant to hide on phones, but the rule names `.why` and the element is `.ipi-why`, so it never hides.

## 1. What each fix buys, ranked

Ranked as the reviews rank them: what it costs a player, times how many meet it. "New" is the first two hours (the refund window); "staying" is hours three to ten, the players the decree is for.

| # | What the player feels today | Who | Track |
|---|---|---|---|
| 1 | "What just happened?" The lesson's raid happens off-screen, the gold-and-mood chapter skips itself, a stray road counts for nothing, the lesson ends on a fading line | every lesson player | L |
| 2 | "Why did my homes stop?" The firehouse takes the workers the bazaar and temple needed, before fire can even start, and nothing says so | every new city | L |
| 3 | "I can't tell what matters." 90 alerts, a badge of 88, four letter streams at one every 78 seconds, four rows over a desktop map | every mid-game player with trouble | Q |
| 4 | "The score lies." Bronze almost free, the score falls as the city grows, newer monuments add nothing, the Villa pays least, two titles are not trade-offs | everyone who looks at the score; players after a Pass | S |
| 5 | "That was it?" Sealing a six-year reign is a toast; the heir starts with the beginner's guide on a surprise map | everyone who passes the throne | D |
| 6 | "I can't read it / reach it." Large text hides words, no pinch zoom, focus lost in dialogs, Esc advances the lesson | large-text, keyboard and low-vision players | A |
| 7 | "Who is talking?" Change-log sentences in How to play, a build hash in What's new, one thing with four names | everyone, a little | W |
| 8 | "It looks unfinished here." Burnt rubble like a rendering fault, a score icon that is not a score, sand where the city should be | everyone, a little | V |

Rows 1 and 2 are the refund window; 3 and 4 are what makes a player stay. Row 8 is cut first if the weekly limit nears (Q10).

## 2. Track L: the lesson and the first hours

The lesson lock leaves only the step's own category live; nothing may leave a step waiting with no way on (rulings 1200, 1204, and 1453's "needs a road" refusal). Every lesson sentence stays under 14 words (`tests/v91/f/lesson.test.js:108`).

**2.1 The raid in frame and the fire held (first review 2.1, High, S to M).**
- *Today:* the raid step frames the bazaar plus 6 tiles toward the entry (`stepFrame`, `RAID_FRAME_REACH` 6); the raiders enter about 25 tiles east. The scrim has one hole and one ring, on the target; the tower sits dimmed. `ensureVisible` frames once per step. The staged fire goes out in 1 to 2 days, before the glide settles.
- *Change:* during the raid step the camera follows the band's centre (from the per-frame `layout()`), keeping the tower and the target in frame; the tower gets a second ring (a second scrim hole, or the tower's ring without a hole). The fire step plays at 1x until the camera has settled on the blaze, then holds on the crew until it is out.
- *Proof:* a screenshot test at 375x667 with a raider inside the frame at the arrival and the tower's ring drawn; a test that the fire step's speed is 1 until the glide ends.

**2.2 The month step from its own start; nine plots (first review 2.2, High, S).**
- *Today:* the month step checks `monthIndex(world) >= 2`, the city's absolute month; a slow chapter 4 or 5 skips it. The homes step places six plots, three more come at the workers step, and the lesson city runs short of workers through chapters 4 and 5.
- *Change:* the month step stores its entry month on the lesson world (never saved) and waits two months from it; its chip and Ipi's line count from there. The homes step places nine plots (`n: 9`, the row lengthened), and the firehouse's reach is re-measured over them.
- *Proof:* a test that enters the month step at month 4 and asserts it waits to month 6; the lesson's day pins and the hand-over's people re-pinned (about 94 today) with a ruling; every lesson building inside a staffed firehouse's reach.

**2.3 The stray road (first review 2.3, High, S in the lesson, M in the game).**
- *Today:* a road drag is committed with no connectivity check; the lesson counts only road reachable from the start road (ruling 1210), so a stray road says "Road laid", costs gold and counts nothing.
- *Change:* in the lesson, a road drag that starts within two tiles of the road's end snaps to it; one further away is refused in the confirm bar: "Start on the diamond at the end of the road." In every city, a road piece that joins no road and no building gets the roadless plots' amber dashed outline and badge, and its toast says "Road laid: it joins nothing yet."
- *Proof:* a test that drags from four tiles off and asserts the refusal and no gold spent; one from one tile off and asserts the snap and the count; a test that a lone road gets the badge and the toast in a free city.

**2.4 The lesson's end (first review 2.4, High, M).**
- *Today:* a first run hands over 2.6 s after the raid, with "Go to the title to found your own when you are ready" fading under a Large-plot tip; a replay opens the `lessonEnd` sheet.
- *Change:* both paths end on one card (Q5): the city's numbers (people, gold, the raid beaten), one line per thing learned, and two buttons, "Keep building this city" (the hand-over; on a replay, which would replace a saved city, it asks first and offers Export) and "Start my own city" (the New city card on the classic river, ruling 1672). It never opens over a picture card, a sheet or the confirm dialog; it waits for them. After the hand-over, tips about anything the lesson placed (the Large plot, the tower, the firehouse) are marked seen.
- *Proof:* a test that plays the lesson to the end on a device with no city and one with a saved city and asserts the card with both buttons each time; a test that it waits behind a picture card; a test that no Large-plot tip fires in the first month after the hand-over.

**2.5 One instruction per row (first review 2.7, Medium, S).**
- *Today:* the row holds the label, the beat, the instruction, the chip, Ipi's why and More; More's gradient paints over the last line mid-word; the phone rule meant to hide the why names the wrong class.
- *Change:* the row is the bold instruction with the progress chip at its end; the why lives on the chapter card and behind More only. Text is clipped at a word.
- *Proof:* the row's text at the road step on 375x667 at 100% and 150% has no word cut and one sentence; the mobile budget holds.

**2.6 The labour order (D1, High, S).**
- *Today:* workplaces fill essential, safety, services, industry, monuments (`src/data/labour.js:2`); at 50 people the firehouse takes the 4 workers the bazaar and temple needed, and fire starts only at Town (`src/data/fire.js:6`).
- *Change (Q3):* services rank ahead of safety until the city is a Town; from Town, today's order. The "short of workers" alert names the cause: "Its workers went to the firehouse first. More homes bring more workers." (named from the level that was filled first). The lesson's raid step is unaffected (the staged raid sets Market town, so the tower is crewed); the lesson's words say why the bazaar stopped if it does.
- *Proof:* a test of a 50-person Village with a farm, granary, firehouse, bazaar and temple (the bazaar and temple staffed first); the same at Town (today's order); the lesson's steps all reached; the balance scenes re-pinned with a ruling.

**2.7 The game-design notes on the first hour (first review section 5).**
- **Workers taught early:** chapter 2's homes card says "About four in ten people here will work." (one sentence, under 14 words).
- **One voice after the hand-over:** tips wait until the goal in view is done or ten game minutes have passed, whichever is later (9.1's first-month hold extended).
- **The lesson teaches placing, not deciding:** left. A choice step changes the lesson's script and its pins; it is a follow-up for after the real-phone pass.

**2.8 The Swift Town feat (D15, Low, S).** Day 720 to about day 300, measured against the scripted Town split; the feat's line says "in the first year" or the day, never "year 1.83" (the copy divides by 360 today). The feat tests move with it.

## 3. Track Q: a quiet city

**3.1 Alerts roll up by cause (D2 and first review 2.6, High, M).**
- *Today:* only the banner rolls up fires; the Minimap sheet lists every alert, one row each; `plots_no_road` and `crime_risk` already carry ids and a count, but crime is one row per district. The Map badge counts alerts (non-critical on wide, all minus the banner's on phones).
- *Change:* every alert kind rolls up by cause into one row with a count and a list of ids: "7 firehouses are short of workers", "6 farms have nowhere to store grain", "41 homes have a high crime risk"; its View steps through them as the fire row does. The Minimap sheet opens with City advice's top three under "Fix these first", then the rolled-up rows. The badge counts rows. The lesson's one-row banner rule (9.1) stays.
- *Proof:* the six-year Capital (the fixture wave 0 builds from `capitalRun(72, { dangers: true })`) reopened lists at most twelve rows, one per cause, and its badge equals the rows; a test of View stepping; the lesson's banner tests unchanged.

**3.2 Markers at a distance (D2's third layer, deep review section 4's red tide).**
- *Today:* fixed 11 px badges merged under 25 px apart; a 2 px ring with a white halo on every flagged footprint at every zoom.
- *Change:* below a zoom where a badge is wider than a tile, one badge per rolled-up row (on its frontmost building) and no rings; the ring's halo lighter at every zoom.
- *Proof:* a count of drawn badges on the six-year Capital at the far zoom (at most one per row); before-and-after screenshots.

**3.3 One court stream (D5, Medium, M).**
- *Today:* four schedules: city events every 5 to 9 months from Town, demands 10 to 14 from Town, court requests 8 to 14 from Market town, court cards 12 to 18; only events check the others; together about one letter every 78 s at 1x from Market town.
- *Change (Q4):* one gate over all four: a letter waits while another is open, and none comes within about 5 months of the last (5 to 8 drawn from the sim's own random stream); each stream keeps its own content and order. Kept on an optional world field (absent: today's schedules), so no world-version bump. The banner and the card are the same letter.
- *Proof:* a scripted year from Market town: at most one letter open at a time and none within a month of another; the court and event tests re-pinned with a ruling; an 8.4, 9.0 and 9.1 save loads with its letters as they were.

**3.4 The desktop's top-left (first review 2.5, Medium, M).**
- *Today:* at 900x520 and up, the banner, the goals strip, the rank bar and a tip stack at the top left.
- *Change:* on the wide layout the goals strip and the rank bar move into the side panel above the minimap, and "+N more" opens the panel's alert list. The top left keeps one banner and one tip. Phones unchanged.
- *Proof:* a screenshot test at 1280x800 with a raid warning, a goal, a rank bar and a tip: at most two rows over the map.

**3.5 Screenshot mode (first review 2.8, Low, S).** Out of the menu and the City summary (three places today), into Options under Display (Q9). Share score stays.

**3.6 The debt sheet's closed levers (D14, Low, S).** "No other way is open" becomes the reasons: "No palace yet: taxes cannot be raised." and "Nothing above your Keep floors to sell.", each with a Show me where there is one. Proof: the sheet with and without a palace and a surplus.

**3.7 Toasts that stack.** "Paused while you were away" and the install ask never share the screen, and the install ask never replaces another toast on a phone (it waits).

**3.8 The interface tidies (first review section 4).**
- **One badge per tray card:** "Suggested" wins over "New".
- **The price alone on a tray card:** the monthly cost and workers stay in the confirm bar.
- **Toasts:** parchment with an ink outline, docked just above the tray, never over the Play corner.
- **Options in sections:** Sound, Display, Controls, Help, Saves, About, each collapsible, About last.
- **New city's replace note:** amber, and the menu's New city asks and offers Export like the title's.

## 4. Track S: a fair score

**4.1 Score v3 (D3, High, M; Q2).**
- *Today:* safety's fire term scores full before Town and defence full before the raid clock, so a new village has Safety 100 and the score falls as they start; medals at 200, 300 and 400; a new city scores 150 raw; `PRESTIGE.scoreFull` is 700 against 1,280 for every kind; growth stops at Capital (ruling 659).
- *Change:* a term that has not started counts nothing and is left out of the ceiling the explainer shows ("Fire safety counts from Town"), so the score only grows as terms start; medals re-measured on the scripted Village, Town, Market town and Capital (starting at 240, 320 and 400); `scoreFull` 1,280; the growth term runs to the Seat; `SCORE_VERSION` 3 with v3 medals, older bests labelled "older scoring"; the share link writes a `t3` score and still reads `t2`. Peaceful's defence never starts, so its medals stop being free (section 7 of the deep review).
- *Proof:* a new village under Bronze; the scripted Town's score does not fall on the day fire starts or the day the raid clock starts; a v2 best keeps its label and medal; the capital run's pinned 360 re-pinned with a ruling.

**4.2 The Villa and the luxury goal (D6, Medium, S; Q8).** Villa tax 6 to 7; a goal at Great city, "Open a route that sells a luxury" (read from `world.tally.luxuryBought`); the luxury rate stays. Proof: the Villa's monthly balance against the Fine manor's; the goal met by the scripted Capital's Byblos route; the pins re-measured.

**4.3 The middle monuments (D7, Medium, S).** Small mastaba 108 crew-months to about 72 and colossus 48 to about 36 (their courses shortened, so stone and brick fall with them); a monument site whose sheet has not been opened for a game month gets one caption with its percentage (a UI-side counter, not world state). Proof: the data test (crew-months equal the courses), the caption's test, every long run re-pinned.

**4.4 The titles and traits (D8, Medium, S; Q6).** The Builder's bar raised from 4,600 to about 8,000 units (so its fit falls into the others' range instead of tying at a cap), the Generous's lasting cost (taxes x0.95), the Unconquered's (every warning 30 days sooner), the Merchant's bar 0.40 to about 0.25; then the P8 probe with the adaptive scripts. Proof: the titles test on the scripted runs; every heir meets 9.0's T1 to T3 or the miss is a ruling with both numbers.

**4.5 Peaceful and Relaxed (D9, Low, S).** The words, not the data: Peaceful's line says "No raids, sickness or thefts. Low Niles, locusts and fires still come, rarer. Buildings cost 20% less to build." The comment in `difficulty.js` says risk scales fire, raid size, sickness and theft.

**4.6 Small things (D15).** The health rule's "crowded" term (true for every Townhouse and up) is measured and either rescaled to the tier's capacity or dropped; the stale prestige comment at `monuments.js:112` corrected; the scripted Capital's disaster numbers (mood 14, 207 people) noted in the rulings as what the pins measure, not changed.

**4.7 Balance notes kept as they are (deep review section 7).** The Manor's weak step, crime and health as alert-makers, and the court's output ignoring the flood are listed in the follow-ups, not changed.

## 5. Track D: the dynasty's moment

**5.1 The sealed-ruler card (D4, High, M).**
- *Today:* the Pass sheet's button opens the heir card (New city: difficulty, map, Start); the heir's first screen is two toasts (the install ask and "X is remembered as the Steady"); the Rulers row wraps the name over three lines and repeats the install ask.
- *Change:* one card between the Pass sheet and the heir card: the sealed ruler in a code-drawn cartouche (name, regnal number, title, years, rank, score, the map square), one line of what the heir inherits, and one button, "Found the heir's city". The heir's first screen opens with the heir's caption as Ipi's line; no install toast in the first game month. A Rulers row is the name and number on one line, the title under it, and the install ask once, at the top of the list.
- *Proof:* screenshots of the card at the UX sizes; a test that nothing is sealed before Start and that Back from the card returns to the Pass sheet; a test that no install toast shows in the heir's first month.

**5.2 The heir's first city (D13, Low, S).** After a Pass the heir's city has no beginner's guide, and the heir card's map defaults to the sealed city's layout (the ruler row's `mapVariant`), with Surprise me a tap away. (Moved from Track L: these are the Pass's files.)

**5.3 The title's record line (first review 2.9, Low, S).** "Best reign: 200, Bronze"; the seed, difficulty and size move to the Rulers list.

**5.4 Long headings in the side panel (D12, Low, S).** Measured in a browser first (the CSS gives about 215 px for the words, so the wrap is not yet explained); then the cartouche takes the full row when the title is long, or the long titles get shorter names ("Pass on", "Heir's city").

**5.5 The dynasty's face (deep review section 4).** The sealed-ruler card's cartouche is drawn once and reused at the top of each Rulers row.

## 6. Track A: reachable for everyone

**6.1 Words restored at large text (D10, Medium, S).** Every rule that hides a label at 125% or 150% (and the two that hide at every size on phones) wraps or shortens instead. Proof: the mobile budget at 150% on 375x667 and 390x844, extended to assert that the Layers legend, the tip's label and the stat labels have visible text.

**6.2 Focus, zoom, Esc (D11, Medium, M; Q7).**
- The confirm dialog traps Tab, focuses Cancel once (not on every store change) and returns focus to the opener; sheets do the same when opened by any means, and the map behind is inert.
- `#dialog` gets a z-index above the confirm bar and the Layers popover.
- Pinch zoom allowed (the viewport meta and `noZoom.js`), and a 200% text step; the mobile budget runs at 200%.
- Esc on the lesson card means Leave (with its confirm); Enter and Space stay Go.
- Screenshot mode shows a small pinned "Show interface" button.
- `<meta name="color-scheme" content="light">`.
- *Proof:* a keyboard-only test opens and closes a sheet and the confirm dialog with focus back on the opener; the dialog paints above an open Layers popover.

**6.3 The compact rail's words (first review 2.10, Low, S).** A small word under each rail icon at 667x375; the mobile budget holds.

**6.4 The audit's list (deep review section 6).** The teal text token darkened to about #1A5F57 (5.4:1 on parchment-2); the two sub-12 px sizes raised and the badge, error details and chevron scaled with the text setting; the "More ▾" links 44 px tall in their row; `TEXT_PAIRS` extended to every real pair (coral, amber, lapis, parchment-2); the minimap canvas gets a role, a label and arrow keys; the alerts' live region keeps one politeness (two regions, one assertive and one polite, instead of one that flips). The dock's names already hold (checked; a test pins them).

**6.5 The first load (first review 2.12, check).** A test that the loading screen is gone once the title is up (`showTitle` removes it as its last line today); the cold load on mobile data stays on Josh's real-phone list.

## 7. Track W: words

The deep review's section 5 in full, against the sim's own words-against-the-sim rule (every number from the sim or the data). W runs after D and A in the merge order and sweeps their new strings too.
- **7.1 Developer voice (5a):** every sentence in How to play and What's new that a player cannot act on or feel is cut or rewritten; the build hash leaves the What's new headings (`s46/whatsNew.js:48`); the error card's "Where: the day's tick" becomes the details' first line only; "Y1 M3" becomes "Year 1, month 3" where it fits.
- **7.2 One name per thing (5b):** a glossary in the rulings, then one sweep: the lesson (Ipi's city) against the guide (the goals strip) against Play; City advice; Home and the title; Layers; Options; motion; Fetch in old notes; plot (not lot, square or tile, in player text); rank capitalised ("Great City", "Great Capital"); "Skip the lesson" on the lesson's first card (first review section 4).
- **7.3 Words at the gate (5c):** prestige defined at its first sight ("monument standing"), seed called "map number", the friends' honour line in plain words, desirability given its word ("how pleasant the street is"), and "the ghost", "(wide: Goals)" and "the diamond" said only once they are shown.
- **7.4 Long rows:** every advice, alert, legend and lesson row over 90 characters shortened; the "Keep stocked" help split; the leave-the-lesson confirm one honest sentence.
- **7.5 Literals:** the few figures typed into sentences ("of 50 desirability", "last 6 months", "two months ahead", "a quarter of its founding", the daily goals) read from the data.
- **Proof:** a test that no player string in `text.js` and the per-version text files is over 90 characters outside help bodies; a test that What's new prints no hash; the Pharaoh test over every *Text.js stands; the voice the review praises is kept word for word.

## 8. Track V: the look (Q10: last, cut first)

Each change with before-and-after screenshots at the UX sizes; nothing changes the sim.
- **Roads (first review section 3):** looked at at the far zooms first (ruts and pebbles exist at near zoom); then a kerb shadow on the low side and a darker centre where carts run.
- **Housing plots:** stakes and string exist; the review saw the outlined square at a far zoom. The far-zoom plot gets the same sand square with a shadow instead of an interface outline.
- **Burnt rubble (and deep section 4):** `drawScorch`'s grey blotch becomes a charred wall stump and blackened bricks.
- **Frame the city:** a double tap on the minimap button (and a key) fits the built area to the screen; the heir's first screen and a fresh load at zoom 1 start framed on the city, not sand (deep section 4's empty desert).
- **The score chip's icon (first review 2.11):** a laurel or medal outline instead of the cartouche with a sun.
- **The health layer's bullseyes (deep section 4):** the ring-and-cross becomes the same hatch language as the other layers.
- **Cartouche headings that wrap:** with Track D's 5.4.
- (The markers at far zooms are Track Q's 3.2.)
- **Day, night and the music on a phone in sunlight** stay on Josh's real-phone list.

## 9. Open questions (each with a recommendation)

- **Q1. The version.** Recommended: **9.2 "A city you can read"**, with the weekly decree becoming 9.3 (the roadmap's section 6 table updated in the docs step). Why: a release the size of 9.1; a patch number undersells it; the decree is content for players who stay, and this is what keeps them.
- **Q2. Score v3.** Recommended: a term that has not started counts nothing and is left out of the ceiling (fire until Town, defence until the raid clock); medals re-measured on the scripted cities from about 240, 320 and 400; `scoreFull` 1,280 (every kind); growth to the Seat (lifting ruling 659's cap); `SCORE_VERSION` 3, old bests keep "older scoring". Why: D3.
- **Q3. The labour order.** Recommended: services ahead of safety until Town, rather than moving the firehouse's unlock. Why: D1 without touching the lesson's firehouse step.
- **Q4. The letters.** Recommended: one gate over the four streams, one letter open at a time, a gap of about 5 to 8 months, each stream's content unchanged; the banner and the card are the same letter. Why: D5, and an optional field keeps saves as they are.
- **Q5. The lesson's end.** Recommended: one end card on both the first-run and the replay path, with the city's numbers, one line per thing learned, "Keep building this city" and "Start my own city". Why: 2.4 (a first run has no end today; it hands over on a timer).
- **Q6. The titles.** Recommended: **the Builder's bar to about 8,000 units instead of a cap at 2** (a cap ties the Builder and the Unconquered at 2 and row order picks), the Generous taxes x0.95, the Unconquered every warning 30 days sooner, the Merchant bar 0.40 to about 0.25, then the P8 probe with the adaptive scripts. Why: D8, corrected by the code.
- **Q7. Zoom and text.** Recommended: pinch zoom allowed again and a 200% text step, the mobile budget extended to it. Why: D11, WCAG 1.4.4.
- **Q8. The Villa.** Recommended: tax 6 to 7 and a Great city goal "Open a route that sells a luxury"; the luxury rate stays. Why: D6; re-pinned by the balance runs.
- **Q9. Screenshot mode.** Recommended: Options under Display, out of the menu and the City summary. Why: 2.8.
- **Q10. The visual track.** Recommended: in, last in the merge order, cut first if the weekly limit nears. Why: section 8.
- **Q11. The heir's guide.** Recommended: no beginner's guide in an heir's city (the guide's five goals all come before Town, and every ruler has met them). Why: D13 as the code allows; recording a reign's met goals would be a new record field for no gain.

## 10. The targets

| # | Measure | Target | How |
|---|---|---|---|
| T1 | The lesson's raid step at the arrival | a raider in frame and the tower lit | a screenshot test at 375x667 |
| T2 | A stray first road in the lesson | refused 3+ tiles off with the reason in the bar, snapped within 2; no gold spent on a refusal | a test |
| T3 | The month step entered at month 4 | waits to month 6 | a test |
| T4 | The lesson's end | the end card up with both buttons, with and without a saved city; never over a picture card | a test |
| T5 | The six-year Capital reopened | at most 12 alert rows, one per cause; the badge counts rows; at most one marker per row at the far zoom | a test on the wave-0 fixture |
| T6 | A scripted year from Market town | at most one letter open at a time; none within a month of another | a test |
| T7 | 1280x800 with a raid warning, a goal, a rank bar and a tip | at most two rows over the map | a screenshot test |
| T8 | Score v3 | a new village under Bronze; the scripted Town's score does not fall when fire and defence start | a test |
| T9 | The heirs with the adaptive scripts | each meets 9.0's T1 to T3, or the miss is a ruling with both numbers | the balance check |
| T10 | 150% (and 200%) text at 375x667 and 390x844 | the Layers legend, the tip's label and the stat labels show words; the mobile budget holds | `mobileBudget` extended |
| T11 | Keyboard only | a sheet and the confirm dialog open and close with focus back on the opener | a test |
| T12 | The Villa and the middle monuments | the Villa pays more a month than a Fine manor on the same plot; small mastaba and colossus at about 24 and 18 months with full crews | the balance check |
| T13 | Words | no player row over 90 characters (help bodies excepted); no hash in What's new; "Pharaoh" in no game text | tests |
| T14 | No regressions | every 9.1 frame bound and balance pin holds or is re-pinned with a ruling; old saves (8.4, 9.0, 9.1, with and without a lesson city) open as they were; a v2 best keeps its label; no world-version bump unless a track needs one (then one, shared, in wave 0) | the suite |

## 11. What does not change

- **No new systems** beyond what the reviews ask for (the sealed-ruler card, the alerts' roll-up, the luxury goal); the weekly decree waits for 9.3.
- **The sim's rules,** except the labour order before Town, the court's one gate, the Villa's tax, the two monuments' courses, the titles' and traits' numbers and the score's terms.
- **No reduced motion** (ruling 1601), **no colour-blind work** (ruling 1700), no bundle (ruling 1740).
- **One city and one save slot;** the world version stays 12 (optional fields only); old saves load; the share link still reads v2 scores.
- **The voice:** the lines the deep review praises (section 5) are kept word for word.
