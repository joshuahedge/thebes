# Thebes 9.3, the weekly decree: the design

**Josh's answers (10 Nov 2026):**
1. **What a run measures:** the usual city score plus a bonus part that each decree defines.
2. **When the week turns:** an unfinished run can be finished any time and still counts for its own week.
3. **Decrees a week:** one, and two every fourth week, from a hand-picked list of pairs.
4. **When a player first sees it:** once any city has reached Town.
5. **The approach:** A. Decrees are a rule table read through one `ruleFactor`, extending 9.0's traits.
6. **Section 1 (the decrees) and section 2 (the run):** "Looks right".
7. **The rest** (saves, the ruler list, rivals, the build): "Just go with your recommendations".

**Where it ships:** 9.3, beside the visual half ("A city that grows", `specs/2026-11-10-thebes-version-9-3-a-city-that-grows-design.md`). The roadmap's sketch is `specs/2026-10-27-thebes-v9-roadmap-design.md` section 5; this design replaces it where they differ. The plan is `plans/2026-11-10-thebes-version-9-3-the-weekly-decree.md`.

**The rules behind it (roadmap section 1):**
- **No guilt:** nothing is lost by missing a week.
- **A legacy is a choice, never power:** a decree run starts with the Steady heir for everyone.
- **No server:** scores travel by link.

## 1. The decrees

There are nine hand-written decrees. The roadmap's "Pharaoh's levy" is renamed **The Vizier's Levy**, because "Pharaoh" never appears in game text and the court is already the game's word for the crown.

Each decree adds a sixth score part, the **bonus part**, from 0 to 100, beside people, prosperity, culture, safety and monuments. A decree run therefore scores out of 600.

| Id | Decree | Twist | Bonus part counts |
|---|---|---|---|
| `sea_peoples` | Sea Peoples | raids come twice as often and larger, more of them by boat; walls and gates cost half | raids beaten |
| `low_nile` | Low Nile | floods one step weaker; farms make 30% less; granaries hold double | months with every Cottage-or-better home fed |
| `plague` | Year of the Plague | sickness spreads three times as fast; physicians cost half | months with no sick home |
| `stone_famine` | Stone famine | quarries work at half speed; brickworks at double | monument work laid (units) |
| `vizier_levy` | The Vizier's Levy | the court asks twice as much; its rewards pay double | court requests met |
| `open_city` | Open city | no walls or gates may be built | raids beaten |
| `golden_caravans` | Golden caravans | trade pays double; workshops make half | trade income over the bills |
| `fire_season` | Fire season | fires start three times as often; firehouses reach 12 tiles, not 8 | months with no building lost to fire |
| `southern_host` | The Southern Host | war elephants from the 2nd raid; archers cost half | elephants brought down |

### The bonus part
- Each decree's measure reaches 100 at a **bar**, set from scripted 6-year runs (section 7) the way 9.0's title bars were set.
- The part is `min(100, round(100 × measure / bar))`.
- On a pair week, the bonus part is the mean of the two decrees' parts, rounded.

### The week and its decrees
- **The week:** the device's own ISO week, Monday to Sunday. Only the interface reads the date; the sim never does.
- **The map:** the week's seed is `year × 100 + week`, 6.0's `weeklySeed` brought back. For example, week 47 of 2026 is 202647. The layout is drawn from `MAP_VARIANTS` by a hash of that seed. The size is Normal.
- **The order:**
  - The rotation counts weeks from the epoch, Monday 16 November 2026 (2026-W47), and works the same for weeks before it.
  - Every fourth week (`index % 4 === 3`) is a **pair week**.
  - The other three weeks take the next decree in a fixed order, so no decree repeats within nine single weeks.
  - The order is the table's: Sea Peoples, Low Nile, Year of the Plague, Stone famine, The Vizier's Levy, Open city, Golden caravans, Fire season, The Southern Host.
- **The pairs**, in turn:
  1. Low Nile + Golden caravans ("buy your food abroad");
  2. Sea Peoples + Fire season;
  3. Stone famine + The Vizier's Levy;
  4. The Southern Host + Open city (the hardest week);
  5. Year of the Plague + Low Nile.
- **The week's name:** the mark is the decree's name (or both names, joined by " and ") and the week, for example "Sea Peoples, week 47". It is shown on the title card, the HUD chip, the end card, the share card and the ruler list.

## 2. The run

### Starting
- **The card:** once any city on the device has reached Town, the title screen gains a **This week's decree** card. The test: a city row in the records with a Town split, or any ruler row.
- **What the card shows:**
  - the mark;
  - each decree's twist in one line;
  - what the bonus counts;
  - your best score this week, and the best rival's on this week.
- **Its button:** Start, Continue (a run of this week is in the decree slot) or Try again (this week's run has ended).
- **The same start for everyone:**
  - the Steady heir, Normal difficulty, a Normal map, and the week's seed and layout;
  - no beginner's guide, no daily goals and no Pass the throne;
  - the court, raids, fires, sickness, monuments and trade all play as in the main game, bent only by the decree.
- **The first screen** shows the decree card again: what changes, and what the bonus counts.

### During
- **The length:** 6 years, which is 72 months or 2,160 days. That is about 36 minutes at normal speed.
- **The HUD chip:** a small chip beside the date reads "Year 3 of 6" with the decree's mark. Tapping it opens the decree card.
- **The menu:** **Back to your city** saves the run in the decree slot and opens the main city (or the title, if there is none). **Start the decree again** asks first.

### The end
- **When:** at the end of the 72nd month.
- **What stops:**
  - The sim sets `world.decree.ended` and the speed goes to 0.
  - After that the sim's step does nothing, and every command is refused with reason `decree_ended`. The fixed length is what makes runs comparable.
- **The final score:** the score on the last day, not the best month end. A city that falls apart in its last month pays for it.
- **The end card** is 9.2's end card in shape. It shows:
  - the six parts and the total out of 600;
  - the medal on the decree's own scale (section 7);
  - "Your best this week";
  - the rivals on this week, side by side.
- **Its buttons:** **Share**, **Try again** (the same map and decree, from day one) and **Back to your city**.
- **The best:** each week keeps your best. Retries are unlimited.

### When the week turns
- An unfinished run stays in the decree slot and still counts for its own week.
- The card shows the new week's decree, with a line under it: "You have an unfinished run from week 46. Continue".
- Starting the new week asks first, because the decree slot holds one run.

## 3. Saves and the ruler list

### The decree slot
- `createSaveStore` takes a `slot` option. The default `''` is today's store, unchanged. With `'decree'`:
  - IndexedDB keys are `decree.staging`, `decree.current` and `decree.backup`, in the same object store;
  - localStorage keys are `thebes.save.decree.staging` and so on.
- The staging, validate and backup steps are the same as the main slot's.
- **Isolation:** saving or clearing one slot never touches the other's keys.
- **Export:** the export file carries the main city and the records, as today. The decree run is not exported; a run is short, and its best is in the records.
- **The city:** `createWorld({ decree: { week, ids } })` sets `world.decree = { week, ids, endDay: 2160, ended: false }`.
  - `week` is a string like `'2026-47'`, and `ids` lists the decree ids.
  - The field is optional, so `WORLD_VERSION` stays 12 and every older save opens as it was.
  - A decree save loads only into the decree slot's game.
- **Boot:** a decree game runs as `current.decree`, the way `current.lesson` runs today.
  - Its hooks drop Pass the throne, the heir picker, a new city and Export.
  - Its saves go to the decree slot.
  - It writes no city row to the records, because `records.cities` is for main cities.

### The records
- Records version 3 adds a `decrees` list. A version 2 blob reads with the list empty.
- **A decree row:** `{ id, week, ids, mark, score, parts, medal, day, map, feats, title, name, tries, date }`.
  - It keeps the best ended run on that week, one row per week, kept for good like rulers.
  - `parts` holds the six parts; `map` is the 32 × 32 map square; `name` is the dynasty's name at the time.
  - A better run replaces the row. `tries` counts every ended run.
- **The ruler list** shows decree rows beside rulers, by date, each with its mark and medal.
  - They take no regnal number and pass no trait.
  - Tapping one replays its map, as a ruler row does.
- **Export and import** carry and merge `decrees` by week. The higher score wins, and the two `tries` counts are added.

## 4. Rivals and sharing

- **A decree link:** `SHARE.base + '#d1.<year>-<week>.<six parts joined by ->.<months to each split>.<check>'`, followed by 9.0's `&name=…&heir=s` when the player has a name.
  - The seed, difficulty, size and layout all follow from the week, so the link does not carry them.
  - The check is computed as the t2 link's is.
  - An older game reads a `d1` hash as no share link and opens its title as usual.
- **Opening a decree link:**
  - A named sender is kept as a rival on that week (a rival row with an optional `week`).
  - The title opens on that week's decree card, for this week or any past week. That is how a friend who is behind catches up.
  - A link only adds rivals and opens a week; it never changes a score.
- **Two friends on one week** play the same map and the same decrees without any link. Share is what tells each the other's score.
- **The share card and its text:** "Sea Peoples, week 47: 412 of 600, silver", with the emoji row of the six parts.

## 5. How a decree changes the rules

`src/data/decrees.js`, a leaf, holds `DECREES` (one entry per decree), `DECREE_ORDER`, `DECREE_PAIRS` and `DECREE` (`{ years: 6, epoch: '2026-11-16' }`).

### The levers
`src/sim/rules.js` reads the decree's levers in four shapes:

1. **Factors**, multiplied in `ruleFactor(world, lever)`:
   - the result is the heir's `heirFactor(world, lever)` times each decree's factor for that lever, and 1 when neither has one;
   - 9.0's call sites switch from `heirFactor` to `ruleFactor`;
   - the new factor levers are:

     | Lever | What it scales |
     |---|---|
     | `raidGap` | the first warning's and later warnings' days |
     | `raidSize` | the band's size |
     | `granaryHold` | a granary's capacity |
     | `sickSpread` | `HEALTH.spreadChance` |
     | `fireStart` | the daily chance a fire starts |
     | `courtAsk` | the court's request amounts |
     | `courtReward` | the court's rewards |
2. **Per-type maps:**
   - `ruleCost(world, type)` covers walls, gates and physicians, read in `costs.js costOf`;
   - `ruleRate(world, type)` covers the quarry and the brickworks, read where `production.js` reads `heirRate`;
   - `ruleUnitCost(world, kind)` covers archers.
3. **Values:**
   - `ruleReach(world, type)` gives the firehouse's reach of 12;
   - `ruleElephantsFrom(world)` gives the raid index elephants come from (2);
   - `ruleBoatShare(world)` gives the share of raids that land by boat;
   - `ruleFloodStep(world)` gives the flood's level step (−1).
4. **Forbidden builds:** `ruleForbids(world, type)` covers walls and gates under Open city. Placement refuses them with the reason `decree`, and the build menu shows them locked with the decree's line.

**The main game:** with no `world.decree`, every rule function returns exactly what the game reads today. `ruleFactor` is `heirFactor`, and the others give the data's own number. A golden test pins this:
- before any lever moves, it records a fingerprint of the scripted six-year Capital (`tests/v92/helpers/capital6.js`, seed 5, dangers on);
- the fingerprint is each month end's gold, people, milestone, score parts, raid results and tally;
- every later commit must give the same fingerprint.

It deliberately leaves out the saved bytes, because the visual half adds an optional `day` to every building.

**Tallies and measures:**
- New `world.tally` counters:
  - `wellMonths`: month ends with no sick home;
  - `fireSafeMonths`: month ends with no building lost to fire that month.
- Both counters start at 0 when missing, so old saves need nothing.
- The other measures already exist: raids beaten (the Unconquered's measure), `fedMonths`, monument units, `requestsMet`, trade gold over bills, and `elephantsFelled`.
- `decreeMeasure(world, id)` reads one decree's measure, and `bonusPart(world)` gives the part.

**The score:** `scoreOf` is unchanged. `decreeScore(world)` adds the bonus part to the five parts, and `SCORE_VERSION` stays 3. A decree score lives only in decree rows and decree links, so it is never compared with a main-game best.

## 6. Words

All new strings go under `// Version 9.3, Track U` in `src/ui/text.js`:
- each decree's name, twist line and bonus label;
- the mark;
- the card;
- the chip;
- the end card;
- the menu rows;
- the locked-build line;
- the unfinished-run line;
- the share text.

Words follow 9.2's glossary. "Pharaoh" appears nowhere. "Decree" is the mode's one name: never "challenge" or "weekly".

## 7. Balance

The scripted runs are the six-year Capital (`runCapital(72, { dangers: true })`, ending on day 2,160), given each decree's rules. They run per decree and per pair. The script places buildings at fixed tiles, so they all play on its seed-5 map; the week's own maps are covered by the map tests (every week's map passes `generateMap`'s checks, as any seed does).

- **Bars:** a decree's bar is the scripted run's measure × 1.25, so 100 needs play aimed at the twist.
- **Medals:**
  - each decree and each pair has `[bronze, silver, gold]` out of 600;
  - bronze is the plain scripted run's total, rounded down to 10;
  - silver is +60 and gold is +120;
  - the numbers are checked so that the hardest week (The Southern Host + Open city) still gives the scripted run a bronze.
- **Every decree must be winnable:**
  - the scripted run reaches Town by year 2 on every decree;
  - it loses no more than half its raids on Sea Peoples, Open city and The Southern Host.
- A decree that fails a check is retuned in its own data row, never by changing the main game's numbers.

## 8. Testing

- **Data:**
  - every decree's levers are known levers;
  - every pair is in `DECREE_PAIRS`, and its two decrees exist and differ;
  - nine consecutive single weeks hold nine different decrees;
  - every fourth week is a pair week.
- **The week:**
  - `isoWeek` and `weeklySeed` on year edges (2026-12-31, 2027-01-04, a 53-week year);
  - the same week always gives the same seed, layout and decrees.
- **The main game is unchanged:** the 3-year comparison in section 5, plus the full suite.
- **Each lever:** for each decree, a world with it changes that one number the way the table says, and a world without it does not.
- **The end:**
  - at day 2,160 the sim stops;
  - commands are refused;
  - the final score is the last day's, with six parts.
- **Saves:**
  - the decree slot and the main slot never touch each other's keys, on IndexedDB and on localStorage;
  - a main save from 9.2 opens as it was.
- **Records:**
  - version 2 reads into 3;
  - a better run replaces the week's row, and a worse one only adds to `tries`;
  - merging adds the tries.
- **Links:**
  - a `d1` link round trip;
  - a bad check;
  - an unknown week;
  - a t2 link still opens as before.
- **UI:**
  - the card appears only after Town;
  - Start, Continue and Try again;
  - the chip;
  - the end card;
  - a phone at 375 × 667 and 390 × 844 at 100% and 150% text, and a desktop at 1280 × 800.

## 9. What does not change

- **The main game's rules:** every rule function is today's number when there is no decree.
- **`SCORE_VERSION`** stays 3 and **`WORLD_VERSION`** stays 12.
- **The heirs' traits.**
- **No server.**
- **No reduced-motion setting, no colour-blind work and no bundle.**
- **The lesson.**
- **The main save slot's format and keys.**
