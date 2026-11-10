# Thebes 9.2 "A city you can read" (plan)

Drafted 8 Nov 2026 on branch `version-9-2`, cut from main at 4d5fa77 (9.1 "First hours", `APP_VERSION` '9.1', plus the two design reviews). The name assumes the design's Q1; if Josh answers otherwise the controller renames the branch, the test folder and the rulings files, and nothing else changes.

**Design (authority, read it first):** `docs/superpowers/specs/2026-11-08-thebes-version-9-2-design.md`, with Josh's answers at its top. Also read:
- the two reviews it acts on: `notes/2026-11-08-design-review.md` and `notes/2026-11-08-design-review-deep.md` (only the sections your track's findings cite);
- this plan;
- the rulings in `notes/handoff-2026-10-11/rulings-so-far.md`. Append this release as **Part 29** (9.1 is Part 28, ending at 1740).

**Out of scope:** the weekly decree (now 9.3): the weekly seed, the decrees, the second save slot. No new building kinds, goods or effects. No reduced motion, no colour-blind work, no bundle.

## What Josh asked for

1. One release that acts on every finding of the two reviews of 8 Nov 2026 (2.1 to 2.12, D1 to D15, and their visual, interface, words, accessibility and balance notes), before the decree.
2. Multi-agent as 9.0 and 9.1 did, within his weekly token limit: Opus for the contract, the hard tracks, the merges and the final review; Sonnet for the rest.
3. Clean and simple on mobile and desktop (his standing requirement), graded in the final review.

## Process

- **Branch and worktrees:** `version-9-2`. Tracks run in sibling worktrees `C:\dev\thebes-v92-<track>` (lower-case letter), cut from the branch after wave 0 (wave 1) or after wave 1's merges (wave 2). The controller merges them back with `git merge -F <file>`.
- **Models (Josh, 8 Nov 2026, with 21% of the week left: "use sonnet where appropriate"):** Sonnet for wave 0 (briefed by the controller), every track (L and Q included), the balance check, every reviewer, the fix wave, the re-review and the docs. Opus for the final review and any merge Sonnet cannot settle, and as the escalation if a Sonnet fix round fails twice. One review round per track unless the reviewer finds a blocker. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer told to check every new sentence against what the sim does. At most two fix rounds; minor findings go into the track's next commit.
- **The controller** reads reports, not diffs. Its ledger is `.superpowers/sdd/2026-11-08-thebes-version-9-2/progress.md`; its shared rules for agents are the scratch `rules92.md` (every brief points at it; reports under 300 words). It looks at two or three screenshots per track and checks the weekly usage after each wave.
- **One full suite on the machine at a time** through the scratch suite wrapper (a lock file; `timeout 7600`, `-WaitSeconds 3600`). Tracks iterate with `-Grep "v92 <track>"`.

### Waves

| Wave | Work | Depends on |
|---|---|---|
| 0 | A Sonnet agent briefed by the controller: the seams below. One commit. | main |
| 1 | L: the lesson and the first hours · Q: a quiet city · S: a fair score (all Sonnet), in parallel | wave 0 |
| — | Merge L → Q → S; the balance check (Sonnet) | wave 1 |
| 2 | D: the dynasty's moment (Sonnet) · A: reachable for everyone (Sonnet) · W: words (Sonnet), in parallel; W sweeps D's and A's new strings after they merge | wave 1 merged |
| — | Merge D → A → W | wave 2 |
| 3 | V: the look (Sonnet), if the weekly limit allows (Q10) | wave 2 merged |
| 4 | Final review (Opus, usability graded at 390x844 and 1280x800) → one fix wave split by file ownership (Sonnet) → re-review (Sonnet) → docs (Sonnet) → merge to main, suite on main | wave 3 or 2 |

### Wave 0 (the controller, on `version-9-2`; rulings 1750-1754)

Only what two tracks would otherwise fight over. No behaviour change: the full suite passes as on 9.1.
1. **Tests:** `tests/v92/all.js` and `tests/v92/{w0,l,q,s,d,a,w,v,balance,fix,docs}/all.js`, each imported once; `tests/all.js` imports `./v92/all.js` after `./v91/all.js`.
2. **The rigs:**
   - `tests/v92/helpers/capital6.js`: the six-year Capital (`capitalRun(72, { dangers: true })`), built once per suite run and handed out as a packed save and as a world, so Q, A and the final review open the same city;
   - `tests/v92/helpers/keys.js`: a keyboard rig that sends Tab, Shift+Tab, Enter, Space and Esc to the page and reads the focused element, for A and the final review.
3. **The alerts' roll-up shape:** every alert carries `ids` (one id today) and `count` (1 today); `rollUpAlerts(list)` in `src/sim/alerts.js` returns the list as is; the View that steps through a row's `ids` (today the fire row's `step`) is a shared function in `src/ui/alerts.js`. Q fills the roll-up.
4. **The court's one gate:** `src/sim/letters.js` with `letterMayCome(world, kind)` returning true and `noteLetter(world, kind)` doing nothing, called by the four schedulers (city events, demands, court requests, court cards) where each draws its next letter. Q fills them, on an optional world field.
5. **Score v3's slot:** a medals entry for version 3 (v2's numbers for now) and the share link reading a `t3` score; `SCORE_VERSION` stays 2 until S flips it, so wave 0 changes no best's label.
6. **`src/ui/text.js`:** seven empty sections appended in merge order, headed `// Version 9.2, Track L`, `Q`, `S`, `D`, `A`, `W`, `V`.
7. **`rules92.md`** in the controller's scratch, and the baseline: the 9.1 suite's frame and balance figures copied into the ledger as "before".

No world-version bump (WORLD_VERSION stays 12): every new world field is optional (absent means today's behaviour).

### File ownership (who may edit what)

| Files | Owner |
|---|---|
| **The lesson:** `src/sim/lesson.js`, `src/data/lesson.js`, `src/ui/lesson.js`, `src/ui/lessonCard.js` (Esc too), `src/ui/v60/lesson.js`, `src/ui/v81/lessonLock.js`, the lesson text files; `boot.js` `adoptLesson`, `handOver` and the end card. **The road:** `placement.js` road preview branch and `roadDoneText`; the lone-road predicate (`src/sim/` new module) and its badge's draw call in `overlays.js`. **Labour:** `src/data/labour.js`, `src/sim/labour.js`, the understaffed alert's words. **Tips:** `src/data/tips.js` entries and the tips' hold. **Feats:** `src/data/feats.js` `swift_town` and its copy | L |
| **Alerts:** `src/sim/alerts.js`, `src/ui/alerts.js` (except the live region), the alert list in `src/ui/sheets.js`, `src/render/markers.js` (zoom rules, rings). **Letters:** `src/sim/letters.js`, the four schedulers' gate calls (`cityEvents.js`, `demands.js`, `court.js`). **The wide layout:** `goalsList.js`, the side panel's markup and CSS. **Screenshot mode's entries** (`menu.js` menu list, `scoreUi.js` two entries) and Options' sections (`menu.js` Options only). **Debt:** `src/ui/v91/debtSheet.js`. **Toasts:** `createUI.js` `createToasts`. **Tray:** `src/ui/tray.js`. **New city's note:** the menu's New city path | Q |
| **Score:** `src/data/scoring.js`, `src/sim/score.js`, `src/ui/v81/bText.js`, the share link's score format, the best's label. **Data:** `src/data/housing.js` (Villa), `src/data/goals.js` and `src/sim/goals.js` (the luxury goal only), `src/data/monuments.js`, `src/data/dynasty.js` `TRAITS` and the bars, `src/sim/dynasty.js` (the two weaknesses), `src/data/difficulty.js` (comments) and the difficulty words, `src/data/health.js`. **The monument caption** (a UI counter). `tests/v92/s/*` | S |
| **Dynasty:** `src/ui/**/passSheet.js`, the new sealed-ruler card, `dynastyUi.js`, the Rulers sheet, `boot.js` `startHeir`, `noteFirstPass` and the Pass notice, the heir card's default layout and guide; `scoreUi.js` `bestLine` and the title's record line; the cartouche CSS | D |
| **Access:** the hiding rules in `css/ui.css` and their markup, `settings.js` text steps (200%), `menu.js` the confirm dialog only, `sheets.js` focus and inert only, `index.html` meta tags, `src/ui/v81/noZoom.js`, `createUI.js` screenshot mode's exit, `src/ui/theme.js` tokens and `TEXT_PAIRS`, `minimap.js` role and keys, the alerts' live region (`src/ui/alerts.js`, that function only), the rail's labels, `tests/ui/mobileBudget.test.js` | A |
| **Words:** every older player string in `src/ui/text.js` and the per-version text files, edited in place; How to play; `src/ui/s46/whatsNew.js` (the hash); older `releases.js` entries' words. Not the numbers' sources | W |
| **The look:** `src/render/terrainRoads.js`, `src/render/unbuilt.js`, `src/render/fire.js` `drawScorch`, the health layer's draw, `statIcons.js` `scoreIcon`, `cameraControl.js` (a frame-the-city function) and the minimap button's double tap | V |
| `src/ui/text.js` new strings | each track only under its own wave-0 header; an older line is reassigned from the track's section (W edits older lines in place) |
| `src/sim/world.js`, `src/save/*`, `src/render/loop.js`, `index.html` outside A's meta tags | wave 0 only; a track that needs more asks the controller |
| The balance runs' pins (`tests/stage4/balance`, `tests/stage47`, `tests/v60`, `tests/v70`, `tests/v50/grand`, `tests/v84/balance`, `tests/v90/balance`, `tests/v91`), the lesson's day pins and every frame-budget bound | the balance check after wave 1. A track reports what it moved, marked `// WAVE2-PIN 9.2 Track <X> (ruling N): was <old>` |
| `src/data/releases.js` (the new entry), `APP_VERSION`, README, rulings Part 29, the roadmap table | the docs step only |

**Where two tracks share a file,** they edit different functions: `boot.js` (L `adoptLesson` and the end card; D `startHeir` and the heir's toasts), `menu.js` (Q the menu list and Options; A the confirm dialog), `sheets.js` (Q the alert list; A focus), `src/ui/alerts.js` (Q; A the live region), `createUI.js` (Q toasts; A screenshot exit), `scoreUi.js` (Q screenshot entries; D `bestLine`), `overlays.js` (L the lone road; V the health layer). On a conflict keep both sides; regenerate `sw-files.js`.

## Rules for every track

- **Commit identity:** `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com` in every worktree; every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the controller's guard prints GUARD OK before every commit. Josh's friend is "a friend".
- **sw-files.js:** after editing `src/`, `css/`, `index.html` or `assets/`, in the PowerShell tool: `Set-Location <worktree>; & ./tools/sw-files.ps1`. Never hand-edit it.
- **Long commands:** every grep batch, full suite and screenshot runs with `run_in_background` and waits for the notification. A silent foreground command over 600 s kills the agent's stream.
- **Tests:** the full suite through the wrapper before every commit, ending ALL PASSED (a frame-budget test that fails only under load and passes alone counts as passed, reported). Iterate with `-Grep "v92 <track>"`. Never loop full-suite reruns. New tests in `tests/v92/<track>/`, describe names starting `v92 <track>`. Never delete an older test; update it and say which.
- **Balance pins:** a track that moves a pin it does not own marks it WAVE2-PIN and reports; never retune the game to hold a pin. Frame bounds are never loosened by a track.
- **Git hygiene:** stage by path; never stage `.superpowers/`; never push; no `python -` with a heredoc; no source files through a shell heredoc, echo or sed.
- **No unbounded waits:** screenshots under `timeout 150`; stop any server or Edge you start; look for CPU-heavy strays before assuming a hang.
- **Words match the sim:** every number on screen comes from the sim or the data, with a test that sets the world up both ways. "Pharaoh" in no game text (ruling 379).
- **The sim stays deterministic:** no `Math.random`, `Date` or `performance.now` in `src/sim`.
- **Old saves load:** an 8.4, 9.0 or 9.1 save, with or without a lesson city, opens as it was; a v2 best keeps its label.
- **The lesson:** every new rule, button or cost is checked against it. Nothing may leave a step waiting with no way on; the labour order must not stall a step; the roll-up keeps the lesson's one-row banner; the end card never opens over a picture card. Each has a test.
- **Ruling numbers** from the track's range, written to `docs/superpowers/notes/2026-11-08-version-9-2-rulings-<track>.md`, one line each with its cost if wrong.

### UX rules (every UI change; reviewers check each)

- **Layout:** one panel at a time; nothing over the middle of the map. The sealed-ruler card and the lesson's end card are sheets at the screen's edge.
- **Sizes:** `mobileBudget` passes at 375x667 and 390x844 at 100/125/150% (and 200% once A adds it).
- **Controls:** 44x44 tap targets with accessible names; Tab, Enter or Space, Esc closes; focus returns to the opener.
- **Not colour alone:** every new state carries a word, a number or a shape.
- **Reasons and consequences:** every choice says what it does before the tap ("Keep building this city" says the lesson city becomes yours; "Start my own city" says what happens to it); every refusal says why and what to do.
- **Noise:** what the player just did is never news; what needs a decision is never hidden.
- **Motion:** no new effects; nothing flashes fast or shakes.
- **Screenshots:** every changed screen at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, before review and after the fix wave, named `v92-<track>-<what>-<WxH>-t<text>.png` in `docs/superpowers/notes/screenshots/raw/v92/` (gitignored). The controller looks at:
  - L: the raid step with a raider in frame; the end card; a refused stray road;
  - Q: the six-year Capital's alert list and badge, before and after; the desktop top left with a warning up, before and after;
  - S: the City summary of a new village and of the scripted Town, before and after; the Pass sheet with the new titles;
  - D: the sealed-ruler card; the heir's first screen; the Rulers list on a phone;
  - A: the Layers legend at 150% with words; a sheet opened by keyboard with focus visible;
  - W: What's new without the hash; the lesson's leave confirm;
  - V: each change before and after.
- **Playing it:** `?skipTitle=1&nosw=1`, `window.__thebes` (world, cam, devScene), JS pointer events on the canvas for drags, and the six-year Capital saved through `packSave` and `createSaveStore().save()`.

## Tracks

### Track L: the lesson and the first hours (Sonnet; rulings 1755-1774)
Design section 2: the raid in frame and the fire held (2.1); the month step from its entry and nine plots (2.2); the stray road in the lesson and the lone road everywhere (2.3); the end card on both paths and the lesson types' tips marked seen (2.4); one instruction per row (2.7); the labour order before Town and the cause line (D1); workers in chapter 2 and the tips' wait (first review section 5); Swift Town (D15). Esc on the lesson card means Leave (D11, in L's file). Tests: T1 to T4, the labour cases, every lesson step reached, the lesson's day pins re-measured (WAVE2-PIN).

### Track Q: a quiet city (Sonnet; rulings 1775-1794)
Design section 3: roll-up by cause, advice first, the badge counts rows (D2, 2.6); markers at a distance; one court gate (D5); the wide layout's panel (2.5); Screenshot mode to Options (2.8); the debt sheet's levers (D14); toasts that never stack; the interface tidies (first review section 4). Tests: T5 to T7, the court and event pins (WAVE2-PIN), old saves' letters.

### Track S: a fair score (Sonnet; rulings 1795-1814)
Design section 4: score v3 (D3), the Villa and the luxury goal (D6), the middle monuments and their caption (D7), the titles and traits (D8), Peaceful and Relaxed (D9), the health term and the comments (D15). S flips `SCORE_VERSION` to 3. Tests: T8, T12, a v2 best's label, the share link's t2 and t3. S reports every pin it moves; the balance check (Sonnet, after the wave-1 merges) re-pins them all, runs the heirs with the adaptive scripts (T9) and measures the medal thresholds on the scripted Village, Town, Market town and Capital, with a table in the rulings note.

### Track D: the dynasty's moment (Sonnet; rulings 1815-1824)
Design section 5: the sealed-ruler card, the heir's caption as Ipi's line, no install toast in the first month, the Rulers row and one install ask (D4); the heir's city without the guide and on the sealed layout (D13); the title's record line (2.9); long headings, measured first (D12); the cartouche reused (deep section 4).

### Track A: reachable for everyone (Sonnet; rulings 1825-1834)
Design section 6: words at large text (D10); focus, `#dialog`'s z-index, pinch zoom, the 200% step, screenshot mode's exit, the color-scheme meta (D11); the rail's words (2.10); the audit's list (deep section 6); the first load's check (2.12). Tests: T10, T11.

### Track W: words (Sonnet; rulings 1835-1844)
Design section 7, the deep review's section 5 in full. A glossary first (a table in its rulings note), then the sweep; a second pass over D's and A's new strings once they merge. Tests: T13.

### Track V: the look (Sonnet; rulings 1845-1854; cut first)
Design section 8: roads and plots at the far zooms (looked at first), burnt rubble, frame the city, the score icon (2.11), the health layer's marks. Before-and-after screenshots for each.

### Wave 4 (rulings 1855-1869)
The final review (Opus) over the whole branch with the usability pass on a phone (390x844) and a desktop (1280x800) viewport; one Sonnet fix wave split by file ownership; a Sonnet re-review; the docs: the README, a follow-ups note (Josh's real-phone checks carried from 9.1 and added to), rulings Part 29, the What's new entry (9.1's build set to its last commit on main), `APP_VERSION` '9.2', the roadmap's section 6 table (the decree as 9.3).

## Rulings (proposed; append as Part 29)

1750. Wave 0 adds seams only: the roll-up shape, the court's gate, score v3's slot, the text sections, the rigs; the suite passes as on 9.1.
1751. No world-version bump: every new world field is optional and absent means today's behaviour.
1752. `SCORE_VERSION` 3 is flipped by Track S with the formula, not by wave 0, so no best changes label before the score does.
1753. The six-year Capital fixture is built once per suite run from `capitalRun(72, { dangers: true })`.
1754. D13 moves from Track L to Track D: its files are the Pass's (`passSheet.js`, `boot.js` `startHeir`).
1755. (L) The end card replaces both the first run's timed hand-over and the replay's `lessonEnd` sheet; it never opens over a picture card, a sheet or the dialog.
1756. (L) The month step counts from its own entry month, kept on the lesson world (never saved).
1757. (L) The lesson snaps a road start within two tiles of the road's end and refuses one further away; outside the lesson a lone road is laid with an outline, a badge and a toast that says so.
1758. (L) Services rank ahead of safety until Town; from Town, 9.1's order.
1775. (Q) Every alert rolls up by cause; the badge counts rows; the Minimap sheet leads with City advice's top three.
1776. (Q) One gate over the four letter streams: one open at a time, a gap of about 5 to 8 months; each stream's content unchanged.
1777. (Q) On the wide layout the goals strip and the rank bar live in the side panel.
1795. (S) Score v3: a term not started counts nothing and is out of the shown ceiling; `scoreFull` is the sum of every kind; growth runs to the Seat (lifting ruling 659's cap).
1796. (S) The Builder's bar rises instead of a cap at 2 (a cap ties the Builder and the Unconquered and row order picks).
1815. (D) One sealed-ruler card between the Pass sheet and the heir card; nothing is sealed before the heir card's Start.
1816. (D) An heir's city has no beginner's guide; its map defaults to the sealed city's layout.
1825. (A) Pinch zoom allowed; text steps 100/125/150/200%.
1826. (A) Esc on the lesson card means Leave (made in Track L's file).
1835. (W) One name per thing, in the glossary table of W's rulings note.
1845. (V) Track V is cut first if the weekly limit nears 90% before wave 3.
