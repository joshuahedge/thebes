# Thebes 9.0 "Dynasty": design (approved)

**Josh's answers (7 Nov 2026):** "All recommended". Every open question in section 8 (Q1-Q19) is settled at its recommendation, and the targets in section 9 stand as written.

**For Josh:** 9.0 is the third of v9's four releases (`2026-10-27-thebes-v9-roadmap-design.md`, section 4). It covers note 6, "Make the game something players keep coming back to", with the four parts of the Dynasty:
- Pass the throne;
- a title earned from the reign;
- the heir's trait;
- the ruler list, and rivals via links.

It also carries the second theme Josh asked for during 8.4: **improve the game's animations and visual effects**. That is not in the roadmap, so section 7 audits what moves today and what it costs, and proposes a ranked list.

Every number below was checked against the code on `version-9-0` (main = 8.4, 222cb61). The roadmap's numbers are where to start. Where the code argued otherwise, section 12 says so. The calls for Josh are the open questions (section 8) and the targets (section 9).

## 1. The rules for this release

1. **A legacy is a choice, never power** (roadmap rule 4). Every trait trades a strength for a weakness. The score never reads the trait, so two friends on one map play a fair game.
2. **One rule, not two.** Every trait bends a number the game already has in one place: the crews' pace, the tax factor, soldiers' pay, the first warning's day, farm and workshop output, trade prices, arrivals. Every title reads a count the game already keeps, or one new month-end count.
3. **Nothing is lost by stopping** (rule 5). A ruler is kept for good. No streaks, and no penalty for an unfinished city.
4. **No server.** Rivals travel by link, as the share link does today.
5. **Alive, not busy.** An effect earns its place by showing what the sim is doing. Each one names its frame cost on a phone, is calm under reduced motion, and keeps the hand-drawn look: path-drawn shapes in the palette, with no particles systems, blur or glow.
6. **9.1 builds on it.** The heir lives on the world, so 9.1's decree can fix it to the Steady. A ruler row can carry a mark ("Sea Peoples, week 44"). A rival is kept per map, so two friends on the same week need no new kind of link.

## 2. Pass the throne

**Today:**
- **Seal this reign** (`src/sim/score.js` `sealReign`) records `{ day, score, parts, medal, version }` in `world.seals`. It is repeatable and never refused. The score sheet's button opens a sheet that asks, then writes a chronicle entry (`records.addSeal`), shown as a stamp on the title card.
- **The great work finished** seals once by itself with `{ won: true }`, and the reign plays on (`world.reign.won`, `reign.seal`).
- **One city at a time:** a single save slot (`src/save/store.js`). New city asks the replace question ("Export first" is the extra button) and starts a fresh world from `boot.js` `freshWorld`.

**The change:**
- **Where:** the game menu gains **Pass the throne**, after New city, from City upward (400 people). It is absent below City and in the lesson. Peaceful cities pass the throne too (Q4). A one-time caption at City says it is there: "You may now pass the throne (game menu)".
- **The sheet** (one sheet, the score sheet's look):
  1. "**Ramesses II will be remembered as the Builder.**" The title, then one line on why ("12,400 units of stone and brick laid"), then the runner-up ("Close behind: the Merchant").
  2. **What the heir gets:** the trait's two lines, for example "Your heir's city: monuments rise 15% faster; taxes 5% lower".
  3. **The score kept:** "Sealed score: 392 (silver)", the best of this reign's seals and today's score (Q3).
  4. The ruler name, editable (section 5, Q9).
  5. **Pass the throne** (primary) and **Not yet**.
- **Pass the throne** opens the new-city card (8.2's, with size, layout and the map preview), headed "Your heir's city", with the trait line above Start. **Start** does both at once: it seals (`sealReign(world, { passed: true, title })`), writes the ruler row (section 5), and starts the heir's city with `world.heir = title`. **Back** returns to the old city with nothing changed.
- **A won reign** shows Pass the throne as any other City does. The ruler's score is the higher of the win's seal and the score on the day of passing, so playing on never costs a won score.
- **After passing,** the old city is gone from the slot, as with New city. The export (Options > Saves) still makes a file copy before it, and the sheet says so: "Your city is replaced by your heir's. Export it first to keep a copy."
- **New city without passing** still works as today. It starts a city with the dynasty's current heir trait (the newest ruler's title), and the abandoned city joins no list (Q2).

## 3. The title

**The rule:** at the Pass, each title compares one measure of the reign with its bar. A title whose bar is met has a fit (measure ÷ bar). The highest fit wins; a tie goes to the order in the table. With no bar met, the ruler is **the Steady**. The score sheet shows "Remembered as: the Builder" from City on, so a player can steer.

| Title | Measure (all counted over the whole reign) | Bar (first value; Q1) | Reads |
|---|---|---|---|
| the Unconquered | raids beaten, with none lost and no tribute paid | 3 raids | `tally.raidsBeaten`, `raidsLost`, `tributes` (Stage 3) |
| the Builder | monument units laid | 2,000 (a small mastaba is 2,160) | `tally.stoneLaid + bricksLaid` (Stage 4) |
| the Merchant | trade income ÷ the bills (wages + upkeep + soldiers' pay), month ends from Market town | 0.40 | new `tradeGold`, `billsPaid` (summed from `stats.lastMonth`) |
| the Bountiful | month ends with every Cottage-or-better home fed ÷ month ends from Town, at least 24 of them | 0.90 | new `fedMonths`, `townMonths` (`src/sim/feats.js` `fedNow`) |
| the Generous | month ends at the Low tax rate ÷ month ends from Town, at least 24, with High in at most a tenth | 0.50 | `taxLowMonths`, `taxHighMonths` (8.4), new `townMonths` |
| the Steady | none of the above | | |

- **Peaceful** has no raids, so it never earns the Unconquered; every other title works there.
- **An old city** (made before 9.0): Builder and Unconquered read tallies it already has. The new counts start at 0 on load, so the three share titles need 24 counted months first.
- **The bars are first values.** The balance check's probe prints every run's five measures, then sets the bars so the runs spread across titles (target T6).
- **Code:** a new `src/sim/dynasty.js` `titleOf(world) -> { id, fit, measure, runnerUp }` and `src/data/dynasty.js` `TITLES` (bars and order).

## 4. The heir's trait

**The rule:** the new city's `world.heir` is the title's id, fixed for the city's life. The trait is two numbers in `src/data/dynasty.js` `TRAITS`, read through one helper, `heirFactor(world, lever)` (1 when the lever is not the heir's). Sizes are first values (Q5).

| Heir of | Strength | Weakness | Where it bends today's number |
|---|---|---|---|
| the Builder | crews lay 15% more a day | taxes 5% lower | `src/sim/monuments.js` `baseDayUnits`; `src/sim/economy.js` `monthFigures` (on the rate's factor) |
| the Unconquered | soldiers' pay 20% lower | the first warning 100 days sooner (200 after the clock, not 300) | `src/sim/costs.js` `soldiersPayOf` (stacks with the captured weapons: 0.8 x 0.75); `src/sim/raids.js` (`nextWarnDay = day + firstWarnAfter`) |
| the Bountiful | farms yield 15% more | a low or failed flood cuts half again as deep (Q6) | `src/sim/production.js` the rate line (farms) and `harvestFactor` |
| the Merchant | partners pay 15% more for what they buy | workshops make 15% less | `src/sim/trade.js` `tradePrices` (the buys side only); `src/sim/production.js` the rate line (anything that consumes an input) |
| the Generous | 20% more arrivals | the High rate takes x1.15, not x1.25 | `src/sim/immigration.js` `monthlyArrivals`; `src/data/palace.js` `TAX_RATES.high` through `taxRateOf` |
| the Steady | a plain start | | |

- **The score never reads the trait.** The taxes term already reads `taxesNormal` (8.4, Q2), and the Builder's 5% is applied after it, so the score of a Builder heir and a Steady one in the same state is the same.
- **Words match the sim.** Every sheet that quotes one of these numbers (the site's days left, the farm and workshop rates, the Trade sheet's prices, the forecast, the palace's tax choices, the raid countdown, the arrivals line) reads it through the same helper, each with a test set up both ways.
- **Where the player sees it:**
  - the new city's first screen: one line in the goal strip's place for the first 10 days, "Heir of the Builder: monuments rise 15% faster; taxes 5% lower" (non-modal, never over the map's middle);
  - the score sheet's header ("Heir of the Builder") and the city summary;
  - a tip, `heir_trait`, and How to play's Dynasty entry.
- **Never in the lesson.** The lesson's world is always the Steady, and an adopted lesson city stays the Steady.

## 5. The ruler list

**Today:** the device's records (`src/save/records.js`, `localStorage` `thebes.records`) hold city rows and chronicle entries, each list capped at `RECORDS_MAX` 200 (the oldest go first, never a best). The export file carries the records (`packSave`'s `records`). Since 8.0 there is no import (ruling 1146), and `records.merge` is kept but unused.

**The change:**
- **A new list, `rulers`,** beside `cities` and `chronicle`, never capped: `{ id, n, name, title, heir, rank, day, score, parts, medal, version, seed, difficulty, mapVariant, mapSize, map, feats, date[, rival][, mark] }`.
  - `n` is the regnal number; `name` the dynasty's name; `heir` the trait the reign played under;
  - `map` is a 32 x 32 map square (`share.js` `drawMapSquare`'s colours as a 1,024-character string, about 1 KB), drawn as the row's picture;
  - `mark` is 9.1's ("Sea Peoples, week 44"), absent in 9.0.
  - About 1.3 KB a ruler: 100 rulers fit in 130 KB of `localStorage`.
- **The dynasty's state,** `records.dynasty = { name, heir }`: the name chosen once, and the heir a new city takes (the newest ruler's title; the Steady on a new device).
- **What the list shows** (a sheet from the title card's records box and from the game menu, **Rulers**):
  - one row a ruler, newest first: "Ramesses II the Builder", rank, years (`day / 360`, one decimal), score and medal, and the map square;
  - a row opens to its parts, its feats, the heir it played under and, when it has one, the rival side by side;
  - **Play this map** (Q7) starts a new city on that seed, level, layout and size, through the new-city card's replace question.
- **The backup:** the export file already carries the records. A new **Bring rulers from a file** in Options > Saves merges a file's rulers and rivals into the device's (Q8). Cities are never imported, so ruling 1146 stands for cities.
- **The install ask** (Q10):
  - after the first Pass, on a device that is not installed: the ruler list's top line and a one-time toast say "Install Thebes to keep your rulers: Safari clears a site's data after 7 days without a visit", with Install (the existing flow: the iOS guide, else the prompt);
  - on iOS the guide adds one line: "The installed app starts empty. Export first, then Bring rulers from a file in the app";
  - `navigator.storage.persist()` is asked again at the first Pass (it is already asked at the first save).

## 6. Rivals via links

**Today:** a share link is `#t2.<seed>.<level>.<parts>.<splits>.<check>`, with `&variant=` and `&size=` after the check when they are not the default (`src/ui/share.js`). Opening one shows the title card's "A friend's score", their parts, your best and "Beat N?", with Start this seed. Unknown extras after the check are ignored by every version since 4.5.

**The change:**
- **Your name on the link:** two more extras, `&name=<ruler name>` (up to 16 letters, digits, spaces and `'-.`; URL-encoded) and `&heir=<b|u|f|m|g|s>`. They sit outside the check, as `variant` and `size` do, so an 8.4 game still opens a 9.0 link, and no format bump is needed (Q11).
- **Rivals are kept:** opening a link with a name stores the rival in `records.rivals` for good: `{ id, name, heir, seed, difficulty, mapVariant, mapSize, score, parts, splits, version, added }`. The same name on the same map replaces the older row (the friend sent a newer score). At most 50 rivals; past that, the oldest added goes first, never one on the map being played.
- **During the game:** at each new split (the five milestones, the pyramids, the great pyramid), on a city whose map has a rival, a toast compares the two: "Town: 2 months ahead of Ana" (`splitCompareText`'s words, already used for your own best). With several rivals on one map, the newest added is the one compared.
- **At the end:** the Pass sheet and the ruler row show the two side by side: the scores, the five parts as two bars each (numbers beside them, never colour alone), and each side's heir.
- **On the title card:** a kept rival on a seed shows under "Beat N?" as "Ana (heir of the Merchant): 412".

## 7. Animations and visual effects

### 7a. What moves today, and what it costs

**The frame:**
- **A continuous `requestAnimationFrame` loop** (`src/render/loop.js`). The sim runs whole days (1 a second at 1x, at most 12 a frame); drawing interpolates on `world.day + acc`.
- **No cap while the game runs.** Only a paused game with no input for 2 s drops to 30 fps (`render/ambient.js` `createFrameGate`). A 120 Hz phone draws 120 frames a second.
- **Every frame redraws:** the background, the terrain chunks (16 x 16 tiles, baked and blitted, at most 2 bakes a frame), the ground layers (flood, season wash, rapids, ambient), every sprite depth-sorted with view culling, the light pass, fire, unit marks, effects and overlays.
- **DPR is not capped** (`renderer.js` `defaultDpr`): a DPR-3 phone fills 9 canvas pixels per CSS pixel.

**Motion settings:** `settings.motion` is `system | full | gentle | still`, and every render hook gets the level. But **since 8.0 production always runs Full** (ruling 1147): the Motion row is gone and the device's Reduce motion is not read; only the test rig sets Gentle or Still. The only automatic quality control is ambient's dropper (`AMBIENT.budgetMs` 2: rare life, then smoke, then sway go first).

**What moves,** with today's caps and costs:

| Thing | File | How it moves | Cap | Gentle / Still |
|---|---|---|---|---|
| Walkers | `walkers.js` | one still sprite a kind, gliding 2 tiles a day; `dir` is computed but never drawn | 40 | no change |
| Carts | `carts.js` | sprite, a left-facing copy, interpolated on the path | 30 | Still parks them |
| Ferries, trade boats, caravans | `ferries.js`, `trade.js` | interpolated; no wake (`drawTradeGround` is empty) | per route | Gentle parks ferries |
| Soldiers, raiders, elephants | `units.js` | the sim steps one tile a day; the drawing glides over the next game day, so it trails the sim by up to a day; fight poses a/b every 450 ms; sparks 260 ms; arrows arc 300 ms with a 360 ms puff; falls 2.4 s; banner ripple | none | slower poses; one arc line |
| Scouts | `scouts.js` | 2-3 still figures | 3 | |
| Building placed | `effects.js` `puff`, `rise` | 600 ms puff, 900 ms rise with two haulers (Full only, on the tap) | none | none |
| Monuments | `monuments.js` | real stages: courses, ramp, stockpile, sled gangs (4 haulers, 6-day trips), newest block fades in 400 ms; course dust 1.2 s; finish shine 2.4 s | per site | outline instead of dust |
| Fire | `fire.js` | flames step every 500 ms; 5 smoke puffs rising 3 s; scorch | none | cross-fade; still column |
| River | `terrainWater.js`, `ambient.js`, `rapids.js`, `flood.js` | baked and still; glints drift 0.2 tiles/s; rapids flecks; flood shimmer | | still texture |
| Seasons, light | `seasons.js`, `light.js` | season wash blends over a month; day and night on a 6-minute real-time cycle with lamps | | Still: none |
| Ambient life | `ambient.js`, `wildlife.js` | tree sway ±2°, crops, smoke from potter, brewery, brickworks and Townhouse chimneys, a rare bird, felucca or ducks; herds | 40 animals | dropper |
| Festivals | `walkers.js` `processionsAt`, `procession.js` | 4-12 marchers, streamers flutter every 1 s, 30-day dedications | 3 processions | |
| Newcomers | `newcomers.js` | groups of 3 | 12 | Still: none |
| Beaten raid | `ui/v60/battle.js` | the alert row's "Raid beaten" (0.3 s fade-in) and the fanfare; nothing on the map | | |
| UI | `css/ui.css`, `v81-*.css` | cheer 200 ms, guidance 150 ms, picture cards 200 ms slide, the moment 300 ms, lesson rings (infinite), nudge glow; **sheets, panels and toasts have no transition** | | all off under Gentle or Still |

**What it costs** (headless Edge, software canvas, this PC; the existing tests):

| Measure | Test | Bound | Recorded |
|---|---|---|---|
| Stress city, whole frame (64², 1280x800) | `tests/render/stress.test.js` | median < 50 ms at zoom 1, < 120 ms at 0.5 | not printed |
| Three live monument sites ("s4") | `tests/stage4/balance/budget.test.js` | < 1 ms | 0.85-0.96 ms (Stage 4 follow-ups) |
| Ambient | `tests/stage3/art/ambient.test.js` | < 2 ms (median < 4) | about 0.6 ms |
| Battle layers | `tests/v60/b2/budget.test.js` | < 3 ms; frame +6 / +15 ms over peace | about 0.9 ms; +2 ms, +5-7 zoomed out |
| Seasons and light ("v70") | `tests/v70/s/budget.test.js` | median 2 ms; 14 ms flushed | |
| Supply lines | `tests/v83/k/budget.test.js` | 2 ms; 14 ms flushed | |

No real phone has been measured. The ambient comment calls 2 ms "a frame's ambient budget on a mid-range phone", which this design keeps as the yardstick.

**What a player would notice is missing:** figures glide as still pictures with no step and no facing; units trail the fight by a day; ordinary buildings pop in; most workshops do not smoke; no wake behind a boat; nothing puts a fire out; a beaten raid has nothing on the map; no weather at all; festivals are a few marchers; panels snap open.

### 7b. The proposals, ranked by impact for cost

Each cost is the estimate for the stress city at 1280x800, zoom 1, headless (the tests' measure), at the cap. Track V measures each one and reports it against its estimate. A phone at 60 Hz has 16.7 ms a frame; **V's new effects together get 2 ms on a mid phone** (the ambient yardstick), with a dropper like ambient's.

**First, headroom (no new motion; they pay for the rest):**
- **V0a. Cap the canvas DPR at 2.** A DPR-3 phone fills 4/9 of today's pixels for the canvas (the UI stays sharp). Cost: about -40% of raster time on such phones, 0 on desktop. The sprite cache already keys by DPR. Q15.
- **V0b. Draw at most 60 frames a second while the game runs** (the frame gate already exists; it gains a running cap). Cost: halves the work on 120 Hz phones; 0 elsewhere.

**Then the effects, best value first:**

| # | Effect | What it shows | Est. cost | Reduced motion |
|---|---|---|---|---|
| V1 | **Walk cycle and facing** for walkers, newcomers, marchers, soldiers and raiders | two step poses and a mirrored copy per figure kind, chosen by distance walked and `dir`; a 1 px bob | ~0 ms (the same one blit, another cached slot); sprite cache x3 per kind (about 20 kinds) | Gentle: one pose, facing kept; Still: today's |
| V2 | **Units in step with the fight** | units glide between the sim's last two tiles on `world.day + acc`, so a blow lands where it is drawn | ~0 ms (arithmetic) | same |
| V3 | **Building goes up** | a placed building rises behind scaffold poles over 1 game day, with a dust puff; a home's upgrade shows the poles for half a day | ≤ 0.15 ms (≤ 8 sites at once, 6 lines and one puff each) | Gentle: a fade; Still: none |
| V4 | **Smoke from every workshop and kiln** | `SMOKE_FROM` gains the weaver, jeweller, the bakeries' and the guild's fires, puffing only while staffed and working | ≤ 0.2 ms at 40 sources; inside ambient's dropper (smoke drops second) | as today's smoke |
| V5 | **The beaten raid on the map** | the last fight's spot: the soldiers raise their spears (a pose), a gold sparkle, the raiders' dust running to their edge, and the chief's fallen banner; for the moment's 6 game days | ≤ 0.3 ms, only during the moment | Gentle: the sparkle as a still star; Still: none |
| V6 | **Dust on the move** | dust behind a band entering or leaving, behind carts on sand, and under the sled gangs | ≤ 0.2 ms at 30 carts and 3 bands | Gentle and Still: none |
| V7 | **Fire fought** | a staffed firehouse's water arcs over a fire it reaches, and steam as a fire goes out | ≤ 0.1 ms a fire | Gentle: steam only |
| V8 | **Wakes** | a V of two lines behind trade boats, ferries and the rare felucca | ≤ 0.05 ms | Still: none |
| V9 | **Festivals and the Victory** | a festival's temple gets lamps at night and petals along the procession; a Victory (8.4's +4 mood for 90 days) hangs pennants on the palace | ≤ 0.2 ms during a festival | Gentle: lamps only |
| V10 | **Weather** | cloud shadows (two or three soft shapes drifting over the land), and in Shemu's hot months, gusts of sand along the desert edge | ≤ 0.3 ms (cached shapes; sand at most 12 streaks) | Gentle: shadows still; Still: none |
| V11 | **The river flowing** | faint current lines drifting down the river, drawn on the water's baked shape | 0.5-1.5 ms (fill-rate across the screen's water); last, and the dropper's first to go | Gentle and Still: none |
| V12 | **Panels slide** | sheets and the side panel slide 160 ms on open; toasts fade 150 ms. Transform and opacity only, so no canvas cost | 0 ms canvas; one compositor layer | off under Gentle or Still, and off in the lesson (a sliding sheet would misplace a pointer) |

- **The dropper:** V's effects join ambient's budget logic as a second level, with their own `budgetMs` (2 on the phone yardstick), shedding V11, V10, V6, V4 and V9 in that order. A dropped effect never hides a sim fact: the alert row, the caption and the sheets say everything the map shows.
- **The look:** every effect is drawn with the palette's colours and `primitives.js` shapes, as the existing puffs, sparks and dust are. No blur, no gradients beyond the cloud shapes' cached ones, no glow.
- **Not proposed:** rain (Egypt), particle systems, screen shake (Josh's phone use), a new art style.

## 8. Open questions (each with a recommendation)

**Dynasty**
- **Q1. Each title's rule?** Recommended: section 3's measures and bars as first values, the highest fit wins, the bars set by the balance check's probe so the runs spread. Why: every measure is a count the game keeps or one month-end sum, and the score sheet can show it as you play.
- **Q2. What does New city do to the dynasty?** Recommended: it starts with the current heir trait, and the abandoned city joins no list. Why: no guilt for quitting, and no way to lose a trait.
- **Q3. Which score does Pass seal?** Recommended: the best of this reign's seals (the win's included) and today's. Why: playing on after a win must never cost the won score.
- **Q4. Can a Peaceful city pass the throne?** Recommended: yes, with every title but the Unconquered. Why: Peaceful is the gentle city, not a lesser one (8.4's Q21).
- **Q5. The traits' sizes?** Recommended: 15% for each strength, 5-20% weaknesses as in section 4's table. Why: big enough to feel in a year, small enough for T1-T4.
- **Q6. The Bountiful's weakness?** Recommended: a low or failed flood cuts half again as deep, in place of "granaries hold less". Why: capacity is read as `BUILDINGS[type].capacity` in about 15 sim places with no world to hand (`roomOf(b)`, `hasSpace(s)`); the flood is one function and fits the title.
- **Q7. What is "a replay of each map"?** Recommended: **Play this map**, a new city on the same seed, level, layout and size. Why: a time-lapse needs a snapshot a year in storage; this reuses Start this seed.
- **Q8. How is the ruler list backed up, with no import since 8.0?** Recommended: the export carries it as today, and a new **Bring rulers from a file** merges rulers and rivals only (`records.merge` exists and is tested). Why: a backup nobody can load is no backup, and cities stay un-importable as Josh chose (ruling 1146).
- **Q9. The ruler's name?** Recommended: asked once at the first Pass (prefilled "Ramesses"), with regnal numbers added by the game ("Ramesses II"), changeable in Options. Why: one field, and the list reads as a dynasty.
- **Q10. When does the game ask to install?** Recommended: once, after the first Pass, on a device not installed; the iOS guide adds the export-then-bring line. Why: that is when there is something to lose, and iOS gives the installed app empty storage.
- **Q11. What does a rival link carry, and does it need a new format?** Recommended: `&name=` and `&heir=` outside the check, still `t2`. Why: older games already ignore extras, so every old and new link opens everywhere.
- **Q12. Which rival is compared at a new rank?** Recommended: the newest kept on this map, named. Why: it is the friend whose link you opened last.
- **Q13. The world-version bump?** Recommended: yes, to 12 (section 11). Why: `world.heir` and the new tallies are required keys.
- **Q14. Does the score read the trait, or a "heir" mark go on bests?** Recommended: no to both; the link and the ruler row say the heir beside the score. Why: rule 1, and no score-version bump.

**Animations and visual effects**
- **Q15. Cap the canvas at DPR 2 and 60 fps while running?** Recommended: yes, both (V0a, V0b). Why: the cheapest frame time there is, and it pays for every effect below.
- **Q16. The scope?** Recommended: V0a-V0b, then V1-V10 in rank order, with V11 and V12 only if the budget allows (T12). Why: V1-V5 make the city feel alive at about 0.7 ms together.
- **Q17. The frame budget on a mid phone?** Recommended: 2 ms for V's new effects together, under a dropper, measured headless on the stress city as the existing budgets are. Why: it matches ambient's yardstick, and nothing else measures a phone.
- **Q18. Reduced motion, which production ignores since 8.0?** Recommended: read the device's Reduce motion again, live and never stored, mapping to Gentle; no Motion row comes back. Why: 1147's problem was a stored level nobody could change; a live read cannot strand anyone.
- **Q19. A Settings switch for effects?** Recommended: no. The dropper sheds effects on a slow phone, and reduced motion covers the rest. Why: Josh's clean Options, and no player has asked.

## 9. Balance and frame targets

**The trait bar: help without deciding the game.** Each run below is run once per heir (six runs each, the Steady being today's), with today's scripted habits. Each target is an assertion in `tests/v90/balance/`.

- **T1. Great-work run** (today won on day 6,380, dangers off): every heir wins within ±200 days of the Steady's day, and by day 7,200 (the margin test's bound).
- **T2. Capital run:** every heir reaches Capital within ±90 days of the Steady's day, holds year-6 gold within ±25% of the Steady's, and never goes below 0.
- **T3. No heir makes a raid run lose.** The dangers runs (seeds 5 and 10) and the late run: no heir loses a raid the Steady beats. The Unconquered's first warning lands 100 days sooner, and the capital run still beats it.
- **T4. Each strength shows, and so does each weakness** (one probe per heir, from the capital run's year-6 city):
  - Builder: a large mastaba finishes 13% sooner (1/1.15), with 5% less tax;
  - Unconquered: soldiers' pay 20% lower; first warning on `clock + 200`;
  - Bountiful: farm output +15% in a good flood; a low flood's loss x1.5;
  - Merchant: sales income +15%; workshop output -15%;
  - Generous: arrivals +20% at the same mood; High at x1.15.
- **T5. The score at year 6** of the capital run: every heir within ±8% of the Steady's. The same world scored with two heirs gives the same score (the score never reads the trait).
- **T6. The titles spread.** The probe prints every run's five measures at its end. With the bars set, the great-work run earns the Builder, the late dangers run the Unconquered, and at least three different titles come from the balance runs. Each title is earned by at least one run or seeded fixture.
- **T7. The lesson** reaches every step on the same day as on 8.4 (pinned), with any `records.dynasty.heir` set on the device.

**The frame targets** (headless Edge, as the existing tests; before = 8.4, after = 9.0):
- **T8.** The stress city's whole frame stays under today's bounds (50 ms at zoom 1, 120 ms at 0.5), and grows by at most 2 ms at zoom 1 and 4 ms at 0.5 with every V effect live.
- **T9.** V's new layers: median ≤ 2 ms at zoom 1 and ≤ 4 ms at the zoom floor, 1920x1080 (a new `tests/v90/v/budget.test.js`, the v70 test's pattern, with the 14 ms flushed cap).
- **T10.** The s4 budget (three live sites < 1 ms, today 0.85-0.96) holds with V3's scaffolds and V6's dust.
- **T11.** The v70 budget (seasons and light, 2 ms) and the battle budget (3 ms; +6 / +15 ms) hold with V2, V5 and V10.
- **T12.** V11 ships only if T8 and T9 still hold with it; else it is cut and reported.
- **The report** gives a frame-time table, before and after, for each budget, plus each effect's measured cost against its estimate.

## 10. The lesson

The lesson is a Normal city on seed 7. Its lock leaves only the step's category live, so anything that can leave a step waiting with no way on is a bug (ruling 1453). Each of these is a test in `tests/v90/`:
1. **The lesson is always the Steady.** `startLesson` builds its world with `heir: 'steady'` whatever `records.dynasty.heir` holds; an adopted lesson city stays the Steady. So no trait changes a step's need or moves the staged raid (`STAGES.raid` sets `nextWarnDay = today`, which the Unconquered's 200 never reaches).
2. **No Pass the throne** in the lesson's menu (the menu's `inLesson` rows), and the City caption never fires there (the lesson ends before City).
3. **No rival toast** in the lesson, even when the device keeps a rival on seed 7.
4. **No effect hides a pointer.** V12's slide is off in the lesson; V3, V5, V9 and V10 draw on the canvas below the lesson's ring and card (DOM above the canvas), and V10's cloud shadows stay under 25% opacity. A walk-through screenshot test at 375x667 checks the ring is visible at every step with every effect live.
5. **The words still match.** The tower step's "10 months" reads `RAIDS.firstWarnAfter`, unchanged.

## 11. Saves

- **World version 12** (Q13). One migration, v11 to v12:
  - `world.heir` = `'steady'`;
  - the new tallies start at 0: `townMonths`, `fedMonths`, `tradeGold`, `billsPaid` (a `V90_TALLY` list in a new leaf `src/data/v90.js`).
- **Optional, absent means today's behaviour:** a seal's `passed` and `title`.
- **Records version 2:** `rulers` (never capped), `rivals` (at most 50) and `dynasty` (`{ name, heir }`). A version 1 blob reads with all three empty; `normalizeRecords` drops what it cannot read, as today.
- **The export file** carries the records as today, so it carries rulers and rivals.

## 12. What the code says that the roadmap does not

- **There is no import since 8.0** (ruling 1146), so the export file is a backup nobody can load. That ruling's own "cost if wrong" foresaw it. Q8 brings back a rulers-only import.
- **On iOS the installed app starts with empty storage** (`installFlow.js`'s comment, the iOS guide's line). Asking a Safari player to install moves them away from their rulers, so the ask must come with the way to bring them.
- **"Granaries hold less" touches about 15 places** that read a store's capacity with no world (`roomOf(b)`, `hasSpace(s)`, `roomIn(b)` in four files). Q6 trades it for the flood.
- **Seal this reign already exists,** repeatable, with chronicle stamps. Pass the throne is a seal plus the next city, not a new mechanism.
- **The share link already carries the split days,** so "Town: 2 months ahead of your rival" needs nothing more on the link than the name.
- **Reduced motion is ignored in production** since 8.0 (ruling 1147), so the brief's "respect reduced motion" holds only in the test rig today. Q18.
- **The frame loop is never capped while running, and DPR is never capped.** Those two are worth more frame time than every proposed effect costs.
- **Battle effects already exist** (arrows, sparks, falls, dust rings, banners); what is missing is the walk, the timing and the moment after.
- **Ordinary buildings have no build time.** V3's rise is drawing only; the building works at once, as today.

## 13. What does not change

- **The score's formula and version (2),** the medals, and every best's key.
- **8.4's numbers:** the tax rate, Rush, luxuries, the raid clock, the elephants, the spoils (the Unconquered's pay stacks on them).
- **One city at a time** and one save slot (9.1 adds the second).
- **The lesson's steps, map, words and staged raid;** the lesson city is always the Steady.
- **The share link's format (`t2`)** and every older link.
- **The art's look,** the palette, and the existing effects' timings.
