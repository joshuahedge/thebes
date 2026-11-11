# 10.0 "A living Nile" prompt (paste into a new Claude Code session running Opus 5.5)

Build version 10.0 "A living Nile" of my personal game Thebes at C:\dev\thebes. The design and the plan are written and approved; your job is to run the plan. Use the multi-agent approach the 9.x releases used: Opus for Track 0, Track L, Track P, the merges and the final review; Sonnet for Tracks F, D, Q, M, the reviewers and the fix wave; my Opus window only orchestrates. Work autonomously and efficiently: I'm watching my weekly usage, so stop at a clean commit before 95% and tell me where you are.

Read first, and nothing more than you need:
1. Your memory notes for Thebes.
2. **The design, in full:** docs/superpowers/specs/2026-11-11-thebes-version-10-0-a-living-nile-design.md.
3. **The plan, in full:** docs/superpowers/plans/2026-11-11-thebes-version-10-0-a-living-nile.md. It has the waves, the file ownership, the ruling ranges, Track 0 as step-by-step tasks and every other track as tasks with tests and proofs.
4. The roadmap for where 10.0 sits: docs/superpowers/specs/2026-11-11-thebes-v10-roadmap-design.md (sections 1, 2 and 6 only).
5. As a model of form only: the 9.3 plan (docs/superpowers/plans/2026-11-10-thebes-version-9-3-a-city-that-grows.md) for how a track brief, a reviewer brief and the merge order were written. Read its headings and one track; don't reread its content.

Before you start, check that main is at the 10.0 docs commit (APP_VERSION '9.3.1', at or after the commit "10.0 A living Nile: the plan and the prompt") with a clean working tree, and that `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com`. If not, stop and tell me.

## How to run it

- **Branch `version-10-0`** from main. Worktrees `C:\dev\thebes-v100-<letter>` per track, cut after Track 0 is approved.
- **Track 0 first, then STOP** and show me the measured table (today's frame numbers at 390x844 DPR 2, 1280x800 and 1920x1080 beside the 9.1 targets) and the six before-shots. I approve, then wave 1 starts.
- **Wave 1:** F, D, Q in parallel (three Sonnet implementers, each with a Sonnet reviewer, at most two fix rounds). Merge.
- **Wave 2:** L and P in parallel on Opus. P turns the budget bounds on first (its worktree is red until it is done; merge P only when green), hands L its headroom numbers at its midpoint, and the controller merges L only when every budget test passes with L's layer on.
- **Wave 3:** Track M waits for my real-device pass note (docs/superpowers/notes/2026-11-xx-real-device-pass.md). If it is not there when wave 2 is merged, do M.2 (the 9.3.1 could items) and leave M.1 for a follow-up commit when the note lands.
- **Wave 4:** the Opus final review, one Sonnet fix wave split by owner, a Sonnet re-review, the docs step (What's new, APP_VERSION 10.0, README, the follow-ups note, rulings Part 31), `tools/sw-files.ps1`, the full suite, the guard. Then STOP: I push.
- **Every rule in the plan's Global Constraints applies to every agent**, including: no employer name anywhere, every commit with the Opus 5.5 trailer, GUARD OK before every commit, the full suite ALL PASSED before every commit, no shell heredocs on repo files, every wait with a timeout, one full suite at a time.

## What I will decide along the way

- Track 0's stop: the budget table and the before-shots.
- Whether the storm stays if the weekly limit nears (the spec's Q3: cut it first).
- The push.

Nothing else needs me. If a track finds the spec and the code disagree, the code is measured, the ruling says both numbers, and the track goes on; collect such rulings for the final review rather than stopping.
