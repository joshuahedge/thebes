# Thebes: visual, UX and early-game pass (design)

**Date:** 2026-10-11
**Status:** Decided on Josh's behalf (he asked for no questions); every call is in the rulings list at the end of the session report.
**Builds on:** the main spec (`2026-10-09-thebes-design.md`, sections 4.1, 5 and 6), the research note (`../notes/2026-10-11-city-builder-research.md`), the Heaven review's art items and the Stage 1d follow-ups.
**Scope:** Stage 1 content only (roads, plots, well, farm, granary, bazaar, temple, tiers 1-4). Stage 2 reuses every mechanism here.

## 1. Goals

- The game looks closer to the approved mock-up: calm sand, readable farmland, buildings that show what they hold and do.
- The next action is always obvious, on a phone first.
- A new player is carried through the first ten minutes without a tutorial mode, and an experienced one can switch all of it off.
- Short phone sessions have something small to finish; long sessions have a list to work through.
- Nothing blocks play, nothing nags, nothing sits over the middle of the map, every string lives in `src/ui/text.js`.

## 2. The ten visual and UX changes

### 2.1 Calm, readable land
- Sand blotches drop to a narrow lightness band (alpha 0.5 to 0.22, closer shades) so the ground stops competing with buildings.
- **Fertile land** becomes dark river loam: main `#A8885C`, soft edge `#BC9C6E`, with scattered green tufts and dark speckles in place of the offset second-tone pass that drew stair-steps. A farm site must read at a glance against sand (luminance difference at least 0.12 on the 0-1 scale).
- **Meadow** becomes a saturated, clumpy green (`#86B04A` main).
- **River:** a turquoise shallows strip about a quarter-tile wide along the bank, between the foam line and the deep channel.
- **Map edge:** the ground past the map is a darker, quieter sand (`#C8AE7C`), and the map's diamond edge gets a soft fade band so the edge reads as a border, never a flat triangle.

### 2.2 Granaries and bazaars show their stock (Heaven art item 1)
- Granary sprite in four fill states by stored share of capacity: empty (0), low (under 1/3), half (under 2/3), full. The silos' tops show grain and sacks pile in the yard as it fills.
- Bazaar sprite in three states: empty stalls, some goods, piled goods (by stored share of capacity: 0, under 1/2, the rest).

### 2.3 Fields grow (Heaven art item 2)
- Farm sprite in four stages: fallow (ploughed furrows, no crop), sprouting, green, golden. A working farm cycles sprouting, green, golden over 60 game-days, offset per farm by its id so a district never pulses in step; a farm that is not working (unstaffed, paused, no storage) is fallow.
- The back two field tiles run one stage ahead of the front two, so a field shows two stages at once.

### 2.4 Work gangs and the settle (Heaven art item 3)
- Every ✓ that places a building (not roads or plots) raises it from the ground over 900 ms: the sprite is revealed bottom-up while two small workers haul blocks at the front corners and dust rises. The workers are a new figure, `fig.hauler`, which Stage 4's monument crews reuse.
- Reduced motion: no rise, no figures; the building simply appears (as today).
- The settle is the "every placement" celebration tier: the existing place sound and buzz stay.

### 2.5 Cards with pictures
- Each build card shows the building's own drawing (a thumbnail rendered from its art slot; roads, plots and demolish get small drawn icons), the name, and the cost with a coin mark. Locked and unaffordable states keep their words and marks.
- Category buttons and tabs carry a thin colour band matching their buildings' emblem colours.
- Categories with no buildings at all (Industry, Defence, Monuments in Stage 1) are hidden; they return when Stage 2 fills them. Keyboard 1-7 keeps its mapping and ignores hidden categories.

### 2.6 Placement that lands and explains
- Picking a card puts the ghost on the **nearest tile where it fits** to the usual screen point (spiral search up to 10 tiles; a clean fit beats a fit with a warning); Show me does the same around its target. Only when nothing fits does the ghost sit at the screen point as today.
- The confirm bar says what a service will do from the ghost's spot: "Gives water to 6 homes" (well), "Feeds 6 homes" (bazaar), "Serves 6 homes" (temple), counted with the same reach rule the sim uses.
- The rotate button shows only for buildings that can rotate (none in Stage 1).
- Compact layout: the bar's text sits on its own row above the buttons, so it never wraps one word per line. The confirm dialog's buttons wrap at 150% text size.

### 2.7 A goals strip that points
- The strip shows the goal, a progress chip where the goal counts something ("2 of 6"), and **Show me as a filled teal button**. The reward reads "+25 gold" (in the strip on wide screens and always in the goals sheet).
- The road goal counts road tiles that are not part of the start road (exact set difference, 1d follow-up). The strip leaves no trailing gap when no goal is open.

### 2.8 Problem markers
- A building with a problem (no road, short of workers, no storage, empty bazaar, storage full) shows a small coral badge with "!" above it on the map. A home that is counting down to lose a tier shows an amber "↓" badge. Tapping the building opens its sheet as today. Markers are drawn in the overlay pass, at most one per building, and never animate.

### 2.9 Corner and speed buttons with words
- The speed button reads "▶ Play" when paused and "❚❚ 2×" (the current speed) when running; its accessible name says "Play" or "Pause, speed 2×". The speed chevron uses "▴", which renders in every system font.
- The minimap and overlay corner buttons carry short labels under their icons: "Map" and "Layers" (the overlay's name while one is on).

### 2.10 A house sheet that says why
- Every row of the next-tier checklist is an icon, the need's name and a status in words. A missing need also names its cause and its fix, with Show me:
  - Road: "No road beside it" → road tool.
  - Water: "No working well within 5 road tiles" → well, placed near the home.
  - Food: "No bazaar within 10 road tiles" → bazaar; or "The bazaar has no grain" → granary near that bazaar; or "Food arrives at the next delivery" when a bazaar with grain reaches it.
  - Temple: "No temple within 10 road tiles" → temple.
- Residents show as "8 of 8" with a small meter.
- The city summary's mood rows read in plain English: "Starting mood", "Food", "Jobs", "Debt".

## 3. Early-game mechanics

### 3.1 The Help setting
`settings.help`: **Guide and tips** (default), **Tips only**, **Off**. A new city starts with the guide on only under "Guide and tips". Tips and the idle nudge run under the first two.

### 3.2 The guided start (first ten minutes)
- Runs while the city's guide is on and any guide goal is open: road, plots, well, food (farm, granary, bazaar), temple.
- One goal in the strip (as now). The card that goal needs carries a "Suggested" tag and a teal ring; every other card and category is dimmed to 60% opacity but stays usable and keeps 4.5:1 text. The suggested category button carries a dot.
- The goal's target on the map gets a pulsing ring for two cycles, then a static ring until the step is done.
- Steps finish on the city's state, in any order, **and while paused**: goals, firsts and achievements are settled after every command, not only on game days.
- "Skip guide" sits in the strip while the guide runs (one tap, no confirm). "Resume guide" sits in How to play while guide goals remain open.
- Finishing the guide celebrates "You've got the basics" and pays 50 gold. Goal rewards are paid whether the guide runs or not.

### 3.3 Goals keep coming
- The opening chain gains tier-count goals that bridge to Town: after the temple, "Grow 8 homes to Cottage or better", then "Reach 100 people", "Grow 8 homes to House", "Reach 150 people to become a Town".
- Goals carry a chapter: **First homes** (road, plots, well), **Feed the village** (food, temple), **Grow** (the rest). The goals sheet groups by chapter.
- **First-time events become goals** at the front of the list, once per city: the first empty bazaar ("Get grain to the bazaar"), the first labour shortage ("Find more workers"), the first unemployment above 15% at Town ("Make more jobs"), the first debt ("Get out of debt"). Each completes when its trouble has cleared and pays 10 gold.

### 3.4 Tips
- About ten tips, each tied to a trigger: plots placed while paused ("Press Play so people can move in", which pulses the Play button), the first arrivals, the first house sheet opened, the first service placed (coloured tiles show reach), the first problem marker, the first month's end (tap the numbers for the summary), the first labour shortage, the first undo-able mistake (demolish), the first goal done (the Goals list), the first overlay.
- Shown in a tip row under the goals strip with "Got it". Once per device (`settings.seenTips`). At most one tip every 3 minutes of play and five an hour; never while a tool is active; the Play tip may jump the queue. How to play lists every tip.

### 3.5 The idle nudge
- After 45 s of play (speed above zero, no tool, no sheet) with no meaningful action (a command, a card picked, Show me, a sheet opened) and no goal progress, the strip's Show me glows for two cycles.
- 60 s later, if still idle, one line appears under the goal: "Next: …", naming an affordable fix for the first problem alert, else the open goal.
- Then nothing more until the player acts or a goal moves. Never sound, never the camera, never a panel. Off under Help: Off.

### 3.6 Celebrations
- Three tiers: **settle** (every placement, 2.4), **first** (a caption in a row under the top bar for 2.5 s, a sparkle burst on the building, the goal sound, a short buzz), **milestone** (the same caption row, 4 s, the milestone sound). One at a time, queued 3 s apart, never blocking, nothing shakes. Under reduced motion the sparkle becomes a static ring.
- Firsts in Stage 1, each paying 10 gold and saying what happened: the first family moves in, the first full home, the first harvest (grain reaches a granary), the first Shack, Cottage and House, the first month in profit, the first 100 people. Firsts are recorded per city.
- Milestones (Town) use the milestone tier in place of the old toast.

### 3.7 Daily goals (no streaks)
- Three small goals per local day once the opening chain is done (after "Build a temple"), seeded by the date and the city's seed, filtered to what the city can do, each finishable in about five minutes: for example "Place 4 housing plots", "Grow 3 homes a tier", "Lay 10 road tiles", "Build a well", "Have a month in profit", "Gain 20 people", "Store 100 grain".
- Progress counts from a snapshot taken when the day's goals are first drawn. Each pays 25 gold. One free swap per day. No streaks, no day counts, no "missed" messages, nothing expires mid-session: yesterday's unfinished goals simply give way to today's. A lifetime count per city ("12 daily goals done").
- Shown under "Today" in the goals sheet and on the Welcome back card. The date comes from the device clock through the interface; the simulation only sees the date key it is given.

### 3.8 Achievements
- About 24 in Stage 1, all visible with exact conditions and progress for counts ("12 of 50 homes"). Per city. Never time-limited, missable or grindy; never unlock content. Hidden while the guide runs.
- Shown at the end of the city summary sheet ("Achievements, 5 of 24"); each unlock celebrates at the first tier.

### 3.9 Welcome back
- Shows today's goals (when the opening chain is done), trends with ▲, ▼ or "steady" in words, and the achievement closest to done.

## 4. Save shape

`WORLD_VERSION` 2 adds: `firsts` (ids), `achievements` (ids), `daily` (`null` or `{ date, picks, base, done, swapped }`), `guide` (`{ on }`), `tally` (`{ harvested, profitMonths, peakPeople, dailyDone }`) and `goals.triggered` (event goal ids). The v1 → v2 migration turns the guide off and marks already-true firsts and achievements silently, so an existing city is not flooded with celebrations.

## 5. Out of scope

New buildings, desirability, tiers 5-9 (Stage 2). "New" badges on unlocked cards wait for Stage 2's Town unlocks. Chimney smoke, boats and seasons. Pausing on new events. A tutorial map.
