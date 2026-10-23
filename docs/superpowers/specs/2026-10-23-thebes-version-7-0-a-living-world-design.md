# Thebes Version 7.0 "A living world" — design

Agreed with Josh on 23 Oct 2026, after Version 6.0 "A harder Nile" went live (main 588116e) and while 6.0.1 (the great work with the dangers on, the lesson's fire step) is being finished. Builds on 6.0.1. Authority: the original spec `specs/2026-10-09-thebes-design.md`, this design, the plan that follows it, and the rulings appended to `notes/handoff-2026-10-11/rulings-so-far.md` as "Part 18: Version 7.0" (rulings 850 on).

## What Josh asked for

All four parts of the old "A living world" idea (goals after Capital already shipped in 6.0), plus the two Advice fixes found in 6.0. His picks, 23 Oct:

1. **Trade:** both more partners and more control, kept lean.
2. **City events:** a mix of welcome and troublesome ones.
3. **Seasons:** looks only, on the Nile's calendar (no change to how farms work). **Day and night:** yes, gentle, and can be turned off.
4. **Sound polish:** my call (below).
5. **Shape:** Version 7.0, with the Advice fixes folded in, built the 6.0 way.

His standing requirement for this release: **the UX must be clean and simple on both mobile and desktop.** Every new screen is checked at 375x667 and 390x844 (portrait), 667x375 (landscape), 100/125/150% text, 1280x800 and 1920x1080, before review and again after the fix wave. The final review grades usability, not only correctness.

## 1. Trade

Today: a trading post opens routes to Memphis (from Market town) and Byblos (from Great city); a caravan comes every three months with fixed quotas (`src/data/trade.js`, `src/sim/trade.js`).

- **Two new partners, by river.** Nubia opens at Capital: it sells stone and gems more cheaply than Memphis and Byblos, and buys grain and linen. Punt opens at Great Capital and is the only seller of **incense**, a new good that is used by festivals (section 2) and needed for nothing else, so it does not reopen 6.0's balance. River partners need a **Quay**, a new 2x1 building on a riverbank tile with a road. Nubia and Punt send boats instead of caravans, on the same three-month rhythm and quota rules.
- **Visible arrivals.** Caravans walk in along the entry road to the trading post; boats sail up the river to the quay and back. These are render-only (no new sim state beyond what trade already tracks), and they follow the Motion setting (Still: none shown moving; an arrival is a short alert-row line).
- **The Trade sheet** (opened from the trading post, the quay, or a Trade row in the summary). One card per route. Each card shows:
  - the partner and its next arrival in months;
  - each good it buys and sells, with an on/off switch;
  - last year's profit.

  Below the cards, a city-wide **Keep at least** list (one row per good the city stores) lets the player set a floor that trade never sells below. Goods owed to the great temple's waiting stage or an accepted court demand are held back automatically and labelled as such. Phone: a bottom sheet with one route open at a time (an accordion), and switches and steppers at 44x44 or larger. Desktop: the side panel shows all routes.
- **Words match the sim.** Every price, quota and floor shown comes from the trade functions, with tests both ways (floor met vs not; offering held vs not).

## 2. City events

- **How often:** one or two a year, from Town. Never while a danger is striking, never when a court deadline is under a month away, and never two at once. Events draw from the world's seeded rng (deterministic), each kind on its own cooldown.
- **Pool:** about 16 kinds, half welcome and half troublesome, and bigger cities draw bigger ones. Examples:
  - *Welcome:* the Festival of Opet (spend beer and incense for a lift in mood for some months); a visiting envoy (a gift for favour); a bumper harvest; a master craftsman asking to settle (pay to have one workshop work faster for a year); a scribe's census.
  - *Troublesome:* a strike at the quarry (raise wages, or stone output halts for two months); a feud between two streets (send the police, or mood falls in that area); a thief in the market (police coverage decides the loss); a caravan lost in the desert; a sandstorm that dusts the stores.
- **The card:** one card per event with at most three choices. Each choice states its exact cost and result before the tap, in game months. An unanswered event takes its stated default when its time runs out. Events never push a city in debt deeper: a choice that costs gold is disabled with the reason when the city cannot pay, and the default never costs gold.
- **Where it shows:** a one-line entry in the alert row ("An envoy from Byblos"). It never pops over the map. Tapping it opens the card: a bottom sheet with large buttons on a phone, the side panel on desktop. Advice lists a waiting event. Recent keeps the outcome. How to play has an Events entry. A first-moment picture card introduces the first event.

## 3. Seasons, light and sound

- **Seasons:** flood, growing and harvest, timed to the existing flood calendar. Land, fields, palms and the river blend between seasons over about a game month (a render-side colour grade and field art states). The sim is unchanged. The top bar shows the season after the date. Still motion switches the look at the season boundary with no blend.
- **Day and night:** a real-time loop of about six minutes, independent of the game clock (a game day lasts about a second, so the light cannot follow it), covering dawn, day, dusk and a short soft-blue night with lamps lit in homes and along streets. Night never lowers contrast below the UX rules' readability bar, and nothing is hidden. Settings has "Day and night: on/off" (default on). Still motion keeps daylight. The loop holds while the game is paused.
- **Performance budget:** lighting and season grading add at most 2 ms a frame at the Huge map's zoom floor in headless 1920x1080. This is tested, like the 6.0 battle layers.
- **Music:** a mood per season, and a tenser variant while a raid or danger warning is live. It uses the existing Web Audio music system (no audio files), and the first tap still starts it.
- **Effects:** short, quiet, code-made sounds for placing a building, laying road, a market bustle near the view, fire crackle, battle clash, caravan bells and boat oars. Settings gets separate Music and Effects volumes (the existing Sound switch stays as the master).

## 4. Advice fixes (from 6.0)

- **Raid towers:** Advice's tower fix and Show me offer only a spot where a tower can be staffed (it has a road) and that stands within tower range of the raiders' first target (`firstRaidTarget`). If none exists, the fix names the step that makes one ("Lay a road to here, then build the tower"). This replaces the 6.0 fallback to a roadless spot. Re-record the advice pins.
- **Stranded goods:** when a good is stored beyond a cart's sensible reach of the bazaar that needs it, Advice says "Build a storehouse near this bazaar" and Show me aims at a valid spot near it, replacing today's Fetch-order fix (which does not help).

## 5. Saves

World version 10 adds trade settings (switches, floors), the events record (cooldowns, the waiting event) and the Quay. A v9 city loads with every switch on, no floors, no waiting event, and its first event no sooner than a year after load. Settings get the day/night switch and the two volumes, defaulting to the current behaviour.

## 6. How it is built

The 6.0 process:
1. **Track 0 (Opus):** the contract (API shapes, file ownership, merge order), the save migration and the shared seams.
2. **Wave 1, three tracks in sibling worktrees:** T (trade and the quay, Opus), E (events, Sonnet) and S (seasons, light and sound, Sonnet). Each is implemented, reviewed by Sonnet, and given at most two fix rounds.
3. **Wave 2:** A (the Advice fixes and How to play / What's new words, Sonnet).
4. **Wave 3:** a balance check (Sonnet). Every 6.0 run's assertions hold, events never sink a run, trade floors protect offerings, and the 6.0.1 great-work pin holds with the dangers on.
5. **Final review (Opus) with a usability pass at every listed size,** then one Sonnet fix wave, then a Sonnet re-review.
6. **Docs and What's new; Josh signs off before the push.**

The usage guard: stop at a clean commit if the weekly all-models limit passes 90%. The full suite (one at a time), the guard script, the sw-files rule and the commit identity and trailer are as in 6.0.

## Not in this release

Seasons that change farming. Moving buildings. Rotating the view. New monument kinds. Store builds (Steam/Google Play come after, as planned).
