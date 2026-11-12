# Version 10.0 "A living Nile": follow-ups (12 Nov 2026)

What 10.0 left, in plain words. The sim did not change (`WORLD_VERSION` 12, `git diff 0209a40 HEAD -- src/sim` empty). Rulings: Part 31 of `handoff-2026-10-11/rulings-so-far.md`; each track's own notes are `2026-11-11-version-10-0-rulings-<track>.md`; the final review's shots are in `screenshots/raw/v100/` (gitignored) and its contact sheets in `screenshots/`.

## Josh's decisions at the final review
1. The festival music cue is left out; ruling 2065 is amended to "no new sound in 10.0" (2243). A festival piece is new music; take it up with the next music work.
2. The Ground legend's "Bright: room for a farm" key stays hidden (screen readers only) at 375x667 at 150% (2303). Revisit only if the real-device pass on a small phone at large text misses it.
3. A 9.x desktop player with a stored text size of 100 becomes Auto once, with a marker (2323). Anyone who wants 100 picks it once.
4. The drawn storm stays, called a "dust storm" in player words; it changes nothing (2327). It is not the sandstorm event.
5. A 160 MB desktop cache allowance rather than a cap on the far view's memory (2295).

## The budgets table
All times are ms, p50 / p95.

Sources: **Before** is Track 0's 11 Nov table (2105, fast machine state) and, in the harness column, Track P's 12 Nov 06:00 calibration (slow state). **After P** is ruling 2292 (12 Nov, slow state) and P's fix (2294, 2295). **With life** is the L merge (2253, 2254) and the final review's runs (12 Nov 14:16 to 14:30: `tools/profile.ps1 -Frames -Cpu 1,4`, and harness runs alone).

Instruments: **Profile** is the real game standing at zoom 1; its page takes the desktop budgets even at 390x844 (`deviceMemory` 8). **Harness** is `tests/v100/w0/phoneFrame.test.js`: panning, flushed, 600 frames, unthrottled.

| Scene x size | 9.1 target | Profile 4x before -> after P -> final, life on | Profile 1x before -> after P -> final | Harness before (fast; slow) -> after P | With life on (harness) | In-suite bound |
|---|---|---|---|---|---|---|
| Stress 64, 390x844 DPR 2 | P2: 16.7 / 33 | 94.7 / 129.5 -> 75.6 / 109.1 -> **55.4 / 87.3** | 17.5 / 26.1 -> 17.7 / 21.4 -> 13.2 / 26.7 | 16.8 / 51.4; 25.8 / 78.8 -> 17.9 / 36.8 (in-suite 23.0) | day 18.9 / 38.9 (LIFE 0.42); night 26.1 / 40.6 (LIFE 0.64; L merge 24.6, then 14.9 after the 2254 caps) | p50 25.3 (2294; target x 1.2 = 20.0 not met), p95 39.6 (met), js p50 8 |
| Huge 112, 390x844 DPR 2 | P4: 33 | 94.0 / 105.2 -> 87.4 / 114.3 -> **64.5 / 104.9** | 17.8 / 24.1 -> 16.0 / 23.4 -> 16.8 / 33.5 | 15.8 / 73.5; 29.6 / 119.5 -> 27.1 / 54.6 | day 23.4 / 48.0 (LIFE 0.44); night 30.7 / 54.8 at the L merge, 21.2 after 2254 | p50 39.6 (target x 1.2: met) |
| Stress 64, 1280x800 | (P2 for scale) | 36.3 / 42.2 -> 45.3 / 82.5 | 5.8 / 10.1 -> 9.5 / 15.6 | 10.9 / 14.6 -> 16.4 / 28.7 | LIFE 0.11 day, 0.36 night (2251) | standing median 23.0 (2291; the target-derived 13.0 is out of reach) |
| Huge 112, 1280x800 | (P4 for scale) | 81.1 / 104.8 -> 77.6 / 93.8 | 14.3 / 32.8 -> 14.5 / 28.8 | 11.4 / 38.9 -> 27.4 / 72.3 | LIFE 0.26 day, 0.73 night (2251) | none |
| Stress 64, 1920x1080 | (P2 for scale) | 78.1 / 128.8 -> 63.2 / 77.7 | 8.4 / 12.9 -> 13.2 / 21.7 | 15.9 / 23.5 -> 31.2 / 52.4 | not measured | none |
| Huge 112, 1920x1080 | (P4 for scale) | 106.7 / 120.8 -> 123.3 / 139.1 | 21.0 / 28.8 -> 23.0 / 36.6 | 19.7 / 59.7 -> 36.7 / 94.5 | standing zoom 1: day 24.5 (LIFE 0.30), night 28.4 (LIFE 0.74) | standing median 49.4 at zoom 1 (met: 31-32); floor zoom 250 (120-130, was 172) |
| Capital look, festival night (spec 6) | | not measured by any track | | | | follow-up (below) |

The night case's judging changed in the fix wave (2296): the night frame is measured as life's added cost over the light pass alone, paired and interleaved on one warm renderer. Measured on 12 Nov (loaded machine): phone stress light alone 14.8, with life 15.6 (adds 0.8, LIFE 0.46); phone Huge 15.8 / 16.8 (adds 1.0, LIFE 0.47); desktop Huge 49.9 / 48.2 (adds -1.7, LIFE 1.19). The bound is 2.0 ms added, js p50 8 ms or less, LIFE's mean within its device budget.

**In plain words.** Every in-suite bound is met unthrottled. Against the 9.1 targets at a 4x CPU throttle, 10.0 still misses:
- **Phone stress city:** 55 to 76 ms median against 16.7, about 3.3 to 4.5 times over. p95 is 87 to 109 against 33.
- **Phone Huge map:** 65 to 87 ms against 33, about 2.0 to 2.6 times over.

On a real mid-range phone that means roughly 10 to 15 frames a second on the stress city. The day-to-day city in a phone's own budgets and GPU is unmeasured until Josh's device pass. The gap is the software raster: two-thirds of a frame is native draw time (2292). The next steps are a terrain layer kept between frames and blitted on a pan, shadows in one path a frame, and a cheaper night tint.

## The real-device list (Josh)
- [ ] **M.1.** The phone leftovers' real-device findings: not done; the note `2026-11-xx-real-device-pass.md` does not exist (2310). It waits for Josh's findings.
- [ ] **S14.** The iOS pinch on a bar: only a real iPhone can confirm that the bars lose pinch-zoom and a two-finger touch that starts on one is cancelled (2305).
- [ ] **LIFE 1 ms on a real phone.** The Town street under Full motion: does the life layer stay within its 1.0 ms phone budget (spec Q1)? Here it reads 0.07 to 0.74 ms in the harness, on a laptop.
- [ ] **A small phone at large text.** Does the missing Ground legend room key (decision 2) matter at 375x667 and 150%?
- [ ] **The far-view hitch.** The off-map ground re-bakes in about 9 to 10 ms on a phone's software canvas when a pan crosses its margin (2119); if the device shows a hitch, bake it over two frames.

## Follow-ups (too big for the last fix round)
- **The 4x throttle gap** (above): a terrain layer blitted on pans, shadows batched into one path a frame, a cheaper night tint.
- **The night light pass's raster cost (2296).** `drawLight` costs +4.6 to +8.9 ms of software raster on a phone at night, measured against the same frame with no light. Life is lost in that noise; the light pass is the night frame's real cost. A cheaper tint is the fix.
- **A desktop at DPR 2 and zoom 1 re-bakes 4 chunks a pan sweep** at the 120 MB terrain allowance (2295). DPR 1 is fixed.
- **Paired, interleaved frame bounds for the day cases too** (2296's method), so the suite stops depending on the machine's state. The phone stress bound's headroom is thin (25.3 against an in-suite 23.0); if a suite flakes on it, rerun alone and note it.
- **The dust storm tied to the sandstorm event (10.1).** Draw the storm with the city's sandstorm event (read-only), so that a storm on screen and the event's losses are one thing.
- **Raider elephant and dark raiders:** a clearer lit and shade split.
- **A heron on a felucca's hull** (seen once, in a still of the wharf scene). Check which source drew it (life's heron hides under 0.9 tile, 2212) and widen the gap to the hull's half length.
- **Id headroom.** Crowd ids `(b.id % 11000) x 16`, festival extras `1100000 + (id % 25000) x 4` and streamers `900000 + 2 x id` reach the next range only for very high building ids (a collision needs two temples whose ids differ by 25000). The streamers' limit predates 10.0.
- **The fisher at the pier (2329)** is not seen in a shot; check it in the next wharf pass.

## What was left
- **The festival music cue** (spec ruling 2065, built nowhere, 2243): no festival piece and no cue hook exist. Take it up with the next music work.
- **Spec 6's table rows "the Capital look" and "a festival night"**: nobody measured them, before or after. Add them to the next paired run (the title's Capital backdrop with a festival is the nearest fixture, 2147).
- **M.1**, as above.

## Process
This docs pass shifted the old release tests' `RELEASES[n]` indexes by one (and their `APP_VERSION` pins to '10.0') by hand with Edit, checked against the diff; 9.3.1's `build` became its merge commit `3582196`.
