# Version 9.0 prompt (paste into a new Claude Code session running Opus 5.5)

Build Version 9.0 "Dynasty" of my personal game Thebes at C:\dev\thebes. It is the third of the four v9 releases (8.3, 8.4, 9.0, 9.1). It also carries a second theme I asked for during 8.4: **improve the game's animations and visual effects**. Use a multi-agent approach: run wave 1's tracks in parallel (parallel subagents), with Opus and Sonnet agents as the plan says, so my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory notes for Thebes (one says 9.0 also improves animations and visual effects).
2. The roadmap: docs/superpowers/specs/2026-10-27-thebes-v9-roadmap-design.md, section 4 ("9.0 Dynasty") and section 1 (the rules). Section 5 (9.1 "Weekly decree") only for what 9.1 will need from 9.0.
3. The 8.4 follow-ups: docs/superpowers/notes/2026-10-28-version-8-4-followups.md.
4. As a model of form only: the 8.4 design and plan (docs/superpowers/specs/2026-10-28-thebes-version-8-4-gold-and-war-design.md, docs/superpowers/plans/2026-10-28-thebes-version-8-4-gold-and-war.md). Read their headings and one track; don't reread 8.4's content.

Before you start, check that main is at 8.4 (APP_VERSION '8.4', at or after the "Version 8.4 Gold and war" merge) with a clean working tree. If not, stop and tell me.

## Phase A: the design and the plan (one stop for me)

Write both, on branch `version-9-0`:
- **The design:** docs/superpowers/specs/<date>-thebes-version-9-0-dynasty-design.md, in the 8.4 design's shape. Cover:
  - Dynasty, as the roadmap's section 4 says: Pass the throne, the title earned from the reign, the heir's trait, the ruler list (kept for good, exported, the install-to-home-screen ask) and rivals via links;
  - **animations and visual effects:** first audit what moves on screen today (src/render: walkers, carts, boats, raiders, soldiers, construction, fire, the river and weather, festivals, the beaten-raid moment, UI transitions) and what it costs per frame. Then propose the improvements that make the city feel most alive for the least cost: for example construction stages, smoother walker and unit motion, battle hits and arrows, smoke, dust, water and weather, festival and Victory effects, and panel transitions. Each improvement must name its frame-budget cost on a phone, respect reduced motion, and keep the art's look.

  Read the code each part touches before you write it, so every number and rule fits what is there. The roadmap's numbers are where to start, not settled.
- **The open questions:** every choice the roadmap leaves open, each with your recommended answer and one line on why. Examples: each title's exact rule and the trait's size, what the ruler list keeps and how the replay works, what a rival link carries, the world-version bump. For animations: the scope (which effects, ranked by impact for cost), the frame budget on a mid phone, and whether a Settings switch for effects is needed beyond reduced motion.
- **The balance targets.** A trait must help without deciding the game: turn that into numbers a balance run can check. Examples: each trait's effect on the capital run, the great-work run's win day with each trait staying within a stated window of today's, and no trait making a raid run lose. Frame-budget targets for the effects: the stress city's frame time on the s4 and v70 budgets, before and after.
- **The plan:** docs/superpowers/plans/<date>-thebes-version-9-0-dynasty.md, in the 8.4 plan's shape: the waves and file ownership, each track's model and ruling range (start at 1560; rulings go in Part 27), the rules and the UX rules, the proposed rulings.

  My starting split, which you may change if the code argues for it:
  - **Track D, dynasty (Opus):** Pass the throne, the titles and traits, the sealed score.
  - **Track L, the ruler list and rivals (Sonnet):** the list, its replay, the export, the install ask, rival links and the side-by-side.
  - **Track V, animations and visual effects (Opus):** the audit's chosen effects, within the frame budget.

  Put the shared pieces in wave 0: the world fields and save defaults, the records shape, the text.js sections. Merge order: D → L → V.

Then stop once and show me the open questions with your recommendations, the balance and frame targets and the track split, short enough to read on a phone. When I answer, record the answers in the design, commit the design, the plan and this prompt file, and carry on.

## Phase B: the build

As 8.4 did:
- **Wave 0** yourself on `version-9-0`; **wave 1** in sibling worktrees `C:\dev\thebes-v90-<track>`, merged in order. Regenerate sw-files.js on conflict; keep every side of text.js end sections; pass merge messages with `git merge -F <file>` (`-F -` fails here).
- **Models:** Opus for the Opus tracks, hard merges, the balance check and the final review; Sonnet for the Sonnet tracks, every reviewer, the fix wave, the re-review and the docs. Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer. At most two fix rounds.
- **Tests:** one full suite on the machine at a time, through a scratch suite wrapper with a lock (timeout 7600, -WaitSeconds 3600: the suite takes 30-60 minutes here). Tracks iterate with `-Grep "v90 <track>"`. Never loop full-suite reruns; a test that fails in the full run but passes alone is reported, not rerun.
- **Long commands:** every agent runs grep batches, full suites and screenshots with run_in_background and waits for the notification. A silent foreground command over 600 s kills the agent's stream. Put this in every brief.
- **Keep the machine awake** (request_keep_awake, session_idle) before the first long run: suites died overnight in 8.4 when the PC slept.
- **Wave 2:** the balance check (traits, and the frame budget before and after), an Opus whole-branch final review with the usability pass, one Sonnet fix wave split by file ownership, a Sonnet re-review, the docs.
- **The ledger:** don't read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/<date>-thebes-version-9-0/progress.md, and rule on what is left.
- **Screenshots** for every track at the UX-rule sizes; look at two or three yourself per track:
  - D: Pass the throne with the title it will give, and a new city's first screen with the trait;
  - L: the ruler list on a phone, a replay, a rival's link opened, and the side-by-side at the end;
  - V: before and after of each effect, and a short frame-time table on the stress city.
- **Agent briefs:** the shared rules once in a scratch file; every brief points at it; reports under 300 words.

**The lesson.** Every new rule, button or cost is checked against the lesson: the lesson lock leaves only the step's own category live, so anything that can leave a step waiting with no way on is a bug (ruling 1453). A trait must not change what a lesson step needs or move the lesson's staged raid; Pass the throne must not appear during the lesson; effects must never hide a lesson pointer. Test each.

Don't stop to check in with me after Phase A: carry on to the end. I may drop in with asks; fold them in as tracks or tasks.
- Accept the plan's rulings unless the code shows one is wrong. Record any change as a new ruling in the track's range, with its cost if wrong.
- Check my usage after each wave and give the weekly figures in your progress lines. If the all-models weekly passes 99%, stop at a clean commit and tell me.

Rules that never bend:
- `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com, in the branch and in every worktree.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. A guard script in your scratchpad (not the repo) checks the local email, runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out), greps the staged diff the same way, and fails if .superpowers/ is staged. It takes the worktree path as an argument and must print GUARD OK before every commit. Before any push, also grep the unpushed commits' messages and diffs.
- Keep my friend's name out of the repo. Playtest notes say "a friend".
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more before the final suite, as `Set-Location <worktree>; & ./tools/sw-files.ps1` in the PowerShell tool (the `-ExecutionPolicy Bypass` form is refused).
- The full suite prints ALL PASSED before every commit (a docs-only Phase A commit needs only the guard; a frame-budget test that fails only under load and passes alone counts as passed, reported).
- Stage files by path; never commit .superpowers/.
- No `python -` or `python3 -` with a heredoc; no source files written through a shell heredoc, echo or sed. Use the edit tools.
- No unbounded waits: every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Agents stop any server or Edge they start. Check for CPU-heavy strays before assuming a hang.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README; a new follow-ups note (with my real-phone checks); rulings Part 27; the "9.0 Dynasty" What's new entry (set 8.4's build to its last commit on main before 9.0's merge); APP_VERSION 9.0.
- Remove the merged, clean worktrees (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with: the outcome in plain words; the balance and frame numbers before and after, against the targets; screenshots of what changed (phone and desktop); the rulings you made; what is left for me; short high-level patch notes I can paste to friends, with the live link (https://joshuahedge.github.io/thebes/).
