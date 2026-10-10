# City-builder research: visuals, phone UX, game design and how each game teaches its early game

Researched 11 Oct 2026 for the visual, UX and early-game pass and for Stage 2. Five research passes, each written up as raw notes in `reference/city-builders/`:

- `impressions-lineage.md`: Pharaoh and Pharaoh: A New Era (2023), Caesar III, Caesar IV, Zeus, Emperor, plus the Julius/Augustus Caesar III engines.
- `historical-and-survival.md`: Children of the Nile, Nebuchadnezzar, Banished, Timberborn, Anno 1800, and short entries for Anno 117, Against the Storm, Manor Lords, Farthest Frontier, Foundation, Ostriv, Kingdoms and Castles, Patron and Dawn of Man.
- `phone-and-cozy.md`: Townscaper, Pocket City 1 and 2, Islanders (and New Shores, Mobile), SimCity BuildIt, Mini Metro and Mini Motorways, Dorfromantik, Kingdom, Polytopia, and short notes on fourteen more (Fallout Shelter, Two Point, Tiny Glade, Stardew's phone port and others).
- `onboarding-and-gamification.md`: talks, books and guidelines on teaching, tips, nudges, celebrations, daily goals, achievements and accessible tutorials (Hodent, Dan Cook, Factorio FFF #241, Cities: Skylines II's advisor, NN/g on coach marks, the Game Accessibility and Xbox Accessibility Guidelines, WCAG 2.2, streak and habit research).
- `visuals-and-interfaces.md`: 2 to 9 screenshots each of 18 games (store pages, player screenshots), read for palette, readability, life and chrome.

Everything is paraphrased reference. Screenshots were viewed, not kept; no asset, text or data file from any game is used. Many outlets block automated reading, so some verdicts come through Wikipedia or search summaries; the raw notes mark those and anything unverified. One fetched page (a wiki page about Pharaoh's files) carried hidden instructions aimed at AI agents; the researcher ignored it and used nothing from it.

## 1. The short version

The games that hold up best share five habits, and Thebes already has the bones of most of them:

1. **They teach inside a real city, one countable goal at a time.** Caesar III opens with "reach 150 people", Emperor with "150 people in Plain Cottages or better", Pharaoh unlocks food only at 150 people. Separate tutorial maps get skipped (Banished, Children of the Nile), and tutorials that stop after an hour leave players stranded (Timberborn, Anno 1800). The winning shape is one continuing city whose goals keep coming, each named for what it teaches (Emperor's six Banpo missions, Zeus's eight episodes of a city that happens to be called Thebes, Pocket City 2's Tutorial City that you keep).
2. **"What is stopping this house" is the most valuable screen in the genre.** Every walkthrough's first tip is to click the house. Players forgive a lot when that panel names the missing thing in words; they rage when it is wrong (the Pharaoh remake said "no religion" next to shrines) or wordless (Manor Lords' tan and black diamonds).
3. **Coverage you can see before you commit.** Caesar IV's top UX fault was hiding a building's range until after placing it. Islanders, Anno 117 and Farthest Frontier show the effect inside the ghost: which homes a well reaches, which tiles get nicer or worse. That teaches the rules without text.
4. **Calm ground, busy buildings.** Pharaoh: A New Era looks rich because its sand barely varies and its colour sits in roofs, rugs, mosaics, banners, goods and fields. Caesar III's speckled ground and Nebuchadnezzar's olive water show the opposite.
5. **Small, local, honest feedback.** Townscaper's whole reward is a sound and a settle on each placement; Dorfromantik's developer says the most frequent action must feel the best. Firsts get a short caption at the edge, milestones a banner, nothing over the middle of the map, nothing that nags.

And they warn against six things: roaming walkers and roadblocks (the root complaint from 1998 to 2023), silent downgrades, goals buried in a notification stream, tips that come back and cannot be turned off, streaks and timers, and menus nested deeper than two taps.

## 2. How each game teaches its early game

| Game | Structure | The first ten minutes ask | What works | What fails |
|---|---|---|---|---|
| Pharaoh (1999) and A New Era (2023) | The first period (five missions) is the tutorial; each mission is a new map. The remake keeps the missions, adds tooltips and a glossary. | Zone homes by a road, give them water, reach 150 people to unlock food. About three decisions, gated by population. | Population-gated unlocks shrink the first menu; the house panel is the tutor. | New map each mission (players drop off around mission three); remake goals vague and dismissable; trade badly explained; house messages sometimes wrong. |
| Caesar III (1998) | Career; "A Village is Born" then Brundisium. | Reach 150 people with a tiny menu; then a granary and wheat. | One number as the first goal; unlock order as curriculum (water, then schools, then pottery). | "Deep end" feel; road layouts fragile; many quit at mission three. |
| Caesar IV (2006) | Tutorial chapter (Kingdom) then campaign. | Unverified in detail. | Coverage by range, welcomed as the walker fix. | Range invisible until after placing; bulky always-open build menu; tutorial thin for newcomers. |
| Zeus (2000) | Adventures: one city across eight episodes. | Reach 1,000 people in Thebes 1. | One persistent city with chapter goals; a short ladder (7 + 4 elite). Best-reviewed of the lineage. | Unhelpful manual; can feel like work. |
| Emperor (2002) | Six tutorial missions in one town, each named for its lesson. | "150 people in Plain Cottages or better"; on-screen notes for water, food, worship. | Lesson-named chapters; "N people in tier X or better"; a gift of jade primes the first workshop chain. | Later missions jump in difficulty. |
| Children of the Nile (2004) | Three separate tutorials on the menu; an in-game guide. | Tutorial maps. | Upgraded houses visibly gain decoration; tapped citizens say what they lack. | Long waits for slow resources; tutorials as a detour. |
| Nebuchadnezzar (2021) | Campaign; first half teaches, each mission opens with a short history card. | Slow start, well guided. | Walkers replaced with assigned routes (liked); a card of context per chapter. | Manual caravan routes break when the city changes; houses downgrade silently. |
| Banished (2014) | Four optional tutorials. | Tutorials, often skipped. | Learn by failing (fine for its audience); "keep up to N" stock targets. | No goals once the town is stable. |
| Timberborn (2021-2026) | About an hour of tutorial, then gone. | First steps without reasons. | "N of M satisfied" needs lines; one alert counter that cycles the camera through problems. | Hints after the mistake; drought not explained before it hits. |
| Anno 1800 (2019) | Story campaign as tutorial; needs switch on at population thresholds. | Build for farmers; the next need appears when the tier is big enough. | Staged needs: one new demand at a time ("your homes now want work clothes"). Quests as portrait cards. | Guidance stops after the first city; nested console menus. |
| Against the Storm (2023) | Short runs; a recipe panel. | Small settlement goals. | "What makes this / what uses this" panel with a Build button; names under icons. | An interface backlash that needed a hotfix. |
| Townscaper (2020) | No teaching. | Tap water, a house appears. | One verb, no failure; impossible shapes quietly ignored. | Too slight for some. |
| Pocket City 1 and 2 | Brief tutorial; PC2's Tutorial City lasts several levels; quests continue. | Zone, power, water, guided by quests. | The tutorial city is a real city you keep; tips can be switched off for later cities. | Menu forgets the last category; no undo; quests run out late. |
| Islanders (2019-2025) | Barely teaches. | Place a building, read the score preview. | The ghost shows the score and the neighbours affected: the preview is the tutorial. | Two-tap selection on mobile; subtle highlights. |
| SimCity BuildIt (2014) | Close hand-holding, then timers. | Factories, stores, zones in order. | Need icons over buildings at phone zoom. | Timers, storage caps, levelling up creates demands you cannot meet yet. |
| Mini Metro / Motorways | Thin tutorial. | Draw lines. | Calm, readable; the board stays clear. | Hidden gestures never discovered; no undo; auto-zoom during placement. |
| Dorfromantik (2021) | A tutorial, then quests on the map. | Place tiles, meet small quests. | Goals live on the map; the most frequent action feels best; a gift for finishing the tutorial. | Achievement-gated unlocks frustrate. |
| Kingdom (2017-2020) | A wordless ghost guide. | Follow the ghost. | Pointing at the target instead of explaining. | The ghost returns uninvited and cannot be turned off. |
| Polytopia (2016) | Short interactive tutorial. | One game of basics. | Tutorial shorter than one session; daily content only after five games. | Some concepts left unexplained. |

**Patterns that recur:** a real city, one countable goal, unlocks as curriculum, the house panel as tutor, coverage visible while placing, goals that keep coming, every step done while paused if the player wants, and guidance the player can switch off.

## 3. System by system

| System | Best practice seen | Failures seen | Thebes now | Verdict |
|---|---|---|---|---|
| Housing ladder | Short ladders (Zeus 7 + 4, Emperor about 10) with one visual tell per tier (Anno: material; New Era: roof dressing; Children of the Nile: decoration). | Pharaoh's 20 levels; houses that look alike (Banished). | 9 tiers, distinct silhouettes for 1-4. | **Keep 9.** Give tiers 5-9 one roof tell each (awning, pergola, roof garden, painted parapet band, flag). |
| Needs and the house panel | Words + status + colour per row (Anno 117 bars, Timberborn "N of M"); citizens who say what they lack; needs introduced one at a time (Anno). | Wordless markers (Manor Lords); wrong messages (New Era); silent downgrades (Nebuchadnezzar). | Next-tier checklist with ticks and crosses; a downgrade timer. | **Borrow:** each row names cause and fix with Show me; staged needs as goals ("Your homes now want pottery"); a warning before any drop. |
| Hysteresis | New Era's grace period before a house drops; Pharaoh's devolve threshold below the evolve one. | Flicker and panic notices. | Downgrade after two unmet months; no desirability hysteresis (no desirability yet). | **Borrow** for Stage 2 desirability (devolve 4-7 points below evolve). |
| Coverage | Range, not walkers (Caesar IV, Nebuchadnezzar). | Roaming walkers, roadblocks, invisible range. | Reach along roads; overlay on placing. | **Keep;** add the count of homes reached in the confirm bar. |
| Desirability | Farthest Frontier's heat map plus a per-house list of bonuses and penalties; Anno 117's plus/minus preview. | Invisible scores (Emperor's feng shui as a separate rating). | Stage 2. | **Borrow:** a graded overlay, the top three contributors on the house sheet, and the plus/minus ring while placing. |
| Production chains | Against the Storm's "makes / uses" panel; Timberborn's stock, made per month and waiting inputs; Anno's made-vs-used bar. | Manual routes (Nebuchadnezzar); 16-counter top strips. | Grain only. | **Borrow** a one-line made-vs-used per good in the summary and a "made by / used by" line on each good. |
| Storage | Banished's "keep up to N"; New Era's visible piles. | Pharaoh's get/accept orders (labour-access bugs). | Granary with a capacity. | **Borrow:** accept or refuse per good, visible fill levels; no get orders. |
| Trade | Zeus's partners with standing; step-by-step caravan setup (Anno console). | New Era's confusing import/export; routes that break. | Stage 2 (spec 4.15). | **Adapt:** buy, sell or ignore per good with a level to keep, yearly quotas; gift the first caravan load (Emperor's jade). |
| Difficulty | Money and threat multipliers (Caesar III 300% to 75% money; Pharaoh's 0.8 cost steps); same goals at every level (Emperor). | Too easy once the options are used (New Era). | None. | **Borrow:** Relaxed, Normal, Hard as cost and risk multipliers. |
| Goals | One countable number; "N homes at tier X or better"; lesson-named chapters; goals generated once the script ends. | Goals in the notification stream (New Era); goals that end (Banished, Timberborn). | Seven opening goals, then none. | **Borrow:** tier-count goals, chapter names in the goals sheet, daily goals after the opening. |
| Tips and help | Shown once, on the trigger, dismissable, with a switch (Kingdom's complaint; Cities: Skylines II's advisor settings); a Guide list to reread. | Returning tips; tips you cannot turn off. | Help sheet with shortcuts. | **Borrow:** once per device, at most one per three minutes, in the goals strip, a Help setting. |
| Idle nudges | Super Guide style: offered, never forced; a glow, then a line, then silence. | Nagging advisors (Two Point Museum needed a filter). | None. | **Borrow:** 45 s without progress → Show me glows → 60 s later one line → stop. |
| Celebrations | Every placement settles with a sound (Townscaper); firsts as a short caption at the edge; milestones as a banner. | Shakes, pop-ups, "+100 XP". | Puff on ✓, glow on upgrade, milestone toast. | **Borrow** three tiers (settle, first, milestone), one at a time, words that say why it matters. |
| Daily goals | Three small goals, one free swap, lifetime totals only (Fallout Shelter, Nook Miles+); offered after a few sessions (Polytopia). | Streaks, login rewards, FOMO (Duolingo debates, SimCity BuildIt). | None. | **Borrow,** streak-free, seeded by the date, offline. |
| Achievements | Small lists of firsts and discoveries (Townscaper 10, Unpacking 25), exact conditions visible, progress bars. | Missable, time-limited or grindy ones; achievements that unlock content (Dorfromantik). | None. | **Borrow** about 24 now, more with Stage 2; per city; never unlock content. |
| Problems | Problem icons over the building plus one grouped counter that cycles the camera (Timberborn, SimCity BuildIt). | Floating windows covering the map (Banished). | Alerts in the minimap sheet and a badge. | **Borrow** a small "!" marker over troubled buildings. |
| Phone placement | Tap a card and the ghost is there; tap or drag to move; ✓ and ✕ always in the same place; no auto-zoom; quiet red for impossible spots; undo (Julius, Townscaper, Islanders Mobile's criticism). | Two-tap selection; camera moving during placement; hidden gestures; no undo. | Ghost at screen centre (may be on an occupied tile); undo exists. | **Fix:** ghost on the nearest valid tile; keep the camera still. |
| Chrome | Small, calm frames; status top, tools at the thumb (Pocket City 2, BuildIt); dark espresso with gold (New Era) or parchment. | Glossy low-contrast panels (Zeus); generic skins (New Era); always-open menus (Caesar IV). | Parchment top bar, dock, sheets. | **Keep parchment** (spec 6.1; it reads well over sand) with a stronger rim and shadow; cards with pictures and tinted tabs. |
| Life | Chimney smoke (Banished), stock piles, crop stages, boats, birds, a whole-screen grade per season (Islanders). | A static map. | Walkers, pennants. | **Borrow** stock piles, crop stages and the build settle now; smoke and boats later. |

## 4. Game by game: what each does well and badly

| Game | Does well | Does badly | For Thebes |
|---|---|---|---|
| Pharaoh: A New Era | The target palette: calm sand, turquoise shallows, two-stage fields, roof clutter; labour pool and devolve grace period as QoL. | Generic UI skin, wrong house messages, vague dismissable goals, no minimap at launch, big modals. | Copy the palette and the grace period; never let the house panel lie. |
| Caesar III | Clean first goal; pottery-after-water curriculum; Julius's touch grammar. | Fragile road layouts; deep end. | Borrow the touch grammar and the first-goal shape. |
| Caesar IV | Range coverage. | Hidden range; bulky menus. | Show reach before ✓. |
| Zeus | One city across episodes; short ladder. | Unhelpful manual. | Chapters in one city. |
| Emperor | Lesson-named chapters; tier-count goals; priming gifts. | Difficulty spikes. | Tier-count goals and a gift for the first chain. |
| Children of the Nile | Houses that show wealth; citizens who speak. | Slow waits; separate tutorials. | One-line resident remarks in the house sheet (later). |
| Nebuchadnezzar | Card anatomy for the build tray (render, name, cost, requirement); walker-free logistics. | Olive water; manual routes; silent downgrades. | Copy the cards; warn before decline. |
| Banished | Smoke; stock targets. | Floating windows; no late goals. | Smoke later; keep-up-to-N in trade. |
| Timberborn | Problem icons and grouped counts; needs as "N of M". | Tutorial that vanishes. | Problem markers; goals all game. |
| Anno 1800 | Staged needs; tiers by material; quest cards. | Guidance stops; nested menus. | Staged needs as goals in Stage 2. |
| Anno 117 | Needs as bars with thresholds; plus/minus preview. | (Too new to judge widely.) | Desirability preview. |
| Against the Storm | Makes/uses panel with Build. | Early UI backlash. | A goods line in the summary. |
| Townscaper | The settle as reward; lavender shade; quiet refusals. | Slight. | The work-gang settle on every ✓. |
| Pocket City | Real tutorial city; quests; premium with no friction. | No undo; menu forgets. | Remember the last card (Thebes does); keep the guide's city. |
| Islanders | Effect preview in the ghost; tiny chrome. | Mobile selection. | "Gives water to 6 homes". |
| SimCity BuildIt | Need icons at phone zoom. | Timers, caps, punishing level-ups. | Avoid every dark pattern it shows. |
| Mini Metro / Motorways | Clear board; calm. | Hidden gestures, no undo. | Every action has a visible button (Thebes does). |
| Dorfromantik | Goals on the map; polish on the most frequent action. | Gated unlocks. | Map target marker for the guide. |
| Kingdom | Point, don't explain. | A ghost that returns. | Tips once, with a switch. |
| Polytopia | Short tutorial; daily content after a few games. | Unexplained concepts. | Daily goals only after the opening chain. |

## 5. Visuals: what to borrow

- **Ground:** keep sand within a narrow lightness band (our pale blotches are too strong); paint **fertile land as dark river loam** feathered into a saturated meadow, so farmland reads at a glance; add a **turquoise shallows strip** along the bank. The approved mock-up's green river land is the target.
- **Map edge:** never show a flat off-map triangle; darken and fade the ground past the edge.
- **Tiers:** one roof tell per tier (Stage 2 tiers 5-9), a light top-edge highlight so stacked whitewash does not merge.
- **Life:** four fill states for granaries and storehouses, four crop stages that grow from one edge, a short work-gang settle on placing; smoke and boats when Stage 2 adds workshops and trade.
- **Cards:** the building's own drawing on its card, name above, cost with a coin, a lock chip with the condition.
- **Placement:** a teal outline and soft wash when valid, coral hatch when not, reach painted while placing.
- **Problems:** a small coral "!" marker over a building in trouble; never a floating window.
- **Celebrations:** small and local: a sparkle burst in the tier or emblem colour, a rising label, a short caption at the edge; only milestones get a banner.

## 6. Phone UX: what to borrow

- **Placement:** tap a card and the ghost appears on a spot where it fits, near the middle of the view; tap or drag to move; ✓ and ✕ stay put; the camera never moves by itself while a ghost shows.
- **Thumb zone:** status at the top, tools at the bottom (Thebes already does this). Coverage budget: Thebes portrait is about 13% idle and 25% with the tray open, in the middle of the range seen (Islanders 5%, BuildIt 12%, Nebuchadnezzar 22%).
- **Labels:** icons get words (Against the Storm's fix; Mini Metro's hidden gestures). Thebes's corner buttons are icons only.
- **Interruptions:** save after every guided step; reopen paused (Thebes does).
- **Depth:** any building within two taps (Anno console lesson).

## 7. What this means for the visual, UX and early-game pass

Ten visual and UX changes, ranked by how much they improve the look and the feel:

1. **Calm, readable land:** calmer sand, fertile land as dark loam, a greener meadow, a shallows band, a finished map edge.
2. **Granaries and bazaars show their stock** (Heaven review art item 1).
3. **Fields grow** through four stages and lie fallow when unworked (Heaven art item 2).
4. **Work gangs:** every ✓ raises the building with two hauling figures and dust, the figures Stage 4's monuments will reuse (Heaven art item 3).
5. **Cards with pictures**, tabs tinted to the emblem colours, empty categories hidden.
6. **Placement that lands and explains:** the ghost starts on the nearest valid tile; the confirm bar says what the building will do ("Gives water to 6 homes"); rotate only when something rotates; the compact bar no longer wraps a word per line.
7. **A goals strip that points:** progress ("2 of 6"), "+25 gold", a filled Show me (and the 1d follow-ups: the reward unit, the road goal's set difference, the trailing gap).
8. **Problem markers** over buildings in trouble.
9. **Corner and speed buttons with words:** Play and Pause glyphs, Map and Layers labels, a chevron that renders everywhere.
10. **A house sheet that says why:** every missing need names its cause and fix with Show me; the summary's mood rows in plain English.

The early-game mechanics, all skippable, none blocking: a guided start (one goal, the suggested card marked, others dimmed but usable, a map marker, steps that finish while paused, Skip and Resume); tier-count and need goals that keep coming after the opening; tips once per device; first-time events as goals; celebrations for firsts; an idle nudge; three streak-free daily goals; an achievements list on the summary sheet; a Welcome back card that shows today's goals.

## 8. What this means for Stage 2

- **Staged needs as goals:** each new good arrives as a goal when the tier below is common ("Your homes now want pottery: build a clay pit and a potter").
- **House sheet:** needs as rows with words; the desirability line with the top three contributors; a warning months before a drop; a warning before a merge takes workers out of the workforce (not needed while tiers 6-9 still work).
- **Desirability preview while placing** (plus/minus ring) and a graded overlay.
- **Goods:** made per month against used per month in the summary; "made by / used by" on each good; storehouse accept or refuse; fill levels on the sprite.
- **Trade:** buy, sell or ignore with a level to keep; yearly quotas; a step-by-step trading post sheet; the first caravan brings a small gift.
- **Difficulty:** Relaxed, Normal, Hard as multipliers, the same goals at every level.
- **Locked cards:** show the next milestone's buildings as locked teasers, hide the rest, so the Stage 2 tray never fills with grey.
- **Roof tells** for tiers 5-9, smoke on the potter's kiln and the brewery.

## 9. What to skip, and why

- Roaming walkers, roadblocks and manual routes: the genre's most consistent complaint.
- Separate tutorial maps and a tutorial-or-not question at the start: players skip them, then flounder.
- Streaks, login rewards, timers, energy, storage caps, red dots, achievements that unlock content: dark patterns, and Thebes has no business model to serve.
- Floating windows, advisor modals, always-open build menus: the one-panel rule exists because of them.
- A dark espresso chrome: New Era's look suits a desktop; Thebes's parchment is approved, reads well over sand, and keeps 4.5:1 ink. Revisit only if the city's whitewash and the chrome start to merge.
- A flood forecast: a strong idea from Timberborn, but flooding is a spec non-goal; keep it with floods.

## 10. Sources and caveats

- Raw notes with every URL and read date: `reference/city-builders/` (five files, about 33,000 words). Outlets that blocked reading (PC Gamer, RPS, IGN, Eurogamer, GameSpot, Polygon, TouchArcade in places) are cited through Wikipedia or search summaries and marked so.
- Colours and screen-coverage numbers in `visuals-and-interfaces.md` are eyeballed from compressed screenshots. All phone screenshots found were landscape, so portrait advice is inferred.
- Numbers in the onboarding rules (45 s, three minutes, 24 achievements) are starting values for play-testing, not research findings, unless a source is named.
- Corrections found on the way: Pocket City 2 shipped in April 2023; Timberborn 1.0 on 12 March 2026; Farthest Frontier 1.0 on 23 October 2025; Islanders: Mobile on 9 November 2025; no Pharaoh: A New Era phone or console port exists.
