# Thebes v10 roadmap: A living Nile, A fair reign, More each year (approved shape, 11 Nov 2026)

**Josh's calls (11 Nov 2026):**
- The review (`notes/2026-11-11-v10-review.md`) and the first 10.0 design proposed a store release first. Josh: "I would rather refine the visuals and gameplay first." The desktop scale and the first-view work stay; the Steam shell is parked (`2026-11-11-thebes-version-10-0-store-ready-design.md`, section 3) until after this series.
- Gameplay: **all four** threads he was offered: choices in the first hour, hours 3 to 6, more to do each year, and the difficulty and economy feel.
- Visuals: **more life and motion**, and **polish the existing visuals further**.
- Split and order: "Do all of it, outside of the Steam shell." Three releases, visuals first, each shipped and pushed on its own once Josh says go, as v9 did.

## 1. The rules behind the series

1. **The city should look alive before it asks more of the player.** Life and motion are render-side only (ruling 852's line: never in the sim or the save), so 10.0 changes no rule and can ship without a balance pass.
2. **Every gameplay change is a decision or a fairness fix.** 10.1 adds choices and repairs what the reviews proved unfair (monuments that wait, heirs that cannot win, gold that piles up); it adds no system. 10.2 adds the systems.
3. **Measured, not loosened.** The frame budgets tighten to the 9.1 targets in 10.0 and stay there; every later track that draws must pass them.
4. **One panel at a time, nothing floating over the middle of the map, "Pharaoh" in no game text, no colour-blind work (ruling 1700), the sim deterministic, nothing needs the network after load (610).** Unchanged.
5. **Josh's real-device pass is a gate, not a track.** It runs during 10.0 and its findings feed 10.0's fix batch and 10.1's gameplay calls.

## 2. 10.0 "A living Nile" (visuals)

The full design is `2026-11-11-thebes-version-10-0-a-living-nile-design.md`. In short:
- **The first view:** the camera held inside the map (at most about 30% of the screen off-map, at the start and on every camera write), the off-map ground drawn as fading desert with a soft rim, the scribe's bubble inside the phone height budget.
- **The desktop scale:** `--ui-scale` defaults by width on pointer devices (1.25 from 1600 px, 1.5 from 2200 px), a shorter top-bar date on wide layouts.
- **Polish what exists:** one button language, drawn dock and panel icons instead of text glyphs, the eight sprites without foot shadows, a quality pass over every drawing that 9.3's pass did not reach (nature, figures, units, boats, the monuments' scaffolds), legibility in the darkest night and every season wash, the title and sheets.
- **Life and motion:** townsfolk in the streets beyond newcomers and carts, a bazaar crowd, animals in the yards, more river life and boats with somewhere to go, builders on the monuments, lamps and smoke at night, heat shimmer at noon, a rare sandstorm, festival processions that fill the street, all under the Motion setting (Full, Gentle, Still) and within the tightened frame budgets.
- **Performance:** the budget tests' bounds become the 9.1 targets and a phone budget test joins them; the sprite cache warms the band outside the view; the far-view canvas is capped.
- **Rulings** 2050-2099 (Part 31); track ranges from 2100.

## 3. 10.1 "A fair reign" (gameplay)

Designed in full once 10.0 is built, from this outline and the real-device pass. Its sources are the deep review (`notes/2026-11-08-design-review-deep.md` D6, D7, D8), the 9.1 and 9.2 follow-ups and the review's R7 and R10.

- **Choices in the first hour** (the review's R7; 9.2 spec line 76 left it for after the phone pass):
  - one decision step in the lesson: two sites for the bazaar (near the farm, or near the homes), the next chapter names the consequence the player chose (food arrives sooner, or homes grow sooner);
  - one in the first-steps guide after the hand-over: the first goal is picked from two (grow to Town first, or a granary and a second food first), and the guide follows the pick;
  - the title's sentence and the guide's words say "choose" where today they say "do".
- **Hours 3 to 6:**
  - the middle monuments shortened and a monument that has waited a game month without its sheet opened gets one caption with its percentage (D7, ruling 1810's miss);
  - the four heirs that cannot win the great work (Generous, Builder, Merchant, Bountiful) retuned by adaptive scripts first, data numbers only where they still miss (the 9.1 rule), and the seed-5 raids re-measured;
  - the six-year Capital's alert rows at 12 or under (T5's miss);
  - every decree bar played once by a script and by a hand, with the Plague bonus and the Fire season cap settled (rulings 1986, 1990, 1991, 1992, 1994);
  - the Villa step (D6): the luxury chain taught by a goal at Great city before a sheet says "Missing".
- **Difficulty and economy feel:**
  - gold margins re-pinned so the late run holds under two years of profit and the great work's lowest gold is above a floor the player can read (9.2 follow-ups lines 37-39);
  - raids weighed against wealth and defence so a walled city is not surprised and an open one is (8.4's rule, re-measured after 9.3's looks);
  - the court's demand reads the flood (a Low year asks for less grain), and crime and health make fewer alerts and more consequences (a street that loses a home, a festival that heals);
  - the Manor step given a reason to want it (a Manor that houses a guild's crew, or pays a guild's wage), so the 2x2 merge is a choice and not a trap;
  - difficulty words (Relaxed, Normal, Hard) say what they change, in numbers, on the New city card.
- **Size:** medium, mostly sim and words; rulings from 2300. World version unchanged if the retunes stay in data; a bump only if a save gains a field.

## 4. 10.2 "More each year" (content)

Designed after 10.1's playtest says where the middle game is thin. Candidates, in the order the reviews rank them:
- **Trade with purpose:** the partners you have (Memphis, Byblos, Nubia, Punt) ask for things and offer things by season; a caravan or boat the player can see arrive and load (10.0's boats with somewhere to go give it the art); a trade goal per rank.
- **A festival and season beat with choices:** the festival temple's procession becomes a yearly choice (which god, which street, what it costs and what it gives), and the flood's three outcomes ask something (store grain before a Low year, open the canals in a High one).
- **City events that ask:** the one court stream's letters gain a third answer beyond pay or refuse where it makes sense (send the army, send the priest, send gold), each with a visible result in the city.
- **One of the roadmap's later items:** past cities as neighbours (a retired city becomes a trade partner on a later map) or the oracle's prophecy (a yearly line that is sometimes right). Neighbours reuse 9.0's rulers list and 10.2's trade; the oracle is cheaper but shallower. Recommended: neighbours.
- **Size:** medium to large; rulings from 2500; world version bump likely.

## 5. After the series: the store

The parked Steam design (section 3 of `2026-11-11-thebes-version-10-0-store-ready-design.md`): the Electron shell on `app://thebes` without Node, the packaging script, the smoke run, the Steam files and the store page set. Revived as its own release when Josh says the game is where he wants it, with Google Play after it.

## 6. Order and size

| Release | Size | Why here |
|---|---|---|
| 10.0 A living Nile | medium-large: art and render, no rules | Josh's order; render-side only, so it ships without a balance pass; it tightens the budgets every later release must pass; the real-device pass runs alongside it |
| 10.1 A fair reign | medium: sim, balance, words | Needs 10.0's budgets and the pass's findings; every item is a decision or a fairness fix that the reviews already proved |
| 10.2 More each year | medium-large: new systems | Designed on 10.1's playtest; reuses 10.0's boats, crowds and processions as its art |
| Store | medium: shell and files | After the game is where Josh wants it |

**Not in v10:** eras (new art per kingdom), moving buildings, rotate view, colour-blind palettes (unless Josh reopens it), a Linux or Mac build, controller input.
