# Version 6.0 prompt (paste into a new Claude Code session running Opus 5.5)

Build Version 6.0 of my personal game Thebes at C:\dev\thebes: "a harder Nile". Use a multi-agent approach: run each wave's tracks in parallel with a Workflow (or parallel subagents), with Fable and Sonnet agents as the plan says, so my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The plan: docs/superpowers/plans/2026-10-22-thebes-version-6-0-a-harder-nile.md. It holds what I asked for, what is out of scope, the waves and tracks with each track's model and ruling range, the rules, the UX rules and the proposed rulings 610-619.

Follow the plan's process:
- Branch `version-6-0` from main. Track 0 (the contract, Fable) runs on the branch. Then each wave's tracks run in sibling worktrees `C:\dev\thebes-v60-<track>` cut from the branch, at most three at once; you merge them back between waves (a Fable integrator only if a merge is not trivial; regenerate sw-files.js on conflict, never hand-merge it).
- Models: Fable (`model: fable`) for Track 0, Track A, hard merges and the final review. Sonnet (`model: sonnet`) for every other implementer, every reviewer, the balance pass, the fix wave and the re-review. Opus only if a Sonnet fix round fails twice.
- Per track: the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- Only one full test suite runs on the machine at a time: give tracks a suite slot in turn, and have them iterate with `-Grep "v60 <track>"` meanwhile.
- Wave 4: the balance pass, a Fable whole-branch final review (wait for any helper sub-reviews it starts before acting on its report), one Sonnet fix wave and a Sonnet re-review.
- Do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-22-thebes-version-6-0/progress.md, and rule on what is left.
- Screenshots only for visual tracks (B2, C, D1, D2 and the sheets in A and B1), at 390x844 and 1280x800 (and 1920x1080 for D1), under Gentle and Full. Look at two or three yourself per track.
- Write the agents' shared rules once to a scratch file and point every brief at it, to keep briefs short. Ask every agent for a short report (under 300 words).

Don't stop to check in with me: carry on to the end. I may drop in with asks; fold them in as tracks or tasks. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling (inside the track's range) with its cost if wrong. Check my usage with the usage tool after each wave and give the weekly figures in your progress lines; if the all-models weekly passes 90%, stop at a clean commit and tell me.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com, in the branch and in every worktree.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. Write a guard script in your scratchpad (not the repo) that checks the local email, runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out), greps the staged diff the same way, and fails if .superpowers/ is staged; it must work from any worktree (take the worktree path as an argument). Every agent runs it before every commit and it must print GUARD OK. Before any push, also grep the unpushed commits' messages and diffs the same way.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600`, about 6 minutes, one at a time on this machine) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine. No agent may write source files through a shell heredoc or echo (it strips `${...}` from JS template literals); use the edit tools.
- No agent may block on an unbounded wait: every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit; agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note (with my real-phone checks and the later store plan), rulings Part 16, and the "Version 6.0" What's new entry (set 5.0's build to 2653e92), and set APP_VERSION to 6.0.
- List the worktrees you made and remove the merged, clean ones (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed, the rulings you made, what is left for me, and short high-level patch notes I can paste to friends with the live link.
