# Version 10.0, Track L: rulings 2200-2259 (life and motion)

Where the plan and the code disagreed, the code won; each ruling says both. Life is render-side only: every source is a pure function of the world, the
time and a hash, and keeps its notes (a bank spot, a storm's start, the homes list) in WeakMaps by the world record, never in it.

## L.1 the figures

- **2200. Poses are kinds of their own, as `soldier_cheer` is a soldier's.** The plan names poses (`woman.grind`, `child` running and sitting, ...); the
  walker entry has one `kind` and the renderer draws slot `fig.<kind>` with its walk and mirror slots, so a pose is a kind: `child_sit`, `goat_lie`, `dog_lie`,
  `builder_climb`, `builder_hammer`, `crocodile_slide`, `woman_grind`, `citizen_sit`, `fisher_cast`, `woman_kneel` join `FIGURE_KINDS` (each with the standard
  bounds, walk slots and a `footShadow`), and `child`, `goat`, `dog`, `builder` (carrying), `crocodile` (basking) replace Track 0's placeholders. A sitting child is
  drawn at 0.86 of a citizen (a running one 0.76): at 0.72 it fell under `tests/render/figuresArt.test.js`'s ink floor. `fisher_cast` is drawn but nothing
  places it yet (ruling 2210). The 9.3 bar exempts `fig.` slots (no walls), and `figures.js` keeps its `footShadow` contract.

## L.2 townsfolk

- **2201. The hour comes from a peek at the light loop, not from `lightClock`.** `lightClock(world, now)` notes the frame's time, so a second caller in a frame
  would stop the loop; `light.js` gains `lightPeek(world)` (reads, never writes) and `dayOf(world, motion, settings)` ({ phase, dark, u }: noon in daylight
  under Still or with Day and night off). Sources take `day` as an option, so tests pass the hour.
- **2202. The share of homes with a figure moves smoothly with the hour (0.3, 0.42 in the morning, 0.26 at noon, 0.36, 0.3) and a figure whose hash it passes
  fades over 0.04 of it; dusk and dawn fade the yards with the night's `dark`; none at night.** The plan's "pick none, one or two by the hour" would pop a
  figure each time the hour stepped. Each figure keeps its place for a 24 s window (out of step by home) and fades over `LIFE.fadeMs` at each end; its id
  carries the window's parity, so the one fading out and the next fading in are two figures.
- **2203. The cap is met from a fixed set of homes: the nearest `1.6 x cap` to the view's middle.** Taking figures nearest-first up to the cap made a figure
  vanish whenever a nearer home's appeared. With 1.6 homes a figure the cap binds only at the morning's peak (then it cuts as the plan says). The homes list
  (`lifeCommon.js nearestHomes`) is kept while the range, the roads and `world.nextId` stand, for up to 2 s, and shared with the night's doors.
- **2204. The bank's figures are `woman_kneel` and the existing `water` carrier, on the open land tile next to the nearest water within 2 tiles** (cached per
  terrain, moved if a building is put there).
- **2205. The walker entry gains `alpha` (a fade), `lift` (art px off the ground) and `depth` (a nudge to its sort key).** The plan named only `alpha`; the
  heron's rise and a builder on a pole need `lift`.

## L.3 the bazaar's crowd

- **2206. The crowd is 3 + 5 x busy(hour), the last of a falling count fading over half a figure; at most 3 bazaars, nearest the middle; 12 stall spots in
  the bazaar's front half (so they draw over its sprite) with a little jitter.** A plaza or garden within 3 tiles seats two `citizen_sit` inside the same
  `LIFE.crowdCap` (so at most 6 stand by such a bazaar). Figures change stall every 6 to 10 game days (a 0.8-day walk at the end); Gentle stands each at its own.
- **2207. "Short of food" is under 10 food on the shelf: one figure.**
- **2208. The lesson's food step is its `workers` step, read through `stepDone` (read-only).** The plan's `world.lesson.step` does not exist: `world.lesson` is
  `true` and the step is the interface's. `workers` (farm, granary and bazaar all working) is the step after which food reaches the bazaar (spec Q6).
- **2209. The `bazaar-crowd` scene is set at the morning (`MORNING_MS`, the busiest), not noon** (`options.noon` keeps noon).

## L.4 river life

- **2210. No second wharf boat.** The River track already sends a staffed wharf's boat out and back with its fisher (`wildlife.js boatOf`, on game time); a
  life boat would double it. `fisher_cast` waits for the wharf's art to take it (Wave 4).
- **2211. Feluccas use the trade boat's slots (`fig.trade_boat`, `_l`), crossing a river row (ambient.js `riverRows`) near the view's middle, 40 s a
  crossing and 6 s at each bank, from City (one) and Capital (two).** A 7.1 layout's water blobs have no rows and get no river life.
- **2212. A heron lifts in two frames by the nearest boat's distance (4 px under 2 tiles, 9 px under 1.5), and is gone under 0.9 until the boat has passed.**
- **2213. The crocodile (Shemu, a bank by the middle, basking by day, `crocodile_slide` at dusk fading with the dark) and the hippo (7 s a minute, a splash its
  first and last second) are life's own, beside the wildlife's render-only crocs and hippos.** Cap `LIFE.riverCap`; none in the lesson.

## L.5 builders

- **2215. The monuments' builders are drawn with their gangs in `drawMonument` (`buildersLayout`), not as life walkers.** A walker inside a monument's footprint
  sorts behind its live drawing; inside `drawMonument` they stand on the course at its height and count in its own 1 ms bound for 3 sites (which holds), not in
  LIFE. 2 builders on a site of 2x2 or less, 4 above, each on a 4-day round: carry from the front pole, climb, hammer at the course, climb down.
- **2216. `gang()` gains the poses `carry`, `climb` (his pole drawn with him) and `sit`, and `builder: true` (the mud kilt and a headcloth).**
- **2217. The rest beat is the first day of each game month: sleds parked unloaded, haulers sitting (the plan's "wipe their brows"), masons and builders
  standing.** A mason's strike puffs 4 px of dust every 3 s of real time under Full.
- **2218. A rising building's builders are life walkers (source `idle`) on the scaffold's front poles (`scaffoldsAt`), climbing on game time and fading with the
  poles.** The scaffold stands a game day (a second at 1x), so they are brief; none on a paused building or in the lesson.

## L.6 night

- **2220. The lamps' flicker (+-8% over 1 to 2 s, Full only) is in `light.js drawLamps` (each pool's alpha), outside the LIFE dropper; the `flicker` source
  holds the doors, the hearths and the palace's windows (its late hook, after the light pass).**
- **2221. A door's glow is a lit opening (and a brighter core) drawn as batched quads in the home's front face, not `insetOpening`.** The primitive draws on a
  building's face frame inside its slot's art; the light pass has no face frame, and a soft pool before each door cost 1.4 ms on the stress city (the lamps
  already pool at 90% of homes). At most 160 doors on a desktop, 90 on a phone; none far out (the lamps' dots).
- **2222. Hearth smoke: one home in four, 24 (phone 14) nearest the middle, two puffs each in four alpha steps (four fills), dimmed by half at night.**
- **2223. The palace's windows: eight glows along its two front faces lighting one after another over 3 s from the start of dusk.**
- **2224. A festival night's temple lamps: a warm halo and the lamp a third brighter (`layers.js drawFestive`); `tests/v90/v/effects.test.js` counts the halo.**

## L.7 weather: the drift and the shimmer

- **2230. `windAt(world, nowMs, swing)` lives in `ambient.js` beside `windOf` (25 degrees over `LIFE.windDriftMs`; windOf at time 0).** Its callers: the crop
  bands and smoke (`ambient.js`), the clouds and gusts (`layers.js`). `procession.js` has no `windOf` caller (the plan named it). Two older tests now allow
  the drift (the stage 3 crop band, the v90 clouds: within a few art px or 0.15 tiles).
- **2231. The shimmer copies thin bands of the canvas a device pixel aside, at 0.3, in up to 16 far-sand tiles within 7 tiles of the view's middle, through
  the middle 40% of the day phase (the "noon phase"), in Shemu, Full, never in the lesson,** inside `drawWeather` (V's weather share). `effects.js` now passes
  the frame's motion to `drawWeather`, and createUI puts `motion` in `renderFrame`'s options.

## L.7 weather: the sandstorm (its own commit, the last, so it can be dropped: then regenerate `sw-files.js`)

- **2232. `stormsOf(seed, year)` takes the year from 0; storms at least 3 days apart; a storm starts at the first frame on or after its day and is skipped if
  that frame is 2 days late (a load).** 1 or 2 a year from the second year, on Shemu days, 20 to 40 s, k rising and falling over 5 s.
- **2233. The storm draws in the life source `weather` (the late hook): the haze (to 0.35), six dust banks rolling with the wind, and `LIFE.storm.dustCap`
  streaks, each a gust of three lines, in two sets half a window apart.** In pale sand on a sand map the streaks did not read; they are a darker ochre.
  The desert-edge gusts in `drawWeather` thicken towards the same cap. Gentle: the haze; Still: nothing. `tests/v100/l/budget.test.js` keeps a storm up.
- **2234. Lamps dim 30% (`light.js` reads `stormAt`); figures lean 4 degrees under Full (`renderFrame` takes `opts.lean`, radians: every figure skewed about
  its feet, from createUI's `stormLean`); the wind swings to 60 degrees (`windAt`'s swing, in the clouds and gusts).**
- **2235. The `storm` scene forces a 40 s storm begun 12 s earlier (`forceStorm`), so the shot shows it at full strength.**
- **2236. The V budget with a storm up: `tests/v100/l/storm.test.js` draws V's layers and the storm on the stress city within V's 2 ms (x1.2).**

## L.8 festival

- **2240. `PROCESSION.start` 8 and `max` 20, its order 20 long with a second shrine as the eleventh figure; figures past the sixteenth take ids from
  `EXTRA_ID_BASE` (1100000) + temple id x 4.** The stage 4 procession test's numbers move with it (9, 10, 11; ten temples to reach 20), and the `procession`
  scene picks its day from 18 (all 20 out) instead of 6.
- **2241. The onlookers stand on every other tile of the procession's road (its loop's first half), on alternate sides, facing it, at most `LIFE.lineCap`,
  in the crowd's source; the bazaar's crowd draws none on a festival day (it has joined them).**
- **2242. On a festival day the doors and hearths light over the minute before dusk.**
- **2243. The festival music cue is not done.** The plan says the festival piece "exists" and is cued "through the existing `pieces.js` hook"; 9.3.1 has seven
  pieces (none a festival's) and no cue hook, and `music.js` is no track's file in 10.0. Left for Wave 4 or Josh.

## L.9 the lesson

- **2250. `createLife` skips a source without `lessonOk` while `world.lesson` (townsfolk, the night and the crowd say it; the crowd waits for the food step).**
  `tests/v100/l/lesson.test.js` walks every step of the lesson and finds only townsfolk and crowd ids, the crowd only after `workers`.

## The budget

- **2251. Life within the LIFE budget, measured by `tests/v100/l/budget.test.js` (the seam's own timing, 90 frames, every source on; by day, and at night).** On this machine: 64 at 1280x800 day 0.11 ms, night 0.36 ms; 64 at 390x844 DPR 2 0.07 / 0.40; 112 at 1280x800 0.26 / 0.73; 112 at 390x844
  DPR 2 0.30 / 0.40 (budgets 1.5 desktop, 1.0 phone). Track P's headroom note (12 Nov, 06:40, read before the final suite; it had not appeared when L.7
  began) finds the in-suite frame bounds do not include life's hooks (they call `renderFrame` directly), and real-game headroom of about 2.1 ms (p50) on
  the phone's stress city and 2.1 ms in-suite on the desktop's at its settled 23.0 ms bound: so the Track 0 budget (1.5 / 1.0 ms) and every cap stand
  unchanged.

## Fix round 1 (review)

- **2252. Per-frame lookups are cached or ranged, and the shimmer follows the map.** The bazaar's seat is found with `buildingsInRange` round the bazaar (reach + 1), not by scanning every building; a festival day's working temples are kept per world (`workingTemples`, until `world.nextId` changes or 2 s pass, as `nearestHomes`); `stormsOf` is kept by seed and year (a Map cleared past 8 entries); `farSand` keeps only the terrain-based candidates and `shimmerTiles` reads `occ` and `road` at draw time, so a tile built or roaded since stops shimmering. Night, storm and festival-line tests now carry the cap, deep-frozen and determinism checks.

## The merge (into version-10-0, after Track P)

- **2253. The frame bounds hold with life's layer on (Josh's condition for the merge).** Track P's in-suite frame tests call `renderFrame` directly, so
  they drew no life. `tests/v100/w0/lifeLayer.js` wires life as `createUI` does (createLife with the device's kind; townsfolk, builders, crowd, river,
  night and weather registered; life's walkers after the rest, `ground` in the ambient hook, `late` in the fire hook, the light drawn, the storm's lean;
  Full motion), with the loop's clock at the morning or the middle of the night. Two tests use it: `tests/v100/w0/phoneFrame.test.js` "with life on
  (day)" and "(night)" (stress 64 and Huge 112 at 390x844 DPR 2, phone budgets and baker, 600 frames; the same p50, js p50 and p95 bounds as the frame
  without life, best of up to three; and LIFE's mean a frame <= 1.0 ms), and `tests/v90/v/budget.test.js`'s Huge frame "with life on (day)" and
  "(night)" (112 at zoom 1 in 1920x1080, the same HUGE_FRAME_MS 49.4; LIFE <= 1.5 ms). No bound was loosened; one cap changed (2254).
  The strict case: the layer holds every source on (createLife's frame clock stands still, so its dropper never sheds one). A first run on the frame's
  own clock shed the crowd (and at night the river) after a lone slow frame, so the measure left them out.
  Measured with grep runs, 12 Nov, while Track M's suite held the machine (frame p50 / p95, LIFE mean / p95 / worst a frame):
  phone stress day 20.4 / 33.2 ms, LIFE 0.41 / 0.8 / 1.3; night 24.6 / 38.4, LIFE 0.66 / 1.1 / 2.0 (bound p50 25.3, p95 39.6);
  phone Huge day 22.9 / 44.8, LIFE 0.44 / 0.8 / 1.4; night 30.7 / 54.8, LIFE 0.74 / 1.2 / 2.4 (bound p50 39.6);
  desktop Huge zoom 1 day 24.5 ms median, LIFE 0.30; night 28.4, LIFE 0.74 (bound 49.4; in the wider "budget" grep run 33.2 and 43.5, LIFE 0.51
  and 1.11). The frame without life in the same session: stress 18.7, Huge 22.5.
  Found: the phone's stress city at night is the tight one (24.6 against 25.3), and not because of LIFE's own time. The seam times only the
  JavaScript (0.66 ms); the night's doors and hearths cost their raster at the flush. A grep-only control ("night light alone", the light drawn and no
  life, back to back with nothing and with life) measured stress 17.7 ms light alone against 28.7 with life in one run (16.9 against 24.6 in
  another), Huge 26.5 against 29.4; the noise between runs is as large (the frame with nothing drawn was 22.6 ms in that run), so the control only
  says the night's own layer is where the night frame grows. Each source's mean a frame (the measured line names them): by day idle 0.28 ms, crowd
  0.09, river 0.04; at night flicker (the doors, hearths and palace) 0.55 of 0.71.

- **2254. A phone's night doors and hearths are 60 and 10 (were 90 and 14).** The relevant cap is not in `src/data/ambient.js`'s LIFE (idle, crowd,
  river and the lines are there) but `NIGHT_LIFE.phone` in `src/render/v100/night.js`; the code wins. The phone's stress frame at night failed its p50
  bound twice in grep runs of the with-life tests alone (25.5 ms, best of three, against 25.3; flicker 0.55 ms of LIFE's 0.71). At 60 and 10 it passed:
  stress night 14.9 ms p50 (p95 22.4; LIFE 0.40, flicker 0.30), Huge night 21.2 (LIFE 0.51), stress day 20.8, Huge day 15.8. Honestly told: Track M's
  full suite finished between the two runs, so most of the 10 ms is the machine's load and not the cap; the cap is lowered as the merge's rule says
  (fails alone twice: lower the phone's cap first), and the desktop's 160 and 24 stand. `tests/v100/l/night.test.js` still holds the phone's doors at or
  under the desktop's.

## The fix wave (final review L-1 to L-4; the controller commits each separately)

- **2326. The night doors stand on the wall line (L-1).** The review asked for each door's foot on the wall, not the tile's front edge. `doorPoints` now
  puts y at `b.y + b.d - DOOR_INSET` (0.18 tile, the yard before the wall) and the lit opening's base is lifted `DOOR_LIFT` (1 art px, the plinth) with a
  height of 4 px (was 0.2 to 4.6); the bright core follows. The inset is a fixed 0.18, not read from each home's slot (the review allowed either).
  `tests/v100/l/night.test.js` checks every door lies inside its home's footprint at or behind `b.y + b.d - DOOR_INSET`.
- **2327. The storm reads on a phone (L-3, Josh's decision: it stays).** Streaks are drawn `streakWidth(g.scale)` wide, never under `STORM.streakDevicePx`
  (2) device px (and never under the old 1.4 art px); the dust banks' alpha is `STORM.bankAlpha` (0.12) plus `STORM.phoneBankAlpha` (0.1) when the
  device kind is phone (`weatherSource({ deviceKind })` defaults to the page's `DEVICE_KIND`, so `createUI` is untouched; `drawStorm` takes a sixth
  `deviceKind` argument). The 5 s ramp and the no-flash rule are unchanged. `tests/v100/l/storm.test.js` holds both.
- **2328. The `festival-crowd` scene shows a festival (L-2).** After the 7.0 festival scene sets up the town it takes the offer down, sets
  `festivalDay = day - 18` (`FESTIVAL_AGO`, all 20 figures out), holds noon, closes any sheet, centres on the first working temple's road (middle of its
  out half) at zoom 1.2, and throws unless it counts 16 or more procession figures and an onlooker; it returns both counts. New
  `tests/v100/l/festivalScene.test.js`. Retaken shot: 54 figures (several temples), 15 onlookers.
- **2329. The wharf's fisher is placed (L-4).** The skiff's sprite already holds its own fisher, so `boatOf` stays as it is and a staffed wharf with a boat
  now also has a pier fisher (`pierFisherOf`, id slot 0 of the wharf's three) at the pier's water end: `fisher` standing, `fisher_cast` under Full while
  the boat holds at either far end of its drift (`|sin|` of the drift phase above `BOAT_HOLD` 0.9); Gentle and Still keep him standing. This reads the
  review's "boat fisher takes fisher_cast" as a second, pier-side figure rather than a change to the boat's sprite; not seen in a shot.
