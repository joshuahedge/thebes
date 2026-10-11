# Prompt for the Stage 3 session

Paste everything between the two lines into a new Claude Code chat whose working folder is `C:\Users\joshed` (or `C:\dev\thebes`). It runs on its own, uses parallel agents through workflows, and stops only for a push or anything destructive.

---

Build Stage 3 of my personal Thebes game at C:\dev\thebes, autonomously, using multi-agent orchestration: use workflows and parallel agents to go faster. I opt in to running workflows for this work.

Read first:
1. Your memory note for Thebes.
2. docs/superpowers/notes/2026-10-11-stage-3-review.md: the scope, the proposed rulings and the parallel-track plan.
3. Its four digests in docs/superpowers/notes/reference/stage-3/.
4. The spec docs/superpowers/specs/2026-10-09-thebes-design.md.
5. docs/superpowers/notes/2026-10-11-stage-2-followups.md.

Stage 3 is: the danger stage of the spec, with the review's changes (fire stages and timings, raid warning, sizing, tribute and report, walls that truly protect, a Peaceful mode); scoring (named ratings, personal bests and milestone splits, Seal this reign, medals, a weekly seed, a share link and card, screenshot mode); the review's early-game gamification; subtle ambient animation (water, grass and reeds, palms, smoke, rare birds and boats) with a Settings switch; and balance back to spec 4.11's 60-70% band.

Rules:
- Do not ask me questions. Decide from the review, the spec, and game-design and UX best practice, and record every decision in the rulings list (docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md, continuing from 69) with what it costs if wrong.
- Stop only for pushing (a push to main deploys the live site) or anything destructive. Merge to main locally; never push.
- Commits use the repo-local identity (`git config --local user.email` must be 181878008+joshuahedge@users.noreply.github.com) and end with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, whatever model writes them.
- `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` must print ALL PASSED before every commit. Rerun `tools/sw-files.ps1` after editing anything under src/, css/ or index.html.
- Explain plainly, lead with outcomes, and show me screenshots whenever something visual changes. Never host Thebes as a Claude artifact.

How to run it (this overrides any skill text that says not to run implementers in parallel):
1. **Spec.** Revise the spec for Stage 3 on main from the review (sections 4.3 times, 4.9, 4.12, 4.13, 4.18, 5.4, 6.3, 10, plus new sections for scoring and ambient life), record the rulings, and commit.
2. **Infrastructure first, on main:**
   - add `-WaitSeconds` to tests/run-tests.ps1 (default 45);
   - add a `-Stage3` scene set to tools/shots.ps1 and tools/contact.py;
   - take the "before" screenshots (tag s3before) at the four sizes.
3. **Plan.** On branch `stage-3-danger`, write the plan header, global constraints and a binding interface contract. Then run plan writers in parallel (one per track: A fire, B raids and defence, C art and render including ambient life, D interface and sound, E scoring and gamification, F balance). Each writer must run its own code on a scratch copy before writing it into the plan. Assemble, rule on every CONTRACT NOTE, check that every code fence closes, and commit the plan.
4. **Track 0, the contract** (one implementer, reviewed, merged first): world version 4 and its migration, all data, stub modules with final signatures, one-time wiring, one test aggregator per track, and one delimited section per track in text.js and ui.css.
5. **Tracks A-E in parallel**, each in its own git worktree in a sibling folder (C:\dev\thebes-s3-<track>, branched from the contract commit). Within a track, tasks run one at a time with superpowers:subagent-driven-development: a fresh implementer per task (sonnet for transcription, opus for art and judgement), a task reviewer after each (sonnet; opus for UI and anything about words versus the sim), and fix rounds. Every UI reviewer checks that the words match what the sim does; that was the commonest Stage 2 bug. Visual tasks take screenshots and look at them.
6. **Integrate.** You are the integrator. Merge tracks into stage-3-danger in the order A, B, C, D, E. Rerun sw-files and the full suite after each merge, and never hand-edit sw-files.js (take either side, regenerate, re-test). Then do track F (balance, long-run tests asserting the 60-70% band, sample and stress cities with firehouses and defence, the title backdrop's build time).
7. **Final review.** A whole-branch review on fable with screenshots at the four sizes (390x844, 844x390, 1024x768, 1280x800) and at 150% text. Then ONE fix wave (opus), a scoped re-review, and an adjudication of anything left.
8. **Wrap up.** README section, a follow-ups note, the after screenshots and contact sheets (look at them yourself before merging; earlier final reviews missed regressions the shots showed), the rulings, a local merge to main, and the full suite on main. Update your memory note.

Limits and hazards (learnt in Stage 2):
- **Concurrency.** At most 5 agents running at once. Six opus plan writers hit the account's spend limit within an hour. If an agent stops on a usage limit, resume it with SendMessage after the reset rather than starting a fresh one.
- **Ledgers.** Keep a master ledger at C:\dev\thebes\.superpowers\sdd\<plan>\progress.md (one line per task, fix round and ruling). Each worktree keeps its own track ledger. Trust the ledgers and git log after any context compaction.
- **Machine load.**
  - Stagger full test runs across worktrees; use `-Grep "s3 <track>"` while iterating.
  - If the suite times out, check `Get-Process python*` for CPU-heavy stubs before anything else.
  - Never run `python3 - <<EOF` with an empty heredoc: it leaves a Windows python3 stub spinning a CPU core forever. Use `python`.
  - contact.py needs plain `python`, not `python -I`, because Pillow is in the user site.
- **Other sessions.** Check git log for commits you did not make. An older Thebes session has woken and committed before; if one appears, ask it once to stand down and carry on.
- **Worktree folders.** Put worktrees in sibling folders, not inside the repo (`.worktrees/` is not git-ignored). The repo identity and the `.superpowers/` ignore rule are shared by every worktree.

End with: the outcome in plain words, the models used, the full rulings list (old and new), screenshots of the main Stage 3 screens (a fire, a raid warning with tribute, a battle at the walls, the score and personal bests, the Peaceful choice, ambient water), and what is left for me.

---

## Notes for Josh
- **Cost.** This uses many agents in parallel and will spend a lot more tokens per hour than Stage 2 did. Stage 2's six parallel plan writers reached the spend limit in about an hour, so the prompt caps it at five running at once. Raise or lower that number in the prompt to trade speed for cost.
- **What still needs you.** Pushing, the real-phone checks, and any taste calls listed at the end.
