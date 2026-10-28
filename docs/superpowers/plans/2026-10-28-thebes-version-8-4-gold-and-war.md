# Thebes Version 8.4 "Gold and war" (plan)

Drafted 28 Oct 2026, after 8.3 went live (main 26dfa6d "Home in the game menu" or later, `APP_VERSION` '8.3'). It is the second of v9's four releases. One release with three parts:
- **Gold:** a tax rate on the palace, Rush a course, luxury imports for Villas and Estates.
- **Raids:** sooner raids, scouts before a warning, a lean towards the low Nile, and a reward for a beaten raid.
- **Elephants:** war elephants as a fifth enemy kind, and ivory from a fallen one.

**Design (authority, read it first):** `docs/superpowers/specs/2026-10-28-thebes-version-8-4-gold-and-war-design.md`, with Josh's answers recorded at its top once he gives them. Also read:
- the v9 roadmap `specs/2026-10-27-thebes-v9-roadmap-design.md`, for context only;
- this plan;
- the rulings in `notes/handoff-2026-10-11/rulings-so-far.md`. Append 8.4 as **Part 26** (8.3 is Part 25, ending at 1454).

**Out of scope:** everything in 9.0 and 9.1: passing the throne, titles and traits, rivals, the weekly decree, a second save slot.
- No new building kinds and no new trade partner.
- Every existing good keeps its price and its yearly drift.
- No score formula or score-version change. The taxes term reads the Normal rate, which is today's number for every city.

## What Josh asked for (27 Oct, roadmap section 3)

1. **Gold gets jobs.**
   - A tax rate (Low, Normal, High) on the palace.
   - Rush a course.
   - Luxury imports that Villas and Estates need.
   - The balance runs show late gold being spent, not piling up.
2. **Raids come sooner and mean more.**
   - The first warning about 300 days after the clock starts; later ones every 360 to 600.
   - Scouts on the horizon, and a lean towards the low-Nile season.
   - Captured weapons and a moment to celebrate a beaten raid.
3. **War elephants.**
   - A fifth enemy kind: huge, slow, wall-breaking, trampling, panicking.
   - Matchups that suit archers and towers, and a "War elephants!" warning.
   - Ivory from a fallen elephant.
4. **8.3's leftover balance:** a run where a crew works beyond 12 road tiles and a workers' camp is set up.
5. **Clean and simple on mobile and desktop** (his standing requirement), graded in the final review.

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- **Branch and worktrees:** branch `version-8-4` (already cut from main at 8.3). Tracks run in sibling worktrees `C:\dev\thebes-v84-<track>`, cut from the branch after wave 0. The controller merges them back.
- **Models:**
  - Opus for Track G (gold), Track E (elephants), any merge that is not trivial, the balance check and the final review.
  - Sonnet for Track R (raids), every reviewer, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **One change to Josh's split:** Track R stays Sonnet, but the raid clock's three numbers and the lean's 60 days land in wave 2's balance check, not in R.
  - **Why:** those numbers move every long balance run: the capital, late, great-work, dangers, grand and events runs pin raid days, counts and gold.
  - **Who does what:** re-pinning them is balance work for Opus. R builds and tests the rules with today's numbers in `RAIDS`, and its tests set 8.4's numbers on a world themselves.
  - Everything else of R's lands with its final numbers.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. A reviewer's minor findings go into the track's next commit.
- **The controller** reads reports, not diffs. It keeps a ledger at `.superpowers/sdd/2026-10-28-thebes-version-8-4/progress.md` and looks at two or three screenshots per track. The agents' shared rules are in the controller's scratch `rules84.md`.

### Waves

| Wave | Work | Depends on |
|---|---|---|
| 0 | The controller, no agent: the shared pieces below. One commit. | main |
| 1 | G: gold (Opus) · R: raids (Sonnet) · E: elephants (Opus), in parallel | wave 0 |
| 2 | Merge G → R → E. Balance check (Opus) → final review with the usability pass (Opus) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge to main, suite on main | wave 1 |

### Wave 0 (the controller, on `version-8-4`; rulings 1460-1464)

Only what two tracks would otherwise fight over. No behaviour changes: the full suite passes as on 8.3.

1. **Tests:**
   - the aggregators `tests/v84/all.js` and `tests/v84/{g,r,e,balance,docs}/all.js`, each imported once;
   - `tests/all.js` imports `./v84/all.js` after `./v83/all.js`;
   - the ledger.
2. **The new goods** in `src/data/goods.js`:
   - `cedar` and `ivory`, kind `'raw'`, so storehouses keep them with no change to `stores`;
   - `incense` keeps its kind and gains the luxury flag;
   - all three carry `luxury: true` and `perResidentPerMonth: 0.01`;
   - a new `LUXURY_GOODS` list.
3. **Their values:**
   - `GOOD_VALUE` (`src/data/court.js`): cedar 45, ivory 50;
   - the art icon slots, as plain placeholders that G draws.
   - Check every kind filter in the court, the yearly quota (`src/sim/pressure.js`) and the city events, and record what each does with a luxury. Recommended: the quota and the court never ask for a luxury (they are bought, not made).
4. **The partner rows** (`src/data/trade.js` `PARTNERS`): Byblos sells cedar (45, 240 a year, from Great city) and buys ivory (40, 80 a year); Nubia sells ivory (60, 80 a year).
   - **`drawDrift`** (`src/sim/trade.js`) draws every good that existed in 8.3 in its 8.3 order first, then the new ones. A test holds every 8.3 partner's drift for years 1 to 30 on three seeds, unchanged.
   - The arbitrage test (`ARBITRAGE_MARGIN`) passes with ivory.
5. **World version 11** (`src/sim/world.js` `WORLD_VERSION`, `src/save/migrate.js` `v10ToV11`, `src/save/serialize.js`):
   - the new tallies (design section 5) as a `STAGE84_TALLY` list, at 0 in new and migrated cities;
   - `world.luxuryFrom` (0 for a new city, the load day + 360 for a migrated one), in `REQUIRED` and validated as a whole day;
   - a test loads an 8.3 (v10) fixture and plays a year with today's behaviour.
6. **The seams** (each a stub with today's behaviour):
   - `src/sim/raids.js`:
     - `nextRaidEntry(world, index)`, factored out of `raiseWarning` with today's draw (E owns its body, R calls it);
     - two calls at the end of `endRaid`: `raidSpoils(world, report, won, events)` from a new `src/sim/spoils.js` (R) and `report = { ...report, ...raidReportExtras(a) }` from a new `src/sim/elephants.js` (E). Both return nothing new yet.
   - `src/render/scouts.js` with `scoutWalkers(world) -> []`, joined to the walker list in `src/render/units.js` by one line (R fills the file; E owns `units.js`).
   - `src/audio/sfx.js` gains two no-op entries, `trumpet` (E) and `fanfare` (R).
   - `RAID_SALT` registers `elephant: 8109`, `panic: 8110` and `scouts: 8111`.
7. **`src/ui/text.js`:** three empty sections appended in merge order, each headed `// Version 8.4, Track G`, `// Version 8.4, Track R`, `// Version 8.4, Track E`. Each track writes only under its own header.

### File ownership (who may edit what)

| Files | Owner |
|---|---|
| **The tax rate:** `src/data/palace.js` (`TAX_RATES`); `src/sim/palace.js`; `src/sim/economy.js` (`monthFigures`, `monthlyEconomy`, `stats.lastMonth` fields); `src/sim/mood.js` (the Taxes row); `src/sim/score.js` (the taxes term). **Rush:** `src/data/monuments.js` `MONUMENT` (rush fields); `src/sim/monuments.js`; `src/sim/costs.js` (a new `rushGoldPerUnit` appended at the end of the file only). **Luxuries:** `src/data/housing.js`; `src/sim/housing.js`; `src/sim/distribution.js`; `src/data/buildings.js` (the bazaar's `sells` and `stock`); `src/data/goods.js`, `src/data/trade.js`, `src/sim/trade.js` after wave 0; `src/sim/advice.js`, `src/sim/adviceFixes.js`, `src/data/adviceFixes.js`. **UI:** `src/ui/monumentSheet.js` (the palace and site sheets), the house sheet, the Trade sheet's luxury rows. **Balance drivers:** the luxury habit in `tests/v50/grand/grandRun.js` and, if the great-work run has grand homes, `tests/v60/a/greatWorkRun.js` | G |
| **The clock:** `src/data/raids.js` (`RAIDS` timing, `leanDays`, new `SCOUTS` and `SPOILS` rows); `src/data/mood.js` `DANGER_MOOD`. **`src/sim/raids.js`, these functions only:** `raidDay`, `laterWarnDay`, `raidMood`, `raidAlerts` (the scouts' info alert), `payTribute`'s call to `laterWarnDay`. **New files:** `src/sim/scouts.js`, `src/sim/spoils.js` (the `endRaid` seam's body), `src/render/scouts.js`. **Pay:** `src/sim/costs.js` `soldiersPayOf` only. **UI and sound:** `src/ui/v60/battle.js` (the beaten-raid moment); `src/audio/sfx.js` `fanfare` | R |
| **The data:** `src/data/armies.js` (`ENEMY_TYPES.elephant`, `ELEPHANTS`, `MATCHUPS`' elephant cells, `TOWER_VS`). **The mix:** `src/sim/armies.js` (`drawMix`, `raiderKinds`, `counterModel`, the upriver entry). **`src/sim/raids.js`, these functions only:** `nextRaidEntry`'s body, `raiseWarning`, `arrive`, `bandSpeed`, `canBreak`, `tributeFor`, `tributeQuote`, `towersNeeded`'s callers there. **New file:** `src/sim/elephants.js` (panic, stampede, ivory, the report seam's body). **Combat:** `src/sim/combat.js`. **Drawing:** `src/render/units.js`, `src/render/art/armies.js`, `src/render/effects.js`. **UI and sound:** the raid sheet (`src/ui/dangerSheets.js`, `src/ui/s46/armies.js`), the elephant picture card (`src/ui/cards.js` / `cardMoments.js` entries); `src/audio/sfx.js` `trumpet` | E |
| `src/ui/text.js` | each track only under its own wave-0 header. An older line is changed by reassigning it from the track's own section (`Object.assign(S46_ARMY_TEXT.enemy, ...)`), never by editing the older section |
| `src/data/tips.js`, How to play | each track adds its own entries only |
| `src/sim/world.js`, `src/save/*`, `RAID_SALT` | wave 0 only; a track that needs more asks the controller |
| `src/sim/lesson.js`, `src/data/lesson.js`, `src/ui/lesson.js`, `src/ui/v60/lesson.js`, `src/ui/v81/lessonLock.js` | no track. A lesson test that fails is reported to the controller, who rules |
| The balance runs' own files and pins (`tests/stage4/balance`, `tests/stage47`, `tests/v60/balance`, `tests/v60/a/balance.test.js`, `tests/v70` balance, `tests/v50/grand/balance.test.js`) | wave 2's balance check. G may change only the drivers named in its row |
| `src/data/releases.js`, `APP_VERSION`, README, rulings Part 26 | the docs step at the end only |

**Where both R and E touch `src/sim/raids.js`,** they edit different functions, and wave 0 leaves the one they both need (`endRaid`) as two seam calls. On a merge conflict, keep both sides. `src/sim/costs.js` is the same: R edits `soldiersPayOf` in place, and G appends one export at the end.

Merge order G → R → E, then regenerate `sw-files.js`.

## Rules for every track

- **Commit identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com`.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never write Josh's employer's name anywhere, including in briefs. The controller's guard script must print GUARD OK before every commit.
  - Josh's friend is "a friend".
- **sw-files.js:** after editing `src/`, `css/`, `index.html` or `assets/`, regenerate it.
  - Run it in the **PowerShell tool** as `Set-Location <worktree>; & ./tools/sw-files.ps1`. The `powershell -ExecutionPolicy Bypass` form of this command is refused by the auto-mode check.
  - Rerun it after the last edit, and in the commit that ends a track.
  - Never hand-edit `sw-files.js`. On a merge conflict, take either side and regenerate.
- **Tests:**
  - **The full suite:** before every commit, `tests/run-tests.ps1 -WaitSeconds 1800` prints ALL PASSED. Run it from Bash through the controller's scratch suite wrapper, which holds a one-at-a-time lock and calls `timeout 4000 powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`. Start it in the background. **Only one full suite runs on the machine at a time.**
  - **Iterating:** use `-Grep "v84 <track>"`.
  - **No reruns in a loop:** an agent never loops full-suite reruns. A test that fails in the full run but passes alone is reported, not rerun again and again.
  - **The timing flake:** "stage 2 placement preview" (`tests/ui/overlaysStage2.test.js`) flakes under load. Rerun it alone before treating it as real (ruling 1445).
  - **Balance pins:** a track whose change moves a balance run beyond an asserted bound does not re-pin it. It reports the measured value, before and after, and the controller rules (the balance check owns the pins). G's luxury habit in the drivers it owns is the one exception.
- **New tests** go in `tests/v84/<track>/`, with describe names starting `v84 <track>` (g, r, e). Never delete an older test. Update it to the new numbers or behaviour, and say which in the report.
- **Git hygiene:**
  - Stage files by path; never stage `.superpowers/`.
  - Never push.
  - Never run `python -` with a heredoc.
  - Never write source files through a shell heredoc, echo or sed: use the edit tools.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- **Words match the sim.** Every number on screen comes from the sim's own function or data, with a test that sets the world up both ways. Advice never suggests what the sim would refuse. Rush's quote, the tax rate's effect, the luxury cause, the scouts' side, the weapons' days left and the elephant lines all have such a test.
- **The sim stays deterministic:**
  - No `Math.random`, `Date` or `performance.now` in `src/sim`. Draws are `hash2(world.seed, ..., RAID_SALT.x)`.
  - No memo in a sim function the UI also calls may outlive one tick, unless its key covers every input it reads.
- **Old saves load:**
  - the 8.3 (v10) fixture loads at version 11 and plays a year with today's behaviour: taxes Normal, no Rush, Villas kept for 12 months, its scheduled warning on its day;
  - a test saves and reloads a city with a Low rate, a rushed site, `raid.spoils`, a warned elephant raid and a stampeded elephant in a report.
- **The lesson:** every new rule, button or cost is checked against the lesson (design section 8). Nothing may leave a step waiting with no way on.
- **Ruling numbers** come from each track's range below, so two tracks never take the same number. Each track writes its rulings to `docs/superpowers/notes/2026-10-28-version-8-4-rulings-<track>.md`, one line each with its cost if wrong.

### UX rules (every UI change; reviewers check each)

- **Layout:** one panel at a time; nothing floats over the middle of the map. The celebration and the scouts' caption use the alert and caption rows, never a card in the middle (the elephant picture card is the existing first-danger card, shown as the others are).
- **Sizes:** `tests/ui/mobileBudget.test.js` passes at 375x667 and 390x844, at 100/125/150% text.
- **Controls:** 44x44 tap targets with accessible names, and a keyboard path on desktop (Tab, Enter or Space, Esc closes). The three tax choices are one radio group.
- **Not colour alone:** the tax choice carries its word, a rushed site says "Rushed" on its sheet and its label, and an elephant is a shape (trunk and tusks), not a tint.
- **Reasons and consequences:** every choice states its consequence before the tap:
  - the tax rate's gold and mood;
  - Rush's days and gold, and that materials still limit it;
  - a luxury's partner and price.

  Every refusal says why, with Show me.
- **Screenshots:** every new or changed screen at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, before review and after the fix wave. Shots are named `v84-<track>-*.png` in `docs/superpowers/notes/screenshots/raw/v84/`, which is gitignored. The list:
  - **G:** the palace's tax rate; a monument site's Rush with its price; a Villa's luxury need (phone and desktop);
  - **R:** the scouts on the horizon before a warning; the beaten-raid moment;
  - **E:** a band with elephants at a wall; the raid sheet's "what helps" lines for it.

## Tracks

### Track G: gold (Opus; rulings 1465-1484)

- **The tax rate.**
  - **Data:** `TAX_RATES` in `src/data/palace.js`: `low: { factor: 0.75, mood: 8 }`, `normal: { factor: 1, mood: 0 }`, `high: { factor: 1.25, mood: -8 }`, and `TAX_ORDER`.
  - **The command** `setTaxRate(world, palaceId, rate)` refuses with `not_palace` or `bad_rate`. It is not undoable and needs no gold. `taxRateOf(world)` gives the palace's `tax`, or `'normal'` with no palace or none set.
  - **Gold:** `monthFigures` returns `taxes` (at the rate, rounded once) and `taxesNormal`. `monthForecast` and `balanceWith` follow, since they read it.
  - **Mood:** `updateMood` adds a `taxes` row while it is not 0. Its name is in G's text section ("Taxes").
  - **The score:** `scoreOf`'s taxes term reads `taxesNormal` per person. A test: one city at all three rates scores the same.
  - **For 9.0:** each month's end adds 1 to `taxLowMonths` or `taxHighMonths`.
  - **The sheet:** the palace sheet gains a Taxes row of three choices, each with its effect on this month's figures ("Low: 2,310 a month less, mood +8"). The forecast's taxes row names the rate when it is not Normal.
  - **Advice:** an item when the treasury holds more than 12 months of taxes at Normal: "Gold is piling up: lower taxes at the palace for mood, or rush a monument". It has Show me, and it is never shown with no palace.
- **Rush a course.**
  - **Data:** `MONUMENT.rushPace` 2 and `MONUMENT.rushGold` 3.
  - **Gold per unit:** `rushGoldPerUnit(world, style)` = `workGoldPerUnit x rushGold` (appended to `src/sim/costs.js`).
  - **The rule:** `crewDayUnits` x `rushPace` while `site.rush`, and `workPay` uses the rushed price. The premium goes to `tally.rushGold` and `stats.lastMonth.rush`. `commitCrew` clears `site.rush` when the course it was set on ends, and adds 1 to `coursesRushed`.
  - **`rushQuote(world, id)`** returns `{ ok, reason, days, daysRushed, saved, extra, perDay }`, at today's crews (`siteCrews`) and full supply.
    - It refuses with `not_site`, `finished`, `no_crew`, `waiting_offering`, `waiting_gilding`, `waiting_capstone` or `has_rush`.
    - `no_gold` applies when the treasury holds less than one rushed day.
  - **`setRush(world, id, on)`:** off at any time; nothing refunded or owed.
  - **The site sheet:** the Rush button with the quote, and its line "Crews work twice as fast on this course; each unit costs 3x the work gold. Stone and bricks must keep up". Once rushed: "Rushed: about N days to go", or "Rushed: waiting for stone" when the day's planned units were short (`planCrew`'s `short`).
  - **The site's label** on the map shows "Rushed".
- **Luxuries.**
  - **The need:** `TIERS[8].needs` and `TIERS[9].needs` gain `'luxury'`.
  - **In `housing.js`:**
    - a home's luxury on hand is the sum of `LUXURY_GOODS` in its stock;
    - the month's check consumes the month's need from them (cheapest first: incense, cedar, ivory, by `GOOD_VALUE`) and sets `met.luxury`, as `consumeGood` does for one good;
    - before `world.luxuryFrom`, `luxury` counts as met.
  - **`wantedGoods`** gains `LUXURY_GOODS` when `'luxury'` is wanted. `topUpHouse` takes them as one pool, as foods.
  - **Bazaars:** `bazaar.sells` adds `LUXURY_GOODS`, with a stock of 40 each.
  - **`needCause` for luxury:** the bazaar steps as for a good. Then:
    - `no_luxury_route`, with the cheapest partner open to this city's rank, when none of the three is held anywhere;
    - `luxury_not_bought` (with the good) when a route that sells one is open but its order is not Buy;
    - `good_far` as today.
  - **The Trade sheet:** marks the three goods "Luxury: Villas and Estates need one".
  - **`stats.lastMonth.luxuries`:** the gold paid to caravans and boats for luxuries (from `caravan`).
  - **The art:** cedar logs and a tusk, as goods icons.
- **Balance duties.** G's need moves the grand run (Villa and Estate by year 9). G adds the luxury habit to `grandRun.js`: it does what the advice names, opening Byblos and buying cedar to a keep level, so B10 holds.
  - If the great-work run has Villas or Estates (the probe says), G adds the same habit there.
  - G reports the grand run's Villa and Estate months before and after, and every other balance number it moved.
- **Tests:**
  - **The rate:** each rate's taxes and mood; whole-gold rounding; no palace; demolish; the score unchanged; the month tallies.
  - **Rush:** pace and price at Normal and Hard and at Capital's costs; a short stockpile pays nothing for units not laid; the great temple's offering still waits; `rushQuote` against a run of the sim; every refusal; it clears at the course's end.
  - **Luxury:** Villa and Estate use (3 and 4); any kind counts; downgrade after 2 months without; the 12-month grace on a migrated city; each cause and its Show me; the caravan buys to keep.
  - **Old saves.**
  - **The lesson:** items 4 and 5 of design section 8.

### Track R: raids (Sonnet; rulings 1485-1499)

R builds the rules with today's numbers in `RAIDS` (`firstWarnAfter` 720, `laterMin` 720, `laterMax` 1440, `leanDays` 0). Wave 2 sets 300, 360, 600 and 60. R's tests set 8.4's numbers on the world under test themselves (and restore them), so every rule is tested at its 8.4 values.

- **The clock.**
  - `raidDay` and the v3 migration's use of `firstWarnAfter` stay as they are.
  - `laterWarnDay(world, fromDay)` draws the gap as today. Then, when the arrival (`warn + RAIDS.warningDays`) falls within `RAIDS.leanDays` before the first day of Shemu, it moves the warning so the raid arrives on Shemu's first day.
  - Shemu's months come from `SEASONS` (`src/data/tips.js`), never typed again.
  - The first warning never leans.
- **The scouts.**
  - **The sim:** `scoutsAt(world)` in `src/sim/scouts.js` returns `{ entry, dir, days }` while `nextWarnDay - SCOUTS.days <= day < nextWarnDay`, no warning is up and no raid is under way, else null. `entry` is `nextRaidEntry(world, raid.index)`, the warning's own.
  - **The alert:** `raidAlerts` adds a non-critical `raid_scouts` alert at the entry.
  - **The caption:** fires once a raid: "Scouts on the eastern horizon: raiders may come within a month".
  - **The drawing:** `scoutWalkers` draws two or three scouts at the entry, still under Still.
  - **None:** on Peaceful, before the clock starts, or in the lesson.
- **Captured weapons.**
  - `raidSpoils` (`src/sim/spoils.js`): on a beaten raid, `raid.spoils = { until: day + SPOILS.days }`. It does nothing on a lost raid or a tribute.
  - `soldiersPayOf` x (1 - `SPOILS.share`) while `day < until`, rounded once to whole gold. The pay saved goes to `tally.spoilsGold` at the month's end.
  - `SPOILS = { share: 0.25, days: 360 }`.
- **The celebration.**
  - `DANGER_MOOD.raidBeaten` becomes +4 and gains its own `victoryDays: 90`. `raidMood` names the row `victory` for a beaten raid ("Victory") and keeps `raid` for a lost one. The lost raid's -8 for 180 days is unchanged.
  - The alert row's "Raid beaten" moment gains the weapons line and the `fanfare` sound. It stays non-modal and never pauses.
  - The forecast's soldiers row says the discount and its days left.
- **Reliable counts (for 9.0):** a test over the late run and the dangers runs checks:
  - `tally.raids === raidsBeaten + raidsLost` (plus 1 while active);
  - `tributes` counts apart;
  - a paid-off raid leaves no spoils.
- **Balance:** R reruns the balance group with its changes (the Victory mood and the pay discount move gold a little) and reports every number before and after. A bound it moves is reported, not re-pinned.
- **Tests:**
  - **The gap:** at 8.4's numbers, 360-660 and never earlier than drawn. Over 1,000 seeded draws, 45-55% of arrivals land in Shemu. The first warning is exactly `clockDay + firstWarnAfter`.
  - **The scouts:** their window and entry equal the warning's.
  - **The weapons:** pay with and without; the restart.
  - **The mood rows.**
  - **Old saves:** `raid.spoils` absent.
  - **The lesson:** design section 8 items 1 to 3, at both today's and 8.4's numbers.

### Track E: elephants (Opus; rulings 1500-1519)

- **Data** (`src/data/armies.js`):
  - `ENEMY_TYPES.elephant = { fromRaid: 8, hp: 60, damage: 3, speed: 1, breaksWalls: true, wallDamage: 6, trample: true }`;
  - `ELEPHANTS = { chance: 0.5, per: 8, max: 3, weight: 4, ivory: 10, panicChance: 0.5 }`;
  - `MATCHUPS.archer.elephant = { open: 2, nearWall: 2, melee: 0.5 }` and `MATCHUPS.soldier.elephant = { melee: 0.5, gate: 1.5 }`;
  - `TOWER_VS = { elephant: 1.5 }`;
  - `ENEMY_KINDS` gains `'elephant'`. Every reader treats a missing `mix.elephant` as 0.
- **The mix and the entry.**
  - **`drawMix`:** from index `fromRaid - 1`, `hash2(seed, index, RAID_SALT.elephant) < chance` gives `min(max, floor(size / per))` elephants, taken from foot (foot keep `MIX.footMin`). No other kind's draw moves.
  - **`nextRaidEntry`:** for such an index, the raider entry nearest the south-edge river mouth, else the nearest mouth (`riverWater`), else today's draw.
- **Strength.** `raidStrength(w)` = size + (weight - 1) x elephants. `tributeFor` and `tributeQuote` price towers from it. A test: a raid without elephants gives today's towers and tribute exactly. The lesson's and the score's calls stay on `size`.
- **Combat** (`combatDay`):
  - **Towers:** a tower's shot x `TOWER_VS`.
  - **Units:** archers and soldiers through `matchup` as today. A chariot of yours skips elephants when choosing its foe.
  - **Trample:** a trampling raider hurts every unit within `BESIDE`.
  - **Walls:** a wall-breaker hits the wall in its way for `wallDamage` (else `damage`).
- **Panic and stampede** (`src/sim/elephants.js`, called once a day after combat):
  - **The trigger:** an elephant first below half hp whose last hit was a tower's or an archer's draws `hash2(seed, elephant id, RAID_SALT.panic) < panicChance` once (`panicChecked`).
  - **A stampede:** 3 damage to each raider of its band (fallen ones counted as stampede kills), then it leaves the raiders.
  - **How it counts:** it is not added to `gone`, so it counts as fallen for the retreat rule. It never sets `left`, and `elephantsStampeded` counts it.
- **Ivory:** each elephant that falls (not stampeded) puts `ivory` units in the nearest working storehouse with room, by straight line from where it fell. The rest is lost. `ivoryTaken` counts it, and `raidReportExtras` adds `ivory`, `ivoryLost`, `elephants` and `stampeded` to the report.
- **The warning.**
  - The `raid_warning` event and the warning carry `elephants: n` when there are any.
  - E's text section leads the alert and the sheet with "War elephants!".
  - The `trumpet` sound plays in place of the horn.
  - The first elephant raid shows a picture card, as each first danger does.
  - A tip, `war_elephants`: "Archers and towers fell elephants; soldiers in melee do half, and chariots will not charge them".
- **The raid sheet's lines** (`counterModel`):
  - a `tower` entry in `helps` from `TOWER_VS`;
  - traits `tramples`, `stampedes` and `wallBreak` (`wallDamage / foot damage`, so "3x");
  - "chariots will not charge them" from the skip rule.

  E reassigns `S46_ARMY_TEXT.enemy.elephant` and wraps `counterLine` in its own section, for example "2 war elephants: they trample every unit beside them and break walls 3x faster; hurt by arrows below half, one may stampede back through its band. Your archers in the open deal 2x; towers 1.5x. But soldiers in melee deal half; chariots will not charge them".
- **Drawing.**
  - The elephant figure slot `raider_elephant` (a big body with trunk and tusks, a rider) and its health bar from `ENEMY_TYPES`.
  - A stampede drawn as the elephant running back to the edge (render only).
  - Ivory's landing as the goods label effect (`RAID_FX`).
  - Every effect is readable under Gentle and Still.
- **Balance:** elephants come from the 8th raid, so few runs meet one before wave 2 moves the clock. E reports any number it moved.
- **Tests:**
  - the mix by index, chance and size;
  - the upriver entry on classic, lake-fed and Great oasis maps;
  - hp, wall damage and trample;
  - each matchup and the chariot skip;
  - panic and stampede: once only, no ivory, counted as fallen, the raid still beaten;
  - ivory to the nearest store, and lost with none;
  - strength, towers and tribute;
  - the lines from the table;
  - old mixes without `elephant`;
  - the lesson (item 2: no elephants).

### Wave 2: balance, review, docs (rulings 1520-1539)

- **Balance check (Opus):**
  1. **The probes first** (design section 7).
  2. **The clock:** set `RAIDS.firstWarnAfter` 300, `laterMin` 360, `laterMax` 600 and `leanDays` 60. Update the pins they move (`tests/stage3/contract/dangerData.test.js`, the d2 cards' "24 months", the run headers' raid days), each with a ruling.
  3. **The new runs:** the capital and late runs' spending variants and the far-site run, in `tests/v84/balance/`.
  4. **The report.** It gives this table, every number before (8.3) and after (8.4), against the targets B1-B11:

| Measure | 8.3 | 8.4 | Target |
|---|---|---|---|
| Capital run, year-6 gold / lowest | 50,509 / 255 | | B1: at most 60,000 |
| Capital run, share of taxes spent (last 24 months) | 69.5% | | B1: 60-70% |
| Capital spending: year-6 gold / new jobs' share / all spent | (new) | | B2: at most 30,000 / at least 15% / at least 80% |
| First warning (days after the clock) | 720 | | B4: 300 |
| Later gaps (min-max) / Shemu share of 1,000 draws | 720-1,440 / ~33% | | B5: 360-660 / 45-55% |
| Late run: raids in years 7-15, all beaten / year-15 gold / profit ratio | 3 / 25,152 / 2.23 | | B6: 5-8 |
| Late spending: profit ratio at year 15 | (new) | | B3: at most 1.5 |
| Great-work run: day won / lowest / final gold | 7,021 / 3,945 / 10,579 | | B7: 6,900-7,100, at least 2,000 from the Seat |
| Dangers-on seed 5 / seed 10: day won, raids, lost | 6,669, 6, 0 / 6,084, 5, 0 | | B7: by 7,200, none lost |
| Elephants met / felled / stampeded / ivory stored | (new) | | B8: at least 1 felled, at least 10 ivory |
| Far site: units per crew-month without camp / with camp / rushed; camp price | (new) | | B9: 16 / 20 / 40; round(0.1 x founding) |
| Grand run: first Villa month / first Estate month | by year 9 / by year 9 | | B10: both by year 9 |
| Tax: score at Low, Normal, High in one month | (new) | | B11: equal |

  Every existing balance assertion holds after the merge, or is re-pinned with a ruling that gives both numbers. If a target is missed, the check says by how much and which one data number would meet it, and the controller rules.
- **Final review (Opus)** of the whole branch, with the UX rules, the usability pass at every size, the screenshots and the ledger. Wait for any helper sub-reviews it starts. Then one Sonnet fix wave split by file ownership, and a Sonnet re-review.
- **Docs:**
  - README;
  - the follow-ups note `notes/2026-10-28-version-8-4-followups.md`, with Josh's real-phone checks:
    - the tax choice on the palace;
    - Rush on a site, and its price against the gold taken;
    - a Villa's luxury row, and buying cedar;
    - scouts before a warning;
    - the beaten-raid moment;
    - an elephant raid at a wall and its raid sheet;
  - rulings Part 26;
  - a What's new entry for **8.4 "Gold and war"**, with 8.3's build set to its last commit on main before 8.4's merge, and the pinned release tests moved down one;
  - `APP_VERSION` set to 8.4.
- **Merge** to main locally, rerun `tools/sw-files.ps1`, and run the full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 26)

1460. World version 11: the new tallies start at 0, and a migrated city gets 12 months (`luxuryFrom`) before the luxury need counts; every other new field is optional, absent meaning today's behaviour. — Cost if wrong: one more migration to keep.
1461. The luxuries are cedar and ivory (new raw goods) and incense (Punt's, unchanged), each flagged `luxury`; there is no lapis. — Cost if wrong: a fourth luxury later is one data row.
1462. New partner goods draw their yearly drift after every 8.3 good, so no saved city's prices move. — Cost if wrong: none.
1463. The raid clock's numbers (300; 360-600; the 60-day lean) land in wave 2's balance check; Track R builds the rules with today's numbers. — Cost if wrong: R's tests set the numbers themselves, which a careless test could leak.
1464. Wave 0 adds the seams (`nextRaidEntry`, `endRaid`'s two hooks, the scouts' walker hook, the `trumpet` and `fanfare` entries, `RAID_SALT` 8109-8111, the three text.js headers). — Cost if wrong: none.
1465. The tax rate (Low x0.75 and +8 mood, High x1.25 and -8) lives on the palace; with no palace it is Normal; it reaches people only through mood. — Cost if wrong: a city at mood 100 gains nothing from Low; one data row to retune.
1466. The score's taxes term reads the Normal-rate taxes, so the rate never moves the score and the score version stays 2. — Cost if wrong: a High city's score does not show its extra gold.
1467. Rush doubles the crews' pace on the course under way at 3x the work gold a unit, paid day by day; it ends with the course and can be cancelled at any time. — Cost if wrong: a rush starved of stone looks idle; the sheet says why.
1468. Villas and Estates need one luxury of any kind, 0.01 per resident a month times the tier's use; a missing one is any missing need. — Cost if wrong: grand homes fall where no route is open; Advice names the fix.
1469. Cedar comes from Byblos (45, 240 a year), ivory from Nubia (60, 80 a year) and elephants; Byblos buys ivory at 40; incense is unchanged. — Cost if wrong: prices retune in data.
1485. The first warning comes 300 days after the clock starts, and later ones 360-600 days after the last arrival, at every difficulty; a save's scheduled warning keeps its day. — Cost if wrong: young cities meet raids before towers are affordable.
1486. Later raids lean to Shemu: an arrival within 60 days before Shemu waits for its first day; the first raid never leans. — Cost if wrong: raids grow predictable by season.
1487. Scouts stand at the coming raid's entry for the 30 days before each warning; they never move it, and the lesson's raid has none. — Cost if wrong: none to the sim.
1488. A beaten raid gives Victory (+4 mood for 90 days; it was -3 for 180) and captured weapons (every unit's pay 25% less for 360 days, restarted by the next win). — Cost if wrong: a small gold and mood lift per win.
1489. The celebration is the alert row's moment with a fanfare; it never pauses and never covers a card. — Cost if wrong: easy to miss.
1500. War elephants: 60 hp, 1 tile a day, 6 a day to walls, trample 3 to every unit beside them; from the 8th raid, a seeded half of raids bring floor(size/8), 1 to 3. — Cost if wrong: too rare or too strong; data retunes.
1501. Matchups: archers 2x at range and half in melee, towers 1.5x, soldiers half in melee; your chariots never go out to one. — Cost if wrong: a defence that cannot answer elephants; the sheet's lines say what helps.
1502. Panic: once below half hp from an arrow, a seeded 1-in-2 stampede deals 3 to its own band and leaves; it counts as fallen, drops no ivory and never makes a raid lost. — Cost if wrong: elephants beat themselves too often.
1503. An elephant counts as 4 raiders for towers needed and tribute; a raid without one prices as today. — Cost if wrong: tribute jumps on elephant raids.
1504. An elephant raid's first band enters by the raider entry nearest the south-edge river mouth (upriver), decided by the raid's index, so the scouts stand where it comes. — Cost if wrong: on an odd map "upriver" looks arbitrary.
1505. A felled elephant leaves 10 ivory in the nearest working storehouse with room; without one it is lost, and the report says so. — Cost if wrong: ivory wasted in a city without storehouses.
1520. The balance check owns every balance pin and the new spending and far-site runs; a track only reports what it moved. — Cost if wrong: a track's merge waits on a pin it could have fixed.
