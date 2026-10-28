# Version 8.4 prompt (paste into a new Claude Code session running Opus 5.5)

Build Version 8.4 "Gold and war" of my personal game Thebes at C:\dev\thebes. It is the second of the four v9 releases (8.3, 8.4, 9.0, 9.1). Use a multi-agent approach: run wave 1's tracks in parallel with a Workflow (or parallel subagents), with Opus and Sonnet agents as the plan says, so my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The roadmap: docs/superpowers/specs/2026-10-27-thebes-v9-roadmap-design.md, section 3 ("8.4 Gold and war") and section 1 (the rules). Section 4 says what 9.0 needs from 8.4: the tax rate, and raids that beaten raids can be counted on.
3. The 8.3 follow-ups: docs/superpowers/notes/2026-10-27-version-8-3-followups.md. "What was cut or left" says 8.4 owns balance, including the far-guild pace and the camp.
4. As a model of form only: the 8.3 design and plan (docs/superpowers/specs/2026-10-27-thebes-version-8-3-lines-design.md, docs/superpowers/plans/2026-10-27-thebes-version-8-3-lines.md). Read their headings and one track; don't reread 8.3's content.

Before you start, check that main is at 8.3 or later (APP_VERSION '8.3', at or after 26dfa6d "Home in the game menu") with a clean working tree. If not, stop and tell me.

## Phase A: the design and the plan (one stop for me)

No 8.4 design or plan exists yet. Write both, on branch `version-8-4`:
- **The design:** docs/superpowers/specs/2026-10-28-thebes-version-8-4-gold-and-war-design.md, in the 8.3 design's shape. Cover:
  - gold's jobs: the tax rate, Rush a course and luxury imports;
  - raids: sooner, with the scouts' build-up and the low-Nile lean, and the reward for a beaten raid;
  - war elephants and ivory.
  
  Read the sim code each part touches before you write it, so every number and rule fits what is there. The roadmap's numbers are where to start, not settled.
- **The open questions:** list every choice the roadmap leaves open, each with your recommended answer and one line on why. Examples: the tax rate's effect sizes, how much Rush costs per day saved, which homes want which luxury, what a captured-weapons discount is worth, and whether 8.4 needs a world-version bump (old saves must load as they were).
- **The balance targets.** The roadmap's bar is that late gold is spent, not piled up. Turn that into numbers a balance run can check. Examples: the Stage 4 capital run's gold at the end, the share of gold spent on the new jobs, the day of the first warning, and the great-work run's win day staying within a stated window of 7,021. The far-guild pace and the camp must appear in at least one run.
- **The plan:** docs/superpowers/plans/2026-10-28-thebes-version-8-4-gold-and-war.md, in the 8.3 plan's shape. It holds:
  - the waves and the file ownership;
  - each track's model and ruling range (start at 1460; rulings go in Part 26);
  - the rules and the UX rules;
  - the proposed rulings.

  My starting split, which you may change if the code argues for it:
  - **Track G, gold (Opus):** the tax rate on the palace, Rush a course, luxury imports.
  - **Track R, raids (Sonnet):** the timings, the scouts, the low-Nile lean, captured weapons and the celebration.
  - **Track E, elephants (Opus):** the fifth enemy kind, trampling, panic, the matchups, "War elephants!", and ivory from a fallen elephant.

  Put the shared pieces in wave 0, so tracks don't fight over them: the new goods (ivory and the luxuries), their data entries, and any new world fields with their save defaults. Split the raid files between R and E by file ownership, and say who owns the shared text.js sections. Merge order: G → R → E.

Then stop once and show me the open questions with your recommendations, the balance targets and the track split, short enough to read on a phone. When I answer (for example "all recommended"), record the answers in the design, commit the design and plan, and carry on. Commit this prompt file in the same commit.

## Phase B: the build

Follow the plan's process, as 8.3 did:
- **Wave 0:** you do it yourself, on branch `version-8-4`.
- **Wave 1:** the tracks run in sibling worktrees `C:\dev\thebes-v84-<track>`, cut from the branch after wave 0. Merge them back in the plan's order. Use an Opus integrator only if a merge is not trivial.
  - Regenerate sw-files.js on conflict; never hand-merge it.
  - Resolve text.js end-section conflicts by keeping every side, in merge order.
  - Pass merge messages with `git merge -F <file>`; `-F -` fails here.
- **Models:**
  - Opus (`model: opus`) for the Opus tracks, hard merges, the balance check and the final review. 8.4 is mostly balance, so its balance check is Opus.
  - Sonnet (`model: sonnet`) for the Sonnet tracks, every reviewer, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- **Tests:** only one full suite runs on the machine at a time.
  - Write a suite wrapper in your scratchpad. It takes the worktree path, holds a lock directory, and runs `timeout 4000 powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 1800` from Bash, writing a result file. If an agent's Bash refuses that form, it runs the same runner through the PowerShell tool, still holding the lock.
  - Start full runs in the background.
  - Tracks iterate with `-Grep "v84 <track>"` meanwhile.
  - An agent never loops full-suite reruns. A test that fails in the full run but passes alone is reported to you, not rerun again and again.
- **Wave 2:**
  - the balance check against the design's targets, before and after, with the numbers in its report;
  - an Opus whole-branch final review with the usability pass (wait for any helper sub-reviews it starts before acting on its report);
  - one Sonnet fix wave split by file ownership;
  - a Sonnet re-review;
  - the docs.
- **The ledger:** do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-28-thebes-version-8-4/progress.md, and rule on what is left.
- **Screenshots** for every track, at the sizes the UX rules list. Look at two or three yourself per track:
  - G: the palace's tax rate, a monument site's Rush with its price, and a Villa's luxury need, phone and desktop;
  - R: the scouts on the horizon before a warning, and the beaten-raid moment;
  - E: a band with elephants at a wall, and the raid sheet's "what helps" lines for it.
- **Agent briefs:** write the agents' shared rules once to a scratch file and point every brief at it. Ask every agent for a short report (under 300 words).

**The lesson.** Every new rule, button or cost must be checked against the lesson: the lesson lock leaves only the step's own category live, so anything that can leave a step waiting with no way on is a bug. In 8.3 a farm placed off the road did this (ruling 1453). The lesson has a real raid: a Normal city whose tower step stages the raid clock (src/sim/lesson.js, src/data/lesson.js). 8.4's new timings must not move that staged raid. The lesson's raid must bring no elephants and no scouts' delay. Its words must still match what comes. Test all three. The tax rate must not change what a lesson step needs.

Don't stop to check in with me after Phase A: carry on to the end. I may drop in with asks; fold them in as tracks or tasks.
- Accept the plan's rulings unless the code shows one is wrong. Record any change as a new ruling inside the track's range, with its cost if wrong.
- Check my usage with the usage tool after each wave, and give the weekly figures in your progress lines.
- If the all-models weekly passes 99%, stop at a clean commit and tell me.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com, in the branch and in every worktree.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. Write a guard script in your scratchpad (not the repo) that does four things:
  - checks the local email;
  - runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out);
  - greps the staged diff the same way;
  - fails if .superpowers/ is staged.

  It must work from any worktree (take the worktree path as an argument). Every agent runs it before every commit, and it must print GUARD OK. Before any push, also grep the unpushed commits' messages and diffs the same way.
- Keep my friend's name out of the repo too. Playtest notes say "a friend".
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite, including in each track's last commit.
  - Run it in the PowerShell tool as `Set-Location <worktree>; & ./tools/sw-files.ps1`. The `-ExecutionPolicy Bypass` form of this command is refused.
- The full suite prints ALL PASSED before every commit. A docs-only commit in Phase A is the one exception: it touches no src/, css/, tests/ or assets/, so it needs only the guard.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine. No agent may write source files through a shell heredoc, echo or sed (it strips `${...}` from JS template literals); use the edit tools.
- No agent may block on an unbounded wait. Every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit. Agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang. Stop any stray headless Edge before removing a worktree, or Windows holds its folder.

When you're done:
- Merge to main locally and run the full suite on main.
- Update:
  - the README;
  - a new follow-ups note, docs/superpowers/notes/2026-10-28-version-8-4-followups.md (with my real-phone checks);
  - rulings Part 26;
  - the "8.4 Gold and war" What's new entry (set 8.3's build to its last commit on main before 8.4's merge);
  - APP_VERSION, set to 8.4.
- List the worktrees you made and remove the merged, clean ones (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with:
  - the outcome in plain words;
  - the balance numbers before and after, against the targets;
  - screenshots of what changed (phone and desktop);
  - the rulings you made;
  - what is left for me;
  - short high-level patch notes I can paste to friends, with the live link (https://joshuahedge.github.io/thebes/).
