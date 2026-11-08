# Thebes at 9.1: the deeper review

**Date:** 8 November 2026, against main at 42b1dce (9.1 "First hours", live). This follows `2026-11-08-design-review.md` (the first pass: the lesson, the first hour, the surface) and does not repeat it. Where the two overlap, the first review's numbering (2.1 to 2.12) is referenced.

**How this one was done.**
- **Played:** the lesson again at 150% text; the mid-game systems through the dev scenes (trade, the court's letter and demand, the palace's tax rate, a Fine manor and an Estate's sheets, a festival, night, the plague and health layer, four pyramid styles, the grand district); a **six-year Capital city** built by the game's own scripted player (`tests/stage4/balance/capitalRun.js`, 72 months, dangers on) saved into the slot and reopened on both a phone and a desktop viewport, where it has 207 people, mood 14, three fires and 90 alerts; the debt sheet (treasury set to -300); the error card (`?crash=tick`); Pass the throne through to the heir's first screen and the Rulers list.
- **Audited in code** by three agents: every player-facing string (words), the CSS and interface code against the spec's accessibility promise, and the design data and sim rules (balance). Their findings are in sections 5 to 7, each checked against the code before it was kept; the ones I could not verify say so.
- **Still not done:** anything on a real device, sound and music, the share link opened by a friend, install and offline, the Huge map on a phone.

**For Josh:** section 1 is what changed in my view after going deeper. Section 2 is the new findings, ranked, each with evidence and a fix. Sections 3 and 4 are what held up well and the visual notes. Sections 5 to 7 are the three audits. Section 8 is a release plan that folds both reviews together.

## 1. What the deeper look changes

The first review said the game is in good shape and the gaps are moments. That still holds. The deeper look adds two structural things.

**The game is quieter than it should be at the start and louder than it should be later.** Early on, a new player's bazaar and temple stop for want of workers because the labour order fills the firehouse first, and nothing says so plainly; the lesson's own alerts show it. Later, a troubled Capital shows 90 alerts, a Map badge of 88, a red marker on nearly every building and a letter from someone every 78 seconds across four separate streams (events, requests, demands, cards). City advice ranks the problems well, but the rest of the interface does not defer to it.

**Several of the game's own rewards do not reward what it teaches.** Bronze comes almost free before Town; the score falls as the city grows because fire and defence start counting at Town and Market town; three newer monument kinds add nothing to the score once the old "one of each kind" total is reached; the Villa, the hardest house step, pays the least; and two of the five heir titles are not trade-offs at all. None of this is visible in a first session, which is why 9.1 did not touch it, but it is what a player who stays will feel in hours three to ten.

Everything else below is a sheet, a row or a number.

## 2. New findings, ranked

S is under a day, M a few days, L a week or more.

| # | Finding | Who meets it | Size |
|---|---|---|---|
| D1 | The labour order starves the bazaar and temple while a firehouse stands, before fire can even start | every new city | S |
| D2 | Alerts do not scale: 90 lines, a badge of 88, the same remedy sentence repeated 40 times | every mid-game player with trouble | M |
| D3 | The score misleads: Bronze nearly free, the score falls as the city grows, newer monuments score nothing | everyone who looks at the score | M |
| D4 | The dynasty's big moment is a toast | everyone who passes the throne | M |
| D5 | Four letter streams arrive at about one every 78 seconds from Market town | every mid-game player | M |
| D6 | The Villa step is the steepest and pays the least, and its luxury need has no goal | players at Great city | S |
| D7 | The middle monuments leave 12 to 18 minutes with nothing required | players who build a colossus or mastaba | S |
| D8 | Two heir titles are not trade-offs; the Builder is almost always the title; the Merchant bar is out of reach | players after a first Pass | S |
| D9 | Peaceful and Relaxed do not say what they still include | players picking a difficulty | S |
| D10 | The 125% and 150% text sizes hide words instead of enlarging them | large-text players | S |
| D11 | Dialogs and sheets do not manage focus; pinch zoom is off; Esc advances the lesson card | keyboard, screen-reader and low-vision players | M |
| D12 | Cartouche headings and ruler names wrap in the 320 px side panel | desktop players | S |
| D13 | The heir's city opens with the beginner's goal guide and a surprise map | everyone after a Pass | S |
| D14 | The debt sheet says "No other way is open" without saying why | players in debt with trade | S |
| D15 | Small things: the "Swift Town" feat is unreachable-by-accident, the install ask shows twice on the heir's screen, the health "crowded" term, the stale prestige comment | few | S each |

### D1. The labour order starves services (High, S)

**Evidence.** `src/data/labour.js:2` fills workplaces in the order essential, safety, services, industry, monuments. A firehouse (4 workers) is "safety"; the bazaar and temple are "services". At 50 people a village has 20 workers: the farm and granary take 16, the firehouse 4, and the bazaar and temple get none. Fire risk only starts at Town (`src/data/fire.js:6`). In my lesson run the banner read "Not enough workers for water and food", then "Not enough workers for services" and "Bazaar is short of workers" from chapter 4 through the hand-over; mood fell from 60 to 40.

**Why it matters.** The first thing a new player builds after the lesson's firehouse is a second firehouse, because the tip and the goal say so, and their homes stop growing for want of food and faith with no sentence that connects the two.

**The change.** Rank services ahead of safety until the city is a Town (the rank at which fire starts), or unlock the firehouse at Town (`src/data/progression.js`) with the lesson's copy kept through `lessonCards`. Either way, the "short of workers" alert for a bazaar should name the cause: "Its 6 workers went to the firehouse first. More homes bring more workers."

### D2. Alerts at scale (High, M)

**Evidence.** The six-year Capital, reopened: the Map badge says 88 and the Minimap sheet lists 90 alerts; "Firehouse is short of workers · More homes bring more workers · View" appears seven times, "Grain farm has nowhere to store its grain · Build a granary within 12 road tiles" six times, and the crime alerts come as "9 homes have a high crime risk. 5 homes ... 17 homes ... 9 homes ... 1 home ..." (one per street). Only fires roll up (`src/ui/alerts.js:5`). On the map, a red "!" on a stem stands over nearly every building and a red ring on each footprint.

**Why it matters.** A player who leaves a city for a week and comes back to this cannot tell the three things that matter from the eighty-seven that follow from them. The badge "88" is not information.

**The change.** Three layers.
1. **Roll up by cause**, not only fires: "7 firehouses are short of workers", "6 farms have nowhere to store grain", "41 homes have a high crime risk", each with one View that steps through them (the fire row already does this).
2. **Lead with City advice.** The Minimap sheet's alert list opens with the three advice lines (it already ranks them) under "Fix these first", then the rolled-up list. The badge counts rolled-up rows, not buildings.
3. **Markers at a distance.** At the zoom buckets where a badge is wider than a tile, show one badge per rolled-up row (on the frontmost building) and drop the rings. The spec already says one badge per group; apply it per cause.

### D3. The score misleads (High, M)

**Evidence** (verified in `src/data/scoring.js` and `src/sim/score.js`). Safety is fire 40, defence 40, record 20; before Town fire cover scores full and before the raid clock defence scores full, so a brand-new village has Safety 100 (I saw it: Safety 100 on day 1 in the City summary, Safety 60 the moment a raid scene was loaded). Medals are at 200, 300 and 400 raw points, so Bronze is reachable with a bazaar, a temple, a few homes and no danger yet. In my lesson the score read 121, 152, 184 and then 164 at the hand-over as the terms went live. Monuments score `100 × sqrt(prestige / 700)` with 700 described as "one of each kind" (`src/data/monuments.js:112-113`); ten kinds now sum to 1,080, so the sphinx, sun temple and step pyramid add nothing once the older seven stand. Growth is capped at Capital, so Great Capital and the Seat add nothing.

**Why it matters.** The score is the game's own voice on how the player is doing, and it says "well" at the start and "worse" as they grow. The medals and the Rulers list carry it forward for good.

**The change (score v3, a version bump so old bests keep their label).** A term that has not started yet counts as not started, neither 100 nor 0 (the safety parts are simply left out of the total and the ceiling until Town and Market town); medals at about 240, 320 and 400 of the parts' total, re-measured on the scripted cities; `PRESTIGE.scoreFull` raised to the sum of every kind; the growth term extended to the Seat. The chip's explainer should say what will start counting next ("Fire safety counts from Town").

### D4. The dynasty's moment is a toast (High, M)

**Evidence.** Pass the throne's sheet is good: "Ramesses I will be remembered as the Steady", why, the runner-up, what the heir gets, the sealed score, the dynasty's name, Export first. But confirming it drops the player onto the New city card (difficulty, map, Start), and the heir's first screen is two ink toasts stacked bottom-left: "Install Thebes to keep your rulers · Install" and "Ramesses I is remembered as the Steady. The heir's city begins." Then the beginner's goal guide: "1 of 11 Lay a road: buildings need one". The Rulers sheet shows the ruler as "Ramesses / I the / Steady" on three lines beside a map thumbnail and repeats the install ask above it.

**Why it matters.** The dynasty is v9's headline. The sealing of a six-year reign and the start of the next should be the most ceremonial ten seconds in the game, and today they are the least.

**The change.** One card between the Pass sheet and the New city card: the sealed ruler as a cartouche (name, regnal number, title, years, rank, score, the map square), one line of what the heir inherits, and a single button, "Found the heir's city". The heir's first screen opens with the heir's caption as Ipi's line (it exists as `heirCaption`) and no install toast for the first game month. The Rulers row gets the name on one line (truncate with a tooltip, or drop "the" to a second line by design) and one install ask, at the top of the list only.

### D5. Four letter streams (Medium, M)

**Evidence** (verified in the data). City events come every 5 to 9 months from Town (`src/data/cityEvents.js:15`), court requests every 8 to 14, demands every 10 to 14, court cards every 12 to 18; together about 0.38 a month, or one letter about every 78 seconds at 1x from Market town. In the dev scenes two arrived within a day of each other ("Court: 100 gold in 4 months" as a banner and "The court demands 400 linen" as a picture card over an open sheet).

**The change.** One court stream, one letter open at a time, drawn from all four kinds with a single gap of about 5 to 8 months. The banner and the card are the same letter. The eight court cards and sixteen events share one shape (an offer with a fee), so one sheet can show them all.

### D6. The Villa step (Medium, S)

**Evidence** (verified, with the figures as calculated from `src/data/housing.js`). From Fine manor (125 people at tax 5) to Villa (150 at tax 6) adds three needs (linen, a third food, an imported luxury) and 15 desirability, for about 275 more gold a month, of which about 135 goes back out in cedar at 45 gold each. The luxury need appears nowhere in the goals list (`src/data/goals.js` covers the third food and the Villa street but not "open Byblos and buy cedar"); only City advice and the house sheet mention it.

**The change.** Villa tax 6 to 7, or the luxury rate halved, with the balance pins re-measured; and a goal at Great city, "Open a route that sells a luxury", so the chain is taught before a sheet says "Missing".

### D7. The middle monuments (Medium, S)

**Evidence** (calculated from `crewMonths ÷ crews` in `src/data/monuments.js`): colossus 24 months (12 minutes at 1x), small mastaba 36 (18 minutes), large mastaba 60 (30 minutes), with nothing the game asks of the player meanwhile. The great pyramid at 90 minutes is the long goal by design, but the middle rungs are long without being the goal.

**The change.** Small mastaba 108 crew-months to about 72 and colossus 48 to about 36 (re-pin), and a monument site that has gone a game month without the player opening its sheet gets one caption with its percentage.

### D8. The heir titles (Medium, S)

**Evidence** (verified in `src/data/dynasty.js` and `src/sim/dynasty.js`). The Unconquered's weakness (first warning 100 days sooner) touches one raid; the Generous's weakness (High taxes worth +15% not +25%) costs nothing unless High is used, while arrivals are housing-capped so its strength is small too. The title is the highest measure over its bar, uncapped, so a Builder's "4,600 units" fit runs to 3 or more and wins against every other title. The Merchant's bar (trade at 40% of bills) needs about three quarters of every partner's quota sold; the data's own comment says the share bars were earned only by a fixture. Ruling 1734 accepted the heirs' misses.

**The change.** Cap each title's fit at 2 so the titles compete; give the Generous a permanent cost (taxes x0.95) and the Unconquered a lasting one (every warning 30 days sooner); Merchant bar 0.40 to about 0.25; then rerun the P8 heir probe with the adaptive scripts.

### D9. Peaceful and Relaxed (Low, S)

**Evidence** (verified in `src/data/difficulty.js`, `src/data/hazards.js:33-38`, `src/data/s47.js:146`). Peaceful's card line is "No raids, sickness or thefts; buildings 20% cheaper." Droughts and locusts still come at half strength from year 3, fire still runs at half rate, and the yearly tribute quota applies at every level. The cost factor scales prices but not wages or upkeep, so "20% cheaper" is a one-off discount, not a cheaper economy.

**The change.** Either the words ("Low Niles and locusts still come, rarer") or the data (off for Peaceful). The stale comment in `difficulty.js:2-4` says risk scales fire and raids only; it also scales sickness and theft.

### D10. Large text hides words (Medium, S)

**Evidence** (`css/ui.css:604-606, 1380-1381, 1384, 373, 400, 506, 1446, 1529`). At 125% and 150% on phones the layer keys, legend names, ground-room keys, the tip's label, the caption's reason and the top bar's stat labels move to screen-reader-only text. A player who turned the text up to read it is given hatch, ring and tick shapes instead. (Seen at 150%: the top bar kept to one row with pictures, which is fine; the Layers legend lost its words.)

**The change.** Wrap or shorten at large text, never hide. Where a row cannot fit, a second line beats a glyph.

### D11. Focus, zoom and Esc (Medium, M)

**Evidence** (from the accessibility audit, checked at the lines named). The confirm dialog has no Tab trap, re-focuses Cancel on every store change (`src/ui/menu.js:259-275`) and does not return focus on close; `#dialog` has no z-index, so an open confirm bar (z 3) or Layers popover (z 6) paints above its scrim outside the lesson. Sheets move focus in only when opened by keyboard (`src/ui/sheets.js:487-513`) and never restore it; nothing behind a sheet is inert. The viewport blocks pinch zoom (`index.html:5`) and the text setting stops at 150%, so there is no path to 200%. Esc on the lesson card advances the step (`src/ui/lessonCard.js:123`). Screenshot mode hides every control including its own exit (`css/ui.css:676`). There is no `color-scheme` declaration, so Android's forced dark mode can invert the parchment.

**The change.** Trap and restore focus in the dialog and sheets, give `#dialog` a z-index above the popovers, allow pinch zoom and add a 200% step, make Esc on the card mean Leave (Enter and Space stay Go), give screenshot mode a small pinned "Show interface" button, and add `<meta name="color-scheme" content="light">`.

### D12. Wrapping in the side panel (Low, S)

**Evidence.** At 1280x800 the cartouche heading broke across two lines for "Pass the / throne" and "Your heir's / city", and the ruler's name across three ("Ramesses / I the / Steady"). The panel is 320 px; the cartouche's padding and the close button leave about 180 px for the words.

**The change.** Let the cartouche take the full row with the close button above it when the title is long, or set the long titles shorter ("Pass on", "Heir's city"). Ruler rows: name and number on one line, the title under it.

### D13. The heir's first city (Low, S)

**Evidence.** After the Pass the New city card preselected Surprise me (a Lake-fed map), and the heir's city opened with "1 of 11 Lay a road: buildings need one" and "Skip guide", the same guide a first-time player gets.

**The change.** After a Pass, the guide starts at the first goal the player has not already met in a previous reign (Town's), and the map defaults to the sealed city's layout with Surprise me a tap away.

### D14. The debt sheet's "No other way" (Low, S)

**Evidence.** On the Capital in debt the Back to gold sheet listed the three biggest costs with Pause and then "No other way is open to this city yet. Pausing is the way." The city has a trading post, an open Memphis route and sell orders, but no palace (so no tax lever) and no surplus above its Keep floors (so no sell lever, `src/ui/v91/debtSheet.js:57-70`). The sheet was right; it did not say why.

**The change.** Name the closed levers: "No palace yet: taxes cannot be raised. Nothing above your Keep floors to sell." Each with a Show me where there is one.

### D15. Small things (Low, S each)

- The "Swift Town" feat is "Reach Town before day 720" (`src/data/feats.js:29`); a reasonable city reaches Town around day 180 to 200, so every player earns it without noticing. About day 300 would be a feat.
- The install ask ("Install Thebes to keep your rulers") shows as a toast and again at the top of the Rulers sheet on the same screen.
- The health rule's "crowded" term (more than 20 residents a tile) is true for every Townhouse and up by definition, so it is a constant, not a signal (from the audit; not verified in play).
- The scripted Capital city ends its six years at mood 14 with 207 of 398 people left and three fires: the balance runs' "Capital" is a city a player would call a disaster. The scripts are tools, not players, but the numbers they pin are what the game is tuned to.

## 3. What held up well, seen deeper

- **The Welcome back sheet** on the six-year city: people, gold, mood and score with arrows, the monument sites' state in one line each, the open goals, today's goals, the closest achievement, then the alerts. Carry on or Stay paused. This is the best returning-player screen I have seen in a browser game.
- **Back to gold:** income and costs this month, the three biggest costs with Pause and what pausing does to their workers, the months left, what -500 stops, and the levers the sim will honour. Only D14's wording is missing.
- **The house sheets' "Next step"** with a price and a Show me at every tier, up to the Estate's "Build a trading post (150 gold), then open a route to Byblos (600 gold) and buy cedar (43 gold each)". Long, but true and complete.
- **The palace's tax sheet:** each rate with its gold a month and its mood before the tap, and "The score counts taxes at Normal."
- **The court's demand as a picture card** at its first moment, with met, failed and declined spelled out before Accept.
- **The error card:** "Something went wrong. The game has paused. Your city was last saved this month." then Reload from the save, Export this city, Copy the details, each with one line of what it does. Calm and exactly right.
- **Night** (lamps on the homes and the temple, the river darkened, the interface unchanged) and **the festival** (figures in the street, the "Festival held" toast) make the city feel lived in. The four pyramid styles are subtle but real.
- **At 150% text** the top bar keeps to one row with pictures, the banner and goal rows stay two, and the house sheet reads well.

## 4. Visual notes added

- **The red tide.** On a troubled city the problem markers and footprint rings are the dominant visual. D2's roll-up fixes most of it; the rest is the ring's weight (2 px with a white halo on every footprint reads as a wireframe at zoom 0.5).
- **The health layer's bullseyes** (a ring with a cross on every home with people) are heavier than the ground overlay's hatches; the layer should use the same language as the others.
- **Empty desert at the start** is worse after a Pass: the heir's Lake-fed map opened on sand with the road end in the lower right and the city's green a screen away.
- **The dark rubble** seen in the first review was confirmed as burnt buildings; it still reads as a rendering fault next to clean houses.
- **The dynasty has no face.** No cartouche art for a ruler, no portrait, no seal; the Rulers list is text and a map square. A code-drawn cartouche with the ruler's name in a frame would carry the whole feature's weight.

## 5. Words, from the audit

About 2,400 strings were read (`src/ui/text.js` and the per-version text files, the lesson, the picture cards, advice, goals, releases). The quoted lines below were checked in the file. The voice is calm and plain and "Pharaoh" appears in no game text (ruling 379 holds). Three things to fix, in order.

**5a. Developer voice in player places.** How to play and What's new carry change-log sentences: "A raid now plays out on the map" (`text.js:3236`), "(an older city loaded into this version gets three years from the day it loads)" (`3125`), "The view cannot zoom out past where a Huge map costs more to draw than a Large one, which a very large screen may notice" (`3260`), and in releases "Pausing no longer rebuilds the map layers for nothing", "The picture draws at most 60 frames a second and no finer than twice the pixels". Every What's new heading prints a git hash ("· build 1d937a4", `text.js:2449`). The error card's "Where: the day's tick" (`4609`). The top bar's short date is "Y1 M3" (`433`). The fix is a rewrite pass with one rule: a sentence a player cannot act on or feel is cut.

**5b. One thing, several names.** "Guide" (the goals strip: "Skip guide", "Guide and tips") against "Lesson" (Ipi's city) against the title's "Play" button, so a player cannot tell which skip skips what. The advice sheet is "City advice", "The scroll button", "Messages and advice" and "Ipi suggests". "Home" in the menu goes to "the title screen", "the title card" and "the title". "Layers" is also "the overlay". "Options" was "Settings" in older release notes. "Reduce motion", "Gentle", "Still" and "Ambient motion" all name motion, and the 8.0 note says the Motion row is gone while rows for it remain in the text. "Fetch" survives in the 4.7 to 6.0 release notes after 8.3 renamed it. "Plot", "lot", "square" and "tile" are mixed in placing messages ("3 of 4 squares are taken"). "Great city" is lowercase and "Great Capital" is not. One glossary, one sweep.

**5c. Unexplained words at the gate.** "Needs 30 prestige (you have 20)" (`1235`) comes before prestige is defined (the first-monument tip does it later). "Seed 482113" and "Start this seed" in the share and ruler text; the title's record lines show a nine-digit seed. "Friends' honour: a link can't be checked without a server" (`1041`). "Desirability" as a bare number beside "nicer" and "a pleasanter street". "Move the ghost", "(wide: Goals)" and "(the diamond)" in help and lesson lines name things the player has never been shown. Define each at first sight or use the plain word ("map number", "monument standing").

**Rows that are too long for a phone.** Advice and alert rows of 100 to 154 characters (`text.js:3805, 3095, 3083, 2899`, `nextStepText.js:107`), legend words of 115 to 125 (`2718, 2732`), lesson confirms of 150 to 199 (`3288, 3315, 3323`), and the "Keep stocked and supply lines" help entry at over 700 characters (`4083`). The lesson's leave confirm says the place is kept and then that the streets are not (`3288`): one honest sentence would do.

**Numbers.** Prices and thresholds are templated from the data; the few literals that could drift are "of 50 desirability" (`1007`), "last 6 months" (`753`), "two months ahead" (`3112, 3126`, templated elsewhere), "a quarter of its founding" (`1339`), the daily goals (`451-454`) and the goals list, and every figure frozen in a release note.

**The best of the voice**, worth protecting: "Children chase each other between the houses at dusk", "The masons sing as they haul the blocks up the ramp", "Time passes only while the game plays", "I lit a small fire in the bazaar, for practice", "The king has heard of Thebes: it is a town now", "Undo this? People who moved in will leave."

## 6. Accessibility, from the audit

The system is better than most game interfaces: a 44 px tap token, aria labels on nearly every icon button, progress bars with a visible number, glyph and hatch cues in the legends, a contrast test in the suite. Contrast computed from the tokens: ink on parchment 13:1, teal text on parchment-2 is 4.35:1 (just under 4.5, and the teal class is used on parchment-2 panels such as rulers and shared scores), meter tracks at 1.19:1 against their panel (non-text, needs 3:1). Two sizes fall under 12 px (the layer lock glyph and a locked layer's name), and the badge, the error details and the chevron do not scale with the text setting. The "More ▾" links are about 18 px tall. The live region for alerts flips between assertive and polite as its text changes, which some screen readers do not announce. D10 and D11 above carry the fixes; the remaining list is: extend `src/ui/theme.js` TEXT_PAIRS to every real pair (it has 14 and misses the coral, amber, lapis and parchment-2 pairs), darken the teal text token to about #1A5F57, raise the two sub-12 px sizes, and give the minimap canvas a role and a keyboard handler.

## 7. Design and balance, from the audit

Verified against the data unless marked.
- **The house ladder is sound in order:** nothing is needed before its building can be unlocked, and homes stock next-tier goods early. The payoff curve is front-loaded (Cottage to Townhouse triples then doubles gold per plot; later tiers add 12 to 30 residents each), the Manor is a weak step (100 people against four Townhouses' 88, with a booth, desirability 20 and knowing about Large plots), and the Villa is D6.
- **Money in the first hour is fine; workers are the brake** (D1). The sensible opening runs -60 to -113 a month in months 2 to 5 and turns positive at month 6 (the 13 Oct economy review); the gold chip goes amber six months out and the tip fires at three; plots cost 5 and pay back in a month, so there is no cash dead zone.
- **Pacing:** a day is a second at 1x; Town in about 3 to 3.5 minutes, Market town about 4, Capital about 8.5 on the scripted builds; the first raid about 6.5 minutes after Market town, then one every 7.5 to 11.5 minutes; the dangers held off for three years (18 minutes). The quiet spans are the 5 minutes between the tower and the first warning, and the middle monuments (D7).
- **Luxury supply caps the top tiers:** yearly quotas of cedar 240, ivory 80 and incense 120 feed roughly 10 to 12 Villas and Estates (calculated, not verified in play).
- **Systems that pull their weight:** desirability and the street puzzle (the best system), housing needs and chains, trade, raids. **Systems that mostly make alerts:** crime (a theft takes at most 100 gold and 1 mood), health's crowded term, seasons and the Nilometer as flavour, the four letter streams (D5). Merge candidates without loss: the court's three kinds into one; crime into the mood rule or into health's coverage service.
- **Score** is D3. Also: Peaceful gets the same medals for the same raw parts with defence free, since medals are on the parts before the factor.
- **Heirs** are D8.

## 8. A release plan that folds both reviews

- **9.1.1 "Finishing the lesson"** (first review 2.1 to 2.4 and 2.6 to 2.11, plus D1, D9, D12, D14, D15): one lesson track, one interface track, two or three days. The proofs are in the first review's section 6.
- **9.1.2 "A quiet city"** (D2, D4, D5, D10, D11, D13, first review 2.5): roll-up by cause and advice-first alerts, the dynasty card and the heir's start, one court stream, large-text words restored, focus and zoom, the desktop stack moved into the panel. Proofs: the six-year Capital reopened shows at most twelve alert rows and one badge per cause; a screenshot of the sealed-ruler card; a scripted year from Market town counts the letters (at most two a year open at once, none overlapping); the suite's mobile budget at 150% with a legend showing words; a keyboard-only run through a sheet and the confirm dialog.
- **9.1.3 "Fair score"** (D3, D6, D7, D8): score v3 with the version bump, the Villa and luxury numbers, the middle monument durations, the heir caps and bars, all re-pinned by the balance runs, with the adaptive scripts for the heirs. Proofs: a new village scores under Bronze; the score of the scripted Town does not fall when fire and defence start; every heir meets 9.0's T1 to T3 or the miss is a ruling with both numbers.
- **Then the real-phone pass**, then **9.2 "Weekly decree"**.

The order is deliberate: the lesson first because it decides the first session, quiet second because it decides whether a troubled city feels like a puzzle or a wall, score third because it only matters to the players the first two keep.
