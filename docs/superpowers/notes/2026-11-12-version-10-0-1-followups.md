# Version 10.0.1 "Your feedback": follow-ups (13 Nov 2026)

What 10.0.1 left, in plain words. The sim changed only where Track S ruled it (raid pace, who goes out, the storehouse fetch); `WORLD_VERSION` stays 12. Two optional saved fields are new, `raid.active.stride` and `unit.chase` (ruling 2394), both in free records and absent in 10.0 saves. Rulings: Part 32 of `handoff-2026-10-11/rulings-so-far.md`; each track's own notes are `2026-11-12-version-10-0-1-rulings-<u|s|a>.md`; Track G's findings are on the unmerged branch `v1001-g`. The final review's shots are in `screenshots/raw/v1001/` (gitignored).

## Josh's decisions at the final review
1. **D1 = B:** a unit goes out at once to any band within its 10.0 reach of home (soldier 8, archer 10, chariot 12), and beyond that to any band that threatens the city, anywhere on the map. Towers keep their range of 4. (Ruling 2420.)
2. **D2 = yes:** ship with the long-run balance misses and carry them to 10.1 "A fair reign" (the next section).

## The balance misses, for 10.1 "A fair reign"
Raids are no harder than in 10.0: raids lost are no worse on any seed (seed 10 now loses 0), and the lesson is unchanged. What drifts is the scripted long-run economies: more units wounded means a different court favour and so a different yearly due (ruling 2396's chain). Final numbers, each with both (ruling 2423, defenders = units wounded):

| Miss | 10.0 | 10.0.1 | Target or floor |
|---|---|---|---|
| Grand danger run, defenders lost per raid | 2.67 | **5.3** | 3.33 (NOT MET) |
| Seed 5 (B7), lowest gold | 23,485 | **-14,480** | 20,000 floor |
| Seed 10, lowest gold | 23,055 | **-20,291** (0 raids lost) | |
| Late run, years 10 and 11 profit | | 2.76 and 2.31 | |

Also met now: late danger run 4.6 defenders per raid (limit 5.14), B3 1.23 (limit 1.5), T1 lowest 1,700 and won day 6,043.

Levers for 10.1:
- **A fair reign** should re-aim these targets at the real cause, not the raids: the court's favour bands and their yearly due.
- The reviewer's lever, units below half their hit points do not go out, was tried and not kept (ruling 2422): seed 10 lost 3 of 11.

## The final review's follow-ups
- **A bank bird's hop flaps from game days**, about 7 full flaps a second at 3x (`src/render/wildlife.js:184`). It needs real milliseconds plumbed into `animalsAt`, so it was too big for the fix wave.
- **`updateStackTight` (`createUI.js`) and `createKeyBadges.decorate`** run on every store change, including ghost and hover moves. One toggles a body class and forces layout; the other rebuilds every badge. No frame test covers a drag and the cost was not measured. Measure it on a real phone drag before touching it.
- **Markers: far shows more than near (older, 9.2; not new here).** On the six-year Capital the far layout badges one per rolled-up row, including two rows of homes (illness, 5 homes; crime risk, 4 homes). The near layout never badges a home except "down" (`src/render/overlays.js:883-893`), so zooming in hides those rows. 10.0.1 only moved the city's problems so that home rows exist; the 9.2 code is unchanged since 10.0 Track Q. Decide: give homes' illness and crime near badges, or make far skip home-only rows. S's pin stays as measured.
- **The store sheet** (S-3) and the words (S-2) were fixed in the fix wave (ruling 2421); nothing is open there.

## Track G (sharper phone ground), set aside, and Josh's trial
Track G is not in 10.0.1; it lives on branch `v1001-g` (`git show v1001-g:docs/superpowers/notes/2026-11-12-version-10-0-1-rulings-g.md`, rulings 2400-2404).
- **The cause:** `DPR_CAP` 2 (ruling 1600). The map canvas never draws above device pixel ratio 2, so on an iPhone (DPR 3) a 390x844 page has a 780x1688 canvas the browser stretches 1.5x, ground included. Raising it is `renderer.js`, 9.0's call.
- **2400:** drawing a chunk with smoothing off when it is magnified by a whole number (2x, 3x) gives cleaner specks and tufts; it costs no frame time. Built on the branch.
- **2401 and 2402:** a phone ground bake at 3, or at 4 with a 128 MB terrain budget, was measured and not kept. Ceiling 3 on the old budgets: stress p95 55 to 64 ms and 76 bakes in a 600-frame pan. Ceiling 4 with 128/152 MB: p50 12.1, p95 24.6, 6 bakes, 139 to 151 MB of canvas, but in the full suite it failed the Huge night js bound and the Huge pan's p95 rose from 33 to 59-77 ms. No bound held with margin.
- **2403:** the memory cost for the phone is 139 to 151 MB of canvas against 46.6 MB today. If iOS ends the tab, the fallback is `CHUNK_CEILING.phone` 2 and the old budgets.
- **What Josh asked for:** a **full-iPhone-resolution trial after this push**: raise the canvas's DPR cap so an iPhone draws at its real pixel density, then measure on the real device, with the 2400 smoothing and the 2402 bake as the two levers. It needs a real iPhone; nothing here can confirm it.

## Accepted items, no action
- **2381, the flying bird is not baked.** It is one bird, a few strokes, off under Gentle and inside the ambient budget.
- **2387, the raid-exit fall.** A band that reaches a gate, stands a day and leaves can have its fall judged from its lagged drawn spot a step late. The pace glide (2430-2433) shortens the lag.
- **The 9.2 markers quirk** (far shows more than near): see above; older than this version.
- **V60_HELP default keys.** The long "On a computer" paragraph in How to play still names the default keys (static text from `KEYS`). Ruling 2417 adds one line after it, "the table above shows the keys you use now", whenever any key has been changed. The text itself is not rewritten per player.
- **The placing bar covers about 76 px more map** at 390x844: the price of buttons that do not move. The free band is still about 700 px. On a short phone at large text (375x667 at 150%) the 10.0 stacking returns while placing (ruling 2410); the ghost stays visible and placeable.
- **Soldiers' first frames out** ease their scrum offset in (ruling 2431); the 9.0 scrum itself is unchanged.

## Frame-budget flakes: checked, no regression
The frame-budget tests (`v100 w0 phone frame`, `v90 v budget`) failed only under load and passed alone. Paired runs, alone, in the order main 83a51a7, 10.0.1, 10.0.1, main:

| Run | Test | Result |
|---|---|---|
| main | `v100 w0 phone frame` | stress day p95 38.5, LIFE 0.43; Huge night life +1.8 ms |
| 10.0.1 | `v100 w0 phone frame` | stress day p95 38.3, LIFE 0.41; Huge night life +0.4 ms |
| 10.0.1 | `v90 v budget` | Huge night life +0 ms, LIFE 1.06; day median 34.1 |
| main | `v90 v budget` | Huge night life -0.5 ms, LIFE 1.09; day median 47.8 against bound 49.4 |

All passed; 10.0.1 is equal or lighter on every LIFE number, and main itself came within 1.6 ms of the Huge day bound. A's walk frames are baked slots (same draw calls) and U's badges are off on the phone rigs. `v91 a about` and `v100 p warm band` were not paired: they involve no A or U drawing.

## The real-device list (Josh)
- M.1 still waits for his real-device note (10.0, ruling 2310).
- S14 (ruling 2305): the bars lose pinch-zoom and a two-finger touch that starts on a bar is cancelled; only a real iPhone can confirm.
- The steady bottom bar on a real phone: Play, Speed, Map and Layers stay in one place with the tray open, placing and idle.
- The Track G trial above.
