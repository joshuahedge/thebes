# Stage 3 follow-ups

Carried forward from the Stage 3 task reviews, the whole-branch review (fable) and its fix wave (11-12 Oct 2026). Nothing here blocked the merge. Before and after screenshots at the four sizes: `screenshots/stage-3-*.png` (before = the Stage 2 scenes on main; after = the six Stage 3 scenes: the Peaceful choice, a fire, a raid warning with tribute, a battle at the walls, the score, ambient water). Every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, parts 5 and 6).

## For Josh to check on a real phone
- How fires and raids feel at 1×: a blaze lasts about 2 s, a fire 7-10 s, a raid warning about 60 s.
- Whether the flames read at a glance, and whether the reduced-motion "Burning" label is legible.
- Ambient motion on an older phone (budget 2 ms a frame; rare life drops first), and the Settings switch.
- Share score through the phone's share sheet (picture and link), and opening a shared link.
- The horn and coin tick with sound on, and vibration on Android.

## Interface (the mobile UX pass picks these up first)
- With a raid warning up, the banner (now with "They arrive in …") plus the goals strip run past the middle of the map at 375×667 at 150% text and at 844×390 at 125-150% (they already did before the arrival line). What gives way (shrink to the countdown chip on its own, hide the goals strip under a critical banner, or move the defence line onto the tribute sheet) is a design call for the mobile pass.
- On a portrait phone a raid warning, the goals strip, the threshold bar and an open sheet stack up; the notification layers as a whole (banner, captions, tips, toasts, celebrations, markers) are the mobile pass's main subject.
- On a landscape phone the tribute sheet covers the right end of the warning banner.
- The 844×390 title card fits again (the weekly hint hides in compact landscape); check at 150% text.
- The next-threshold bar hides under a banner on phones only (ruling 151); on wide layouts it stays.

## Balance
- The 10-year village spends 65.3% of its taxes on wages, upkeep and soldiers' pay (the band is 60-70%); the capital run spends 39%, and gold still piles up late (Stage 4's monuments are the sink).
- No sample city burns or meets a raid in its 600 days: the title backdrop shows firehouses but no danger.
- Homes with no road beside them can never be covered by a firehouse (coverage reads a building's own road tiles).
- Spec 4.9's arrivals formula (6 + 0.05 × people) still differs from `data/mood.js` (30 + 0.08 × people), from Stage 1.

## Code and tests
- Tests worth adding: one that runs the real sim to a raid warning and checks the banner's full text against `world.raid.warning` and `tributeQuote`; the reduced-motion "Burning" label in a screenshot; the 844×390 title card at 150% text (the media query does not apply in the test shell).
- Small costs: `fireDay`'s `lit.includes` per building (3 ms a day on the stress city); `scorePreview` fills the reach cache per preview (2 ms; pass `{ cache: false }`); `alertsFor` still runs several times a tick (a per-tick memo if the stress city needs it).
- Accepted looseness: the tribute's "facing east" is advice (the quote counts every working tower); a struck building demolished the same day can be miscounted in the raid report; undoing a damaged tower's placement resets its wall tile.
- Ownership notes: `tests/stage3/contract/followups.test.js` now carries Track C's tree-sway check; `scoreUi.destroy` was added by Track E to stop a picture race between games.
- The long-run tests keep their Stage 2 names, so `-Grep "s3 balance"` does not select them; the band check hard-codes firehouse and tower upkeep.
