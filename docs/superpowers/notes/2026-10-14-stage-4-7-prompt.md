# Stage 4.7 prompt (paste into a new Claude Code session)

Build Stage 4.7 of my personal game Thebes at C:\dev\thebes: "land and logistics". Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The plan: docs/superpowers/plans/2026-10-14-thebes-stage-4-7-land-and-logistics.md. It holds what I asked for, my choices, the rules, the UX rules, world version 8, Tasks 0-8 and the proposed rulings 461-473.

Before anything else, clean up the old worktrees (I asked for this): for each worktree under C:\dev other than C:\dev\thebes (thebes-s3-*, thebes-s4-*, thebes-s46-*), remove it with `git worktree remove` only if `git status --short` there is empty (ignore untracked screenshot files under docs/superpowers/notes/screenshots/raw/ by removing with --force only in that case) and its HEAD is an ancestor of main (`git merge-base --is-ancestor`). Keep the branches. List any you skipped and why. Then `git worktree prune`.

Then follow the plan's process (lean, like Stage 4.5):
- Branch `stage-4-7` from main. Tasks run one after another on that branch, no worktrees.
- Task 0 (the contract) on an Opus implementer. Task 7 (late game) on an Opus implementer. Every other task on a Sonnet implementer.
- Per task: the implementer, then a Sonnet reviewer with the diff, the task section, the rules and the UX rules. At most two fix rounds; Opus only for a second round that did not converge.
- Then the balance pass (Task 8, Sonnet), an Opus whole-branch final review (wait for any helper sub-reviews it starts before acting on its report), one Sonnet fix wave and a Sonnet re-review.
- Do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-14-thebes-stage-4-7/progress.md, and rule on what is left.
- Screenshots only for visual tasks, at 390x844 and 1280x800, under Gentle and Full. Look at two or three yourself per checkpoint.

Stop and talk to me at these points only:
- after Task 1, only if the diagnostic shows a generator gap you cannot fix inside the plan's guarantee;
- after Task 3, with small shots: Small, Normal and Large new maps showing the grass band, an oasis, hills with their rocky skirt; plus Task 1's numbers (nearest clay, mine and farm fits per size and layout);
- if my weekly usage passes 85% (check with the usage tool at each task and checkpoint);
- before any push (a push to main deploys the live site).

Otherwise don't ask me questions. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling with its cost if wrong.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. Write a guard script in your scratchpad (not the repo) that checks the local email, runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out), greps the staged diff the same way, and fails if .superpowers/ is staged. Every agent runs it before every commit and it must print GUARD OK.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 180`) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine.
- No agent may block on an unbounded wait: every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit; agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang; four suites at once just look slow. Optionally run a watchdog that kills shot scripts over 6 minutes and wait loops over 10.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note, rulings Part 14, and the "Version 4.7" What's new entry (with its build), and set VERSION to 4.7.
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed, the rulings you made, what is left for me, and a very short change log I can paste to friends with the live link.
