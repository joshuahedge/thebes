# Paste-ready prompt for Stage 4.6

Paste everything below the line into a new chat.

---

Build Stage 4.6 of my personal game Thebes at C:\dev\thebes: "living land, the court, armies and wonders". Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The plan: docs/superpowers/plans/2026-10-13-thebes-stage-4-6-land-court-armies.md. It holds what I asked for, my choices, the rules, the UX rules, the process, World version 7, the tracks (0, Map, River, Court, Armies, Wonders) and the proposed rulings 331-344.

Then follow the plan's process exactly:
- Branch `stage-4-6`. Track 0 (the contract) runs first on an Opus architect, alone.
- Then the five tracks run in parallel in sibling worktrees, at most 3 at once (wave 1: Map, Court, Armies; wave 2: River, Wonders). I opt in to using the Workflow tool for this: load the workflow-authoring skill first.
- Per track: a Sonnet implementer (Opus for Armies), then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds; Opus only for a second round that did not converge.
- Integration, then a Sonnet balance pass, then an Opus whole-branch final review, one Sonnet fix wave and a Sonnet re-review.
- Do not read diffs or whole files yourself. Read reports, keep the ledger, and rule on what is left.
- Screenshots only for visual tracks, at 390x844 and 1280x800, under Gentle and Full. Look at two or three yourself per checkpoint.

Stop and talk to me at these points only:
- after Track 0, only if Large (80x80) fails its performance check;
- after wave 1, with small shots: the three map sizes, a clay pit landing on clay, a court letter, and a mixed raid against archers and chariots;
- if my weekly usage passes 85% (check with the usage tool at each wave and checkpoint);
- before any push (a push to main deploys the live site).

Otherwise don't ask me questions. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling with its cost if wrong.

Rules that never bend:
- The commit identity is the repo-local one, in every worktree: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere. Run `git grep -n -i` for it before every commit, and tell every agent.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/, and once more after the last edit before the final suite.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 180`) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note and rulings Part 13.
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed, the rulings you made, and what is left for me.
