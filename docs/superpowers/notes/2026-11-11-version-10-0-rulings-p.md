# Version 10.0, Track P: rulings 2280-2299 (performance)

Where the plan and the code disagreed, the code won; each ruling says both. Every bound here is unthrottled (ruling 2105, Josh approved): the
in-suite tests measure headless Edge with no CPU throttle, and the 4x numbers come from `tools/profile.ps1 -Frames` alone.

**The machine's state.** This laptop has run about 1.7x slower since about 01:30 on 12 Nov (the brief's note). Calibration at 06:00 on 12 Nov,
before any Track P change: `-Grep "v100 w0 phone frame"` read stress p50 25.8 / p95 78.8 ms and Huge p50 29.6 / p95 119.5 ms, where Track 0 read
16.8 / 51.4 and 15.8 / 73.5 on 11 Nov: the slow state. Every number below names its time.

- **2280. The phone frame test's bounds are on, unthrottled, with one re-measure.** As the plan says, `tests/v100/w0/phoneFrame.test.js` turns on
  its `expect` lines (`BOUNDS_ON` true): the stress city's p50 <= 20.0 ms and p95 <= 39.6 ms, the Huge map's p50 <= 39.6 ms (P2 and P4 x 1.2,
  `boundsFor`), at 390x844 DPR 2 with the phone budgets. The plan's targets are at a 4x throttle and the harness cannot throttle (ruling 2104), so
  they are held unthrottled (ruling 2105). A scene that misses its bound is measured once more, the v90 budget test's way (`measuredWell`), so a
  passing burst of load does not fail the suite; the expects name the scene and the number missed. They fail at the start of the track: 06:00 on
  12 Nov the stress city read p50 25.8 and p95 78.8 ms (slow state; Track 0's fast-state reading was 16.8 / 51.4, p95 over already).
- **2281. The stress test's median is the flushed frame, held to 13.0 ms.** The plan: P2's target x 1.2 at 1280x800 scaled by Track 0's ratio
  between 1280x800 and 390x844 DPR 2. The ratio is the harness's (the in-suite instrument, ruling 2105): stress 10.9 / 16.8 ms, so
  20.0 x 0.649 = 13.0 ms (the profile's 1x ratio, 5.8 / 17.5, would give 6.6 ms, a standing camera's script time against a flushed one). The code
  timed the renderer's script alone (the raster deferred past it), 5 frames, under 50 ms; it now flushes the canvas each frame (`getImageData` of a
  pixel, the phone frame test's way), takes the median of 15 frames, and measures once more if it misses. The zoom-0.5 sanity bound (120 ms) stays.
- **2282. The Huge map's whole-frame bound sits beside V's layer bounds in `tests/v90/v/budget.test.js`, not in place of them.** The plan sets
  "budget.test.js's 112 bound likewise from P4"; the code's 112 bound is V's layers' own time (4 ms at the zoom floor in 1920x1080) and the raster
  cap (14 ms), and raising either to a frame's number would loosen it (Global Constraints: no bound is loosened). So a new test in the same file
  draws the whole frame of the 112 stress city at its zoom floor in 1920x1080 DPR 1, the camera standing and the walkers walking, flushed, median
  of 15 after 40 warm frames: P4's 33 ms x 1.2 x Track 0's harness ratio for the Huge map between 1920x1080 and 390x844 (19.7 / 15.8) =
  49.4 ms. It fails at the start of the track by far: the probe read 172 ms a frame at that zoom (the count cap, ruling 2289).
