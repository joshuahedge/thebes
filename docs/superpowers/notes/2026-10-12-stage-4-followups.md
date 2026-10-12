# Stage 4 follow-ups

Carried forward from the Stage 4 task reviews, the art-direction review, the visual polish wave, the whole-branch review (fable) and its fix wave, the scripted 390×844 touch play-test and the wrap-up (12 Oct 2026). Nothing here blocks the merge. Before and after contact sheets at the four sizes: `screenshots/stage-4-full-*.png` and `screenshots/stage-4-reduced-*.png` (before = `s4before`, the closest scenes the game had before Stage 4; after = `s4final`, the nine Stage 4 scenes on the final art); the six pictures to show are `screenshots/stage-4-show-*.png` (a pyramid rising under Gentle, the capstone moment under Full, a stalled site's sheet, placing the great pyramid on a 390×844 phone, a festival procession, and the city at 1280×800 under Gentle). Every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, parts 9 to 11).

## What changed, measured
- **Monuments are the late-game gold sink.** Work costs 6.5 gold for each unit laid, 130 a crew-month (163 on Hard), plus each founding (150 to 6,000) and the gilding and capstone: about 217,000 for one of each.
- **The capital run** (spec 9's programme, `tests/stage4/balance/capital.test.js`): over its last 24 months, with four crews at work, wages, upkeep, soldiers' pay and monument work take **67.5%** of taxes (band 60-70%). It holds **59,319 gold at year 6, only 681 under the 60,000 ceiling**: a small rise in taxes or fall in wages can tip it over, so it is the first number to watch after any economy change. Unemployment averages **11.2%**, at most **17.4%** at a month end (two months when every quarry idles between monuments; ruling 301 checks the mean, at most 15%, and no month over 20%). The small obelisk is finished on day **557**, the colossus on day **1,254** and the small mastaba on day **1,967** (year 6 ends on day 2,160).
- **The title card** builds its sample city (a finished small obelisk, a colossus going up, the palace in its third style) in about **300-370 ms** in headless Edge (it was 173-366 ms before the visual polish; the test's limit is 1 s).
- **The live monument draw** costs **0.85-0.96 ms a frame** for the stress city's three sites (great pyramid, large mastaba, colossus) on a busy laptop, against a 1 ms budget (`tests/stage4/balance/budget.test.js`). The margin is thin: if the test flakes, spec 5.7's fallback is to cache the finished courses at the current zoom step, not to loosen the limit.
- **The wrap-up's fixes:** a monument's ground words follow the sim ("Dry ground, not the fields"; ruling 299); picking a monument on a phone keeps its corners in view as well as its top (the mastaba's corner was cut by 32 px); the supply chip names every missing material ("No bricks or stone near"); every build tray that scrolls on a phone shows a calm edge fade with a chevron (ruling 300); the picture cards were made again on the final art.

## For Josh to check on a real phone
- **The music, by ear.** Open `tools/music.html` (through `python tests/serve.py 8000 .`, then http://localhost:8000/tools/music.html) on the phone's speaker and on headphones: the calm and raid moods, volume 30, and whether the ney wants a little breath.
- **The picture cards** on first New city and from How to play: each ring or arrow on its thing, the words readable at your text size (at 150% on a small phone the last line scrolls).
- **Gentle motion** on your own devices, with Settings → Motion on Follow the device: a phone or laptop set to reduce motion should walk people, sleds and processions while water and smoke fade in place, with nothing swaying and no camera glides.
- **Placing a pyramid by touch:** pick it from the Monuments tray (the chevron shows the row goes on), drag it by its body, read the chips, turn a mastaba with ⟳, tick.
- **The palace:** whether it reads grand at phone zoom in its later styles, and the Enlarge question on its sheet.

## Interface (a later phone pass picks these up first)
- A one-tile drag does not move a ghost (tapping the target tile does); dragging a big ghost has no edge auto-pan, so it can be dragged half off screen.
- A ghost's nearest fit rarely finds a spot with a road in a big city (crew and supply warnings weigh the same as "no road"), so it lands with "No road yet" and three lines of chips.
- The cut tip's "More ▾" overlaps the last word of the cut line.
- After the mastaba's site sheet opens, the site sits cut at the left edge of the map left free; the same side extent the pick now uses would fix it.
- The ghost says "+18 Monuments when finished" (score points) while the sheet says "+70 when finished" (prestige): two units side by side.
- A stalled site's sheet repeats its cause three ways; a mastaba with one guild says "about 8 years 11 months" (true, alarming).
- On phones the monument line is clamped to two lines and the full words live only in a tooltip touch cannot reach; the locked small pyramid card orphans "0)".
- The picture cards: focus goes back to the page, not to the button that opened them, on iOS; the page behind is not inert; at 150% text on 375×667 the words area cuts its last line with no scroll cue.
- The monument and palace sheets keep Stage 3's "Fire: Never catches fire" row before their own.
- **A rotate-view option** (Josh's request) is a material build, deferred (ruling 298): all the art, shadows, terrain baking, depth sort, input and camera assume one viewing direction.

## Balance
- 681 gold of headroom under the 60,000 ceiling (above). The band was tuned on Normal only: the capital run on Hard and Relaxed is untested.
- The sample city's mood is 35 loaded (44 as built), low for a showcase; it shows no devolve badges now.
- Two clay pits make 80 clay a month for two brickworks that use at most 60, so the works quarter's storehouse fills with clay; a clay pit could idle with its brickworks, as the supply buildings do.
- The third quarry idles for most of the run until the small pyramid; it is spec 9's list.
- The capital run takes 2-3 s of its 5 s budget (Track A's daily crew plan and supply checks); profile `crewPlan` and `supplyNeeded` if it flakes.

## Art and motion
- The palace's columned style has a lower skyline than the first and one shared ground shadow; the sphinx's haunch stands tall; the gold room wash reads olive against its legend swatch.
- Smoke puffs are close to the whitewash tone; the felucca is on screen about 60% of the time (no longer rare); gang figures are small clumps at phone zoom 1.
- The capstone and procession scenes frame wider than an upright phone (dev scenes only).
- Under Gentle, fire smoke sits half behind the "Burning" label, and neighbouring "Burning" pills overlap.

## Sound
- A music volume change fades over the 2 s start fade, so + and − are barely audible for a second; at volume 0 the music still schedules every bar; the audio context is made on a settings change before a gesture (an autoplay warning). Treat volume 0 as off and make the context only on a gesture.
- No test backs the "well under 1% of a phone's processor" claim for the music scheduler.

## Code and tests
- Small costs: `hasMonumentWork` rebuilds the crew plan per guild before checking `isWorking`; `festivalSize` and `dedicationsOn` run every frame with no festival; `homesMadeNicer` is homes × buildings per sheet render.
- Fragile but true today: score v1 and v2 bests sort by raw number; the stamp glyphs drop a pyramid after four mastabas; the score split text relies on a name fallback; `ui4Months` uses literal 30 and 12; the minimap repeats the gold colour; `CONTRACT4_TEXT.motion` is unused; `EPS` is duplicated in production.js.
- A count-badge tap at the closest zoom returns true and does nothing; View's outline is always the problem colour.
- Tests worth adding: words-against-sim for picture cards 2, 4 and 5; a check that the committed `cards.json` still matches the scenes (stale pictures pass today); the music scheduler's cost; the capital run on Hard and Relaxed; the stall goals' longest causes at 150% text on 360×640.
- Spec 6.9's headings row still says section titles sit in a cartouche (ruling 294 narrowed that to sheet titles and the title card).
