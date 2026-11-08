# Thebes at 9.1: a game design, UX and visual review

**Date:** 8 November 2026, against main at 42b1dce (9.1 "First hours", the build the live site serves).
**How it was done:** the whole lesson was played as a new player on a 375x812 phone viewport, then the title, New city, Options, What's new, the menu, the Map sheet, City advice and a house sheet; a built-up sample city was opened at 1280x800 (wide layout) to look at the side panel, the alert stack, the Layers picker, a house sheet and the Great pyramid's sheet at three zooms; the compact landscape layout at 667x375; and the raid, fire and house-sheet dev scenes on the phone. The design spec, the v9 roadmap, the 9.1 "First hours" design and the 8.3, 8.4, 9.0 and 9.1 follow-up notes were read first. Nothing here was tried on a real phone: that gap is still open (9.1 follow-ups, section "For Josh to check on a real phone").

**For Josh:** section 1 is the short verdict. Section 2 is what I would fix first, ranked, each with what I saw, why it matters and the change. Sections 3 to 5 are the longer notes on visuals, interface and game design. Section 6 is a proposed shape for the next release.

## 1. Where the game stands

Thebes is in good shape. The art direction holds together: whitewashed houses with coloured rugs, the white-domed granary, striped bazaar awnings, a pyramid that rises course by course, reeds and boats on a teal river, gazelles in the desert, and a papyrus interface with a frieze band and lapis buttons that feels of a piece with it. The hard interface problems a city builder usually has are solved: one panel at a time, nothing over the middle of the map, building sheets that say exactly what a home needs next with a Show me, City advice that ranks the city's problems with a price on each fix, a Welcome back sheet that tells a returning player what changed. The lesson is seven short chapters with a scribe who speaks in one or two lines. That is a strong base.

What holds it back now is not missing systems. It is a handful of moments where the game is quieter or busier than it should be: the lesson's finale happens off-screen, the lesson's gold-and-mood chapter can be skipped by the game itself, a near-miss drag lays a road that counts for nothing without a word, and on a desktop the top-left corner stacks four rows of text over the map. Each is small to fix. Together they are the difference between a first session that ends with "I want to build my own" and one that ends with "what just happened?".

## 2. What to fix first

Ranked by how much it costs a new player times how many meet it. S is under a day of work, M a few days.

| # | Finding | Who meets it | Size |
|---|---|---|---|
| 1 | The lesson's raid is fought off-screen | every lesson player | S |
| 2 | The gold-and-mood chapter completes by itself if the earlier chapters took over two months | many lesson players | S |
| 3 | A road that misses the diamond is laid, charged and counted for nothing, without a word | some lesson players; every player who drags a stray road | S |
| 4 | The lesson's end is a line of text that fades; no end sheet appeared in my run | every lesson player | S to check, M to redesign |
| 5 | Four rows of text stack over the top-left of a desktop map | every desktop player with an alert up | M |
| 6 | Identical alerts are not rolled into one line | players with a stalled monument or several guilds | S |
| 7 | The guidance row carries too much: instruction, progress chip, a second sentence, Show me, More | every phone player in the lesson | S |
| 8 | Screenshot mode sits in the player's menu and in the City summary | everyone who opens the menu | S |
| 9 | The title's record line is jargon ("Best: 200, bronze, seed 7, Normal, 48 x 48 map") | everyone who returns to the title | S |
| 10 | The compact landscape rail is icons only | phone players who turn the phone sideways | S |
| 11 | The score chip's icon does not read as a score | everyone | S |
| 12 | A first cold load sat on the loading screen with "Still loading. Slow connection?" showing on localhost | unknown; needs a real-device check | check |

### 2.1 The lesson's raid is fought off-screen (High, S)

**What I saw.** Chapter 7's last step says "Watch your tower stop them. 3 raiders are on the map, making for your bazaar." The camera framed the bazaar in the spotlight and dimmed everything else, the tower included. The raiders entered from the east edge, out of view, and were stopped by the tower before they reached the frame. The step ended with "The raiders turned back: Thebes is safe." I never saw a raider.

**Why it matters.** The raid is the lesson's one dramatic beat, the payoff for the tower the player just paid 150 gold for, and the first time the game shows that it fights for you. Off-screen it is a 30-second wait with a sentence at the end.

**The change.** For the raid step, light the tower and the target together and frame the band: the camera follows the raiders from the edge (the ambient camera already glides), the spotlight ring sits on the tower, and the target keeps its ring. The words can stay. The firehouse step has the same shape in miniature (my staged fire was out in about six seconds, before the camera settled on it): hold the camera on the blaze until the crew arrives and then on the crew until it is out.

### 2.2 The gold-and-mood chapter completes by itself (High, S)

**What I saw.** The "month" step ("2 months have passed, and you have 1731 gold", the step that lights the gold and mood chips and carries Ipi's line on why mood falls) checks `monthIndex(world) >= 2`, the city's absolute month. My workers step ran from day 21 to day 60 while families moved in, so by the time the month step came up month 3 had begun and the step was already done. Its card flashed and the Fire chapter opened. My mood fell from 60 to 40 during those months with nothing said about why.

**Why it matters.** Any player whose first five chapters take over two game months (families arriving slowly, a pause to look around) skips the one chapter about money and mood. Those are the two numbers the first unguided hour is about, and the 9.1 design's section 2d put the mood explanation in exactly this step.

**The change.** Count the two months from the step's own start (store the month on entry, as the staged raid stores its warning day). While here: the lesson city's mood fell to 40 for want of workers, and the alert banner was showing worker shortages at the farm, well and bazaar through chapters 4 and 5. If the lesson's homes step placed nine plots instead of six (the workers step adds three more anyway), the city would reach the hand-over without the shortage and the mood dip.

### 2.3 A stray road counts for nothing, silently (High, S)

**What I saw.** My first drag at the road step started four tiles south of the diamond (a clumsy finger would do the same). The game laid a 10-tile L-shaped road in the sand, said "Road laid", took 20 gold, and the step stayed at "0 of 9" because the lesson counts only road a cart can reach from the gate (ruling 1210). Nothing said the road did not join. A second attempt that started one tile off the ghost did the same. Only a drag that began on the diamond itself counted.

**Why it matters.** This is Josh's own "stuck road" from ruling 1210, still never proven on a phone, and I could reproduce the feel of it with a mouse. The player has done what the card said, seen "Road laid", and the step has not moved. Undo is in the toast, but nothing tells them to use it.

**The change.** Two parts. In the lesson: snap a road drag's start to the nearest end of the existing road when it begins within two tiles of it, and refuse a start further away with the reason in the confirm bar ("Start on the diamond at the end of the road"). In the game: a road piece that touches no other road and no building gets the same amber dashed outline and "no road" badge a roadless plot gets, and its toast says "Road laid: it joins nothing yet". Plots and buildings already have the road-later state; roads should too.

### 2.4 The lesson's end (High to check, M to redesign)

**What I saw.** After the raid: a "Raid beaten, 3 of 3 raiders stopped" toast, then the guidance row "The raiders turned back: Thebes is safe. Your first city stands. Go to the title to found your own when you are ready." A few seconds later that row was replaced by a tip, "New: a Large plot, in Homes" (the Large plot the player placed in chapter 2), and the goals strip ("7 of 11 Build a temple"). The code has a `lessonEnd` sheet ("Your first city stands") that opens only when no sheet, dialog or building action is up; in my run it did not open, so the end was a sentence that scrolled away.

**Why it matters.** The end of the lesson is the moment the game asks for the second session. Right now it does not ask. "Go to the title" assumes the player knows the title is behind the menu. The Large-plot tip right after the lesson is noise about something already taught.

**The change.** First find out why the end sheet did not show (the raid report toast or the tip may hold the slot; a test that plays the lesson to the end and asserts the sheet is up would pin it). Then make the end a real moment: a card with the city's numbers (people, gold, the raid beaten), what the player learned in one line each, and two buttons, "Keep building this city" and "Start my own city", with the lesson's cards and seed 7's best under them. Suppress tips about anything the lesson already placed (the Large plot, the tower, the firehouse) for the lesson city.

### 2.5 The desktop's top-left stack (Medium, M)

**What I saw.** At 1280x800 with a raid warning up, the top-left of the map held, in order: the two-line banner with four buttons (View, Pay tribute, Shrink, +1 more), the goals strip (goal, reward, Show me, Goals, Skip guide), the rank bar ("Market town: 164 of 250 people") and an Ipi tip. Together they covered about 40% of the map's height and the banner's bottom edge ran under the goals strip. The 9.1 follow-ups list this as "partly fixed".

**Why it matters.** The spec's first interface rule is that things to read sit at the top and nothing floats over the map's middle; four rows at the top left are a column of text where the city should be. The side panel to the right has room.

**The change.** On the wide layout, give the goals strip and the rank bar a home in the side panel, above the minimap (the panel already holds the details card below the tray), and leave the top-left to the one banner and one tip. The "+N more" alerts belong in the panel too, as the minimap sheet's list. On phones nothing changes; the mobile budget already holds.

### 2.6 Alerts that repeat (Medium, S)

**What I saw.** The sample city's alert list read "Builders' guild is short of workers" four times in a row, with 11 alerts in all. Only fires roll up ("3 buildings on fire").

**The change.** Roll any alert with the same words into one line with a count ("4 builders' guilds are short of workers") whose View steps through them, as the fire row does. This is the spec's rule already (section 6.3, "Repeats roll into one line"), applied to every kind.

### 2.7 The guidance row carries too much (Medium, S)

**What I saw.** At the road step on a 375 wide phone the row read: "Roads · Drag west from the end of the road (the diamond). 0 of 9 A road joins your village to th… More ▾ Show me", with the second sentence clipped mid-word behind the More toggle. Four elements compete in two lines.

**The change.** One instruction per row, bold, with the progress chip at its end; the "why" sentence lives on the chapter card (where it already is) and behind More only if it must stay. Clip at a word, never inside one.

### 2.8 Screenshot mode in the player's menu (Low, S)

It appears in the game menu between How to play and About, and again in the City summary under Share score. It is a tool for taking pictures, not a game action. Move it into Options (Display) or make it a long-press on the Menu button; keep Share score where it is.

### 2.9 The title's record line (Low, S)

"Best: 200, bronze, seed 7, Normal, 48 x 48 map" is the game's own bookkeeping shown to a player who has played once. Say "Best reign: 200, Bronze" and put the seed, difficulty and size behind a tap or in the Rulers list.

### 2.10 The compact landscape rail (Low, S)

On a phone held sideways the right-hand rail shows five icons (═ ⌂ ❋ ✚ ⛊) with no words, while the portrait dock labels every category. A first-time player turning the phone loses the labels. Add the word under each icon at a small size, or a tooltip on first touch.

### 2.11 The score chip (Low, S)

The fifth chip in the top bar shows a figure that looks like a jar or a stamp beside a number that changes every few seconds (121, 152, 184, 164 in my lesson). Its explainer is good once tapped, but the icon does not say "score". A laurel, a medal outline or the word "Score" at 125% text would.

### 2.12 The first load (check)

On the first open in a fresh browser pane the loading screen showed "Still loading. Slow connection?" (the 15-second line) while the title card was already in the page, so the overlay either outstayed the title or the first load stalled for over 15 seconds on localhost. Later loads were under a second. I could not reproduce it, so this is a check for the real-phone pass: open the live site cold on mobile data and time the title. The 9.1 profile already has cold load at 16.6 seconds on throttled 4G against a 5-second target, so the loading screen will be seen by real players; it should never outstay the title.

## 3. Visuals and art

**What works.** The style brief (a code-drawn New Era look, cool shadows, stacked whitewash, rugs, painted monuments, blended terrain) is met. Zoomed out, the city reads as a place: the river's green band, red floodplain, dunes and rocky belts blend without tile seams; the city's roofs make a pattern. Zoomed in, the houses are the best thing on screen; the rugs give every street colour. The pyramid under construction, with its brown core and white casing climbing, is a good monument sprite. The frieze band under the top bar and over every sheet, the cartouche-shaped headings and the ankh in the title are the right amount of Egypt.

**What to improve.**
- **Roads** are flat beige ribbons with a thin edge. They are the city's veins (the roadmap's own words) and the one thing every building touches; a little wear in the middle, a kerb shadow on the low side, and a darker tone where carts run would ground every street.
- **Housing plots** (the outlined square with a house icon) read as interface, not world. Pegged-out ground with a few stakes and string, or a sand square with a shadow, would sit in the scene while still saying "a home goes here".
- **Problem markers** are heavy in a troubled city: the sample city had a red badge on a stem over every roadless plot group and every short-staffed guild, plus a red footprint ring on each. In the zoomed-out view they outnumber the buildings. Keep one badge per cause per group (the spec's rule), and at the far zoom buckets drop the rings and keep the badges.
- **Burnt ground and rubble** are dark grey blotches; in the sample city they looked like a rendering fault beside the clean houses. A charred wall stump and a scatter of blackened bricks would read as damage.
- **The default phone framing** at zoom 1 shows more sand than city once the city is a few streets deep. A "frame the city" tap on the minimap button (or a double tap on the Map corner) that fits the built area to the screen would help every phone session start on the city, not the desert.
- **Day and night** (6-minute cycle) and the seasons wash were not judged here; they are on by default and worth a look on a real phone in sunlight, where a blue night wash can make the map hard to read.
- **Music** has been heard by no one but its author's tools (8.2 shipped it "unheard by anyone yet"). It is on by default at 30%. Listen on a phone speaker before the store build.

## 4. Interface

**Information architecture is right.** Read at the top, act at the bottom; one sheet at a time; every sheet has a title cartouche and a close; every building sheet says what the thing needs next with a price and a Show me; City advice ranks the city's problems. The Welcome back sheet (people, gold, mood and score with up and down arrows, then the open goals, then Carry on or Stay paused) is a model of how to re-enter a saved game. The New city card's map preview with "Another" is a good touch.

**Things to tidy.**
- **The tray cards** carry two badges at once ("New" and "Suggested" on the Large plot). One badge per card; "Suggested" wins while the lesson or advice points at it.
- **The tray lists every cost twice**: "Grain farm, 60 gold, Costs 46 a month · 10 workers" on the card and again in the confirm bar with "Monthly balance becomes −4". That is the right detail in the bar; on the card the price alone would let the pictures breathe.
- **Toasts** ("Road laid · Undo", "Bazaar placed · Undo") land in the lower-middle of the map, at times over the thing just placed and over the Play corner. The dark ink box on the parchment map is the heaviest element on screen. A parchment toast with an ink outline, docked just above the tray, would be quieter.
- **The dock's category buttons** came back with no accessible name in the accessibility tree (the label is a span inside the button; the icon may be taking the name). Worth a check with a screen reader; the fix is an aria-label on each.
- **"I've played before"** on the lesson's first card and on the title does two different things (skips the lesson and starts a city at once from the title; leaves the lesson from the card). One name, one meaning: "Skip the lesson" on the card.
- **The New city card** puts the destructive note "Starting a new city replaces your saved one" in small grey text under Start. The title's New city already asks and offers Export first; make sure the menu's New city does the same, and give the note the amber style the game uses for warnings.
- **Options** is long (sound, display, controls, on a fire, help, saves, dynasty name, About) in one scroll. Three tabs or collapsible sections would help, with About last.

## 5. Game design

**The loop is sound and the depth is real.** Nine house tiers with needs that compound (water, food, temple, goods, entertainment, luxury), production chains, trade with switches and floors, raids with matchups, fire and sickness, monuments as the long goal, the court's demands, seasons and the Nile, a dynasty of heirs with traits. The goals strip with Show me turns that depth into a chain of next steps, which is why a new player can get through it.

**Where it is thin for the first two hours.**
- **The lesson teaches placing, not deciding.** Every step says where to put the thing; none asks the player to choose between two things. One choice, even a small one ("a well or a bazaar first? The homes say which they need"), would teach the sheet-reading habit the rest of the game relies on.
- **Workers are learnt too late.** The 40%-of-people-work rule drives every shortage alert, and the lesson first mentions it in chapter 5 after four chapters of "Not enough workers" alerts. Say it in chapter 2 when the plots go down ("About four in ten people here will work").
- **The first unguided hour has one voice too many.** After the hand-over the goals strip, the rank bar, Ipi's tips, City advice's dot and the alert badge all ask for attention. The goals strip should lead; tips should wait until the goal in view is done or ten minutes have passed, whichever is later.

**The middle game.** 8.4 gave gold jobs (tax rate, rushed courses, luxury imports) and brought raids to every 6 to 10 minutes; 9.0 gave a reason to retire a city. Those are the right levers. Two things to watch in the next balance pass: the 9.1 follow-ups still show three heirs that cannot win the great work and seed-5 raids lost by every heir, so heirs feel harsher than the Steady; and the court's output ignoring the flood means a low-Nile year asks a farm town for more than it made.

**Retention.** 9.2 "Weekly decree" is the right next content: a fixed-length run with a twist, the same map for everyone, and a score that travels by link. Two notes for its design: show the decree's twist on the New city card as a picture card, not a sentence, and let the weekly result write itself into the Rulers list with the week's name so the list becomes the player's history across both modes.

## 6. A proposed shape for the next release

A "9.1.1 Finishing the lesson" patch that ships the fixes in 2.1 to 2.4 and 2.6 to 2.11 (all S, one lesson track and one interface track, a day or two each), then the desktop stack (2.5, M) as its own track, then the real-phone pass with the 2.12 cold-load check at its head. 9.2 "Weekly decree" follows on a lesson that ends properly.

What I would prove before shipping it:
- A test that plays the lesson with a stray first road and asserts the refusal (or the snap), then to the end and asserts the end sheet is up with both buttons.
- A test that enters the month step at month 4 and asserts the step waits two more months.
- A screenshot at 1280x800 with a raid warning, a goal, a rank bar and a tip, asserting at most two rows over the map.
- The lesson's raid step with the camera on the band: a screenshot with a raider in frame.

## 7. What I did not look at

Sound and music (no audio in the review pane), the installed app and offline start, the share link and rivals, trade partners and the Quay, the court's letters and the dynasty's Pass the throne sheet (the sample city had not reached City), the Huge map on a phone, 125% and 150% text, and anything on a real device.
