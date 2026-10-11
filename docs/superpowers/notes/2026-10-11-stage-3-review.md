# Stage 3 review: danger, scoring, gamification and ambient life

Written 11 Oct 2026 after Stage 2 shipped (ce5593b, live). Josh asked for a fresh look at Stage 3 against game-design and UX best practice. He also asked for three additions: a score so each city can be compared with the last, more gamification to make the early game more compelling, and subtle ambient animation (water, grass and the like).

Sources: four research digests made for this review, kept in `reference/stage-3/`:
- `design.md`: how 15 city builders and colony sims handle fire, raids and defence.
- `ux.md`: alerts, pausing, combat readability, photosensitivity, haptics and confirmations.
- `scoring.md`: scores, personal bests, seeds, sharing without a server, and ethical engagement.
- `code-map.md`: what exists in the code, where each piece plugs in, and how to split the build into parallel tracks.

Bracketed tags like [D2] or [U13] point to a digest's numbered principle or rule.

## 1. The short version

Stage 3 should make the city feel alive and at stake without becoming stressful, and give every city a score worth beating.

1. **Keep the spec's shape for fire and raids.** It already matches what players call fair: risk you can see, a counter unlocked before the threat, a seeded chance rather than all-at-once, raid size fixed at warning time, a warning with a direction, and tribute as a choice [D1, D3, D6, U15].
2. **Fix the timings.** At 1× a month is 20 seconds. So a fire that "burns a few game-days" lasts about 2 seconds, and the two-month raid warning about 40. Fires should burn for 10-15 days, and warnings should run 3 months with a countdown chip. Building, paying tribute and looking around must all work while paused [design §3].
3. **Every loss traces to a visible, fixable cause.** That means a fire-risk overlay, a "Fire risk" row on each building sheet, and a raid report showing what each tower stopped [D6, U11].
4. **Recovery is cheap and quick.** Burned homes become empty plots, other buildings become cheap rubble, raiders steal some gold and light fires, and nobody's city is wiped out [D8].
5. **Combat is automatic and readable.** Towers shoot, soldiers intercept, and units are few, large and easy to tell apart. Health bars show only once a unit is hit. The camera moves only when you tap View [D10, U8, U9].
6. **Walls must do one job reliably.** Raiders must breach them, towers on them shoot, and gates let citizens through. The pathfinding cost of a wall has to make a ring actually protect what is inside [D11].
7. **Price tribute against the defence you could have built, and show both side by side.** One clear confirmation names the cost, your gold afterwards, and what is cancelled [D9, U13; design §3 flag 4].
8. **Danger is a dial, not a surprise.** Keep Relaxed/Normal/Hard and add a **Peaceful** option for new cities (no raids; fires at the Relaxed rate) [D12, D14]. Peaceful is a valid way to play with its own personal bests.
9. **Defence is the late-game gold sink.** Firehouse and tower upkeep, soldiers' pay and tribute bring wages plus upkeep back towards spec 4.11's 60-70% of taxes. Stage 2 left it at 30%.
10. **Add a score.** It has named parts out of 100 (People, Prosperity, Culture, Safety; Monuments in Stage 4), measured from the city's state, never from clicks or wall-clock speed. Show a small live total, and the full breakdown in the summary [S1-S3].
11. **"Each time" means personal bests, not an end screen.** Bests are kept per map seed and difficulty, with split times at each milestone ("Town: 1 year faster than your best"). A **Seal this reign** button writes a chronicle entry (score, parts, seed, medal) while the city lives on [S4-S7].
12. **Share without a server.** A weekly "This week's Nile" seed comes from the date. A link carries the seed and score in the URL fragment, and a picture card goes through the share sheet, labelled "friends' honour" [S8-S11].
13. **Make the early game more compelling, honestly.** Ideas: a first goal already ticked ("Founded Thebes"); a visible "Town: 83 of 150" bar; "+3 Culture" previews while placing; named optional feats; cosmetic stamps for sealed reigns; small varied citizen remarks. Nothing that punishes leaving or not coming back [S12-S14].
14. **Add ambient life, subtly.** Water glints and ripples, reeds and grass swaying, palm fronds, smoke from kilns and chimneys, perhaps a bird or a felucca. It should be slow, low in amplitude, out of step from tile to tile, cheap on phones, off under reduced motion, and switchable in Settings.

## 2. Fire

**Keep (spec 4.12):**
- Risk only from Town.
- The firehouse is available from Village.
- Daily risk varies by building type; firehouse coverage lowers it, scaled by staff.
- A seeded daily chance (3%) above a threshold.
- Spreading to neighbours.
- Houses burn to empty plots; other buildings burn to rubble.
- The first fire adds a goal with Show me.

**Change or add:**
- **Burn time and stages.** A fire lasts 10-15 game-days (7-10 s at 1×). It starts as a small **blaze** that a firehouse in reach puts out within a day or two. Only an uncovered or understaffed blaze grows to a **fire** that can spread. Caesar III's prefects put out "loose sparks" the same way [design Fire]. Coverage then matters twice, before ignition and during it.
- **Spread rules that teach.** Spread reaches the 4 neighbours only. Roads, gardens, statues, plazas and water never burn, so a road is a firebreak, as in Banished [design Fire]. The overlay and sheet say this.
- **Visible cause.**
  - A fire-risk overlay in one colour, with hatching at the high end and a legend with words [U11].
  - Every building sheet gets a "Fire risk: high, no firehouse within 8 road tiles" row with Show me.
  - Problem markers show buildings at high risk.
- **Visuals.**
  - Flames change shape at 2 Hz or less, never flash brightness, and never use a saturated-red flash.
  - Nothing pulses for longer than 5 s.
  - Under reduced motion, a still flame icon and the word "Burning" [U10].
  - Smoke uses the soft puffs the potter already has.
- **Speed.** A fire drops the speed to 1×. The first fire pauses the game. After that a setting chooses pause, jump to it, or inform only [U6].
- **Recovery.**
  - Rubble costs a little to clear and can be cleared in one drag.
  - Burned homes keep their plot, so they refill.
  - Mood takes a short, visible dent ("A fire last month").
- **Difficulty.** The risk multipliers stored since Stage 2 (×0.5/1/1.5) apply to risk build-up. Peaceful uses ×0.5.

## 3. Raids and defence

**Keep (spec 4.13):**
- Possible from 250 people, with the first raid at least two game-years later, sized for one staffed tower.
- The warning pauses the game and adds "Build a tower facing <direction>".
- Size is fixed at warning time.
- Tribute cancels a raid.
- Raiders are real units heading for valuable buildings.
- Walls, gates, towers and barracks.
- A raid ends when the raiders are dead or retreat after losing half their number.

**Change or add:**
- **Warning length.** Three game-months (about 60 s at 1×). The countdown shows as a chip under the top bar (it never times out and collapses to one line) and as a minimap pin with an arrow at the entry point [U2, U15].
- **Sizing.** Scale with population and wealth (treasury plus building value) on a capped curve, like RimWorld's wealth points (0 up to a floor, rising, capped) [design Raids], times the difficulty multiplier. After a lost raid the next one shrinks for a while (RimWorld's "adaption"), so a battered city gets breathing room.
- **Targets.** Raiders head for wealth (the trading post, storehouses, the bazaar, the temple). Players can learn this and plan for it: build the counter where the bait is [D5]. The warning says what they want ("Raiders are after your storehouses").
- **Tribute.**
  - Priced at about 0.8 times the cost of the towers that would beat this raid, scaled by difficulty.
  - Shown beside "or build 2 towers facing east (≈ 300 gold)".
  - One confirmation sheet: the cost, your gold afterwards, what it cancels, buttons named for the outcome ("Pay 420 gold" / "Keep gold, defend"), no default [U13].
  - Paying cannot take the treasury below zero.
  - On the very first raid, tribute is hidden, so the player sees one fight (the UX digest's open question). Cost if wrong: a cautious player can't buy off the first raid.
- **Walls.**
  - Pathfinding (A* over walkable tiles) treats a wall as passable only after breaking it. Breaking takes several days, during which towers shoot.
  - A gate counts as wall for raiders.
  - Tests prove that a closed ring keeps raiders out until breached, and that towers on a ring hit raiders at the breach [D11].
- **Soldiers.** Barracks train up to a cap. Soldiers walk out to intercept raiders within a patrol radius and return. They cost pay every month, even in peacetime (the gold sink) [design Defence].
- **What raiders do.** At a target they set it on fire and steal some gold, then move on. Citizens aren't modelled as dying. Mood dips for six months unless tribute was paid (spec 4.9).
- **After a raid.** A short report as a caption and in the summary: "Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 storehouse burned, 40 gold stolen." Defence then shows its value [design Avoid].
- **Readability.**
  - At most about 12 raiders, drawn large and dark against the sand, with a distinct silhouette.
  - Arrows from towers drawn as thin strokes.
  - No combat micromanagement; speed stays the player's to change [U9].
- **Sound.** A short horn at the warning (if sound is on). Haptics only on Android Chrome (iOS web has none), so the visuals must stand alone [U12].

## 4. Alerts, pausing and fairness (applies to fire and raids)

- Three tiers, one channel each:
  - **Info** is a caption.
  - **Warning** is a badge plus a row in the minimap list.
  - **Critical** is the banner under the top bar. Only one banner shows at a time, ranked raid, fire, debt, save failing, with repeats rolled into one line ("3 buildings on fire") [U1, U3].
- Criticals use `role="alert"`; everything else uses polite status [U5].
- Nothing happens while the player is away: the game pauses on hide, saves on hide and reopens paused (already true) [U7].
- On small phones the banner must not push the goals strip past the middle. The Stage 2 follow-ups note that two banners together already do, so this is the moment to fix the stacking.

## 5. Scoring

**What a score is for.** A score tells you how well the city is doing in a way you can compare between cities and days. It doubles as a tutor, because each part names its main reason.

**Ratings (0-100 each), measured from the city's state each month:**

| Part | Measures | Main reason line, e.g. |
|---|---|---|
| People | Population against the next milestone, plus housing tier mix | "Most homes are Townhouses" |
| Prosperity | Taxes per person, employment, a positive treasury, trade | "12% of workers have no job" |
| Culture | Temple, booth and bazaar coverage, average desirability | "4 homes have no entertainment" |
| Safety (from Stage 3) | Fire coverage, defence against the expected raid, recent losses | "No firehouse covers the east streets" |
| Monuments (Stage 4) | — | — |

- **City score** = the sum of the parts × a difficulty factor (Relaxed 0.8, Normal 1, Hard 1.25, Peaceful 0.7). It is shown as a small number in the summary and on Welcome back, with each part's bar and its reason.
- **Previews.** While placing, the confirm bar says "+3 Culture" beside "Gives water to 6 homes" [S3].

**"Each time".**
- **Milestone splits.** Reaching Town, Market town, City, Great city and Capital records the game-year. The summary compares it with your best for this seed and difficulty ("Town in year 2, 1 year faster than your best") [S5].
- **Seal this reign.** A button in the summary records a chronicle entry: score, parts, splits, seed, difficulty, date and a medal. The city carries on [S6].
- **Medals.** Bronze, silver and gold for the score at Capital, set from your own and friends' playtests. The next threshold is always visible ("38 points to Silver") [S7].
- **Records live on the device** (a small `records` store beside the save), listed on the title card under Continue ("Best: 712, gold, seed 11"). They are included in Export.

**Share.**
- A weekly seed derived from the date ("This week's Nile"), played offline. Weekly, not daily, so there is no appointment to keep [S8].
- **Share score** makes a link with `#t1.<seed>.<difficulty>.<parts>.<splits>.<check>` in the fragment. Opening it starts a city on that seed and shows "Beat 701?" beside your own best [S9].
- A picture card (the city, score bars and medal) goes through the share sheet, with download as the fallback.
- A spoiler-free emoji row for chat apps [S10].
- It's labelled "friends' honour": a score in a link can't be checked without a server [S11].
- A clean screenshot mode (hide the interface) is cheap and is how Townscaper spread.

## 6. More gamification for the early game

All of these pass the "skipping it costs you nothing" test [scoring §4]:

- **Endowed start.** The goals list opens with "Founded Thebes" already ticked, and the first chapter shows "1 of 9" [S13].
- **One visible next threshold** at all times: a slim "Town: 83 of 150 people" bar under the goals strip. The milestone banner celebrates the step.
- **"+N" previews** while placing (score parts and the existing reach lines).
- **Named feats.** About ten optional ones, listed under achievements and shown when sealing a reign: "No debt until Town", "Everyone fed for 12 months", "Town with only grain", "No fire for five years". They never gate content [S12].
- **Collections.** A cosmetic stamp for each sealed reign (the seed's map shape plus its medal) on the title card. These have no power.
- **Variety in content, fixed payouts.** Short citizen remarks in captions ("The potters say the clay is good this year"), varied by seed and season. Gold rewards stay fixed [S14].
- **Juice where you act most.** Placing already has the rise and puff. Add a soft coin tick when tax arrives, and a ripple when water reaches homes. Respect reduced motion and sound settings.

**Avoid:**
- Streaks or daily locks.
- Timers that run while away.
- Global leaderboards.
- Scoring wall-clock speed.
- Penalising undo or pausing.
- Fake near-misses.
- Sharing nags or rewards.
- Achievement-gated content.

These match the rulings already made (no streaks in daily goals). The early-game research's "no points or score" line is now overruled by Josh's request. The score is informational, measured from the city's state, and never gates anything.

## 7. Ambient life (subtle animation)

Terrain is drawn once into cached chunks (`render/terrainBaker.js`). Ambient motion should therefore be a light layer drawn over the chunks, for visible tiles only:

- **Water.** Slow glints (short pale strokes) drifting along the river and pools, plus a faint ripple line along the banks. Phases come from the tile's hash, so nothing moves in step. The garden and Estate pools get the same treatment.
- **Grass, reeds and palms.** A small sway: a skew of a few degrees on the decor sprites, at a 3-6 s period, out of step from tile to tile. Farms' crops ripple gently in the wind direction.
- **Smoke.** Soft puffs rise from the potter's kiln, the brewery and Townhouse-and-up chimneys while the building works. The early-game pass left chimney smoke out; this brings it back as part of the ambient layer.
- **Rare life.** An occasional bird crossing, a felucca drifting on the river, ducks near reeds. Each is at most one on screen.

**Rules:**
- Motion runs on the real clock, even while paused (the city breathes). It stops when the page is hidden.
- It is off under reduced motion, with a Settings switch "Ambient motion: On/Off".
- No flashing; nothing over 1 Hz.
- Budget: at most 2 ms a frame on a mid phone. Measure on the stress city, and drop rare life first if over budget.
- The render loop already runs every frame, so the cost is real while the player watches. When paused and idle, the frame rate could drop to 30.

## 8. Stage 2 leftovers to fold in

From `notes/2026-10-11-stage-2-followups.md` and the code map:

- **Balance.** Defence and fire upkeep plus tribute are the late-game sink, and the long-run test should assert the 60-70% band at a steady town.
- **Phones.** Banner stacking on small phones, and the goals strip on landscape phones with a banner.
- **Title card.** The 600-day backdrop takes 0.2-0.35 s on desktop. Precompute it or cut its days, and add fire and raid evidence carefully so the title city still looks thriving.
- **Fixtures.** The long tests and fixtures will meet fire and raids: the 10-year village, the 6-year capital run, the stress city and the seed-11 sample city. Each needs firehouses or a test-only "no danger" switch.
- **Store re-entrancy and undo guards** flagged in the 1a and 1c follow-ups.
- **The test runner's 45 s wait** is too short under load. Add `-WaitSeconds`.

## 9. Proposed Stage 3 scope

**In:**
- Fire (stages, spread, firehouse, rubble, risk overlay, sheet rows).
- Raids (warning, sizing, tribute, raiders, report).
- Walls, gates, towers, barracks, soldiers, combat.
- Alert banners and their stacking.
- The horn.
- Peaceful mode.
- Score and ratings, personal bests and splits, Seal this reign, medals, the weekly seed, share link and card, screenshot mode.
- The early-game additions in section 6.
- Ambient life.
- Balance against the 60-70% band.
- New goals, firsts, achievements, daily goals and tips for danger and scores.
- Festivals as a small mood lever after a raid: a temple button with a cost and a cooldown. Evidence for them is thin, so keep them small.

**Out (Stage 4 or later):**
- Monuments and the Monuments rating.
- Collapse and architects.
- Plague.
- Floods.
- Global leaderboards.
- Replay logs.

## 10. Decisions to make (proposed rulings, each with its cost if wrong)

1. Fire burns 10-15 days and starts as a blaze that coverage puts out. Cost: fires feel less dramatic. The numbers live in data.
2. The raid warning is 3 months with a countdown chip, not 2. Cost: a little less tension.
3. Raid size follows a capped curve of people and wealth, shrinking after a lost raid. Cost: tuning.
4. Tribute is about 0.8 times the defence that would win, shown beside it, and hidden for the first raid. Cost: a first raid you can't buy off.
5. Peaceful mode for new cities. Cost: one more choice; separate personal bests.
6. Raiders burn and steal but don't kill citizens. Cost: less grim, and less weight to losing.
7. Score parts and the formula as in section 5, with the formula versioned (so a change never silently breaks old bests). Cost: the weights will need tuning.
8. Personal bests per seed and difficulty on the device; Seal this reign; medals from playtests. Cost: the medal thresholds are guesses at first.
9. Weekly seed, share link and card, "friends' honour". Cost: anyone can fake a link.
10. Early-game additions as in section 6. Cost: a little more interface.
11. Ambient life as in section 7, with a Settings switch. Cost: frame time on old phones.
12. Festivals small and optional. Cost: one more button.

## 11. Running it faster

The code map proposes six tracks behind one contract commit, built in parallel in separate git worktrees (sibling folders) and merged in order:

- **0, Contract:** world version 4 and every new field, all data, stub modules with their final signatures, wiring, one test aggregator per track, the runner's `-WaitSeconds`.
- **A** Fire sim, **B** Raids and defence sim, **C** Art and render (fire, units, walls, ambient life), **D** Interface and sound, **E** Scoring and gamification.
- **F, Integration and balance:** done by the integrator.

Each track runs the usual implementer and reviewer loop. A whole-branch review on the strongest model, one fix wave and a re-review follow before the local merge.

**Lessons from Stage 2:**
- Plan writers who ran their code wrote briefs that mostly applied as written.
- Reviewers told to check that the words match the sim caught every "the sheet says what the game won't do" bug.
- Six writers on the strongest model hit the account's spend limit within an hour. Cap the concurrency, and resume agents rather than restarting them.
- Empty `python3 -` commands leave Windows stubs spinning a CPU core, which starves the test runner.
- An old session can wake and commit to the same branch.

The prompt in `2026-10-11-stage-3-prompt.md` encodes all of this.
