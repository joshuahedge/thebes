# Version 8.3 prompt (paste into a new Claude Code session running Opus 5.5)

Build Version 8.3 "Lines" of my personal game Thebes at C:\dev\thebes. Use a multi-agent approach: run wave 1's three tracks in parallel with a Workflow (or parallel subagents), with Opus and Sonnet agents as the plan says, so my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly token limit.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The design: docs/superpowers/specs/2026-10-27-thebes-version-8-3-lines-design.md (approved with every recommended answer).
3. The plan: docs/superpowers/plans/2026-10-27-thebes-version-8-3-lines.md. It holds:
   - the waves and the file ownership;
   - each track's model and ruling range;
   - the rules and the UX rules;
   - the proposed rulings 1380-1389.

Before you start, check that main is at 8.2.1 or later (APP_VERSION '8.2.1') with a clean working tree. If not, stop and tell me.

Follow the plan's process:
- **Wave 0:** you do it yourself, on branch `version-8-3`.
- **Wave 1:** tracks X, K and C run in sibling worktrees `C:\dev\thebes-v83-<track>`, cut from the branch after wave 0. Merge them back in the order X → K → C. Use an Opus integrator only if a merge is not trivial. Regenerate sw-files.js on conflict; never hand-merge it.
- **Models:**
  - Opus (`model: opus`) for Track X, Track K, hard merges and the final review.
  - Sonnet (`model: sonnet`) for Track C, every reviewer, the balance check, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- **Tests:** only one full suite runs on the machine at a time.
  - Write a suite wrapper in your scratchpad. It takes the worktree path, holds a lock directory, and runs `timeout 4000 powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 1800` from Bash, writing a result file.
  - Start full runs in the background.
  - Tracks iterate with `-Grep "v83 <track>"` meanwhile.
- **Wave 2:**
  - the balance check;
  - an Opus whole-branch final review with the usability pass (wait for any helper sub-reviews it starts before acting on its report);
  - one Sonnet fix wave split by file ownership;
  - a Sonnet re-review;
  - the docs.
- **The ledger:** do not read diffs or whole files yourself. Read reports, keep a ledger at .superpowers/sdd/2026-10-27-thebes-version-8-3/progress.md, and rule on what is left.
- **Screenshots** for every track, at the sizes the UX rules list. Look at two or three yourself per track:
  - X: a road dragged across a 3-tile and a 7-tile river, phone and desktop;
  - K: the store sheet, and the pick mode on a phone;
  - C: the site sheet with a far crew and a camp.
- **Agent briefs:** write the agents' shared rules once to a scratch file and point every brief at it. Ask every agent for a short report (under 300 words).

Don't stop to check in with me: carry on to the end. I may drop in with asks; fold them in as tracks or tasks.
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
- The full suite prints ALL PASSED before every commit. "stage 2 placement preview" is a known timing flake under load: rerun it alone before treating it as real.
- Stage files by path; never commit .superpowers/.
- No agent may run `python -` or `python3 -` with a heredoc; it hangs this machine. No agent may write source files through a shell heredoc, echo or sed (it strips `${...}` from JS template literals); use the edit tools.
- No agent may block on an unbounded wait. Every screenshot, server check and wait loop runs under `timeout` (shots 150 s), never `until ...; do sleep` without a limit. Agents stop any server or Edge they start. If agents seem stalled, check for CPU-heavy powershell/python/Edge strays before assuming a hang.

When you're done:
- Merge to main locally and run the full suite on main.
- Update:
  - the README;
  - the follow-ups note (with my real-phone checks);
  - rulings Part 25;
  - the "8.3 Lines" What's new entry (set 8.2.1's build to its merge commit);
  - APP_VERSION, set to 8.3.
- List the worktrees you made and remove the merged, clean ones (ask me about any with unmerged or dirty work).
- Then ask me before pushing.
- End with:
  - the outcome in plain words;
  - screenshots of what changed (phone and desktop);
  - the rulings you made;
  - what is left for me;
  - short high-level patch notes I can paste to friends, with the live link (https://joshuahedge.github.io/thebes/).
