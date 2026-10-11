# Mobile UX review: notifications first, then the rest of the phone experience

Reviewed 12 Oct 2026 on main after the Stage 3 merge (b87ec4a, 1226 tests). Josh asked for a mobile UX review and said the notifications feel cluttered on a phone. This note checks every layer that appears over the map, then the rest of phone play, against spec 6.1-6.8 and 4.1, the Stage 3 UX digest (`reference/stage-3/ux.md`, rules [U1]-[U15]), and the city-builder research (`reference/city-builders/phone-and-cozy.md`, `onboarding-and-gamification.md`). It picks up the Interface items of the Stage 2 and Stage 3 follow-ups and ruling 160.

## How it was checked

- 124 screenshots in headless Edge at 390×844, 375×667 (small phone), 844×390 and 667×375 (landscape), at 100%, 125% and 150% text (the game's own Text size setting, `settings.set({ textSize })`, which sets `data-text-size` and `--ui-scale`).
- Folder: `C:\Users\joshed\AppData\Local\Temp\claude\C--Users-joshed\5b65ba77-073a-47cc-9bb5-151599212ef5\scratchpad\mux\` (temporary; copy any you want to keep into `screenshots/`). Names are `<scene>-<size>-t<text>.png`, for example `raid-375x667-t150.png`.
- Scenes were driven through `window.__thebes` with the sim's own commands and `ui.afterCommand`, so captions, tips and Undo toasts came from the real code paths. The raid warning is the Stage 3 `tribute` scene's warning without its sheet; the fire is the `fire` scene's home. Reduced motion was on (no caption slide), as headless asks for it.
- Each shot also measured the rows: where the last row under the top bar ends, and how much map is left clear. **"Clear map"** below is the rectangle between the last top row and the first full-width bottom panel (dock, confirm bar, sheet), left of the rail, drawer or landscape sheet, as a share of the whole screen. Corner buttons are not counted against it.
- The scratch tool (a copy of `tests/screenshot.ps1` with a `-Measure` step, plus `prelude.js`, `measure.js`, `scenes/*.js` and `run.ps1`) is in the same folder. Task 1 below proposes bringing it into the repo.

### The numbers

Each cell: where the rows under the top bar end (% of screen height) / clear map (% of screen).

| Scene | Text | 390×844 | 375×667 | 844×390 | 667×375 |
|---|---|---|---|---|---|
| Calm city (goal + threshold bar) | 100% | 18 / 73 | 22 / 66 | 30 / 65 | 31 / 63 |
| | 150% | 27 / 61 | 34 / 51 | 38 / 58 | 48 / 48 |
| First minutes: road laid (goal, tip, caption, Undo) | 100% | 29 / 61 | 37 / 51 | 38 / 57 | 40 / 55 |
| | 150% | 29 / 59 | 49 / 36 | 45 / 51 | 55 / 41 |
| First minutes: plots while paused (+ Press Play) | 100% | 29 / 61 | 44 / 44 | 38 / 57 | 46 / 49 |
| | 150% | 33 / 55 | 49 / 36 | 53 / 44 | 55 / 41 |
| Raid warning + goal + caption | 100% | 35 / 55 | 44 / 43 | 56 / 41 | 58 / 38 |
| | 125% | | 57 / 29 | 61 / 36 | |
| | 150% | 57 / 31 | 72 / 12 | 77 / 21 | **114 / 0** |
| Raid warning + fire + caption | 100% | 35 / 55 | 44 / 43 | 56 / 41 | 69 / 29 |
| | 150% | 63 / 25 | 79 / 5 | 93 / 7 | 93 / 6 |
| Raid warning as countdown chip + caption | 100% | 30 / 60 | 38 / 50 | 51 / 45 | 53 / 43 |
| | 150% | 39 / 49 | 49 / 36 | 56 / 41 | 68 / 30 |
| Raid warning + fire-risk overlay + remark | 100% | 38 / 52 | 48 / 40 | 56 / 41 | 64 / 33 |
| | 150% | 67 / 21 | **84 / 0** | 77 / 21 | **130 / 0** |
| Placing a well with a raid warning up | 100% | 33 / 57 | 41 / 45 | 45 / 34 | 53 / 24 |
| | 150% | 59 / 24 | 74 / 3 | 67 / 21 | **119 / 0** |
| House sheet with a raid warning up | 100% | 30 / 10 | **38 / 2** | 45 / 34 | 47 / 27 |
| | 150% | 49 / 0 | 62 / 0 | 67 / 21 | 103 / 0 |
| Tribute sheet | 100% | 30 / 25 | 38 / 5 | 45 / 34 | 47 / 27 |
| Welcome back | 100% | 18 / 23 | 22 / 18 | 30 / 43 | 31 / 35 |
| | 150% | 27 / 13 | 34 / 6 | 38 / 38 | 48 / 27 |
| Battle at the wall (active raid) | 100% | 25 / 65 | 32 / 56 | 41 / 55 | 42 / 53 |
| Build tray open | 100% | | 22 / 46 | | 31 / 34 |
| | 150% | | 34 / 28 | | 48 / 25 |

Calm play is fine: two thirds of the map is clear on a phone at normal text. The trouble starts the moment two or three things happen at once, and at larger text it becomes unplayable. Over 100% means the rows run off the bottom of the screen.

## 1. The short version

1. **Too many rows stack under the top bar.** Banner, legend, goals strip, threshold bar, nudge line, tip and caption are seven separate rows, and each one adds height. A raid warning with a goal and a caption ends at 44% on a small phone at normal text and 72% at 150%; on a landscape phone at 150% it runs off the screen. Spec 6.1 says nothing over the middle of the map. **Do:** on phones allow two rows at most under the top bar, an alert row and one guidance row; tips, captions and the legend take turns in the guidance row instead of adding rows.
2. **The raid banner is a paragraph.** Title, arrival, defence line and four buttons take 15-19% of a phone at 100% and 32-61% at 150%. **Do:** on phones the raid warning shows as its one-line countdown chip; tapping the words opens the raid sheet (today's tribute sheet), which already holds the arrival, the defence and Pay tribute. "+N more" moves to the Map badge.
3. **A fire hides behind a raid that is months away.** The banner ranks a raid warning above a fire nobody reaches, so a fire that burns out in 7-10 s sits behind "+1 more". **Do:** rank active raid, then uncovered fire, then raid warning, then debt, then save failing.
4. **Sheets open under a full stack, and the selected building is hidden.** With a banner up, a house sheet leaves 2% of a small phone's map clear, and the Manor you tapped is behind the rows. The camera frames it under a 48 px top bar that is really 250 px tall. **Do:** when a sheet is open on a phone, hide the guidance row and keep only the one-line alert; frame the building against the measured bottom of the rows.
5. **The first minutes are noisy.** Placing plots while paused shows a two-row goals strip, a tip, a caption, two Undo toasts and the Play ring at once, plus three different counters ("3 of 10", "0 of 1", "Town: 0 of 150"). **Do:** one-row goals strip, threshold bar hidden while the guide runs, one toast at a time, captions in the guidance row.
6. **Toasts wrap one word per line.** `#toasts` is centred with `left: 50%` and a transform, so it can only use half the screen: "6 / plots, / 60 / gold" at 150%, two lines at 100%. **Do:** let toasts span the screen (up to 420 px).
7. **Large text needs its own rules, not shrunken versions of the normal ones.** At 150% the corner buttons ride up to the middle of the map over an open tray, and in landscape they sit on top of the goals strip's Show me. **Do:** the two-row cap, one row in landscape at 125%+, and corners that hide rather than float mid-map.
8. **What is already good:** problem markers on buildings, the Map badge, the single live announcer, tap targets (44 px everywhere I measured), the Back stack, the confirm bar, and calm-state map coverage. Keep them.

## 2. Findings by area

### 2.1 The stack under the top bar (all notification rows together)

- **Evidence:** `raid-375x667-t100.png` (rows end at 44%, 43% clear), `raid-375x667-t150.png` (72%, 12% clear; the caption reaches the corner buttons), `raid-667x375-t150.png` (the banner alone runs 18-79%; the goals strip slides under Play and Map, so Show me is covered), `raidoverlay-375x667-t150.png` (84%, nothing clear).
- **Principle:** spec 6.1 "Nothing floats over the middle of the map" and 6.3 "Small phones": the goals strip must end above the middle at any text size on 375×667 and 844×390. Ruling 160 left this open for this pass.
- **Why it happens:** `#under-bar` is one flex column of notice, banner, legend, goals (with threshold and nudge), tip and caption. Each layer was made smaller at large text (ruling 111, 151, the tip's and caption's tight styles), but nothing caps the total.
- **Change:** a phone gets two rows at most under the top bar: an **alert row** (the one banner, one line) and a **guidance row** (one of legend, tip, caption or goal). Section 3 has the model.

### 2.2 The critical banner

- **Evidence:** `raid-390x844-t100.png` (raid warning, 6-21%), `raid-844x390-t125.png` (14-38%), `raidplace-375x667-t150.png` (12-56%; Shrink drops to its own row), `chip-375x667-t100.png` (the chip: one line, 8-17%).
- **What it shows now:** "Raiders from the east are after your storehouses. They arrive in 2 months." plus "or build 2 towers facing east (≈ 300 gold)" plus View, Pay tribute, Shrink and "+1 more". The arrival is in the title, the chip and the tribute sheet, and the defence line and the tribute are both on the banner and on the tribute sheet, which opens below it (`tribute-375x667-t100.png`: the same three facts twice on one screen).
- **Principle:** [U3] one critical, one channel; [U13] tribute gets one specific confirmation sheet; spec 6.1 things you read at the top, things you tap at the bottom.
- **Change:** on phones (portrait and compact) the banner is always one line: icon, words, View. A raid warning shows its countdown chip from the start ("Raid from the east · 2 months 12 days"); tapping the words opens the **raid sheet** (the tribute sheet, headed "Raid warning" when no tribute is offered on the first raid), which already has the arrival, the defence quote with Show me, and Pay tribute or Keep gold. Shrink is not needed on phones. Wide screens keep today's banner.
- **Small fix:** the chip says "2 m 0 d" when the days are 0 (`chip-375x667-t100.png`). Say "2 months".

### 2.3 Banner ranking and "+N more"

- **Evidence:** `raidfire-390x844-t100.png`: a home is burning on screen, the banner talks about raiders two months away, and the fire is "+1 more". `minimap-375x667-t100.png`: "+1 more" opens the minimap sheet, where the alert list starts below the fold under a 200 px map.
- **Principle:** [U1] match intrusiveness to urgency; [U15] telegraph; the fire lasts 7-10 s at 1× (Stage 3 follow-ups), the warning about 60 s.
- **Change:** rank by how soon harm lands: active raid, uncovered fire, raid warning, debt, save failing (`CRITICAL_RANK`). On phones drop "+N more" from the banner: the Map badge counts every alert the banner is not showing, criticals included, and opening the minimap sheet from the badge or the banner lists alerts first (criticals first), map second.

### 2.4 The goals strip, its count and the threshold bar

- **Evidence:** `fresh-375x667-t100.png` (strip 8-19%: words on one row, Show me, Goals and Skip guide on a second), `fresh-375x667-t150.png` (12-31%, Skip guide on a third row), `plots-390x844-t100.png` (three counters: "3 of 10", "0 of 1", and on calm frames "Town: 0 of 150 people"), `battle-375x667-t100.png` ("Make more jobs" during a battle).
- **Principle:** spec 4.1 (one strip, Show me); onboarding research rule "one channel" and NN/g "one tip per interaction"; spec 6.1 one panel at a time.
- **Change:**
  - One row on phones: the label or "2 of 10", the goal words (two lines at most at 150%), the progress chip, Show me. The label and words are one button that opens the Goals sheet, so the separate "Goals" button goes. Skip guide moves into the Goals sheet (it is one tap, no confirm, either way).
  - The threshold bar shows on phones only in calm portrait play (no banner, tip, caption, sheet or tool), never while the guide runs, and never on a landscape phone. The Goals sheet and the summary always show it.
- **Keep:** the strip's live updating, the glow nudge on Show me, the reward in the Goals sheet.

### 2.5 Tips

- **Evidence:** `early-390x844-t100.png` (a three-line tip under the strip, 15-24%), `early-375x667-t150.png` (12-49% with the strip), `early-844x390-t100.png` (one line, fine).
- **What it does now:** its own row. At 125%+ on phones it closes itself after 15 s of drawn frames, and while it shows, captions wait (landscape phones always).
- **Principle:** onboarding research: tips live in the goals strip and temporarily replace the goal line; one at a time; never time out unless retrievable (they are: How to play lists them).
- **Change:** the tip takes the guidance row in place of the goal (no new row). It closes on Got it, when its condition clears, or after 20 s of **unpaused** play on any phone (so Press Play stays while paused). Esc closes it (research rule: Esc closes any tip).

### 2.6 Celebration captions (goals, firsts, feats, milestones, remarks, raid reports, blazes put out)

- **Evidence:** `early-390x844-t100.png` ("Goal done: Lay a road +25 gold", a fourth row at 25-29%), `toasts-375x667-t100.png` (a two-line caption with its why: 19-31%), `raidoverlay-375x667-t150.png` (a remark at 75-84%, below the middle).
- **What it does now:** its own row, 2.5 s for goals, firsts and feats, 4 s milestones, 6 s info. Remarks have no tier time of their own and fall back to 2.5 s. 2.5 s is short for a two-line caption with gold on a phone, read while the player is looking at the map; in two of my first captures it had already gone by the time the picture was taken. Nothing keeps a record once it hides.
- **Principle:** XAG 116 (notifications that vanish need 10× time or a way back); onboarding research rule "banners that hide themselves are copied to a Recent log"; [U1] info is the quietest tier.
- **Change:** captions show in the guidance row (in place of the goal, or of a tip for their few seconds, unless focus is on the tip). Times: 4 s for goals, firsts, feats and remarks; 5 s milestones; 6 s info. At most two wait; older ones go straight to a **Recent** list (the last 10 captions, in the Goals sheet). Under a banner only info captions and danger goals show; the rest go to Recent. A goal caption reads as the strip itself changing ("✓ Lay a road · +25 gold", then "2 of 10 Place 6 housing plots").

### 2.7 Toasts

- **Evidence:** `plots-390x844-t100.png` (two Undo toasts at once, for the road and for the plots), `plots-375x667-t150.png` ("6 / plots, / 60 / gold" one word a line), `early-375x667-t100.png` ("Road: 5 tiles, / 10 gold").
- **Cause:** `#toasts { left: 50%; transform: translateX(-50%) }` makes the toast shrink to half the screen. Two Undo buttons are confusing too: Undo always undoes the last action, whichever toast you tap.
- **Change:** on phones one toast at a time (the newest replaces), as wide as the screen allows up to 420 px with 16 px sides. Times stay 4 s and Undo 6 s.

### 2.8 The overlay legend and the Layers button

- **Evidence:** `raidoverlay-390x844-t100.png` (fire risk under a banner shrinks to the ◧ icon beside it), `raidplace-375x667-t100.png` (the well's automatic Water overlay, also an icon).
- **What works:** the Layers corner button names the overlay ("Fire risk", "Water"), so the player knows which overlay is on.
- **Change:** on phones the legend takes the guidance row while an overlay is on (the goal waits), so the full legend is readable under a banner instead of an icon. The icon rule (rulings 111 and 149) is no longer needed on phones.

### 2.9 Sheets with notifications up (house, building, tribute, summary, minimap, Welcome back)

- **Evidence:** `raidsheet-375x667-t100.png` (house sheet from 40%; banner and strip to 38%; 2% of the map clear and the Manor not visible), `raidsheet-390x844-t150.png` (the sheet slides over the goals strip), `tribute-844x390-t100.png` (the landscape sheet covers the banner's buttons and cuts its words), `welcome-375x667-t150.png` (6% clear above Welcome back).
- **Cause:** the sheet rules (60% bottom sheet in portrait, a column in compact) never talk to the rows above. `sheetInsets` and `placingInsets` in `createUI.js` use `TOPBAR_PX = 48` as the top of the free map, so a selected building is framed under the rows, not below them.
- **Principle:** spec 6.1 one panel open at a time; spec 6.3 "Selecting a building moves the camera so the building stays visible above the sheet".
- **Change:** while a sheet is open on a phone, the guidance row hides (its captions wait, tips wait) and the alert row is its one line. The camera frames the building between the measured bottom of the rows and the top of the sheet (`dev/scenes.js` already measures this as `freeTop`). In compact the rows stop at the sheet's left edge.

### 2.10 Placing with a banner up

- **Evidence:** `raidplace-375x667-t100.png` (the well's ghost at 61%, visible; fine), `raidplace-375x667-t150.png` (rows end at 74%, corners at 68%: the ghost sits behind the banner), `raidplace-844x390-t100.png` (fine).
- **Cause:** `pick()` starts the ghost at 40% of the screen height, whatever covers it.
- **Change:** start the ghost, and frame Show me, in the middle of the map that is actually free (measured, as above).

### 2.11 Problem markers, the Map badge, the score chip, Welcome back

- **Problem markers** (the orange and red badges on buildings, `city-390x844-t100.png`) are in the world, small and tied to their building: the right channel for warnings [U1]. No change.
- **The Map badge** works. With 2.3 it also counts criticals not in the banner.
- **The score chip** is small and quiet in portrait. In landscape it drifts to the far right under ☰ (`raidplace-844x390-t100.png`), and a new city shows "Score 150" with nobody living there (`fresh-375x667-t100.png`). Minor; see section 4.
- **Welcome back** is a good card (trends with words, sticky Carry on). Its only problem is 2.9: the strip and threshold bar above it.

### 2.12 The bottom: dock, tray, corners, speed

- **Evidence:** `tray-375x667-t150.png` (with the tray open the corner buttons float at 39-47%, the middle of the map), `raid-667x375-t150.png` (corners over the goals strip), `raidplace-844x390-t100.png` (the rail's own ✕ and a clipped ✓ under the confirm bar's ✕ and ✓, already at 100% text).
- **Principle:** spec 6.3 corner buttons "never in the middle"; Stage 2 follow-up (rail ✓ clipped).
- **Change:** in portrait, hide the corner row while the tray is open if it would sit above half the screen (125%+ text); in compact, hide the rail's ✕ and ✓ while the confirm bar shows them. Give the speed chevron its word ("Speed") like the other corner buttons; today it is a bare ▲ that reads as "scroll up".

## 3. A notification model for phones

Applies to the portrait and compact layouts. The wide layout keeps what it has.

### What may be on screen at once

| Place | Holds | At most |
|---|---|---|
| Top bar | numbers, ☰, score chip | 1 bar |
| **Alert row** (under the top bar) | the one critical, one line: icon, words, View | 1 row |
| **Guidance row** (under the alert row) | one of, in this order: legend (overlay on), tip, caption, goal (+ threshold bar in calm portrait) | 1 row |
| On the map | problem markers, the guide's ring, Show me's pulse, raid pins | no limit; never text |
| Corners | Play and speed; Map with its badge; Layers | 2 groups |
| Bottom | dock or confirm bar or sheet (one), one toast above the corners | 1 panel, 1 toast |

### What queues, collapses or goes to a list

- **Criticals:** one in the alert row; the rest are counted in the Map badge and listed first in the minimap sheet. Rank: active raid, uncovered fire, raid warning, debt, save failing. Never time out; clear when the trouble does.
- **Warnings:** markers on the map, the badge and the list (unchanged).
- **Tips:** one at a time, in the guidance row. Close on Got it, Esc, when the condition clears, or after 20 s of unpaused play. Existing caps stay (1 per 3 min of play, 5 an hour, none in the first 10 s).
- **Captions:** in the guidance row, one at a time, 3 s apart. 4 s for goals, firsts, feats and remarks; 5 s milestones; 6 s info. At most two wait; the oldest goes to Recent. While a banner is up only info captions show. Every caption is also written to Recent (last 10, Goals sheet).
- **Toasts:** one at a time at the bottom, newest replaces; 4 s, 6 s with Undo.
- **Threshold bar:** calm portrait only (no banner, tip, caption, sheet, tool), not during the guide.
- **Sheet open:** the guidance row hides (tips and captions wait; a caption that waits more than 10 s goes to Recent). The alert row stays, one line.
- **Tool active (placing, drawing, demolishing):** the guidance row shows the goal or a caption; tips wait (as now).

### Height budget (the checks a test should hold)

| Screen | Text | Rows under the top bar end by | With a sheet open |
|---|---|---|---|
| 375×667, 390×844 portrait | 100% | 30% | 20% |
| | 150% | 40% | 25% |
| 844×390, 667×375 landscape | 100% | 40% (two rows) | rows stop at the sheet's edge |
| | 125-150% | 40% (**one row**: the alert row if any, else the guidance row) | same |

Estimates from today's row heights: on 375×667 at 100%, top bar 7% + chip 9% + one-row strip 7% ≈ 25%; at 150%, 11% + 8% + a two-line strip 15% ≈ 36%. On 667×375 at 150%, top bar 16% + one row 15% ≈ 33%. The calm city then keeps about 60% of a small phone clear in a raid, against 43% today (12% at 150%).

### Where things sit

Read at the top, tap at the bottom (spec 6.1). The middle third of the map never holds text. The guidance row's words wrap to two lines at most; longer text is cut with "…" and the full words are in the button's name and one tap away (the Goals sheet, the raid sheet, How to play).

## 4. Other mobile improvements, ranked by value for effort

1. **Frame the selected building and the ghost below the real rows** (2.9, 2.10). High value, small: measure `#under-bar`'s bottom in `sheetInsets`, `placingInsets` and `pick`.
2. **Fix the toast width and show one at a time** (2.7). High, tiny: CSS and `MAX_TOASTS` by layout.
3. **Rail ✕ and ✓ hidden while the confirm bar shows** (2.12). Medium, tiny; fixes the clipped ✓ and a duplicate pair.
4. **Corners hide over a tall open tray** (2.12). Medium, small.
5. **Minimap sheet lists alerts first, criticals first** (2.3). Medium, small.
6. **Speed chevron gets its word** (2.12). Small, tiny.
7. **Chip wording "2 months" not "2 m 0 d"** (2.2). Small, tiny.
8. **Top bar at 150% in portrait wraps to two rows** (`raid-375x667-t150.png`, 0-11%). Medium, medium: on phones at 150% drop the four small word labels to icons with the same accessible names, so the numbers fit one row. Saves about 4% of the height.
9. **Score chip** placed in the numbers' flow in landscape, and hidden until the city has people. Small, small.
10. **Check on a real phone** what headless cannot: the notch in landscape (Play corner and rows use `--safe-left`), the home bar under the confirm bar, and Back on Android closing the raid sheet before leaving the game.

Not recommended now: moving Show me and the banner's buttons to the bottom for thumb reach. They sit beside the words they act on, they are occasional taps, and moving them would split each notice in two.

## 5. Proposed rulings

163. On phones (portrait and compact) at most two rows sit under the top bar: one alert row and one guidance row. — Cost if wrong: a player sees the goal less often (a tip, caption or legend takes its place for a while).
164. The guidance row shows one thing, in this order: the overlay legend, a tip, a caption, the goal; the threshold bar only in calm portrait play outside the guide. — Cost if wrong: the goal is out of sight while an overlay is on; the "Town: 83 of 150" reminder shows less.
165. Captions last 4 s (goals, firsts, feats, remarks), 5 s (milestones), 6 s (info); at most two wait; every caption is copied to a Recent list of 10 in the Goals sheet; under a banner only info captions show. — Cost if wrong: some celebrations go straight to the list in a busy moment.
166. The banner ranks active raid, uncovered fire, raid warning, debt, save failing. — Cost if wrong: during a fire the raid countdown is in the badge for a few seconds.
167. On phones the banner is one line (icon, words, View); a raid warning shows as its countdown chip from the start, and its words open the raid sheet (the tribute sheet, with Pay tribute where offered); Shrink and "+N more" leave the phone banner, and the Map badge counts every alert the banner is not showing. Wide screens keep today's banner. — Cost if wrong: tribute is one tap deeper on a phone.
168. While a sheet is open on a phone, the guidance row hides and the alert row stays one line; the camera frames a selected building, the ghost and Show me in the map left free below the measured rows (not 48 px). — Cost if wrong: the goal is out of sight while a sheet is open.
169. On phones one toast shows at a time (the newest replaces the last) and it may use the screen's width up to 420 px. — Cost if wrong: an older Undo toast goes early (Undo still works from the confirm bar and Ctrl+Z).
170. The goals strip is one row on phones: count or label, words, progress, Show me; the words open the Goals sheet; Skip guide moves into the Goals sheet. — Cost if wrong: Skip guide is one tap deeper.
171. Tips on phones close after 20 s of unpaused play (replacing the 15 s rule at 125%+), on Got it, on Esc, or when their condition clears. — Cost if wrong: a slow reader loses a tip mid-read; How to play still lists it.
172. On a landscape phone at 125% or 150% text only one row sits under the top bar: the alert row when there is one, otherwise the guidance row. — Cost if wrong: in a raid the goal is out of sight on large-text landscape phones.
173. The corner buttons hide while the portrait tray is open if they would sit above half the screen; the rail's ✕ and ✓ hide while the confirm bar shows. — Cost if wrong: pausing with a tall tray open needs the tray closed first.
174. The speed chevron gets the word "Speed"; the countdown chip says "2 months" when the days are 0. — Cost if wrong: none.
175. Spec 6.3 and 4.1 are updated to match 163-174 (the "Small phones" paragraph, the rank, the threshold bar), and the height budget in section 3 becomes a test at four sizes and three text sizes. — Cost if wrong: none.

## 6. Implementation tasks

Each task leaves the wide layout as it is. Tests named here pin today's behaviour and will need updating, not deleting.

1. **Mobile budget harness.** Bring the measuring screenshot run into the repo (`tools/shots.ps1 -Mobile`, new scenes in `src/dev/scenes.js`: early, plots, raid, raid+fire, raid+overlay, placing, sheet, welcome) and add `tests/ui/mobileBudget.test.js` holding section 3's budget at 375×667 and 844×390 at 100% and 150%. It fails today; tasks 2-6 make it pass. Files: `tools/shots.ps1`, `src/dev/scenes.js`, a new test.
2. **Toasts and small fixes** (rulings 169, 173, 174). Files: `src/ui/toasts.js`, `css/ui.css` (`#toasts`, `#corners` with the tray, `#rail .bottom`), `src/ui/rail.js`, `src/ui/speed.js`, `src/ui/text.js` (chip countdown). Tests: `tests/ui/toasts.test.js` ("keeps at most two"), `tests/ui/cornerWords.test.js`, `tests/ui/speed.test.js`, `tests/ui/panels.test.js`, `tests/stage3/ui/alertTiers.test.js` (chip words).
3. **Framing below the real rows** (ruling 168, camera part). Files: `src/ui/createUI.js` (`sheetInsets`, `placingInsets`, `pick`, `TOPBAR_PX`), maybe a shared `freeTop` helper moved out of `src/dev/scenes.js`. Tests: `tests/ui/houseSheetWhy.test.js`, `tests/ui/cameraControl.test.js`, `tests/ui/placementFit.test.js`, `tests/stage3/balance/scenes.test.js`.
4. **The phone banner** (rulings 166, 167). Files: `src/ui/alerts.js` (`CRITICAL_RANK`, a phone render), `src/ui/dangerSheets.js` (the raid sheet heading and the first-raid case), `src/ui/danger.js`, `src/ui/corners.js` (badge counts criticals not shown), `src/ui/sheets.js` (minimap sheet: alerts first, criticals first), `src/ui/text.js`, `css/ui.css` (Track D section). Tests: `tests/stage3/ui/alertTiers.test.js` (rank order, "+N more", Shrink, legend icon), `tests/ui/alerts.test.js`, `tests/stage3/ui/dangerSheets.test.js`, `tests/ui/minimap.test.js`, `tests/ui/a11y.test.js`.
5. **The guidance row** (rulings 163-165, 170, 171, and ruling 168's row part). Files: `src/ui/createUI.js` (one controller deciding the row: legend, tip, caption, goal; hide while a sheet is open), `src/ui/goalsList.js` (one-row strip, words as the Goals button, threshold rule, Skip guide into the sheet, Recent list), `src/ui/celebrate.js` (tier times, queue cap, Recent), `src/ui/tips.js` (play-time close, Esc), `src/ui/overlayUi.js` (legend in the row), `src/data/ui.js` (`CHEER_MS`), `src/data/tips.js` (`TIP_AUTO_CLOSE_MS`), `css/ui.css`. Tests: `tests/ui/celebrate.test.js` (times, hold, "above 45%"), `tests/ui/tips.test.js`, `tests/ui/nudge.test.js`, `tests/ui/goalsList.test.js`, `tests/ui/goalsV2.test.js`, `tests/ui/guide.test.js` (Skip guide in the strip), `tests/stage3/score/earlyGame.test.js` (threshold steps aside), `tests/ui/overlaysStage2.test.js` and `tests/ui/overlayUi.test.js` (legend icon), `tests/ui/welcomeBack.test.js`.
6. **Landscape and large text** (ruling 172, plus section 4 items 8 and 9). Files: `css/ui.css` (compact rules, `#under-bar` right edge beside a sheet, top bar labels at 150%), `src/ui/hud.js`, `src/ui/scoreUi.js` (chip placement). Tests: `tests/ui/hud.test.js`, `tests/stage3/score/scoreUi.test.js`, `tests/ui/overlaysStage2.test.js` (landscape legend), `tests/ui/layout.test.js`.
7. **Spec and screenshots** (ruling 175). Update spec 6.3 ("Alerts", "Small phones", the rank), 4.1 (threshold bar on phones) and 6.4 if the raid sheet is a new sheet kind; retake the busy scenes at four sizes for before and after. Files: `docs/superpowers/specs/2026-10-09-thebes-design.md`, `docs/superpowers/notes/screenshots/`.

Order: 1, then 2 and 3 (small, independent), then 4, then 5 (the largest, and it depends on 4's banner height), then 6 and 7.
