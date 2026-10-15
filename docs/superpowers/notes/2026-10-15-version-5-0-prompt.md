# Version 5.0 prompt (paste into a new Claude Code session)

Build Version 5.0 of my personal game Thebes at C:\dev\thebes: "know your city". Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The plan: docs/superpowers/plans/2026-10-15-thebes-version-5-0-know-your-city.md. It holds what I asked for, my choices, the rules, the UX rules, Tasks 0-8 with each task's ruling range, and the proposed rulings 501-509.

Follow the plan's process (lean, like Stage 4.7):
- Branch `version-5-0` from main. Tasks run one after another on that branch, no worktrees.
- Task 0 (the contract) and Task 7 (grand homes) on Opus implementers. Every other task on a Sonnet implementer.
- Per task: the implementer, then a Sonnet reviewer with the diff, the task section, the rules and the UX rules. At most two fix rounds; Opus only for a second round that did not converge. Fold a reviewer's minor findings into the next task's first commit.
- Then the balance pass (Task 8, Sonnet), an Opus whole-branch final review (wait for any helper sub-reviews it starts before acting on its report), one Sonnet fix wave and a Sonnet re-review.
- Do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-15-thebes-version-5-0/progress.md, and rule on what is left.
- Screenshots only for visual tasks, at 390x844 and 1280x800, under Gentle and Full. Look at two or three yourself per task.

Don't stop to check in with me: carry on to the end. I may drop in with asks; fold them in as tasks. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling (inside the task's range) with its cost if wrong. Check my weekly usage with the usage tool at each task and tell me the figure in your progress lines.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. Write a guard script in your scratchpad (not the repo) that checks the local email, runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out), greps the staged diff the same way, and fails if .superpowers/ is staged. Every agent runs it before every commit and it must print GUARD OK. Before any push, also grep the unpushed commits' messages and diffs the same way.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600`, about 6 minutes, run alone) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine.
- No agent may block on an unbounded wait: every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit; agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang.
- Write the agents' shared rules once to a scratch file and point every brief at it, to keep briefs short.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note, rulings Part 15, and the "Version 5.0" What's new entry, and set APP_VERSION to 5.0.
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed, the rulings you made, what is left for me, and short high-level patch notes I can paste to friends with the live link.
