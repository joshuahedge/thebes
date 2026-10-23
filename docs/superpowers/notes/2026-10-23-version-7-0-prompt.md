# Version 7.0 prompt (paste into a new Claude Code session running Opus 5.5)

Build Version 7.0 of my personal game Thebes at C:\dev\thebes: "a living world". Use a multi-agent approach: run each wave's tracks in parallel with a Workflow (or parallel subagents), with Opus and Sonnet agents as the plan says, so my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The design: docs/superpowers/specs/2026-10-23-thebes-version-7-0-a-living-world-design.md.
3. The plan: docs/superpowers/plans/2026-10-23-thebes-version-7-0-a-living-world.md. It holds the waves and tracks with each track's model and ruling range, the rules, the UX rules (with the 7.0 additions for clean and simple mobile and desktop screens) and the proposed rulings 850-857.

Before you start, check that 6.0.1 is merged on main and that main's history no longer holds my employer's name (the guard's `--unpushed` grep and a `git grep` over `git rev-list main` both come back empty). If not, stop and tell me.

Follow the plan's process:
- Branch `version-7-0` from main. Track 0 (the contract, Opus) runs on the branch. Then each wave's tracks run in sibling worktrees `C:\dev\thebes-v70-<track>` cut from the branch, at most three at once. You merge them back between waves; use an Opus integrator only if a merge is not trivial. Regenerate sw-files.js on conflict; never hand-merge it.
- Models: Opus (`model: opus`) for Track 0, Track T, hard merges and the final review. Sonnet (`model: sonnet`) for every other implementer, every reviewer, the balance pass, the fix wave and the re-review. Opus is also the escalation if a Sonnet fix round fails twice. No Fable.
- Per track: the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- Only one full test suite runs on the machine at a time. Give tracks a suite slot in turn, and have them iterate with `-Grep "v70 <track>"` meanwhile.
- Wave 3: the balance pass, an Opus whole-branch final review with the usability pass (wait for any helper sub-reviews it starts before acting on its report), one Sonnet fix wave split by file ownership, and a Sonnet re-review.
- Do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-23-thebes-version-7-0/progress.md, and rule on what is left.
- Screenshots for every visual track (T, E, S, and A's Show me), at the sizes the 7.0 UX rules list, under Gentle (Full for the motion checks). Look at two or three yourself per track; for the Trade sheet and the event card look at the phone and the desktop shot.
- Write the agents' shared rules once to a scratch file and point every brief at it, to keep briefs short. Ask every agent for a short report (under 300 words).

Don't stop to check in with me: carry on to the end. I may drop in with asks; fold them in as tracks or tasks. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling (inside the track's range) with its cost if wrong. Check my usage with the usage tool after each wave and give the weekly figures in your progress lines; if the all-models weekly passes 90%, stop at a clean commit and tell me.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com, in the branch and in every worktree.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere, including in agent briefs. Write a guard script in your scratchpad (not the repo) that does four things:
  - checks the local email;
  - runs `git grep -n -i` for the name decoded at run time from base64 `YXR0ZW5zaQ==` (never spelled out);
  - greps the staged diff the same way;
  - fails if .superpowers/ is staged.

  It must work from any worktree (take the worktree path as an argument). Every agent runs it before every commit, and it must print GUARD OK. Before any push, also grep the unpushed commits' messages and diffs the same way.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite, including in each track's last commit.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600`, about 6 minutes, one at a time on this machine) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine. No agent may write source files through a shell heredoc or echo (it strips `${...}` from JS template literals); use the edit tools.
- No agent may block on an unbounded wait. Every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit. Agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note (with my real-phone checks), rulings Part 18, and the "Version 7.0" What's new entry (set 6.0.1's build to its merge commit), and set APP_VERSION to 7.0.
- List the worktrees you made and remove the merged, clean ones (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed (phone and desktop), the rulings you made, what is left for me, and short high-level patch notes I can paste to friends with the live link (https://joshuahedge.github.io/thebes/).
