# Stage 4 review: monuments and a grander city

Written 12 Oct 2026, after Stage 3 and the mobile UX pass shipped (main at 1d5737a, 1,275 tests). Josh asked what Stage 4 should hold: "Let's build in monuments etc." He also said he could not see Stage 3's ambient animation and improved visuals. His device asks for reduced motion, the game follows the device by default, and under reduced motion the ambient layer and most effects switch off entirely. So Stage 4 must make the late city look and feel grander, and the payoff must reach a player whose device asks for less motion.

Sources:
- The spec (`specs/2026-10-09-thebes-design.md`), especially 4.8, 4.10, 4.11, 4.14, 4.16, 4.19, 5.1, 5.4, 5.6, 6 and 10.
- The Pharaoh Heaven review and its digests (`reference/pharaoh-heaven/`): monuments, guilds, work camps, production rates.
- The city-builder research and its notes (`reference/city-builders/`): phone-and-cozy, onboarding-and-gamification, visuals-and-interfaces, impressions-lineage.
- The Stage 3 review (format and standing principles), the Stage 2 and Stage 3 follow-ups and the mobile UX follow-ups.
- The code where monuments plug in (`src/data`, `src/sim`, `src/render`, `src/ui`).
- Measurements made for this review: the capital run re-run on main with a monthly ledger, the map generator over nine seeds, and screenshots of the seed-11 sample city (1280×800 and 390×844) and the stress city (not committed).

The standing principles still hold: nothing happens while the game is closed; no streaks, daily locks or timers that run while away; the score is measured from the city's state and never gates anything; every blocked action and every stall says why; the words on a sheet must be true of the sim; nothing floats over the middle of the map.

## 1. The short version

Stage 4 should be the stage where the city becomes a place worth looking at.

1. **Seven monuments that visibly rise.** Obelisks, a colossus, two mastabas and two pyramids, built course by course. The course under way fills block by block, a mudbrick ramp climbs with it, and one sled and work gang per crew hauls blocks up. Finished pyramids get white casing and a gold capstone.
2. **Cut the times.** The spec's great pyramid takes 25 game-years with four crews (about 2 hours at 1×) and 100 with one. Make it **15 game-years with four crews: an hour at 1×, 20 minutes at 3×**, with a new course every few minutes and a new block every few seconds. The small obelisk takes one minute. Nothing advances while the game is closed.
3. **A small supply chain.** One builders' guild gives one crew. A quarry on rocky ground makes stone; a brickworks turns clay into bricks. Quarries and brickworks deliver straight to the site, and storehouses bridge longer distances. Everything that only serves monuments takes workers last, and stands idle with no wages when no monument needs it.
4. **Monuments are the late-game gold sink.** A founding cost, then about 100 gold a crew for each month of work, plus gold for gilding and the capstone. Work stops rather than borrowing. Today the capital run spends 39% of its taxes and hoards 126,000 gold by year 6. With four crews at work it would spend about 64%.
5. **No scribes.** The capital run has 38% of its workers jobless. Monuments soak that up; a rule that removes workers would point the wrong way.
6. **Safe from danger.** Monuments never burn, and raiders ignore them. A site under way is a little unpleasant to live beside; a finished monument is very pleasant.
7. **Prestige does three things.** It unlocks the pyramids (100 and 300 prestige), adds up to +10 mood, and is the new Monuments part of the score. Half of each monument's prestige comes course by course and half on completion. One of each kind counts.
8. **Score v2.** Five parts out of 500, medals at 200, 300 and 400, a `t2` share link, and older bests kept with their "older scoring" label.
9. **Big footprints that work on a phone.** Picking a monument zooms out once to fit it, the ghost lands on the nearest spot that fits, mastabas rotate, and anything behind a monument shows through while you place or select.
10. **One Monuments tab and one honest sheet.** The site sheet shows progress, crews, each material, the pace at last month's rate and last month's gold. Every stall names its cause and its fix, with Show me.
11. **More grandeur than monuments.** Festival processions that grow with the city, a dedication procession when a monument is finished, mosaic plazas and sphinxes for grand approaches, and a title backdrop with a monument under way.
12. **Fix why Josh saw nothing.** Replace the "Reduced motion" and "Ambient motion" settings with one **Motion** setting: Full, Gentle or Still. A device that asks for less motion gets **Gentle** (fades and walkers, no sway or drift), not Still. Make ambient life a notch more visible under Full, and say once, in a tip, why the city moves gently.

## 2. What the late game looks like today

| Measure (capital run on main, re-run 12 Oct) | Value |
|---|---|
| Becomes Capital | Month 19 |
| People from year 2 on | 1,090 |
| Taxes a month | 3,610 |
| Wages, upkeep, soldiers' pay a month | 1,080, 265, 64 (39% of taxes) |
| Net a month | +2,201 |
| Treasury at month 24, 48, 72 | 18,288; 72,007; 126,200 |
| Workforce, employed | 436, 270 (166 jobless, 38%) |
| Mood | 54-57 (the unemployment term costs about 23) |

The Stage 2 follow-ups quote about 154,000 gold by year 6. That was before Stage 3's firehouses and defences; 126,000 is today's figure.

The seed-11 sample city (`?sample=1`) is at 789 people in year 2 with 10,159 gold, +1,499 a month and 189 jobless. The screenshots show the problem plainly. A grown city reads as a flat carpet of one- and two-storey roofs with no focal point. The stress city is one repeating pattern. The tallest things on the map are palms. Monuments are what give a city builder its skyline, and Thebes has none.

## 3. Monuments

### 3.1 Keep from spec 4.16

- Long projects: place a footprint, build course by course, spend gold as work happens, pause at will.
- Speed scales with crews and with how steadily materials arrive.
- Prestige per course and on completion; it unlocks the pyramids, adds mood and is a mission goal later.
- Finished monuments give desirability.
- The seven kinds and their footprints.
- Pharaoh's lesson, already in the Heaven review: **every stall must say why**. Pharaoh's monuments could sit at 99% with no message.

### 3.2 Change: the times

At 1× a month is 20 seconds and a year is 4 minutes. A phone session is 5-15 minutes, often at 2× or 3× in the late game, and nothing happens while the game is closed. The spec's great pyramid (about 6-7 hours with one crew, about 2 hours with four, both at 1×) is a chore on a phone: 20 or more sessions before the capstone. The research is blunt about it: grind in long missions works against five-minute sessions, and Pharaoh players already called a two-hour pyramid complex long.

The target feel: a small monument is a reward inside one session; a mastaba spans one or two; the great pyramid is "an evening or two" of play, three or four sessions at 3×. That stays an achievement because it needs Capital, 300 prestige, four guilds and three or four quarries first.

Times are game time with the kind's most crews and full supply. Fewer crews take longer in proportion (two crews, twice as long).

| Monument | Footprint | Courses | Most crews | Spec (one crew) | Proposed | At 1× | At 3× | One course at 1× |
|---|---|---|---|---|---|---|---|---|
| Small obelisk | 1×1 | 3 | 1 | ~3 months | 3 months | 1 min | 20 s | 20 s |
| Large obelisk (gilded tip) | 1×1 | 4 | 2 | ~1 year | 9 months | 3 min | 1 min | 45 s |
| Colossus | 2×2 | 6 | 2 | ~4 years | 2 years | 8 min | 2 min 40 s | 1 min 20 s |
| Small mastaba | 3×2 | 4 | 3 | ~15 years | 3 years | 12 min | 4 min | 3 min |
| Large mastaba | 4×3 | 5 | 4 | ~25 years | 5 years | 20 min | 6 min 40 s | 4 min |
| Small pyramid | 4×4 | 8 | 4 | ~40 years | 8 years | 32 min | 11 min | 4 min |
| Great pyramid (gold capstone) | 7×7 | 12 and the capstone | 4 | ~100 years | 15 years | 60 min | 20 min | 5 min |

- Work is counted in **crew-months**: 3, 18, 48, 108, 240, 384 and 720 for the seven.
- **Nothing advances while the game is closed** (spec 3, non-goals). The impressions-lineage note suggests long projects should progress while away; that contradicts a standing rule, so it is rejected. Welcome back shows each site's course and its pace instead.
- A 15-year build sees four to seven raids (2-4 years apart) and many fires. That is the city carrying on around the project, which is the point.

### 3.3 Watching it rise

Construction is the stage's showpiece. It should change something on screen every few seconds at 1×.

| Stage | What shows |
|---|---|
| Founded | Surveyor's cords and stakes on the footprint, a paved apron, a stockpile corner |
| Stockpile | Stacked blocks or brick piles on the apron in four steps, like the storehouse yard |
| Each course | Blocks appear one at a time along the course; at least one new block every 5 s at 1× while crews work |
| Ramp | A mudbrick ramp on the side facing the viewer, climbing with the courses |
| Crews | One sled and a gang of four or five haulers per working crew, dragging a block up the ramp, plus a few masons on the top course. The early-game pass already made these figures for the work-gang settle |
| A course done | A short dust puff along the course and a caption ("The small mastaba's third course is laid · +9 prestige") |
| Finished | The ramp and stakes go; pyramids get smooth white casing and a gold capstone, the large obelisk a gilded tip; one slow shine crosses the gold; a milestone caption, a sparkle, and a dedication procession for one game-month (section 7) |

- Gangs and sleds move on **game time**: they work when the game runs and hold still when it is paused or the site stalls. A stalled site shows idle gangs sitting by the sled, so a stall is visible on the map, not only in the sheet.
- The drawing reads from the world (courses done, progress in the course, stock, crews working), so a reload shows the same scene.

### 3.4 Placing big footprints on phones

At zoom 1 a tile is 64 px wide, so the 7×7 great pyramid is 448 px wide: wider than a 390 px phone. That is grand, but it needs care when placing.

- **Zoom out once, at the pick.** Picking a monument card eases the camera out until the footprint fits the free map area, then shows the ghost. Nothing moves during placement (the research rule stands). Under Gentle or Still it is an instant cut.
- **Nearest fit.** The ghost lands on the nearest spot where it fits. The search radius grows from 10 to 16 tiles for footprints of 3×3 and up.
- **Drag by the body.** Big ghosts are easy to grab. The ghost draws the footprint, the apron and a 35% silhouette of the finished monument, so the player sees the eventual size.
- **Rotate.** Mastabas (3×2 and 4×3) rotate with ⟳ or R; the confirm bar's rotate button, already wired for this, comes alive. The sim stores the rotation and swaps the footprint.
- **Ground.** Any dry ground except fertile land and water, touching a road. The blocked reason names it: "Monuments stand on the desert, not the fields". The map generator puts rocky patches east of the river (every seed has 90-150 rocky tiles), so a natural monument district forms on the desert between the homes and the quarries.
- **Seeing behind.** While placing near a monument or selecting something behind one, the monument fades to about 40%, so nothing is lost behind it. The Pharaoh remake was criticised for exactly this.
- **The confirm bar** says what the monument will cost and do, all from the data: "Small mastaba · founding 1,000 gold, then 100 gold a crew a month · needs bricks and stone · while building: 4 homes less pleasant · finished: 9 homes nicer · +32 Monuments when finished" (for a city with no prestige yet).

### 3.5 Pausing, undo and demolishing

- **Pause** (on the site sheet) stops work and work gold. The site's guilds release their workers to the rest of the city. Stock and finished courses stay.
- **Undo** removes a site only before any work is done on it, with the founding cost refunded. Once a block is laid, the work is real.
- **Demolish** asks first: "Tear down the small pyramid? 7 of 8 courses and their prestige are lost. Refunds 250 gold (a quarter of its founding)."

### 3.6 Fire and raids

- **Monuments, sites and their stockpiles never burn.** They are stone, and a fire that undid an hour of building would be a cruel loss. They act as firebreaks, like roads.
- Supply buildings burn like their neighbours: quarry 0.15 a day (as the gem mine), brickworks 1.0 (a kiln, as the potter), builders' guild 0.3 (timber and rope).
- **Raiders never target monuments or sites.** Raiders are after what they can carry. A monument blocks them like any building.
- **Monuments do not count as wealth** for raid size. So gold spent on a monument instead of hoarded makes raids a little smaller. That is a small, honest reward for spending.
- A raid can still hurt a project: it can set a guild or quarry alight, and its crews stop until the fire is out.

### 3.7 Desirability

| Source | By distance 1, 2, 3, 4, 5, 6 |
|---|---|
| Any site under way (dust and noise) | −3, −2, −1 |
| Small obelisk | 6, 5, 4, 3, 2, 1 |
| Large obelisk | 10, 8, 6, 4, 2, 1 |
| Colossus | 12, 10, 8, 6, 4, 2 |
| Small mastaba | 10, 8, 6, 4, 2, 1 |
| Large mastaba | 14, 12, 10, 8, 6, 4 |
| Small pyramid | 16, 14, 12, 10, 8, 6 |
| Great pyramid | 24, 20, 16, 12, 10, 8 |
| Quarry | −6, −5, −4, −3, −2, −1 (as the clay pit) |
| Brickworks, builders' guild | −4, −3, −2, −1 (as a workshop) |

The placing preview shows both states. A grand monument beside the Estates is a real layout goal, which suits the research finding that Pharaoh players spend their effort on desirability.

### 3.8 Prestige

| Monument | Prestige | From its courses | On completion |
|---|---|---|---|
| Small obelisk | 10 | 5 | 5 |
| Large obelisk | 30 | 15 | 15 |
| Colossus | 50 | 25 | 25 |
| Small mastaba | 70 | 35 | 35 |
| Large mastaba | 110 | 55 | 55 |
| Small pyramid | 160 | 80 | 80 |
| Great pyramid | 270 | 135 | 135 |
| One of each | 700 | | |

- **Measured from state.** Prestige is the sum, over the seven kinds, of the most advanced monument of that kind still standing: its finished courses' share, plus the completion share once finished. Nothing is stored that the world cannot recompute.
- **One of each kind counts.** A second obelisk adds desirability, not prestige. That stops an avenue of cheap obelisks farming the score.
- **Unlocks.** The small pyramid needs Capital and 100 prestige; the great pyramid needs 300. Locked cards show the condition and the count: "Needs 100 prestige (you have 60)". With the numbers above, 100 means the colossus and the small mastaba, or most of the ladder below them; 300 means the large mastaba and a good start on the small pyramid.
- **Mood.** +1 for every 70 prestige, at most +10, as its own row in the summary's mood breakdown ("Monuments +4").
- **Score.** The new Monuments part (section 6).
- **Missions** can ask for prestige later (Stage 5).

### 3.9 The Monuments tab and the site sheet

- **Tab.** The Monuments category (key 7, already reserved in the dock data with its gold tint and ▲ icon) holds everything the project needs, in order: builders' guild, quarry, brickworks, then the seven monuments. Locked cards follow the existing rule: only the next milestone's show, greyed.
- **Site sheet.** Every line is computed from the sim's own rules, as the danger sheets are:

| Row | Example | When it changes |
|---|---|---|
| Progress | "Course 4 of 8 · 46% done" with a bar | Daily |
| Crews | "Crews: 2 of 4. 2 builders' guilds work here." | When guilds come, go or idle |
| No crew | "No crew: build a builders' guild within 12 road tiles" with Show me | |
| Each material | "Stone: 46 on site. 2 quarries and 1 storehouse reach this site." | Daily |
| Waiting | "Waiting for bricks: no brickworks or storehouse with bricks within reach" with Show me | |
| Pace | "At last month's pace, about 3 years 4 months to finish" | Month end; "Not progressing: no stone" when last month did nothing |
| Gold | "Last month: 300 gold for 3 crews. Work stops if gold would go below 0." | Month end |
| Stopped for gold | "No gold for the crews: work waits until the treasury is above 0" | |
| Prestige | "Prestige 35 so far; +35 when finished" | Each course |
| Actions | Pause or Resume, Demolish, View | |

- **Reach shown.** Selecting a site highlights the 12-road-tile crew and producer reach and the 16-tile supply reach, as other buildings show theirs.
- **Guild, quarry and brickworks sheets** say which site they serve and why they are idle ("Idle: no monument within 12 road tiles needs stone").
- **Stalls are warnings** (badge, list row, problem marker), never criticals. A monument is never urgent.
- **Summary sheet:** a Monuments section (each site with its bar), total prestige, and a Monuments row under spending.
- **Welcome back:** "Small pyramid: course 6 of 8, about 3 years left at last month's pace."

## 4. The supply chain

### 4.1 Buildings

| Building | Size | Cost | Upkeep, workers | Makes | Unlocks |
|---|---|---|---|---|---|
| Builders' guild | 2×2 | 150 | 10 gold, 16 workers | One crew for one site within 12 road tiles | City |
| Quarry | 2×2, on rocky ground | 100 | 6 gold, 10 workers | 30 stone a month | City |
| Brickworks | 2×2 | 90 | 6 gold, 8 workers | One brick from one clay; 30 a month | City |

Costs are times the difficulty's cost multiplier, as every building's. Pharaoh's guild and quarry costs (100-150) and its work camps (20 workers) were the starting point.

### 4.2 How material moves

It reuses the production code. `produceDay` already makes goods daily, scaled by staffing, and sends each unit to the nearest working store with room in producer reach. Stage 4 adds one kind of target and one kind of consumer:

1. **A quarry or brickworks sends each unit to the nearest site within its producer reach (12 road tiles) that needs that material and has stockpile room.** If none does, to the nearest storehouse in reach that accepts it.
2. **A site keeps its own stockpile**, up to two months of its crews' use, and also draws from storehouses within its supply reach (16 road tiles), as bazaars do.
3. **Storehouses accept stone and bricks** like any other good, with the existing accept-or-refuse switch. A storehouse between the quarries and the site bridges up to 28 road tiles. This is the "storehouse delivery" of the spec, without "get" orders.
4. **Memphis sells stone** (6 gold, 200 a year), so a map whose rocky land is awkward can still build. No partner buys stone, so the no-arbitrage check is untouched.

**Use.** A working crew lays 20 units of material a month at full staff. Each kind has a recipe by course:

| Monument | Material | Total at full work |
|---|---|---|
| Obelisks, colossus | Stone | 60, 360, 960 |
| Mastabas | Bricks for the core courses, stone for the top (facing) course | about 1,600 bricks and 550 stone (small); 3,600 and 1,200 (large) |
| Pyramids | Stone for the courses, bricks for the ramp (about 15%) | about 6,500 stone and 1,150 bricks (small); 12,200 and 2,200 (great) |

So four crews use 80 units a month: three quarries, or two quarries and a brickworks with its clay pit. Bricks for the pyramid ramp keep the brickworks useful after the mastabas, and match the spec's "mudbrick ramp".

**The Stage 2 crowding problem.** A raw good that outruns its user fills a shared storehouse and slows every chain that stores there. Two rules keep stone from doing that. Quarries and brickworks send to sites first. And when no site anywhere is under way, they **idle**: no production, no workers, no wages (rule 4.3). A tip says to refuse stone at the storehouse the potters use.

### 4.3 Crews and labour

- **One guild, one crew.** A working guild sends its crew to the nearest unpaused, unfinished site within 12 road tiles that has crew room. Sites take at most their kind's crews (1 to 4). To move crews, pause a site.
- **A crew's speed** is its guild's staffing, as any producer's. Below 25% staff it stops.
- **Monuments come last.** Guilds, quarries and brickworks all work at the existing `monuments` priority, the lowest of the five. A labour shortage names it: "Monuments short of 24 workers".
- **Idle means no jobs.** A guild with no site, or a quarry or brickworks with no site needing it, employs nobody and pays no wages (upkeep still runs). Pausing a site therefore frees its workers at once. Pharaoh's work camps behave the same way: farms first, monuments with what is left.
- **Labour fits.** A four-crew project needs about 110 workers (64 crew, 30 quarry, 14 bricks and clay). The capital run has 166 jobless at Capital and 62 spare at City, where a small obelisk needs 26. Unemployment falls from 38% to about 13%, which lifts mood by about 20 points and the Prosperity part's jobs term.

### 4.4 Scribes: no

The spec left scribes (top-tier residents who stop working and pay more tax) as a Stage 4 candidate "where monuments put pressure on labour". The measurements say labour is not under pressure late: a third of the capital run's workers are jobless. Scribes would also add tax income, which feeds the hoard monuments are meant to drain, and add a rule to explain. Leave them out; revisit if playtests show cities short of workers once monuments run.

## 5. The late-game economy

### 5.1 Gold as work happens

| Cost | Amount (Normal; × difficulty cost) |
|---|---|
| Founding (when placed) | 150, 400, 600, 1,000, 2,000, 3,000, 6,000 (obelisk to great pyramid) |
| Work | 100 gold a crew for each month of work, paid daily as the work is done |
| Large obelisk's gilding | 1,000 gold, at its last course |
| Great pyramid's capstone | 5,000 gold, at its last course |
| Total for one of each | about 171,000 |

- A crew does not work a day that would take the treasury below 0. The sheet says so. No monument ever puts the city into debt, as tribute never does.
- The monthly bill is visible: a **Monuments** row under spending in the summary, and "last month" on each site sheet.
- The whole ladder costs about 171,000. At today's Capital surplus of +2,201 a month, that is roughly six years of play: the right size for a late game.

### 5.2 The band

Spec 4.11's band (wages, upkeep and soldiers' pay at 60-70% of taxes) is defined for a **steady tier-4 town**, and the 10-year village test asserts it (65.3%). Monuments unlock at City, so they never touch that test. **Keep it unchanged.**

For the Capital, Stage 4 makes monuments the sink the spec promised. With four crews working (4 guilds, 3 quarries, 1 brickworks with a clay pit):

| Monthly spending at Capital | Today | With four crews |
|---|---|---|
| Wages | 1,080 | 1,512 (+108 workers) |
| Upkeep | 265 | 334 |
| Soldiers' pay | 64 | 64 |
| Monument work | 0 | 400 |
| Total | 1,409 (39%) | 2,310 (64%) |
| Net | +2,201 | +1,300, less founding costs |

Extra jobs also raise taxes a little (fewer leave, more arrive), so the true share lands a few points either side. Track F tunes the work gold (100 is the lever) so that four crews sit inside 60-70%.

### 5.3 What changes in the capital run test

- **The script** adds a monument programme: at City a guild, a quarry and a small obelisk; at Great city a second guild, a brickworks with its clay pit, the colossus and the small mastaba; at Capital two more guilds and a third quarry, the large mastaba, then the small pyramid once prestige reaches 100. It keeps the same reserve rule (never spend below 400).
- **New assertions:**
  - every month-end treasury stays at 0 or above;
  - in the last 24 months, while four crews work, wages, upkeep, soldiers' pay and monument work come to 60-70% of taxes;
  - the treasury at year 6 is at most 60,000 (today 126,200);
  - unemployment is at most 15% while crews work;
  - the small obelisk, the colossus and the small mastaba are finished by year 6;
  - the household chains still meet their existing floors (monuments must not starve pottery or beer);
  - it still runs in under 5 s.
- **New tests beside it:** the same seed and commands give the same world with a monument under way; a world saved and loaded mid-course is identical; a site stalls with the right reason for each missing piece.

## 6. Score v2 and gamification

### 6.1 The Monuments part

| Part | Formula | Main reason line, e.g. |
|---|---|---|
| **Monuments** | 100 × √(prestige ÷ 700), at most 100 | "No monument yet: found a small obelisk (City)", "Finish the colossus: +25 prestige" |

The square root makes the first monuments count. The small obelisk alone scores 12, both obelisks and the colossus 36, adding the small mastaba 48, the large mastaba 62, the small pyramid 78, and all seven 100. A Village scores 0 here, as its Growth term is low; a part that started at 100 and fell at City would be a cliff.

- **City score** = the five parts × the difficulty factor. The most is 500 on Normal (625 Hard, 350 Peaceful).
- **Medals** on the parts' total: **bronze 200, silver 300, gold 400** of 500 (the same 40%, 60% and 80% as now). A city that was gold under v1 without monuments reads silver under v2. That is intended: gold now asks for a pyramid.
- **Previews.** Placing a monument shows "+N Monuments when finished".

### 6.2 The version bump

- `SCORE_VERSION` becomes 2. Records keep each row's version, and v1 bests stay, labelled "older scoring" (the rule already exists).
- The share link becomes `t2`: five parts and seven splits. `t1` links still open and show as older scoring.
- **Two new splits:** the day the pyramids unlocked (prestige 100) and the day the great pyramid was finished.
- **History.** A loaded v4 world's month-end rows carry v1 scores; Welcome back's score trend compares only rows of the same version, so a city does not appear to drop 20% overnight.
- **Stamps** for sealed reigns gain a small glyph for each finished mastaba or pyramid. Cosmetic.

### 6.3 Goals, firsts, achievements, feats, daily goals, tips

All pass "skipping it costs you nothing".

| Kind | Stage 4 additions |
|---|---|
| Chapter | "Monuments" |
| Chain goals | City: "Found a small obelisk", "Build a builders' guild near it", "Build a quarry on rocky ground", "Finish the small obelisk". Great city: "Found a colossus or a small mastaba", "Build a brickworks" (when a mastaba is founded). Capital: "Reach 100 prestige to unlock the pyramids". Then "Found the small pyramid" and, at 300, "Found the great pyramid" |
| Event goal | First stall: "Get stone to the obelisk" (or bricks, or a crew), with Show me |
| Firsts (10 gold each) | First builders' guild, first course laid, first monument finished, the pyramids unlocked |
| Achievements | Three monuments finished; prestige 300; all seven kinds finished ("Seven wonders"); 5,000 stone laid; the large obelisk gilded |
| Feats | **Steady hands:** finish a mastaba or pyramid with no month in which its crews stood idle for lack of material. **Swift pyramid:** finish the great pyramid before game-year 25 |
| Daily goals (from City, while a site is under way) | Lay a course on any monument; build a quarry; bring 100 stone to a site |
| Tips | Monuments come last for workers; quarries and brickworks deliver to the site; a storehouse bridges a long way; refuse stone at the potters' storehouse; pause a site to free its crews; one of each kind counts for prestige; why the city moves gently (section 7.2) |
| Citizen remarks | Three or four for masons, brickmakers and the haulers, by season |

## 7. Visual payoff

### 7.1 What makes the late city grand

In order of payoff for the cost, all in the spec's art direction (calm ground, colour from use, whitewash, painted stone) and within the phone budget:

1. **Construction scenes** (section 3.3). The biggest single change: a moving work site the player built, visible from across the map.
2. **Finished monuments as the skyline.** Tall, simple, bright shapes against the sand: white casing, gold capstone, a painted colossus, banded obelisks with gilded tips. A minimap glyph marks each.
3. **Festival processions.** Today a festival is a button and a mood number with nothing on the map. While a festival lasts (three months), a procession walks the roads within the temple's reach: priests with a carried shrine, musicians, dancers, and streamers on the temple. It gains one figure for each temple, booth and finished monument, so a later festival is visibly bigger. The research singled this out: festivals that grow with the city say "your city grew" without a number.
4. **Dedication.** When a monument is finished, a shorter procession walks from the nearest temple to it for one game-month. It reuses the festival walkers and costs nothing.
5. **Plazas and sphinxes** for grand approaches. The **plaza** is a 1×1 paved mosaic tile, area-painted like gardens (City, 8 gold a tile, desirability 2, 1, never burns; the spec already lists plazas among things that never burn). The **sphinx** is a 1×1 lying lion statue (Great city, 150 gold, desirability 10, 8, 6, 4, 2). Both go in the Homes tab beside the garden and the statue. A sphinx-lined plaza to a pyramid is the Pharaoh look at almost no cost.
6. **Supply buildings with visible work.** The quarry with cut faces, stacked blocks and men splitting stone; the brickworks with rows of drying bricks that show its stock; the guild yard with sleds, ropes and a stone template.
7. **The title backdrop** and `?sample=1` city get a finished small obelisk and a colossus under way, so the payoff is on screen before the first tap.

**Not in Stage 4:** a quay or boat trade (trade is overland), temple complexes as a new service, pleasure gardens, a day-night cycle. Each is a new system, not a visual.

### 7.2 Motion: why Josh saw nothing, and what to do

Today the Settings sheet has "Reduced motion: follow the device / on / off" and "Ambient motion: on / off". When the device asks for reduced motion, ambient life is off and so are puffs, glows, ripples, the rising build and sparkle bursts. Josh's device asks, so Stage 3's work was invisible to him. That is correct by the spec, but it hides the game's life from a whole group of players, and Stage 4's construction scenes would vanish the same way.

What reduced motion is for: avoiding large or vestibular motion (camera pans and zooms, parallax, things sweeping across the view, bouncing and spinning). Small, slow, in-place change (a fade, a figure walking along a road) is not what it guards against. The spec already lets walkers and units move under reduced motion for that reason.

**Proposal: one Motion setting with three levels.**

| Level | What moves | Default when |
|---|---|---|
| **Full** | Everything in spec 5.4 and 5.6 | The device does not ask for less motion |
| **Gentle** | Walkers, units, sleds, gangs and processions move along the roads as walkers do now. Water glints fade in and out in place (no drift). Smoke fades in place, rising at most 4 px. New blocks fade in over 200 ms. A course done shows a still outline for a moment. No sway, drift, rising build, pulses, bursts, rare life crossing the screen, capstone shine or camera moves | **The device asks for less motion** |
| **Still** | Today's reduced motion with ambient off: walkers and units only, everything else still | Chosen in Settings |

- It replaces both settings. An earlier explicit choice is kept: reduced motion "on" or ambient "off" becomes Still, reduced motion "off" becomes Full.
- The row says what it is doing: "Motion: Gentle (your device asks for less motion)".
- **A one-time tip** the first time a city opens on such a device: "Your device asks for less motion, so the city moves gently. Settings → Motion changes it."
- **A notch more visible under Full.** Today's ambient was tuned to be very subtle. Raise glint count and brightness by about a third, make smoke puffs a little larger and longer, and let rare life come every 45-90 s instead of 60-120 s. The 2 ms budget and the drop order stay. A check for Track E: a 390×844 shot of the river shows at least six glints, and a working potter always has a puff in the air.
- **Screenshots in both.** Every visual review for Stage 4 takes shots under Full and under Gentle, so a change that only shows under Full is caught.

### 7.3 The phone budget

- **Draw monuments live as shapes, not cached sprites.** A finished pyramid is a few faces and some joint lines; a site is a stack of course blocks, a ramp and a few figures. A 7×7 pyramid cached at zoom 2 on a 2× screen would be a 1,800 × 1,600 canvas (over 10 MB) per zoom step. Live drawing should cost at most 1 ms a frame for three sites on the stress city; if it does not, cache only the finished courses at the current zoom step.
- **Depth sorting.** The renderer sorts every object by one depth key per building. That works for big convex footprints when neighbours are 1×1 or 2×2, with ties possible at the far corners. The paved apron inside each footprint keeps neighbours' drawings off the monument's body. Track B tests neighbours at all four corners and walkers on all four sides.
- **Processions** are walkers, capped at 12 figures each and drawn only on screen; they drop with rare life if the frame is over budget.

## 8. Out of scope (Stage 5 or later)

- Missions, ruler requests with deadlines, and grave goods (Stage 5's own spec).
- Progress while the game is closed.
- Separate stonemasons', bricklayers' and carpenters' guilds, and work camps: one builders' guild does all of it.
- Sphinx, sun temple and mausoleum as monument kinds (the sphinx comes only as a 1×1 statue), bent pyramids, pyramid complexes, burial chambers.
- Collapse and architects; plague; floods and river seasons; a flood forecast.
- Scribes (section 4.4).
- Temple complexes, pleasure gardens, a quay and river trade, a day-night cycle, music.
- Choosing which guild works which site (pausing is the lever).
- Global leaderboards and checked scores.

## 9. Proposed rulings (continuing from 177), each with its cost if wrong

178. Stage 4 is monuments and a grander city: seven monuments, the quarry, brickworks and builders' guild, prestige, score v2, processions, plazas and sphinxes, and the Motion setting. — Cost if wrong: missions wait longer.
179. Monument times are set with the kind's most crews and full supply: 3 months (small obelisk), 9 months, 2 years, 3 years, 5 years, 8 years and 15 years (great pyramid: 60 min at 1×, 20 at 3×); fewer crews take longer in proportion. — Cost if wrong: a Pharaoh veteran may find the great pyramid quick; the numbers are data.
180. A site never advances while the game is closed; Welcome back shows each site's course and pace. — Cost if wrong: a returning player finds the pyramid where they left it, by design.
181. Each monument has courses (3 to 12 and a capstone); half its prestige comes course by course, half on completion. — Cost if wrong: little.
182. The course under way fills block by block (a new block at least every 5 s at 1× while crews work), the ramp climbs with it, and each working crew shows one sled and gang; gangs move on game time and sit idle when the site stalls or the game is paused. — Cost if wrong: art time and frame cost.
183. A finished pyramid gets white casing and a gold capstone, the large obelisk a gilded tip; completion gets a milestone caption, a sparkle, one slow shine and a one-month dedication procession, and no new sheet or pop-up. — Cost if wrong: a quieter finish than some would like.
184. One builders' guild gives one crew; a guild works the nearest unpaused, unfinished site within 12 road tiles with room; a site takes at most 1, 2, 2, 3, 4, 4 and 4 crews by kind. — Cost if wrong: the player cannot assign crews by hand (pausing moves them).
185. The quarry (2×2 on rocky ground, 100 gold, 10 workers, 30 stone a month), brickworks (2×2, 90 gold, 8 workers, one clay into one brick, 30 a month) and builders' guild (2×2, 150 gold, 16 workers) unlock at City. — Cost if wrong: rocky land lies east, so quarries sit in the raiders' path.
186. Quarries and brickworks send each unit to the nearest site in producer reach that needs it and has room, else to a storehouse that accepts it; sites keep a stockpile of two months of their crews' use and also draw from storehouses within 16 road tiles; storehouses accept stone and bricks like any good. — Cost if wrong: stone can crowd a shared storehouse; the accept switch and a tip are the levers.
187. Guilds, quarries and brickworks work at the monuments priority, last; with no site needing them they idle with no workers and no wages (upkeep still runs). — Cost if wrong: stone cannot be stockpiled ahead of a site.
188. No scribes in Stage 4. — Cost if wrong: no late-game labour trade-off; revisit if playtests show cities short of workers.
189. Memphis sells stone at 6 gold, 200 a year; no partner buys it. — Cost if wrong: one more trade row.
190. A monument costs a founding price when placed, then 100 gold a crew for each month of work, paid daily, plus 1,000 for the large obelisk's gilding and 5,000 for the great pyramid's capstone; all times the difficulty's cost. — Cost if wrong: the totals (about 171,000 for one of each) need playtesting.
191. A crew does not work a day that would take the treasury below 0, and the sheet says so. — Cost if wrong: a player cannot borrow to finish a monument.
192. Monument work is a spending row in the summary and counts in the balance share. — Cost if wrong: none.
193. The 10-year village's 60-70% band test is unchanged; the capital run gains a monument programme and asserts 60-70% while four crews work, no month-end below 0, at most 60,000 gold at year 6, at most 15% unemployment while crews work, three monuments finished, and its existing chain floors. — Cost if wrong: a longer script to maintain.
194. Monuments, sites and their stockpiles never burn; quarry 0.15, brickworks 1.0 and guild 0.3 a day. — Cost if wrong: monuments carry no fire risk at all.
195. Raiders never target monuments or sites, and monuments do not count as wealth for raid size. — Cost if wrong: monuments are free of danger, and spending on them makes raids a little smaller.
196. Desirability: any site under way −3, −2, −1; finished monuments and the supply buildings as in section 3.7; the placing preview shows both states. — Cost if wrong: tuning.
197. Monuments need dry ground that is not fertile land, and a road. — Cost if wrong: no pyramid among the fields.
198. Mastabas rotate two ways (⟳ or R); the sim stores the rotation and swaps the footprint. — Cost if wrong: a small change to place and undo.
199. Prestige is measured from state: for each kind, the most advanced standing monument's share; a second of a kind adds desirability only. — Cost if wrong: an avenue of obelisks earns no extra score or mood.
200. The small pyramid needs Capital and 100 prestige; the great pyramid needs 300; locked cards show the condition and the count. — Cost if wrong: the great pyramid needs most of the ladder first.
201. Prestige adds +1 mood for every 70, at most +10, as its own mood row. — Cost if wrong: tuning.
202. Score v2 adds a fifth part, Monuments = 100 × √(prestige ÷ 700); the city score is out of 500 times the factor; medals are 200, 300 and 400. — Cost if wrong: a city gold under v1 reads silver until it builds.
203. `SCORE_VERSION` 2 and share link `t2` (five parts, seven splits); `t1` links still open as older scoring; Welcome back compares score rows of the same version only. — Cost if wrong: some old bests look out of date.
204. Two new splits: the pyramids unlocked and the great pyramid finished. — Cost if wrong: a longer link.
205. Undo removes a site only before any work; demolishing a monument asks first, refunds a quarter of its founding, and its prestige goes with it. — Cost if wrong: none.
206. Pausing a site stops its work and gold; its guilds release their workers; stock and courses stay. — Cost if wrong: none.
207. The Monuments tab holds the guild, quarry, brickworks and the seven monuments; plaza and sphinx go in Homes beside the garden and statue. — Cost if wrong: a ten-card Monuments tray on phones scrolls.
208. Picking a monument card zooms the camera out once to fit the footprint before the ghost appears (an instant cut under Gentle and Still); the camera never moves during placement; the nearest-fit radius is 16 tiles for footprints of 3×3 and up. — Cost if wrong: a small exception to "the camera stays still".
209. A monument fades to about 40% while the player places near it or selects something behind it. — Cost if wrong: render work.
210. The site sheet shows progress, crews, each material, the pace at last month's rate, last month's gold and prestige, with Pause, Demolish and View; every stall names its cause and fix with Show me; reviewers check every line against the sim. — Cost if wrong: none.
211. Monument stalls are warnings (badge, list row, marker), never criticals. — Cost if wrong: none.
212. Captions for each course laid and each monument finished (milestone tier). — Cost if wrong: a few more captions in a busy month (Recent keeps them).
213. Goals chapter "Monuments", the first-stall event goal, four firsts, five achievements, two feats, three daily goals, the tips and remarks of section 6.3. — Cost if wrong: more text to keep true.
214. Festival processions while a festival lasts, one figure more for each temple, booth and finished monument, at most 12. — Cost if wrong: walker frame cost.
215. The plaza (1×1, area-painted, City, 8 gold a tile, desirability 2, 1, never burns) and the sphinx (1×1, Great city, 150 gold, desirability 10, 8, 6, 4, 2). — Cost if wrong: two more cards.
216. One Motion setting (Full, Gentle, Still, following the device by default) replaces Reduced motion and Ambient motion; a device that asks for less motion gets Gentle; an earlier explicit choice is kept (reduced motion on or ambient off becomes Still). — Cost if wrong: a player who wanted nothing moving must choose Still once.
217. Gentle allows walkers, units, sleds, gangs and processions along roads, and fades in place; no sway, drift, rising, pulses, bursts, rare life, shine or camera moves. — Cost if wrong: a few motion-sensitive players may prefer Still.
218. A one-time tip explains Gentle the first time a city opens on a device that asks for less motion. — Cost if wrong: none.
219. Ambient life is a notch more visible under Full (about a third more glints, larger puffs, rare life every 45-90 s), within the same 2 ms budget. — Cost if wrong: frame time on old phones.
220. Every Stage 4 visual review takes screenshots under Full and under Gentle. — Cost if wrong: none.
221. Monuments are drawn live as shapes, not cached sprites, within 1 ms a frame for three sites on the stress city. — Cost if wrong: per-frame drawing cost.
222. The title backdrop and the sample city get a finished small obelisk and a colossus under way. — Cost if wrong: a slightly longer backdrop build.
223. World version 5, with a v4-to-v5 migration that adds the monument state and keeps every Stage 3 field. — Cost if wrong: none.
224. Every monument number (times, crews, recipes, gold, prestige, desirability) lives in `src/data/monuments.js`; Josh's playtest sets the final values. — Cost if wrong: none.

## 10. Running it faster: a parallel-track plan

The Stage 3 shape worked: one contract commit, then tracks in sibling worktrees, merged in order, then balance and integration. Same limits: at most five agents at once, words-against-sim reviewers on every UI task, screenshots looked at by the integrator.

### Track 0: the contract (one implementer, reviewed, merged first)

- **World version 5** and `v4ToV5` in `src/save/migrate.js`; `serialize.js` validation; the pinned-version tests updated.
- **All data:** a new `src/data/monuments.js` (kinds, footprints, rotation, courses, recipe per course, most crews, crew-months, founding, work gold, gilding and capstone gold, prestige split, site and finished desirability, stockpile size, unlock rule); new `BUILDINGS` entries (builders' guild, quarry, brickworks, the seven monuments with `monument: true` and `category: 'monuments'`, plaza, sphinx); `stone` and `bricks` in `GOODS` (kind `material`); milestone unlock lists and the prestige unlocks; desirability and fire-risk rows; `CATEGORIES.monuments` items; Memphis's stone; scoring v2 constants (`SCORE_VERSION`, five parts, weights, medals, `t2`, the two splits); the prestige mood term; the Motion setting's shape and its migration from the old two.
- **Stub modules with final signatures:** `src/sim/monuments.js` (`monumentDay(world, events)`, `prestigeOf(world)`, `prestigeByKind(world)`, `monumentMood(world)`, `siteStatus(world, b)` returning the sheet's facts and reason codes, `crewsFor(world, b)`, `paceOf(world, b)`), `place(world, type, x, y, { rot })`, the event shapes (`course_done`, `monument_done`, `site_stalled`), and the `stats.lastMonth.monuments` field.
- **One-time wiring:** `monumentDay` in `tickDay` after `produceDay`; hooks in `createUI.js` for the site sheet, the placement camera fit and the Motion level; a live-draw hook in `renderer.js` for monuments.
- **Delimited sections** per track in `src/ui/text.js`, `css/ui.css` and `src/data/tips.js`.
- **Test aggregators** `tests/stage4/{contract,sim,art,ui,score,motion,balance}.all.js`, dev scenes (`site`, `pyramid`, `procession`, `gentle`) and a `-Stage4` set in `tools/shots.ps1`, with "before" shots under Full and Gentle.

### The tracks

| Track | Owns (files) | Builds |
|---|---|---|
| **A** Monuments sim and supply chain | `src/sim/monuments.js`, `production.js`, `labour.js`, `commands.js` (rotation, found, undo and demolish rules), `economy.js` (work gold), `raids.js` (targets, wealth), `mood.js` (prestige row), `desirability.js` (site and finished values), `trade.js` if stone needs code; `tests/stage4/sim/` | Crews, delivery to sites, stockpiles, idling, courses, prestige, stalls with reasons, determinism and save-load mid-course |
| **B** Art for monuments and industry | new `src/render/art/monuments.js`, new `src/render/monuments.js` (live sites: courses, blocks, ramp, sleds, gangs, stockpile, casing, capstone shine, the see-through fade), `src/render/art/industry.js` (quarry, brickworks, guild), new `src/render/art/plaza.js` (plaza, sphinx), `registry.js`, `renderer.js` (the live-draw hook body only), card thumbnails' draw functions; `tests/stage4/art/` | Section 3.3 and 7.1 items 2, 5, 6; depth-sort tests at all four corners; the 1 ms budget |
| **C** Interface | new `src/ui/monumentSheet.js`, `sheets.js` (routing, summary section and spending row), `placement.js` (fit-zoom at pick, nearest-fit radius, silhouette ghost), `confirmBar.js` (rotate, monument lines), `cards.js` (prestige locks), `welcomeBack.js`, `alerts.js` (stall warnings), its `text.js` section; `tests/stage4/ui/` | Sections 3.4, 3.5 and 3.9; the mobile height budget still passes |
| **D** Score v2 and gamification | `src/sim/score.js`, `src/data/scoring.js`, `src/save/records.js`, `src/ui/scoreUi.js`, `src/ui/share.js`, `src/ui/titleCard.js` (stamps), goals, firsts, achievements, feats and daily (data and sim), `celebrate.js` (captions), its `text.js` and `tips.js` sections; `tests/stage4/score/` | Section 6 |
| **E** Visual payoff and Motion | `src/render/ambient.js`, `src/data/ambient.js`, `src/render/effects.js` (Gentle variants), `src/ui/settings.js` (Motion), `src/render/walkers.js` (festival and dedication processions, read from `festivalStatus` and `monument_done`), its `tips.js` section; `tests/stage4/motion/` | Sections 7.1 items 3-4 and 7.2 |
| **F** Balance and integration (the integrator, after the merges) | `tests/sim/capital.test.js`, `tests/sim/longrun.test.js`, `src/dev/sampleCity.js` (backdrop, sample and stress cities), the values in `src/data/monuments.js`; `tests/stage4/balance/` | Section 5.3; the title backdrop's build time; final screenshots at four sizes, 150% text, Full and Gentle |

Merge order: A, B, C, D, E, then F.

### Conflict risks

| Shared file or seam | Who touches it | How to avoid trouble |
|---|---|---|
| `src/ui/text.js`, `css/ui.css`, `src/data/tips.js` | C, D, E | Delimited sections made by Track 0; nobody edits another's |
| `src/data/monuments.js` | A reads, B and C read, F tunes | Track 0 freezes the shape; only F changes values, after the merges |
| `src/ui/createUI.js` | C, D, E | Track 0 wires every hook; tracks fill their own modules |
| `src/render/renderer.js` | B; E's processions | E adds processions through the existing walkers list passed to `collectObjects`, not by editing the renderer |
| `src/render/effects.js` | B (finish moment), E (Gentle) | The capstone shine and the course dust live in B's `render/monuments.js`; E alone edits `effects.js` |
| `src/ui/settings.js` and the Motion level | E writes, B and C read | Track 0 exports `motionLevel()`; B's gangs and C's camera fit call it |
| `production.js`, `labour.js`, `clock.js` | A only | The Stage 2 chain tests and the capital run must pass after A's merge |
| Score history rows, records, share links | D | Track 0's migration marks old rows' version; D reads it |
| Tests that pin lists (version, unlocks, categories, settings defaults, score parts, link format, the service-worker file list) | Track 0 | All updated in the contract commit; `tools/sw-files.ps1` rerun after every merge, never hand-edited |
| `src/dev/sampleCity.js` and the dev scenes | F (cities), Track 0 (scenes) | Tracks use the scenes, not the sample city |
| The mobile height budget test | C, D (captions), E (tip) | Run `tests/ui/mobileBudget.test.js` on every UI merge |

### Lessons carried forward

- Reviewers who check the words against the sim catch the commonest bug; the site sheet is word-heavy, so every row gets that check.
- Screenshots under Gentle as well as Full, because the integrator, the reviewers and Josh may not see the same motion.
- At most five agents at once; resume agents after a usage limit rather than starting fresh.
- Check `git log` for commits from other sessions.
- An old Stage 3 worktree's test server was still listening on port 8765 while this review was written (serving `C:\dev\thebes-s3-score`); start servers on a fresh port and stop them afterwards.
