# Next release prompt (paste into a new Claude Code session running Opus 5.5)

Build the next release of my personal game Thebes at C:\dev\thebes: the release that acts on the two design reviews of 8 November 2026. It comes before the weekly decree. Use a multi-agent approach as 9.0 and 9.1 did: Opus for the contract, the hard tracks, the merges and the final review; Sonnet for the rest; my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory notes for Thebes.
2. **The two reviews, in full. They are the design source for this release:**
   - docs/superpowers/notes/2026-11-08-design-review.md (the first pass: the lesson, the first hour, the surface; findings 2.1 to 2.12, visual notes in section 3, interface notes in section 4).
   - docs/superpowers/notes/2026-11-08-design-review-deep.md (the deeper pass: findings D1 to D15, what held up in section 3, visual notes in section 4, the words audit in 5, accessibility in 6, balance in 7, and a release plan in 8 that this prompt folds into one release).
3. The 9.1 follow-ups: docs/superpowers/notes/2026-11-07-version-9-1-followups.md (what was left, the real-phone checklist, the profile table).
4. As a model of form only: the 9.1 design and plan (docs/superpowers/specs/2026-11-07-thebes-polish-design.md, docs/superpowers/plans/2026-11-07-thebes-polish.md) and the 9.0 prompt (docs/superpowers/notes/2026-11-07-version-9-0-prompt.md). Read their headings and one track; don't reread their content.

Before you start, check that main is at 9.1 (APP_VERSION '9.1', at or after commit 42b1dce "9.1: What's new says what changed for heirs and goals") with a clean working tree. If not, stop and tell me.

## What this release is

One release that fixes everything both reviews found, grouped so each track owns its files. Nothing new is added to the game except where a review asks for it (the sealed-ruler card, the alerts' roll-up, a luxury goal). The weekly decree waits for the release after this one.

The reviews rank the findings; the ranking stands. Where a review says "check", the track measures first and rules; where it gives a number (a medal threshold, a tax rate, a crew-month count), that number is where to start, not settled: the code and the balance runs decide.

## Phase A: the design and the plan (one stop for me)

Write both, on branch `version-9-2` (the branch name follows Q1 below if I choose another number):
- **The design:** docs/superpowers/specs/<date>-thebes-version-9-2-design.md, in the 9.1 design's shape: a short refund-lens style ranking (what each fix buys, for whom), then one section per track with today, the change, and the proof. Every finding in both reviews appears once, under a track, with its review number (2.x or Dx) so I can tick them off. Read the code each part touches before writing it.
- **The open questions**, each with your recommended answer and one line on why. At least these:
  - **Q1. The version.** Recommended: **9.2 "A city you can read"**, with the weekly decree becoming 9.3 (the roadmap's section 6 table is updated in the docs step). Why: it is a release of the size of 9.1, and a patch number would undersell it; the decree is content for players who stay, and this release is what keeps them.
  - **Q2. Score v3.** Recommended: a term that has not started yet is left out of the total and the ceiling (safety's fire part until Town, defence until the raid clock), medals re-measured on the scripted cities at about 240, 320 and 400 of the parts' total, `PRESTIGE.scoreFull` raised to the sum of every monument kind, the growth term extended to the Seat; a `SCORE_VERSION` bump so old bests keep their "older scoring" label. Why: D3.
  - **Q3. The labour order.** Recommended: services ahead of safety until the city is a Town (fire starts there), rather than moving the firehouse's unlock. Why: D1 without touching the lesson's firehouse step; the lesson's words say why the bazaar stopped.
  - **Q4. The letters.** Recommended: one court stream drawing from events, requests, demands and cards, one letter open at a time, one gap of about 5 to 8 months; the banner and the card are the same letter. Why: D5.
  - **Q5. The lesson's end.** Recommended: an end card with the city's numbers, one line per thing learned, and two buttons, "Keep building this city" and "Start my own city". Why: 2.4.
  - **Q6. The titles.** Recommended: each title's fit capped at 2 so they compete, a lasting cost for the Generous (taxes x0.95) and the Unconquered (every warning 30 days sooner), the Merchant bar 0.40 to about 0.25, then the P8 probe with the adaptive scripts. Why: D8.
  - **Q7. Zoom and text.** Recommended: pinch zoom allowed again (the viewport meta and noZoom.js), and a 200% text step; the mobile budget test extended to it. Why: D11, WCAG 1.4.4.
  - **Q8. The Villa.** Recommended: tax 6 to 7 and a goal at Great city, "Open a route that sells a luxury"; the luxury rate stays. Why: D6; re-pinned by the balance runs.
  - **Q9. Where Screenshot mode lives.** Recommended: Options, under Display, and out of the menu and the City summary. Why: 2.8.
  - **Q10. The visual track.** Recommended: in, but last in the merge order and cut first if the weekly limit nears: roads with wear and a kerb shadow, pegged-out housing plots, charred rubble, markers one per cause at the far zooms, a "frame the city" tap, the score chip's icon, the cartouche headings that wrap. Why: first review section 3, deep review section 4, D12.
- **The targets**, measured by a named check each, in the 9.1 design's table shape. At least:
  - the lesson's raid step has a raider in frame at the arrival, and the tower is lit (screenshot test);
  - a stray first road is refused or snapped, with the reason in the bar (test);
  - the month step waits two months from its own start, entered at month 4 (test);
  - the end card is up at the lesson's end with both buttons, on a device with and without a saved city (test);
  - the six-year Capital reopened (the capital run, 72 months, dangers on, as tests/stage4/balance/capitalRun.js builds it) lists at most twelve alert rows, one per cause, and the badge counts rows (test);
  - a scripted year from Market town has at most one letter open at a time and none within a month of another (test);
  - at 1280x800 with a raid warning, a goal, a rank bar and a tip, at most two rows over the map (screenshot test);
  - a new village scores under Bronze; the scripted Town's score does not fall when fire and defence start counting (test);
  - every heir meets 9.0's T1 to T3 with the adaptive scripts, or the miss is a ruling with both numbers (the balance check);
  - at 150% text on 375x667 and 390x844 the Layers legend, the tip label and the stat labels show words, and the mobile budget holds (test);
  - a keyboard-only pass opens and closes a sheet and the confirm dialog with focus returned to the opener (test);
  - every 9.1 frame bound and balance pin holds or is re-pinned with a ruling; no world-version bump unless a track needs one (then one, shared, in wave 0).
- **The plan:** docs/superpowers/plans/<date>-thebes-version-9-2.md, in the 9.1 plan's shape: waves, file ownership, each track's model and ruling range (start at 1750; rulings go in Part 29), the shared rules, the UX rules, the proposed rulings.

  My starting split, which you may change if the code argues for it:
  - **Wave 0 (Opus, on the branch):** the seams every track needs: the alerts' roll-up shape (an alert kind with a count and a list of ids, and the View that steps), `SCORE_VERSION` 3 and its label, the text.js sections per track, the court stream's one queue, the test rigs (the six-year Capital as a fixture builder, the keyboard pass rig).
  - **Wave 1, three tracks in sibling worktrees:**
    - **Track L, the lesson and the first hours (Opus):** 2.1 (the raid in frame, the fire step's camera), 2.2 (the month step from its own start; nine plots at the homes step), 2.3 (the stray road), 2.4 (the end card; no tips about lesson buildings for the lesson city), 2.7 (one instruction per row), D1 (the labour order and the bazaar's "short of workers" cause line), D13 (after a Pass, the guide starts at the first unmet goal and the map defaults to the sealed layout), D15's feat.
    - **Track Q, a quiet city (Opus):** D2 (roll-up by cause, advice first in the alert list, the badge counts rows, one badge per cause at far zooms), D5 (one court stream), 2.5 (the goals strip and the rank bar into the side panel on the wide layout; "+N more" into the panel), 2.6, 2.8 (Screenshot mode to Options), D14 (the debt sheet names its closed levers), the "Paused while you were away" and install toasts never stacking.
    - **Track S, a fair score (Sonnet, with the balance check):** D3 (score v3), D6 (the Villa and the luxury goal), D7 (small mastaba and colossus crew-months, a monthly caption for an unopened site), D8 (the titles and traits), D9 (Peaceful and Relaxed say what they still include; the stale comments), the `swift_town` day.
  - **Wave 2, three tracks:**
    - **Track D, the dynasty's moment (Sonnet):** D4 (the sealed-ruler card between the Pass sheet and the New city card; the heir's caption as Ipi's line; no install toast in the first month; the Rulers row on one line; one install ask), 2.9 (the title's record line in plain words), D12 (cartouche headings on long titles).
    - **Track A, reachable for everyone (Sonnet):** D10 (words restored at 125% and 150%), D11 (dialog and sheet focus, `#dialog` z-index, pinch zoom and the 200% step, Esc on the lesson card means Leave, screenshot mode's visible exit, the color-scheme meta), 2.10 (labels on the compact rail), the audit's remaining list in the deep review's section 6 (the teal token on parchment-2, the two sub-12 px sizes, TEXT_PAIRS extended, the minimap canvas's role and keys, the dock buttons' aria-label).
    - **Track W, words (Sonnet):** the deep review's section 5 in full: the developer-voice sentences in How to play and What's new rewritten or cut, the build hash out of the What's new headings, one name per thing (guide/lesson/Play, City advice, Home/title, Layers/overlay, Options/Settings, Fetch in old notes, plot/lot/square/tile, rank capitalisation), prestige and seed defined at first sight or replaced, the rows over 90 characters shortened, the leave-the-lesson confirm cut to one honest sentence, the literals single-sourced. Every change is checked against the sim's words-against-the-sim rule.
  - **Wave 3 (if the limit allows; Q10): Track V, the look (Sonnet):** the visual list above, each change with a before-and-after screenshot at the UX-rule sizes.
  - Merge order: L, Q, S, then D, A, W, then V. Track W runs last among wave 2 so it sweeps the other tracks' new strings too.

Then stop once and show me the open questions with your recommendations, the targets and the track split, short enough to read on a phone. When I answer, record the answers in the design, commit the design, the plan and this prompt file, and carry on.

## Phase B: the build

As 9.0 and 9.1 did:
- **Wave 0** yourself on the branch; **the tracks** in sibling worktrees `C:\dev\thebes-v92-<track>`, merged in order. Regenerate sw-files.js on conflict; keep every side of text.js end sections; pass merge messages with `git merge -F <file>` (`-F -` fails here).
- **Models:** Opus for wave 0, Tracks L and Q, hard merges, the balance check and the final review; Sonnet for S, D, A, W, V, every reviewer, the fix wave, the re-review and the docs. Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer told to check every new sentence against what the sim does. At most two fix rounds.
- **Tests:** one full suite on the machine at a time, through a scratch suite wrapper with a lock (timeout 7600, -WaitSeconds 3600: the suite takes 30-60 minutes here). Tracks iterate with `-Grep "v92 <track>"`. Never loop full-suite reruns; a test that fails in the full run but passes alone is reported, not rerun.
- **Long commands:** every agent runs grep batches, full suites and screenshots with run_in_background and waits for the notification. A silent foreground command over 600 s kills the agent's stream. Put this in every brief.
- **Keep the machine awake** (request_keep_awake, session_idle) before the first long run.
- **The balance check** (Track S's partner): every 9.1 pin, the heirs with the adaptive scripts, the Villa and monument changes, the new medal thresholds measured on the scripted Village, Town, Market town and Capital; a table in the rulings note.
- **Wave 4:** an Opus whole-branch final review with the usability pass graded on a phone and a desktop viewport, one Sonnet fix wave split by file ownership, a Sonnet re-review, the docs.
- **The ledger:** don't read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/<date>-thebes-version-9-2/progress.md, and rule on what is left.
- **Screenshots** for every track at the UX-rule sizes (375x667, 390x844, 667x375, 1280x800, 1920x1080, at 100% and 150% text); look at two or three yourself per track:
  - L: the raid step with a raider in frame; the end card; a refused stray road;
  - Q: the six-year Capital's alert list and badge, before and after; the desktop top-left with a warning up, before and after;
  - S: the City summary of a new village and of the scripted Town, before and after; the Pass sheet with a capped title;
  - D: the sealed-ruler card; the heir's first screen; the Rulers list on a phone;
  - A: the Layers legend at 150% with words; a sheet opened by keyboard with focus visible;
  - W: What's new without the hash; the lesson's leave confirm;
  - V: each visual change before and after.
- **Agent briefs:** the shared rules once in a scratch file; every brief points at it; reports under 300 words.

**The lesson.** Every new rule, button or cost is checked against the lesson: the lesson lock leaves only the step's own category live, so anything that can leave a step waiting with no way on is a bug (ruling 1453). The labour-order change must not stall a lesson step; the alerts' roll-up must keep the lesson's one-row banner; the end card must not open over a picture card. Test each.

**Playing it yourself.** The reviews were made by playing in a browser with `window.__thebes` (world, cam, devScene), JS pointer events on the canvas for drags, `?skipTitle=1&nosw=1`, and `import('/tests/stage4/balance/capitalRun.js').runCapital(72, { dangers: true })` saved through `src/save/serialize.js` packSave and `src/save/store.js` createSaveStore().save() for a late city. Use the same for the before-and-after screenshots.

Don't stop to check in with me after Phase A: carry on to the end. I may drop in with asks; fold them in as tracks or tasks.
- Accept the plan's rulings unless the code shows one is wrong. Record any change as a new ruling in the track's range, with its cost if wrong.
- Check my usage after each wave and give the weekly figures in your progress lines. If the all-models weekly passes 99%, stop at a clean commit and tell me. If it nears 90% before wave 3, drop Track V and say so.

Rules that never bend:
- `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com, in the branch and in every worktree.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. A guard script in your scratchpad (not the repo) checks the local email, runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out), greps the staged diff the same way, and fails if .superpowers/ is staged. It takes the worktree path as an argument and must print GUARD OK before every commit. Before any push, also grep the unpushed commits' messages and diffs.
- Keep my friend's name out of the repo. Playtest notes say "a friend".
- "Pharaoh" never appears in game text (ruling 379; the test over every *Text.js stands).
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more before the final suite, as `Set-Location <worktree>; & ./tools/sw-files.ps1` in the PowerShell tool (the `-ExecutionPolicy Bypass` form is refused).
- The full suite prints ALL PASSED before every commit (a docs-only Phase A commit needs only the guard; a frame-budget test that fails only under load and passes alone counts as passed, reported).
- Stage files by path; never commit .superpowers/.
- No `python -` or `python3 -` with a heredoc; no source files written through a shell heredoc, echo or sed. Use the edit tools.
- No unbounded waits: every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Agents stop any server or Edge they start. Check for CPU-heavy strays before assuming a hang.
- Old saves load: an 8.4, 9.0 or 9.1 save, with or without a lesson city, opens as it was; a score v2 best keeps its label.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README; a new follow-ups note (with my real-phone checks, carried from 9.1's and added to); rulings Part 29; the What's new entry for this version (set 9.1's build to its last commit on main before the merge); APP_VERSION; the roadmap's section 6 table if Q1 renumbers the decree.
- Remove the merged, clean worktrees (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with: the outcome in plain words; a table of both reviews' findings (2.1 to 2.12, D1 to D15) with done, changed or left and the ruling for each; the balance and frame numbers before and after, against the targets; screenshots of what changed (phone and desktop); the rulings you made; what is left for me; short high-level patch notes I can paste to friends, with the live link (https://joshuahedge.github.io/thebes/).
